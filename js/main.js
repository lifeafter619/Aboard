// Main Application Class
// Integrates all modules and handles user interactions
const DEFAULT_MIN_FIT_SCALE = 0.1;
const DEFAULT_TARGET_COVERAGE = 0.7;
const DEFAULT_MIN_DEFAULT_SCALE = 0.9;
const QUALITY_UPDATE_DEBOUNCE_MS = 120;
const MIN_DYNAMIC_RENDER_SCALE = 1;
const MAX_DYNAMIC_RENDER_SCALE = 4;
const INTERACTION_DYNAMIC_RENDER_SCALE_CAP = 1.25;
const RENDER_SCALE_SCHEDULE_THRESHOLD = 0.15;
const RENDER_SCALE_APPLY_THRESHOLD = 0.05;
const MAX_DYNAMIC_BACKING_DIMENSION = 8192;
const MAX_DYNAMIC_BACKING_PIXELS = 64 * 1024 * 1024;
const boardConstruction = window.AboardBoardConstruction || {};
const panelRuntime = window.AboardPanelRuntime || {};
const layoutRuntime = window.AboardLayoutRuntime || {};
const coordinatePanelRuntime = window.AboardCoordinatePanelRuntime || {};
const overlayUiRuntime = window.AboardOverlayUiRuntime || {};
const modalRuntime = window.AboardModalRuntime || {};
const lazyManagerRuntime = window.AboardLazyManagerRuntime || {};
const uiListenersRuntime = window.AboardUiListenersRuntime || {};
const sessionRuntime = window.AboardSessionRuntime || {};
const fontManagementRuntime = window.AboardFontManagementRuntime || {};
const configImportRuntime = window.AboardConfigImportRuntime || {};
const backgroundUiRuntime = window.AboardBackgroundUiRuntime || {};
const cacheRuntime = window.AboardCacheRuntime || {};
const customizationRuntime = window.AboardCustomizationRuntime || {};
const displayRuntime = window.AboardDisplayRuntime || {};
const paginationRuntime = window.AboardPaginationRuntime || {};
const interactionRuntime = window.AboardInteractionRuntime || {};
const uploadedImagesRuntime = window.AboardUploadedImagesRuntime || {};

class DrawingBoard {
    constructor(options = {}) {
        // Canvas setup
        this.canvas = options.canvas || document.getElementById('canvas');
        this.ctx = options.ctx || this.canvas.getContext('2d', { 
            desynchronized: true,
            alpha: true
        });
        
        this.bgCanvas = options.bgCanvas || document.getElementById('background-canvas');
        this.bgCtx = options.bgCtx || this.bgCanvas.getContext('2d');
        
        this.eraserCursor = options.eraserCursor || document.getElementById('eraser-cursor');
        
        // Initialize modules
        const settingsManager = options.settingsManager || new SettingsManager();
        this.settingsManager = settingsManager;
        const coreRuntimeDependencies = boardConstruction.createCoreRuntimeDependencies?.(options, {
            canvas: this.canvas,
            ctx: this.ctx,
            bgCanvas: this.bgCanvas,
            bgCtx: this.bgCtx
        }) || {
            drawingEngine: options.drawingEngine,
            historyManager: options.historyManager,
            backgroundManager: options.backgroundManager,
            imageControls: options.imageControls,
            strokeControls: options.strokeControls,
            selectionManager: options.selectionManager,
            teachingToolsManager: options.teachingToolsManager,
            shapeDrawingManager: options.shapeDrawingManager,
            lineStyleModal: options.lineStyleModal,
            edgeDrawingManager: options.edgeDrawingManager
        };
        this.drawingEngine = coreRuntimeDependencies.drawingEngine;
        this.historyManager = coreRuntimeDependencies.historyManager;
        this.backgroundManager = coreRuntimeDependencies.backgroundManager;
        this.imageControls = coreRuntimeDependencies.imageControls;
        this.strokeControls = coreRuntimeDependencies.strokeControls;
        this.selectionManager = coreRuntimeDependencies.selectionManager;
        const timeDisplayDependencies = boardConstruction.createTimeDisplayDependencies?.(options, this.settingsManager) || {
            timeDisplayManager: options.timeDisplayManager,
            timeDisplayControls: options.timeDisplayControls,
            timeDisplaySettingsModal: options.timeDisplaySettingsModal
        };
        this.timeDisplayManager = timeDisplayDependencies.timeDisplayManager;
        this.timeDisplayControls = timeDisplayDependencies.timeDisplayControls;
        this.timeDisplaySettingsModal = timeDisplayDependencies.timeDisplaySettingsModal;
        // Lazy loaded managers
        this.timerManager = null;
        this.randomPickerManager = null;
        this.scoreboardManager = null;
        this.insertImageManager = null;
        this.insertTextManager = null;
        this.projectManager = null;
        this.exportManager = null;

        this.collapsibleManager = options.collapsibleManager || new CollapsibleManager();
        this.announcementManager = options.announcementManager || new AnnouncementManager();
        this.teachingToolsManager = coreRuntimeDependencies.teachingToolsManager;
        this.toolButtonIds = {
            pen: 'pen-btn',
            eraser: 'eraser-btn',
            background: 'background-btn',
            select: 'select-btn',
            // Shape tool is launched from the More menu button.
            shape: 'more-shape-btn'
        };
        
        // Set callback for teaching tools insertion to auto-switch to pen
        this.teachingToolsManager.onToolsInserted = () => {
            this.closeFeaturePanel();
            this.switchToPen();
        };
        
        // Initialize shape drawing manager
        this.shapeDrawingManager = coreRuntimeDependencies.shapeDrawingManager;
        this.drawingEngine?.setShapeDrawingManager?.(this.shapeDrawingManager);
        
        // Initialize line style modal for both pen and shape tools
        this.lineStyleModal = coreRuntimeDependencies.lineStyleModal;
        
        // Initialize edge drawing manager for teaching tools
        this.edgeDrawingManager = coreRuntimeDependencies.edgeDrawingManager;

        // Initialize Help System
        if (options.helpSystem) {
            this.helpSystem = options.helpSystem;
            this.helpSystem.init?.();
        } else if (window.HelpSystem) {
            this.helpSystem = new HelpSystem();
            this.helpSystem.init();
        }
        
        // Re-apply i18n translations for dynamically created elements (like selection controls)
        if (window.i18n && window.i18n.applyTranslations) {
            window.i18n.applyTranslations();
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
        this.NORMAL_MAX_SCALE = 10.0;
        this.UNLIMITED_MAX_SCALE = 500.0;
        this.MAX_CANVAS_SCALE = this.settingsManager.unlimitedZoom ? this.UNLIMITED_MAX_SCALE : this.NORMAL_MAX_SCALE;
        this.dynamicRenderScale = 1;
        this.qualityUpdateTimer = null;
        
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
        this.dragSnapSide = null;
        this.pendingPanelDrag = null;
        this.featureWidgetZIndex = 1200;
        this.modalResizeState = null;
        this.modalDragState = null;
        this.cacheSizeRequestToken = 0;
        this.cacheSizeRetryScheduled = false;
        this.cacheStorageSizeSnapshotKey = 'aboardCacheStorageSizeSnapshot';
        
        // Coordinate origin dragging state
        this.isDraggingCoordinateOrigin = false;
        this.isCoordinateOriginDragMode = false; // Mode activated by button click
        this.isCoordinatePointMode = false;
        this.isCoordinateSettingsExpanded = false;
        this.isCoordinatePointPanelVisible = false;
        this.isCoordinateInputPanelVisible = false;
        this.expandedCoordinatePlotId = null;
        this.pendingCoordinateLineStartId = null;
        this.coordinateOriginDragStart = { x: 0, y: 0 };
        this.openFontPreviewPanels = new Set();
        this.editingFontAliasFont = null;
        this.activeFontPreviewFont = null;
        
        // Uploaded images storage
        this.uploadedImages = this.loadUploadedImages();
        
        // Connect edge drawing manager to drawing engine
        this.drawingEngine.setEdgeDrawingManager(this.edgeDrawingManager);
        
        // Initialize StorageManager
        this.storageManager = options.storageManager || new StorageManager();

        // Debounced save function
        this.saveTimeout = null;
        this.saveSessionDebounced = () => {
            if (this.saveTimeout) clearTimeout(this.saveTimeout);
            this.saveTimeout = setTimeout(() => {
                this.saveSession();
            }, 1000); // 1 second delay
        };
        // Persist a fresh recovery snapshot whenever history commits change
        // so refresh-restore covers all tools that write through HistoryManager.
        this.historyManager.onStateChanged = () => {
            this.saveSessionDebounced();
        };

        // Initialize
        this.resizeCanvas();
        this.setupEventListeners();
        this.setupModalInteractionLock();
        this.settingsManager.loadSettings();
        this.initResizableModals();
        window.addEventListener('localeChanged', () => {
            document.querySelectorAll('.resizable-modal-content').forEach(content => {
                this.updateModalHeaderActionButtons(content);
            });
            this.updateBackgroundUI();
        });
        this.backgroundManager.drawBackground();
        this.updateUI();
        this.revealToolbar();
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
        this.updateImportExportBtnVisibility();
        this.updateFullscreenBtnVisibility();
        this.updatePatternGrid();
        this.updateUploadedImagesButtons();
        
        // Listen for fullscreen changes
        document.addEventListener('fullscreenchange', () => this.handleFullscreenChange());
        
        // Save canvas data before page unload (Attempt synchronous save, though IndexedDB is async)
        window.addEventListener('beforeunload', (e) => {
            this.saveSession();
            // Show warning message when user tries to refresh or close the page
            const message = window.i18n ? window.i18n.t('tools.refresh.warning') : 'Refreshing will clear all canvas content and cannot be recovered. Are you sure you want to refresh?';
            e.preventDefault();
            e.returnValue = message;
            return message;
        });
        
        // Check for saved canvas data and show recovery dialog
        this.checkForRecovery();
        this.scheduleMoreFeaturePreload();
    }

    async loadManagerConstructor(name) {
        return lazyManagerRuntime.loadManagerConstructor?.(this, name);
    }

    showLazyLoadError(featureName, error) {
        return lazyManagerRuntime.showLazyLoadError?.(this, featureName, error);
    }

    async getExportManager() {
        return lazyManagerRuntime.getExportManager?.(this);
    }

    async getProjectManager() {
        return lazyManagerRuntime.getProjectManager?.(this);
    }

    async getTimerManager() {
        return lazyManagerRuntime.getTimerManager?.(this);
    }

    async getInsertImageManager() {
        return lazyManagerRuntime.getInsertImageManager?.(this);
    }

    async getInsertTextManager() {
        return lazyManagerRuntime.getInsertTextManager?.(this);
    }

    async getRandomPickerManager() {
        return lazyManagerRuntime.getRandomPickerManager?.(this);
    }

    async getScoreboardManager() {
        return lazyManagerRuntime.getScoreboardManager?.(this);
    }

    scheduleMoreFeaturePreload() {
        return lazyManagerRuntime.scheduleMoreFeaturePreload?.(this);
    }

    async preloadMoreFeatureManagers() {
        return lazyManagerRuntime.preloadMoreFeatureManagers?.(this);
    }


    getResizableModalConfigs() {
        return modalRuntime.getResizableModalConfigs?.() || [];
    }

    initResizableModals() {
        return modalRuntime.initResizableModals?.(this);
    }

    getLocaleText(key, fallback) {
        return modalRuntime.getLocaleText?.(key, fallback) ?? fallback;
    }

    registerResizableModal(config) {
        return modalRuntime.registerResizableModal?.(this, config);
    }

    syncResizableModalState(target) {
        return modalRuntime.syncResizableModalState?.(this, target);
    }

    startModalDrag(event, content, header) {
        return modalRuntime.startModalDrag?.(this, event, content, header);
    }

    handleModalDrag(event) {
        return modalRuntime.handleModalDrag?.(this, event);
    }

    finishModalDrag(event = null) {
        return modalRuntime.finishModalDrag?.(this, event);
    }

    updateModalHeaderActionButtons(content) {
        return modalRuntime.updateModalHeaderActionButtons?.(this, content);
    }

    getModalLayoutBounds(content) {
        return modalRuntime.getModalLayoutBounds?.(content);
    }

    applyCustomModalLayout(content, desiredWidth, desiredHeight, centerInViewport = false) {
        return modalRuntime.applyCustomModalLayout?.(this, content, desiredWidth, desiredHeight, centerInViewport);
    }

    restoreDefaultModalLayout(content) {
        return modalRuntime.restoreDefaultModalLayout?.(content);
    }

    resetResizableModalSize(content) {
        return modalRuntime.resetResizableModalSize?.(this, content);
    }

    toggleModalKeepCentered(content) {
        return modalRuntime.toggleModalKeepCentered?.(this, content);
    }

    startModalResize(event, content, handleName) {
        return modalRuntime.startModalResize?.(this, event, content, handleName);
    }

    handleModalResize(event) {
        return modalRuntime.handleModalResize?.(this, event);
    }

    finishModalResize() {
        return modalRuntime.finishModalResize?.(this);
    }

    syncEraserSizeControls() {
        const eraserSizeSlider = document.getElementById('eraser-size-slider');
        const eraserSizeValue = document.getElementById('eraser-size-value');
        if (eraserSizeSlider) {
            eraserSizeSlider.value = this.drawingEngine.eraserSize;
        }
        if (eraserSizeValue) {
            eraserSizeValue.textContent = this.drawingEngine.eraserSize;
        }
        if (this.drawingEngine.currentTool === 'eraser') {
            this.eraserCursor.style.width = `${this.drawingEngine.eraserSize}px`;
            this.eraserCursor.style.height = `${this.drawingEngine.eraserSize}px`;
        }
    }

    refreshAdaptiveEraserSize() {
        if (this.drawingEngine.refreshAdaptiveEraserSize()) {
            this.syncEraserSizeControls();
        }
    }
    
    
    initializeCanvasView() {
        // On startup or refresh, set canvas to a larger default scale and center it
        // Only apply if no saved scale exists
        const savedScale = localStorage.getItem('canvasScale');
        // Always calculate fit scale for applyZoom and default coverage logic.
        this.canvasFitScale = this.calculateCanvasFitScale();
        if (!savedScale) {
            const safeFitScale = Math.max(DEFAULT_MIN_FIT_SCALE, this.canvasFitScale);
            // Compute canvasScale so fitScale * canvasScale meets desired coverage.
            const scaleForCoverage = DEFAULT_TARGET_COVERAGE / safeFitScale;
            // Keep a higher default scale so the canvas starts larger than the minimum target.
            const boundedScale = Math.max(DEFAULT_MIN_DEFAULT_SCALE, scaleForCoverage);
            const initialScale = Math.min(this.MAX_CANVAS_SCALE, boundedScale);
            this.drawingEngine.canvasScale = initialScale;
            localStorage.setItem('canvasScale', initialScale);
        }
        
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
        const dpr = this.getRenderPixelRatio();
        
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
        this.syncInteractiveOverlays();
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
                    e.target.closest('#time-display') ||
                    e.target.closest('#feature-area') ||
                    e.target.closest('.modal') ||
                    e.target.closest('.timer-display-widget') ||
                    e.target.closest('.random-picker-widget') ||
                    e.target.closest('.scoreboard-widget') ||
                    e.target.closest('.feature-widget') ||
                    e.target.closest('.canvas-image-selection') ||
                    e.target.closest('.time-fullscreen-modal') ||
                    e.target.closest('.timer-fullscreen-modal') ||
                    e.target.closest('#time-display-settings-modal') ||
                    e.target.closest('#timer-settings-modal') ||
                    e.target.closest('#selection-controls-overlay') ||
                    e.target.closest('#insert-image-overlay') ||
                    e.target.closest('#image-controls-overlay') ||
                    e.target.closest('input[type="range"]')) {
                    return;
                }
            }
            
