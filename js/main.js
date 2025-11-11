// Main Application Class
// Integrates all modules and handles user interactions

class DrawingBoard {
    constructor() {
        // Canvas setup
        this.canvas = document.getElementById('canvas');
        this.ctx = this.canvas.getContext('2d', { 
            desynchronized: true,
            alpha: true
        });
        
        this.bgCanvas = document.getElementById('background-canvas');
        this.bgCtx = this.bgCanvas.getContext('2d');
        
        this.eraserCursor = document.getElementById('eraser-cursor');
        
        // Initialize modules
        this.settingsManager = new SettingsManager();
        this.drawingEngine = new DrawingEngine(this.canvas, this.ctx);
        this.historyManager = new HistoryManager(this.canvas, this.ctx);
        this.backgroundManager = new BackgroundManager(this.bgCanvas, this.bgCtx);
        this.imageControls = new ImageControls(this.backgroundManager);
        this.strokeControls = new StrokeControls(this.drawingEngine, this.canvas, this.ctx, this.historyManager);
        this.timeDisplayManager = new TimeDisplayManager(this.settingsManager);
        this.timeDisplayControls = new TimeDisplayControls(this.timeDisplayManager);
        this.timerManager = new TimerManager();
        this.collapsibleManager = new CollapsibleManager();
        this.announcementManager = new AnnouncementManager();
        this.exportManager = new ExportManager(this.canvas, this.bgCanvas, this);

        // Initialize helper modules - 初始化辅助模块
        this.eventHandlers = new EventHandlers(this);
        this.toolConfigHandlers = new ToolConfigHandlers(this);
        this.settingsHandlers = new SettingsHandlers(this);
        this.draggablePanels = new DraggablePanels(this);
        this.pagination = new Pagination(this);
        this.canvasView = new CanvasView(this);
        
        // Pagination
        this.currentPage = 1;
        this.pages = [];
        this.pageBackgrounds = {}; // Store background settings per page
        
        // Load saved page backgrounds
        const savedPageBackgrounds = localStorage.getItem('pageBackgrounds');
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
        
        // Dragging state
        this.isDraggingPanel = false;
        this.draggedElement = null;
        this.dragOffset = { x: 0, y: 0 };
        this.draggedElementWidth = 0;
        this.draggedElementHeight = 0;
        
        // Coordinate origin dragging state
        this.isDraggingCoordinateOrigin = false;
        this.coordinateOriginDragStart = { x: 0, y: 0 };
        
        // Uploaded images storage
        this.uploadedImages = this.loadUploadedImages();
        
        // Initialize
        this.resizeCanvas();
        this.eventHandlers.setupEventListeners();
        this.toolConfigHandlers.setupToolConfigListeners();
        this.settingsHandlers.setupSettingsListeners();
        this.setupKeyboardShortcuts();
        this.draggablePanels.setupDraggablePanels();
        this.settingsManager.loadSettings();
        this.backgroundManager.drawBackground();
        this.updateUI();
        this.historyManager.saveState();
        
        // Initialize pages array for pagination mode
        if (!this.settingsManager.infiniteCanvas && this.pages.length === 0) {
            this.pages.push(this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height));
            this.currentPage = 1;
            this.pagination.updatePaginationUI();
        }
        
        this.canvasView.initializeCanvasView(); // Initialize canvas view (70% scale, centered)
        this.canvasView.updateZoomUI();
        this.canvasView.applyZoom(false); // Don't update config-area scale on refresh
        this.canvasView.updateZoomControlsVisibility();
        this.canvasView.updateFullscreenBtnVisibility();
        this.updatePatternGrid();
        this.updateUploadedImagesButtons();
        
