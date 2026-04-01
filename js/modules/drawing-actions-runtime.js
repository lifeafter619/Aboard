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

    if (this.historyManager.historyStep >= 0) {
        this.historyManager.restoreState();
    }
}

function confirmClear() {
    document.getElementById('confirm-modal')?.classList.add('show');
}

function clearCanvas(saveToHistory = true) {
    this.drawingEngine.clearCanvas();
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
