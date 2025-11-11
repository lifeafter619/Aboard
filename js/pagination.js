/**
 * Pagination Module - 分页模块
 * Manages multi-page functionality for the whiteboard
 * 管理白板的多页功能
 * 
 * Features:
 * - Add, navigate between pages (添加、在页面之间导航)
 * - Save and restore page content (保存和恢复页面内容)
 * - Per-page background settings (每页独立的背景设置)
 * - Page UI updates (页面UI更新)
 */

class Pagination {
    /**
     * Constructor - 构造函数
     * @param {DrawingBoard} board - Reference to the main DrawingBoard instance
     */
    constructor(board) {
        this.board = board;
    }

    /**
     * Add a new page - 添加新页面
     */
    addPage() {
        const board = this.board;
        if (board.settingsManager.infiniteCanvas) return;
        
        // Save current page
        board.pages[board.currentPage - 1] = board.ctx.getImageData(0, 0, board.canvas.width, board.canvas.height);
        
        // Create new blank page
        board.pages.push(null);
        board.currentPage = board.pages.length;
        
        // Clear canvas for new page
        board.ctx.clearRect(0, 0, board.canvas.width, board.canvas.height);
        board.pages[board.currentPage - 1] = board.ctx.getImageData(0, 0, board.canvas.width, board.canvas.height);
        board.historyManager.saveState();
        this.updatePaginationUI();
    }

    /**
     * Navigate to previous page - 导航到上一页
     */
    prevPage() {
        const board = this.board;
        if (board.settingsManager.infiniteCanvas || board.currentPage <= 1) return;
        
        // Save current page and background
        board.pages[board.currentPage - 1] = board.ctx.getImageData(0, 0, board.canvas.width, board.canvas.height);
        if (!board.settingsManager.infiniteCanvas) {
            this.savePageBackground(board.currentPage);
        }
        
        // Go to previous page
        board.currentPage--;
        this.loadPage(board.currentPage);
        this.updatePaginationUI();
    }

    /**
     * Navigate to next page - 导航到下一页
     */
    nextPage() {
        const board = this.board;
        if (board.settingsManager.infiniteCanvas) return;
        
        // Save current page and background
        board.pages[board.currentPage - 1] = board.ctx.getImageData(0, 0, board.canvas.width, board.canvas.height);
        if (!board.settingsManager.infiniteCanvas) {
            this.savePageBackground(board.currentPage);
        }
        
        // Go to next page (create new if needed)
        board.currentPage++;
        if (board.currentPage > board.pages.length) {
            board.ctx.clearRect(0, 0, board.canvas.width, board.canvas.height);
            board.pages.push(board.ctx.getImageData(0, 0, board.canvas.width, board.canvas.height));
            board.historyManager.saveState();
        } else {
            this.loadPage(board.currentPage);
        }
        this.updatePaginationUI();
    }

    /**
     * Navigate to next page or add new page if on last page - 导航到下一页或在最后一页时添加新页
     */
    nextOrAddPage() {
        const board = this.board;
        if (board.settingsManager.infiniteCanvas) return;
        
        // Save current page and background
        board.pages[board.currentPage - 1] = board.ctx.getImageData(0, 0, board.canvas.width, board.canvas.height);
        if (!board.settingsManager.infiniteCanvas) {
            this.savePageBackground(board.currentPage);
        }
        
        // Check if we're on the last page
        if (board.currentPage >= board.pages.length) {
            // Add new page
            board.pages.push(null);
            board.currentPage = board.pages.length;
            board.ctx.clearRect(0, 0, board.canvas.width, board.canvas.height);
            board.pages[board.currentPage - 1] = board.ctx.getImageData(0, 0, board.canvas.width, board.canvas.height);
            board.historyManager.saveState();
        } else {
            // Go to next page
            board.currentPage++;
            this.loadPage(board.currentPage);
        }
        this.updatePaginationUI();
    }

    /**
     * Navigate to a specific page number - 导航到指定页码
     * @param {number} pageNumber - Target page number
     */
    goToPage(pageNumber) {
        const board = this.board;
        if (board.settingsManager.infiniteCanvas || pageNumber < 1 || pageNumber === board.currentPage) {
            this.updatePaginationUI();
            return;
        }
        
        // Save current page and background
        board.pages[board.currentPage - 1] = board.ctx.getImageData(0, 0, board.canvas.width, board.canvas.height);
        if (!board.settingsManager.infiniteCanvas) {
            this.savePageBackground(board.currentPage);
        }
        
        // Create new pages if needed
        while (pageNumber > board.pages.length) {
            board.pages.push(null);
        }
        
        board.currentPage = pageNumber;
        this.loadPage(board.currentPage);
        this.updatePaginationUI();
    }

