// Main Application Class
// Integrates all modules and handles user interactions

class DrawingBoard {
    constructor() {
        // Canvas setup
        this.canvas = document.getElementById('canvas');
        this.ctx = this.canvas.getContext('2d', { 
            desynchronized: true,
            alpha: true
        });
        
        this.bgCanvas = document.getElementById('background-canvas');
        this.bgCtx = this.bgCanvas.getContext('2d');
        
        this.eraserCursor = document.getElementById('eraser-cursor');
        
        // Initialize modules
        this.drawingEngine = new DrawingEngine(this.canvas, this.ctx);
        this.historyManager = new HistoryManager(this.canvas, this.ctx);
        this.backgroundManager = new BackgroundManager(this.bgCanvas, this.bgCtx);
        this.imageControls = new ImageControls(this.backgroundManager);
        this.settingsManager = new SettingsManager();
        
        // Pagination
        this.currentPage = 1;
        this.pages = [];
        
        // Pinch zoom and pan state
        this.isPinching = false;
        this.lastPinchDistance = 0;
        this.lastPinchCenter = null;
        this.hasTwoFingers = false;
        
        // Dragging state
        this.isDraggingPanel = false;
        this.draggedElement = null;
        this.dragOffset = { x: 0, y: 0 };
        this.draggedElementWidth = 0;
        this.draggedElementHeight = 0;
        
        // Initialize
        this.resizeCanvas();
        this.setupEventListeners();
        this.settingsManager.loadSettings();
        this.backgroundManager.drawBackground();
        this.updateUI();
        this.historyManager.saveState();
        this.updateZoomUI();
        this.applyZoom();
        this.updateZoomControlsVisibility();
        this.updatePatternGrid();
    }
    
    resizeCanvas() {
        const rect = this.canvas.getBoundingClientRect();
        const dpr = window.devicePixelRatio || 1;
        
        const oldWidth = this.canvas.width;
        const oldHeight = this.canvas.height;
        const imageData = this.historyManager.historyStep >= 0 ? 
            this.ctx.getImageData(0, 0, oldWidth, oldHeight) : null;
        
        this.canvas.width = rect.width * dpr;
        this.canvas.height = rect.height * dpr;
        this.canvas.style.width = rect.width + 'px';
        this.canvas.style.height = rect.height + 'px';
        
        this.bgCanvas.width = rect.width * dpr;
        this.bgCanvas.height = rect.height * dpr;
        this.bgCanvas.style.width = rect.width + 'px';
        this.bgCanvas.style.height = rect.height + 'px';
        
        this.ctx.scale(dpr, dpr);
        this.bgCtx.scale(dpr, dpr);
        
        if (imageData) {
            this.ctx.putImageData(imageData, 0, 0);
        }
        
        this.backgroundManager.drawBackground();
    }
    
