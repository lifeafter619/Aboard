// Settings Management Module
// Handles application settings and preferences
const largeScreenWidth = 1920;
const highDpiRatio = 1.5;

class SettingsManager {
    constructor() {
        const storedToolbarSize = localStorage.getItem('toolbarSize');
        const storedConfigScale = localStorage.getItem('configScale');
        const isLargeScreen = window.innerWidth >= largeScreenWidth;
        const isHighDpi = (window.devicePixelRatio || 1) >= highDpiRatio;
        const isHighResDisplay = isLargeScreen || isHighDpi;
        this.toolbarSize = storedToolbarSize ? parseInt(storedToolbarSize) : (isHighResDisplay ? 60 : 55);
        this.configScale = storedConfigScale ? parseFloat(storedConfigScale) : (isHighResDisplay ? 1.1 : 1.0);
        this.controlPosition = localStorage.getItem('controlPosition') || 'top-right';
        this.edgeSnapEnabled = localStorage.getItem('edgeSnapEnabled') !== 'false';
        this.touchZoomEnabled = localStorage.getItem('touchZoomEnabled') !== 'false';
        this.unlimitedZoom = localStorage.getItem('unlimitedZoom') === 'true';
        this.infiniteCanvas = false; // Always use pagination mode
        this.showZoomControls = localStorage.getItem('showZoomControls') !== 'false';
        this.showImportExportBtn = localStorage.getItem('showImportExportBtn') !== 'false';
        this.showFullscreenBtn = localStorage.getItem('showFullscreenBtn') !== 'false';
        this.showToolbarText = localStorage.getItem('showToolbarText') !== 'false'; // Default true
        this.patternPreferences = this.loadPatternPreferences();
        this.canvasWidth = parseInt(localStorage.getItem('canvasWidth')) || 1920;
        this.canvasHeight = parseInt(localStorage.getItem('canvasHeight')) || 1080;
        this.canvasPreset = localStorage.getItem('canvasPreset') || 'custom';
        this.themeColor = localStorage.getItem('themeColor') || '#007AFF';
        this.globalFont = localStorage.getItem('globalFont') || 'system';
        this.customFonts = this.loadCustomFonts();

        // Initialize Toast Manager
        this.toastManager = new ToastManager();
        
        // Load custom fonts to document
        this.loadCustomFontsToDocument();
    }
    
    // Load custom fonts from localStorage
    loadCustomFonts() {
        const saved = localStorage.getItem('customFonts');
        if (saved) {
            try {
                return JSON.parse(saved);
            } catch (e) {
                console.warn('Failed to load custom fonts:', e);
            }
        }
        return [];
    }
    
    // Save custom fonts to localStorage
    saveCustomFonts() {
        try {
            localStorage.setItem('customFonts', JSON.stringify(this.customFonts));
        } catch (e) {
            const msg = window.i18n ? window.i18n.t('tools.text.storageQuotaExceeded') : 'Storage quota exceeded. Please delete some custom fonts.';
            if (this.toastManager) {
                this.toastManager.show(msg, 'error');
            }
            console.warn('Failed to save custom fonts:', e);
        }
    }
    
    // Load custom fonts into the document
    loadCustomFontsToDocument() {
        this.customFonts.forEach(font => {
            this.addFontToDocument(font.name, font.data);
        });
    }
    
    // Add a font to the document
    addFontToDocument(name, data) {
        const fontFace = new FontFace(name, `url(${data})`);
        return fontFace.load().then(loadedFace => {
            document.fonts.add(loadedFace);
            return loadedFace;
        }).catch(err => {
            console.warn(`Failed to load custom font ${name}:`, err);
            return null;
        });
    }
    
