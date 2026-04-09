// Stroke Controls Module
// Handles selection, moving, and resizing of drawn strokes

class StrokeControls {
    constructor(drawingEngine, canvas, ctx, historyManager) {
        this.drawingEngine = drawingEngine;
        this.canvas = canvas;
        this.ctx = ctx;
        this.historyManager = historyManager;
        this.isActive = false;
        this.isDragging = false;
        this.isResizing = false;
        this.isRotating = false; // 旋转状态
        this.currentStrokeIndex = null;
        
        // Minimum stroke size
        this.MIN_STROKE_SIZE = 10;
        
        // Drag state
        this.dragStartPos = { x: 0, y: 0 };
        this.dragStartStrokePos = { x: 0, y: 0 };
        
        // Resize state
        this.resizeHandle = null;
        this.resizeStartBounds = null;
        this.resizeStartPos = { x: 0, y: 0 };
        
        // 旋转状态
        this.rotateStartAngle = 0;
        this.rotateStartRotation = 0;
        this.strokeRotation = 0; // Current rotation angle in degrees
        
        this.createControls();
        this.setupEventListeners();
    }
    
    createControls() {
        // Create control overlay similar to image controls
        const controlsHTML = `
            <div id="stroke-controls-overlay" class="image-controls-overlay" style="display: none;">
                <div id="stroke-controls-box" class="image-controls-box">
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
                    
                    <!-- Rotation handle - 旋转控制手柄 -->
                    <div class="rotate-handle" id="stroke-rotate-handle" data-i18n-title="imageControls.rotate" title="Rotate" aria-label="Rotate">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2">
                            <path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.2"/>
                        </svg>
                    </div>
                    
                    <!-- Control toolbar with action buttons -->
                    <div class="image-controls-toolbar">
                        <button id="stroke-done-btn" class="image-control-btn image-done-btn" data-i18n-title="selection.done" title="Done" aria-label="Done">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                                <polyline points="20 6 9 17 4 12"></polyline>
                            </svg>
                        </button>
                    </div>
                </div>
            </div>
        `;
        
        document.body.insertAdjacentHTML('beforeend', controlsHTML);
        
        this.overlay = document.getElementById('stroke-controls-overlay');
        this.controlBox = document.getElementById('stroke-controls-box');
        this.rotateHandle = document.getElementById('stroke-rotate-handle');
        this.toolbar = this.controlBox.querySelector('.image-controls-toolbar');
        window.i18n?.applyTranslations?.();
    }
    
