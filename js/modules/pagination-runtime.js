// Extracted runtime from main.js
// Preserves legacy board instance semantics by invoking methods with board as this.

// Maximum number of pages; keep in sync with PROJECT_IMPORT_MAX_PAGES in project-manager.js.
const MAX_PAGES = 300;

function normalizePageNumber(pageNumber, fallback = 1) {
        const normalizedPage = parseInt(pageNumber, 10);
        if (!Number.isInteger(normalizedPage) || normalizedPage <= 0) {
            return fallback;
        }
        if (normalizedPage > MAX_PAGES) {
            console.warn(`Page number ${normalizedPage} exceeds the maximum of ${MAX_PAGES} pages; clamping.`);
            return MAX_PAGES;
        }
        return normalizedPage;
}

function cloneSerializable(value) {
        return (window.safeDeepClone || ((v) => JSON.parse(JSON.stringify(v))))(value);
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

function normalizeBackgroundState(backgroundManager, backgroundState) {
        const nextBackground = backgroundState && typeof backgroundState === 'object' ? backgroundState : {};
        const hasCoordinateOverlayState = Object.prototype.hasOwnProperty.call(nextBackground, 'coordinateOverlayState');
        return {
            backgroundColor: typeof nextBackground.backgroundColor === 'string' ? nextBackground.backgroundColor : '#ffffff',
            backgroundPattern: typeof nextBackground.backgroundPattern === 'string' ? nextBackground.backgroundPattern : 'blank',
            bgOpacity: Number.isFinite(nextBackground.bgOpacity) ? nextBackground.bgOpacity : 1,
            patternIntensity: Number.isFinite(nextBackground.patternIntensity) ? nextBackground.patternIntensity : 0.5,
            patternDensity: Number.isFinite(nextBackground.patternDensity) ? nextBackground.patternDensity : 1,
            coordinateOriginX: Number.isFinite(nextBackground.coordinateOriginX) ? nextBackground.coordinateOriginX : 0,
            coordinateOriginY: Number.isFinite(nextBackground.coordinateOriginY) ? nextBackground.coordinateOriginY : 0,
            coordinateOverlayState: hasCoordinateOverlayState
                ? nextBackground.coordinateOverlayState
                : getDefaultCoordinateOverlayState(backgroundManager),
            backgroundImageData: typeof nextBackground.backgroundImageData === 'string' && nextBackground.backgroundImageData
                ? nextBackground.backgroundImageData
                : null,
            imageSize: Number.isFinite(nextBackground.imageSize) && nextBackground.imageSize > 0 ? nextBackground.imageSize : 1,
            imageTransform: normalizeImageTransform(nextBackground.imageTransform),
            gifLoopCount: Number.isFinite(nextBackground.gifLoopCount) && nextBackground.gifLoopCount >= 0
                ? nextBackground.gifLoopCount
                : 0,
            backgroundOutsideLayerOrder: Number.isFinite(nextBackground.backgroundOutsideLayerOrder)
                && nextBackground.backgroundOutsideLayerOrder >= 1
                ? nextBackground.backgroundOutsideLayerOrder
                : 1
        };
}

function clearCanvasPixels() {
        this.ctx.save?.();
        this.ctx.setTransform?.(1, 0, 0, 1, 0, 0);
        clearCanvasPixels.call(this);
        this.ctx.restore?.();
}

function isPageSnapshotCompatible(imageData) {
        return Boolean(
            imageData &&
            Number.isFinite(imageData.width) &&
            Number.isFinite(imageData.height) &&
            imageData.width === this.canvas.width &&
            imageData.height === this.canvas.height
        );
}

function scalePageSnapshotToCanvas(imageData) {
        if (!imageData || typeof document === 'undefined' || typeof document.createElement !== 'function') {
            return null;
        }

        try {
            const source = document.createElement('canvas');
            source.width = imageData.width;
            source.height = imageData.height;
            const sourceCtx = source.getContext?.('2d');
            if (!sourceCtx?.putImageData) {
                return null;
            }
            sourceCtx.putImageData(imageData, 0, 0);

            const target = document.createElement('canvas');
            target.width = this.canvas.width;
            target.height = this.canvas.height;
            const targetCtx = target.getContext?.('2d');
            if (!targetCtx?.drawImage || !targetCtx?.getImageData) {
                return null;
            }
            targetCtx.drawImage(
                source,
                0,
                0,
                imageData.width,
                imageData.height,
                0,
                0,
                target.width,
                target.height
            );
            return targetCtx.getImageData(0, 0, target.width, target.height);
        } catch (error) {
            console.warn('Failed to scale page snapshot for the current canvas size:', error);
            return null;
        }
}

function restorePageSnapshot(pageIndex) {
        const imageData = this.pages[pageIndex];
        if (!imageData) {
            return false;
        }

        const snapshot = isPageSnapshotCompatible.call(this, imageData)
            ? imageData
            : scalePageSnapshotToCanvas.call(this, imageData);
        if (!snapshot) {
            return false;
        }

        this.pages[pageIndex] = snapshot;
        clearCanvasPixels.call(this);
        this.ctx.putImageData(snapshot, 0, 0);
        return true;
}

function saveCurrentPageSnapshot() {
        // Finalize any in-progress stroke first — a second finger can tap the
        // page-switch buttons mid-stroke, and the half stroke must neither be
        // carried into the next page's stroke list nor left on this page as
        // orphan pixels missing from its vector scene.
        if (this.drawingEngine?.isDrawing) {
            this.drawingEngine.stopDrawing?.();
        }
        if (this.currentPage > 0 && this.currentPage <= this.pages.length) {
            this.pages[this.currentPage - 1] = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
        }
        this.savePageBackground?.(this.currentPage);
        this.saveCurrentPageScene?.(this.currentPage);
}

function snapshotInheritedBackgroundForNewPage(pageNumber) {
        if (pageNumber > 0) {
            this.savePageBackground?.(pageNumber);
        }
}

function resetTransientBackgroundMediaState(backgroundManager) {
        if (!backgroundManager || typeof backgroundManager !== 'object') {
            return;
        }

        backgroundManager.currentGifLoop = 0;
        backgroundManager.isImagePaused = false;
        backgroundManager.imageStaticData = null;
}

function addPage() {
        // Always in pagination mode, no need to check

        if (this.pages.length >= MAX_PAGES) {
            console.warn(`Cannot add page: maximum of ${MAX_PAGES} pages reached.`);
            this.updatePaginationUI();
            return;
        }

        // Save current page
        saveCurrentPageSnapshot.call(this);

        // Create new blank page
        this.pages.push(null);
        this.currentPage = this.pages.length;

        // Clear canvas for new page
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.pages[this.currentPage - 1] = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
        snapshotInheritedBackgroundForNewPage.call(this, this.currentPage);
        this.restorePageScene?.(this.currentPage);
        this.historyManager.reset?.();
        this.historyManager.saveState();
        this.updatePaginationUI();

}

function prevPage() {
        if (this.currentPage <= 1) return;
        
        // Save current page and background
        saveCurrentPageSnapshot.call(this);
        
        // Go to previous page
        this.currentPage--;
        this.loadPage(this.currentPage);
        this.updatePaginationUI();
    
}

function nextPage() {
        // Save current page and background
        saveCurrentPageSnapshot.call(this);
        
        // Go to next page (create new if needed)
        this.currentPage++;
        if (this.currentPage > this.pages.length) {
            if (this.pages.length >= MAX_PAGES) {
                console.warn(`Cannot add page: maximum of ${MAX_PAGES} pages reached.`);
                this.currentPage = this.pages.length;
                this.updatePaginationUI();
                return;
            }
            clearCanvasPixels.call(this);
            this.pages.push(this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height));
            snapshotInheritedBackgroundForNewPage.call(this, this.currentPage);
            this.restorePageScene?.(this.currentPage);
            this.historyManager.reset?.();
            this.historyManager.saveState();
        } else {
            this.loadPage(this.currentPage);
        }
        this.updatePaginationUI();
    
}

