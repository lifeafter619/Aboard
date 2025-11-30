/**
 * Shape Drawing Module
 * Handles shape drawing functionality including lines, rectangles, circles, etc.
 */

class ShapeDrawingManager {
    constructor(canvas, ctx, historyManager, backgroundManager) {
        this.canvas = canvas;
        this.ctx = ctx;
        this.historyManager = historyManager;
        this.backgroundManager = backgroundManager;
        
        // Current shape settings
        this.currentShape = 'line';
        this.strokeColor = '#000000';
        this.strokeWidth = 3;
        this.fillColor = 'transparent';
        
        // Drawing state
        this.isDrawing = false;
        this.startPoint = null;
        this.endPoint = null;
        this.previewActive = false;
        
        // Canvas image data for preview restoration
        this.canvasImageData = null;
        
        // Modal element
        this.modal = null;
        
        // Bind event handlers
        this.handleCanvasClick = this.handleCanvasClick.bind(this);
        this.handleCanvasMouseMove = this.handleCanvasMouseMove.bind(this);
        this.handleCanvasMouseDown = this.handleCanvasMouseDown.bind(this);
        this.handleCanvasMouseUp = this.handleCanvasMouseUp.bind(this);
        
        this.initModal();
    }
    
    /**
     * Initialize the shape selection modal
     */
    initModal() {
        // Create modal HTML
        const modalHTML = `
            <div id="shape-modal" class="modal">
                <div class="modal-content shape-modal-content">
                    <div class="modal-header">
                        <h2 data-i18n="shapes.title">形状</h2>
                        <button id="shape-modal-close-btn" class="modal-close-btn" title="关闭">
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <line x1="18" y1="6" x2="6" y2="18"></line>
                                <line x1="6" y1="6" x2="18" y2="18"></line>
                            </svg>
                        </button>
                    </div>
                    <div class="modal-body shape-modal-body">
                        <div class="shape-options">
                            <button class="shape-option-btn active" data-shape="line" title="直线">
                                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <line x1="5" y1="19" x2="19" y2="5"></line>
                                </svg>
                                <span data-i18n="shapes.line">直线</span>
                            </button>
                        </div>
                        <div class="shape-settings">
                            <div class="shape-setting-group">
                                <label data-i18n="shapes.strokeColor">线条颜色</label>
                                <div class="color-picker-row">
                                    <div class="color-picker-main">
                                        <button class="color-btn active" data-shape-color="#000000" style="background-color: #000000;" title="黑色"></button>
                                        <button class="color-btn" data-shape-color="#FF0000" style="background-color: #FF0000;" title="红色"></button>
                                        <button class="color-btn" data-shape-color="#0000FF" style="background-color: #0000FF;" title="蓝色"></button>
                                        <button class="color-btn" data-shape-color="#00FF00" style="background-color: #00FF00;" title="绿色"></button>
                                    </div>
                                    <div class="color-picker-main">
                                        <button class="color-btn" data-shape-color="#FFFF00" style="background-color: #FFFF00; border: 1px solid #ccc;" title="黄色"></button>
                                        <button class="color-btn" data-shape-color="#FF8800" style="background-color: #FF8800;" title="橙色"></button>
                                        <button class="color-btn" data-shape-color="#8800FF" style="background-color: #8800FF;" title="紫色"></button>
                                        <button class="color-btn" data-shape-color="#FFFFFF" style="background-color: #FFFFFF; border: 1px solid #ccc;" title="白色"></button>
                                    </div>
                                </div>
                                <label class="color-picker-icon-btn" for="shape-custom-color-picker" title="取色器">
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                        <path d="M20 14.66V20a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h5.34"></path>
                                        <polygon points="18 2 22 6 12 16 8 16 8 12 18 2"></polygon>
                                    </svg>
                                    <input type="color" id="shape-custom-color-picker" class="custom-color-picker-input" value="#000000">
                                </label>
                            </div>
                            <div class="shape-setting-group">
                                <label data-i18n="shapes.strokeWidth">线条粗细：<span id="shape-stroke-width-value">3</span>px</label>
                                <input type="range" id="shape-stroke-width-slider" min="1" max="20" value="3" class="slider">
                            </div>
                        </div>
                        <div class="shape-hint">
                            <p data-i18n="shapes.lineHint">点击画布上的两个点来绘制直线</p>
                        </div>
                        <div class="shape-action-buttons">
                            <button id="shape-start-drawing-btn" class="shape-action-btn primary" data-i18n="shapes.startDrawing">开始绘制</button>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        // Append modal to body
        const modalContainer = document.createElement('div');
        modalContainer.innerHTML = modalHTML;
        document.body.appendChild(modalContainer.firstElementChild);
        
        this.modal = document.getElementById('shape-modal');
        
        // Setup event listeners
        this.setupModalEventListeners();
    }
    
    /**
     * Setup modal event listeners
     */
    setupModalEventListeners() {
        // Close button
        document.getElementById('shape-modal-close-btn').addEventListener('click', () => {
            this.hideModal();
        });
        
        // Click outside to close
        this.modal.addEventListener('click', (e) => {
            if (e.target === this.modal) {
                this.hideModal();
            }
        });
        
        // Shape option buttons
        document.querySelectorAll('.shape-option-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const shape = e.currentTarget.dataset.shape;
                this.selectShape(shape);
                document.querySelectorAll('.shape-option-btn').forEach(b => b.classList.remove('active'));
                e.currentTarget.classList.add('active');
            });
        });
        
        // Color buttons
        document.querySelectorAll('.color-btn[data-shape-color]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.strokeColor = e.target.dataset.shapeColor;
                document.querySelectorAll('.color-btn[data-shape-color]').forEach(b => b.classList.remove('active'));
                e.target.classList.add('active');
            });
        });
        
        // Custom color picker
        const customColorPicker = document.getElementById('shape-custom-color-picker');
        if (customColorPicker) {
            customColorPicker.addEventListener('input', (e) => {
                this.strokeColor = e.target.value;
                document.querySelectorAll('.color-btn[data-shape-color]').forEach(b => b.classList.remove('active'));
            });
        }
        
        // Stroke width slider
        const strokeWidthSlider = document.getElementById('shape-stroke-width-slider');
        const strokeWidthValue = document.getElementById('shape-stroke-width-value');
        if (strokeWidthSlider && strokeWidthValue) {
            strokeWidthSlider.addEventListener('input', (e) => {
                this.strokeWidth = parseInt(e.target.value);
                strokeWidthValue.textContent = e.target.value;
            });
        }
        
        // Start drawing button
        document.getElementById('shape-start-drawing-btn').addEventListener('click', () => {
            this.startDrawingMode();
        });
    }
    
    /**
     * Show the shape selection modal
     */
    showModal() {
        if (this.modal) {
            this.modal.classList.add('show');
            // Apply i18n translations if available
            if (window.i18n) {
                this.applyTranslations();
            }
        }
    }
    
    /**
     * Hide the shape selection modal
     */
    hideModal() {
        if (this.modal) {
            this.modal.classList.remove('show');
        }
    }
    
    /**
     * Apply i18n translations to modal elements
     */
    applyTranslations() {
        if (!window.i18n) return;
        
        // Modal title
        const modalTitle = this.modal.querySelector('h2[data-i18n]');
        if (modalTitle) {
            const key = modalTitle.getAttribute('data-i18n');
            const translation = window.i18n.t(key);
            if (translation !== key) {
                modalTitle.textContent = translation;
            }
        }
        
        // Translate all elements with data-i18n attribute
        this.modal.querySelectorAll('[data-i18n]').forEach(el => {
            const key = el.getAttribute('data-i18n');
            const translation = window.i18n.t(key);
            if (translation !== key) {
                if (el.tagName === 'SPAN' || el.tagName === 'P' || el.tagName === 'LABEL' || el.tagName === 'H2') {
                    // Check if element has child elements we should preserve
                    const childSpan = el.querySelector('span');
                    if (childSpan && el.tagName === 'LABEL') {
                        // For labels with value spans, only update the first text node
                        const textPart = translation.split('：')[0] + '：';
                        const firstTextNode = Array.from(el.childNodes).find(node => node.nodeType === Node.TEXT_NODE);
                        if (firstTextNode) {
                            firstTextNode.textContent = textPart;
                        }
                    } else {
                        el.textContent = translation;
                    }
                } else if (el.tagName === 'BUTTON' && el.querySelector('span')) {
                    // Button with icon and span
                    el.querySelector('span').textContent = translation;
                } else if (el.tagName === 'BUTTON') {
                    el.textContent = translation;
                }
            }
        });
        
        // Translate close button title
        const closeBtn = document.getElementById('shape-modal-close-btn');
        if (closeBtn) {
            closeBtn.title = window.i18n.t('common.close');
        }
    }
    
    /**
     * Select a shape type
     */
    selectShape(shape) {
        this.currentShape = shape;
        
        // Update hint text based on shape
        const hint = this.modal.querySelector('.shape-hint p');
        if (hint && window.i18n) {
            switch(shape) {
                case 'line':
                    hint.textContent = window.i18n.t('shapes.lineHint');
                    break;
                default:
                    hint.textContent = window.i18n.t('shapes.lineHint');
            }
        }
    }
    
    /**
     * Start shape drawing mode
     */
    startDrawingMode() {
        this.hideModal();
        this.isDrawing = true;
        this.startPoint = null;
        this.endPoint = null;
        
        // Change cursor to crosshair
        this.canvas.style.cursor = 'crosshair';
        
        // Save current canvas state for preview
        this.canvasImageData = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
        
        // Add event listeners for drawing
        this.canvas.addEventListener('click', this.handleCanvasClick);
        this.canvas.addEventListener('mousemove', this.handleCanvasMouseMove);
        
        // Show instruction message
        this.showDrawingInstruction();
    }
    
    /**
     * Show drawing instruction overlay
     */
    showDrawingInstruction() {
        // Create instruction overlay if not exists
        let overlay = document.getElementById('shape-drawing-instruction');
        if (!overlay) {
            overlay = document.createElement('div');
            overlay.id = 'shape-drawing-instruction';
            overlay.className = 'shape-drawing-instruction';
            document.body.appendChild(overlay);
        }
        
        // Set instruction text based on shape and state
        const instructionKey = this.startPoint ? 'shapes.clickSecondPoint' : 'shapes.clickFirstPoint';
        overlay.textContent = window.i18n ? window.i18n.t(instructionKey) : (this.startPoint ? '点击第二个点完成绘制' : '点击第一个点开始绘制');
        overlay.style.display = 'block';
        
        // Add cancel button
        let cancelBtn = overlay.querySelector('.cancel-drawing-btn');
        if (!cancelBtn) {
            cancelBtn = document.createElement('button');
            cancelBtn.className = 'cancel-drawing-btn';
            cancelBtn.textContent = window.i18n ? window.i18n.t('common.cancel') : '取消';
            cancelBtn.addEventListener('click', () => {
                this.cancelDrawing();
            });
            overlay.appendChild(cancelBtn);
        }
    }
    
    /**
     * Hide drawing instruction overlay
     */
    hideDrawingInstruction() {
        const overlay = document.getElementById('shape-drawing-instruction');
        if (overlay) {
            overlay.style.display = 'none';
        }
    }
    
    /**
     * Handle canvas click for shape drawing
     */
    handleCanvasClick(e) {
        if (!this.isDrawing) return;
        
        const pos = this.getCanvasPosition(e);
        
        if (!this.startPoint) {
            // First click - set start point
            this.startPoint = pos;
            this.previewActive = true;
            this.showDrawingInstruction();
        } else {
            // Second click - set end point and draw
            this.endPoint = pos;
            this.finishDrawing();
        }
    }
    
    /**
     * Handle canvas mouse move for preview
     */
    handleCanvasMouseMove(e) {
        if (!this.isDrawing || !this.startPoint || !this.previewActive) return;
        
        const pos = this.getCanvasPosition(e);
        
        // Restore canvas to state before preview
        if (this.canvasImageData) {
            this.ctx.putImageData(this.canvasImageData, 0, 0);
        }
        
        // Draw preview
        this.drawShape(this.startPoint, pos, true);
    }
    
    /**
     * Get canvas position from mouse event
     */
    getCanvasPosition(e) {
        const rect = this.canvas.getBoundingClientRect();
        const scaleX = this.canvas.offsetWidth / rect.width;
        const scaleY = this.canvas.offsetHeight / rect.height;
        
        return {
            x: (e.clientX - rect.left) * scaleX,
            y: (e.clientY - rect.top) * scaleY
        };
    }
    
    /**
     * Draw the current shape
     */
    drawShape(start, end, isPreview = false) {
        this.ctx.save();
        
        // Set drawing styles
        this.ctx.strokeStyle = this.strokeColor;
        this.ctx.lineWidth = this.strokeWidth;
        this.ctx.lineCap = 'round';
        this.ctx.lineJoin = 'round';
        
        // Make preview slightly transparent
        if (isPreview) {
            this.ctx.globalAlpha = 0.6;
            this.ctx.setLineDash([5, 5]);
        } else {
            this.ctx.globalAlpha = 1.0;
            this.ctx.setLineDash([]);
        }
        
        switch(this.currentShape) {
            case 'line':
                this.drawLine(start, end);
                break;
            default:
                this.drawLine(start, end);
        }
        
        this.ctx.restore();
    }
    
    /**
     * Draw a line
     */
    drawLine(start, end) {
        this.ctx.beginPath();
        this.ctx.moveTo(start.x, start.y);
        this.ctx.lineTo(end.x, end.y);
        this.ctx.stroke();
    }
    
    /**
     * Finish drawing and save to history
     */
    finishDrawing() {
        // Restore canvas state before final draw
        if (this.canvasImageData) {
            this.ctx.putImageData(this.canvasImageData, 0, 0);
        }
        
        // Draw final shape
        this.drawShape(this.startPoint, this.endPoint, false);
        
        // Save to history
        if (this.historyManager) {
            this.historyManager.saveState();
        }
        
        // Reset state
        this.cancelDrawing();
    }
    
    /**
     * Cancel drawing mode
     */
    cancelDrawing() {
        // Remove event listeners
        this.canvas.removeEventListener('click', this.handleCanvasClick);
        this.canvas.removeEventListener('mousemove', this.handleCanvasMouseMove);
        
        // Restore canvas if we were previewing
        if (this.previewActive && this.canvasImageData && this.startPoint && !this.endPoint) {
            this.ctx.putImageData(this.canvasImageData, 0, 0);
        }
        
        // Reset state
        this.isDrawing = false;
        this.startPoint = null;
        this.endPoint = null;
        this.previewActive = false;
        this.canvasImageData = null;
        
        // Restore cursor
        this.canvas.style.cursor = 'crosshair';
        
        // Hide instruction
        this.hideDrawingInstruction();
    }
    
    /**
     * Check if currently in drawing mode
     */
    isInDrawingMode() {
        return this.isDrawing;
    }
}

// Export for use in other modules
if (typeof window !== 'undefined') {
    window.ShapeDrawingManager = ShapeDrawingManager;
}
