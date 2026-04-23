(() => {
// Extracted runtime from main.js
// Preserves legacy board instance semantics by invoking methods with board as this.

// Keep startup canvas defaults local to this runtime so it does not depend on
// main.js lexical scope during modular bootstrapping.
const DEFAULT_MIN_FIT_SCALE = 0.1;
const DEFAULT_TARGET_COVERAGE = 0.7;
const DEFAULT_MIN_DEFAULT_SCALE = 0.9;
const CANVAS_VIEW_STATE_VERSION_KEY = 'canvasViewStateVersion';

function safeCanvasViewStorageGetItem(key) {
        try {
                return localStorage.getItem(key);
        } catch (error) {
                console.warn(`Failed to read canvas view localStorage key "${key}":`, error);
                return null;
        }
}

function persistBoardViewState(board, options = {}) {
        // DrawingEngine.persistViewState is the canonical debounced writer;
        // fall back to the shared board helper only if the drawing engine
        // isn't wired up yet. The inline-localStorage fallback that used to
        // live here is centralized in board-helpers-runtime.
        if (typeof board?.drawingEngine?.persistViewState === 'function') {
                board.drawingEngine.persistViewState(options);
                return;
        }
        window.AboardBoardHelpersRuntime?.persistViewState?.(board, options);
}

function isLikelySyntheticStartupViewState(savedScale) {
        if (!savedScale || Number.parseFloat(savedScale) !== 1) {
                return false;
        }

        if (safeCanvasViewStorageGetItem(CANVAS_VIEW_STATE_VERSION_KEY)) {
                return false;
        }

        const savedPanX = Number.parseFloat(safeCanvasViewStorageGetItem('panOffsetX') || '0');
        const savedPanY = Number.parseFloat(safeCanvasViewStorageGetItem('panOffsetY') || '0');

        return (!Number.isFinite(savedPanX) || savedPanX === 0)
                && (!Number.isFinite(savedPanY) || savedPanY === 0);
}

function shouldRestoreSavedViewState(savedScale) {
        return !!savedScale && !isLikelySyntheticStartupViewState(savedScale);
}

function initializeCanvasView() {
        // On startup or refresh, set canvas to a larger default scale and center it
        // Only apply if no saved scale exists
        const savedScale = safeCanvasViewStorageGetItem('canvasScale');
        const restoreSavedViewState = shouldRestoreSavedViewState(savedScale);
        // Always calculate fit scale for applyZoom and default coverage logic.
        this.canvasFitScale = this.calculateCanvasFitScale();
        if (!restoreSavedViewState) {
            const safeFitScale = Math.max(DEFAULT_MIN_FIT_SCALE, this.canvasFitScale);
            // Compute canvasScale so fitScale * canvasScale meets desired coverage.
            const scaleForCoverage = DEFAULT_TARGET_COVERAGE / safeFitScale;
            // Keep a higher default scale so the canvas starts larger than the minimum target.
            const boundedScale = Math.max(DEFAULT_MIN_DEFAULT_SCALE, scaleForCoverage);
            const initialScale = Number(Math.min(this.MAX_CANVAS_SCALE, boundedScale).toFixed(4));
            this.drawingEngine.canvasScale = initialScale;

            // Startup without a valid saved view should reset to the default centered
            // viewport and persist that initialized state.
            this.centerCanvas({ persist: true });
            return;
        }

        // Preserve a previously saved viewport instead of wiping pan offsets during
        // startup. Legacy unversioned view state is re-persisted once so future
        // startups can distinguish it from the synthetic centered scale regression.
        this.applyPanTransform();
        if (!safeCanvasViewStorageGetItem(CANVAS_VIEW_STATE_VERSION_KEY)) {
                persistBoardViewState(this, { immediate: true });
        }
    
}

function centerCanvas(options = {}) {
        const { persist = true } = options;
        // In paginated mode, the canvas uses translate(-50%, -50%) to center itself
        // So pan offset of 0,0 means the canvas is centered
        // Reset pan offset to center the canvas
        this.drawingEngine.panOffset.x = 0;
        this.drawingEngine.panOffset.y = 0;
        
        // Startup resize runs before initializeCanvasView decides whether a saved
        // scale really exists, so it must not create a synthetic saved scale.
        if (persist) {
                persistBoardViewState(this, { immediate: true });
        }
        
        // Apply the transform
        this.applyPanTransform();
    
}

function recalculateAndRecenterCanvas(options = {}) {
        // Recalculate fit scale for current viewport size
        this.canvasFitScale = this.calculateCanvasFitScale();
        // Re-center the canvas
        this.centerCanvas(options);
    
}

function resizeCanvas(options = {}) {
        const { persistViewState = true } = options;
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

        if (persistViewState) {
                // Recalculate fit scale and re-center the canvas for user-driven resizes.
                this.recalculateAndRecenterCanvas({ persist: true });
        } else {
                // Startup sizing happens before initializeCanvasView decides whether a
                // saved viewport should win, so do not mutate pan/zoom state here.
                this.canvasFitScale = this.calculateCanvasFitScale();
        }
        this.syncInteractiveOverlays();

}

window.AboardCanvasViewRuntime = {
    initializeCanvasView(board) {
        return initializeCanvasView.call(board);
    },
    centerCanvas(board, options = {}) {
        return centerCanvas.call(board, options);
    },
    recalculateAndRecenterCanvas(board, options = {}) {
        return recalculateAndRecenterCanvas.call(board, options);
    },
    resizeCanvas(board, options = {}) {
        return resizeCanvas.call(board, options);
    }
};
})();
