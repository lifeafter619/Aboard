// Extracted session lifecycle runtime from main.js
// Preserves legacy board instance semantics by invoking methods with board as this.

const SESSION_RUNTIME_PLANNED_UPDATE_RELOAD_KEY = 'aboardPlannedUpdateReload';

function safeSessionRuntimeStorageGetItem(storage, key, storageLabel = 'storage') {
        try {
            return storage?.getItem?.(key) ?? null;
        } catch (error) {
            console.warn(`Failed to read ${storageLabel} key "${key}":`, error);
            return null;
        }
}

function safeSessionRuntimeStorageRemoveItem(storage, key, storageLabel = 'storage') {
        try {
            storage?.removeItem?.(key);
            return true;
        } catch (error) {
            console.warn(`Failed to remove ${storageLabel} key "${key}":`, error);
            return false;
        }
}

function getDefaultCoordinateOverlayState(backgroundManager) {
        if (typeof backgroundManager?.getDefaultCoordinateOverlayState === 'function') {
            return backgroundManager.getDefaultCoordinateOverlayState();
        }

        return {
            showTicks: true,
            showLabels: true,
            showPointLabels: true,
            showOrigin: true,
            pointLineMode: 'auto',
            connectPoints: true,
            snapToGrid: true,
            lineColor: '#2563eb',
            points: [],
            plots: [],
            groups: []
        };
}

function getDefaultImageTransform() {
        return {
            x: 0,
            y: 0,
            width: 0,
            height: 0,
            rotation: 0,
            scale: 1,
            flipHorizontal: false,
            flipVertical: false
        };
}

function normalizeImageTransform(transform) {
        const nextTransform = transform && typeof transform === 'object' ? transform : {};
        const defaults = getDefaultImageTransform();
        const scale = Number.isFinite(nextTransform.scale) ? nextTransform.scale : defaults.scale;
        let x = Number.isFinite(nextTransform.x) ? nextTransform.x : defaults.x;
        let y = Number.isFinite(nextTransform.y) ? nextTransform.y : defaults.y;
        let width = Number.isFinite(nextTransform.width) ? nextTransform.width : defaults.width;
        let height = Number.isFinite(nextTransform.height) ? nextTransform.height : defaults.height;

        if (scale && scale !== 1 && width > 0 && height > 0) {
            const factor = Math.abs(scale);
            const newWidth = width * factor;
            const newHeight = height * factor;
            x -= (newWidth - width) / 2;
            y -= (newHeight - height) / 2;
            width = newWidth;
            height = newHeight;
        }

        return {
            x,
            y,
            width,
            height,
            rotation: Number.isFinite(nextTransform.rotation) ? nextTransform.rotation : defaults.rotation,
            scale: 1,
            flipHorizontal: !!nextTransform.flipHorizontal,
            flipVertical: !!nextTransform.flipVertical
        };
}

function resetTransientBackgroundMediaState(backgroundManager) {
        if (!backgroundManager || typeof backgroundManager !== 'object') {
            return;
        }

        backgroundManager.backgroundImageLoadToken = (backgroundManager.backgroundImageLoadToken || 0) + 1;
        backgroundManager.stopGifInstance?.();
        backgroundManager.currentGifLoop = 0;
        backgroundManager.isImagePaused = false;
        backgroundManager.imageStaticData = null;
}

function isValidSessionRuntimeSyncSnapshot(value) {
        return Boolean(
            value
            && typeof value === 'object'
            && Number.isFinite(Number(value.timestamp))
            && Number(value.timestamp) > 0
            && value.settings
            && typeof value.settings === 'object'
            && !Array.isArray(value.settings)
        );
}

function getSessionRuntimeInlineDataUrlSignature(value) {
        if (typeof value !== 'string' || !value.startsWith('data:')) {
            return null;
        }
        const edgeLength = 64;
        return `${value.length}:${value.slice(0, edgeLength)}:${value.slice(-edgeLength)}`;
}

function mergeRecoveryBackgroundState(persistedState, snapshotState) {
        const persisted = persistedState && typeof persistedState === 'object' ? persistedState : {};
        const snapshot = snapshotState && typeof snapshotState === 'object' ? snapshotState : {};
        const merged = { ...persisted, ...snapshot };

        // Synchronous snapshots intentionally omit oversized data URLs. Keep
        // the IndexedDB image only when the lightweight signature still
        // identifies the same source; a blank/non-image pattern still clears it.
        if (snapshot.backgroundPattern === 'image'
            && !snapshot.backgroundImageData
            && typeof persisted.backgroundImageData === 'string'
            && (!snapshot.backgroundImageDataSignature
                || snapshot.backgroundImageDataSignature === getSessionRuntimeInlineDataUrlSignature(persisted.backgroundImageData))) {
            merged.backgroundImageData = persisted.backgroundImageData;
        }
        return merged;
}

