// Export Module
// Handles exporting canvas content to image files

class ExportManager {
    constructor(canvas, bgCanvas, drawingBoard = null) {
        this.canvas = canvas;
        this.bgCanvas = bgCanvas;
        this.drawingBoard = drawingBoard;
        this.exportModal = null;
        
        this.createExportModal();
        this.setupEventListeners();
    }
    
    createExportModal() {
        const modalHTML = `
            <div id="export-modal" class="modal">
                <div class="modal-content export-modal-content">
                    <div class="modal-header">
                        <h2>导出画布</h2>
                        <button id="export-close-btn" class="modal-close-btn" title="关闭">
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <line x1="18" y1="6" x2="6" y2="18"></line>
                                <line x1="6" y1="6" x2="18" y2="18"></line>
                            </svg>
                        </button>
                    </div>
                    <div class="modal-body">
                        <div class="export-options">
                            <div class="export-group">
                                <label>导出范围</label>
                                <div class="button-size-options button-size-options-3">
                                    <button class="export-scope-btn active" data-scope="current">当前页</button>
                                    <button class="export-scope-btn" data-scope="all">全部页面</button>
                                    <button class="export-scope-btn" data-scope="specific">指定页面</button>
                                </div>
                            </div>
                            <div class="export-group" id="page-selection-group" style="display: none;">
                                <label>选择要导出的页面</label>
                                <div id="page-selection-buttons" class="page-selection-buttons"></div>
                            </div>
                            <div class="export-group">
                                <label>图片格式</label>
                                <div class="button-size-options button-size-options-2">
                                    <button class="export-format-btn active" data-format="png">PNG</button>
                                    <button class="export-format-btn" data-format="jpeg">JPEG</button>
                                </div>
                            </div>
                            <div class="export-group" id="jpeg-quality-group" style="display: none;">
                                <label>图片质量 <span id="export-quality-value">90</span>%</label>
                                <input type="range" id="export-quality-slider" min="1" max="100" value="90" class="slider">
                            </div>
                            <div class="export-group" id="filename-group">
                                <label id="filename-label">文件名</label>
                                <input type="text" id="export-filename" class="export-filename-input" value="aboard-export" placeholder="输入文件名">
                                <p class="export-hint" id="export-filename-hint" style="display: none;">导出多个页面时，将自动在文件名后添加页码（例如：文件名-1, 文件名-2）</p>
                            </div>
                            <div class="export-actions">
                                <button id="export-cancel-btn" class="button-secondary">取消</button>
                                <button id="export-confirm-btn" class="button-primary">
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="vertical-align: middle; margin-right: 5px;">
                                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                                        <polyline points="7 10 12 15 17 10"></polyline>
                                        <line x1="12" y1="15" x2="12" y2="3"></line>
                                    </svg>
                                    导出
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        document.body.insertAdjacentHTML('beforeend', modalHTML);
        this.exportModal = document.getElementById('export-modal');
    }
    
    setupEventListeners() {
        // Export scope buttons
        document.querySelectorAll('.export-scope-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                document.querySelectorAll('.export-scope-btn').forEach(b => b.classList.remove('active'));
                e.target.classList.add('active');
                
                const scope = e.target.dataset.scope;
                this.updateUIForScope(scope);
            });
        });
        
        // Format buttons
        document.querySelectorAll('.export-format-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                document.querySelectorAll('.export-format-btn').forEach(b => b.classList.remove('active'));
                e.target.classList.add('active');
                
                // Show/hide quality slider for JPEG
                const format = e.target.dataset.format;
                const qualityGroup = document.getElementById('jpeg-quality-group');
                if (format === 'jpeg') {
                    qualityGroup.style.display = 'block';
                } else {
                    qualityGroup.style.display = 'none';
                }
            });
        });
        
        // Quality slider
        const qualitySlider = document.getElementById('export-quality-slider');
        const qualityValue = document.getElementById('export-quality-value');
        qualitySlider.addEventListener('input', (e) => {
            qualityValue.textContent = e.target.value;
        });
        
        // Close buttons
        document.getElementById('export-close-btn').addEventListener('click', () => {
            this.closeModal();
        });
        
        document.getElementById('export-cancel-btn').addEventListener('click', () => {
            this.closeModal();
        });
        
        // Confirm export
        document.getElementById('export-confirm-btn').addEventListener('click', () => {
            this.exportCanvas();
        });
        
        // Click outside to close
        this.exportModal.addEventListener('click', (e) => {
            if (e.target.id === 'export-modal') {
                this.closeModal();
            }
        });
    }
    
    updateUIForScope(scope) {
        const pageSelectionGroup = document.getElementById('page-selection-group');
        const filenameHint = document.getElementById('export-filename-hint');
        const filenameLabel = document.getElementById('filename-label');
        
        if (scope === 'specific') {
            pageSelectionGroup.style.display = 'block';
            filenameHint.style.display = 'block';
            filenameLabel.textContent = '文件名前缀';
            this.generatePageSelectionButtons();
        } else if (scope === 'all') {
            pageSelectionGroup.style.display = 'none';
            filenameHint.style.display = 'block';
            filenameLabel.textContent = '文件名前缀';
        } else {
            pageSelectionGroup.style.display = 'none';
            filenameHint.style.display = 'none';
            filenameLabel.textContent = '文件名';
        }
    }
    
    generatePageSelectionButtons() {
        const container = document.getElementById('page-selection-buttons');
        if (!container) return;
        
        container.innerHTML = '';
        
        if (!this.drawingBoard || !this.drawingBoard.pages) {
            container.innerHTML = '<p class="export-hint">当前为无限画布模式，请在设置中启用分页模式以使用此功能。</p>';
            return;
        }
        
        const pageCount = this.drawingBoard.pages.length;
        if (pageCount === 0) {
            container.innerHTML = '<p class="export-hint">没有可导出的页面。</p>';
            return;
        }
        
        // Create a checkbox button for each page (show even if there's only 1 page)
        for (let i = 0; i < pageCount; i++) {
            const pageNum = i + 1;
            const button = document.createElement('button');
            button.className = 'page-selection-btn';
            button.dataset.pageNum = pageNum;
            button.textContent = pageNum;
            
            // Select current page by default
            if (this.drawingBoard.currentPage === pageNum) {
                button.classList.add('selected');
            }
            
            button.addEventListener('click', () => {
                button.classList.toggle('selected');
            });
            
            container.appendChild(button);
        }
    }
    
    showModal() {
        // Set default filename with timestamp in user's current timezone
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');
        const hours = String(now.getHours()).padStart(2, '0');
        const minutes = String(now.getMinutes()).padStart(2, '0');
        const seconds = String(now.getSeconds()).padStart(2, '0');
        const timestamp = `${year}-${month}-${day}T${hours}-${minutes}-${seconds}`;
        document.getElementById('export-filename').value = `aboard-${timestamp}`;
        
        // Reset to current page scope
        document.querySelectorAll('.export-scope-btn').forEach(b => b.classList.remove('active'));
        document.querySelector('.export-scope-btn[data-scope="current"]').classList.add('active');
        this.updateUIForScope('current');
        
        this.exportModal.classList.add('show');
    }
    
    closeModal() {
        this.exportModal.classList.remove('show');
    }
    
    exportCanvas() {
        const scope = document.querySelector('.export-scope-btn.active').dataset.scope;
        const format = document.querySelector('.export-format-btn.active').dataset.format;
        const filename = document.getElementById('export-filename').value || 'aboard-export';
        const quality = parseInt(document.getElementById('export-quality-slider').value) / 100;
        
        if (scope === 'current') {
            // Export current page
            this.exportSinglePage(filename, format, quality);
        } else if (scope === 'all' && this.drawingBoard) {
            // Export all pages
            this.exportAllPages(filename, format, quality);
        } else if (scope === 'specific' && this.drawingBoard) {
            // Export specific pages
            this.exportSpecificPages(filename, format, quality);
        } else {
            // Fallback to current page if drawingBoard is not available
            this.exportSinglePage(filename, format, quality);
        }
        
        this.closeModal();
    }
    
    exportSinglePage(filename, format, quality) {
        // Create a temporary canvas to combine background and main canvas
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = this.canvas.width;
        tempCanvas.height = this.canvas.height;
        const tempCtx = tempCanvas.getContext('2d');
        
        // Draw background canvas first
        tempCtx.drawImage(this.bgCanvas, 0, 0);
        
        // Draw main canvas on top
        tempCtx.drawImage(this.canvas, 0, 0);
        
        // Convert to data URL based on format
        let dataURL;
        if (format === 'jpeg') {
            dataURL = tempCanvas.toDataURL('image/jpeg', quality);
        } else {
            dataURL = tempCanvas.toDataURL('image/png');
        }
        
        // Create download link
        const link = document.createElement('a');
        link.download = `${filename}.${format}`;
        link.href = dataURL;
        link.click();
    }
    
    exportAllPages(baseFilename, format, quality) {
        if (!this.drawingBoard || !this.drawingBoard.pages || this.drawingBoard.pages.length === 0) {
            // No pages to export, just export current
            this.exportSinglePage(baseFilename, format, quality);
            return;
        }
        
        // Save current state
        const currentPage = this.drawingBoard.currentPage;
        
        // Export each page sequentially
        const exportPage = (pageIndex) => {
            if (pageIndex >= this.drawingBoard.pages.length) {
                // All pages exported, restore original page
                if (currentPage !== this.drawingBoard.currentPage) {
                    this.drawingBoard.goToPage(currentPage);
                }
                return;
            }
            
            const pageNum = pageIndex + 1;
            
            // Switch to page
            if (this.drawingBoard.currentPage !== pageNum) {
                this.drawingBoard.goToPage(pageNum);
            }
            
            // Wait a bit for the page to render
            setTimeout(() => {
                const filename = `${baseFilename}-${pageNum}`;
                this.exportSinglePage(filename, format, quality);
                
                // Export next page
                setTimeout(() => {
                    exportPage(pageIndex + 1);
                }, 100);
            }, 100);
        };
        
        // Start exporting from the first page
        exportPage(0);
    }
    
    exportSpecificPages(baseFilename, format, quality) {
        if (!this.drawingBoard || !this.drawingBoard.pages || this.drawingBoard.pages.length === 0) {
            // No pages to export, just export current
            this.exportSinglePage(baseFilename, format, quality);
            return;
        }
        
        // Get selected page buttons
        const selectedButtons = document.querySelectorAll('.page-selection-btn.selected');
        if (selectedButtons.length === 0) {
            alert('请至少选择一个页面进行导出');
            return;
        }
        
        // Get selected page numbers
        const selectedPages = Array.from(selectedButtons).map(btn => parseInt(btn.dataset.pageNum));
        selectedPages.sort((a, b) => a - b);
        
        // Save current state
        const currentPage = this.drawingBoard.currentPage;
        
        // Export selected pages sequentially
        const exportPage = (pageIndex) => {
            if (pageIndex >= selectedPages.length) {
                // All selected pages exported, restore original page
                if (currentPage !== this.drawingBoard.currentPage) {
                    this.drawingBoard.goToPage(currentPage);
                }
                return;
            }
            
            const pageNum = selectedPages[pageIndex];
            
            // Switch to page
            if (this.drawingBoard.currentPage !== pageNum) {
                this.drawingBoard.goToPage(pageNum);
            }
            
            // Wait a bit for the page to render
            setTimeout(() => {
                const filename = `${baseFilename}-${pageNum}`;
                this.exportSinglePage(filename, format, quality);
                
                // Export next page
                setTimeout(() => {
                    exportPage(pageIndex + 1);
                }, 100);
            }, 100);
        };
        
        // Start exporting from the first selected page
        exportPage(0);
    }
}
