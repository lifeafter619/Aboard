// Extracted view controls runtime from main.js
// Preserves legacy board instance semantics by invoking methods with board as this.

function getElement(id) {
    return document.getElementById(id);
}

function handleDoubleTap(touch) {
    const currentScale = this.drawingEngine.canvasScale;
    const newScale = Math.abs(currentScale - 1.0) > 0.1 ? 1.0 : 2.0;
    this.zoomToPoint(touch.clientX, touch.clientY, newScale, true);
}

function zoomToPoint(clientX, clientY, newScale, animate = false) {
    const rect = this.canvas.getBoundingClientRect();
    const mouseCanvasX = clientX - rect.left;
    const mouseCanvasY = clientY - rect.top;

    const oldScale = this.drawingEngine.canvasScale;
    const oldPanX = this.drawingEngine.panOffset.x;
    const oldPanY = this.drawingEngine.panOffset.y;
    const scaleRatio = newScale / oldScale;

    const canvasCenterX = rect.width / 2;
    const canvasCenterY = rect.height / 2;
    const offsetX = mouseCanvasX - canvasCenterX;
    const offsetY = mouseCanvasY - canvasCenterY;

    this.drawingEngine.panOffset.x = oldPanX + offsetX * (1 - scaleRatio);
    this.drawingEngine.panOffset.y = oldPanY + offsetY * (1 - scaleRatio);
    this.drawingEngine.canvasScale = newScale;
    this.updateZoomUI();

    if (animate && this.transformLayer) {
        this.transformLayer.classList.add('smooth-transform');
        this.applyZoom(false);
        setTimeout(() => {
            if (this.transformLayer) {
                this.transformLayer.classList.remove('smooth-transform');
            }
        }, 300);
    } else {
        this.applyZoom(false);
    }

    localStorage.setItem('canvasScale', newScale);
    localStorage.setItem('panOffsetX', this.drawingEngine.panOffset.x);
    localStorage.setItem('panOffsetY', this.drawingEngine.panOffset.y);
}

function zoomIn() {
    const currentScale = this.drawingEngine.canvasScale;
    const newScale = Math.min(currentScale + 0.1, this.MAX_CANVAS_SCALE);
    this.drawingEngine.canvasScale = newScale;
    this.updateZoomUI();
    this.applyZoom(false);
    localStorage.setItem('canvasScale', newScale);
}

function zoomOut() {
    const currentScale = this.drawingEngine.canvasScale;
    const newScale = Math.max(currentScale - 0.1, 0.5);
    this.drawingEngine.canvasScale = newScale;
    this.updateZoomUI();
    this.applyZoom(false);
    localStorage.setItem('canvasScale', newScale);
}

function setZoom(value) {
    let percent = parseInt(value);
    if (isNaN(percent)) {
        this.updateZoomUI();
        return;
    }
    percent = Math.max(50, Math.min(this.MAX_CANVAS_SCALE * 100, percent));
    const newScale = percent / 100;
    this.drawingEngine.canvasScale = newScale;
    this.updateZoomUI();
    this.applyZoom(false);
    localStorage.setItem('canvasScale', newScale);
}

function applyZoom(updateConfigScale = true) {
    const finalScale = this.canvasFitScale * this.drawingEngine.canvasScale;
    const panX = this.drawingEngine.panOffset.x;
    const panY = this.drawingEngine.panOffset.y;
    const transform = `translate(-50%, -50%) translate(${panX}px, ${panY}px) scale(${finalScale})`;

    if (this.transformLayer) {
        this.transformLayer.style.transform = transform;
        this.transformLayer.style.transformOrigin = 'center center';
        this.canvas.style.transform = 'none';
        this.bgCanvas.style.transform = 'none';
    }

    this.scheduleRenderQualityUpdate();
    this.teachingToolsManager.canvasScaleFactor = finalScale;
    this.teachingToolsManager.redrawTools();

    if (updateConfigScale) {
        this.updateConfigAreaScale();
    }

    this.syncInteractiveOverlays();
}

function revealToolbar() {
    const toolbar = document.getElementById('toolbar');
    if (!toolbar) return;
    requestAnimationFrame(() => {
        toolbar.classList.remove('toolbar-loading');
    });
}

