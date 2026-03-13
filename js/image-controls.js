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
        this.MAX_IMAGE_SIZE_RATIO = 0.5; // Image should not exceed 50% of canvas size
        
        // Image state
        this.imagePosition = { x: 0, y: 0 };
        this.imageSize = { width: 0, height: 0 };
        this.imageRotation = 0;
        this.imageScale = 1.0;
        this.flipHorizontal = false;
        this.flipVertical = false;
        
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
                    
                    <!-- Flip horizontal handle -->
                    <div class="flip-handle flip-horizontal" id="flip-horizontal-handle" data-i18n-title="imageControls.flipHorizontal">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2">
                            <path d="M12 3v18M8 6l-5 6 5 6M16 6l5 6-5 6"/>
                        </svg>
                    </div>
                    
                    <!-- Flip vertical handle -->
                    <div class="flip-handle flip-vertical" id="flip-vertical-handle" data-i18n-title="imageControls.flipVertical">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2">
                            <path d="M3 12h18M6 8l6-5 6 5M6 16l6 5 6-5"/>
                        </svg>
                    </div>
                    
                    <!-- Control toolbar with only confirm button -->
                    <div class="image-controls-toolbar">
                        <button id="image-help-btn" class="image-control-btn image-help-btn" type="button" data-help-key="help.background" data-i18n-title="common.help">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <circle cx="12" cy="12" r="10"></circle>
                                <path d="M9.09 9a3 3 0 1 1 5.82 1c0 2-3 2-3 4"></path>
                                <line x1="12" y1="17" x2="12" y2="17"></line>
                            </svg>
                        </button>
                        <button id="image-done-btn" class="image-control-btn image-done-btn" data-i18n-title="imageControls.confirm">
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
        window.drawingBoard?.helpSystem?.bindDataHelpButtons?.();
        window.drawingBoard?.helpSystem?.refreshHelpButtonLabels?.();
    }
    
    setupEventListeners() {
        // Drag image
        this.controlBox.addEventListener('mousedown', (e) => {
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
        
        // Flip horizontal handle
        document.getElementById('flip-horizontal-handle').addEventListener('click', (e) => {
            e.stopPropagation();
            this.toggleFlipHorizontal();
        });
        
        // Flip vertical handle
        document.getElementById('flip-vertical-handle').addEventListener('click', (e) => {
            e.stopPropagation();
            this.toggleFlipVertical();
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
        const dpr = window.devicePixelRatio || 1;
        
        // Get logical canvas dimensions (same coordinate system as background manager)
        const logicalWidth = canvas.width / dpr;
        const logicalHeight = canvas.height / dpr;
        
        // Store original dimensions - use natural image dimensions
        let originalWidth = imageData.width || logicalWidth * 0.4;
        let originalHeight = imageData.height || logicalHeight * 0.4;
        
        // Limit initial image size to no more than MAX_IMAGE_SIZE_RATIO of canvas size
        const maxWidth = logicalWidth * this.MAX_IMAGE_SIZE_RATIO;
        const maxHeight = logicalHeight * this.MAX_IMAGE_SIZE_RATIO;
        const aspectRatio = originalWidth / originalHeight;
        
        if (originalWidth > maxWidth) {
            originalWidth = maxWidth;
            originalHeight = originalWidth / aspectRatio;
        }
        if (originalHeight > maxHeight) {
            originalHeight = maxHeight;
            originalWidth = originalHeight * aspectRatio;
        }
        
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
            this.flipHorizontal = existingTransform.flipHorizontal || false;
            this.flipVertical = existingTransform.flipVertical || false;
        } else {
            // Center the image initially (first time showing controls)
            // Use logical canvas coordinates (same as background manager)
            this.imageSize.width = originalWidth;
            this.imageSize.height = originalHeight;
            this.imagePosition.x = (logicalWidth - this.imageSize.width) / 2;
            this.imagePosition.y = (logicalHeight - this.imageSize.height) / 2;
            this.imageRotation = 0;
            this.imageScale = 1.0;
            this.flipHorizontal = false;
            this.flipVertical = false;
        }
        
        // Update flip button visual states
        const flipHBtn = document.getElementById('flip-horizontal-handle');
        const flipVBtn = document.getElementById('flip-vertical-handle');
        if (flipHBtn) flipHBtn.classList.toggle('active', this.flipHorizontal);
        if (flipVBtn) flipVBtn.classList.toggle('active', this.flipVertical);
        
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
        const dpr = window.devicePixelRatio || 1;
        
        // Get logical canvas dimensions
        const logicalWidth = canvas.width / dpr;
        const logicalHeight = canvas.height / dpr;
        
        // Calculate scale factor from logical canvas to screen coordinates
        // This accounts for any CSS transforms on the canvas
        const scaleX = rect.width / logicalWidth;
        const scaleY = rect.height / logicalHeight;
        
        // Convert logical canvas coordinates to screen coordinates
        const actualX = rect.left + (this.imagePosition.x * scaleX);
        const actualY = rect.top + (this.imagePosition.y * scaleY);
        const actualWidth = this.imageSize.width * scaleX;
        const actualHeight = this.imageSize.height * scaleY;
        
        // Apply transformations to control box - only rotation, NOT flip
        // The flip is only applied to the image inside, not the control box frame
        this.controlBox.style.left = `${actualX}px`;
        this.controlBox.style.top = `${actualY}px`;
        this.controlBox.style.width = `${actualWidth}px`;
        this.controlBox.style.height = `${actualHeight}px`;
        this.controlBox.style.transform = `rotate(${this.imageRotation}deg)`;
        
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
            scale: this.imageScale,
            flipHorizontal: this.flipHorizontal,
            flipVertical: this.flipVertical
        });
    }
    
    toggleFlipHorizontal() {
        this.flipHorizontal = !this.flipHorizontal;
        // Update button visual state
        const btn = document.getElementById('flip-horizontal-handle');
        if (btn) {
            btn.classList.toggle('active', this.flipHorizontal);
        }
        this.updateControlBox();
    }
    
    toggleFlipVertical() {
        this.flipVertical = !this.flipVertical;
        // Update button visual state
        const btn = document.getElementById('flip-vertical-handle');
        if (btn) {
            btn.classList.toggle('active', this.flipVertical);
        }
        this.updateControlBox();
    }
    
    startDrag(e) {
        this.isDragging = true;
        this.dragStartPos = { x: e.clientX, y: e.clientY };
        this.dragStartImagePos = { ...this.imagePosition };
        this.controlBox.style.cursor = 'grabbing';
    }
    
    drag(e) {
        if (!this.isDragging) return;
        
        // Get scale factor to convert screen delta to logical canvas delta
        const canvas = this.backgroundManager.bgCanvas;
        const rect = canvas.getBoundingClientRect();
        const dpr = window.devicePixelRatio || 1;
        const logicalWidth = canvas.width / dpr;
        const scaleX = rect.width / logicalWidth;
        
        const deltaX = (e.clientX - this.dragStartPos.x) / scaleX;
        const deltaY = (e.clientY - this.dragStartPos.y) / scaleX; // Use same scale for both axes
        
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
        
        // Get scale factor to convert screen delta to logical canvas delta
        const canvas = this.backgroundManager.bgCanvas;
        const rect = canvas.getBoundingClientRect();
        const dpr = window.devicePixelRatio || 1;
        const logicalWidth = canvas.width / dpr;
        const scaleX = rect.width / logicalWidth;
        
        const deltaX = (e.clientX - this.resizeStartPos.x) / scaleX;
        const deltaY = (e.clientY - this.resizeStartPos.y) / scaleX; // Use same scale for both axes
        
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
        
        // Center the image in logical canvas coordinates
        const canvas = this.backgroundManager.bgCanvas;
        const dpr = window.devicePixelRatio || 1;
        const logicalWidth = canvas.width / dpr;
        const logicalHeight = canvas.height / dpr;
        this.imagePosition.x = (logicalWidth - this.imageSize.width) / 2;
        this.imagePosition.y = (logicalHeight - this.imageSize.height) / 2;
        
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
