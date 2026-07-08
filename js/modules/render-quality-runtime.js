// Extracted render quality runtime from main.js
// Preserves legacy board instance semantics by invoking methods with board as this.

const RQ_QUALITY_UPDATE_DEBOUNCE_MS = 120;
const RQ_MIN_DYNAMIC_RENDER_SCALE = 1;
const RQ_MAX_DYNAMIC_RENDER_SCALE = 4;
const RQ_INTERACTION_DYNAMIC_RENDER_SCALE_CAP = 1.25;
const RQ_RENDER_SCALE_SCHEDULE_THRESHOLD = 0.15;
const RQ_RENDER_SCALE_APPLY_THRESHOLD = 0.05;
const RQ_MAX_DYNAMIC_BACKING_DIMENSION = 8192;
const RQ_MAX_DYNAMIC_BACKING_PIXELS = 64 * 1024 * 1024;

function calculateCanvasFitScale() {
    const width = this.settingsManager.canvasWidth;
    const height = this.settingsManager.canvasHeight;
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const margin = 40;

    const availableWidth = viewportWidth - (2 * margin);
    const availableHeight = viewportHeight - (2 * margin);
    const scaleX = availableWidth / width;
    const scaleY = availableHeight / height;
    return Math.min(scaleX, scaleY, 1);
}

function getRenderPixelRatio() {
    const baseDpr = window.devicePixelRatio || 1;
    return baseDpr * this.dynamicRenderScale;
}

function getTargetRenderScale() {
    if (!this.settingsManager.unlimitedZoom) {
        return RQ_MIN_DYNAMIC_RENDER_SCALE;
    }

    const isInteractiveHighZoom = !!(
        this.drawingEngine?.isDrawing ||
        this.drawingEngine?.isPanning ||
        this.isPinching ||
        this.hasTwoFingers ||
        this.shapeDrawingManager?.isDrawing
    );
    const scale = this.drawingEngine?.canvasScale || 1;
    const preferredScale = Math.min(
        isInteractiveHighZoom ? RQ_INTERACTION_DYNAMIC_RENDER_SCALE_CAP : RQ_MAX_DYNAMIC_RENDER_SCALE,
        Math.max(RQ_MIN_DYNAMIC_RENDER_SCALE, Math.sqrt(scale))
    );

    const cssWidth = parseFloat(this.canvas.style.width) || this.settingsManager.canvasWidth;
    const cssHeight = parseFloat(this.canvas.style.height) || this.settingsManager.canvasHeight;
    const baseDpr = window.devicePixelRatio || 1;

    const dimLimitScale = Math.min(
        RQ_MAX_DYNAMIC_BACKING_DIMENSION / Math.max(1, cssWidth * baseDpr),
        RQ_MAX_DYNAMIC_BACKING_DIMENSION / Math.max(1, cssHeight * baseDpr)
    );
    const pixelLimitScale = Math.sqrt(
        RQ_MAX_DYNAMIC_BACKING_PIXELS / Math.max(1, cssWidth * cssHeight * baseDpr * baseDpr)
    );
    const safeScale = Math.min(preferredScale, dimLimitScale, pixelLimitScale);
    if (!Number.isFinite(safeScale)) {
        return RQ_MIN_DYNAMIC_RENDER_SCALE;
    }
    return Math.max(RQ_MIN_DYNAMIC_RENDER_SCALE, safeScale);
}

function scheduleRenderQualityUpdate() {
    const targetScale = this.getTargetRenderScale();
    if (this.qualityUpdateTimer) {
        clearTimeout(this.qualityUpdateTimer);
        this.qualityUpdateTimer = null;
    }
    if (Math.abs(targetScale - this.dynamicRenderScale) < RQ_RENDER_SCALE_SCHEDULE_THRESHOLD) {
        return;
    }
    this.qualityUpdateTimer = setTimeout(() => {
        this.qualityUpdateTimer = null;
        this.applyRenderQualityScale(targetScale);
    }, RQ_QUALITY_UPDATE_DEBOUNCE_MS);
}

