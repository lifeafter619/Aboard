/**
 * Settings Handlers Module - 设置处理模块
 * Handles all settings modal event listeners
 * 处理所有设置模态框的事件监听器
 * 
 * This module manages settings for:
 * - General settings (toolbar size, config scale, control position, etc.)
 * - Canvas mode and size settings
 * - Theme color customization
 * - Time display settings (timezone, format, colors, etc.)
 * - Pattern preferences
 */

class SettingsHandlers {
    /**
     * Constructor - 构造函数
     * @param {DrawingBoard} board - Reference to the main DrawingBoard instance
     */
    constructor(board) {
        this.board = board;
    }

    /**
     * Setup all settings event listeners - 设置所有设置事件监听器
     */
    setupSettingsListeners() {
        this.setupGeneralSettings();
        this.setupCanvasModeSettings();
        this.setupCanvasSizeSettings();
        this.setupZoomAndFullscreenSettings();
        this.setupThemeColorSettings();
        this.setupPatternPreferences();
        this.setupTimeDisplaySettings();
        this.setupConfirmModal();
        this.setupModalCloseEvents();
    }

    /**
     * Setup general settings - 设置通用设置
     */
    setupGeneralSettings() {
        const board = this.board;
        
        // Close settings button
        document.getElementById('settings-close-btn').addEventListener('click', () => board.closeSettings());
        
        // Settings tabs
        document.querySelectorAll('.settings-tab-icon').forEach(tab => {
            tab.addEventListener('click', (e) => {
                const tabName = e.currentTarget.dataset.tab;
                board.settingsManager.switchTab(tabName);
            });
        });
        
        // Toolbar size slider
        const toolbarSizeSlider = document.getElementById('toolbar-size-slider');
        const toolbarSizeValue = document.getElementById('toolbar-size-value');
        toolbarSizeSlider.addEventListener('input', (e) => {
            board.settingsManager.toolbarSize = parseInt(e.target.value);
            toolbarSizeValue.textContent = e.target.value;
            board.settingsManager.updateToolbarSize();
        });
        
        // Config scale slider
        const configScaleSlider = document.getElementById('config-scale-slider');
        const configScaleValue = document.getElementById('config-scale-value');
        configScaleSlider.addEventListener('input', (e) => {
            board.settingsManager.configScale = parseInt(e.target.value) / 100;
            configScaleValue.textContent = Math.round(board.settingsManager.configScale * 100);
            board.settingsManager.updateConfigScale();
        });
        
        // Background opacity slider
        const bgOpacitySlider = document.getElementById('bg-opacity-slider');
        const bgOpacityValue = document.getElementById('bg-opacity-value');
        bgOpacitySlider.addEventListener('input', (e) => {
            board.backgroundManager.setOpacity(parseInt(e.target.value) / 100);
            bgOpacityValue.textContent = e.target.value;
        });
        
        // Pattern intensity slider
        const patternIntensitySlider = document.getElementById('pattern-intensity-slider');
        const patternIntensityValue = document.getElementById('pattern-intensity-value');
        patternIntensitySlider.addEventListener('input', (e) => {
            board.backgroundManager.setPatternIntensity(parseInt(e.target.value) / 100);
            patternIntensityValue.textContent = e.target.value;
        });
        
        // Control position buttons
        document.querySelectorAll('.position-option-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                board.settingsManager.setControlPosition(e.target.dataset.position, board.timeDisplayManager);
            });
        });
        
        // Edge snap checkbox
        document.getElementById('edge-snap-checkbox').addEventListener('change', (e) => {
            board.settingsManager.edgeSnapEnabled = e.target.checked;
            localStorage.setItem('edgeSnapEnabled', e.target.checked);
        });
        
        // Global font selector
        document.getElementById('global-font-select').addEventListener('change', (e) => {
            board.settingsManager.setGlobalFont(e.target.value);
        });
    }

    /**
     * Setup canvas mode settings - 设置画布模式设置
     */
    setupCanvasModeSettings() {
        const board = this.board;
        
        // Canvas mode buttons (infinite/paginated)
        document.querySelectorAll('.canvas-mode-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const mode = e.target.dataset.mode;
                board.settingsManager.setCanvasMode(mode);
                document.querySelectorAll('.canvas-mode-btn').forEach(b => b.classList.remove('active'));
                e.target.classList.add('active');
                board.updateCanvasMode();
            });
        });
    }

    /**
     * Setup canvas size settings - 设置画布大小设置
     */
    setupCanvasSizeSettings() {
        const board = this.board;
        
        // Canvas preset buttons (A4, A3, 16:9, etc.)
        document.querySelectorAll('.canvas-preset-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const preset = e.target.dataset.preset;
                board.settingsManager.setCanvasPreset(preset);
                document.querySelectorAll('.canvas-preset-btn').forEach(b => b.classList.remove('active'));
                e.target.classList.add('active');
                board.applyCanvasSize();
            });
        });
        
        // Canvas width input
        document.getElementById('canvas-width-input').addEventListener('change', (e) => {
            const width = parseInt(e.target.value);
            const height = parseInt(document.getElementById('canvas-height-input').value);
            board.settingsManager.setCanvasSize(width, height);
            // Set to custom when manually changing size
            document.querySelectorAll('.canvas-preset-btn').forEach(b => b.classList.remove('active'));
            document.querySelector('.canvas-preset-btn[data-preset="custom"]').classList.add('active');
            board.applyCanvasSize();
        });
        
        // Canvas height input
        document.getElementById('canvas-height-input').addEventListener('change', (e) => {
            const height = parseInt(e.target.value);
            const width = parseInt(document.getElementById('canvas-width-input').value);
            board.settingsManager.setCanvasSize(width, height);
            // Set to custom when manually changing size
            document.querySelectorAll('.canvas-preset-btn').forEach(b => b.classList.remove('active'));
            document.querySelector('.canvas-preset-btn[data-preset="custom"]').classList.add('active');
            board.applyCanvasSize();
        });
        
        // Canvas ratio selector
        document.getElementById('canvas-ratio-select').addEventListener('change', (e) => {
            const ratio = e.target.value;
            if (ratio !== 'custom') {
                const width = parseInt(document.getElementById('canvas-width-input').value);
                let height;
                
                // Calculate height based on ratio
                switch(ratio) {
                    case '16:9':
                        height = Math.round(width * 9 / 16);
                        break;
                    case '4:3':
                        height = Math.round(width * 3 / 4);
                        break;
                    case '1:1':
                        height = width;
                        break;
                    case '3:4':
                        height = Math.round(width * 4 / 3);
                        break;
                    case '9:16':
                        height = Math.round(width * 16 / 9);
                        break;
                }
                
                document.getElementById('canvas-height-input').value = height;
                board.settingsManager.setCanvasSize(width, height);
            }
        });
    }

    /**
     * Setup zoom and fullscreen settings - 设置缩放和全屏设置
     */
    setupZoomAndFullscreenSettings() {
        const board = this.board;
        
        // Show/hide zoom controls checkbox
        document.getElementById('show-zoom-controls-checkbox').addEventListener('change', (e) => {
            board.settingsManager.showZoomControls = e.target.checked;
            localStorage.setItem('showZoomControls', e.target.checked);
            board.updateZoomControlsVisibility();
        });
        
        // Show/hide fullscreen button checkbox
        document.getElementById('show-fullscreen-btn-checkbox').addEventListener('change', (e) => {
            board.settingsManager.showFullscreenBtn = e.target.checked;
            localStorage.setItem('showFullscreenBtn', e.target.checked);
            board.updateFullscreenBtnVisibility();
        });
    }

    /**
     * Setup theme color settings - 设置主题颜色设置
     */
    setupThemeColorSettings() {
        const board = this.board;
        
        // Theme color preset buttons
        document.querySelectorAll('.color-btn[data-theme-color]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                board.settingsManager.setThemeColor(e.target.dataset.themeColor);
                document.querySelectorAll('.color-btn[data-theme-color]').forEach(b => b.classList.remove('active'));
                e.target.classList.add('active');
            });
        });
        
        // Custom theme color picker
        const customThemeColorPicker = document.getElementById('custom-theme-color-picker');
        customThemeColorPicker.addEventListener('input', (e) => {
            board.settingsManager.setThemeColor(e.target.value);
            document.querySelectorAll('.color-btn[data-theme-color]').forEach(b => b.classList.remove('active'));
        });
    }

    /**
     * Setup pattern preferences - 设置图案偏好设置
     */
    setupPatternPreferences() {
        const board = this.board;
        
        // Pattern preference checkboxes
        document.querySelectorAll('.pattern-pref-checkbox').forEach(checkbox => {
            checkbox.addEventListener('change', (e) => {
                board.settingsManager.updatePatternPreferences();
                board.updatePatternGrid();
            });
        });
    }

    /**
     * Setup time display settings - 设置时间显示设置
     */
    setupTimeDisplaySettings() {
        const board = this.board;
        
        // Show time display checkbox
        this.setupTimeDisplayToggle();
        
        // Display type buttons (both, date-only, time-only)
        this.setupDisplayTypeButtons();
        
        // Timezone and format selectors
        this.setupTimezonAndFormatSelectors();
        
        // Color settings
        this.setupTimeDisplayColors();
        
        // Fullscreen mode settings
        this.setupTimeDisplayFullscreen();
        
        // Font size and opacity settings
        this.setupTimeDisplaySizeAndOpacity();
    }

    /**
     * Setup time display toggle - 设置时间显示切换
     */
    setupTimeDisplayToggle() {
        const board = this.board;
        
        document.getElementById('show-time-display-checkbox').addEventListener('change', (e) => {
            const timeDisplaySettings = document.getElementById('time-display-settings');
            const timezoneSettings = document.getElementById('timezone-settings');
            const timeFormatSettings = document.getElementById('time-format-settings');
            const dateFormatSettings = document.getElementById('date-format-settings');
            const timeColorSettings = document.getElementById('time-color-settings');
            const timeFontSizeSettings = document.getElementById('time-font-size-settings');
            const timeOpacitySettings = document.getElementById('time-opacity-settings');
            const timeFullscreenSettings = document.getElementById('time-fullscreen-settings');
            const timeFullscreenFontSizeSettings = document.getElementById('time-fullscreen-font-size-settings');
            
            if (e.target.checked) {
                board.timeDisplayManager.show();
                timeDisplaySettings.style.display = 'flex';
                timezoneSettings.style.display = 'flex';
                timeFormatSettings.style.display = 'flex';
                dateFormatSettings.style.display = 'flex';
                timeColorSettings.style.display = 'flex';
                timeFontSizeSettings.style.display = 'flex';
                timeOpacitySettings.style.display = 'flex';
                timeFullscreenSettings.style.display = 'flex';
                timeFullscreenFontSizeSettings.style.display = 'flex';
            } else {
                board.timeDisplayManager.hide();
                timeDisplaySettings.style.display = 'none';
                timezoneSettings.style.display = 'none';
                timeFormatSettings.style.display = 'none';
                dateFormatSettings.style.display = 'none';
                timeColorSettings.style.display = 'none';
                timeFontSizeSettings.style.display = 'none';
                timeOpacitySettings.style.display = 'none';
                timeFullscreenSettings.style.display = 'none';
                timeFullscreenFontSizeSettings.style.display = 'none';
            }
        });
    }

    /**
     * Setup display type buttons - 设置显示类型按钮
     */
    setupDisplayTypeButtons() {
        const board = this.board;
        
        document.querySelectorAll('.display-option-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const displayType = e.target.dataset.displayType;
                document.querySelectorAll('.display-option-btn').forEach(b => b.classList.remove('active'));
                e.target.classList.add('active');
                
                switch(displayType) {
                    case 'both':
                        board.timeDisplayManager.setShowDate(true);
                        board.timeDisplayManager.setShowTime(true);
                        break;
                    case 'date-only':
                        board.timeDisplayManager.setShowDate(true);
                        board.timeDisplayManager.setShowTime(false);
                        break;
                    case 'time-only':
                        board.timeDisplayManager.setShowDate(false);
                        board.timeDisplayManager.setShowTime(true);
                        break;
                }
            });
        });
    }

    /**
     * Setup timezone and format selectors - 设置时区和格式选择器
     */
    setupTimezonAndFormatSelectors() {
        const board = this.board;
        
        // Timezone selector
        document.getElementById('timezone-select').addEventListener('change', (e) => {
            board.timeDisplayManager.setTimezone(e.target.value);
        });
        
        // Time format selector (12h/24h)
        document.getElementById('time-format-select').addEventListener('change', (e) => {
            board.timeDisplayManager.setTimeFormat(e.target.value);
        });
        
        // Date format selector
        document.getElementById('date-format-select').addEventListener('change', (e) => {
            board.timeDisplayManager.setDateFormat(e.target.value);
        });
    }

    /**
     * Setup time display colors - 设置时间显示颜色
     */
    setupTimeDisplayColors() {
        const board = this.board;
        
        // Time text color preset buttons
        document.querySelectorAll('.color-btn[data-time-color]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                board.timeDisplayManager.setColor(e.target.dataset.timeColor);
                document.querySelectorAll('.color-btn[data-time-color]').forEach(b => b.classList.remove('active'));
                e.target.classList.add('active');
            });
        });
        
        // Time text color custom picker
        const customTimeColorPicker = document.getElementById('custom-time-color-picker');
        customTimeColorPicker.addEventListener('input', (e) => {
            board.timeDisplayManager.setColor(e.target.value);
            document.querySelectorAll('.color-btn[data-time-color]').forEach(b => b.classList.remove('active'));
        });
        
        // Time background color preset buttons
        document.querySelectorAll('.color-btn[data-time-bg-color]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                board.timeDisplayManager.setBgColor(e.target.dataset.timeBgColor);
                document.querySelectorAll('.color-btn[data-time-bg-color]').forEach(b => b.classList.remove('active'));
                e.target.classList.add('active');
            });
        });
        
        // Time background color custom picker
        const customTimeBgColorPicker = document.getElementById('custom-time-bg-color-picker');
        customTimeBgColorPicker.addEventListener('input', (e) => {
            board.timeDisplayManager.setBgColor(e.target.value);
            document.querySelectorAll('.color-btn[data-time-bg-color]').forEach(b => b.classList.remove('active'));
        });
    }

    /**
     * Setup time display fullscreen mode - 设置时间显示全屏模式
     */
    setupTimeDisplayFullscreen() {
        const board = this.board;
        
        // Fullscreen mode buttons (single click, double click)
        document.querySelectorAll('.fullscreen-mode-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const mode = e.target.dataset.mode;
                document.querySelectorAll('.fullscreen-mode-btn').forEach(b => b.classList.remove('active'));
                e.target.classList.add('active');
                board.timeDisplayManager.setFullscreenMode(mode);
            });
        });
        
        // Fullscreen font size slider and input
        const timeFullscreenFontSizeSlider = document.getElementById('time-fullscreen-font-size-slider');
        const timeFullscreenFontSizeValue = document.getElementById('time-fullscreen-font-size-value');
        const timeFullscreenFontSizeInput = document.getElementById('time-fullscreen-font-size-input');
        
        if (timeFullscreenFontSizeSlider && timeFullscreenFontSizeValue && timeFullscreenFontSizeInput) {
            timeFullscreenFontSizeSlider.addEventListener('input', (e) => {
                const size = parseInt(e.target.value);
                timeFullscreenFontSizeValue.textContent = size;
                timeFullscreenFontSizeInput.value = size;
                board.timeDisplayManager.setFullscreenFontSize(size);
            });
            
            timeFullscreenFontSizeInput.addEventListener('change', (e) => {
                const size = parseInt(e.target.value);
                if (size >= 8 && size <= 25) {
                    timeFullscreenFontSizeValue.textContent = size;
                    timeFullscreenFontSizeSlider.value = size;
                    board.timeDisplayManager.setFullscreenFontSize(size);
                }
            });
        }
    }

    /**
     * Setup time display size and opacity - 设置时间显示大小和透明度
     */
    setupTimeDisplaySizeAndOpacity() {
        const board = this.board;
        
        // Font size slider and input
        const timeFontSizeSlider = document.getElementById('time-font-size-slider');
        const timeFontSizeValue = document.getElementById('time-font-size-value');
        const timeFontSizeInput = document.getElementById('time-font-size-input');
        
        timeFontSizeSlider.addEventListener('input', (e) => {
            const size = parseInt(e.target.value);
            timeFontSizeValue.textContent = size;
            timeFontSizeInput.value = size;
            board.timeDisplayManager.setFontSize(size);
        });
        
        timeFontSizeInput.addEventListener('change', (e) => {
            const size = parseInt(e.target.value);
            if (size >= 12 && size <= 48) {
                timeFontSizeValue.textContent = size;
                timeFontSizeSlider.value = size;
                board.timeDisplayManager.setFontSize(size);
            }
        });
        
        // Opacity slider and input
        const timeOpacitySlider = document.getElementById('time-opacity-slider');
        const timeOpacityValue = document.getElementById('time-opacity-value');
        const timeOpacityInput = document.getElementById('time-opacity-input');
        
        timeOpacitySlider.addEventListener('input', (e) => {
            const opacity = parseInt(e.target.value);
            timeOpacityValue.textContent = opacity;
            timeOpacityInput.value = opacity;
            board.timeDisplayManager.setOpacity(opacity);
        });
        
        timeOpacityInput.addEventListener('change', (e) => {
            const opacity = parseInt(e.target.value);
            if (opacity >= 10 && opacity <= 100) {
                timeOpacityValue.textContent = opacity;
                timeOpacitySlider.value = opacity;
                board.timeDisplayManager.setOpacity(opacity);
            }
        });
    }

    /**
     * Setup confirm modal buttons - 设置确认模态框按钮
     */
    setupConfirmModal() {
        const board = this.board;
        
        // Confirm cancel button
        document.getElementById('confirm-cancel-btn').addEventListener('click', () => {
            document.getElementById('confirm-modal').classList.remove('show');
        });
        
        // Confirm OK button
        document.getElementById('confirm-ok-btn').addEventListener('click', () => {
            document.getElementById('confirm-modal').classList.remove('show');
            board.clearCanvas(true);
        });
        
        // Click outside to close
        document.getElementById('confirm-modal').addEventListener('click', (e) => {
            if (e.target.id === 'confirm-modal') {
                document.getElementById('confirm-modal').classList.remove('show');
            }
        });
    }

    /**
     * Setup modal close events - 设置模态框关闭事件
     */
    setupModalCloseEvents() {
        const board = this.board;
        
        // Click outside settings modal to close
        document.getElementById('settings-modal').addEventListener('click', (e) => {
            if (e.target.id === 'settings-modal') {
                board.closeSettings();
            }
        });
    }
}
