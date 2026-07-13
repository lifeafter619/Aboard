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
        this.singleBitmapMemoryLimitBytes = 32 * 1024 * 1024; // keep huge frames scene-only
        this.onStateChanged = null;
        this.captureSceneState = null;
        this.restoreSceneState = null;
        this.lastRestoreHadSceneState = false;
    }

    setSceneStateHandlers({ capture, restore } = {}) {
        this.captureSceneState = typeof capture === 'function' ? capture : null;
        this.restoreSceneState = typeof restore === 'function' ? restore : null;
    }

    getEntryImageData(entry) {
        if (entry?.imageData) {
            return entry.imageData;
        }
        return entry;
    }

    getEntryByteLength(entry) {
        return this.getEntryImageData(entry)?.data?.byteLength || 0;
    }

    isImageDataCompatible(imageData) {
        return !!(
            imageData &&
            typeof imageData.width === 'number' &&
            typeof imageData.height === 'number' &&
            imageData.width === this.canvas.width &&
            imageData.height === this.canvas.height
        );
    }

    tryRestoreScaledImageData(imageData) {
        if (!imageData || typeof document === 'undefined' || typeof document.createElement !== 'function') {
            return false;
        }

        try {
            const source = document.createElement('canvas');
            source.width = imageData.width;
            source.height = imageData.height;
            const sourceCtx = source.getContext?.('2d');
            if (!sourceCtx?.putImageData) {
                return false;
            }
            sourceCtx.putImageData(imageData, 0, 0);

            this.ctx.save?.();
            this.ctx.setTransform?.(1, 0, 0, 1, 0, 0);
            this.ctx.clearRect?.(0, 0, this.canvas.width, this.canvas.height);
            this.ctx.drawImage?.(source, 0, 0, imageData.width, imageData.height, 0, 0, this.canvas.width, this.canvas.height);
            this.ctx.restore?.();
            return true;
        } catch (error) {
            this.ctx.restore?.();
            console.warn('Failed to scale history bitmap for the current canvas size:', error);
            return false;
        }
    }

    createHistoryEntry(imageData) {
        let sceneState = null;
        let hasSceneState = false;

        if (typeof this.captureSceneState === 'function') {
            try {
                sceneState = this.captureSceneState();
                hasSceneState = true;
            } catch (error) {
                console.warn('Failed to capture scene history state:', error);
            }
        }

        const byteLength = imageData?.data?.byteLength || 0;
        const requiresHistoryBitmap = sceneState?.requiresHistoryBitmap === true;
        if (hasSceneState && !requiresHistoryBitmap && byteLength > this.singleBitmapMemoryLimitBytes) {
            imageData = null;
        }

        return {
            imageData,
            sceneState,
            hasSceneState
        };
    }

    reset() {
        this.history = [];
        this.historyStep = -1;
        if (typeof this.onStateChanged === 'function') {
            this.onStateChanged();
        }
    }

    saveState() {
        // Remove any states after current step
        this.history = this.history.slice(0, this.historyStep + 1);

        // Save current canvas state
        const imageData = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
        this.history.push(this.createHistoryEntry(imageData));
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
            totalBytes += this.getEntryByteLength(this.history[i]);
        }
        while (totalBytes > this.memoryLimitBytes && this.history.length > 1) {
            totalBytes -= this.getEntryByteLength(this.history[0]);
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
        this.lastRestoreHadSceneState = false;
        if (this.historyStep >= 0 && this.historyStep < this.history.length) {
            const entry = this.history[this.historyStep];
            const imageData = this.getEntryImageData(entry);
            if (this.isImageDataCompatible(imageData)) {
                this.ctx.putImageData(imageData, 0, 0);
            } else if (imageData?.data) {
                this.tryRestoreScaledImageData(imageData);
            }
            if (entry?.hasSceneState && typeof this.restoreSceneState === 'function') {
                this.restoreSceneState(entry.sceneState);
                this.lastRestoreHadSceneState = true;
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

window.HistoryManager = HistoryManager;
window.AboardHistoryManager = HistoryManager;
