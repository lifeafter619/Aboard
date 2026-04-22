// Extracted tool runtime from main.js
// Preserves legacy board instance semantics by invoking methods with board as this.

function getElement(id) {
    return document.getElementById(id);
}

function addClassIfPresent(element, className) {
    element?.classList?.add(className);
}

function removeClassIfPresent(element, className) {
    element?.classList?.remove(className);
}

function switchToPen() {
    this.setTool('pen', false);
}

function exitShapeMode() {
    if (this.drawingEngine.currentTool !== 'shape') return;
    this.shapeDrawingManager.stopDrawing();
    this.drawingEngine.setTool('more');
    this.updateUI();
}

function setTool(tool, showConfig = true) {
    const configArea = getElement('config-area');
    const featureArea = getElement('feature-area');
    const previousTool = this.drawingEngine.currentTool;

    if (this.isCoordinateOriginDragMode && tool !== 'background') {
        this.disableCoordinateOriginDragMode({ keepCursor: true });
    }
    if (this.isCoordinatePointMode && tool !== 'background') {
        this.setCoordinatePointMode(false);
    }
    if (tool !== 'background') {
        this.toggleCoordinateSettingsPanel(false);
        this.toggleCoordinatePointPanel(false);
    }
    
    const isSameTool = previousTool === tool;
    const isConfigVisible = configArea?.classList?.contains('show') || false;
    
    if (previousTool === 'select' && tool !== 'select') {
        this.selectionManager?.deactivate?.();
    }
    
    this.drawingEngine.setTool(tool);
    if (tool === 'shape') {
        this.ensureShapeToolConfigListenersInitialized();
    }
    if (tool === 'select') {
        this.ensureSelectToolConfigListenersInitialized();
    }
    if (tool === 'background') {
        this.ensureBackgroundPanelPrepared();
    }
    if (tool !== 'eraser') {
        this.hideEraserCursor();
    }
    
    if (tool === 'select') {
        this.selectionManager?.activate?.();
        if (this.insertTextManager) {
            this.selectionManager?.setTextManager?.(this.insertTextManager);
        }
    }
    
    this.updateUI();
    
    const toolsWithConfig = ['pen', 'eraser', 'background', 'shape', 'select'];
    
    if (showConfig && toolsWithConfig.includes(tool)) {
        if (isSameTool && isConfigVisible) {
            removeClassIfPresent(configArea, 'show');
            if (tool === 'background') {
                this.toggleCoordinateSettingsPanel(false);
                this.toggleCoordinatePointPanel(false);
            }
        } else {
            addClassIfPresent(configArea, 'show');
            if (configArea) {
                this.positionConfigArea();
                this.bringElementToFront(configArea);
            }
            if (tool !== 'shape') {
                removeClassIfPresent(featureArea, 'show');
            }
        }
    } else if (tool === 'more') {
        this.ensureMoreFeatureToolConfigListenersInitialized();
        const isFeatureAreaVisible = featureArea?.classList?.contains('show') || false;
        if (isFeatureAreaVisible) {
            removeClassIfPresent(featureArea, 'show');
            removeClassIfPresent(configArea, 'show');
        } else {
            addClassIfPresent(featureArea, 'show');
            removeClassIfPresent(configArea, 'show');
            if (featureArea) {
                this.positionFeatureArea();
                this.bringElementToFront(featureArea);
            }
        }
    } else {
        removeClassIfPresent(configArea, 'show');
        removeClassIfPresent(featureArea, 'show');
    }
}

function updateUI() {
    const configArea = getElement('config-area');

    document.querySelectorAll('.tool-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    
    document.querySelectorAll('.config-panel').forEach(panel => {
        panel.classList.remove('active');
    });
    
    const tool = this.drawingEngine.currentTool;
    const shapeFeatureBtn = getElement('more-shape-btn');
    if (shapeFeatureBtn) {
        shapeFeatureBtn.classList.toggle('active', tool === 'shape');
    }
    if (tool === 'pen') {
        addClassIfPresent(getElement('pen-btn'), 'active');
        addClassIfPresent(getElement('pen-config'), 'active');
        this.canvas.style.cursor = 'crosshair';
    } else if (tool === 'shape') {
        addClassIfPresent(getElement('more-btn'), 'active');
        addClassIfPresent(getElement('shape-config'), 'active');
        this.canvas.style.cursor = 'crosshair';
    } else if (tool === 'pan') {
        addClassIfPresent(getElement('pan-btn'), 'active');
        this.canvas.style.cursor = 'grab';
    } else if (tool === 'select') {
        addClassIfPresent(getElement('select-btn'), 'active');
        addClassIfPresent(getElement('select-config'), 'active');
        this.canvas.style.cursor = 'crosshair';
    } else if (tool === 'eraser') {
        addClassIfPresent(getElement('eraser-btn'), 'active');
        addClassIfPresent(getElement('eraser-config'), 'active');
        this.canvas.style.cursor = 'pointer';
        const currentShape = this.drawingEngine.eraserShape === 'rectangle' ? 'rectangle' : 'circle';
        document.querySelectorAll('.eraser-shape-btn').forEach((btn) => {
            btn.classList.toggle('active', btn.dataset.eraserShape === currentShape);
        });
        this.syncEraserSizeControls();
    } else if (tool === 'background') {
        addClassIfPresent(getElement('background-btn'), 'active');
        addClassIfPresent(getElement('background-config'), 'active');
        this.canvas.style.cursor = 'default';
    } else if (tool === 'more') {
        addClassIfPresent(getElement('more-btn'), 'active');
        const featureArea = getElement('feature-area');
        if (featureArea?.classList?.contains('show')) {
            this.positionFeatureArea();
        }
        
        this.canvas.style.cursor = 'default';
    }

    if (configArea && !configArea.querySelector('.config-panel.active')) {
        configArea.classList.remove('show');
    }
    
    const undoBtn = getElement('undo-btn');
    if (undoBtn) {
        undoBtn.disabled = !this.historyManager.canUndo();
    }

    const redoBtn = getElement('redo-btn');
    if (redoBtn) {
        redoBtn.disabled = !this.historyManager.canRedo();
    }
    
    const paginationControls = getElement('pagination-controls');
    addClassIfPresent(paginationControls, 'show');
}

window.AboardToolRuntime = {
    switchToPen(board) {
        return switchToPen.call(board);
    },
    exitShapeMode(board) {
        return exitShapeMode.call(board);
    },
    setTool(board, tool, showConfig = true) {
        return setTool.call(board, tool, showConfig);
    },
    updateUI(board) {
        return updateUI.call(board);
    }
};