    /**
     * Load a specific page - 加载指定页面
     * @param {number} pageNumber - Page number to load
     */
    loadPage(pageNumber) {
        const board = this.board;
        
        if (pageNumber > 0 && pageNumber <= board.pages.length && board.pages[pageNumber - 1]) {
            board.ctx.clearRect(0, 0, board.canvas.width, board.canvas.height);
            board.ctx.putImageData(board.pages[pageNumber - 1], 0, 0);
        } else {
            board.ctx.clearRect(0, 0, board.canvas.width, board.canvas.height);
            if (!board.pages[pageNumber - 1]) {
                board.pages[pageNumber - 1] = board.ctx.getImageData(0, 0, board.canvas.width, board.canvas.height);
            }
        }
        board.historyManager.saveState();
        
        // Restore page-specific background if exists
        this.restorePageBackground(pageNumber);
    }

    /**
     * Save background settings for a specific page - 保存指定页面的背景设置
     * @param {number} pageNumber - Page number
     */
    savePageBackground(pageNumber) {
        const board = this.board;
        
        // Save current background settings for this page
        board.pageBackgrounds[pageNumber] = {
            backgroundColor: board.backgroundManager.backgroundColor,
            backgroundPattern: board.backgroundManager.backgroundPattern,
            bgOpacity: board.backgroundManager.bgOpacity,
            patternIntensity: board.backgroundManager.patternIntensity,
            patternDensity: board.backgroundManager.patternDensity,
            backgroundImageData: board.backgroundManager.backgroundImageData,
            imageSize: board.backgroundManager.imageSize
        };
        localStorage.setItem('pageBackgrounds', JSON.stringify(board.pageBackgrounds));
    }

    /**
     * Restore background settings for a specific page - 恢复指定页面的背景设置
     * @param {number} pageNumber - Page number
     */
    restorePageBackground(pageNumber) {
        const board = this.board;
        
        // Restore background settings for this page
        if (board.pageBackgrounds[pageNumber]) {
            const bg = board.pageBackgrounds[pageNumber];
            board.backgroundManager.backgroundColor = bg.backgroundColor;
            board.backgroundManager.backgroundPattern = bg.backgroundPattern;
            board.backgroundManager.bgOpacity = bg.bgOpacity;
            board.backgroundManager.patternIntensity = bg.patternIntensity;
            board.backgroundManager.patternDensity = bg.patternDensity;
            board.backgroundManager.backgroundImageData = bg.backgroundImageData;
            board.backgroundManager.imageSize = bg.imageSize;
            
            // Load image if exists
            if (bg.backgroundImageData && bg.backgroundPattern === 'image') {
                const img = new Image();
                img.onload = () => {
                    board.backgroundManager.backgroundImage = img;
                    board.backgroundManager.drawBackground();
                };
                img.src = bg.backgroundImageData;
            } else {
                board.backgroundManager.drawBackground();
            }
            
            // Update UI to reflect current page background
            board.updateBackgroundUI();
        } else {
            // Use default/global background settings
            board.backgroundManager.drawBackground();
        }
    }

    /**
     * Update pagination UI - 更新分页UI
     * Shows/hides pagination controls and updates page indicators
     * 显示/隐藏分页控件并更新页面指示器
     */
    updatePaginationUI() {
        const board = this.board;
        const paginationControls = document.getElementById('pagination-controls');
        const pageInput = document.getElementById('page-input');
        const totalPages = document.getElementById('total-pages');
        const nextOrAddBtn = document.getElementById('next-or-add-page-btn');
        
        if (board.settingsManager.infiniteCanvas) {
            paginationControls.style.display = 'none';
        } else {
            paginationControls.style.display = 'flex';
            pageInput.value = board.currentPage;
            totalPages.textContent = board.pages.length;
            
            // Update next/add button appearance
            // 更新下一页/添加按钮的外观
            if (board.pages.length === 1) {
                // Only 1 page: show "+" icon to add page
                // 只有1页：显示"+"图标以添加页面
                nextOrAddBtn.innerHTML = `
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <line x1="12" y1="5" x2="12" y2="19"></line>
                        <line x1="5" y1="12" x2="19" y2="12"></line>
                    </svg>
                `;
                nextOrAddBtn.title = '添加新页';
            } else {
                // Multiple pages: show "→" icon for next page
                // 多页：显示"→"图标用于下一页
                nextOrAddBtn.innerHTML = `
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <polyline points="9 18 15 12 9 6"></polyline>
                    </svg>
                `;
                nextOrAddBtn.title = '下一页';
            }
        }
    }
}
