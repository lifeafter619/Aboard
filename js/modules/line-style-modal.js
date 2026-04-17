/**
 * Line Style Modal Module
 * Independent modal for configuring line styles for both Pen and Shape tools
 */

class LineStyleModal {
    constructor(drawingEngine, shapeDrawingManager) {
        this.drawingEngine = drawingEngine;
        this.shapeDrawingManager = shapeDrawingManager;
        
        // Current mode: 'pen' or 'shape'
        this.currentMode = 'pen';
        
        // Preview canvas
        this.previewCanvas = null;
        this.previewCtx = null;
        
        // Constants for preview overflow detection
        this.PREVIEW_OVERFLOW_HEIGHT_THRESHOLD = 60;
        
        // Create modal elements
        this.createModal();
        this.setupEventListeners();
    }
    
    // Helper method to check if arrow drawing should be used
    // Note: Arrow types are now handled as separate shape types (arrow, doubleArrow)
    // This method is kept for backwards compatibility but always returns false
    shouldDrawArrow() {
        return false;
    }
    
    // Helper method to get the final line style (handles arrow type conversion)
    // Note: Arrow types are now handled as separate shape types
    getFinalLineStyle(lineStyle) {
        return lineStyle;
    }
    
    createModal() {
        const closeLabel = window.i18n?.t?.('common.close') || 'Close';
        const expandPreviewLabel = window.i18n?.t?.('settings.general.expandPreview') || 'Expand';
        const modalHTML = `
            <div id="line-style-modal" class="modal">
                <div class="modal-content line-style-modal-content">
                    <div class="line-style-modal-header">
                        <h2 data-i18n="tools.lineStyle.title">Line Style</h2>
                        <button id="line-style-modal-close" class="line-style-modal-close" data-i18n-title="common.close" aria-label="${closeLabel}" title="${closeLabel}">
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <line x1="18" y1="6" x2="6" y2="18"></line>
                                <line x1="6" y1="6" x2="18" y2="18"></line>
                            </svg>
                        </button>
                    </div>
                    <div class="line-style-modal-body">
                        <!-- Line Style Type Selection -->
                        <div class="line-style-modal-group">
                            <label data-i18n="tools.lineStyle.title">Line Style</label>
                            <div class="line-style-type-grid" id="modal-line-style-grid">
                                <button class="line-style-type-btn active" data-modal-line-style="solid">
                                    <svg viewBox="0 0 50 20">
                                        <line x1="2" y1="10" x2="48" y2="10" stroke="currentColor" stroke-width="2"/>
                                    </svg>
                                    <span data-i18n="tools.lineStyle.solid">Solid</span>
                                </button>
                                <button class="line-style-type-btn" data-modal-line-style="dashed">
                                    <svg viewBox="0 0 50 20">
                                        <line x1="2" y1="10" x2="48" y2="10" stroke="currentColor" stroke-width="2" stroke-dasharray="8,4"/>
                                    </svg>
                                    <span data-i18n="tools.lineStyle.dashed">Dashed</span>
                                </button>
                                <button class="line-style-type-btn" data-modal-line-style="dotted">
                                    <svg viewBox="0 0 50 20">
                                        <line x1="2" y1="10" x2="48" y2="10" stroke="currentColor" stroke-width="2" stroke-dasharray="2,6"/>
                                    </svg>
                                    <span data-i18n="tools.lineStyle.dotted">Dotted</span>
                                </button>
                                <button class="line-style-type-btn" data-modal-line-style="wavy">
                                    <svg viewBox="0 0 50 20">
                                        <path d="M2 10 Q8 4, 14 10 T26 10 T38 10 T48 10" stroke="currentColor" stroke-width="2" fill="none"/>
                                    </svg>
                                    <span data-i18n="tools.lineStyle.wavy">Wavy</span>
                                </button>
                                <button class="line-style-type-btn" data-modal-line-style="multi">
                                    <svg viewBox="0 0 50 20">
                                        <line x1="2" y1="6" x2="48" y2="6" stroke="currentColor" stroke-width="1.5"/>
                                        <line x1="2" y1="14" x2="48" y2="14" stroke="currentColor" stroke-width="1.5"/>
                                    </svg>
                                    <span data-i18n="tools.lineStyle.multiLine">Multi-line</span>
                                </button>
                            </div>
                        </div>
                        
                        <!-- Line Style Settings (dynamic based on selected style) -->
                        <div class="line-style-modal-settings" id="modal-line-style-settings">
                            <!-- Dash Density Setting -->
                            <div class="line-style-modal-setting" id="modal-dash-density-setting" style="display: none;">
                                <label><span data-i18n="tools.lineStyle.dashDensity">Dash Density</span>: <span id="modal-dash-density-value">50</span></label>
                                <input type="range" id="modal-dash-density-slider" min="1" max="100" value="50" class="slider" data-i18n-aria-label="tools.lineStyle.dashDensity" aria-label="Dash Density">
                            </div>
                            
                            <!-- Wave Density Setting -->
                            <div class="line-style-modal-setting" id="modal-wave-density-setting" style="display: none;">
                                <label><span data-i18n="tools.lineStyle.waveDensity">Wave Density</span>: <span id="modal-wave-density-value">10</span></label>
                                <input type="range" id="modal-wave-density-slider" min="5" max="30" value="10" class="slider" data-i18n-aria-label="tools.lineStyle.waveDensity" aria-label="Wave Density">
                            </div>
                            
                            <!-- Multi-line Count Setting -->
                            <div class="line-style-modal-setting" id="modal-line-count-setting" style="display: none;">
                                <label><span data-i18n="tools.lineStyle.lineCount">Line Count</span>: <span id="modal-line-count-value">2</span></label>
                                <input type="range" id="modal-line-count-slider" min="2" max="10" value="2" class="slider" data-i18n-aria-label="tools.lineStyle.lineCount" aria-label="Line Count">
                            </div>
                            
                            <!-- Multi-line Spacing Setting -->
                            <div class="line-style-modal-setting" id="modal-line-spacing-setting" style="display: none;">
                                <label><span data-i18n="tools.lineStyle.lineSpacing">Line Spacing</span>: <span id="modal-line-spacing-value">10</span>px</label>
                                <input type="range" id="modal-line-spacing-slider" min="5" max="50" value="10" class="slider" data-i18n-aria-label="tools.lineStyle.lineSpacing" aria-label="Line Spacing">
                            </div>
                        </div>
                        
                        <!-- Preview Area -->
                        <div class="line-style-modal-group">
                            <label data-i18n="lineStyleModal.preview">Preview</label>
                            <div class="line-style-preview-area" id="line-style-preview-container">
                                <canvas id="line-style-preview-canvas" width="320" height="80"></canvas>
                                <button id="preview-expand-btn" class="preview-expand-btn" style="display: none;" data-i18n-title="settings.general.expandPreview" aria-label="${expandPreviewLabel}" title="${expandPreviewLabel}">
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                        <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"/>
                                    </svg>
                                </button>
                            </div>
                        </div>
                    </div>
                    
                    <!-- Modal Footer -->
                    <div class="line-style-modal-footer">
                        <button id="line-style-modal-apply" class="btn-primary" data-i18n="common.apply">Apply</button>
                    </div>
                </div>
            </div>
        `;
        
        document.body.insertAdjacentHTML('beforeend', modalHTML);
        
        // Store references
        this.modal = document.getElementById('line-style-modal');
        this.previewCanvas = document.getElementById('line-style-preview-canvas');
        this.previewCtx = this.previewCanvas.getContext('2d');
        
        // Track arrow type (for shape mode only)
        this.arrowType = 'none';
    }
    
