// Shape Insertion Module
// Handles shape insertion, editing, and manipulation

class ShapeInsertionManager {
    constructor(canvas, ctx, historyManager, drawingEngine) {
        this.canvas = canvas;
        this.ctx = ctx;
        this.historyManager = historyManager;
        this.drawingEngine = drawingEngine;
        
        // Shape objects storage
        this.shapeObjects = [];
        this.selectedShapeIndex = null;
        
        // Default shape properties
        this.defaultShapeType = 'rectangle';
        this.defaultSize = 100;
        this.defaultColor = '#007AFF';
        this.defaultFillColor = 'rgba(0, 122, 255, 0.2)';
        this.defaultStrokeWidth = 2;
        
        // Manipulation state
        this.isDragging = false;
        this.isResizing = false;
        this.isRotating = false;
        this.isDrawingShape = false; // New state for drag-to-insert
        this.dragStart = { x: 0, y: 0 };
        this.resizeHandle = null;
        this.resizeStartSize = { width: 100, height: 100 };
        this.rotateStartAngle = 0;
        this.rotateStartRotation = 0;
        
        this.HANDLE_SIZE = 8;
        this.ROTATION_HANDLE_DISTANCE = 30;
        this.HANDLE_THRESHOLD = 5;
        this.MIN_SIZE = 20;
        this.MAX_SIZE = 500;
    }
    
    // Helper method to transform mouse coordinates to canvas space
    transformMouseCoords(e) {
        const rect = this.canvas.getBoundingClientRect();
        const scaleX = this.canvas.offsetWidth / rect.width;
        const scaleY = this.canvas.offsetHeight / rect.height;
        
        let x = (e.clientX - rect.left) * scaleX;
        let y = (e.clientY - rect.top) * scaleY;
        
        // Transform coordinates to account for pan offset and scale
        if (this.drawingEngine) {
            x = (x - this.drawingEngine.panOffset.x) / this.drawingEngine.canvasScale;
            y = (y - this.drawingEngine.panOffset.y) / this.drawingEngine.canvasScale;
        }
        
        return { x, y };
    }
    
    // Start drawing a new shape with drag-to-insert
    startDrawingShape(e) {
        const { x, y } = this.transformMouseCoords(e);
        
        this.isDrawingShape = true;
        this.dragStart = { x, y };
        
        // Create a temporary shape with minimal size
        const shapeObj = {
            type: this.defaultShapeType,
            x: x,
            y: y,
            width: 0,
            height: 0,
            rotation: 0,
            color: this.defaultColor,
            fillColor: this.defaultFillColor,
            strokeWidth: this.defaultStrokeWidth
        };
        
        this.shapeObjects.push(shapeObj);
        this.selectedShapeIndex = this.shapeObjects.length - 1;
    }
    
    // Continue drawing shape as user drags
    continueDrawingShape(e) {
        if (!this.isDrawingShape) return;
        
        const { x: currentX, y: currentY } = this.transformMouseCoords(e);
        const shapeObj = this.shapeObjects[this.selectedShapeIndex];
        
        if (!shapeObj) return;
        
        // Calculate dimensions based on drag
        const dx = currentX - this.dragStart.x;
        const dy = currentY - this.dragStart.y;
        
        // Update shape center and size
        shapeObj.x = this.dragStart.x + dx / 2;
        shapeObj.y = this.dragStart.y + dy / 2;
        shapeObj.width = Math.abs(dx);
        shapeObj.height = Math.abs(dy);
        
        // For circles, use the maximum dimension
        if (shapeObj.type === 'circle') {
            const maxDim = Math.max(Math.abs(dx), Math.abs(dy));
            shapeObj.width = maxDim;
            shapeObj.height = maxDim;
        }
        
        // For lines and arrows, calculate rotation based on drag direction
        if (shapeObj.type === 'line' || shapeObj.type === 'arrow') {
            const angle = Math.atan2(dy, dx) * 180 / Math.PI;
            shapeObj.rotation = angle;
            shapeObj.width = Math.sqrt(dx * dx + dy * dy);
            shapeObj.height = 0; // Lines don't have height
        }
        
        // Redraw canvas with the temporary shape
        this.redrawCanvas();
    }
    
    // Helper method to check if shape is too small
    isShapeTooSmall(shapeObj) {
        if (!shapeObj) return true;
        
        // Lines and arrows only need width check
        if (shapeObj.type === 'line' || shapeObj.type === 'arrow') {
            return shapeObj.width < this.MIN_SIZE;
        }
        
        // Other shapes need both width and height checks
        return shapeObj.width < this.MIN_SIZE || shapeObj.height < this.MIN_SIZE;
    }
    
