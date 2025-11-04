// Canvas Image Controls Module
// Reuses the same image control interface as background images for canvas images

class CanvasImageControls {
    constructor(canvasImageManager, canvas, historyManager) {
        this.canvasImageManager = canvasImageManager;
        this.canvas = canvas;
        this.historyManager = historyManager;
        this.isActive = false;
        this.isDragging = false;
        this.isResizing = false;
        this.isRotating = false;
        this.currentImageId = null;
        
        // Constants
        this.MIN_IMAGE_SIZE = 50;
        
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
        // Create control overlay similar to background image controls
        const controlsHTML = `
            <div id="canvas-image-controls-overlay" class="image-controls-overlay" style="display: none;">
                <div id="canvas-image-controls-box" class="image-controls-box">
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
                    <div class="rotate-handle" id="canvas-image-rotate-handle">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2">
                            <path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.2"/>
                        </svg>
                    </div>
                    
                    <!-- Control toolbar with confirm button -->
                    <div class="image-controls-toolbar">
                        <button id="canvas-image-done-btn" class="image-control-btn image-done-btn" title="确定">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                                <polyline points="20 6 9 17 4 12"></polyline>
                            </svg>
                        </button>
                    </div>
                </div>
            </div>
        `;
        
        document.body.insertAdjacentHTML('beforeend', controlsHTML);
        
        this.overlay = document.getElementById('canvas-image-controls-overlay');
        this.controlBox = document.getElementById('canvas-image-controls-box');
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
        document.getElementById('canvas-image-rotate-handle').addEventListener('mousedown', (e) => {
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
        
        // Toolbar button - confirm button
        document.getElementById('canvas-image-done-btn').addEventListener('click', () => this.confirmImage());
    }
    
    showControls(imageId) {
        const image = this.canvasImageManager.images.find(img => img.id === imageId);
        if (!image) return;
        
        this.currentImageId = imageId;
        this.isActive = true;
        this.overlay.style.display = 'block';
        
        this.updateControlBox();
    }
    
    hideControls() {
        this.isActive = false;
        this.overlay.style.display = 'none';
        this.currentImageId = null;
    }
    
    confirmImage() {
        this.hideControls();
        // Save to history using injected historyManager
        if (this.historyManager) {
            this.historyManager.saveState();
        }
    }
    
    updateControlBox() {
        const image = this.canvasImageManager.images.find(img => img.id === this.currentImageId);
        if (!image) return;
        
        const rect = this.canvas.getBoundingClientRect();
        
        // Get canvas scale
        const canvasScale = this.getCanvasScale();
        
        // Calculate actual position and size accounting for canvas transform
        const actualX = rect.left + (image.x * canvasScale);
        const actualY = rect.top + (image.y * canvasScale);
        const actualWidth = image.width * canvasScale;
        const actualHeight = image.height * canvasScale;
        
        // Apply transformations to control box to match image exactly
        this.controlBox.style.left = `${actualX}px`;
        this.controlBox.style.top = `${actualY}px`;
        this.controlBox.style.width = `${actualWidth}px`;
        this.controlBox.style.height = `${actualHeight}px`;
        this.controlBox.style.transform = `rotate(${image.rotation}deg)`;
        
        // Trigger canvas redraw
        this.canvasImageManager.redrawCanvas();
    }
    
    startDrag(e) {
        const image = this.canvasImageManager.images.find(img => img.id === this.currentImageId);
        if (!image) return;
        
        this.isDragging = true;
        this.dragStartPos = { x: e.clientX, y: e.clientY };
        this.dragStartImagePos = { x: image.x, y: image.y };
        this.controlBox.style.cursor = 'grabbing';
    }
    
    drag(e) {
        if (!this.isDragging || !this.currentImageId) return;
        
        const image = this.canvasImageManager.images.find(img => img.id === this.currentImageId);
        if (!image) return;
        
        const canvasScale = this.getCanvasScale();
        
        const deltaX = (e.clientX - this.dragStartPos.x) / canvasScale;
        const deltaY = (e.clientY - this.dragStartPos.y) / canvasScale;
        
        image.x = this.dragStartImagePos.x + deltaX;
        image.y = this.dragStartImagePos.y + deltaY;
        
        this.updateControlBox();
    }
    
    stopDrag() {
        this.isDragging = false;
        this.controlBox.style.cursor = 'move';
    }
    
    startResize(e, handle) {
        const image = this.canvasImageManager.images.find(img => img.id === this.currentImageId);
        if (!image) return;
        
        this.isResizing = true;
        this.resizeHandle = handle;
        this.resizeStartPos = { x: e.clientX, y: e.clientY };
        this.resizeStartSize = { width: image.width, height: image.height };
        this.dragStartImagePos = { x: image.x, y: image.y };
    }
    
    resize(e) {
        if (!this.isResizing || !this.currentImageId) return;
        
        const image = this.canvasImageManager.images.find(img => img.id === this.currentImageId);
        if (!image) return;
        
        const canvasScale = this.getCanvasScale();
        
        const deltaX = (e.clientX - this.resizeStartPos.x) / canvasScale;
        const deltaY = (e.clientY - this.resizeStartPos.y) / canvasScale;
        
        switch (this.resizeHandle) {
            case 'top-left':
                image.width = Math.max(this.MIN_IMAGE_SIZE, this.resizeStartSize.width - deltaX);
                image.height = Math.max(this.MIN_IMAGE_SIZE, this.resizeStartSize.height - deltaY);
                image.x = this.dragStartImagePos.x + deltaX;
                image.y = this.dragStartImagePos.y + deltaY;
                break;
            case 'top-right':
                image.width = Math.max(this.MIN_IMAGE_SIZE, this.resizeStartSize.width + deltaX);
                image.height = Math.max(this.MIN_IMAGE_SIZE, this.resizeStartSize.height - deltaY);
                image.y = this.dragStartImagePos.y + deltaY;
                break;
            case 'bottom-left':
                image.width = Math.max(this.MIN_IMAGE_SIZE, this.resizeStartSize.width - deltaX);
                image.height = Math.max(this.MIN_IMAGE_SIZE, this.resizeStartSize.height + deltaY);
                image.x = this.dragStartImagePos.x + deltaX;
                break;
            case 'bottom-right':
                image.width = Math.max(this.MIN_IMAGE_SIZE, this.resizeStartSize.width + deltaX);
                image.height = Math.max(this.MIN_IMAGE_SIZE, this.resizeStartSize.height + deltaY);
                break;
            case 'top':
                image.height = Math.max(this.MIN_IMAGE_SIZE, this.resizeStartSize.height - deltaY);
                image.y = this.dragStartImagePos.y + deltaY;
                break;
            case 'bottom':
                image.height = Math.max(this.MIN_IMAGE_SIZE, this.resizeStartSize.height + deltaY);
                break;
            case 'left':
                image.width = Math.max(this.MIN_IMAGE_SIZE, this.resizeStartSize.width - deltaX);
                image.x = this.dragStartImagePos.x + deltaX;
                break;
            case 'right':
                image.width = Math.max(this.MIN_IMAGE_SIZE, this.resizeStartSize.width + deltaX);
                break;
        }
        
        this.updateControlBox();
    }
    
    stopResize() {
        this.isResizing = false;
        this.resizeHandle = null;
    }
    
    startRotate(e) {
        const image = this.canvasImageManager.images.find(img => img.id === this.currentImageId);
        if (!image) return;
        
        this.isRotating = true;
        const rect = this.controlBox.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;
        
        this.rotateStartAngle = Math.atan2(e.clientY - centerY, e.clientX - centerX) * 180 / Math.PI;
        this.rotateStartRotation = image.rotation;
    }
    
    rotate(e) {
        if (!this.isRotating || !this.currentImageId) return;
        
        const image = this.canvasImageManager.images.find(img => img.id === this.currentImageId);
        if (!image) return;
        
        const rect = this.controlBox.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;
        
        const currentAngle = Math.atan2(e.clientY - centerY, e.clientX - centerX) * 180 / Math.PI;
        const angleDelta = currentAngle - this.rotateStartAngle;
        
        image.rotation = this.rotateStartRotation + angleDelta;
        
        // Normalize to 0-360
        while (image.rotation < 0) image.rotation += 360;
        while (image.rotation >= 360) image.rotation -= 360;
        
        this.updateControlBox();
    }
    
    stopRotate() {
        this.isRotating = false;
    }
    
    getCanvasScale() {
        const computedStyle = window.getComputedStyle(this.canvas);
        const transform = computedStyle.transform;
        
        // Check if transform is 'none' or invalid
        if (!transform || transform === 'none') {
            return 1;
        }
        
        try {
            const matrix = new DOMMatrix(transform);
            return matrix.a || 1;
        } catch (e) {
            console.warn('Failed to parse transform matrix:', e);
            return 1;
        }
    }
}
