// Aboard - Simple Drawing Board Application
// Main application logic with drawing engine, tools, and history management

class DrawingBoard {
    constructor() {
        // Canvas setup
        this.canvas = document.getElementById('canvas');
        this.ctx = this.canvas.getContext('2d', { 
            desynchronized: true // Better performance
        });
        
        // State management
        this.isDrawing = false;
        this.currentTool = 'pen';
        this.currentColor = '#000000';
        this.penSize = 5;
        this.eraserSize = 20;
        
        // Background settings
        this.backgroundColor = localStorage.getItem('backgroundColor') || '#ffffff';
        this.backgroundPattern = localStorage.getItem('backgroundPattern') || 'blank';
        
        // Canvas mode settings
        this.infiniteCanvas = localStorage.getItem('infiniteCanvas') !== 'false';
        this.currentPage = 1;
        this.pages = []; // Store pages when in pagination mode
        
        // UI settings
        this.toolbarSize = parseInt(localStorage.getItem('toolbarSize')) || 50;
        this.controlPosition = localStorage.getItem('controlPosition') || 'top-right';
        this.edgeSnapEnabled = localStorage.getItem('edgeSnapEnabled') !== 'false';
        this.canvasScale = parseFloat(localStorage.getItem('canvasScale')) || 1.0;
        this.edgeSnapDistance = 20; // Distance in pixels for edge snapping
        
        // Dragging state
        this.isDraggingPanel = false;
        this.draggedElement = null;
        this.dragOffset = { x: 0, y: 0 };
        this.draggedElementWidth = 0;
        this.draggedElementHeight = 0;
        
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
        this.loadSettings();
        this.updateUI();
        this.saveState();
    }
    