    // Finish drawing shape
    finishDrawingShape() {
        if (!this.isDrawingShape) return;
        
        this.isDrawingShape = false;
        
        const shapeObj = this.shapeObjects[this.selectedShapeIndex];
        
        // If shape is too small, remove it
        if (this.isShapeTooSmall(shapeObj)) {
            this.shapeObjects.splice(this.selectedShapeIndex, 1);
            this.selectedShapeIndex = null;
        } else if (this.historyManager) {
            this.historyManager.saveState();
        }
        
        this.redrawCanvas();
    }
    
    // Insert shape at mouse position (old method - now deprecated in favor of drag-to-insert)
    insertShape(e) {
        // This method is now just initiating the drag-to-insert process
        this.startDrawingShape(e);
    }
    
    // Draw all shape objects
    drawAllShapes() {
        this.shapeObjects.forEach(shapeObj => {
            this.drawShapeObject(shapeObj);
        });
    }
    
    // Draw a single shape object
    drawShapeObject(shapeObj) {
        this.ctx.save();
        
        // Apply transformations
        this.ctx.translate(shapeObj.x, shapeObj.y);
        this.ctx.rotate(shapeObj.rotation * Math.PI / 180);
        
        // Set styles
        this.ctx.strokeStyle = shapeObj.color;
        this.ctx.fillStyle = shapeObj.fillColor;
        this.ctx.lineWidth = shapeObj.strokeWidth;
        
        // Draw based on shape type
        if (shapeObj.type === 'rectangle') {
            this.ctx.fillRect(-shapeObj.width / 2, -shapeObj.height / 2, shapeObj.width, shapeObj.height);
            this.ctx.strokeRect(-shapeObj.width / 2, -shapeObj.height / 2, shapeObj.width, shapeObj.height);
        } else if (shapeObj.type === 'circle') {
            const radius = Math.min(shapeObj.width, shapeObj.height) / 2;
            this.ctx.beginPath();
            this.ctx.arc(0, 0, radius, 0, Math.PI * 2);
            this.ctx.fill();
            this.ctx.stroke();
        } else if (shapeObj.type === 'ellipse') {
            this.ctx.beginPath();
            this.ctx.ellipse(0, 0, shapeObj.width / 2, shapeObj.height / 2, 0, 0, Math.PI * 2);
            this.ctx.fill();
            this.ctx.stroke();
        } else if (shapeObj.type === 'triangle') {
            this.ctx.beginPath();
            this.ctx.moveTo(0, -shapeObj.height / 2);
            this.ctx.lineTo(shapeObj.width / 2, shapeObj.height / 2);
            this.ctx.lineTo(-shapeObj.width / 2, shapeObj.height / 2);
            this.ctx.closePath();
            this.ctx.fill();
            this.ctx.stroke();
        } else if (shapeObj.type === 'line') {
            this.ctx.beginPath();
            this.ctx.moveTo(-shapeObj.width / 2, 0);
            this.ctx.lineTo(shapeObj.width / 2, 0);
            this.ctx.stroke();
        } else if (shapeObj.type === 'arrow') {
            const headLength = 15;
            const headWidth = 10;
            this.ctx.beginPath();
            this.ctx.moveTo(-shapeObj.width / 2, 0);
            this.ctx.lineTo(shapeObj.width / 2 - headLength, 0);
            this.ctx.stroke();
            // Arrow head
            this.ctx.beginPath();
            this.ctx.moveTo(shapeObj.width / 2, 0);
            this.ctx.lineTo(shapeObj.width / 2 - headLength, -headWidth);
            this.ctx.lineTo(shapeObj.width / 2 - headLength, headWidth);
            this.ctx.closePath();
            this.ctx.fill();
        }
        
        this.ctx.restore();
    }
    
