// History Management Module
// Handles undo/redo functionality

class HistoryManager {
    constructor(canvas, ctx) {
        this.canvas = canvas;
        this.ctx = ctx;
        this.history = [];
        this.historyStep = -1;
        this.maxHistory = 50;
        this.drawingEngine = null;
        this.settingsManager = null;
    }

    setDependencies(drawingEngine, settingsManager) {
        this.drawingEngine = drawingEngine;
        this.settingsManager = settingsManager;
    }
    
    saveState() {
        // Remove any states after current step
        this.history = this.history.slice(0, this.historyStep + 1);
        
        let state;
        if (this.settingsManager && this.settingsManager.infiniteCanvas) {
            // Vector mode: Save deep copy of strokes
            if (this.drawingEngine) {
                const strokes = JSON.parse(JSON.stringify(this.drawingEngine.strokes));
                state = { type: 'vector', data: strokes };
            } else {
                return; // Cannot save vector state without drawingEngine
            }
        } else {
            // Pixel mode
            const imageData = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
            state = { type: 'pixel', data: imageData };
        }

        this.history.push(state);
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

            if (state && state.type === 'vector') {
                // Vector restore
                if (this.drawingEngine) {
                    this.drawingEngine.strokes = JSON.parse(JSON.stringify(state.data));
                    // If not in infinite rendering loop (e.g. paused), we might need to force render?
                    // But usually infinite mode implies active loop.
                }
            } else if (state && state.type === 'pixel') {
                // Pixel restore
                this.ctx.putImageData(state.data, 0, 0);
            } else if (state) {
                // Legacy or direct ImageData (fallback)
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
