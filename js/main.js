// Main Application Class
// Integrates all modules and handles user interactions
const DEFAULT_MIN_FIT_SCALE = 0.1;
const DEFAULT_TARGET_COVERAGE = 0.7;
const DEFAULT_MIN_DEFAULT_SCALE = 0.9;

function createWindowRuntimeProxy(name) {
    return new Proxy({}, {
        get(_target, property) {
            const runtime = window[name] || {};
            return runtime[property];
        }
    });
}

const boardConstruction = createWindowRuntimeProxy('AboardBoardConstruction');
const panelRuntime = createWindowRuntimeProxy('AboardPanelRuntime');
const layoutRuntime = createWindowRuntimeProxy('AboardLayoutRuntime');
const coordinatePanelRuntime = createWindowRuntimeProxy('AboardCoordinatePanelRuntime');
const overlayUiRuntime = createWindowRuntimeProxy('AboardOverlayUiRuntime');
const modalRuntime = createWindowRuntimeProxy('AboardModalRuntime');
const lazyManagerRuntime = createWindowRuntimeProxy('AboardLazyManagerRuntime');
const uiListenersCoreRuntime = createWindowRuntimeProxy('AboardUiListenersCoreRuntime');
const uiListenersRuntime = createWindowRuntimeProxy('AboardUiListenersRuntime');
const sessionRuntime = createWindowRuntimeProxy('AboardSessionRuntime');
const fontManagementRuntime = createWindowRuntimeProxy('AboardFontManagementRuntime');
const configImportRuntime = createWindowRuntimeProxy('AboardConfigImportRuntime');
const backgroundUiRuntime = createWindowRuntimeProxy('AboardBackgroundUiRuntime');
const cacheRuntime = createWindowRuntimeProxy('AboardCacheRuntime');
const customizationRuntime = createWindowRuntimeProxy('AboardCustomizationRuntime');
const displayRuntime = createWindowRuntimeProxy('AboardDisplayRuntime');
const pageSceneRuntime = createWindowRuntimeProxy('AboardPageSceneRuntime');
const paginationRuntime = createWindowRuntimeProxy('AboardPaginationRuntime');
const interactionRuntime = createWindowRuntimeProxy('AboardInteractionRuntime');
const uploadedImagesRuntime = createWindowRuntimeProxy('AboardUploadedImagesRuntime');
const zoomRuntime = createWindowRuntimeProxy('AboardZoomRuntime');
const sessionPersistenceRuntime = createWindowRuntimeProxy('AboardSessionPersistenceRuntime');
const coordinateOriginRuntime = createWindowRuntimeProxy('AboardCoordinateOriginRuntime');
const eventSetupRuntime = createWindowRuntimeProxy('AboardEventSetupRuntime');
const canvasViewRuntime = createWindowRuntimeProxy('AboardCanvasViewRuntime');
const overlayLockRuntime = createWindowRuntimeProxy('AboardOverlayLockRuntime');
const toolRuntime = createWindowRuntimeProxy('AboardToolRuntime');
const coordinateToolsRuntime = createWindowRuntimeProxy('AboardCoordinateToolsRuntime');
const drawingActionsRuntime = createWindowRuntimeProxy('AboardDrawingActionsRuntime');
const viewControlsRuntime = createWindowRuntimeProxy('AboardViewControlsRuntime');
const renderQualityRuntime = createWindowRuntimeProxy('AboardRenderQualityRuntime');
const boardHelpersRuntime = createWindowRuntimeProxy('AboardBoardHelpersRuntime');
const deferredInitRuntime = createWindowRuntimeProxy('AboardDeferredInitRuntime');

function safeMainStorageGetItem(key) {
    try {
        return localStorage.getItem(key);
    } catch (error) {
        console.warn(`Failed to read main localStorage key "${key}":`, error);
        return null;
    }
}

function createNoopMainStorageManager() {
    return {
        initPromise: Promise.resolve(null),
        async saveSession() {
            return false;
        },
        async loadSession() {
            return null;
        },
        async hasSession() {
            return false;
        },
        async clearSession() {},
        closeDB() {},
        getSessionSizeEstimate() {
            return 0;
        },
        setSessionSizeEstimate() {},
        clearSessionSizeEstimate() {}
    };
}

