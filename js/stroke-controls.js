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
                    <div class="rotate-handle" id="stroke-rotate-handle">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2">
                            <path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.2"/>
                        </svg>
                    </div>
                    
                    <!-- Control toolbar with action buttons -->
                    <div class="image-controls-toolbar">
                        <button id="stroke-done-btn" class="image-control-btn image-done-btn" title="完成">
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
    }
    
    setupEventListeners() {
        // Drag stroke
        this.controlBox.addEventListener('mousedown', (e) => {
            if (e.target === this.controlBox || e.target.closest('.image-controls-box') === this.controlBox) {
                if (!e.target.classList.contains('resize-handle') && 
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
        
        // Rotation handle - 旋转手柄事件监听
        const rotateHandle = document.getElementById('stroke-rotate-handle');
        if (rotateHandle) {
            rotateHandle.addEventListener('mousedown', (e) => {
                e.stopPropagation();
                this.startRotate(e);
            });
        }
        
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
    
    updateControlBox() {
        if (this.currentStrokeIndex === null) return;
        
        const stroke = this.drawingEngine.strokes[this.currentStrokeIndex];
        if (!stroke) return;
        
        const bounds = this.drawingEngine.getStrokeBounds(stroke);
        if (!bounds) return;
        
        const rect = this.canvas.getBoundingClientRect();
        const canvasScale = this.getCanvasScale();
        
        // Calculate actual position and size accounting for canvas transform
        const actualX = rect.left + (bounds.x * canvasScale);
        const actualY = rect.top + (bounds.y * canvasScale);
        const actualWidth = bounds.width * canvasScale;
        const actualHeight = bounds.height * canvasScale;
        
        this.controlBox.style.left = `${actualX}px`;
        this.controlBox.style.top = `${actualY}px`;
        this.controlBox.style.width = `${actualWidth}px`;
        this.controlBox.style.height = `${actualHeight}px`;
        // Apply rotation transform instead of setting to 'none'
        this.controlBox.style.transform = `rotate(${stroke.rotation || 0}deg)`;
    }
    
    startDrag(e) {
        if (this.currentStrokeIndex === null) return;
        
        this.isDragging = true;
        this.dragStartPos = { x: e.clientX, y: e.clientY };
        
        const stroke = this.drawingEngine.strokes[this.currentStrokeIndex];
        const bounds = this.drawingEngine.getStrokeBounds(stroke);
        this.dragStartStrokePos = { x: bounds.x, y: bounds.y };
        
        this.controlBox.style.cursor = 'grabbing';
    }
    
    drag(e) {
        if (!this.isDragging || this.currentStrokeIndex === null) return;
        
        const stroke = this.drawingEngine.strokes[this.currentStrokeIndex];
        if (!stroke) return;
        
        const canvasScale = this.getCanvasScale();
        const deltaX = (e.clientX - this.dragStartPos.x) / canvasScale;
        const deltaY = (e.clientY - this.dragStartPos.y) / canvasScale;
        
        // Move all points in the stroke
        for (let point of stroke.points) {
            if (!point.originalX) {
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
        
        this.isResizing = true;
        this.resizeHandle = handle;
        this.resizeStartPos = { x: e.clientX, y: e.clientY };
        
        const stroke = this.drawingEngine.strokes[this.currentStrokeIndex];
        this.resizeStartBounds = this.drawingEngine.getStrokeBounds(stroke);
        
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
        
        const canvasScale = this.getCanvasScale();
        const deltaX = (e.clientX - this.resizeStartPos.x) / canvasScale;
        const deltaY = (e.clientY - this.resizeStartPos.y) / canvasScale;
        
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
        
        // Scale all points in the stroke
        const scaleX = newBounds.width / startBounds.width;
        const scaleY = newBounds.height / startBounds.height;
        
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
        
        this.isRotating = true;
        const stroke = this.drawingEngine.strokes[this.currentStrokeIndex];
        if (stroke) {
            const rect = this.controlBox.getBoundingClientRect();
            const centerX = rect.left + rect.width / 2;
            const centerY = rect.top + rect.height / 2;
            
            this.rotateStartAngle = Math.atan2(e.clientY - centerY, e.clientX - centerX) * 180 / Math.PI;
            this.rotateStartRotation = stroke.rotation || 0;
            
            // Store original bounds at start of rotation to preserve dimensions
            if (!stroke.originalBounds) {
                stroke.originalBounds = this.drawingEngine.getStrokeBounds(stroke);
            }
            
            // Store original positions for all points
            for (let point of stroke.points) {
                point.originalX = point.x;
                point.originalY = point.y;
            }
        }
    }
    
    rotate(e) {
        if (!this.isRotating || this.currentStrokeIndex === null) return;
        
        const stroke = this.drawingEngine.strokes[this.currentStrokeIndex];
        if (!stroke) return;
        
        const rect = this.controlBox.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;
        
        const currentAngle = Math.atan2(e.clientY - centerY, e.clientX - centerX) * 180 / Math.PI;
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
    
    getCanvasScale() {
        // Helper method to get canvas transform scale
        const computedStyle = window.getComputedStyle(this.canvas);
        const matrix = new DOMMatrix(computedStyle.transform);
        return matrix.a || 1;
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
    }
}
