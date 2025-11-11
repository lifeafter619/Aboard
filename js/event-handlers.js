/**
 * Event Handlers Module - 事件处理模块
 * Handles canvas drawing events, toolbar button clicks, and history controls
 * 处理画布绘图事件、工具栏按钮点击和历史记录控制
 * 
 * This module is part of the DrawingBoard class and contains:
 * - Canvas drawing event listeners (mouse and touch)
 * - Toolbar button event listeners
 * - History control event listeners (undo/redo)
 * - Zoom and fullscreen controls
 * - Pagination controls
 */

class EventHandlers {
    /**
     * Constructor - 构造函数
     * @param {DrawingBoard} board - Reference to the main DrawingBoard instance
     */
    constructor(board) {
        this.board = board;
    }

    /**
     * Setup all event listeners - 设置所有事件监听器
     * This method is called during DrawingBoard initialization
     * 此方法在DrawingBoard初始化时调用
     */
    setupEventListeners() {
        this.setupCanvasDrawingEvents();
        this.setupToolbarButtons();
        this.setupHistoryButtons();
        this.setupZoomControls();
        this.setupFullscreenButton();
        this.setupExportButton();
        this.setupPaginationControls();
        this.setupWindowResize();
    }

    /**
     * Setup canvas drawing events - 设置画布绘图事件
     * Handles mouse and touch events for drawing on the canvas
     * 处理画布上的鼠标和触摸绘图事件
     */
    setupCanvasDrawingEvents() {
        const board = this.board;
        
        // Mouse down event - 鼠标按下事件
        document.addEventListener('mousedown', (e) => {
            // Skip if clicking on UI elements (except canvas)
            // 如果点击UI元素（画布除外）则跳过
            if (e.target && e.target.closest) {
                // 如果正在编辑笔迹，点击工具栏或属性栏时自动保存
                if (board.strokeControls.isActive && 
                    (e.target.closest('#toolbar') || e.target.closest('#config-area'))) {
                    board.strokeControls.hideControls();
                    if (board.historyManager) {
                        board.historyManager.saveState();
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
                    e.target.closest('.canvas-image-selection')) {
                    return;
                }
            }
            
            // 如果正在编辑笔迹，点击画布其他位置时自动保存并切换到笔模式
            if (board.strokeControls.isActive) {
                const rect = board.canvas.getBoundingClientRect();
                const x = e.clientX - rect.left;
                const y = e.clientY - rect.top;
                
                // Check if clicking inside the stroke controls overlay
                if (!e.target.closest('#stroke-controls-overlay')) {
                    // Clicking outside the stroke controls, save and switch to pen
                    board.strokeControls.hideControls();
                    if (board.historyManager) {
                        board.historyManager.saveState();
                    }
                    board.setTool('pen', false);
                    // Continue with pen drawing by calling startDrawing
                    board.drawingEngine.startDrawing(e);
                    return;
                }
            }
            
            // Check if clicking on coordinate origin point (in background mode)
            // 检查是否点击坐标原点（在背景模式下）
            if (board.drawingEngine.currentTool === 'background' && 
                board.backgroundManager.backgroundPattern === 'coordinate') {
                const rect = board.bgCanvas.getBoundingClientRect();
                const x = e.clientX - rect.left;
                const y = e.clientY - rect.top;
                
                if (board.backgroundManager.isPointNearCoordinateOrigin(x, y)) {
                    board.isDraggingCoordinateOrigin = true;
                    board.coordinateOriginDragStart = { x: e.clientX, y: e.clientY };
                    return;
                }
            }
            
            // Auto-switch to pen mode if currently in background mode
            // 如果当前处于背景模式，则自动切换到笔模式
            // But not if image controls are active (user is manipulating background image)
            if (board.drawingEngine.currentTool === 'background' && !board.imageControls.isActive) {
                board.setTool('pen', false); // Don't show config panel
            }
            
            // Handle different mouse buttons and tools
            // 处理不同的鼠标按钮和工具
            if (e.button === 1 || (e.button === 0 && e.shiftKey) || board.drawingEngine.currentTool === 'pan') {
                board.drawingEngine.startPanning(e);
            } else if (board.drawingEngine.currentTool === 'pen' || board.drawingEngine.currentTool === 'eraser') {
                board.drawingEngine.startDrawing(e);
            }
        });
        
        // Mouse move event - 鼠标移动事件
        document.addEventListener('mousemove', (e) => {
            // Don't draw when dragging panels
            // 拖动面板时不绘制
            if (board.isDraggingPanel) {
                return;
            }
            
            if (board.isDraggingCoordinateOrigin) {
                board.dragCoordinateOrigin(e);
            } else if (board.drawingEngine.isPanning) {
                board.drawingEngine.pan(e);
                board.applyPanTransform();
            } else if (board.drawingEngine.isDrawing) {
                board.drawingEngine.draw(e);
                board.updateEraserCursor(e);
            } else {
                board.updateEraserCursor(e);
            }
        });
        
        // Mouse up event - 鼠标释放事件
        document.addEventListener('mouseup', () => {
            board.stopDraggingCoordinateOrigin();
            board.handleDrawingComplete();
            board.drawingEngine.stopPanning();
        });
        
        // Canvas mouse enter - 鼠标进入画布
        board.canvas.addEventListener('mouseenter', (e) => {
            if (board.drawingEngine.currentTool === 'eraser') {
                board.showEraserCursor();
            }
        });
        
        // Canvas mouse leave - 鼠标离开画布
        board.canvas.addEventListener('mouseleave', () => {
            // Don't hide eraser cursor if we're still drawing
            if (!board.drawingEngine.isDrawing) {
                board.hideEraserCursor();
            }
        });
        
        // Touch events - 触摸事件
        this.setupTouchEvents();
    }

    /**
     * Setup touch events for mobile devices - 设置移动设备的触摸事件
     */
    setupTouchEvents() {
        const board = this.board;
        
        // Touch start - 触摸开始
        board.canvas.addEventListener('touchstart', (e) => {
            e.preventDefault();
            if (e.touches.length === 2) {
                // Two-finger gesture - prevent drawing
                // 双指手势 - 阻止绘制
                board.hasTwoFingers = true;
                if (board.drawingEngine.isDrawing) {
                    // Stop any ongoing drawing
                    board.drawingEngine.isDrawing = false;
                }
                board.handlePinchStart(e);
            } else if (e.touches.length === 1 && !board.hasTwoFingers) {
                board.drawingEngine.startDrawing(e.touches[0]);
            }
        }, { passive: false });
        
        // Touch move - 触摸移动
        board.canvas.addEventListener('touchmove', (e) => {
            e.preventDefault();
            if (e.touches.length === 2) {
                // Two-finger pinch to zoom and pan
                // 双指捏合缩放和平移
                board.handlePinchMove(e);
            } else if (e.touches.length === 1 && !board.hasTwoFingers) {
                board.drawingEngine.draw(e.touches[0]);
            }
        }, { passive: false });
        
        // Touch end - 触摸结束
        board.canvas.addEventListener('touchend', (e) => {
            e.preventDefault();
            if (e.touches.length < 2) {
                board.handlePinchEnd();
            }
            if (e.touches.length === 0) {
                board.hasTwoFingers = false;
                // Only save drawing if we weren't doing two-finger gesture
                if (board.drawingEngine.isDrawing) {
                    board.handleDrawingComplete();
                }
            }
        }, { passive: false });
    }

    /**
     * Setup toolbar button event listeners - 设置工具栏按钮事件监听器
     */
    setupToolbarButtons() {
        const board = this.board;
        
        document.getElementById('pen-btn').addEventListener('click', () => board.setTool('pen'));
        document.getElementById('pan-btn').addEventListener('click', () => board.setTool('pan'));
        document.getElementById('eraser-btn').addEventListener('click', () => board.setTool('eraser'));
        document.getElementById('background-btn').addEventListener('click', () => board.setTool('background'));
        document.getElementById('clear-btn').addEventListener('click', () => board.confirmClear());
        document.getElementById('settings-btn').addEventListener('click', () => board.openSettings());
        document.getElementById('more-btn').addEventListener('click', () => board.setTool('more'));
        
        document.getElementById('config-close-btn').addEventListener('click', () => board.closeConfigPanel());
        document.getElementById('feature-close-btn').addEventListener('click', () => board.closeFeaturePanel());
    }

    /**
     * Setup history control buttons - 设置历史记录控制按钮
     */
    setupHistoryButtons() {
        const board = this.board;
        
        // Undo button - 撤销按钮
        document.getElementById('undo-btn').addEventListener('click', () => {
            if (board.historyManager.undo()) {
                // Clear stroke selection as strokes are no longer valid
                board.drawingEngine.clearStrokes();
                board.updateUI();
            }
        });
        
        // Redo button - 重做按钮
        document.getElementById('redo-btn').addEventListener('click', () => {
            if (board.historyManager.redo()) {
                // Clear stroke selection as strokes are no longer valid
                board.drawingEngine.clearStrokes();
                board.updateUI();
            }
        });
    }

    /**
     * Setup zoom control buttons and input - 设置缩放控制按钮和输入
     */
    setupZoomControls() {
        const board = this.board;
        
        document.getElementById('zoom-in-btn').addEventListener('click', () => board.zoomIn());
        document.getElementById('zoom-out-btn').addEventListener('click', () => board.zoomOut());
        document.getElementById('zoom-input').addEventListener('change', (e) => board.setZoom(e.target.value));
        document.getElementById('zoom-input').addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                board.setZoom(e.target.value);
            }
        });
        
        // Setup canvas zoom with Ctrl+scroll
        board.setupCanvasZoom();
    }

    /**
     * Setup fullscreen button - 设置全屏按钮
     */
    setupFullscreenButton() {
        const board = this.board;
        document.getElementById('fullscreen-btn').addEventListener('click', () => board.toggleFullscreen());
    }

    /**
     * Setup export button - 设置导出按钮
     */
    setupExportButton() {
        const board = this.board;
        // Export button (moved to top controls, always visible)
        document.getElementById('export-btn-top').addEventListener('click', () => board.exportManager.showModal());
    }

    /**
     * Setup pagination controls - 设置分页控制
     */
    setupPaginationControls() {
        const board = this.board;
        
        // Pagination controls - merged next and add button
        // 分页控制 - 合并下一页和添加按钮
        document.getElementById('prev-page-btn').addEventListener('click', () => board.prevPage());
        document.getElementById('next-or-add-page-btn').addEventListener('click', () => board.nextOrAddPage());
        document.getElementById('page-input').addEventListener('change', (e) => board.goToPage(parseInt(e.target.value)));
        document.getElementById('page-input').addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                board.goToPage(parseInt(e.target.value));
            }
        });
    }

    /**
     * Setup window resize handler - 设置窗口大小调整处理器
     * Uses debouncing for better performance
     * 使用防抖以提高性能
     */
    setupWindowResize() {
        const board = this.board;
        
        // Debounce resize handler for better performance
        let resizeTimeout;
        window.addEventListener('resize', () => {
            clearTimeout(resizeTimeout);
            resizeTimeout = setTimeout(() => {
                board.resizeCanvas();
                // Update toolbar text visibility on resize
                board.settingsManager.updateToolbarTextVisibility();
                // Reposition toolbars to ensure they stay within viewport
                board.repositionToolbarsOnResize();
                // Don't update config-area scale on window resize (fix #2)
                // board.updateConfigAreaScale();
            }, 150); // 150ms debounce delay
        });
    }
}