    resizeCanvas() {
        const rect = this.canvas.getBoundingClientRect();
        const dpr = window.devicePixelRatio || 1;
        
        // Save current canvas state before resize
        const oldWidth = this.canvas.width;
        const oldHeight = this.canvas.height;
        const imageData = this.historyStep >= 0 ? 
            this.ctx.getImageData(0, 0, oldWidth, oldHeight) : null;
        
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
        document.getElementById('background-btn').addEventListener('click', () => this.setTool('background'));
        document.getElementById('clear-btn').addEventListener('click', () => this.confirmClear());
        document.getElementById('settings-btn').addEventListener('click', () => this.openSettings());
        
        // Config close button
        document.getElementById('config-close-btn').addEventListener('click', () => this.closeConfigPanel());
        
        // Color picker
        document.querySelectorAll('.color-btn[data-color]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.currentColor = e.target.dataset.color;
                document.querySelectorAll('.color-btn[data-color]').forEach(b => b.classList.remove('active'));
                e.target.classList.add('active');
            });
        });
        
        // Background color picker
        document.querySelectorAll('.color-btn[data-bg-color]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.backgroundColor = e.target.dataset.bgColor;
                document.querySelectorAll('.color-btn[data-bg-color]').forEach(b => b.classList.remove('active'));
                e.target.classList.add('active');
                this.applyBackground();
            });
        });
        
        // Background pattern buttons
        document.querySelectorAll('.pattern-option-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.backgroundPattern = e.target.dataset.pattern;
                document.querySelectorAll('.pattern-option-btn').forEach(b => b.classList.remove('active'));
                e.target.classList.add('active');
                this.applyBackground();
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
        
        // History and zoom buttons
        document.getElementById('undo-btn').addEventListener('click', () => this.undo());
        document.getElementById('redo-btn').addEventListener('click', () => this.redo());
        document.getElementById('zoom-in-btn').addEventListener('click', () => this.zoomIn());
        document.getElementById('zoom-out-btn').addEventListener('click', () => this.zoomOut());
        
        // Zoom input
        const zoomInput = document.getElementById('zoom-input');
        zoomInput.addEventListener('change', (e) => {
            const value = e.target.value.replace('%', '');
            const scale = parseFloat(value) / 100;
            if (!isNaN(scale) && scale >= 0.5 && scale <= 3.0) {
                this.canvasScale = scale;
                this.applyZoom();
            } else {
                this.updateZoomDisplay();
            }
        });
        zoomInput.addEventListener('focus', (e) => {
            e.target.select();
        });
        
        // Settings modal
        document.getElementById('settings-close-btn').addEventListener('click', () => this.closeSettings());
        
        // Toolbar size slider
        const toolbarSizeSlider = document.getElementById('toolbar-size-slider');
        const toolbarSizeValue = document.getElementById('toolbar-size-value');
        toolbarSizeSlider.addEventListener('input', (e) => {
            this.toolbarSize = parseInt(e.target.value);
            toolbarSizeValue.textContent = this.toolbarSize;
            this.updateToolbarSize();
        });
        
        // Control position buttons
        document.querySelectorAll('.position-option-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const position = e.target.dataset.position;
                this.setControlPosition(position);
            });
        });
        
        // Edge snap checkbox
        document.getElementById('edge-snap-checkbox').addEventListener('change', (e) => {
            this.edgeSnapEnabled = e.target.checked;
            localStorage.setItem('edgeSnapEnabled', this.edgeSnapEnabled);
        });
        
        // Infinite canvas checkbox
        document.getElementById('infinite-canvas-checkbox').addEventListener('change', (e) => {
            this.infiniteCanvas = e.target.checked;
            localStorage.setItem('infiniteCanvas', this.infiniteCanvas);
            this.updateCanvasMode();
        });
        
        // Pagination controls
        document.getElementById('prev-page-btn').addEventListener('click', () => this.prevPage());
        document.getElementById('next-page-btn').addEventListener('click', () => this.nextPage());
        
        // Close modal when clicking outside
        document.getElementById('settings-modal').addEventListener('click', (e) => {
            if (e.target.id === 'settings-modal') {
                this.closeSettings();
            }
        });
        
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
            // Zoom shortcuts
            if (e.key === '+' || e.key === '=') {
                e.preventDefault();
                this.zoomIn();
            } else if (e.key === '-' || e.key === '_') {
                e.preventDefault();
                this.zoomOut();
            } else if (e.key === '0') {
                e.preventDefault();
                this.zoomReset();
            }
            // Escape key to close modals
            if (e.key === 'Escape') {
                this.closeSettings();
                this.closeConfigPanel();
            }
        });
        
        // Draggable panels
        this.setupDraggablePanels();
        
        // Window resize
        window.addEventListener('resize', () => this.resizeCanvas());
    }
    
    getPosition(e) {
        const rect = this.canvas.getBoundingClientRect();
        // Account for canvas scaling
        return {
            x: (e.clientX - rect.left) / this.canvasScale,
            y: (e.clientY - rect.top) / this.canvasScale
        };
    }
    
    startDrawing(e) {
        this.isDrawing = true;
        const pos = this.getPosition(e);
        this.points = [pos];
        this.lastPoint = pos;
        
        // Setup drawing context
        this.setupDrawingContext();
        
        // Draw initial point
        this.ctx.beginPath();
        this.ctx.moveTo(pos.x, pos.y);
        this.ctx.lineTo(pos.x, pos.y);
        this.ctx.stroke();
    }
    
    setupDrawingContext() {
        // Always set line properties
        this.ctx.lineCap = 'round';
        this.ctx.lineJoin = 'round';
        
        if (this.currentTool === 'pen') {
            this.ctx.globalCompositeOperation = 'source-over';
            this.ctx.strokeStyle = this.currentColor;
            this.ctx.lineWidth = this.penSize;
        } else if (this.currentTool === 'eraser') {
            this.ctx.globalCompositeOperation = 'destination-out';
            this.ctx.strokeStyle = 'rgba(0,0,0,1)'; // Eraser needs a stroke style
            this.ctx.lineWidth = this.eraserSize;
        }
    }
    
    draw(e) {
        if (!this.isDrawing) return;
        
        const pos = this.getPosition(e);
        this.points.push(pos);
        
        // Draw immediately for responsiveness
        if (this.points.length >= 2) {
            const lastIndex = this.points.length - 1;
            this.ctx.beginPath();
            this.ctx.moveTo(this.points[lastIndex - 1].x, this.points[lastIndex - 1].y);
            this.ctx.lineTo(this.points[lastIndex].x, this.points[lastIndex].y);
            this.ctx.stroke();
        }
    }
    
    stopDrawing() {
        if (this.isDrawing) {
            this.isDrawing = false;
            this.points = [];
            this.lastPoint = null;
            
            // Save state after drawing
            this.saveState();
        }
    }
    
    setTool(tool) {
        this.currentTool = tool;
        this.updateUI();
    }
    
    closeConfigPanel() {
        document.getElementById('config-area').classList.remove('show');
    }
    
    openSettings() {
        document.getElementById('settings-modal').classList.add('show');
    }
    
    closeSettings() {
        document.getElementById('settings-modal').classList.remove('show');
    }
    
    loadSettings() {
        // Load toolbar size
        document.getElementById('toolbar-size-slider').value = this.toolbarSize;
        document.getElementById('toolbar-size-value').textContent = this.toolbarSize;
        this.updateToolbarSize();
        
        // Load control position
        this.setControlPosition(this.controlPosition);
        
        // Load edge snap setting
        document.getElementById('edge-snap-checkbox').checked = this.edgeSnapEnabled;
        
        // Load infinite canvas setting
        document.getElementById('infinite-canvas-checkbox').checked = this.infiniteCanvas;
        
        // Load background settings
        this.applyBackground();
        
        // Load canvas scale and update zoom display
        this.applyZoom();
        
        // Initialize canvas mode
        this.updateCanvasMode();
    }
    
    updateUI() {
        // Update toolbar buttons
        document.querySelectorAll('.tool-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        
        const configArea = document.getElementById('config-area');
        
        // Hide all config panels first
        document.querySelectorAll('.config-panel').forEach(panel => {
            panel.classList.remove('active');
        });
        
        if (this.currentTool === 'pen') {
            document.getElementById('pen-btn').classList.add('active');
            document.getElementById('pen-config').classList.add('active');
            configArea.classList.add('show');
            this.canvas.style.cursor = 'crosshair';
        } else if (this.currentTool === 'eraser') {
            document.getElementById('eraser-btn').classList.add('active');
            document.getElementById('eraser-config').classList.add('active');
            configArea.classList.add('show');
            this.canvas.style.cursor = 'pointer';
        } else if (this.currentTool === 'background') {
            document.getElementById('background-btn').classList.add('active');
            document.getElementById('background-config').classList.add('active');
            configArea.classList.add('show');
            this.canvas.style.cursor = 'default';
        } else {
            // For other tools, hide config area
            configArea.classList.remove('show');
            this.canvas.style.cursor = 'default';
        }
        
        // Check for collision and adjust position if needed
        this.checkCollision();
        
        // Update history buttons
        document.getElementById('undo-btn').disabled = this.historyStep <= 0;
        document.getElementById('redo-btn').disabled = this.historyStep >= this.history.length - 1;
        
        // Update pagination controls visibility
        const paginationControls = document.getElementById('pagination-controls');
        if (!this.infiniteCanvas) {
            paginationControls.classList.add('show');
            this.updatePaginationUI();
        } else {
            paginationControls.classList.remove('show');
        }
    }
    
    confirmClear() {
        if (confirm('确定要清空画布吗？')) {
            this.clearCanvas(true);
        }
    }
    
    clearCanvas(saveToHistory = true) {
        // Reset to default drawing mode before clearing
        this.ctx.globalCompositeOperation = 'source-over';
        this.ctx.fillStyle = this.backgroundColor;
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Apply background pattern
        this.drawBackgroundPattern();
        
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
    
    // Zoom functions
    zoomIn() {
        this.canvasScale = Math.min(this.canvasScale + 0.1, 3.0);
        this.applyZoom();
    }
    
    zoomOut() {
        this.canvasScale = Math.max(this.canvasScale - 0.1, 0.5);
        this.applyZoom();
    }
    
    applyZoom() {
        this.canvas.style.transform = `scale(${this.canvasScale})`;
        this.canvas.style.transformOrigin = 'center center';
        localStorage.setItem('canvasScale', this.canvasScale);
        this.updateZoomDisplay();
    }
    
    updateZoomDisplay() {
        const zoomInput = document.getElementById('zoom-input');
        zoomInput.value = Math.round(this.canvasScale * 100) + '%';
    }
    
    // Toolbar size update
    updateToolbarSize() {
        const toolbar = document.getElementById('toolbar');
        const buttons = toolbar.querySelectorAll('.tool-btn');
        
        // Size calculation ratios for responsive toolbar scaling
        // These ratios ensure proper proportions at different toolbar sizes
        const PADDING_VERTICAL_RATIO = 5;    // Vertical padding = toolbarSize / 5
        const PADDING_HORIZONTAL_RATIO = 3;  // Horizontal padding = toolbarSize / 3
        const SVG_SIZE_RATIO = 2;            // Icon size = toolbarSize / 2
        const FONT_SIZE_RATIO = 4.5;         // Font size = toolbarSize / 4.5
        
        buttons.forEach(btn => {
            btn.style.padding = `${this.toolbarSize / PADDING_VERTICAL_RATIO}px ${this.toolbarSize / PADDING_HORIZONTAL_RATIO}px`;
            btn.style.minWidth = `${this.toolbarSize}px`;
            
            const svg = btn.querySelector('svg');
            if (svg) {
                const svgSize = this.toolbarSize / SVG_SIZE_RATIO;
                svg.style.width = `${svgSize}px`;
                svg.style.height = `${svgSize}px`;
            }
            
            const span = btn.querySelector('span');
            if (span) {
                span.style.fontSize = `${this.toolbarSize / FONT_SIZE_RATIO}px`;
            }
        });
        
        localStorage.setItem('toolbarSize', this.toolbarSize);
    }
    
    // Control position
    setControlPosition(position) {
        this.controlPosition = position;
        localStorage.setItem('controlPosition', position);
        
        const historyControls = document.getElementById('history-controls');
        historyControls.className = '';
        historyControls.classList.add(position);
        
        // Update active button
        document.querySelectorAll('.position-option-btn').forEach(btn => {
            btn.classList.remove('active');
            if (btn.dataset.position === position) {
                btn.classList.add('active');
            }
        });
    }
    
    // Draggable panels
    setupDraggablePanels() {
        const historyControls = document.getElementById('history-controls');
        const configArea = document.getElementById('config-area');
        
        [historyControls, configArea].forEach(element => {
            element.addEventListener('mousedown', (e) => {
                // Don't drag if clicking on a button or slider
                if (e.target.closest('button') || e.target.closest('input')) return;
                
                this.isDraggingPanel = true;
                this.draggedElement = element;
                
                const rect = element.getBoundingClientRect();
                this.dragOffset.x = e.clientX - rect.left;
                this.dragOffset.y = e.clientY - rect.top;
                
                // Cache element dimensions for performance during drag
                this.draggedElementWidth = rect.width;
                this.draggedElementHeight = rect.height;
                
                element.classList.add('dragging');
                element.style.transition = 'none';
                
                e.preventDefault();
            });
        });
        
        document.addEventListener('mousemove', (e) => {
            if (!this.isDraggingPanel || !this.draggedElement) return;
            
            let x = e.clientX - this.dragOffset.x;
            let y = e.clientY - this.dragOffset.y;
            
            // Apply edge snapping if enabled
            if (this.edgeSnapEnabled) {
                const windowWidth = window.innerWidth;
                const windowHeight = window.innerHeight;
                
                // Snap to left
                if (x < this.edgeSnapDistance) x = 0;
                // Snap to right
                if (x + this.draggedElementWidth > windowWidth - this.edgeSnapDistance) {
                    x = windowWidth - this.draggedElementWidth;
                }
                // Snap to top
                if (y < this.edgeSnapDistance) y = 0;
                // Snap to bottom
                if (y + this.draggedElementHeight > windowHeight - this.edgeSnapDistance) {
                    y = windowHeight - this.draggedElementHeight;
                }
            }
            
            this.draggedElement.style.left = `${x}px`;
            this.draggedElement.style.top = `${y}px`;
            this.draggedElement.style.transform = 'none';
            this.draggedElement.style.right = 'auto';
            this.draggedElement.style.bottom = 'auto';
        });
        
        document.addEventListener('mouseup', () => {
            if (this.isDraggingPanel && this.draggedElement) {
                this.draggedElement.classList.remove('dragging');
                this.draggedElement.style.transition = '';
                this.isDraggingPanel = false;
                this.draggedElement = null;
            }
        });
    }
    
    // Background functions
    applyBackground() {
        this.ctx.globalCompositeOperation = 'source-over';
        this.ctx.fillStyle = this.backgroundColor;
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        this.drawBackgroundPattern();
        
        localStorage.setItem('backgroundColor', this.backgroundColor);
        localStorage.setItem('backgroundPattern', this.backgroundPattern);
        
        // Save to history if we have history
        if (this.historyStep >= 0) {
            this.saveState();
        }
    }
    
    drawBackgroundPattern() {
        if (this.backgroundPattern === 'blank') {
            return; // No pattern needed
        }
        
        this.ctx.save();
        this.ctx.globalCompositeOperation = 'source-over';
        
        const dpr = window.devicePixelRatio || 1;
        
        if (this.backgroundPattern === 'dots') {
            // Draw dot grid pattern
            const spacing = 20 * dpr;
            this.ctx.fillStyle = this.getPatternColor();
            
            for (let x = spacing; x < this.canvas.width; x += spacing) {
                for (let y = spacing; y < this.canvas.height; y += spacing) {
                    this.ctx.beginPath();
                    this.ctx.arc(x, y, 1 * dpr, 0, Math.PI * 2);
                    this.ctx.fill();
                }
            }
        } else if (this.backgroundPattern === 'grid') {
            // Draw line grid pattern
            const spacing = 20 * dpr;
            this.ctx.strokeStyle = this.getPatternColor();
            this.ctx.lineWidth = 0.5 * dpr;
            
            // Vertical lines
            for (let x = spacing; x < this.canvas.width; x += spacing) {
                this.ctx.beginPath();
                this.ctx.moveTo(x, 0);
                this.ctx.lineTo(x, this.canvas.height);
                this.ctx.stroke();
            }
            
            // Horizontal lines
            for (let y = spacing; y < this.canvas.height; y += spacing) {
                this.ctx.beginPath();
                this.ctx.moveTo(0, y);
                this.ctx.lineTo(this.canvas.width, y);
                this.ctx.stroke();
            }
        }
        
        this.ctx.restore();
    }
    
    getPatternColor() {
        // Choose pattern color based on background brightness
        const r = parseInt(this.backgroundColor.slice(1, 3), 16);
        const g = parseInt(this.backgroundColor.slice(3, 5), 16);
        const b = parseInt(this.backgroundColor.slice(5, 7), 16);
        const brightness = (r * 299 + g * 587 + b * 114) / 1000;
        
        return brightness > 128 ? 'rgba(0, 0, 0, 0.1)' : 'rgba(255, 255, 255, 0.1)';
    }
    
    // Canvas mode functions
    updateCanvasMode() {
        const paginationControls = document.getElementById('pagination-controls');
        
        if (this.infiniteCanvas) {
            paginationControls.classList.remove('show');
            // For infinite canvas, just ensure we have the current state
        } else {
            paginationControls.classList.add('show');
            this.initializePagination();
        }
        
        this.updateUI();
    }
    
    initializePagination() {
        // Initialize pagination system if not already done
        if (this.pages.length === 0) {
            // Save current canvas as first page
            const imageData = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
            this.pages.push(imageData);
            this.currentPage = 1;
        }
        this.updatePaginationUI();
    }
    
    updatePaginationUI() {
        document.getElementById('page-indicator').textContent = `第 ${this.currentPage} 页`;
        document.getElementById('prev-page-btn').disabled = this.currentPage <= 1;
        // Next button is never disabled - can always create new page
    }
    
    prevPage() {
        if (this.currentPage > 1) {
            // Save current page
            const imageData = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
            this.pages[this.currentPage - 1] = imageData;
            
            // Load previous page
            this.currentPage--;
            this.ctx.putImageData(this.pages[this.currentPage - 1], 0, 0);
            this.updatePaginationUI();
        }
    }
    
    nextPage() {
        // Save current page
        const imageData = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
        this.pages[this.currentPage - 1] = imageData;
        
        // Move to next page
        this.currentPage++;
        
        if (this.currentPage > this.pages.length) {
            // Create new blank page
            this.clearCanvas(false);
            this.pages.push(this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height));
        } else {
            // Load existing page
            this.ctx.putImageData(this.pages[this.currentPage - 1], 0, 0);
        }
        
        this.updatePaginationUI();
    }
    
    // Collision detection
    checkCollision() {
        const toolbar = document.getElementById('toolbar');
        const configArea = document.getElementById('config-area');
        
        if (!configArea.classList.contains('show')) {
            return; // No collision check needed if config area is hidden
        }
        
        const toolbarRect = toolbar.getBoundingClientRect();
        const configRect = configArea.getBoundingClientRect();
        
        // Check if rectangles overlap
        const overlap = !(
            toolbarRect.right < configRect.left ||
            toolbarRect.left > configRect.right ||
            toolbarRect.bottom < configRect.top ||
            toolbarRect.top > configRect.bottom
        );
        
        if (overlap) {
            // Move config area above toolbar
            const newBottom = window.innerHeight - toolbarRect.top + 20;
            configArea.style.bottom = `${newBottom}px`;
            configArea.style.top = 'auto';
            configArea.style.left = '50%';
            configArea.style.transform = 'translateX(-50%)';
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