function applyRenderQualityScale(scale) {
    if (Math.abs(scale - this.dynamicRenderScale) < RQ_RENDER_SCALE_APPLY_THRESHOLD) return;

    const isInteractionActive = !!(
        this.drawingEngine?.isDrawing ||
        this.drawingEngine?.isPanning ||
        this.shapeDrawingManager?.isDrawing ||
        this.isPinching ||
        this.hasTwoFingers
    );
    if (isInteractionActive) {
        if (this.qualityUpdateTimer) {
            clearTimeout(this.qualityUpdateTimer);
        }
        this.qualityUpdateTimer = setTimeout(() => {
            this.qualityUpdateTimer = null;
            this.applyRenderQualityScale(scale);
        }, RQ_QUALITY_UPDATE_DEBOUNCE_MS);
        return;
    }

    const width = parseFloat(this.canvas.style.width) || this.settingsManager.canvasWidth;
    const height = parseFloat(this.canvas.style.height) || this.settingsManager.canvasHeight;

    this.dynamicRenderScale = scale;
    const dpr = this.getRenderPixelRatio();

    this.canvas.width = width * dpr;
    this.canvas.height = height * dpr;
    this.canvas.style.width = `${width}px`;
    this.canvas.style.height = `${height}px`;

    this.bgCanvas.width = width * dpr;
    this.bgCanvas.height = height * dpr;
    this.bgCanvas.style.width = `${width}px`;
    this.bgCanvas.style.height = `${height}px`;

    this.ctx.setTransform(1, 0, 0, 1, 0, 0);
    this.bgCtx.setTransform(1, 0, 0, 1, 0, 0);
    this.ctx.imageSmoothingEnabled = true;
    this.ctx.imageSmoothingQuality = 'high';
    this.ctx.scale(dpr, dpr);
    this.bgCtx.scale(dpr, dpr);

    this.ctx.clearRect(0, 0, width, height);
    this.bgCtx.clearRect(0, 0, width, height);
    this.backgroundManager.drawBackground();
    this.drawingEngine.renderScene(this.insertTextManager || null);
}

function isFiniteNumber(value) {
    return Number.isFinite(Number(value));
}

function scaleNumericProperty(target, property, factor) {
    if (target && isFiniteNumber(target[property])) {
        target[property] = Number(target[property]) * factor;
    }
}

function scalePoint(point, scaleX, scaleY) {
    if (!point || typeof point !== 'object') {
        return;
    }
    scaleNumericProperty(point, 'x', scaleX);
    scaleNumericProperty(point, 'y', scaleY);
}

function scaleStrokeGeometry(stroke, scaleX, scaleY, scaleSize) {
    if (!stroke || typeof stroke !== 'object') {
        return;
    }

    if (Array.isArray(stroke.points)) {
        stroke.points.forEach((point) => scalePoint(point, scaleX, scaleY));
    }
    scalePoint(stroke.shapeStart, scaleX, scaleY);
    scalePoint(stroke.shapeEnd, scaleX, scaleY);
    scalePoint(stroke.rotationCenter, scaleX, scaleY);
    scaleNumericProperty(stroke, 'size', scaleSize);
    scaleNumericProperty(stroke, 'arrowSize', scaleSize);
    scaleNumericProperty(stroke, 'shapeMultiLineSpacing', scaleSize);
}

function scaleTextGeometry(textObj, scaleX, scaleY, scaleSize) {
    if (!textObj || typeof textObj !== 'object') {
        return;
    }

    scaleNumericProperty(textObj, 'x', scaleX);
    scaleNumericProperty(textObj, 'y', scaleY);
    scaleNumericProperty(textObj, 'width', scaleX);
    scaleNumericProperty(textObj, 'height', scaleY);
    scaleNumericProperty(textObj, 'fontSize', scaleSize);
    scaleNumericProperty(textObj, 'decorationWidth', scaleSize);
}

function scaleImageGeometry(image, scaleX, scaleY) {
    if (!image || typeof image !== 'object') {
        return;
    }

    scaleNumericProperty(image, 'x', scaleX);
    scaleNumericProperty(image, 'y', scaleY);
    scaleNumericProperty(image, 'width', scaleX);
    scaleNumericProperty(image, 'height', scaleY);
}