    // Draw selection handles for selected shape
    drawShapeSelection() {
        if (this.selectedShapeIndex === null || this.selectedShapeIndex < 0) return;
        
        const shapeObj = this.shapeObjects[this.selectedShapeIndex];
        if (!shapeObj) return;
        
        this.ctx.save();
        
        // Draw bounding box
        this.ctx.translate(shapeObj.x, shapeObj.y);
        this.ctx.rotate(shapeObj.rotation * Math.PI / 180);
        
        const width = shapeObj.width;
        const height = shapeObj.height;
        
        // Draw box
        this.ctx.strokeStyle = '#007AFF';
        this.ctx.lineWidth = 2;
        this.ctx.setLineDash([5, 5]);
        this.ctx.strokeRect(-width / 2 - 5, -height / 2 - 5, width + 10, height + 10);
        this.ctx.setLineDash([]);
        
        // Draw corner handles
        this.ctx.fillStyle = '#007AFF';
        const handleSize = this.HANDLE_SIZE;
        
        // Top-left
        this.ctx.fillRect(-width / 2 - 5 - handleSize / 2, -height / 2 - 5 - handleSize / 2, handleSize, handleSize);
        // Top-right
        this.ctx.fillRect(width / 2 + 5 - handleSize / 2, -height / 2 - 5 - handleSize / 2, handleSize, handleSize);
        // Bottom-left
        this.ctx.fillRect(-width / 2 - 5 - handleSize / 2, height / 2 + 5 - handleSize / 2, handleSize, handleSize);
        // Bottom-right
        this.ctx.fillRect(width / 2 + 5 - handleSize / 2, height / 2 + 5 - handleSize / 2, handleSize, handleSize);
        
        // Draw rotation handle
        this.ctx.beginPath();
        this.ctx.arc(0, -height / 2 - this.ROTATION_HANDLE_DISTANCE, handleSize / 2, 0, Math.PI * 2);
        this.ctx.fill();
        this.ctx.beginPath();
        this.ctx.moveTo(0, -height / 2 - 5);
        this.ctx.lineTo(0, -height / 2 - this.ROTATION_HANDLE_DISTANCE + handleSize / 2);
        this.ctx.stroke();
        
        this.ctx.restore();
    }
    
    // Check if point is near shape object
    hitTestShape(x, y) {
        for (let i = this.shapeObjects.length - 1; i >= 0; i--) {
            const shapeObj = this.shapeObjects[i];
            
            // Transform point to shape's local space
            const dx = x - shapeObj.x;
            const dy = y - shapeObj.y;
            
            const cos = Math.cos(-shapeObj.rotation * Math.PI / 180);
            const sin = Math.sin(-shapeObj.rotation * Math.PI / 180);
            
            const localX = dx * cos - dy * sin;
            const localY = dx * sin + dy * cos;
            
            // Check if point is inside shape bounds
            if (shapeObj.type === 'circle') {
                const radius = Math.min(shapeObj.width, shapeObj.height) / 2;
                if (Math.sqrt(localX * localX + localY * localY) <= radius + 5) {
                    return i;
                }
            } else if (shapeObj.type === 'ellipse') {
                const rx = shapeObj.width / 2;
                const ry = shapeObj.height / 2;
                if ((localX * localX) / (rx * rx) + (localY * localY) / (ry * ry) <= 1.1) {
                    return i;
                }
            } else {
                // Rectangle, triangle, line, arrow
                if (localX >= -shapeObj.width / 2 - 5 && localX <= shapeObj.width / 2 + 5 && 
                    localY >= -shapeObj.height / 2 - 5 && localY <= shapeObj.height / 2 + 5) {
                    return i;
                }
            }
        }
        return -1;
    }
    
    // Select shape object
    selectShape(index) {
        this.selectedShapeIndex = index;
        this.redrawCanvas();
    }
    
    // Deselect shape
    deselectShape() {
        this.selectedShapeIndex = null;
        this.redrawCanvas();
    }
    
    // Copy selected shape
    copySelectedShape() {
        if (this.selectedShapeIndex === null || this.selectedShapeIndex < 0) return false;
        
        const shapeObj = this.shapeObjects[this.selectedShapeIndex];
        if (!shapeObj) return false;
        
        // Create a copy with offset
        const copy = {
            ...shapeObj,
            x: shapeObj.x + 20,
            y: shapeObj.y + 20
        };
        
        this.shapeObjects.push(copy);
        this.selectedShapeIndex = this.shapeObjects.length - 1;
        this.redrawCanvas();
        
        if (this.historyManager) {
            this.historyManager.saveState();
        }
        
        return true;
    }
    
    // Delete selected shape
    deleteSelectedShape() {
        if (this.selectedShapeIndex === null || this.selectedShapeIndex < 0) return false;
        
        this.shapeObjects.splice(this.selectedShapeIndex, 1);
        this.selectedShapeIndex = null;
        this.redrawCanvas();
        
        if (this.historyManager) {
            this.historyManager.saveState();
        }
        
        return true;
    }
    
