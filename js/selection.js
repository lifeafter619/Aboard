// Selection Module
// Handles selection of drawn strokes

class SelectionManager {
    constructor(canvas, ctx, drawingEngine, strokeControls) {
        this.canvas = canvas;
        this.ctx = ctx;
        this.drawingEngine = drawingEngine;
        this.strokeControls = strokeControls;
        
        this.isSelecting = false;
        this.selectionStart = null;
        this.selectionEnd = null;
        this.selectedStrokes = [];
        
        // For lasso/rectangle selection (future enhancement)
        this.selectionMode = 'click'; // 'click' or 'rectangle'
        
        // Don't register event listeners here - they should be called from main.js
        // based on the active tool to avoid conflicts
    }

    isEventOnCanvas(e) {
        const rect = this.canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        return x >= 0 && y >= 0 && x <= rect.width && y <= rect.height;
    }

    startSelection(e) {
        this.isSelecting = true;
        const rect = this.canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        
        // Adjust coordinates for canvas scale
        const scaleX = this.canvas.offsetWidth / rect.width;
        const scaleY = this.canvas.offsetHeight / rect.height;
        let adjustedX = x * scaleX;
        let adjustedY = y * scaleY;
        
        // Transform to canvas coordinate space (account for pan and zoom)
        adjustedX = (adjustedX - this.drawingEngine.panOffset.x) / this.drawingEngine.canvasScale;
        adjustedY = (adjustedY - this.drawingEngine.panOffset.y) / this.drawingEngine.canvasScale;
        
        // Check if clicked on a stroke
        const strokeIndex = this.drawingEngine.findStrokeAtPoint(adjustedX, adjustedY);
        if (strokeIndex !== null) {
            this.drawingEngine.selectStroke(strokeIndex);
            // Show stroke controls for resizing and moving
            if (this.strokeControls) {
                this.strokeControls.showControls(strokeIndex);
            }
            // Redraw to show selection
            this.redrawWithSelection();
            return true;
        }
        
        // If not on stroke, deselect everything
        this.drawingEngine.deselectStroke();
        // Hide stroke controls
        if (this.strokeControls) {
            this.strokeControls.hideControls();
        }
        
        return false;
    }
    
    continueSelection(e) {
        if (!this.isSelecting) return;
        
        const rect = this.canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        
        this.selectionEnd = { x, y };
        
        // Draw selection rectangle
        this.drawSelectionRect();
    }
    
    endSelection() {
        this.isSelecting = false;
        this.selectionStart = null;
        this.selectionEnd = null;
    }
    
    drawSelectionRect() {
        if (!this.selectionStart || !this.selectionEnd) return;
        
        this.ctx.save();
        this.ctx.strokeStyle = '#0066FF';
        this.ctx.lineWidth = 2;
        this.ctx.setLineDash([5, 5]);
        
        const width = this.selectionEnd.x - this.selectionStart.x;
        const height = this.selectionEnd.y - this.selectionStart.y;
        
        this.ctx.strokeRect(this.selectionStart.x, this.selectionStart.y, width, height);
        
        this.ctx.restore();
    }
    
    hasSelection() {
        return this.drawingEngine.selectedStrokeIndex !== null;
    }
    
    copySelection() {
        if (this.drawingEngine.selectedStrokeIndex !== null) {
            const result = this.drawingEngine.copySelectedStroke();
            if (result) {
                this.redrawWithSelection();
            }
            return result;
        }
        return false;
    }
    
    deleteSelection() {
        if (this.drawingEngine.selectedStrokeIndex !== null) {
            const result = this.drawingEngine.deleteSelectedStroke();
            if (result) {
                // Need to redraw the entire canvas without the deleted stroke
                this.redrawCanvas();
            }
            return result;
        }
        return false;
    }
    
    clearSelection() {
        this.drawingEngine.deselectStroke();
        this.selectedStrokes = [];
    }
    
    redrawWithSelection() {
        // Redraw the canvas to show the selection border
        this.redrawCanvas();
    }
    
    redrawCanvas() {
        // Get the current canvas content from history
        // Then redraw all strokes and selection
        // This is called to refresh the canvas after stroke operations
        
        // Clear canvas
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Redraw all strokes
        for (const stroke of this.drawingEngine.strokes) {
            this.drawingEngine.redrawStroke(stroke);
        }
        
        // Draw selection border if a stroke is selected
        this.drawingEngine.drawSelectionBorder();
    }
}
