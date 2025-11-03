// Selection Module
// Handles selection of drawn strokes, images, and text

class SelectionManager {
    constructor(canvas, ctx, canvasImageManager, textManager) {
        this.canvas = canvas;
        this.ctx = ctx;
        this.canvasImageManager = canvasImageManager;
        this.textManager = textManager; // New text manager for handling text

        this.isSelecting = false;
        this.selectionStart = null;
        this.selectionEnd = null;
        this.selectedStrokes = [];
        this.selectedImage = null;
        this.selectedText = null; // Track selected text

        // For lasso/rectangle selection (future enhancement)
        this.selectionMode = 'click'; // 'click' or 'rectangle'
    }

    startSelection(e) {
        this.isSelecting = true;
        const rect = this.canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        // Check if clicked on an image
        const imageId = this.canvasImageManager.getImageAtPoint(x, y);
        if (imageId) {
            this.canvasImageManager.selectImage(imageId);
            this.selectedImage = imageId;
            this.selectedText = null; // Deselect text
            return true;
        }

        // Check if clicked on text
        const textId = this.textManager.getTextAtPoint(x, y);
        if (textId) {
            this.textManager.selectText(textId);
            this.selectedText = textId;
            this.selectedImage = null; // Deselect image
            return true;
        }

        // If not on image or text, deselect
        this.canvasImageManager.deselectImage();
        this.textManager.deselectText();
        this.selectedImage = null;
        this.selectedText = null;

        // For future: stroke selection
        // this.selectionStart = { x, y };

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
        return this.selectedImage !== null || this.selectedText !== null || this.selectedStrokes.length > 0;
    }

    copySelection() {
        if (this.selectedImage) {
            this.canvasImageManager.copySelectedImage();
            return true;
        }
        if (this.selectedText) {
            this.textManager.copySelectedText();
            return true;
        }
        // Future: copy selected strokes
        return false;
    }

    deleteSelection() {
        if (this.selectedImage) {
            this.canvasImageManager.deleteSelectedImage();
            this.selectedImage = null;
            return true;
        }
        if (this.selectedText) {
            this.textManager.deleteSelectedText();
            this.selectedText = null;
            return true;
        }
        // Future: delete selected strokes
        return false;
    }

    clearSelection() {
        this.canvasImageManager.deselectImage();
        this.textManager.deselectText();
        this.selectedImage = null;
        this.selectedText = null;
        this.selectedStrokes = [];
    }
}
