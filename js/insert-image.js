// Insert Image Module
// Handles inserting images onto the canvas as stamped pixels

class InsertImageManager {
    constructor(canvas, ctx, historyManager, drawingEngine) {
        this.canvas = canvas;
        this.ctx = ctx;
        this.historyManager = historyManager;
        this.drawingEngine = drawingEngine;

        // State
        this.isActive = false;
        this.currentImage = null;
        this.imagePosition = { x: 0, y: 0 };
        this.imageSize = { width: 0, height: 0 };
        this.imageRotation = 0;
        this.imageScale = 1.0;
        this.flipHorizontal = false;
        this.flipVertical = false;

        // Constants
        this.MIN_IMAGE_SIZE = 20;

        // Interaction State
        this.isDragging = false;
        this.isResizing = false;
        this.isRotating = false;

        this.dragStartPos = { x: 0, y: 0 };
        this.dragStartImagePos = { x: 0, y: 0 };

        this.resizeHandle = null;
        this.resizeStartSize = { width: 0, height: 0 };
        this.resizeStartPos = { x: 0, y: 0 };
        this.resizeStartImagePos = { x: 0, y: 0 };

        this.rotateStartAngle = 0;
        this.rotateStartRotation = 0;

        this.createControls();
        this.setupEventListeners();
    }

