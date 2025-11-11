/**
 * Canvas View Module - 画布视图模块
 * Manages canvas zoom, pan, and fullscreen functionality
 * 管理画布缩放、平移和全屏功能
 * 
 * Features:
 * - Canvas initialization and centering (画布初始化和居中)
 * - Zoom in/out controls (缩放控制)
 * - Mouse wheel zoom (鼠标滚轮缩放)
 * - Pan transform application (平移变换应用)
 * - Fullscreen mode (全屏模式)
 */

class CanvasView {
    /**
     * Constructor - 构造函数
     * @param {DrawingBoard} board - Reference to the main DrawingBoard instance
     */
    constructor(board) {
        this.board = board;
    }

    /**
     * Initialize canvas view - 初始化画布视图
     * Sets canvas to 70% scale and centers it on startup
     * 启动时将画布设置为70%缩放并居中
     */
    initializeCanvasView() {
        const board = this.board;
        
        // On startup or refresh, set canvas to 70% of fullscreen size and center it
        // Only apply if no saved scale exists
        const savedScale = localStorage.getItem('canvasScale');
        if (!savedScale) {
            board.drawingEngine.canvasScale = 0.7;
            localStorage.setItem('canvasScale', 0.7);
        }
        
        // Center the canvas on startup
        this.centerCanvas();
    }

    /**
     * Center the canvas in viewport - 将画布居中于视口
     */
    centerCanvas() {
        const board = this.board;
        
        // Get the viewport dimensions
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;
        
        // Get the canvas center (at 0,0 without pan offset, canvas is conceptually infinite)
        // We want to move the canvas so that the origin (0,0) is centered in the viewport
        // Pan offset moves the canvas, so positive offset moves content right/down
        const centerX = viewportWidth / 2;
        const centerY = viewportHeight / 2;
        
        // Set pan offset to center the origin
        board.drawingEngine.panOffset.x = centerX / board.drawingEngine.canvasScale;
        board.drawingEngine.panOffset.y = centerY / board.drawingEngine.canvasScale;
        
        // Save to localStorage
        localStorage.setItem('panOffsetX', board.drawingEngine.panOffset.x);
        localStorage.setItem('panOffsetY', board.drawingEngine.panOffset.y);
        
        // Apply the transform
        this.applyPanTransform();
    }

    /**
     * Apply pan transform to canvas - 将平移变换应用于画布
     */
    applyPanTransform() {
        const board = this.board;
        const panX = board.drawingEngine.panOffset.x;
        const panY = board.drawingEngine.panOffset.y;
        const scale = board.drawingEngine.canvasScale;
        
        if (!board.settingsManager.infiniteCanvas) {
            // In paginated mode, keep centering and add pan
            const transform = `translate(-50%, -50%) translate(${panX}px, ${panY}px) scale(${scale})`;
            board.canvas.style.transform = transform;
            board.bgCanvas.style.transform = transform;
        } else {
            // In infinite mode, center the canvas and apply scale with pan
            board.canvas.style.left = '50%';
            board.canvas.style.top = '50%';
            board.bgCanvas.style.left = '50%';
            board.bgCanvas.style.top = '50%';
            const transform = `translate(-50%, -50%) translate(${panX}px, ${panY}px) scale(${scale})`;
            board.canvas.style.transform = transform;
            board.bgCanvas.style.transform = transform;
        }
        board.canvas.style.transformOrigin = 'center center';
        board.bgCanvas.style.transformOrigin = 'center center';
    }

    /**
     * Zoom in - 放大
     */
    zoomIn() {
        const board = this.board;
        const currentScale = board.drawingEngine.canvasScale;
        const newScale = Math.min(currentScale + 0.1, 3.0);
        board.drawingEngine.canvasScale = newScale;
        this.updateZoomUI();
        this.applyZoom(false); // Don't update config-area scale on zoom
        localStorage.setItem('canvasScale', newScale);
    }

    /**
     * Zoom out - 缩小
     */
    zoomOut() {
        const board = this.board;
        const currentScale = board.drawingEngine.canvasScale;
        const newScale = Math.max(currentScale - 0.1, 0.5);
        board.drawingEngine.canvasScale = newScale;
        this.updateZoomUI();
        this.applyZoom(false); // Don't update config-area scale on zoom
        localStorage.setItem('canvasScale', newScale);
    }

    /**
     * Set zoom to specific percentage - 设置缩放到指定百分比
     * @param {string|number} value - Zoom percentage (e.g., "100" or 100)
     */
    setZoom(value) {
        const board = this.board;
        let percent = parseInt(value);
        if (isNaN(percent)) {
            this.updateZoomUI();
            return;
        }
        percent = Math.max(50, Math.min(300, percent));
        const newScale = percent / 100;
        board.drawingEngine.canvasScale = newScale;
        this.updateZoomUI();
        this.applyZoom(false); // Don't update config-area scale on zoom
        localStorage.setItem('canvasScale', newScale);
    }

