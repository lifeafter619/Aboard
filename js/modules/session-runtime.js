// Extracted session lifecycle runtime from main.js
// Preserves legacy board instance semantics by invoking methods with board as this.

const PLANNED_UPDATE_RELOAD_KEY = 'aboardPlannedUpdateReload';

function showRecoveryModal() {
        const modal = document.getElementById('recovery-modal');
        if (!modal) return;
        
        modal.classList.add('show');
        
        // Restore button
        const restoreBtn = document.getElementById('recovery-restore-btn');
        if (restoreBtn) {
            restoreBtn.onclick = () => {
                this.restoreSession();
                modal.classList.remove('show');
            };
        }
        
        // Discard button
        const discardBtn = document.getElementById('recovery-discard-btn');
        if (discardBtn) {
            discardBtn.onclick = () => {
                this.clearSessionData();
                modal.classList.remove('show');
            };
        }
    
}

async function restoreSession() {
        try {
            let sessionData = await this.storageManager.loadSession();
            let syncSnapshot = null;
            let shouldMergeSyncSnapshot = false;

            const rawSnapshot = localStorage.getItem(this.syncSessionSnapshotKey || 'aboardSyncSessionSnapshot');
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
                if (settings.panOffset) this.drawingEngine.panOffset = settings.panOffset;

                // Restore Backgrounds
                if (settings.pageBackgrounds) this.pageBackgrounds = settings.pageBackgrounds;
                if (settings.backgroundColor) this.backgroundManager.backgroundColor = settings.backgroundColor;
                if (settings.backgroundPattern) this.backgroundManager.backgroundPattern = settings.backgroundPattern;
                if (typeof settings.bgOpacity !== 'undefined') this.backgroundManager.bgOpacity = settings.bgOpacity;
                if (typeof settings.patternIntensity !== 'undefined') this.backgroundManager.patternIntensity = settings.patternIntensity;
                if (typeof settings.patternDensity !== 'undefined') this.backgroundManager.patternDensity = settings.patternDensity;
                if (typeof settings.coordinateOriginX !== 'undefined') {
                    this.backgroundManager.coordinateOriginX = settings.coordinateOriginX;
                    this.backgroundManager.coordinateOriginY = settings.coordinateOriginY;
                }
                this.backgroundManager.setCoordinateOverlayState(settings.coordinateOverlayState, { persist: false, redraw: false });
                if (typeof settings.imageSize !== 'undefined') this.backgroundManager.imageSize = settings.imageSize;
                if (settings.backgroundImageData) this.backgroundManager.backgroundImageData = settings.backgroundImageData;
                if (settings.backgroundOutsideLayerOrder) this.backgroundManager.backgroundOutsideLayerOrder = settings.backgroundOutsideLayerOrder;

                if (settings.uploadedImages) {
                    this.uploadedImages = settings.uploadedImages;
                    this.updateUploadedImagesButtons();
                }

                // Restore current page index
                if (settings.currentPage) this.currentPage = settings.currentPage;

                // Restore text objects for selection support
                if (settings.textObjects && settings.textObjects.length > 0) {
                    const insertTextManager = await this.getInsertTextManager();
                    insertTextManager.setTextObjects(settings.textObjects);
                }

                // Restore strokes for selection support
                if (settings.strokes && settings.strokes.length > 0) {
                    this.drawingEngine.strokes = settings.strokes.map(stroke => ({
                        ...stroke,
                        lineStyle: stroke.lineStyle || 'solid',
                        dashDensity: stroke.dashDensity || 10,
                        groupId: stroke.groupId || null
                    }));
                } else {
                    this.drawingEngine.strokes = [];
                }

                // Restore stamped images for selection support
                if (settings.stampedImages && settings.stampedImages.length > 0) {
                    const loadImage = (src) => new Promise((resolve) => {
                        const img = new Image();
                        img.onload = () => resolve(img);
                        img.onerror = () => resolve(null);
                        img.src = src;
                    });

                    const stampedImages = await Promise.all(settings.stampedImages.map(async (imgData) => {
                        const imageSrc = imgData.imageSrc || imgData.src;
                        const imageElement = imageSrc ? await loadImage(imageSrc) : null;
                        return {
                            ...imgData,
                            imageSrc: imageSrc || null,
                            imageElement
                        };
                    }));

                    this.drawingEngine.stampedImages = stampedImages;
                } else {
                    this.drawingEngine.stampedImages = [];
                }

                this.drawingEngine.objectGroups = settings.objectGroups || [];

                // Link selection manager to text manager for selection to work
                if (this.insertTextManager) {
                    this.selectionManager.setTextManager(this.insertTextManager);
                }

                this.drawingEngine.syncLayerCounter(this.insertTextManager?.textObjects || []);
                this.drawingEngine.cleanupGroups(this.insertTextManager?.textObjects || []);
                this.drawingEngine.updateOffCanvasImageMirrors(this.insertTextManager?.textObjects || []);
            }

            // Restore pages
            if (pagesRaw && Array.isArray(pagesRaw) && pagesRaw.length > 0) {
                this.pages = pagesRaw;
            } else if (pages && Array.isArray(pages)) {
                this.pages = await Promise.all(pages.map(blob => StorageManager.blobToImageData(blob)));
            }

            if (syncSnapshot?.pageDataUrl) {
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

                    if (shouldMergeSyncSnapshot || !sessionData?.pages?.length) {
                        this.currentPage = snapshotPageIndex + 1;
                    }
                }
            }

            if (!Array.isArray(this.pages) || this.pages.length === 0) {
                this.pages = [this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height)];
                this.currentPage = 1;
            }

            // Apply restored state
            this.loadPage(this.currentPage);
            this.updateUI();
            this.updateZoomUI();
            this.applyZoom(false);
            this.updatePaginationUI();

            // Sync UI controls
            this.syncSettingsUI(settings);

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
            penSizeValue.textContent = settings.penSize;
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
    
}

async function clearSessionData() {
        try {
            await this.storageManager.clearSession();
            this.storageManager.clearSessionSizeEstimate();
            // Also clear legacy localStorage data to be clean
            localStorage.removeItem('savedCanvasData');
            localStorage.removeItem('savedBgCanvasData');
            localStorage.removeItem('savedCanvasTimestamp');
            localStorage.removeItem('savedCurrentPage');
            localStorage.removeItem(this.syncSessionSnapshotKey || 'aboardSyncSessionSnapshot');
            localStorage.removeItem(PLANNED_UPDATE_RELOAD_KEY);
        } catch (e) {
            console.warn('Failed to clear session:', e);
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