function updateConfigAreaScale() {
    const configArea = getElement('config-area');
    if (!configArea) {
        return;
    }

    const scale = this.drawingEngine.canvasScale;
    const hasBeenDragged = configArea.style.left && configArea.style.left !== 'auto' && configArea.style.left !== '50%';

    if (hasBeenDragged) {
        configArea.style.transform = `scale(${scale})`;
        configArea.style.transformOrigin = 'center bottom';
    } else {
        configArea.style.transform = `translateX(-50%) scale(${scale})`;
        configArea.style.transformOrigin = 'center bottom';
    }
}

function updateMaxCanvasScale() {
    if (this.settingsManager.unlimitedZoom) {
        this.MAX_CANVAS_SCALE = this.UNLIMITED_MAX_SCALE;
    } else {
        this.MAX_CANVAS_SCALE = this.NORMAL_MAX_SCALE;
        this.applyRenderQualityScale(1);
        if (this.drawingEngine.canvasScale > this.MAX_CANVAS_SCALE) {
            this.drawingEngine.canvasScale = this.MAX_CANVAS_SCALE;
            this.updateZoomUI();
            this.applyZoom(false);
            localStorage.setItem('canvasScale', this.drawingEngine.canvasScale);
        }
    }
}

function updateZoomUI() {
    const percent = Math.round(this.drawingEngine.canvasScale * 100);
    const zoomInput = getElement('zoom-input');
    if (zoomInput) {
        zoomInput.value = `${percent}%`;
    }
}

function updateZoomControlsVisibility() {
    const zoomOutBtn = document.getElementById('zoom-out-btn');
    const zoomInput = document.getElementById('zoom-input');
    const zoomInBtn = document.getElementById('zoom-in-btn');

    const display = this.settingsManager.showZoomControls ? 'flex' : 'none';
    const inputDisplay = this.settingsManager.showZoomControls ? 'block' : 'none';

    if (zoomOutBtn) zoomOutBtn.style.display = display;
    if (zoomInput) zoomInput.style.display = inputDisplay;
    if (zoomInBtn) zoomInBtn.style.display = display;

    this.updateHistoryControlsContainerVisibility();
}

function updateImportExportBtnVisibility() {
    const importBtn = document.getElementById('import-project-btn');
    const exportBtn = document.getElementById('export-btn-top');
    const display = this.settingsManager.showImportExportBtn ? 'flex' : 'none';

    if (importBtn) importBtn.style.display = display;
    if (exportBtn) exportBtn.style.display = display;

    this.updateHistoryControlsContainerVisibility();
}

function updateFullscreenBtnVisibility() {
    const fullscreenBtn = getElement('fullscreen-btn');
    if (!fullscreenBtn) {
        this.updateHistoryControlsContainerVisibility();
        return;
    }

    if (this.settingsManager.showFullscreenBtn) {
        fullscreenBtn.style.display = 'flex';
    } else {
        fullscreenBtn.style.display = 'none';
    }

    this.updateHistoryControlsContainerVisibility();
}

function updateHistoryControlsContainerVisibility() {
    const historyControls = document.getElementById('history-controls');
    if (!historyControls) return;

    const hasVisibleChild = Array.from(historyControls.children).some(child => {
        return window.getComputedStyle(child).display !== 'none';
    });

    historyControls.style.display = hasVisibleChild ? 'flex' : 'none';
}

window.AboardViewControlsRuntime = {
    handleDoubleTap(board, touch) {
        return handleDoubleTap.call(board, touch);
    },
    zoomToPoint(board, clientX, clientY, newScale, animate = false) {
        return zoomToPoint.call(board, clientX, clientY, newScale, animate);
    },
    zoomIn(board) {
        return zoomIn.call(board);
    },
    zoomOut(board) {
        return zoomOut.call(board);
    },
    setZoom(board, value) {
        return setZoom.call(board, value);
    },
    applyZoom(board, updateConfigScale = true) {
        return applyZoom.call(board, updateConfigScale);
    },
    revealToolbar(board) {
        return revealToolbar.call(board);
    },
    updateConfigAreaScale(board) {
        return updateConfigAreaScale.call(board);
    },
    updateMaxCanvasScale(board) {
        return updateMaxCanvasScale.call(board);
    },
    updateZoomUI(board) {
        return updateZoomUI.call(board);
    },
    updateZoomControlsVisibility(board) {
        return updateZoomControlsVisibility.call(board);
    },
    updateImportExportBtnVisibility(board) {
        return updateImportExportBtnVisibility.call(board);
    },
    updateFullscreenBtnVisibility(board) {
        return updateFullscreenBtnVisibility.call(board);
    },
    updateHistoryControlsContainerVisibility(board) {
        return updateHistoryControlsContainerVisibility.call(board);
    }
};
