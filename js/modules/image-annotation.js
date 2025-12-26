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
        // Get logical canvas dimensions
        const logicalWidth = this.canvas.width / (window.devicePixelRatio || 1);
        const logicalHeight = this.canvas.height / (window.devicePixelRatio || 1);

        // We want to place the image at the center of the viewport, not necessarily center of canvas
        // But since we have pan/zoom, we need to convert Viewport Center -> Canvas Coords

        // Get center of viewport relative to canvas element
        const rect = this.canvas.getBoundingClientRect();
        const centerX = rect.width / 2;
        const centerY = rect.height / 2;

        // Convert to canvas coordinates (accounting for zoom and pan)
        // CanvasCoord = (ScreenCoord - Pan) / Scale
        const scale = this.drawingEngine.canvasScale;
        const panX = this.drawingEngine.panOffset.x;
        const panY = this.drawingEngine.panOffset.y;

        // Note: The drawing engine applies pan/scale via CSS transform or context transform.
        // If it's CSS transform (which it seems to be in main.js applyZoom), then getPosition in drawing.js handles it?
        // drawingEngine.getPosition converts screen to canvas coords.
        // Let's use drawingEngine.getPosition with a mock event object for center of screen

        // Mock event at center of screen
        const mockEvent = {
            clientX: rect.left + centerX,
            clientY: rect.top + centerY
        };

        const canvasPos = this.drawingEngine.getPosition(mockEvent);
        // getPosition already handles CSS scale.
        // But wait, drawing.js getPosition only handles CSS scale. It does NOT handle PanOffset if PanOffset is applied via CSS translate?
        // In main.js, applyZoom applies `translate(panX, panY)`.
        // drawing.js getPosition uses `scaleX = canvas.offsetWidth / rect.width`. This handles zoom scale.
        // But it does NOT handle translation.

        // If we want the image to appear at the center of the VIEWPORT, we need:
        // x = (ViewportCenter - PanX) / Scale? No.

        // Let's stick to simple logic: Place at center of the canvas buffer for now,
        // OR better: use the logic consistent with drawing.

        // If I draw at (0,0), it appears at top-left of canvas.
        // If I use drawingEngine.getPosition, it returns coordinates relative to the canvas element (0,0 is top-left of element).
        // Since `applyZoom` transforms the canvas element itself, coordinate (0,0) inside the canvas
        // is always the top-left of the canvas BUFFER.

        // So `getPosition` returns coordinates in Canvas Buffer space?
        // drawing.js:
        // x = (e.clientX - rect.left) * scaleX;
        // scaleX = canvas.offsetWidth / rect.width;
        // If canvas is zoomed out (rect.width < offsetWidth), scaleX > 1.
        // This correctly maps screen pixel to canvas buffer pixel.

        // However, `panOffset` shifts the visual representation.
        // If I pan right, the canvas moves right.
        // `rect` (getBoundingClientRect) moves with it.
        // So `e.clientX - rect.left` is relative to the visual top-left of the canvas.
        // So `getPosition` returns correct Canvas Buffer coordinates regardless of Pan.

        // So simply using getPosition on center of screen is correct!

        const targetX = canvasPos.x;
        const targetY = canvasPos.y;

        // Initial size (limit max dimension to say 1/3 of logical canvas)
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
            x: targetX - width / 2,
            y: targetY - height / 2,
            width: width,
            height: height,
            rotation: 0,
            tool: 'image', // Identify as image tool
            color: '#000000', // Default props to avoid errors
            size: 1,
            points: [] // Empty points
        };

        // Add to drawing engine strokes
        this.drawingEngine.strokes.push(imageObj);

        // Select the new image immediately
        this.drawingEngine.selectedStrokeIndex = this.drawingEngine.strokes.length - 1;

        // Draw the image onto the canvas
        // We use redrawStroke to draw just this new object on top
        this.drawingEngine.redrawStroke(imageObj);

        // Save history state (bakes pixels)
        this.historyManager.saveState();

        // Dispatch event to notify that an image was added and selected
        // This allows main.js to trigger StrokeControls
        const event = new CustomEvent('strokeAdded', {
            detail: { index: this.drawingEngine.strokes.length - 1 }
        });
        window.dispatchEvent(event);
    }
}

// Export for use
if (typeof window !== 'undefined') {
    window.ImageAnnotationManager = ImageAnnotationManager;
}