    createControls() {
        // Create hidden file input
        this.fileInput = document.createElement('input');
        this.fileInput.type = 'file';
        this.fileInput.accept = 'image/*';
        this.fileInput.style.display = 'none';
        document.body.appendChild(this.fileInput);

        // Create control overlay
        const controlsHTML = `
            <div id="insert-image-overlay" class="image-controls-overlay" style="display: none; z-index: 1600;">
                <div id="insert-image-box" class="image-controls-box">
                    <!-- Corner resize handles -->
                    <div class="resize-handle top-left" data-handle="top-left"></div>
                    <div class="resize-handle top-right" data-handle="top-right"></div>
                    <div class="resize-handle bottom-left" data-handle="bottom-left"></div>
                    <div class="resize-handle bottom-right" data-handle="bottom-right"></div>

                    <!-- Edge resize handles -->
                    <div class="resize-handle top" data-handle="top"></div>
                    <div class="resize-handle right" data-handle="right"></div>
                    <div class="resize-handle bottom" data-handle="bottom"></div>
                    <div class="resize-handle left" data-handle="left"></div>

                    <!-- Rotation handle -->
                    <div class="rotate-handle" id="insert-image-rotate-handle">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2">
                            <path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.2"/>
                        </svg>
                    </div>

                    <!-- Flip horizontal handle -->
                    <div class="flip-handle flip-horizontal" id="insert-image-flip-horizontal" data-i18n-title="imageControls.flipHorizontal">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2">
                            <path d="M12 3v18M8 6l-5 6 5 6M16 6l5 6-5 6"/>
                        </svg>
                    </div>

                    <!-- Flip vertical handle -->
                    <div class="flip-handle flip-vertical" id="insert-image-flip-vertical" data-i18n-title="imageControls.flipVertical">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2">
                            <path d="M3 12h18M6 8l6-5 6 5M6 16l6 5 6-5"/>
                        </svg>
                    </div>

                    <!-- Control toolbar -->
                    <div class="image-controls-toolbar">
                        <button id="insert-image-cancel-btn" class="image-control-btn image-cancel-btn" title="Cancel">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                                <line x1="18" y1="6" x2="6" y2="18"></line>
                                <line x1="6" y1="6" x2="18" y2="18"></line>
                            </svg>
                        </button>
                        <button id="insert-image-confirm-btn" class="image-control-btn image-done-btn" title="Confirm">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                                <polyline points="20 6 9 17 4 12"></polyline>
                            </svg>
                        </button>
                    </div>
                </div>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', controlsHTML);

        this.overlay = document.getElementById('insert-image-overlay');
        this.controlBox = document.getElementById('insert-image-box');
    }

    setupEventListeners() {
        // File input change
        this.fileInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                this.loadImage(file);
            }
            // Reset input so same file can be selected again
            this.fileInput.value = '';
        });

        // Mouse/Touch events on the control box for dragging
        const handleDragStart = (e) => {
            // Stop propagation to prevent drawing on canvas
            e.stopPropagation();

            if (e.target === this.controlBox || e.target.closest('.image-controls-box') === this.controlBox) {
                if (!e.target.classList.contains('resize-handle') &&
                    !e.target.classList.contains('rotate-handle') &&
                    !e.target.classList.contains('flip-handle') &&
                    !e.target.closest('.resize-handle') &&
                    !e.target.closest('.rotate-handle') &&
                    !e.target.closest('.flip-handle') &&
                    !e.target.closest('.image-controls-toolbar')) {
                    this.startDrag(e);
                }
            }
        };

        this.controlBox.addEventListener('mousedown', handleDragStart);
        this.controlBox.addEventListener('touchstart', handleDragStart, { passive: false });

        // Resize handles
        this.controlBox.querySelectorAll('.resize-handle').forEach(handle => {
            const startResize = (e) => {
                e.stopPropagation();
                if (e.type === 'touchstart') e.preventDefault();
                this.startResize(e, handle.dataset.handle);
            };
            handle.addEventListener('mousedown', startResize);
            handle.addEventListener('touchstart', startResize, { passive: false });
        });

        // Rotation handle
        const rotateHandle = document.getElementById('insert-image-rotate-handle');
        const startRotate = (e) => {
            e.stopPropagation();
            if (e.type === 'touchstart') e.preventDefault();
            this.startRotate(e);
        };
        rotateHandle.addEventListener('mousedown', startRotate);
        rotateHandle.addEventListener('touchstart', startRotate, { passive: false });

        // Flip horizontal handle
        const flipHorizontalHandle = document.getElementById('insert-image-flip-horizontal');
        flipHorizontalHandle.addEventListener('click', (e) => {
            e.stopPropagation();
            this.toggleFlipHorizontal();
        });

        // Flip vertical handle
        const flipVerticalHandle = document.getElementById('insert-image-flip-vertical');
        flipVerticalHandle.addEventListener('click', (e) => {
            e.stopPropagation();
            this.toggleFlipVertical();
        });

        // Global move/up events
        const handleMove = (e) => {
            if (this.isDragging) this.drag(e);
            else if (this.isResizing) this.resize(e);
            else if (this.isRotating) this.rotate(e);
        };

        const handleEnd = () => {
            this.stopDrag();
            this.stopResize();
            this.stopRotate();
        };

        document.addEventListener('mousemove', handleMove);
        document.addEventListener('touchmove', handleMove, { passive: false });
        document.addEventListener('mouseup', handleEnd);
        document.addEventListener('touchend', handleEnd);

        // Buttons
        document.getElementById('insert-image-confirm-btn').addEventListener('click', () => this.confirmImage());
        document.getElementById('insert-image-cancel-btn').addEventListener('click', () => this.cancelImage());
    }

    triggerSelect() {
        this.fileInput.click();
    }

    loadImage(file) {
        const reader = new FileReader();
        reader.onload = (event) => {
            const img = new Image();
            img.onload = () => {
                this.currentImage = img;
                this.showOverlay();
            };
            img.src = event.target.result;
        };
        reader.readAsDataURL(file);
    }

    showOverlay() {
        this.isActive = true;
        this.overlay.style.display = 'block';

        // Initial sizing and positioning
        // Image should be smaller than canvas and not exceed half the canvas size
        const canvasLogicalWidth = this.canvas.width / (window.devicePixelRatio || 1);
        const canvasLogicalHeight = this.canvas.height / (window.devicePixelRatio || 1);

        let width = this.currentImage.width;
        let height = this.currentImage.height;
        const aspectRatio = width / height;

        // Limit initial size to no more than half the canvas size
        const maxWidth = canvasLogicalWidth * 0.5;
        const maxHeight = canvasLogicalHeight * 0.5;

        if (width > maxWidth) {
            width = maxWidth;
            height = width / aspectRatio;
        }

        if (height > maxHeight) {
            height = maxHeight;
            width = height * aspectRatio;
        }

        this.imageSize = { width, height };

        // Center on screen (screen coordinates)
        // We track position in *Screen Coordinates* for the overlay,
        // but when stamping we must convert to *Canvas Coordinates*.
        // Actually, to make it stick to the canvas during zoom/pan while editing (if we supported that),
        // we should track in Canvas Coordinates.
        // But `ImageControls` uses Canvas Coordinates and transforms them.
        // Let's use Canvas Coordinates logic to be consistent with how `applyZoom` updates overlays.

        // Get center of canvas in canvas coordinates
        // Canvas center is always (width/2, height/2) in logical units?
        // No, infinite canvas.
        // Let's place it at the center of the current *View*.

        // Viewport center in screen pixels
        const cx = window.innerWidth / 2;
        const cy = window.innerHeight / 2;

        // Convert to canvas coordinates
        const rect = this.canvas.getBoundingClientRect();
        const scaleX = this.canvas.offsetWidth / rect.width; // Should be 1 if handled by transform?
        // Wait, `this.drawingEngine.canvasScale` handles zoom.
        // `this.drawingEngine.panOffset` handles pan.

        // Inverse transform from Screen to Canvas:
        // ScreenX = (CanvasX * Scale + PanX) + RectLeft + (Width/2 - Width/2)?
        // Simplified: The canvas is centered.
        // Let's rely on `transformMouseCoords` logic if we had it.

        // To place at center of viewport:
        // We need to find the canvas point that corresponds to (cx, cy).

        // Let's maintain `imagePosition` as *Logical Canvas Coordinates*.
        // Then `updateControlBox` converts to screen/DOM coordinates.

        const canvasScale = this.drawingEngine.canvasScale * (this.drawingEngine.canvasFitScale || 1);
        const panX = this.drawingEngine.panOffset.x;
        const panY = this.drawingEngine.panOffset.y;

        // Center of canvas element (which is centered in screen)
        const canvasRect = this.canvas.getBoundingClientRect();
        const canvasCenterX = canvasRect.left + canvasRect.width / 2;
        const canvasCenterY = canvasRect.top + canvasRect.height / 2;

        // The difference between Viewport Center and Canvas Center (in screen pixels)
        const diffX = cx - canvasCenterX;
        const diffY = cy - canvasCenterY;

        // Convert difference to logical units
        const logicalDiffX = diffX / canvasScale;
        const logicalDiffY = diffY / canvasScale;

        // We want the image center to be at the viewport center.
        // Image logic position (top-left) relative to canvas center (0,0)?
        // DrawingEngine assumes 0,0 is top-left of the canvas *bitmap*.
        // If we are in Pagination mode, 0,0 is top-left.
        // If we are in Infinite mode, it's arbitrary but 0,0 is origin.

        // Let's just place it at the center of the visible area.
        // Logical Width of canvas
        const logicalWidth = this.canvas.width / window.devicePixelRatio; // Or just settings width
        const logicalHeight = this.canvas.height / window.devicePixelRatio;

        // Center of logical canvas
        const originX = logicalWidth / 2;
        const originY = logicalHeight / 2;

        // Apply offset based on pan (pan moves the canvas, so we need to counter it to stay in view?)
        // If I pan right, canvas moves right. To stay in center of screen, object must be "left" relative to canvas.
        // Actually, let's keep it simple: Place at center of logical canvas initially.
        // User can drag it.

        // Wait, if user is zoomed in on a corner, placing at center might be off-screen.
        // Let's use the inverse transform of the viewport center.

        // Inverse Transform:
        // Screen Point (Px, Py)
        // Canvas Point (Cx, Cy) = (Px - Rect.left, Py - Rect.top) / Scale ... roughly.
        // But we have CSS transform `translate(-50%, -50%) translate(PanX, PanY) scale(Scale)`.
        // This is complex to reverse perfectly without matrix math.

        // Strategy:
        // 1. Set logical position to center of canvas bitmap (width/2, height/2).
        // 2. Update box.
        // If it's off screen, user will zoom out.
        // But usually "Insert" puts it in view.

        // Let's try to calculate the logical point under the screen center.
        // We can use `drawingEngine.getPointFromScreen(cx, cy)` if it existed.

        // Let's assume placement at logical center (width/2, height/2) - halfImageSize.
        this.imagePosition.x = (this.canvas.width / window.devicePixelRatio / 2) - (width / 2);
        this.imagePosition.y = (this.canvas.height / window.devicePixelRatio / 2) - (height / 2);

        // Adjust for Pan to bring it into view?
        // PanX is translation in pixels.
        // If we subtract PanX from position?
        this.imagePosition.x -= panX;
        this.imagePosition.y -= panY;

        this.imageRotation = 0;

        this.updateControlBox();
    }

    updateControlBox() {
        if (!this.isActive) return;

        // Convert Logical Position to Screen Position for the overlay div
        // We need to replicate the CSS transform applied to the canvas.

        const canvasRect = this.canvas.getBoundingClientRect();
        // canvasRect accounts for all CSS transforms (scale, translate).

        // However, the content inside the canvas is scaled by the CSS transform.
        // So a logical unit 1 corresponds to `canvasRect.width / logicalWidth` screen pixels.

        const logicalWidth = this.canvas.width / window.devicePixelRatio;
        const logicalHeight = this.canvas.height / window.devicePixelRatio;

        const scaleX = canvasRect.width / logicalWidth;
        const scaleY = canvasRect.height / logicalHeight;

        // Calculate screen position of the image's top-left corner
        // The canvas rect top-left corresponds to logical (0,0).
        const screenX = canvasRect.left + this.imagePosition.x * scaleX;
        const screenY = canvasRect.top + this.imagePosition.y * scaleY;

        const screenWidth = this.imageSize.width * scaleX;
        const screenHeight = this.imageSize.height * scaleY;

        // Control box only rotates, no flip - flip is applied to the image preview inside
        this.controlBox.style.left = `${screenX}px`;
        this.controlBox.style.top = `${screenY}px`;
        this.controlBox.style.width = `${screenWidth}px`;
        this.controlBox.style.height = `${screenHeight}px`;
        this.controlBox.style.transform = `rotate(${this.imageRotation}deg)`;
        
        // Apply flip to the internal image preview using a separate inner element
        // Create or update an inner preview element for flip
        let previewInner = this.controlBox.querySelector('.image-preview-inner');
        if (!previewInner) {
            previewInner = document.createElement('div');
            previewInner.className = 'image-preview-inner';
            previewInner.style.position = 'absolute';
            previewInner.style.top = '0';
            previewInner.style.left = '0';
            previewInner.style.width = '100%';
            previewInner.style.height = '100%';
            previewInner.style.backgroundSize = '100% 100%';
            previewInner.style.backgroundRepeat = 'no-repeat';
            previewInner.style.pointerEvents = 'none';
            this.controlBox.insertBefore(previewInner, this.controlBox.firstChild);
            // Clear background from control box since we're using inner element
            this.controlBox.style.backgroundImage = 'none';
        }
        
        // Apply flip to the inner preview element
        const flipScaleX = this.flipHorizontal ? -1 : 1;
        const flipScaleY = this.flipVertical ? -1 : 1;
        previewInner.style.backgroundImage = `url(${this.currentImage.src})`;
        previewInner.style.transform = `scale(${flipScaleX}, ${flipScaleY})`;
    }

    toggleFlipHorizontal() {
        this.flipHorizontal = !this.flipHorizontal;
        // Update button visual state
        const btn = document.getElementById('insert-image-flip-horizontal');
        if (btn) {
            btn.classList.toggle('active', this.flipHorizontal);
        }
        this.updateControlBox();
    }

    toggleFlipVertical() {
        this.flipVertical = !this.flipVertical;
        // Update button visual state
        const btn = document.getElementById('insert-image-flip-vertical');
        if (btn) {
            btn.classList.toggle('active', this.flipVertical);
        }
        this.updateControlBox();
    }

    confirmImage() {
        if (!this.currentImage) return;

        this.ctx.save();

        // Move to center of image to rotate
        const centerX = this.imagePosition.x + this.imageSize.width / 2;
        const centerY = this.imagePosition.y + this.imageSize.height / 2;

        this.ctx.translate(centerX, centerY);
        this.ctx.rotate(this.imageRotation * Math.PI / 180);

        // Apply flip
        const flipScaleX = this.flipHorizontal ? -1 : 1;
        const flipScaleY = this.flipVertical ? -1 : 1;
        this.ctx.scale(flipScaleX, flipScaleY);

        // Draw image centered at (0,0)
        this.ctx.drawImage(
            this.currentImage,
            -this.imageSize.width / 2,
            -this.imageSize.height / 2,
            this.imageSize.width,
            this.imageSize.height
        );

        this.ctx.restore();
        
        // Track the stamped image so it can be redrawn during selection operations
        this.drawingEngine.addStampedImage({
            imageElement: this.currentImage,
            x: this.imagePosition.x,
            y: this.imagePosition.y,
            width: this.imageSize.width,
            height: this.imageSize.height,
            rotation: this.imageRotation,
            flipHorizontal: this.flipHorizontal,
            flipVertical: this.flipVertical
        });

        // Save history
        this.historyManager.saveState();

        this.close();
    }

    cancelImage() {
        this.close();
    }

    close() {
        this.isActive = false;
        this.overlay.style.display = 'none';
        this.currentImage = null;
        this.fileInput.value = '';
        // Reset flip states
        this.flipHorizontal = false;
        this.flipVertical = false;
        // Reset flip button visual states
        const flipHBtn = document.getElementById('insert-image-flip-horizontal');
        const flipVBtn = document.getElementById('insert-image-flip-vertical');
        if (flipHBtn) flipHBtn.classList.remove('active');
        if (flipVBtn) flipVBtn.classList.remove('active');
        // Clean up inner preview element
        const previewInner = this.controlBox.querySelector('.image-preview-inner');
        if (previewInner) {
            previewInner.remove();
        }
        this.controlBox.style.backgroundImage = 'none';
    }

    // Interaction Handlers

    getClientPos(e) {
        if (e.touches && e.touches.length > 0) {
            return { x: e.touches[0].clientX, y: e.touches[0].clientY };
        }
        return { x: e.clientX, y: e.clientY };
    }

    getCanvasScale() {
        const rect = this.canvas.getBoundingClientRect();
        const logicalWidth = this.canvas.width / window.devicePixelRatio;
        return rect.width / logicalWidth;
    }

    startDrag(e) {
        this.isDragging = true;
        this.dragStartPos = this.getClientPos(e);
        this.dragStartImagePos = { ...this.imagePosition };
    }

    drag(e) {
        const pos = this.getClientPos(e);
        const scale = this.getCanvasScale();

        const dx = (pos.x - this.dragStartPos.x) / scale;
        const dy = (pos.y - this.dragStartPos.y) / scale;

        this.imagePosition.x = this.dragStartImagePos.x + dx;
        this.imagePosition.y = this.dragStartImagePos.y + dy;

        this.updateControlBox();
    }

    stopDrag() {
        this.isDragging = false;
    }

    startResize(e, handle) {
        this.isResizing = true;
        this.resizeHandle = handle;
        this.resizeStartPos = this.getClientPos(e);
        this.resizeStartSize = { ...this.imageSize };
        this.resizeStartImagePos = { ...this.imagePosition };
    }

    resize(e) {
        const pos = this.getClientPos(e);
        const scale = this.getCanvasScale();

        // Calculate delta in logical units
        const dxScreen = (pos.x - this.resizeStartPos.x) / scale;
        const dyScreen = (pos.y - this.resizeStartPos.y) / scale;

        // Rotate delta by -rotation to align with local unrotated axes
        const rad = -this.imageRotation * Math.PI / 180;
        const dx = dxScreen * Math.cos(rad) - dyScreen * Math.sin(rad);
        const dy = dxScreen * Math.sin(rad) + dyScreen * Math.cos(rad);

        let newWidth = this.resizeStartSize.width;
        let newHeight = this.resizeStartSize.height;

        // Maintain aspect ratio
        const ratio = this.resizeStartSize.width / this.resizeStartSize.height;

        // Logic: All handles now perform a "Resize from Center" operation.
        // This is chosen because CSS 'transform-origin: center' and canvas rotation
        // both operate around the center. Keeping the center fixed while resizing
        // works predictably regardless of rotation.
        //
        // If we drag Right, we increase width by dx * 2 (because it grows left and right from center).
        // If we drag Top, we increase height by -dy * 2.

        // Calculate the dominant change based on handle direction
        let change = 0;

        if (this.resizeHandle.includes('right')) {
            change = dx;
        } else if (this.resizeHandle.includes('left')) {
            change = -dx;
        } else if (this.resizeHandle.includes('bottom')) {
            change = dy;
        } else if (this.resizeHandle.includes('top')) {
            change = -dy;
        } else if (this.resizeHandle === 'top-right') {
            change = (dx - dy) / 2; // Average projection
        } else if (this.resizeHandle === 'bottom-right') {
            change = (dx + dy) / 2;
        } else if (this.resizeHandle === 'bottom-left') {
            change = (-dx + dy) / 2;
        } else if (this.resizeHandle === 'top-left') {
            change = (-dx - dy) / 2;
        }

        // Apply uniform scaling
        // We double the change because we are expanding from center (both sides move)
        // effectively 1 unit of drag = 2 units of size increase
        const scaleFactor = 1 + (change * 2 / this.resizeStartSize.width);

        this.imageSize.width = Math.max(this.MIN_IMAGE_SIZE, this.resizeStartSize.width * scaleFactor);
        this.imageSize.height = Math.max(this.MIN_IMAGE_SIZE, this.resizeStartSize.height * scaleFactor);

        // Recalculate Top-Left position so that the Center point stays fixed.
        // Center_Original = StartPos + StartSize/2
        // NewPos = Center_Original - NewSize/2
        //        = StartPos + StartSize/2 - NewSize/2
        //        = StartPos - (NewSize - StartSize)/2

        const wDiff = this.imageSize.width - this.resizeStartSize.width;
        const hDiff = this.imageSize.height - this.resizeStartSize.height;

        this.imagePosition.x = this.resizeStartImagePos.x - wDiff / 2;
        this.imagePosition.y = this.resizeStartImagePos.y - hDiff / 2;

        this.updateControlBox();
    }

    stopResize() {
        this.isResizing = false;
    }

    // Calculate the screen center of the control box from logical coordinates
    // This avoids using getBoundingClientRect() which returns the axis-aligned
    // bounding box and changes size/position as the element rotates
    getControlBoxCenter() {
        const canvasRect = this.canvas.getBoundingClientRect();
        const logicalWidth = this.canvas.width / window.devicePixelRatio;
        const logicalHeight = this.canvas.height / window.devicePixelRatio;
        const scaleX = canvasRect.width / logicalWidth;
        const scaleY = canvasRect.height / logicalHeight;

        const centerX = canvasRect.left + (this.imagePosition.x + this.imageSize.width / 2) * scaleX;
        const centerY = canvasRect.top + (this.imagePosition.y + this.imageSize.height / 2) * scaleY;
        return { x: centerX, y: centerY };
    }

    startRotate(e) {
        this.isRotating = true;
        const center = this.getControlBoxCenter();

        const pos = this.getClientPos(e);
        this.rotateStartAngle = Math.atan2(pos.y - center.y, pos.x - center.x) * 180 / Math.PI;
        this.rotateStartRotation = this.imageRotation;
    }

    rotate(e) {
        const center = this.getControlBoxCenter();

        const pos = this.getClientPos(e);
        const currentAngle = Math.atan2(pos.y - center.y, pos.x - center.x) * 180 / Math.PI;
        const angleDelta = currentAngle - this.rotateStartAngle;

        this.imageRotation = this.rotateStartRotation + angleDelta;

        this.updateControlBox();
    }

    stopRotate() {
        this.isRotating = false;
    }
}
