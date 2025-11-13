// Image Controls Module
// Handles image manipulation - position, size, rotation (similar to Word)

class ImageControls {
    constructor(backgroundManager) {
        this.backgroundManager = backgroundManager;
        this.isActive = false;
        this.isDragging = false;
        this.isResizing = false;
        this.isRotating = false;
        this.isConfirmed = localStorage.getItem('backgroundImageConfirmed') === 'true'; // Track if image has been confirmed
        
        // Constants
        this.MIN_IMAGE_SIZE = 50;
        
        // Image state
        this.imagePosition = { x: 0, y: 0 };
        this.imageSize = { width: 0, height: 0 };
        this.imageRotation = 0;
        this.imageScale = 1.0;
        
        // Drag state
        this.dragStartPos = { x: 0, y: 0 };
        this.dragStartImagePos = { x: 0, y: 0 };
        
        // Resize state
        this.resizeHandle = null;
        this.resizeStartSize = { width: 0, height: 0 };
        this.resizeStartPos = { x: 0, y: 0 };
        
        // Rotation state
        this.rotateStartAngle = 0;
        this.rotateStartRotation = 0;
        
        this.createControls();
        this.setupEventListeners();
    }
    
    createControls() {
        // Create control overlay
        const controlsHTML = `
            <div id="image-controls-overlay" class="image-controls-overlay" style="display: none;">
                <div id="image-controls-box" class="image-controls-box">
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
                    <div class="rotate-handle" id="rotate-handle">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2">
                            <path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.2"/>
                        </svg>
                    </div>
                    
                    <!-- Control toolbar with only confirm button -->
                    <div class="image-controls-toolbar">
                        <button id="image-done-btn" class="image-control-btn image-done-btn" title="确定">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                                <polyline points="20 6 9 17 4 12"></polyline>
                            </svg>
                        </button>
                    </div>
                </div>
            </div>
        `;
        
        document.body.insertAdjacentHTML('beforeend', controlsHTML);
        
        this.overlay = document.getElementById('image-controls-overlay');
        this.controlBox = document.getElementById('image-controls-box');
    }
    
    setupEventListeners() {
        // Drag image
        this.controlBox.addEventListener('mousedown', (e) => {
            if (e.target === this.controlBox || e.target.closest('.image-controls-box') === this.controlBox) {
                if (!e.target.classList.contains('resize-handle') && 
                    !e.target.classList.contains('rotate-handle') &&
                    !e.target.closest('.resize-handle') &&
                    !e.target.closest('.rotate-handle') &&
                    !e.target.closest('.image-controls-toolbar')) {
                    this.startDrag(e);
                }
            }
        });
        
        // Resize handles
        this.controlBox.querySelectorAll('.resize-handle').forEach(handle => {
            handle.addEventListener('mousedown', (e) => {
                e.stopPropagation();
                this.startResize(e, handle.dataset.handle);
            });
        });
        
        // Rotation handle
        document.getElementById('rotate-handle').addEventListener('mousedown', (e) => {
            e.stopPropagation();
            this.startRotate(e);
        });
        
        // Global mouse events
        document.addEventListener('mousemove', (e) => {
            if (this.isDragging) {
                this.drag(e);
            } else if (this.isResizing) {
                this.resize(e);
            } else if (this.isRotating) {
                this.rotate(e);
            }
        });
        
        document.addEventListener('mouseup', () => {
            this.stopDrag();
            this.stopResize();
            this.stopRotate();
        });
        
        // Toolbar button - only confirm button
        document.getElementById('image-done-btn').addEventListener('click', () => this.confirmImage());
    }
    
    showControls(imageData) {
        // Don't show controls if image has been confirmed
        if (this.isConfirmed) {
            return;
        }
        
        this.isActive = true;
        this.overlay.style.display = 'block';
        
        // Initialize with image data
        const canvas = this.backgroundManager.bgCanvas;
        const rect = canvas.getBoundingClientRect();
        
        // Store original dimensions
        const originalWidth = imageData.width || rect.width * 0.6;
        const originalHeight = imageData.height || rect.height * 0.6;
        
        // Check if there's an existing transform from backgroundManager
        const existingTransform = this.backgroundManager.imageTransform;
        
        // Use existing transform if available and valid, otherwise center the image initially
        if (existingTransform && existingTransform.width > 0 && existingTransform.height > 0) {
            // Use the existing transform to preserve current state
            this.imageSize.width = existingTransform.width;
            this.imageSize.height = existingTransform.height;
            this.imagePosition.x = existingTransform.x;
            this.imagePosition.y = existingTransform.y;
            this.imageRotation = existingTransform.rotation || 0;
            this.imageScale = existingTransform.scale || 1.0;
        } else {
            // Center the image initially (first time showing controls)
            this.imageSize.width = originalWidth;
            this.imageSize.height = originalHeight;
            this.imagePosition.x = (rect.width - this.imageSize.width) / 2;
            this.imagePosition.y = (rect.height - this.imageSize.height) / 2;
            this.imageRotation = 0;
            this.imageScale = 1.0;
        }
        
        this.originalWidth = originalWidth;
        this.originalHeight = originalHeight;
        
        this.updateControlBox();
    }
    