function nextOrAddPage() {
        // Save current page and background
        saveCurrentPageSnapshot.call(this);
        
        // Check if we're on the last page
        if (this.currentPage >= this.pages.length) {
            if (this.pages.length >= MAX_PAGES) {
                console.warn(`Cannot add page: maximum of ${MAX_PAGES} pages reached.`);
                this.updatePaginationUI();
                return;
            }
            // Add new page
            this.pages.push(null);
            this.currentPage = this.pages.length;
            clearCanvasPixels.call(this);
            this.pages[this.currentPage - 1] = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
            snapshotInheritedBackgroundForNewPage.call(this, this.currentPage);
            this.restorePageScene?.(this.currentPage);
            this.historyManager.reset?.();
            this.historyManager.saveState();
        } else {
            // Go to next page
            this.currentPage++;
            this.loadPage(this.currentPage);
        }
        this.updatePaginationUI();
    
}

function goToPage(pageNumber) {
        const normalizedPage = normalizePageNumber(pageNumber, this.currentPage);
        if (normalizedPage === this.currentPage) {
            this.updatePaginationUI();
            return;
        }
        
        // Save current page and background
        saveCurrentPageSnapshot.call(this);
        
        // Create new pages if needed; persist inherited backgrounds once after the batch.
        const isCreatingPages = normalizedPage > this.pages.length;
        while (normalizedPage > this.pages.length) {
            this.pages.push(null);
            recordPageBackground.call(this, this.pages.length);
        }
        if (isCreatingPages) {
            persistPageBackgrounds.call(this);
        }
        
        this.currentPage = normalizedPage;
        const pendingBackgroundPromise = this.loadPage(this.currentPage);
        this.updatePaginationUI();
        return pendingBackgroundPromise;
    
}

