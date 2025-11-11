/**
 * Draggable Panels Module - 可拖动面板模块
 * Handles dragging functionality for UI panels
 * 处理UI面板的拖动功能
 * 
 * This module enables dragging for:
 * - Toolbar (工具栏)
 * - Config area (配置区)
 * - Time display area (时间显示区)
 * - Feature area (功能区)
 * - History controls (历史记录控制)
 * 
 * Features:
 * - Edge snapping (边缘吸附)
 * - Vertical layout when snapped to left/right edges
 * - Viewport boundary constraints
 */

class DraggablePanels {
    /**
     * Constructor - 构造函数
     * @param {DrawingBoard} board - Reference to the main DrawingBoard instance
     */
    constructor(board) {
        this.board = board;
    }

    /**
     * Setup draggable functionality for all panels - 为所有面板设置可拖动功能
     */
    setupDraggablePanels() {
        const historyControls = document.getElementById('history-controls');
        const configArea = document.getElementById('config-area');
        const timeDisplayArea = document.getElementById('time-display-area');
        const featureArea = document.getElementById('feature-area');
        const toolbar = document.getElementById('toolbar');
        
        // Setup mousedown event for each draggable panel
        [historyControls, configArea, timeDisplayArea, featureArea, toolbar].forEach(element => {
            element.addEventListener('mousedown', (e) => this.handlePanelMouseDown(e, element));
        });
        
        // Setup document-level mousemove and mouseup events
        document.addEventListener('mousemove', (e) => this.handleDocumentMouseMove(e));
        document.addEventListener('mouseup', () => this.handleDocumentMouseUp());
    }

    /**
     * Handle mouse down on panel - 处理面板上的鼠标按下
     * @param {MouseEvent} e - Mouse event
     * @param {HTMLElement} element - Panel element
     */
    handlePanelMouseDown(e, element) {
        const board = this.board;
        
        // Don't drag if clicking on buttons or inputs
        // 如果点击按钮或输入框则不拖动
        if (e.target.closest('button') || e.target.closest('input')) return;
        
        board.isDraggingPanel = true;
        board.draggedElement = element;
        
        const rect = element.getBoundingClientRect();
        board.dragOffset.x = e.clientX - rect.left;
        board.dragOffset.y = e.clientY - rect.top;
        
        board.draggedElementWidth = rect.width;
        board.draggedElementHeight = rect.height;
        
        element.classList.add('dragging');
        element.style.transition = 'none';
        
        e.preventDefault();
    }

    /**
     * Handle document mouse move during dragging - 处理拖动时的文档鼠标移动
     * @param {MouseEvent} e - Mouse event
     */
    handleDocumentMouseMove(e) {
        const board = this.board;
        
        if (!board.isDraggingPanel || !board.draggedElement) return;
        
        let x = e.clientX - board.dragOffset.x;
        let y = e.clientY - board.dragOffset.y;
        
        const edgeSnapDistance = 30;
        const windowWidth = window.innerWidth;
        const windowHeight = window.innerHeight;
        const isToolbar = board.draggedElement.id === 'toolbar';
        const isConfigArea = board.draggedElement.id === 'config-area';
        const isTimeDisplayArea = board.draggedElement.id === 'time-display-area';
        const isFeatureArea = board.draggedElement.id === 'feature-area';
        
        let snappedToEdge = false;
        let isVertical = false;
        let snappedLeft = false;
        let snappedRight = false;
        
        // Edge snapping logic - 边缘吸附逻辑
        if (board.settingsManager.edgeSnapEnabled) {
            // Check for left edge snap first
            if (x < edgeSnapDistance) {
                x = 10;
                snappedToEdge = true;
                isVertical = true;
                snappedLeft = true;
            }
            // Check for right edge snap
            else if (x + board.draggedElementWidth > windowWidth - edgeSnapDistance) {
                // When vertical, need to recalculate width
                if (isToolbar || isConfigArea || isTimeDisplayArea || isFeatureArea) {
                    // Temporarily add vertical class to get correct dimensions
                    board.draggedElement.classList.add('vertical');
                    const tempWidth = board.draggedElement.getBoundingClientRect().width;
                    board.draggedElement.classList.remove('vertical');
                    x = windowWidth - tempWidth - 10;
                } else {
                    x = windowWidth - board.draggedElementWidth - 10;
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
            if (y + board.draggedElementHeight > windowHeight - edgeSnapDistance) {
                y = windowHeight - board.draggedElementHeight - 10;
                snappedToEdge = true;
            }
        }
        
        // Apply vertical layout for certain panels when snapped to left/right
        // 当吸附到左/右边缘时为某些面板应用垂直布局
        if ((isToolbar || isConfigArea || isTimeDisplayArea || isFeatureArea) && snappedToEdge && isVertical) {
            board.draggedElement.classList.add('vertical');
            // Recalculate position after adding vertical class to account for dimension changes
            if (snappedRight) {
                const newWidth = board.draggedElement.getBoundingClientRect().width;
                x = windowWidth - newWidth - 10;
            }
        } else {
            board.draggedElement.classList.remove('vertical');
        }
        
        // Constrain to viewport boundaries (prevent overflow)
        // 限制在视口边界内（防止溢出）
        x = Math.max(0, Math.min(x, windowWidth - board.draggedElement.getBoundingClientRect().width));
        y = Math.max(0, Math.min(y, windowHeight - board.draggedElement.getBoundingClientRect().height));
        
        // Apply position
        board.draggedElement.style.left = `${x}px`;
        board.draggedElement.style.top = `${y}px`;
        board.draggedElement.style.transform = 'none';
        board.draggedElement.style.right = 'auto';
        board.draggedElement.style.bottom = 'auto';
    }

    /**
     * Handle document mouse up to end dragging - 处理文档鼠标释放以结束拖动
     */
    handleDocumentMouseUp() {
        const board = this.board;
        
        if (board.isDraggingPanel && board.draggedElement) {
            board.draggedElement.classList.remove('dragging');
            board.draggedElement.style.transition = '';
            board.isDraggingPanel = false;
            board.draggedElement = null;
        }
    }
}