    hideControls() {
        this.isActive = false;
        this.overlay.style.display = 'none';
    }
    
    confirmImage() {
        // Mark image as confirmed and hide controls
        this.isConfirmed = true;
        this.hideControls();
        // Save the confirmed state to localStorage
        localStorage.setItem('backgroundImageConfirmed', 'true');
        
        // Dispatch event to notify that image has been confirmed
        window.dispatchEvent(new CustomEvent('imageConfirmed'));
    }
    
    resetConfirmation() {
        // Reset confirmation state (used when uploading new image)
        this.isConfirmed = false;
        localStorage.removeItem('backgroundImageConfirmed');
    }
    
    updateControlBox() {
        const canvas = this.backgroundManager.bgCanvas;
        const rect = canvas.getBoundingClientRect();
        
        const canvasScale = this.getCanvasScale();
        
        // Calculate actual position and size accounting for canvas transform
        const actualX = rect.left + (this.imagePosition.x * canvasScale);
        const actualY = rect.top + (this.imagePosition.y * canvasScale);
        const actualWidth = this.imageSize.width * canvasScale;
        const actualHeight = this.imageSize.height * canvasScale;
        
        // Apply transformations to control box to match image exactly
        this.controlBox.style.left = `${actualX}px`;
        this.controlBox.style.top = `${actualY}px`;
        this.controlBox.style.width = `${actualWidth}px`;
        this.controlBox.style.height = `${actualHeight}px`;
        this.controlBox.style.transform = `rotate(${this.imageRotation}deg) scale(${this.imageScale})`;
        
        // Update background image with current transformations
        this.applyImageTransform();
    }
    
    applyImageTransform() {
        // Send transform data to background manager
        this.backgroundManager.updateImageTransform({
            x: this.imagePosition.x,
            y: this.imagePosition.y,
            width: this.imageSize.width,
            height: this.imageSize.height,
            rotation: this.imageRotation,
            scale: this.imageScale
        });
    }
    
    startDrag(e) {
        this.isDragging = true;
        this.dragStartPos = { x: e.clientX, y: e.clientY };
        this.dragStartImagePos = { ...this.imagePosition };
        this.controlBox.style.cursor = 'grabbing';
    }
    
    drag(e) {
        if (!this.isDragging) return;
        
        // Get canvas scale to convert screen delta to canvas delta
        // Screen coordinates (mouse position) need to be divided by scale
        // to get the equivalent movement in canvas logical coordinates
        const canvasScale = this.getCanvasScale();
        
        const deltaX = (e.clientX - this.dragStartPos.x) / canvasScale;
        const deltaY = (e.clientY - this.dragStartPos.y) / canvasScale;
        
        this.imagePosition.x = this.dragStartImagePos.x + deltaX;
        this.imagePosition.y = this.dragStartImagePos.y + deltaY;
        
        this.updateControlBox();
    }
    
    stopDrag() {
        this.isDragging = false;
        this.controlBox.style.cursor = 'move';
    }
    
    startResize(e, handle) {
        this.isResizing = true;
        this.resizeHandle = handle;
        this.resizeStartPos = { x: e.clientX, y: e.clientY };
        this.resizeStartSize = { ...this.imageSize };
        this.dragStartImagePos = { ...this.imagePosition };
    }
    
    resize(e) {
        if (!this.isResizing) return;
        
        // Get canvas scale to convert screen delta to canvas delta
        // Resize handles move in screen coordinates but we need to
        // update image size in canvas logical coordinates
        const canvasScale = this.getCanvasScale();
        
        const deltaX = (e.clientX - this.resizeStartPos.x) / canvasScale;
        const deltaY = (e.clientY - this.resizeStartPos.y) / canvasScale;
        
        const aspectRatio = this.resizeStartSize.width / this.resizeStartSize.height;
        
        switch (this.resizeHandle) {
            case 'top-left':
                this.imageSize.width = Math.max(this.MIN_IMAGE_SIZE, this.resizeStartSize.width - deltaX);
                this.imageSize.height = Math.max(this.MIN_IMAGE_SIZE, this.resizeStartSize.height - deltaY);
                this.imagePosition.x = this.dragStartImagePos.x + deltaX;
                this.imagePosition.y = this.dragStartImagePos.y + deltaY;
                break;
            case 'top-right':
                this.imageSize.width = Math.max(this.MIN_IMAGE_SIZE, this.resizeStartSize.width + deltaX);
                this.imageSize.height = Math.max(this.MIN_IMAGE_SIZE, this.resizeStartSize.height - deltaY);
                this.imagePosition.y = this.dragStartImagePos.y + deltaY;
                break;
            case 'bottom-left':
                this.imageSize.width = Math.max(this.MIN_IMAGE_SIZE, this.resizeStartSize.width - deltaX);
                this.imageSize.height = Math.max(this.MIN_IMAGE_SIZE, this.resizeStartSize.height + deltaY);
                this.imagePosition.x = this.dragStartImagePos.x + deltaX;
                break;
            case 'bottom-right':
                this.imageSize.width = Math.max(this.MIN_IMAGE_SIZE, this.resizeStartSize.width + deltaX);
                this.imageSize.height = Math.max(this.MIN_IMAGE_SIZE, this.resizeStartSize.height + deltaY);
                break;
            case 'top':
                this.imageSize.height = Math.max(this.MIN_IMAGE_SIZE, this.resizeStartSize.height - deltaY);
                this.imagePosition.y = this.dragStartImagePos.y + deltaY;
                break;
            case 'bottom':
                this.imageSize.height = Math.max(this.MIN_IMAGE_SIZE, this.resizeStartSize.height + deltaY);
                break;
            case 'left':
                this.imageSize.width = Math.max(this.MIN_IMAGE_SIZE, this.resizeStartSize.width - deltaX);
                this.imagePosition.x = this.dragStartImagePos.x + deltaX;
                break;
            case 'right':
                this.imageSize.width = Math.max(this.MIN_IMAGE_SIZE, this.resizeStartSize.width + deltaX);
                break;
        }
        
        this.updateControlBox();
    }
    