function createNoopMainCollapsibleManager() {
    return {
        collapsedState: { default: true },
        loadCollapsedState() {
            return { default: true };
        },
        saveCollapsedState() {},
        initializeCollapsibles() {},
        setup() {},
        makeCollapsible() {}
    };
}

function createNoopMainAnnouncementManager() {
    return {
        setupEventListeners() {},
        checkAndShowAnnouncement() {},
        showModal() {},
        closeModal() {},
        updateSettingsContent() {},
        showFromSettings() {}
    };
}

function createNoopMainHelpSystem() {
    return {
        init() {},
        bindDataHelpButtons() {},
        refreshHelpButtonLabels() {},
        showHelp() {}
    };
}

function instantiateOptionalMainDependency(label, ctor, args = [], fallbackFactory) {
    if (typeof ctor !== 'function') {
        return typeof fallbackFactory === 'function' ? fallbackFactory() : null;
    }

    try {
        return Reflect.construct(ctor, args);
    } catch (error) {
        console.warn(`Aboard optional main dependency "${label}" failed to initialize:`, error);
        return typeof fallbackFactory === 'function' ? fallbackFactory() : null;
    }
}

class DrawingBoard {
    constructor(options = {}) {
        // Canvas setup
        this.canvas = options.canvas || document.getElementById('canvas');
        this.ctx = options.ctx || this.canvas.getContext('2d', { 
            desynchronized: true,
            alpha: true,
            willReadFrequently: true
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

        this.collapsibleManager = options.collapsibleManager
            || instantiateOptionalMainDependency('CollapsibleManager', typeof CollapsibleManager === 'function' ? CollapsibleManager : null, [], createNoopMainCollapsibleManager);
        this.announcementManager = options.announcementManager
            || instantiateOptionalMainDependency('AnnouncementManager', typeof AnnouncementManager === 'function' ? AnnouncementManager : null, [], createNoopMainAnnouncementManager);
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
        if (this.teachingToolsManager) {
            this.teachingToolsManager.onToolsInserted = () => {
                this.closeFeaturePanel();
                this.switchToPen();
            };
        }
        
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
            try {
                this.helpSystem.init?.();
            } catch (error) {
                console.warn('Aboard optional main dependency "HelpSystem" failed to initialize:', error);
                this.helpSystem = createNoopMainHelpSystem();
            }
        } else if (window.HelpSystem) {
            this.helpSystem = instantiateOptionalMainDependency(
                'HelpSystem',
                typeof HelpSystem === 'function' ? HelpSystem : window.HelpSystem,
                [],
                createNoopMainHelpSystem
            );
            this.helpSystem.init?.();
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
        this.pageScenes = {};
        this.pageBackgrounds = {}; // Store background settings per page
        
        // Load saved page backgrounds
        const savedPageBackgrounds = safeMainStorageGetItem('pageBackgrounds');
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
        this.syncSessionSnapshotKey = 'aboardSyncSessionSnapshot';
        this.lastUserActivityAt = Date.now();
        this.suppressBeforeUnloadPrompt = false;
        this.hasUnresolvedRecoveryData = false;
        this.recoveryPromptOpen = false;
        this.recoveryCheckPromise = null;
        
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
        this.settingsInfrastructureInitialized = false;
        this.settingsListenersInitialized = false;
        this.shapeToolConfigListenersInitialized = false;
        this.selectToolConfigListenersInitialized = false;
        this.moreFeatureToolConfigListenersInitialized = false;
        this.backgroundToolConfigListenersInitialized = false;
        this.backgroundPanelPrepared = false;
        
        // Uploaded images storage
        this.uploadedImages = this.loadUploadedImages() || [];
        
        // Connect edge drawing manager to drawing engine
        this.drawingEngine.setEdgeDrawingManager(this.edgeDrawingManager);
        
        // Initialize StorageManager
        this.storageManager = options.storageManager
            || instantiateOptionalMainDependency('StorageManager', typeof StorageManager === 'function' ? StorageManager : null, [], createNoopMainStorageManager);

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

        const markUserActivity = () => {
            this.markUserActivity();
        };
        ['pointerdown', 'pointermove', 'keydown', 'input', 'wheel', 'touchstart'].forEach((eventName) => {
            document.addEventListener(eventName, markUserActivity, true);
        });
        
        // Listen for fullscreen changes
        document.addEventListener('fullscreenchange', () => this.handleFullscreenChange());
        
        // Save canvas data before page unload (Attempt synchronous save, though IndexedDB is async)
        window.addEventListener('beforeunload', (e) => {
            this.saveSessionSnapshotSync();
            void this.saveSession();
            if (this.suppressBeforeUnloadPrompt) {
                return undefined;
            }
            // Show warning message when user tries to refresh or close the page
            const message = window.i18n
                ? window.i18n.t('tools.refresh.warning')
                : 'Your board will be saved automatically before leaving. You can restore it the next time you open Aboard.';
            e.preventDefault();
            e.returnValue = message;
            return message;
        });
        
        // Check for saved canvas data and keep the pending promise available so
        // startup update flows can avoid overwriting restorable sessions.
        this.recoveryCheckPromise = Promise.resolve(this.checkForRecovery())
            .catch((error) => {
                console.warn('Recovery check failed:', error);
                return false;
            })
            .finally(() => {
                this.recoveryCheckPromise = null;
            });
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
        return boardHelpersRuntime.syncEraserSizeControls?.(this);
    }

    refreshAdaptiveEraserSize() {
        return boardHelpersRuntime.refreshAdaptiveEraserSize?.(this);
    }
    initializeCanvasView() {
        return canvasViewRuntime.initializeCanvasView?.(this);
    }
    centerCanvas() {
        return canvasViewRuntime.centerCanvas?.(this);
    }
    recalculateAndRecenterCanvas() {
        return canvasViewRuntime.recalculateAndRecenterCanvas?.(this);
    }
    resizeCanvas() {
        return canvasViewRuntime.resizeCanvas?.(this);
    }
    setupEventListeners() {
        return eventSetupRuntime.setupEventListeners?.(this);
    }
    
    setupToolConfigListeners() {
        return uiListenersCoreRuntime.setupToolConfigListeners?.(this);
    }

    setupShapeToolConfigListeners() {
        return uiListenersRuntime.setupShapeToolConfigListeners?.(this);
    }

    setupSelectToolConfigListeners() {
        return uiListenersRuntime.setupSelectToolConfigListeners?.(this);
    }

    setupMoreFeatureToolConfigListeners() {
        return uiListenersRuntime.setupMoreFeatureToolConfigListeners?.(this);
    }

    setupBackgroundToolConfigListeners() {
        return uiListenersRuntime.setupBackgroundToolConfigListeners?.(this);
    }
    
    setupSettingsListeners() {
        return uiListenersRuntime.setupSettingsListeners?.(this);
    }
    setupModalInteractionLock() {
        return overlayLockRuntime.setupModalInteractionLock?.(this);
    }
    
    setupKeyboardShortcuts() {
        return boardHelpersRuntime.setupKeyboardShortcuts?.(this);
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
        return boardHelpersRuntime.updatePenLineStyleSettings?.(this, lineStyle);
    }
    
    switchToPen() {
        return toolRuntime.switchToPen?.(this);
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
        return toolRuntime.exitShapeMode?.(this);
    }
    
    setTool(tool, showConfig = true) {
        return toolRuntime.setTool?.(this, tool, showConfig);
    }

    showCoordinateToast(i18nKey, fallback, type = 'info') {
        return coordinateToolsRuntime.showCoordinateToast?.(this, i18nKey, fallback, type);
    }

    getLogicalCanvasPointFromEvent(e) {
        return coordinateToolsRuntime.getLogicalCanvasPointFromEvent?.(this, e);
    }

    resetSelectedCoordinateLineConnection(options = {}) {
        return coordinateToolsRuntime.resetSelectedCoordinateLineConnection?.(this, options);
    }

    handleSelectedCoordinateLinePointClick(pointId) {
        return coordinateToolsRuntime.handleSelectedCoordinateLinePointClick?.(this, pointId);
    }

    escapeHtml(value) {
        return boardHelpersRuntime.escapeHtml?.(this, value) ?? String(value);
    }

    getCoordinateExpressionPrefix(pattern = this.backgroundManager?.backgroundPattern) {
        return boardHelpersRuntime.getCoordinateExpressionPrefix?.(this, pattern) ?? 'y = ';
    }

    syncCoordinateExpressionDisplay() {
        return coordinateToolsRuntime.syncCoordinateExpressionDisplay?.(this);
    }

    getCoordinatePlotAxisOptions(coordinateType = this.backgroundManager?.backgroundPattern) {
        return coordinateToolsRuntime.getCoordinatePlotAxisOptions?.(this, coordinateType);
    }

    createCoordinatePlotRangeRowMarkup(segment = {}, coordinateType = this.backgroundManager?.backgroundPattern) {
        return coordinateToolsRuntime.createCoordinatePlotRangeRowMarkup?.(this, segment, coordinateType);
    }

    handleCoordinatePlotListClick(e) {
        return coordinateToolsRuntime.handleCoordinatePlotListClick?.(this, e);
    }

    addCoordinatePlotRangeRow(plotId) {
        return coordinateToolsRuntime.addCoordinatePlotRangeRow?.(this, plotId);
    }

    collectCoordinatePlotEditorSegments(plotId) {
        return coordinateToolsRuntime.collectCoordinatePlotEditorSegments?.(this, plotId);
    }

    saveCoordinatePlotEditor(plotId) {
        return coordinateToolsRuntime.saveCoordinatePlotEditor?.(this, plotId);
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
        return coordinateToolsRuntime.getCoordinatePointLineMode?.(this);
    }

    getCoordinatePointLineModeMeta(mode = this.getCoordinatePointLineMode()) {
        return coordinateToolsRuntime.getCoordinatePointLineModeMeta?.(this, mode);
    }

    showCoordinatePointModeStatus(enabled) {
        return coordinateToolsRuntime.showCoordinatePointModeStatus?.(this, enabled);
    }

    syncCoordinatePointModeSectionVisibility(forceVisible) {
        return coordinateToolsRuntime.syncCoordinatePointModeSectionVisibility?.(this, forceVisible);
    }

    setCoordinatePointLineMode(mode, options = {}) {
        return coordinateToolsRuntime.setCoordinatePointLineMode?.(this, mode, options);
    }

    setCoordinatePointMode(enabled) {
        return coordinateToolsRuntime.setCoordinatePointMode?.(this, enabled);
    }

    disableCoordinateOriginDragMode(options = {}) {
        return coordinateToolsRuntime.disableCoordinateOriginDragMode?.(this, options);
    }
    
    handleDrawingComplete() {
        return drawingActionsRuntime.handleDrawingComplete?.(this);
    }
    
    discardCurrentStroke() {
        return drawingActionsRuntime.discardCurrentStroke?.(this);
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
    }
    showConfigDiffModal(diff, newSettings) {
        return configImportRuntime.showConfigDiffModal?.(this, diff, newSettings);
    }
    
    confirmClear() {
        return drawingActionsRuntime.confirmClear?.(this);
    }
    
    clearCanvas(saveToHistory = true) {
        return drawingActionsRuntime.clearCanvas?.(this, saveToHistory);
    }
    
    updateUI() {
        return toolRuntime.updateUI?.(this);
    }
    
    // Calculate the scale needed to fit canvas within viewport with margins
    calculateCanvasFitScale() {
        return renderQualityRuntime.calculateCanvasFitScale?.(this) ?? 1;
    }

    getRenderPixelRatio() {
        return renderQualityRuntime.getRenderPixelRatio?.(this) ?? (window.devicePixelRatio || 1);
    }

    getTargetRenderScale() {
        return renderQualityRuntime.getTargetRenderScale?.(this) ?? 1;
    }

    scheduleRenderQualityUpdate() {
        return renderQualityRuntime.scheduleRenderQualityUpdate?.(this);
    }

    applyRenderQualityScale(scale) {
        return renderQualityRuntime.applyRenderQualityScale?.(this, scale);
    }
    
    applyCanvasSize() {
        return renderQualityRuntime.applyCanvasSize?.(this);
    }
    
    // Zoom methods
    handleDoubleTap(touch) {
        return viewControlsRuntime.handleDoubleTap?.(this, touch);
    }

    zoomToPoint(clientX, clientY, newScale, animate = false) {
        return viewControlsRuntime.zoomToPoint?.(this, clientX, clientY, newScale, animate);
    }

    zoomIn() {
        return viewControlsRuntime.zoomIn?.(this);
    }
    
    zoomOut() {
        return viewControlsRuntime.zoomOut?.(this);
    }
    
    setZoom(value) {
        return viewControlsRuntime.setZoom?.(this, value);
    }
    
    applyZoom(updateConfigScale = true) {
        return viewControlsRuntime.applyZoom?.(this, updateConfigScale);
    }

    revealToolbar() {
        return viewControlsRuntime.revealToolbar?.(this);
    }
    
    updateConfigAreaScale() {
        return viewControlsRuntime.updateConfigAreaScale?.(this);
    }
    
    updateMaxCanvasScale() {
        return viewControlsRuntime.updateMaxCanvasScale?.(this);
    }

    updateZoomUI() {
        return viewControlsRuntime.updateZoomUI?.(this);
    }
    
    updateZoomControlsVisibility() {
        return viewControlsRuntime.updateZoomControlsVisibility?.(this);
    }

    updateImportExportBtnVisibility() {
        return viewControlsRuntime.updateImportExportBtnVisibility?.(this);
    }
    
    updateFullscreenBtnVisibility() {
        return viewControlsRuntime.updateFullscreenBtnVisibility?.(this);
    }

    updateHistoryControlsContainerVisibility() {
        return viewControlsRuntime.updateHistoryControlsContainerVisibility?.(this);
    }

    ensureSettingsInfrastructureInitialized() {
        return deferredInitRuntime.ensureSettingsInfrastructureInitialized?.(this);
    }

    ensureSettingsListenersInitialized() {
        return deferredInitRuntime.ensureSettingsListenersInitialized?.(this);
    }

    ensureSettingsSurfaceReady() {
        return deferredInitRuntime.ensureSettingsSurfaceReady?.(this);
    }

    ensureShapeToolConfigListenersInitialized() {
        return deferredInitRuntime.ensureShapeToolConfigListenersInitialized?.(this);
    }

    ensureSelectToolConfigListenersInitialized() {
        return deferredInitRuntime.ensureSelectToolConfigListenersInitialized?.(this);
    }

    ensureBackgroundPanelPrepared() {
        return deferredInitRuntime.ensureBackgroundPanelPrepared?.(this);
    }

    ensureMoreFeatureToolConfigListenersInitialized() {
        return deferredInitRuntime.ensureMoreFeatureToolConfigListenersInitialized?.(this);
    }

    ensureBackgroundToolConfigListenersInitialized() {
        return deferredInitRuntime.ensureBackgroundToolConfigListenersInitialized?.(this);
    }

    scheduleDeferredUiInitialization() {
        return deferredInitRuntime.scheduleDeferredUiInitialization?.(this);
    }

    initFontManagement() {
        return fontManagementRuntime.initFontManagement?.(this);
    }
    getTextWithFallback(key, fallback) {
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

    // Initialize toolbar customization
    initToolbarCustomization() {
        return customizationRuntime.initToolbarCustomization?.(this);
    }
    reorderToolbarItems(container, order) {
        return customizationRuntime.reorderToolbarItems?.(this, container, order);
    }
    saveToolbarOrder() {
        return customizationRuntime.saveToolbarOrder?.(this);
    }
    saveToolbarVisibility() {
        return customizationRuntime.saveToolbarVisibility?.(this);
    }
    
    // Tool to button ID mapping (shared constant)
    getToolToButtonIdMap() {
        return customizationRuntime.getToolToButtonIdMap?.(this);
    }
    applyToolbarOrder() {
        return customizationRuntime.applyToolbarOrder?.(this);
    }
    applyToolbarVisibility(visibility) {
        return customizationRuntime.applyToolbarVisibility?.(this, visibility);
    }
    
    // Initialize control button settings
    initControlButtonSettings() {
        return customizationRuntime.initControlButtonSettings?.(this);
    }
    
    // Initialize drag-and-drop for control button reordering
    initControlButtonDragDrop() {
        return customizationRuntime.initControlButtonDragDrop?.(this);
    }
    
    // Save control button order to localStorage
    saveControlButtonOrder() {
        return customizationRuntime.saveControlButtonOrder?.(this);
    }
    
    // Reorder the settings list based on saved order
    reorderControlButtonList(order) {
        return customizationRuntime.reorderControlButtonList?.(this, order);
    }
    
    // Reorder actual control buttons in the UI based on order
    reorderControlButtons(order) {
        return customizationRuntime.reorderControlButtons?.(this, order);
    }
    applyControlButtonVisibility(settings) {
        return customizationRuntime.applyControlButtonVisibility?.(this, settings);
    }
    toggleFullscreen() {
        return displayRuntime.toggleFullscreen?.(this);
    }
    getFullscreenButtonTitle(isExitState) {
        return displayRuntime.getFullscreenButtonTitle?.(this, isExitState);
    }
    updatePatternGrid() {
        return displayRuntime.updatePatternGrid?.(this);
    }
    handleFullscreenChange() {
        return displayRuntime.handleFullscreenChange?.(this);
    }
    setupCanvasZoom() {
        return zoomRuntime.setupCanvasZoom?.(this);
    }
    hideHistoryControls() {
        return displayRuntime.hideHistoryControls?.(this);
    }
    
    ensurePageScenesStore() {
        return pageSceneRuntime.ensurePageScenesStore?.(this);
    }
    capturePageScene(pageNumber = this.currentPage, options = {}) {
        return pageSceneRuntime.capturePageScene?.(this, pageNumber, options);
    }
    saveCurrentPageScene(pageNumber = this.currentPage, options = {}) {
        return pageSceneRuntime.saveCurrentPageScene?.(this, pageNumber, options);
    }
    getPageScene(pageNumber = this.currentPage, options = {}) {
        return pageSceneRuntime.getPageScene?.(this, pageNumber, options);
    }
    getSerializedPageScenes(pageNumbers = null, options = {}) {
        return pageSceneRuntime.getSerializedPageScenes?.(this, pageNumbers, options);
    }
    clearPageSceneRuntimeState() {
        return pageSceneRuntime.clearPageSceneRuntimeState?.(this);
    }
    restorePageScene(pageNumber = this.currentPage, options = {}) {
        return pageSceneRuntime.restorePageScene?.(this, pageNumber, options);
    }
    async hydrateSerializedScene(scene) {
        return pageSceneRuntime.hydrateSerializedScene?.(this, scene);
    }
    async applySerializedPageScenes(serializedScenes = {}) {
        return pageSceneRuntime.applySerializedPageScenes?.(this, serializedScenes);
    }
    clearAllPageScenes(options = {}) {
        return pageSceneRuntime.clearAllPageScenes?.(this, options);
    }
    // Pagination methods
    addPage() {
        return paginationRuntime.addPage?.(this);
    }
    prevPage() {
        return paginationRuntime.prevPage?.(this);
    }
    nextPage() {
        return paginationRuntime.nextPage?.(this);
    }
    nextOrAddPage() {
        return paginationRuntime.nextOrAddPage?.(this);
    }
    goToPage(pageNumber) {
        return paginationRuntime.goToPage?.(this, pageNumber);
    }
    loadPage(pageNumber) {
        return paginationRuntime.loadPage?.(this, pageNumber);
    }
    savePageBackground(pageNumber) {
        return paginationRuntime.savePageBackground?.(this, pageNumber);
    }
    restorePageBackground(pageNumber) {
        return paginationRuntime.restorePageBackground?.(this, pageNumber);
    }
    renderCoordinatePlotList(currentPattern) {
        return backgroundUiRuntime.renderCoordinatePlotList?.(this, currentPattern);
    }
    updateBackgroundUI() {
        return backgroundUiRuntime.updateBackgroundUI?.(this);
    }
    updatePaginationUI() {
        return paginationRuntime.updatePaginationUI?.(this);
    }
    updateEraserCursor(e) {
        return interactionRuntime.updateEraserCursor?.(this, e);
    }
    updateEraserCursorShape() {
        return interactionRuntime.updateEraserCursorShape?.(this);
    }
    showEraserCursor() {
        return interactionRuntime.showEraserCursor?.(this);
    }
    hideEraserCursor() {
        return interactionRuntime.hideEraserCursor?.(this);
    }
    
    // Pinch zoom and pan gesture handlers
    handlePinchStart(e) {
        return interactionRuntime.handlePinchStart?.(this, e);
    }
    handlePinchMove(e) {
        return interactionRuntime.handlePinchMove?.(this, e);
    }
    handlePinchEnd() {
        return interactionRuntime.handlePinchEnd?.(this);
    }
    getPinchDistance(touch1, touch2) {
        return interactionRuntime.getPinchDistance?.(this, touch1, touch2);
    }
    getPinchCenter(touch1, touch2) {
        return interactionRuntime.getPinchCenter?.(this, touch1, touch2);
    }
    
    // Pointer Events-based pinch gesture handlers
    // These work with stylus/pen + finger combinations and pure touch inputs
    handlePointerPinchStart() {
        return interactionRuntime.handlePointerPinchStart?.(this);
    }
    handlePointerPinchMove() {
        return interactionRuntime.handlePointerPinchMove?.(this);
    }
    handlePointerPinchEnd() {
        return interactionRuntime.handlePointerPinchEnd?.(this);
    }
    getPointerDistance(p1, p2) {
        return interactionRuntime.getPointerDistance?.(this, p1, p2);
    }
    getPointerCenter(p1, p2) {
        return interactionRuntime.getPointerCenter?.(this, p1, p2);
    }
    applyPanTransform() {
        return interactionRuntime.applyPanTransform?.(this);
    }
    syncInteractiveOverlays() {
        return interactionRuntime.syncInteractiveOverlays?.(this);
    }
    shouldShowLiveStrokePreview() {
        return interactionRuntime.shouldShowLiveStrokePreview?.(this);
    }
    shouldShowLiveEraserPreview() {
        return interactionRuntime.shouldShowLiveEraserPreview?.(this);
    }
    hasVectorPreviewContent() {
        return interactionRuntime.hasVectorPreviewContent?.(this);
    }
    shouldUseVectorPreview() {
        return interactionRuntime.shouldUseVectorPreview?.(this);
    }
    syncVectorPreviewState(forceRender = false) {
        return interactionRuntime.syncVectorPreviewState?.(this, forceRender);
    }
    loadUploadedImages() {
        return uploadedImagesRuntime.loadUploadedImages?.(this);
    }
    saveUploadedImage(imageData) {
        return uploadedImagesRuntime.saveUploadedImage?.(this, imageData);
    }
    updateUploadedImagesButtons() {
        return uploadedImagesRuntime.updateUploadedImagesButtons?.(this);
    }
    dragCoordinateOrigin(e) {
        return coordinateOriginRuntime.dragCoordinateOrigin?.(this, e);
    }
    stopDraggingCoordinateOrigin() {
        return coordinateOriginRuntime.stopDraggingCoordinateOrigin?.(this);
    }
    
    // Save session data to IndexedDB via StorageManager
    markUserActivity() {
        this.lastUserActivityAt = Date.now();
    }

    setSuppressBeforeUnloadPrompt(value = true) {
        this.suppressBeforeUnloadPrompt = Boolean(value);
    }

    getUpdateActivitySnapshot() {
        const activeElement = document.activeElement;
        const isEditableElement = Boolean(activeElement) && (
            activeElement.isContentEditable
            || ['INPUT', 'TEXTAREA', 'SELECT'].includes(activeElement.tagName)
        );
        const hasBlockingModal = Boolean(
            document.querySelector('.modal.show:not(.non-blocking-modal), .time-fullscreen-modal.show, .timer-fullscreen-modal.show')
        );

        return {
            lastActivityAt: this.lastUserActivityAt,
            isDrawing: Boolean(this.drawingEngine?.isDrawing || this.shapeDrawingManager?.isDrawing),
            isPinching: Boolean(this.isPinching || this.activePointers?.size > 1),
            isDraggingPanel: Boolean(this.isDraggingPanel || this.isDraggingCoordinateOrigin),
            // Idle updates must not reload while a blocking modal is visible, even
            // if the user is only reading it and not actively dragging/resizing it.
            isModalBusy: Boolean(hasBlockingModal || this.modalDragState || this.modalResizeState),
            isSelectionBusy: Boolean(
                this.selectionManager?.isDragging
                || this.selectionManager?.isResizing
                || this.selectionManager?.isRotating
                || this.strokeControls?.isDragging
                || this.strokeControls?.isResizing
                || this.strokeControls?.isRotating
            ),
            isTextInputBusy: Boolean(
                this.insertTextManager?.isInputting
                || this.insertTextManager?.isDragging
                || this.insertTextManager?.isResizing
                || this.insertTextManager?.isRotating
                || isEditableElement
            ),
            isMediaTransformBusy: Boolean(
                this.imageControls?.isDragging
                || this.imageControls?.isResizing
                || this.imageControls?.isRotating
                || this.insertImageManager?.isDragging
                || this.insertImageManager?.isResizing
                || this.insertImageManager?.isRotating
            ),
            isTeachingToolBusy: Boolean(
                this.teachingToolsManager?.isDragging
                || this.teachingToolsManager?.isResizing
                || this.teachingToolsManager?.isRotating
            )
        };
    }

    saveSessionSnapshotSync() {
        return sessionPersistenceRuntime.saveSessionSnapshotSync?.(this);
    }
    
    async saveSession() {
        return sessionPersistenceRuntime.saveSession?.(this);
    }

    async persistSessionForUpdateReload(metadata = {}) {
        return sessionPersistenceRuntime.persistSessionForUpdateReload?.(this, metadata);
    }
    
    // Check for saved session and show recovery dialog
    async checkForRecovery() {
        return sessionPersistenceRuntime.checkForRecovery?.(this);
    }
    
    // Show recovery dialog
    showRecoveryModal() {
        return sessionRuntime.showRecoveryModal?.(this);
    }
    
    // Restore session data from IndexedDB
    async restoreSession() {
        return sessionRuntime.restoreSession?.(this);
    }
    
    // Helper to sync UI elements with restored settings
    syncSettingsUI(settings) {
        return sessionRuntime.syncSettingsUI?.(this, settings);
    }

    // Clear saved session data
    async clearSessionData() {
        return sessionRuntime.clearSessionData?.(this);
    }
    getCacheKeyGroups() {
        return cacheRuntime.getCacheKeyGroups?.(this);
    }
    getStorageEntrySize(key, value) {
        return cacheRuntime.getStorageEntrySize?.(this, key, value);
    }
    async withTimeout(promise, timeoutMs, fallbackValue = null) {
        return cacheRuntime.withTimeout?.(this, promise, timeoutMs, fallbackValue);
    }
    async waitForServiceWorkerCacheReady(timeoutMs = 2000) {
        return cacheRuntime.waitForServiceWorkerCacheReady?.(this, timeoutMs);
    }
    scheduleCacheSizeRetryWhenReady() {
        return cacheRuntime.scheduleCacheSizeRetryWhenReady?.(this);
    }
    getCacheStorageSizeSnapshot() {
        return cacheRuntime.getCacheStorageSizeSnapshot?.(this);
    }
    setCacheStorageSizeSnapshot(fingerprint, bytes) {
        return cacheRuntime.setCacheStorageSizeSnapshot?.(this, fingerprint, bytes);
    }
    clearCacheStorageSizeSnapshot() {
        return cacheRuntime.clearCacheStorageSizeSnapshot?.(this);
    }
    async buildCacheStorageFingerprint() {
        return cacheRuntime.buildCacheStorageFingerprint?.(this);
    }
    async measureExactCacheStorageUsage() {
        return cacheRuntime.measureExactCacheStorageUsage?.(this);
    }
    async getExactCacheStorageUsage() {
        return cacheRuntime.getExactCacheStorageUsage?.(this);
    }
    formatBytes(bytes) {
        return cacheRuntime.formatBytes?.(this, bytes);
    }
    async getCacheSizeSummary() {
        return cacheRuntime.getCacheSizeSummary?.(this);
    }
    async updateCacheSizeDisplay() {
        return cacheRuntime.updateCacheSizeDisplay?.(this);
    }
    async clearSelectedCache(options) {
        return cacheRuntime.clearSelectedCache?.(this, options);
    }
    async clearAllLocalData() {
        return cacheRuntime.clearAllLocalData?.(this);
    }
}

window.DrawingBoard = DrawingBoard;
