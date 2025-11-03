// Drawing Engine Module
// Handles all drawing operations, pen types, and canvas interactions

class DrawingEngine {
    constructor(canvas, ctx) {
        this.canvas = canvas;
        this.ctx = ctx;
        
        // Drawing state
        this.isDrawing = false;
        this.currentColor = '#000000';
        this.penSize = 5;
        this.penType = localStorage.getItem('penType') || 'normal';
        this.eraserSize = 20;
        this.eraserShape = localStorage.getItem('eraserShape') || 'circle';
        this.currentTool = 'pen';
        
        // Drawing buffer
        this.points = [];
        this.lastPoint = null;
        
        // Stroke storage for selection
        this.strokes = [];
        this.selectedStrokeIndex = null;
        
        // Canvas scaling and panning
        this.canvasScale = parseFloat(localStorage.getItem('canvasScale')) || 1.0;
        this.panOffset = { 
            x: parseFloat(localStorage.getItem('panOffsetX')) || 0, 
            y: parseFloat(localStorage.getItem('panOffsetY')) || 0 
        };
        this.isPanning = false;
        this.lastPanPoint = null;
    }
    
    getPosition(e) {
        const rect = this.canvas.getBoundingClientRect();
        // Adjust for canvas scale (CSS transform)
        const scaleX = this.canvas.offsetWidth / rect.width;
        const scaleY = this.canvas.offsetHeight / rect.height;
        
        // Calculate position relative to canvas
        let x = (e.clientX - rect.left) * scaleX;
        let y = (e.clientY - rect.top) * scaleY;
        
        // Clamp to canvas bounds to prevent drawing outside
        x = Math.max(0, Math.min(x, this.canvas.offsetWidth));
        y = Math.max(0, Math.min(y, this.canvas.offsetHeight));
        
        return { x, y };
    }
    
    setupDrawingContext() {
        if (this.currentTool === 'pen') {
            this.ctx.lineCap = 'round';
            this.ctx.lineJoin = 'round';
            this.ctx.globalCompositeOperation = 'source-over';
            this.ctx.strokeStyle = this.currentColor;
            this.ctx.lineWidth = this.penSize;
            
            switch(this.penType) {
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
                    this.ctx.lineWidth = this.penSize * 1.5;
                    break;
                case 'normal':
                default:
                    this.ctx.globalAlpha = 1.0;
                    break;
            }
        } else if (this.currentTool === 'eraser') {
            this.ctx.globalCompositeOperation = 'destination-out';
            this.ctx.strokeStyle = 'rgba(0,0,0,1)';
            this.ctx.lineWidth = this.eraserSize;
            this.ctx.globalAlpha = 1.0;
            
            // Set line cap/join based on eraser shape
            if (this.eraserShape === 'rectangle') {
                this.ctx.lineCap = 'butt';
                this.ctx.lineJoin = 'miter';
            } else {
                this.ctx.lineCap = 'round';
                this.ctx.lineJoin = 'round';
            }
        }
    }
    
    startDrawing(e) {
        this.isDrawing = true;
        const pos = this.getPosition(e);
        this.points = [pos];
        this.lastPoint = pos;
        
        this.setupDrawingContext();
        
        this.ctx.beginPath();
        this.ctx.moveTo(pos.x, pos.y);
        this.ctx.lineTo(pos.x, pos.y);
        this.ctx.stroke();
    }
    
    draw(e) {
        if (!this.isDrawing) return;
        
        const pos = this.getPosition(e);
        
        if (this.lastPoint && 
            Math.abs(pos.x - this.lastPoint.x) < 0.5 && 
            Math.abs(pos.y - this.lastPoint.y) < 0.5) {
            return;
        }
        
        this.points.push(pos);
        
        if (this.points.length >= 2) {
            const lastIndex = this.points.length - 1;
            const prevPoint = this.points[lastIndex - 1];
            const currPoint = this.points[lastIndex];
            
            this.ctx.beginPath();
            this.ctx.moveTo(prevPoint.x, prevPoint.y);
            this.ctx.lineTo(currPoint.x, currPoint.y);
            this.ctx.stroke();
            
            this.lastPoint = currPoint;
        } else {
            this.lastPoint = pos;
        }
    }
    
