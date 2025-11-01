// Aboard - Simple Drawing Board Application
// Main application logic with drawing engine, tools, and history management

class DrawingBoard {
    constructor() {
        // Canvas setup
        this.canvas = document.getElementById('canvas');
        this.ctx = this.canvas.getContext('2d', { 
            desynchronized: true, // Better performance
            alpha: true // Enable transparency
        });
        
        // Background canvas setup
        this.bgCanvas = document.getElementById('background-canvas');
        this.bgCtx = this.bgCanvas.getContext('2d');
        
        // Eraser cursor element
        this.eraserCursor = document.getElementById('eraser-cursor');
        
        // State management
        this.isDrawing = false;
        this.currentTool = 'pen';
        this.currentColor = localStorage.getItem('penColor') || '#000000';
        this.penSize = parseInt(localStorage.getItem('penSize')) || 5;
        this.penType = localStorage.getItem('penType') || 'normal';
        this.eraserSize = parseInt(localStorage.getItem('eraserSize')) || 20;
        
        // Background settings
        this.backgroundColor = localStorage.getItem('backgroundColor') || '#ffffff';
        this.backgroundPattern = localStorage.getItem('backgroundPattern') || 'blank';
        this.bgOpacity = parseFloat(localStorage.getItem('bgOpacity')) || 1.0;
        this.patternIntensity = parseFloat(localStorage.getItem('patternIntensity')) || 0.5;
        
        // Canvas mode settings
        this.infiniteCanvas = localStorage.getItem('infiniteCanvas') !== 'false';
        this.currentPage = 1;
        this.pages = []; // Store pages when in pagination mode
        
        // UI settings
        this.toolbarSize = parseInt(localStorage.getItem('toolbarSize')) || 50;
        this.configScale = parseFloat(localStorage.getItem('configScale')) || 1.0;
        this.controlPosition = localStorage.getItem('controlPosition') || 'top-right';
        this.edgeSnapEnabled = localStorage.getItem('edgeSnapEnabled') !== 'false';
        this.canvasScale = parseFloat(localStorage.getItem('canvasScale')) || 1.0;
        this.edgeSnapDistance = 20; // Distance in pixels for edge snapping
        this.configAutoOpenDisabled = false; // Track if auto-open is disabled after drawing
        
        // Infinite canvas pan state
        this.panOffset = { 
            x: parseFloat(localStorage.getItem('panOffsetX')) || 0, 
            y: parseFloat(localStorage.getItem('panOffsetY')) || 0 
        };
        this.isPanning = false;
        this.lastPanPoint = null;
        
        // Two-finger touch pan state
        this.isTwoFingerPanning = false;
        this.lastTwoFingerMidpoint = null;
        
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
        
        // Set canvas size for both layers
        this.canvas.width = rect.width * dpr;
        this.canvas.height = rect.height * dpr;
        this.canvas.style.width = rect.width + 'px';
        this.canvas.style.height = rect.height + 'px';
        
        this.bgCanvas.width = rect.width * dpr;
        this.bgCanvas.height = rect.height * dpr;
        this.bgCanvas.style.width = rect.width + 'px';
        this.bgCanvas.style.height = rect.height + 'px';
        
        // Scale context for high DPI displays
        this.ctx.scale(dpr, dpr);
        this.bgCtx.scale(dpr, dpr);
        
        // Restore canvas state after resize
        if (imageData) {
            this.ctx.putImageData(imageData, 0, 0);
        }
        
        // Always redraw background
        this.drawBackground();
    }
    