function loadPage(pageNumber) {
        const pageIndex = pageNumber - 1;
        if (pageNumber > 0 && pageNumber <= this.pages.length && this.pages[pageIndex]) {
            if (!restorePageSnapshot.call(this, pageIndex)) {
                clearCanvasPixels.call(this);
                this.pages[pageIndex] = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
            }
        } else {
            clearCanvasPixels.call(this);
            if (!this.pages[pageIndex]) {
                this.pages[pageIndex] = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
            }
        }
        this.restorePageScene?.(pageNumber);
        // Reset undo history when switching pages so undo cannot leak pixels across pages.
        this.historyManager.reset?.();
        this.historyManager.saveState();
        
        // Restore page-specific background if exists; async callers can await it.
        const pendingBackgroundPromise = Promise.resolve(this.restorePageBackground(pageNumber));
        this._pendingBackgroundPromise = pendingBackgroundPromise;
        this.drawingEngine.updateOffCanvasImageMirrors(this.insertTextManager?.textObjects || []);

        // Save session state (current page change)
        this.saveSessionDebounced();
        return pendingBackgroundPromise;
    
}

async function goToPageAsync(pageNumber) {
        const pendingBackgroundPromise = goToPage.call(this, pageNumber) || this._pendingBackgroundPromise;
        if (pendingBackgroundPromise) {
            await pendingBackgroundPromise;
        }
}

function recordPageBackground(pageNumber) {
        // Save current background settings for this page (in-memory only)
        this.pageBackgrounds[pageNumber] = {
            backgroundColor: this.backgroundManager.backgroundColor,
            backgroundPattern: this.backgroundManager.backgroundPattern,
            bgOpacity: this.backgroundManager.bgOpacity,
            patternIntensity: this.backgroundManager.patternIntensity,
            patternDensity: this.backgroundManager.patternDensity,
            coordinateOriginX: this.backgroundManager.coordinateOriginX,
            coordinateOriginY: this.backgroundManager.coordinateOriginY,
            coordinateOverlayState: this.backgroundManager.getCoordinateOverlayState(),
            backgroundImageData: this.backgroundManager.backgroundImageData,
            imageSize: this.backgroundManager.imageSize,
            imageTransform: (window.safeDeepClone || ((v) => JSON.parse(JSON.stringify(v))))(this.backgroundManager.imageTransform),
            gifLoopCount: this.backgroundManager.gifLoopCount,
            backgroundOutsideLayerOrder: this.backgroundManager.backgroundOutsideLayerOrder
        };
}

function persistPageBackgrounds() {
        try {
            localStorage.setItem('pageBackgrounds', JSON.stringify(this.pageBackgrounds));
        } catch (e) {
            console.warn('Failed to save page backgrounds to localStorage (quota exceeded?):', e);
        }
}

function savePageBackground(pageNumber) {
        recordPageBackground.call(this, pageNumber);
        persistPageBackgrounds.call(this);

}

