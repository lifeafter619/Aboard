// Extracted runtime from main.js
// Preserves legacy board instance semantics by invoking methods with board as this.

const SESSION_PERSISTENCE_PLANNED_UPDATE_RELOAD_KEY = 'aboardPlannedUpdateReload';
const SYNC_SNAPSHOT_INLINE_DATA_URL_LIMIT = 256 * 1024;
const SESSION_WRITE_LOCK_NAME = 'aboard-session-writer';
const SESSION_WRITE_CONFLICT_BANNER_ID = 'session-write-conflict-banner';
const SESSION_WRITE_EPOCH_KEY = 'aboardSessionWriteEpoch';

function safeSessionPersistenceStorageGetItem(key) {
        try {
            return localStorage.getItem(key);
        } catch (error) {
            console.warn(`Failed to read session persistence localStorage key "${key}":`, error);
            return null;
        }
}

function safeSessionPersistenceStorageSetItem(key, value) {
        try {
            localStorage.setItem(key, value);
            return true;
        } catch (error) {
            console.warn(`Failed to write session persistence localStorage key "${key}":`, error);
            return false;
        }
}

function safeSessionPersistenceStorageRemoveItem(key) {
        try {
            localStorage.removeItem(key);
            return true;
        } catch (error) {
            console.warn(`Failed to remove session persistence localStorage key "${key}":`, error);
            return false;
        }
}

