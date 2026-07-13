// Extracted drawing action runtime from main.js
// Preserves legacy board instance semantics by invoking methods with board as this.

function handleDrawingComplete() {
    if (this.drawingEngine.currentTool === 'shape') {
        this.shapeDrawingManager.stopDrawing();
        this.syncVectorPreviewState(true);
        this.scheduleRenderQualityUpdate();
        return;
    }
    
    if (this.drawingEngine.stopDrawing()) {
        this.historyManager.saveState();
        this.saveSessionDebounced();
        this.syncVectorPreviewState(true);
        this.scheduleRenderQualityUpdate();
        if (this.drawingEngine.currentTool !== 'eraser') {
            this.closeConfigPanel();
        }
        this.closeFeaturePanel();
    }
}

function discardCurrentStroke() {
    this.drawingEngine.isDrawing = false;
    this.drawingEngine.points = [];
    this.drawingEngine.lastPoint = null;
    // Also clear the fixed-position live preview layer — the half-drawn
    // stroke it shows would otherwise stay floating above the canvas until
    // the next pen-down.
    this.drawingEngine.hideActiveToolPreview?.();

    if (this.historyManager.historyStep >= 0) {
        this.historyManager.restoreState();
    }
}

function scheduleDrawingActionFrame(callback) {
    if (typeof window.requestAnimationFrame === 'function') {
        window.requestAnimationFrame(callback);
        return;
    }
    callback();
}

function confirmClear() {
    const modal = document.getElementById('confirm-modal');
    const cancelBtn = document.getElementById('confirm-cancel-btn');
    const okBtn = document.getElementById('confirm-ok-btn');

    if (!modal) {
        return;
    }

    modal.setAttribute('role', 'dialog');
    modal.setAttribute('aria-modal', 'true');
    modal.setAttribute('aria-labelledby', 'confirm-modal-title');
    modal.setAttribute('aria-describedby', 'confirm-modal-message');
    modal.tabIndex = -1;

    this.confirmModalPreviouslyFocusedElement = document.activeElement && document.activeElement !== document.body
        ? document.activeElement
        : null;

    modal.classList.add('show');
    scheduleDrawingActionFrame(() => {
        (cancelBtn || okBtn || modal)?.focus?.();
    });
}

function clearCanvas(saveToHistory = true) {
    // Drop any active selection first — the strokes/images it points at are
    // about to disappear, and a lingering control box over an empty canvas
    // is a dead ghost overlay.
    this.selectionManager?.clearSelection?.({ skipRedraw: true });
    this.drawingEngine.clearCanvas();
    this.pageRasterFallbackPages?.delete?.(this.currentPage);
    if (saveToHistory) {
        this.historyManager.saveState();
    }
    this.saveSessionDebounced();
}

window.AboardDrawingActionsRuntime = {
    handleDrawingComplete(board) {
        return handleDrawingComplete.call(board);
    },
    discardCurrentStroke(board) {
        return discardCurrentStroke.call(board);
    },
    confirmClear(board) {
        return confirmClear.call(board);
    },
    clearCanvas(board, saveToHistory = true) {
        return clearCanvas.call(board, saveToHistory);
    }
};