    // Start dragging selected shape
    startDrag(e) {
        if (this.selectedShapeIndex === null || this.selectedShapeIndex < 0) return;
        
        const { x, y } = this.transformMouseCoords(e);
        
        // Check if clicking on a handle
        const handle = this.hitTestHandle(x, y);
        if (handle === 'rotate') {
            this.startRotate(e);
            return;
        } else if (handle && handle.startsWith('resize-')) {
            this.startResize(e, handle);
            return;
        }
        
        // Otherwise start dragging
        this.isDragging = true;
        this.dragStart = { x, y };
    }
    
    // Drag shape
    dragShape(e) {
        if (this.selectedShapeIndex === null) return;
        
        if (this.isResizing) {
            this.resizeShape(e);
        } else if (this.isRotating) {
            this.rotateShape(e);
        } else if (this.isDragging) {
            const { x: currentX, y: currentY } = this.transformMouseCoords(e);
            
            const dx = currentX - this.dragStart.x;
            const dy = currentY - this.dragStart.y;
            
            const shapeObj = this.shapeObjects[this.selectedShapeIndex];
            shapeObj.x += dx;
            shapeObj.y += dy;
            
            this.dragStart = { x: currentX, y: currentY };
            this.redrawCanvas();
        }
    }
    
    // Stop dragging
    stopDrag() {
        if (this.isDragging || this.isResizing || this.isRotating) {
            this.isDragging = false;
            this.isResizing = false;
            this.isRotating = false;
            this.resizeHandle = null;
            if (this.historyManager) {
                this.historyManager.saveState();
            }
        }
    }
    
    // Check if click is on a handle
    hitTestHandle(x, y) {
        if (this.selectedShapeIndex === null || this.selectedShapeIndex < 0) return null;
        
        const shapeObj = this.shapeObjects[this.selectedShapeIndex];
        if (!shapeObj) return null;
        
        // Transform point to shape's local space
        const dx = x - shapeObj.x;
        const dy = y - shapeObj.y;
        
        const cos = Math.cos(-shapeObj.rotation * Math.PI / 180);
        const sin = Math.sin(-shapeObj.rotation * Math.PI / 180);
        
        const localX = dx * cos - dy * sin;
        const localY = dx * sin + dy * cos;
        
        const width = shapeObj.width;
        const height = shapeObj.height;
        const handleSize = this.HANDLE_SIZE;
        const threshold = handleSize + this.HANDLE_THRESHOLD;
        
        // Check rotation handle
        if (Math.abs(localX) < threshold && 
            Math.abs(localY - (-height / 2 - this.ROTATION_HANDLE_DISTANCE)) < threshold) {
            return 'rotate';
        }
        
        // Check corner handles for resizing
        if (Math.abs(localX - (-width / 2 - 5)) < threshold && Math.abs(localY - (-height / 2 - 5)) < threshold) {
            return 'resize-tl';
        }
        if (Math.abs(localX - (width / 2 + 5)) < threshold && Math.abs(localY - (-height / 2 - 5)) < threshold) {
            return 'resize-tr';
        }
        if (Math.abs(localX - (-width / 2 - 5)) < threshold && Math.abs(localY - (height / 2 + 5)) < threshold) {
            return 'resize-bl';
        }
        if (Math.abs(localX - (width / 2 + 5)) < threshold && Math.abs(localY - (height / 2 + 5)) < threshold) {
            return 'resize-br';
        }
        
        return null;
    }
    
    // Start resize
    startResize(e, handle) {
        this.isResizing = true;
        this.resizeHandle = handle;
        const { x, y } = this.transformMouseCoords(e);
        this.dragStart = { x, y };
        
        const shapeObj = this.shapeObjects[this.selectedShapeIndex];
        this.resizeStartSize = { width: shapeObj.width, height: shapeObj.height };
    }
    
