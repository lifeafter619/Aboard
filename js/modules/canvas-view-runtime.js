// Extracted runtime from main.js
// Preserves legacy board instance semantics by invoking methods with board as this.

function initializeCanvasView() {
        // On startup or refresh, set canvas to a larger default scale and center it
        // Only apply if no saved scale exists
        const savedScale = localStorage.getItem('canvasScale');
        // Always calculate fit scale for applyZoom and default coverage logic.
        this.canvasFitScale = this.calculateCanvasFitScale();
        if (!savedScale) {
            const safeFitScale = Math.max(DEFAULT_MIN_FIT_SCALE, this.canvasFitScale);
            // Compute canvasScale so fitScale * canvasScale meets desired coverage.
            const scaleForCoverage = DEFAULT_TARGET_COVERAGE / safeFitScale;
            // Keep a higher default scale so the canvas starts larger than the minimum target.
            const boundedScale = Math.max(DEFAULT_MIN_DEFAULT_SCALE, scaleForCoverage);
            const initialScale = Math.min(this.MAX_CANVAS_SCALE, boundedScale);
            this.drawingEngine.canvasScale = initialScale;
            localStorage.setItem('canvasScale', initialScale);
        }
        
        // Always center the canvas on startup/refresh
        // Note: This ensures the canvas is properly centered after each page load,
        // regardless of previously saved pan offset values
        this.centerCanvas();
    
}

function centerCanvas() {
        // In paginated mode, the canvas uses translate(-50%, -50%) to center itself
        // So pan offset of 0,0 means the canvas is centered
        // Reset pan offset to center the canvas
        this.drawingEngine.panOffset.x = 0;
        this.drawingEngine.panOffset.y = 0;
        
        // Save to localStorage
        localStorage.setItem('panOffsetX', this.drawingEngine.panOffset.x);
        localStorage.setItem('panOffsetY', this.drawingEngine.panOffset.y);
        
        // Apply the transform
        this.applyPanTransform();
    
}

function recalculateAndRecenterCanvas() {
        // Recalculate fit scale for current viewport size
        this.canvasFitScale = this.calculateCanvasFitScale();
        // Re-center the canvas
        this.centerCanvas();
    
}

function resizeCanvas() {
        // Get window dimensions for canvas sizing
        const windowWidth = window.innerWidth;
        const windowHeight = window.innerHeight;
        const dpr = this.getRenderPixelRatio();
        
        const oldWidth = this.canvas.width;
        const oldHeight = this.canvas.height;
        const imageData = this.historyManager.historyStep >= 0 ? 
            this.ctx.getImageData(0, 0, oldWidth, oldHeight) : null;
        
        // Set canvas size to fill entire window
        this.canvas.width = windowWidth * dpr;
        this.canvas.height = windowHeight * dpr;
        this.canvas.style.width = windowWidth + 'px';
        this.canvas.style.height = windowHeight + 'px';
        
        this.bgCanvas.width = windowWidth * dpr;
        this.bgCanvas.height = windowHeight * dpr;
        this.bgCanvas.style.width = windowWidth + 'px';
        this.bgCanvas.style.height = windowHeight + 'px';
        
        this.ctx.scale(dpr, dpr);
        this.bgCtx.scale(dpr, dpr);
        
        if (imageData) {
            this.ctx.putImageData(imageData, 0, 0);
        }
        
        this.backgroundManager.drawBackground();
        
        // Recalculate fit scale and re-center the canvas
        this.recalculateAndRecenterCanvas();
        this.syncInteractiveOverlays();
    
}

window.AboardCanvasViewRuntime = {
    initializeCanvasView(board) {
        return initializeCanvasView.call(board);
    },
    centerCanvas(board) {
        return centerCanvas.call(board);
    },
    recalculateAndRecenterCanvas(board) {
        return recalculateAndRecenterCanvas.call(board);
    },
    resizeCanvas(board) {
        return resizeCanvas.call(board);
    }
};
