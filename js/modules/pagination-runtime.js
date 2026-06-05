// Extracted runtime from main.js
// Preserves legacy board instance semantics by invoking methods with board as this.

function normalizePageNumber(pageNumber, fallback = 1) {
        const normalizedPage = parseInt(pageNumber, 10);
        return Number.isInteger(normalizedPage) && normalizedPage > 0 ? normalizedPage : fallback;
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

function saveCurrentPageSnapshot() {
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
            this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
            this.pages.push(this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height));
            snapshotInheritedBackgroundForNewPage.call(this, this.currentPage);
            this.restorePageScene?.(this.currentPage);
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
            // Add new page
            this.pages.push(null);
            this.currentPage = this.pages.length;
            this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
            this.pages[this.currentPage - 1] = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
            snapshotInheritedBackgroundForNewPage.call(this, this.currentPage);
            this.restorePageScene?.(this.currentPage);
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
        
        // Create new pages if needed
        while (normalizedPage > this.pages.length) {
            this.pages.push(null);
            snapshotInheritedBackgroundForNewPage.call(this, this.pages.length);
        }
        
        this.currentPage = normalizedPage;
        this.loadPage(this.currentPage);
        this.updatePaginationUI();
    
}

function loadPage(pageNumber) {
        if (pageNumber > 0 && pageNumber <= this.pages.length && this.pages[pageNumber - 1]) {
            this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
            this.ctx.putImageData(this.pages[pageNumber - 1], 0, 0);
        } else {
            this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
            if (!this.pages[pageNumber - 1]) {
                this.pages[pageNumber - 1] = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
            }
        }
        this.restorePageScene?.(pageNumber);
        this.historyManager.saveState();
        
        // Restore page-specific background if exists; async callers can await it.
        this._pendingBackgroundPromise = Promise.resolve(this.restorePageBackground(pageNumber));
        this.drawingEngine.updateOffCanvasImageMirrors(this.insertTextManager?.textObjects || []);

        // Save session state (current page change)
        this.saveSessionDebounced();
    
}

async function goToPageAsync(pageNumber) {
        goToPage.call(this, pageNumber);
        if (this._pendingBackgroundPromise) {
            await this._pendingBackgroundPromise;
        }
}

function savePageBackground(pageNumber) {
        // Save current background settings for this page
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
        try {
            localStorage.setItem('pageBackgrounds', JSON.stringify(this.pageBackgrounds));
        } catch (e) {
            console.warn('Failed to save page backgrounds to localStorage (quota exceeded?):', e);
        }

}

function restorePageBackground(pageNumber) {
        // Restore background settings for this page.
        // Returns a Promise that resolves after async image backgrounds render.
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
                        this.backgroundManager.backgroundImage = img;
                        this.backgroundManager.drawBackground();
                        this.updateBackgroundUI();
                        resolve();
                    };
                    img.onerror = () => {
                        console.warn('Failed to load page background image');
                        this.backgroundManager.drawBackground();
                        this.updateBackgroundUI();
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
