// Extracted tool runtime from main.js
// Preserves legacy board instance semantics by invoking methods with board as this.

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
    const configArea = document.getElementById('config-area');
    const featureArea = document.getElementById('feature-area');
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
    const isConfigVisible = configArea.classList.contains('show');
    
    if (previousTool === 'select' && tool !== 'select') {
        this.selectionManager.deactivate();
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
        this.selectionManager.activate();
        if (this.insertTextManager) {
            this.selectionManager.setTextManager(this.insertTextManager);
        }
    }
    
    this.updateUI();
    
    const toolsWithConfig = ['pen', 'eraser', 'background', 'shape', 'select'];
    
    if (showConfig && toolsWithConfig.includes(tool)) {
        if (isSameTool && isConfigVisible) {
            configArea.classList.remove('show');
            if (tool === 'background') {
                this.toggleCoordinateSettingsPanel(false);
                this.toggleCoordinatePointPanel(false);
            }
        } else {
            configArea.classList.add('show');
            this.positionConfigArea();
            this.bringElementToFront(configArea);
            if (tool !== 'shape') {
                featureArea.classList.remove('show');
            }
        }
    } else if (tool === 'more') {
        this.ensureMoreFeatureToolConfigListenersInitialized();
        const isFeatureAreaVisible = featureArea.classList.contains('show');
        if (isFeatureAreaVisible) {
            featureArea.classList.remove('show');
            configArea.classList.remove('show');
        } else {
            featureArea.classList.add('show');
            configArea.classList.remove('show');
            this.positionFeatureArea();
            this.bringElementToFront(featureArea);
        }
    } else {
        configArea.classList.remove('show');
        featureArea.classList.remove('show');
    }
}

function updateUI() {
    const configArea = document.getElementById('config-area');

    document.querySelectorAll('.tool-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    
    document.querySelectorAll('.config-panel').forEach(panel => {
        panel.classList.remove('active');
    });
    
    const tool = this.drawingEngine.currentTool;
    const shapeFeatureBtn = document.getElementById('more-shape-btn');
    if (shapeFeatureBtn) {
        shapeFeatureBtn.classList.toggle('active', tool === 'shape');
    }
    if (tool === 'pen') {
        document.getElementById('pen-btn').classList.add('active');
        document.getElementById('pen-config').classList.add('active');
        this.canvas.style.cursor = 'crosshair';
    } else if (tool === 'shape') {
        document.getElementById('more-btn').classList.add('active');
        document.getElementById('shape-config').classList.add('active');
        this.canvas.style.cursor = 'crosshair';
    } else if (tool === 'pan') {
        document.getElementById('pan-btn').classList.add('active');
        this.canvas.style.cursor = 'grab';
    } else if (tool === 'select') {
        document.getElementById('select-btn').classList.add('active');
        document.getElementById('select-config').classList.add('active');
        this.canvas.style.cursor = 'crosshair';
    } else if (tool === 'eraser') {
        document.getElementById('eraser-btn').classList.add('active');
        document.getElementById('eraser-config').classList.add('active');
        this.canvas.style.cursor = 'pointer';
        const currentShape = this.drawingEngine.eraserShape === 'rectangle' ? 'rectangle' : 'circle';
        document.querySelectorAll('.eraser-shape-btn').forEach((btn) => {
            btn.classList.toggle('active', btn.dataset.eraserShape === currentShape);
        });
        this.syncEraserSizeControls();
    } else if (tool === 'background') {
        document.getElementById('background-btn').classList.add('active');
        document.getElementById('background-config').classList.add('active');
        this.canvas.style.cursor = 'default';
    } else if (tool === 'more') {
        document.getElementById('more-btn').classList.add('active');
        const featureArea = document.getElementById('feature-area');
        if (featureArea.classList.contains('show')) {
            this.positionFeatureArea();
        }
        
        this.canvas.style.cursor = 'default';
    }

    if (configArea && !configArea.querySelector('.config-panel.active')) {
        configArea.classList.remove('show');
    }
    
    document.getElementById('undo-btn').disabled = !this.historyManager.canUndo();
    document.getElementById('redo-btn').disabled = !this.historyManager.canRedo();
    
    const paginationControls = document.getElementById('pagination-controls');
    paginationControls.classList.add('show');
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
