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
        // Undo budget kept for older entries when the newest frame alone already
        // exceeds memoryLimitBytes and the cap is therefore unreachable.
        this.OVERSIZE_TAIL_RESERVE_BYTES = 16 * 1024 * 1024;
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
        if (typeof entry?.byteCost === 'number') {
            return entry.byteCost;
        }
        return this.getEntryImageData(entry)?.data?.byteLength || 0;
    }

    // Rough in-memory cost of a captured scene. Scene states carry stamped
    // image data URLs and stroke point arrays, so once an oversize bitmap is
    // dropped they become the dominant consumer — counting them as zero let
    // history grow without bound behind a cap that thought it was empty.
    // ponytail: shallow estimate by object counts, not a deep byte walk.
    estimateSceneStateByteLength(sceneState) {
        if (!sceneState || typeof sceneState !== 'object') {
            return 0;
        }

        let bytes = 0;
        const strokes = Array.isArray(sceneState.strokes) ? sceneState.strokes : [];
        for (const stroke of strokes) {
            const points = Array.isArray(stroke?.points) ? stroke.points.length : 0;
            bytes += 64 + points * 32;
        }

        const texts = Array.isArray(sceneState.textObjects) ? sceneState.textObjects : [];
        for (const textObj of texts) {
            bytes += 128 + (typeof textObj?.text === 'string' ? textObj.text.length * 2 : 0);
        }

        const images = Array.isArray(sceneState.stampedImages) ? sceneState.stampedImages : [];
        for (const image of images) {
            const source = typeof image?.dataUrl === 'string'
                ? image.dataUrl
                : (typeof image?.src === 'string' ? image.src : '');
            // Data URLs are base64 text held in memory; the decoded bitmap the
            // browser keeps alongside it is larger still, so count both.
            bytes += 256 + source.length * 2 + (source.startsWith('data:') ? source.length : 0);
        }

        const groups = Array.isArray(sceneState.objectGroups) ? sceneState.objectGroups : [];
        bytes += groups.length * 64;

        return bytes;
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
            hasSceneState,
            // Cached once at capture time so the trim loop never rescans scenes.
            byteCost: (imageData?.data?.byteLength || 0)
                + this.estimateSceneStateByteLength(sceneState)
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
        // The newest frame alone can exceed the whole cap: a raster-fallback page
        // whose session base failed to decode must keep its full composite
        // bitmap. The cap is then unreachable no matter how much we evict, and
        // evicting to a single entry — what this loop used to do — destroys the
        // undo stack while saving nothing. In that case fall back to bounding
        // only the *older* entries, so undo survives and memory stays capped.
        const newestBytes = this.history.length
            ? this.getEntryByteLength(this.history[this.history.length - 1])
            : 0;
        const budget = newestBytes > this.memoryLimitBytes
            ? newestBytes + this.OVERSIZE_TAIL_RESERVE_BYTES
            : this.memoryLimitBytes;

        while (totalBytes > budget && this.history.length > 1) {
            totalBytes -= this.getEntryByteLength(this.history[0]);
            this.history.shift();
            if (this.historyStep > 0) {
                this.historyStep--;
            }
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