    // Handle font file upload
    handleFontUpload(file) {
        if (!file) return;
        
        // Check file size (limit to 2MB)
        const maxSize = 2 * 1024 * 1024;
        if (file.size > maxSize) {
            const msg = window.i18n ? window.i18n.t('tools.text.fontTooLarge') : 'Font file is too large. Maximum size is 2MB.';
            if (this.toastManager) {
                this.toastManager.show(msg, 'error');
            }
            return;
        }
        
        const extension = file.name.split('.').pop().toLowerCase();
        const validExtensions = ['ttf', 'otf', 'woff', 'woff2'];
        
        if (!validExtensions.includes(extension)) {
            const msg = window.i18n ? window.i18n.t('tools.text.invalidFontFormat') : 'Invalid font format. Please use TTF, OTF, WOFF, or WOFF2 files.';
            if (this.toastManager) {
                this.toastManager.show(msg, 'error');
            }
            return;
        }

        const reader = new FileReader();
        reader.onload = (e) => {
            const fontData = e.target.result;
            const lastDotIndex = file.name.lastIndexOf('.');
            const fontName = lastDotIndex > 0 ? file.name.substring(0, lastDotIndex) : file.name;
            
            const exists = this.customFonts.find(f => f.name === fontName);
            if (!exists) {
                this.customFonts.push({ name: fontName, data: fontData });
                this.saveCustomFonts();
                this.addFontToDocument(fontName, fontData);
                this.populateGlobalFontSelect();
                
                // Select the newly uploaded font
                const select = document.getElementById('global-font-select');
                if (select) {
                    select.value = fontName;
                    this.setGlobalFont(fontName);
                }
                
                const msg = window.i18n ? window.i18n.t('tools.text.fontUploadSuccess') : 'Font uploaded successfully!';
                if (this.toastManager) {
                    this.toastManager.show(msg, 'success');
                }
            } else {
                const msg = window.i18n ? window.i18n.t('tools.text.fontExists') : 'This font already exists.';
                if (this.toastManager) {
                    this.toastManager.show(msg, 'warning');
                }
            }
        };
        reader.readAsDataURL(file);
    }
    