function restorePageBackground(pageNumber) {
        // Restore background settings for this page.
        // Returns a Promise that resolves after async image backgrounds render.
        // Generation token: any newer restore invalidates pending async image loads.
        const loadToken = (this._backgroundLoadToken = (this._backgroundLoadToken || 0) + 1);
        if (this.pageBackgrounds[pageNumber]) {
            const bg = normalizeBackgroundState(this.backgroundManager, this.pageBackgrounds[pageNumber]);
            resetTransientBackgroundMediaState(this.backgroundManager);
            this.backgroundManager.backgroundColor = bg.backgroundColor;
            this.backgroundManager.backgroundPattern = bg.backgroundPattern;
            this.backgroundManager.bgOpacity = bg.bgOpacity;
            this.backgroundManager.patternIntensity = bg.patternIntensity;
            this.backgroundManager.patternDensity = bg.patternDensity;
            this.backgroundManager.backgroundImageData = bg.backgroundImageData;
            this.backgroundManager.imageSize = bg.imageSize;
            
            // Restore enhanced background state
            if (typeof bg.coordinateOriginX !== 'undefined') {
                this.backgroundManager.coordinateOriginX = bg.coordinateOriginX;
                this.backgroundManager.coordinateOriginY = bg.coordinateOriginY;
            }
            this.backgroundManager.setCoordinateOverlayState(bg.coordinateOverlayState, { persist: false, redraw: false });
            this.backgroundManager.imageTransform = cloneSerializable(bg.imageTransform);
            if (typeof bg.gifLoopCount !== 'undefined') this.backgroundManager.gifLoopCount = bg.gifLoopCount;
            if (typeof bg.backgroundOutsideLayerOrder !== 'undefined') {
                this.backgroundManager.backgroundOutsideLayerOrder = bg.backgroundOutsideLayerOrder;
            }

            // Load image if exists
            if (bg.backgroundImageData && bg.backgroundPattern === 'image') {
                return new Promise((resolve) => {
                    const img = new Image();
                    img.onload = () => {
                        if (loadToken !== this._backgroundLoadToken) {
                            // A newer page restore started; drop this stale image.
                            resolve();
                            return;
                        }
                        this.backgroundManager.backgroundImage = img;
                        this.backgroundManager.drawBackground();
                        this.updateBackgroundUI();
                        resolve();
                    };
                    img.onerror = () => {
                        console.warn('Failed to load page background image');
                        if (loadToken === this._backgroundLoadToken) {
                            this.backgroundManager.drawBackground();
                            this.updateBackgroundUI();
                        }
                        resolve();
                    };
                    img.src = bg.backgroundImageData;
                });
            } else {
                this.backgroundManager.drawBackground();
                this.updateBackgroundUI();
            }
        } else {
            // Use default/global background settings
            this.backgroundManager.drawBackground();
            this.updateBackgroundUI();
        }

        return Promise.resolve();
}

function updatePaginationUI() {
        const pageInput = document.getElementById('page-input');
        const pageTotal = document.getElementById('page-total');
        const prevBtn = document.getElementById('prev-page-btn');
        const nextOrAddBtn = document.getElementById('next-or-add-page-btn');

        if (pageInput) {
            pageInput.value = this.currentPage;
        }
        if (pageTotal) {
            pageTotal.textContent = `/ ${this.pages.length}`;
        }
        if (!prevBtn || !nextOrAddBtn) {
            return;
        }
        
        prevBtn.disabled = this.currentPage <= 1;
        nextOrAddBtn.disabled = false;
        
        // Update button icon and title based on whether we're on the last page
        // Also show "+" icon when there's only one page total
        if (this.currentPage >= this.pages.length || this.pages.length === 1) {
            // Show add icon
            nextOrAddBtn.innerHTML = `
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <line x1="12" y1="5" x2="12" y2="19"></line>
                    <line x1="5" y1="12" x2="19" y2="12"></line>
                </svg>
            `;
            const label = window.i18n ? window.i18n.t('page.newPage') : 'New Page';
            nextOrAddBtn.title = label;
            nextOrAddBtn.setAttribute('aria-label', label);
            nextOrAddBtn.setAttribute('data-i18n-title', 'page.newPage');
        } else {
            // Show next icon
            nextOrAddBtn.innerHTML = `
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <polyline points="9 18 15 12 9 6"></polyline>
                </svg>
            `;
            const label = window.i18n ? window.i18n.t('page.next') : 'Next Page';
            nextOrAddBtn.title = label;
            nextOrAddBtn.setAttribute('aria-label', label);
            nextOrAddBtn.setAttribute('data-i18n-title', 'page.next');
        }
    
}

window.AboardPaginationRuntime = {
    normalizePageNumber,
    addPage(board) {
        return addPage.call(board);
    },
    prevPage(board) {
        return prevPage.call(board);
    },
    nextPage(board) {
        return nextPage.call(board);
    },
    nextOrAddPage(board) {
        return nextOrAddPage.call(board);
    },
    goToPage(board, pageNumber) {
        return goToPage.call(board, pageNumber);
    },
    goToPageAsync(board, pageNumber) {
        return goToPageAsync.call(board, pageNumber);
    },
    loadPage(board, pageNumber) {
        return loadPage.call(board, pageNumber);
    },
    savePageBackground(board, pageNumber) {
        return savePageBackground.call(board, pageNumber);
    },
    restorePageBackground(board, pageNumber) {
        return restorePageBackground.call(board, pageNumber);
    },
    updatePaginationUI(board) {
        return updatePaginationUI.call(board);
    }
};