function scaleSceneGeometry(scene, scaleX, scaleY, scaleSize) {
    if (!scene || typeof scene !== 'object') {
        return;
    }

    if (Array.isArray(scene.strokes)) {
        scene.strokes.forEach((stroke) => scaleStrokeGeometry(stroke, scaleX, scaleY, scaleSize));
    }
    if (Array.isArray(scene.stampedImages)) {
        scene.stampedImages.forEach((image) => scaleImageGeometry(image, scaleX, scaleY));
    }
    if (Array.isArray(scene.textObjects)) {
        scene.textObjects.forEach((textObj) => scaleTextGeometry(textObj, scaleX, scaleY, scaleSize));
    }
}

function scaleRuntimeScene(scaleX, scaleY, scaleSize) {
    const drawingEngine = this.drawingEngine;
    if (Array.isArray(drawingEngine?.strokes)) {
        drawingEngine.strokes.forEach((stroke) => scaleStrokeGeometry(stroke, scaleX, scaleY, scaleSize));
    }
    if (Array.isArray(drawingEngine?.stampedImages)) {
        drawingEngine.stampedImages.forEach((image) => scaleImageGeometry(image, scaleX, scaleY));
    }
    const textObjects = this.insertTextManager?.textObjects;
    if (Array.isArray(textObjects)) {
        textObjects.forEach((textObj) => scaleTextGeometry(textObj, scaleX, scaleY, scaleSize));
    }
}

function scaleStoredPageScenes(scaleX, scaleY, scaleSize) {
    if (!this.pageScenes || typeof this.pageScenes !== 'object') {
        return;
    }

    Object.values(this.pageScenes).forEach((scene) => {
        scaleSceneGeometry(scene, scaleX, scaleY, scaleSize);
    });
}

function scaleBackgroundStateGeometry(backgroundState, scaleX, scaleY) {
    if (!backgroundState || typeof backgroundState !== 'object') {
        return;
    }

    scaleNumericProperty(backgroundState, 'coordinateOriginX', scaleX);
    scaleNumericProperty(backgroundState, 'coordinateOriginY', scaleY);
    scaleImageGeometry(backgroundState.imageTransform, scaleX, scaleY);
}

function scaleStoredPageBackgrounds(scaleX, scaleY) {
    if (!this.pageBackgrounds || typeof this.pageBackgrounds !== 'object') {
        return;
    }

    Object.values(this.pageBackgrounds).forEach((backgroundState) => {
        scaleBackgroundStateGeometry(backgroundState, scaleX, scaleY);
    });
}

function scaleCurrentBackground(scaleX, scaleY) {
    const backgroundManager = this.backgroundManager;
    if (!backgroundManager || typeof backgroundManager !== 'object') {
        return;
    }

    scaleNumericProperty(backgroundManager, 'coordinateOriginX', scaleX);
    scaleNumericProperty(backgroundManager, 'coordinateOriginY', scaleY);
    if (typeof backgroundManager.queueBackgroundStorageWrite === 'function') {
        backgroundManager.queueBackgroundStorageWrite('coordinateOriginX', backgroundManager.coordinateOriginX);
        backgroundManager.queueBackgroundStorageWrite('coordinateOriginY', backgroundManager.coordinateOriginY);
    }

    if (backgroundManager.imageTransform && typeof backgroundManager.imageTransform === 'object') {
        scaleImageGeometry(backgroundManager.imageTransform, scaleX, scaleY);
        if (typeof backgroundManager.queueBackgroundStorageWrite === 'function') {
            backgroundManager.queueBackgroundStorageWrite('imageTransform', JSON.stringify(backgroundManager.imageTransform));
        }
    }
}

