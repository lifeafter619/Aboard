// Infinite Canvas Manager
// Manages infinite whiteboard mode: rendering, resizing, and coordinate systems

class InfiniteCanvasManager {
    constructor(canvas, ctx, bgCanvas, bgCtx, drawingEngine, backgroundManager, historyManager, settingsManager) {
        this.canvas = canvas;
        this.ctx = ctx;
        this.bgCanvas = bgCanvas;
        this.bgCtx = bgCtx;
        this.drawingEngine = drawingEngine;
        this.backgroundManager = backgroundManager;
        this.historyManager = historyManager;
        this.settingsManager = settingsManager;

        this.isActive = false;
        this.animationFrameId = null;

        this.boundResize = this.resize.bind(this);
        this.boundRenderLoop = this.renderLoop.bind(this);
    }

    activate() {
        if (this.isActive) return;
        this.isActive = true;

        // Reset CSS transforms on container to allow canvas to fill screen
        const transformLayer = document.getElementById('transform-layer');
        if (transformLayer) {
            transformLayer.style.transform = 'none';
            transformLayer.style.width = '100%';
            transformLayer.style.height = '100%';
            transformLayer.style.position = 'static'; // Allow children to fill window
        }

        // Ensure canvases are absolutely positioned to fill window
        this.canvas.style.position = 'absolute';
        this.canvas.style.top = '0';
        this.canvas.style.left = '0';
        this.bgCanvas.style.position = 'absolute';
        this.bgCanvas.style.top = '0';
        this.bgCanvas.style.left = '0';

        // Resize canvases to full window
        this.resize();
        window.addEventListener('resize', this.boundResize);

        // Start render loop
        this.renderLoop();
    }

    deactivate() {
        if (!this.isActive) return;
        this.isActive = false;
        window.removeEventListener('resize', this.boundResize);
        if (this.animationFrameId) {
            cancelAnimationFrame(this.animationFrameId);
            this.animationFrameId = null;
        }

        // Restore context transforms
        this.ctx.setTransform(1, 0, 0, 1, 0, 0);
        this.bgCtx.setTransform(1, 0, 0, 1, 0, 0);
    }

    resize() {
        if (!this.isActive) return;

        const dpr = window.devicePixelRatio || 1;
        const width = window.innerWidth;
        const height = window.innerHeight;

        // Only resize if changed to avoid flicker
        if (this.canvas.width !== width * dpr || this.canvas.height !== height * dpr) {
            this.canvas.width = width * dpr;
            this.canvas.height = height * dpr;
            this.canvas.style.width = `${width}px`;
            this.canvas.style.height = `${height}px`;

            this.bgCanvas.width = width * dpr;
            this.bgCanvas.height = height * dpr;
            this.bgCanvas.style.width = `${width}px`;
            this.bgCanvas.style.height = `${height}px`;
        }

        // Force immediate render
        this.render();
    }

    renderLoop() {
        if (!this.isActive) return;
        this.render();
        this.animationFrameId = requestAnimationFrame(this.boundRenderLoop);
    }

    render() {
        const dpr = window.devicePixelRatio || 1;
        // Use drawingEngine's state but interpret as pure transform
        const scale = this.drawingEngine.canvasScale * dpr;
        // Center the view by default?
        // In Infinite Mode, (0,0) is usually center of screen initially.
        // DrawingEngine.panOffset is usually 0,0.
        // Let's assume panOffset is the offset from center.
        const centerX = this.canvas.width / 2;
        const centerY = this.canvas.height / 2;

        const offsetX = centerX + this.drawingEngine.panOffset.x * dpr;
        const offsetY = centerY + this.drawingEngine.panOffset.y * dpr;

        // 1. Clear Screen
        this.ctx.setTransform(1, 0, 0, 1, 0, 0);
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        this.bgCtx.setTransform(1, 0, 0, 1, 0, 0);
        this.bgCtx.clearRect(0, 0, this.bgCanvas.width, this.bgCanvas.height);

        // 2. Draw Background
        // If BackgroundManager supports infinite rendering, delegate to it.
        // Otherwise fill solid color.
        if (typeof this.backgroundManager.renderInfinite === 'function') {
            this.backgroundManager.renderInfinite(this.bgCtx, scale, offsetX, offsetY, this.canvas.width, this.canvas.height);
        } else {
            this.bgCtx.fillStyle = this.backgroundManager.backgroundColor;
            this.bgCtx.fillRect(0, 0, this.bgCanvas.width, this.bgCanvas.height);
        }

        // 3. Draw Content
        // Apply transform: translate(offsetX, offsetY) scale(scale)
        this.ctx.setTransform(scale, 0, 0, scale, offsetX, offsetY);

        // We need DrawingEngine to redraw all strokes
        if (typeof this.drawingEngine.redrawAll === 'function') {
            this.drawingEngine.redrawAll();
        }
    }

    // Convert Screen Coordinate (pixel) to World Coordinate (canvas space)
    getWorldPosition(screenX, screenY) {
        const dpr = window.devicePixelRatio || 1;
        const scale = this.drawingEngine.canvasScale * dpr;

        const centerX = this.canvas.width / 2;
        const centerY = this.canvas.height / 2;

        const offsetX = centerX + this.drawingEngine.panOffset.x * dpr;
        const offsetY = centerY + this.drawingEngine.panOffset.y * dpr;

        const worldX = (screenX * dpr - offsetX) / scale;
        const worldY = (screenY * dpr - offsetY) / scale;

        return { x: worldX, y: worldY };
    }
}

if (typeof window !== 'undefined') {
    window.InfiniteCanvasManager = InfiniteCanvasManager;
}
