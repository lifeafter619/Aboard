/**
 * Internationalization (i18n) Module
 * Provides multi-language support for the Aboard application
 * 
 * Supported Languages:
 * - zh-CN: Chinese (Simplified)
 * - en-US: English (United States)
 * - ja-JP: Japanese
 * - ko-KR: Korean
 * - fr-FR: French
 * - de-DE: German
 * - es-ES: Spanish
 */

class I18n {
    constructor() {
        this.currentLocale = 'zh-CN'; // Default language
        this.translations = {};
        this.fallbackLocale = 'zh-CN';
        
        // Available languages
        this.availableLocales = {
            'zh-CN': '中文简体',
            'zh-TW': '中文繁體',
            'en-US': 'English',
            'ja-JP': '日本語',
            'ko-KR': '한국어',
            'fr-FR': 'Français',
            'de-DE': 'Deutsch',
            'es-ES': 'Español'
        };
    }

    /**
     * Initialize i18n system
     */
    async init() {
        // Load saved language preference or detect browser language
        this.currentLocale = this.getSavedLocale() || this.detectBrowserLocale();
        
        // Load translation files
        await this.loadTranslations();
        
        // Apply translations to the page
        this.applyTranslations();
        
        // Update HTML lang attribute
        document.documentElement.lang = this.currentLocale;
    }

    /**
     * Get saved locale from localStorage
     */
    getSavedLocale() {
        return localStorage.getItem('locale');
    }

    /**
     * Save locale to localStorage
     */
    saveLocale(locale) {
        localStorage.setItem('locale', locale);
    }

    /**
     * Detect browser language
     */
    detectBrowserLocale() {
        const browserLang = navigator.language || navigator.userLanguage;
        
        // Check if we support the exact locale
        if (this.availableLocales[browserLang]) {
            return browserLang;
        }
        
        // Check if we support the language family (e.g., 'en' for 'en-GB')
        const langFamily = browserLang.split('-')[0];
        const matchingLocale = Object.keys(this.availableLocales).find(
            locale => locale.startsWith(langFamily)
        );
        
        return matchingLocale || this.fallbackLocale;
    }

    /**
     * Load translation files
     */
    async loadTranslations() {
        try {
            const response = await fetch(`js/locales/${this.currentLocale}.json`);
            if (!response.ok) {
                console.warn(`Failed to load ${this.currentLocale}, falling back to ${this.fallbackLocale}`);
                this.currentLocale = this.fallbackLocale;
                const fallbackResponse = await fetch(`js/locales/${this.fallbackLocale}.json`);
                this.translations = await fallbackResponse.json();
            } else {
                this.translations = await response.json();
            }
        } catch (error) {
            console.error('Error loading translations:', error);
            this.translations = {};
        }
    }

    /**
     * Get translation for a key
     */
    t(key, params = {}) {
        const keys = key.split('.');
        let value = this.translations;
        
        for (const k of keys) {
            value = value[k];
            if (value === undefined) {
                console.warn(`Translation missing for key: ${key}`);
                return key;
            }
        }
        
        // Replace parameters in translation
        if (typeof value === 'string') {
            return value.replace(/\{(\w+)\}/g, (match, param) => {
                return params[param] !== undefined ? params[param] : match;
            });
        }
        
        return value;
    }

    /**
     * Apply translations to all elements with data-i18n attribute
     */
    applyTranslations() {
        // Translate elements with data-i18n attribute for text content
        const elements = document.querySelectorAll('[data-i18n]');
        
        elements.forEach(el => {
            const key = el.getAttribute('data-i18n');
            const translation = this.t(key);
            
            if (translation !== key) {
                // Update element content based on element type
                if (el.tagName === 'INPUT' && (el.type === 'button' || el.type === 'submit')) {
                    el.value = translation;
                } else if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
                    // For input elements, only update placeholder if specified
                    const placeholderKey = el.getAttribute('data-i18n-placeholder');
                    if (placeholderKey) {
                        el.placeholder = this.t(placeholderKey);
                    }
                } else {
                    // For regular elements, update text content
                    // Only update if element has no children with data-i18n attribute
                    if (!el.querySelector('[data-i18n]')) {
                        el.textContent = translation;
                    }
                }
            }
        });
        
        // Translate title attributes
        const titleElements = document.querySelectorAll('[data-i18n-title]');
        titleElements.forEach(el => {
            const key = el.getAttribute('data-i18n-title');
            const translation = this.t(key);
            if (translation !== key) {
                el.title = translation;
            }
        });
        
        // Update document title
        const titleKey = document.documentElement.getAttribute('data-i18n-title');
        if (titleKey) {
            document.title = this.t(titleKey);
        } else {
            // Default title translation
            document.title = this.t('app.title');
        }
        
