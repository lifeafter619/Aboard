// Project Manager Module
// Handles exporting and importing full project state (.aboard files)

class ProjectManager {
    constructor(drawingBoard) {
        this.drawingBoard = drawingBoard;
    }

    // Helper to convert ImageData to Base64 string
    async imageDataToBase64(imageData) {
        if (!imageData) return null;
        const canvas = document.createElement('canvas');
        canvas.width = imageData.width;
        canvas.height = imageData.height;
        const ctx = canvas.getContext('2d');
        ctx.putImageData(imageData, 0, 0);
        return canvas.toDataURL('image/png');
    }

    // Helper to convert Base64 string to ImageData
    async base64ToImageData(base64) {
        if (!base64) return null;
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                canvas.width = img.width;
                canvas.height = img.height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0);
                resolve(ctx.getImageData(0, 0, canvas.width, canvas.height));
            };
            img.onerror = reject;
            img.src = base64;
        });
    }

    async exportProject(scope, filename, selectedPages = []) {
        try {
            const exportData = {
                version: '1.0',
                timestamp: Date.now(),
                pages: [],
                pageBackgrounds: {},
                settings: {},
                uploadedImages: this.drawingBoard.uploadedImages || []
            };

            // 1. Gather Pages
            let pagesToExport = [];
            const allPages = this.drawingBoard.pages;

            if (scope === 'current') {
                // Ensure current page is up to date
                const currentIdx = this.drawingBoard.currentPage - 1;
                // Get fresh data from context if it's the current page
                const currentImageData = this.drawingBoard.ctx.getImageData(0, 0, this.drawingBoard.canvas.width, this.drawingBoard.canvas.height);
                pagesToExport.push({ index: currentIdx, data: currentImageData });
            } else if (scope === 'specific') {
                // Save current page state first
                const currentIdx = this.drawingBoard.currentPage - 1;
                this.drawingBoard.pages[currentIdx] = this.drawingBoard.ctx.getImageData(0, 0, this.drawingBoard.canvas.width, this.drawingBoard.canvas.height);

                selectedPages.forEach(pageNum => {
                    const idx = pageNum - 1;
                    if (allPages[idx]) {
                        pagesToExport.push({ index: idx, data: allPages[idx] });
                    }
                });
            } else {
                // All pages
                // Save current page state first
                const currentIdx = this.drawingBoard.currentPage - 1;
                this.drawingBoard.pages[currentIdx] = this.drawingBoard.ctx.getImageData(0, 0, this.drawingBoard.canvas.width, this.drawingBoard.canvas.height);

                allPages.forEach((data, idx) => {
                    if (data) {
                        pagesToExport.push({ index: idx, data: data });
                    }
                });
            }

            // Convert pages to Base64
            exportData.pages = await Promise.all(pagesToExport.map(async (p) => {
                return {
                    index: p.index + 1, // Store as 1-based index
                    data: await this.imageDataToBase64(p.data)
                };
            }));

            // 2. Gather Backgrounds
            exportData.pageBackgrounds = this.drawingBoard.pageBackgrounds;
            exportData.globalBackground = {
                backgroundColor: this.drawingBoard.backgroundManager.backgroundColor,
                backgroundPattern: this.drawingBoard.backgroundManager.backgroundPattern,
                bgOpacity: this.drawingBoard.backgroundManager.bgOpacity,
                patternIntensity: this.drawingBoard.backgroundManager.patternIntensity,
                patternDensity: this.drawingBoard.backgroundManager.patternDensity,
                imageSize: this.drawingBoard.backgroundManager.imageSize,
                backgroundImageData: this.drawingBoard.backgroundManager.backgroundImageData,
                // Enhanced background state
                coordinateOriginX: this.drawingBoard.backgroundManager.coordinateOriginX,
                coordinateOriginY: this.drawingBoard.backgroundManager.coordinateOriginY,
                imageTransform: this.drawingBoard.backgroundManager.imageTransform,
                gifLoopCount: this.drawingBoard.backgroundManager.gifLoopCount
            };

            // 3. Gather Settings (Canvas size, etc.)
            exportData.settings = {
                canvasWidth: this.drawingBoard.settingsManager.canvasWidth,
                canvasHeight: this.drawingBoard.settingsManager.canvasHeight,
                canvasPreset: this.drawingBoard.settingsManager.canvasPreset,
                unlimitedZoom: this.drawingBoard.settingsManager.unlimitedZoom
            };

            // 4. Download
            const jsonStr = JSON.stringify(exportData);
            const blob = new Blob([jsonStr], { type: 'application/json' });
            const url = URL.createObjectURL(blob);

            const link = document.createElement('a');
            link.href = url;
            link.download = filename.endsWith('.aboard') ? filename : `${filename}.aboard`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);

            return true;
        } catch (e) {
            console.error('Export failed:', e);
            window.appDialog?.showAlert('导出项目失败: ' + e.message, 'error');
            return false;
        }
    }

    async importProject(file) {
        if (!file) return;

        try {
            const text = await file.text();
            let data;
            try {
                data = JSON.parse(text);
            } catch (e) {
                throw new Error('无效的项目文件格式');
            }

            if (!data.pages || !Array.isArray(data.pages)) {
                throw new Error('项目文件缺少页面数据');
            }

            // Confirm overwrite
            const confirmed = await window.appDialog?.showConfirm('导入项目将覆盖当前画布内容，是否继续？');
            if (!confirmed) {
                return;
            }

            // 1. Restore Settings
            if (data.settings) {
                if (data.settings.canvasWidth && data.settings.canvasHeight) {
                    this.drawingBoard.settingsManager.setCanvasSize(data.settings.canvasWidth, data.settings.canvasHeight);
                    // Update inputs
                    const widthInput = document.getElementById('canvas-width-input');
                    const heightInput = document.getElementById('canvas-height-input');
                    if (widthInput) widthInput.value = data.settings.canvasWidth;
                    if (heightInput) heightInput.value = data.settings.canvasHeight;
                }
                if (data.settings.canvasPreset) {
                    this.drawingBoard.settingsManager.canvasPreset = data.settings.canvasPreset;
                }
                if (typeof data.settings.unlimitedZoom !== 'undefined') {
                    this.drawingBoard.settingsManager.unlimitedZoom = data.settings.unlimitedZoom;
                    const zoomCheck = document.getElementById('unlimited-zoom-checkbox');
                    if (zoomCheck) zoomCheck.checked = data.settings.unlimitedZoom;
                    this.drawingBoard.updateMaxCanvasScale();
                }
            }

            // Apply canvas size changes
            this.drawingBoard.applyCanvasSize();

            // 2. Restore Uploaded Images
            if (data.uploadedImages) {
                this.drawingBoard.uploadedImages = data.uploadedImages;
                this.drawingBoard.updateUploadedImagesButtons();
                localStorage.setItem('uploadedImages', JSON.stringify(data.uploadedImages));
            }

            // 3. Restore Backgrounds
            if (data.pageBackgrounds) {
                this.drawingBoard.pageBackgrounds = data.pageBackgrounds;
            }
            if (data.globalBackground) {
                const bg = data.globalBackground;
                const bm = this.drawingBoard.backgroundManager;
                if (bg.backgroundColor) bm.backgroundColor = bg.backgroundColor;
                if (bg.backgroundPattern) bm.backgroundPattern = bg.backgroundPattern;
                if (typeof bg.bgOpacity !== 'undefined') bm.bgOpacity = bg.bgOpacity;
                if (typeof bg.patternIntensity !== 'undefined') bm.patternIntensity = bg.patternIntensity;
                if (typeof bg.patternDensity !== 'undefined') bm.patternDensity = bg.patternDensity;
                if (typeof bg.imageSize !== 'undefined') bm.imageSize = bg.imageSize;

                // Restore enhanced background state
                if (typeof bg.coordinateOriginX !== 'undefined') bm.setCoordinateOrigin(bg.coordinateOriginX, bg.coordinateOriginY);
                if (bg.imageTransform) bm.updateImageTransform(bg.imageTransform);
                if (typeof bg.gifLoopCount !== 'undefined') bm.setGifLoopCount(bg.gifLoopCount);

                if (bg.backgroundImageData) {
                    bm.backgroundImageData = bg.backgroundImageData;
                    // Load image
                    const img = new Image();
                    img.src = bg.backgroundImageData;
                    bm.backgroundImage = img;
                } else {
                    bm.backgroundImage = null;
                }
            }

            // 4. Restore Pages
            // Reset pages array
            this.drawingBoard.pages = [];

            // Sort pages by index
            data.pages.sort((a, b) => a.index - b.index);

            // We need to fill gaps if indices are not sequential, but generally we just push
            // Assuming exported "All Pages" results in 1, 2, 3...

            // If specific pages were exported, we might have 1, 3, 5.
            // In that case, we should probably just treat them as Page 1, 2, 3 of the new project.

            for (const p of data.pages) {
                const imageData = await this.base64ToImageData(p.data);
                this.drawingBoard.pages.push(imageData);
            }

            // If no pages, create one blank
            if (this.drawingBoard.pages.length === 0) {
                const blank = this.drawingBoard.ctx.createImageData(this.drawingBoard.canvas.width, this.drawingBoard.canvas.height);
                this.drawingBoard.pages.push(blank);
            }

            // 5. Reset UI
            this.drawingBoard.currentPage = 1;
            this.drawingBoard.loadPage(1);
            this.drawingBoard.updatePaginationUI();
            this.drawingBoard.updateBackgroundUI();

            // Save to storage
            this.drawingBoard.saveSessionDebounced();

            window.appDialog?.showAlert('项目导入成功', 'success');

        } catch (e) {
            console.error('Import failed:', e);
            window.appDialog?.showAlert('导入失败: ' + e.message, 'error');
        }
    }
}
