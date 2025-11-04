// Canvas Images Module
// Handles images inserted into the canvas (not background)
// Allows dragging, resizing, rotating, copying and deleting

class CanvasImageManager {
    constructor(canvas, ctx) {
        this.canvas = canvas;
        this.ctx = ctx;
        this.images = []; // Array of image objects
        this.selectedImageId = null;
        this.isDragging = false;
        this.isResizing = false;
        this.isRotating = false;
        
        // Selection box
        this.selectionBox = null;
        
        // Drag state
        this.dragStartPos = { x: 0, y: 0 };
        this.dragStartImagePos = { x: 0, y: 0 };
        this.canvasStateBeforeDrag = null; // Store canvas state before dragging
        
        // Resize state
        this.resizeHandle = null;
        this.resizeStartSize = { width: 0, height: 0 };
        this.resizeStartPos = { x: 0, y: 0 };
        
        // Rotation state
        this.rotateStartAngle = 0;
        this.rotateStartRotation = 0;
        
        this.createSelectionOverlay();
    }
    
    createSelectionOverlay() {
        const overlayHTML = `
            <div id="canvas-image-selection" class="canvas-image-selection" style="display: none;">
                <div class="selection-box">
                    <!-- Action buttons above selection -->
                    <div class="selection-action-buttons">
                        <button class="selection-action-btn" id="canvas-image-done-btn" title="完成">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                                <polyline points="20 6 9 17 4 12"></polyline>
                            </svg>
                        </button>
                        <button class="selection-action-btn" id="copy-image-btn" title="复制">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                            </svg>
                        </button>
                        <button class="selection-action-btn" id="delete-image-btn" title="删除">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <polyline points="3 6 5 6 21 6"></polyline>
                                <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"></path>
                            </svg>
                        </button>
                    </div>
                    
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
                    <div class="rotate-handle">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2">
                            <path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.2"/>
                        </svg>
                    </div>
                </div>
            </div>
            <!-- Right-click context menu -->
            <div id="image-context-menu" class="image-context-menu" style="display: none;">
                <div class="context-menu-item" id="context-copy-image">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                    </svg>
                    <span>复制</span>
                </div>
                <div class="context-menu-item" id="context-delete-image">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <polyline points="3 6 5 6 21 6"></polyline>
                        <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"></path>
                    </svg>
                    <span>删除</span>
                </div>
            </div>
        `;
        
        document.body.insertAdjacentHTML('beforeend', overlayHTML);
        this.selectionOverlay = document.getElementById('canvas-image-selection');
        this.selectionBox = this.selectionOverlay.querySelector('.selection-box');
        this.contextMenu = document.getElementById('image-context-menu');
        
        this.setupSelectionEventListeners();
    }
    