            // 如果正在使用选择工具并且点击在选择控件内，不要触发新的选择
            if (this.selectionManager && this.selectionManager.hasSelection()) {
                if (e.target.closest('#selection-controls-overlay')) {
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
            
            if (this.isCoordinatePointMode && this.backgroundManager.supportsMovableOrigin()) {
                const point = this.getLogicalCanvasPointFromEvent(e);
                const pointMode = this.getCoordinatePointLineMode();
                if (pointMode === 'selected') {
                    const hitPoint = this.backgroundManager.findCoordinatePointNearCanvasPoint(point.x, point.y);
                    if (hitPoint) {
                        this.handleSelectedCoordinateLinePointClick(hitPoint.id);
                        return;
                    }
                }
                const addedPoint = this.backgroundManager.addCoordinatePoint(point.x, point.y);
                if (addedPoint?.duplicate) {
                    return;
                }
                this.resetSelectedCoordinateLineConnection();
                this.savePageBackground(this.currentPage);
                this.updateBackgroundUI();
                this.showCoordinateToast('background.pointAdded', '已添加坐标点', 'success');
                return;
            }

            // Check if clicking on coordinate origin point (in coordinate origin drag mode or background mode)
            if (this.backgroundManager.supportsMovableOrigin()) {
                const point = this.getLogicalCanvasPointFromEvent(e);
                const { x, y } = point;
                
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

            if (this.drawingEngine.currentTool === 'more') {
                const hasActiveMoreFeature = !!document.querySelector('#feature-area .feature-btn.active');
                if (!hasActiveMoreFeature) {
                    this.setTool('pan', false);
                }
            }
            
            if (e.button === 1 || (e.button === 0 && e.shiftKey) || this.drawingEngine.currentTool === 'pan') {
                this.drawingEngine.startPanning(e);
                this.scheduleRenderQualityUpdate();
            } else if (this.drawingEngine.currentTool === 'select') {
                // Handle selection tool
                this.selectionManager.startSelection(e);
            } else if (this.drawingEngine.currentTool === 'shape') {
                // Handle shape drawing
                if (this.teachingToolsManager && this.teachingToolsManager.isInteracting) {
                    return;
                }
                this.shapeDrawingManager.startDrawing(e);
                this.scheduleRenderQualityUpdate();
            } else if (this.drawingEngine.currentTool === 'pen' || this.drawingEngine.currentTool === 'eraser') {
                // Don't start drawing if interacting with teaching tools
                if (this.teachingToolsManager && this.teachingToolsManager.isInteracting) {
                    return;
                }
                this.drawingEngine.startDrawing(e);
                this.scheduleRenderQualityUpdate();
                // Show eraser cursor only when actually erasing on canvas
                if (this.drawingEngine.currentTool === 'eraser') {
                    this.showEraserCursor();
                }
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
            } else if (this.drawingEngine.currentTool === 'select' && this.selectionManager.isBoxSelecting) {
                this.selectionManager.continueBoxSelection(e);
            } else if (this.drawingEngine.currentTool === 'select' && this.selectionManager.isLassoSelecting) {
                this.selectionManager.continueLassoSelection(e);
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
                    // Use optimized batch drawing
                    this.drawingEngine.drawBatch(events);
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
            if (this.drawingEngine.currentTool === 'select' && this.selectionManager.isBoxSelecting) {
                this.selectionManager.endBoxSelection(e);
            }
            if (this.drawingEngine.currentTool === 'select' && this.selectionManager.isLassoSelecting) {
                this.selectionManager.endLassoSelection(e);
            }
            this.handleDrawingComplete();
            this.drawingEngine.stopPanning();
            this.scheduleRenderQualityUpdate();
            // Hide eraser cursor when erasing stops
            if (this.drawingEngine.currentTool === 'eraser') {
                this.hideEraserCursor();
            }
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
            this.scheduleRenderQualityUpdate();
            // Hide eraser cursor when pointer is cancelled
            if (this.drawingEngine.currentTool === 'eraser') {
                this.hideEraserCursor();
            }
        });
        
        // Double-click handler for coordinate origin selection in pan mode
        this.canvas.addEventListener('dblclick', (e) => {
            // In pan mode, double-click to select coordinate origin
            if (this.drawingEngine.currentTool === 'pan' && 
                this.backgroundManager.supportsMovableOrigin()) {
                const point = this.getLogicalCanvasPointFromEvent(e);
                const { x, y } = point;
                
                if (this.backgroundManager.isPointNearCoordinateOrigin(x, y)) {
                    this.isDraggingCoordinateOrigin = true;
                    this.coordinateOriginDragStart = { x: e.clientX, y: e.clientY };
                    // Visual feedback - change cursor
                    this.canvas.style.cursor = 'move';
                }
            }
        });
        
        this.canvas.addEventListener('mouseenter', (e) => {
            // Only show eraser cursor when actively erasing (mouse button down)
            if (this.drawingEngine.currentTool === 'eraser' && this.drawingEngine.isDrawing) {
                this.showEraserCursor();
            }
        });
        
        this.canvas.addEventListener('mouseleave', () => {
            // Hide eraser cursor when leaving canvas
            this.hideEraserCursor();
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
        document.getElementById('select-btn').addEventListener('click', () => this.setTool('select'));
        document.getElementById('eraser-btn').addEventListener('click', () => this.setTool('eraser'));
        document.getElementById('background-btn').addEventListener('click', () => this.setTool('background'));
        document.getElementById('clear-btn').addEventListener('click', () => this.confirmClear());
        document.getElementById('settings-btn').addEventListener('click', () => this.openSettings());
        document.getElementById('more-btn').addEventListener('click', () => this.setTool('more'));
        
        // Shape and Teaching Tools buttons in More menu
        document.getElementById('more-shape-btn').addEventListener('click', () => this.setTool('shape'));
        document.getElementById('more-teaching-tools-btn').addEventListener('click', () => {
            this.exitShapeMode();
            this.teachingToolsManager.showModal();
        });
        
        document.getElementById('config-close-btn').addEventListener('click', () => this.closeConfigPanel());
        document.getElementById('feature-close-btn').addEventListener('click', () => this.closeFeaturePanel());
        
        // History buttons
        document.getElementById('undo-btn').addEventListener('click', () => {
            if (this.historyManager.undo()) {
                // Clear stroke selection as strokes are no longer valid
                this.drawingEngine.clearStrokes();
                this.drawingEngine.stampedImages = [];
                this.drawingEngine.objectGroups = [];
                this.insertTextManager?.clearTextObjects?.();
                this.drawingEngine.clearVectorScene();
                this.drawingEngine.setVectorPreviewVisible(false);
                this.updateUI();
                this.saveSessionDebounced();
            }
        });
        
        document.getElementById('redo-btn').addEventListener('click', () => {
            if (this.historyManager.redo()) {
                // Clear stroke selection as strokes are no longer valid
                this.drawingEngine.clearStrokes();
                this.drawingEngine.stampedImages = [];
                this.drawingEngine.objectGroups = [];
                this.insertTextManager?.clearTextObjects?.();
                this.drawingEngine.clearVectorScene();
                this.drawingEngine.setVectorPreviewVisible(false);
                this.updateUI();
                this.saveSessionDebounced();
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
        document.getElementById('export-btn-top').addEventListener('click', async () => {
            try {
                const exportManager = await this.getExportManager();
                exportManager.showModal();
            } catch (error) {
                this.showLazyLoadError('导出', error);
            }
        });

        // Import Project Button
        document.getElementById('import-project-btn').addEventListener('click', async () => {
            // Create a hidden file input
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = '.aboard,.json';
            input.onchange = async (e) => {
                if (e.target.files.length > 0) {
                    try {
                        const projectManager = await this.getProjectManager();
                        projectManager.importProject(e.target.files[0]);
                    } catch (error) {
                        this.showLazyLoadError('项目导入', error);
                    }
                }
            };
            input.click();
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
        
        // Debounce resize handler for better performance
        let resizeTimeout;
        window.addEventListener('resize', () => {
            this.syncInteractiveOverlays();
            clearTimeout(resizeTimeout);
            resizeTimeout = setTimeout(() => {
                // Recalculate fit scale and re-center canvas for new viewport size
                this.recalculateAndRecenterCanvas();
                this.applyZoom(false); // Apply new fit scale without updating config-area
                // Update toolbar text visibility on resize
                this.settingsManager.updateToolbarTextVisibility();
                // Reposition config-area to stay properly positioned above toolbar
                this.positionConfigArea();
                // Reposition toolbars to ensure they stay within viewport
                this.repositionToolbarsOnResize();
                // Reposition modals to ensure they stay within viewport
                this.repositionModalsOnResize();
                this.positionCoordinatePointPanel();
                // Keep the adaptive default eraser size aligned with the current viewport.
                this.refreshAdaptiveEraserSize();
                this.syncInteractiveOverlays();
            }, 150); // 150ms debounce delay
        });
        
        // Ctrl+scroll to zoom canvas
        this.setupCanvasZoom();
    }
    
    setupToolConfigListeners() {
        return uiListenersRuntime.setupToolConfigListeners?.(this);
    }
    
    setupSettingsListeners() {
        return uiListenersRuntime.setupSettingsListeners?.(this);
    }

    setupModalInteractionLock() {
        const updateModalState = () => {
            const hasBlockingModal = !!document.querySelector('.modal.show:not(.non-blocking-modal), .time-fullscreen-modal.show, .timer-fullscreen-modal.show');
            document.body.classList.toggle('overlay-modal-open', hasBlockingModal);
        };
        const observer = new MutationObserver(updateModalState);
        observer.observe(document.body, { subtree: true, attributes: true, attributeFilter: ['class', 'style'] });
        updateModalState();
    }
    
    setupKeyboardShortcuts() {
        document.addEventListener('keydown', (e) => {
            const isEditableTarget = e.target &&
                (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.isContentEditable);
            if (e.ctrlKey || e.metaKey) {
                const key = e.key.toLowerCase();
                if (key === 'z' && !e.shiftKey) {
                    e.preventDefault();
                    if (this.historyManager.undo()) {
                        this.updateUI();
                    }
                } else if (key === 'y' || (key === 'z' && e.shiftKey)) {
                    e.preventDefault();
                    if (this.historyManager.redo()) {
                        this.updateUI();
                    }
                } else if (!isEditableTarget && key === 'c' && this.selectionManager?.hasSelection()) {
                    e.preventDefault();
                    // Copy to the internal selection clipboard (not the system clipboard).
                    this.selectionManager.cacheSelection();
                } else if (!isEditableTarget && key === 'v') {
                    e.preventDefault();
                    // Paste from the internal selection clipboard.
                    this.selectionManager?.pasteClipboard();
                } else if (!isEditableTarget && key === 'x' && this.selectionManager?.hasSelection()) {
                    e.preventDefault();
                    if (this.selectionManager.cacheSelection()) {
                        this.selectionManager.deleteSelection();
                    }
                }
            }
            
            if (!isEditableTarget && (e.key === 'Delete' || e.key === 'Backspace')) {
                if (this.selectionManager?.hasSelection()) {
                    e.preventDefault();
                    this.selectionManager.deleteSelection();
                }
            }
            
            // Zoom shortcuts
            if (!isEditableTarget && (e.key === '+' || e.key === '=')) {
                e.preventDefault();
                this.zoomIn();
            } else if (!isEditableTarget && (e.key === '-' || e.key === '_')) {
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
        return panelRuntime.repositionToolbarsOnResize?.(this);
    }
    applyRelativePanelPosition(panel, rect, windowWidth, windowHeight, edgeSpacing) {
        return panelRuntime.applyRelativePanelPosition?.(panel, rect, windowWidth, windowHeight, edgeSpacing) || false;
    }
    storePanelRelativePosition(panel) {
        return panelRuntime.storePanelRelativePosition?.(panel);
    }

    repositionModalsOnResize() {
        return modalRuntime.repositionModalsOnResize?.(this);
    }

    setupDraggablePanels() {
        return panelRuntime.setupDraggablePanels?.(this);
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

    clampFloatingPanelToViewport(panel, edgeSpacing = 12) {
        return layoutRuntime.clampFloatingPanelToViewport?.(panel, edgeSpacing);
    }
    positionConfigArea() {
        return layoutRuntime.positionConfigArea?.(this);
    }
    positionCoordinatePointPanel() {
        return layoutRuntime.positionCoordinatePointPanel?.();
    }
    positionFeatureArea() {
        return layoutRuntime.positionFeatureArea?.();
    }
    exitShapeMode() {
        if (this.drawingEngine.currentTool !== 'shape') return;
        this.shapeDrawingManager.stopDrawing();
        this.drawingEngine.setTool('more');
        this.updateUI();
    }
    
    setTool(tool, showConfig = true) {
        const configArea = document.getElementById('config-area');
        const featureArea = document.getElementById('feature-area');
        const previousTool = this.drawingEngine.currentTool;

        if (this.isCoordinateOriginDragMode && tool !== 'background') {
            this.disableCoordinateOriginDragMode({ keepCursor: true });
        }
        if (this.isCoordinatePointMode && tool !== 'background') {
            this.setCoordinatePointMode(false);
        }
        if (tool !== 'background') {
            this.toggleCoordinateSettingsPanel(false);
            this.toggleCoordinatePointPanel(false);
        }
        
        // Check if we're clicking the same tool button again (toggle behavior)
        const isSameTool = (previousTool === tool);
        const isConfigVisible = configArea.classList.contains('show');
        
        // Deactivate selection mode if switching away from select tool
        if (previousTool === 'select' && tool !== 'select') {
            this.selectionManager.deactivate();
        }
        
        // Update drawing engine tool
        this.drawingEngine.setTool(tool);
        // Don't show eraser cursor when selecting tool - only show when actually erasing on canvas
        if (tool !== 'eraser') {
            this.hideEraserCursor();
        }
        
        // Activate selection mode if switching to select tool
        if (tool === 'select') {
            this.selectionManager.activate();
            // Link text manager if available
            if (this.insertTextManager) {
                this.selectionManager.setTextManager(this.insertTextManager);
            }
        }
        
        this.updateUI();
        
        // Handle toggle behavior for tools with config panels
        const toolsWithConfig = ['pen', 'eraser', 'background', 'shape', 'select'];
        
        if (showConfig && toolsWithConfig.includes(tool)) {
            // If clicking the same tool and config is visible, toggle it off
            if (isSameTool && isConfigVisible) {
                configArea.classList.remove('show');
                if (tool === 'background') {
                    this.toggleCoordinateSettingsPanel(false);
                    this.toggleCoordinatePointPanel(false);
                }
            } else {
                // Show config panel and position it above toolbar
                configArea.classList.add('show');
                this.positionConfigArea();
                this.bringElementToFront(configArea);
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
                this.bringElementToFront(featureArea);
            }
        } else {
            // For other tools (like pan, select), just hide panels
            configArea.classList.remove('show');
            featureArea.classList.remove('show');
        }
    }

    showCoordinateToast(i18nKey, fallback, type = 'info') {
        const message = window.i18n ? window.i18n.t(i18nKey) : fallback;
        this.settingsManager?.toastManager?.show(message === i18nKey ? fallback : message, type);
    }

    getLogicalCanvasPointFromEvent(e) {
        if (this.drawingEngine?.getPosition) {
            return this.drawingEngine.getPosition(e);
        }

        const rect = this.canvas.getBoundingClientRect();
        const scaleX = rect.width ? this.canvas.offsetWidth / rect.width : 1;
        const scaleY = rect.height ? this.canvas.offsetHeight / rect.height : 1;
        return {
            x: Math.max(0, Math.min((e.clientX - rect.left) * scaleX, this.canvas.offsetWidth || rect.width || 0)),
            y: Math.max(0, Math.min((e.clientY - rect.top) * scaleY, this.canvas.offsetHeight || rect.height || 0))
        };
    }

    resetSelectedCoordinateLineConnection(options = {}) {
        const { clearSelection = false } = options;
        this.pendingCoordinateLineStartId = null;

        if (clearSelection && this.selectionManager?.isCoordinateSelection?.()) {
            this.selectionManager.clearSelection();
        }
    }

    handleSelectedCoordinateLinePointClick(pointId) {
        if (!pointId || !this.backgroundManager) return false;

        const startPointId = this.pendingCoordinateLineStartId;
        if (!startPointId || startPointId === pointId) {
            this.pendingCoordinateLineStartId = pointId;
            this.showCoordinateToast(
                'background.coordinateStatusSelectLineStartPoint',
                '已选中第一个点，再点一个点即可连线'
            );
            return true;
        }

        const existingGroup = this.backgroundManager.findCoordinateGroupByPointIds?.([startPointId, pointId], { line: true });
        if (existingGroup) {
            this.resetSelectedCoordinateLineConnection();
            this.showCoordinateToast(
                'background.coordinateLineExists',
                '这两个点之间已经有线段了'
            );
            return true;
        }

        const group = this.backgroundManager.createCoordinateGroup([startPointId, pointId], { line: true });
        this.resetSelectedCoordinateLineConnection();
        if (!group) {
            return false;
        }

        this.savePageBackground(this.currentPage);
        this.updateBackgroundUI();
        this.showCoordinateToast('background.coordinateLineCreated', '线段已连接', 'success');
        return true;
    }

    escapeHtml(value) {
        return String(value)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    getCoordinateExpressionPrefix(pattern = this.backgroundManager?.backgroundPattern) {
        return pattern === 'polar' ? 'r = ' : 'y = ';
    }

    syncCoordinateExpressionDisplay() {
        const display = document.getElementById('coordinate-keypad-expression-display');
        const input = document.getElementById('coordinate-expression-input');
        if (!display) return;
        const prefix = this.getCoordinateExpressionPrefix();
        const expression = input?.value || '';
        display.textContent = `${prefix}${expression}`;
    }

    getCoordinatePlotAxisOptions(coordinateType = this.backgroundManager?.backgroundPattern) {
        if (coordinateType === 'polar') {
            return [
                { value: 'theta', label: 'θ（弧度）' },
                { value: 'r', label: 'r' }
            ];
        }

        return [
            { value: 'x', label: 'x' },
            { value: 'y', label: 'y' }
        ];
    }

    createCoordinatePlotRangeRowMarkup(segment = {}, coordinateType = this.backgroundManager?.backgroundPattern) {
        const axisOptions = this.getCoordinatePlotAxisOptions(coordinateType)
            .map(option => `<option value="${option.value}"${option.value === (segment.axis || this.getCoordinatePlotAxisOptions(coordinateType)[0].value) ? ' selected' : ''}>${this.escapeHtml(option.label)}</option>`)
            .join('');
        const minValue = segment.min ?? '';
        const maxValue = segment.max ?? '';
        const segmentId = segment.id || `segment-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;

        return `
            <div class="coordinate-plot-range-row" data-range-row data-segment-id="${this.escapeHtml(segmentId)}">
                <select data-range-field="axis">${axisOptions}</select>
                <input type="number" step="0.1" data-range-field="min" value="${this.escapeHtml(minValue)}" placeholder="最小值">
                <input type="number" step="0.1" data-range-field="max" value="${this.escapeHtml(maxValue)}" placeholder="最大值">
                <button type="button" class="coordinate-plot-range-remove" data-plot-range-remove="${this.escapeHtml(segmentId)}" title="删除范围段">✕</button>
            </div>
        `;
    }

    handleCoordinatePlotListClick(e) {
        const actionButton = e.target.closest('[data-plot-toggle-edit], [data-plot-save], [data-plot-cancel], [data-plot-remove], [data-plot-add-segment], [data-plot-range-remove]');
        if (!actionButton) return;

        if (actionButton.dataset.plotToggleEdit) {
            const plotId = actionButton.dataset.plotToggleEdit;
            this.expandedCoordinatePlotId = this.expandedCoordinatePlotId === plotId ? null : plotId;
            this.updateBackgroundUI();
            return;
        }

        if (actionButton.dataset.plotCancel) {
            this.expandedCoordinatePlotId = null;
            this.updateBackgroundUI();
            return;
        }

        if (actionButton.dataset.plotRemove) {
            const plotId = actionButton.dataset.plotRemove;
            if (this.expandedCoordinatePlotId === plotId) {
                this.expandedCoordinatePlotId = null;
            }
            this.backgroundManager.removeCoordinatePlot(plotId);
            this.savePageBackground(this.currentPage);
            this.updateBackgroundUI();
            return;
        }

        if (actionButton.dataset.plotSave) {
            this.saveCoordinatePlotEditor(actionButton.dataset.plotSave);
            return;
        }

        if (actionButton.dataset.plotAddSegment) {
            this.addCoordinatePlotRangeRow(actionButton.dataset.plotAddSegment);
            return;
        }

        if (actionButton.dataset.plotRangeRemove) {
            const row = actionButton.closest('[data-range-row]');
            row?.remove();
            const editor = actionButton.closest('.coordinate-plot-editor');
            const rangeList = editor?.querySelector('.coordinate-plot-range-list');
            if (rangeList && !rangeList.querySelector('[data-range-row]')) {
                rangeList.innerHTML = '<div class="coordinate-plot-range-empty">未限制显示范围，默认显示全部</div>';
            }
        }
    }

    addCoordinatePlotRangeRow(plotId) {
        const plotItem = document.querySelector(`.coordinate-plot-item[data-plot-id="${plotId}"]`);
        const rangeList = plotItem?.querySelector('.coordinate-plot-range-list');
        if (!rangeList) return;

        const coordinateType = plotItem.dataset.coordinateType || this.backgroundManager.backgroundPattern;
        const emptyState = rangeList.querySelector('.coordinate-plot-range-empty');
        if (emptyState) {
            emptyState.remove();
        }
        rangeList.insertAdjacentHTML('beforeend', this.createCoordinatePlotRangeRowMarkup({}, coordinateType));
    }

    collectCoordinatePlotEditorSegments(plotId) {
        const plotItem = document.querySelector(`.coordinate-plot-item[data-plot-id="${plotId}"]`);
        if (!plotItem) return [];

        return Array.from(plotItem.querySelectorAll('[data-range-row]')).map(row => ({
            id: row.dataset.segmentId,
            axis: row.querySelector('[data-range-field="axis"]')?.value,
            min: row.querySelector('[data-range-field="min"]')?.value?.trim() ?? '',
            max: row.querySelector('[data-range-field="max"]')?.value?.trim() ?? ''
        }));
    }

    saveCoordinatePlotEditor(plotId) {
        const plotItem = document.querySelector(`.coordinate-plot-item[data-plot-id="${plotId}"]`);
        if (!plotItem) return;

        const expression = plotItem.querySelector('[data-plot-field="expression"]')?.value?.trim() || '';
        const color = plotItem.querySelector('[data-plot-field="color"]')?.value || '#2563eb';
        const strokeWidth = plotItem.querySelector('[data-plot-field="strokeWidth"]')?.value || '2.5';
        const dashStyle = plotItem.querySelector('[data-plot-field="dashStyle"]')?.value || 'solid';
        const segments = this.collectCoordinatePlotEditorSegments(plotId);

        try {
            this.backgroundManager.updateCoordinatePlot(plotId, {
                expression,
                color,
                strokeWidth,
                dashStyle,
                segments
            });
            this.expandedCoordinatePlotId = null;
            this.savePageBackground(this.currentPage);
            this.updateBackgroundUI();
            this.showCoordinateToast('background.plotUpdated', '函数图像已更新', 'success');
        } catch (error) {
            console.error('Failed to update coordinate plot:', error);
            this.showCoordinateToast('background.plotError', '表达式无效，无法绘制', 'error');
        }
    }

    toggleCoordinateSettingsPanel(force) {
        return coordinatePanelRuntime.toggleCoordinateSettingsPanel?.(this, force);
    }
    toggleCoordinatePointPanel(force) {
        return coordinatePanelRuntime.toggleCoordinatePointPanel?.(this, force);
    }
    toggleCoordinateInputPanel(force) {
        return coordinatePanelRuntime.toggleCoordinateInputPanel?.(this, force);
    }
    syncCoordinateInputPanelButtons() {
        return coordinatePanelRuntime.syncCoordinateInputPanelButtons?.(this);
    }
    insertCoordinateExpressionAtCursor(value) {
        return coordinatePanelRuntime.insertCoordinateExpressionAtCursor?.(this, value);
    }
    handleCoordinateExpressionAction(action) {
        return coordinatePanelRuntime.handleCoordinateExpressionAction?.(this, action);
    }
    getCoordinatePointLineMode() {
        return this.backgroundManager?.getCoordinatePointLineMode?.() || 'auto';
    }

    getCoordinatePointLineModeMeta(mode = this.getCoordinatePointLineMode()) {
        const normalizedMode = ['line', 'auto', 'selected'].includes(mode) ? mode : 'auto';
        const modeConfig = {
            line: {
                hintKey: 'background.addPointHintLineOnly',
                hintFallback: '开启后点击画布依次添加坐标点，仅绘制折线',
                statusOnKey: 'background.coordinateStatusAddPointLineOnly',
                statusOnFallback: '仅绘制线模式已开启，点击画布依次添加坐标点',
                statusOffKey: 'background.coordinateStatusAddPointOff',
                statusOffFallback: '绘制点线模式已关闭'
            },
            auto: {
                hintKey: 'background.addPointHintAuto',
                hintFallback: '开启后点击画布依次添加坐标点并自动连线',
                statusOnKey: 'background.coordinateStatusAddPointAuto',
                statusOnFallback: '自动连线模式已开启，点击画布依次添加坐标点',
                statusOffKey: 'background.coordinateStatusAddPointOff',
                statusOffFallback: '绘制点线模式已关闭'
            },
            selected: {
                hintKey: 'background.addPointHintSelectedInteractive',
                hintFallback: '开启后点击空白处添加坐标点；依次点击两个点即可连接线段',
                statusOnKey: 'background.coordinateStatusAddPointSelectedInteractive',
                statusOnFallback: '选择连线模式已开启，点击空白处添加点，点击两个点可连线',
                statusOffKey: 'background.coordinateStatusAddPointOff',
                statusOffFallback: '绘制点线模式已关闭'
            }
        };
        return modeConfig[normalizedMode];
    }

    showCoordinatePointModeStatus(enabled) {
        const modeMeta = this.getCoordinatePointLineModeMeta();
        if (enabled) {
            this.showCoordinateToast(modeMeta.statusOnKey, modeMeta.statusOnFallback);
        } else {
            this.showCoordinateToast(modeMeta.statusOffKey, modeMeta.statusOffFallback);
        }
    }

    syncCoordinatePointModeSectionVisibility(forceVisible) {
        const section = document.getElementById('coordinate-point-mode-section');
        if (!section) return;

        const isVisible = typeof forceVisible === 'boolean'
            ? forceVisible
            : !!this.isCoordinatePointMode && this.backgroundManager.supportsMovableOrigin(this.backgroundManager.backgroundPattern);
        section.hidden = !isVisible;
    }

    setCoordinatePointLineMode(mode, options = {}) {
        const normalizedMode = ['line', 'auto', 'selected'].includes(mode) ? mode : 'auto';
        const currentMode = this.getCoordinatePointLineMode();
        if (currentMode === normalizedMode) {
            return false;
        }

        this.resetSelectedCoordinateLineConnection();
        this.backgroundManager.updateCoordinateOverlayOptions({
            pointLineMode: normalizedMode
        });
        this.savePageBackground(this.currentPage);
        this.updateBackgroundUI();

        if (!options.silent) {
            const modeMeta = this.getCoordinatePointLineModeMeta(normalizedMode);
            this.showCoordinateToast(modeMeta.statusOnKey, modeMeta.statusOnFallback, 'success');
        }
        return true;
    }

    setCoordinatePointMode(enabled) {
        this.isCoordinatePointMode = !!enabled && this.backgroundManager.supportsMovableOrigin();
        if (!this.isCoordinatePointMode) {
            this.resetSelectedCoordinateLineConnection();
        }

        const addPointBtn = document.getElementById('coordinate-add-point-btn');
        if (addPointBtn) {
            addPointBtn.classList.toggle('active', this.isCoordinatePointMode);
        }

        const pointToggleBtn = document.getElementById('coordinate-point-toggle-btn');
        if (pointToggleBtn) {
            pointToggleBtn.classList.toggle('active', this.isCoordinatePointPanelVisible || this.isCoordinatePointMode);
        }

        this.syncCoordinatePointModeSectionVisibility();

        if (this.isCoordinatePointMode) {
            if (this.drawingEngine.currentTool !== 'background') {
                this.setTool('background');
            }
            this.disableCoordinateOriginDragMode({ keepCursor: true });
            this.canvas.style.cursor = 'copy';
        } else if (!this.isCoordinateOriginDragMode) {
            switch (this.drawingEngine.currentTool) {
                case 'pan':
                    this.canvas.style.cursor = 'grab';
                    break;
                case 'background':
                case 'more':
                    this.canvas.style.cursor = 'default';
                    break;
                case 'eraser':
                    this.canvas.style.cursor = 'pointer';
                    break;
                default:
                    this.canvas.style.cursor = 'crosshair';
                    break;
            }
        }
    }

    disableCoordinateOriginDragMode(options = {}) {
        const { keepCursor = false } = options;
        const moveOriginBtn = document.getElementById('move-origin-btn');

        if (moveOriginBtn) {
            moveOriginBtn.classList.remove('active');
        }

        this.isCoordinateOriginDragMode = false;
        this.isDraggingCoordinateOrigin = false;

        if (keepCursor) {
            return;
        }

        switch (this.drawingEngine.currentTool) {
            case 'pan':
                this.canvas.style.cursor = 'grab';
                break;
            case 'background':
            case 'more':
                this.canvas.style.cursor = 'default';
                break;
            case 'eraser':
                this.canvas.style.cursor = 'pointer';
                break;
            default:
                this.canvas.style.cursor = 'crosshair';
                break;
        }
    }
    
    handleDrawingComplete() {
        // Handle shape drawing completion
        if (this.drawingEngine.currentTool === 'shape') {
            this.shapeDrawingManager.stopDrawing();
            this.syncVectorPreviewState(true);
            this.scheduleRenderQualityUpdate();
            return;
        }
        
        if (this.drawingEngine.stopDrawing()) {
            this.historyManager.saveState();
            this.saveSessionDebounced();
            this.syncVectorPreviewState(true);
            this.scheduleRenderQualityUpdate();
            // Keep eraser config open after each erase stroke so users can continuously
            // fine-tune and erase without repeated reopen operations.
            if (this.drawingEngine.currentTool !== 'eraser') {
                this.closeConfigPanel();
            }
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
        return overlayUiRuntime.closeConfigPanel?.(this);
    }
    closeFeaturePanel() {
        return overlayUiRuntime.closeFeaturePanel?.();
    }
    bringElementToFront(element) {
        return layoutRuntime.bringElementToFront?.(this, element);
    }
    bringLatestElement(selector) {
        return layoutRuntime.bringLatestElement?.(this, selector);
    }
    handleMoreFeaturePanelAfterAction() {
        return overlayUiRuntime.handleMoreFeaturePanelAfterAction?.(this);
    }
    openSettings() {
        return overlayUiRuntime.openSettings?.(this);
    }
    closeSettings() {
        return overlayUiRuntime.closeSettings?.();
    }    showConfigDiffModal(diff, newSettings) {
        return configImportRuntime.showConfigDiffModal?.(this, diff, newSettings);
    }
    
    confirmClear() {
        document.getElementById('confirm-modal').classList.add('show');
    }
    
    clearCanvas(saveToHistory = true) {
        this.drawingEngine.clearCanvas();
        if (saveToHistory) {
            this.historyManager.saveState();
        }
        this.saveSessionDebounced();
    }
    
    updateUI() {
        const configArea = document.getElementById('config-area');

        document.querySelectorAll('.tool-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        
        document.querySelectorAll('.config-panel').forEach(panel => {
            panel.classList.remove('active');
        });
        
        const tool = this.drawingEngine.currentTool;
        const shapeFeatureBtn = document.getElementById('more-shape-btn');
        if (shapeFeatureBtn) {
            shapeFeatureBtn.classList.toggle('active', tool === 'shape');
        }
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
        } else if (tool === 'select') {
            document.getElementById('select-btn').classList.add('active');
            document.getElementById('select-config').classList.add('active');
            this.canvas.style.cursor = 'crosshair';
        } else if (tool === 'eraser') {
            document.getElementById('eraser-btn').classList.add('active');
            document.getElementById('eraser-config').classList.add('active');
            this.canvas.style.cursor = 'pointer';
            const currentShape = this.drawingEngine.eraserShape === 'rectangle' ? 'rectangle' : 'circle';
            document.querySelectorAll('.eraser-shape-btn').forEach((btn) => {
                btn.classList.toggle('active', btn.dataset.eraserShape === currentShape);
            });
            this.syncEraserSizeControls();
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

        if (configArea && !configArea.querySelector('.config-panel.active')) {
            configArea.classList.remove('show');
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

    getRenderPixelRatio() {
        const baseDpr = window.devicePixelRatio || 1;
        return baseDpr * this.dynamicRenderScale;
    }

    getTargetRenderScale() {
        if (!this.settingsManager.unlimitedZoom) {
            return MIN_DYNAMIC_RENDER_SCALE;
        }
        const isInteractiveHighZoom = !!(
            this.drawingEngine?.isDrawing ||
            this.drawingEngine?.isPanning ||
            this.isPinching ||
            this.hasTwoFingers ||
            this.shapeDrawingManager?.isDrawing
        );
        const scale = this.drawingEngine?.canvasScale || 1;
        const preferredScale = Math.min(
            isInteractiveHighZoom ? INTERACTION_DYNAMIC_RENDER_SCALE_CAP : MAX_DYNAMIC_RENDER_SCALE,
            Math.max(MIN_DYNAMIC_RENDER_SCALE, Math.sqrt(scale))
        );

        const cssWidth = parseFloat(this.canvas.style.width) || this.settingsManager.canvasWidth;
        const cssHeight = parseFloat(this.canvas.style.height) || this.settingsManager.canvasHeight;
        const baseDpr = window.devicePixelRatio || 1;

        // Calculate max safe dynamic scale from backing-dimension and backing-pixel ceilings.
        const dimLimitScale = Math.min(
            MAX_DYNAMIC_BACKING_DIMENSION / Math.max(1, cssWidth * baseDpr),
            MAX_DYNAMIC_BACKING_DIMENSION / Math.max(1, cssHeight * baseDpr)
        );
        const pixelLimitScale = Math.sqrt(
            MAX_DYNAMIC_BACKING_PIXELS / Math.max(1, cssWidth * cssHeight * baseDpr * baseDpr)
        );
        const safeScale = Math.min(preferredScale, dimLimitScale, pixelLimitScale);
        if (!Number.isFinite(safeScale)) {
            return MIN_DYNAMIC_RENDER_SCALE;
        }
        return Math.max(MIN_DYNAMIC_RENDER_SCALE, safeScale);
    }

    scheduleRenderQualityUpdate() {
        const targetScale = this.getTargetRenderScale();
        if (Math.abs(targetScale - this.dynamicRenderScale) < RENDER_SCALE_SCHEDULE_THRESHOLD) return;
        if (this.qualityUpdateTimer) {
            clearTimeout(this.qualityUpdateTimer);
        }
        this.qualityUpdateTimer = setTimeout(() => {
            this.applyRenderQualityScale(targetScale);
        }, QUALITY_UPDATE_DEBOUNCE_MS);
    }

    applyRenderQualityScale(scale) {
        if (Math.abs(scale - this.dynamicRenderScale) < RENDER_SCALE_APPLY_THRESHOLD) return;

        const width = parseFloat(this.canvas.style.width) || this.settingsManager.canvasWidth;
        const height = parseFloat(this.canvas.style.height) || this.settingsManager.canvasHeight;

        this.dynamicRenderScale = scale;
        const dpr = this.getRenderPixelRatio();

        this.canvas.width = width * dpr;
        this.canvas.height = height * dpr;
        this.canvas.style.width = width + 'px';
        this.canvas.style.height = height + 'px';

        this.bgCanvas.width = width * dpr;
        this.bgCanvas.height = height * dpr;
        this.bgCanvas.style.width = width + 'px';
        this.bgCanvas.style.height = height + 'px';

        this.ctx.setTransform(1, 0, 0, 1, 0, 0);
        this.bgCtx.setTransform(1, 0, 0, 1, 0, 0);
        this.ctx.imageSmoothingEnabled = true;
        this.ctx.imageSmoothingQuality = 'high';
        this.ctx.scale(dpr, dpr);
        this.bgCtx.scale(dpr, dpr);

        this.ctx.clearRect(0, 0, width, height);
        this.bgCtx.clearRect(0, 0, width, height);
        this.backgroundManager.drawBackground();
        this.drawingEngine.renderScene(this.insertTextManager || null);
    }
    
    applyCanvasSize() {
        // Always use pagination mode now
        const width = this.settingsManager.canvasWidth;
        const height = this.settingsManager.canvasHeight;
        const dpr = this.getRenderPixelRatio();
        
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
        const newScale = Math.min(currentScale + 0.1, this.MAX_CANVAS_SCALE);
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
        percent = Math.max(50, Math.min(this.MAX_CANVAS_SCALE * 100, percent));
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

        this.scheduleRenderQualityUpdate();
        
        // Update teaching tools scale factor
        this.teachingToolsManager.canvasScaleFactor = finalScale;
        this.teachingToolsManager.redrawTools();

        // Update config-area scale proportionally only when requested (on resize, not on refresh)
        if (updateConfigScale) {
            this.updateConfigAreaScale();
        }

        this.syncInteractiveOverlays();
    }

    revealToolbar() {
        const toolbar = document.getElementById('toolbar');
        if (!toolbar) return;
        // Reveal toolbar after sizing is applied to avoid a flash of unstyled content.
        requestAnimationFrame(() => {
            toolbar.classList.remove('toolbar-loading');
        });
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
    
    updateMaxCanvasScale() {
        if (this.settingsManager.unlimitedZoom) {
            this.MAX_CANVAS_SCALE = this.UNLIMITED_MAX_SCALE;
        } else {
            this.MAX_CANVAS_SCALE = this.NORMAL_MAX_SCALE;
            this.applyRenderQualityScale(1);
            // If current scale exceeds new max, reset to max
            if (this.drawingEngine.canvasScale > this.MAX_CANVAS_SCALE) {
                this.drawingEngine.canvasScale = this.MAX_CANVAS_SCALE;
                this.updateZoomUI();
                this.applyZoom(false);
                localStorage.setItem('canvasScale', this.drawingEngine.canvasScale);
            }
        }
    }

    updateZoomUI() {
        const percent = Math.round(this.drawingEngine.canvasScale * 100);
        document.getElementById('zoom-input').value = percent + '%';
    }
    
    updateZoomControlsVisibility() {
        const zoomOutBtn = document.getElementById('zoom-out-btn');
        const zoomInput = document.getElementById('zoom-input');
        const zoomInBtn = document.getElementById('zoom-in-btn');

        const display = this.settingsManager.showZoomControls ? 'flex' : 'none';
        const inputDisplay = this.settingsManager.showZoomControls ? 'block' : 'none';

        if (zoomOutBtn) zoomOutBtn.style.display = display;
        if (zoomInput) zoomInput.style.display = inputDisplay;
        if (zoomInBtn) zoomInBtn.style.display = display;

        this.updateHistoryControlsContainerVisibility();
    }

    updateImportExportBtnVisibility() {
        const importBtn = document.getElementById('import-project-btn');
        const exportBtn = document.getElementById('export-btn-top');

        const display = this.settingsManager.showImportExportBtn ? 'flex' : 'none';

        if (importBtn) importBtn.style.display = display;
        if (exportBtn) exportBtn.style.display = display;

        this.updateHistoryControlsContainerVisibility();
    }
    
    updateFullscreenBtnVisibility() {
        const fullscreenBtn = document.getElementById('fullscreen-btn');
        if (this.settingsManager.showFullscreenBtn) {
            fullscreenBtn.style.display = 'flex';
        } else {
            fullscreenBtn.style.display = 'none';
        }

        this.updateHistoryControlsContainerVisibility();
    }

    updateHistoryControlsContainerVisibility() {
        const historyControls = document.getElementById('history-controls');
        if (!historyControls) return;

        // Check if any child is visible
        const hasVisibleChild = Array.from(historyControls.children).some(child => {
            return window.getComputedStyle(child).display !== 'none';
        });

        if (hasVisibleChild) {
            historyControls.style.display = 'flex';
        } else {
            historyControls.style.display = 'none';
        }
    }

    initFontManagement() {
        const resetDefaultsBtn = document.getElementById('font-reset-defaults-btn');
        resetDefaultsBtn?.addEventListener('click', () => {
            const confirmed = window.confirm('恢复默认状态会删除已上传字体，并重置字体顺序、名称和预览设置。是否继续？');
            if (!confirmed) return;
            this.settingsManager.resetFontManagementToDefaults();
            this.openFontPreviewPanels.clear();
            this.editingFontAliasFont = null;
            this.activeFontPreviewFont = null;
            this.insertTextManager?.populateFonts?.();
            this.renderFontManagementList();
            this.closeFontPreviewModal();
        });

        this.initFontPreviewModal();
        this.renderFontManagementList();
    }    getTextWithFallback(key, fallback) {
        return fontManagementRuntime.getTextWithFallback?.(this, key, fallback);
    }

    getFontPreviewSettings() {
        return fontManagementRuntime.getFontPreviewSettings?.(this);
    }

    updateSharedFontPreviewSettings(partialSettings = {}) {
        return fontManagementRuntime.updateSharedFontPreviewSettings?.(this, partialSettings);
    }

    resetSharedFontPreviewSettings(options = {}) {
        return fontManagementRuntime.resetSharedFontPreviewSettings?.(this, options);
    }

    buildFontPreviewPanel(font) {
        return fontManagementRuntime.buildFontPreviewPanel?.(this, font);
    }

    syncFontPreviewDisplays() {
        return fontManagementRuntime.syncFontPreviewDisplays?.(this);
    }

    initFontPreviewModal() {
        return fontManagementRuntime.initFontPreviewModal?.(this);
    }

    openFontPreviewModal(fontValue) {
        return fontManagementRuntime.openFontPreviewModal?.(this, fontValue);
    }

    closeFontPreviewModal() {
        return fontManagementRuntime.closeFontPreviewModal?.(this);
    }

    syncFontPreviewModal() {
        return fontManagementRuntime.syncFontPreviewModal?.(this);
    }

    renderFontManagementList() {
        return fontManagementRuntime.renderFontManagementList?.(this);
    }

    saveFontOrderFromList() {
        return fontManagementRuntime.saveFontOrderFromList?.(this);
    }

    // Initialize toolbar customization    initToolbarCustomization() {
        return customizationRuntime.initToolbarCustomization?.(this);
    }    reorderToolbarItems(container, order) {
        return customizationRuntime.reorderToolbarItems?.(this, container, order);
    }    saveToolbarOrder() {
        return customizationRuntime.saveToolbarOrder?.(this);
    }    saveToolbarVisibility() {
        return customizationRuntime.saveToolbarVisibility?.(this);
    }
    
    // Tool to button ID mapping (shared constant)    getToolToButtonIdMap() {
        return customizationRuntime.getToolToButtonIdMap?.(this);
    }    applyToolbarOrder() {
        return customizationRuntime.applyToolbarOrder?.(this);
    }    applyToolbarVisibility(visibility) {
        return customizationRuntime.applyToolbarVisibility?.(this, visibility);
    }
    
    // Initialize control button settings    initControlButtonSettings() {
        return customizationRuntime.initControlButtonSettings?.(this);
    }
    
    // Initialize drag-and-drop for control button reordering    initControlButtonDragDrop() {
        return customizationRuntime.initControlButtonDragDrop?.(this);
    }
    
    // Save control button order to localStorage    saveControlButtonOrder() {
        return customizationRuntime.saveControlButtonOrder?.(this);
    }
    
    // Reorder the settings list based on saved order    reorderControlButtonList(order) {
        return customizationRuntime.reorderControlButtonList?.(this, order);
    }
    
    // Reorder actual control buttons in the UI based on order    reorderControlButtons(order) {
        return customizationRuntime.reorderControlButtons?.(this, order);
    }    applyControlButtonVisibility(settings) {
        return customizationRuntime.applyControlButtonVisibility?.(this, settings);
    }    toggleFullscreen() {
        return displayRuntime.toggleFullscreen?.(this);
    }    getFullscreenButtonTitle(isExitState) {
        return displayRuntime.getFullscreenButtonTitle?.(this, isExitState);
    }    updatePatternGrid() {
        return displayRuntime.updatePatternGrid?.(this);
    }    handleFullscreenChange() {
        return displayRuntime.handleFullscreenChange?.(this);
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
                    newScale = Math.min(oldScale + 0.1, this.MAX_CANVAS_SCALE);
                } else {
                    newScale = Math.max(oldScale - 0.1, this.MIN_CANVAS_SCALE);
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
    }    hideHistoryControls() {
        return displayRuntime.hideHistoryControls?.(this);
    }
    
    // Pagination methods    addPage() {
        return paginationRuntime.addPage?.(this);
    }    prevPage() {
        return paginationRuntime.prevPage?.(this);
    }    nextPage() {
        return paginationRuntime.nextPage?.(this);
    }    nextOrAddPage() {
        return paginationRuntime.nextOrAddPage?.(this);
    }    goToPage(pageNumber) {
        return paginationRuntime.goToPage?.(this, pageNumber);
    }    loadPage(pageNumber) {
        return paginationRuntime.loadPage?.(this, pageNumber);
    }    savePageBackground(pageNumber) {
        return paginationRuntime.savePageBackground?.(this, pageNumber);
    }    restorePageBackground(pageNumber) {
        return paginationRuntime.restorePageBackground?.(this, pageNumber);
    }    renderCoordinatePlotList(currentPattern) {
        return backgroundUiRuntime.renderCoordinatePlotList?.(this, currentPattern);
    }    updateBackgroundUI() {
        return backgroundUiRuntime.updateBackgroundUI?.(this);
    }    updatePaginationUI() {
        return paginationRuntime.updatePaginationUI?.(this);
    }    updateEraserCursor(e) {
        return interactionRuntime.updateEraserCursor?.(this, e);
    }    updateEraserCursorShape() {
        return interactionRuntime.updateEraserCursorShape?.(this);
    }    showEraserCursor() {
        return interactionRuntime.showEraserCursor?.(this);
    }    hideEraserCursor() {
        return interactionRuntime.hideEraserCursor?.(this);
    }
    
    // Pinch zoom and pan gesture handlers    handlePinchStart(e) {
        return interactionRuntime.handlePinchStart?.(this, e);
    }    handlePinchMove(e) {
        return interactionRuntime.handlePinchMove?.(this, e);
    }    handlePinchEnd() {
        return interactionRuntime.handlePinchEnd?.(this);
    }    getPinchDistance(touch1, touch2) {
        return interactionRuntime.getPinchDistance?.(this, touch1, touch2);
    }    getPinchCenter(touch1, touch2) {
        return interactionRuntime.getPinchCenter?.(this, touch1, touch2);
    }
    
    // Pointer Events-based pinch gesture handlers
    // These work with stylus/pen + finger combinations and pure touch inputs    handlePointerPinchStart() {
        return interactionRuntime.handlePointerPinchStart?.(this);
    }    handlePointerPinchMove() {
        return interactionRuntime.handlePointerPinchMove?.(this);
    }    handlePointerPinchEnd() {
        return interactionRuntime.handlePointerPinchEnd?.(this);
    }    getPointerDistance(p1, p2) {
        return interactionRuntime.getPointerDistance?.(this, p1, p2);
    }    getPointerCenter(p1, p2) {
        return interactionRuntime.getPointerCenter?.(this, p1, p2);
    }    applyPanTransform() {
        return interactionRuntime.applyPanTransform?.(this);
    }    syncInteractiveOverlays() {
        return interactionRuntime.syncInteractiveOverlays?.(this);
    }    shouldShowLiveStrokePreview() {
        return interactionRuntime.shouldShowLiveStrokePreview?.(this);
    }    shouldShowLiveEraserPreview() {
        return interactionRuntime.shouldShowLiveEraserPreview?.(this);
    }    hasVectorPreviewContent() {
        return interactionRuntime.hasVectorPreviewContent?.(this);
    }    shouldUseVectorPreview() {
        return interactionRuntime.shouldUseVectorPreview?.(this);
    }    syncVectorPreviewState(forceRender = false) {
        return interactionRuntime.syncVectorPreviewState?.(this, forceRender);
    }    loadUploadedImages() {
        return uploadedImagesRuntime.loadUploadedImages?.(this);
    }    saveUploadedImage(imageData) {
        return uploadedImagesRuntime.saveUploadedImage?.(this, imageData);
    }    updateUploadedImagesButtons() {
        return uploadedImagesRuntime.updateUploadedImagesButtons?.(this);
    }
    
    dragCoordinateOrigin(e) {
        if (!this.isDraggingCoordinateOrigin) return;
        
        const viewportScale = this.drawingEngine?.getViewportScale?.() || 1;
        const deltaX = (e.clientX - this.coordinateOriginDragStart.x) / viewportScale;
        const deltaY = (e.clientY - this.coordinateOriginDragStart.y) / viewportScale;
        
        const origin = this.backgroundManager.getCoordinateOrigin();
        this.backgroundManager.setCoordinateOrigin(origin.x + deltaX, origin.y + deltaY);
        
        this.coordinateOriginDragStart = { x: e.clientX, y: e.clientY };
    }
    
    stopDraggingCoordinateOrigin() {
        if (this.isDraggingCoordinateOrigin) {
            this.isDraggingCoordinateOrigin = false;
            this.savePageBackground(this.currentPage);
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
    
    // Save session data to IndexedDB via StorageManager
    async saveSession() {
        if (this.isClearingLocalData) return;
        try {
            // Save current page to pages array first
            if (this.currentPage > 0 && this.currentPage <= this.pages.length) {
                this.pages[this.currentPage - 1] = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
            }
            
            // Save background settings for current page to ensure they are up to date
            this.savePageBackground(this.currentPage);

            // Convert all pages to Blobs
            const pagesBlobs = await Promise.all(this.pages.map(page => StorageManager.imageDataToBlob(page)));

            // Collect settings
            const settings = {
                currentTool: this.drawingEngine.currentTool,
                penSize: this.drawingEngine.penSize,
                penColor: this.drawingEngine.currentColor,
                penType: this.drawingEngine.penType,
                eraserSize: this.drawingEngine.eraserSize,
                eraserShape: this.drawingEngine.eraserShape,
                currentPage: this.currentPage,
                canvasScale: this.drawingEngine.canvasScale,
                panOffset: this.drawingEngine.panOffset,
                pageBackgrounds: this.pageBackgrounds,
                // Global background settings
                backgroundColor: this.backgroundManager.backgroundColor,
                backgroundPattern: this.backgroundManager.backgroundPattern,
                bgOpacity: this.backgroundManager.bgOpacity,
                patternIntensity: this.backgroundManager.patternIntensity,
                patternDensity: this.backgroundManager.patternDensity,
                coordinateOriginX: this.backgroundManager.coordinateOriginX,
                coordinateOriginY: this.backgroundManager.coordinateOriginY,
                coordinateOverlayState: this.backgroundManager.getCoordinateOverlayState(),
                imageSize: this.backgroundManager.imageSize,
                backgroundImageData: this.backgroundManager.backgroundImageData,
                backgroundOutsideLayerOrder: this.backgroundManager.backgroundOutsideLayerOrder || 1,
                uploadedImages: this.uploadedImages,
                objectGroups: this.drawingEngine.objectGroups || [],
                // Text objects for selection support after restore
                textObjects: this.insertTextManager ? this.insertTextManager.getTextObjects() : [],
                // Strokes for selection support after restore
                strokes: this.drawingEngine.strokes.map(s => ({
                    points: s.points.map(p => ({ x: p.x, y: p.y })),
                    color: s.color,
                    size: s.size,
                    penType: s.penType,
                    tool: s.tool,
                    lineStyle: s.lineStyle || 'solid',
                    dashDensity: s.dashDensity || 10,
                    renderMode: s.renderMode || null,
                    shapeType: s.shapeType || null,
                    shapeStart: s.shapeStart ? { ...s.shapeStart } : null,
                    shapeEnd: s.shapeEnd ? { ...s.shapeEnd } : null,
                    shapeLineStyle: s.shapeLineStyle || null,
                    shapeDashDensity: s.shapeDashDensity || null,
                    shapeWaveDensity: s.shapeWaveDensity || null,
                    shapeMultiLineCount: s.shapeMultiLineCount || null,
                    shapeMultiLineSpacing: s.shapeMultiLineSpacing || null,
                    arrowSize: s.arrowSize || null,
                    eraserShape: s.eraserShape || null,
                    rotation: s.rotation || 0,
                    layerOrder: s.layerOrder || 0,
                    objectId: s.objectId || this.drawingEngine.getNextObjectId(),
                    groupId: s.groupId || null
                })),
                stampedImages: this.drawingEngine.stampedImages.map(img => ({
                    imageSrc: img.imageSrc || (img.imageElement ? img.imageElement.src : null),
                    x: img.x,
                    y: img.y,
                    width: img.width,
                    height: img.height,
                    rotation: img.rotation || 0,
                    flipHorizontal: img.flipHorizontal || false,
                    flipVertical: img.flipVertical || false,
                    layerOrder: img.layerOrder || 0,
                    objectId: img.objectId || this.drawingEngine.getNextObjectId(),
                    groupId: img.groupId || null
                }))
            };

            const data = {
                pages: pagesBlobs,
                settings: settings,
                canvasWidth: this.canvas.width,
                canvasHeight: this.canvas.height
            };

            await this.storageManager.saveSession(data);
            console.log('Session saved to IndexedDB');
        } catch (e) {
            console.warn('Failed to save session:', e);
        }
    }
    
    // Check for saved session and show recovery dialog
    async checkForRecovery() {
        try {
            const hasSession = await this.storageManager.hasSession();
            if (hasSession) {
                this.showRecoveryModal();
            }
        } catch (e) {
            console.warn('Error checking for recovery:', e);
        }
    }
    
    // Show recovery dialog    showRecoveryModal() {
        return sessionRuntime.showRecoveryModal?.(this);
    }
    
    // Restore session data from IndexedDB    async restoreSession() {
        return sessionRuntime.restoreSession?.(this);
    }
    
    // Helper to sync UI elements with restored settings    syncSettingsUI(settings) {
        return sessionRuntime.syncSettingsUI?.(this, settings);
    }

    // Clear saved session data    async clearSessionData() {
        return sessionRuntime.clearSessionData?.(this);
    }    getCacheKeyGroups() {
        return cacheRuntime.getCacheKeyGroups?.(this);
    }    getStorageEntrySize(key, value) {
        return cacheRuntime.getStorageEntrySize?.(this, key, value);
    }    async withTimeout(promise, timeoutMs, fallbackValue = null) {
        return cacheRuntime.withTimeout?.(this, promise, timeoutMs, fallbackValue);
    }    async waitForServiceWorkerCacheReady(timeoutMs = 2000) {
        return cacheRuntime.waitForServiceWorkerCacheReady?.(this, timeoutMs);
    }    scheduleCacheSizeRetryWhenReady() {
        return cacheRuntime.scheduleCacheSizeRetryWhenReady?.(this);
    }    getCacheStorageSizeSnapshot() {
        return cacheRuntime.getCacheStorageSizeSnapshot?.(this);
    }    setCacheStorageSizeSnapshot(fingerprint, bytes) {
        return cacheRuntime.setCacheStorageSizeSnapshot?.(this, fingerprint, bytes);
    }    clearCacheStorageSizeSnapshot() {
        return cacheRuntime.clearCacheStorageSizeSnapshot?.(this);
    }    async buildCacheStorageFingerprint() {
        return cacheRuntime.buildCacheStorageFingerprint?.(this);
    }    async measureExactCacheStorageUsage() {
        return cacheRuntime.measureExactCacheStorageUsage?.(this);
    }    async getExactCacheStorageUsage() {
        return cacheRuntime.getExactCacheStorageUsage?.(this);
    }    formatBytes(bytes) {
        return cacheRuntime.formatBytes?.(this, bytes);
    }    async getCacheSizeSummary() {
        return cacheRuntime.getCacheSizeSummary?.(this);
    }    async updateCacheSizeDisplay() {
        return cacheRuntime.updateCacheSizeDisplay?.(this);
    }    async clearSelectedCache(options) {
        return cacheRuntime.clearSelectedCache?.(this, options);
    }    async clearAllLocalData() {
        return cacheRuntime.clearAllLocalData?.(this);
    }
}

window.DrawingBoard = DrawingBoard;