    setupEventListeners() {
        // Close button
        document.getElementById('line-style-modal-close').addEventListener('click', () => {
            this.hide();
        });
        
        // Click outside to close
        this.modal.addEventListener('click', (e) => {
            if (e.target === this.modal) {
                this.hide();
            }
        });
        
        // Apply button
        document.getElementById('line-style-modal-apply').addEventListener('click', () => {
            this.applySettings();
            this.hide();
        });
        
        // Line style type buttons
        document.querySelectorAll('#modal-line-style-grid .line-style-type-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('#modal-line-style-grid .line-style-type-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.updateSettingsVisibility(btn.dataset.modalLineStyle);
                this.updatePreview();
            });
        });
        
        // Slider event listeners
        document.getElementById('modal-dash-density-slider').addEventListener('input', (e) => {
            document.getElementById('modal-dash-density-value').textContent = e.target.value;
            this.updatePreview();
        });
        
        document.getElementById('modal-wave-density-slider').addEventListener('input', (e) => {
            document.getElementById('modal-wave-density-value').textContent = e.target.value;
            this.updatePreview();
        });
        
        document.getElementById('modal-line-count-slider').addEventListener('input', (e) => {
            document.getElementById('modal-line-count-value').textContent = e.target.value;
            this.updatePreview();
        });
        
        document.getElementById('modal-line-spacing-slider').addEventListener('input', (e) => {
            document.getElementById('modal-line-spacing-value').textContent = e.target.value;
            this.updatePreview();
        });
        
        // Preview expand button
        document.getElementById('preview-expand-btn').addEventListener('click', () => {
            this.showExpandedPreview();
        });
    }
    
    show(mode = 'pen') {
        this.currentMode = mode;
        
        // Hide wavy line option for pen mode (pen doesn't support wavy)
        const wavyBtn = document.querySelector('#modal-line-style-grid .line-style-type-btn[data-modal-line-style="wavy"]');
        if (wavyBtn) {
            wavyBtn.style.display = mode === 'pen' ? 'none' : 'flex';
        }
        
        this.loadCurrentSettings();
        this.modal.classList.add('show');
        this.updatePreview();
        
        // Apply i18n translations if available
        if (window.i18n && window.i18n.applyTranslations) {
            window.i18n.applyTranslations();
        }
    }
    
    hide() {
        this.modal.classList.remove('show');
    }
    
    loadCurrentSettings() {
        let lineStyle, dashDensity, waveDensity, lineSpacing, lineCount;
        
        if (this.currentMode === 'pen') {
            lineStyle = this.drawingEngine.penLineStyle || 'solid';
            dashDensity = this.drawingEngine.penDashDensity || 50;
            waveDensity = 10;
            lineSpacing = this.drawingEngine.penMultiLineSpacing || 10;
            lineCount = this.drawingEngine.penMultiLineCount || 2;
        } else {
            lineStyle = this.shapeDrawingManager.lineStyle || 'solid';
            dashDensity = this.shapeDrawingManager.dashDensity || 50;
            waveDensity = this.shapeDrawingManager.waveDensity || 10;
            lineSpacing = this.shapeDrawingManager.multiLineSpacing || 10;
            lineCount = this.shapeDrawingManager.multiLineCount || 2;
            
            // Convert double/triple to multi
            if (lineStyle === 'double' || lineStyle === 'triple') {
                lineStyle = 'multi';
            }
        }
        
        // Update buttons
        document.querySelectorAll('#modal-line-style-grid .line-style-type-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.modalLineStyle === lineStyle);
        });
        
        // Update sliders
        document.getElementById('modal-dash-density-slider').value = dashDensity;
        document.getElementById('modal-dash-density-value').textContent = dashDensity;
        
        document.getElementById('modal-wave-density-slider').value = waveDensity;
        document.getElementById('modal-wave-density-value').textContent = waveDensity;
        
        document.getElementById('modal-line-count-slider').value = lineCount;
        document.getElementById('modal-line-count-value').textContent = lineCount;
        
        document.getElementById('modal-line-spacing-slider').value = lineSpacing;
        document.getElementById('modal-line-spacing-value').textContent = lineSpacing;
        
        // Update visibility
        this.updateSettingsVisibility(lineStyle);
    }
    
    updateSettingsVisibility(lineStyle) {
        const settingsContainer = document.getElementById('modal-line-style-settings');
        const dashSetting = document.getElementById('modal-dash-density-setting');
        const waveSetting = document.getElementById('modal-wave-density-setting');
        const countSetting = document.getElementById('modal-line-count-setting');
        const spacingSetting = document.getElementById('modal-line-spacing-setting');
        
        // Hide container if solid
        if (lineStyle === 'solid') {
            settingsContainer.style.display = 'none';
            return;
        } else {
            settingsContainer.style.display = 'flex';
        }

        // Hide all settings first
        dashSetting.style.display = 'none';
        waveSetting.style.display = 'none';
        countSetting.style.display = 'none';
        spacingSetting.style.display = 'none';
        
        // Show relevant settings
        switch (lineStyle) {
            case 'dashed':
            case 'dotted':
                dashSetting.style.display = 'block';
                break;
            case 'wavy':
                waveSetting.style.display = 'block';
                break;
            case 'multi':
                countSetting.style.display = 'block';
                spacingSetting.style.display = 'block';
                break;
        }
    }
    
    getCurrentLineStyle() {
        const activeBtn = document.querySelector('#modal-line-style-grid .line-style-type-btn.active');
        return activeBtn ? activeBtn.dataset.modalLineStyle : 'solid';
    }
    
    updatePreview() {
        const ctx = this.previewCtx;
        const dpr = window.devicePixelRatio || 1;
        
        // Set canvas size for high DPI displays
        const cssWidth = 320;
        const cssHeight = 80;
        this.previewCanvas.width = cssWidth * dpr;
        this.previewCanvas.height = cssHeight * dpr;
        this.previewCanvas.style.width = cssWidth + 'px';
        this.previewCanvas.style.height = cssHeight + 'px';
        
        // Scale context for DPR
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        
        // Clear canvas
        ctx.clearRect(0, 0, cssWidth, cssHeight);
        
        // Get current settings
        const lineStyle = this.getCurrentLineStyle();
        const dashDensity = parseInt(document.getElementById('modal-dash-density-slider').value, 10);
        const waveDensity = parseInt(document.getElementById('modal-wave-density-slider').value, 10);
        const lineCount = parseInt(document.getElementById('modal-line-count-slider').value, 10);
        const lineSpacing = parseInt(document.getElementById('modal-line-spacing-slider').value, 10);
        
        // Get pen size from drawing engine - use exact size (1:1 matching with actual drawing)
        const penSize = this.currentMode === 'pen' 
            ? (this.drawingEngine.penSize || 5)
            : (this.shapeDrawingManager.drawingEngine.penSize || 5);
        
        // Setup context with exact pen size (1:1 with actual drawing)
        ctx.strokeStyle = '#333333';
        ctx.fillStyle = '#333333';
        ctx.lineWidth = penSize;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        
        const startX = 30;
        const endX = cssWidth - 30;
        const centerY = cssHeight / 2;
        
        // Draw based on style
        ctx.setLineDash([]);
        
        // Calculate visual spacing based on density value
        // Higher density value (1-100) -> Smaller spacing
        const spacing = Math.max(2, 400 / Math.max(1, dashDensity));

        switch (lineStyle) {
            case 'solid':
                ctx.beginPath();
                ctx.moveTo(startX, centerY);
                ctx.lineTo(endX, centerY);
                ctx.stroke();
                break;
                
            case 'dashed':
                ctx.setLineDash([spacing, spacing * 0.6]);
                ctx.beginPath();
                ctx.moveTo(startX, centerY);
                ctx.lineTo(endX, centerY);
                ctx.stroke();
                ctx.setLineDash([]);
                break;
                
            case 'dotted':
                ctx.setLineDash([3, spacing * 0.6]);
                ctx.beginPath();
                ctx.moveTo(startX, centerY);
                ctx.lineTo(endX, centerY);
                ctx.stroke();
                ctx.setLineDash([]);
                break;
                
            case 'wavy':
                this.drawWavyPreview(ctx, startX, centerY, endX, centerY, waveDensity);
                break;
                
            case 'multi':
                this.drawMultiLinePreview(ctx, startX, centerY, endX, centerY, lineCount, lineSpacing);
                break;
        }
        
        // Check for preview overflow
        this.checkPreviewOverflow();
    }
    
    drawArrowPreview(ctx, startX, startY, endX, endY, penSize, isDouble) {
        const arrowSize = Math.max(10, penSize * 2);
        
        // Draw the main line
        ctx.beginPath();
        ctx.moveTo(isDouble ? startX + arrowSize * 0.8 : startX, startY);
        ctx.lineTo(endX - arrowSize * 0.8, endY);
        ctx.stroke();
        
        // Draw end arrow head
        ctx.beginPath();
        ctx.moveTo(endX, endY);
        ctx.lineTo(endX - arrowSize, endY - arrowSize * 0.5);
        ctx.lineTo(endX - arrowSize, endY + arrowSize * 0.5);
        ctx.closePath();
        ctx.fill();
        
        // Draw start arrow head if double arrow
        if (isDouble) {
            ctx.beginPath();
            ctx.moveTo(startX, startY);
            ctx.lineTo(startX + arrowSize, startY - arrowSize * 0.5);
            ctx.lineTo(startX + arrowSize, startY + arrowSize * 0.5);
            ctx.closePath();
            ctx.fill();
        }
    }
    
    drawWavyPreview(ctx, startX, startY, endX, endY, waveDensity) {
        const length = endX - startX;
        const waveAmplitude = 8;
        const numWaves = Math.max(3, Math.floor(length / waveDensity));
        
        ctx.beginPath();
        ctx.moveTo(startX, startY);
        
        for (let i = 0; i <= numWaves; i++) {
            const x = startX + (length * i / numWaves);
            const cpX = startX + (length * (i - 0.5) / numWaves);
            const direction = (i % 2 === 0) ? -1 : 1;
            const cpY = startY + (waveAmplitude * direction);
            
            if (i > 0) {
                ctx.quadraticCurveTo(cpX, cpY, x, startY);
            }
        }
        
        ctx.stroke();
    }
    
    drawMultiLinePreview(ctx, startX, startY, endX, endY, count, spacing) {
        const totalHeight = (count - 1) * spacing;
        const startOffset = -totalHeight / 2;
        
        for (let i = 0; i < count; i++) {
            const offset = startOffset + i * spacing;
            ctx.beginPath();
            ctx.moveTo(startX, startY + offset);
            ctx.lineTo(endX, endY + offset);
            ctx.stroke();
        }
    }
    
    applySettings() {
        let lineStyle = this.getCurrentLineStyle();
        const dashDensity = parseInt(document.getElementById('modal-dash-density-slider').value, 10);
        const waveDensity = parseInt(document.getElementById('modal-wave-density-slider').value, 10);
        const lineCount = parseInt(document.getElementById('modal-line-count-slider').value, 10);
        const lineSpacing = parseInt(document.getElementById('modal-line-spacing-slider').value, 10);
        
        if (this.currentMode === 'pen') {
            // Apply to pen tool
            this.drawingEngine.setPenLineStyle(lineStyle);
            this.drawingEngine.setPenDashDensity(dashDensity);
            this.drawingEngine.setPenMultiLineCount(lineCount);
            this.drawingEngine.setPenMultiLineSpacing(lineSpacing);
            
            // Update pen button style
            this.updatePenButtonStyle(lineStyle);
        } else {
            // For shape tool, use helper to get final line style with arrow type
            const finalLineStyle = this.getFinalLineStyle(lineStyle);
            
            // Apply to shape tool - convert 'multi' back to internal representation
            this.shapeDrawingManager.setLineStyle(finalLineStyle);
            this.shapeDrawingManager.setDashDensity(dashDensity);
            this.shapeDrawingManager.setWaveDensity(waveDensity);
            this.shapeDrawingManager.setMultiLineCount(lineCount);
            this.shapeDrawingManager.setMultiLineSpacing(lineSpacing);
            
            // Update shape button style
            this.updateShapeButtonStyle(finalLineStyle);
        }
    }
    
    updatePenButtonStyle(lineStyle) {
        const btn = document.getElementById('pen-line-style-settings-btn');
        if (btn) {
            if (lineStyle !== 'solid') {
                btn.classList.add('active');
            } else {
                btn.classList.remove('active');
            }
            
            // Update icon based on style
            const svg = btn.querySelector('svg');
            if (svg) {
                svg.innerHTML = this.getLineStyleSvgContent(lineStyle);
            }
        }
    }
    
    updateShapeButtonStyle(lineStyle) {
        const btn = document.getElementById('shape-line-style-settings-btn');
        if (btn) {
            if (lineStyle !== 'solid') {
                btn.classList.add('active');
            } else {
                btn.classList.remove('active');
            }
            
            // Update icon based on style
            const svg = btn.querySelector('svg');
            if (svg) {
                svg.innerHTML = this.getLineStyleSvgContent(lineStyle);
            }
        }
    }
    
    getLineStyleSvgContent(lineStyle) {
        switch (lineStyle) {
            case 'dashed':
                return '<line x1="2" y1="8" x2="38" y2="8" stroke="currentColor" stroke-width="2" stroke-dasharray="6,3"/>';
            case 'dotted':
                return '<line x1="2" y1="8" x2="38" y2="8" stroke="currentColor" stroke-width="2" stroke-dasharray="2,4"/>';
            case 'wavy':
                return '<path d="M2 8 Q6 4, 10 8 T18 8 T26 8 T34 8 Q38 12, 38 8" stroke="currentColor" stroke-width="2" fill="none"/>';
            case 'multi':
                return '<line x1="2" y1="5" x2="38" y2="5" stroke="currentColor" stroke-width="1.5"/><line x1="2" y1="11" x2="38" y2="11" stroke="currentColor" stroke-width="1.5"/>';
            case 'arrow':
                return '<line x1="2" y1="8" x2="32" y2="8" stroke="currentColor" stroke-width="2"/><polyline points="28,4 36,8 28,12" stroke="currentColor" stroke-width="2" fill="none"/>';
            case 'doubleArrow':
                return '<line x1="10" y1="8" x2="30" y2="8" stroke="currentColor" stroke-width="2"/><polyline points="4,8 10,4 10,12" stroke="currentColor" stroke-width="2" fill="none"/><polyline points="30,4 36,8 30,12" stroke="currentColor" stroke-width="2" fill="none"/>';
            case 'solid':
            default:
                return '<line x1="2" y1="8" x2="38" y2="8" stroke="currentColor" stroke-width="2"/>';
        }
    }
    
    // Check if preview content overflows and show expand button if needed
    checkPreviewOverflow() {
        // Fix for "label not updating" issue:
        // Ensure we don't accidentally rely on or modify global DOM elements that might be used by main.js
        // The checkPreviewOverflow function reads global values, which is fine as long as we don't break them.

        const lineStyle = this.getCurrentLineStyle();
        // Use safer way to get values, fallback if modal elements are missing (defensive coding)
        const lineCountEl = document.getElementById('modal-line-count-slider');
        const lineSpacingEl = document.getElementById('modal-line-spacing-slider');

        const lineCount = lineCountEl ? parseInt(lineCountEl.value, 10) : 2;
        const lineSpacing = lineSpacingEl ? parseInt(lineSpacingEl.value, 10) : 10;

        const penSize = this.currentMode === 'pen' 
            ? (this.drawingEngine.penSize || 5)
            : (this.shapeDrawingManager.drawingEngine.penSize || 5);
        
        // Calculate if preview would overflow
        let requiredHeight = 80;
        if (lineStyle === 'multi') {
            requiredHeight = (lineCount - 1) * lineSpacing + penSize * 2;
        } else if (lineStyle === 'wavy') {
            requiredHeight = penSize * 3 + 16;
        } else {
            requiredHeight = penSize * 2;
        }
        
        const expandBtn = document.getElementById('preview-expand-btn');
        if (expandBtn) {
            expandBtn.style.display = requiredHeight > this.PREVIEW_OVERFLOW_HEIGHT_THRESHOLD ? 'flex' : 'none';
        }
    }
    
    // Show expanded preview modal
    showExpandedPreview() {
        const closeLabel = window.i18n?.t?.('common.close') || 'Close';
        // Create expanded preview modal if it doesn't exist
        let expandedModal = document.getElementById('line-style-preview-expanded-modal');
        if (!expandedModal) {
            const modalHTML = `
                <div id="line-style-preview-expanded-modal" class="modal">
                    <div class="modal-content expanded-preview-modal-content">
                        <div class="line-style-modal-header">
                            <h2 data-i18n="lineStyleModal.preview">Preview</h2>
                            <button id="expanded-preview-close" class="line-style-modal-close" data-i18n-title="common.close" aria-label="${closeLabel}" title="${closeLabel}">
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <line x1="18" y1="6" x2="6" y2="18"></line>
                                    <line x1="6" y1="6" x2="18" y2="18"></line>
                                </svg>
                            </button>
                        </div>
                        <div class="expanded-preview-body">
                            <canvas id="expanded-preview-canvas"></canvas>
                        </div>
                    </div>
                </div>
            `;
            document.body.insertAdjacentHTML('beforeend', modalHTML);
            expandedModal = document.getElementById('line-style-preview-expanded-modal');
            
            document.getElementById('expanded-preview-close').addEventListener('click', () => {
                expandedModal.classList.remove('show');
            });
            
            expandedModal.addEventListener('click', (e) => {
                if (e.target === expandedModal) {
                    expandedModal.classList.remove('show');
                }
            });
        }
        
        // Draw expanded preview
        const canvas = document.getElementById('expanded-preview-canvas');
        const ctx = canvas.getContext('2d');
        const dpr = window.devicePixelRatio || 1;
        
        // Set larger canvas size
        const cssWidth = Math.min(600, window.innerWidth - 100);
        const cssHeight = Math.min(300, window.innerHeight - 200);
        canvas.width = cssWidth * dpr;
        canvas.height = cssHeight * dpr;
        canvas.style.width = cssWidth + 'px';
        canvas.style.height = cssHeight + 'px';
        
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        ctx.clearRect(0, 0, cssWidth, cssHeight);
        
        // Get current settings
        const lineStyle = this.getCurrentLineStyle();
        const dashDensity = parseInt(document.getElementById('modal-dash-density-slider').value, 10);
        const waveDensity = parseInt(document.getElementById('modal-wave-density-slider').value, 10);
        const lineCount = parseInt(document.getElementById('modal-line-count-slider').value, 10);
        const lineSpacing = parseInt(document.getElementById('modal-line-spacing-slider').value, 10);
        const penSize = this.currentMode === 'pen' 
            ? (this.drawingEngine.penSize || 5)
            : (this.shapeDrawingManager.drawingEngine.penSize || 5);
        
        ctx.strokeStyle = '#333333';
        ctx.fillStyle = '#333333';
        ctx.lineWidth = penSize;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        
        const startX = 50;
        const endX = cssWidth - 50;
        const centerY = cssHeight / 2;
        
        ctx.setLineDash([]);
        
        // Calculate visual spacing based on density value
        const spacing = Math.max(2, 400 / Math.max(1, dashDensity));

        switch (lineStyle) {
            case 'solid':
                ctx.beginPath();
                ctx.moveTo(startX, centerY);
                ctx.lineTo(endX, centerY);
                ctx.stroke();
                break;
            case 'dashed':
                ctx.setLineDash([spacing, spacing * 0.6]);
                ctx.beginPath();
                ctx.moveTo(startX, centerY);
                ctx.lineTo(endX, centerY);
                ctx.stroke();
                break;
            case 'dotted':
                ctx.setLineDash([3, spacing * 0.6]);
                ctx.beginPath();
                ctx.moveTo(startX, centerY);
                ctx.lineTo(endX, centerY);
                ctx.stroke();
                break;
            case 'wavy':
                this.drawWavyPreview(ctx, startX, centerY, endX, centerY, waveDensity);
                break;
            case 'multi':
                this.drawMultiLinePreview(ctx, startX, centerY, endX, centerY, lineCount, lineSpacing);
                break;
        }
        
        // Apply i18n if available
        if (window.i18n && window.i18n.applyTranslations) {
            window.i18n.applyTranslations();
        }
        
        expandedModal.classList.add('show');
    }
}

// Export for use
if (typeof window !== 'undefined') {
    window.LineStyleModal = LineStyleModal;
    window.AboardLineStyleModal = LineStyleModal;
}
