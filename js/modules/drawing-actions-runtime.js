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
    // Clear the same break-state that startDrawing/stopDrawing reset: a
    // discarded stroke may have populated strokeBreakIndices while teaching
    // tools blocked segments, and stale indices here would otherwise survive
    // until the next pen-down.
    this.drawingEngine.strokeBreakIndices = [];
    this.drawingEngine.pendingStrokeBreak = false;
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

function ensureConfirmModalBindings(board) {
    const modal = document.getElementById('confirm-modal');
    if (!modal || modal.dataset.confirmBindingsInitialized === 'true') {
        return;
    }
    modal.dataset.confirmBindingsInitialized = 'true';

    const closeConfirmModal = () => {
        modal.classList.remove('show');
        const restoreFocusTarget = board.confirmModalPreviouslyFocusedElement;
        board.confirmModalPreviouslyFocusedElement = null;
        scheduleDrawingActionFrame(() => {
            restoreFocusTarget?.focus?.();
        });
    };

    modal.addEventListener('keydown', (event) => {
        if (event.key === 'Escape') {
            event.preventDefault();
            closeConfirmModal();
        }
    });
    modal.addEventListener('click', (event) => {
        if (event.target.id === 'confirm-modal') {
            closeConfirmModal();
        }
    });
    document.getElementById('confirm-cancel-btn')?.addEventListener('click', () => {
        closeConfirmModal();
    });
    document.getElementById('confirm-ok-btn')?.addEventListener('click', () => {
        closeConfirmModal();
        board.clearCanvas(true);
    });
}

function confirmClear() {
    const modal = document.getElementById('confirm-modal');
    const cancelBtn = document.getElementById('confirm-cancel-btn');
    const okBtn = document.getElementById('confirm-ok-btn');

    if (!modal) {
        return;
    }

    // The Clear toolbar button is armed at board construction, long before
    // the deferred settings listeners run — bind the modal's own handlers
    // here so it can never open as an unresponsive dialog that locks the app.
    ensureConfirmModalBindings(this);

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
    this.insertTextManager?.cancelOverlay?.();
    this.insertTextManager?.clearTextObjects?.();
    this.activeDrawingPointerId = null;
    this.activePointers?.clear?.();
    this.drawingEngine.clearCanvas();
    this.pageRasterFallbackPages?.delete?.(this.currentPage);
    this.pageRasterFallbackBases?.delete?.(this.currentPage);
    this.pageRasterFallbackScaledBases?.delete?.(this.currentPage);
    if (this.pageScenes && typeof this.pageScenes === 'object') {
        delete this.pageScenes[String(this.currentPage)];
    }
    if (Array.isArray(this.pages) && this.currentPage > 0 && this.currentPage <= this.pages.length) {
        // The current bitmap is now known to be blank; discard the old page
        // snapshot instead of allowing a stale raster to reappear on reload.
        this.pages[this.currentPage - 1] = null;
    }
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
    ensureConfirmModalBindings(board) {
        return ensureConfirmModalBindings(board);
    },
    confirmClear(board) {
        return confirmClear.call(board);
    },
    clearCanvas(board, saveToHistory = true) {
        return clearCanvas.call(board, saveToHistory);
    }
};
