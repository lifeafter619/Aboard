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
    if (Math.abs(targetScale - this.dynamicRenderScale) < RQ_RENDER_SCALE_SCHEDULE_THRESHOLD) return;
    if (this.qualityUpdateTimer) {
        clearTimeout(this.qualityUpdateTimer);
    }
    this.qualityUpdateTimer = setTimeout(() => {
        this.applyRenderQualityScale(targetScale);
    }, RQ_QUALITY_UPDATE_DEBOUNCE_MS);
}

function applyRenderQualityScale(scale) {
    if (Math.abs(scale - this.dynamicRenderScale) < RQ_RENDER_SCALE_APPLY_THRESHOLD) return;

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

function applyCanvasSize() {
    const width = this.settingsManager.canvasWidth;
    const height = this.settingsManager.canvasHeight;
    const dpr = this.getRenderPixelRatio();

    const oldWidth = this.canvas.width;
    const oldHeight = this.canvas.height;
    const imageData = this.historyManager.historyStep >= 0
        ? this.ctx.getImageData(0, 0, oldWidth, oldHeight)
        : null;

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
        this.ctx.putImageData(imageData, 0, 0);
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
