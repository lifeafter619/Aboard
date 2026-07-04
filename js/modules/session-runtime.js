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

        backgroundManager.currentGifLoop = 0;
        backgroundManager.isImagePaused = false;
        backgroundManager.imageStaticData = null;
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
        canvasKeys.forEach((key) => {
            safeSessionRuntimeStorageRemoveItem(
                typeof localStorage !== 'undefined' ? localStorage : null,
                key,
                'localStorage'
            );
            safeSessionRuntimeStorageRemoveItem(
                typeof sessionStorage !== 'undefined' ? sessionStorage : null,
                key,
                'sessionStorage'
            );
        });
}

function resetRuntimeCanvasState() {
        this.pageBackgrounds = {};
        this.uploadedImages = [];
        this.currentPage = 1;

        this.clearAllPageScenes?.();
        if (!this.clearAllPageScenes) {
            this.pageScenes = {};
            this.clearPageSceneRuntimeState?.();
        }

        if (this.ctx && this.canvas) {
            this.ctx.clearRect?.(0, 0, this.canvas.width, this.canvas.height);
            if (typeof this.ctx.getImageData === 'function') {
                this.pages = [this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height)];
            } else {
                this.pages = [];
            }
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
}

function getRecoveryFailureMessage() {
        return window.i18n?.t('recovery.restoreFailed') || 'Failed to restore your previous content. Please try again.';
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
        modal.classList.add('show');
        scheduleFrame(() => {
            (restoreBtn || discardBtn || modal)?.focus?.();
        });

        modal.onkeydown = (event) => {
            if (event.key === 'Escape') {
                event.preventDefault();
                closeModal();
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
                await this.clearSessionData();
                setPendingState(false);
                closeModal();
            };
        }
    
}

async function restoreSession() {
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
                } catch (snapshotError) {
                    console.warn('Failed to parse sync session snapshot:', snapshotError);
                    syncSnapshot = null;
                }
            }

            const indexedDbTimestamp = Number(sessionData?.timestamp || 0);
            const syncSnapshotTimestamp = Number(syncSnapshot?.timestamp || 0);
            shouldMergeSyncSnapshot = !!(syncSnapshot && syncSnapshotTimestamp >= indexedDbTimestamp);

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
                sessionData = {
                    ...sessionData,
                    settings: {
                        ...(sessionData.settings || {}),
                        ...(syncSnapshot.settings || {}),
                        currentPage: syncSnapshot.currentPage || sessionData.settings?.currentPage || 1
                    },
                    timestamp: Math.max(indexedDbTimestamp, syncSnapshotTimestamp)
                };
            }

            if (!sessionData) return false;

            const { pages, pagesRaw, settings } = sessionData;
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
                if (typeof settings.patternDensity !== 'undefined') this.backgroundManager.patternDensity = settings.patternDensity;
                resetTransientBackgroundMediaState(this.backgroundManager);
                if (typeof settings.coordinateOriginX !== 'undefined') {
                    this.backgroundManager.coordinateOriginX = settings.coordinateOriginX;
                    this.backgroundManager.coordinateOriginY = settings.coordinateOriginY;
                }
                this.backgroundManager.setCoordinateOverlayState(settings.coordinateOverlayState, { persist: false, redraw: false });
                if (typeof settings.imageSize !== 'undefined') this.backgroundManager.imageSize = settings.imageSize;
                if (settings.backgroundImageData) this.backgroundManager.backgroundImageData = settings.backgroundImageData;
                if (settings.imageTransform) {
                    this.backgroundManager.imageTransform = normalizeImageTransform(settings.imageTransform);
                }
                if (typeof settings.backgroundOutsideLayerOrder !== 'undefined') {
                    this.backgroundManager.backgroundOutsideLayerOrder = settings.backgroundOutsideLayerOrder;
                }

                if (settings.uploadedImages) {
                    this.uploadedImages = settings.uploadedImages;
                    this.updateUploadedImagesButtons();
                }

                // Restore current page index
                if (settings.currentPage) this.currentPage = settings.currentPage;

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

            // Restore pages
            if (pagesRaw && Array.isArray(pagesRaw) && pagesRaw.length > 0) {
                this.pages = pagesRaw;
            } else if (pages && Array.isArray(pages)) {
                // Use allSettled so a single corrupted page blob doesn't wipe every page.
                const results = await Promise.allSettled(pages.map(blob => StorageManager.blobToImageData(blob)));
                this.pages = results.map((result, index) => {
                    if (result.status === 'fulfilled') return result.value;
                    console.warn(`[Session] Failed to restore page ${index + 1}:`, result.reason);
                    return this.ctx.createImageData(this.canvas.width, this.canvas.height);
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
                            this.pages.push(offscreenCtx.createImageData(offscreen.width, offscreen.height));
                        }
                        this.pages[snapshotPageIndex] = snapshotPage;
                    }

                    this.currentPage = snapshotPageIndex + 1;
                }
            }

            if (syncSnapshot?.currentPageScene && (shouldMergeSyncSnapshot || Object.keys(serializedPageScenes).length === 0)) {
                serializedPageScenes[String(syncSnapshot.currentPage || this.currentPage || 1)] = syncSnapshot.currentPageScene;
            }

            if (!Array.isArray(this.pages) || this.pages.length === 0) {
                this.pages = [this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height)];
                this.currentPage = 1;
            }

            await this.applySerializedPageScenes(serializedPageScenes);
            if (this.insertTextManager) {
                this.selectionManager?.setTextManager?.(this.insertTextManager);
            }

            // Apply restored state
            this.loadPage(this.currentPage);
            this.updateUI();
            this.updateZoomUI();
            this.applyZoom(false);
            this.updatePaginationUI();

            // Sync UI controls
            this.syncSettingsUI(settings);

            this.hasUnresolvedRecoveryData = false;
            console.log('Session restored');
            return true;
        } catch (e) {
            console.warn('Failed to restore session:', e);
            return false;
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
        try {
            await this.storageManager.clearSession();
        } catch (e) {
            console.warn('Failed to clear persistent session:', e);
        }

        try {
            this.storageManager.clearSessionSizeEstimate();
        } catch (e) {
            console.warn('Failed to clear session size estimate:', e);
        }

        try {
            clearCanvasStateStorage(this);
        } catch (e) {
            console.warn('Failed to clear local session snapshot:', e);
        }

        resetRuntimeCanvasState.call(this);
        this.hasUnresolvedRecoveryData = false;
    
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
