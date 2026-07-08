// Extracted coordinate tools runtime from main.js
// Preserves legacy board instance semantics by invoking methods with board as this.

function getCoordinateText(key, fallback, params = {}) {
    if (!window.i18n?.t) {
        return fallback;
    }

    const translated = window.i18n.t(key, params);
    return translated && translated !== key ? translated : fallback;
}

function showCoordinateToast(i18nKey, fallback, type = 'info') {
    this.settingsManager?.toastManager?.show(getCoordinateText(i18nKey, fallback), type);
}

// Plot ids can come from imported project files, so they must be escaped
// before being interpolated into an attribute selector — characters like
// `"` or `]` would otherwise make querySelector throw.
function escapeCoordinatePlotIdForSelector(plotId) {
    const value = String(plotId ?? '');
    if (typeof CSS !== 'undefined' && typeof CSS.escape === 'function') {
        return CSS.escape(value);
    }
    return value.replace(/["\\\]]/g, '\\$&');
}

function getLogicalCanvasPointFromEvent(e) {
    if (this.drawingEngine?.getPosition) {
        return this.drawingEngine.getPosition(e);
    }

    const rect = this.canvas.getBoundingClientRect();
    const scaleX = rect.width ? this.canvas.offsetWidth / rect.width : 1;
    const scaleY = rect.height ? this.canvas.offsetHeight / rect.height : 1;
    return {
        x: Math.max(0, Math.min((e.clientX - rect.left) * scaleX, this.canvas.offsetWidth || rect.width || 0)),
        y: Math.max(0, Math.min((e.clientY - rect.top) * scaleY, this.canvas.offsetHeight || rect.height || 0))
    };
}

function resetSelectedCoordinateLineConnection(options = {}) {
    const { clearSelection = false } = options;
    this.pendingCoordinateLineStartId = null;

    if (clearSelection && this.selectionManager?.isCoordinateSelection?.()) {
        this.selectionManager.clearSelection();
    }
}

function handleSelectedCoordinateLinePointClick(pointId) {
    if (!pointId || !this.backgroundManager) return false;

    const startPointId = this.pendingCoordinateLineStartId;
    if (!startPointId || startPointId === pointId) {
        this.pendingCoordinateLineStartId = pointId;
        this.showCoordinateToast(
            'background.coordinateStatusSelectLineStartPoint',
            'Selected the first point. Click another point to connect them.'
        );
        return true;
    }

    const existingGroup = this.backgroundManager.findCoordinateGroupByPointIds?.([startPointId, pointId], { line: true });
    if (existingGroup) {
        this.resetSelectedCoordinateLineConnection();
        this.showCoordinateToast(
            'background.coordinateLineExists',
            'A line already exists between these two points.'
        );
        return true;
    }

    this.backgroundManager.createCoordinateGroup([startPointId, pointId], { line: true });
    this.resetSelectedCoordinateLineConnection();
    this.savePageBackground(this.currentPage);
    this.updateBackgroundUI();
    this.showCoordinateToast('background.coordinateLineCreated', 'Line connected.', 'success');
    return true;
}

function syncCoordinateExpressionDisplay() {
    const display = document.getElementById('coordinate-keypad-expression-display');
    const input = document.getElementById('coordinate-expression-input');
    if (!display || !input) return;
    display.textContent = input.value || (this.backgroundManager.backgroundPattern === 'polar' ? 'r = ' : 'y = ');
}

function getCoordinatePlotAxisOptions(coordinateType = this.backgroundManager?.backgroundPattern) {
    if (coordinateType === 'polar') {
        return [
            { value: 'theta', label: 'θ' },
            { value: 'r', label: 'r' }
        ];
    }

    return [
        { value: 'x', label: 'x' },
        { value: 'y', label: 'y' }
    ];
}

function createCoordinatePlotRangeRowMarkup(segment = {}, coordinateType = this.backgroundManager?.backgroundPattern) {
    const axisOptions = this.getCoordinatePlotAxisOptions(coordinateType);
    const defaultAxisValue = axisOptions.length > 0 ? axisOptions[0].value : '';
    const axisOptionsMarkup = axisOptions
        .map(option => `<option value="${option.value}"${option.value === (segment.axis || defaultAxisValue) ? ' selected' : ''}>${this.escapeHtml(option.label)}</option>`)
        .join('');
    const minValue = segment.min ?? '';
    const maxValue = segment.max ?? '';
    const segmentId = segment.id || `segment-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
    const axisLabel = getCoordinateText('background.plotRangeAxis', 'Axis');
    const minLabel = getCoordinateText('background.plotRangeMin', 'Min');
    const maxLabel = getCoordinateText('background.plotRangeMax', 'Max');

    return `
        <div class="coordinate-plot-range-row" data-range-row data-segment-id="${this.escapeHtml(segmentId)}">
            <select data-range-field="axis" aria-label="${this.escapeHtml(axisLabel)}">${axisOptionsMarkup}</select>
            <input type="number" step="0.1" data-range-field="min" value="${this.escapeHtml(minValue)}" placeholder="${this.escapeHtml(getCoordinateText('background.plotRangeMinPlaceholder', 'Min value'))}" aria-label="${this.escapeHtml(minLabel)}">
            <input type="number" step="0.1" data-range-field="max" value="${this.escapeHtml(maxValue)}" placeholder="${this.escapeHtml(getCoordinateText('background.plotRangeMaxPlaceholder', 'Max value'))}" aria-label="${this.escapeHtml(maxLabel)}">
            <button type="button" class="coordinate-plot-range-remove" data-plot-range-remove="${this.escapeHtml(segmentId)}" title="${this.escapeHtml(getCoordinateText('background.plotRemoveRange', 'Remove range'))}" aria-label="${this.escapeHtml(getCoordinateText('background.plotRemoveRange', 'Remove range'))}">✕</button>
        </div>
    `;
}

function handleCoordinatePlotListClick(e) {
    if (typeof e.target?.closest !== 'function') return;
    const actionButton = e.target.closest('[data-plot-toggle-edit], [data-plot-save], [data-plot-cancel], [data-plot-remove], [data-plot-add-segment], [data-plot-range-remove]');
    if (!actionButton) return;

    if (actionButton.dataset.plotToggleEdit) {
        const plotId = actionButton.dataset.plotToggleEdit;
        this.expandedCoordinatePlotId = this.expandedCoordinatePlotId === plotId ? null : plotId;
        this.updateBackgroundUI();
        return;
    }

    if (actionButton.dataset.plotCancel) {
        this.expandedCoordinatePlotId = null;
        this.updateBackgroundUI();
        return;
    }

    if (actionButton.dataset.plotRemove) {
        const plotId = actionButton.dataset.plotRemove;
        if (this.expandedCoordinatePlotId === plotId) {
            this.expandedCoordinatePlotId = null;
        }
        this.backgroundManager.removeCoordinatePlot(plotId);
        this.savePageBackground(this.currentPage);
        this.updateBackgroundUI();
        return;
    }

    if (actionButton.dataset.plotSave) {
        this.saveCoordinatePlotEditor(actionButton.dataset.plotSave);
        return;
    }

    if (actionButton.dataset.plotAddSegment) {
        this.addCoordinatePlotRangeRow(actionButton.dataset.plotAddSegment);
        return;
    }

    if (actionButton.dataset.plotRangeRemove) {
        const row = actionButton.closest('[data-range-row]');
        row?.remove();
        const editor = actionButton.closest('.coordinate-plot-editor');
        const rangeList = editor?.querySelector('.coordinate-plot-range-list');
        if (rangeList && !rangeList.querySelector('[data-range-row]')) {
            rangeList.innerHTML = `<div class="coordinate-plot-range-empty">${this.escapeHtml(getCoordinateText('background.plotNoRange', 'No display range limit. Showing all by default.'))}</div>`;
        }
    }
}

function addCoordinatePlotRangeRow(plotId) {
    const plotItem = document.querySelector(`.coordinate-plot-item[data-plot-id="${escapeCoordinatePlotIdForSelector(plotId)}"]`);
    const rangeList = plotItem?.querySelector('.coordinate-plot-range-list');
    if (!rangeList) return;

    const coordinateType = plotItem.dataset.coordinateType || this.backgroundManager.backgroundPattern;
    const emptyState = rangeList.querySelector('.coordinate-plot-range-empty');
    if (emptyState) {
        emptyState.remove();
    }
    rangeList.insertAdjacentHTML('beforeend', this.createCoordinatePlotRangeRowMarkup({}, coordinateType));
}

function collectCoordinatePlotEditorSegments(plotId) {
    const plotItem = document.querySelector(`.coordinate-plot-item[data-plot-id="${escapeCoordinatePlotIdForSelector(plotId)}"]`);
    if (!plotItem) return [];

    return Array.from(plotItem.querySelectorAll('[data-range-row]')).map(row => ({
        id: row.dataset.segmentId,
        axis: row.querySelector('[data-range-field="axis"]')?.value,
        min: row.querySelector('[data-range-field="min"]')?.value?.trim() ?? '',
        max: row.querySelector('[data-range-field="max"]')?.value?.trim() ?? ''
    }));
}

function saveCoordinatePlotEditor(plotId) {
    const plotItem = document.querySelector(`.coordinate-plot-item[data-plot-id="${escapeCoordinatePlotIdForSelector(plotId)}"]`);
    if (!plotItem) return;

    const expression = plotItem.querySelector('[data-plot-field="expression"]')?.value?.trim() || '';
    const color = plotItem.querySelector('[data-plot-field="color"]')?.value || '#2563eb';
    const strokeWidth = plotItem.querySelector('[data-plot-field="strokeWidth"]')?.value || '2.5';
    const dashStyle = plotItem.querySelector('[data-plot-field="dashStyle"]')?.value || 'solid';
    const segments = this.collectCoordinatePlotEditorSegments(plotId);

    try {
        this.backgroundManager.updateCoordinatePlot(plotId, {
            expression,
            color,
            strokeWidth,
            dashStyle,
            segments
        });
        this.expandedCoordinatePlotId = null;
        this.savePageBackground(this.currentPage);
        this.updateBackgroundUI();
        this.showCoordinateToast('background.plotUpdated', 'Function plot updated.', 'success');
    } catch (error) {
        console.error('Failed to update coordinate plot:', error);
        this.showCoordinateToast('background.plotError', 'Invalid expression. Unable to plot.', 'error');
    }
}

function getCoordinatePointLineMode() {
    return this.backgroundManager?.getCoordinatePointLineMode?.() || 'auto';
}

function getCoordinatePointLineModeMeta(mode = this.getCoordinatePointLineMode()) {
    const normalizedMode = ['line', 'auto', 'selected'].includes(mode) ? mode : 'auto';
    const modeConfig = {
        line: {
            hintKey: 'background.addPointHintLineOnly',
            hintFallback: 'When enabled, click the canvas to place coordinate points and draw only the polyline',
            statusOnKey: 'background.coordinateStatusAddPointLineOnly',
            statusOnFallback: 'Line-only mode enabled. Click the canvas to place coordinate points',
            statusOffKey: 'background.coordinateStatusAddPointOff',
            statusOffFallback: 'Draw points & lines mode disabled'
        },
        auto: {
            hintKey: 'background.addPointHintAuto',
            hintFallback: 'When enabled, click the canvas to place coordinate points and connect them automatically',
            statusOnKey: 'background.coordinateStatusAddPointAuto',
            statusOnFallback: 'Auto-connect mode enabled. Click the canvas to place coordinate points',
            statusOffKey: 'background.coordinateStatusAddPointOff',
            statusOffFallback: 'Draw points & lines mode disabled'
        },
        selected: {
            hintKey: 'background.addPointHintSelectedInteractive',
            hintFallback: 'When enabled, click empty space to add points; click two points in sequence to connect them',
            statusOnKey: 'background.coordinateStatusAddPointSelectedInteractive',
            statusOnFallback: 'Selected-connect mode enabled. Click empty space to add points, then click two points to connect them',
            statusOffKey: 'background.coordinateStatusAddPointOff',
            statusOffFallback: 'Draw points & lines mode disabled'
        }
    };
    return modeConfig[normalizedMode];
}

function showCoordinatePointModeStatus(enabled) {
    const modeMeta = this.getCoordinatePointLineModeMeta();
    if (enabled) {
        this.showCoordinateToast(modeMeta.statusOnKey, modeMeta.statusOnFallback);
    } else {
        this.showCoordinateToast(modeMeta.statusOffKey, modeMeta.statusOffFallback);
    }
}

function syncCoordinatePointModeSectionVisibility(forceVisible) {
    const section = document.getElementById('coordinate-point-mode-section');
    if (!section) return;

    const isVisible = typeof forceVisible === 'boolean'
        ? forceVisible
        : !!this.isCoordinatePointMode && this.backgroundManager.supportsMovableOrigin(this.backgroundManager.backgroundPattern);
    section.hidden = !isVisible;
}

function setCoordinatePointLineMode(mode, options = {}) {
    const normalizedMode = ['line', 'auto', 'selected'].includes(mode) ? mode : 'auto';
    const currentMode = this.getCoordinatePointLineMode();
    if (currentMode === normalizedMode) {
        return false;
    }

    this.resetSelectedCoordinateLineConnection();
    this.backgroundManager.updateCoordinateOverlayOptions({
        pointLineMode: normalizedMode
    });
    this.savePageBackground(this.currentPage);
    this.updateBackgroundUI();

    if (!options.silent) {
        const modeMeta = this.getCoordinatePointLineModeMeta(normalizedMode);
        this.showCoordinateToast(modeMeta.statusOnKey, modeMeta.statusOnFallback, 'success');
    }
    return true;
}

function setCoordinatePointMode(enabled) {
    this.isCoordinatePointMode = !!enabled && this.backgroundManager.supportsMovableOrigin();
    if (!this.isCoordinatePointMode) {
        this.resetSelectedCoordinateLineConnection();
    }

    const addPointBtn = document.getElementById('coordinate-add-point-btn');
    if (addPointBtn) {
        addPointBtn.classList.toggle('active', this.isCoordinatePointMode);
    }

    const pointToggleBtn = document.getElementById('coordinate-point-toggle-btn');
    if (pointToggleBtn) {
        pointToggleBtn.classList.toggle('active', this.isCoordinatePointPanelVisible || this.isCoordinatePointMode);
    }

    this.syncCoordinatePointModeSectionVisibility();

    if (this.isCoordinatePointMode) {
        if (this.drawingEngine.currentTool !== 'background') {
            this.setTool('background');
        }
        this.disableCoordinateOriginDragMode({ keepCursor: true });
        this.canvas.style.cursor = 'copy';
    } else if (!this.isCoordinateOriginDragMode) {
        switch (this.drawingEngine.currentTool) {
            case 'pan':
                this.canvas.style.cursor = 'grab';
                break;
            case 'background':
            case 'more':
                this.canvas.style.cursor = 'default';
                break;
            case 'eraser':
                this.canvas.style.cursor = 'pointer';
                break;
            default:
                this.canvas.style.cursor = 'crosshair';
                break;
        }
    }
}

function disableCoordinateOriginDragMode(options = {}) {
    const { keepCursor = false } = options;
    const moveOriginBtn = document.getElementById('move-origin-btn');

    if (moveOriginBtn) {
        moveOriginBtn.classList.remove('active');
    }

    this.isCoordinateOriginDragMode = false;
    this.isDraggingCoordinateOrigin = false;

    if (keepCursor) {
        return;
    }

    switch (this.drawingEngine.currentTool) {
        case 'pan':
            this.canvas.style.cursor = 'grab';
            break;
        case 'background':
        case 'more':
            this.canvas.style.cursor = 'default';
            break;
        case 'eraser':
            this.canvas.style.cursor = 'pointer';
            break;
        default:
            this.canvas.style.cursor = 'crosshair';
            break;
    }
}

window.AboardCoordinateToolsRuntime = {
    showCoordinateToast(board, i18nKey, fallback, type = 'info') {
        return showCoordinateToast.call(board, i18nKey, fallback, type);
    },
    getLogicalCanvasPointFromEvent(board, e) {
        return getLogicalCanvasPointFromEvent.call(board, e);
    },
    resetSelectedCoordinateLineConnection(board, options = {}) {
        return resetSelectedCoordinateLineConnection.call(board, options);
    },
    handleSelectedCoordinateLinePointClick(board, pointId) {
        return handleSelectedCoordinateLinePointClick.call(board, pointId);
    },
    syncCoordinateExpressionDisplay(board) {
        return syncCoordinateExpressionDisplay.call(board);
    },
    getCoordinatePlotAxisOptions(board, coordinateType) {
        return getCoordinatePlotAxisOptions.call(board, coordinateType);
    },
    createCoordinatePlotRangeRowMarkup(board, segment = {}, coordinateType) {
        return createCoordinatePlotRangeRowMarkup.call(board, segment, coordinateType);
    },
    handleCoordinatePlotListClick(board, e) {
        return handleCoordinatePlotListClick.call(board, e);
    },
    addCoordinatePlotRangeRow(board, plotId) {
        return addCoordinatePlotRangeRow.call(board, plotId);
    },
    collectCoordinatePlotEditorSegments(board, plotId) {
        return collectCoordinatePlotEditorSegments.call(board, plotId);
    },
    saveCoordinatePlotEditor(board, plotId) {
        return saveCoordinatePlotEditor.call(board, plotId);
    },
    getCoordinatePointLineMode(board) {
        return getCoordinatePointLineMode.call(board);
    },
    getCoordinatePointLineModeMeta(board, mode) {
        return getCoordinatePointLineModeMeta.call(board, mode);
    },
    showCoordinatePointModeStatus(board, enabled) {
        return showCoordinatePointModeStatus.call(board, enabled);
    },
    syncCoordinatePointModeSectionVisibility(board, forceVisible) {
        return syncCoordinatePointModeSectionVisibility.call(board, forceVisible);
    },
    setCoordinatePointLineMode(board, mode, options = {}) {
        return setCoordinatePointLineMode.call(board, mode, options);
    },
    setCoordinatePointMode(board, enabled) {
        return setCoordinatePointMode.call(board, enabled);
    },
    disableCoordinateOriginDragMode(board, options = {}) {
        return disableCoordinateOriginDragMode.call(board, options);
    }
};
