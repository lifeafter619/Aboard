// Extracted board helper runtime from main.js
// Preserves legacy board instance semantics by invoking methods with board as this.

function syncEraserSizeControls() {
    const eraserSizeSlider = document.getElementById('eraser-size-slider');
    const eraserSizeValue = document.getElementById('eraser-size-value');
    if (eraserSizeSlider) {
        eraserSizeSlider.value = this.drawingEngine.eraserSize;
    }
    if (eraserSizeValue) {
        eraserSizeValue.textContent = this.drawingEngine.eraserSize;
    }
    if (this.drawingEngine.currentTool === 'eraser') {
        this.eraserCursor.style.width = `${this.drawingEngine.eraserSize}px`;
        this.eraserCursor.style.height = `${this.drawingEngine.eraserSize}px`;
    }
}

function refreshAdaptiveEraserSize() {
    if (this.drawingEngine.refreshAdaptiveEraserSize()) {
        this.syncEraserSizeControls();
    }
}

function setupKeyboardShortcuts() {
    document.addEventListener('keydown', (e) => {
        const isEditableTarget = e.target &&
            (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.isContentEditable);
        if (e.ctrlKey || e.metaKey) {
            const key = e.key.toLowerCase();
            if (!isEditableTarget && key === 'z' && !e.shiftKey) {
                e.preventDefault();
                if (this.historyManager.undo()) {
                    this.drawingEngine.clearStrokes();
                    this.drawingEngine.stampedImages = [];
                    this.drawingEngine.objectGroups = [];
                    this.insertTextManager?.clearTextObjects?.();
                    this.drawingEngine.clearVectorScene();
                    this.drawingEngine.setVectorPreviewVisible(false);
                    this.updateUI();
                    this.saveSessionDebounced();
                }
            } else if (!isEditableTarget && (key === 'y' || (key === 'z' && e.shiftKey))) {
                e.preventDefault();
                if (this.historyManager.redo()) {
                    this.drawingEngine.clearStrokes();
                    this.drawingEngine.stampedImages = [];
                    this.drawingEngine.objectGroups = [];
                    this.insertTextManager?.clearTextObjects?.();
                    this.drawingEngine.clearVectorScene();
                    this.drawingEngine.setVectorPreviewVisible(false);
                    this.updateUI();
                    this.saveSessionDebounced();
                }
            } else if (!isEditableTarget && key === 'c' && this.selectionManager?.hasSelection()) {
                e.preventDefault();
                this.selectionManager.cacheSelection();
            } else if (!isEditableTarget && key === 'v') {
                e.preventDefault();
                this.selectionManager?.pasteClipboard();
            } else if (!isEditableTarget && key === 'x' && this.selectionManager?.hasSelection()) {
                e.preventDefault();
                if (this.selectionManager.cacheSelection()) {
                    this.selectionManager.deleteSelection();
                }
            }
        }

        if (!isEditableTarget && (e.key === 'Delete' || e.key === 'Backspace')) {
            if (this.selectionManager?.hasSelection()) {
                e.preventDefault();
                this.selectionManager.deleteSelection();
            }
        }

        if (!isEditableTarget && (e.key === '+' || e.key === '=')) {
            e.preventDefault();
            this.zoomIn();
        } else if (!isEditableTarget && (e.key === '-' || e.key === '_')) {
            e.preventDefault();
            this.zoomOut();
        }

        if (e.key === 'Escape') {
            this.closeSettings();
            this.closeConfigPanel();
        }
    });

    window.addEventListener('imageConfirmed', () => {
        if (this.drawingEngine.currentTool === 'background') {
            this.setTool('pen', false);
        }
    });
}

function updatePenLineStyleSettings(lineStyle) {
    const penLineStyleSettings = document.getElementById('pen-line-style-settings');
    const penDashDensitySetting = document.getElementById('pen-dash-density-setting');

    if (penLineStyleSettings) penLineStyleSettings.style.display = 'none';
    if (penDashDensitySetting) penDashDensitySetting.style.display = 'none';

    switch (lineStyle) {
        case 'dashed':
        case 'dotted':
            if (penLineStyleSettings) penLineStyleSettings.style.display = 'block';
            if (penDashDensitySetting) penDashDensitySetting.style.display = 'flex';
            break;
    }
}

function escapeHtml(value) {
    return String(value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function getCoordinateExpressionPrefix(pattern = this.backgroundManager?.backgroundPattern) {
    return pattern === 'polar' ? 'r = ' : 'y = ';
}

// Shared persistence helper. Previously this exact function was duplicated in
// canvas-view-runtime.js, interaction-runtime.js, and zoom-runtime.js — so any
// fix/change had to land in three places. Prefer DrawingEngine.persistViewState
// when present (it debounces); otherwise write the three legacy keys directly.
function persistBoardViewState(board, options = {}) {
    if (typeof board?.drawingEngine?.persistViewState === 'function') {
        board.drawingEngine.persistViewState(options);
        return;
    }

    try {
        localStorage.setItem('canvasScale', board.drawingEngine.canvasScale);
        localStorage.setItem('panOffsetX', board.drawingEngine.panOffset.x);
        localStorage.setItem('panOffsetY', board.drawingEngine.panOffset.y);
        localStorage.setItem('canvasViewStateVersion', '1');
    } catch (error) {
        console.warn('Failed to persist board view state to localStorage:', error);
    }
}

window.AboardBoardHelpersRuntime = {
    syncEraserSizeControls(board) {
        return syncEraserSizeControls.call(board);
    },
    refreshAdaptiveEraserSize(board) {
        return refreshAdaptiveEraserSize.call(board);
    },
    setupKeyboardShortcuts(board) {
        return setupKeyboardShortcuts.call(board);
    },
    updatePenLineStyleSettings(board, lineStyle) {
        return updatePenLineStyleSettings.call(board, lineStyle);
    },
    escapeHtml(board, value) {
        return escapeHtml.call(board, value);
    },
    getCoordinateExpressionPrefix(board, pattern) {
        return getCoordinateExpressionPrefix.call(board, pattern);
    },
    persistViewState(board, options) {
        return persistBoardViewState(board, options);
    }
};