    setupEventListeners() {
        // Canvas drawing events
        // Mouse events
        this.canvas.addEventListener('mousedown', (e) => {
            if (e.button === 1 || (e.button === 0 && e.shiftKey) || this.currentTool === 'pan') {
                // Middle mouse button, Shift+Left click, or pan tool for panning
                this.startPanning(e);
            } else {
                this.startDrawing(e);
            }
        });
        this.canvas.addEventListener('mousemove', (e) => {
            if (this.isPanning) {
                this.pan(e);
            } else {
                this.draw(e);
                this.updateEraserCursor(e);
            }
        });
        this.canvas.addEventListener('mouseup', () => {
            this.stopDrawing();
            this.stopPanning();
        });
        this.canvas.addEventListener('mouseout', () => {
            this.stopDrawing();
            this.stopPanning();
            this.hideEraserCursor();
        });
        this.canvas.addEventListener('mouseenter', (e) => {
            if (this.currentTool === 'eraser') {
                this.showEraserCursor();
            }
        });
        
        // Touch events
        this.canvas.addEventListener('touchstart', (e) => {
            e.preventDefault();
            if (e.touches.length === 2) {
                // Two-finger touch for panning
                this.startTwoFingerPan(e);
            } else if (e.touches.length === 1) {
                this.startDrawing(e.touches[0]);
            }
        }, { passive: false });
        
        this.canvas.addEventListener('touchmove', (e) => {
            e.preventDefault();
            if (e.touches.length === 2) {
                // Two-finger pan
                this.twoFingerPan(e);
            } else if (e.touches.length === 1 && !this.isTwoFingerPanning) {
                this.draw(e.touches[0]);
            }
        }, { passive: false });
        
        this.canvas.addEventListener('touchend', (e) => {
            e.preventDefault();
            if (e.touches.length === 0) {
                this.stopDrawing();
                this.stopTwoFingerPan();
            }
        }, { passive: false });
        
        // Toolbar buttons
        document.getElementById('pen-btn').addEventListener('click', () => this.setTool('pen'));
        document.getElementById('pan-btn').addEventListener('click', () => this.setTool('pan'));
        document.getElementById('eraser-btn').addEventListener('click', () => this.setTool('eraser'));
        document.getElementById('background-btn').addEventListener('click', () => this.setTool('background'));
        document.getElementById('clear-btn').addEventListener('click', () => this.confirmClear());
        document.getElementById('settings-btn').addEventListener('click', () => this.openSettings());
        
        // Config close button
        document.getElementById('config-close-btn').addEventListener('click', () => this.closeConfigPanel());
        
        // Pen type buttons
        document.querySelectorAll('.pen-type-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.penType = e.target.dataset.penType;
                document.querySelectorAll('.pen-type-btn').forEach(b => b.classList.remove('active'));
                e.target.classList.add('active');
                localStorage.setItem('penType', this.penType);
            });
        });
        
        // Color picker
        document.querySelectorAll('.color-btn[data-color]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.currentColor = e.target.dataset.color;
                document.querySelectorAll('.color-btn[data-color]').forEach(b => b.classList.remove('active'));
                e.target.classList.add('active');
                localStorage.setItem('penColor', this.currentColor);
            });
        });
        
        // Custom color picker
        const customColorPicker = document.getElementById('custom-color-picker');
        customColorPicker.addEventListener('input', (e) => {
            this.currentColor = e.target.value.toUpperCase();
            // Remove active class from all preset color buttons
            document.querySelectorAll('.color-btn[data-color]').forEach(b => b.classList.remove('active'));
            localStorage.setItem('penColor', this.currentColor);
        });
        
        // Custom background color picker
        const customBgColorPicker = document.getElementById('custom-bg-color-picker');
        customBgColorPicker.addEventListener('input', (e) => {
            this.backgroundColor = e.target.value;
            // Remove active class from all preset background color buttons
            document.querySelectorAll('.color-btn[data-bg-color]').forEach(b => b.classList.remove('active'));
            this.applyBackground();
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
        
        // Background opacity slider
        const bgOpacitySlider = document.getElementById('bg-opacity-slider');
        const bgOpacityValue = document.getElementById('bg-opacity-value');
        bgOpacitySlider.addEventListener('input', (e) => {
            this.bgOpacity = parseInt(e.target.value) / 100;
            bgOpacityValue.textContent = e.target.value;
            this.applyBackground();
        });
        
        // Pattern intensity slider
        const patternIntensitySlider = document.getElementById('pattern-intensity-slider');
        const patternIntensityValue = document.getElementById('pattern-intensity-value');
        patternIntensitySlider.addEventListener('input', (e) => {
            this.patternIntensity = parseInt(e.target.value) / 100;
            patternIntensityValue.textContent = e.target.value;
            this.applyBackground();
        });
        
        // Pen size slider
        const penSizeSlider = document.getElementById('pen-size-slider');
        const penSizeValue = document.getElementById('pen-size-value');
        const penSizeInput = document.getElementById('pen-size-input');
        penSizeSlider.addEventListener('input', (e) => {
            this.penSize = parseInt(e.target.value);
            penSizeValue.textContent = this.penSize;
            penSizeInput.value = this.penSize;
            localStorage.setItem('penSize', this.penSize);
        });
        
        // Pen size input box
        penSizeInput.addEventListener('input', (e) => {
            // Allow any input during typing, validate on change event
            const value = parseInt(e.target.value);
            if (!isNaN(value) && value >= 3 && value <= 15) {
                this.penSize = value;
                penSizeValue.textContent = this.penSize;
                penSizeSlider.value = this.penSize;
                localStorage.setItem('penSize', this.penSize);
            }
            // Don't block the input, allow typing any number
        });
        
        penSizeInput.addEventListener('change', (e) => {
            // Ensure value is within bounds
            let value = parseInt(e.target.value);
            if (isNaN(value) || value < 3) value = 3;
            if (value > 15) value = 15;
            this.penSize = value;
            penSizeValue.textContent = this.penSize;
            penSizeSlider.value = this.penSize;
            penSizeInput.value = this.penSize;
            localStorage.setItem('penSize', this.penSize);
        });
        
        // Eraser size slider
        const eraserSizeSlider = document.getElementById('eraser-size-slider');
        const eraserSizeValue = document.getElementById('eraser-size-value');
        const eraserSizeInput = document.getElementById('eraser-size-input');
        eraserSizeSlider.addEventListener('input', (e) => {
            this.eraserSize = parseInt(e.target.value);
            eraserSizeValue.textContent = this.eraserSize;
            eraserSizeInput.value = this.eraserSize;
            localStorage.setItem('eraserSize', this.eraserSize);
            // Update eraser cursor size in real-time
            if (this.currentTool === 'eraser') {
                this.eraserCursor.style.width = this.eraserSize + 'px';
                this.eraserCursor.style.height = this.eraserSize + 'px';
            }
        });
        
        // Eraser size input box
        eraserSizeInput.addEventListener('input', (e) => {
            // Allow any input during typing, validate on change event
            const value = parseInt(e.target.value);
            if (!isNaN(value) && value >= 10 && value <= 30) {
                this.eraserSize = value;
                eraserSizeValue.textContent = this.eraserSize;
                eraserSizeSlider.value = this.eraserSize;
                // Update eraser cursor size in real-time
                if (this.currentTool === 'eraser') {
                    this.eraserCursor.style.width = this.eraserSize + 'px';
                    this.eraserCursor.style.height = this.eraserSize + 'px';
                }
            }
            // Don't block the input, allow typing any number
        });
        
        eraserSizeInput.addEventListener('change', (e) => {
            // Ensure value is within bounds
            let value = parseInt(e.target.value);
            if (isNaN(value) || value < 10) value = 10;
            if (value > 30) value = 30;
            this.eraserSize = value;
            eraserSizeValue.textContent = this.eraserSize;
            eraserSizeSlider.value = this.eraserSize;
            eraserSizeInput.value = this.eraserSize;
            localStorage.setItem('eraserSize', this.eraserSize);
            // Update eraser cursor size in real-time
            if (this.currentTool === 'eraser') {
                this.eraserCursor.style.width = this.eraserSize + 'px';
                this.eraserCursor.style.height = this.eraserSize + 'px';
            }
        });
        
        // History and zoom buttons
        document.getElementById('undo-btn').addEventListener('click', () => this.undo());
        document.getElementById('redo-btn').addEventListener('click', () => this.redo());
        document.getElementById('zoom-in-btn').addEventListener('click', () => this.zoomIn());
        document.getElementById('zoom-out-btn').addEventListener('click', () => this.zoomOut());
        
        // Zoom input
        const zoomInput = document.getElementById('zoom-input');
        zoomInput.addEventListener('input', (e) => {
            // Allow digits and decimal point while typing
            const beforeCursor = e.target.selectionStart;
            const beforeValue = e.target.value;
            const afterValue = beforeValue.replace(/[^0-9.]/g, '');
            
            if (beforeValue !== afterValue) {
                e.target.value = afterValue;
                // Adjust cursor position based on characters removed
                const removedChars = beforeValue.length - afterValue.length;
                const newPosition = Math.max(0, beforeCursor - removedChars);
                e.target.setSelectionRange(newPosition, newPosition);
            }
        });
        zoomInput.addEventListener('change', (e) => {
            const value = e.target.value.replace(/[^0-9.]/g, '');
            const scale = parseFloat(value) / 100;
            if (!isNaN(scale) && scale >= 0.5 && scale <= 3.0) {
                this.canvasScale = scale;
                this.applyZoom();
            } else {
                this.updateZoomDisplay();
            }
        });
        zoomInput.addEventListener('focus', (e) => {
            // Remove % sign when focused for easier editing
            e.target.value = e.target.value.replace('%', '');
            e.target.select();
        });
        zoomInput.addEventListener('blur', (e) => {
            // Re-add % sign when focus is lost
            this.updateZoomDisplay();
        });
        
        // Settings modal
        document.getElementById('settings-close-btn').addEventListener('click', () => this.closeSettings());
        
        // Settings menu navigation
        document.querySelectorAll('.settings-menu-item').forEach(item => {
            item.addEventListener('click', (e) => {
                const category = e.currentTarget.dataset.category;
                this.switchSettingsCategory(category);
            });
        });
        
        // Confirm modal
        document.getElementById('confirm-cancel-btn').addEventListener('click', () => {
            document.getElementById('confirm-modal').classList.remove('show');
        });
        document.getElementById('confirm-ok-btn').addEventListener('click', () => {
            document.getElementById('confirm-modal').classList.remove('show');
            this.clearCanvas(true);
        });
        
        // Close confirm modal when clicking outside
        document.getElementById('confirm-modal').addEventListener('click', (e) => {
            if (e.target.id === 'confirm-modal') {
                document.getElementById('confirm-modal').classList.remove('show');
            }
        });
        
        // Toolbar size slider
        const toolbarSizeSlider = document.getElementById('toolbar-size-slider');
        const toolbarSizeValue = document.getElementById('toolbar-size-value');
        toolbarSizeSlider.addEventListener('input', (e) => {
            this.toolbarSize = parseInt(e.target.value);
            toolbarSizeValue.textContent = this.toolbarSize;
            this.updateToolbarSize();
        });
        
        // Config scale slider
        const configScaleSlider = document.getElementById('config-scale-slider');
        const configScaleValue = document.getElementById('config-scale-value');
        configScaleSlider.addEventListener('input', (e) => {
            this.configScale = parseInt(e.target.value) / 100;
            configScaleValue.textContent = Math.round(this.configScale * 100);
            this.updateConfigScale();
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
        
        // Page input
        const pageInput = document.getElementById('page-input');
        pageInput.addEventListener('change', (e) => {
            const pageNum = parseInt(e.target.value);
            if (!isNaN(pageNum) && pageNum >= 1) {
                this.goToPage(pageNum);
            } else {
                e.target.value = this.currentPage;
            }
        });
        pageInput.addEventListener('focus', (e) => {
            e.target.select();
        });
        
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
        
        // Ctrl + Mouse wheel zoom
        this.canvas.addEventListener('wheel', (e) => {
            if (e.ctrlKey || e.metaKey) {
                e.preventDefault();
                const delta = e.deltaY > 0 ? -0.1 : 0.1;
                this.canvasScale = Math.max(0.5, Math.min(3.0, this.canvasScale + delta));
                this.applyZoom();
            }
        }, { passive: false });
        
        // Window resize
        window.addEventListener('resize', () => this.resizeCanvas());
    }
    
    getPosition(e) {
        const rect = this.canvas.getBoundingClientRect();
        // Convert screen coordinates to canvas coordinates
        // Account for both canvas scale (zoom) and pan offset
        const x = (e.clientX - rect.left) / this.canvasScale;
        const y = (e.clientY - rect.top) / this.canvasScale;
        return { x, y };
    }
    
    startPanning(e) {
        if (!this.infiniteCanvas) return;
        this.isPanning = true;
        this.lastPanPoint = { x: e.clientX, y: e.clientY };
        this.canvas.style.cursor = 'grab';
        e.preventDefault();
    }
    
    pan(e) {
        if (!this.isPanning || !this.lastPanPoint) return;
        
        const dx = (e.clientX - this.lastPanPoint.x) / this.canvasScale;
        const dy = (e.clientY - this.lastPanPoint.y) / this.canvasScale;
        
        this.panOffset.x += dx;
        this.panOffset.y += dy;
        
        this.lastPanPoint = { x: e.clientX, y: e.clientY };
        
        // Apply pan offset via CSS transform (combined with scale)
        this.applyCanvasTransform();
        
        // Save pan offset
        localStorage.setItem('panOffsetX', this.panOffset.x);
        localStorage.setItem('panOffsetY', this.panOffset.y);
    }
    
    stopPanning() {
        if (this.isPanning) {
            this.isPanning = false;
            this.lastPanPoint = null;
            this.updateCursor();
        }
    }
    
    startTwoFingerPan(e) {
        if (!this.infiniteCanvas) return;
        this.isTwoFingerPanning = true;
        const touch1 = e.touches[0];
        const touch2 = e.touches[1];
        this.lastTwoFingerMidpoint = {
            x: (touch1.clientX + touch2.clientX) / 2,
            y: (touch1.clientY + touch2.clientY) / 2
        };
        e.preventDefault();
    }
    
    twoFingerPan(e) {
        if (!this.isTwoFingerPanning || !this.lastTwoFingerMidpoint) return;
        
        const touch1 = e.touches[0];
        const touch2 = e.touches[1];
        const midpoint = {
            x: (touch1.clientX + touch2.clientX) / 2,
            y: (touch1.clientY + touch2.clientY) / 2
        };
        
        const dx = (midpoint.x - this.lastTwoFingerMidpoint.x) / this.canvasScale;
        const dy = (midpoint.y - this.lastTwoFingerMidpoint.y) / this.canvasScale;
        
        this.panOffset.x += dx;
        this.panOffset.y += dy;
        
        this.lastTwoFingerMidpoint = midpoint;
        
        // Apply pan offset via CSS transform (combined with scale)
        this.applyCanvasTransform();
        
        // Save pan offset
        localStorage.setItem('panOffsetX', this.panOffset.x);
        localStorage.setItem('panOffsetY', this.panOffset.y);
    }
    
    stopTwoFingerPan() {
        if (this.isTwoFingerPanning) {
            this.isTwoFingerPanning = false;
            this.lastTwoFingerMidpoint = null;
        }
    }
    
    updateCursor() {
        if (this.currentTool === 'pen') {
            this.canvas.style.cursor = 'crosshair';
        } else if (this.currentTool === 'eraser') {
            this.canvas.style.cursor = 'pointer';
        } else if (this.currentTool === 'pan') {
            this.canvas.style.cursor = 'grab';
        } else {
            this.canvas.style.cursor = 'default';
        }
    }
    
    redrawCanvas() {
        // For infinite canvas mode, panning is handled by CSS transform on the canvas element itself
        // We don't need to redraw the canvas content when panning
        // This function is kept for compatibility but doesn't need to do anything for pan
    }
    
    startDrawing(e) {
        this.isDrawing = true;
        const pos = this.getPosition(e);
        this.points = [pos];
        this.lastPoint = pos;
        
        // Auto-close config panel when drawing starts and disable auto-open
        // BUT: Don't close if user is currently typing in an input field
        const configArea = document.getElementById('config-area');
        const activeElement = document.activeElement;
        const isTypingInInput = activeElement && 
            (activeElement.tagName === 'INPUT' || activeElement.tagName === 'TEXTAREA') &&
            configArea.contains(activeElement);
        
        if (configArea.classList.contains('show') && !isTypingInInput) {
            configArea.classList.remove('show');
            this.configAutoOpenDisabled = true;
        }
        
        // Setup drawing context
        this.setupDrawingContext();
        
        // Draw initial point
        this.ctx.beginPath();
        this.ctx.moveTo(pos.x, pos.y);
        this.ctx.lineTo(pos.x, pos.y);
        this.ctx.stroke();
    }
    
    setupDrawingContext() {
        // Save context state before modifying
        this.ctx.save();
        
        // Always set line properties
        this.ctx.lineCap = 'round';
        this.ctx.lineJoin = 'round';
        
        if (this.currentTool === 'pen') {
            this.ctx.globalCompositeOperation = 'source-over';
            this.ctx.strokeStyle = this.currentColor;
            this.ctx.lineWidth = this.penSize;
            
            // Apply pen type specific styles
            switch(this.penType) {
                case 'pencil':
                    // Pencil: slightly transparent with rough edges
                    this.ctx.globalAlpha = 0.7;
                    this.ctx.lineCap = 'round';
                    break;
                case 'ballpoint':
                    // Ballpoint: smooth and consistent
                    this.ctx.globalAlpha = 0.9;
                    this.ctx.lineCap = 'round';
                    break;
                case 'fountain':
                    // Fountain pen: variable width effect
                    this.ctx.globalAlpha = 1.0;
                    this.ctx.lineCap = 'round';
                    break;
                case 'brush':
                    // Brush: softer edges
                    this.ctx.globalAlpha = 0.85;
                    this.ctx.lineCap = 'round';
                    this.ctx.lineWidth = this.penSize * 1.5; // Brush is thicker
                    break;
                case 'normal':
                default:
                    // Normal pen: solid and smooth
                    this.ctx.globalAlpha = 1.0;
                    this.ctx.lineCap = 'round';
                    break;
            }
        } else if (this.currentTool === 'eraser') {
            this.ctx.globalCompositeOperation = 'destination-out';
            this.ctx.strokeStyle = 'rgba(0,0,0,1)'; // Eraser needs a stroke style
            this.ctx.lineWidth = this.eraserSize;
            this.ctx.globalAlpha = 1.0;
        }
    }
    
    draw(e) {
        if (!this.isDrawing) return;
        
        const pos = this.getPosition(e);
        
        // Skip if the position hasn't changed significantly (reduce redundant points)
        if (this.lastPoint && 
            Math.abs(pos.x - this.lastPoint.x) < 0.5 && 
            Math.abs(pos.y - this.lastPoint.y) < 0.5) {
            return;
        }
        
        this.points.push(pos);
        
        // Draw immediately for responsiveness using optimized path
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
            
            // Restore context state that was saved in setupDrawingContext
            this.ctx.restore();
            
            // Save state after drawing
            this.saveState();
        }
    }
    
    updateEraserCursor(e) {
        if (this.currentTool === 'eraser') {
            this.eraserCursor.style.left = e.clientX + 'px';
            this.eraserCursor.style.top = e.clientY + 'px';
            this.eraserCursor.style.width = this.eraserSize + 'px';
            this.eraserCursor.style.height = this.eraserSize + 'px';
        }
    }
    
    showEraserCursor() {
        if (this.currentTool === 'eraser') {
            this.eraserCursor.style.display = 'block';
        }
    }
    
    hideEraserCursor() {
        this.eraserCursor.style.display = 'none';
    }
    
    setTool(tool) {
        this.currentTool = tool;
        // Re-enable auto-open when user clicks a toolbar button
        this.configAutoOpenDisabled = false;
        
        // Reset config panel position to default (centered above toolbar)
        const configArea = document.getElementById('config-area');
        configArea.style.bottom = '100px';
        configArea.style.top = 'auto';
        configArea.style.left = '50%';
        configArea.style.right = 'auto';
        configArea.style.transform = 'translateX(-50%)';
        
        // Update collapsed icon to match current tool
        this.updateCollapsedIcon();
        
        if (tool === 'eraser') {
            this.showEraserCursor();
        } else {
            this.hideEraserCursor();
        }
        this.updateUI();
    }
    
    closeConfigPanel() {
        document.getElementById('config-area').classList.remove('show');
    }
    
    switchSettingsCategory(category) {
        // Update menu items
        document.querySelectorAll('.settings-menu-item').forEach(item => {
            if (item.dataset.category === category) {
                item.classList.add('active');
            } else {
                item.classList.remove('active');
            }
        });
        
        // Update content areas
        document.querySelectorAll('.settings-category').forEach(cat => {
            if (cat.dataset.category === category) {
                cat.classList.add('active');
            } else {
                cat.classList.remove('active');
            }
        });
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
        
        // Load config scale
        document.getElementById('config-scale-slider').value = Math.round(this.configScale * 100);
        document.getElementById('config-scale-value').textContent = Math.round(this.configScale * 100);
        this.updateConfigScale();
        
        // Load control position
        this.setControlPosition(this.controlPosition);
        
        // Load edge snap setting
        document.getElementById('edge-snap-checkbox').checked = this.edgeSnapEnabled;
        
        // Load infinite canvas setting
        document.getElementById('infinite-canvas-checkbox').checked = this.infiniteCanvas;
        
        // Load pen type setting
        document.querySelectorAll('.pen-type-btn').forEach(btn => {
            btn.classList.remove('active');
            if (btn.dataset.penType === this.penType) {
                btn.classList.add('active');
            }
        });
        
        // Load pen settings (color, size)
        document.getElementById('pen-size-slider').value = this.penSize;
        document.getElementById('pen-size-value').textContent = this.penSize;
        document.getElementById('pen-size-input').value = this.penSize;
        document.getElementById('custom-color-picker').value = this.currentColor;
        
        // Set active color button if it matches a preset color
        document.querySelectorAll('.color-btn[data-color]').forEach(btn => {
            btn.classList.remove('active');
            if (btn.dataset.color.toLowerCase() === this.currentColor.toLowerCase()) {
                btn.classList.add('active');
            }
        });
        
        // Load eraser settings
        document.getElementById('eraser-size-slider').value = this.eraserSize;
        document.getElementById('eraser-size-value').textContent = this.eraserSize;
        document.getElementById('eraser-size-input').value = this.eraserSize;
        
        // Load background settings
        document.getElementById('bg-opacity-slider').value = Math.round(this.bgOpacity * 100);
        document.getElementById('bg-opacity-value').textContent = Math.round(this.bgOpacity * 100);
        document.getElementById('pattern-intensity-slider').value = Math.round(this.patternIntensity * 100);
        document.getElementById('pattern-intensity-value').textContent = Math.round(this.patternIntensity * 100);
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
            // Only show if auto-open is not disabled
            if (!this.configAutoOpenDisabled) {
                configArea.classList.add('show');
            }
            // Restore active color button
            document.querySelectorAll('.color-btn[data-color]').forEach(btn => {
                btn.classList.remove('active');
                if (btn.dataset.color.toLowerCase() === this.currentColor.toLowerCase()) {
                    btn.classList.add('active');
                }
            });
            this.canvas.style.cursor = 'crosshair';
        } else if (this.currentTool === 'pan') {
            document.getElementById('pan-btn').classList.add('active');
            // Pan tool has no config panel
            configArea.classList.remove('show');
            this.canvas.style.cursor = 'grab';
        } else if (this.currentTool === 'eraser') {
            document.getElementById('eraser-btn').classList.add('active');
            document.getElementById('eraser-config').classList.add('active');
            // Only show if auto-open is not disabled
            if (!this.configAutoOpenDisabled) {
                configArea.classList.add('show');
            }
            this.canvas.style.cursor = 'pointer';
        } else if (this.currentTool === 'background') {
            document.getElementById('background-btn').classList.add('active');
            document.getElementById('background-config').classList.add('active');
            // Only show if auto-open is not disabled
            if (!this.configAutoOpenDisabled) {
                configArea.classList.add('show');
            }
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
        // Show custom confirm modal
        document.getElementById('confirm-modal').classList.add('show');
    }
    
    clearCanvas(saveToHistory = true) {
        // Clear drawing layer only (not the background)
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
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
    
    zoomReset() {
        this.canvasScale = 1.0;
        this.applyZoom();
    }
    
    applyZoom() {
        // For infinite canvas mode, adjust canvas size when zoomed out
        // to ensure the entire viewport is covered
        if (this.infiniteCanvas) {
            // Get viewport dimensions
            const viewportWidth = window.innerWidth;
            const viewportHeight = window.innerHeight;
            const dpr = window.devicePixelRatio || 1;
            
            // Calculate canvas size needed to cover viewport when scaled
            // When scale is 0.5, canvas needs to be 2x the viewport size to cover it after scaling
            const scaleFactor = 1 / this.canvasScale;
            const requiredWidth = viewportWidth * scaleFactor;
            const requiredHeight = viewportHeight * scaleFactor;
            
            // Only resize if canvas is significantly smaller than required
            const currentLogicalWidth = this.canvas.width / dpr;
            const currentLogicalHeight = this.canvas.height / dpr;
            
            if (Math.abs(currentLogicalWidth - requiredWidth) > 10 || 
                Math.abs(currentLogicalHeight - requiredHeight) > 10) {
                
                // Save current canvas state before resize
                const tempCanvas = document.createElement('canvas');
                tempCanvas.width = this.canvas.width;
                tempCanvas.height = this.canvas.height;
                const tempCtx = tempCanvas.getContext('2d');
                tempCtx.drawImage(this.canvas, 0, 0);
                
                // Set new canvas dimensions
                this.canvas.width = requiredWidth * dpr;
                this.canvas.height = requiredHeight * dpr;
                this.canvas.style.width = requiredWidth + 'px';
                this.canvas.style.height = requiredHeight + 'px';
                
                this.bgCanvas.width = requiredWidth * dpr;
                this.bgCanvas.height = requiredHeight * dpr;
                this.bgCanvas.style.width = requiredWidth + 'px';
                this.bgCanvas.style.height = requiredHeight + 'px';
                
                // Scale context for high DPI displays
                this.ctx.scale(dpr, dpr);
                this.bgCtx.scale(dpr, dpr);
                
                // Restore canvas content at center
                const offsetX = (requiredWidth - currentLogicalWidth) / 2;
                const offsetY = (requiredHeight - currentLogicalHeight) / 2;
                this.ctx.drawImage(tempCanvas, 0, 0, tempCanvas.width, tempCanvas.height,
                    offsetX * dpr, offsetY * dpr, tempCanvas.width, tempCanvas.height);
                
                // Redraw background with new size
                this.drawBackground();
            }
        }
        
        // Apply zoom and pan transform to both canvas layers
        this.applyCanvasTransform();
        localStorage.setItem('canvasScale', this.canvasScale);
        this.updateZoomDisplay();
    }
    
    applyCanvasTransform() {
        // Apply both zoom (scale) and pan (translate) via CSS transform
        const transform = `translate(${this.panOffset.x}px, ${this.panOffset.y}px) scale(${this.canvasScale})`;
        this.canvas.style.transform = transform;
        this.canvas.style.transformOrigin = 'center center';
        this.bgCanvas.style.transform = transform;
        this.bgCanvas.style.transformOrigin = 'center center';
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
    
    // Config scale update
    updateConfigScale() {
        const configArea = document.getElementById('config-area');
        configArea.style.transform = `translateX(-50%) scale(${this.configScale})`;
        localStorage.setItem('configScale', this.configScale);
    }
    
    // Control position
    setControlPosition(position) {
        this.controlPosition = position;
        localStorage.setItem('controlPosition', position);
        
        const historyControls = document.getElementById('history-controls');
        const paginationControls = document.getElementById('pagination-controls');
        
        historyControls.className = '';
        historyControls.classList.add(position);
        
        paginationControls.className = '';
        if (!this.infiniteCanvas) {
            paginationControls.classList.add('show');
        }
        paginationControls.classList.add(position);
        
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
        const collapsedIcon = document.getElementById('collapsed-icon');
        
        // Expand config area on hover or click when collapsed
        configArea.addEventListener('mouseenter', () => {
            if (configArea.classList.contains('collapsed')) {
                configArea.classList.remove('collapsed');
            }
        });
        
        // Click on collapsed icon to expand
        collapsedIcon.addEventListener('click', (e) => {
            e.stopPropagation();
            configArea.classList.remove('collapsed');
        });
        
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
            
            const windowWidth = window.innerWidth;
            const windowHeight = window.innerHeight;
            
            // Apply edge snapping if enabled
            if (this.edgeSnapEnabled) {
                let snapped = false;
                
                // Snap to left
                if (x < this.edgeSnapDistance) {
                    x = 0;
                    snapped = true;
                }
                // Snap to right
                if (x + this.draggedElementWidth > windowWidth - this.edgeSnapDistance) {
                    x = windowWidth - this.draggedElementWidth;
                    snapped = true;
                }
                // Snap to top
                if (y < this.edgeSnapDistance) {
                    y = 0;
                    snapped = true;
                }
                // Snap to bottom
                if (y + this.draggedElementHeight > windowHeight - this.edgeSnapDistance) {
                    y = windowHeight - this.draggedElementHeight;
                    snapped = true;
                }
                
                // Collapse config area when snapped to edge
                if (snapped && this.draggedElement === configArea) {
                    configArea.classList.add('collapsed');
                    // Update collapsed icon based on current tool
                    this.updateCollapsedIcon();
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
    
    // Update collapsed icon based on current tool
    updateCollapsedIcon() {
        const collapsedIcon = document.getElementById('collapsed-icon');
        let iconSvg = '';
        
        if (this.currentTool === 'pen') {
            iconSvg = `
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M12 19l7-7 3 3-7 7-3-3z"></path>
                    <path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z"></path>
                    <path d="M2 2l7.586 7.586"></path>
                    <circle cx="11" cy="11" r="2"></circle>
                </svg>
            `;
        } else if (this.currentTool === 'eraser') {
            iconSvg = `
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M20 20H7L3 16 12 7 17 12"></path>
                    <path d="M7 20l5-5"></path>
                </svg>
            `;
        } else if (this.currentTool === 'background') {
            iconSvg = `
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                    <circle cx="8.5" cy="8.5" r="1.5"></circle>
                    <polyline points="21 15 16 10 5 21"></polyline>
                </svg>
            `;
        }
        
        collapsedIcon.innerHTML = iconSvg;
    }
    
    // Background functions
    applyBackground() {
        this.drawBackground();
        
        localStorage.setItem('backgroundColor', this.backgroundColor);
        localStorage.setItem('backgroundPattern', this.backgroundPattern);
    }
    
    drawBackground() {
        // Clear background canvas first
        this.bgCtx.clearRect(0, 0, this.bgCanvas.width, this.bgCanvas.height);
        
        // Draw background color with opacity
        this.bgCtx.globalAlpha = this.bgOpacity;
        this.bgCtx.fillStyle = this.backgroundColor;
        this.bgCtx.fillRect(0, 0, this.bgCanvas.width, this.bgCanvas.height);
        this.bgCtx.globalAlpha = 1.0;
        
        this.drawBackgroundPattern();
        
        // Save settings
        localStorage.setItem('bgOpacity', this.bgOpacity);
        localStorage.setItem('patternIntensity', this.patternIntensity);
    }
    
    drawBackgroundPattern() {
        if (this.backgroundPattern === 'blank') {
            return; // No pattern needed
        }
        
        this.bgCtx.save();
        this.bgCtx.globalCompositeOperation = 'source-over';
        
        const dpr = window.devicePixelRatio || 1;
        const patternColor = this.getPatternColor();
        
        if (this.backgroundPattern === 'dots') {
            // Draw dot grid pattern
            const spacing = 20 * dpr;
            this.bgCtx.fillStyle = patternColor;
            
            for (let x = spacing; x < this.bgCanvas.width; x += spacing) {
                for (let y = spacing; y < this.bgCanvas.height; y += spacing) {
                    this.bgCtx.beginPath();
                    this.bgCtx.arc(x, y, 1 * dpr, 0, Math.PI * 2);
                    this.bgCtx.fill();
                }
            }
        } else if (this.backgroundPattern === 'grid') {
            // Draw square grid pattern
            const spacing = 20 * dpr;
            this.bgCtx.strokeStyle = patternColor;
            this.bgCtx.lineWidth = 0.5 * dpr;
            
            // Vertical lines
            for (let x = spacing; x < this.bgCanvas.width; x += spacing) {
                this.bgCtx.beginPath();
                this.bgCtx.moveTo(x, 0);
                this.bgCtx.lineTo(x, this.bgCanvas.height);
                this.bgCtx.stroke();
            }
            
            // Horizontal lines
            for (let y = spacing; y < this.bgCanvas.height; y += spacing) {
                this.bgCtx.beginPath();
                this.bgCtx.moveTo(0, y);
                this.bgCtx.lineTo(this.bgCanvas.width, y);
                this.bgCtx.stroke();
            }
        } else if (this.backgroundPattern === 'tianzige') {
            // Draw Tian Zi Ge (田字格) pattern - Chinese character practice grid
            const cellSize = 60 * dpr;
            this.bgCtx.strokeStyle = patternColor;
            
            for (let x = 0; x < this.bgCanvas.width; x += cellSize) {
                for (let y = 0; y < this.bgCanvas.height; y += cellSize) {
                    // Outer square (bold)
                    this.bgCtx.lineWidth = 2 * dpr;
                    this.bgCtx.strokeRect(x, y, cellSize, cellSize);
                    
                    // Inner cross lines (lighter)
                    this.bgCtx.lineWidth = 0.5 * dpr;
                    // Vertical middle line
                    this.bgCtx.beginPath();
                    this.bgCtx.moveTo(x + cellSize / 2, y);
                    this.bgCtx.lineTo(x + cellSize / 2, y + cellSize);
                    this.bgCtx.stroke();
                    
                    // Horizontal middle line
                    this.bgCtx.beginPath();
                    this.bgCtx.moveTo(x, y + cellSize / 2);
                    this.bgCtx.lineTo(x + cellSize, y + cellSize / 2);
                    this.bgCtx.stroke();
                    
                    // Diagonal lines
                    this.bgCtx.beginPath();
                    this.bgCtx.moveTo(x, y);
                    this.bgCtx.lineTo(x + cellSize, y + cellSize);
                    this.bgCtx.stroke();
                    
                    this.bgCtx.beginPath();
                    this.bgCtx.moveTo(x + cellSize, y);
                    this.bgCtx.lineTo(x, y + cellSize);
                    this.bgCtx.stroke();
                }
            }
        } else if (this.backgroundPattern === 'english-lines') {
            // Draw 4-line English writing paper
            const lineHeight = 60 * dpr;
            this.bgCtx.strokeStyle = patternColor;
            
            for (let y = lineHeight; y < this.bgCanvas.height; y += lineHeight) {
                // Top line (solid)
                this.bgCtx.lineWidth = 1 * dpr;
                this.bgCtx.beginPath();
                this.bgCtx.moveTo(0, y);
                this.bgCtx.lineTo(this.bgCanvas.width, y);
                this.bgCtx.stroke();
                
                // Upper middle line (dashed)
                this.bgCtx.lineWidth = 0.5 * dpr;
                this.bgCtx.setLineDash([5 * dpr, 5 * dpr]);
                this.bgCtx.beginPath();
                this.bgCtx.moveTo(0, y + lineHeight / 4);
                this.bgCtx.lineTo(this.bgCanvas.width, y + lineHeight / 4);
                this.bgCtx.stroke();
                
                // Middle line (solid, red for baseline)
                this.bgCtx.setLineDash([]);
                this.bgCtx.strokeStyle = this.isLightBackground() ? 'rgba(255, 0, 0, 0.3)' : 'rgba(255, 100, 100, 0.5)';
                this.bgCtx.lineWidth = 1 * dpr;
                this.bgCtx.beginPath();
                this.bgCtx.moveTo(0, y + lineHeight / 2);
                this.bgCtx.lineTo(this.bgCanvas.width, y + lineHeight / 2);
                this.bgCtx.stroke();
                this.bgCtx.strokeStyle = patternColor;
                
                // Lower middle line (dashed)
                this.bgCtx.lineWidth = 0.5 * dpr;
                this.bgCtx.setLineDash([5 * dpr, 5 * dpr]);
                this.bgCtx.beginPath();
                this.bgCtx.moveTo(0, y + 3 * lineHeight / 4);
                this.bgCtx.lineTo(this.bgCanvas.width, y + 3 * lineHeight / 4);
                this.bgCtx.stroke();
                this.bgCtx.setLineDash([]);
            }
        } else if (this.backgroundPattern === 'music-staff') {
            // Draw 5-line music staff
            const staffHeight = 80 * dpr;
            const lineSpacing = staffHeight / 4;
            this.bgCtx.strokeStyle = patternColor;
            this.bgCtx.lineWidth = 1 * dpr;
            
            for (let startY = staffHeight; startY < this.bgCanvas.height; startY += staffHeight * 2) {
                // Draw 5 horizontal lines
                for (let i = 0; i < 5; i++) {
                    const y = startY + i * lineSpacing;
                    this.bgCtx.beginPath();
                    this.bgCtx.moveTo(0, y);
                    this.bgCtx.lineTo(this.bgCanvas.width, y);
                    this.bgCtx.stroke();
                }
            }
        } else if (this.backgroundPattern === 'coordinate') {
            // Draw coordinate system (平面直角坐标系)
            const centerX = this.bgCanvas.width / 2;
            const centerY = this.bgCanvas.height / 2;
            const gridSize = 20 * dpr;
            
            // Draw grid lines
            this.bgCtx.strokeStyle = this.isLightBackground() ? 'rgba(0, 0, 0, 0.1)' : 'rgba(255, 255, 255, 0.1)';
            this.bgCtx.lineWidth = 0.5 * dpr;
            
            // Vertical grid lines
            for (let x = 0; x < this.bgCanvas.width; x += gridSize) {
                this.bgCtx.beginPath();
                this.bgCtx.moveTo(x, 0);
                this.bgCtx.lineTo(x, this.bgCanvas.height);
                this.bgCtx.stroke();
            }
            
            // Horizontal grid lines
            for (let y = 0; y < this.bgCanvas.height; y += gridSize) {
                this.bgCtx.beginPath();
                this.bgCtx.moveTo(0, y);
                this.bgCtx.lineTo(this.bgCanvas.width, y);
                this.bgCtx.stroke();
            }
            
            // Draw main axes (thicker)
            this.bgCtx.strokeStyle = patternColor;
            this.bgCtx.lineWidth = 2 * dpr;
            
            // X-axis
            this.bgCtx.beginPath();
            this.bgCtx.moveTo(0, centerY);
            this.bgCtx.lineTo(this.bgCanvas.width, centerY);
            this.bgCtx.stroke();
            
            // Y-axis
            this.bgCtx.beginPath();
            this.bgCtx.moveTo(centerX, 0);
            this.bgCtx.lineTo(centerX, this.bgCanvas.height);
            this.bgCtx.stroke();
            
            // Draw arrows on axes
            const arrowSize = 10 * dpr;
            
            // X-axis arrow (right)
            this.bgCtx.beginPath();
            this.bgCtx.moveTo(this.bgCanvas.width - arrowSize, centerY - arrowSize / 2);
            this.bgCtx.lineTo(this.bgCanvas.width, centerY);
            this.bgCtx.lineTo(this.bgCanvas.width - arrowSize, centerY + arrowSize / 2);
            this.bgCtx.stroke();
            
            // Y-axis arrow (up)
            this.bgCtx.beginPath();
            this.bgCtx.moveTo(centerX - arrowSize / 2, arrowSize);
            this.bgCtx.lineTo(centerX, 0);
            this.bgCtx.lineTo(centerX + arrowSize / 2, arrowSize);
            this.bgCtx.stroke();
        }
        
        this.bgCtx.restore();
    }
    
    isLightBackground() {
        const r = parseInt(this.backgroundColor.slice(1, 3), 16);
        const g = parseInt(this.backgroundColor.slice(3, 5), 16);
        const b = parseInt(this.backgroundColor.slice(5, 7), 16);
        const brightness = (r * 299 + g * 587 + b * 114) / 1000;
        return brightness > 128;
    }
    
    getPatternColor() {
        // Choose pattern color based on background brightness and apply intensity
        const r = parseInt(this.backgroundColor.slice(1, 3), 16);
        const g = parseInt(this.backgroundColor.slice(3, 5), 16);
        const b = parseInt(this.backgroundColor.slice(5, 7), 16);
        const brightness = (r * 299 + g * 587 + b * 114) / 1000;
        
        // Scale opacity based on pattern intensity (0.2 to 1.0 range for darker patterns)
        const baseOpacity = this.patternIntensity;
        // Increase the multiplier from 0.2 to 0.5 for darker patterns
        return brightness > 128 ? `rgba(0, 0, 0, ${baseOpacity * 0.5})` : `rgba(255, 255, 255, ${baseOpacity * 0.5})`;
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
        document.getElementById('page-input').value = this.currentPage;
        document.getElementById('page-total').textContent = `/ ${this.pages.length}`;
        document.getElementById('prev-page-btn').disabled = this.currentPage <= 1;
        
        // Show "+" icon in next button when on last page
        const nextBtn = document.getElementById('next-page-btn');
        if (this.currentPage >= this.pages.length) {
            nextBtn.innerHTML = `
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <line x1="12" y1="5" x2="12" y2="19"></line>
                    <line x1="5" y1="12" x2="19" y2="12"></line>
                </svg>
            `;
            nextBtn.title = '新建页面';
        } else {
            nextBtn.innerHTML = `
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <polyline points="9 18 15 12 9 6"></polyline>
                </svg>
            `;
            nextBtn.title = '下一页';
        }
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
    
    goToPage(pageNum) {
        if (pageNum < 1) return;
        
        // Save current page
        const imageData = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
        this.pages[this.currentPage - 1] = imageData;
        
        // Create pages if necessary
        while (this.pages.length < pageNum) {
            // Save current state, create a blank page
            const blankCanvas = document.createElement('canvas');
            blankCanvas.width = this.canvas.width;
            blankCanvas.height = this.canvas.height;
            const blankCtx = blankCanvas.getContext('2d');
            blankCtx.fillStyle = this.backgroundColor;
            blankCtx.fillRect(0, 0, blankCanvas.width, blankCanvas.height);
            this.pages.push(blankCtx.getImageData(0, 0, blankCanvas.width, blankCanvas.height));
        }
        
        // Load the target page
        this.currentPage = pageNum;
        this.ctx.putImageData(this.pages[this.currentPage - 1], 0, 0);
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
