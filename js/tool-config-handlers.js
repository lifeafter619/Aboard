/**
 * Tool Configuration Handlers Module - 工具配置处理模块
 * Handles event listeners for tool configuration controls
 * 处理工具配置控件的事件监听器
 * 
 * This module manages:
 * - Pen type selection (笔类型选择)
 * - Color picker for pen and background (笔和背景的颜色选择器)
 * - Background pattern selection (背景图案选择)
 * - Background image upload and controls (背景图片上传和控制)
 * - Pen and eraser size controls (笔和橡皮擦大小控制)
 * - Time display and timer feature controls (时间显示和计时器功能控制)
 */

class ToolConfigHandlers {
    /**
     * Constructor - 构造函数
     * @param {DrawingBoard} board - Reference to the main DrawingBoard instance
     */
    constructor(board) {
        this.board = board;
    }

    /**
     * Setup all tool configuration listeners - 设置所有工具配置监听器
     */
    setupToolConfigListeners() {
        this.setupPenTypeButtons();
        this.setupColorPickers();
        this.setupBackgroundColorPickers();
        this.setupBackgroundPatternButtons();
        this.setupBackgroundImageControls();
        this.setupPatternDensitySlider();
        this.setupPenSizeSlider();
        this.setupEraserControls();
        this.setupFeatureButtons();
    }