    stopResize() {
        this.isResizing = false;
        this.resizeHandle = null;
    }
    
    startRotate(e) {
        this.isRotating = true;
        const rect = this.controlBox.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;
        
        this.rotateStartAngle = Math.atan2(e.clientY - centerY, e.clientX - centerX) * 180 / Math.PI;
        this.rotateStartRotation = this.imageRotation;
    }
    
    rotate(e) {
        if (!this.isRotating) return;
        
        const rect = this.controlBox.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;
        
        const currentAngle = Math.atan2(e.clientY - centerY, e.clientX - centerX) * 180 / Math.PI;
        const angleDelta = currentAngle - this.rotateStartAngle;
        
        this.imageRotation = this.rotateStartRotation + angleDelta;
        
        // Normalize to 0-360
        while (this.imageRotation < 0) this.imageRotation += 360;
        while (this.imageRotation >= 360) this.imageRotation -= 360;
        
        this.updateControlBox();
    }
    
    stopRotate() {
        this.isRotating = false;
    }
    
    getCanvasScale() {
        // Helper method to get canvas transform scale
        // Returns the scale factor applied to the canvas via CSS transforms
        // This is used to convert between screen coordinates (pixels on screen)
        // and canvas coordinates (logical canvas units)
        const canvas = this.backgroundManager.bgCanvas;
        const computedStyle = window.getComputedStyle(canvas);
        const matrix = new DOMMatrix(computedStyle.transform);
        // Return X-axis scale factor (assumes uniform scaling)
        return matrix.a || 1;
    }
    
    resetImage() {
        // Reset to original size and angle
        this.imageRotation = 0;
        this.imageScale = 1.0;
        
        // Reset to original dimensions (stored when image was first shown)
        this.imageSize.width = this.originalWidth || this.imageSize.width;
        this.imageSize.height = this.originalHeight || this.imageSize.height;
        
        // Center the image
        const canvas = this.backgroundManager.bgCanvas;
        const rect = canvas.getBoundingClientRect();
        this.imagePosition.x = (rect.width - this.imageSize.width) / 2;
        this.imagePosition.y = (rect.height - this.imageSize.height) / 2;
        
        this.updateControlBox();
    }
    
    fitToCanvas() {
        const canvas = this.backgroundManager.bgCanvas;
        const rect = canvas.getBoundingClientRect();
        
        // Get the actual visible canvas size (accounting for zoom and transforms)
        const computedStyle = window.getComputedStyle(canvas);
        const transform = computedStyle.transform;
        
        // Use bounding rect which accounts for all transforms
        const actualWidth = rect.width;
        const actualHeight = rect.height;
        
        // Get current image aspect ratio
        const imageAspect = this.imageSize.width / this.imageSize.height;
        const canvasAspect = actualWidth / actualHeight;
        
        if (imageAspect > canvasAspect) {
            // Image is wider - fit to width
            this.imageSize.width = actualWidth * 0.9;
            this.imageSize.height = this.imageSize.width / imageAspect;
        } else {
            // Image is taller - fit to height
            this.imageSize.height = actualHeight * 0.9;
            this.imageSize.width = this.imageSize.height * imageAspect;
        }
        
        // Center the image in the visible canvas area
        this.imagePosition.x = (actualWidth - this.imageSize.width) / 2;
        this.imagePosition.y = (actualHeight - this.imageSize.height) / 2;
        this.imageRotation = 0;
        this.imageScale = 1.0;
        
        this.updateControlBox();
    }
    
    getImageTransform() {
        return {
            x: this.imagePosition.x,
            y: this.imagePosition.y,
            width: this.imageSize.width,
            height: this.imageSize.height,
            rotation: this.imageRotation,
            scale: this.imageScale
        };
    }
}
