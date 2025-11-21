// Canvas Viewport Management Module
// Handles canvas centering and viewport adjustments

class CanvasViewportManager {
    constructor(drawingEngine, canvas, settingsManager) {
        this.drawingEngine = drawingEngine;
        this.canvas = canvas;
        this.settingsManager = settingsManager;
    }
    
    /**
     * Center the canvas in the viewport
     * This ensures the canvas origin (0,0) is centered in the browser window
     */
    centerCanvas() {
        // Get the viewport dimensions
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;
        
        // Calculate the center point of the viewport
        const centerX = viewportWidth / 2;
        const centerY = viewportHeight / 2;
        
        // Set pan offset to center the origin
        // Pan offset moves the canvas content, so positive offset moves content right/down
        this.drawingEngine.panOffset.x = centerX / this.drawingEngine.canvasScale;
        this.drawingEngine.panOffset.y = centerY / this.drawingEngine.canvasScale;
        
        // Save to localStorage
        localStorage.setItem('panOffsetX', this.drawingEngine.panOffset.x);
        localStorage.setItem('panOffsetY', this.drawingEngine.panOffset.y);
    }
    
    /**
     * Initialize canvas view on first load
     * Sets canvas to 70% scale and centers it if no saved scale exists
     */
    initializeCanvasView() {
        const savedScale = localStorage.getItem('canvasScale');
        if (!savedScale) {
            this.drawingEngine.canvasScale = 0.7;
            localStorage.setItem('canvasScale', 0.7);
        }
        
        // Center the canvas on startup
        this.centerCanvas();
    }
}