function mergeRecoveryPageBackgrounds(persistedBackgrounds, snapshotBackgrounds) {
        const persisted = persistedBackgrounds && typeof persistedBackgrounds === 'object'
            ? persistedBackgrounds
            : {};
        const snapshot = snapshotBackgrounds && typeof snapshotBackgrounds === 'object'
            ? snapshotBackgrounds
            : {};
        // The snapshot contains the complete page-background map. Start empty
        // so pages removed by a newer project/import are not resurrected from
        // the older IndexedDB record; merge only preserves omitted image data
        // inside entries that still exist.
        const merged = {};
        Object.entries(snapshot).forEach(([pageNumber, backgroundState]) => {
            merged[pageNumber] = mergeRecoveryBackgroundState(persisted[pageNumber], backgroundState);
        });
        return merged;
}

function normalizeRecoveryPageCount(value) {
        const pageCount = Number(value);
        return Number.isInteger(pageCount) && pageCount > 0
            ? Math.min(pageCount, 300)
            : 0;
}

function trimPageIndexedState(pageMap, pageCount) {
        if (!pageMap || typeof pageMap !== 'object' || pageCount <= 0) {
            return pageMap && typeof pageMap === 'object' ? pageMap : {};
        }
        const trimmedPageMap = {};
        Object.entries(pageMap).forEach(([pageNumber, value]) => {
            const normalizedPage = Number(pageNumber);
            if (Number.isInteger(normalizedPage)
                && normalizedPage >= 1
                && normalizedPage <= pageCount) {
                trimmedPageMap[pageNumber] = value;
            }
        });
        return trimmedPageMap;
}

function mergeRecoverySettings(persistedSettings, snapshotSettings) {
        const persisted = persistedSettings && typeof persistedSettings === 'object' ? persistedSettings : {};
        const snapshot = snapshotSettings && typeof snapshotSettings === 'object' ? snapshotSettings : {};
        const merged = mergeRecoveryBackgroundState(persisted, snapshot);
        if (snapshot.pageBackgrounds && typeof snapshot.pageBackgrounds === 'object') {
            merged.pageBackgrounds = mergeRecoveryPageBackgrounds(
                persisted.pageBackgrounds,
                snapshot.pageBackgrounds
            );
        }
        return merged;
}

function mergeRecoveryScene(persistedScene, snapshotScene) {
        if (!snapshotScene || typeof snapshotScene !== 'object') {
            return snapshotScene || null;
        }
        const persistedImages = Array.isArray(persistedScene?.stampedImages)
            ? persistedScene.stampedImages
            : [];
        const stampedImages = Array.isArray(snapshotScene.stampedImages)
            ? snapshotScene.stampedImages.map((image, index) => {
                if (image?.imageSrc) return image;
                const persistedImage = image?.objectId
                    ? persistedImages.find((candidate) => candidate?.objectId === image.objectId)
                    : persistedImages[index];
                const sourceMatches = !image?.imageSrcSignature
                    || image.imageSrcSignature === getSessionRuntimeInlineDataUrlSignature(persistedImage?.imageSrc);
                return persistedImage?.imageSrc && sourceMatches
                    ? { ...image, imageSrc: persistedImage.imageSrc }
                    : image;
            })
            : [];
        return { ...snapshotScene, stampedImages };
}

function getCanvasStateStorageKeys(board) {
        const canvasKeys = board.getCacheKeyGroups?.()?.canvasKeys;
        if (canvasKeys && typeof canvasKeys.forEach === 'function') {
            const keys = new Set();
            canvasKeys.forEach((key) => keys.add(key));
            keys.add(board.syncSessionSnapshotKey || 'aboardSyncSessionSnapshot');
            keys.add(SESSION_RUNTIME_PLANNED_UPDATE_RELOAD_KEY);
            return keys;
        }

        return new Set([
            'savedCanvasData',
            'savedBgCanvasData',
            'savedCanvasTimestamp',
            'savedCurrentPage',
            'pageBackgrounds',
            'pageScenes',
            'backgroundColor',
            'backgroundPattern',
            'bgOpacity',
            'patternIntensity',
            'patternDensity',
            'backgroundImageData',
            'backgroundImageConfirmed',
            'imageTransform',
            'imageSize',
            'coordinateOriginX',
            'coordinateOriginY',
            'coordinateOverlayState',
            'backgroundOutsideLayerOrder',
            'uploadedImages',
            'canvasScale',
            'panOffsetX',
            'panOffsetY',
            'canvasViewStateVersion',
            'aboardSessionSizeEstimate',
            board.syncSessionSnapshotKey || 'aboardSyncSessionSnapshot',
            SESSION_RUNTIME_PLANNED_UPDATE_RELOAD_KEY
        ]);
}

function clearCanvasStateStorage(board) {
        const canvasKeys = getCanvasStateStorageKeys(board);
        let cleared = true;
        canvasKeys.forEach((key) => {
            cleared = safeSessionRuntimeStorageRemoveItem(
                typeof localStorage !== 'undefined' ? localStorage : null,
                key,
                'localStorage'
            ) && cleared;
            cleared = safeSessionRuntimeStorageRemoveItem(
                typeof sessionStorage !== 'undefined' ? sessionStorage : null,
                key,
                'sessionStorage'
            ) && cleared;
        });
        return cleared;
}

