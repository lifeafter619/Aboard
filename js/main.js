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
        this.settingsManager = new SettingsManager();
        this.drawingEngine = new DrawingEngine(this.canvas, this.ctx);
        this.historyManager = new HistoryManager(this.canvas, this.ctx);
        this.backgroundManager = new BackgroundManager(this.bgCanvas, this.bgCtx);
        this.imageControls = new ImageControls(this.backgroundManager);
        this.strokeControls = new StrokeControls(this.drawingEngine, this.canvas, this.ctx, this.historyManager);
        this.timeDisplayManager = new TimeDisplayManager(this.settingsManager);
        this.timeDisplayControls = new TimeDisplayControls(this.timeDisplayManager);
        this.timeDisplaySettingsModal = new TimeDisplaySettingsModal(this.timeDisplayManager);
        this.timerManager = new TimerManager();
        this.collapsibleManager = new CollapsibleManager();
        this.announcementManager = new AnnouncementManager();
        this.exportManager = new ExportManager(this.canvas, this.bgCanvas, this);
        this.teachingToolsManager = new TeachingToolsManager(this.canvas, this.ctx, this.historyManager);
        this.randomPickerManager = new RandomPickerManager();
        this.scoreboardManager = new ScoreboardManager();
        this.insertImageManager = new InsertImageManager(this.canvas, this.ctx, this.historyManager, this.drawingEngine);
        
        // Set callback for teaching tools insertion to auto-switch to pen
        this.teachingToolsManager.onToolsInserted = () => {
            this.closeFeaturePanel();
            this.switchToPen();
        };
        
        // Initialize shape drawing manager
        this.shapeDrawingManager = new ShapeDrawingManager(this.canvas, this.ctx, this.drawingEngine, this.historyManager);
        
        // Initialize line style modal for both pen and shape tools
        this.lineStyleModal = new LineStyleModal(this.drawingEngine, this.shapeDrawingManager);
        
        // Initialize edge drawing manager for teaching tools
        this.edgeDrawingManager = new EdgeDrawingManager(this.teachingToolsManager, this.drawingEngine);

        // Initialize Help System
        if (window.HelpSystem) {
            this.helpSystem = new HelpSystem();
            this.helpSystem.init();
        }
        
        // Canvas fit scale - calculated once on init and window resize
        this.canvasFitScale = 1.0;
        
        // Transform layer
        this.transformLayer = document.getElementById('transform-layer');

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
        
        // Active pointers tracking for multi-touch gesture detection
        // Maps pointerId to { x, y, pointerType } for tracking touch and pen inputs
        // Used to detect pinch gestures when using stylus/pen + finger combinations
        this.activePointers = new Map();
        
        // Canvas scale limits
        this.MIN_CANVAS_SCALE = 0.5;
        this.MAX_CANVAS_SCALE = 5.0;
        
        // Touch gesture state
        this.lastTapTime = 0;
        this.lastTapPos = null;
        this.currentTapStart = null;
        this.isPotentialTap = false;

        // Dragging state
        this.isDraggingPanel = false;
        this.draggedElement = null;
        this.dragOffset = { x: 0, y: 0 };
        this.draggedElementWidth = 0;
        this.draggedElementHeight = 0;
        
        // Coordinate origin dragging state
        this.isDraggingCoordinateOrigin = false;
        this.isCoordinateOriginDragMode = false; // Mode activated by button click
        this.coordinateOriginDragStart = { x: 0, y: 0 };
        
        // Uploaded images storage
        this.uploadedImages = this.loadUploadedImages();
        
        // Connect edge drawing manager to drawing engine
        this.drawingEngine.setEdgeDrawingManager(this.edgeDrawingManager);
        
        // Initialize
        this.resizeCanvas();
        this.setupEventListeners();
        this.settingsManager.loadSettings();
        this.backgroundManager.drawBackground();
        this.updateUI();
        this.historyManager.saveState();
        
        // Initialize pages array for pagination mode (always on)
        if (this.pages.length === 0) {
            this.pages.push(this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height));
            this.currentPage = 1;
            this.updatePaginationUI();
        }
        
        this.initializeCanvasView(); // Initialize canvas view (80% scale, centered)
        this.updateZoomUI();
        this.applyZoom(false); // Don't update config-area scale on refresh
        this.updateZoomControlsVisibility();
        this.updateFullscreenBtnVisibility();
        this.updatePatternGrid();
        this.updateUploadedImagesButtons();
        
        // Listen for fullscreen changes
        document.addEventListener('fullscreenchange', () => this.handleFullscreenChange());
        
        // Add refresh warning to prevent accidental content loss
        window.addEventListener('beforeunload', (e) => {
            // Show warning message when user tries to refresh or close the page
            // Use i18n translation if available, otherwise fallback to English
            const message = window.i18n ? window.i18n.t('tools.refresh.warning') : 'Refreshing will clear all canvas content and cannot be recovered. Are you sure you want to refresh?';
            e.preventDefault();
            e.returnValue = message;
            return message;
        });
    }
    
    
    initializeCanvasView() {
        // On startup or refresh, set canvas to 80% of browser window size and center it
        // Only apply if no saved scale exists
        const savedScale = localStorage.getItem('canvasScale');
        if (!savedScale) {
            this.drawingEngine.canvasScale = 0.80;
            localStorage.setItem('canvasScale', 0.80);
        }
        
        // Calculate initial fit scale
        this.canvasFitScale = this.calculateCanvasFitScale();
        
        // Always center the canvas on startup/refresh
        // Note: This ensures the canvas is properly centered after each page load,
        // regardless of previously saved pan offset values
        this.centerCanvas();
    }
    
    centerCanvas() {
        // In paginated mode, the canvas uses translate(-50%, -50%) to center itself
        // So pan offset of 0,0 means the canvas is centered
        // Reset pan offset to center the canvas
        this.drawingEngine.panOffset.x = 0;
        this.drawingEngine.panOffset.y = 0;
        
        // Save to localStorage
        localStorage.setItem('panOffsetX', this.drawingEngine.panOffset.x);
        localStorage.setItem('panOffsetY', this.drawingEngine.panOffset.y);
        
        // Apply the transform
        this.applyPanTransform();
    }
    
    recalculateAndRecenterCanvas() {
        // Recalculate fit scale for current viewport size
        this.canvasFitScale = this.calculateCanvasFitScale();
        // Re-center the canvas
        this.centerCanvas();
    }
    
    resizeCanvas() {
        // Get window dimensions for canvas sizing
        const windowWidth = window.innerWidth;
        const windowHeight = window.innerHeight;
        const dpr = window.devicePixelRatio || 1;
        
        const oldWidth = this.canvas.width;
        const oldHeight = this.canvas.height;
        const imageData = this.historyManager.historyStep >= 0 ? 
            this.ctx.getImageData(0, 0, oldWidth, oldHeight) : null;
        
        // Set canvas size to fill entire window
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
        
        // Recalculate fit scale and re-center the canvas
        this.recalculateAndRecenterCanvas();
    }
    
    setupEventListeners() {
        // Canvas drawing events - use Pointer Events for unified Mouse/Touch/Pen support
        // Track all pointers for multi-touch gesture detection (pinch zoom)
        document.addEventListener('pointerdown', (e) => {
            // Track all touch and pen pointers for multi-touch gesture detection
            if (e.pointerType === 'touch' || e.pointerType === 'pen') {
                this.activePointers.set(e.pointerId, {
                    x: e.clientX,
                    y: e.clientY,
                    pointerType: e.pointerType
                });
                
                // Check for multi-touch pinch gesture (2+ pointers)
                if (this.activePointers.size >= 2) {
                    this.handlePointerPinchStart();
                }
            }
            
            // Ignore multi-touch secondary pointers for drawing (allow pinch zoom to handle them)
            if (!e.isPrimary) return;
            
            // If pinching, don't start drawing
            if (this.isPinching) return;

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
                    e.target.closest('#time-display-area') ||
                    e.target.closest('#feature-area') ||
                    e.target.closest('.modal') ||
                    e.target.closest('.timer-display-widget') ||
                    e.target.closest('.random-picker-widget') ||
                    e.target.closest('.scoreboard-widget') ||
                    e.target.closest('.feature-widget') ||
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
            
            // Check if clicking on coordinate origin point (in coordinate origin drag mode or background mode)
            if (this.backgroundManager.backgroundPattern === 'coordinate') {
                const rect = this.bgCanvas.getBoundingClientRect();
                const x = e.clientX - rect.left;
                const y = e.clientY - rect.top;
                
                // Check if in coordinate origin drag mode (button clicked)
                if (this.isCoordinateOriginDragMode) {
                    // In drag mode, anywhere on canvas starts dragging the origin
                    this.isDraggingCoordinateOrigin = true;
                    this.coordinateOriginDragStart = { x: e.clientX, y: e.clientY };
                    this.canvas.style.cursor = 'grabbing';
                    return;
                }
                
                if (this.backgroundManager.isPointNearCoordinateOrigin(x, y)) {
                    if (this.drawingEngine.currentTool === 'background') {
                        // In background mode, single click to drag
                        this.isDraggingCoordinateOrigin = true;
                        this.coordinateOriginDragStart = { x: e.clientX, y: e.clientY };
                        return;
                    }
                    // In pan mode, we'll handle this in dblclick event
                }
            }
            
            // Auto-switch to pen mode if currently in background mode
            // But not if image controls are active (user is manipulating background image)
            if (this.drawingEngine.currentTool === 'background' && !this.imageControls.isActive) {
                this.setTool('pen', false); // Don't show config panel
            }
            
            if (e.button === 1 || (e.button === 0 && e.shiftKey) || this.drawingEngine.currentTool === 'pan') {
                this.drawingEngine.startPanning(e);
            } else if (this.drawingEngine.currentTool === 'shape') {
                // Handle shape drawing
                if (this.teachingToolsManager && this.teachingToolsManager.isInteracting) {
                    return;
                }
                this.shapeDrawingManager.startDrawing(e);
            } else if (this.drawingEngine.currentTool === 'pen' || this.drawingEngine.currentTool === 'eraser') {
                // Don't start drawing if interacting with teaching tools
                if (this.teachingToolsManager && this.teachingToolsManager.isInteracting) {
                    return;
                }
                this.drawingEngine.startDrawing(e);
            }
        });
        
        document.addEventListener('pointermove', (e) => {
            // Update pointer position for multi-touch gesture tracking
            if ((e.pointerType === 'touch' || e.pointerType === 'pen') && this.activePointers.has(e.pointerId)) {
                this.activePointers.set(e.pointerId, {
                    x: e.clientX,
                    y: e.clientY,
                    pointerType: e.pointerType
                });
                
                // Handle pinch gesture if we have 2+ pointers
                if (this.isPinching && this.activePointers.size >= 2) {
                    this.handlePointerPinchMove();
                    return; // Don't continue with normal drawing during pinch
                }
            }
            
            // Ignore multi-touch secondary pointers
            if (!e.isPrimary) return;

            // Ignore pointer move if we are pinching (avoids conflict with touchmove)
            if (this.hasTwoFingers || this.isPinching) return;

            // Don't draw when dragging panels or teaching tools
            if (this.isDraggingPanel || (this.teachingToolsManager && this.teachingToolsManager.isInteracting)) {
                return;
            }

            // Explicitly check if target is a feature widget part (double protection)
            if (e.target.closest('.feature-widget') || e.target.closest('#feature-area')) {
                return;
            }
            
            if (this.isDraggingCoordinateOrigin) {
                this.dragCoordinateOrigin(e);
            } else if (this.drawingEngine.isPanning) {
                this.drawingEngine.pan(e);
                this.applyPanTransform();
            } else if (this.shapeDrawingManager && this.shapeDrawingManager.isDrawing) {
                // Handle shape drawing
                this.shapeDrawingManager.draw(e);
            } else if (this.drawingEngine.isDrawing) {
                // Pointer events provide coalesced events for higher precision (smoother curves)
                if (e.getCoalescedEvents) {
                    const events = e.getCoalescedEvents();
                    for (let event of events) {
                        this.drawingEngine.draw(event);
                    }
                } else {
                    this.drawingEngine.draw(e);
                }
                this.updateEraserCursor(e);
            } else {
                this.updateEraserCursor(e);
            }
        });
        
        document.addEventListener('pointerup', (e) => {
            // Remove pointer from tracking
            if (e.pointerType === 'touch' || e.pointerType === 'pen') {
                this.activePointers.delete(e.pointerId);
                
                // End pinch if we no longer have 2+ pointers
                if (this.isPinching && this.activePointers.size < 2) {
                    this.handlePointerPinchEnd();
                }
            }
            
            if (!e.isPrimary) return;
            this.stopDraggingCoordinateOrigin();
            this.handleDrawingComplete();
            this.drawingEngine.stopPanning();
        });
        
        document.addEventListener('pointercancel', (e) => {
            // Remove pointer from tracking on cancel
            if (e.pointerType === 'touch' || e.pointerType === 'pen') {
                this.activePointers.delete(e.pointerId);
                
                // End pinch if we no longer have 2+ pointers
                if (this.isPinching && this.activePointers.size < 2) {
                    this.handlePointerPinchEnd();
                }
            }
        });
        
        // Double-click handler for coordinate origin selection in pan mode
        this.canvas.addEventListener('dblclick', (e) => {
            // In pan mode, double-click to select coordinate origin
            if (this.drawingEngine.currentTool === 'pan' && 
                this.backgroundManager.backgroundPattern === 'coordinate') {
                const rect = this.bgCanvas.getBoundingClientRect();
                const x = e.clientX - rect.left;
                const y = e.clientY - rect.top;
                
                if (this.backgroundManager.isPointNearCoordinateOrigin(x, y)) {
                    this.isDraggingCoordinateOrigin = true;
                    this.coordinateOriginDragStart = { x: e.clientX, y: e.clientY };
                    // Visual feedback - change cursor
                    this.canvas.style.cursor = 'move';
                }
            }
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
        
        // Touch events - Only for gestures (Pinch Zoom)
        // Drawing is now handled by Pointer Events
        this.canvas.addEventListener('touchstart', (e) => {
            // Don't start drawing if interacting with teaching tools
            if (this.teachingToolsManager && this.teachingToolsManager.isInteracting) {
                return;
            }
            
            // If two or more fingers (or pen + finger), handle pinch
            if (e.touches.length >= 2) {
                e.preventDefault(); // Prevent default zoom/scroll
                this.hasTwoFingers = true;

                // If we were drawing (via pointer events), stop it
                if (this.drawingEngine.isDrawing) {
                    this.discardCurrentStroke();
                }

                // If we were panning (via pointer events), stop it to let pinch handle it
                if (this.drawingEngine.isPanning) {
                    this.drawingEngine.stopPanning();
                }

                this.handlePinchStart(e);
            }

            // General gesture detection logic (for 1, 2, 3+ fingers)
            if (e.touches.length === 1) {
                // Start of a new gesture sequence
                this.maxTouchesInGesture = 1;
                this.gestureStartTime = Date.now();
                this.isPotentialGesture = true;

                // Single tap detection specific
                this.isPotentialTap = true;
                this.currentTapStart = {
                    x: e.touches[0].clientX,
                    y: e.touches[0].clientY,
                    time: Date.now()
                };
            } else {
                // Continuation of gesture (adding fingers)
                this.maxTouchesInGesture = Math.max(this.maxTouchesInGesture, e.touches.length);
                this.isPotentialGesture = true;
                this.isPotentialTap = false; // Not a single tap if multiple fingers
            }
        }, { passive: false });
        
        this.canvas.addEventListener('touchmove', (e) => {
            if (this.teachingToolsManager && this.teachingToolsManager.isInteracting) {
                return;
            }
            
            // Tap detection - invalidate if moved too much
            if (this.isPotentialTap && e.touches.length === 1) {
                const dx = e.touches[0].clientX - this.currentTapStart.x;
                const dy = e.touches[0].clientY - this.currentTapStart.y;
                if (dx * dx + dy * dy > 100) { // 10px threshold squared
                    this.isPotentialTap = false;
                }
            }

            if (e.touches.length >= 2) {
                e.preventDefault();
                this.handlePinchMove(e);
            }
        }, { passive: false });
        
        this.canvas.addEventListener('touchend', (e) => {
            if (this.teachingToolsManager && this.teachingToolsManager.isInteracting) {
                return;
            }
            
            // Tap detection
            if (e.changedTouches.length === 1 && e.touches.length === 0) { // All fingers lifted
                // Double tap logic (single finger)
                if (this.isPotentialTap) {
                    const tapTime = Date.now();
                    // Check if it's a double tap
                    if (this.lastTapTime && (tapTime - this.lastTapTime < 300)) {
                        // Check distance between taps
                        const dx = this.currentTapStart.x - this.lastTapPos.x;
                        const dy = this.currentTapStart.y - this.lastTapPos.y;
                        if (dx * dx + dy * dy < 900) { // 30px threshold squared
                            this.handleDoubleTap(e.changedTouches[0]);
                            this.lastTapTime = 0; // Reset
                            this.isPotentialTap = false;
                            e.preventDefault();
                        }
                    } else {
                        this.lastTapTime = tapTime;
                        this.lastTapPos = { ...this.currentTapStart };
                    }
                }

                // Multi-touch gesture (Undo/Redo)
                // Only if not a valid double-tap candidate (to avoid conflict, although double tap is 1 finger)
                if (this.isPotentialGesture && !this.isPotentialTap) {
                    const gestureTime = Date.now();
                    if (gestureTime - this.gestureStartTime < 400) { // 400ms for multi-touch tap
                        if (this.maxTouchesInGesture === 2) {
                            // 2-finger tap: Undo
                            if (this.historyManager.undo()) {
                                this.updateUI();
                                // Clear stroke selection as strokes are no longer valid
                                this.drawingEngine.clearStrokes();
                            }
                            e.preventDefault();
                        } else if (this.maxTouchesInGesture === 3) {
                            // 3-finger tap: Redo
                            if (this.historyManager.redo()) {
                                this.updateUI();
                                this.drawingEngine.clearStrokes();
                            }
                            e.preventDefault();
                        }
                    }
                }
            }

            if (e.touches.length === 0) {
                this.isPotentialTap = false;
                this.isPotentialGesture = false;
                this.maxTouchesInGesture = 0;
            }

            // If we still have enough fingers to pinch, re-anchor to prevent jumps
            if (e.touches.length >= 2 && this.isPinching) {
                this.handlePinchStart(e);
            }

            if (e.touches.length < 2) {
                this.handlePinchEnd();
                this.hasTwoFingers = false;
            }
        }, { passive: false });
        
        // Toolbar buttons
        document.getElementById('pen-btn').addEventListener('click', () => this.setTool('pen'));
        document.getElementById('pan-btn').addEventListener('click', () => this.setTool('pan'));
        document.getElementById('eraser-btn').addEventListener('click', () => this.setTool('eraser'));
        document.getElementById('background-btn').addEventListener('click', () => this.setTool('background'));
        document.getElementById('clear-btn').addEventListener('click', () => this.confirmClear());
        document.getElementById('settings-btn').addEventListener('click', () => this.openSettings());
        document.getElementById('more-btn').addEventListener('click', () => this.setTool('more'));
        
        // Shape and Teaching Tools buttons in More menu
        document.getElementById('more-shape-btn').addEventListener('click', () => this.setTool('shape'));
        document.getElementById('more-teaching-tools-btn').addEventListener('click', () => this.teachingToolsManager.showModal());
        
        document.getElementById('config-close-btn').addEventListener('click', () => this.closeConfigPanel());
        document.getElementById('feature-close-btn').addEventListener('click', () => this.closeFeaturePanel());
        
        // History buttons
        document.getElementById('undo-btn').addEventListener('click', () => {
            if (this.historyManager.undo()) {
                // Clear stroke selection as strokes are no longer valid
                this.drawingEngine.clearStrokes();
                this.updateUI();
            }
        });
        
        document.getElementById('redo-btn').addEventListener('click', () => {
            if (this.historyManager.redo()) {
                // Clear stroke selection as strokes are no longer valid
                this.drawingEngine.clearStrokes();
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
                // Recalculate fit scale and re-center canvas for new viewport size
                this.recalculateAndRecenterCanvas();
                this.applyZoom(false); // Apply new fit scale without updating config-area
                // Update toolbar text visibility on resize
                this.settingsManager.updateToolbarTextVisibility();
                // Reposition toolbars to ensure they stay within viewport
                this.repositionToolbarsOnResize();
                // Reposition modals to ensure they stay within viewport
                this.repositionModalsOnResize();
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
                // Sync shape color picker value
                const shapeColorPicker = document.getElementById('shape-custom-color-picker');
                if (shapeColorPicker) {
                    shapeColorPicker.value = e.target.dataset.color;
                }
            });
        });
        
        const customColorPicker = document.getElementById('custom-color-picker');
        const customColorPickerBtn = document.querySelector('label[for="custom-color-picker"]');
        customColorPicker.addEventListener('input', (e) => {
            this.drawingEngine.setColor(e.target.value);
            document.querySelectorAll('.color-btn[data-color]').forEach(b => b.classList.remove('active'));
            // Mark color picker button as active
            if (customColorPickerBtn) {
                customColorPickerBtn.classList.add('active');
            }
            // Sync shape color picker
            const shapeColorPicker = document.getElementById('shape-custom-color-picker');
            if (shapeColorPicker) {
                shapeColorPicker.value = e.target.value;
            }
        });
        // Deactivate color picker when a preset is selected
        document.querySelectorAll('.color-btn[data-color]').forEach(btn => {
            btn.addEventListener('click', () => {
                if (customColorPickerBtn) {
                    customColorPickerBtn.classList.remove('active');
                }
                // Also deactivate shape color picker button
                const shapeCustomColorPickerBtn = document.querySelector('label[for="shape-custom-color-picker"]');
                if (shapeCustomColorPickerBtn) {
                    shapeCustomColorPickerBtn.classList.remove('active');
                }
            });
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
        const customBgColorPickerBtn = document.querySelector('label[for="custom-bg-color-picker"]');
        customBgColorPicker.addEventListener('input', (e) => {
            this.backgroundManager.setBackgroundColor(e.target.value);
            document.querySelectorAll('.color-btn[data-bg-color]').forEach(b => b.classList.remove('active'));
            // Mark color picker button as active
            if (customBgColorPickerBtn) {
                customBgColorPickerBtn.classList.add('active');
            }
            // Save page background in paginated mode
            if (!this.settingsManager.infiniteCanvas) {
                this.savePageBackground(this.currentPage);
            }
        });
        // Deactivate color picker when a preset is selected
        document.querySelectorAll('.color-btn[data-bg-color]').forEach(btn => {
            btn.addEventListener('click', () => {
                if (customBgColorPickerBtn) {
                    customBgColorPickerBtn.classList.remove('active');
                }
            });
        });
        
        // Background pattern buttons
        document.querySelectorAll('.pattern-option-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                // Use currentTarget to ensure we get the data from the button, not its children
                const pattern = e.currentTarget.dataset.pattern;
                if (pattern === 'image') {
                    document.getElementById('bg-image-upload').click();
                } else {
                    this.backgroundManager.setBackgroundPattern(pattern);
                    document.querySelectorAll('.pattern-option-btn').forEach(b => b.classList.remove('active'));
                    e.currentTarget.classList.add('active');
                    document.getElementById('image-size-group').style.display = 'none';
                    
                    // Show/hide pattern density slider based on pattern
                    const patternDensityGroup = document.getElementById('pattern-density-group');
                    const moveOriginBtn = document.getElementById('move-origin-btn');
                    if (pattern !== 'blank' && pattern !== 'image') {
                        patternDensityGroup.style.display = 'flex';
                        // Only show move-origin-btn for coordinate pattern
                        if (moveOriginBtn) {
                            moveOriginBtn.style.display = pattern === 'coordinate' ? 'inline-flex' : 'none';
                        }
                    } else {
                        patternDensityGroup.style.display = 'none';
                        if (moveOriginBtn) {
                            moveOriginBtn.style.display = 'none';
                        }
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
                reader.onload = async (event) => {
                    const imageData = event.target.result;
                    
                    // Reset confirmation state for new image
                    this.imageControls.resetConfirmation();
                    
                    await this.backgroundManager.setBackgroundImage(imageData);
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

        // Background GIF settings button
        const gifSettingsBtn = document.getElementById('bg-gif-settings-btn');
        const gifSettingsModal = document.getElementById('gif-settings-modal');
        if (gifSettingsBtn) {
            gifSettingsBtn.addEventListener('click', () => {
                const input = document.getElementById('gif-loop-count-input');
                if (input) {
                    input.value = this.backgroundManager.gifLoopCount;
                }
                gifSettingsModal.classList.add('show');
            });
        }

        document.getElementById('gif-settings-cancel-btn').addEventListener('click', () => {
            gifSettingsModal.classList.remove('show');
        });

        document.getElementById('gif-settings-ok-btn').addEventListener('click', () => {
            const input = document.getElementById('gif-loop-count-input');
            if (input) {
                this.backgroundManager.setGifLoopCount(parseInt(input.value));
            }
            gifSettingsModal.classList.remove('show');
        });

        document.getElementById('gif-settings-close-btn').addEventListener('click', () => {
            gifSettingsModal.classList.remove('show');
        });

        // Background playback toggle (for GIFs)
        const playbackBtn = document.getElementById('bg-image-playback-btn');
        if (playbackBtn) {
            const updatePlaybackIcon = () => {
                if (this.backgroundManager.isImagePaused) {
                    playbackBtn.classList.add('paused');
                    playbackBtn.innerHTML = `
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <polygon points="5 3 19 12 5 21 5 3"></polygon>
                        </svg>
                    `;
                } else {
                    playbackBtn.classList.remove('paused');
                    playbackBtn.innerHTML = `
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <rect x="6" y="4" width="4" height="16"></rect>
                            <rect x="14" y="4" width="4" height="16"></rect>
                        </svg>
                    `;
                }
            };

            playbackBtn.addEventListener('click', () => {
                this.backgroundManager.toggleImagePlayback();
                updatePlaybackIcon();
            });

            // Listen for auto-pause event from background manager
            window.addEventListener('backgroundGifPaused', updatePlaybackIcon);
        }
        
        // Pattern density slider
        const patternDensitySlider = document.getElementById('pattern-density-slider');
        const patternDensityValue = document.getElementById('pattern-density-value');
        patternDensitySlider.addEventListener('input', (e) => {
            this.backgroundManager.setPatternDensity(parseInt(e.target.value) / 100);
            patternDensityValue.textContent = e.target.value;
        });

        // Move Coordinate Origin Button
        const moveOriginBtn = document.getElementById('move-origin-btn');
        if (moveOriginBtn) {
            moveOriginBtn.addEventListener('click', (e) => {
                // Toggle the button active state
                const isActive = moveOriginBtn.classList.contains('active');
                
                if (isActive) {
                    // Turn off the mode
                    moveOriginBtn.classList.remove('active');
                    this.isCoordinateOriginDragMode = false;
                    this.isDraggingCoordinateOrigin = false;
                    this.canvas.style.cursor = 'crosshair';
                } else {
                    // Enable coordinate origin drag mode
                    moveOriginBtn.classList.add('active');
                    this.isCoordinateOriginDragMode = true;
                    
                    // Change cursor to indicate dragging is available
                    this.canvas.style.cursor = 'move';
                }
            });
        }
        
        // Sliders
        const penSizeSlider = document.getElementById('pen-size-slider');
        const penSizeValue = document.getElementById('pen-size-value');
        const shapeSizeSlider = document.getElementById('shape-size-slider');
        const shapeSizeValue = document.getElementById('shape-size-value');
        
        // Pen size slider - syncs with shape slider
        penSizeSlider.addEventListener('input', (e) => {
            const size = parseInt(e.target.value);
            this.drawingEngine.setPenSize(size);
            penSizeValue.textContent = size;
            // Sync shape slider
            if (shapeSizeSlider) {
                shapeSizeSlider.value = size;
                shapeSizeValue.textContent = size;
            }

            // Enforce arrow size constraint
            if (arrowSizeSlider && arrowSizeValue) {
                if (parseInt(arrowSizeSlider.value) < size) {
                    arrowSizeSlider.value = size;
                    arrowSizeValue.textContent = size;
                    this.shapeDrawingManager.setArrowSize(size);
                }
            }
        });
        
        // Shape size slider - syncs with pen slider
        if (shapeSizeSlider) {
            shapeSizeSlider.addEventListener('input', (e) => {
                const size = parseInt(e.target.value);
                this.drawingEngine.setPenSize(size);
                shapeSizeValue.textContent = size;
                // Sync pen slider
                penSizeSlider.value = size;
                penSizeValue.textContent = size;

                // Enforce arrow size constraint
                if (arrowSizeSlider && arrowSizeValue) {
                    if (parseInt(arrowSizeSlider.value) < size) {
                        arrowSizeSlider.value = size;
                        arrowSizeValue.textContent = size;
                        this.shapeDrawingManager.setArrowSize(size);
                    }
                }
            });
        }
        
        // Arrow size slider (independent control)
        const arrowSizeSlider = document.getElementById('arrow-size-slider');
        const arrowSizeValue = document.getElementById('arrow-size-value');
        if (arrowSizeSlider && arrowSizeValue) {
            arrowSizeSlider.addEventListener('input', (e) => {
                let val = parseInt(e.target.value);
                // Enforce constraint: Arrow size cannot be smaller than line thickness
                const minSize = this.drawingEngine.penSize;
                if (val < minSize) {
                    val = minSize;
                    e.target.value = val;
                }
                this.shapeDrawingManager.setArrowSize(val);
                arrowSizeValue.textContent = val;
            });
            // Initialize from saved value
            arrowSizeSlider.value = this.shapeDrawingManager.arrowSize;
            arrowSizeValue.textContent = this.shapeDrawingManager.arrowSize;
        }
        
        // Shape custom color picker - syncs with pen color picker
        const shapeCustomColorPicker = document.getElementById('shape-custom-color-picker');
        const shapeCustomColorPickerBtn = document.querySelector('label[for="shape-custom-color-picker"]');
        if (shapeCustomColorPicker) {
            shapeCustomColorPicker.addEventListener('input', (e) => {
                this.drawingEngine.setColor(e.target.value);
                document.querySelectorAll('.color-btn[data-color]').forEach(b => b.classList.remove('active'));
                // Mark color picker button as active
                if (shapeCustomColorPickerBtn) {
                    shapeCustomColorPickerBtn.classList.add('active');
                }
                // Sync pen color picker value and active state
                const penColorPicker = document.getElementById('custom-color-picker');
                const penColorPickerBtn = document.querySelector('label[for="custom-color-picker"]');
                if (penColorPicker) {
                    penColorPicker.value = e.target.value;
                }
                if (penColorPickerBtn) {
                    penColorPickerBtn.classList.add('active');
                }
            });
        }
        
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
        
        // Shape type buttons
        document.querySelectorAll('.shape-type-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const shapeType = e.target.closest('.shape-type-btn').dataset.shapeType;
                this.shapeDrawingManager.setShape(shapeType);
                document.querySelectorAll('.shape-type-btn').forEach(b => b.classList.remove('active'));
                e.target.closest('.shape-type-btn').classList.add('active');
                
                // Show/hide arrow size control based on shape type
                const arrowSizeGroup = document.getElementById('arrow-size-group');
                if (arrowSizeGroup) {
                    if (shapeType === 'arrow' || shapeType === 'doubleArrow') {
                        arrowSizeGroup.style.display = '';
                    } else {
                        arrowSizeGroup.style.display = 'none';
                    }
                }
            });
        });
        
        // Line style settings buttons (open modal)
        const penLineStyleSettingsBtn = document.getElementById('pen-line-style-settings-btn');
        if (penLineStyleSettingsBtn) {
            penLineStyleSettingsBtn.addEventListener('click', () => {
                this.lineStyleModal.show('pen');
            });
        }
        
        const shapeLineStyleSettingsBtn = document.getElementById('shape-line-style-settings-btn');
        if (shapeLineStyleSettingsBtn) {
            shapeLineStyleSettingsBtn.addEventListener('click', () => {
                this.lineStyleModal.show('shape');
            });
        }
        
        // More config panel (time display checkboxes)
        const showDateCheckboxMore = document.getElementById('show-date-checkbox-more');
        const showTimeCheckboxMore = document.getElementById('show-time-checkbox-more');
        
        // Time Display Feature Button
        const timeDisplayFeatureBtn = document.getElementById('time-display-feature-btn');
        const timeDisplayControls = document.getElementById('time-display-controls');
        
        if (timeDisplayFeatureBtn && timeDisplayControls) {
            timeDisplayFeatureBtn.addEventListener('click', () => {
                // Toggle the time display controls visibility
                const isVisible = timeDisplayControls.style.display !== 'none';
                if (isVisible) {
                    timeDisplayControls.style.display = 'none';
                    timeDisplayFeatureBtn.classList.remove('active');
                    // Auto-switch to pen tool after closing time display settings
                    this.closeFeaturePanel();
                    this.switchToPen();
                } else {
                    timeDisplayControls.style.display = 'flex';
                    timeDisplayFeatureBtn.classList.add('active');
                    // Refresh collapsible groups after showing new content
                    if (this.collapsibleManager) {
                        setTimeout(() => this.collapsibleManager.refreshAll(), 50);
                    }
                }
            });
        }
        
        // Timer Feature Button
        const timerFeatureBtn = document.getElementById('timer-feature-btn');
        if (timerFeatureBtn) {
            timerFeatureBtn.addEventListener('click', () => {
                this.timerManager.showSettingsModal();
                this.closeFeaturePanel();
            });
        }

        // Random Picker Feature Button
        const randomPickerBtn = document.getElementById('random-picker-feature-btn');
        if (randomPickerBtn) {
            randomPickerBtn.addEventListener('click', () => {
                this.randomPickerManager.create();
                this.closeFeaturePanel();
                this.switchToPen();
            });
        }

        // Scoreboard Feature Button
        const scoreboardBtn = document.getElementById('scoreboard-feature-btn');
        if (scoreboardBtn) {
            scoreboardBtn.addEventListener('click', () => {
                this.scoreboardManager.create();
                this.closeFeaturePanel();
                this.switchToPen();
            });
        }

        // Insert Image Feature Button
        const insertImageBtn = document.getElementById('insert-image-feature-btn');
        if (insertImageBtn) {
            insertImageBtn.addEventListener('click', () => {
                this.insertImageManager.triggerSelect();
                this.closeFeaturePanel();
            });
        }
        
        // Timer settings modal close button
        const timerSettingsCloseBtn = document.getElementById('timer-settings-close-btn');
        if (timerSettingsCloseBtn) {
            timerSettingsCloseBtn.addEventListener('click', () => {
                this.timerManager.hideSettingsModal();
            });
        }
        
        // Load initial checkbox states
        if (showDateCheckboxMore && showTimeCheckboxMore) {
            showDateCheckboxMore.checked = this.timeDisplayManager.showDate;
            showTimeCheckboxMore.checked = this.timeDisplayManager.showTime;
            
            // Set initial button state based on whether time display is enabled
            if (timeDisplayFeatureBtn) {
                if (this.timeDisplayManager.enabled) {
                    timeDisplayFeatureBtn.classList.add('active');
                    timeDisplayControls.style.display = 'flex';
                }
            }
            
            // Update visibility based on initial state
            if (showDateCheckboxMore.checked || showTimeCheckboxMore.checked) {
                this.timeDisplayManager.show();
            } else {
                this.timeDisplayManager.hide();
            }
            
            showDateCheckboxMore.addEventListener('change', (e) => {
                this.timeDisplayManager.setShowDate(e.target.checked);
                // Hide if both unchecked
                if (!showDateCheckboxMore.checked && !showTimeCheckboxMore.checked) {
                    this.timeDisplayManager.hide();
                } else {
                    this.timeDisplayManager.show();
                }
            });
            
            showTimeCheckboxMore.addEventListener('change', (e) => {
                this.timeDisplayManager.setShowTime(e.target.checked);
                // Hide if both unchecked
                if (!showDateCheckboxMore.checked && !showTimeCheckboxMore.checked) {
                    this.timeDisplayManager.hide();
                } else {
                    this.timeDisplayManager.show();
                }
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
        const toolbarSizeInput = document.getElementById('toolbar-size-input');
        toolbarSizeSlider.addEventListener('input', (e) => {
            this.settingsManager.toolbarSize = parseInt(e.target.value);
            toolbarSizeValue.textContent = e.target.value;
            toolbarSizeInput.value = e.target.value;
            this.settingsManager.updateToolbarSize();
        });
        toolbarSizeInput.addEventListener('input', (e) => {
            const value = Math.max(40, Math.min(80, parseInt(e.target.value) || 40));
            e.target.value = value;
            toolbarSizeSlider.value = value;
            this.settingsManager.toolbarSize = value;
            toolbarSizeValue.textContent = value;
            this.settingsManager.updateToolbarSize();
        });
        
        const configScaleSlider = document.getElementById('config-scale-slider');
        const configScaleValue = document.getElementById('config-scale-value');
        const configScaleInput = document.getElementById('config-scale-input');
        configScaleSlider.addEventListener('input', (e) => {
            this.settingsManager.configScale = parseInt(e.target.value) / 100;
            configScaleValue.textContent = Math.round(this.settingsManager.configScale * 100);
            configScaleInput.value = e.target.value;
            this.settingsManager.updateConfigScale();
        });
        configScaleInput.addEventListener('input', (e) => {
            const value = Math.max(80, Math.min(120, parseInt(e.target.value) || 100));
            e.target.value = value;
            configScaleSlider.value = value;
            this.settingsManager.configScale = value / 100;
            configScaleValue.textContent = value;
            this.settingsManager.updateConfigScale();
        });
        
        // Background opacity and pattern intensity from settings
        const bgOpacitySlider = document.getElementById('bg-opacity-slider');
        const bgOpacityValue = document.getElementById('bg-opacity-value');
        const bgOpacityInput = document.getElementById('bg-opacity-input');
        bgOpacitySlider.addEventListener('input', (e) => {
            this.backgroundManager.setOpacity(parseInt(e.target.value) / 100);
            bgOpacityValue.textContent = e.target.value;
            bgOpacityInput.value = e.target.value;
        });
        bgOpacityInput.addEventListener('input', (e) => {
            const value = Math.max(0, Math.min(100, parseInt(e.target.value) || 100));
            e.target.value = value;
            bgOpacitySlider.value = value;
            this.backgroundManager.setOpacity(value / 100);
            bgOpacityValue.textContent = value;
        });
        
        const patternIntensitySlider = document.getElementById('pattern-intensity-slider');
        const patternIntensityValue = document.getElementById('pattern-intensity-value');
        const patternIntensityInput = document.getElementById('pattern-intensity-input');
        patternIntensitySlider.addEventListener('input', (e) => {
            this.backgroundManager.setPatternIntensity(parseInt(e.target.value) / 100);
            patternIntensityValue.textContent = e.target.value;
            patternIntensityInput.value = e.target.value;
        });
        patternIntensityInput.addEventListener('input', (e) => {
            const value = Math.max(10, Math.min(200, parseInt(e.target.value) || 50));
            e.target.value = value;
            patternIntensitySlider.value = value;
            this.backgroundManager.setPatternIntensity(value / 100);
            patternIntensityValue.textContent = value;
        });
        
        document.querySelectorAll('.position-option-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.settingsManager.setControlPosition(e.target.dataset.position, this.timeDisplayManager);
            });
        });
        
        document.getElementById('edge-snap-checkbox').addEventListener('change', (e) => {
            this.settingsManager.edgeSnapEnabled = e.target.checked;
            localStorage.setItem('edgeSnapEnabled', e.target.checked);
        });
        
        document.getElementById('touch-zoom-checkbox').addEventListener('change', (e) => {
            this.settingsManager.touchZoomEnabled = e.target.checked;
            localStorage.setItem('touchZoomEnabled', e.target.checked);
        });

        // Global font selector
        document.getElementById('global-font-select').addEventListener('change', (e) => {
            this.settingsManager.setGlobalFont(e.target.value);
        });
        
        // Canvas mode buttons removed - pagination is always active
        
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
        const customThemeColorPickerBtn = document.querySelector('label[for="custom-theme-color-picker"]');
        customThemeColorPicker.addEventListener('input', (e) => {
            this.settingsManager.setThemeColor(e.target.value);
            document.querySelectorAll('.color-btn[data-theme-color]').forEach(b => b.classList.remove('active'));
            // Mark color picker button as active
            if (customThemeColorPickerBtn) {
                customThemeColorPickerBtn.classList.add('active');
            }
        });
        // Deactivate color picker when a preset is selected
        document.querySelectorAll('.color-btn[data-theme-color]').forEach(btn => {
            btn.addEventListener('click', () => {
                if (customThemeColorPickerBtn) {
                    customThemeColorPickerBtn.classList.remove('active');
                }
            });
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
            const timeDisplaySettings = document.getElementById('time-display-settings');
            const timezoneSettings = document.getElementById('timezone-settings');
            const timeFormatSettings = document.getElementById('time-format-settings');
            const dateFormatSettings = document.getElementById('date-format-settings');
            const timeColorSettings = document.getElementById('time-color-settings');
            const timeFontSizeSettings = document.getElementById('time-font-size-settings');
            const timeOpacitySettings = document.getElementById('time-opacity-settings');
            const timeFullscreenSettings = document.getElementById('time-fullscreen-settings');
            const timeFullscreenFontSizeSettings = document.getElementById('time-fullscreen-font-size-settings');
            
            if (e.target.checked) {
                this.timeDisplayManager.show();
                timeDisplaySettings.style.display = 'flex';
                timezoneSettings.style.display = 'flex';
                timeFormatSettings.style.display = 'flex';
                dateFormatSettings.style.display = 'flex';
                timeColorSettings.style.display = 'flex';
                timeFontSizeSettings.style.display = 'flex';
                timeOpacitySettings.style.display = 'flex';
                timeFullscreenSettings.style.display = 'flex';
                timeFullscreenFontSizeSettings.style.display = 'flex';
            } else {
                this.timeDisplayManager.hide();
                timeDisplaySettings.style.display = 'none';
                timezoneSettings.style.display = 'none';
                timeFormatSettings.style.display = 'none';
                dateFormatSettings.style.display = 'none';
                timeColorSettings.style.display = 'none';
                timeFontSizeSettings.style.display = 'none';
                timeOpacitySettings.style.display = 'none';
                timeFullscreenSettings.style.display = 'none';
                timeFullscreenFontSizeSettings.style.display = 'none';
            }
        });
        
        // Display type buttons (both, date-only, time-only)
        document.querySelectorAll('.display-option-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const displayType = e.target.dataset.displayType;
                document.querySelectorAll('.display-option-btn').forEach(b => b.classList.remove('active'));
                e.target.classList.add('active');
                
                switch(displayType) {
                    case 'both':
                        this.timeDisplayManager.setShowDate(true);
                        this.timeDisplayManager.setShowTime(true);
                        break;
                    case 'date-only':
                        this.timeDisplayManager.setShowDate(true);
                        this.timeDisplayManager.setShowTime(false);
                        break;
                    case 'time-only':
                        this.timeDisplayManager.setShowDate(false);
                        this.timeDisplayManager.setShowTime(true);
                        break;
                }
            });
        });
        
        // Timezone selector
        document.getElementById('timezone-select').addEventListener('change', (e) => {
            this.timeDisplayManager.setTimezone(e.target.value);
        });
        
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
                // Deactivate color picker button
                const customTimeColorPickerBtn = document.querySelector('label[for="custom-time-color-picker"]');
                if (customTimeColorPickerBtn) {
                    customTimeColorPickerBtn.classList.remove('active');
                }
            });
        });
        
        const customTimeColorPicker = document.getElementById('custom-time-color-picker');
        const customTimeColorPickerBtn = document.querySelector('label[for="custom-time-color-picker"]');
        customTimeColorPicker.addEventListener('input', (e) => {
            this.timeDisplayManager.setColor(e.target.value);
            document.querySelectorAll('.color-btn[data-time-color]').forEach(b => b.classList.remove('active'));
            // Mark color picker button as active
            if (customTimeColorPickerBtn) {
                customTimeColorPickerBtn.classList.add('active');
            }
        });
        
        // Time background color buttons
        document.querySelectorAll('.color-btn[data-time-bg-color]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.timeDisplayManager.setBgColor(e.target.dataset.timeBgColor);
                document.querySelectorAll('.color-btn[data-time-bg-color]').forEach(b => b.classList.remove('active'));
                e.target.classList.add('active');
                // Deactivate color picker button
                const customTimeBgColorPickerBtn = document.querySelector('label[for="custom-time-bg-color-picker"]');
                if (customTimeBgColorPickerBtn) {
                    customTimeBgColorPickerBtn.classList.remove('active');
                }
            });
        });
        
        const customTimeBgColorPicker = document.getElementById('custom-time-bg-color-picker');
        const customTimeBgColorPickerBtn = document.querySelector('label[for="custom-time-bg-color-picker"]');
        customTimeBgColorPicker.addEventListener('input', (e) => {
            this.timeDisplayManager.setBgColor(e.target.value);
            document.querySelectorAll('.color-btn[data-time-bg-color]').forEach(b => b.classList.remove('active'));
            // Mark color picker button as active
            if (customTimeBgColorPickerBtn) {
                customTimeBgColorPickerBtn.classList.add('active');
            }
        });
        
        // Time fullscreen mode buttons
        document.querySelectorAll('.fullscreen-mode-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const mode = e.target.dataset.mode;
                document.querySelectorAll('.fullscreen-mode-btn').forEach(b => b.classList.remove('active'));
                e.target.classList.add('active');
                this.timeDisplayManager.setFullscreenMode(mode);
            });
        });
        
        // Fullscreen font size slider and input
        const timeFullscreenFontSizeSlider = document.getElementById('time-fullscreen-font-size-slider');
        const timeFullscreenFontSizeValue = document.getElementById('time-fullscreen-font-size-value');
        const timeFullscreenFontSizeInput = document.getElementById('time-fullscreen-font-size-input');
        
        if (timeFullscreenFontSizeSlider && timeFullscreenFontSizeValue && timeFullscreenFontSizeInput) {
            timeFullscreenFontSizeSlider.addEventListener('input', (e) => {
                const size = parseInt(e.target.value);
                timeFullscreenFontSizeValue.textContent = size;
                timeFullscreenFontSizeInput.value = size;
                this.timeDisplayManager.setFullscreenFontSize(size);
            });
            
            timeFullscreenFontSizeInput.addEventListener('change', (e) => {
                const size = parseInt(e.target.value);
                if (size >= 8 && size <= 25) {
                    timeFullscreenFontSizeValue.textContent = size;
                    timeFullscreenFontSizeSlider.value = size;
                    this.timeDisplayManager.setFullscreenFontSize(size);
                }
            });
        }
        
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
        // Dynamic toolbar positioning based on window orientation
        const windowWidth = window.innerWidth;
        const windowHeight = window.innerHeight;
        const isPortrait = windowHeight > windowWidth;
        const toolbar = document.getElementById('toolbar');
        
        // On portrait orientation (typically phones), position toolbar on right side
        if (isPortrait && toolbar && !toolbar.classList.contains('user-positioned')) {
            // Apply right side positioning for portrait mode
            toolbar.classList.add('vertical');
            toolbar.style.right = '20px';
            toolbar.style.left = 'auto';
            toolbar.style.top = '50%';
            toolbar.style.bottom = 'auto';
            toolbar.style.transform = 'translateY(-50%)';
        } else if (!isPortrait && toolbar && !toolbar.classList.contains('user-positioned')) {
            // For landscape mode, use bottom center positioning
            toolbar.classList.remove('vertical');
            toolbar.style.left = '50%';
            toolbar.style.right = 'auto';
            toolbar.style.top = 'auto';
            toolbar.style.bottom = '20px';
            toolbar.style.transform = 'translateX(-50%)';
        }
        
        // Ensure all toolbars and panels stay within viewport after window resize
        const EDGE_SPACING = 10; // Minimum spacing from viewport edges
        const panels = [
            document.getElementById('history-controls'),
            document.getElementById('config-area'),
            document.getElementById('time-display-area'),
            document.getElementById('feature-area'),
            document.getElementById('pagination-controls'),
            document.getElementById('timer-display')
        ];
        
        panels.forEach(panel => {
            if (!panel) return;
            
            const rect = panel.getBoundingClientRect();
            const computedStyle = window.getComputedStyle(panel);
            
            // Get current position
            let left = computedStyle.left;
            let top = computedStyle.top;
            let right = computedStyle.right;
            let bottom = computedStyle.bottom;
            
            // Check if panel has been dragged (has explicit positioning)
            const hasCenteredPosition = left === '50%' || computedStyle.transform.includes('translateX');
            const hasExplicitPosition = !hasCenteredPosition && (left !== 'auto' || top !== 'auto' || right !== 'auto' || bottom !== 'auto');
            
            // Skip panels that are centered and haven't been dragged
            if (hasCenteredPosition && !hasExplicitPosition) {
                return;
            }
            
            if (!hasExplicitPosition) return;
            
            // Convert to numbers
            left = parseFloat(left) || 0;
            top = parseFloat(top) || 0;
            right = right !== 'auto' ? parseFloat(right) : null;
            bottom = bottom !== 'auto' ? parseFloat(bottom) : null;
            
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
            if (left < EDGE_SPACING && left !== 0) {
                panel.style.left = `${EDGE_SPACING}px`;
            }
            if (top < EDGE_SPACING && top !== 0) {
                panel.style.top = `${EDGE_SPACING}px`;
            }
        });
    }
    
    repositionModalsOnResize() {
        // Reposition modal content to stay within viewport on window resize
        const modals = [
            document.querySelector('#settings-modal .settings-modal-content'),
            document.querySelector('#timer-settings-modal .timer-modal-content'),
            document.querySelector('#time-display-settings-modal .timer-modal-content')
        ];
        
        modals.forEach(modalContent => {
            if (!modalContent) return;
            
            // Only reposition if modal is currently visible
            const modal = modalContent.closest('.show, [style*="display: flex"]');
            if (!modal) return;
            
            const rect = modalContent.getBoundingClientRect();
            const windowWidth = window.innerWidth;
            const windowHeight = window.innerHeight;
            
            // Check if modal content exceeds viewport
            const EDGE_SPACING = 20;
            
            // Reset any transforms or positions first
            modalContent.style.transform = '';
            modalContent.style.position = '';
            
            // If modal is larger than viewport, it will be scrollable via parent
            // Just ensure it's centered
            if (rect.width > windowWidth - 2 * EDGE_SPACING || 
                rect.height > windowHeight - 2 * EDGE_SPACING) {
                // Modal is too large - parent modal should handle scrolling
                // No specific positioning needed
            }
        });
    }
    
    setupDraggablePanels() {
        const historyControls = document.getElementById('history-controls');
        const configArea = document.getElementById('config-area');
        const timeDisplayArea = document.getElementById('time-display-area');
        const featureArea = document.getElementById('feature-area');
        const toolbar = document.getElementById('toolbar');
        
        // Unified start handler for mouse and touch events
        const handleDragStart = (e, element) => {
            if (e.target.closest('button') || e.target.closest('input')) return;
            
            this.isDraggingPanel = true;
            this.draggedElement = element;
            
            const rect = element.getBoundingClientRect();
            const clientX = e.touches ? e.touches[0].clientX : e.clientX;
            const clientY = e.touches ? e.touches[0].clientY : e.clientY;
            
            this.dragOffset.x = clientX - rect.left;
            this.dragOffset.y = clientY - rect.top;
            
            this.draggedElementWidth = rect.width;
            this.draggedElementHeight = rect.height;
            
            element.classList.add('dragging');
            element.style.transition = 'none';
            
            e.preventDefault();
        };
        
        [historyControls, configArea, timeDisplayArea, featureArea, toolbar].forEach(element => {
            // Mouse events
            element.addEventListener('mousedown', (e) => handleDragStart(e, element));
            // Touch events - improve compatibility with large-screen touch devices
            element.addEventListener('touchstart', (e) => handleDragStart(e, element), { passive: false });
        });
        
        // Unified move handler for mouse and touch events
        const handleDragMove = (e) => {
            if (!this.isDraggingPanel || !this.draggedElement) return;
            
            const clientX = e.touches ? e.touches[0].clientX : e.clientX;
            const clientY = e.touches ? e.touches[0].clientY : e.clientY;
            
            let x = clientX - this.dragOffset.x;
            let y = clientY - this.dragOffset.y;
            
            const edgeSnapDistance = 30;
            const edgeSnapHysteresis = 60; // Wider zone to prevent flicker when already snapped
            const windowWidth = window.innerWidth;
            const windowHeight = window.innerHeight;
            const isToolbar = this.draggedElement.id === 'toolbar';
            const isConfigArea = this.draggedElement.id === 'config-area';
            const isTimeDisplayArea = this.draggedElement.id === 'time-display-area';
            const isFeatureArea = this.draggedElement.id === 'feature-area';
            
            let snappedToEdge = false;
            let isVertical = false;
            let snappedLeft = false;
            let snappedRight = false;
            
            // Check if currently in vertical mode
            const currentlyVertical = this.draggedElement.classList.contains('vertical');
            
            // Get current element dimensions (updated during drag)
            const currentRect = this.draggedElement.getBoundingClientRect();
            const currentWidth = currentRect.width;
            const currentHeight = currentRect.height;
            
            if (this.settingsManager.edgeSnapEnabled) {
                // Use hysteresis: easier to snap than to unsnap (prevents flicker)
                // When already vertical (snapped), use a dynamic hysteresis based on width difference
                // to prevent flickering back to horizontal when the horizontal width is large
                let effectiveSnapDistance = edgeSnapDistance;

                if (currentlyVertical) {
                    // If vertical, we need a larger hysteresis zone
                    // Calculate based on the difference between horizontal and vertical widths
                    // Formula ensures unsnap threshold is further than snap threshold
                    // Width difference + buffer to avoid flicker loop
                    const widthDiff = Math.max(0, this.draggedElementWidth - currentWidth);
                    effectiveSnapDistance = Math.max(300, edgeSnapDistance + widthDiff + 50);
                }
                
                // Check for left edge snap first
                if (x < effectiveSnapDistance) {
                    x = 10;
                    snappedToEdge = true;
                    isVertical = true;
                    snappedLeft = true;
                }
                // Check for right edge snap
                else if (x + currentWidth > windowWidth - effectiveSnapDistance) {
                    // When vertical, need to recalculate width
                    if (isToolbar || isConfigArea || isTimeDisplayArea || isFeatureArea) {
                        // Temporarily add vertical class to get correct dimensions
                        this.draggedElement.classList.add('vertical');
                        const tempWidth = this.draggedElement.getBoundingClientRect().width;
                        this.draggedElement.classList.remove('vertical');
                        x = windowWidth - tempWidth - 10;
                    } else {
                        x = windowWidth - currentWidth - 10;
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
                if (y + currentHeight > windowHeight - edgeSnapDistance) {
                    y = windowHeight - currentHeight - 10;
                    snappedToEdge = true;
                }
            }
            
            // Apply vertical layout for toolbar, config area, time display area, and feature area when snapped to left/right
            if ((isToolbar || isConfigArea || isTimeDisplayArea || isFeatureArea) && snappedToEdge && isVertical) {
                this.draggedElement.classList.add('vertical');
                // Recalculate position after adding vertical class to account for dimension changes
                if (snappedRight) {
                    const newWidth = this.draggedElement.getBoundingClientRect().width;
                    x = windowWidth - newWidth - 10;
                }
                // Update height after dimension change for vertical layout
                const newRect = this.draggedElement.getBoundingClientRect();
                this.draggedElementHeight = newRect.height;
            } else {
                this.draggedElement.classList.remove('vertical');
                // Update dimensions when switching back to horizontal
                const newRect = this.draggedElement.getBoundingClientRect();
                this.draggedElementWidth = newRect.width;
                this.draggedElementHeight = newRect.height;
            }
            
            // Constrain to viewport boundaries (prevent overflow)
            const finalRect = this.draggedElement.getBoundingClientRect();
            x = Math.max(0, Math.min(x, windowWidth - finalRect.width));
            y = Math.max(0, Math.min(y, windowHeight - finalRect.height));
            
            this.draggedElement.style.left = `${x}px`;
            this.draggedElement.style.top = `${y}px`;
            this.draggedElement.style.transform = 'none';
            this.draggedElement.style.right = 'auto';
            this.draggedElement.style.bottom = 'auto';
        };
        
        // Unified end handler for mouse and touch events
        const handleDragEnd = () => {
            if (this.isDraggingPanel && this.draggedElement) {
                this.draggedElement.classList.remove('dragging');
                this.draggedElement.style.transition = '';
                
                // Mark toolbar as user-positioned to prevent auto-repositioning
                if (this.draggedElement.id === 'toolbar') {
                    this.draggedElement.classList.add('user-positioned');
                }
                
                this.isDraggingPanel = false;
                this.draggedElement = null;
            }
        };
        
        // Add both mouse and touch event listeners for better touch device support
        document.addEventListener('mousemove', handleDragMove);
        document.addEventListener('mouseup', handleDragEnd);
        document.addEventListener('touchmove', handleDragMove, { passive: false });
        document.addEventListener('touchend', handleDragEnd);
        document.addEventListener('touchcancel', handleDragEnd);
    }
    
    updatePenLineStyleSettings(lineStyle) {
        const penLineStyleSettings = document.getElementById('pen-line-style-settings');
        const penDashDensitySetting = document.getElementById('pen-dash-density-setting');
        
        // Reset all settings
        if (penLineStyleSettings) penLineStyleSettings.style.display = 'none';
        if (penDashDensitySetting) penDashDensitySetting.style.display = 'none';
        
        // Show relevant settings
        switch(lineStyle) {
            case 'dashed':
            case 'dotted':
                if (penLineStyleSettings) penLineStyleSettings.style.display = 'block';
                if (penDashDensitySetting) penDashDensitySetting.style.display = 'flex';
                break;
        }
    }
    
    switchToPen() {
        // Helper method to switch to pen tool
        this.setTool('pen', false);
    }
    
    positionFeatureArea() {
        // Position feature-area above the "更多" button
        const featureArea = document.getElementById('feature-area');
        const moreBtn = document.getElementById('more-btn');
        const toolbar = document.getElementById('toolbar');
        
        const moreBtnRect = moreBtn.getBoundingClientRect();
        const toolbarRect = toolbar.getBoundingClientRect();
        
        featureArea.style.bottom = 'auto';
        featureArea.style.left = `${moreBtnRect.left}px`;
        featureArea.style.top = `${toolbarRect.top - 10}px`;
        featureArea.style.transform = 'translateY(-100%)';
    }
    
    setTool(tool, showConfig = true) {
        const configArea = document.getElementById('config-area');
        const featureArea = document.getElementById('feature-area');
        const previousTool = this.drawingEngine.currentTool;
        
        // Check if we're clicking the same tool button again (toggle behavior)
        const isSameTool = (previousTool === tool);
        const isConfigVisible = configArea.classList.contains('show');
        
        // Update drawing engine tool
        this.drawingEngine.setTool(tool);
        if (tool === 'eraser') {
            this.showEraserCursor();
        } else {
            this.hideEraserCursor();
        }
        
        this.updateUI();
        
        // Handle toggle behavior for tools with config panels
        const toolsWithConfig = ['pen', 'eraser', 'background', 'shape'];
        
        if (showConfig && toolsWithConfig.includes(tool)) {
            // If clicking the same tool and config is visible, toggle it off
            if (isSameTool && isConfigVisible) {
                configArea.classList.remove('show');
            } else {
                // Show config panel
                configArea.classList.add('show');
                // Don't close feature-area when selecting shape - allow multiple panels to be open
                if (tool !== 'shape') {
                    featureArea.classList.remove('show');
                }
            }
        } else if (tool === 'more') {
            // Toggle feature-area for more button
            const isFeatureAreaVisible = featureArea.classList.contains('show');
            if (isFeatureAreaVisible) {
                featureArea.classList.remove('show');
                // Also hide config-area when closing feature-area to prevent empty panel from showing
                // The 'more' tool has no associated config panel, so config-area should always be hidden
                configArea.classList.remove('show');
            } else {
                featureArea.classList.add('show');
                configArea.classList.remove('show');
                this.positionFeatureArea();
            }
        } else {
            // For other tools (like pan), just hide panels
            configArea.classList.remove('show');
            featureArea.classList.remove('show');
        }
    }
    
    handleDrawingComplete() {
        // Handle shape drawing completion
        if (this.drawingEngine.currentTool === 'shape') {
            this.shapeDrawingManager.stopDrawing();
            return;
        }
        
        if (this.drawingEngine.stopDrawing()) {
            this.historyManager.saveState();
            this.closeConfigPanel();
            this.closeFeaturePanel();
        }
    }
    
    discardCurrentStroke() {
        // Stop any ongoing drawing and clear the stroke buffer
        this.drawingEngine.isDrawing = false;
        this.drawingEngine.points = [];
        this.drawingEngine.lastPoint = null;
        // Restore canvas to the last saved state, removing any partial stroke
        // Note: This only redraws from current history position, doesn't affect undo/redo
        if (this.historyManager.historyStep >= 0) {
            this.historyManager.restoreState();
        }
    }
    
    closeConfigPanel() {
        document.getElementById('config-area').classList.remove('show');
    }
    
    closeFeaturePanel() {
        document.getElementById('feature-area').classList.remove('show');
    }
    
    openSettings() {
        document.getElementById('settings-modal').classList.add('show');
        
        // Update time display settings UI with current values
        const timeDisplayCheckbox = document.getElementById('show-time-display-checkbox');
        timeDisplayCheckbox.checked = this.timeDisplayManager.enabled;
        
        // Show/hide time display settings based on enabled state
        const timeDisplaySettings = document.getElementById('time-display-settings');
        const timezoneSettings = document.getElementById('timezone-settings');
        const timeFormatSettings = document.getElementById('time-format-settings');
        const dateFormatSettings = document.getElementById('date-format-settings');
        const timeColorSettings = document.getElementById('time-color-settings');
        const timeFontSizeSettings = document.getElementById('time-font-size-settings');
        const timeOpacitySettings = document.getElementById('time-opacity-settings');
        const timeFullscreenSettings = document.getElementById('time-fullscreen-settings');
        const timeFullscreenFontSizeSettings = document.getElementById('time-fullscreen-font-size-settings');
        
        const isEnabled = this.timeDisplayManager.enabled;
        timeDisplaySettings.style.display = isEnabled ? 'flex' : 'none';
        timezoneSettings.style.display = isEnabled ? 'flex' : 'none';
        timeFormatSettings.style.display = isEnabled ? 'flex' : 'none';
        dateFormatSettings.style.display = isEnabled ? 'flex' : 'none';
        timeColorSettings.style.display = isEnabled ? 'flex' : 'none';
        timeFontSizeSettings.style.display = isEnabled ? 'flex' : 'none';
        timeOpacitySettings.style.display = isEnabled ? 'flex' : 'none';
        timeFullscreenSettings.style.display = isEnabled ? 'flex' : 'none';
        timeFullscreenFontSizeSettings.style.display = isEnabled ? 'flex' : 'none';
        
        // Set active display type button
        document.querySelectorAll('.display-option-btn').forEach(btn => btn.classList.remove('active'));
        let displayType = 'both';
        if (this.timeDisplayManager.showDate && !this.timeDisplayManager.showTime) {
            displayType = 'date-only';
        } else if (!this.timeDisplayManager.showDate && this.timeDisplayManager.showTime) {
            displayType = 'time-only';
        }
        const activeBtn = document.querySelector(`.display-option-btn[data-display-type="${displayType}"]`);
        if (activeBtn) activeBtn.classList.add('active');
        
        // Set timezone selector
        document.getElementById('timezone-select').value = this.timeDisplayManager.timezone;
        
        document.getElementById('time-format-select').value = this.timeDisplayManager.timeFormat;
        document.getElementById('date-format-select').value = this.timeDisplayManager.dateFormat;
        document.getElementById('time-font-size-slider').value = this.timeDisplayManager.fontSize;
        document.getElementById('time-font-size-value').textContent = this.timeDisplayManager.fontSize;
        document.getElementById('time-font-size-input').value = this.timeDisplayManager.fontSize;
        document.getElementById('time-opacity-slider').value = this.timeDisplayManager.opacity;
        document.getElementById('time-opacity-value').textContent = this.timeDisplayManager.opacity;
        document.getElementById('time-opacity-input').value = this.timeDisplayManager.opacity;
        document.getElementById('custom-time-color-picker').value = this.timeDisplayManager.color;
        const defaultBgColor = '#FFFFFF'; // Default background color constant
        document.getElementById('custom-time-bg-color-picker').value = this.timeDisplayManager.bgColor === 'transparent' ? defaultBgColor : this.timeDisplayManager.bgColor;
        
        // Set fullscreen mode buttons
        document.querySelectorAll('.fullscreen-mode-btn').forEach(btn => {
            if (btn.dataset.mode === this.timeDisplayManager.fullscreenMode) {
                btn.classList.add('active');
            } else {
                btn.classList.remove('active');
            }
        });
        
        // Set fullscreen font size values
        if (document.getElementById('time-fullscreen-font-size-slider')) {
            document.getElementById('time-fullscreen-font-size-slider').value = this.timeDisplayManager.fullscreenFontSize;
            document.getElementById('time-fullscreen-font-size-value').textContent = this.timeDisplayManager.fullscreenFontSize;
            document.getElementById('time-fullscreen-font-size-input').value = this.timeDisplayManager.fullscreenFontSize;
        }
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
        } else if (tool === 'shape') {
            document.getElementById('more-btn').classList.add('active');
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
            // Don't manipulate feature-area visibility here - let setTool handle toggle
            // Only position it if it's already visible
            const featureArea = document.getElementById('feature-area');
            if (featureArea.classList.contains('show')) {
                this.positionFeatureArea();
            }
            
            this.canvas.style.cursor = 'default';
        }
        
        document.getElementById('undo-btn').disabled = !this.historyManager.canUndo();
        document.getElementById('redo-btn').disabled = !this.historyManager.canRedo();
        
        // Always show pagination controls since we're always in pagination mode
        const paginationControls = document.getElementById('pagination-controls');
        paginationControls.classList.add('show');
    }
    
    // Calculate the scale needed to fit canvas within viewport with margins
    calculateCanvasFitScale() {
        const width = this.settingsManager.canvasWidth;
        const height = this.settingsManager.canvasHeight;
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;
        const margin = 40; // Margin around canvas in pixels
        
        // Available space for canvas (accounting for margins)
        const availableWidth = viewportWidth - (2 * margin);
        const availableHeight = viewportHeight - (2 * margin);
        
        // Calculate scale to fit canvas within available space
        const scaleX = availableWidth / width;
        const scaleY = availableHeight / height;
        return Math.min(scaleX, scaleY, 1); // Don't scale up beyond 100%
    }
    
    applyCanvasSize() {
        // Always use pagination mode now
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
        
        // Recalculate fit scale since canvas size changed
        this.canvasFitScale = this.calculateCanvasFitScale();
        
        // Apply the current zoom level on top of the fit scale
        const finalScale = this.canvasFitScale * this.drawingEngine.canvasScale;
        
        // Center the canvas on the screen with proper scaling using transformLayer
        if (this.transformLayer) {
            this.transformLayer.style.position = 'absolute';
            this.transformLayer.style.left = '50%';
            this.transformLayer.style.top = '50%';
            this.transformLayer.style.width = width + 'px';
            this.transformLayer.style.height = height + 'px';
            this.transformLayer.style.transform = `translate(-50%, -50%) scale(${finalScale})`;

            // Children should not have individual transforms
            this.canvas.style.position = 'absolute';
            this.canvas.style.left = '0';
            this.canvas.style.top = '0';
            this.canvas.style.transform = 'none';

            this.bgCanvas.style.position = 'absolute';
            this.bgCanvas.style.left = '0';
            this.bgCanvas.style.top = '0';
            this.bgCanvas.style.transform = 'none';
        }
        
        // Re-apply DPR scaling to context
        this.ctx.scale(dpr, dpr);
        this.bgCtx.scale(dpr, dpr);
        
        // Restore content
        if (imageData) {
            this.ctx.putImageData(imageData, 0, 0);
        }
        
        this.backgroundManager.drawBackground();
    }
    
    // Zoom methods
    handleDoubleTap(touch) {
        // Zoom logic
        const currentScale = this.drawingEngine.canvasScale;
        let newScale;

        // If zoomed out or very zoomed in, reset to 100%
        // If close to 100%, zoom in to 200%
        if (Math.abs(currentScale - 1.0) > 0.1) {
            newScale = 1.0;
        } else {
            newScale = 2.0;
        }

        this.zoomToPoint(touch.clientX, touch.clientY, newScale, true);
    }

    zoomToPoint(clientX, clientY, newScale, animate = false) {
        // Get canvas position and dimensions
        const rect = this.canvas.getBoundingClientRect();

        // Calculate mouse position relative to canvas (in screen space)
        const mouseCanvasX = clientX - rect.left;
        const mouseCanvasY = clientY - rect.top;

        // Get current scale and pan
        const oldScale = this.drawingEngine.canvasScale;
        const oldPanX = this.drawingEngine.panOffset.x;
        const oldPanY = this.drawingEngine.panOffset.y;

        // Calculate scale ratio
        const scaleRatio = newScale / oldScale;

        // Get canvas center in screen space
        const canvasCenterX = rect.width / 2;
        const canvasCenterY = rect.height / 2;

        // Calculate offset from canvas center to mouse (in screen space)
        const offsetX = mouseCanvasX - canvasCenterX;
        const offsetY = mouseCanvasY - canvasCenterY;

        // Adjust pan offset so that the point under the mouse stays in place
        this.drawingEngine.panOffset.x = oldPanX + offsetX * (1 - scaleRatio);
        this.drawingEngine.panOffset.y = oldPanY + offsetY * (1 - scaleRatio);

        // Update scale
        this.drawingEngine.canvasScale = newScale;
        this.updateZoomUI();

        if (animate && this.transformLayer) {
            this.transformLayer.classList.add('smooth-transform');
            this.applyZoom(false);

            // Remove class after transition
            setTimeout(() => {
                if (this.transformLayer) {
                    this.transformLayer.classList.remove('smooth-transform');
                }
            }, 300);
        } else {
            this.applyZoom(false);
        }

        // Save to localStorage
        localStorage.setItem('canvasScale', newScale);
        localStorage.setItem('panOffsetX', this.drawingEngine.panOffset.x);
        localStorage.setItem('panOffsetY', this.drawingEngine.panOffset.y);
    }

    zoomIn() {
        const currentScale = this.drawingEngine.canvasScale;
        const newScale = Math.min(currentScale + 0.1, 5.0);
        this.drawingEngine.canvasScale = newScale;
        this.updateZoomUI();
        this.applyZoom(false); // Don't update config-area scale on zoom
        localStorage.setItem('canvasScale', newScale);
    }
    
    zoomOut() {
        const currentScale = this.drawingEngine.canvasScale;
        const newScale = Math.max(currentScale - 0.1, 0.5);
        this.drawingEngine.canvasScale = newScale;
        this.updateZoomUI();
        this.applyZoom(false); // Don't update config-area scale on zoom
        localStorage.setItem('canvasScale', newScale);
    }
    
    setZoom(value) {
        let percent = parseInt(value);
        if (isNaN(percent)) {
            this.updateZoomUI();
            return;
        }
        percent = Math.max(50, Math.min(500, percent));
        const newScale = percent / 100;
        this.drawingEngine.canvasScale = newScale;
        this.updateZoomUI();
        this.applyZoom(false); // Don't update config-area scale on zoom
        localStorage.setItem('canvasScale', newScale);
    }
    
    applyZoom(updateConfigScale = true) {
        // Use stored fit scale instead of recalculating to preserve user's pan/zoom state
        const finalScale = this.canvasFitScale * this.drawingEngine.canvasScale;
        
        // Apply zoom using CSS transform for better performance
        const panX = this.drawingEngine.panOffset.x;
        const panY = this.drawingEngine.panOffset.y;
        
        // Keep canvas centered and apply pan offset
        const transform = `translate(-50%, -50%) translate(${panX}px, ${panY}px) scale(${finalScale})`;

        if (this.transformLayer) {
            this.transformLayer.style.transform = transform;
            this.transformLayer.style.transformOrigin = 'center center';

            // Remove individual transforms
            this.canvas.style.transform = 'none';
            this.bgCanvas.style.transform = 'none';
        }
        
        // Update teaching tools scale factor
        this.teachingToolsManager.canvasScaleFactor = finalScale;
        this.teachingToolsManager.redrawTools();

        // Update config-area scale proportionally only when requested (on resize, not on refresh)
        if (updateConfigScale) {
            this.updateConfigAreaScale();
        }
    }
    
    updateConfigAreaScale() {
        const configArea = document.getElementById('config-area');
        const scale = this.drawingEngine.canvasScale;
        
        // Apply proportional scaling to config-area
        // Only apply scale if config-area is in its default centered position
        // Check if it has been dragged (has explicit left/top positioning)
        const hasBeenDragged = configArea.style.left && configArea.style.left !== 'auto' && 
                               configArea.style.left !== '50%';
        
        if (hasBeenDragged) {
            // Don't apply the translateX transform if it's been dragged
            configArea.style.transform = `scale(${scale})`;
            configArea.style.transformOrigin = 'center bottom';
        } else {
            // Apply original transform for centered config-area
            configArea.style.transform = `translateX(-50%) scale(${scale})`;
            configArea.style.transformOrigin = 'center bottom';
        }
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
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
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
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
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
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"></path>
                </svg>
            `;
            btn.title = '全屏 (F11)';
        } else {
            // Entered fullscreen
            btn.innerHTML = `
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
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
                    newScale = Math.min(oldScale + 0.1, 5.0);
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
                this.applyZoom(false); // Don't update config-area scale on zoom
                
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
        // Always in pagination mode, no need to check
        
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
        if (this.currentPage <= 1) return;
        
        // Save current page and background
        this.pages[this.currentPage - 1] = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
        this.savePageBackground(this.currentPage);
        
        // Go to previous page
        this.currentPage--;
        this.loadPage(this.currentPage);
        this.updatePaginationUI();
    }
    
    nextPage() {
        // Save current page and background
        this.pages[this.currentPage - 1] = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
        this.savePageBackground(this.currentPage);
        
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
        // Save current page and background
        this.pages[this.currentPage - 1] = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
        this.savePageBackground(this.currentPage);
        
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
        if (pageNumber < 1 || pageNumber === this.currentPage) {
            this.updatePaginationUI();
            return;
        }
        
        // Save current page and background
        this.pages[this.currentPage - 1] = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
        this.savePageBackground(this.currentPage);
        
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
        
        // Update move-origin-btn visibility based on current pattern
        const moveOriginBtn = document.getElementById('move-origin-btn');
        if (moveOriginBtn) {
            moveOriginBtn.style.display = this.backgroundManager.backgroundPattern === 'coordinate' ? 'inline-flex' : 'none';
        }
    }
    
    updatePaginationUI() {
        document.getElementById('page-input').value = this.currentPage;
        document.getElementById('page-total').textContent = `/ ${this.pages.length}`;
        
        const prevBtn = document.getElementById('prev-page-btn');
        const nextOrAddBtn = document.getElementById('next-or-add-page-btn');
        
        prevBtn.disabled = this.currentPage <= 1;
        nextOrAddBtn.disabled = false;
        
        // Update button icon and title based on whether we're on the last page
        // Also show "+" icon when there's only one page total
        if (this.currentPage >= this.pages.length || this.pages.length === 1) {
            // Show add icon
            nextOrAddBtn.innerHTML = `
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <line x1="12" y1="5" x2="12" y2="19"></line>
                    <line x1="5" y1="12" x2="19" y2="12"></line>
                </svg>
            `;
            nextOrAddBtn.title = window.i18n ? window.i18n.t('page.newPage') : '新建页面';
        } else {
            // Show next icon
            nextOrAddBtn.innerHTML = `
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <polyline points="9 18 15 12 9 6"></polyline>
                </svg>
            `;
            nextOrAddBtn.title = window.i18n ? window.i18n.t('page.next') : '下一页';
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
        if (e.touches.length < 2) return;
        if (!this.settingsManager.touchZoomEnabled) return;
        
        this.isPinching = true;
        const touch1 = e.touches[0];
        const touch2 = e.touches[1];
        this.lastPinchDistance = this.getPinchDistance(touch1, touch2);
        this.lastPinchCenter = this.getPinchCenter(touch1, touch2);
    }
    
    handlePinchMove(e) {
        if (!this.isPinching || e.touches.length < 2) return;
        
        const touch1 = e.touches[0];
        const touch2 = e.touches[1];
        const currentDistance = this.getPinchDistance(touch1, touch2);
        const currentCenter = this.getPinchCenter(touch1, touch2);
        
        if (this.lastPinchDistance > 0 && this.lastPinchCenter) {
            // Check if moved significantly to invalidate tap gesture
            const moveThreshold = 5;
            if (Math.abs(currentDistance - this.lastPinchDistance) > moveThreshold ||
                Math.abs(currentCenter.x - this.lastPinchCenter.x) > moveThreshold ||
                Math.abs(currentCenter.y - this.lastPinchCenter.y) > moveThreshold) {
                this.isPotentialGesture = false;
            }

            // Calculate zoom ratio
            const scaleRatio = currentDistance / this.lastPinchDistance;

            // Calculate new scale with limits
            const currentScale = this.drawingEngine.canvasScale;
            let newScale = currentScale * scaleRatio;
            newScale = Math.max(0.5, Math.min(5.0, newScale));

            // Recalculate effective scale ratio after clamping
            const effectiveScaleRatio = newScale / currentScale;
            
            this.drawingEngine.canvasScale = newScale;
            this.updateZoomUI();
            
            // Adjust pan offset to zoom towards the pinch center
            // Visual center of the canvas (relative to screen)
            // Since transform origin is center center, visual center is at screen center + pan offset
            const screenCenterX = window.innerWidth / 2;
            const screenCenterY = window.innerHeight / 2;

            // The point on canvas under the last pinch center
            // We want to keep this point under the new pinch center (conceptually)
            // Formula: Pan_new = Pan_old + (PinchCenter_old - VisualCenter_old) * (1 - ScaleRatio) + (PinchCenter_new - PinchCenter_old)

            // Vector from visual center to last pinch center
            // visualCenter = screenCenter + panOffset
            const visualCenterX = screenCenterX + this.drawingEngine.panOffset.x;
            const visualCenterY = screenCenterY + this.drawingEngine.panOffset.y;
            
            const offsetX = this.lastPinchCenter.x - visualCenterX;
            const offsetY = this.lastPinchCenter.y - visualCenterY;

            // 1. Zoom effect (keeping lastPinchCenter fixed relative to canvas content)
            let newPanX = this.drawingEngine.panOffset.x + offsetX * (1 - effectiveScaleRatio);
            let newPanY = this.drawingEngine.panOffset.y + offsetY * (1 - effectiveScaleRatio);

            // 2. Pan effect (moving content with fingers)
            newPanX += (currentCenter.x - this.lastPinchCenter.x);
            newPanY += (currentCenter.y - this.lastPinchCenter.y);

            this.drawingEngine.panOffset.x = newPanX;
            this.drawingEngine.panOffset.y = newPanY;
            
            // Apply zoom using applyZoom for consistency
            this.applyZoom(false);
        }
        
        this.lastPinchDistance = currentDistance;
        this.lastPinchCenter = currentCenter;
    }
    
    handlePinchEnd() {
        this.isPinching = false;
        this.lastPinchDistance = 0;
        this.lastPinchCenter = null;

        // Save state after pinch ends
        localStorage.setItem('canvasScale', this.drawingEngine.canvasScale);
        localStorage.setItem('panOffsetX', this.drawingEngine.panOffset.x);
        localStorage.setItem('panOffsetY', this.drawingEngine.panOffset.y);
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
    
    // Pointer Events-based pinch gesture handlers
    // These work with stylus/pen + finger combinations and pure touch inputs
    handlePointerPinchStart() {
        if (!this.settingsManager.touchZoomEnabled) return;
        
        // Get the first two pointers
        const pointers = Array.from(this.activePointers.values());
        if (pointers.length < 2) return;
        
        this.isPinching = true;
        this.hasTwoFingers = true;
        
        // If we were drawing, stop and discard the current stroke
        if (this.drawingEngine.isDrawing) {
            this.discardCurrentStroke();
        }
        
        // If we were panning, stop it
        if (this.drawingEngine.isPanning) {
            this.drawingEngine.stopPanning();
        }
        
        // Calculate initial pinch distance and center
        const p1 = pointers[0];
        const p2 = pointers[1];
        this.lastPinchDistance = this.getPointerDistance(p1, p2);
        this.lastPinchCenter = this.getPointerCenter(p1, p2);
    }
    
    handlePointerPinchMove() {
        if (!this.isPinching) return;
        
        const pointers = Array.from(this.activePointers.values());
        if (pointers.length < 2) return;
        
        const p1 = pointers[0];
        const p2 = pointers[1];
        const currentDistance = this.getPointerDistance(p1, p2);
        const currentCenter = this.getPointerCenter(p1, p2);
        
        if (this.lastPinchDistance > 0 && this.lastPinchCenter) {
            // Calculate zoom ratio
            const scaleRatio = currentDistance / this.lastPinchDistance;
            
            // Calculate new scale with limits
            const currentScale = this.drawingEngine.canvasScale;
            let newScale = currentScale * scaleRatio;
            newScale = Math.max(this.MIN_CANVAS_SCALE, Math.min(this.MAX_CANVAS_SCALE, newScale));
            
            // Recalculate effective scale ratio after clamping
            const effectiveScaleRatio = newScale / currentScale;
            
            this.drawingEngine.canvasScale = newScale;
            this.updateZoomUI();
            
            // Adjust pan offset to zoom towards the pinch center
            const screenCenterX = window.innerWidth / 2;
            const screenCenterY = window.innerHeight / 2;
            const visualCenterX = screenCenterX + this.drawingEngine.panOffset.x;
            const visualCenterY = screenCenterY + this.drawingEngine.panOffset.y;
            
            const offsetX = this.lastPinchCenter.x - visualCenterX;
            const offsetY = this.lastPinchCenter.y - visualCenterY;
            
            // 1. Zoom effect (keeping lastPinchCenter fixed relative to canvas content)
            let newPanX = this.drawingEngine.panOffset.x + offsetX * (1 - effectiveScaleRatio);
            let newPanY = this.drawingEngine.panOffset.y + offsetY * (1 - effectiveScaleRatio);
            
            // 2. Pan effect (moving content with fingers)
            newPanX += (currentCenter.x - this.lastPinchCenter.x);
            newPanY += (currentCenter.y - this.lastPinchCenter.y);
            
            this.drawingEngine.panOffset.x = newPanX;
            this.drawingEngine.panOffset.y = newPanY;
            
            // Apply zoom (false = don't update config-area scale)
            this.applyZoom(false);
        }
        
        this.lastPinchDistance = currentDistance;
        this.lastPinchCenter = currentCenter;
    }
    
    handlePointerPinchEnd() {
        this.isPinching = false;
        this.hasTwoFingers = false;
        this.lastPinchDistance = 0;
        this.lastPinchCenter = null;
        
        // Save state after pinch ends
        localStorage.setItem('canvasScale', this.drawingEngine.canvasScale);
        localStorage.setItem('panOffsetX', this.drawingEngine.panOffset.x);
        localStorage.setItem('panOffsetY', this.drawingEngine.panOffset.y);
    }
    
    getPointerDistance(p1, p2) {
        const dx = p2.x - p1.x;
        const dy = p2.y - p1.y;
        return Math.sqrt(dx * dx + dy * dy);
    }
    
    getPointerCenter(p1, p2) {
        return {
            x: (p1.x + p2.x) / 2,
            y: (p1.y + p2.y) / 2
        };
    }
    
    applyPanTransform() {
        // Apply pan offset using CSS transform for better performance
        const panX = this.drawingEngine.panOffset.x;
        const panY = this.drawingEngine.panOffset.y;
        // Use the combined fit scale and user zoom scale
        const finalScale = this.canvasFitScale * this.drawingEngine.canvasScale;
        
        if (this.transformLayer) {
            if (!this.settingsManager.infiniteCanvas) {
                // In paginated mode, center canvas using position and translate
                this.transformLayer.style.position = 'absolute';
                this.transformLayer.style.left = '50%';
                this.transformLayer.style.top = '50%';

                // Combine translate and scale
                const transform = `translate(-50%, -50%) translate(${panX}px, ${panY}px) scale(${finalScale})`;
                this.transformLayer.style.transform = transform;
            } else {
                // In infinite mode, combine translate and scale
                const transform = `translate(${panX}px, ${panY}px) scale(${finalScale})`;
                this.transformLayer.style.transform = transform;
            }
            
            // Ensure children don't have conflicting transforms
            this.canvas.style.transform = 'none';
            this.bgCanvas.style.transform = 'none';
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
        if (this.isDraggingCoordinateOrigin) {
            this.isDraggingCoordinateOrigin = false;
            // Restore cursor based on current tool or mode
            if (this.isCoordinateOriginDragMode) {
                this.canvas.style.cursor = 'move';
            } else if (this.drawingEngine.currentTool === 'pan') {
                this.canvas.style.cursor = 'grab';
            } else {
                this.canvas.style.cursor = 'crosshair';
            }
        }
    }
}

// Initialize the application
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', async () => {
        // Initialize i18n first
        if (window.BrowserCheck) {
            window.BrowserCheck.init();
        }
        if (window.i18n) {
            await window.i18n.init();
        }
        new DrawingBoard();
    });
} else {
    // If DOM is already loaded, initialize immediately
    (async () => {
        if (window.BrowserCheck) {
            window.BrowserCheck.init();
        }
        if (window.i18n) {
            await window.i18n.init();
        }
        new DrawingBoard();
    })();
}
