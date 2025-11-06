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
        this.strokeControls = new StrokeControls(this.drawingEngine, this.canvas, this.ctx, this.historyManager);
        this.selectionManager = new SelectionManager(this.canvas, this.ctx, this.drawingEngine, this.strokeControls);
        this.shapeInsertionManager = new ShapeInsertionManager(this.canvas, this.ctx, this.historyManager, this.drawingEngine);
        this.timeDisplayManager = new TimeDisplayManager();
        this.settingsManager = new SettingsManager();
        this.announcementManager = new AnnouncementManager();
        this.exportManager = new ExportManager(this.canvas, this.bgCanvas);
        
        // Pagination
        this.currentPage = 1;
        this.pages = [];
        this.pageBackgrounds = {}; // Store background settings per page
        
        // Load saved page backgrounds
        const savedPageBackgrounds = localStorage.getItem('pageBackgrounds');
        if (savedPageBackgrounds) {
            try {
                this.pageBackgrounds = JSON.parse(savedPageBackgrounds);
            } catch (e) {
                console.warn('Failed to load page backgrounds:', e);
            }
        }
        
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
        
        // Coordinate origin dragging state
        this.isDraggingCoordinateOrigin = false;
        this.coordinateOriginDragStart = { x: 0, y: 0 };
        
        // Uploaded images storage
        this.uploadedImages = this.loadUploadedImages();
        
        // Initialize
        this.resizeCanvas();
        this.setupEventListeners();
        this.settingsManager.loadSettings();
        this.backgroundManager.drawBackground();
        this.updateUI();
        this.historyManager.saveState();
        this.initializeCanvasView(); // Initialize canvas view (70% scale, centered)
        this.updateZoomUI();
        this.applyZoom();
        this.updateZoomControlsVisibility();
        this.updateFullscreenBtnVisibility();
        this.updatePatternGrid();
        this.updateUploadedImagesButtons();
        
        // Listen for fullscreen changes
        document.addEventListener('fullscreenchange', () => this.handleFullscreenChange());
    }
    
    
    initializeCanvasView() {
        // On startup or refresh, set canvas to 70% of fullscreen size and center it
        // Only apply if no saved scale exists
        const savedScale = localStorage.getItem('canvasScale');
        if (!savedScale) {
            this.drawingEngine.canvasScale = 0.7;
            localStorage.setItem('canvasScale', 0.7);
        }
        
        // Center the canvas on startup
        this.centerCanvas();
    }
    
    centerCanvas() {
        // Get the viewport dimensions
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;
        
        // Get the canvas center (at 0,0 without pan offset, canvas is conceptually infinite)
        // We want to move the canvas so that the origin (0,0) is centered in the viewport
        // Pan offset moves the canvas, so positive offset moves content right/down
        const centerX = viewportWidth / 2;
        const centerY = viewportHeight / 2;
        
        // Set pan offset to center the origin
        this.drawingEngine.panOffset.x = centerX / this.drawingEngine.canvasScale;
        this.drawingEngine.panOffset.y = centerY / this.drawingEngine.canvasScale;
        
        // Save to localStorage
        localStorage.setItem('panOffsetX', this.drawingEngine.panOffset.x);
        localStorage.setItem('panOffsetY', this.drawingEngine.panOffset.y);
        
        // Apply the transform
        this.applyPanTransform();
    }
    
    resizeCanvas() {
        // 获取窗口尺寸而不是当前canvas的尺寸，避免缩放导致canvas消失
        const windowWidth = window.innerWidth;
        const windowHeight = window.innerHeight;
        const dpr = window.devicePixelRatio || 1;
        
        const oldWidth = this.canvas.width;
        const oldHeight = this.canvas.height;
        const imageData = this.historyManager.historyStep >= 0 ? 
            this.ctx.getImageData(0, 0, oldWidth, oldHeight) : null;
        
        // 使用窗口尺寸设置canvas大小，确保canvas始终占据整个窗口
        this.canvas.width = windowWidth * dpr;
        this.canvas.height = windowHeight * dpr;
        this.canvas.style.width = windowWidth + 'px';
        this.canvas.style.height = windowHeight + 'px';
        
        this.bgCanvas.width = windowWidth * dpr;
        this.bgCanvas.height = windowHeight * dpr;
        this.bgCanvas.style.width = windowWidth + 'px';
        this.bgCanvas.style.height = windowHeight + 'px';
        
        this.ctx.scale(dpr, dpr);
        this.bgCtx.scale(dpr, dpr);
        
        if (imageData) {
            this.ctx.putImageData(imageData, 0, 0);
        }
        
        this.backgroundManager.drawBackground();
        
        // Redraw shapes after resize
        if (this.shapeInsertionManager) {
            this.shapeInsertionManager.redrawCanvas();
        }
        
        // Re-center the canvas after resize
        this.centerCanvas();
    }
    
    setupEventListeners() {
        // Canvas drawing events - use document-level listeners for continuous drawing
        document.addEventListener('mousedown', (e) => {
            // Skip if clicking on UI elements (except canvas)
            if (e.target && e.target.closest) {
            // 如果正在编辑笔迹，点击工具栏或属性栏时自动保存
                if (this.strokeControls.isActive && 
                    (e.target.closest('#toolbar') || e.target.closest('#config-area'))) {
                    this.strokeControls.hideControls();
                    if (this.historyManager) {
                        this.historyManager.saveState();
                    }
                }
                
                if (e.target.closest('#toolbar') || 
                    e.target.closest('#config-area') || 
                    e.target.closest('#history-controls') || 
                    e.target.closest('#pagination-controls') ||
                    e.target.closest('.modal') ||
                    e.target.closest('.canvas-image-selection')) {
                    return;
                }
            }
            
            // 如果正在编辑笔迹，点击画布其他位置时自动保存并切换到笔模式
            if (this.strokeControls.isActive) {
                const rect = this.canvas.getBoundingClientRect();
                const x = e.clientX - rect.left;
                const y = e.clientY - rect.top;
                
                // Check if clicking inside the stroke controls overlay
                if (!e.target.closest('#stroke-controls-overlay')) {
                    // Clicking outside the stroke controls, save and switch to pen
                    this.strokeControls.hideControls();
                    if (this.historyManager) {
                        this.historyManager.saveState();
                    }
                    this.setTool('pen', false);
                    // Continue with pen drawing by calling startDrawing
                    this.drawingEngine.startDrawing(e);
                    return;
                }
            }
            
            // Check if clicking on coordinate origin point (in background or select mode)
            if ((this.drawingEngine.currentTool === 'background' || this.drawingEngine.currentTool === 'select') && 
                this.backgroundManager.backgroundPattern === 'coordinate') {
                const rect = this.bgCanvas.getBoundingClientRect();
                const x = e.clientX - rect.left;
                const y = e.clientY - rect.top;
                
                if (this.backgroundManager.isPointNearCoordinateOrigin(x, y)) {
                    this.isDraggingCoordinateOrigin = true;
                    this.coordinateOriginDragStart = { x: e.clientX, y: e.clientY };
                    return;
                }
            }
            
            // Auto-switch to pen mode if currently in background mode
            // But not if image controls are active (user is manipulating background image)
            if (this.drawingEngine.currentTool === 'background' && !this.imageControls.isActive) {
                this.setTool('pen', false); // Don't show config panel
            }
            
            // Handle shape tool - insert shape at click position
            if (this.drawingEngine.currentTool === 'shape') {
                this.shapeInsertionManager.insertShape(e);
                return;
            }
            
            // Handle selection tool - check for shape objects first
            if (this.drawingEngine.currentTool === 'select') {
                const rect = this.canvas.getBoundingClientRect();
                const scaleX = this.canvas.offsetWidth / rect.width;
                const scaleY = this.canvas.offsetHeight / rect.height;
                let x = (e.clientX - rect.left) * scaleX;
                let y = (e.clientY - rect.top) * scaleY;
                
                // Transform to canvas coordinate space
                x = (x - this.drawingEngine.panOffset.x) / this.drawingEngine.canvasScale;
                y = (y - this.drawingEngine.panOffset.y) / this.drawingEngine.canvasScale;
                
                // Check if clicking on shape object first
                const shapeIndex = this.shapeInsertionManager.hitTestShape(x, y);
                if (shapeIndex >= 0) {
                    this.shapeInsertionManager.selectShape(shapeIndex);
                    this.shapeInsertionManager.startDrag(e);
                    this.updateUI();
                    return;
                }
                
                // Otherwise, handle normal selection
                this.selectionManager.startSelection(e);
                this.updateUI();
                return;
            }
            
            if (e.button === 1 || (e.button === 0 && e.shiftKey) || this.drawingEngine.currentTool === 'pan') {
                this.drawingEngine.startPanning(e);
            } else if (this.drawingEngine.currentTool === 'pen' || this.drawingEngine.currentTool === 'eraser') {
                this.drawingEngine.startDrawing(e);
            }
        });
        
        document.addEventListener('mousemove', (e) => {
            if (this.isDraggingCoordinateOrigin) {
                this.dragCoordinateOrigin(e);
            } else if (this.shapeInsertionManager.isDrawingShape) {
                this.shapeInsertionManager.continueDrawingShape(e);
            } else if (this.shapeInsertionManager.isDragging || this.shapeInsertionManager.isResizing || this.shapeInsertionManager.isRotating) {
                this.shapeInsertionManager.dragShape(e);
            } else if (this.drawingEngine.isPanning) {
                this.drawingEngine.pan(e);
                this.applyPanTransform();
            } else if (this.drawingEngine.isDrawing) {
                this.drawingEngine.draw(e);
                this.updateEraserCursor(e);
            } else {
                this.updateEraserCursor(e);
            }
        });
        
        document.addEventListener('mouseup', () => {
            this.stopDraggingCoordinateOrigin();
            if (this.shapeInsertionManager.isDrawingShape) {
                this.shapeInsertionManager.finishDrawingShape();
            }
            this.shapeInsertionManager.stopDrag();
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
                    this.drawingEngine.isDrawing = false;
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
        document.getElementById('select-btn').addEventListener('click', () => this.setTool('select'));
        document.getElementById('shape-btn').addEventListener('click', () => this.setTool('shape'));
        document.getElementById('pan-btn').addEventListener('click', () => this.setTool('pan'));
        document.getElementById('eraser-btn').addEventListener('click', () => this.setTool('eraser'));
        document.getElementById('background-btn').addEventListener('click', () => this.setTool('background'));
        document.getElementById('clear-btn').addEventListener('click', () => this.confirmClear());
        document.getElementById('settings-btn').addEventListener('click', () => this.openSettings());
        document.getElementById('more-btn').addEventListener('click', () => this.setTool('more'));
        
        document.getElementById('config-close-btn').addEventListener('click', () => this.closeConfigPanel());
        
        // History buttons
        document.getElementById('undo-btn').addEventListener('click', () => {
            if (this.historyManager.undo()) {
                // Clear stroke selection as strokes are no longer valid
                this.drawingEngine.clearStrokes();
                this.updateUI();
                // Redraw shapes after undo
                if (this.shapeInsertionManager) {
                    this.shapeInsertionManager.redrawCanvas();
                }
            }
        });
        
        document.getElementById('redo-btn').addEventListener('click', () => {
            if (this.historyManager.redo()) {
                // Clear stroke selection as strokes are no longer valid
                this.drawingEngine.clearStrokes();
                this.updateUI();
                // Redraw shapes after redo
                if (this.shapeInsertionManager) {
                    this.shapeInsertionManager.redrawCanvas();
                }
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
        
        // Fullscreen button
        document.getElementById('fullscreen-btn').addEventListener('click', () => this.toggleFullscreen());
        
        // Export button (moved to top controls, always visible)
        document.getElementById('export-btn-top').addEventListener('click', () => this.exportManager.showModal());
        
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
        
        // Debounce resize handler for better performance
        let resizeTimeout;
        window.addEventListener('resize', () => {
            clearTimeout(resizeTimeout);
            resizeTimeout = setTimeout(() => {
                this.resizeCanvas();
                // Update toolbar text visibility on resize
                this.settingsManager.updateToolbarTextVisibility();
                // Reposition toolbars to ensure they stay within viewport
                this.repositionToolbarsOnResize();
            }, 150); // 150ms debounce delay
        });
        
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
                // Save page background in paginated mode
                if (!this.settingsManager.infiniteCanvas) {
                    this.savePageBackground(this.currentPage);
                }
            });
        });
        
        const customBgColorPicker = document.getElementById('custom-bg-color-picker');
        customBgColorPicker.addEventListener('input', (e) => {
            this.backgroundManager.setBackgroundColor(e.target.value);
            document.querySelectorAll('.color-btn[data-bg-color]').forEach(b => b.classList.remove('active'));
            // Save page background in paginated mode
            if (!this.settingsManager.infiniteCanvas) {
                this.savePageBackground(this.currentPage);
            }
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
                    
                    // Show/hide pattern density slider based on pattern
                    const patternDensityGroup = document.getElementById('pattern-density-group');
                    if (pattern !== 'blank' && pattern !== 'image') {
                        patternDensityGroup.style.display = 'flex';
                    } else {
                        patternDensityGroup.style.display = 'none';
                    }
                    
                    // Save page background in paginated mode
                    if (!this.settingsManager.infiniteCanvas) {
                        this.savePageBackground(this.currentPage);
                    }
                }
            });
        });
        
        // Background image upload
        document.getElementById('bg-image-upload').addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = (event) => {
                    const imageData = event.target.result;
                    
                    // Reset confirmation state for new image
                    this.imageControls.resetConfirmation();
                    
                    this.backgroundManager.setBackgroundImage(imageData);
                    document.querySelectorAll('.pattern-option-btn').forEach(b => b.classList.remove('active'));
                    document.querySelector('.pattern-option-btn[data-pattern="image"]').classList.add('active');
                    document.getElementById('image-size-group').style.display = 'flex';
                    // Hide pattern density when image is uploaded
                    document.getElementById('pattern-density-group').style.display = 'none';
                    
                    // Save uploaded image
                    this.saveUploadedImage(imageData);
                    
                    // Show image controls for manipulation
                    const imgData = this.backgroundManager.getImageData();
                    if (imgData) {
                        this.imageControls.showControls(imgData);
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
        
        // Adjust background image button
        document.getElementById('adjust-bg-image-btn').addEventListener('click', () => {
            // Reset confirmation state to allow re-adjustment
            this.imageControls.resetConfirmation();
            
            // Show image controls for the current background image
            const imgData = this.backgroundManager.getImageData();
            if (imgData) {
                this.imageControls.showControls(imgData);
            }
        });
        
        // Pattern density slider
        const patternDensitySlider = document.getElementById('pattern-density-slider');
        const patternDensityValue = document.getElementById('pattern-density-value');
        patternDensitySlider.addEventListener('input', (e) => {
            this.backgroundManager.setPatternDensity(parseInt(e.target.value) / 100);
            patternDensityValue.textContent = e.target.value;
        });
        
        // Sliders
        const penSizeSlider = document.getElementById('pen-size-slider');
        const penSizeValue = document.getElementById('pen-size-value');
        penSizeSlider.addEventListener('input', (e) => {
            this.drawingEngine.setPenSize(parseInt(e.target.value));
            penSizeValue.textContent = e.target.value;
        });
        
        // Eraser shape buttons
        document.querySelectorAll('.eraser-shape-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.drawingEngine.setEraserShape(e.target.dataset.eraserShape);
                document.querySelectorAll('.eraser-shape-btn').forEach(b => b.classList.remove('active'));
                e.target.classList.add('active');
                // Update cursor shape
                this.updateEraserCursorShape();
            });
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
        
        // Selection tool buttons
        document.getElementById('select-copy-btn').addEventListener('click', () => {
            // Try shape copy first, then selection copy
            if (this.shapeInsertionManager.hasSelection()) {
                this.shapeInsertionManager.copySelectedShape();
            } else if (this.selectionManager.copySelection()) {
                this.historyManager.saveState();
            }
        });
        
        document.getElementById('select-delete-btn').addEventListener('click', () => {
            // Try shape delete first, then selection delete
            if (this.shapeInsertionManager.hasSelection()) {
                this.shapeInsertionManager.deleteSelectedShape();
            } else if (this.selectionManager.deleteSelection()) {
                this.historyManager.saveState();
            }
        });
        
        // Shape type buttons
        document.querySelectorAll('.pen-type-btn[data-shape-type]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.shapeInsertionManager.setShapeType(e.target.dataset.shapeType);
                document.querySelectorAll('.pen-type-btn[data-shape-type]').forEach(b => b.classList.remove('active'));
                e.target.classList.add('active');
            });
        });
        
        // More config panel (time display toggle)
        const toggleTimeDisplayBtn = document.getElementById('toggle-time-display-btn');
        const timeDisplayStatus = document.getElementById('time-display-status');
        const timeDisplayOptions = document.getElementById('time-display-options');
        const showDateCheckbox = document.getElementById('show-date-checkbox');
        const showTimeCheckbox = document.getElementById('show-time-checkbox');
        
        if (toggleTimeDisplayBtn) {
            toggleTimeDisplayBtn.addEventListener('click', () => {
                this.timeDisplayManager.toggle();
                if (this.timeDisplayManager.enabled) {
                    timeDisplayStatus.textContent = '隐藏时间';
                    timeDisplayOptions.style.display = 'block';
                } else {
                    timeDisplayStatus.textContent = '显示时间';
                    timeDisplayOptions.style.display = 'none';
                }
            });
        }
        
        if (showDateCheckbox) {
            showDateCheckbox.addEventListener('change', (e) => {
                this.timeDisplayManager.setShowDate(e.target.checked);
            });
        }
        
        if (showTimeCheckbox) {
            showTimeCheckbox.addEventListener('change', (e) => {
                this.timeDisplayManager.setShowTime(e.target.checked);
            });
        }
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
        
        // Canvas mode buttons
        document.querySelectorAll('.canvas-mode-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const mode = e.target.dataset.mode;
                this.settingsManager.setCanvasMode(mode);
                document.querySelectorAll('.canvas-mode-btn').forEach(b => b.classList.remove('active'));
                e.target.classList.add('active');
                this.updateCanvasMode();
            });
        });
        
        // Canvas preset buttons
        document.querySelectorAll('.canvas-preset-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const preset = e.target.dataset.preset;
                this.settingsManager.setCanvasPreset(preset);
                document.querySelectorAll('.canvas-preset-btn').forEach(b => b.classList.remove('active'));
                e.target.classList.add('active');
                this.applyCanvasSize();
            });
        });
        
        // Canvas size inputs
        document.getElementById('canvas-width-input').addEventListener('change', (e) => {
            const width = parseInt(e.target.value);
            const height = parseInt(document.getElementById('canvas-height-input').value);
            this.settingsManager.setCanvasSize(width, height);
            // Set to custom when manually changing size
            document.querySelectorAll('.canvas-preset-btn').forEach(b => b.classList.remove('active'));
            document.querySelector('.canvas-preset-btn[data-preset="custom"]').classList.add('active');
            this.applyCanvasSize();
        });
        
        document.getElementById('canvas-height-input').addEventListener('change', (e) => {
            const height = parseInt(e.target.value);
            const width = parseInt(document.getElementById('canvas-width-input').value);
            this.settingsManager.setCanvasSize(width, height);
            // Set to custom when manually changing size
            document.querySelectorAll('.canvas-preset-btn').forEach(b => b.classList.remove('active'));
            document.querySelector('.canvas-preset-btn[data-preset="custom"]').classList.add('active');
            this.applyCanvasSize();
        });
        
        // Canvas ratio selector
        document.getElementById('canvas-ratio-select').addEventListener('change', (e) => {
            const ratio = e.target.value;
            if (ratio !== 'custom') {
                const width = parseInt(document.getElementById('canvas-width-input').value);
                let height;
                
                switch(ratio) {
                    case '16:9':
                        height = Math.round(width * 9 / 16);
                        break;
                    case '4:3':
                        height = Math.round(width * 3 / 4);
                        break;
                    case '1:1':
                        height = width;
                        break;
                    case '3:4':
                        height = Math.round(width * 4 / 3);
                        break;
                    case '9:16':
                        height = Math.round(width * 16 / 9);
                        break;
                }
                
                document.getElementById('canvas-height-input').value = height;
                this.settingsManager.setCanvasSize(width, height);
            }
        });
        
        // Show/hide zoom controls
        document.getElementById('show-zoom-controls-checkbox').addEventListener('change', (e) => {
            this.settingsManager.showZoomControls = e.target.checked;
            localStorage.setItem('showZoomControls', e.target.checked);
            this.updateZoomControlsVisibility();
        });
        
        // Show/hide fullscreen button
        document.getElementById('show-fullscreen-btn-checkbox').addEventListener('change', (e) => {
            this.settingsManager.showFullscreenBtn = e.target.checked;
            localStorage.setItem('showFullscreenBtn', e.target.checked);
            this.updateFullscreenBtnVisibility();
        });
        
        // Theme color buttons
        document.querySelectorAll('.color-btn[data-theme-color]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.settingsManager.setThemeColor(e.target.dataset.themeColor);
                document.querySelectorAll('.color-btn[data-theme-color]').forEach(b => b.classList.remove('active'));
                e.target.classList.add('active');
            });
        });
        
        const customThemeColorPicker = document.getElementById('custom-theme-color-picker');
        customThemeColorPicker.addEventListener('input', (e) => {
            this.settingsManager.setThemeColor(e.target.value);
            document.querySelectorAll('.color-btn[data-theme-color]').forEach(b => b.classList.remove('active'));
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
        
        // Time display settings
        document.getElementById('show-time-display-checkbox').addEventListener('change', (e) => {
            if (e.target.checked) {
                this.timeDisplayManager.show();
            } else {
                this.timeDisplayManager.hide();
            }
        });
        
        // Independent date/time checkboxes
        const showDateOnlyCheckbox = document.getElementById('show-date-only-checkbox');
        const showTimeOnlyCheckbox = document.getElementById('show-time-only-checkbox');
        
        if (showDateOnlyCheckbox) {
            showDateOnlyCheckbox.addEventListener('change', (e) => {
                if (e.target.checked) {
                    this.timeDisplayManager.setShowDate(true);
                    this.timeDisplayManager.setShowTime(false);
                    showTimeOnlyCheckbox.checked = false;
                }
            });
        }
        
        if (showTimeOnlyCheckbox) {
            showTimeOnlyCheckbox.addEventListener('change', (e) => {
                if (e.target.checked) {
                    this.timeDisplayManager.setShowDate(false);
                    this.timeDisplayManager.setShowTime(true);
                    showDateOnlyCheckbox.checked = false;
                }
            });
        }
        
        document.getElementById('time-format-select').addEventListener('change', (e) => {
            this.timeDisplayManager.setTimeFormat(e.target.value);
        });
        
        document.getElementById('date-format-select').addEventListener('change', (e) => {
            this.timeDisplayManager.setDateFormat(e.target.value);
        });
        
        // Time color buttons
        document.querySelectorAll('.color-btn[data-time-color]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.timeDisplayManager.setColor(e.target.dataset.timeColor);
                document.querySelectorAll('.color-btn[data-time-color]').forEach(b => b.classList.remove('active'));
                e.target.classList.add('active');
            });
        });
        
        const customTimeColorPicker = document.getElementById('custom-time-color-picker');
        customTimeColorPicker.addEventListener('input', (e) => {
            this.timeDisplayManager.setColor(e.target.value);
            document.querySelectorAll('.color-btn[data-time-color]').forEach(b => b.classList.remove('active'));
        });
        
        // Font size slider and input
        const timeFontSizeSlider = document.getElementById('time-font-size-slider');
        const timeFontSizeValue = document.getElementById('time-font-size-value');
        const timeFontSizeInput = document.getElementById('time-font-size-input');
        
        timeFontSizeSlider.addEventListener('input', (e) => {
            const size = parseInt(e.target.value);
            timeFontSizeValue.textContent = size;
            timeFontSizeInput.value = size;
            this.timeDisplayManager.setFontSize(size);
        });
        
        timeFontSizeInput.addEventListener('change', (e) => {
            const size = parseInt(e.target.value);
            if (size >= 12 && size <= 48) {
                timeFontSizeValue.textContent = size;
                timeFontSizeSlider.value = size;
                this.timeDisplayManager.setFontSize(size);
            }
        });
        
        // Opacity slider and input
        const timeOpacitySlider = document.getElementById('time-opacity-slider');
        const timeOpacityValue = document.getElementById('time-opacity-value');
        const timeOpacityInput = document.getElementById('time-opacity-input');
        
        timeOpacitySlider.addEventListener('input', (e) => {
            const opacity = parseInt(e.target.value);
            timeOpacityValue.textContent = opacity;
            timeOpacityInput.value = opacity;
            this.timeDisplayManager.setOpacity(opacity);
        });
        
        timeOpacityInput.addEventListener('change', (e) => {
            const opacity = parseInt(e.target.value);
            if (opacity >= 10 && opacity <= 100) {
                timeOpacityValue.textContent = opacity;
                timeOpacitySlider.value = opacity;
                this.timeDisplayManager.setOpacity(opacity);
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
        
        // Listen for image confirmed event from background image controls
        window.addEventListener('imageConfirmed', () => {
            // Auto-switch to pen tool when user confirms background image
            if (this.drawingEngine.currentTool === 'background') {
                this.setTool('pen', false);
            }
        });
    }
    
    repositionToolbarsOnResize() {
        // Ensure all toolbars and panels stay within viewport after window resize
        const EDGE_SPACING = 10; // Minimum spacing from viewport edges
        const panels = [
            document.getElementById('history-controls'),
            document.getElementById('config-area'),
            document.getElementById('toolbar'),
            document.getElementById('pagination-controls')
        ];
        
        const windowWidth = window.innerWidth;
        const windowHeight = window.innerHeight;
        
        panels.forEach(panel => {
            if (!panel) return;
            
            const rect = panel.getBoundingClientRect();
            const computedStyle = window.getComputedStyle(panel);
            
            // Get current position
            let left = parseFloat(computedStyle.left) || 0;
            let top = parseFloat(computedStyle.top) || 0;
            let right = computedStyle.right !== 'auto' ? parseFloat(computedStyle.right) : null;
            let bottom = computedStyle.bottom !== 'auto' ? parseFloat(computedStyle.bottom) : null;
            
            // Check if panel is positioned and might overflow
            const hasCustomPosition = computedStyle.left !== 'auto' || computedStyle.top !== 'auto' || 
                                     computedStyle.right !== 'auto' || computedStyle.bottom !== 'auto';
            
            if (!hasCustomPosition) return;
            
            // Adjust position if overflowing
            if (right !== null) {
                // Panel is right-aligned - check if actual left position would be negative
                const actualLeft = windowWidth - right - rect.width;
                if (actualLeft < 0) {
                    panel.style.right = `${EDGE_SPACING}px`;
                }
            } else if (left + rect.width > windowWidth - EDGE_SPACING) {
                // Panel overflows right edge (accounting for edge spacing)
                const newLeft = Math.max(EDGE_SPACING, windowWidth - rect.width - EDGE_SPACING);
                panel.style.left = `${newLeft}px`;
                panel.style.right = 'auto';
            }
            
            if (bottom !== null) {
                // Panel is bottom-aligned - check if actual top position would be negative
                const actualTop = windowHeight - bottom - rect.height;
                if (actualTop < 0) {
                    panel.style.bottom = `${EDGE_SPACING}px`;
                }
            } else if (top + rect.height > windowHeight - EDGE_SPACING) {
                // Panel overflows bottom edge (accounting for edge spacing)
                const newTop = Math.max(EDGE_SPACING, windowHeight - rect.height - EDGE_SPACING);
                panel.style.top = `${newTop}px`;
                panel.style.bottom = 'auto';
            }
            
            // Also ensure panel doesn't overflow left or top edges
            if (left < EDGE_SPACING) {
                panel.style.left = `${EDGE_SPACING}px`;
            }
            if (top < EDGE_SPACING) {
                panel.style.top = `${EDGE_SPACING}px`;
            }
        });
    }
    
    setupDraggablePanels() {
        const historyControls = document.getElementById('history-controls');
        const configArea = document.getElementById('config-area');
        const toolbar = document.getElementById('toolbar');
        
        [historyControls, configArea, toolbar].forEach(element => {
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
            
            const edgeSnapDistance = 30;
            const windowWidth = window.innerWidth;
            const windowHeight = window.innerHeight;
            const isToolbar = this.draggedElement.id === 'toolbar';
            const isConfigArea = this.draggedElement.id === 'config-area';
            
            let snappedToEdge = false;
            let isVertical = false;
            let snappedLeft = false;
            let snappedRight = false;
            
            if (this.settingsManager.edgeSnapEnabled) {
                // Check for left edge snap first
                if (x < edgeSnapDistance) {
                    x = 10;
                    snappedToEdge = true;
                    isVertical = true;
                    snappedLeft = true;
                }
                // Check for right edge snap
                else if (x + this.draggedElementWidth > windowWidth - edgeSnapDistance) {
                    // When vertical, need to recalculate width
                    if (isToolbar || isConfigArea) {
                        // Temporarily add vertical class to get correct dimensions
                        this.draggedElement.classList.add('vertical');
                        const tempWidth = this.draggedElement.getBoundingClientRect().width;
                        this.draggedElement.classList.remove('vertical');
                        x = windowWidth - tempWidth - 10;
                    } else {
                        x = windowWidth - this.draggedElementWidth - 10;
                    }
                    snappedToEdge = true;
                    isVertical = true;
                    snappedRight = true;
                }
                // Snap to top
                if (y < edgeSnapDistance) {
                    y = 10;
                    snappedToEdge = true;
                }
                // Snap to bottom
                if (y + this.draggedElementHeight > windowHeight - edgeSnapDistance) {
                    y = windowHeight - this.draggedElementHeight - 10;
                    snappedToEdge = true;
                }
            }
            
            // Apply vertical layout for toolbar and config area when snapped to left/right
            if ((isToolbar || isConfigArea) && snappedToEdge && isVertical) {
                this.draggedElement.classList.add('vertical');
                // Recalculate position after adding vertical class to account for dimension changes
                if (snappedRight) {
                    const newWidth = this.draggedElement.getBoundingClientRect().width;
                    x = windowWidth - newWidth - 10;
                }
            } else {
                this.draggedElement.classList.remove('vertical');
            }
            
            // Constrain to viewport boundaries (prevent overflow)
            x = Math.max(0, Math.min(x, windowWidth - this.draggedElement.getBoundingClientRect().width));
            y = Math.max(0, Math.min(y, windowHeight - this.draggedElement.getBoundingClientRect().height));
            
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
    
    setTool(tool, showConfig = true) {
        this.drawingEngine.setTool(tool);
        if (tool === 'eraser') {
            this.showEraserCursor();
        } else {
            this.hideEraserCursor();
        }
        
        // Clear selection when switching away from select tool
        if (tool !== 'select') {
            this.selectionManager.clearSelection();
            this.shapeInsertionManager.deselectShape();
        }
        
        this.updateUI();
        
        // 使用"移动"功能时隐藏config-area
        if (tool === 'pan') {
            document.getElementById('config-area').classList.remove('show');
        } else if (showConfig && (tool === 'pen' || tool === 'eraser' || tool === 'background' || tool === 'select' || tool === 'shape' || tool === 'more')) {
            document.getElementById('config-area').classList.add('show');
            
            // Update More config panel state
            if (tool === 'more') {
                const timeDisplayStatus = document.getElementById('time-display-status');
                const timeDisplayOptions = document.getElementById('time-display-options');
                const showDateCheckbox = document.getElementById('show-date-checkbox');
                const showTimeCheckbox = document.getElementById('show-time-checkbox');
                
                if (timeDisplayStatus) {
                    timeDisplayStatus.textContent = this.timeDisplayManager.enabled ? '隐藏时间' : '显示时间';
                }
                if (timeDisplayOptions) {
                    timeDisplayOptions.style.display = this.timeDisplayManager.enabled ? 'block' : 'none';
                }
                if (showDateCheckbox) {
                    showDateCheckbox.checked = this.timeDisplayManager.showDate;
                }
                if (showTimeCheckbox) {
                    showTimeCheckbox.checked = this.timeDisplayManager.showTime;
                }
            }
        }
    }
    
    handleDrawingComplete() {
        if (this.drawingEngine.stopDrawing()) {
            this.historyManager.saveState();
            this.closeConfigPanel();
        }
        // Redraw shapes on top
        if (this.shapeInsertionManager) {
            this.shapeInsertionManager.redrawCanvas();
        }
    }
    
    closeConfigPanel() {
        document.getElementById('config-area').classList.remove('show');
    }
    
    openSettings() {
        document.getElementById('settings-modal').classList.add('show');
        
        // Update time display settings UI with current values
        document.getElementById('show-time-display-checkbox').checked = this.timeDisplayManager.enabled;
        document.getElementById('time-format-select').value = this.timeDisplayManager.timeFormat;
        document.getElementById('date-format-select').value = this.timeDisplayManager.dateFormat;
        document.getElementById('time-font-size-slider').value = this.timeDisplayManager.fontSize;
        document.getElementById('time-font-size-value').textContent = this.timeDisplayManager.fontSize;
        document.getElementById('time-font-size-input').value = this.timeDisplayManager.fontSize;
        document.getElementById('time-opacity-slider').value = this.timeDisplayManager.opacity;
        document.getElementById('time-opacity-value').textContent = this.timeDisplayManager.opacity;
        document.getElementById('time-opacity-input').value = this.timeDisplayManager.opacity;
        document.getElementById('custom-time-color-picker').value = this.timeDisplayManager.color;
    }
    
    closeSettings() {
        document.getElementById('settings-modal').classList.remove('show');
    }
    
    confirmClear() {
        document.getElementById('confirm-modal').classList.add('show');
    }
    
    clearCanvas(saveToHistory = true) {
        this.drawingEngine.clearCanvas();
        this.shapeInsertionManager.clearAllShapes();
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
        } else if (tool === 'select') {
            document.getElementById('select-btn').classList.add('active');
            document.getElementById('select-config').classList.add('active');
            this.canvas.style.cursor = 'default';
            // Update selection buttons state - check both selection and shape selection
            const hasSelection = this.selectionManager.hasSelection() || this.shapeInsertionManager.hasSelection();
            document.getElementById('select-copy-btn').disabled = !hasSelection;
            document.getElementById('select-delete-btn').disabled = !hasSelection;
        } else if (tool === 'shape') {
            document.getElementById('shape-btn').classList.add('active');
            document.getElementById('shape-config').classList.add('active');
            this.canvas.style.cursor = 'crosshair';
        } else if (tool === 'pan') {
            document.getElementById('pan-btn').classList.add('active');
            this.canvas.style.cursor = 'grab';
        } else if (tool === 'eraser') {
            document.getElementById('eraser-btn').classList.add('active');
            document.getElementById('eraser-config').classList.add('active');
            this.canvas.style.cursor = 'pointer';
        } else if (tool === 'background') {
            document.getElementById('background-btn').classList.add('active');
            document.getElementById('background-config').classList.add('active');
            this.canvas.style.cursor = 'default';
        } else if (tool === 'more') {
            document.getElementById('more-btn').classList.add('active');
            document.getElementById('more-config').classList.add('active');
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
        this.applyCanvasSize();
        // Initialize pages array if needed
        if (!this.settingsManager.infiniteCanvas && this.pages.length === 0) {
            this.pages.push(this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height));
            this.currentPage = 1;
            this.updatePaginationUI();
        }
    }
    
    applyCanvasSize() {
        if (!this.settingsManager.infiniteCanvas) {
            // In paginated mode, apply custom canvas size
            const width = this.settingsManager.canvasWidth;
            const height = this.settingsManager.canvasHeight;
            const dpr = window.devicePixelRatio || 1;
            
            // Save current content
            const oldWidth = this.canvas.width;
            const oldHeight = this.canvas.height;
            const imageData = this.historyManager.historyStep >= 0 ? 
                this.ctx.getImageData(0, 0, oldWidth, oldHeight) : null;
            
            // Set canvas size and CSS size
            this.canvas.width = width * dpr;
            this.canvas.height = height * dpr;
            this.canvas.style.width = width + 'px';
            this.canvas.style.height = height + 'px';
            
            this.bgCanvas.width = width * dpr;
            this.bgCanvas.height = height * dpr;
            this.bgCanvas.style.width = width + 'px';
            this.bgCanvas.style.height = height + 'px';
            
            // Center the canvas on the screen
            this.canvas.style.position = 'absolute';
            this.canvas.style.left = '50%';
            this.canvas.style.top = '50%';
            this.canvas.style.transform = `translate(-50%, -50%) scale(${this.drawingEngine.canvasScale})`;
            
            this.bgCanvas.style.position = 'absolute';
            this.bgCanvas.style.left = '50%';
            this.bgCanvas.style.top = '50%';
            this.bgCanvas.style.transform = `translate(-50%, -50%) scale(${this.drawingEngine.canvasScale})`;
            
            // Re-apply DPR scaling to context
            this.ctx.scale(dpr, dpr);
            this.bgCtx.scale(dpr, dpr);
            
            // Restore content
            if (imageData) {
                this.ctx.putImageData(imageData, 0, 0);
            }
            
            this.backgroundManager.drawBackground();
        } else {
            // In infinite canvas mode, canvas fills the viewport and is centered
            this.canvas.style.position = 'absolute';
            this.canvas.style.left = '50%';
            this.canvas.style.top = '50%';
            this.canvas.style.width = '100%';
            this.canvas.style.height = '100%';
            this.canvas.style.transform = `translate(-50%, -50%) scale(${this.drawingEngine.canvasScale})`;
            
            this.bgCanvas.style.position = 'absolute';
            this.bgCanvas.style.left = '50%';
            this.bgCanvas.style.top = '50%';
            this.bgCanvas.style.width = '100%';
            this.bgCanvas.style.height = '100%';
            this.bgCanvas.style.transform = `translate(-50%, -50%) scale(${this.drawingEngine.canvasScale})`;
            
            this.resizeCanvas();
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
        const panX = this.drawingEngine.panOffset.x;
        const panY = this.drawingEngine.panOffset.y;
        const scale = this.drawingEngine.canvasScale;
        
        if (!this.settingsManager.infiniteCanvas) {
            // In paginated mode, keep centering and add pan
            const transform = `translate(-50%, -50%) translate(${panX}px, ${panY}px) scale(${scale})`;
            this.canvas.style.transform = transform;
            this.bgCanvas.style.transform = transform;
        } else {
            // In infinite mode, center the canvas and apply scale with pan
            this.canvas.style.left = '50%';
            this.canvas.style.top = '50%';
            this.bgCanvas.style.left = '50%';
            this.bgCanvas.style.top = '50%';
            const transform = `translate(-50%, -50%) translate(${panX}px, ${panY}px) scale(${scale})`;
            this.canvas.style.transform = transform;
            this.bgCanvas.style.transform = transform;
        }
        this.canvas.style.transformOrigin = 'center center';
        this.bgCanvas.style.transformOrigin = 'center center';
        
        // Update config-area scale proportionally
        this.updateConfigAreaScale();
    }
    
    updateConfigAreaScale() {
        const configArea = document.getElementById('config-area');
        const scale = this.drawingEngine.canvasScale;
        
        // Apply proportional scaling to config-area
        // The scale is relative to 100% (1.0)
        configArea.style.transform = `translateX(-50%) scale(${scale})`;
        configArea.style.transformOrigin = 'center bottom';
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
    
    updateFullscreenBtnVisibility() {
        const fullscreenBtn = document.getElementById('fullscreen-btn');
        if (this.settingsManager.showFullscreenBtn) {
            fullscreenBtn.style.display = 'flex';
        } else {
            fullscreenBtn.style.display = 'none';
        }
    }
    
    toggleFullscreen() {
        if (!document.fullscreenElement) {
            // Enter fullscreen
            document.documentElement.requestFullscreen().catch(err => {
                console.error(`Error attempting to enable fullscreen: ${err.message}`);
            });
            // Update button icon to exit fullscreen
            const btn = document.getElementById('fullscreen-btn');
            btn.innerHTML = `
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M8 3v3a2 2 0 0 1-2 2H3m18 0h-3a2 2 0 0 1-2-2V3m0 18v-3a2 2 0 0 1 2-2h3M3 16h3a2 2 0 0 1 2 2v3"></path>
                </svg>
            `;
            btn.title = '退出全屏 (F11)';
        } else {
            // Exit fullscreen
            document.exitFullscreen();
            // Update button icon to enter fullscreen
            const btn = document.getElementById('fullscreen-btn');
            btn.innerHTML = `
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"></path>
                </svg>
            `;
            btn.title = '全屏 (F11)';
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
    
    handleFullscreenChange() {
        const btn = document.getElementById('fullscreen-btn');
        if (!document.fullscreenElement) {
            // Exited fullscreen
            btn.innerHTML = `
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"></path>
                </svg>
            `;
            btn.title = '全屏 (F11)';
        } else {
            // Entered fullscreen
            btn.innerHTML = `
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M8 3v3a2 2 0 0 1-2 2H3m18 0h-3a2 2 0 0 1-2-2V3m0 18v-3a2 2 0 0 1 2-2h3M3 16h3a2 2 0 0 1 2 2v3"></path>
                </svg>
            `;
            btn.title = '退出全屏 (F11)';
        }
    }
    
    setupCanvasZoom() {
        // Ctrl+scroll to zoom canvas towards mouse pointer
        document.addEventListener('wheel', (e) => {
            if (e.ctrlKey || e.metaKey) {
                e.preventDefault();
                
                // Get mouse position relative to viewport
                const mouseX = e.clientX;
                const mouseY = e.clientY;
                
                // Get canvas position and dimensions
                const rect = this.canvas.getBoundingClientRect();
                
                // Calculate mouse position relative to canvas (in screen space)
                const mouseCanvasX = mouseX - rect.left;
                const mouseCanvasY = mouseY - rect.top;
                
                // Get current scale and pan
                const oldScale = this.drawingEngine.canvasScale;
                const oldPanX = this.drawingEngine.panOffset.x;
                const oldPanY = this.drawingEngine.panOffset.y;
                
                // Calculate new scale
                const delta = e.deltaY;
                let newScale;
                if (delta < 0) {
                    newScale = Math.min(oldScale + 0.1, 3.0);
                } else {
                    newScale = Math.max(oldScale - 0.1, 0.5);
                }
                
                // Calculate scale ratio
                const scaleRatio = newScale / oldScale;
                
                // Get canvas center in screen space
                const canvasCenterX = rect.width / 2;
                const canvasCenterY = rect.height / 2;
                
                // Calculate offset from canvas center to mouse (in screen space)
                const offsetX = mouseCanvasX - canvasCenterX;
                const offsetY = mouseCanvasY - canvasCenterY;
                
                // Adjust pan offset so that the point under the mouse stays in place
                // When zooming in (scaleRatio > 1), we need to pan towards the mouse
                // When zooming out (scaleRatio < 1), we need to pan away from the mouse
                // Formula: new_pan = old_pan + offset * (1 - scaleRatio)
                this.drawingEngine.panOffset.x = oldPanX + offsetX * (1 - scaleRatio);
                this.drawingEngine.panOffset.y = oldPanY + offsetY * (1 - scaleRatio);
                
                // Update scale
                this.drawingEngine.canvasScale = newScale;
                this.updateZoomUI();
                this.applyZoom();
                
                // Save to localStorage
                localStorage.setItem('canvasScale', newScale);
                localStorage.setItem('panOffsetX', this.drawingEngine.panOffset.x);
                localStorage.setItem('panOffsetY', this.drawingEngine.panOffset.y);
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
        
        // Save current page and background
        this.pages[this.currentPage - 1] = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
        if (!this.settingsManager.infiniteCanvas) {
            this.savePageBackground(this.currentPage);
        }
        
        // Go to previous page
        this.currentPage--;
        this.loadPage(this.currentPage);
        this.updatePaginationUI();
    }
    
    nextPage() {
        if (this.settingsManager.infiniteCanvas) return;
        
        // Save current page and background
        this.pages[this.currentPage - 1] = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
        if (!this.settingsManager.infiniteCanvas) {
            this.savePageBackground(this.currentPage);
        }
        
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
        
        // Save current page and background
        this.pages[this.currentPage - 1] = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
        if (!this.settingsManager.infiniteCanvas) {
            this.savePageBackground(this.currentPage);
        }
        
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
        
        // Save current page and background
        this.pages[this.currentPage - 1] = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
        if (!this.settingsManager.infiniteCanvas) {
            this.savePageBackground(this.currentPage);
        }
        
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
        
        // Restore page-specific background if exists
        this.restorePageBackground(pageNumber);
    }
    
    savePageBackground(pageNumber) {
        // Save current background settings for this page
        this.pageBackgrounds[pageNumber] = {
            backgroundColor: this.backgroundManager.backgroundColor,
            backgroundPattern: this.backgroundManager.backgroundPattern,
            bgOpacity: this.backgroundManager.bgOpacity,
            patternIntensity: this.backgroundManager.patternIntensity,
            patternDensity: this.backgroundManager.patternDensity,
            backgroundImageData: this.backgroundManager.backgroundImageData,
            imageSize: this.backgroundManager.imageSize
        };
        localStorage.setItem('pageBackgrounds', JSON.stringify(this.pageBackgrounds));
    }
    
    restorePageBackground(pageNumber) {
        // Restore background settings for this page
        if (this.pageBackgrounds[pageNumber]) {
            const bg = this.pageBackgrounds[pageNumber];
            this.backgroundManager.backgroundColor = bg.backgroundColor;
            this.backgroundManager.backgroundPattern = bg.backgroundPattern;
            this.backgroundManager.bgOpacity = bg.bgOpacity;
            this.backgroundManager.patternIntensity = bg.patternIntensity;
            this.backgroundManager.patternDensity = bg.patternDensity;
            this.backgroundManager.backgroundImageData = bg.backgroundImageData;
            this.backgroundManager.imageSize = bg.imageSize;
            
            // Load image if exists
            if (bg.backgroundImageData && bg.backgroundPattern === 'image') {
                const img = new Image();
                img.onload = () => {
                    this.backgroundManager.backgroundImage = img;
                    this.backgroundManager.drawBackground();
                };
                img.src = bg.backgroundImageData;
            } else {
                this.backgroundManager.drawBackground();
            }
            
            // Update UI to reflect current page background
            this.updateBackgroundUI();
        } else {
            // Use default/global background settings
            this.backgroundManager.drawBackground();
        }
    }
    
    updateBackgroundUI() {
        // Update background color buttons
        document.querySelectorAll('.color-btn[data-bg-color]').forEach(btn => {
            if (btn.dataset.bgColor === this.backgroundManager.backgroundColor) {
                btn.classList.add('active');
            } else {
                btn.classList.remove('active');
            }
        });
        
        // Update pattern buttons
        document.querySelectorAll('.pattern-option-btn').forEach(btn => {
            if (btn.dataset.pattern === this.backgroundManager.backgroundPattern) {
                btn.classList.add('active');
            } else {
                btn.classList.remove('active');
            }
        });
        
        // Update custom color picker
        document.getElementById('custom-bg-color-picker').value = this.backgroundManager.backgroundColor;
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
    
    updateEraserCursorShape() {
        if (this.drawingEngine.eraserShape === 'rectangle') {
            this.eraserCursor.style.borderRadius = '0';
        } else {
            this.eraserCursor.style.borderRadius = '50%';
        }
    }
    
    showEraserCursor() {
        if (this.drawingEngine.currentTool === 'eraser') {
            this.updateEraserCursorShape();
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
            
            // Apply visual pan and zoom effect
            const transform = `scale(${this.drawingEngine.canvasScale}) translate(${this.drawingEngine.panOffset.x}px, ${this.drawingEngine.panOffset.y}px)`;
            this.canvas.style.transform = transform;
            this.bgCanvas.style.transform = transform;
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
    
    applyPanTransform() {
        // Apply pan offset using CSS transform for better performance
        const panX = this.drawingEngine.panOffset.x;
        const panY = this.drawingEngine.panOffset.y;
        const scale = this.drawingEngine.canvasScale;
        
        if (!this.settingsManager.infiniteCanvas) {
            // In paginated mode, combine translate and scale
            const transform = `translate(-50%, -50%) translate(${panX}px, ${panY}px) scale(${scale})`;
            this.canvas.style.transform = transform;
            this.bgCanvas.style.transform = transform;
        } else {
            // In infinite mode, combine translate and scale
            const transform = `translate(${panX}px, ${panY}px) scale(${scale})`;
            this.canvas.style.transform = transform;
            this.bgCanvas.style.transform = transform;
        }
    }
    
    loadUploadedImages() {
        const saved = localStorage.getItem('uploadedImages');
        if (saved) {
            try {
                return JSON.parse(saved);
            } catch (e) {
                console.warn('Failed to load uploaded images from localStorage:', e);
                localStorage.removeItem('uploadedImages');
                return [];
            }
        }
        return [];
    }
    
    saveUploadedImage(imageData) {
        // Check if we're approaching localStorage limit
        const currentSize = new Blob([localStorage.getItem('uploadedImages') || '[]']).size;
        const imageSize = new Blob([imageData]).size;
        
        // Limit to approximately 4MB total to avoid hitting localStorage limits
        if (currentSize + imageSize > 4 * 1024 * 1024) {
            alert('存储空间不足，无法保存更多图片。请清除一些旧图片。');
            return;
        }
        
        const imageId = `img_${Date.now()}`;
        this.uploadedImages.push({
            id: imageId,
            data: imageData,
            name: `图片${this.uploadedImages.length + 1}`
        });
        
        try {
            localStorage.setItem('uploadedImages', JSON.stringify(this.uploadedImages));
            this.updateUploadedImagesButtons();
        } catch (e) {
            console.error('Failed to save image to localStorage:', e);
            alert('保存图片失败，存储空间可能不足。');
            this.uploadedImages.pop(); // Remove the image we just added
        }
    }
    
    updateUploadedImagesButtons() {
        const patternGrid = document.getElementById('pattern-grid');
        
        // Remove existing uploaded image buttons
        patternGrid.querySelectorAll('.uploaded-image-btn').forEach(btn => btn.remove());
        
        // Add buttons for each uploaded image
        this.uploadedImages.forEach((image, index) => {
            const btn = document.createElement('button');
            btn.className = 'pattern-option-btn uploaded-image-btn';
            btn.dataset.imageId = image.id;
            btn.textContent = image.name;
            btn.addEventListener('click', () => {
                this.backgroundManager.setBackgroundImage(image.data);
                document.querySelectorAll('.pattern-option-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                document.getElementById('image-size-group').style.display = 'flex';
                document.getElementById('pattern-density-group').style.display = 'none';
            });
            
            // Insert before the upload button
            const uploadBtn = patternGrid.querySelector('#image-pattern-btn');
            patternGrid.insertBefore(btn, uploadBtn);
        });
    }
    
    dragCoordinateOrigin(e) {
        if (!this.isDraggingCoordinateOrigin) return;
        
        const deltaX = e.clientX - this.coordinateOriginDragStart.x;
        const deltaY = e.clientY - this.coordinateOriginDragStart.y;
        
        const origin = this.backgroundManager.getCoordinateOrigin();
        this.backgroundManager.setCoordinateOrigin(origin.x + deltaX, origin.y + deltaY);
        
        this.coordinateOriginDragStart = { x: e.clientX, y: e.clientY };
    }
    
    stopDraggingCoordinateOrigin() {
        this.isDraggingCoordinateOrigin = false;
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
