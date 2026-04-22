// Extracted runtime from main.js
// Preserves legacy board instance semantics by invoking methods with board as this.

const SESSION_PERSISTENCE_PLANNED_UPDATE_RELOAD_KEY = 'aboardPlannedUpdateReload';

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

function buildSyncSnapshot() {
        try {
            if (this.currentPage > 0 && this.currentPage <= this.pages.length) {
                this.pages[this.currentPage - 1] = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
            }
            this.savePageBackground(this.currentPage);
            this.saveCurrentPageScene?.(this.currentPage);

            return {
                timestamp: Date.now(),
                currentPage: this.currentPage,
                canvasWidth: this.canvas.width,
                canvasHeight: this.canvas.height,
                pageDataUrl: this.canvas.toDataURL('image/png'),
                currentPageScene: this.getPageScene?.(this.currentPage, { serializable: true }) || null,
                settings: {
                    currentTool: this.drawingEngine.currentTool,
                    penSize: this.drawingEngine.penSize,
                    penColor: this.drawingEngine.currentColor,
                    penType: this.drawingEngine.penType,
                    eraserSize: this.drawingEngine.eraserSize,
                    eraserShape: this.drawingEngine.eraserShape,
                    canvasScale: this.drawingEngine.canvasScale,
                    panOffset: this.drawingEngine.panOffset,
                    pageBackgrounds: this.pageBackgrounds,
                    backgroundColor: this.backgroundManager.backgroundColor,
                    backgroundPattern: this.backgroundManager.backgroundPattern,
                    bgOpacity: this.backgroundManager.bgOpacity,
                    patternIntensity: this.backgroundManager.patternIntensity,
                    patternDensity: this.backgroundManager.patternDensity,
                    coordinateOriginX: this.backgroundManager.coordinateOriginX,
                    coordinateOriginY: this.backgroundManager.coordinateOriginY,
                    coordinateOverlayState: this.backgroundManager.getCoordinateOverlayState(),
                    imageSize: this.backgroundManager.imageSize,
                    backgroundImageData: this.backgroundManager.backgroundImageData,
                    backgroundOutsideLayerOrder: this.backgroundManager.backgroundOutsideLayerOrder,
                    uploadedImages: this.uploadedImages
                }
            };
        } catch (e) {
            console.warn('Failed to build sync session snapshot:', e);
            return null;
        }
}

function saveSessionSnapshotSync() {
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
        try {
            saveSessionSnapshotSync.call(this);
            this.saveCurrentPageScene?.(this.currentPage);

            // Convert all pages to Blobs
            const pagesBlobs = await Promise.all(this.pages.map(page => StorageManager.imageDataToBlob(page)));

            // Collect settings
            const settings = {
                currentTool: this.drawingEngine.currentTool,
                penSize: this.drawingEngine.penSize,
                penColor: this.drawingEngine.currentColor,
                penType: this.drawingEngine.penType,
                eraserSize: this.drawingEngine.eraserSize,
                eraserShape: this.drawingEngine.eraserShape,
                currentPage: this.currentPage,
                canvasScale: this.drawingEngine.canvasScale,
                panOffset: this.drawingEngine.panOffset,
                pageBackgrounds: this.pageBackgrounds,
                // Global background settings
                backgroundColor: this.backgroundManager.backgroundColor,
                backgroundPattern: this.backgroundManager.backgroundPattern,
                bgOpacity: this.backgroundManager.bgOpacity,
                patternIntensity: this.backgroundManager.patternIntensity,
                patternDensity: this.backgroundManager.patternDensity,
                coordinateOriginX: this.backgroundManager.coordinateOriginX,
                coordinateOriginY: this.backgroundManager.coordinateOriginY,
                coordinateOverlayState: this.backgroundManager.getCoordinateOverlayState(),
                imageSize: this.backgroundManager.imageSize,
                backgroundImageData: this.backgroundManager.backgroundImageData,
                backgroundOutsideLayerOrder: this.backgroundManager.backgroundOutsideLayerOrder,
                uploadedImages: this.uploadedImages,
                pageScenes: this.getSerializedPageScenes?.() || {}
            };

            const data = {
                pages: pagesBlobs,
                settings: settings,
                canvasWidth: this.canvas.width,
                canvasHeight: this.canvas.height
            };

            await this.storageManager.saveSession(data);
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
                    JSON.parse(rawSyncSnapshot);
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
