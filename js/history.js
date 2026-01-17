// History Management Module
// Handles undo/redo functionality

class HistoryManager {
    constructor(canvas, ctx) {
        this.canvas = canvas;
        this.ctx = ctx;
        this.history = [];
        this.historyStep = -1;
        this.maxHistory = 50;
        this.settingsManager = null;
        this.drawingEngine = null;
    }

    setDependencies(settingsManager, drawingEngine) {
        this.settingsManager = settingsManager;
        this.drawingEngine = drawingEngine;
    }
    
    saveState() {
        // Remove any states after current step
        this.history = this.history.slice(0, this.historyStep + 1);
        
        if (this.settingsManager && this.settingsManager.isInfiniteMode && this.drawingEngine) {
            // Save vector state for infinite mode
            const state = {
                type: 'vector',
                strokes: JSON.parse(JSON.stringify(this.drawingEngine.strokes)),
                images: JSON.parse(JSON.stringify(this.drawingEngine.images))
            };
            this.history.push(state);
        } else {
            // Save current canvas state (pixel)
            const imageData = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
            this.history.push(imageData);
        }

        this.historyStep++;
        
        // Limit history size
        if (this.history.length > this.maxHistory) {
            this.history.shift();
            this.historyStep--;
        }
    }
    
    undo() {
        if (this.historyStep > 0) {
            this.historyStep--;
            this.restoreState();
            return true;
        }
        return false;
    }
    
    redo() {
        if (this.historyStep < this.history.length - 1) {
            this.historyStep++;
            this.restoreState();
            return true;
        }
        return false;
    }
    
    restoreState() {
        if (this.historyStep >= 0 && this.historyStep < this.history.length) {
            const state = this.history[this.historyStep];

            if (state.type === 'vector' && this.drawingEngine) {
                // Restore vector state
                this.drawingEngine.strokes = JSON.parse(JSON.stringify(state.strokes));
                this.drawingEngine.images = JSON.parse(JSON.stringify(state.images));
                if (this.drawingEngine.backgroundManager) {
                    this.drawingEngine.render(this.drawingEngine.backgroundManager);
                }
            } else if (state instanceof ImageData) {
                // Restore pixel state
                this.ctx.putImageData(state, 0, 0);
            }
        }
    }
    
    canUndo() {
        return this.historyStep > 0;
    }
    
    canRedo() {
        return this.historyStep < this.history.length - 1;
    }
}
