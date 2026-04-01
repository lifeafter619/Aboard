// Extracted runtime from main.js
// Preserves legacy board instance semantics by invoking methods with board as this.

function setupCanvasZoom() {
        // Ctrl+scroll to zoom canvas towards mouse pointer
        document.addEventListener('wheel', (e) => {
            if (e.ctrlKey || e.metaKey) {
                e.preventDefault();
                
                // Get mouse position relative to viewport
                const mouseX = e.clientX;
                const mouseY = e.clientY;
                
                // Get canvas position and dimensions
                const rect = this.canvas.getBoundingClientRect();
                
                // Calculate mouse position relative to canvas (in screen space)
                const mouseCanvasX = mouseX - rect.left;
                const mouseCanvasY = mouseY - rect.top;
                
                // Get current scale and pan
                const oldScale = this.drawingEngine.canvasScale;
                const oldPanX = this.drawingEngine.panOffset.x;
                const oldPanY = this.drawingEngine.panOffset.y;
                
                // Calculate new scale
                const delta = e.deltaY;
                let newScale;
                if (delta < 0) {
                    newScale = Math.min(oldScale + 0.1, this.MAX_CANVAS_SCALE);
                } else {
                    newScale = Math.max(oldScale - 0.1, this.MIN_CANVAS_SCALE);
                }
                
                // Calculate scale ratio
                const scaleRatio = newScale / oldScale;
                
                // Get canvas center in screen space
                const canvasCenterX = rect.width / 2;
                const canvasCenterY = rect.height / 2;
                
                // Calculate offset from canvas center to mouse (in screen space)
                const offsetX = mouseCanvasX - canvasCenterX;
                const offsetY = mouseCanvasY - canvasCenterY;
                
                // Adjust pan offset so that the point under the mouse stays in place
                // When zooming in (scaleRatio > 1), we need to pan towards the mouse
                // When zooming out (scaleRatio < 1), we need to pan away from the mouse
                // Formula: new_pan = old_pan + offset * (1 - scaleRatio)
                this.drawingEngine.panOffset.x = oldPanX + offsetX * (1 - scaleRatio);
                this.drawingEngine.panOffset.y = oldPanY + offsetY * (1 - scaleRatio);
                
                // Update scale
                this.drawingEngine.canvasScale = newScale;
                this.updateZoomUI();
                this.applyZoom(false); // Don't update config-area scale on zoom
                
                // Save to localStorage
                localStorage.setItem('canvasScale', newScale);
                localStorage.setItem('panOffsetX', this.drawingEngine.panOffset.x);
                localStorage.setItem('panOffsetY', this.drawingEngine.panOffset.y);
            }
        }, { passive: false });
    
}

window.AboardZoomRuntime = {
    setupCanvasZoom(board) {
        return setupCanvasZoom.call(board);
    }
};