    // Populate global font select with custom fonts
    populateGlobalFontSelect() {
        const select = document.getElementById('global-font-select');
        if (!select) return;
        
        // Remove existing custom font optgroup if any
        const existingOptgroup = select.querySelector('optgroup');
        if (existingOptgroup) {
            existingOptgroup.remove();
        }
        
        // Add custom fonts if any
        if (this.customFonts.length > 0) {
            const optgroup = document.createElement('optgroup');
            optgroup.label = window.i18n ? window.i18n.t('tools.text.customFonts') : 'Custom Fonts';
            
            this.customFonts.forEach(font => {
                const option = document.createElement('option');
                option.value = font.name;
                option.textContent = font.name;
                optgroup.appendChild(option);
            });
            
            select.appendChild(optgroup);
        }
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
        
        // Square buttons with dynamic sizing based on toolbarSize
        // All proportions scale with buttonSize for consistent appearance
        const BUTTON_PADDING_RATIO = 0.10;   // Button padding = 10% of button size
        const ICON_SIZE_RATIO = 0.5225;      // Icon = 52.25% of button size (base 55% reduced by 5%)
        const FONT_SIZE_RATIO = 0.1751;      // Font = 17.51% of button size (base 17% increased by 3%)
        const BUTTON_GAP_RATIO = 0.08;       // Button internal gap = 8% of button size (more spacing)
        
        // Toolbar container padding and gap also scale with button size
        const TOOLBAR_PADDING_RATIO = 0.25;  // Toolbar padding = 25% of button size
        const TOOLBAR_GAP_RATIO = 0.25;      // Toolbar gap = 25% of button size (increased from 20%)
        // Secondary axis uses smaller padding to keep toolbar compact
        const TOOLBAR_PADDING_SECONDARY_RATIO = 0.6; // Secondary padding = 60% of primary
        
        const buttonSize = this.toolbarSize;
        const buttonPadding = Math.max(2, buttonSize * BUTTON_PADDING_RATIO);
        const iconSize = buttonSize * ICON_SIZE_RATIO;
        const fontSize = Math.max(6, buttonSize * FONT_SIZE_RATIO);
        const buttonGap = Math.max(1, buttonSize * BUTTON_GAP_RATIO);
        
        // Scale toolbar container padding and gap
        const toolbarPadding = Math.max(4, buttonSize * TOOLBAR_PADDING_RATIO);
        const toolbarPaddingSecondary = toolbarPadding * TOOLBAR_PADDING_SECONDARY_RATIO;
        const toolbarGap = Math.max(2, buttonSize * TOOLBAR_GAP_RATIO);
        const isVertical = toolbar.classList.contains('vertical');
        
        document.documentElement.style.setProperty('--toolbar-button-size', `${buttonSize}px`);

        // Apply toolbar container styles (vertical: more padding on Y axis, horizontal: more on X axis)
        toolbar.style.padding = isVertical 
            ? `${toolbarPadding}px ${toolbarPaddingSecondary}px` 
            : `${toolbarPaddingSecondary}px ${toolbarPadding}px`;
        toolbar.style.gap = `${toolbarGap}px`;
        
        buttons.forEach(btn => {
            // Square button with fixed size - set all dimensions to ensure truly square
            btn.style.width = `${buttonSize}px`;
            btn.style.height = `${buttonSize}px`;
            btn.style.minWidth = `${buttonSize}px`;
            btn.style.minHeight = `${buttonSize}px`;
            btn.style.maxWidth = `${buttonSize}px`;
            btn.style.maxHeight = `${buttonSize}px`;
            btn.style.padding = `${buttonPadding}px`;
            btn.style.gap = `${buttonGap}px`;
            btn.style.boxSizing = 'border-box';
            
            const svg = btn.querySelector('svg');
            if (svg) {
                svg.style.width = `${iconSize}px`;
                svg.style.height = `${iconSize}px`;
                svg.style.flexShrink = '0';
            }
            
            const span = btn.querySelector('span');
            if (span) {
                span.style.fontSize = `${fontSize}px`;
                span.style.lineHeight = '1';
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
        const isVertical = toolbar.classList.contains('vertical');
        
        // Don't clear sizing styles - only manage text visibility via CSS classes
        // The updateToolbarSize() function handles all sizing
        buttons.forEach(btn => {
            const span = btn.querySelector('span');
            if (span) {
                span.style.display = '';
            }
        });
        
        // If user has disabled toolbar text, add class and return (CSS handles hiding)
        if (!this.showToolbarText) {
            toolbar.classList.add('hide-text');
            return;
        } else {
            toolbar.classList.remove('hide-text');
        }
        
        // If toolbar is vertical (docked to side), text is hidden via CSS
        if (isVertical) {
            return;
        }
        
        // Constants for responsive sizing
        const SCREEN_MARGIN = 40; // Margin from screen edge
        const DEFAULT_GAP = 12; // Default gap between buttons if not specified in CSS
        
        // Calculate total toolbar width needed with text
        let totalWidthWithText = 0;
        const toolbarStyle = window.getComputedStyle(toolbar);
        const toolbarPadding = parseFloat(toolbarStyle.paddingLeft) + parseFloat(toolbarStyle.paddingRight);
        const gap = parseFloat(toolbarStyle.gap) || DEFAULT_GAP;
        
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
        if (!fitsWithText) {
            buttons.forEach(btn => {
                const span = btn.querySelector('span');
                if (span) {
                    span.style.display = 'none';
                }
                // Let button size naturally follow content - no fixed minWidth
            });
        }
    }
    
    setShowToolbarText(show) {
        this.showToolbarText = show;
        localStorage.setItem('showToolbarText', show);
        this.updateToolbarTextVisibility();
    }
    
    updateConfigScale() {
        const configArea = document.getElementById('config-area');
        // Check if the config area has been manually dragged (tracked via data attribute)
        const hasBeenDragged = configArea.dataset.userDragged === 'true';
        
        if (hasBeenDragged) {
            // Config area has been dragged - only apply scale with top-left origin to prevent jump
            configArea.style.transformOrigin = 'top left';
            configArea.style.transform = `scale(${this.configScale})`;
        } else {
            // Config area is in default center position - use translateX to center
            configArea.style.transformOrigin = 'center bottom';
            configArea.style.transform = `translateX(-50%) scale(${this.configScale})`;
        }
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
        document.getElementById('toolbar-size-input').value = this.toolbarSize;
        this.updateToolbarSize();
        
        document.getElementById('config-scale-slider').value = Math.round(this.configScale * 100);
        document.getElementById('config-scale-value').textContent = Math.round(this.configScale * 100);
        document.getElementById('config-scale-input').value = Math.round(this.configScale * 100);
        this.updateConfigScale();
        
        this.setControlPosition(this.controlPosition);
        
        document.getElementById('edge-snap-checkbox').checked = this.edgeSnapEnabled;
        document.getElementById('touch-zoom-checkbox').checked = this.touchZoomEnabled;
        document.getElementById('unlimited-zoom-checkbox').checked = this.unlimitedZoom;
        document.getElementById('show-zoom-controls-checkbox').checked = this.showZoomControls;
        const showImportExportBtnCheckbox = document.getElementById('show-import-export-btn-checkbox');
        if (showImportExportBtnCheckbox) {
            showImportExportBtnCheckbox.checked = this.showImportExportBtn;
        }
        
        // Load toolbar text visibility setting
        const showToolbarTextCheckbox = document.getElementById('show-toolbar-text-checkbox');
        if (showToolbarTextCheckbox) {
            showToolbarTextCheckbox.checked = this.showToolbarText;
        }
        this.updateToolbarTextVisibility();
        
        // Canvas is always in pagination mode now
        
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
        
        // Initialize language selector
        this.initLanguageSelector();
    }
    
    // Canvas mode is removed - always use pagination
    
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
                // Check if it's a custom font
                const customFont = this.customFonts.find(f => f.name === this.globalFont);
                if (customFont) {
                    fontFamily = `"${this.globalFont}", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;
                } else {
                    fontFamily = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';
                }
        }
        document.body.style.fontFamily = fontFamily;
    }
    
    initLanguageSelector() {
        const languageSelect = document.getElementById('language-select');
        if (languageSelect && window.i18n) {
            // Set current language
            languageSelect.value = window.i18n.getCurrentLocale();
            
            // Handle language change without page reload
            languageSelect.addEventListener('change', async (e) => {
                const newLocale = e.target.value;
                await window.i18n.changeLocale(newLocale);
                // No reload - translations are applied dynamically
            });
        }
    }

    getCurrentSettingsState() {
        return {
            toolbarSize: this.toolbarSize,
            configScale: this.configScale,
            controlPosition: this.controlPosition,
            edgeSnapEnabled: this.edgeSnapEnabled,
            touchZoomEnabled: this.touchZoomEnabled,
            unlimitedZoom: this.unlimitedZoom,
            showZoomControls: this.showZoomControls,
            showImportExportBtn: this.showImportExportBtn,
            showFullscreenBtn: this.showFullscreenBtn,
            patternPreferences: this.patternPreferences,
            canvasWidth: this.canvasWidth,
            canvasHeight: this.canvasHeight,
            canvasPreset: this.canvasPreset,
            themeColor: this.themeColor,
            globalFont: this.globalFont,
            // Also include toolbar customization
            toolbarOrder: localStorage.getItem('toolbarOrder'),
            toolbarVisibility: localStorage.getItem('toolbarVisibility'),
            // Control button visibility
            controlSettings: {
                zoom: localStorage.getItem('controlShowZoom') !== 'false',
                pagination: localStorage.getItem('controlShowPagination') !== 'false',
                time: localStorage.getItem('controlShowTime') !== 'false',
                fullscreen: localStorage.getItem('controlShowFullscreen') !== 'false',
                import: localStorage.getItem('controlShowImport') !== 'false',
                export: localStorage.getItem('controlShowExport') !== 'false'
            }
        };
    }

    exportSettings() {
        const settings = this.getCurrentSettingsState();

        const jsonStr = JSON.stringify(settings, null, 2);
        const blob = new Blob([jsonStr], { type: 'application/json' });
        const url = URL.createObjectURL(blob);

        const link = document.createElement('a');
        link.href = url;
        link.download = `aboard-config-${Date.now()}.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);

        // Use custom Toast instead of alert
        const successMsg = window.i18n ? window.i18n.t('settings.exportSuccess') : '配置已成功导出！';
        this.toastManager.show(successMsg, 'success');
    }

    deepCompare(obj1, obj2, path = '') {
        const diffs = [];

        // Handle null/undefined
        if (obj1 === obj2) return diffs;
        if (!obj1 || !obj2) {
            diffs.push({ key: path, old: obj1, new: obj2 });
            return diffs;
        }

        // Handle JSON strings (like toolbarOrder) - Check BEFORE primitives because strings are primitives
        try {
            if (typeof obj1 === 'string' && (obj1.startsWith('[') || obj1.startsWith('{'))) {
                const parsed1 = JSON.parse(obj1);
                // Try to parse obj2 if it's a string, otherwise use it as is
                const parsed2 = typeof obj2 === 'string' ? JSON.parse(obj2) : obj2;
                return this.deepCompare(parsed1, parsed2, path);
            }
        } catch (e) {
            // Not JSON, continue
        }

        // Handle case where obj1 is object/array but obj2 is stringified JSON
        if (typeof obj1 === 'object' && typeof obj2 === 'string' && (obj2.startsWith('[') || obj2.startsWith('{'))) {
            try {
                const parsed2 = JSON.parse(obj2);
                return this.deepCompare(obj1, parsed2, path);
            } catch (e) {}
        }

        // Handle primitives
        if (typeof obj1 !== 'object' || typeof obj2 !== 'object') {
            if (obj1 !== obj2) {
                diffs.push({ key: path, old: obj1, new: obj2 });
            }
            return diffs;
        }

        // Get all keys
        const keys1 = Object.keys(obj1);
        const keys2 = Object.keys(obj2);
        const allKeys = new Set([...keys1, ...keys2]);

        for (const key of allKeys) {
            const newPath = path ? `${path}.${key}` : key;
            const subDiffs = this.deepCompare(obj1[key], obj2[key], newPath);
            diffs.push(...subDiffs);
        }

        return diffs;
    }

    getSettingsDiff(newSettings) {
        const currentSettings = this.getCurrentSettingsState();

        // Use deep comparison
        const diffs = this.deepCompare(currentSettings, newSettings);

        // Filter out unchanged values explicitly (though deepCompare should handle it)
        return diffs.filter(d => JSON.stringify(d.old) !== JSON.stringify(d.new));
    }

    getSettingLabel(key) {
        const i18n = window.i18n;
        if (!i18n) return key;

        // Handle nested keys
        if (key.startsWith('patternPreferences.')) {
            // Pattern preferences don't have individual labels in locale files usually,
            // but we can look up the pattern name in background settings
            const pattern = key.split('.')[1];
            // Try to find specific pattern name
            const patternName = i18n.t(`background.${pattern}`);
            if (patternName !== `background.${pattern}`) {
                return `${i18n.t('settings.background.preference')} - ${patternName}`;
            }
        }

        if (key.startsWith('controlSettings.')) {
            const control = key.split('.')[1];
            return `${i18n.t('settings.general.controlButtonSettings')} - ${i18n.t(`settings.general.controlButtons.${control}`)}`;
        }

        if (key.startsWith('toolbarVisibility.')) {
            const tool = key.split('.')[1];
            // tool might be 'pen', 'eraser' etc.
            // mapping: settings.general.toolbarTools.pen
            return `${i18n.t('settings.general.toolbarCustomization')} - ${i18n.t(`settings.general.toolbarTools.${tool}`) || tool}`;
        }

        if (key.startsWith('toolbarOrder')) {
            return i18n.t('settings.general.toolbarCustomization');
        }

        // Map internal keys to translation keys
        const map = {
            'toolbarSize': 'settings.display.toolbarSize',
            'configScale': 'settings.display.configScale',
            'controlPosition': 'settings.general.controlPosition',
            'edgeSnapEnabled': 'settings.general.edgeSnap',
            'touchZoomEnabled': 'settings.general.touchZoom',
            'unlimitedZoom': 'settings.canvas.unlimitedZoom',
            'showZoomControls': 'settings.display.showZoomControls',
            'showImportExportBtn': 'settings.display.showImportExportBtn',
            'showFullscreenBtn': 'settings.display.showFullscreenBtn',
            'canvasWidth': 'settings.canvas.customSize.width',
            'canvasHeight': 'settings.canvas.customSize.height',
            'canvasPreset': 'settings.canvas.size',
            'themeColor': 'settings.display.themeColor',
            'globalFont': 'settings.general.globalFont',
            'patternPreferences': 'settings.background.preference',
            'toolbarOrder': 'settings.general.toolbarCustomization',
            'toolbarVisibility': 'settings.general.toolbarCustomization',
            'controlSettings': 'settings.general.controlButtonSettings'
        };

        if (map[key]) {
            return i18n.t(map[key]);
        }

        return key;
    }

    applySettings(newSettings) {
        const keys = [
            'toolbarSize', 'configScale', 'controlPosition', 'edgeSnapEnabled',
            'touchZoomEnabled', 'unlimitedZoom', 'showZoomControls', 'showImportExportBtn', 'showFullscreenBtn',
            'canvasWidth', 'canvasHeight', 'canvasPreset', 'themeColor', 'globalFont',
            'patternPreferences'
        ];

        keys.forEach(key => {
            if (newSettings[key] !== undefined) {
                this[key] = newSettings[key];

                // Update localStorage
                if (key === 'patternPreferences') {
                    localStorage.setItem('patternPreferences', JSON.stringify(this[key]));
                } else {
                    localStorage.setItem(key, this[key]);
                }
            }
        });

        // Handle special storage items
        if (newSettings.toolbarOrder) localStorage.setItem('toolbarOrder', newSettings.toolbarOrder);
        if (newSettings.toolbarVisibility) localStorage.setItem('toolbarVisibility', newSettings.toolbarVisibility);

        if (newSettings.controlSettings) {
            localStorage.setItem('controlShowZoom', newSettings.controlSettings.zoom);
            localStorage.setItem('controlShowPagination', newSettings.controlSettings.pagination);
            localStorage.setItem('controlShowTime', newSettings.controlSettings.time);
            localStorage.setItem('controlShowFullscreen', newSettings.controlSettings.fullscreen);
            localStorage.setItem('controlShowImport', newSettings.controlSettings.import);
            localStorage.setItem('controlShowExport', newSettings.controlSettings.export);
        }

        // Apply changes visually
        this.loadSettings();
    }
}
