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
        
        // Default shape properties - only line is supported now
        this.defaultShapeType = 'line'; // Only line type
        this.defaultSize = 100;
        this.defaultColor = '#007AFF';
        this.defaultFillColor = 'rgba(0, 122, 255, 0.2)';
        this.defaultStrokeWidth = 2;
        
        // Manipulation state
        this.isDragging = false;
        this.isResizing = false;
        this.isRotating = false;
        this.isDrawingShape = false; // State for drawing (first click done, waiting for second)
        this.dragStart = { x: 0, y: 0 }; // First click position
        this.previewEnd = { x: 0, y: 0 }; // Current mouse position for preview
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
    
    // Handle mouse click for shape drawing (click-move-click pattern)
    handleShapeClick(e) {
        const { x, y } = this.transformMouseCoords(e);
        
        if (!this.isDrawingShape) {
            // First click - start drawing
            this.isDrawingShape = true;
            this.dragStart = { x, y };
            this.previewEnd = { x, y };
        } else {
            // Second click - finish drawing
            this.finishDrawingShape();
        }
    }
    
    // Update preview as mouse moves
    updateShapePreview(e) {
        if (!this.isDrawingShape) return;
        
        const { x, y } = this.transformMouseCoords(e);
        this.previewEnd = { x, y };
        
        // Redraw canvas with preview
        this.redrawCanvas();
    }
    
    // Draw preview shape (not saved yet)
    drawPreviewShape() {
        if (!this.isDrawingShape) return;
        
        const penColor = this.drawingEngine.currentColor;
        const penSize = this.drawingEngine.penSize;
        const penType = this.drawingEngine.penType;
        
        this.ctx.save();
        
        // Set styles based on pen properties
        this.ctx.strokeStyle = penColor;
        this.ctx.lineWidth = penSize;
        this.ctx.lineCap = 'round';
        this.ctx.lineJoin = 'round';
        
        // Apply pen type alpha
        switch(penType) {
            case 'pencil':
                this.ctx.globalAlpha = 0.7;
                break;
            case 'ballpoint':
                this.ctx.globalAlpha = 0.9;
                break;
            case 'fountain':
                this.ctx.globalAlpha = 1.0;
                break;
            case 'brush':
                this.ctx.globalAlpha = 0.85;
                this.ctx.lineWidth = penSize * 1.5;
                break;
            case 'normal':
            default:
                this.ctx.globalAlpha = 1.0;
                break;
        }
        
        // Add dashed line to indicate preview
        this.ctx.setLineDash([5, 5]);
        
        // Draw line preview (only line type supported)
        this.ctx.beginPath();
        this.ctx.moveTo(this.dragStart.x, this.dragStart.y);
        this.ctx.lineTo(this.previewEnd.x, this.previewEnd.y);
        this.ctx.stroke();
        
        // Draw dots at endpoints
        this.ctx.setLineDash([]);
        this.ctx.fillStyle = penColor;
        this.ctx.beginPath();
        this.ctx.arc(this.dragStart.x, this.dragStart.y, penSize / 2, 0, Math.PI * 2);
        this.ctx.fill();
        this.ctx.beginPath();
        this.ctx.arc(this.previewEnd.x, this.previewEnd.y, penSize / 2, 0, Math.PI * 2);
        this.ctx.fill();
        
        this.ctx.restore();
    }
    
    // Finish drawing shape and add to shapeObjects
    finishDrawingShape() {
        if (!this.isDrawingShape) return;
        
        this.isDrawingShape = false;
        
        const penColor = this.drawingEngine.currentColor;
        const penSize = this.drawingEngine.penSize;
        const penType = this.drawingEngine.penType;
        
        // Calculate actual canvas coordinates
        const startX = this.dragStart.x;
        const startY = this.dragStart.y;
        const endX = this.previewEnd.x;
        const endY = this.previewEnd.y;
        
        // Draw the final line using the drawing engine's stroke system
        // This ensures the line is added as a stroke that can be selected
        const points = [
            { x: startX, y: startY },
            { x: endX, y: endY }
        ];
        
        const stroke = {
            points: points,
            color: penColor,
            size: penSize,
            type: penType,
            tool: 'pen'
        };
        
        // Add stroke to drawing engine's strokes array
        this.drawingEngine.strokes.push(stroke);
        
        // Draw the stroke on canvas
        this.ctx.save();
        this.ctx.strokeStyle = penColor;
        this.ctx.lineWidth = penSize;
        this.ctx.lineCap = 'round';
        this.ctx.lineJoin = 'round';
        
        // Apply pen type alpha
        switch(penType) {
            case 'pencil':
                this.ctx.globalAlpha = 0.7;
                break;
            case 'ballpoint':
                this.ctx.globalAlpha = 0.9;
                break;
            case 'fountain':
                this.ctx.globalAlpha = 1.0;
                break;
            case 'brush':
                this.ctx.globalAlpha = 0.85;
                this.ctx.lineWidth = penSize * 1.5;
                break;
            case 'normal':
            default:
                this.ctx.globalAlpha = 1.0;
                break;
        }
        
        this.ctx.beginPath();
        this.ctx.moveTo(startX, startY);
        this.ctx.lineTo(endX, endY);
        this.ctx.stroke();
        this.ctx.restore();
        
        // Save to history
        if (this.historyManager) {
            this.historyManager.saveState();
        }
        
        // Redraw canvas to remove preview
        this.redrawCanvas();
    }
    
    // Cancel shape drawing
    cancelDrawing() {
        if (this.isDrawingShape) {
            this.isDrawingShape = false;
            this.redrawCanvas();
        }
    }
    
    // Insert shape at mouse position
    insertShape(e) {
        // Handle click for shape drawing
        this.handleShapeClick(e);
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
        
        // Set styles based on pen properties
        this.ctx.strokeStyle = shapeObj.color;
        this.ctx.lineWidth = shapeObj.strokeWidth || shapeObj.size;
        this.ctx.lineCap = 'round';
        this.ctx.lineJoin = 'round';
        
        // Apply pen type alpha based on penType
        const penType = shapeObj.penType || 'normal';
        switch(penType) {
            case 'pencil':
                this.ctx.globalAlpha = 0.7;
                break;
            case 'ballpoint':
                this.ctx.globalAlpha = 0.9;
                break;
            case 'fountain':
                this.ctx.globalAlpha = 1.0;
                break;
            case 'brush':
                this.ctx.globalAlpha = 0.85;
                this.ctx.lineWidth = (shapeObj.strokeWidth || shapeObj.size) * 1.5;
                break;
            case 'normal':
            default:
                this.ctx.globalAlpha = 1.0;
                break;
        }
        
        // Draw based on shape type (only line and rectangle now)
        if (shapeObj.type === 'line') {
            this.ctx.beginPath();
            this.ctx.moveTo(-shapeObj.width / 2, 0);
            this.ctx.lineTo(shapeObj.width / 2, 0);
            this.ctx.stroke();
        } else if (shapeObj.type === 'rectangle') {
            // Draw rectangle outline only (no fill)
            this.ctx.strokeRect(-shapeObj.width / 2, -shapeObj.height / 2, shapeObj.width, shapeObj.height);
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
            if (shapeObj.type === 'line') {
                // For lines, check if point is close to the line segment
                const threshold = (shapeObj.strokeWidth || shapeObj.size || 5) + 5;
                if (localX >= -shapeObj.width / 2 - threshold && localX <= shapeObj.width / 2 + threshold && 
                    Math.abs(localY) <= threshold) {
                    return i;
                }
            } else if (shapeObj.type === 'rectangle') {
                // For rectangles, check bounds
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
        // We draw shape objects, preview (if any), and selection
        this.drawAllShapes();
        this.drawPreviewShape(); // Draw preview if currently drawing
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
}
