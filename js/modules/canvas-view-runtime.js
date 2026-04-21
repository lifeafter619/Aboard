(() => {
// Extracted runtime from main.js
// Preserves legacy board instance semantics by invoking methods with board as this.

// Keep startup canvas defaults local to this runtime so it does not depend on
// main.js lexical scope during modular bootstrapping.
const DEFAULT_MIN_FIT_SCALE = 0.1;
const DEFAULT_TARGET_COVERAGE = 0.7;
const DEFAULT_MIN_DEFAULT_SCALE = 0.9;

function safeCanvasViewStorageGetItem(key) {
        try {
                return localStorage.getItem(key);
        } catch (error) {
                console.warn(`Failed to read canvas view localStorage key "${key}":`, error);
                return null;
        }
}

function persistBoardViewState(board, options = {}) {
        if (typeof board?.drawingEngine?.persistViewState === 'function') {
                board.drawingEngine.persistViewState(options);
                return;
        }

        try {
                localStorage.setItem('canvasScale', board.drawingEngine.canvasScale);
                localStorage.setItem('panOffsetX', board.drawingEngine.panOffset.x);
                localStorage.setItem('panOffsetY', board.drawingEngine.panOffset.y);
        } catch (error) {
                console.warn('Failed to persist canvas view state to localStorage:', error);
        }
}

function initializeCanvasView() {
        // On startup or refresh, set canvas to a larger default scale and center it
        // Only apply if no saved scale exists
        const savedScale = safeCanvasViewStorageGetItem('canvasScale');
        // Always calculate fit scale for applyZoom and default coverage logic.
        this.canvasFitScale = this.calculateCanvasFitScale();
        if (!savedScale) {
            const safeFitScale = Math.max(DEFAULT_MIN_FIT_SCALE, this.canvasFitScale);
            // Compute canvasScale so fitScale * canvasScale meets desired coverage.
            const scaleForCoverage = DEFAULT_TARGET_COVERAGE / safeFitScale;
            // Keep a higher default scale so the canvas starts larger than the minimum target.
            const boundedScale = Math.max(DEFAULT_MIN_DEFAULT_SCALE, scaleForCoverage);
            const initialScale = Number(Math.min(this.MAX_CANVAS_SCALE, boundedScale).toFixed(4));
            this.drawingEngine.canvasScale = initialScale;
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
        
        // Persist the centered view state when storage is available.
        persistBoardViewState(this, { immediate: true });
        
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
            // Use a temporary canvas + drawImage so the content is properly
            // composited under the current DPR transform instead of raw
            // putImageData which ignores canvas transforms and clips on shrink.
            const tmp = document.createElement('canvas');
            tmp.width = oldWidth;
            tmp.height = oldHeight;
            tmp.getContext('2d').putImageData(imageData, 0, 0);
            this.ctx.save();
            this.ctx.setTransform(1, 0, 0, 1, 0, 0);
            this.ctx.drawImage(tmp, 0, 0, oldWidth, oldHeight, 0, 0, this.canvas.width, this.canvas.height);
            this.ctx.restore();
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
})();