    /**
     * Apply zoom transform to canvas - 应用缩放变换到画布
     * @param {boolean} updateConfigScale - Whether to update config area scale
     */
    applyZoom(updateConfigScale = true) {
        const board = this.board;
        
        // Apply zoom using CSS transform for better performance
        const panX = board.drawingEngine.panOffset.x;
        const panY = board.drawingEngine.panOffset.y;
        const scale = board.drawingEngine.canvasScale;
        
        if (!board.settingsManager.infiniteCanvas) {
            // In paginated mode, keep centering and add pan
            const transform = `translate(-50%, -50%) translate(${panX}px, ${panY}px) scale(${scale})`;
            board.canvas.style.transform = transform;
            board.bgCanvas.style.transform = transform;
        } else {
            // In infinite mode, center the canvas and apply scale with pan
            board.canvas.style.left = '50%';
            board.canvas.style.top = '50%';
            board.bgCanvas.style.left = '50%';
            board.bgCanvas.style.top = '50%';
            const transform = `translate(-50%, -50%) translate(${panX}px, ${panY}px) scale(${scale})`;
            board.canvas.style.transform = transform;
            board.bgCanvas.style.transform = transform;
        }
        board.canvas.style.transformOrigin = 'center center';
        board.bgCanvas.style.transformOrigin = 'center center';
        
        // Update config-area scale proportionally only when requested (on resize, not on refresh)
        if (updateConfigScale) {
            this.updateConfigAreaScale();
        }
    }

    /**
     * Update config area scale proportionally - 按比例更新配置区域缩放
     */
    updateConfigAreaScale() {
        const board = this.board;
        const configArea = document.getElementById('config-area');
        const scale = board.drawingEngine.canvasScale;
        
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

    /**
     * Update zoom UI display - 更新缩放UI显示
     */
    updateZoomUI() {
        const board = this.board;
        const percent = Math.round(board.drawingEngine.canvasScale * 100);
        document.getElementById('zoom-input').value = percent + '%';
    }

    /**
     * Update zoom controls visibility - 更新缩放控件可见性
     */
    updateZoomControlsVisibility() {
        const board = this.board;
        const historyControls = document.getElementById('history-controls');
        if (board.settingsManager.showZoomControls) {
            historyControls.style.display = 'flex';
        } else {
            historyControls.style.display = 'none';
        }
    }

    /**
     * Update fullscreen button visibility - 更新全屏按钮可见性
     */
    updateFullscreenBtnVisibility() {
        const board = this.board;
        const fullscreenBtn = document.getElementById('fullscreen-btn');
        if (board.settingsManager.showFullscreenBtn) {
            fullscreenBtn.style.display = 'flex';
        } else {
            fullscreenBtn.style.display = 'none';
        }
    }

    /**
     * Toggle fullscreen mode - 切换全屏模式
     */
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

    /**
     * Setup canvas zoom with Ctrl+scroll - 设置Ctrl+滚轮缩放
     */
    setupCanvasZoom() {
        const board = this.board;
        
        board.canvas.addEventListener('wheel', (e) => {
            // Only zoom if Ctrl key is pressed
            if (e.ctrlKey) {
                e.preventDefault();
                
                // Get mouse position relative to canvas
                const rect = board.canvas.getBoundingClientRect();
                const mouseX = e.clientX - rect.left;
                const mouseY = e.clientY - rect.top;
                
                // Calculate zoom delta
                const delta = e.deltaY > 0 ? -0.1 : 0.1;
                const oldScale = board.drawingEngine.canvasScale;
                const newScale = Math.max(0.5, Math.min(3.0, oldScale + delta));
                
                if (newScale !== oldScale) {
                    // Calculate the canvas point under the mouse before zoom
                    const canvasX = (mouseX - board.drawingEngine.panOffset.x * oldScale) / oldScale;
                    const canvasY = (mouseY - board.drawingEngine.panOffset.y * oldScale) / oldScale;
                    
                    // Update scale
                    board.drawingEngine.canvasScale = newScale;
                    
                    // Adjust pan offset to keep the same canvas point under the mouse
                    board.drawingEngine.panOffset.x = (mouseX - canvasX * newScale) / newScale;
                    board.drawingEngine.panOffset.y = (mouseY - canvasY * newScale) / newScale;
                    
                    // Save new values
                    localStorage.setItem('canvasScale', newScale);
                    localStorage.setItem('panOffsetX', board.drawingEngine.panOffset.x);
                    localStorage.setItem('panOffsetY', board.drawingEngine.panOffset.y);
                    
                    // Apply transform
                    this.updateZoomUI();
                    this.applyZoom(false); // Don't update config-area scale on zoom
                }
            }
        }, { passive: false });
    }
}
