// Image Controls Module
// Handles image manipulation - position, size, rotation (similar to Word)

class ImageControls {
    constructor(backgroundManager) {
        this.backgroundManager = backgroundManager;
        this.isActive = false;
        this.isDragging = false;
        this.isResizing = false;
        this.isRotating = false;
        
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
                    
                    <!-- Control toolbar -->
                    <div class="image-controls-toolbar">
                        <button id="image-reset-btn" class="image-control-btn" title="重置">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/>
                                <path d="M3 3v5h5"/>
                            </svg>
                        </button>
                        <button id="image-fit-btn" class="image-control-btn" title="适应画布">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                                <line x1="9" y1="9" x2="15" y2="15"></line>
                                <line x1="15" y1="9" x2="9" y2="15"></line>
                            </svg>
                        </button>
                        <button id="image-done-btn" class="image-control-btn image-done-btn" title="完成">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
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
        
        // Toolbar buttons
        document.getElementById('image-reset-btn').addEventListener('click', () => this.resetImage());
        document.getElementById('image-fit-btn').addEventListener('click', () => this.fitToCanvas());
        document.getElementById('image-done-btn').addEventListener('click', () => this.hideControls());
    }
    
    showControls(imageData) {
        this.isActive = true;
        this.overlay.style.display = 'block';
        
        // Initialize with image data
        const canvas = this.backgroundManager.canvas;
        const rect = canvas.getBoundingClientRect();
        
        // Center the image initially
        this.imageSize.width = imageData.width || rect.width * 0.6;
        this.imageSize.height = imageData.height || rect.height * 0.6;
        this.imagePosition.x = (rect.width - this.imageSize.width) / 2;
        this.imagePosition.y = (rect.height - this.imageSize.height) / 2;
        this.imageRotation = 0;
        this.imageScale = 1.0;
        
        this.updateControlBox();
    }
    
    hideControls() {
        this.isActive = false;
        this.overlay.style.display = 'none';
    }
    
    updateControlBox() {
        const canvas = this.backgroundManager.canvas;
        const rect = canvas.getBoundingClientRect();
        
        // Apply transformations to control box
        this.controlBox.style.left = `${rect.left + this.imagePosition.x}px`;
        this.controlBox.style.top = `${rect.top + this.imagePosition.y}px`;
        this.controlBox.style.width = `${this.imageSize.width}px`;
        this.controlBox.style.height = `${this.imageSize.height}px`;
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
        
        const deltaX = e.clientX - this.dragStartPos.x;
        const deltaY = e.clientY - this.dragStartPos.y;
        
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
        
        const deltaX = e.clientX - this.resizeStartPos.x;
        const deltaY = e.clientY - this.resizeStartPos.y;
        
        const aspectRatio = this.resizeStartSize.width / this.resizeStartSize.height;
        
        switch (this.resizeHandle) {
            case 'top-left':
                this.imageSize.width = Math.max(50, this.resizeStartSize.width - deltaX);
                this.imageSize.height = Math.max(50, this.resizeStartSize.height - deltaY);
                this.imagePosition.x = this.dragStartImagePos.x + deltaX;
                this.imagePosition.y = this.dragStartImagePos.y + deltaY;
                break;
            case 'top-right':
                this.imageSize.width = Math.max(50, this.resizeStartSize.width + deltaX);
                this.imageSize.height = Math.max(50, this.resizeStartSize.height - deltaY);
                this.imagePosition.y = this.dragStartImagePos.y + deltaY;
                break;
            case 'bottom-left':
                this.imageSize.width = Math.max(50, this.resizeStartSize.width - deltaX);
                this.imageSize.height = Math.max(50, this.resizeStartSize.height + deltaY);
                this.imagePosition.x = this.dragStartImagePos.x + deltaX;
                break;
            case 'bottom-right':
                this.imageSize.width = Math.max(50, this.resizeStartSize.width + deltaX);
                this.imageSize.height = Math.max(50, this.resizeStartSize.height + deltaY);
                break;
            case 'top':
                this.imageSize.height = Math.max(50, this.resizeStartSize.height - deltaY);
                this.imagePosition.y = this.dragStartImagePos.y + deltaY;
                break;
            case 'bottom':
                this.imageSize.height = Math.max(50, this.resizeStartSize.height + deltaY);
                break;
            case 'left':
                this.imageSize.width = Math.max(50, this.resizeStartSize.width - deltaX);
                this.imagePosition.x = this.dragStartImagePos.x + deltaX;
                break;
            case 'right':
                this.imageSize.width = Math.max(50, this.resizeStartSize.width + deltaX);
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
    
    resetImage() {
        this.imageRotation = 0;
        this.imageScale = 1.0;
        const canvas = this.backgroundManager.canvas;
        const rect = canvas.getBoundingClientRect();
        this.imagePosition.x = (rect.width - this.imageSize.width) / 2;
        this.imagePosition.y = (rect.height - this.imageSize.height) / 2;
        this.updateControlBox();
    }
    
    fitToCanvas() {
        const canvas = this.backgroundManager.canvas;
        const rect = canvas.getBoundingClientRect();
        
        // Fit image to canvas while maintaining aspect ratio
        const imageAspect = this.imageSize.width / this.imageSize.height;
        const canvasAspect = rect.width / rect.height;
        
        if (imageAspect > canvasAspect) {
            // Image is wider
            this.imageSize.width = rect.width * 0.9;
            this.imageSize.height = this.imageSize.width / imageAspect;
        } else {
            // Image is taller
            this.imageSize.height = rect.height * 0.9;
            this.imageSize.width = this.imageSize.height * imageAspect;
        }
        
        // Center the image
        this.imagePosition.x = (rect.width - this.imageSize.width) / 2;
        this.imagePosition.y = (rect.height - this.imageSize.height) / 2;
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
