// History Management Module
// Handles undo/redo functionality

class HistoryManager {
    constructor(canvas, ctx) {
        this.canvas = canvas;
        this.ctx = ctx;
        this.history = [];
        this.historyStep = -1;
        this.maxHistory = 50;
        this.memoryLimitBytes = 128 * 1024 * 1024; // 128 MB cap for history
        this.onStateChanged = null;
    }

    saveState() {
        // Remove any states after current step
        this.history = this.history.slice(0, this.historyStep + 1);

        // Save current canvas state
        const imageData = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
        this.history.push(imageData);
        this.historyStep++;

        // Limit history by count
        if (this.history.length > this.maxHistory) {
            this.history.shift();
            this.historyStep--;
        }

        // Limit history by total memory usage
        this.trimToMemoryLimit();

        if (typeof this.onStateChanged === 'function') {
            this.onStateChanged();
        }
    }

    trimToMemoryLimit() {
        let totalBytes = 0;
        for (let i = 0; i < this.history.length; i++) {
            totalBytes += this.history[i].data.byteLength;
        }
        while (totalBytes > this.memoryLimitBytes && this.history.length > 1) {
            totalBytes -= this.history[0].data.byteLength;
            this.history.shift();
            this.historyStep--;
        }
    }
    
    undo() {
        if (this.historyStep > 0) {
            this.historyStep--;
            this.restoreState();
            if (typeof this.onStateChanged === 'function') {
                this.onStateChanged();
            }
            return true;
        }
        return false;
    }
    
    redo() {
        if (this.historyStep < this.history.length - 1) {
            this.historyStep++;
            this.restoreState();
            if (typeof this.onStateChanged === 'function') {
                this.onStateChanged();
            }
            return true;
        }
        return false;
    }
    
    restoreState() {
        if (this.historyStep >= 0 && this.historyStep < this.history.length) {
            const imageData = this.history[this.historyStep];
            this.ctx.putImageData(imageData, 0, 0);
        }
    }
    
    canUndo() {
        return this.historyStep > 0;
    }
    
    canRedo() {
        return this.historyStep < this.history.length - 1;
    }
}

window.HistoryManager = HistoryManager;
window.AboardHistoryManager = HistoryManager;