function resetRuntimeCanvasState() {
        this.pageBackgrounds = {};
        this.pageRasterFallbackPages = new Set();
        this.pageRasterFallbackBases = new Map();
        this.pageRasterFallbackScaledBases = new Map();
        this.uploadedImages = [];
        this.currentPage = 1;

        this.clearAllPageScenes?.();
        if (!this.clearAllPageScenes) {
            this.pageScenes = {};
            this.clearPageSceneRuntimeState?.();
        }

        if (this.ctx && this.canvas) {
            this.ctx.save?.();
            try {
                this.ctx.setTransform?.(1, 0, 0, 1, 0, 0);
                this.ctx.clearRect?.(0, 0, this.canvas.width, this.canvas.height);
            } finally {
                this.ctx.restore?.();
            }
            this.pages = [null];
        }

        const backgroundManager = this.backgroundManager;
        if (backgroundManager) {
            backgroundManager.clearBackgroundImage?.();
            backgroundManager.backgroundColor = '#ffffff';
            backgroundManager.backgroundPattern = 'blank';
            backgroundManager.bgOpacity = 1;
            backgroundManager.patternIntensity = 0.5;
            backgroundManager.patternDensity = 1;
            backgroundManager.imageSize = 1;
            backgroundManager.coordinateOriginX = 0;
            backgroundManager.coordinateOriginY = 0;
            backgroundManager.setCoordinateOverlayState?.(
                getDefaultCoordinateOverlayState(backgroundManager),
                { persist: false, redraw: false }
            );
            backgroundManager.backgroundImage = null;
            backgroundManager.backgroundImageData = null;
            backgroundManager.imageTransform = getDefaultImageTransform();
            backgroundManager.gifLoopCount = 0;
            backgroundManager.currentGifLoop = 0;
            backgroundManager.isImagePaused = false;
            backgroundManager.imageStaticData = null;
            backgroundManager.backgroundOutsideLayerOrder = 1;
            backgroundManager.backgroundWasOutsideCanvas = false;
            backgroundManager.drawBackground?.();
            backgroundManager.emitBackgroundUiState?.();
        }

        this.imageControls?.resetConfirmation?.();
        this.updateUploadedImagesButtons?.();
        this.updateBackgroundUI?.();
        this.updatePaginationUI?.();

        // Drop undo history so cleared content cannot be brought back with
        // undo (and then re-persisted by the debounced session save).
        if (this.historyManager) {
            this.historyManager.reset();
            this.historyManager.saveState();
        }
}

function getRecoveryFailureMessage() {
        return window.i18n?.t('recovery.restoreFailed') || 'Failed to restore your previous content. Please try again.';
}

function showSessionClearFailure(board, type = 'error') {
        const isInvalidated = board.sessionWriteLockState === 'invalidated';
        const key = type === 'warning'
            ? isInvalidated
                ? 'errors.sessionDataClearedElsewhere'
                : 'errors.sessionWriteConflict'
            : 'errors.clearLocalDataFailed';
        const fallback = type === 'warning'
            ? isInvalidated
                ? 'Saved board data was cleared in another tab. Reload before clearing again.'
                : 'Aboard is open in another tab. Close that tab before clearing the saved board.'
            : 'Saved board data could not be cleared. Please try again.';
        const translated = window.i18n?.t?.(key);
        const message = translated && translated !== key ? translated : fallback;
        if (board.settingsManager?.toastManager?.show) {
            board.settingsManager.toastManager.show(message, type);
        } else {
            window.appDialog?.showAlert?.(message, type);
        }
}

async function decodeSessionPageBlobs(pageBlobs, concurrency = 2, shouldSkip = null) {
        const blobs = Array.isArray(pageBlobs) ? pageBlobs : [];
        const results = new Array(blobs.length);
        let nextIndex = 0;
        const workerCount = Math.min(Math.max(1, concurrency), blobs.length);
        const workers = Array.from({ length: workerCount }, async () => {
            while (nextIndex < blobs.length) {
                const index = nextIndex;
                nextIndex += 1;
                if (typeof shouldSkip === 'function' && shouldSkip(index + 1, blobs[index])) {
                    results[index] = { status: 'fulfilled', value: null };
                    continue;
                }
                try {
                    results[index] = {
                        status: 'fulfilled',
                        value: await StorageManager.blobToImageData(blobs[index])
                    };
                } catch (reason) {
                    results[index] = { status: 'rejected', reason };
                }
            }
        });
        await Promise.all(workers);
        return results;
}

