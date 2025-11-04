// Export Module
// Handles exporting canvas content to image files

class ExportManager {
    constructor(canvas, bgCanvas) {
        this.canvas = canvas;
        this.bgCanvas = bgCanvas;
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
                            <div class="export-group">
                                <label>文件名</label>
                                <input type="text" id="export-filename" class="export-filename-input" value="aboard-export" placeholder="输入文件名">
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
    
    showModal() {
        // Set default filename with timestamp (format: YYYY-MM-DDTHH-MM-SS)
        const now = new Date();
        const timestamp = now.toISOString().slice(0, 19).replace(/:/g, '-');
        document.getElementById('export-filename').value = `aboard-${timestamp}`;
        this.exportModal.classList.add('show');
    }
    
    closeModal() {
        this.exportModal.classList.remove('show');
    }
    
    exportCanvas() {
        const format = document.querySelector('.export-format-btn.active').dataset.format;
        const filename = document.getElementById('export-filename').value || 'aboard-export';
        const quality = parseInt(document.getElementById('export-quality-slider').value) / 100;
        
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
        
        this.closeModal();
    }
}
