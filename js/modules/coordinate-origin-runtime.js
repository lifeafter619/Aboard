// Extracted runtime from main.js
// Preserves legacy board instance semantics by invoking methods with board as this.

function dragCoordinateOrigin(e) {
        if (!this.isDraggingCoordinateOrigin) return;
        
        const viewportScale = this.drawingEngine?.getViewportScale?.() || 1;
        const deltaX = (e.clientX - this.coordinateOriginDragStart.x) / viewportScale;
        const deltaY = (e.clientY - this.coordinateOriginDragStart.y) / viewportScale;
        
        const origin = this.backgroundManager.getCoordinateOrigin();
        this.backgroundManager.setCoordinateOrigin(origin.x + deltaX, origin.y + deltaY);
        
        this.coordinateOriginDragStart = { x: e.clientX, y: e.clientY };
    
}

function stopDraggingCoordinateOrigin() {
        if (this.isDraggingCoordinateOrigin) {
            this.isDraggingCoordinateOrigin = false;
            this.savePageBackground(this.currentPage);
            // Restore cursor based on current tool or mode
            if (this.isCoordinateOriginDragMode) {
                this.canvas.style.cursor = 'move';
            } else if (this.drawingEngine.currentTool === 'pan') {
                this.canvas.style.cursor = 'grab';
            } else {
                this.canvas.style.cursor = 'crosshair';
            }
        }
    
}

window.AboardCoordinateOriginRuntime = {
    dragCoordinateOrigin(board, e) {
        return dragCoordinateOrigin.call(board, e);
    },
    stopDraggingCoordinateOrigin(board) {
        return stopDraggingCoordinateOrigin.call(board);
    }
};