function showRecoveryModal() {
        const modal = document.getElementById('recovery-modal');
        if (!modal) {
            this.recoveryPromptOpen = false;
            return;
        }
        const restoreBtn = document.getElementById('recovery-restore-btn');
        const discardBtn = document.getElementById('recovery-discard-btn');
        const scheduleFrame = typeof window.requestAnimationFrame === 'function'
            ? window.requestAnimationFrame.bind(window)
            : (callback) => callback();
        const restoreFocusTarget = document.activeElement && document.activeElement !== document.body
            ? document.activeElement
            : null;
        let isClosed = false;
        let isPending = false;

        modal.setAttribute('role', 'dialog');
        modal.setAttribute('aria-modal', 'true');
        modal.setAttribute('aria-labelledby', 'recovery-title');
        modal.setAttribute('aria-describedby', 'recovery-message');
        modal.tabIndex = -1;

        const setPendingState = (value) => {
            const nextPending = Boolean(value);
            isPending = nextPending;
            if (restoreBtn) restoreBtn.disabled = nextPending;
            if (discardBtn) discardBtn.disabled = nextPending;
        };

        const closeModal = () => {
            if (isClosed || isPending) {
                return;
            }
            isClosed = true;
            this.recoveryPromptOpen = false;
            modal.classList.remove('show');
            scheduleFrame(() => {
                restoreFocusTarget?.focus?.();
            });
        };
        
        this.recoveryPromptOpen = true;
        // A debounced save scheduled before the prompt appeared must not fire
        // while the user decides — it would overwrite the recoverable session
        // with the still-blank board.
        if (this.saveTimeout) {
            clearTimeout(this.saveTimeout);
            this.saveTimeout = null;
        }
        modal.classList.add('show');
        scheduleFrame(() => {
            (restoreBtn || discardBtn || modal)?.focus?.();
        });

        modal.onkeydown = (event) => {
            if (event.key === 'Escape') {
                // Recovery is a data-loss decision. Do not dismiss it into a
                // blank writable board without either restoring or discarding.
                event.preventDefault();
            }
        };

        if (restoreBtn) {
            restoreBtn.onclick = async () => {
                setPendingState(true);
                const restored = await this.restoreSession();
                setPendingState(false);
                if (restored) {
                    closeModal();
                    return;
                }
                window.appDialog?.showAlert?.(getRecoveryFailureMessage(), 'error');
            };
        }

        if (discardBtn) {
            discardBtn.onclick = async () => {
                setPendingState(true);
                let cleared = false;
                try {
                    cleared = await this.clearSessionData();
                } catch (error) {
                    console.warn('Failed to discard the recoverable session:', error);
                    showSessionClearFailure(this);
                } finally {
                    setPendingState(false);
                }
                if (cleared) {
                    closeModal();
                }
            };
        }
    
}

