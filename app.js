// Aboard - Simple Drawing Board Application
// Main application logic with drawing engine, tools, and history management

class DrawingBoard {
    constructor() {
        // Canvas setup
        this.canvas = document.getElementById('canvas');
        this.ctx = this.canvas.getContext('2d', { 
            alpha: false,
            desynchronized: true // Better performance
        });
        
        // State management
        this.isDrawing = false;
        this.currentTool = 'pen';
        this.currentColor = '#000000';
        this.penSize = 5;
        this.eraserSize = 20;
        
        // History management for undo/redo
        this.history = [];
        this.historyStep = -1;
        this.maxHistory = 50;
        
        // Drawing state
        this.points = [];
        this.lastPoint = null;
        
        // Initialize
        this.resizeCanvas();
        this.setupEventListeners();
        this.updateUI();
        this.saveState();
        
        // Performance optimization
        this.rafId = null;
        this.pendingDraw = false;
    }
    
    resizeCanvas() {
        const rect = this.canvas.getBoundingClientRect();
        const dpr = window.devicePixelRatio || 1;
        
        // Save current canvas state before resize
        const imageData = this.historyStep >= 0 ? 
            this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height) : null;
        
        // Set canvas size
        this.canvas.width = rect.width * dpr;
        this.canvas.height = rect.height * dpr;
        this.canvas.style.width = rect.width + 'px';
        this.canvas.style.height = rect.height + 'px';
        
        // Scale context for high DPI displays
        this.ctx.scale(dpr, dpr);
        