function applyCanvasSize() {
    const width = this.settingsManager.canvasWidth;
    const height = this.settingsManager.canvasHeight;
    const dpr = this.getRenderPixelRatio();

    const oldWidth = this.canvas.width;
    const oldHeight = this.canvas.height;
    const oldLogicalWidth = parseFloat(this.canvas.style.width) || (oldWidth / dpr);
    const oldLogicalHeight = parseFloat(this.canvas.style.height) || (oldHeight / dpr);
    const scaleX = oldLogicalWidth > 0 ? width / oldLogicalWidth : 1;
    const scaleY = oldLogicalHeight > 0 ? height / oldLogicalHeight : 1;
    const scaleSize = Math.sqrt(Math.max(scaleX, 0) * Math.max(scaleY, 0)) || 1;
    const shouldScaleScene = Math.abs(scaleX - 1) > 0.0001 || Math.abs(scaleY - 1) > 0.0001;
    const imageData = this.historyManager.historyStep >= 0
        ? this.ctx.getImageData(0, 0, oldWidth, oldHeight)
        : null;

    if (shouldScaleScene) {
        this.saveCurrentPageScene?.(this.currentPage);
        this.savePageBackground?.(this.currentPage);
        scaleStoredPageScenes.call(this, scaleX, scaleY, scaleSize);
        scaleRuntimeScene.call(this, scaleX, scaleY, scaleSize);
        scaleStoredPageBackgrounds.call(this, scaleX, scaleY);
        scaleCurrentBackground.call(this, scaleX, scaleY);
        this.selectionManager?.clearSelection?.({ skipRedraw: true });
    }

    this.canvas.width = width * dpr;
    this.canvas.height = height * dpr;
    this.canvas.style.width = `${width}px`;
    this.canvas.style.height = `${height}px`;

    this.bgCanvas.width = width * dpr;
    this.bgCanvas.height = height * dpr;
    this.bgCanvas.style.width = `${width}px`;
    this.bgCanvas.style.height = `${height}px`;

    this.canvasFitScale = this.calculateCanvasFitScale();
    const finalScale = this.canvasFitScale * this.drawingEngine.canvasScale;

    if (this.transformLayer) {
        this.transformLayer.style.position = 'absolute';
        this.transformLayer.style.left = '50%';
        this.transformLayer.style.top = '50%';
        this.transformLayer.style.width = `${width}px`;
        this.transformLayer.style.height = `${height}px`;
        this.transformLayer.style.transform = `translate(-50%, -50%) scale(${finalScale})`;

        this.canvas.style.position = 'absolute';
        this.canvas.style.left = '0';
        this.canvas.style.top = '0';
        this.canvas.style.transform = 'none';

        this.bgCanvas.style.position = 'absolute';
        this.bgCanvas.style.left = '0';
        this.bgCanvas.style.top = '0';
        this.bgCanvas.style.transform = 'none';
    }

    this.ctx.scale(dpr, dpr);
    this.bgCtx.scale(dpr, dpr);

    if (imageData) {
        const tmp = document.createElement('canvas');
        tmp.width = oldWidth;
        tmp.height = oldHeight;
        tmp.getContext('2d').putImageData(imageData, 0, 0);
        this.ctx.save();
        this.ctx.setTransform(1, 0, 0, 1, 0, 0);
        this.ctx.drawImage(tmp, 0, 0, oldWidth, oldHeight, 0, 0, this.canvas.width, this.canvas.height);
        this.ctx.restore();
    }

    if (this.currentPage > 0 && this.currentPage <= this.pages.length) {
        this.pages[this.currentPage - 1] = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
    }
    if (shouldScaleScene) {
        this.saveCurrentPageScene?.(this.currentPage);
        this.savePageBackground?.(this.currentPage);
        this.historyManager?.reset?.();
        this.historyManager?.saveState?.();
        this.saveSessionDebounced?.();
    }

    this.backgroundManager.drawBackground();
}

window.AboardRenderQualityRuntime = {
    calculateCanvasFitScale(board) {
        return calculateCanvasFitScale.call(board);
    },
    getRenderPixelRatio(board) {
        return getRenderPixelRatio.call(board);
    },
    getTargetRenderScale(board) {
        return getTargetRenderScale.call(board);
    },
    scheduleRenderQualityUpdate(board) {
        return scheduleRenderQualityUpdate.call(board);
    },
    applyRenderQualityScale(board, scale) {
        return applyRenderQualityScale.call(board, scale);
    },
    applyCanvasSize(board) {
        return applyCanvasSize.call(board);
    }
};
