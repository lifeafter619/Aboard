// Extracted runtime from main.js
// Preserves legacy board instance semantics by invoking methods with board as this.

function addPage() {
        // Always in pagination mode, no need to check
        
        // Save current page
        this.pages[this.currentPage - 1] = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
        
        // Create new blank page
        this.pages.push(null);
        this.currentPage = this.pages.length;
        
        // Clear canvas for new page
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.pages[this.currentPage - 1] = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
        this.historyManager.saveState();
        this.updatePaginationUI();
    
}

function prevPage() {
        if (this.currentPage <= 1) return;
        
        // Save current page and background
        this.pages[this.currentPage - 1] = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
        this.savePageBackground(this.currentPage);
        
        // Go to previous page
        this.currentPage--;
        this.loadPage(this.currentPage);
        this.updatePaginationUI();
    
}

function nextPage() {
        // Save current page and background
        this.pages[this.currentPage - 1] = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
        this.savePageBackground(this.currentPage);
        
        // Go to next page (create new if needed)
        this.currentPage++;
        if (this.currentPage > this.pages.length) {
            this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
            this.pages.push(this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height));
            this.historyManager.saveState();
        } else {
            this.loadPage(this.currentPage);
        }
        this.updatePaginationUI();
    
}

function nextOrAddPage() {
        // Save current page and background
        this.pages[this.currentPage - 1] = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
        this.savePageBackground(this.currentPage);
        
        // Check if we're on the last page
        if (this.currentPage >= this.pages.length) {
            // Add new page
            this.pages.push(null);
            this.currentPage = this.pages.length;
            this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
            this.pages[this.currentPage - 1] = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
            this.historyManager.saveState();
        } else {
            // Go to next page
            this.currentPage++;
            this.loadPage(this.currentPage);
        }
        this.updatePaginationUI();
    
}

function goToPage(pageNumber) {
        if (pageNumber < 1 || pageNumber === this.currentPage) {
            this.updatePaginationUI();
            return;
        }
        
        // Save current page and background
        this.pages[this.currentPage - 1] = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
        this.savePageBackground(this.currentPage);
        
        // Create new pages if needed
        while (pageNumber > this.pages.length) {
            this.pages.push(null);
        }
        
        this.currentPage = pageNumber;
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
        this.historyManager.saveState();
        
        // Restore page-specific background if exists
        this.restorePageBackground(pageNumber);
        this.drawingEngine.updateOffCanvasImageMirrors(this.insertTextManager?.textObjects || []);

        // Save session state (current page change)
        this.saveSessionDebounced();
    
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
            // Enhanced background state
            coordinateOriginX: this.backgroundManager.coordinateOriginX,
            coordinateOriginY: this.backgroundManager.coordinateOriginY,
            imageTransform: this.backgroundManager.imageTransform,
            gifLoopCount: this.backgroundManager.gifLoopCount,
            backgroundOutsideLayerOrder: this.backgroundManager.backgroundOutsideLayerOrder || 1
        };
        localStorage.setItem('pageBackgrounds', JSON.stringify(this.pageBackgrounds));
    
}

function restorePageBackground(pageNumber) {
        // Restore background settings for this page
        if (this.pageBackgrounds[pageNumber]) {
            const bg = this.pageBackgrounds[pageNumber];
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
            if (bg.imageTransform) this.backgroundManager.imageTransform = bg.imageTransform;
            if (typeof bg.gifLoopCount !== 'undefined') this.backgroundManager.gifLoopCount = bg.gifLoopCount;
            if (typeof bg.backgroundOutsideLayerOrder !== 'undefined') {
                this.backgroundManager.backgroundOutsideLayerOrder = bg.backgroundOutsideLayerOrder;
            }

            // Load image if exists
            if (bg.backgroundImageData && bg.backgroundPattern === 'image') {
                const img = new Image();
                img.onload = () => {
                    this.backgroundManager.backgroundImage = img;
                    this.backgroundManager.drawBackground();
                };
                img.src = bg.backgroundImageData;
            } else {
                this.backgroundManager.drawBackground();
            }
            
            // Update UI to reflect current page background
            this.updateBackgroundUI();
        } else {
            // Use default/global background settings
            this.backgroundManager.drawBackground();
            this.updateBackgroundUI();
        }
    
}

function updatePaginationUI() {
        document.getElementById('page-input').value = this.currentPage;
        document.getElementById('page-total').textContent = `/ ${this.pages.length}`;
        
        const prevBtn = document.getElementById('prev-page-btn');
        const nextOrAddBtn = document.getElementById('next-or-add-page-btn');
        
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
            nextOrAddBtn.title = window.i18n ? window.i18n.t('page.newPage') : '新建页面';
        } else {
            // Show next icon
            nextOrAddBtn.innerHTML = `
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <polyline points="9 18 15 12 9 6"></polyline>
                </svg>
            `;
            nextOrAddBtn.title = window.i18n ? window.i18n.t('page.next') : '下一页';
        }
    
}

window.AboardPaginationRuntime = {
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
