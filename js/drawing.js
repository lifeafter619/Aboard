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
        
        const dx = (e.clientX - this.lastPanPoint.x) / this.canvasScale;
        const dy = (e.clientY - this.lastPanPoint.y) / this.canvasScale;
        
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
}