    setupEventListeners() {
        const handleDragStart = (e) => {
            e.stopPropagation();
            e.preventDefault?.();
            const target = e.target;
            const closest = typeof target?.closest === 'function'
                ? target.closest.bind(target)
                : () => null;
            const hasClass = (className) => Boolean(target?.classList?.contains?.(className));
            if (target === this.controlBox || closest('.image-controls-box') === this.controlBox) {
                if (!hasClass('resize-handle') && 
                    !closest('.resize-handle') &&
                    !closest('.rotate-handle') &&
                    !closest('.image-controls-toolbar')) {
                    this.startDrag(e);
                }
            }
        };

        // Drag stroke
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
        
        // Rotation handle - 旋转手柄事件监听
        if (this.rotateHandle) {
            const startRotate = (e) => {
                e.stopPropagation();
                e.preventDefault?.();
                this.startRotate(e);
            };
            this.rotateHandle.addEventListener('mousedown', startRotate);
            this.rotateHandle.addEventListener('pointerdown', startRotate);
            this.rotateHandle.addEventListener('touchstart', startRotate, { passive: false });
        }
        
        // Global mouse events
        const handleMove = (e) => {
            if ((this.isDragging || this.isResizing || this.isRotating) && e.type === 'touchmove') {
                e.preventDefault();
            }
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
        document.addEventListener('touchmove', handleMove, { passive: false });
        
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
        
        // Done button
        document.getElementById('stroke-done-btn').addEventListener('click', () => {
            this.hideControls();
            // Save history after stroke modification
            if (this.historyManager) {
                this.historyManager.saveState();
            }
        });
    }
    
    showControls(strokeIndex) {
        this.isActive = true;
        this.currentStrokeIndex = strokeIndex;
        this.overlay.style.display = 'block';
        this.updateControlBox();
    }
    
    hideControls() {
        this.isActive = false;
        this.overlay.style.display = 'none';
        this.currentStrokeIndex = null;
        this.drawingEngine.deselectStroke();
        // Redraw canvas to remove selection border
        this.redrawCanvas();
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
        const inset = this.clamp(minSide * 0.08, 4, 10);
        const handleTop = safeHeight >= floatingSize * 2.5 ? -(floatingSize + 8) : inset;
        const handleLeft = safeWidth >= floatingSize * 2.5
            ? safeWidth / 2
            : this.clamp(safeWidth - (floatingSize / 2) - inset, floatingSize / 2, Math.max(floatingSize / 2, safeWidth - (floatingSize / 2)));

        if (this.rotateHandle) {
            this.rotateHandle.style.left = `${handleLeft}px`;
            this.rotateHandle.style.top = `${handleTop}px`;
            this.rotateHandle.style.width = `${floatingSize}px`;
            this.rotateHandle.style.height = `${floatingSize}px`;
            this.rotateHandle.style.setProperty('--handle-connector-top', `${floatingSize}px`);
            this.rotateHandle.style.setProperty('--handle-connector-height', `${Math.max(8, Math.round(floatingSize * 0.35))}px`);

            const icon = this.rotateHandle.querySelector('svg');
            if (icon) {
                icon.style.width = `${floatingIconSize}px`;
                icon.style.height = `${floatingIconSize}px`;
            }
        }

        this.controlBox.style.setProperty('--floating-control-size', `${floatingSize}px`);
        this.controlBox.style.setProperty('--floating-control-icon-size', `${floatingIconSize}px`);

        if (!this.toolbar) return;

        const toolbarButton = this.toolbar.querySelector('.image-control-btn');
        const toolbarButtonSize = this.clamp(Math.min(safeWidth * 0.3, minSide * 0.42), 20, 44);
        const toolbarPaddingX = this.clamp(toolbarButtonSize * 0.22, 4, 10);
        const toolbarPaddingY = this.clamp(toolbarButtonSize * 0.18, 4, 10);

        if (toolbarButton) {
            toolbarButton.style.width = `${toolbarButtonSize}px`;
            toolbarButton.style.height = `${toolbarButtonSize}px`;
            const icon = toolbarButton.querySelector('svg');
            if (icon) {
                const toolbarIconSize = this.clamp(toolbarButtonSize * 0.45, 10, 20);
                icon.style.width = `${toolbarIconSize}px`;
                icon.style.height = `${toolbarIconSize}px`;
            }
        }

        this.controlBox.style.setProperty('--toolbar-button-size', `${toolbarButtonSize}px`);
        this.controlBox.style.setProperty('--toolbar-gap', '4px');
        this.controlBox.style.setProperty('--toolbar-padding-x', `${toolbarPaddingX}px`);
        this.controlBox.style.setProperty('--toolbar-padding-y', `${toolbarPaddingY}px`);

        this.toolbar.style.left = `${safeWidth / 2}px`;
        this.toolbar.style.bottom = safeHeight >= toolbarButtonSize * 2.5
            ? `${-(toolbarButtonSize + toolbarPaddingY + 10)}px`
            : `${inset}px`;
        this.toolbar.style.transform = 'translateX(-50%)';
        this.toolbar.style.width = 'auto';
    }
    
    updateControlBox() {
        if (this.currentStrokeIndex === null) return;
        
        const stroke = this.drawingEngine.strokes[this.currentStrokeIndex];
        if (!stroke) return;
        
        const bounds = this.drawingEngine.getStrokeBounds(stroke);
        if (!bounds) return;
        
        const rect = this.canvas.getBoundingClientRect();
        const { scaleX, scaleY } = this.getCanvasScales();
        
        // Calculate actual position and size accounting for canvas transform
        const actualX = rect.left + (bounds.x * scaleX);
        const actualY = rect.top + (bounds.y * scaleY);
        const actualWidth = bounds.width * scaleX;
        const actualHeight = bounds.height * scaleY;
        
        this.controlBox.style.left = `${actualX}px`;
        this.controlBox.style.top = `${actualY}px`;
        this.controlBox.style.width = `${actualWidth}px`;
        this.controlBox.style.height = `${actualHeight}px`;
        // Apply rotation transform instead of setting to 'none'
        this.controlBox.style.transform = `rotate(${stroke.rotation || 0}deg)`;

        this.updateAdaptiveControlsLayout(actualWidth, actualHeight);
    }

    getClientPos(e) {
        if (e.touches && e.touches.length > 0) {
            return { x: e.touches[0].clientX, y: e.touches[0].clientY };
        }
        return { x: e.clientX, y: e.clientY };
    }
    
    startDrag(e) {
        if (this.currentStrokeIndex === null) return;

        const stroke = this.drawingEngine.strokes[this.currentStrokeIndex];
        if (!stroke) return;
        const bounds = this.drawingEngine.getStrokeBounds(stroke);
        if (!bounds) return;
        
        this.isDragging = true;
        this.dragStartPos = this.getClientPos(e);
        this.dragStartStrokePos = { x: bounds.x, y: bounds.y };
        
        this.controlBox.style.cursor = 'grabbing';
    }
    
    drag(e) {
        if (!this.isDragging || this.currentStrokeIndex === null) return;
        
        const stroke = this.drawingEngine.strokes[this.currentStrokeIndex];
        if (!stroke) return;
        
        const { scaleX, scaleY } = this.getCanvasScales();
        const pos = this.getClientPos(e);
        const deltaX = (pos.x - this.dragStartPos.x) / scaleX;
        const deltaY = (pos.y - this.dragStartPos.y) / scaleY;
        
        // Move all points in the stroke
        for (let point of stroke.points) {
            if (point.originalX === undefined || point.originalY === undefined) {
                point.originalX = point.x;
                point.originalY = point.y;
            }
            point.x = point.originalX + deltaX;
            point.y = point.originalY + deltaY;
        }
        
        this.updateControlBox();
        this.redrawCanvas();
    }
    
    stopDrag() {
        if (this.isDragging) {
            this.isDragging = false;
            this.controlBox.style.cursor = 'move';
            
            // Clear original position markers
            if (this.currentStrokeIndex !== null) {
                const stroke = this.drawingEngine.strokes[this.currentStrokeIndex];
                if (stroke) {
                    for (let point of stroke.points) {
                        delete point.originalX;
                        delete point.originalY;
                    }
                }
            }
        }
    }
    
    startResize(e, handle) {
        if (this.currentStrokeIndex === null) return;

        const stroke = this.drawingEngine.strokes[this.currentStrokeIndex];
        if (!stroke) return;
        const resizeStartBounds = this.drawingEngine.getStrokeBounds(stroke);
        if (!resizeStartBounds) return;
        
        this.isResizing = true;
        this.resizeHandle = handle;
        this.resizeStartPos = this.getClientPos(e);
        this.resizeStartBounds = resizeStartBounds;
        
        // Store original positions
        for (let point of stroke.points) {
            point.originalX = point.x;
            point.originalY = point.y;
        }
    }
    
    resize(e) {
        if (!this.isResizing || this.currentStrokeIndex === null) return;
        
        const stroke = this.drawingEngine.strokes[this.currentStrokeIndex];
        if (!stroke || !this.resizeStartBounds) return;
        
        const { scaleX: screenScaleX, scaleY: screenScaleY } = this.getCanvasScales();
        const pos = this.getClientPos(e);
        const deltaX = (pos.x - this.resizeStartPos.x) / screenScaleX;
        const deltaY = (pos.y - this.resizeStartPos.y) / screenScaleY;
        
        const startBounds = this.resizeStartBounds;
        let newBounds = { ...startBounds };
        
        // Calculate new bounds based on handle
        switch (this.resizeHandle) {
            case 'top-left':
                newBounds.x = startBounds.x + deltaX;
                newBounds.y = startBounds.y + deltaY;
                newBounds.width = Math.max(this.MIN_STROKE_SIZE, startBounds.width - deltaX);
                newBounds.height = Math.max(this.MIN_STROKE_SIZE, startBounds.height - deltaY);
                break;
            case 'top-right':
                newBounds.y = startBounds.y + deltaY;
                newBounds.width = Math.max(this.MIN_STROKE_SIZE, startBounds.width + deltaX);
                newBounds.height = Math.max(this.MIN_STROKE_SIZE, startBounds.height - deltaY);
                break;
            case 'bottom-left':
                newBounds.x = startBounds.x + deltaX;
                newBounds.width = Math.max(this.MIN_STROKE_SIZE, startBounds.width - deltaX);
                newBounds.height = Math.max(this.MIN_STROKE_SIZE, startBounds.height + deltaY);
                break;
            case 'bottom-right':
                newBounds.width = Math.max(this.MIN_STROKE_SIZE, startBounds.width + deltaX);
                newBounds.height = Math.max(this.MIN_STROKE_SIZE, startBounds.height + deltaY);
                break;
            case 'top':
                newBounds.y = startBounds.y + deltaY;
                newBounds.height = Math.max(this.MIN_STROKE_SIZE, startBounds.height - deltaY);
                break;
            case 'bottom':
                newBounds.height = Math.max(this.MIN_STROKE_SIZE, startBounds.height + deltaY);
                break;
            case 'left':
                newBounds.x = startBounds.x + deltaX;
                newBounds.width = Math.max(this.MIN_STROKE_SIZE, startBounds.width - deltaX);
                break;
            case 'right':
                newBounds.width = Math.max(this.MIN_STROKE_SIZE, startBounds.width + deltaX);
                break;
        }
        
        for (let point of stroke.points) {
            if (point.originalX !== undefined && point.originalY !== undefined) {
                const relX = (point.originalX - startBounds.x) / startBounds.width;
                const relY = (point.originalY - startBounds.y) / startBounds.height;
                point.x = newBounds.x + relX * newBounds.width;
                point.y = newBounds.y + relY * newBounds.height;
            }
        }
        
        this.updateControlBox();
        this.redrawCanvas();
    }
    
    stopResize() {
        if (this.isResizing) {
            this.isResizing = false;
            this.resizeHandle = null;
            this.resizeStartBounds = null;
            
            // Clear original position markers
            if (this.currentStrokeIndex !== null) {
                const stroke = this.drawingEngine.strokes[this.currentStrokeIndex];
                if (stroke) {
                    for (let point of stroke.points) {
                        delete point.originalX;
                        delete point.originalY;
                    }
                }
            }
        }
    }
    
    // 旋转相关方法
    startRotate(e) {
        if (this.currentStrokeIndex === null) return;

        const stroke = this.drawingEngine.strokes[this.currentStrokeIndex];
        if (!stroke) return;
        const bounds = this.drawingEngine.getStrokeBounds(stroke);
        if (!bounds) return;

        this.isRotating = true;
        const rect = this.controlBox.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;
        const pos = this.getClientPos(e);
        
        this.rotateStartAngle = Math.atan2(pos.y - centerY, pos.x - centerX) * 180 / Math.PI;
        this.rotateStartRotation = stroke.rotation || 0;
        
        // Store original bounds at start of rotation to preserve dimensions
        if (!stroke.originalBounds) {
            stroke.originalBounds = bounds;
        }
        
        // Store original positions for all points
        for (let point of stroke.points) {
            point.originalX = point.x;
            point.originalY = point.y;
        }
    }
    
    rotate(e) {
        if (!this.isRotating || this.currentStrokeIndex === null) return;
        
        const stroke = this.drawingEngine.strokes[this.currentStrokeIndex];
        if (!stroke) return;
        
        const rect = this.controlBox.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;
        const pos = this.getClientPos(e);
        
        const currentAngle = Math.atan2(pos.y - centerY, pos.x - centerX) * 180 / Math.PI;
        const angleDelta = currentAngle - this.rotateStartAngle;
        
        // Update rotation angle only - do not modify width/height
        stroke.rotation = ((this.rotateStartRotation + angleDelta) % 360 + 360) % 360;
        
        // Use original bounds for center calculation to maintain stability
        const bounds = stroke.originalBounds || this.drawingEngine.getStrokeBounds(stroke);
        if (!bounds) return;
        
        const strokeCenterX = bounds.x + bounds.width / 2;
        const strokeCenterY = bounds.y + bounds.height / 2;
        
        // Rotate all points around the stroke center
        const angleRad = (stroke.rotation - this.rotateStartRotation) * Math.PI / 180;
        for (let point of stroke.points) {
            if (point.originalX !== undefined && point.originalY !== undefined) {
                // Get relative position from center
                const relX = point.originalX - strokeCenterX;
                const relY = point.originalY - strokeCenterY;
                
                // Apply rotation
                const rotatedX = relX * Math.cos(angleRad) - relY * Math.sin(angleRad);
                const rotatedY = relX * Math.sin(angleRad) + relY * Math.cos(angleRad);
                
                // Set new position
                point.x = strokeCenterX + rotatedX;
                point.y = strokeCenterY + rotatedY;
            }
        }
        
        this.updateControlBox();
        this.redrawCanvas();
    }
    
    stopRotate() {
        if (this.isRotating) {
            this.isRotating = false;
            
            // Clear original position markers
            if (this.currentStrokeIndex !== null) {
                const stroke = this.drawingEngine.strokes[this.currentStrokeIndex];
                if (stroke) {
                    for (let point of stroke.points) {
                        delete point.originalX;
                        delete point.originalY;
                    }
                    // Clear original bounds after rotation is complete
                    delete stroke.originalBounds;
                }
            }
        }
    }
    
    getCanvasScales() {
        const rect = this.canvas.getBoundingClientRect();
        return {
            scaleX: rect.width / (this.canvas.offsetWidth || rect.width || 1),
            scaleY: rect.height / (this.canvas.offsetHeight || rect.height || 1)
        };
    }
    
    redrawCanvas() {
        // Clear canvas
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Redraw all strokes
        for (const stroke of this.drawingEngine.strokes) {
            this.drawingEngine.redrawStroke(stroke);
        }
        
        // Draw selection border if a stroke is selected
        if (this.currentStrokeIndex !== null) {
            this.drawingEngine.selectedStrokeIndex = this.currentStrokeIndex;
            this.drawingEngine.drawSelectionBorder();
        }

        window.drawingBoard?.syncVectorPreviewState?.();
    }
}

window.StrokeControls = StrokeControls;
window.AboardStrokeControls = StrokeControls;