    setupEventListeners() {
        // Canvas drawing events - use document-level listeners for continuous drawing
        document.addEventListener('mousedown', (e) => {
            // Skip if clicking on UI elements (except canvas)
            if (e.target.closest('#toolbar') || 
                e.target.closest('#config-area') || 
                e.target.closest('#history-controls') || 
                e.target.closest('#pagination-controls') ||
                e.target.closest('.modal')) {
                return;
            }
            
            if (e.button === 1 || (e.button === 0 && e.shiftKey)) {
                this.drawingEngine.startPanning(e);
            } else if (this.drawingEngine.currentTool === 'pen' || this.drawingEngine.currentTool === 'eraser') {
                this.drawingEngine.startDrawing(e);
            }
        });
        
        document.addEventListener('mousemove', (e) => {
            if (this.drawingEngine.isPanning) {
                this.drawingEngine.pan(e);
                this.redrawCanvas();
            } else if (this.drawingEngine.isDrawing) {
                this.drawingEngine.draw(e);
                this.updateEraserCursor(e);
            } else {
                this.updateEraserCursor(e);
            }
        });
        
        document.addEventListener('mouseup', () => {
            this.handleDrawingComplete();
            this.drawingEngine.stopPanning();
        });
        
        this.canvas.addEventListener('mouseenter', (e) => {
            if (this.drawingEngine.currentTool === 'eraser') {
                this.showEraserCursor();
            }
        });
        
        this.canvas.addEventListener('mouseleave', () => {
            // Don't hide eraser cursor if we're still drawing
            if (!this.drawingEngine.isDrawing) {
                this.hideEraserCursor();
            }
        });
        
        // Touch events
        this.canvas.addEventListener('touchstart', (e) => {
            e.preventDefault();
            if (e.touches.length === 2) {
                // Two-finger gesture - prevent drawing
                this.hasTwoFingers = true;
                if (this.drawingEngine.isDrawing) {
                    // Stop any ongoing drawing
                    this.drawingEngine.stopDrawing();
                }
                this.handlePinchStart(e);
            } else if (e.touches.length === 1 && !this.hasTwoFingers) {
                this.drawingEngine.startDrawing(e.touches[0]);
            }
        }, { passive: false });
        
        this.canvas.addEventListener('touchmove', (e) => {
            e.preventDefault();
            if (e.touches.length === 2) {
                // Two-finger pinch to zoom and pan
                this.handlePinchMove(e);
            } else if (e.touches.length === 1 && !this.hasTwoFingers) {
                this.drawingEngine.draw(e.touches[0]);
            }
        }, { passive: false });
        
        this.canvas.addEventListener('touchend', (e) => {
            e.preventDefault();
            if (e.touches.length < 2) {
                this.handlePinchEnd();
            }
            if (e.touches.length === 0) {
                this.hasTwoFingers = false;
                // Only save drawing if we weren't doing two-finger gesture
                if (this.drawingEngine.isDrawing) {
                    this.handleDrawingComplete();
                }
            }
        }, { passive: false });
        
        // Toolbar buttons
        document.getElementById('pen-btn').addEventListener('click', () => this.setTool('pen'));
        document.getElementById('eraser-btn').addEventListener('click', () => this.setTool('eraser'));
        document.getElementById('background-btn').addEventListener('click', () => this.setTool('background'));
        document.getElementById('clear-btn').addEventListener('click', () => this.confirmClear());
        document.getElementById('settings-btn').addEventListener('click', () => this.openSettings());
        
        document.getElementById('config-close-btn').addEventListener('click', () => this.closeConfigPanel());
        
        // History buttons
        document.getElementById('undo-btn').addEventListener('click', () => {
            if (this.historyManager.undo()) {
                this.updateUI();
            }
        });
        
        document.getElementById('redo-btn').addEventListener('click', () => {
            if (this.historyManager.redo()) {
                this.updateUI();
            }
        });
        
        // Zoom controls
        document.getElementById('zoom-in-btn').addEventListener('click', () => this.zoomIn());
        document.getElementById('zoom-out-btn').addEventListener('click', () => this.zoomOut());
        document.getElementById('zoom-input').addEventListener('change', (e) => this.setZoom(e.target.value));
        document.getElementById('zoom-input').addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                this.setZoom(e.target.value);
            }
        });
        
        // Pagination controls - merged next and add button
        document.getElementById('prev-page-btn').addEventListener('click', () => this.prevPage());
        document.getElementById('next-or-add-page-btn').addEventListener('click', () => this.nextOrAddPage());
        document.getElementById('page-input').addEventListener('change', (e) => this.goToPage(parseInt(e.target.value)));
        document.getElementById('page-input').addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                this.goToPage(parseInt(e.target.value));
            }
        });
        
        // Setup additional event listeners for tools, settings, and keyboard
        this.setupToolConfigListeners();
        this.setupSettingsListeners();
        this.setupKeyboardShortcuts();
        this.setupDraggablePanels();
        
        window.addEventListener('resize', () => this.resizeCanvas());
        
        // Ctrl+scroll to zoom canvas
        this.setupCanvasZoom();
    }
    
    setupToolConfigListeners() {
        // Pen type buttons
        document.querySelectorAll('.pen-type-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.drawingEngine.setPenType(e.target.dataset.penType);
                document.querySelectorAll('.pen-type-btn').forEach(b => b.classList.remove('active'));
                e.target.classList.add('active');
            });
        });
        
        // Color picker
        document.querySelectorAll('.color-btn[data-color]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.drawingEngine.setColor(e.target.dataset.color);
                document.querySelectorAll('.color-btn[data-color]').forEach(b => b.classList.remove('active'));
                e.target.classList.add('active');
            });
        });
        
        const customColorPicker = document.getElementById('custom-color-picker');
        customColorPicker.addEventListener('input', (e) => {
            this.drawingEngine.setColor(e.target.value);
            document.querySelectorAll('.color-btn[data-color]').forEach(b => b.classList.remove('active'));
        });
        
        // Background color picker
        document.querySelectorAll('.color-btn[data-bg-color]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.backgroundManager.setBackgroundColor(e.target.dataset.bgColor);
                document.querySelectorAll('.color-btn[data-bg-color]').forEach(b => b.classList.remove('active'));
                e.target.classList.add('active');
            });
        });
        
        const customBgColorPicker = document.getElementById('custom-bg-color-picker');
        customBgColorPicker.addEventListener('input', (e) => {
            this.backgroundManager.setBackgroundColor(e.target.value);
            document.querySelectorAll('.color-btn[data-bg-color]').forEach(b => b.classList.remove('active'));
        });
        
        // Background pattern buttons
        document.querySelectorAll('.pattern-option-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const pattern = e.target.dataset.pattern;
                if (pattern === 'image') {
                    document.getElementById('bg-image-upload').click();
                } else {
                    this.backgroundManager.setBackgroundPattern(pattern);
                    document.querySelectorAll('.pattern-option-btn').forEach(b => b.classList.remove('active'));
                    e.target.classList.add('active');
                    document.getElementById('image-size-group').style.display = 'none';
                }
            });
        });
        
        // Background image upload
        document.getElementById('bg-image-upload').addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = (event) => {
                    this.backgroundManager.setBackgroundImage(event.target.result);
                    document.querySelectorAll('.pattern-option-btn').forEach(b => b.classList.remove('active'));
                    document.querySelector('.pattern-option-btn[data-pattern="image"]').classList.add('active');
                    document.getElementById('image-size-group').style.display = 'block';
                    
                    // Show image controls for manipulation
                    const imageData = this.backgroundManager.getImageData();
                    if (imageData) {
                        this.imageControls.showControls(imageData);
                    }
                };
                reader.readAsDataURL(file);
            }
        });
        
        // Background image size slider
        const bgImageSizeSlider = document.getElementById('bg-image-size-slider');
        const bgImageSizeValue = document.getElementById('bg-image-size-value');
        bgImageSizeSlider.addEventListener('input', (e) => {
            this.backgroundManager.setImageSize(parseInt(e.target.value) / 100);
            bgImageSizeValue.textContent = e.target.value;
        });
        
        // Sliders
        const penSizeSlider = document.getElementById('pen-size-slider');
        const penSizeValue = document.getElementById('pen-size-value');
        penSizeSlider.addEventListener('input', (e) => {
            this.drawingEngine.setPenSize(parseInt(e.target.value));
            penSizeValue.textContent = e.target.value;
        });
        
        const eraserSizeSlider = document.getElementById('eraser-size-slider');
        const eraserSizeValue = document.getElementById('eraser-size-value');
        eraserSizeSlider.addEventListener('input', (e) => {
            this.drawingEngine.setEraserSize(parseInt(e.target.value));
            eraserSizeValue.textContent = e.target.value;
            if (this.drawingEngine.currentTool === 'eraser') {
                this.eraserCursor.style.width = e.target.value + 'px';
                this.eraserCursor.style.height = e.target.value + 'px';
            }
        });
    }
    
    setupSettingsListeners() {
        document.getElementById('settings-close-btn').addEventListener('click', () => this.closeSettings());
        
        document.querySelectorAll('.settings-tab-icon').forEach(tab => {
            tab.addEventListener('click', (e) => {
                const tabName = e.currentTarget.dataset.tab;
                this.settingsManager.switchTab(tabName);
            });
        });
        
        const toolbarSizeSlider = document.getElementById('toolbar-size-slider');
        const toolbarSizeValue = document.getElementById('toolbar-size-value');
        toolbarSizeSlider.addEventListener('input', (e) => {
            this.settingsManager.toolbarSize = parseInt(e.target.value);
            toolbarSizeValue.textContent = e.target.value;
            this.settingsManager.updateToolbarSize();
        });
        
        const configScaleSlider = document.getElementById('config-scale-slider');
        const configScaleValue = document.getElementById('config-scale-value');
        configScaleSlider.addEventListener('input', (e) => {
            this.settingsManager.configScale = parseInt(e.target.value) / 100;
            configScaleValue.textContent = Math.round(this.settingsManager.configScale * 100);
            this.settingsManager.updateConfigScale();
        });
        
        // Background opacity and pattern intensity from settings
        const bgOpacitySlider = document.getElementById('bg-opacity-slider');
        const bgOpacityValue = document.getElementById('bg-opacity-value');
        bgOpacitySlider.addEventListener('input', (e) => {
            this.backgroundManager.setOpacity(parseInt(e.target.value) / 100);
            bgOpacityValue.textContent = e.target.value;
        });
        
        const patternIntensitySlider = document.getElementById('pattern-intensity-slider');
        const patternIntensityValue = document.getElementById('pattern-intensity-value');
        patternIntensitySlider.addEventListener('input', (e) => {
            this.backgroundManager.setPatternIntensity(parseInt(e.target.value) / 100);
            patternIntensityValue.textContent = e.target.value;
        });
        
        document.querySelectorAll('.position-option-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.settingsManager.setControlPosition(e.target.dataset.position);
            });
        });
        
        document.getElementById('edge-snap-checkbox').addEventListener('change', (e) => {
            this.settingsManager.edgeSnapEnabled = e.target.checked;
            localStorage.setItem('edgeSnapEnabled', e.target.checked);
        });
        
        document.getElementById('infinite-canvas-checkbox').addEventListener('change', (e) => {
            this.settingsManager.infiniteCanvas = e.target.checked;
            localStorage.setItem('infiniteCanvas', e.target.checked);
            this.updateCanvasMode();
        });
        
        // Show/hide zoom controls
        document.getElementById('show-zoom-controls-checkbox').addEventListener('change', (e) => {
            this.settingsManager.showZoomControls = e.target.checked;
            localStorage.setItem('showZoomControls', e.target.checked);
            this.updateZoomControlsVisibility();
        });
        
        // Pattern preferences
        document.querySelectorAll('.pattern-pref-checkbox').forEach(checkbox => {
            checkbox.addEventListener('change', (e) => {
                this.settingsManager.updatePatternPreferences();
                this.updatePatternGrid();
            });
        });
        
        document.getElementById('settings-modal').addEventListener('click', (e) => {
            if (e.target.id === 'settings-modal') {
                this.closeSettings();
            }
        });
        
        // Confirm modal
        document.getElementById('confirm-cancel-btn').addEventListener('click', () => {
            document.getElementById('confirm-modal').classList.remove('show');
        });
        
        document.getElementById('confirm-ok-btn').addEventListener('click', () => {
            document.getElementById('confirm-modal').classList.remove('show');
            this.clearCanvas(true);
        });
        
        document.getElementById('confirm-modal').addEventListener('click', (e) => {
            if (e.target.id === 'confirm-modal') {
                document.getElementById('confirm-modal').classList.remove('show');
            }
        });
    }
    
    setupKeyboardShortcuts() {
        document.addEventListener('keydown', (e) => {
            if (e.ctrlKey || e.metaKey) {
                if (e.key === 'z' && !e.shiftKey) {
                    e.preventDefault();
                    if (this.historyManager.undo()) {
                        this.updateUI();
                    }
                } else if (e.key === 'y' || (e.key === 'z' && e.shiftKey)) {
                    e.preventDefault();
                    if (this.historyManager.redo()) {
                        this.updateUI();
                    }
                }
            }
            
            // Zoom shortcuts
            if (e.key === '+' || e.key === '=') {
                e.preventDefault();
                this.zoomIn();
            } else if (e.key === '-' || e.key === '_') {
                e.preventDefault();
                this.zoomOut();
            }
            
            if (e.key === 'Escape') {
                this.closeSettings();
                this.closeConfigPanel();
            }
        });
    }
    
    setupDraggablePanels() {
        const historyControls = document.getElementById('history-controls');
        const configArea = document.getElementById('config-area');
        
        [historyControls, configArea].forEach(element => {
            element.addEventListener('mousedown', (e) => {
                if (e.target.closest('button') || e.target.closest('input')) return;
                
                this.isDraggingPanel = true;
                this.draggedElement = element;
                
                const rect = element.getBoundingClientRect();
                this.dragOffset.x = e.clientX - rect.left;
                this.dragOffset.y = e.clientY - rect.top;
                
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
            
            if (this.settingsManager.edgeSnapEnabled) {
                const edgeSnapDistance = 20;
                const windowWidth = window.innerWidth;
                const windowHeight = window.innerHeight;
                
                if (x < edgeSnapDistance) x = 0;
                if (x + this.draggedElementWidth > windowWidth - edgeSnapDistance) {
                    x = windowWidth - this.draggedElementWidth;
                }
                if (y < edgeSnapDistance) y = 0;
                if (y + this.draggedElementHeight > windowHeight - edgeSnapDistance) {
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
    
    setTool(tool) {
        this.drawingEngine.setTool(tool);
        if (tool === 'eraser') {
            this.showEraserCursor();
        } else {
            this.hideEraserCursor();
        }
        this.updateUI();
        
        if (tool === 'pen' || tool === 'eraser' || tool === 'background') {
            document.getElementById('config-area').classList.add('show');
        }
    }
    
    handleDrawingComplete() {
        if (this.drawingEngine.stopDrawing()) {
            this.historyManager.saveState();
            this.closeConfigPanel();
        }
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
    
    confirmClear() {
        document.getElementById('confirm-modal').classList.add('show');
    }
    
    clearCanvas(saveToHistory = true) {
        this.drawingEngine.clearCanvas();
        if (saveToHistory) {
            this.historyManager.saveState();
        }
    }
    
    updateUI() {
        document.querySelectorAll('.tool-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        
        document.querySelectorAll('.config-panel').forEach(panel => {
            panel.classList.remove('active');
        });
        
        const tool = this.drawingEngine.currentTool;
        if (tool === 'pen') {
            document.getElementById('pen-btn').classList.add('active');
            document.getElementById('pen-config').classList.add('active');
            this.canvas.style.cursor = 'crosshair';
        } else if (tool === 'eraser') {
            document.getElementById('eraser-btn').classList.add('active');
            document.getElementById('eraser-config').classList.add('active');
            this.canvas.style.cursor = 'pointer';
        } else if (tool === 'background') {
            document.getElementById('background-btn').classList.add('active');
            document.getElementById('background-config').classList.add('active');
            this.canvas.style.cursor = 'default';
        }
        
        document.getElementById('undo-btn').disabled = !this.historyManager.canUndo();
        document.getElementById('redo-btn').disabled = !this.historyManager.canRedo();
        
        const paginationControls = document.getElementById('pagination-controls');
        if (!this.settingsManager.infiniteCanvas) {
            paginationControls.classList.add('show');
        } else {
            paginationControls.classList.remove('show');
        }
    }
    
    updateCanvasMode() {
        this.updateUI();
        // Initialize pages array if needed
        if (!this.settingsManager.infiniteCanvas && this.pages.length === 0) {
            this.pages.push(this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height));
            this.currentPage = 1;
            this.updatePaginationUI();
        }
    }
    
    // Zoom methods
    zoomIn() {
        const currentScale = this.drawingEngine.canvasScale;
        const newScale = Math.min(currentScale + 0.1, 3.0);
        this.drawingEngine.canvasScale = newScale;
        this.updateZoomUI();
        this.applyZoom();
        localStorage.setItem('canvasScale', newScale);
    }
    
    zoomOut() {
        const currentScale = this.drawingEngine.canvasScale;
        const newScale = Math.max(currentScale - 0.1, 0.5);
        this.drawingEngine.canvasScale = newScale;
        this.updateZoomUI();
        this.applyZoom();
        localStorage.setItem('canvasScale', newScale);
    }
    
    setZoom(value) {
        let percent = parseInt(value);
        if (isNaN(percent)) {
            this.updateZoomUI();
            return;
        }
        percent = Math.max(50, Math.min(300, percent));
        const newScale = percent / 100;
        this.drawingEngine.canvasScale = newScale;
        this.updateZoomUI();
        this.applyZoom();
        localStorage.setItem('canvasScale', newScale);
    }
    
    applyZoom() {
        // Apply zoom using CSS transform for better performance
        this.canvas.style.transform = `scale(${this.drawingEngine.canvasScale})`;
        this.bgCanvas.style.transform = `scale(${this.drawingEngine.canvasScale})`;
        this.canvas.style.transformOrigin = 'center center';
        this.bgCanvas.style.transformOrigin = 'center center';
    }
    
    updateZoomUI() {
        const percent = Math.round(this.drawingEngine.canvasScale * 100);
        document.getElementById('zoom-input').value = percent + '%';
    }
    
    updateZoomControlsVisibility() {
        const historyControls = document.getElementById('history-controls');
        if (this.settingsManager.showZoomControls) {
            historyControls.style.display = 'flex';
        } else {
            historyControls.style.display = 'none';
        }
    }
    
    updatePatternGrid() {
        const patternGrid = document.getElementById('pattern-grid');
        const patterns = this.settingsManager.getPatternPreferences();
        
        // Hide all pattern buttons first
        patternGrid.querySelectorAll('.pattern-option-btn').forEach(btn => {
            const pattern = btn.dataset.pattern;
            if (patterns[pattern]) {
                btn.style.display = 'block';
            } else {
                btn.style.display = 'none';
            }
        });
    }
    
    setupCanvasZoom() {
        // Ctrl+scroll to zoom canvas
        document.addEventListener('wheel', (e) => {
            if (e.ctrlKey || e.metaKey) {
                e.preventDefault();
                
                const delta = e.deltaY;
                if (delta < 0) {
                    this.zoomIn();
                } else {
                    this.zoomOut();
                }
            }
        }, { passive: false });
    }
    
    hideHistoryControls() {
        const historyControls = document.getElementById('history-controls');
        historyControls.style.display = 'none';
    }
    
    // Pagination methods
    addPage() {
        if (this.settingsManager.infiniteCanvas) return;
        
        // Save current page
        this.pages[this.currentPage - 1] = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
        
        // Create new blank page
        this.pages.push(null);
        this.currentPage = this.pages.length;
        
        // Clear canvas for new page
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.pages[this.currentPage - 1] = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
        this.historyManager.saveState();
        this.updatePaginationUI();
    }
    prevPage() {
        if (this.settingsManager.infiniteCanvas || this.currentPage <= 1) return;
        
        // Save current page
        this.pages[this.currentPage - 1] = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
        
        // Go to previous page
        this.currentPage--;
        this.loadPage(this.currentPage);
        this.updatePaginationUI();
    }
    
    nextPage() {
        if (this.settingsManager.infiniteCanvas) return;
        
        // Save current page
        this.pages[this.currentPage - 1] = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
        
        // Go to next page (create new if needed)
        this.currentPage++;
        if (this.currentPage > this.pages.length) {
            this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
            this.pages.push(this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height));
            this.historyManager.saveState();
        } else {
            this.loadPage(this.currentPage);
        }
        this.updatePaginationUI();
    }
    
    nextOrAddPage() {
        if (this.settingsManager.infiniteCanvas) return;
        
        // Save current page
        this.pages[this.currentPage - 1] = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
        
        // Check if we're on the last page
        if (this.currentPage >= this.pages.length) {
            // Add new page
            this.pages.push(null);
            this.currentPage = this.pages.length;
            this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
            this.pages[this.currentPage - 1] = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
            this.historyManager.saveState();
        } else {
            // Go to next page
            this.currentPage++;
            this.loadPage(this.currentPage);
        }
        this.updatePaginationUI();
    }
    
    goToPage(pageNumber) {
        if (this.settingsManager.infiniteCanvas || pageNumber < 1 || pageNumber === this.currentPage) {
            this.updatePaginationUI();
            return;
        }
        
        // Save current page
        this.pages[this.currentPage - 1] = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
        
        // Create new pages if needed
        while (pageNumber > this.pages.length) {
            this.pages.push(null);
        }
        
        this.currentPage = pageNumber;
        this.loadPage(this.currentPage);
        this.updatePaginationUI();
    }
    
    loadPage(pageNumber) {
        if (pageNumber > 0 && pageNumber <= this.pages.length && this.pages[pageNumber - 1]) {
            this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
            this.ctx.putImageData(this.pages[pageNumber - 1], 0, 0);
        } else {
            this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
            if (!this.pages[pageNumber - 1]) {
                this.pages[pageNumber - 1] = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
            }
        }
        this.historyManager.saveState();
    }
    
    updatePaginationUI() {
        document.getElementById('page-input').value = this.currentPage;
        document.getElementById('page-total').textContent = `/ ${this.pages.length}`;
        
        const prevBtn = document.getElementById('prev-page-btn');
        const nextOrAddBtn = document.getElementById('next-or-add-page-btn');
        
        prevBtn.disabled = this.currentPage <= 1;
        nextOrAddBtn.disabled = false;
        
        // Update button icon and title based on whether we're on the last page
        if (this.currentPage >= this.pages.length) {
            // Show add icon
            nextOrAddBtn.innerHTML = `
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <line x1="12" y1="5" x2="12" y2="19"></line>
                    <line x1="5" y1="12" x2="19" y2="12"></line>
                </svg>
            `;
            nextOrAddBtn.title = '新建页面';
        } else {
            // Show next icon
            nextOrAddBtn.innerHTML = `
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <polyline points="9 18 15 12 9 6"></polyline>
                </svg>
            `;
            nextOrAddBtn.title = '下一页';
        }
    }
    
    updateEraserCursor(e) {
        if (this.drawingEngine.currentTool === 'eraser') {
            this.eraserCursor.style.left = e.clientX + 'px';
            this.eraserCursor.style.top = e.clientY + 'px';
            this.eraserCursor.style.width = this.drawingEngine.eraserSize + 'px';
            this.eraserCursor.style.height = this.drawingEngine.eraserSize + 'px';
        }
    }
    
    showEraserCursor() {
        if (this.drawingEngine.currentTool === 'eraser') {
            this.eraserCursor.style.display = 'block';
        }
    }
    
    hideEraserCursor() {
        this.eraserCursor.style.display = 'none';
    }
    
    // Pinch zoom and pan gesture handlers
    handlePinchStart(e) {
        if (e.touches.length !== 2) return;
        
        this.isPinching = true;
        const touch1 = e.touches[0];
        const touch2 = e.touches[1];
        this.lastPinchDistance = this.getPinchDistance(touch1, touch2);
        this.lastPinchCenter = this.getPinchCenter(touch1, touch2);
    }
    
    handlePinchMove(e) {
        if (!this.isPinching || e.touches.length !== 2) return;
        
        const touch1 = e.touches[0];
        const touch2 = e.touches[1];
        const currentDistance = this.getPinchDistance(touch1, touch2);
        const currentCenter = this.getPinchCenter(touch1, touch2);
        
        if (this.lastPinchDistance > 0 && this.lastPinchCenter) {
            // Calculate zoom based on pinch distance
            const scale = currentDistance / this.lastPinchDistance;
            const newScale = Math.max(0.5, Math.min(3.0, this.drawingEngine.canvasScale * scale));
            
            this.drawingEngine.canvasScale = newScale;
            this.applyZoom();
            this.updateZoomUI();
            localStorage.setItem('canvasScale', newScale);
            
            // Calculate pan based on center movement
            const deltaX = currentCenter.x - this.lastPinchCenter.x;
            const deltaY = currentCenter.y - this.lastPinchCenter.y;
            
            // Apply panning to canvas offset
            this.drawingEngine.panOffset.x += deltaX;
            this.drawingEngine.panOffset.y += deltaY;
            localStorage.setItem('panOffsetX', this.drawingEngine.panOffset.x);
            localStorage.setItem('panOffsetY', this.drawingEngine.panOffset.y);
            
            // Apply visual pan effect
            this.canvas.style.transform = `scale(${this.drawingEngine.canvasScale}) translate(${this.drawingEngine.panOffset.x}px, ${this.drawingEngine.panOffset.y}px)`;
            this.bgCanvas.style.transform = `scale(${this.drawingEngine.canvasScale}) translate(${this.drawingEngine.panOffset.x}px, ${this.drawingEngine.panOffset.y}px)`;
        }
        
        this.lastPinchDistance = currentDistance;
        this.lastPinchCenter = currentCenter;
    }
    
    handlePinchEnd() {
        this.isPinching = false;
        this.lastPinchDistance = 0;
        this.lastPinchCenter = null;
    }
    
    getPinchDistance(touch1, touch2) {
        const dx = touch2.clientX - touch1.clientX;
        const dy = touch2.clientY - touch1.clientY;
        return Math.sqrt(dx * dx + dy * dy);
    }
    
    getPinchCenter(touch1, touch2) {
        return {
            x: (touch1.clientX + touch2.clientX) / 2,
            y: (touch1.clientY + touch2.clientY) / 2
        };
    }
    
    redrawCanvas() {
        // Save current canvas content
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = this.canvas.width;
        tempCanvas.height = this.canvas.height;
        const tempCtx = tempCanvas.getContext('2d');
        tempCtx.drawImage(this.canvas, 0, 0);
        
        // Clear and restore with pan transformations
        const dpr = window.devicePixelRatio || 1;
        this.ctx.save();
        this.ctx.setTransform(1, 0, 0, 1, 0, 0);
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.ctx.scale(dpr, dpr);
        this.ctx.translate(this.drawingEngine.panOffset.x, this.drawingEngine.panOffset.y);
        this.ctx.drawImage(tempCanvas, 0, 0, this.canvas.width / dpr, this.canvas.height / dpr);
        this.ctx.restore();
    }
}

// Initialize the application
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        new DrawingBoard();
    });
} else {
    new DrawingBoard();
}
