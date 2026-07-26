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

function setActiveButtonState(button, active) {
    if (!button) {
        return;
    }
    button.classList?.toggle?.('active', active);
    if (button.hasAttribute?.('aria-pressed')) {
        button.setAttribute('aria-pressed', active ? 'true' : 'false');
    }
}

function collapseFeatureArea(featureArea) {
    removeClassIfPresent(featureArea, 'show');
    if (featureArea) {
        featureArea.setAttribute('aria-hidden', 'true');
    }
    const moreButton = getElement('more-btn');
    if (moreButton) {
        moreButton.setAttribute('aria-expanded', 'false');
    }
}

function expandFeatureArea(featureArea) {
    addClassIfPresent(featureArea, 'show');
    if (featureArea) {
        featureArea.setAttribute('aria-hidden', 'false');
    }
    const moreButton = getElement('more-btn');
    if (moreButton) {
        moreButton.setAttribute('aria-expanded', 'true');
    }
}

function focusFirstFeatureAction(featureArea) {
    const action = featureArea?.querySelector?.('#more-shape-btn')
        || featureArea?.querySelector?.('button:not([disabled])');
    if (!action || typeof action.focus !== 'function') {
        return;
    }
    const focus = () => {
        try {
            action.focus({ preventScroll: true });
        } catch (error) {
            action.focus();
        }
    };
    if (typeof window.requestAnimationFrame === 'function') {
        window.requestAnimationFrame(focus);
    } else {
        focus();
    }
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
                collapseFeatureArea(featureArea);
            }
        }
    } else if (tool === 'more') {
        this.ensureMoreFeatureToolConfigListenersInitialized();
        const isFeatureAreaVisible = featureArea?.classList?.contains('show') || false;
        if (isFeatureAreaVisible) {
            collapseFeatureArea(featureArea);
            removeClassIfPresent(configArea, 'show');
        } else {
            expandFeatureArea(featureArea);
            removeClassIfPresent(configArea, 'show');
            if (featureArea) {
                this.positionFeatureArea();
                this.bringElementToFront(featureArea);
            }
            focusFirstFeatureAction(featureArea);
        }
    } else {
        removeClassIfPresent(configArea, 'show');
        collapseFeatureArea(featureArea);
    }
}

function updateUI() {
    const configArea = getElement('config-area');

    document.querySelectorAll('.tool-btn').forEach(btn => {
        setActiveButtonState(btn, false);
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
        setActiveButtonState(getElement('pen-btn'), true);
        addClassIfPresent(getElement('pen-config'), 'active');
        this.canvas.style.cursor = 'crosshair';
    } else if (tool === 'shape') {
        setActiveButtonState(getElement('more-btn'), true);
        addClassIfPresent(getElement('shape-config'), 'active');
        this.canvas.style.cursor = 'crosshair';
    } else if (tool === 'pan') {
        setActiveButtonState(getElement('pan-btn'), true);
        this.canvas.style.cursor = 'grab';
    } else if (tool === 'select') {
        setActiveButtonState(getElement('select-btn'), true);
        addClassIfPresent(getElement('select-config'), 'active');
        this.canvas.style.cursor = 'default';
    } else if (tool === 'eraser') {
        setActiveButtonState(getElement('eraser-btn'), true);
        addClassIfPresent(getElement('eraser-config'), 'active');
        this.canvas.style.cursor = 'pointer';
        const currentShape = this.drawingEngine.eraserShape === 'rectangle' ? 'rectangle' : 'circle';
        document.querySelectorAll('.eraser-shape-btn').forEach((btn) => {
            setActiveButtonState(btn, btn.dataset.eraserShape === currentShape);
        });
        this.syncEraserSizeControls();
    } else if (tool === 'background') {
        setActiveButtonState(getElement('background-btn'), true);
        addClassIfPresent(getElement('background-config'), 'active');
        this.canvas.style.cursor = 'default';
    } else if (tool === 'more') {
        setActiveButtonState(getElement('more-btn'), true);
        const featureArea = getElement('feature-area');
        if (featureArea?.classList?.contains('show')) {
            this.positionFeatureArea();
        }
        
        this.canvas.style.cursor = 'default';
    }

    configArea?.classList?.toggle('background-config-mode', tool === 'background');

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
    this.classroomModeManager?.syncBoardState?.();
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