async function restoreSession() {
        this.isRestoringSession = true;
        let restoredSuccessfully = false;
        try {
            let sessionData = await this.storageManager.loadSession();
            let syncSnapshot = null;
            let shouldMergeSyncSnapshot = false;

            const rawSnapshot = safeSessionRuntimeStorageGetItem(
                typeof localStorage !== 'undefined' ? localStorage : null,
                this.syncSessionSnapshotKey || 'aboardSyncSessionSnapshot',
                'localStorage'
            );
            if (rawSnapshot) {
                try {
                    syncSnapshot = JSON.parse(rawSnapshot);
                    if (!isValidSessionRuntimeSyncSnapshot(syncSnapshot)) {
                        throw new Error('Invalid synchronous session snapshot payload.');
                    }
                } catch (snapshotError) {
                    console.warn('Failed to parse sync session snapshot:', snapshotError);
                    safeSessionRuntimeStorageRemoveItem(
                        typeof localStorage !== 'undefined' ? localStorage : null,
                        this.syncSessionSnapshotKey || 'aboardSyncSessionSnapshot',
                        'localStorage'
                    );
                    syncSnapshot = null;
                }
            }

            const indexedDbTimestamp = Number(sessionData?.timestamp || 0);
            const syncSnapshotTimestamp = Number(syncSnapshot?.timestamp || 0);
            shouldMergeSyncSnapshot = !!(syncSnapshot && syncSnapshotTimestamp >= indexedDbTimestamp);
            const syncSnapshotPageCount = shouldMergeSyncSnapshot
                ? normalizeRecoveryPageCount(syncSnapshot?.pageCount)
                : 0;

            if (!sessionData && syncSnapshot) {
                shouldMergeSyncSnapshot = true;
                sessionData = {
                    settings: {
                        ...(syncSnapshot.settings || {}),
                        currentPage: syncSnapshot.currentPage || 1
                    },
                    pagesRaw: [],
                    timestamp: syncSnapshotTimestamp
                };
            } else if (shouldMergeSyncSnapshot && sessionData) {
                const persistedSettings = sessionData.settings || {};
                const snapshotSettings = syncSnapshot.settings || {};
                const snapshotPageNumber = String(
                    syncSnapshot.currentPage || snapshotSettings.currentPage || persistedSettings.currentPage || 1
                );
                if (Object.prototype.hasOwnProperty.call(syncSnapshot, 'currentPageScene')) {
                    syncSnapshot.currentPageScene = mergeRecoveryScene(
                        persistedSettings.pageScenes?.[snapshotPageNumber] || null,
                        syncSnapshot.currentPageScene
                    );
                }
                sessionData = {
                    ...sessionData,
                    settings: {
                        ...mergeRecoverySettings(persistedSettings, snapshotSettings),
                        currentPage: syncSnapshot.currentPage || sessionData.settings?.currentPage || 1
                    },
                    timestamp: Math.max(indexedDbTimestamp, syncSnapshotTimestamp)
                };
                if (syncSnapshotPageCount > 0) {
                    if (Array.isArray(sessionData.pages)) {
                        sessionData.pages = sessionData.pages.slice(0, syncSnapshotPageCount);
                    }
                    if (Array.isArray(sessionData.pagesRaw)) {
                        sessionData.pagesRaw = sessionData.pagesRaw.slice(0, syncSnapshotPageCount);
                    }
                    if (Array.isArray(sessionData.rasterFallbackBases)) {
                        sessionData.rasterFallbackBases = sessionData.rasterFallbackBases.slice(0, syncSnapshotPageCount);
                    }
                    sessionData.settings.pageBackgrounds = trimPageIndexedState(
                        sessionData.settings.pageBackgrounds,
                        syncSnapshotPageCount
                    );
                    sessionData.settings.pageScenes = trimPageIndexedState(
                        sessionData.settings.pageScenes,
                        syncSnapshotPageCount
                    );
                }
            }

            if (!sessionData) return false;

            const { pages, pagesRaw, rasterFallbackBases, settings } = sessionData;
            let serializedPageScenes = {};

            // Restore settings
            if (settings) {
                // Restore drawing tools
                if (settings.penSize) this.drawingEngine.setPenSize(settings.penSize);
                if (settings.penColor) this.drawingEngine.setColor(settings.penColor);
                if (settings.penType) this.drawingEngine.setPenType(settings.penType);
                if (settings.eraserSize) this.drawingEngine.setEraserSize(settings.eraserSize);
                if (settings.eraserShape) this.drawingEngine.setEraserShape(settings.eraserShape);
                if (settings.currentTool) this.setTool(settings.currentTool, false);

                // Restore View
                if (settings.canvasScale) this.drawingEngine.canvasScale = settings.canvasScale;
                if (settings.panOffset) this.drawingEngine.panOffset = { ...settings.panOffset };

                // Restore Backgrounds
                if (settings.pageBackgrounds) this.pageBackgrounds = (window.safeDeepClone || ((v) => JSON.parse(JSON.stringify(v))))(settings.pageBackgrounds);
                if (settings.backgroundColor) this.backgroundManager.backgroundColor = settings.backgroundColor;
                if (settings.backgroundPattern) this.backgroundManager.backgroundPattern = settings.backgroundPattern;
                if (typeof settings.bgOpacity !== 'undefined') this.backgroundManager.bgOpacity = settings.bgOpacity;
                if (typeof settings.patternIntensity !== 'undefined') this.backgroundManager.patternIntensity = settings.patternIntensity;
                if (typeof settings.patternDensity !== 'undefined') {
                    const restoredDensity = parseFloat(settings.patternDensity);
                    this.backgroundManager.patternDensity = Number.isFinite(restoredDensity) && restoredDensity > 0
                        ? Math.min(3, Math.max(0.2, restoredDensity))
                        : 1;
                }
                resetTransientBackgroundMediaState(this.backgroundManager);
                this.backgroundManager.backgroundImage = null;
                if (typeof settings.coordinateOriginX !== 'undefined') {
                    this.backgroundManager.coordinateOriginX = settings.coordinateOriginX;
                    this.backgroundManager.coordinateOriginY = settings.coordinateOriginY;
                }
                this.backgroundManager.setCoordinateOverlayState(settings.coordinateOverlayState, { persist: false, redraw: false });
                if (typeof settings.imageSize !== 'undefined') this.backgroundManager.imageSize = settings.imageSize;
                if (Object.prototype.hasOwnProperty.call(settings, 'backgroundImageData')) {
                    this.backgroundManager.backgroundImageData = settings.backgroundImageData || null;
                }
                if (settings.imageTransform) {
                    this.backgroundManager.imageTransform = normalizeImageTransform(settings.imageTransform);
                }
                if (Number.isFinite(settings.gifLoopCount) && settings.gifLoopCount >= 0) {
                    this.backgroundManager.gifLoopCount = settings.gifLoopCount;
                }
                if (typeof settings.backgroundOutsideLayerOrder !== 'undefined') {
                    this.backgroundManager.backgroundOutsideLayerOrder = settings.backgroundOutsideLayerOrder;
                }

                if (settings.uploadedImages) {
                    this.uploadedImages = settings.uploadedImages;
                    this.updateUploadedImagesButtons();
                }

                // Restore current page index
                const requestedCurrentPage = parseInt(settings.currentPage, 10);
                if (Number.isInteger(requestedCurrentPage) && requestedCurrentPage > 0) {
                    this.currentPage = Math.min(requestedCurrentPage, 300);
                }

                serializedPageScenes = settings.pageScenes && typeof settings.pageScenes === 'object'
                    ? { ...settings.pageScenes }
                    : {};
                if (Object.keys(serializedPageScenes).length === 0) {
                    const legacyCurrentPageScene = {
                        pageNumber: this.currentPage || 1,
                        objectGroups: settings.objectGroups || [],
                        textObjects: settings.textObjects || [],
                        strokes: settings.strokes || [],
                        stampedImages: settings.stampedImages || []
                    };
                    const currentPageKey = String(this.currentPage || 1);
                    if (
                        legacyCurrentPageScene.objectGroups.length ||
                        legacyCurrentPageScene.textObjects.length ||
                        legacyCurrentPageScene.strokes.length ||
                        legacyCurrentPageScene.stampedImages.length
                    ) {
                        serializedPageScenes[currentPageKey] = legacyCurrentPageScene;
                    }
                }
            }

            const syncScenePageNumber = String(syncSnapshot?.currentPage || this.currentPage || 1);
            if (shouldMergeSyncSnapshot && Object.prototype.hasOwnProperty.call(syncSnapshot || {}, 'currentPageScene')) {
                if (syncSnapshot.currentPageScene) {
                    serializedPageScenes[syncScenePageNumber] = syncSnapshot.currentPageScene;
                } else {
                    delete serializedPageScenes[syncScenePageNumber];
                }
            } else if (syncSnapshot?.currentPageScene && Object.keys(serializedPageScenes).length === 0) {
                serializedPageScenes[syncScenePageNumber] = syncSnapshot.currentPageScene;
            }
            if (syncSnapshotPageCount > 0) {
                serializedPageScenes = trimPageIndexedState(serializedPageScenes, syncSnapshotPageCount);
            }

            const rasterFallbackPages = new Set();
            const fallbackPageLimit = syncSnapshotPageCount || 300;
            if (Array.isArray(settings?.rasterFallbackPages)) {
                settings.rasterFallbackPages.forEach((pageNumber) => {
                    const normalizedPage = Number(pageNumber);
                    if (Number.isInteger(normalizedPage)
                        && normalizedPage >= 1
                        && normalizedPage <= fallbackPageLimit) {
                        rasterFallbackPages.add(normalizedPage);
                    }
                });
            }
            if (settings?.rasterFallbackTrackingVersion !== 1) {
                const persistedPageBitmaps = Array.isArray(pagesRaw) && pagesRaw.length > 0
                    ? pagesRaw
                    : (Array.isArray(pages) ? pages : []);
                persistedPageBitmaps.forEach((pageBitmap, index) => {
                    const pageNumber = index + 1;
                    if (pageBitmap
                        && pageNumber <= fallbackPageLimit
                        && !serializedPageScenes[String(pageNumber)]) {
                        rasterFallbackPages.add(pageNumber);
                    }
                });
            }
            this.pageRasterFallbackPages = rasterFallbackPages;
            this.pageRasterFallbackBases = new Map();
            this.pageRasterFallbackScaledBases = new Map();

            const currentPageBackground = this.pageBackgrounds?.[this.currentPage];
            if (!currentPageBackground
                && this.backgroundManager.backgroundPattern === 'image'
                && this.backgroundManager.backgroundImageData) {
                const expectedSource = this.backgroundManager.backgroundImageData;
                const backgroundLoadToken = this.backgroundManager.backgroundImageLoadToken;
                const restoredBackgroundImage = typeof Image === 'function'
                    ? await new Promise((resolve) => {
                        const image = new Image();
                        image.onload = () => resolve(image);
                        image.onerror = () => resolve(null);
                        image.src = expectedSource;
                    })
                    : null;
                if (backgroundLoadToken === this.backgroundManager.backgroundImageLoadToken
                    && expectedSource === this.backgroundManager.backgroundImageData) {
                    this.backgroundManager.backgroundImage = restoredBackgroundImage;
                }
            }

            await this.applySerializedPageScenes(serializedPageScenes);
            if (this.insertTextManager) {
                this.selectionManager?.setTextManager?.(this.insertTextManager);
            }

            const hasIndependentRasterFallbackBases = Array.isArray(rasterFallbackBases);
            if (hasIndependentRasterFallbackBases) {
                // Decode immutable raster bases before page composites. A page
                // may skip its composite only after canRegeneratePageBitmap()
                // can see a successfully decoded base in the map.
                const rasterBaseResults = await decodeSessionPageBlobs(
                    rasterFallbackBases,
                    2,
                    (pageNumber, blob) => !blob || !rasterFallbackPages.has(pageNumber)
                );
                rasterBaseResults.forEach((result, index) => {
                    const pageNumber = index + 1;
                    if (!rasterFallbackPages.has(pageNumber)) {
                        return;
                    }
                    if (result.status === 'fulfilled' && result.value) {
                        this.pageRasterFallbackBases.set(pageNumber, result.value);
                        return;
                    }
                    if (rasterFallbackBases[index]) {
                        console.warn(
                            `[Session] Failed to restore raster fallback base ${pageNumber}:`,
                            result.reason || 'The decoder returned no image data.'
                        );
                    }
                    rasterFallbackPages.delete(pageNumber);
                    this.pageRasterFallbackBases.delete(pageNumber);
                    this.pageRasterFallbackScaledBases?.delete?.(pageNumber);
                });
            }

            // Restore pages
            if (pagesRaw && Array.isArray(pagesRaw) && pagesRaw.length > 0) {
                this.pages = pagesRaw;
            } else if (pages && Array.isArray(pages)) {
                // Decode with bounded concurrency so restoring a long lesson
                // does not create a temporary canvas for every page at once.
                const results = await decodeSessionPageBlobs(pages, 2, (pageNumber) =>
                    pageNumber !== this.currentPage
                    && this.canRegeneratePageBitmap?.(pageNumber) === true
                );
                this.pages = results.map((result, index) => {
                    if (result.status === 'fulfilled') return result.value;
                    console.warn(`[Session] Failed to restore page ${index + 1}:`, result.reason);
                    return null;
                });
            }

            if (!hasIndependentRasterFallbackBases && Array.isArray(this.pages)) {
                // Legacy sessions have only full-page bitmaps. Such a bitmap is
                // a safe immutable base only when that page has no vector scene;
                // otherwise it already contains those vectors and would double
                // render after an edit or page reconstruction.
                this.pages.forEach((pageBitmap, index) => {
                    const pageNumber = index + 1;
                    if (!pageBitmap || serializedPageScenes[String(pageNumber)]) {
                        return;
                    }
                    rasterFallbackPages.add(pageNumber);
                    this.pageRasterFallbackBases.set(pageNumber, pageBitmap);
                });
            }

            // Only merge the localStorage snapshot page when it is at least as new
            // as the IndexedDB session, so stale snapshots cannot overwrite pages.
            if (shouldMergeSyncSnapshot && syncSnapshot?.pageDataUrl) {
                const restoredImage = await new Promise((resolve) => {
                    const img = new Image();
                    img.onload = () => resolve(img);
                    img.onerror = () => resolve(null);
                    img.src = syncSnapshot.pageDataUrl;
                });

                if (restoredImage) {
                    const offscreen = document.createElement('canvas');
                    offscreen.width = syncSnapshot.canvasWidth || this.canvas.width;
                    offscreen.height = syncSnapshot.canvasHeight || this.canvas.height;
                    const offscreenCtx = offscreen.getContext('2d');
                    offscreenCtx.drawImage(restoredImage, 0, 0, offscreen.width, offscreen.height);
                    const snapshotPage = offscreenCtx.getImageData(0, 0, offscreen.width, offscreen.height);
                    const snapshotPageIndex = Math.max(0, (syncSnapshot.currentPage || this.currentPage || 1) - 1);

                    if (!Array.isArray(this.pages) || this.pages.length === 0) {
                        this.pages = [snapshotPage];
                    } else {
                        while (this.pages.length <= snapshotPageIndex) {
                            this.pages.push(null);
                        }
                        this.pages[snapshotPageIndex] = snapshotPage;
                    }

                    this.currentPage = snapshotPageIndex + 1;
                }
            } else if (
                shouldMergeSyncSnapshot
                && Object.prototype.hasOwnProperty.call(syncSnapshot || {}, 'currentPageScene')
            ) {
                const staleBitmapPage = Math.max(1, Number(syncSnapshot?.currentPage || this.currentPage || 1));
                const staleBitmapIndex = staleBitmapPage - 1;
                if (
                    Array.isArray(this.pages)
                    && staleBitmapIndex >= 0
                    && staleBitmapIndex < this.pages.length
                    && !rasterFallbackPages.has(staleBitmapPage)
                ) {
                    this.pages[staleBitmapIndex] = null;
                }
            }

            if (syncSnapshotPageCount > 0) {
                if (!Array.isArray(this.pages)) {
                    this.pages = [];
                }
                this.pages.length = Math.min(this.pages.length, syncSnapshotPageCount);
                while (this.pages.length < syncSnapshotPageCount) {
                    this.pages.push(null);
                }
            }

            if (!Array.isArray(this.pages) || this.pages.length === 0) {
                this.pages = [null];
                this.currentPage = 1;
            }

            // Keep page-indexed fallback state aligned with the restored page
            // array so stale metadata cannot be re-saved indefinitely.
            Array.from(rasterFallbackPages).forEach((pageNumber) => {
                if (pageNumber > this.pages.length) {
                    rasterFallbackPages.delete(pageNumber);
                    this.pageRasterFallbackBases.delete(pageNumber);
                }
            });
            Array.from(this.pageRasterFallbackBases.keys()).forEach((pageNumber) => {
                if (!rasterFallbackPages.has(pageNumber)) {
                    this.pageRasterFallbackBases.delete(pageNumber);
                }
            });

            const restoredPageNumber = parseInt(this.currentPage, 10);
            this.currentPage = Math.min(
                Math.max(Number.isInteger(restoredPageNumber) ? restoredPageNumber : 1, 1),
                this.pages.length
            );

            // Apply restored state
            await this.loadPage(this.currentPage);
            this.enforcePageBitmapMemoryBudget?.();
            this.updateUI();
            this.updateZoomUI();
            this.applyZoom(false);
            this.updatePaginationUI();

            // Sync UI controls
            this.syncSettingsUI(settings);

            this.hasUnresolvedRecoveryData = false;
            restoredSuccessfully = true;
            console.log('Session restored');
            return true;
        } catch (e) {
            console.warn('Failed to restore session:', e);
            return false;
        } finally {
            this.isRestoringSession = false;
            if (restoredSuccessfully && this.sessionSaveDirtyWhileRecoveryBlocked) {
                this.sessionSaveDirtyWhileRecoveryBlocked = false;
                this.saveSessionDebounced?.();
            }
        }

}

