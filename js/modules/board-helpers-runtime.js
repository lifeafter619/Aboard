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
            (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT' || e.target.isContentEditable);
        const openBlockingModal = document.querySelector(
            '.modal.show:not(.non-blocking-modal), '
            + '[role="dialog"][aria-modal="true"].show:not(.non-blocking-modal), '
            + '.time-fullscreen-modal.show, .timer-fullscreen-modal.show, '
            + '#timer-settings-modal.show, #time-display-settings-modal.show'
        );

        // Modal-specific handlers and native form controls still receive the
        // event; only the board-wide shortcuts must stop here so they cannot
        // mutate or zoom content hidden behind the dialog.
        if (openBlockingModal && e.key !== 'Escape') {
            return;
        }

        if (e.ctrlKey || e.metaKey) {
            const key = e.key.toLowerCase();
            // Undo/redo while a stroke is mid-draw would repaint an older
            // bitmap under the live ink and then commit the full stroke into
            // the restored scene on pointer-up, resurrecting the "undone"
            // segments. Cancel the in-progress stroke instead — same rule the
            // touch pinch path applies via discardCurrentStroke.
            if (!isEditableTarget && (key === 'z' || key === 'y') && this.drawingEngine.isDrawing) {
                e.preventDefault();
                this.discardCurrentStroke();
                return;
            }
            if (!isEditableTarget && key === 'z' && !e.shiftKey) {
                e.preventDefault();
                if (this.historyManager.undo()) {
                    if (!this.historyManager.lastRestoreHadSceneState) {
                        this.drawingEngine.clearStrokes();
                        this.drawingEngine.stampedImages = [];
                        this.drawingEngine.objectGroups = [];
                        this.insertTextManager?.clearTextObjects?.();
                        this.drawingEngine.clearVectorScene();
                        this.drawingEngine.setVectorPreviewVisible(false);
                    }
                    this.updateUI();
                    this.saveSessionDebounced();
                }
            } else if (!isEditableTarget && (key === 'y' || (key === 'z' && e.shiftKey))) {
                e.preventDefault();
                if (this.historyManager.redo()) {
                    if (!this.historyManager.lastRestoreHadSceneState) {
                        this.drawingEngine.clearStrokes();
                        this.drawingEngine.stampedImages = [];
                        this.drawingEngine.objectGroups = [];
                        this.insertTextManager?.clearTextObjects?.();
                        this.drawingEngine.clearVectorScene();
                        this.drawingEngine.setVectorPreviewVisible(false);
                    }
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

        if (!isEditableTarget && !e.ctrlKey && !e.metaKey &&
            (e.key === '+' || e.key === '=' || e.key === '-' || e.key === '_')) {
            // Ctrl/Cmd plus/minus stays reserved for browser page zoom.
            e.preventDefault();
            if (e.key === '+' || e.key === '=') {
                this.zoomIn();
            } else {
                this.zoomOut();
            }
        }

        if (e.key === 'Escape') {
            if (openBlockingModal) {
                // A visible modal owns this Escape press; closing the config
                // panel too would also kick the user out of the shape tool.
                if (openBlockingModal === document.getElementById('settings-modal')) {
                    this.closeSettings();
                }
                return;
            }
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
