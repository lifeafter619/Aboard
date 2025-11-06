// Settings Management Module
// Handles application settings and preferences

class SettingsManager {
    constructor() {
        this.toolbarSize = parseInt(localStorage.getItem('toolbarSize')) || 40;
        this.configScale = parseFloat(localStorage.getItem('configScale')) || 1.0;
        this.controlPosition = localStorage.getItem('controlPosition') || 'top-right';
        this.edgeSnapEnabled = localStorage.getItem('edgeSnapEnabled') !== 'false';
        this.infiniteCanvas = localStorage.getItem('canvasMode') === 'infinite';
        this.showZoomControls = localStorage.getItem('showZoomControls') !== 'false';
        this.showFullscreenBtn = localStorage.getItem('showFullscreenBtn') !== 'false';
        this.patternPreferences = this.loadPatternPreferences();
        this.canvasWidth = parseInt(localStorage.getItem('canvasWidth')) || 1920;
        this.canvasHeight = parseInt(localStorage.getItem('canvasHeight')) || 1080;
        this.canvasPreset = localStorage.getItem('canvasPreset') || 'custom';
        this.themeColor = localStorage.getItem('themeColor') || '#007AFF';
        this.globalFont = localStorage.getItem('globalFont') || 'system';
    }
    
    loadPatternPreferences() {
        const saved = localStorage.getItem('patternPreferences');
        if (saved) {
            return JSON.parse(saved);
        }
        // Default: all patterns enabled
        return {
            'blank': true,
            'dots': true,
            'grid': true,
            'tianzige': true,
            'english-lines': true,
            'music-staff': true,
            'coordinate': true,
            'image': true
        };
    }
    
    getPatternPreferences() {
        return this.patternPreferences;
    }
    
    updatePatternPreferences() {
        const prefs = {};
        document.querySelectorAll('.pattern-pref-checkbox').forEach(checkbox => {
            prefs[checkbox.dataset.pattern] = checkbox.checked;
        });
        this.patternPreferences = prefs;
        localStorage.setItem('patternPreferences', JSON.stringify(prefs));
    }
    
    switchTab(tabName) {
        document.querySelectorAll('.settings-tab-icon').forEach(tab => {
            tab.classList.remove('active');
        });
        
        document.querySelectorAll('.settings-tab-content').forEach(content => {
            content.classList.remove('active');
        });
        
        document.querySelector(`.settings-tab-icon[data-tab="${tabName}"]`).classList.add('active');
        document.getElementById(`${tabName}-settings`).classList.add('active');
    }
    
    updateToolbarSize() {
        const toolbar = document.getElementById('toolbar');
        const buttons = toolbar.querySelectorAll('.tool-btn');
        
        // Size ratios for responsive toolbar scaling
        const PADDING_VERTICAL_RATIO = 5;    // Vertical padding = toolbarSize / 5
        const PADDING_HORIZONTAL_RATIO = 3;  // Horizontal padding = toolbarSize / 3
        const SVG_SIZE_RATIO = 2;            // Icon size = toolbarSize / 2
        const FONT_SIZE_RATIO = 4.5;         // Font size = toolbarSize / 4.5
        
        buttons.forEach(btn => {
            btn.style.padding = `${this.toolbarSize / PADDING_VERTICAL_RATIO}px ${this.toolbarSize / PADDING_HORIZONTAL_RATIO}px`;
            btn.style.minWidth = `${this.toolbarSize}px`;
            
            const svg = btn.querySelector('svg');
            if (svg) {
                const svgSize = this.toolbarSize / SVG_SIZE_RATIO;
                svg.style.width = `${svgSize}px`;
                svg.style.height = `${svgSize}px`;
            }
            
            const span = btn.querySelector('span');
            if (span) {
                span.style.fontSize = `${this.toolbarSize / FONT_SIZE_RATIO}px`;
            }
        });
        
        localStorage.setItem('toolbarSize', this.toolbarSize);
        
        // Apply responsive text visibility after size update
        this.updateToolbarTextVisibility();
    }
    
