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
                    <div class="rotate-handle" id="rotate-handle" data-i18n-title="imageControls.rotate" title="Rotate" aria-label="Rotate">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2">
                            <path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.2"/>
                        </svg>
                    </div>
                    
                    <!-- Flip horizontal handle -->
                    <div class="flip-handle flip-horizontal" id="flip-horizontal-handle" data-i18n-title="imageControls.flipHorizontal" title="Flip Horizontal" aria-label="Flip Horizontal">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2">
                            <path d="M12 3v18M8 6l-5 6 5 6M16 6l5 6-5 6"/>
                        </svg>
                    </div>
                    
                    <!-- Flip vertical handle -->
                    <div class="flip-handle flip-vertical" id="flip-vertical-handle" data-i18n-title="imageControls.flipVertical" title="Flip Vertical" aria-label="Flip Vertical">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2">
                            <path d="M3 12h18M6 8l6-5 6 5M6 16l6 5 6-5"/>
                        </svg>
                    </div>
                    
                    <!-- Control toolbar -->
                    <div class="image-controls-toolbar">
                        <button id="image-copy-btn" class="image-control-btn" type="button" data-i18n-title="selection.copy" title="Copy" aria-label="Copy">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                            </svg>
                        </button>
                        <button id="image-delete-btn" class="image-control-btn image-cancel-btn" type="button" data-i18n-title="selection.delete" title="Delete" aria-label="Delete">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <polyline points="3 6 5 6 21 6"></polyline>
                                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                            </svg>
                        </button>
                        <button id="image-done-btn" class="image-control-btn image-done-btn" data-i18n-title="imageControls.confirm" title="Confirm" aria-label="Confirm">
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
        this.rotateHandle = document.getElementById('rotate-handle');
        this.flipHorizontalHandle = document.getElementById('flip-horizontal-handle');
        this.flipVerticalHandle = document.getElementById('flip-vertical-handle');
        this.toolbar = this.controlBox.querySelector('.image-controls-toolbar');
        window.i18n?.applyTranslations?.();
    }
    
    setupEventListeners() {
        const handleDragStart = (e) => {
            e.stopPropagation();
            if (e.type !== 'mousemove') {
                e.preventDefault?.();
            }
            const target = e.target;
            const closest = typeof target?.closest === 'function'
                ? target.closest.bind(target)
                : () => null;
            const hasClass = (className) => Boolean(target?.classList?.contains?.(className));
            if (target === this.controlBox || closest('.image-controls-box') === this.controlBox) {
                if (!hasClass('resize-handle') && 
                    !hasClass('rotate-handle') &&
                    !hasClass('flip-handle') &&
                    !closest('.resize-handle') &&
                    !closest('.rotate-handle') &&
                    !closest('.flip-handle') &&
                    !closest('.image-controls-toolbar')) {
                    this.startDrag(e);
                }
            }
        };

        this.controlBox.addEventListener('mousedown', handleDragStart);
        this.controlBox.addEventListener('pointerdown', handleDragStart);
        this.controlBox.addEventListener('touchstart', handleDragStart, { passive: false });
        
        // Resize handles
        this.controlBox.querySelectorAll('.resize-handle').forEach(handle => {
            const startResize = (e) => {
                e.stopPropagation();
                e.preventDefault?.();
                this.startResize(e, handle.dataset.handle);
            };
            handle.addEventListener('mousedown', startResize);
            handle.addEventListener('pointerdown', startResize);
            handle.addEventListener('touchstart', startResize, { passive: false });
        });
        
        // Rotation handle
        const startRotate = (e) => {
            e.stopPropagation();
            e.preventDefault?.();
            this.startRotate(e);
        };
        this.rotateHandle.addEventListener('mousedown', startRotate);
        this.rotateHandle.addEventListener('pointerdown', startRotate);
        this.rotateHandle.addEventListener('touchstart', startRotate, { passive: false });
        
        // Flip horizontal handle
        this.flipHorizontalHandle.addEventListener('click', (e) => {
            e.stopPropagation();
            this.toggleFlipHorizontal();
        });
        
        // Flip vertical handle
        this.flipVerticalHandle.addEventListener('click', (e) => {
            e.stopPropagation();
            this.toggleFlipVertical();
        });
        
        // Global move events
        const handleMove = (e) => {
            if (this.isDragging) {
                this.drag(e);
            } else if (this.isResizing) {
                this.resize(e);
            } else if (this.isRotating) {
                this.rotate(e);
            }
        };

        document.addEventListener('mousemove', handleMove);
        document.addEventListener('pointermove', handleMove);
        document.addEventListener('touchmove', (e) => {
            if (this.isDragging || this.isResizing || this.isRotating) {
                e.preventDefault();
                handleMove(e);
            }
        }, { passive: false });
        
        const handleEnd = () => {
            this.stopDrag();
            this.stopResize();
            this.stopRotate();
        };
        document.addEventListener('mouseup', handleEnd);
        document.addEventListener('pointerup', handleEnd);
        document.addEventListener('touchend', handleEnd);
        document.addEventListener('pointercancel', handleEnd);
        document.addEventListener('touchcancel', handleEnd);
        
        [document.getElementById('image-copy-btn'), document.getElementById('image-delete-btn'), document.getElementById('image-done-btn')]
            .forEach(btn => {
                btn.addEventListener('mousedown', (e) => {
                    e.stopPropagation();
                    e.preventDefault();
                });
                btn.addEventListener('pointerdown', (e) => {
                    e.stopPropagation();
                    e.preventDefault();
                });
            });

        document.getElementById('image-copy-btn').addEventListener('click', (e) => {
            e.stopPropagation();
            e.preventDefault();
            this.copyImageToCanvas();
        });
        document.getElementById('image-delete-btn').addEventListener('click', (e) => {
            e.stopPropagation();
            e.preventDefault();
            this.deleteImage();
        });
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
            this.imageScale = 1.0;
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

    copyImageToCanvas() {
        const drawingBoard = window.drawingBoard;
        const bgImage = this.backgroundManager.backgroundImage;
        if (!drawingBoard || !bgImage) return false;

        drawingBoard.ctx.save();
        const centerX = this.imagePosition.x + this.imageSize.width / 2;
        const centerY = this.imagePosition.y + this.imageSize.height / 2;
        drawingBoard.ctx.translate(centerX, centerY);
        drawingBoard.ctx.rotate(this.imageRotation * Math.PI / 180);
        drawingBoard.ctx.scale(this.flipHorizontal ? -1 : 1, this.flipVertical ? -1 : 1);
        drawingBoard.ctx.drawImage(
            bgImage,
            -this.imageSize.width / 2,
            -this.imageSize.height / 2,
            this.imageSize.width,
            this.imageSize.height
        );
        drawingBoard.ctx.restore();

        drawingBoard.drawingEngine?.addStampedImage({
            imageElement: bgImage,
            imageSrc: this.backgroundManager.backgroundImageData,
            x: this.imagePosition.x,
            y: this.imagePosition.y,
            width: this.imageSize.width,
            height: this.imageSize.height,
            rotation: this.imageRotation,
            flipHorizontal: this.flipHorizontal,
            flipVertical: this.flipVertical
        });

        drawingBoard.historyManager?.saveState();
        return true;
    }

    deleteImage() {
        this.backgroundManager.clearBackgroundImage();
        this.resetConfirmation();
        this.hideControls();
        window.drawingBoard?.updateBackgroundUI?.();
    }

    clamp(value, min, max) {
        return Math.min(max, Math.max(min, value));
    }

    updateAdaptiveControlsLayout(boxWidth, boxHeight) {
        const safeWidth = Math.max(boxWidth, 1);
        const safeHeight = Math.max(boxHeight, 1);
        const minSide = Math.max(Math.min(safeWidth, safeHeight), 1);

        const resizeHandleSize = this.clamp(minSide * 0.18, 10, 12);
        this.controlBox.style.setProperty('--resize-handle-size', `${resizeHandleSize}px`);
        this.controlBox.style.setProperty('--resize-handle-offset', `${-(resizeHandleSize / 2)}px`);

        const floatingSize = this.clamp(minSide * 0.28, 20, 36);
        const floatingIconSize = this.clamp(floatingSize * 0.56, 12, 20);
        const floatingGap = this.clamp(floatingSize * 0.2, 4, 10);
        const inset = this.clamp(minSide * 0.08, 4, 10);
        const outsideTop = safeHeight >= floatingSize * 2.5 ? -(floatingSize + 8) : inset;
        const insideTop = inset;
        const rowSpan = floatingSize * 3 + floatingGap * 2;
        const doubleSpan = floatingSize * 2 + floatingGap;
        const centerX = safeWidth / 2;
        let leftPosition;
        let centerPosition;
        let rightPosition;
        if (safeWidth >= rowSpan + inset * 2) {
            leftPosition = { left: centerX - (floatingSize + floatingGap), top: outsideTop };
            centerPosition = { left: centerX, top: outsideTop };
            rightPosition = { left: centerX + (floatingSize + floatingGap), top: outsideTop };
        } else if (safeWidth >= doubleSpan + inset * 2) {
            centerPosition = { left: centerX, top: outsideTop };
            leftPosition = { left: centerX - ((floatingSize + floatingGap) / 2), top: insideTop };
            rightPosition = { left: centerX + ((floatingSize + floatingGap) / 2), top: insideTop };
        } else {
            const sideOffset = this.clamp(floatingSize * 0.75, floatingSize * 0.55, Math.max(floatingSize * 0.75, (safeWidth / 2) - (floatingSize / 2)));
            centerPosition = { left: centerX, top: insideTop };
            leftPosition = { left: this.clamp(centerX - sideOffset, floatingSize / 2, safeWidth - floatingSize / 2), top: insideTop + floatingSize + floatingGap };
            rightPosition = { left: this.clamp(centerX + sideOffset, floatingSize / 2, safeWidth - floatingSize / 2), top: insideTop + floatingSize + floatingGap };
        }

        [
            { element: this.flipHorizontalHandle, position: leftPosition },
            { element: this.rotateHandle, position: centerPosition },
            { element: this.flipVerticalHandle, position: rightPosition }
        ].forEach(({ element, position }) => {
            if (!element || !position) return;

            element.style.left = `${position.left}px`;
            element.style.top = `${position.top}px`;
            element.style.width = `${floatingSize}px`;
            element.style.height = `${floatingSize}px`;
            element.style.setProperty('--handle-connector-top', `${floatingSize}px`);
            element.style.setProperty('--handle-connector-height', `${Math.max(8, Math.round(floatingSize * 0.35))}px`);

            const icon = element.querySelector('svg');
            if (icon) {
                icon.style.width = `${floatingIconSize}px`;
                icon.style.height = `${floatingIconSize}px`;
            }
        });

        this.controlBox.style.setProperty('--floating-control-size', `${floatingSize}px`);
        this.controlBox.style.setProperty('--floating-control-icon-size', `${floatingIconSize}px`);

        if (!this.toolbar) return;

        const toolbarButtons = Array.from(this.toolbar.querySelectorAll('.image-control-btn'));
        const toolbarButtonSize = this.clamp(Math.min(safeWidth * 0.3, minSide * 0.42), 20, 44);
        const toolbarGap = this.clamp(toolbarButtonSize * 0.18, 4, 8);
        const toolbarPaddingX = this.clamp(toolbarButtonSize * 0.22, 4, 10);
        const toolbarPaddingY = this.clamp(toolbarButtonSize * 0.18, 4, 10);
        const toolbarHorizontalWidth = (toolbarButtonSize * toolbarButtons.length) + (toolbarGap * Math.max(toolbarButtons.length - 1, 0)) + toolbarPaddingX * 2;
        const toolbarTwoColWidth = (toolbarButtonSize * Math.min(toolbarButtons.length, 2)) + (toolbarGap * Math.max(Math.min(toolbarButtons.length, 2) - 1, 0)) + toolbarPaddingX * 2;

        toolbarButtons.forEach((button) => {
            button.style.width = `${toolbarButtonSize}px`;
            button.style.height = `${toolbarButtonSize}px`;

            const icon = button.querySelector('svg');
            if (icon) {
                const toolbarIconSize = this.clamp(toolbarButtonSize * 0.45, 10, 20);
                icon.style.width = `${toolbarIconSize}px`;
                icon.style.height = `${toolbarIconSize}px`;
            }
        });

        this.controlBox.style.setProperty('--toolbar-button-size', `${toolbarButtonSize}px`);
        this.controlBox.style.setProperty('--toolbar-gap', `${toolbarGap}px`);
        this.controlBox.style.setProperty('--toolbar-padding-x', `${toolbarPaddingX}px`);
        this.controlBox.style.setProperty('--toolbar-padding-y', `${toolbarPaddingY}px`);

        this.toolbar.style.left = `${centerX}px`;
        this.toolbar.style.bottom = safeHeight >= toolbarButtonSize * 2.5
            ? `${-(toolbarButtonSize + toolbarPaddingY + 10)}px`
            : `${inset}px`;
        this.toolbar.style.transform = 'translateX(-50%)';
        this.toolbar.style.display = 'flex';
        this.toolbar.style.flexDirection = 'row';
        this.toolbar.style.justifyContent = 'center';
        this.toolbar.style.alignItems = 'center';
        this.toolbar.style.justifyItems = '';
        this.toolbar.style.gridTemplateColumns = '';
        this.toolbar.style.width = 'auto';

        if (safeWidth < toolbarHorizontalWidth + inset * 2) {
            this.toolbar.style.bottom = `${inset}px`;

            if (safeWidth >= toolbarTwoColWidth + inset * 2 && toolbarButtons.length > 2) {
                this.toolbar.style.display = 'grid';
                this.toolbar.style.gridTemplateColumns = 'repeat(2, minmax(0, 1fr))';
                this.toolbar.style.justifyItems = 'center';
                this.toolbar.style.width = `${Math.max(toolbarTwoColWidth, Math.min(safeWidth - inset * 2, toolbarHorizontalWidth))}px`;
            } else {
                this.toolbar.style.flexDirection = 'column';
            }
        }
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

        this.updateAdaptiveControlsLayout(actualWidth, actualHeight);
        
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
            scale: 1,
            flipHorizontal: this.flipHorizontal,
            flipVertical: this.flipVertical
        });
    }

    getClientPos(e) {
        if (e.touches && e.touches.length > 0) {
            return { x: e.touches[0].clientX, y: e.touches[0].clientY };
        }
        return { x: e.clientX, y: e.clientY };
    }

    getControlBoxCenter() {
        const canvas = this.backgroundManager.bgCanvas;
        const rect = canvas.getBoundingClientRect();
        const dpr = window.devicePixelRatio || 1;
        const logicalWidth = canvas.width / dpr;
        const logicalHeight = canvas.height / dpr;
        const scaleX = rect.width / logicalWidth;
        const scaleY = rect.height / logicalHeight;

        return {
            x: rect.left + (this.imagePosition.x + this.imageSize.width / 2) * scaleX,
            y: rect.top + (this.imagePosition.y + this.imageSize.height / 2) * scaleY
        };
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
        this.dragStartPos = this.getClientPos(e);
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
        const logicalHeight = canvas.height / dpr;
        const scaleX = rect.width / logicalWidth;
        const scaleY = rect.height / logicalHeight;
        
        const pos = this.getClientPos(e);
        const deltaX = (pos.x - this.dragStartPos.x) / scaleX;
        const deltaY = (pos.y - this.dragStartPos.y) / scaleY;
        
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
        this.resizeStartPos = this.getClientPos(e);
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
        const logicalHeight = canvas.height / dpr;
        const scaleX = rect.width / logicalWidth;
        const scaleY = rect.height / logicalHeight;
        
        const pos = this.getClientPos(e);
        const deltaX = (pos.x - this.resizeStartPos.x) / scaleX;
        const deltaY = (pos.y - this.resizeStartPos.y) / scaleY;
        
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
        const center = this.getControlBoxCenter();
        const pos = this.getClientPos(e);
        this.rotateStartAngle = Math.atan2(pos.y - center.y, pos.x - center.x) * 180 / Math.PI;
        this.rotateStartRotation = this.imageRotation;
    }
    
    rotate(e) {
        if (!this.isRotating) return;

        const center = this.getControlBoxCenter();
        const pos = this.getClientPos(e);
        const currentAngle = Math.atan2(pos.y - center.y, pos.x - center.x) * 180 / Math.PI;
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
        const dpr = window.devicePixelRatio || 1;
        const logicalWidth = canvas.width / dpr;
        const logicalHeight = canvas.height / dpr;
        const scaleX = rect.width / logicalWidth;
        const scaleY = rect.height / logicalHeight;
        
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
            const fittedScreenWidth = actualWidth * 0.9;
            const fittedScreenHeight = fittedScreenWidth / imageAspect;
            this.imageSize.width = fittedScreenWidth / scaleX;
            this.imageSize.height = fittedScreenHeight / scaleY;
        } else {
            // Image is taller - fit to height
            const fittedScreenHeight = actualHeight * 0.9;
            const fittedScreenWidth = fittedScreenHeight * imageAspect;
            this.imageSize.height = fittedScreenHeight / scaleY;
            this.imageSize.width = fittedScreenWidth / scaleX;
        }
        
        // Center the image in logical canvas coordinates
        this.imagePosition.x = (logicalWidth - this.imageSize.width) / 2;
        this.imagePosition.y = (logicalHeight - this.imageSize.height) / 2;
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
            scale: 1
        };
    }
}

window.ImageControls = ImageControls;
window.AboardImageControls = ImageControls;
