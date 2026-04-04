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
                        <h2>导出 / Export</h2>
                        <button id="export-close-btn" class="modal-close-btn" title="关闭">
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <line x1="18" y1="6" x2="6" y2="18"></line>
                                <line x1="6" y1="6" x2="18" y2="18"></line>
                            </svg>
                        </button>
                    </div>
                    <div class="modal-body">
                        <!-- Tabs -->
                        <div class="export-tab-nav">
                            <button class="export-tab-btn active" data-tab="image">导出图片</button>
                            <button class="export-tab-btn" data-tab="project">导出项目 (.zip)</button>
                        </div>

                        <!-- Image Export Tab -->
                        <div id="export-tab-image" class="export-tab-content active">
                            <div class="export-options">
                                <div class="export-group">
                                    <label>导出范围</label>
                                    <div class="button-size-options button-size-options-3">
                                        <button class="export-scope-btn active" data-scope="current">当前页</button>
                                        <button class="export-scope-btn" data-scope="all">全部页面</button>
                                        <button class="export-scope-btn" data-scope="specific">指定页面</button>
                                    </div>
                                </div>
                                <div class="export-group page-selection-group" style="display: none;">
                                    <label>选择要导出的页面</label>
                                    <div class="page-selection-buttons"></div>
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
                            </div>
                        </div>

                        <!-- Project Export Tab -->
                        <div id="export-tab-project" class="export-tab-content">
                            <div class="export-options">
                                <div class="export-group">
                                    <label>导出范围</label>
                                    <div class="button-size-options button-size-options-3">
                                        <button class="export-project-scope-btn active" data-scope="current">当前页</button>
                                        <button class="export-project-scope-btn" data-scope="all">全部页面</button>
                                        <button class="export-project-scope-btn" data-scope="specific">指定页面</button>
                                    </div>
                                </div>
                                <div class="export-group project-page-selection-group" style="display: none;">
                                    <label>选择要导出的页面</label>
                                    <div class="project-page-selection-buttons page-selection-buttons"></div>
                                </div>
                                <div class="export-group">
                                    <p class="export-hint">
                                        导出为标准 .zip 项目包，包含页面场景、背景和资源库。导入后可继续逐页对象级编辑；旧版 .aboard 仅在设置中开启兼容后按需导入。
                                    </p>
                                </div>
                            </div>
                        </div>

                        <!-- Shared Filename & Actions -->
                        <div style="margin-top: 20px;">
                            <div class="export-group" id="filename-group">
                                <label id="filename-label">文件名</label>
                                <input type="text" id="export-filename" class="export-filename-input" value="aboard-export" placeholder="输入文件名">
                                <p class="export-hint" id="export-filename-hint" style="display: none;">导出多个页面时，将自动在文件名后添加页码</p>
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
        // Tab Switching
        document.querySelectorAll('.export-tab-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const tab = e.target.dataset.tab;

                // Update active tab button
                document.querySelectorAll('.export-tab-btn').forEach(b => b.classList.remove('active'));
                e.target.classList.add('active');

                // Show content
                document.querySelectorAll('.export-tab-content').forEach(c => c.classList.remove('active'));
                document.getElementById(`export-tab-${tab}`).classList.add('active');
            });
        });

        // Image Export Scope
        document.querySelectorAll('.export-scope-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                document.querySelectorAll('.export-scope-btn').forEach(b => b.classList.remove('active'));
                e.target.classList.add('active');
                
                const scope = e.target.dataset.scope;
                this.updateUIForScope(scope, 'image');
            });
        });

        // Project Export Scope
        document.querySelectorAll('.export-project-scope-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                document.querySelectorAll('.export-project-scope-btn').forEach(b => b.classList.remove('active'));
                e.target.classList.add('active');

                const scope = e.target.dataset.scope;
                this.updateUIForScope(scope, 'project');
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
            this.handleExportConfirm();
        });
        
        // Click outside to close
        this.exportModal.addEventListener('click', (e) => {
            if (e.target.id === 'export-modal') {
                this.closeModal();
            }
        });
    }
    
    updateUIForScope(scope, type) {
        let selectionGroup, buttonsContainer;

        if (type === 'image') {
            selectionGroup = document.querySelector('.page-selection-group');
            buttonsContainer = document.querySelector('.page-selection-buttons');
        } else {
            selectionGroup = document.querySelector('.project-page-selection-group');
            buttonsContainer = document.querySelector('.project-page-selection-buttons');
        }

        const filenameHint = document.getElementById('export-filename-hint');
        const filenameLabel = document.getElementById('filename-label');
        
        // Update selection UI
        if (scope === 'specific') {
            selectionGroup.style.display = 'block';
            this.generatePageSelectionButtons(buttonsContainer);
        } else {
            selectionGroup.style.display = 'none';
        }

        // Update filename hint (only relevant for Image export "All/Specific" where it generates multiple files)
        // For project export, it's always one file
        if (type === 'image' && (scope === 'all' || scope === 'specific')) {
            filenameHint.style.display = 'block';
            filenameLabel.textContent = '文件名前缀';
        } else {
            filenameHint.style.display = 'none';
            filenameLabel.textContent = '文件名';
        }
    }
    
    generatePageSelectionButtons(container) {
        if (!container) return;
        
        container.innerHTML = '';
        
        if (!this.drawingBoard || !this.drawingBoard.pages) {
            container.innerHTML = `<p class="export-hint">${window.i18n.t('export.paginationRequired')}</p>`;
            return;
        }
        
        const pageCount = this.drawingBoard.pages.length;
        if (pageCount === 0) {
            container.innerHTML = `<p class="export-hint">${window.i18n.t('export.noPages')}</p>`;
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

    handleExportConfirm() {
        const activeTab = document.querySelector('.export-tab-btn.active').dataset.tab;

        if (activeTab === 'image') {
            this.exportCanvas().catch(error => {
                console.error('Export failed:', error);
                const message = window.i18n?.t('export.failed') || '导出失败，请重试';
                window.appDialog?.showAlert?.(message, 'error');
            });
        } else {
            this.exportProject();
        }
    }

    exportProject() {
        const scope = document.querySelector('.export-project-scope-btn.active').dataset.scope;
        const filename = document.getElementById('export-filename').value || 'aboard-project';

        let selectedPages = [];
        if (scope === 'specific') {
            const selectedButtons = document.querySelectorAll('.project-page-selection-buttons .page-selection-btn.selected');
            if (selectedButtons.length === 0) {
                const msg = window.i18n?.t('export.selectAtLeastOnePage') || '请至少选择一个页面进行导出';
                window.appDialog?.showAlert(msg, 'warning');
                return;
            }
            selectedPages = Array.from(selectedButtons).map(btn => parseInt(btn.dataset.pageNum));
        }

        if (this.drawingBoard.projectManager) {
            this.drawingBoard.projectManager.exportProject(scope, filename, selectedPages);
            this.closeModal();
        } else {
            console.error('ProjectManager not found');
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

        // Reset tab state
        document.querySelectorAll('.export-tab-btn').forEach(b => b.classList.remove('active'));
        document.querySelector('.export-tab-btn[data-tab="image"]')?.classList.add('active');
        document.querySelectorAll('.export-tab-content').forEach(c => c.classList.remove('active'));
        document.getElementById('export-tab-image')?.classList.add('active');

        // Reset image export state
        document.querySelectorAll('.export-scope-btn').forEach(b => b.classList.remove('active'));
        document.querySelector('.export-scope-btn[data-scope="current"]')?.classList.add('active');
        document.querySelectorAll('.export-format-btn').forEach(b => b.classList.remove('active'));
        document.querySelector('.export-format-btn[data-format="png"]')?.classList.add('active');
        const qualityGroup = document.getElementById('jpeg-quality-group');
        const qualitySlider = document.getElementById('export-quality-slider');
        const qualityValue = document.getElementById('export-quality-value');
        if (qualitySlider) qualitySlider.value = '90';
        if (qualityValue) qualityValue.textContent = '90';
        if (qualityGroup) qualityGroup.style.display = 'none';
        this.updateUIForScope('current', 'image');

        // Reset project export state
        document.querySelectorAll('.export-project-scope-btn').forEach(b => b.classList.remove('active'));
        document.querySelector('.export-project-scope-btn[data-scope="current"]')?.classList.add('active');
        this.updateUIForScope('current', 'project');
        
        this.exportModal.classList.add('show');
    }
    
    closeModal() {
        this.exportModal.classList.remove('show');
    }

    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    loadImage(source) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => resolve(img);
            img.onerror = reject;
            img.src = source;
        });
    }

    getLogicalCanvasSize() {
        const size = this.drawingBoard?.backgroundManager?.getCanvasLogicalSize?.();
        if (size?.width && size?.height) {
            return size;
        }

        const dpr = window.devicePixelRatio || 1;
        return {
            width: this.canvas.clientWidth || (this.canvas.width / dpr),
            height: this.canvas.clientHeight || (this.canvas.height / dpr)
        };
    }

    async drawSvgDocument(tempCtx, svgDocument, outputWidth, outputHeight) {
        if (!svgDocument) return;
        const source = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svgDocument)}`;
        const svgImage = await this.loadImage(source);
        tempCtx.drawImage(svgImage, 0, 0, outputWidth, outputHeight);
    }

    async drawBackgroundImage(tempCtx, outputWidth, outputHeight) {
        const backgroundManager = this.drawingBoard?.backgroundManager;
        if (!backgroundManager || backgroundManager.backgroundPattern !== 'image' || !backgroundManager.backgroundImageData) {
            return;
        }

        const logicalSize = this.getLogicalCanvasSize();
        const scaleX = outputWidth / logicalSize.width;
        const scaleY = outputHeight / logicalSize.height;
        const image = await this.loadImage(backgroundManager.backgroundImageData);
        let transform = backgroundManager.getBackgroundImageTransform?.();

        if (!transform) {
            const width = image.naturalWidth * (backgroundManager.imageSize || 1);
            const height = image.naturalHeight * (backgroundManager.imageSize || 1);
            transform = {
                x: (logicalSize.width - width) / 2,
                y: (logicalSize.height - height) / 2,
                width,
                height,
                rotation: 0,
                flipHorizontal: false,
                flipVertical: false
            };
        }

        tempCtx.save();
        tempCtx.globalAlpha = backgroundManager.patternIntensity ?? 1;
        tempCtx.translate((transform.x + transform.width / 2) * scaleX, (transform.y + transform.height / 2) * scaleY);
        tempCtx.rotate(((transform.rotation || 0) * Math.PI) / 180);
        tempCtx.scale(transform.flipHorizontal ? -1 : 1, transform.flipVertical ? -1 : 1);
        tempCtx.drawImage(
            image,
            -(transform.width * scaleX) / 2,
            -(transform.height * scaleY) / 2,
            transform.width * scaleX,
            transform.height * scaleY
        );
        tempCtx.restore();
    }

    async renderCurrentPageToCanvas(tempCanvas, tempCtx) {
        const backgroundManager = this.drawingBoard?.backgroundManager;
        const logicalSize = this.getLogicalCanvasSize();

        tempCtx.clearRect(0, 0, tempCanvas.width, tempCanvas.height);
        tempCtx.drawImage(this.bgCanvas, 0, 0);
        await this.drawBackgroundImage(tempCtx, tempCanvas.width, tempCanvas.height);

        if (backgroundManager) {
            await this.drawSvgDocument(
                tempCtx,
                backgroundManager.getBackgroundPatternSvgDocument?.(logicalSize.width, logicalSize.height),
                tempCanvas.width,
                tempCanvas.height
            );
        }

        tempCtx.drawImage(this.canvas, 0, 0);

        if (backgroundManager) {
            await this.drawSvgDocument(
                tempCtx,
                backgroundManager.getCoordinateOverlaySvgDocument?.(logicalSize.width, logicalSize.height),
                tempCanvas.width,
                tempCanvas.height
            );
        }
    }

    downloadCanvas(tempCanvas, filename, format, quality) {
        const dataURL = format === 'jpeg'
            ? tempCanvas.toDataURL('image/jpeg', quality)
            : tempCanvas.toDataURL('image/png');

        const link = document.createElement('a');
        link.download = `${filename}.${format}`;
        link.href = dataURL;
        link.click();
    }
    
    async exportCanvas() {
        const scope = document.querySelector('.export-scope-btn.active').dataset.scope;
        const format = document.querySelector('.export-format-btn.active').dataset.format;
        const filename = document.getElementById('export-filename').value || 'aboard-export';
        const quality = parseInt(document.getElementById('export-quality-slider').value) / 100;

        this.closeModal();

        if (scope === 'current') {
            await this.exportSinglePage(filename, format, quality);
        } else if (scope === 'all' && this.drawingBoard) {
            await this.exportAllPages(filename, format, quality);
        } else if (scope === 'specific' && this.drawingBoard) {
            await this.exportSpecificPages(filename, format, quality);
        } else {
            await this.exportSinglePage(filename, format, quality);
        }
    }
    
    async exportSinglePage(filename, format, quality) {
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = this.canvas.width;
        tempCanvas.height = this.canvas.height;
        const tempCtx = tempCanvas.getContext('2d');

        await this.renderCurrentPageToCanvas(tempCanvas, tempCtx);
        this.downloadCanvas(tempCanvas, filename, format, quality);
    }
    
    async exportAllPages(baseFilename, format, quality) {
        if (!this.drawingBoard || !this.drawingBoard.pages || this.drawingBoard.pages.length === 0) {
            await this.exportSinglePage(baseFilename, format, quality);
            return;
        }

        const currentPage = this.drawingBoard.currentPage;
        try {
            for (let pageNum = 1; pageNum <= this.drawingBoard.pages.length; pageNum++) {
                if (this.drawingBoard.currentPage !== pageNum) {
                    this.drawingBoard.goToPage(pageNum);
                }
                await this.sleep(160);
                await this.exportSinglePage(`${baseFilename}-${pageNum}`, format, quality);
                await this.sleep(80);
            }
        } finally {
            if (currentPage !== this.drawingBoard.currentPage) {
                this.drawingBoard.goToPage(currentPage);
            }
        }
    }
    
    async exportSpecificPages(baseFilename, format, quality) {
        if (!this.drawingBoard || !this.drawingBoard.pages || this.drawingBoard.pages.length === 0) {
            await this.exportSinglePage(baseFilename, format, quality);
            return;
        }
        
        const selectedButtons = document.querySelectorAll('.page-selection-group .page-selection-buttons .page-selection-btn.selected');
        if (selectedButtons.length === 0) {
            window.appDialog?.showAlert(window.i18n.t('export.selectAtLeastOnePage') || '请至少选择一个页面进行导出', 'warning');
            return;
        }
        
        const selectedPages = Array.from(selectedButtons).map(btn => parseInt(btn.dataset.pageNum));
        selectedPages.sort((a, b) => a - b);
        const currentPage = this.drawingBoard.currentPage;

        try {
            for (const pageNum of selectedPages) {
                if (this.drawingBoard.currentPage !== pageNum) {
                    this.drawingBoard.goToPage(pageNum);
                }
                await this.sleep(160);
                await this.exportSinglePage(`${baseFilename}-${pageNum}`, format, quality);
                await this.sleep(80);
            }
        } finally {
            if (currentPage !== this.drawingBoard.currentPage) {
                this.drawingBoard.goToPage(currentPage);
            }
        }
    }
}

if (typeof window !== 'undefined') {
    window.ExportManager = ExportManager;
}