        // Listen for fullscreen changes
        document.addEventListener('fullscreenchange', () => this.handleFullscreenChange());
    }
    
    
    
    
    resizeCanvas() {
        // 获取窗口尺寸而不是当前canvas的尺寸，避免缩放导致canvas消失
        const windowWidth = window.innerWidth;
        const windowHeight = window.innerHeight;
        const dpr = window.devicePixelRatio || 1;
        
        const oldWidth = this.canvas.width;
        const oldHeight = this.canvas.height;
        const imageData = this.historyManager.historyStep >= 0 ? 
            this.ctx.getImageData(0, 0, oldWidth, oldHeight) : null;
        
        // 使用窗口尺寸设置canvas大小，确保canvas始终占据整个窗口
        this.canvas.width = windowWidth * dpr;
        this.canvas.height = windowHeight * dpr;
        this.canvas.style.width = windowWidth + 'px';
        this.canvas.style.height = windowHeight + 'px';
        
        this.bgCanvas.width = windowWidth * dpr;
        this.bgCanvas.height = windowHeight * dpr;
        this.bgCanvas.style.width = windowWidth + 'px';
        this.bgCanvas.style.height = windowHeight + 'px';
        
        this.ctx.scale(dpr, dpr);
        this.bgCtx.scale(dpr, dpr);
        
        if (imageData) {
            this.ctx.putImageData(imageData, 0, 0);
        }
        
        this.backgroundManager.drawBackground();
        
        // Re-center the canvas after resize
        this.canvasView.centerCanvas();
    }
    
    
    
    
    setupKeyboardShortcuts() {
        document.addEventListener('keydown', (e) => {
            if (e.ctrlKey || e.metaKey) {
                if (e.key === 'z' && !e.shiftKey) {
                    e.preventDefault();
                    if (this.historyManager.undo()) {
                        this.updateUI();
                    }
                } else if (e.key === 'y' || (e.key === 'z' && e.shiftKey)) {
                    e.preventDefault();
                    if (this.historyManager.redo()) {
                        this.updateUI();
                    }
                }
            }
            
            // Zoom shortcuts
            if (e.key === '+' || e.key === '=') {
                e.preventDefault();
                this.zoomIn();
            } else if (e.key === '-' || e.key === '_') {
                e.preventDefault();
                this.zoomOut();
            }
            
            if (e.key === 'Escape') {
                this.closeSettings();
                this.closeConfigPanel();
            }
        });
        
        // Listen for image confirmed event from background image controls
        window.addEventListener('imageConfirmed', () => {
            // Auto-switch to pen tool when user confirms background image
            if (this.drawingEngine.currentTool === 'background') {
                this.setTool('pen', false);
            }
        });
    }
    
    repositionToolbarsOnResize() {
        // Ensure all toolbars and panels stay within viewport after window resize
        const EDGE_SPACING = 10; // Minimum spacing from viewport edges
        const panels = [
            document.getElementById('history-controls'),
            document.getElementById('config-area'),
            document.getElementById('time-display-area'),
            document.getElementById('feature-area'),
            document.getElementById('toolbar'),
            document.getElementById('pagination-controls'),
            document.getElementById('timer-display')
        ];
        
        const windowWidth = window.innerWidth;
        const windowHeight = window.innerHeight;
        
        panels.forEach(panel => {
            if (!panel) return;
            
            const rect = panel.getBoundingClientRect();
            const computedStyle = window.getComputedStyle(panel);
            
            // Get current position
            let left = parseFloat(computedStyle.left) || 0;
            let top = parseFloat(computedStyle.top) || 0;
            let right = computedStyle.right !== 'auto' ? parseFloat(computedStyle.right) : null;
            let bottom = computedStyle.bottom !== 'auto' ? parseFloat(computedStyle.bottom) : null;
            
            // Check if panel is positioned and might overflow
            const hasCustomPosition = computedStyle.left !== 'auto' || computedStyle.top !== 'auto' || 
                                     computedStyle.right !== 'auto' || computedStyle.bottom !== 'auto';
            
            if (!hasCustomPosition) return;
            
            // Adjust position if overflowing
            if (right !== null) {
                // Panel is right-aligned - check if actual left position would be negative
                const actualLeft = windowWidth - right - rect.width;
                if (actualLeft < 0) {
                    panel.style.right = `${EDGE_SPACING}px`;
                }
            } else if (left + rect.width > windowWidth - EDGE_SPACING) {
                // Panel overflows right edge (accounting for edge spacing)
                const newLeft = Math.max(EDGE_SPACING, windowWidth - rect.width - EDGE_SPACING);
                panel.style.left = `${newLeft}px`;
                panel.style.right = 'auto';
            }
            
            if (bottom !== null) {
                // Panel is bottom-aligned - check if actual top position would be negative
                const actualTop = windowHeight - bottom - rect.height;
                if (actualTop < 0) {
                    panel.style.bottom = `${EDGE_SPACING}px`;
                }
            } else if (top + rect.height > windowHeight - EDGE_SPACING) {
                // Panel overflows bottom edge (accounting for edge spacing)
                const newTop = Math.max(EDGE_SPACING, windowHeight - rect.height - EDGE_SPACING);
                panel.style.top = `${newTop}px`;
                panel.style.bottom = 'auto';
            }
            
            // Also ensure panel doesn't overflow left or top edges
            if (left < EDGE_SPACING) {
                panel.style.left = `${EDGE_SPACING}px`;
            }
            if (top < EDGE_SPACING) {
                panel.style.top = `${EDGE_SPACING}px`;
            }
        });
    }
    
    
    setTool(tool, showConfig = true) {
        this.drawingEngine.setTool(tool);
        if (tool === 'eraser') {
            this.showEraserCursor();
        } else {
            this.hideEraserCursor();
        }
        
        this.updateUI();
        
        // Hide both config-area and feature-area by default
        document.getElementById('config-area').classList.remove('show');
        document.getElementById('feature-area').classList.remove('show');
        
        // Show appropriate panel based on tool
        if (showConfig && (tool === 'pen' || tool === 'eraser' || tool === 'background')) {
            document.getElementById('config-area').classList.add('show');
        } else if (tool === 'more') {
            document.getElementById('feature-area').classList.add('show');
            
            // Update More config panel state
            const showDateCheckboxMore = document.getElementById('show-date-checkbox-more');
            const showTimeCheckboxMore = document.getElementById('show-time-checkbox-more');
            
            if (showDateCheckboxMore) {
                showDateCheckboxMore.checked = this.timeDisplayManager.showDate;
            }
            if (showTimeCheckboxMore) {
                showTimeCheckboxMore.checked = this.timeDisplayManager.showTime;
            }
        }
    }
    
    handleDrawingComplete() {
        if (this.drawingEngine.stopDrawing()) {
            this.historyManager.saveState();
            this.closeConfigPanel();
            this.closeFeaturePanel();
        }
    }
    
    closeConfigPanel() {
        document.getElementById('config-area').classList.remove('show');
    }
    
    closeFeaturePanel() {
        document.getElementById('feature-area').classList.remove('show');
    }
    
    openSettings() {
        document.getElementById('settings-modal').classList.add('show');
        
        // Update time display settings UI with current values
        const timeDisplayCheckbox = document.getElementById('show-time-display-checkbox');
        timeDisplayCheckbox.checked = this.timeDisplayManager.enabled;
        
        // Show/hide time display settings based on enabled state
        const timeDisplaySettings = document.getElementById('time-display-settings');
        const timezoneSettings = document.getElementById('timezone-settings');
        const timeFormatSettings = document.getElementById('time-format-settings');
        const dateFormatSettings = document.getElementById('date-format-settings');
        const timeColorSettings = document.getElementById('time-color-settings');
        const timeFontSizeSettings = document.getElementById('time-font-size-settings');
        const timeOpacitySettings = document.getElementById('time-opacity-settings');
        const timeFullscreenSettings = document.getElementById('time-fullscreen-settings');
        const timeFullscreenFontSizeSettings = document.getElementById('time-fullscreen-font-size-settings');
        
        const isEnabled = this.timeDisplayManager.enabled;
        timeDisplaySettings.style.display = isEnabled ? 'flex' : 'none';
        timezoneSettings.style.display = isEnabled ? 'flex' : 'none';
        timeFormatSettings.style.display = isEnabled ? 'flex' : 'none';
        dateFormatSettings.style.display = isEnabled ? 'flex' : 'none';
        timeColorSettings.style.display = isEnabled ? 'flex' : 'none';
        timeFontSizeSettings.style.display = isEnabled ? 'flex' : 'none';
        timeOpacitySettings.style.display = isEnabled ? 'flex' : 'none';
        timeFullscreenSettings.style.display = isEnabled ? 'flex' : 'none';
        timeFullscreenFontSizeSettings.style.display = isEnabled ? 'flex' : 'none';
        
        // Set active display type button
        document.querySelectorAll('.display-option-btn').forEach(btn => btn.classList.remove('active'));
        let displayType = 'both';
        if (this.timeDisplayManager.showDate && !this.timeDisplayManager.showTime) {
            displayType = 'date-only';
        } else if (!this.timeDisplayManager.showDate && this.timeDisplayManager.showTime) {
            displayType = 'time-only';
        }
        const activeBtn = document.querySelector(`.display-option-btn[data-display-type="${displayType}"]`);
        if (activeBtn) activeBtn.classList.add('active');
        
        // Set timezone selector
        document.getElementById('timezone-select').value = this.timeDisplayManager.timezone;
        
        document.getElementById('time-format-select').value = this.timeDisplayManager.timeFormat;
        document.getElementById('date-format-select').value = this.timeDisplayManager.dateFormat;
        document.getElementById('time-font-size-slider').value = this.timeDisplayManager.fontSize;
        document.getElementById('time-font-size-value').textContent = this.timeDisplayManager.fontSize;
        document.getElementById('time-font-size-input').value = this.timeDisplayManager.fontSize;
        document.getElementById('time-opacity-slider').value = this.timeDisplayManager.opacity;
        document.getElementById('time-opacity-value').textContent = this.timeDisplayManager.opacity;
        document.getElementById('time-opacity-input').value = this.timeDisplayManager.opacity;
        document.getElementById('custom-time-color-picker').value = this.timeDisplayManager.color;
        const defaultBgColor = '#FFFFFF'; // Default background color constant
        document.getElementById('custom-time-bg-color-picker').value = this.timeDisplayManager.bgColor === 'transparent' ? defaultBgColor : this.timeDisplayManager.bgColor;
        
        // Set fullscreen mode buttons
        document.querySelectorAll('.fullscreen-mode-btn').forEach(btn => {
            if (btn.dataset.mode === this.timeDisplayManager.fullscreenMode) {
                btn.classList.add('active');
            } else {
                btn.classList.remove('active');
            }
        });
        
        // Set fullscreen font size values
        if (document.getElementById('time-fullscreen-font-size-slider')) {
            document.getElementById('time-fullscreen-font-size-slider').value = this.timeDisplayManager.fullscreenFontSize;
            document.getElementById('time-fullscreen-font-size-value').textContent = this.timeDisplayManager.fullscreenFontSize;
            document.getElementById('time-fullscreen-font-size-input').value = this.timeDisplayManager.fullscreenFontSize;
        }
    }
    
    closeSettings() {
        document.getElementById('settings-modal').classList.remove('show');
    }
    
    confirmClear() {
        document.getElementById('confirm-modal').classList.add('show');
    }
    
    clearCanvas(saveToHistory = true) {
        this.drawingEngine.clearCanvas();
        if (saveToHistory) {
            this.historyManager.saveState();
        }
    }
    
    updateUI() {
        document.querySelectorAll('.tool-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        
        document.querySelectorAll('.config-panel').forEach(panel => {
            panel.classList.remove('active');
        });
        
        const tool = this.drawingEngine.currentTool;
        if (tool === 'pen') {
            document.getElementById('pen-btn').classList.add('active');
            document.getElementById('pen-config').classList.add('active');
            this.canvas.style.cursor = 'crosshair';
        } else if (tool === 'pan') {
            document.getElementById('pan-btn').classList.add('active');
            this.canvas.style.cursor = 'grab';
        } else if (tool === 'eraser') {
            document.getElementById('eraser-btn').classList.add('active');
            document.getElementById('eraser-config').classList.add('active');
            this.canvas.style.cursor = 'pointer';
        } else if (tool === 'background') {
            document.getElementById('background-btn').classList.add('active');
            document.getElementById('background-config').classList.add('active');
            this.canvas.style.cursor = 'default';
        } else if (tool === 'more') {
            document.getElementById('more-btn').classList.add('active');
            // Show feature-area instead of more-config and position it above the "更多" button
            const featureArea = document.getElementById('feature-area');
            const moreBtn = document.getElementById('more-btn');
            featureArea.classList.add('show');
            
            // Position feature-area above the "更多" button
            const moreBtnRect = moreBtn.getBoundingClientRect();
            const toolbar = document.getElementById('toolbar');
            const toolbarRect = toolbar.getBoundingClientRect();
            
            // Calculate position above the toolbar
            featureArea.style.bottom = 'auto';
            featureArea.style.left = `${moreBtnRect.left}px`;
            featureArea.style.top = `${toolbarRect.top - 10}px`;
            featureArea.style.transform = 'translateY(-100%)';
            
            this.canvas.style.cursor = 'default';
        }
        
        document.getElementById('undo-btn').disabled = !this.historyManager.canUndo();
        document.getElementById('redo-btn').disabled = !this.historyManager.canRedo();
        
        const paginationControls = document.getElementById('pagination-controls');
        if (!this.settingsManager.infiniteCanvas) {
            paginationControls.classList.add('show');
        } else {
            paginationControls.classList.remove('show');
        }
    }
    
    updateCanvasMode() {
        this.updateUI();
        this.applyCanvasSize();
        // Initialize pages array if needed
        if (!this.settingsManager.infiniteCanvas && this.pages.length === 0) {
            this.pages.push(this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height));
            this.currentPage = 1;
            this.pagination.updatePaginationUI();
        }
    }
    
    applyCanvasSize() {
        if (!this.settingsManager.infiniteCanvas) {
            // In paginated mode, apply custom canvas size
            const width = this.settingsManager.canvasWidth;
            const height = this.settingsManager.canvasHeight;
            const dpr = window.devicePixelRatio || 1;
            
            // Save current content
            const oldWidth = this.canvas.width;
            const oldHeight = this.canvas.height;
            const imageData = this.historyManager.historyStep >= 0 ? 
                this.ctx.getImageData(0, 0, oldWidth, oldHeight) : null;
            
            // Set canvas size and CSS size
            this.canvas.width = width * dpr;
            this.canvas.height = height * dpr;
            this.canvas.style.width = width + 'px';
            this.canvas.style.height = height + 'px';
            
            this.bgCanvas.width = width * dpr;
            this.bgCanvas.height = height * dpr;
            this.bgCanvas.style.width = width + 'px';
            this.bgCanvas.style.height = height + 'px';
            
            // Center the canvas on the screen
            this.canvas.style.position = 'absolute';
            this.canvas.style.left = '50%';
            this.canvas.style.top = '50%';
            this.canvas.style.transform = `translate(-50%, -50%) scale(${this.drawingEngine.canvasScale})`;
            
            this.bgCanvas.style.position = 'absolute';
            this.bgCanvas.style.left = '50%';
            this.bgCanvas.style.top = '50%';
            this.bgCanvas.style.transform = `translate(-50%, -50%) scale(${this.drawingEngine.canvasScale})`;
            
            // Re-apply DPR scaling to context
            this.ctx.scale(dpr, dpr);
            this.bgCtx.scale(dpr, dpr);
            
            // Restore content
            if (imageData) {
                this.ctx.putImageData(imageData, 0, 0);
            }
            
            this.backgroundManager.drawBackground();
        } else {
            // In infinite canvas mode, canvas fills the viewport and is centered
            this.canvas.style.position = 'absolute';
            this.canvas.style.left = '50%';
            this.canvas.style.top = '50%';
            this.canvas.style.width = '100%';
            this.canvas.style.height = '100%';
            this.canvas.style.transform = `translate(-50%, -50%) scale(${this.drawingEngine.canvasScale})`;
            
            this.bgCanvas.style.position = 'absolute';
            this.bgCanvas.style.left = '50%';
            this.bgCanvas.style.top = '50%';
            this.bgCanvas.style.width = '100%';
            this.bgCanvas.style.height = '100%';
            this.bgCanvas.style.transform = `translate(-50%, -50%) scale(${this.drawingEngine.canvasScale})`;
            
            this.resizeCanvas();
        }
    }
    
    // Zoom methods
    
    
    
    
    
    
    
    
    
    updatePatternGrid() {
        const patternGrid = document.getElementById('pattern-grid');
        const patterns = this.settingsManager.getPatternPreferences();
        
        // Hide all pattern buttons first
        patternGrid.querySelectorAll('.pattern-option-btn').forEach(btn => {
            const pattern = btn.dataset.pattern;
            if (patterns[pattern]) {
                btn.style.display = 'block';
            } else {
                btn.style.display = 'none';
            }
        });
    }
    
    handleFullscreenChange() {
        const btn = document.getElementById('fullscreen-btn');
        if (!document.fullscreenElement) {
            // Exited fullscreen
            btn.innerHTML = `
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"></path>
                </svg>
            `;
            btn.title = '全屏 (F11)';
        } else {
            // Entered fullscreen
            btn.innerHTML = `
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M8 3v3a2 2 0 0 1-2 2H3m18 0h-3a2 2 0 0 1-2-2V3m0 18v-3a2 2 0 0 1 2-2h3M3 16h3a2 2 0 0 1 2 2v3"></path>
                </svg>
            `;
            btn.title = '退出全屏 (F11)';
        }
    }
    
    
    hideHistoryControls() {
        const historyControls = document.getElementById('history-controls');
        historyControls.style.display = 'none';
    }
    
    // Pagination methods
    
    
    
    
    
    
    
    updateBackgroundUI() {
        // Update background color buttons
        document.querySelectorAll('.color-btn[data-bg-color]').forEach(btn => {
            if (btn.dataset.bgColor === this.backgroundManager.backgroundColor) {
                btn.classList.add('active');
            } else {
                btn.classList.remove('active');
            }
        });
        
        // Update pattern buttons
        document.querySelectorAll('.pattern-option-btn').forEach(btn => {
            if (btn.dataset.pattern === this.backgroundManager.backgroundPattern) {
                btn.classList.add('active');
            } else {
                btn.classList.remove('active');
            }
        });
        
        // Update custom color picker
        document.getElementById('custom-bg-color-picker').value = this.backgroundManager.backgroundColor;
    }
    
    
    updateEraserCursor(e) {
        if (this.drawingEngine.currentTool === 'eraser') {
            this.eraserCursor.style.left = e.clientX + 'px';
            this.eraserCursor.style.top = e.clientY + 'px';
            this.eraserCursor.style.width = this.drawingEngine.eraserSize + 'px';
            this.eraserCursor.style.height = this.drawingEngine.eraserSize + 'px';
        }
    }
    
    updateEraserCursorShape() {
        if (this.drawingEngine.eraserShape === 'rectangle') {
            this.eraserCursor.style.borderRadius = '0';
        } else {
            this.eraserCursor.style.borderRadius = '50%';
        }
    }
    
    showEraserCursor() {
        if (this.drawingEngine.currentTool === 'eraser') {
            this.updateEraserCursorShape();
            this.eraserCursor.style.display = 'block';
        }
    }
    
    hideEraserCursor() {
        this.eraserCursor.style.display = 'none';
    }
    
    // Pinch zoom and pan gesture handlers
    handlePinchStart(e) {
        if (e.touches.length !== 2) return;
        
        this.isPinching = true;
        const touch1 = e.touches[0];
        const touch2 = e.touches[1];
        this.lastPinchDistance = this.getPinchDistance(touch1, touch2);
        this.lastPinchCenter = this.getPinchCenter(touch1, touch2);
    }
    
    handlePinchMove(e) {
        if (!this.isPinching || e.touches.length !== 2) return;
        
        const touch1 = e.touches[0];
        const touch2 = e.touches[1];
        const currentDistance = this.getPinchDistance(touch1, touch2);
        const currentCenter = this.getPinchCenter(touch1, touch2);
        
        if (this.lastPinchDistance > 0 && this.lastPinchCenter) {
            // Calculate zoom based on pinch distance
            const scale = currentDistance / this.lastPinchDistance;
            const newScale = Math.max(0.5, Math.min(3.0, this.drawingEngine.canvasScale * scale));
            
            this.drawingEngine.canvasScale = newScale;
            this.canvasView.applyZoom(false); // Don't update config-area scale on zoom
            this.canvasView.updateZoomUI();
            localStorage.setItem('canvasScale', newScale);
            
            // Calculate pan based on center movement
            const deltaX = currentCenter.x - this.lastPinchCenter.x;
            const deltaY = currentCenter.y - this.lastPinchCenter.y;
            
            // Apply panning to canvas offset
            this.drawingEngine.panOffset.x += deltaX;
            this.drawingEngine.panOffset.y += deltaY;
            localStorage.setItem('panOffsetX', this.drawingEngine.panOffset.x);
            localStorage.setItem('panOffsetY', this.drawingEngine.panOffset.y);
            
            // Apply visual pan and zoom effect
            const transform = `scale(${this.drawingEngine.canvasScale}) translate(${this.drawingEngine.panOffset.x}px, ${this.drawingEngine.panOffset.y}px)`;
            this.canvas.style.transform = transform;
            this.bgCanvas.style.transform = transform;
        }
        
        this.lastPinchDistance = currentDistance;
        this.lastPinchCenter = currentCenter;
    }
    
    handlePinchEnd() {
        this.isPinching = false;
        this.lastPinchDistance = 0;
        this.lastPinchCenter = null;
    }
    
    getPinchDistance(touch1, touch2) {
        const dx = touch2.clientX - touch1.clientX;
        const dy = touch2.clientY - touch1.clientY;
        return Math.sqrt(dx * dx + dy * dy);
    }
    
    getPinchCenter(touch1, touch2) {
        return {
            x: (touch1.clientX + touch2.clientX) / 2,
            y: (touch1.clientY + touch2.clientY) / 2
        };
    }
    
    
    loadUploadedImages() {
        const saved = localStorage.getItem('uploadedImages');
        if (saved) {
            try {
                return JSON.parse(saved);
            } catch (e) {
                console.warn('Failed to load uploaded images from localStorage:', e);
                localStorage.removeItem('uploadedImages');
                return [];
            }
        }
        return [];
    }
    
    saveUploadedImage(imageData) {
        // Check if we're approaching localStorage limit
        const currentSize = new Blob([localStorage.getItem('uploadedImages') || '[]']).size;
        const imageSize = new Blob([imageData]).size;
        
        // Limit to approximately 4MB total to avoid hitting localStorage limits
        if (currentSize + imageSize > 4 * 1024 * 1024) {
            alert('存储空间不足，无法保存更多图片。请清除一些旧图片。');
            return;
        }
        
        const imageId = `img_${Date.now()}`;
        this.uploadedImages.push({
            id: imageId,
            data: imageData,
            name: `图片${this.uploadedImages.length + 1}`
        });
        
        try {
            localStorage.setItem('uploadedImages', JSON.stringify(this.uploadedImages));
            this.updateUploadedImagesButtons();
        } catch (e) {
            console.error('Failed to save image to localStorage:', e);
            alert('保存图片失败，存储空间可能不足。');
            this.uploadedImages.pop(); // Remove the image we just added
        }
    }
    
    updateUploadedImagesButtons() {
        const patternGrid = document.getElementById('pattern-grid');
        
        // Remove existing uploaded image buttons
        patternGrid.querySelectorAll('.uploaded-image-btn').forEach(btn => btn.remove());
        
        // Add buttons for each uploaded image
        this.uploadedImages.forEach((image, index) => {
            const btn = document.createElement('button');
            btn.className = 'pattern-option-btn uploaded-image-btn';
            btn.dataset.imageId = image.id;
            btn.textContent = image.name;
            btn.addEventListener('click', () => {
                this.backgroundManager.setBackgroundImage(image.data);
                document.querySelectorAll('.pattern-option-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                document.getElementById('image-size-group').style.display = 'flex';
                document.getElementById('pattern-density-group').style.display = 'none';
            });
            
            // Insert before the upload button
            const uploadBtn = patternGrid.querySelector('#image-pattern-btn');
            patternGrid.insertBefore(btn, uploadBtn);
        });
    }
    
    dragCoordinateOrigin(e) {
        if (!this.isDraggingCoordinateOrigin) return;
        
        const deltaX = e.clientX - this.coordinateOriginDragStart.x;
        const deltaY = e.clientY - this.coordinateOriginDragStart.y;
        
        const origin = this.backgroundManager.getCoordinateOrigin();
        this.backgroundManager.setCoordinateOrigin(origin.x + deltaX, origin.y + deltaY);
        
        this.coordinateOriginDragStart = { x: e.clientX, y: e.clientY };
    }
    
    stopDraggingCoordinateOrigin() {
        this.isDraggingCoordinateOrigin = false;
    }
}

// Initialize the application
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        new DrawingBoard();
    });
} else {
    new DrawingBoard();
}