    updateToolbarTextVisibility() {
        const toolbar = document.getElementById('toolbar');
        const buttons = toolbar.querySelectorAll('.tool-btn');
        const windowWidth = window.innerWidth;
        
        // Constants for responsive sizing
        const ICON_ONLY_SIZE_RATIO = 0.8; // Size multiplier when text is hidden
        const SCREEN_MARGIN = 40; // Margin from screen edge
        const DEFAULT_GAP = 12; // Default gap between buttons if not specified in CSS
        
        // Calculate total toolbar width needed with text
        let totalWidthWithText = 0;
        const toolbarStyle = window.getComputedStyle(toolbar);
        const toolbarPadding = parseFloat(toolbarStyle.paddingLeft) + parseFloat(toolbarStyle.paddingRight);
        const gap = parseFloat(toolbarStyle.gap) || DEFAULT_GAP;
        
        // Store original display values before measuring
        const originalDisplayValues = new Map();
        buttons.forEach(btn => {
            const span = btn.querySelector('span');
            if (span) {
                originalDisplayValues.set(span, window.getComputedStyle(span).display);
                // Temporarily show to measure
                if (originalDisplayValues.get(span) === 'none') {
                    span.style.display = 'inline';
                }
            }
        });
        
        buttons.forEach((btn, index) => {
            const btnWidth = btn.offsetWidth;
            totalWidthWithText += btnWidth;
            if (index < buttons.length - 1) {
                totalWidthWithText += gap;
            }
        });
        totalWidthWithText += toolbarPadding;
        
        // Check if toolbar fits with text
        const fitsWithText = totalWidthWithText + SCREEN_MARGIN * 2 <= windowWidth;
        
        // Show or hide text based on available space
        buttons.forEach(btn => {
            const span = btn.querySelector('span');
            if (span) {
                if (fitsWithText) {
                    // Restore original display or use default
                    const originalDisplay = originalDisplayValues.get(span);
                    span.style.display = (originalDisplay !== 'none') ? originalDisplay : 'inline';
                    btn.style.minWidth = `${this.toolbarSize}px`;
                } else {
                    span.style.display = 'none';
                    // When text is hidden, reduce min-width to icon-only size
                    btn.style.minWidth = `${this.toolbarSize * ICON_ONLY_SIZE_RATIO}px`;
                }
            }
        });
    }
    
    updateConfigScale() {
        const configArea = document.getElementById('config-area');
        configArea.style.transform = `translateX(-50%) scale(${this.configScale})`;
        localStorage.setItem('configScale', this.configScale);
    }
    
    setControlPosition(position, timeDisplayManager = null) {
        this.controlPosition = position;
        localStorage.setItem('controlPosition', position);
        
        const historyControls = document.getElementById('history-controls');
        const paginationControls = document.getElementById('pagination-controls');
        
        historyControls.className = '';
        historyControls.classList.add(position);
        
        paginationControls.className = '';
        if (!this.infiniteCanvas) {
            paginationControls.classList.add('show');
        }
        paginationControls.classList.add(position);
        
        document.querySelectorAll('.position-option-btn').forEach(btn => {
            btn.classList.remove('active');
            if (btn.dataset.position === position) {
                btn.classList.add('active');
            }
        });
        
        // Update time display position if manager is provided
        if (timeDisplayManager) {
            timeDisplayManager.updatePosition();
        }
    }
    
    loadSettings() {
        document.getElementById('toolbar-size-slider').value = this.toolbarSize;
        document.getElementById('toolbar-size-value').textContent = this.toolbarSize;
        this.updateToolbarSize();
        
        document.getElementById('config-scale-slider').value = Math.round(this.configScale * 100);
        document.getElementById('config-scale-value').textContent = Math.round(this.configScale * 100);
        this.updateConfigScale();
        
        this.setControlPosition(this.controlPosition);
        
        document.getElementById('edge-snap-checkbox').checked = this.edgeSnapEnabled;
        document.getElementById('show-zoom-controls-checkbox').checked = this.showZoomControls;
        
        // Load canvas mode
        const canvasMode = this.infiniteCanvas ? 'infinite' : 'paginated';
        document.querySelectorAll('.canvas-mode-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.mode === canvasMode);
        });
        this.updateCanvasSizeSettings();
        