function isValidSessionPersistenceSyncSnapshot(value) {
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

function getSessionWriteConflictMessage(board) {
        const isInvalidated = board?.sessionWriteLockState === 'invalidated';
        const key = isInvalidated
            ? 'errors.sessionDataClearedElsewhere'
            : 'errors.sessionWriteConflict';
        const translated = window.i18n?.t?.(key);
        return translated && translated !== key
            ? translated
            : isInvalidated
                ? 'Saved board data was cleared in another tab. Export anything you need, then reload this tab.'
                : 'Aboard is open in another tab. Changes here will not be autosaved until that tab closes.';
}

function updateSessionWriteConflictBanner(board) {
        if (typeof document === 'undefined' || !document.body) {
            return;
        }

        let banner = document.getElementById(SESSION_WRITE_CONFLICT_BANNER_ID);
        if (board.sessionWriteLockState !== 'blocked'
            && board.sessionWriteLockState !== 'invalidated') {
            if (banner) {
                banner.hidden = true;
            }
            return;
        }

        if (!banner) {
            banner = document.createElement('div');
            banner.id = SESSION_WRITE_CONFLICT_BANNER_ID;
            banner.className = 'session-write-conflict-banner';
            banner.setAttribute('role', 'alert');
            banner.setAttribute('aria-live', 'assertive');
            banner.setAttribute('aria-atomic', 'true');
            document.body.appendChild(banner);
        }

        banner.textContent = getSessionWriteConflictMessage(board);
        banner.hidden = false;
}

function setSessionWriteLockState(board, state) {
        board.sessionWriteLockState = state;
        updateSessionWriteConflictBanner(board);
}

function holdSessionWriteLock(board) {
        return new Promise((resolve) => {
            board.releaseSessionWriteLock = resolve;
        });
}

function getStoredSessionWriteEpoch() {
        const storedEpoch = safeSessionPersistenceStorageGetItem(SESSION_WRITE_EPOCH_KEY);
        return typeof storedEpoch === 'string' && storedEpoch
            ? storedEpoch
            : '0';
}

function captureSessionWriteEpoch(board) {
        if (typeof board.sessionWriteEpoch !== 'string') {
            board.sessionWriteEpoch = getStoredSessionWriteEpoch();
        }
        return board.sessionWriteEpoch;
}

function markSessionWriteEpochInvalidated(board) {
        if (board.sessionWriteLockState === 'invalidated') {
            return;
        }
        board.sessionWriteDirtyWhileBlocked = false;
        board.sessionSaveRequestId = (board.sessionSaveRequestId || 0) + 1;
        if (board.saveTimeout) {
            clearTimeout(board.saveTimeout);
            board.saveTimeout = null;
        }
        setSessionWriteLockState(board, 'invalidated');
}

function validateSessionWriteEpoch(board) {
        const capturedEpoch = captureSessionWriteEpoch(board);
        if (capturedEpoch === getStoredSessionWriteEpoch()) {
            return true;
        }
        markSessionWriteEpochInvalidated(board);
        return false;
}

function persistSessionWriteEpoch(board) {
        const epoch = captureSessionWriteEpoch(board);
        return safeSessionPersistenceStorageSetItem(SESSION_WRITE_EPOCH_KEY, epoch);
}

function rotateSessionWriteEpoch(board) {
        const nextEpoch = `${Date.now()}-${Math.random().toString(36).slice(2, 12)}`;
        if (!safeSessionPersistenceStorageSetItem(SESSION_WRITE_EPOCH_KEY, nextEpoch)) {
            return false;
        }
        board.sessionWriteEpoch = nextEpoch;
        return true;
}

function flushPendingSessionSave(board) {
        if (!validateSessionWriteEpoch(board)) {
            return false;
        }
        const shouldSavePendingChanges = board.sessionWriteDirtyWhileBlocked === true;
        board.sessionWriteDirtyWhileBlocked = false;
        if (shouldSavePendingChanges) {
            board.saveSessionDebounced?.();
        }
        return true;
}

function isSessionWriteAllowed(board) {
        return validateSessionWriteEpoch(board)
            && board.sessionWriteLockState !== 'pending'
            && board.sessionWriteLockState !== 'blocked'
            && board.sessionWriteLockState !== 'invalidated';
}

function initializeSessionWriteLock() {
        if (this.sessionWriteLockReadyPromise) {
            return this.sessionWriteLockReadyPromise;
        }

        captureSessionWriteEpoch(this);

        let lockManager = null;
        try {
            lockManager = typeof navigator !== 'undefined' ? navigator.locks : null;
        } catch (error) {
            console.warn('The browser denied access to the Web Locks API:', error);
        }
        if (!lockManager || typeof lockManager.request !== 'function') {
            setSessionWriteLockState(this, 'unsupported');
            flushPendingSessionSave(this);
            this.sessionWriteLockReadyPromise = Promise.resolve(true);
            return this.sessionWriteLockReadyPromise;
        }

        setSessionWriteLockState(this, 'pending');
        if (!this.sessionWriteConflictLocaleHandler) {
            this.sessionWriteConflictLocaleHandler = () => updateSessionWriteConflictBanner(this);
            window.addEventListener?.('localeChanged', this.sessionWriteConflictLocaleHandler);
        }

        let resolveReady;
        this.sessionWriteLockReadyPromise = new Promise((resolve) => {
            resolveReady = resolve;
        });

        const queueForOwnership = () => {
            this.sessionWriteLockRequestPromise = lockManager.request(
                SESSION_WRITE_LOCK_NAME,
                async (lock) => {
                    if (!lock) {
                        return false;
                    }
                    if (!validateSessionWriteEpoch(this)) {
                        return false;
                    }
                    setSessionWriteLockState(this, 'owned');
                    flushPendingSessionSave(this);
                    await holdSessionWriteLock(this);
                    return true;
                }
            ).catch((error) => {
                console.warn('Failed to wait for the Aboard session write lock:', error);
                // We already observed another owner. Failing open here would
                // reintroduce the cross-tab overwrite the lock prevents.
                setSessionWriteLockState(this, 'blocked');
                return false;
            });
        };

        try {
            this.sessionWriteLockRequestPromise = lockManager.request(
                SESSION_WRITE_LOCK_NAME,
                { ifAvailable: true },
                async (lock) => {
                    if (!lock) {
                        setSessionWriteLockState(this, 'blocked');
                        resolveReady(false);
                        return false;
                    }

                    if (!validateSessionWriteEpoch(this)) {
                        resolveReady(false);
                        return false;
                    }

                    setSessionWriteLockState(this, 'owned');
                    flushPendingSessionSave(this);
                    resolveReady(true);
                    await holdSessionWriteLock(this);
                    return true;
                }
            ).then((acquired) => {
                if (acquired === false && this.sessionWriteLockState === 'blocked') {
                    queueForOwnership();
                }
                return acquired;
            }).catch((error) => {
                console.warn('Failed to acquire the Aboard session write lock:', error);
                setSessionWriteLockState(this, 'unsupported');
                flushPendingSessionSave(this);
                resolveReady(true);
                return false;
            });
        } catch (error) {
            console.warn('The browser rejected the Aboard session write lock request:', error);
            setSessionWriteLockState(this, 'unsupported');
            flushPendingSessionSave(this);
            resolveReady(true);
        }

        return this.sessionWriteLockReadyPromise;
}

function isOversizeInlineDataUrl(value) {
        return typeof value === 'string'
            && value.startsWith('data:')
            && value.length > SYNC_SNAPSHOT_INLINE_DATA_URL_LIMIT;
}

function getSessionPersistenceInlineDataUrlSignature(value) {
        if (typeof value !== 'string' || !value.startsWith('data:')) {
            return null;
        }
        const edgeLength = 64;
        return `${value.length}:${value.slice(0, edgeLength)}:${value.slice(-edgeLength)}`;
}

function cloneForSyncSnapshot(value) {
        if (isOversizeInlineDataUrl(value)) {
            return null;
        }
        if (Array.isArray(value)) {
            return value.map((item) => cloneForSyncSnapshot(item));
        }
        if (value && typeof value === 'object') {
            const cloned = {};
            Object.entries(value).forEach(([entryKey, entryValue]) => {
                if (entryKey === 'imageElement') {
                    return;
                }
                if (isOversizeInlineDataUrl(entryValue)) {
                    cloned[entryKey] = null;
                    cloned[`${entryKey}Signature`] = getSessionPersistenceInlineDataUrlSignature(entryValue);
                    return;
                }
                cloned[entryKey] = cloneForSyncSnapshot(entryValue);
            });
            return cloned;
        }
        return value;
}

function cloneForPersistentSession(value) {
        try {
            const clone = typeof window.safeDeepClone === 'function'
                ? window.safeDeepClone
                : (entry) => JSON.parse(JSON.stringify(entry));
            return clone(value);
        } catch (error) {
            console.warn('Failed to clone persistent session state:', error);
            return value;
        }
}

function isCurrentSaveRequest(board, saveRequestId) {
        return saveRequestId === board.sessionSaveRequestId
            && !board.isClearingLocalData
            && isSessionWriteAllowed(board)
            && !isRecoveryFlowBlockingSaves(board);
}

async function encodePageSnapshots(pageSnapshots, concurrency = 2) {
        const snapshots = Array.isArray(pageSnapshots) ? pageSnapshots : [];
        const blobs = new Array(snapshots.length);
        let nextIndex = 0;
        const workerCount = Math.min(Math.max(1, concurrency), snapshots.length);
        const workers = Array.from({ length: workerCount }, async () => {
            while (nextIndex < snapshots.length) {
                const index = nextIndex;
                nextIndex += 1;
                blobs[index] = await StorageManager.imageDataToBlob(snapshots[index]);
            }
        });
        await Promise.all(workers);
        return blobs;
}

function buildSyncSnapshot() {
        try {
            if (this.currentPage > 0 && this.currentPage <= this.pages.length) {
                this.pages[this.currentPage - 1] = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
            }
            this.savePageBackground(this.currentPage);
            this.saveCurrentPageScene?.(this.currentPage);
            const currentPageScene = this.getPageScene?.(this.currentPage, { serializable: true }) || null;
            const backgroundImageData = this.backgroundManager.backgroundImageData;

            return {
                timestamp: Date.now(),
                currentPage: this.currentPage,
                pageCount: Array.isArray(this.pages) ? this.pages.length : 1,
                canvasWidth: this.canvas.width,
                canvasHeight: this.canvas.height,
                currentPageScene: cloneForSyncSnapshot(currentPageScene),
                settings: {
                    currentTool: this.drawingEngine.currentTool,
                    penSize: this.drawingEngine.penSize,
                    penColor: this.drawingEngine.currentColor,
                    penType: this.drawingEngine.penType,
                    eraserSize: this.drawingEngine.eraserSize,
                    eraserShape: this.drawingEngine.eraserShape,
                    canvasScale: this.drawingEngine.canvasScale,
                    panOffset: { ...this.drawingEngine.panOffset },
                    rasterFallbackTrackingVersion: 1,
                    rasterFallbackPages: this.pageRasterFallbackPages instanceof Set
                        ? Array.from(this.pageRasterFallbackPages)
                        : [],
                    pageBackgrounds: cloneForSyncSnapshot(this.pageBackgrounds),
                    backgroundColor: this.backgroundManager.backgroundColor,
                    backgroundPattern: this.backgroundManager.backgroundPattern,
                    bgOpacity: this.backgroundManager.bgOpacity,
                    patternIntensity: this.backgroundManager.patternIntensity,
                    patternDensity: this.backgroundManager.patternDensity,
                    coordinateOriginX: this.backgroundManager.coordinateOriginX,
                    coordinateOriginY: this.backgroundManager.coordinateOriginY,
                    coordinateOverlayState: cloneForSyncSnapshot(this.backgroundManager.getCoordinateOverlayState()),
                    imageSize: this.backgroundManager.imageSize,
                    imageTransform: cloneForSyncSnapshot(this.backgroundManager.imageTransform),
                    gifLoopCount: this.backgroundManager.gifLoopCount,
                    backgroundImageData: isOversizeInlineDataUrl(backgroundImageData) ? null : backgroundImageData,
                    backgroundImageDataSignature: isOversizeInlineDataUrl(backgroundImageData)
                        ? getSessionPersistenceInlineDataUrlSignature(backgroundImageData)
                        : null,
                    backgroundOutsideLayerOrder: this.backgroundManager.backgroundOutsideLayerOrder
                }
            };
        } catch (e) {
            console.warn('Failed to build sync session snapshot:', e);
            return null;
        }
}

// While startup recovery is unresolved (check still running, prompt open, or
// restore in progress) any save would overwrite the very data the recovery
// flow is about to offer/restore — so saves must be skipped in that window.
function isRecoveryFlowBlockingSaves(board) {
        return Boolean(
            board.recoveryCheckPromise
            || board.recoveryPromptOpen
            || board.hasUnresolvedRecoveryData
            || board.isRestoringSession
        );
}

function saveSessionSnapshotSync() {
        if (!isSessionWriteAllowed(this)) {
            return null;
        }
        if (isRecoveryFlowBlockingSaves(this)) {
            return null;
        }
        const snapshot = buildSyncSnapshot.call(this);
        if (!snapshot) {
            return null;
        }

        try {
            // safeSessionPersistenceStorageSetItem swallows QuotaExceededError
            // and returns false. We must propagate that failure to callers —
            // otherwise persistSessionForUpdateReload reports hasSyncSnapshot:true
            // when nothing was actually written, PWA updates then reload,
            // and recovery finds no snapshot (data loss on multi-page boards
            // when IndexedDB is also unavailable).
            const persisted = safeSessionPersistenceStorageSetItem(
                this.syncSessionSnapshotKey || 'aboardSyncSessionSnapshot',
                JSON.stringify(snapshot)
            );
            if (!persisted) {
                return null;
            }
        } catch (e) {
            console.warn('Failed to save sync session snapshot:', e);
            return null;
        }

        return snapshot;
}

async function saveSession() {
        if (this.isClearingLocalData) return;
        if (!isSessionWriteAllowed(this)) return;
        // Skipped (not failed): the recovery flow owns the stores right now.
        if (isRecoveryFlowBlockingSaves(this)) {
            this.sessionSaveDirtyWhileRecoveryBlocked = true;
            return;
        }
        if (this.pageRasterFallbackPages instanceof Set) {
            Array.from(this.pageRasterFallbackPages).forEach((pageNumber) => {
                const base = this.getPageRasterFallbackBase?.(pageNumber)
                    || this.pageRasterFallbackBases?.get?.(pageNumber)
                    || null;
                if (base) return;
                console.warn(`Page ${pageNumber} is marked as a raster fallback but has no base image; treating it as a normal page so autosave can continue.`);
                this.pageRasterFallbackPages.delete(pageNumber);
                this.pageRasterFallbackBases?.delete?.(pageNumber);
                this.pageRasterFallbackScaledBases?.delete?.(pageNumber);
            });
        }
        const saveRequestId = (this.sessionSaveRequestId || 0) + 1;
        this.sessionSaveRequestId = saveRequestId;
        try {
            saveSessionSnapshotSync.call(this);
            this.saveCurrentPageScene?.(this.currentPage);
            this.enforcePageBitmapMemoryBudget?.();

            const pageSnapshots = Array.isArray(this.pages) ? [...this.pages] : [];
            const rasterBaseSnapshots = pageSnapshots.map((_, index) => {
                const pageNumber = index + 1;
                if (!(this.pageRasterFallbackPages instanceof Set)
                    || !this.pageRasterFallbackPages.has(pageNumber)) {
                    return null;
                }
                return this.getPageRasterFallbackBase?.(pageNumber)
                    || this.pageRasterFallbackBases?.get?.(pageNumber)
                    || null;
            });
            const canvasWidth = this.canvas.width;
            const canvasHeight = this.canvas.height;

            // Capture settings before the asynchronous PNG conversion so one
            // save cannot combine older page pixels with newer mutable state.
            const settings = {
                currentTool: this.drawingEngine.currentTool,
                penSize: this.drawingEngine.penSize,
                penColor: this.drawingEngine.currentColor,
                penType: this.drawingEngine.penType,
                eraserSize: this.drawingEngine.eraserSize,
                eraserShape: this.drawingEngine.eraserShape,
                currentPage: this.currentPage,
                canvasScale: this.drawingEngine.canvasScale,
                panOffset: { ...this.drawingEngine.panOffset },
                rasterFallbackTrackingVersion: 1,
                rasterFallbackPages: this.pageRasterFallbackPages instanceof Set
                    ? Array.from(this.pageRasterFallbackPages)
                    : [],
                pageBackgrounds: cloneForPersistentSession(this.pageBackgrounds),
                // Global background settings
                backgroundColor: this.backgroundManager.backgroundColor,
                backgroundPattern: this.backgroundManager.backgroundPattern,
                bgOpacity: this.backgroundManager.bgOpacity,
                patternIntensity: this.backgroundManager.patternIntensity,
                patternDensity: this.backgroundManager.patternDensity,
                coordinateOriginX: this.backgroundManager.coordinateOriginX,
                coordinateOriginY: this.backgroundManager.coordinateOriginY,
                coordinateOverlayState: cloneForPersistentSession(this.backgroundManager.getCoordinateOverlayState()),
                imageSize: this.backgroundManager.imageSize,
                imageTransform: cloneForPersistentSession(this.backgroundManager.imageTransform),
                gifLoopCount: this.backgroundManager.gifLoopCount,
                backgroundImageData: this.backgroundManager.backgroundImageData,
                backgroundOutsideLayerOrder: this.backgroundManager.backgroundOutsideLayerOrder,
                uploadedImages: cloneForPersistentSession(this.uploadedImages),
                pageScenes: cloneForPersistentSession(this.getSerializedPageScenes?.() || {})
            };

            // Convert page composites and essential raster bases through one
            // bounded worker pool so the extra fallback safety does not double
            // peak canvas-encoding concurrency.
            const encodedSnapshots = await encodePageSnapshots([
                ...pageSnapshots,
                ...rasterBaseSnapshots
            ]);
            const pagesBlobs = encodedSnapshots.slice(0, pageSnapshots.length);
            const rasterFallbackBases = encodedSnapshots.slice(pageSnapshots.length);
            const failedPageIndex = pageSnapshots.findIndex((page, index) => page && !pagesBlobs[index]);
            if (failedPageIndex >= 0) {
                if (!isCurrentSaveRequest(this, saveRequestId)) {
                    return undefined;
                }
                console.warn(`Session page ${failedPageIndex + 1} could not be encoded; preserving the previous IndexedDB session.`);
                return false;
            }
            const failedRasterBaseIndex = rasterBaseSnapshots.findIndex((base, index) => {
                const isRequired = this.pageRasterFallbackPages instanceof Set
                    && this.pageRasterFallbackPages.has(index + 1);
                return isRequired && (!base || !rasterFallbackBases[index]);
            });
            if (failedRasterBaseIndex >= 0) {
                if (!isCurrentSaveRequest(this, saveRequestId)) {
                    return undefined;
                }
                console.warn(`Raster fallback base ${failedRasterBaseIndex + 1} could not be encoded; preserving the previous IndexedDB session.`);
                return false;
            }

            // A newer save or a cleanup operation supersedes this conversion.
            // Do not let the slower, older result overwrite newer session data.
            if (!isCurrentSaveRequest(this, saveRequestId)) {
                return undefined;
            }

            const data = {
                pages: pagesBlobs,
                rasterFallbackBases,
                settings: settings,
                canvasWidth,
                canvasHeight
            };

            // Serialize committed writes. Cleanup can await this tail before
            // deleting the record, while older encoders are rejected by the
            // request generation check above and below.
            const previousWrite = this.sessionPersistenceWriteTail || Promise.resolve();
            const writeResult = previousWrite.then(async () => {
                if (!isCurrentSaveRequest(this, saveRequestId)) {
                    return undefined;
                }
                return this.storageManager.saveSession(data);
            });
            const writeTail = writeResult.catch(() => false);
            this.sessionPersistenceWriteTail = writeTail;

            let savedToIndexedDb;
            try {
                savedToIndexedDb = await writeResult;
            } finally {
                if (this.sessionPersistenceWriteTail === writeTail) {
                    this.sessionPersistenceWriteTail = null;
                }
            }
            if (typeof savedToIndexedDb === 'undefined') {
                return undefined;
            }
            if (!savedToIndexedDb) {
                console.warn('Session was not saved to IndexedDB.');
                return false;
            }
            console.log('Session saved to IndexedDB');
            return true;
        } catch (e) {
            console.warn('Failed to save session:', e);
            return false;
        }
    
}

async function persistSessionForUpdateReload(metadata = {}) {
        const snapshot = saveSessionSnapshotSync.call(this);
        const hasSyncSnapshot = Boolean(snapshot);
        const savedToIndexedDb = await saveSession.call(this);

        return {
            metadata,
            hasSyncSnapshot,
            savedToIndexedDb: Boolean(savedToIndexedDb),
            snapshot
        };
}

async function checkForRecovery() {
        try {
            this.hasUnresolvedRecoveryData = false;
            this.recoveryPromptOpen = false;
            const hasSession = await this.storageManager.hasSession();
            const rawSyncSnapshot = safeSessionPersistenceStorageGetItem(this.syncSessionSnapshotKey || 'aboardSyncSessionSnapshot');
            const rawPlannedUpdateReload = safeSessionPersistenceStorageGetItem(SESSION_PERSISTENCE_PLANNED_UPDATE_RELOAD_KEY);
            let hasSyncSnapshot = false;
            let plannedUpdateReload = null;

            if (rawSyncSnapshot) {
                try {
                    const parsedSyncSnapshot = JSON.parse(rawSyncSnapshot);
                    if (!isValidSessionPersistenceSyncSnapshot(parsedSyncSnapshot)) {
                        throw new Error('Invalid synchronous session snapshot payload.');
                    }
                    hasSyncSnapshot = true;
                } catch (snapshotError) {
                    console.warn('Ignoring invalid sync session snapshot:', snapshotError);
                    safeSessionPersistenceStorageRemoveItem(this.syncSessionSnapshotKey || 'aboardSyncSessionSnapshot');
                }
            }

            if (rawPlannedUpdateReload) {
                try {
                    const parsedPlannedUpdateReload = JSON.parse(rawPlannedUpdateReload);
                    if (parsedPlannedUpdateReload?.reason === 'update') {
                        plannedUpdateReload = parsedPlannedUpdateReload;
                    } else {
                        safeSessionPersistenceStorageRemoveItem(SESSION_PERSISTENCE_PLANNED_UPDATE_RELOAD_KEY);
                    }
                } catch (plannedReloadError) {
                    console.warn('Ignoring invalid planned update reload payload:', plannedReloadError);
                    safeSessionPersistenceStorageRemoveItem(SESSION_PERSISTENCE_PLANNED_UPDATE_RELOAD_KEY);
                }
            }

            if (plannedUpdateReload) {
                // Planned update reload is a one-shot trigger. Consume it as
                // soon as it is recognized so stale markers never leak into
                // future sessions, even when recovery data is gone or restore fails.
                safeSessionPersistenceStorageRemoveItem(SESSION_PERSISTENCE_PLANNED_UPDATE_RELOAD_KEY);
            }

            if (plannedUpdateReload && (hasSession || hasSyncSnapshot)) {
                const restored = await this.restoreSession();
                if (restored) {
                    return true;
                }
            }

            if (hasSession || hasSyncSnapshot) {
                this.hasUnresolvedRecoveryData = true;
                this.showRecoveryModal();
                return true;
            }
        } catch (e) {
            console.warn('Error checking for recovery:', e);
        }

        return false;
    
}

window.AboardSessionPersistenceRuntime = {
    initializeSessionWriteLock(board) {
        return initializeSessionWriteLock.call(board);
    },
    isSessionWriteAllowed(board) {
        return isSessionWriteAllowed(board);
    },
    persistSessionWriteEpoch(board) {
        return persistSessionWriteEpoch(board);
    },
    rotateSessionWriteEpoch(board) {
        return rotateSessionWriteEpoch(board);
    },
    saveSessionSnapshotSync(board) {
        return saveSessionSnapshotSync.call(board);
    },
    saveSession(board) {
        return saveSession.call(board);
    },
    persistSessionForUpdateReload(board, metadata) {
        return persistSessionForUpdateReload.call(board, metadata);
    },
    checkForRecovery(board) {
        return checkForRecovery.call(board);
    }
};