        // Auto-translate common elements based on their ID or class
        this.autoTranslateElements();
    }
    
    /**
     * Auto-translate elements based on common patterns
     * This reduces the need to manually add data-i18n to every element
     */
    autoTranslateElements() {
        // Translate toolbar buttons
        const toolbarMappings = {
            'undo-btn': { span: 'toolbar.undo', title: 'toolbar.undo' },
            'redo-btn': { span: 'toolbar.redo', title: 'toolbar.redo' },
            'pen-btn': { span: 'toolbar.pen', title: 'toolbar.pen' },
            'pan-btn': { span: 'toolbar.move', title: 'toolbar.move' },
            'eraser-btn': { span: 'toolbar.eraser', title: 'toolbar.eraser' },
            'clear-btn': { span: 'toolbar.clear', title: 'toolbar.clear' },
            'background-btn': { span: 'toolbar.background', title: 'toolbar.background' },
            'more-btn': { span: 'toolbar.more', title: 'toolbar.more' },
            'settings-btn': { span: 'toolbar.settings', title: 'toolbar.settings' },
            'export-btn-top': { title: 'toolbar.export' },
            'zoom-out-btn': { title: 'toolbar.zoomOut' },
            'zoom-in-btn': { title: 'toolbar.zoomIn' },
            'fullscreen-btn': { title: 'toolbar.fullscreen' }
        };
        
        Object.entries(toolbarMappings).forEach(([id, mapping]) => {
            const el = document.getElementById(id);
            if (el) {
                if (mapping.span) {
                    const span = el.querySelector('span');
                    if (span) {
                        span.textContent = this.t(mapping.span);
                    }
                }
                if (mapping.title) {
                    el.title = this.t(mapping.title);
                }
            }
        });
        
        // Update document title
        document.title = this.t('app.title');
        
        // Translate zoom input placeholder
        const zoomInput = document.getElementById('zoom-input');
        if (zoomInput) {
            zoomInput.title = this.t('toolbar.zoomPlaceholder');
        }
        
        // Translate configuration panel labels
        this.translateConfigPanels();
        
        // Translate settings modal
        this.translateSettingsModal();
        
        // Translate modals
        this.translateModals();
        
        // Translate About and Announcement content
        this.translateAboutContent();
        this.translateAnnouncementContent();
        
        // Translate pagination and other controls
        this.translatePageControls();
    }
    
    translatePageControls() {
        // Translate pagination buttons
        const prevBtn = document.getElementById('prev-page-btn');
        if (prevBtn) {
            prevBtn.title = this.t('page.previous');
        }
        
        const nextBtn = document.getElementById('next-or-add-page-btn');
        if (nextBtn) {
            const isLastPage = true; // This will be determined by context
            nextBtn.title = this.t('page.next');
        }
        
        const pageInput = document.getElementById('page-input');
        if (pageInput) {
            pageInput.title = this.t('page.jumpPlaceholder');
        }
    }
    
    translateConfigPanels() {
        // Translate all config panel labels
        const labelMappings = {
            '笔触类型': 'tools.pen.type',
            '颜色与粗细': 'tools.pen.colorAndSize',
            '形状': 'tools.eraser.shape',
            '橡皮擦大小': 'tools.eraser.sizeLabel',
            '背景颜色': 'background.color',
            '背景图案': 'background.pattern',
            '密度': 'background.density',
            '大小': 'background.size',
            '更多功能': 'features.moreFeatures',
            '小功能': 'features.title',
            '时间显示选项': 'timeDisplay.options'
        };
        
        // Translate labels in config panels
        document.querySelectorAll('#config-area label, #feature-area label, #time-display-area label').forEach(label => {
            const text = label.childNodes[0]?.textContent?.trim();
            if (text && labelMappings[text]) {
                const translation = this.t(labelMappings[text]);
                if (translation !== labelMappings[text]) {
                    // Preserve the structure (e.g., keep span elements for values)
                    if (label.childNodes.length === 1) {
                        label.textContent = translation;
                    } else {
                        label.childNodes[0].textContent = translation;
                    }
                }
            }
        });
        
        // Pen configuration
        const penTypeButtons = {
            'normal': 'tools.pen.normal',
            'pencil': 'tools.pen.pencil',
            'ballpoint': 'tools.pen.ballpoint',
            'fountain': 'tools.pen.fountain',
            'brush': 'tools.pen.brush'
        };
        
        document.querySelectorAll('.pen-type-btn').forEach(btn => {
            const penType = btn.getAttribute('data-pen-type');
            if (penType && penTypeButtons[penType]) {
                btn.textContent = this.t(penTypeButtons[penType]);
            }
        });
        
        // Eraser shape buttons
        const eraserShapes = {
            'circle': 'tools.eraser.shapeCircle',
            'rectangle': 'tools.eraser.shapeRectangle'
        };
        
        document.querySelectorAll('.eraser-shape-btn').forEach(btn => {
            const shape = btn.getAttribute('data-eraser-shape');
            if (shape) {
                btn.textContent = shape === 'circle' ? this.t('tools.eraser.shapeCircle') || '圆形' : this.t('tools.eraser.shapeRectangle') || '方形';
            }
        });
        
        // Background patterns
        const patterns = {
            'blank': 'background.blank',
            'dots': 'background.dots',
            'grid': 'background.grid',
            'tianzige': 'background.tianzige',
            'english-lines': 'background.english4line',
            'music-staff': 'background.musicStaff',
            'coordinate': 'background.coordinate',
            'image': 'background.upload'
        };
        
        document.querySelectorAll('.pattern-option-btn').forEach(btn => {
            const pattern = btn.getAttribute('data-pattern');
            if (pattern && patterns[pattern]) {
                // For image button, keep the icon and translate the text in span
                if (pattern === 'image') {
                    const uploadSpan = btn.querySelector('.upload-text');
                    if (uploadSpan) {
                        uploadSpan.textContent = this.t(patterns[pattern]);
                    }
                } else {
                    btn.textContent = this.t(patterns[pattern]);
                }
            }
        });
        
        // Feature area buttons
        this.translateFeatureArea();
    }
    
    translateFeatureArea() {
        // Translate feature buttons
        const timeDisplayBtn = document.getElementById('time-display-feature-btn');
        if (timeDisplayBtn) {
            const span = timeDisplayBtn.querySelector('span');
            if (span) {
                const text = this.t('features.time');
                if (text !== 'features.time') span.textContent = text;
            }
            timeDisplayBtn.title = this.t('timeDisplay.title');
        }
        
        const timerBtn = document.getElementById('timer-feature-btn');
        if (timerBtn) {
            const span = timerBtn.querySelector('span');
            if (span) {
                const text = this.t('features.timer');
                if (text !== 'features.timer') span.textContent = text;
            }
            timerBtn.title = this.t('timer.title');
        }

        const scoreboardBtn = document.getElementById('scoreboard-feature-btn');
        if (scoreboardBtn) {
            const span = scoreboardBtn.querySelector('span');
            if (span) {
                const text = this.t('features.scoreboard');
                if (text !== 'features.scoreboard') span.textContent = text;
            }
            scoreboardBtn.title = this.t('scoreboard.title');
        }

        const pickerBtn = document.getElementById('random-picker-feature-btn');
        if (pickerBtn) {
            const span = pickerBtn.querySelector('span');
            if (span) {
                const text = this.t('features.randomPicker');
                if (text !== 'features.randomPicker') span.textContent = text;
            }
            pickerBtn.title = this.t('randomPicker.title');
        }

        const insertImageBtn = document.getElementById('insert-image-btn');
        if (insertImageBtn) {
            const span = insertImageBtn.querySelector('span');
            if (span) {
                const text = this.t('features.insertImage');
                if (text !== 'features.insertImage') span.textContent = text;
            }
            insertImageBtn.title = this.t('features.insertImage');
        }
        
        // Translate close button titles
        const closeButtons = [
            { id: 'feature-close-btn', key: 'common.close' },
            { id: 'config-close-btn', key: 'common.close' },
            { id: 'time-display-area-close-btn', key: 'common.close' }
        ];
        
        closeButtons.forEach(({ id, key }) => {
            const btn = document.getElementById(id);
            if (btn) {
                btn.title = this.t(key);
            }
        });
    }
    
    translateSettingsModal() {
        // Translate settings modal title
        const settingsTitle = document.querySelector('#settings-modal h2');
        if (settingsTitle) {
            settingsTitle.textContent = this.t('settings.title');
        }
        
        // Settings tab labels
        const tabs = document.querySelectorAll('.settings-tab-icon span');
        const tabNames = ['general', 'display', 'canvas', 'background', 'about', 'announcement', 'more'];
        
        tabs.forEach((span, index) => {
            if (tabNames[index]) {
                // Use the translated tab name
                const key = `settings.tabs.${tabNames[index]}`;
                const translation = this.t(key);
                if (translation !== key) {
                    span.textContent = translation;
                }
            }
        });
        
        // Translate settings section headers (h3 tags)
        const headerMappings = {
            '通用设置': 'settings.general.title',
            '显示设置': 'settings.display.title',
            '画布设置': 'settings.canvas.title',
            '背景设置': 'settings.background.title',
            '关于 Aboard': 'settings.about.title',
            '公告': 'settings.announcement.title',
            '更多设置': 'settings.more.title'
        };
        
        document.querySelectorAll('.settings-tab-content h3').forEach(h3 => {
            const text = h3.textContent.trim();
            if (headerMappings[text]) {
                const translation = this.t(headerMappings[text]);
                if (translation !== headerMappings[text]) {
                    h3.textContent = translation;
                }
            }
        });
        
        // Translate settings labels
        this.translateSettingsLabels();
    }
    
    translateSettingsLabels() {
        // Map Chinese labels to translation keys
        const labelMappings = {
            '语言 / Language': 'settings.general.language',
            '全局字体': 'settings.general.globalFont',
            '启用边缘吸附': 'settings.general.edgeSnap',
            '控制按钮位置': 'settings.general.controlPosition',
            '显示缩放控件': 'settings.display.showZoomControls',
            '显示全屏按钮': 'settings.display.showFullscreenBtn',
            '工具栏大小': 'settings.display.toolbarSize',
            '属性栏大小': 'settings.display.configScale',
            '主题色': 'settings.display.themeColor',
            '画布模式': 'settings.canvas.mode',
            '画布尺寸': 'settings.canvas.size',
            '背景透明度': 'settings.background.opacity',
            '图案透明度': 'settings.background.patternIntensity',
            '背景图案偏好': 'settings.background.preference',
            '显示时间和日期': 'settings.more.showTimeDisplay',
            '显示选项': 'settings.time.displayOptions',
            '时区': 'settings.time.timezone',
            '时间格式': 'settings.time.timeFormat',
            '日期格式': 'settings.time.dateFormat',
            '颜色设置': 'settings.time.colorSettings',
            '字体颜色': 'settings.time.textColor',
            '背景颜色': 'settings.time.bgColor',
            '字体大小': 'settings.time.fontSize',
            '透明度': 'settings.time.opacity',
            '全屏模式': 'settings.time.fullscreenMode',
            '全屏字体大小': 'settings.time.fullscreenFontSize'
        };
        
        // Translate labels in settings
        document.querySelectorAll('.settings-tab-content label').forEach(label => {
            const text = label.childNodes[0]?.textContent?.trim();
            if (text && labelMappings[text]) {
                const translation = this.t(labelMappings[text]);
                if (translation !== labelMappings[text]) {
                    if (label.childNodes.length === 1) {
                        label.textContent = translation;
                    } else {
                        label.childNodes[0].textContent = translation;
                    }
                }
            }
        });
        
        // Translate checkbox labels
        document.querySelectorAll('.checkbox-label span').forEach(span => {
            const text = span.textContent.trim();
            if (labelMappings[text]) {
                const translation = this.t(labelMappings[text]);
                if (translation !== labelMappings[text]) {
                    span.textContent = translation;
                }
            }
        });
        
        // Translate canvas mode buttons
        const canvasModeButtons = document.querySelectorAll('.canvas-mode-btn');
        canvasModeButtons.forEach(btn => {
            const mode = btn.getAttribute('data-mode');
            if (mode === 'infinite') {
                btn.textContent = this.t('settings.canvas.infiniteCanvas');
            } else if (mode === 'paginated') {
                btn.textContent = this.t('settings.canvas.pagination');
            }
        });
        
        // Translate position buttons
        const positionMappings = {
            'top-left': 'settings.general.positionTopLeft',
            'top-right': 'settings.general.positionTopRight',
            'bottom-left': 'settings.general.positionBottomLeft',
            'bottom-right': 'settings.general.positionBottomRight'
        };
        
        document.querySelectorAll('.position-option-btn').forEach(btn => {
            const position = btn.getAttribute('data-position');
            if (position && positionMappings[position]) {
                btn.textContent = this.t(positionMappings[position]);
            }
        });
        
        // Translate hints
        this.translateSettingsHints();
    }
    
    translateSettingsHints() {
        const hintMappings = {
            '选择界面语言 / Choose interface language': 'settings.general.languageHint',
            '选择应用程序使用的字体': 'settings.general.globalFontHint',
            '拖动控制面板时自动吸附到屏幕边缘': 'settings.general.edgeSnapHint',
            '选择缩放和分页控件在屏幕上的显示位置': 'settings.general.controlPositionHint',
            '勾选后，在画布上方显示缩放控件': 'settings.display.showZoomControlsHint',
            '勾选后，在缩放控件旁显示全屏按钮': 'settings.display.showFullscreenBtnHint',
            '调整底部工具栏的大小': 'settings.display.toolbarSizeHint',
            '调整弹出具体属性面板的大小': 'settings.display.configScaleHint',
            '工具栏被选中时的颜色': 'settings.display.themeColorHint',
            '选择画布的显示模式': 'settings.canvas.modeHint',
            '选择预设尺寸或自定义画布比例和大小': 'settings.canvas.sizeHint',
            '调整背景的透明度,100%为完全不透明': 'settings.background.opacityHint',
            '调整背景图案线条的明暗程度': 'settings.background.patternIntensityHint',
            '选择在属性栏中显示的图案': 'settings.background.preferenceHint',
            '在右上角显示当前时间和日期': 'settings.more.showTimeDisplayHint',
            '选择要显示的时区': 'settings.time.timezoneHint',
            '选择时间的显示格式': 'settings.time.timeFormatHint',
            '选择日期的显示格式': 'settings.time.dateFormatHint',
            '设置时间显示的字体和背景颜色': 'settings.time.colorSettingsHint',
            '调整时间显示的字体大小': 'settings.time.fontSizeHint',
            '调整时间显示的透明度': 'settings.time.opacityHint',
            '选择如何触发时间全屏显示': 'settings.time.fullscreenModeHint',
            '调整全屏时间显示的字体大小，范围10%-85%': 'settings.time.fullscreenFontSizeHint'
        };
        
        document.querySelectorAll('.settings-hint').forEach(hint => {
            const text = hint.textContent.trim();
            if (hintMappings[text]) {
                const translation = this.t(hintMappings[text]);
                if (translation !== hintMappings[text]) {
                    hint.textContent = translation;
                }
            }
        });
    }
    
    translateModals() {
        // Clear confirmation modal
        const confirmTitle = document.querySelector('#confirm-modal h2');
        if (confirmTitle) {
            confirmTitle.textContent = this.t('tools.clear.confirm');
        }
        
        const confirmMessage = document.querySelector('#confirm-modal .confirm-message');
        if (confirmMessage) {
            confirmMessage.textContent = this.t('tools.clear.message');
        }
        
        const confirmOk = document.getElementById('confirm-ok-btn');
        if (confirmOk) {
            confirmOk.textContent = this.t('common.confirm');
        }
        
        const confirmCancel = document.getElementById('confirm-cancel-btn');
        if (confirmCancel) {
            confirmCancel.textContent = this.t('common.cancel');
        }
        
        // Welcome modal
        const welcomeTitle = document.querySelector('#welcome-modal h2');
        if (welcomeTitle) {
            welcomeTitle.textContent = this.t('welcome.title');
        }
        
        const welcomeContent = document.querySelector('#welcome-modal .modal-content p');
        if (welcomeContent) {
            welcomeContent.textContent = this.t('welcome.content');
        }
        
        const welcomeOk = document.getElementById('welcome-ok-btn');
        if (welcomeOk) {
            welcomeOk.textContent = this.t('welcome.confirm');
        }
        
        const welcomeNoShow = document.getElementById('welcome-no-show-btn');
        if (welcomeNoShow) {
            welcomeNoShow.textContent = this.t('welcome.noShowAgain');
        }
        
        // Announcement modal
        const announcementTitle = document.getElementById('announcement-title');
        if (announcementTitle) {
            announcementTitle.textContent = this.t('settings.announcement.title');
        }
        
        // Time Display Settings Modal
        this.translateTimeDisplaySettings();
        
        // Timer Settings Modal  
        this.translateTimerSettings();
    }
    
    translateTimeDisplaySettings() {
        // Modal title
        const tdSettingsTitle = document.querySelector('#time-display-settings-modal h2');
        if (tdSettingsTitle) {
            tdSettingsTitle.textContent = this.t('timeDisplay.settingsTitle');
        }
        
        // Close button
        const tdCloseBtn = document.getElementById('time-display-settings-close-btn');
        if (tdCloseBtn) {
            tdCloseBtn.title = this.t('common.close');
        }
        
        // Checkbox labels in time display area
        document.querySelectorAll('#time-display-area .checkbox-label span').forEach(span => {
            if (span.textContent.trim() === '显示日期') {
                span.textContent = this.t('timeDisplay.showDate');
            } else if (span.textContent.trim() === '显示时间') {
                span.textContent = this.t('timeDisplay.showTime');
            }
        });
        
        // Settings button
        const tdSettingsBtn = document.getElementById('time-display-area-settings-btn');
        if (tdSettingsBtn) {
            tdSettingsBtn.title = this.t('timeDisplay.settings');
        }
        
        // Label mappings for time display settings
        const labelMappings = {
            '显示选项': 'timeDisplay.displayOptions',
            '时区': 'timeDisplay.timezone',
            '时间格式': 'timeDisplay.timeFormat',
            '日期格式': 'timeDisplay.dateFormat',
            '颜色设置': 'timeDisplay.colorSettings',
            '字体颜色': 'timeDisplay.textColor',
            '背景颜色': 'timeDisplay.bgColor',
            '字体大小': 'timeDisplay.fontSize',
            '透明度': 'timeDisplay.opacity',
            '全屏模式': 'timeDisplay.fullscreenMode',
            '全屏字体大小': 'timeDisplay.fullscreenFontSize',
            '自定义颜色': 'timeDisplay.customColor'
        };
        
        // Translate labels in time display settings modal
        document.querySelectorAll('#time-display-settings-modal label').forEach(label => {
            const text = label.childNodes[0]?.textContent?.trim();
            if (text && labelMappings[text]) {
                const translation = this.t(labelMappings[text]);
                if (translation !== labelMappings[text]) {
                    if (label.childNodes.length === 1) {
                        label.textContent = translation;
                    } else {
                        label.childNodes[0].textContent = translation + ' ';
                    }
                }
            }
        });
        
        // Translate display option buttons
        document.querySelectorAll('.display-option-btn').forEach(btn => {
            const type = btn.getAttribute('data-td-display-type') || btn.getAttribute('data-display-type');
            if (type === 'both') {
                btn.textContent = this.t('timeDisplay.dateAndTime');
            } else if (type === 'date-only') {
                btn.textContent = this.t('timeDisplay.dateOnly');
            } else if (type === 'time-only') {
                btn.textContent = this.t('timeDisplay.timeOnly');
            }
        });
        
        // Translate fullscreen mode buttons
        document.querySelectorAll('.fullscreen-mode-btn').forEach(btn => {
            const mode = btn.getAttribute('data-td-mode') || btn.getAttribute('data-mode');
            if (mode === 'disabled') {
                btn.textContent = this.t('settings.time.fullscreenDisabled');
            } else if (mode === 'single') {
                btn.textContent = this.t('settings.time.fullscreenSingle');
            } else if (mode === 'double') {
                btn.textContent = this.t('settings.time.fullscreenDouble');
            }
        });
        
        // Translate select options (timezone, time format, date format)
        this.translateSelectOptions();
        
        // Translate color button titles in time display settings
        document.querySelectorAll('#time-display-settings-modal .color-btn').forEach(btn => {
            const colorValue = btn.getAttribute('data-td-time-color') || btn.getAttribute('data-td-time-bg-color');
            if (colorValue === 'transparent') {
                btn.title = this.t('timeDisplay.transparent');
            } else {
                // Translate color names
                const colorMap = {
                    '#000000': 'colors.black',
                    '#FFFFFF': 'colors.white',
                    '#007AFF': 'colors.blue',
                    '#FF0000': 'colors.red',
                    '#00FF00': 'colors.green',
                    '#FFFF00': 'colors.yellow',
                    '#FF8800': 'colors.orange',
                    '#8800FF': 'colors.purple'
                };
                if (colorMap[colorValue]) {
                    btn.title = this.t(colorMap[colorValue]);
                }
            }
        });
        
        // Translate fullscreen slider labels
        const timeFullscreenLabel = document.querySelector('.time-fullscreen-slider-label');
        if (timeFullscreenLabel) {
            timeFullscreenLabel.textContent = this.t('timeDisplay.fullscreenSliderLabel');
        }
        
        const timerFullscreenLabel = document.querySelector('.timer-fullscreen-slider-label');
        if (timerFullscreenLabel) {
            timerFullscreenLabel.textContent = this.t('timeDisplay.fullscreenSliderLabel');
        }
    }
    
    translateSelectOptions() {
        // Translate time format options for Time Display Settings modal
        const timeFormatSelect = document.getElementById('td-time-format-select');
        if (timeFormatSelect) {
            timeFormatSelect.options[0].text = this.t('settings.time.timeFormat12');
            timeFormatSelect.options[1].text = this.t('settings.time.timeFormat24');
        }
        
        // Also translate time format in More Settings section
        const timeFormatSelectMore = document.getElementById('time-format-select');
        if (timeFormatSelectMore) {
            timeFormatSelectMore.options[0].text = this.t('settings.time.timeFormat12');
            timeFormatSelectMore.options[1].text = this.t('settings.time.timeFormat24');
        }
        
        // Translate date format options for Time Display Settings modal
        const dateFormatSelect = document.getElementById('td-date-format-select');
        if (dateFormatSelect) {
            dateFormatSelect.options[0].text = this.t('settings.time.dateFormatYMD');
            dateFormatSelect.options[1].text = this.t('settings.time.dateFormatMDY');
            dateFormatSelect.options[2].text = this.t('settings.time.dateFormatDMY');
            dateFormatSelect.options[3].text = this.t('settings.time.dateFormatChinese');
        }
        
        // Also translate date format in More Settings section
        const dateFormatSelectMore = document.getElementById('date-format-select');
        if (dateFormatSelectMore) {
            dateFormatSelectMore.options[0].text = this.t('settings.time.dateFormatYMD');
            dateFormatSelectMore.options[1].text = this.t('settings.time.dateFormatMDY');
            dateFormatSelectMore.options[2].text = this.t('settings.time.dateFormatDMY');
            dateFormatSelectMore.options[3].text = this.t('settings.time.dateFormatChinese');
        }
        
        // Translate timezone options for Time Display Settings modal
        const timezoneSelect = document.getElementById('td-timezone-select');
        if (timezoneSelect) {
            timezoneSelect.options[0].text = this.t('timezones.china');
            timezoneSelect.options[1].text = this.t('timezones.newyork');
            timezoneSelect.options[2].text = this.t('timezones.losangeles');
            timezoneSelect.options[3].text = this.t('timezones.chicago');
            timezoneSelect.options[4].text = this.t('timezones.london');
            timezoneSelect.options[5].text = this.t('timezones.paris');
            timezoneSelect.options[6].text = this.t('timezones.berlin');
            timezoneSelect.options[7].text = this.t('timezones.tokyo');
            timezoneSelect.options[8].text = this.t('timezones.seoul');
            timezoneSelect.options[9].text = this.t('timezones.hongkong');
            timezoneSelect.options[10].text = this.t('timezones.singapore');
            timezoneSelect.options[11].text = this.t('timezones.dubai');
            timezoneSelect.options[12].text = this.t('timezones.sydney');
            timezoneSelect.options[13].text = this.t('timezones.auckland');
            timezoneSelect.options[14].text = this.t('timezones.utc');
        }
        
        // Also translate timezone in More Settings section
        const timezoneSelectMore = document.getElementById('timezone-select');
        if (timezoneSelectMore) {
            timezoneSelectMore.options[0].text = this.t('timezones.china');
            timezoneSelectMore.options[1].text = this.t('timezones.newyork');
            timezoneSelectMore.options[2].text = this.t('timezones.losangeles');
            timezoneSelectMore.options[3].text = this.t('timezones.chicago');
            timezoneSelectMore.options[4].text = this.t('timezones.london');
            timezoneSelectMore.options[5].text = this.t('timezones.paris');
            timezoneSelectMore.options[6].text = this.t('timezones.berlin');
            timezoneSelectMore.options[7].text = this.t('timezones.tokyo');
            timezoneSelectMore.options[8].text = this.t('timezones.seoul');
            timezoneSelectMore.options[9].text = this.t('timezones.hongkong');
            timezoneSelectMore.options[10].text = this.t('timezones.singapore');
            timezoneSelectMore.options[11].text = this.t('timezones.dubai');
            timezoneSelectMore.options[12].text = this.t('timezones.sydney');
            timezoneSelectMore.options[13].text = this.t('timezones.auckland');
            timezoneSelectMore.options[14].text = this.t('timezones.utc');
        }
        
        // Translate "Custom Color" labels for all color picker icon buttons
        document.querySelectorAll('.color-picker-icon-btn').forEach(btn => {
            // Only update if it's actually a color picker button with a title attribute
            if (btn.hasAttribute('title')) {
                btn.title = this.t('timeDisplay.customColor');
            }
        });
        
        // Update label format for font sizes and opacity - "字体大小：当前 16px"
        this.updateLabelFormats();
        
        // Translate global font select options
        const globalFontSelect = document.getElementById('global-font-select');
        if (globalFontSelect) {
            globalFontSelect.options[0].text = this.t('settings.general.fonts.system');
            globalFontSelect.options[1].text = this.t('settings.general.fonts.serif');
            globalFontSelect.options[2].text = this.t('settings.general.fonts.sansSerif');
            globalFontSelect.options[3].text = this.t('settings.general.fonts.monospace');
            globalFontSelect.options[4].text = this.t('settings.general.fonts.cursive');
            globalFontSelect.options[5].text = this.t('settings.general.fonts.yahei');
            globalFontSelect.options[6].text = this.t('settings.general.fonts.simsun');
            globalFontSelect.options[7].text = this.t('settings.general.fonts.simhei');
            globalFontSelect.options[8].text = this.t('settings.general.fonts.kaiti');
            globalFontSelect.options[9].text = this.t('settings.general.fonts.fangsong');
        }
        
        // Translate canvas preset buttons
        document.querySelectorAll('.canvas-preset-btn').forEach(btn => {
            const preset = btn.getAttribute('data-preset');
            if (preset === 'A4-portrait') {
                btn.textContent = this.t('settings.canvas.presets.a4Portrait');
            } else if (preset === 'A4-landscape') {
                btn.textContent = this.t('settings.canvas.presets.a4Landscape');
            } else if (preset === 'A3-portrait') {
                btn.textContent = this.t('settings.canvas.presets.a3Portrait');
            } else if (preset === 'A3-landscape') {
                btn.textContent = this.t('settings.canvas.presets.a3Landscape');
            } else if (preset === 'B5-portrait') {
                btn.textContent = this.t('settings.canvas.presets.b5Portrait');
            } else if (preset === 'B5-landscape') {
                btn.textContent = this.t('settings.canvas.presets.b5Landscape');
            } else if (preset === '16:9') {
                btn.textContent = this.t('settings.canvas.presets.widescreen');
            } else if (preset === '4:3') {
                btn.textContent = this.t('settings.canvas.presets.standard');
            } else if (preset === 'custom') {
                btn.textContent = this.t('settings.canvas.presets.custom');
            }
        });
        
        // Translate canvas ratio dropdown
        const canvasRatioSelect = document.getElementById('canvas-ratio-select');
        if (canvasRatioSelect) {
            canvasRatioSelect.options[0].text = this.t('settings.canvas.customSize.ratios.custom');
            canvasRatioSelect.options[1].text = this.t('settings.canvas.customSize.ratios.16:9');
            canvasRatioSelect.options[2].text = this.t('settings.canvas.customSize.ratios.4:3');
            canvasRatioSelect.options[3].text = this.t('settings.canvas.customSize.ratios.1:1');
            canvasRatioSelect.options[4].text = this.t('settings.canvas.customSize.ratios.3:4');
            canvasRatioSelect.options[5].text = this.t('settings.canvas.customSize.ratios.9:16');
        }
        
        // Translate canvas custom size labels
        const canvasCustomLabels = document.querySelectorAll('.custom-size-row label');
        if (canvasCustomLabels.length >= 3) {
            canvasCustomLabels[0].textContent = this.t('settings.canvas.customSize.width');
            canvasCustomLabels[1].textContent = this.t('settings.canvas.customSize.height');
            canvasCustomLabels[2].textContent = this.t('settings.canvas.customSize.ratio');
        }
        
        // Translate background pattern preference checkboxes
        const patternMappings = {
            'blank': 'background.blank',
            'dots': 'background.dots',
            'grid': 'background.grid',
            'tianzige': 'background.tianzige',
            'english-lines': 'background.english4line',
            'music-staff': 'background.musicStaff',
            'coordinate': 'background.coordinate',
            'image': 'background.image'
        };
        
        document.querySelectorAll('.pattern-pref-checkbox').forEach(checkbox => {
            const pattern = checkbox.getAttribute('data-pattern');
            if (pattern && patternMappings[pattern]) {
                const span = checkbox.parentElement.querySelector('span');
                if (span) {
                    span.textContent = this.t(patternMappings[pattern]);
                }
            }
        });
    }
    
    translateTimerSettings() {
        // Timer Settings Modal title
        const timerTitle = document.querySelector('#timer-settings-modal h2');
        if (timerTitle) {
            timerTitle.textContent = this.t('timer.settingsTitle');
        }
        
        // Timer mode labels
        const selectModeLabel = document.querySelector('.timer-mode-group label');
        if (selectModeLabel) {
            selectModeLabel.textContent = this.t('timer.selectMode');
        }
        
        // Timer mode buttons
        document.querySelectorAll('.timer-mode-btn').forEach(btn => {
            const mode = btn.getAttribute('data-mode');
            if (mode === 'stopwatch') {
                // Keep the SVG, only update the text node
                const textNodes = Array.from(btn.childNodes).filter(node => node.nodeType === Node.TEXT_NODE);
                if (textNodes.length > 0) {
                    textNodes[textNodes.length - 1].textContent = '\n            ' + this.t('timer.stopwatch') + '\n        ';
                }
            } else if (mode === 'countdown') {
                const textNodes = Array.from(btn.childNodes).filter(node => node.nodeType === Node.TEXT_NODE);
                if (textNodes.length > 0) {
                    textNodes[textNodes.length - 1].textContent = '\n            ' + this.t('timer.countdown') + '\n        ';
                }
            }
        });
        
        // Timer title input
        const timerTitleLabel = document.querySelector('label[for="timer-title-input"]');
        if (timerTitleLabel) {
            timerTitleLabel.textContent = this.t('timer.title');
        }
        
        const timerTitleInput = document.getElementById('timer-title-input');
        if (timerTitleInput) {
            timerTitleInput.placeholder = this.t('timer.titlePlaceholder');
        }
        
        // Time label
        const timerTimeLabel = document.getElementById('timer-time-label');
        if (timerTimeLabel) {
            timerTimeLabel.textContent = this.t('timer.setTime');
        }
        
        // Hours, Minutes, Seconds labels
        const timeInputFields = document.querySelectorAll('.time-input-field label');
        if (timeInputFields.length >= 3) {
            timeInputFields[0].textContent = this.t('timer.hours');
            timeInputFields[1].textContent = this.t('timer.minutes');
            timeInputFields[2].textContent = this.t('timer.seconds');
        }
        
        // Adjust Color checkbox label
        const adjustColorLabel = document.querySelector('label[for="timer-color-checkbox"]');
        if (adjustColorLabel) {
            adjustColorLabel.textContent = this.t('timer.adjustColor');
        }
        
        // Font color and background color labels in timer color settings
        const timerColorLabels = document.querySelectorAll('.timer-color-item > label');
        if (timerColorLabels.length >= 2) {
            timerColorLabels[0].textContent = this.t('timer.textColor');
            timerColorLabels[1].textContent = this.t('timer.bgColor');
        }
        
        // Sound settings checkbox label
        const soundCheckboxLabel = document.querySelector('label[for="timer-sound-checkbox"]');
        if (soundCheckboxLabel) {
            soundCheckboxLabel.textContent = this.t('timer.playSound');
        }
        
        // Sound preset buttons
        document.querySelectorAll('.sound-preset-btn').forEach(btn => {
            const soundType = btn.getAttribute('data-sound');
            if (soundType === 'class-bell') {
                btn.textContent = this.t('timer.soundPresets.classBell');
            } else if (soundType === 'exam-end') {
                btn.textContent = this.t('timer.soundPresets.examEnd');
            } else if (soundType === 'gentle-alarm') {
                btn.textContent = this.t('timer.soundPresets.gentle');
            } else if (soundType === 'digital-beep') {
                btn.textContent = this.t('timer.soundPresets.digitalBeep');
            }
        });
        
        // Loop playback checkbox label
        const loopCheckboxLabel = document.querySelector('label[for="timer-loop-checkbox"]');
        if (loopCheckboxLabel) {
            loopCheckboxLabel.textContent = this.t('timer.loopPlayback');
        }
        
        // Loop count label
        const loopCountLabel = document.querySelector('label[for="timer-loop-count"]');
        if (loopCountLabel) {
            loopCountLabel.textContent = this.t('timer.loopCount');
        }
        
        // Upload custom audio button
        const uploadAudioLabel = document.querySelector('label[for="timer-sound-upload"]');
        if (uploadAudioLabel) {
            const textNode = Array.from(uploadAudioLabel.childNodes).find(node => node.nodeType === Node.TEXT_NODE);
            if (textNode) {
                textNode.textContent = '\n                                ' + this.t('timer.uploadCustomAudio') + '\n                            ';
            }
        }
        
        // Timer color button titles
        document.querySelectorAll('#timer-settings-modal .color-btn').forEach(btn => {
            const colorValue = btn.getAttribute('data-timer-text-color') || btn.getAttribute('data-timer-bg-color');
            if (colorValue) {
                const colorMap = {
                    '#333333': 'timer.colors.darkGray',
                    '#000000': 'timer.colors.black',
                    '#FFFFFF': 'timer.colors.whiteDefault',
                    '#FF0000': 'timer.colors.red',
                    '#0000FF': 'timer.colors.blue',
                    '#00FF00': 'timer.colors.green',
                    '#FFFF00': 'timer.colors.yellow',
                    '#FF8800': 'timer.colors.orange',
                    '#F0F0F0': 'timer.colors.lightGray',
                    '#FFE5E5': 'timer.colors.lightRed',
                    '#E5F0FF': 'timer.colors.lightBlue',
                    '#E5FFE5': 'timer.colors.lightGreen',
                    '#FFFFE5': 'timer.colors.lightYellow',
                    '#FFE5CC': 'timer.colors.lightOrange'
                };
                if (colorMap[colorValue]) {
                    btn.title = this.t(colorMap[colorValue]);
                }
            }
        });
        
        // Timer custom color picker title
        document.querySelectorAll('.timer-color-picker-icon').forEach(icon => {
            icon.title = this.t('timer.customColor');
        });
        
        // Timer start button
        const timerStartBtn = document.getElementById('timer-start-btn');
        if (timerStartBtn) {
            timerStartBtn.textContent = this.t('timer.start');
        }
        
        // Timer fullscreen close button
        const timerFullscreenClose = document.getElementById('timer-fullscreen-close-btn');
        if (timerFullscreenClose) {
            timerFullscreenClose.title = this.t('common.close');
        }
        
        const timeFullscreenClose = document.getElementById('time-fullscreen-close-btn');
        if (timeFullscreenClose) {
            timeFullscreenClose.title = this.t('common.close');
        }
    }
    
    updateLabelFormats() {
        // Update Time Display Settings labels to format: "Font Size: Current 16px"
        const tdFontSizeLabel = document.querySelector('label[for="td-time-font-size-slider"], label:has(#td-time-font-size-value)');
        if (tdFontSizeLabel) {
            const valueSpan = document.getElementById('td-time-font-size-value');
            if (valueSpan) {
                const currentValue = valueSpan.textContent;
                tdFontSizeLabel.innerHTML = this.t('timeDisplay.fontSizeLabel') + ' <span id="td-time-font-size-value">' + currentValue + '</span>px';
            }
        }
        
        const tdOpacityLabel = document.querySelector('label[for="td-time-opacity-slider"], label:has(#td-time-opacity-value)');
        if (tdOpacityLabel) {
            const valueSpan = document.getElementById('td-time-opacity-value');
            if (valueSpan) {
                const currentValue = valueSpan.textContent;
                tdOpacityLabel.innerHTML = this.t('timeDisplay.opacityLabel') + ' <span id="td-time-opacity-value">' + currentValue + '</span>%';
            }
        }
        
        const tdFullscreenLabel = document.querySelector('label[for="td-time-fullscreen-font-size-slider"], label:has(#td-time-fullscreen-font-size-value)');
        if (tdFullscreenLabel) {
            const valueSpan = document.getElementById('td-time-fullscreen-font-size-value');
            if (valueSpan) {
                const currentValue = valueSpan.textContent;
                tdFullscreenLabel.innerHTML = this.t('timeDisplay.fullscreenFontSizeLabel') + ' <span id="td-time-fullscreen-font-size-value">' + currentValue + '</span>%';
            }
        }
        
        // Update Settings modal labels
        const timeFontSizeLabel = document.querySelector('label:has(#time-font-size-value)');
        if (timeFontSizeLabel) {
            const valueSpan = document.getElementById('time-font-size-value');
            if (valueSpan) {
                const currentValue = valueSpan.textContent;
                timeFontSizeLabel.innerHTML = this.t('timeDisplay.fontSizeLabel') + ' <span id="time-font-size-value">' + currentValue + '</span>px';
            }
        }
        
        const timeOpacityLabel = document.querySelector('label:has(#time-opacity-value)');
        if (timeOpacityLabel) {
            const valueSpan = document.getElementById('time-opacity-value');
            if (valueSpan) {
                const currentValue = valueSpan.textContent;
                timeOpacityLabel.innerHTML = this.t('timeDisplay.opacityLabel') + ' <span id="time-opacity-value">' + currentValue + '</span>%';
            }
        }
        
        const timeFullscreenLabel = document.querySelector('label:has(#time-fullscreen-font-size-value)');
        if (timeFullscreenLabel) {
            const valueSpan = document.getElementById('time-fullscreen-font-size-value');
            if (valueSpan) {
                const currentValue = valueSpan.textContent;
                timeFullscreenLabel.innerHTML = this.t('timeDisplay.fullscreenFontSizeLabel') + ' <span id="time-fullscreen-font-size-value">' + currentValue + '</span>%';
            }
        }
        
        // Update background opacity label
        const bgOpacityLabel = document.querySelector('label:has(#bg-opacity-value)');
        if (bgOpacityLabel) {
            const valueSpan = document.getElementById('bg-opacity-value');
            if (valueSpan) {
                const currentValue = valueSpan.textContent;
                bgOpacityLabel.innerHTML = this.t('background.opacityLabel') + ' <span id="bg-opacity-value">' + currentValue + '</span>%';
            }
        }
        
        // Update pattern intensity label
        const patternIntensityLabel = document.querySelector('label:has(#pattern-intensity-value)');
        if (patternIntensityLabel) {
            const valueSpan = document.getElementById('pattern-intensity-value');
            if (valueSpan) {
                const currentValue = valueSpan.textContent;
                patternIntensityLabel.innerHTML = this.t('background.contrastLabel') + ' <span id="pattern-intensity-value">' + currentValue + '</span>%';
            }
        }
        
        // Update pen size label
        const penSizeLabel = document.querySelector('label:has(#pen-size-value)');
        if (penSizeLabel) {
            const valueSpan = document.getElementById('pen-size-value');
            if (valueSpan) {
                const currentValue = valueSpan.textContent;
                penSizeLabel.innerHTML = this.t('tools.pen.sizeLabel') + ' <span id="pen-size-value">' + currentValue + '</span>px';
            }
        }
        
        // Update eraser size label
        const eraserSizeLabel = document.querySelector('label:has(#eraser-size-value)');
        if (eraserSizeLabel) {
            const valueSpan = document.getElementById('eraser-size-value');
            if (valueSpan) {
                const currentValue = valueSpan.textContent;
                eraserSizeLabel.innerHTML = this.t('tools.eraser.sizeLabel') + ' <span id="eraser-size-value">' + currentValue + '</span>px';
            }
        }
        
        // Update pattern density label
        const densityLabel = document.querySelector('label:has(#pattern-density-value)');
        if (densityLabel) {
            const valueSpan = document.getElementById('pattern-density-value');
            if (valueSpan) {
                const currentValue = valueSpan.textContent;
                densityLabel.innerHTML = this.t('background.densityLabel') + ' <span id="pattern-density-value">' + currentValue + '</span>%';
            }
        }
        
        // Update background image size label
        const imageSizeLabel = document.querySelector('label:has(#bg-image-size-value)');
        if (imageSizeLabel) {
            const valueSpan = document.getElementById('bg-image-size-value');
            if (valueSpan) {
                const currentValue = valueSpan.textContent;
                imageSizeLabel.innerHTML = this.t('background.sizeLabel') + ' <span id="bg-image-size-value">' + currentValue + '</span>%';
            }
        }
        
        // Update toolbar size label
        const toolbarSizeLabel = document.querySelector('label:has(#toolbar-size-value)');
        if (toolbarSizeLabel) {
            const valueSpan = document.getElementById('toolbar-size-value');
            if (valueSpan) {
                const currentValue = valueSpan.textContent;
                toolbarSizeLabel.innerHTML = this.t('settings.display.toolbarSizeLabel') + ' <span id="toolbar-size-value">' + currentValue + '</span>px';
            }
        }
        
        // Update config scale label
        const configScaleLabel = document.querySelector('label:has(#config-scale-value)');
        if (configScaleLabel) {
            const valueSpan = document.getElementById('config-scale-value');
            if (valueSpan) {
                const currentValue = valueSpan.textContent;
                configScaleLabel.innerHTML = this.t('settings.display.configScaleLabel') + ' <span id="config-scale-value">' + currentValue + '</span>%';
            }
        }
    }
    
    translateAboutContent() {
        // About section
        const aboutTitle = document.querySelector('#about-settings h3');
        if (aboutTitle) {
            const text = aboutTitle.textContent.trim();
            // Translate if it's Chinese OR if already translated (for refresh)
            if (text === '关于 Aboard' || text === 'About Aboard') {
                const translation = this.t('settings.about.title');
                if (translation !== 'settings.about.title' && translation !== text) {
                    aboutTitle.textContent = translation;
                }
            }
        }
        
        // Update all about section content
        const aboutSections = document.querySelectorAll('#about-settings .about-section');
        if (aboutSections.length >= 5) {
            // Project intro
            const projectIntro = aboutSections[0].querySelector('h4');
            const desc1 = aboutSections[0].querySelectorAll('p')[0];
            const desc2 = aboutSections[0].querySelectorAll('p')[1];
            
            if (projectIntro) {
                const text = projectIntro.textContent.trim();
                const translation = this.t('settings.about.projectIntro');
                if (translation !== 'settings.about.projectIntro' && translation !== text) {
                    projectIntro.textContent = translation;
                }
            }
            if (desc1) {
                const translation = this.t('settings.about.description1');
                if (translation !== 'settings.about.description1') {
                    desc1.textContent = translation;
                }
            }
            if (desc2) {
                const translation = this.t('settings.about.description2');
                if (translation !== 'settings.about.description2') {
                    desc2.textContent = translation;
                }
            }
            
            // Main features
            const featuresHeader = aboutSections[1].querySelector('h4');
            if (featuresHeader) {
                const text = featuresHeader.textContent.trim();
                const translation = this.t('settings.about.mainFeatures');
                if (translation !== 'settings.about.mainFeatures' && translation !== text) {
                    featuresHeader.textContent = translation;
                }
            }
            
            // Translate feature list items - they have bullet points in HTML
            const featureItems = aboutSections[1].querySelectorAll('li');
            const featureKeys = [
                'penTypes',
                'smartEraser',
                'richPatterns',
                'adjustable',
                'canvasModes',
                'customSize',
                'draggable',
                'undoRedo',
                'smartZoom',
                'responsive'
            ];
            
            featureItems.forEach((item, index) => {
                if (index < featureKeys.length) {
                    const translation = this.t(`settings.about.features.${featureKeys[index]}`);
                    if (translation && translation !== `settings.about.features.${featureKeys[index]}`) {
                        item.textContent = translation; // Don't add bullet, CSS handles it
                    }
                }
            });
            
            // Tech stack
            const techHeader = aboutSections[2].querySelector('h4');
            const techContent = aboutSections[2].querySelector('p');
            if (techHeader) {
                const text = techHeader.textContent.trim();
                const translation = this.t('settings.about.techStack');
                if (translation !== 'settings.about.techStack' && translation !== text) {
                    techHeader.textContent = translation;
                }
            }
            // Tech content should stay the same in all languages
            
            // License
            const licenseHeader = aboutSections[3].querySelector('h4');
            const licenseContent = aboutSections[3].querySelector('p');
            if (licenseHeader) {
                const text = licenseHeader.textContent.trim();
                const translation = this.t('settings.about.license');
                if (translation !== 'settings.about.license' && translation !== text) {
                    licenseHeader.textContent = translation;
                }
            }
            // License type should stay the same
            
            // GitHub (keep as is)
            
            // Version header
            const versionHeader = aboutSections[5]?.querySelector('h4');
            if (versionHeader) {
                const text = versionHeader.textContent.trim();
                const translation = this.t('settings.about.version');
                if (translation !== 'settings.about.version' && translation !== text) {
                    versionHeader.textContent = translation;
                }
            }
        }
    }
    
    translateAnnouncementContent() {
        // Announcement modal title
        const announcementTitle = document.querySelector('#announcement-modal h2');
        if (announcementTitle && announcementTitle.textContent.trim() === '公告') {
            const translation = this.t('settings.announcement.title');
            if (translation !== 'settings.announcement.title') {
                announcementTitle.textContent = translation;
            }
        }
        
        // Announcement section title in settings
        const settingsAnnouncementTitle = document.querySelector('#announcement-settings h3');
        if (settingsAnnouncementTitle && settingsAnnouncementTitle.textContent.trim() === '公告') {
            const translation = this.t('settings.announcement.title');
            if (translation !== 'settings.announcement.title') {
                settingsAnnouncementTitle.textContent = translation;
            }
        }
        
        // Announcement modal buttons
        const announcementOkBtn = document.getElementById('announcement-ok-btn');
        if (announcementOkBtn && announcementOkBtn.textContent.trim() === '确定') {
            announcementOkBtn.textContent = this.t('common.ok');
        }
        
        const announcementNoShowBtn = document.getElementById('announcement-no-show-btn');
        if (announcementNoShowBtn && announcementNoShowBtn.textContent.trim() === '不再弹出') {
            const translation = this.t('welcome.noShowAgain');
            if (translation !== 'welcome.noShowAgain') {
                announcementNoShowBtn.textContent = translation;
            }
        }
    }
    

    /**
     * Change language
     */
    async changeLocale(newLocale) {
        if (!this.availableLocales[newLocale]) {
            console.error(`Locale ${newLocale} not supported`);
            return;
        }
        
        this.currentLocale = newLocale;
        this.saveLocale(newLocale);
        
        // Reload translations
        await this.loadTranslations();
        
        // Reapply translations
        this.applyTranslations();
        
        // Update HTML lang attribute
        document.documentElement.lang = newLocale;
        
        // Dispatch event for other modules to react to language change
        window.dispatchEvent(new CustomEvent('localeChanged', { detail: { locale: newLocale } }));
    }

    /**
     * Get current locale
     */
    getCurrentLocale() {
        return this.currentLocale;
    }

    /**
     * Get available locales
     */
    getAvailableLocales() {
        return this.availableLocales;
    }
}

// Create global i18n instance
window.i18n = new I18n();