function syncSettingsUI(settings) {
        if (!settings) return;

        // Sync Pen Size Slider
        const penSizeSlider = document.getElementById('pen-size-slider');
        const penSizeValue = document.getElementById('pen-size-value');
        if (penSizeSlider && settings.penSize) {
            penSizeSlider.value = settings.penSize;
            if (penSizeValue) penSizeValue.textContent = settings.penSize;
        }

        // Sync Eraser Size Slider
        if (settings.eraserSize) {
            this.syncEraserSizeControls();
        }

        // Sync active color buttons
        if (settings.penColor) {
            document.querySelectorAll('.color-btn[data-color]').forEach(btn => {
                if (btn.dataset.color === settings.penColor) {
                    btn.classList.add('active');
                } else {
                    btn.classList.remove('active');
                }
            });
            const customPicker = document.getElementById('custom-color-picker');
            if (customPicker) customPicker.value = settings.penColor;
        }
        window.i18n?.syncGenericColorControls?.();
    
}

async function clearSessionData() {
        if (typeof this.isSessionWriteAllowed === 'function' && !this.isSessionWriteAllowed()) {
            showSessionClearFailure(this, 'warning');
            return false;
        }

        const wasAlreadyClearingLocalData = this.isClearingLocalData === true;
        this.isClearingLocalData = true;
        this.sessionSaveRequestId = (this.sessionSaveRequestId || 0) + 1;

        // Cancel any pending debounced save so it cannot re-persist the
        // content that is being cleared right now.
        if (this.saveTimeout) {
            clearTimeout(this.saveTimeout);
            this.saveTimeout = null;
        }

        try {
            // A save that already entered its IndexedDB transaction must finish
            // before deletion; all still-encoding saves were invalidated above.
            if (this.sessionPersistenceWriteTail) {
                await this.sessionPersistenceWriteTail;
            }

            let persistentClearError = null;
            let persistentClearResult = null;
            try {
                persistentClearResult = await this.storageManager.clearSession();
            } catch (e) {
                persistentClearError = e;
                console.warn('Failed to clear persistent session:', e);
            }

            let persistentSessionStillExists = false;
            try {
                persistentSessionStillExists = await this.storageManager.hasSession() === true;
            } catch (e) {
                persistentClearError = persistentClearError || e;
                console.warn('Failed to verify persistent session cleanup:', e);
            }

            if (persistentClearError
                || persistentSessionStillExists
                || (persistentClearResult === false && this.storageManager?.db)) {
                showSessionClearFailure(this);
                return false;
            }

            try {
                this.storageManager.clearSessionSizeEstimate();
            } catch (e) {
                console.warn('Failed to clear session size estimate:', e);
            }

            if (!clearCanvasStateStorage(this)) {
                showSessionClearFailure(this);
                return false;
            }

            if (typeof this.rotateSessionWriteEpoch === 'function'
                && !this.rotateSessionWriteEpoch()) {
                showSessionClearFailure(this);
                return false;
            }

            resetRuntimeCanvasState.call(this);
            // Resetting the background manager flushes its debounced storage
            // queue so stale pre-clear values cannot race back into storage.
            // Remove canvas keys once more after that synchronous flush.
            if (!clearCanvasStateStorage(this)) {
                showSessionClearFailure(this);
                return false;
            }
            this.hasUnresolvedRecoveryData = false;
            this.sessionSaveDirtyWhileRecoveryBlocked = false;
            return true;
        } finally {
            this.isClearingLocalData = wasAlreadyClearingLocalData;
        }
    
}

window.AboardSessionRuntime = {
    showRecoveryModal(board) {
        return showRecoveryModal.call(board);
    },
    restoreSession(board) {
        return restoreSession.call(board);
    },
    syncSettingsUI(board, settings) {
        return syncSettingsUI.call(board, settings);
    },
    clearSessionData(board) {
        return clearSessionData.call(board);
    },
};