    stopDrawing() {
        if (this.isDrawing) {
            this.isDrawing = false;
            
            // Save the stroke if it has points
            if (this.points.length > 0) {
                this.strokes.push({
                    points: [...this.points],
                    color: this.currentColor,
                    size: this.penSize,
                    penType: this.penType,
                    tool: this.currentTool
                });
            }
            
            this.points = [];
            this.lastPoint = null;
            return true;
        }
        return false;
    }
    
    startPanning(e) {
        this.isPanning = true;
        this.lastPanPoint = { x: e.clientX, y: e.clientY };
        this.canvas.style.cursor = 'grabbing';
    }
    
    pan(e) {
        if (!this.isPanning || !this.lastPanPoint) return;
        
        // Reduce pan sensitivity with a damping factor
        const dampingFactor = 0.5; // Lower value = less sensitive
        const dx = (e.clientX - this.lastPanPoint.x) / this.canvasScale * dampingFactor;
        const dy = (e.clientY - this.lastPanPoint.y) / this.canvasScale * dampingFactor;
        
        this.panOffset.x += dx;
        this.panOffset.y += dy;
        
        this.lastPanPoint = { x: e.clientX, y: e.clientY };
        
        localStorage.setItem('panOffsetX', this.panOffset.x);
        localStorage.setItem('panOffsetY', this.panOffset.y);
    }
    
    stopPanning() {
        if (this.isPanning) {
            this.isPanning = false;
            this.lastPanPoint = null;
            // Restore cursor based on current tool
            if (this.currentTool === 'pan') {
                this.canvas.style.cursor = 'grab';
            }
            return true;
        }
        return false;
    }
    