    setupSelectionEventListeners() {
        // Action buttons
        document.getElementById('canvas-image-done-btn').addEventListener('click', (e) => {
            e.stopPropagation();
            this.deselectImage();
            // Auto-switch to pen tool after clicking done
            window.dispatchEvent(new CustomEvent('canvasImageConfirmed'));
        });
        
        document.getElementById('copy-image-btn').addEventListener('click', (e) => {
            e.stopPropagation();
            this.copySelectedImage();
        });
        
        document.getElementById('delete-image-btn').addEventListener('click', (e) => {
            e.stopPropagation();
            this.deleteSelectedImage();
        });
        
        // Context menu items
        document.getElementById('context-copy-image').addEventListener('click', (e) => {
            e.stopPropagation();
            this.copySelectedImage();
            this.hideContextMenu();
        });
        
        document.getElementById('context-delete-image').addEventListener('click', (e) => {
            e.stopPropagation();
            this.deleteSelectedImage();
            this.hideContextMenu();
        });
        
        // Right-click on selection box to show context menu
        this.selectionBox.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            this.showContextMenu(e.clientX, e.clientY);
        });
        
        // Right-click on canvas to check for images
        this.canvas.addEventListener('contextmenu', (e) => {
            const rect = this.canvas.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            const imageId = this.getImageAtPoint(x, y);
            
            if (imageId) {
                e.preventDefault();
                this.selectImage(imageId);
                this.showContextMenu(e.clientX, e.clientY);
            }
        });
        
        // Hide context menu when clicking elsewhere
        document.addEventListener('click', () => {
            this.hideContextMenu();
        });
        
        // Drag selection box - check if clicking on interactive elements
        this.selectionBox.addEventListener('mousedown', (e) => {
            const isInteractiveElement = e.target.classList.contains('resize-handle') || 
                e.target.classList.contains('rotate-handle') ||
                e.target.closest('.resize-handle') ||
                e.target.closest('.rotate-handle') ||
                e.target.closest('.selection-action-buttons');
            
            if (!isInteractiveElement) {
                this.startDrag(e);
            }
        });
        
        // Resize handles
        this.selectionBox.querySelectorAll('.resize-handle').forEach(handle => {
            handle.addEventListener('mousedown', (e) => {
                e.stopPropagation();
                this.startResize(e, handle.dataset.handle);
            });
        });
        
        // Rotation handle
        this.selectionBox.querySelector('.rotate-handle').addEventListener('mousedown', (e) => {
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
            if (this.isDragging || this.isResizing || this.isRotating) {
                this.stopDrag();
                this.stopResize();
                this.stopRotate();
            }
        });
    }
    
    showContextMenu(x, y) {
        this.contextMenu.style.display = 'block';
        this.contextMenu.style.left = `${x}px`;
        this.contextMenu.style.top = `${y}px`;
    }
    
    hideContextMenu() {
        this.contextMenu.style.display = 'none';
    }
    
    addImage(imageData, x, y, callback) {
        const img = new Image();
        img.onload = () => {
            const imageId = `img_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            const imageObject = {
                id: imageId,
                image: img,
                x: x || 100,
                y: y || 100,
                width: img.width,
                height: img.height,
                originalWidth: img.width,
                originalHeight: img.height,
                rotation: 0,
                scale: 1.0
            };
            
            this.images.push(imageObject);
            this.redrawCanvas();
            this.selectImage(imageId);
            
            // Call callback with imageId if provided
            if (callback) {
                callback(imageId);
            }
        };
        img.src = imageData;
    }
    
    selectImage(imageId) {
        this.selectedImageId = imageId;
        const image = this.images.find(img => img.id === imageId);
        if (image) {
            this.updateSelectionBox(image);
            this.selectionOverlay.style.display = 'block';
        }
    }
    
    deselectImage() {
        this.selectedImageId = null;
        this.selectionOverlay.style.display = 'none';
    }
    
    updateSelectionBox(image) {
        const rect = this.canvas.getBoundingClientRect();
        
        // Get the canvas scale from computed transform
        const computedStyle = window.getComputedStyle(this.canvas);
        const matrix = new DOMMatrix(computedStyle.transform);
        const canvasScale = matrix.a; // Scale factor from transform matrix
        
        // Calculate position accounting for canvas transforms
        const actualX = rect.left + (image.x * canvasScale);
        const actualY = rect.top + (image.y * canvasScale);
        const actualWidth = image.width * canvasScale;
        const actualHeight = image.height * canvasScale;
        
        this.selectionBox.style.left = `${actualX}px`;
        this.selectionBox.style.top = `${actualY}px`;
        this.selectionBox.style.width = `${actualWidth}px`;
        this.selectionBox.style.height = `${actualHeight}px`;
        this.selectionBox.style.transform = `rotate(${image.rotation}deg)`;
    }
    
    getImageAtPoint(x, y) {
        // Adjust coordinates for canvas scale (same as drawing engine)
        // This accounts for CSS transform scaling applied to the canvas
        const rect = this.canvas.getBoundingClientRect();
        const scaleX = this.canvas.offsetWidth / rect.width;
        const scaleY = this.canvas.offsetHeight / rect.height;
        
        // Note: scaleX and scaleY should be equal for uniform scaling
        // If they differ, the canvas is being distorted
        const adjustedX = x * scaleX;
        const adjustedY = y * scaleY;
        
        // Check images in reverse order (top to bottom)
        for (let i = this.images.length - 1; i >= 0; i--) {
            const img = this.images[i];
            
            // Simple bounding box check (ignoring rotation for now)
            if (adjustedX >= img.x && adjustedX <= img.x + img.width &&
                adjustedY >= img.y && adjustedY <= img.y + img.height) {
                return img.id;
            }
        }
        return null;
    }
    
    startDrag(e) {
        if (!this.selectedImageId) return;
        
        this.isDragging = true;
        const image = this.images.find(img => img.id === this.selectedImageId);
        if (image) {
            this.dragStartPos = { x: e.clientX, y: e.clientY };
            this.dragStartImagePos = { x: image.x, y: image.y };
            // Save canvas state before dragging (excluding images)
            this.canvasStateBeforeDrag = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
        }
    }
    
    drag(e) {
        if (!this.isDragging || !this.selectedImageId) return;
        
        const image = this.images.find(img => img.id === this.selectedImageId);
        if (image) {
            // Get canvas scale to convert screen coordinates to canvas coordinates
            const computedStyle = window.getComputedStyle(this.canvas);
            const matrix = new DOMMatrix(computedStyle.transform);
            const canvasScale = matrix.a || 1;
            
            const deltaX = (e.clientX - this.dragStartPos.x) / canvasScale;
            const deltaY = (e.clientY - this.dragStartPos.y) / canvasScale;
            
            image.x = this.dragStartImagePos.x + deltaX;
            image.y = this.dragStartImagePos.y + deltaY;
            
            this.updateSelectionBox(image);
            
            // Restore canvas state and redraw all images
            if (this.canvasStateBeforeDrag) {
                this.ctx.putImageData(this.canvasStateBeforeDrag, 0, 0);
            }
            this.drawImages();
        }
    }
    
    stopDrag() {
        if (this.isDragging) {
            this.isDragging = false;
            this.canvasStateBeforeDrag = null;
            // Images are already drawn, no need to redraw
        }
    }
    
    startResize(e, handle) {
        if (!this.selectedImageId) return;
        
        this.isResizing = true;
        this.resizeHandle = handle;
        const image = this.images.find(img => img.id === this.selectedImageId);
        if (image) {
            this.resizeStartPos = { x: e.clientX, y: e.clientY };
            this.resizeStartSize = { width: image.width, height: image.height };
            this.dragStartImagePos = { x: image.x, y: image.y };
            // Save canvas state before resizing
            this.canvasStateBeforeDrag = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
        }
    }
    
    resize(e) {
        if (!this.isResizing || !this.selectedImageId) return;
        
        const image = this.images.find(img => img.id === this.selectedImageId);
        if (!image) return;
        
        // Get canvas scale to convert screen coordinates to canvas coordinates
        const computedStyle = window.getComputedStyle(this.canvas);
        const matrix = new DOMMatrix(computedStyle.transform);
        const canvasScale = matrix.a || 1;
        
        const deltaX = (e.clientX - this.resizeStartPos.x) / canvasScale;
        const deltaY = (e.clientY - this.resizeStartPos.y) / canvasScale;
        
        const aspectRatio = this.resizeStartSize.width / this.resizeStartSize.height;
        
        switch (this.resizeHandle) {
            case 'bottom-right':
                image.width = Math.max(50, this.resizeStartSize.width + deltaX);
                image.height = Math.max(50, this.resizeStartSize.height + deltaY);
                break;
            case 'bottom-left':
                image.width = Math.max(50, this.resizeStartSize.width - deltaX);
                image.height = Math.max(50, this.resizeStartSize.height + deltaY);
                image.x = this.dragStartImagePos.x + deltaX;
                break;
            case 'top-right':
                image.width = Math.max(50, this.resizeStartSize.width + deltaX);
                image.height = Math.max(50, this.resizeStartSize.height - deltaY);
                image.y = this.dragStartImagePos.y + deltaY;
                break;
            case 'top-left':
                image.width = Math.max(50, this.resizeStartSize.width - deltaX);
                image.height = Math.max(50, this.resizeStartSize.height - deltaY);
                image.x = this.dragStartImagePos.x + deltaX;
                image.y = this.dragStartImagePos.y + deltaY;
                break;
            case 'top':
                image.height = Math.max(50, this.resizeStartSize.height - deltaY);
                image.y = this.dragStartImagePos.y + deltaY;
                break;
            case 'bottom':
                image.height = Math.max(50, this.resizeStartSize.height + deltaY);
                break;
            case 'left':
                image.width = Math.max(50, this.resizeStartSize.width - deltaX);
                image.x = this.dragStartImagePos.x + deltaX;
                break;
            case 'right':
                image.width = Math.max(50, this.resizeStartSize.width + deltaX);
                break;
        }
        
        this.updateSelectionBox(image);
        // Restore canvas state and redraw all images
        if (this.canvasStateBeforeDrag) {
            this.ctx.putImageData(this.canvasStateBeforeDrag, 0, 0);
        }
        this.drawImages();
    }
    
    stopResize() {
        if (this.isResizing) {
            this.isResizing = false;
            this.resizeHandle = null;
            this.canvasStateBeforeDrag = null;
            // Images are already drawn, no need to redraw
        }
    }
    
    startRotate(e) {
        if (!this.selectedImageId) return;
        
        this.isRotating = true;
        const image = this.images.find(img => img.id === this.selectedImageId);
        if (image) {
            const rect = this.selectionBox.getBoundingClientRect();
            const centerX = rect.left + rect.width / 2;
            const centerY = rect.top + rect.height / 2;
            
            this.rotateStartAngle = Math.atan2(e.clientY - centerY, e.clientX - centerX) * 180 / Math.PI;
            this.rotateStartRotation = image.rotation;
            // Save canvas state before rotating
            this.canvasStateBeforeDrag = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
        }
    }
    
    rotate(e) {
        if (!this.isRotating || !this.selectedImageId) return;
        
        const image = this.images.find(img => img.id === this.selectedImageId);
        if (!image) return;
        
        const rect = this.selectionBox.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;
        
        const currentAngle = Math.atan2(e.clientY - centerY, e.clientX - centerX) * 180 / Math.PI;
        const angleDelta = currentAngle - this.rotateStartAngle;
        
        image.rotation = this.rotateStartRotation + angleDelta;
        
        // Normalize to 0-360
        while (image.rotation < 0) image.rotation += 360;
        while (image.rotation >= 360) image.rotation -= 360;
        
        this.updateSelectionBox(image);
        // Restore canvas state and redraw all images
        if (this.canvasStateBeforeDrag) {
            this.ctx.putImageData(this.canvasStateBeforeDrag, 0, 0);
        }
        this.drawImages();
    }
    
    stopRotate() {
        if (this.isRotating) {
            this.isRotating = false;
            this.canvasStateBeforeDrag = null;
            // Images are already drawn, no need to redraw
        }
    }
    
    copySelectedImage() {
        if (!this.selectedImageId) return;
        
        const image = this.images.find(img => img.id === this.selectedImageId);
        if (image) {
            const copiedImage = {
                ...image,
                id: `img_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                x: image.x + 20,
                y: image.y + 20
            };
            
            this.images.push(copiedImage);
            this.redrawCanvas();
            this.selectImage(copiedImage.id);
        }
    }
    
    deleteSelectedImage() {
        if (!this.selectedImageId) return;
        
        const index = this.images.findIndex(img => img.id === this.selectedImageId);
        if (index !== -1) {
            this.images.splice(index, 1);
            this.deselectImage();
            this.redrawCanvas();
        }
    }
    
    redrawCanvas() {
        // Redraw all images on canvas
        // This is called after any image manipulation
        this.drawImages();
    }
    
    drawImages() {
        this.ctx.save();
        
        for (const image of this.images) {
            this.ctx.save();
            
            // Translate to image center for rotation
            const centerX = image.x + image.width / 2;
            const centerY = image.y + image.height / 2;
            
            this.ctx.translate(centerX, centerY);
            this.ctx.rotate(image.rotation * Math.PI / 180);
            this.ctx.translate(-centerX, -centerY);
            
            // Draw the image
            this.ctx.drawImage(image.image, image.x, image.y, image.width, image.height);
            
            this.ctx.restore();
        }
        
        this.ctx.restore();
    }
    
    clear() {
        this.images = [];
        this.deselectImage();
    }
    
    getState() {
        // Return serializable state for history
        return this.images.map(img => ({
            id: img.id,
            src: img.image.src,
            x: img.x,
            y: img.y,
            width: img.width,
            height: img.height,
            originalWidth: img.originalWidth,
            originalHeight: img.originalHeight,
            rotation: img.rotation,
            scale: img.scale
        }));
    }
    
    setState(state) {
        // Restore state from history
        this.images = [];
        this.deselectImage();
        
        if (state && Array.isArray(state)) {
            state.forEach(imgData => {
                const img = new Image();
                img.onload = () => {
                    this.images.push({
                        id: imgData.id,
                        image: img,
                        x: imgData.x,
                        y: imgData.y,
                        width: imgData.width,
                        height: imgData.height,
                        originalWidth: imgData.originalWidth,
                        originalHeight: imgData.originalHeight,
                        rotation: imgData.rotation,
                        scale: imgData.scale
                    });
                    this.redrawCanvas();
                };
                img.src = imgData.src;
            });
        }
    }
}