        // Load canvas size settings
        document.getElementById('canvas-width-input').value = this.canvasWidth;
        document.getElementById('canvas-height-input').value = this.canvasHeight;
        document.querySelectorAll('.canvas-preset-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.preset === this.canvasPreset);
        });
        
        // Load pattern preferences
        document.querySelectorAll('.pattern-pref-checkbox').forEach(checkbox => {
            checkbox.checked = this.patternPreferences[checkbox.dataset.pattern] !== false;
        });
        
        // Load theme color
        this.applyThemeColor();
        document.getElementById('custom-theme-color-picker').value = this.themeColor;
        document.querySelectorAll('.color-btn[data-theme-color]').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.themeColor === this.themeColor);
        });
        
        // Load global font
        this.applyGlobalFont();
        document.getElementById('global-font-select').value = this.globalFont;
    }
    
    updateCanvasSizeSettings() {
        const canvasSizeSettings = document.getElementById('canvas-size-settings');
        canvasSizeSettings.style.display = this.infiniteCanvas ? 'none' : 'flex';
    }
    
    setCanvasMode(mode) {
        this.infiniteCanvas = mode === 'infinite';
        localStorage.setItem('canvasMode', mode);
        this.updateCanvasSizeSettings();
    }
    
    setCanvasPreset(preset) {
        this.canvasPreset = preset;
        localStorage.setItem('canvasPreset', preset);
        
        // Update canvas dimensions based on preset
        const presets = {
            'A4-portrait': { width: 794, height: 1123 },      // A4: 210 × 297 mm
            'A4-landscape': { width: 1123, height: 794 },
            'A3-portrait': { width: 1123, height: 1587 },     // A3: 297 × 420 mm
            'A3-landscape': { width: 1587, height: 1123 },
            'B5-portrait': { width: 709, height: 1001 },      // B5: 176 × 250 mm
            'B5-landscape': { width: 1001, height: 709 },
            '16:9': { width: 1920, height: 1080 },
            '4:3': { width: 1600, height: 1200 }
        };
        
        if (presets[preset]) {
            this.canvasWidth = presets[preset].width;
            this.canvasHeight = presets[preset].height;
            document.getElementById('canvas-width-input').value = this.canvasWidth;
            document.getElementById('canvas-height-input').value = this.canvasHeight;
            localStorage.setItem('canvasWidth', this.canvasWidth);
            localStorage.setItem('canvasHeight', this.canvasHeight);
        }
    }
    
    setCanvasSize(width, height) {
        this.canvasWidth = width;
        this.canvasHeight = height;
        localStorage.setItem('canvasWidth', width);
        localStorage.setItem('canvasHeight', height);
    }
    
    setThemeColor(color) {
        this.themeColor = color;
        localStorage.setItem('themeColor', color);
        document.documentElement.style.setProperty('--theme-color', color);
    }
    
    applyThemeColor() {
        document.documentElement.style.setProperty('--theme-color', this.themeColor);
    }
    
    setGlobalFont(font) {
        this.globalFont = font;
        localStorage.setItem('globalFont', font);
        this.applyGlobalFont();
    }
    
    applyGlobalFont() {
        let fontFamily;
        switch(this.globalFont) {
            case 'system':
                fontFamily = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';
                break;
            case 'serif':
                fontFamily = 'SimSun, "Times New Roman", Times, Georgia, serif';
                break;
            case 'sans-serif':
                fontFamily = 'SimHei, Arial, "Helvetica Neue", Helvetica, sans-serif';
                break;
            case 'monospace':
                fontFamily = '"Courier New", Courier, "Consolas", monospace';
                break;
            case 'cursive':
                fontFamily = '"Comic Sans MS", "Apple Chancery", cursive';
                break;
            case 'Microsoft YaHei':
                fontFamily = '"Microsoft YaHei", "微软雅黑", Arial, sans-serif';
                break;
            case 'SimSun':
                fontFamily = 'SimSun, "宋体", Georgia, serif';
                break;
            case 'SimHei':
                fontFamily = 'SimHei, "黑体", Arial, sans-serif';
                break;
            case 'KaiTi':
                fontFamily = 'KaiTi, "楷体", Georgia, serif';
                break;
            case 'FangSong':
                fontFamily = 'FangSong, "仿宋", Georgia, serif';
                break;
            default:
                fontFamily = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';
        }
        document.body.style.fontFamily = fontFamily;
    }
}