    // Resize shape
    resizeShape(e) {
        if (!this.isResizing || this.selectedShapeIndex === null) return;
        
        const { x: currentX, y: currentY } = this.transformMouseCoords(e);
        
        const dx = currentX - this.dragStart.x;
        const dy = currentY - this.dragStart.y;
        
        const shapeObj = this.shapeObjects[this.selectedShapeIndex];
        
        // Transform delta to local space
        const cos = Math.cos(-shapeObj.rotation * Math.PI / 180);
        const sin = Math.sin(-shapeObj.rotation * Math.PI / 180);
        
        const localDx = dx * cos - dy * sin;
        const localDy = dx * sin + dy * cos;
        
        // Update size based on handle
        if (this.resizeHandle === 'resize-br') {
            shapeObj.width = Math.max(this.MIN_SIZE, Math.min(this.MAX_SIZE, this.resizeStartSize.width + localDx * 2));
            shapeObj.height = Math.max(this.MIN_SIZE, Math.min(this.MAX_SIZE, this.resizeStartSize.height + localDy * 2));
        } else if (this.resizeHandle === 'resize-tr') {
            shapeObj.width = Math.max(this.MIN_SIZE, Math.min(this.MAX_SIZE, this.resizeStartSize.width + localDx * 2));
            shapeObj.height = Math.max(this.MIN_SIZE, Math.min(this.MAX_SIZE, this.resizeStartSize.height - localDy * 2));
        } else if (this.resizeHandle === 'resize-bl') {
            shapeObj.width = Math.max(this.MIN_SIZE, Math.min(this.MAX_SIZE, this.resizeStartSize.width - localDx * 2));
            shapeObj.height = Math.max(this.MIN_SIZE, Math.min(this.MAX_SIZE, this.resizeStartSize.height + localDy * 2));
        } else if (this.resizeHandle === 'resize-tl') {
            shapeObj.width = Math.max(this.MIN_SIZE, Math.min(this.MAX_SIZE, this.resizeStartSize.width - localDx * 2));
            shapeObj.height = Math.max(this.MIN_SIZE, Math.min(this.MAX_SIZE, this.resizeStartSize.height - localDy * 2));
        }
        
        this.redrawCanvas();
    }
    
    // Start rotation
    startRotate(e) {
        this.isRotating = true;
        const shapeObj = this.shapeObjects[this.selectedShapeIndex];
        
        const { x: mouseX, y: mouseY } = this.transformMouseCoords(e);
        
        this.rotateStartAngle = Math.atan2(mouseY - shapeObj.y, mouseX - shapeObj.x) * 180 / Math.PI;
        this.rotateStartRotation = shapeObj.rotation;
    }
    
    // Rotate shape
    rotateShape(e) {
        if (!this.isRotating || this.selectedShapeIndex === null) return;
        
        const shapeObj = this.shapeObjects[this.selectedShapeIndex];
        
        const { x: mouseX, y: mouseY } = this.transformMouseCoords(e);
        
        const currentAngle = Math.atan2(mouseY - shapeObj.y, mouseX - shapeObj.x) * 180 / Math.PI;
        const angleDelta = currentAngle - this.rotateStartAngle;
        
        shapeObj.rotation = this.rotateStartRotation + angleDelta;
        
        // Normalize to 0-360
        while (shapeObj.rotation < 0) shapeObj.rotation += 360;
        while (shapeObj.rotation >= 360) shapeObj.rotation -= 360;
        
        this.redrawCanvas();
    }
    
    // Redraw canvas with all shape objects
    redrawCanvas() {
        // This will be called by main app to trigger full redraw
        // We just draw shape objects and selection
        this.drawAllShapes();
        this.drawShapeSelection();
    }
    
    // Get all shape objects for serialization
    getShapeObjects() {
        return this.shapeObjects;
    }
    
    // Set shape objects (for loading)
    setShapeObjects(objects) {
        this.shapeObjects = objects || [];
        this.redrawCanvas();
    }
    
    // Clear all shape objects
    clearAllShapes() {
        this.shapeObjects = [];
        this.selectedShapeIndex = null;
    }
    
    // Check if has selected shape
    hasSelection() {
        return this.selectedShapeIndex !== null && this.selectedShapeIndex >= 0;
    }
    
    // Set default shape properties from UI
    setShapeType(type) {
        this.defaultShapeType = type;
    }
    
    setShapeColor(color) {
        this.defaultColor = color;
        // Update fill color with transparency
        const rgb = this.hexToRgb(color);
        this.defaultFillColor = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.2)`;
        
        // If a shape is selected, update its colors
        if (this.selectedShapeIndex !== null && this.selectedShapeIndex >= 0) {
            const shapeObj = this.shapeObjects[this.selectedShapeIndex];
            shapeObj.color = color;
            shapeObj.fillColor = this.defaultFillColor;
            this.redrawCanvas();
            if (this.historyManager) {
                this.historyManager.saveState();
            }
        }
    }
    
    // Helper to convert hex to RGB
    hexToRgb(hex) {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? {
            r: parseInt(result[1], 16),
            g: parseInt(result[2], 16),
            b: parseInt(result[3], 16)
        } : { r: 0, g: 122, b: 255 };
    }
}
