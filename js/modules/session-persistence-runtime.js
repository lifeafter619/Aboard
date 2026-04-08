// Extracted runtime from main.js
// Preserves legacy board instance semantics by invoking methods with board as this.

const SESSION_PERSISTENCE_PLANNED_UPDATE_RELOAD_KEY = 'aboardPlannedUpdateReload';

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
            localStorage.setItem(this.syncSessionSnapshotKey || 'aboardSyncSessionSnapshot', JSON.stringify(snapshot));
        } catch (e) {
            console.warn('Failed to save sync session snapshot:', e);
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
            const hasSession = await this.storageManager.hasSession();
            const rawSyncSnapshot = localStorage.getItem(this.syncSessionSnapshotKey || 'aboardSyncSessionSnapshot');
            const rawPlannedUpdateReload = localStorage.getItem(SESSION_PERSISTENCE_PLANNED_UPDATE_RELOAD_KEY);
            let hasSyncSnapshot = false;
            let plannedUpdateReload = null;

            if (rawSyncSnapshot) {
                try {
                    JSON.parse(rawSyncSnapshot);
                    hasSyncSnapshot = true;
                } catch (snapshotError) {
                    console.warn('Ignoring invalid sync session snapshot:', snapshotError);
                    localStorage.removeItem(this.syncSessionSnapshotKey || 'aboardSyncSessionSnapshot');
                }
            }

            if (rawPlannedUpdateReload) {
                try {
                    const parsedPlannedUpdateReload = JSON.parse(rawPlannedUpdateReload);
                    if (parsedPlannedUpdateReload?.reason === 'update') {
                        plannedUpdateReload = parsedPlannedUpdateReload;
                    } else {
                        localStorage.removeItem(SESSION_PERSISTENCE_PLANNED_UPDATE_RELOAD_KEY);
                    }
                } catch (plannedReloadError) {
                    console.warn('Ignoring invalid planned update reload payload:', plannedReloadError);
                    localStorage.removeItem(SESSION_PERSISTENCE_PLANNED_UPDATE_RELOAD_KEY);
                }
            }

            if (plannedUpdateReload && (hasSession || hasSyncSnapshot)) {
                const restored = await this.restoreSession();
                if (restored) {
                    localStorage.removeItem(SESSION_PERSISTENCE_PLANNED_UPDATE_RELOAD_KEY);
                    return true;
                }
            }

            if (hasSession || hasSyncSnapshot) {
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