    /**
     * Setup pen type selection buttons - 设置笔类型选择按钮
     */
    setupPenTypeButtons() {
        const board = this.board;
        
        document.querySelectorAll('.pen-type-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                board.drawingEngine.setPenType(e.target.dataset.penType);
                document.querySelectorAll('.pen-type-btn').forEach(b => b.classList.remove('active'));
                e.target.classList.add('active');
            });
        });
    }

    /**
     * Setup pen color pickers - 设置笔颜色选择器
     */
    setupColorPickers() {
        const board = this.board;
        
        // Preset color buttons
        document.querySelectorAll('.color-btn[data-color]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                board.drawingEngine.setColor(e.target.dataset.color);
                document.querySelectorAll('.color-btn[data-color]').forEach(b => b.classList.remove('active'));
                e.target.classList.add('active');
            });
        });
        
        // Custom color picker
        const customColorPicker = document.getElementById('custom-color-picker');
        customColorPicker.addEventListener('input', (e) => {
            board.drawingEngine.setColor(e.target.value);
            document.querySelectorAll('.color-btn[data-color]').forEach(b => b.classList.remove('active'));
        });
    }

    /**
     * Setup background color pickers - 设置背景颜色选择器
     */
    setupBackgroundColorPickers() {
        const board = this.board;
        
        // Preset background color buttons
        document.querySelectorAll('.color-btn[data-bg-color]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                board.backgroundManager.setBackgroundColor(e.target.dataset.bgColor);
                document.querySelectorAll('.color-btn[data-bg-color]').forEach(b => b.classList.remove('active'));
                e.target.classList.add('active');
                // Save page background in paginated mode
                // 在分页模式下保存页面背景
                if (!board.settingsManager.infiniteCanvas) {
                    board.savePageBackground(board.currentPage);
                }
            });
        });
        
        // Custom background color picker
        const customBgColorPicker = document.getElementById('custom-bg-color-picker');
        customBgColorPicker.addEventListener('input', (e) => {
            board.backgroundManager.setBackgroundColor(e.target.value);
            document.querySelectorAll('.color-btn[data-bg-color]').forEach(b => b.classList.remove('active'));
            // Save page background in paginated mode
            if (!board.settingsManager.infiniteCanvas) {
                board.savePageBackground(board.currentPage);
            }
        });
    }

    /**
     * Setup background pattern selection buttons - 设置背景图案选择按钮
     */
    setupBackgroundPatternButtons() {
        const board = this.board;
        
        document.querySelectorAll('.pattern-option-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const pattern = e.target.dataset.pattern;
                if (pattern === 'image') {
                    // Trigger file upload for image pattern
                    document.getElementById('bg-image-upload').click();
                } else {
                    board.backgroundManager.setBackgroundPattern(pattern);
                    document.querySelectorAll('.pattern-option-btn').forEach(b => b.classList.remove('active'));
                    e.target.classList.add('active');
                    document.getElementById('image-size-group').style.display = 'none';
                    
                    // Show/hide pattern density slider based on pattern
                    // 根据图案显示/隐藏图案密度滑块
                    const patternDensityGroup = document.getElementById('pattern-density-group');
                    if (pattern !== 'blank' && pattern !== 'image') {
                        patternDensityGroup.style.display = 'flex';
                    } else {
                        patternDensityGroup.style.display = 'none';
                    }
                    
                    // Save page background in paginated mode
                    if (!board.settingsManager.infiniteCanvas) {
                        board.savePageBackground(board.currentPage);
                    }
                }
            });
        });
    }

    /**
     * Setup background image upload and controls - 设置背景图片上传和控制
     */
    setupBackgroundImageControls() {
        const board = this.board;
        
        // Background image upload
        document.getElementById('bg-image-upload').addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = (event) => {
                    const imageData = event.target.result;
                    
                    // Reset confirmation state for new image
                    board.imageControls.resetConfirmation();
                    
                    board.backgroundManager.setBackgroundImage(imageData);
                    document.querySelectorAll('.pattern-option-btn').forEach(b => b.classList.remove('active'));
                    document.querySelector('.pattern-option-btn[data-pattern="image"]').classList.add('active');
                    document.getElementById('image-size-group').style.display = 'flex';
                    // Hide pattern density when image is uploaded
                    document.getElementById('pattern-density-group').style.display = 'none';
                    
                    // Save uploaded image
                    board.saveUploadedImage(imageData);
                    
                    // Show image controls for manipulation
                    const imgData = board.backgroundManager.getImageData();
                    if (imgData) {
                        board.imageControls.showControls(imgData);
                    }
                };
                reader.readAsDataURL(file);
            }
        });
        
        // Background image size slider
        const bgImageSizeSlider = document.getElementById('bg-image-size-slider');
        const bgImageSizeValue = document.getElementById('bg-image-size-value');
        bgImageSizeSlider.addEventListener('input', (e) => {
            board.backgroundManager.setImageSize(parseInt(e.target.value) / 100);
            bgImageSizeValue.textContent = e.target.value;
        });
        
        // Adjust background image button
        document.getElementById('adjust-bg-image-btn').addEventListener('click', () => {
            // Reset confirmation state to allow re-adjustment
            board.imageControls.resetConfirmation();
            
            // Show image controls for the current background image
            const imgData = board.backgroundManager.getImageData();
            if (imgData) {
                board.imageControls.showControls(imgData);
            }
        });
    }

    /**
     * Setup pattern density slider - 设置图案密度滑块
     */
    setupPatternDensitySlider() {
        const board = this.board;
        
        const patternDensitySlider = document.getElementById('pattern-density-slider');
        const patternDensityValue = document.getElementById('pattern-density-value');
        patternDensitySlider.addEventListener('input', (e) => {
            board.backgroundManager.setPatternDensity(parseInt(e.target.value) / 100);
            patternDensityValue.textContent = e.target.value;
        });
    }

    /**
     * Setup pen size slider - 设置笔大小滑块
     */
    setupPenSizeSlider() {
        const board = this.board;
        
        const penSizeSlider = document.getElementById('pen-size-slider');
        const penSizeValue = document.getElementById('pen-size-value');
        penSizeSlider.addEventListener('input', (e) => {
            board.drawingEngine.setPenSize(parseInt(e.target.value));
            penSizeValue.textContent = e.target.value;
        });
    }

    /**
     * Setup eraser shape and size controls - 设置橡皮擦形状和大小控制
     */
    setupEraserControls() {
        const board = this.board;
        
        // Eraser shape buttons
        document.querySelectorAll('.eraser-shape-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                board.drawingEngine.setEraserShape(e.target.dataset.eraserShape);
                document.querySelectorAll('.eraser-shape-btn').forEach(b => b.classList.remove('active'));
                e.target.classList.add('active');
                // Update cursor shape
                board.updateEraserCursorShape();
            });
        });
        
        // Eraser size slider
        const eraserSizeSlider = document.getElementById('eraser-size-slider');
        const eraserSizeValue = document.getElementById('eraser-size-value');
        eraserSizeSlider.addEventListener('input', (e) => {
            board.drawingEngine.setEraserSize(parseInt(e.target.value));
            eraserSizeValue.textContent = e.target.value;
            if (board.drawingEngine.currentTool === 'eraser') {
                board.eraserCursor.style.width = e.target.value + 'px';
                board.eraserCursor.style.height = e.target.value + 'px';
            }
        });
    }

    /**
     * Setup feature buttons (time display and timer) - 设置功能按钮（时间显示和计时器）
     */
    setupFeatureButtons() {
        const board = this.board;
        
        // More config panel (time display checkboxes)
        const showDateCheckboxMore = document.getElementById('show-date-checkbox-more');
        const showTimeCheckboxMore = document.getElementById('show-time-checkbox-more');
        
        // Time Display Feature Button
        const timeDisplayFeatureBtn = document.getElementById('time-display-feature-btn');
        const timeDisplayControls = document.getElementById('time-display-controls');
        
        if (timeDisplayFeatureBtn && timeDisplayControls) {
            timeDisplayFeatureBtn.addEventListener('click', () => {
                // Toggle the time display controls visibility
                // 切换时间显示控件的可见性
                const isVisible = timeDisplayControls.style.display !== 'none';
                if (isVisible) {
                    timeDisplayControls.style.display = 'none';
                    timeDisplayFeatureBtn.classList.remove('active');
                } else {
                    timeDisplayControls.style.display = 'flex';
                    timeDisplayFeatureBtn.classList.add('active');
                    // Refresh collapsible groups after showing new content
                    if (board.collapsibleManager) {
                        setTimeout(() => board.collapsibleManager.refreshAll(), 50);
                    }
                }
            });
        }
        
        // Timer Feature Button
        const timerFeatureBtn = document.getElementById('timer-feature-btn');
        if (timerFeatureBtn) {
            timerFeatureBtn.addEventListener('click', () => {
                board.timerManager.showSettingsModal();
            });
        }
        
        // Timer settings modal close button
        const timerSettingsCloseBtn = document.getElementById('timer-settings-close-btn');
        if (timerSettingsCloseBtn) {
            timerSettingsCloseBtn.addEventListener('click', () => {
                board.timerManager.hideSettingsModal();
            });
        }
        
        // Setup time display checkboxes
        this.setupTimeDisplayCheckboxes(showDateCheckboxMore, showTimeCheckboxMore, 
                                       timeDisplayFeatureBtn, timeDisplayControls);
    }

    /**
     * Setup time display checkboxes - 设置时间显示复选框
     */
    setupTimeDisplayCheckboxes(showDateCheckboxMore, showTimeCheckboxMore, 
                               timeDisplayFeatureBtn, timeDisplayControls) {
        const board = this.board;
        
        // Load initial checkbox states
        if (showDateCheckboxMore && showTimeCheckboxMore) {
            showDateCheckboxMore.checked = board.timeDisplayManager.showDate;
            showTimeCheckboxMore.checked = board.timeDisplayManager.showTime;
            
            // Set initial button state based on whether time display is enabled
            if (timeDisplayFeatureBtn) {
                if (board.timeDisplayManager.enabled) {
                    timeDisplayFeatureBtn.classList.add('active');
                    timeDisplayControls.style.display = 'flex';
                }
            }
            
            // Update visibility based on initial state
            if (showDateCheckboxMore.checked || showTimeCheckboxMore.checked) {
                board.timeDisplayManager.show();
            } else {
                board.timeDisplayManager.hide();
            }
            
            // Show date checkbox change event
            showDateCheckboxMore.addEventListener('change', (e) => {
                board.timeDisplayManager.setShowDate(e.target.checked);
                // Hide if both unchecked
                if (!showDateCheckboxMore.checked && !showTimeCheckboxMore.checked) {
                    board.timeDisplayManager.hide();
                } else {
                    board.timeDisplayManager.show();
                }
            });
            
            // Show time checkbox change event
            showTimeCheckboxMore.addEventListener('change', (e) => {
                board.timeDisplayManager.setShowTime(e.target.checked);
                // Hide if both unchecked
                if (!showDateCheckboxMore.checked && !showTimeCheckboxMore.checked) {
                    board.timeDisplayManager.hide();
                } else {
                    board.timeDisplayManager.show();
                }
            });
        }
    }
}
