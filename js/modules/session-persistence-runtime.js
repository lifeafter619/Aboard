// Extracted runtime from main.js
// Preserves legacy board instance semantics by invoking methods with board as this.

function buildSyncSnapshot() {
        try {
            if (this.currentPage > 0 && this.currentPage <= this.pages.length) {
                this.pages[this.currentPage - 1] = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
            }
            this.savePageBackground(this.currentPage);

            return {
                timestamp: Date.now(),
                currentPage: this.currentPage,
                canvasWidth: this.canvas.width,
                canvasHeight: this.canvas.height,
                pageDataUrl: this.canvas.toDataURL('image/png'),
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
                    backgroundOutsideLayerOrder: this.backgroundManager.backgroundOutsideLayerOrder || 1,
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
                backgroundOutsideLayerOrder: this.backgroundManager.backgroundOutsideLayerOrder || 1,
                uploadedImages: this.uploadedImages,
                objectGroups: this.drawingEngine.objectGroups || [],
                // Text objects for selection support after restore
                textObjects: this.insertTextManager ? this.insertTextManager.getTextObjects() : [],
                // Strokes for selection support after restore
                strokes: this.drawingEngine.strokes.map(s => ({
                    points: s.points.map(p => ({ x: p.x, y: p.y })),
                    color: s.color,
                    size: s.size,
                    penType: s.penType,
                    tool: s.tool,
                    lineStyle: s.lineStyle || 'solid',
                    dashDensity: s.dashDensity || 10,
                    renderMode: s.renderMode || null,
                    shapeType: s.shapeType || null,
                    shapeStart: s.shapeStart ? { ...s.shapeStart } : null,
                    shapeEnd: s.shapeEnd ? { ...s.shapeEnd } : null,
                    shapeLineStyle: s.shapeLineStyle || null,
                    shapeDashDensity: s.shapeDashDensity || null,
                    shapeWaveDensity: s.shapeWaveDensity || null,
                    shapeMultiLineCount: s.shapeMultiLineCount || null,
                    shapeMultiLineSpacing: s.shapeMultiLineSpacing || null,
                    arrowSize: s.arrowSize || null,
                    eraserShape: s.eraserShape || null,
                    rotation: s.rotation || 0,
                    layerOrder: s.layerOrder || 0,
                    objectId: s.objectId || this.drawingEngine.getNextObjectId(),
                    groupId: s.groupId || null
                })),
                stampedImages: this.drawingEngine.stampedImages.map(img => ({
                    imageSrc: img.imageSrc || (img.imageElement ? img.imageElement.src : null),
                    x: img.x,
                    y: img.y,
                    width: img.width,
                    height: img.height,
                    rotation: img.rotation || 0,
                    flipHorizontal: img.flipHorizontal || false,
                    flipVertical: img.flipVertical || false,
                    layerOrder: img.layerOrder || 0,
                    objectId: img.objectId || this.drawingEngine.getNextObjectId(),
                    groupId: img.groupId || null
                }))
            };

            const data = {
                pages: pagesBlobs,
                settings: settings,
                canvasWidth: this.canvas.width,
                canvasHeight: this.canvas.height
            };

            await this.storageManager.saveSession(data);
            console.log('Session saved to IndexedDB');
        } catch (e) {
            console.warn('Failed to save session:', e);
        }
    
}

async function checkForRecovery() {
        try {
            const hasSession = await this.storageManager.hasSession();
            const rawSyncSnapshot = localStorage.getItem(this.syncSessionSnapshotKey || 'aboardSyncSessionSnapshot');
            let hasSyncSnapshot = false;

            if (rawSyncSnapshot) {
                try {
                    JSON.parse(rawSyncSnapshot);
                    hasSyncSnapshot = true;
                } catch (snapshotError) {
                    console.warn('Ignoring invalid sync session snapshot:', snapshotError);
                    localStorage.removeItem(this.syncSessionSnapshotKey || 'aboardSyncSessionSnapshot');
                }
            }

            if (hasSession || hasSyncSnapshot) {
                this.showRecoveryModal();
            }
        } catch (e) {
            console.warn('Error checking for recovery:', e);
        }
    
}

window.AboardSessionPersistenceRuntime = {
    saveSessionSnapshotSync(board) {
        return saveSessionSnapshotSync.call(board);
    },
    saveSession(board) {
        return saveSession.call(board);
    },
    checkForRecovery(board) {
        return checkForRecovery.call(board);
    }
};