        // Restore canvas state after resize
        if (imageData) {
            this.ctx.putImageData(imageData, 0, 0);
        } else {
            this.clearCanvas(false); // Clear without saving to history
        }
    }
    
    setupEventListeners() {
        // Canvas drawing events
        // Mouse events
        this.canvas.addEventListener('mousedown', (e) => this.startDrawing(e));
        this.canvas.addEventListener('mousemove', (e) => this.draw(e));
        this.canvas.addEventListener('mouseup', () => this.stopDrawing());
        this.canvas.addEventListener('mouseout', () => this.stopDrawing());
        
        // Touch events
        this.canvas.addEventListener('touchstart', (e) => {
            e.preventDefault();
            this.startDrawing(e.touches[0]);
        }, { passive: false });
        
        this.canvas.addEventListener('touchmove', (e) => {
            e.preventDefault();
            this.draw(e.touches[0]);
        }, { passive: false });
        
        this.canvas.addEventListener('touchend', (e) => {
            e.preventDefault();
            this.stopDrawing();
        }, { passive: false });
        
        // Toolbar buttons
        document.getElementById('pen-btn').addEventListener('click', () => this.setTool('pen'));
        document.getElementById('eraser-btn').addEventListener('click', () => this.setTool('eraser'));
        document.getElementById('clear-btn').addEventListener('click', () => this.confirmClear());
        
        // Color picker
        document.querySelectorAll('.color-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.currentColor = e.target.dataset.color;
                document.querySelectorAll('.color-btn').forEach(b => b.classList.remove('active'));
                e.target.classList.add('active');
            });
        });
        
        // Pen size slider
        const penSizeSlider = document.getElementById('pen-size-slider');
        const penSizeValue = document.getElementById('pen-size-value');
        penSizeSlider.addEventListener('input', (e) => {
            this.penSize = parseInt(e.target.value);
            penSizeValue.textContent = this.penSize;
        });
        
        // Eraser size slider
        const eraserSizeSlider = document.getElementById('eraser-size-slider');
        const eraserSizeValue = document.getElementById('eraser-size-value');
        eraserSizeSlider.addEventListener('input', (e) => {
            this.eraserSize = parseInt(e.target.value);
            eraserSizeValue.textContent = this.eraserSize;
        });
        
        // History buttons
        document.getElementById('undo-btn').addEventListener('click', () => this.undo());
        document.getElementById('redo-btn').addEventListener('click', () => this.redo());
        
        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            if (e.ctrlKey || e.metaKey) {
                if (e.key === 'z' && !e.shiftKey) {
                    e.preventDefault();
                    this.undo();
                } else if (e.key === 'y' || (e.key === 'z' && e.shiftKey)) {
                    e.preventDefault();
                    this.redo();
                }
            }
        });
        
        // Window resize
        window.addEventListener('resize', () => this.resizeCanvas());
    }
    
    getPosition(e) {
        const rect = this.canvas.getBoundingClientRect();
        return {
            x: e.clientX - rect.left,
            y: e.clientY - rect.top
        };
    }
    
    startDrawing(e) {
        this.isDrawing = true;
        const pos = this.getPosition(e);
        this.points = [pos];
        this.lastPoint = pos;
        
        // Draw initial point
        this.ctx.lineCap = 'round';
        this.ctx.lineJoin = 'round';
        
        if (this.currentTool === 'pen') {
            this.ctx.globalCompositeOperation = 'source-over';
            this.ctx.strokeStyle = this.currentColor;
            this.ctx.lineWidth = this.penSize;
        } else if (this.currentTool === 'eraser') {
            this.ctx.globalCompositeOperation = 'destination-out';
            this.ctx.lineWidth = this.eraserSize;
        }
        
        this.ctx.beginPath();
        this.ctx.moveTo(pos.x, pos.y);
        this.ctx.lineTo(pos.x, pos.y);
        this.ctx.stroke();
    }
    
    draw(e) {
        if (!this.isDrawing) return;
        
        const pos = this.getPosition(e);
        this.points.push(pos);
        
        // Use requestAnimationFrame for smooth rendering
        if (!this.pendingDraw) {
            this.pendingDraw = true;
            this.rafId = requestAnimationFrame(() => {
                this.renderStroke();
                this.pendingDraw = false;
            });
        }
    }
    
    renderStroke() {
        if (this.points.length < 2) return;
        
        // Apply stroke smoothing using quadratic curves
        const points = this.points;
        
        if (points.length >= 3) {
            // Draw smooth curve through points
            for (let i = 1; i < points.length - 1; i++) {
                const start = points[i - 1];
                const control = points[i];
                const end = points[i + 1];
                
                // Calculate midpoint for smoother curves
                const midX = (control.x + end.x) / 2;
                const midY = (control.y + end.y) / 2;
                
                this.ctx.beginPath();
                this.ctx.moveTo(start.x, start.y);
                this.ctx.quadraticCurveTo(control.x, control.y, midX, midY);
                this.ctx.stroke();
            }
        } else {
            // Draw straight line for first segment
            const start = points[points.length - 2];
            const end = points[points.length - 1];
            
            this.ctx.beginPath();
            this.ctx.moveTo(start.x, start.y);
            this.ctx.lineTo(end.x, end.y);
            this.ctx.stroke();
        }
        
        // Keep only recent points for smoothing
        if (this.points.length > 10) {
            this.points = this.points.slice(-10);
        }
    }
    
    stopDrawing() {
        if (this.isDrawing) {
            this.isDrawing = false;
            this.points = [];
            this.lastPoint = null;
            
            // Cancel any pending animation frame
            if (this.rafId) {
                cancelAnimationFrame(this.rafId);
                this.rafId = null;
            }
            
            // Save state after drawing
            this.saveState();
        }
    }
    
    setTool(tool) {
        this.currentTool = tool;
        this.updateUI();
    }
    
    updateUI() {
        // Update toolbar buttons
        document.querySelectorAll('.tool-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        
        if (this.currentTool === 'pen') {
            document.getElementById('pen-btn').classList.add('active');
            document.getElementById('pen-config').classList.add('active');
            document.getElementById('eraser-config').classList.remove('active');
            this.canvas.style.cursor = 'crosshair';
        } else if (this.currentTool === 'eraser') {
            document.getElementById('eraser-btn').classList.add('active');
            document.getElementById('pen-config').classList.remove('active');
            document.getElementById('eraser-config').classList.add('active');
            this.canvas.style.cursor = 'pointer';
        }
        
        // Update history buttons
        document.getElementById('undo-btn').disabled = this.historyStep <= 0;
        document.getElementById('redo-btn').disabled = this.historyStep >= this.history.length - 1;
    }
    
    confirmClear() {
        if (confirm('确定要清空画布吗？此操作不可撤销。')) {
            this.clearCanvas(true);
        }
    }
    
    clearCanvas(saveToHistory = true) {
        this.ctx.fillStyle = '#ffffff';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        if (saveToHistory) {
            this.saveState();
        }
    }
    
    saveState() {
        // Remove any states after current step
        this.history = this.history.slice(0, this.historyStep + 1);
        
        // Save current canvas state
        const imageData = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
        this.history.push(imageData);
        this.historyStep++;
        
        // Limit history size
        if (this.history.length > this.maxHistory) {
            this.history.shift();
            this.historyStep--;
        }
        
        this.updateUI();
    }
    
    undo() {
        if (this.historyStep > 0) {
            this.historyStep--;
            this.restoreState();
        }
    }
    
    redo() {
        if (this.historyStep < this.history.length - 1) {
            this.historyStep++;
            this.restoreState();
        }
    }
    
    restoreState() {
        if (this.historyStep >= 0 && this.historyStep < this.history.length) {
            const imageData = this.history[this.historyStep];
            this.ctx.putImageData(imageData, 0, 0);
            this.updateUI();
        }
    }
}

// Initialize the application when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        new DrawingBoard();
    });
} else {
    new DrawingBoard();
}