    clearCanvas() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.clearStrokes();
    }
    
    setTool(tool) {
        this.currentTool = tool;
    }
    
    setColor(color) {
        this.currentColor = color;
    }
    
    setPenSize(size) {
        this.penSize = size;
    }
    
    setPenType(type) {
        this.penType = type;
        localStorage.setItem('penType', type);
    }
    
    setEraserSize(size) {
        this.eraserSize = size;
    }
    
    setEraserShape(shape) {
        this.eraserShape = shape;
        localStorage.setItem('eraserShape', shape);
    }
    
    // Stroke selection methods
    findStrokeAtPoint(x, y, threshold = 10) {
        // Search strokes in reverse order (most recent first)
        for (let i = this.strokes.length - 1; i >= 0; i--) {
            const stroke = this.strokes[i];
            if (this.isPointNearStroke(x, y, stroke, threshold)) {
                return i;
            }
        }
        return null;
    }
    
    isPointNearStroke(x, y, stroke, threshold) {
        // Check if point is within threshold distance of any segment in the stroke
        for (let i = 0; i < stroke.points.length - 1; i++) {
            const p1 = stroke.points[i];
            const p2 = stroke.points[i + 1];
            const distance = this.distanceToSegment(x, y, p1.x, p1.y, p2.x, p2.y);
            if (distance < threshold) {
                return true;
            }
        }
        return false;
    }
    
    distanceToSegment(px, py, x1, y1, x2, y2) {
        // Calculate perpendicular distance from point to line segment
        const dx = x2 - x1;
        const dy = y2 - y1;
        const lengthSquared = dx * dx + dy * dy;
        
        if (lengthSquared === 0) {
            // Segment is a point
            return Math.sqrt((px - x1) * (px - x1) + (py - y1) * (py - y1));
        }
        
        // Calculate projection parameter
        let t = ((px - x1) * dx + (py - y1) * dy) / lengthSquared;
        t = Math.max(0, Math.min(1, t));
        
        // Calculate closest point on segment
        const closestX = x1 + t * dx;
        const closestY = y1 + t * dy;
        
        // Return distance to closest point
        return Math.sqrt((px - closestX) * (px - closestX) + (py - closestY) * (py - closestY));
    }
    
    selectStroke(index) {
        this.selectedStrokeIndex = index;
    }
    
    deselectStroke() {
        this.selectedStrokeIndex = null;
    }
    
    getStrokeBounds(stroke) {
        if (!stroke || stroke.points.length === 0) return null;
        
        let minX = stroke.points[0].x;
        let minY = stroke.points[0].y;
        let maxX = stroke.points[0].x;
        let maxY = stroke.points[0].y;
        
        for (const point of stroke.points) {
            minX = Math.min(minX, point.x);
            minY = Math.min(minY, point.y);
            maxX = Math.max(maxX, point.x);
            maxY = Math.max(maxY, point.y);
        }
        
        // Add padding based on stroke size
        const padding = stroke.size * 2;
        
        return {
            x: minX - padding,
            y: minY - padding,
            width: maxX - minX + padding * 2,
            height: maxY - minY + padding * 2
        };
    }
    
    drawSelectionBorder() {
        if (this.selectedStrokeIndex === null) return;
        
        const stroke = this.strokes[this.selectedStrokeIndex];
        if (!stroke) return;
        
        const bounds = this.getStrokeBounds(stroke);
        if (!bounds) return;
        
        this.ctx.save();
        this.ctx.strokeStyle = '#999999';
        this.ctx.lineWidth = 2;
        this.ctx.setLineDash([5, 5]);
        this.ctx.globalAlpha = 0.8;
        this.ctx.strokeRect(bounds.x, bounds.y, bounds.width, bounds.height);
        this.ctx.restore();
    }
    
    copySelectedStroke() {
        if (this.selectedStrokeIndex === null) return false;
        
        const stroke = this.strokes[this.selectedStrokeIndex];
        if (!stroke) return false;
        
        // Create a copy with offset
        const copiedStroke = {
            points: stroke.points.map(p => ({ x: p.x + 20, y: p.y + 20 })),
            color: stroke.color,
            size: stroke.size,
            penType: stroke.penType,
            tool: stroke.tool
        };
        
        this.strokes.push(copiedStroke);
        
        // Redraw the copied stroke
        this.redrawStroke(copiedStroke);
        
        // Select the new stroke
        this.selectedStrokeIndex = this.strokes.length - 1;
        
        return true;
    }
    
    deleteSelectedStroke() {
        if (this.selectedStrokeIndex === null) return false;
        
        const stroke = this.strokes[this.selectedStrokeIndex];
        if (!stroke) return false;
        
        // Remove stroke from array
        this.strokes.splice(this.selectedStrokeIndex, 1);
        this.selectedStrokeIndex = null;
        
        return true;
    }
    
    redrawStroke(stroke) {
        this.ctx.save();
        
        // Set up drawing context based on stroke properties
        this.ctx.lineCap = 'round';
        this.ctx.lineJoin = 'round';
        this.ctx.globalCompositeOperation = 'source-over';
        this.ctx.strokeStyle = stroke.color;
        this.ctx.lineWidth = stroke.size;
        
        // Apply pen type settings
        switch(stroke.penType) {
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
                this.ctx.lineWidth = stroke.size * 1.5;
                break;
            case 'normal':
            default:
                this.ctx.globalAlpha = 1.0;
                break;
        }
        
        // Draw the stroke
        if (stroke.points.length > 0) {
            this.ctx.beginPath();
            this.ctx.moveTo(stroke.points[0].x, stroke.points[0].y);
            
            for (let i = 1; i < stroke.points.length; i++) {
                this.ctx.lineTo(stroke.points[i].x, stroke.points[i].y);
            }
            
            this.ctx.stroke();
        }
        
        this.ctx.restore();
    }
    
    clearStrokes() {
        this.strokes = [];
        this.selectedStrokeIndex = null;
    }
}
