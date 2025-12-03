class ImageAnnotationManager {
    constructor(canvas, ctx, drawingEngine, historyManager) {
        this.canvas = canvas;
        this.ctx = ctx;
        this.drawingEngine = drawingEngine;
        this.historyManager = historyManager;

        // State
        this.isSelecting = false;
        this.selectedImage = null;
        this.images = [];

        // Create hidden file input
        this.fileInput = document.createElement('input');
        this.fileInput.type = 'file';
        this.fileInput.accept = 'image/*';
        this.fileInput.style.display = 'none';
        document.body.appendChild(this.fileInput);

        this.fileInput.addEventListener('change', (e) => this.handleFileSelect(e));

        // Listen for canvas redraws to redraw images
        // We need to hook into the history manager or drawing engine
        // For now, we'll patch the drawing engine's clearCanvas to redraw images
        // Ideally this should be part of the main draw loop or history

        // But wait, if we want "Complete upload image for annotation",
        // the images should probably be part of the drawing history (strokes)
        // or a separate layer.
        // Given the current architecture uses `drawingEngine.strokes` array,
        // we should probably add images as a special type of "stroke" object.
        // That way undo/redo works automatically.
    }

    triggerUpload() {
        this.fileInput.click();
    }

    handleFileSelect(e) {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            const img = new Image();
            img.onload = () => {
                this.addImageToCanvas(img);
            };
            img.src = event.target.result;
        };
        reader.readAsDataURL(file);

        // Reset input
        this.fileInput.value = '';
    }

    addImageToCanvas(img) {
        // Calculate initial position (center of current view)
        const rect = this.canvas.getBoundingClientRect();

        // Get current scale and pan from drawing engine
        const scale = this.drawingEngine.canvasScale;
        const panX = this.drawingEngine.panOffset.x;
        const panY = this.drawingEngine.panOffset.y;

        // Center relative to the *content* coordinate system
        // Visual Center X = (Width/2)
        // We need to reverse the transform: (ScreenX - PanX) / Scale + CenterOffset
        // Simpler: Just put it in the center of the logical canvas (width/2, height/2)
        // The drawing engine seems to use raw coordinates that are then transformed by CSS.

        // Let's look at `drawingEngine.getPosition`. It reverses the scale.
        // So we should store the image at logical coordinates.

        const logicalWidth = this.canvas.width / (window.devicePixelRatio || 1);
        const logicalHeight = this.canvas.height / (window.devicePixelRatio || 1);

        const centerX = logicalWidth / 2;
        const centerY = logicalHeight / 2;

        // Initial size (limit max dimension to say 1/3 of screen)
        const maxDim = Math.min(logicalWidth, logicalHeight) / 3;
        let width = img.width;
        let height = img.height;

        if (width > maxDim || height > maxDim) {
            const ratio = width / height;
            if (width > height) {
                width = maxDim;
                height = maxDim / ratio;
            } else {
                height = maxDim;
                width = maxDim * ratio;
            }
        }

        const imageObj = {
            type: 'image',
            img: img, // The Image object
            src: img.src, // For serialization if needed
            x: centerX - width / 2,
            y: centerY - height / 2,
            width: width,
            height: height,
            rotation: 0,
            tool: 'image' // Identify as image tool
        };

        // Add to drawing engine strokes
        // We need to modify DrawingEngine to handle 'image' type strokes during redraw
        this.drawingEngine.strokes.push(imageObj);

        // Select the new image immediately
        this.drawingEngine.selectedStrokeIndex = this.drawingEngine.strokes.length - 1;

        // Redraw
        this.drawingEngine.clearCanvas(); // This triggers redraw of all strokes including the new image

        // Save history
        this.historyManager.saveState();

        // Switch to 'pen' or 'select' tool to allow manipulation?
        // Currently stroke controls handle selection. We need to ensure stroke controls work for images.
    }
}

// Modify DrawingEngine to handle image drawing
// We will monkey-patch or update DrawingEngine.redrawStroke in a separate step or file update.
// For modularity, this class handles the upload logic.

if (typeof window !== 'undefined') {
    window.ImageAnnotationManager = ImageAnnotationManager;
}
