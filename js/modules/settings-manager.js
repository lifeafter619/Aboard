// Settings Management Module
// Handles application settings and preferences
const largeScreenWidth = 1920;
const highDpiRatio = 1.5;
const defaultCanvasWidth = 1920;
const defaultCanvasHeight = 1080;
const minCanvasDimension = 300;
const maxCanvasDimension = 4000;
const defaultThemeColor = '#007AFF';
const minimumThemeContrastRatio = 4.5;
const importedConfigMaxDepth = 20;
const importedConfigMaxCollectionEntries = 1000;
const importedConfigMaxTotalEntries = 10000;
const importedConfigMaxCustomFonts = 100;
const importedConfigUnsafeKeys = new Set(['__proto__', 'constructor', 'prototype']);
const validControlPositions = new Set(['top-left', 'top-right', 'bottom-left', 'bottom-right']);

function parseThemeHexColor(value) {
    const match = String(value || '').trim().match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i);
    if (!match) return null;
    const hex = match[1].length === 3
        ? match[1].split('').map((character) => character + character).join('')
        : match[1];
    return {
        r: parseInt(hex.slice(0, 2), 16),
        g: parseInt(hex.slice(2, 4), 16),
        b: parseInt(hex.slice(4, 6), 16)
    };
}

function formatThemeHexColor({ r, g, b }) {
    return `#${[r, g, b]
        .map((component) => Math.max(0, Math.min(255, Math.round(component))).toString(16).padStart(2, '0'))
        .join('')}`.toUpperCase();
}

function normalizeThemeColorInput(value) {
    const parsed = parseThemeHexColor(value) || parseThemeHexColor(defaultThemeColor);
    return formatThemeHexColor(parsed);
}

function getRelativeLuminance({ r, g, b }) {
    const toLinear = (component) => {
        const channel = component / 255;
        return channel <= 0.04045
            ? channel / 12.92
            : ((channel + 0.055) / 1.055) ** 2.4;
    };
    return 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b);
}

function getContrastAgainstWhite(rgb) {
    return 1.05 / (getRelativeLuminance(rgb) + 0.05);
}

function getAccessibleThemeColor(value) {
    const parsed = parseThemeHexColor(value) || parseThemeHexColor(defaultThemeColor);
    if (getContrastAgainstWhite(parsed) >= minimumThemeContrastRatio) {
        return formatThemeHexColor(parsed);
    }

    // Preserve hue while finding the lightest RGB scale that still gives
    // white labels and theme-colored text at least 4.5:1 contrast.
    let accessibleScale = 0;
    let inaccessibleScale = 1;
    for (let iteration = 0; iteration < 18; iteration++) {
        const candidateScale = (accessibleScale + inaccessibleScale) / 2;
        const candidate = {
            r: parsed.r * candidateScale,
            g: parsed.g * candidateScale,
            b: parsed.b * candidateScale
        };
        if (getContrastAgainstWhite(candidate) >= minimumThemeContrastRatio) {
            accessibleScale = candidateScale;
        } else {
            inaccessibleScale = candidateScale;
        }
    }

    let accessibleColor = {
        r: Math.round(parsed.r * accessibleScale),
        g: Math.round(parsed.g * accessibleScale),
        b: Math.round(parsed.b * accessibleScale)
    };
    while (getContrastAgainstWhite(accessibleColor) < minimumThemeContrastRatio) {
        accessibleColor = {
            r: Math.max(0, accessibleColor.r - 1),
            g: Math.max(0, accessibleColor.g - 1),
            b: Math.max(0, accessibleColor.b - 1)
        };
    }
    return formatThemeHexColor(accessibleColor);
}

function normalizeCanvasDimension(value, fallbackValue) {
    const parsedValue = typeof value === 'number' ? value : parseInt(value, 10);
    if (!Number.isFinite(parsedValue)) {
        return fallbackValue;
    }

    return Math.max(minCanvasDimension, Math.min(maxCanvasDimension, Math.round(parsedValue)));
}

function safeLocalStorageGetItem(key) {
    try {
        return localStorage.getItem(key);
    } catch (error) {
        console.warn(`Failed to read localStorage key "${key}":`, error);
        return null;
    }
}

function safeLocalStorageSetItem(key, value) {
    try {
        localStorage.setItem(key, value);
        return true;
    } catch (error) {
        console.warn(`Failed to write localStorage key "${key}":`, error);
        return false;
    }
}

function safeLocalStorageRemoveItem(key) {
    try {
        localStorage.removeItem(key);
        return true;
    } catch (error) {
        console.warn(`Failed to remove localStorage key "${key}":`, error);
        return false;
    }
}

function updateElementById(elementId, updater) {
    const element = document.getElementById(elementId);
    if (!element) {
        return null;
    }

    updater(element);
    return element;
}

function normalizeStoredNumber(value, fallbackValue, minimum, maximum) {
    const parsedValue = Number(value);
    return Number.isFinite(parsedValue) && parsedValue >= minimum && parsedValue <= maximum
        ? parsedValue
        : fallbackValue;
}

function isPlainObject(value) {
    return value !== null && Object.prototype.toString.call(value) === '[object Object]';
}

function isValidCustomFont(font) {
    return isPlainObject(font)
        && typeof font.name === 'string' && Boolean(font.name.trim())
        && typeof font.data === 'string' && Boolean(font.data.trim())
        && font.data.length <= 3 * 1024 * 1024;
}

class SettingsManager {
    constructor() {
        const storedToolbarSize = safeLocalStorageGetItem('toolbarSize');
        const storedConfigScale = safeLocalStorageGetItem('configScale');
        const isLargeScreen = window.innerWidth >= largeScreenWidth;
        const isHighDpi = (window.devicePixelRatio || 1) >= highDpiRatio;
        const isHighResDisplay = isLargeScreen || isHighDpi;
        this.toolbarSize = normalizeStoredNumber(storedToolbarSize, isHighResDisplay ? 65 : 60, 30, 100);
        this.configScale = normalizeStoredNumber(storedConfigScale, isHighResDisplay ? 1.1 : 1.0, 0.5, 1.5);
        const storedControlPosition = safeLocalStorageGetItem('controlPosition');
        this.controlPosition = validControlPositions.has(storedControlPosition) ? storedControlPosition : 'top-right';
        this.edgeSnapEnabled = safeLocalStorageGetItem('edgeSnapEnabled') !== 'false';
        this.touchZoomEnabled = safeLocalStorageGetItem('touchZoomEnabled') !== 'false';
        this.updatePreference = this.normalizeUpdatePreference(safeLocalStorageGetItem('updatePreference'));
        this.legacyProjectImportEnabled = safeLocalStorageGetItem('legacyProjectImportEnabled') === 'true';
        this.unlimitedZoom = safeLocalStorageGetItem('unlimitedZoom') === 'true';
        this.infiniteCanvas = false; // Always use pagination mode
        this.showZoomControls = safeLocalStorageGetItem('showZoomControls') !== 'false';
        this.showImportExportBtn = safeLocalStorageGetItem('showImportExportBtn') !== 'false';
        this.showFullscreenBtn = safeLocalStorageGetItem('showFullscreenBtn') !== 'false';
        this.showToolbarText = safeLocalStorageGetItem('showToolbarText') !== 'false'; // Default true
        this.keepMorePanelOpen = safeLocalStorageGetItem('keepMorePanelOpen') !== 'false';
        this.patternPreferences = this.loadPatternPreferences();
        this.canvasWidth = normalizeCanvasDimension(safeLocalStorageGetItem('canvasWidth'), defaultCanvasWidth);
        this.canvasHeight = normalizeCanvasDimension(safeLocalStorageGetItem('canvasHeight'), defaultCanvasHeight);
        this.canvasPreset = safeLocalStorageGetItem('canvasPreset') || 'custom';
        this.themeColor = normalizeThemeColorInput(safeLocalStorageGetItem('themeColor') || defaultThemeColor);
        this.globalFont = safeLocalStorageGetItem('globalFont') || 'system';
        this.customFonts = this.loadCustomFonts();
        this.fontPreferences = this.loadFontPreferences();
        this.fontPreviewSettings = this.loadFontPreviewSettings();
        this.modalSizePreferences = this.loadModalSizePreferences();
        this.modalCenterPreferences = this.loadModalCenterPreferences();
        this.ensureFontPreferencesIntegrity();
        this.ensureFontPreviewSettingsIntegrity();

        // Initialize Toast Manager
        this.toastManager = new ToastManager();
        
        // Load custom fonts to document
        this.loadCustomFontsToDocument();
    }
    
    // Load custom fonts from localStorage
    loadCustomFonts() {
        const saved = safeLocalStorageGetItem('customFonts');
        if (saved) {
            try {
                const fonts = JSON.parse(saved);
                return Array.isArray(fonts) ? fonts.filter(isValidCustomFont) : [];
            } catch (e) {
                console.warn('Failed to load custom fonts:', e);
            }
        }
        return [];
    }

    getBaseFontOptions() {
        return [
            { value: 'system', label: 'settings.general.fonts.system' },
            { value: 'serif', label: 'settings.general.fonts.serif' },
            { value: 'sans-serif', label: 'settings.general.fonts.sansSerif' },
            { value: 'monospace', label: 'settings.general.fonts.monospace' },
            { value: 'cursive', label: 'settings.general.fonts.cursive' },
            { value: 'Noto Sans SC', label: 'settings.general.fonts.notoSansSC', fallback: 'Noto Sans SC' },
            { value: 'Noto Serif SC', label: 'settings.general.fonts.notoSerifSC', fallback: 'Noto Serif SC' },
            { value: 'LXGW WenKai', label: 'settings.general.fonts.lxgwWenKai', fallback: 'LXGW WenKai' },
            { value: 'Source Han Sans SC', label: 'settings.general.fonts.sourceHanSansSC', fallback: 'Source Han Sans SC' },
            { value: 'Source Han Serif SC', label: 'settings.general.fonts.sourceHanSerifSC', fallback: 'Source Han Serif SC' },
            { value: 'Inter', label: 'settings.general.fonts.inter', fallback: 'Inter' },
            { value: 'Roboto', label: 'settings.general.fonts.roboto', fallback: 'Roboto' },
            { value: 'Open Sans', label: 'settings.general.fonts.openSans', fallback: 'Open Sans' },
            { value: 'Lora', label: 'settings.general.fonts.lora', fallback: 'Lora' },
            { value: 'JetBrains Mono', label: 'settings.general.fonts.jetBrainsMono', fallback: 'JetBrains Mono' },
            { value: 'KaiTi', label: 'settings.general.fonts.kaiTi', fallback: 'KaiTi' },
            { value: 'STXingkai', label: 'settings.general.fonts.stXingkai', fallback: 'STXingkai' }
        ];
    }

    getAllFontValues() {
        const baseValues = this.getBaseFontOptions().map(f => f.value);
        const customValues = this.customFonts.map(f => f.name);
        return [...baseValues, ...customValues];
    }

    loadFontPreferences() {
        const saved = safeLocalStorageGetItem('fontPreferences');
        if (saved) {
            try {
                return JSON.parse(saved);
            } catch (e) {
                console.warn('Failed to load font preferences:', e);
            }
        }
        return { order: [], visibility: {}, aliases: {} };
    }

    getDefaultFontPreviewSettings() {
        const previewSample = window.i18n?.t?.('settings.general.fontPreviewSample');
        return {
            sampleText: previewSample && previewSample !== 'settings.general.fontPreviewSample'
                ? previewSample
                : 'Font Preview ABC abc 123',
            fontSize: 48
        };
    }

    loadFontPreviewSettings() {
        const saved = safeLocalStorageGetItem('fontPreviewSettings');
        if (saved) {
            try {
                return JSON.parse(saved);
            } catch (e) {
                console.warn('Failed to load font preview settings:', e);
            }
        }
        return this.getDefaultFontPreviewSettings();
    }

    loadModalSizePreferences() {
        const saved = safeLocalStorageGetItem('modalSizePreferences');
        if (saved) {
            try {
                return JSON.parse(saved);
            } catch (e) {
                console.warn('Failed to load modal size preferences:', e);
            }
        }
        return {};
    }

    loadModalCenterPreferences() {
        const saved = safeLocalStorageGetItem('modalCenterPreferences');
        if (saved) {
            try {
                return JSON.parse(saved);
            } catch (e) {
                console.warn('Failed to load modal center preferences:', e);
            }
        }
        return {};
    }

    saveFontPreferences() {
        safeLocalStorageSetItem('fontPreferences', JSON.stringify(this.fontPreferences));
    }

    saveFontPreviewSettings() {
        safeLocalStorageSetItem('fontPreviewSettings', JSON.stringify(this.fontPreviewSettings));
    }

    saveModalSizePreferences() {
        safeLocalStorageSetItem('modalSizePreferences', JSON.stringify(this.modalSizePreferences));
    }

    saveModalCenterPreferences() {
        safeLocalStorageSetItem('modalCenterPreferences', JSON.stringify(this.modalCenterPreferences));
    }

    ensureFontPreferencesIntegrity() {
        if (!this.fontPreferences || typeof this.fontPreferences !== 'object') {
            this.fontPreferences = { order: [], visibility: {}, aliases: {} };
        }
        this.fontPreferences.order = Array.isArray(this.fontPreferences.order) ? this.fontPreferences.order : [];
        this.fontPreferences.visibility = this.fontPreferences.visibility || {};
        this.fontPreferences.aliases = this.fontPreferences.aliases || {};

        const allValues = this.getAllFontValues();
        this.fontPreferences.order = this.normalizeFontOrder(this.fontPreferences.order, allValues);
        allValues.forEach(value => {
            if (!this.fontPreferences.order.includes(value)) {
                this.fontPreferences.order.push(value);
            }
            if (this.fontPreferences.visibility[value] === undefined) {
                this.fontPreferences.visibility[value] = true;
            }
        });
        this.saveFontPreferences();
    }

    ensureFontPreviewSettingsIntegrity() {
        const defaults = this.getDefaultFontPreviewSettings();
        if (!this.fontPreviewSettings || typeof this.fontPreviewSettings !== 'object') {
            this.fontPreviewSettings = { ...defaults };
        }

        const sampleText = typeof this.fontPreviewSettings.sampleText === 'string'
            ? this.fontPreviewSettings.sampleText.trim()
            : '';
        const fontSize = parseInt(this.fontPreviewSettings.fontSize, 10);

        this.fontPreviewSettings.sampleText = sampleText || defaults.sampleText;
        this.fontPreviewSettings.fontSize = Number.isFinite(fontSize)
            ? Math.max(16, Math.min(160, fontSize))
            : defaults.fontSize;

        this.saveFontPreviewSettings();
    }

    normalizeFontOrder(order, allValues) {
        const validOrdered = order.filter(value => allValues.includes(value));
        const deduped = [];
        const dedupedSet = new Set();
        validOrdered.forEach(value => {
            if (!dedupedSet.has(value)) {
                dedupedSet.add(value);
                deduped.push(value);
            }
        });
        return deduped;
    }
    
    // Save custom fonts to localStorage
    saveCustomFonts() {
        try {
            const persisted = safeLocalStorageSetItem('customFonts', JSON.stringify(this.customFonts));
            if (!persisted) {
                throw new Error('custom-font-storage-write-failed');
            }
            return true;
        } catch (e) {
            const msg = window.i18n ? window.i18n.t('tools.text.storageQuotaExceeded') : 'Storage quota exceeded. Please delete some custom fonts.';
            if (this.toastManager) {
                this.toastManager.show(msg, 'error');
            }
            console.warn('Failed to save custom fonts:', e);
            return false;
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
        const fontSet = typeof document !== 'undefined' ? document.fonts : null;
        if (typeof FontFace !== 'function' || !fontSet || typeof fontSet.add !== 'function') {
            console.warn(`FontFace API is unavailable, skipping custom font ${name}`);
            return Promise.resolve(null);
        }

        try {
            const fontFace = new FontFace(name, `url(${data})`);
            return fontFace.load().then(loadedFace => {
                fontSet.add(loadedFace);
                return loadedFace;
            }).catch(err => {
                console.warn(`Failed to load custom font ${name}:`, err);
                return null;
            });
        } catch (err) {
            console.warn(`Failed to load custom font ${name}:`, err);
            return Promise.resolve(null);
        }
    }
    
    // Handle font file upload. Returns a Promise resolving with the font
    // name once the (async) FileReader work is done, or null on failure —
    // callers that refresh font dropdowns must await it.
    handleFontUpload(file) {
        if (!file) return Promise.resolve(null);

        // Check file size (limit to 2MB)
        const maxSize = 2 * 1024 * 1024;
        if (file.size > maxSize) {
            const msg = window.i18n ? window.i18n.t('tools.text.fontTooLarge') : 'Font file is too large. Maximum size is 2MB.';
            if (this.toastManager) {
                this.toastManager.show(msg, 'error');
            }
            return Promise.resolve(null);
        }

        const extension = file.name.split('.').pop().toLowerCase();
        const validExtensions = ['ttf', 'otf', 'woff', 'woff2'];

        if (!validExtensions.includes(extension)) {
            const msg = window.i18n ? window.i18n.t('tools.text.invalidFontFormat') : 'Invalid font format. Please use TTF, OTF, WOFF, or WOFF2 files.';
            if (this.toastManager) {
                this.toastManager.show(msg, 'error');
            }
            return Promise.resolve(null);
        }

        return new Promise((resolve) => {
            const reader = new FileReader();
            reader.onload = async (e) => {
                const fontData = e.target.result;
                const lastDotIndex = file.name.lastIndexOf('.');
                const fontName = lastDotIndex > 0 ? file.name.substring(0, lastDotIndex) : file.name;

                const exists = this.customFonts.find(f => f.name === fontName);
                if (!exists) {
                    const loadedFace = await this.addFontToDocument(fontName, fontData);
                    if (!loadedFace) {
                        const msg = window.i18n?.t?.('errors.fileReadFailed') || 'Failed to load the selected font. Please verify the file is not corrupted.';
                        this.toastManager?.show?.(msg, 'error');
                        resolve(null);
                        return;
                    }

                    const newFont = { name: fontName, data: fontData };
                    this.customFonts.push(newFont);
                    if (!this.saveCustomFonts()) {
                        const fontIndex = this.customFonts.indexOf(newFont);
                        if (fontIndex >= 0) {
                            this.customFonts.splice(fontIndex, 1);
                        }
                        document.fonts?.delete?.(loadedFace);
                        resolve(null);
                        return;
                    }
                    this.ensureFontPreferencesIntegrity();
                    this.fontPreferences.visibility[fontName] = true;
                    if (!this.fontPreferences.aliases[fontName]) {
                        this.fontPreferences.aliases[fontName] = fontName;
                    }
                    this.saveFontPreferences();
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
                resolve(fontName);
            };
            reader.onerror = () => {
                console.warn('Failed to read font file:', reader.error);
                const msg = window.i18n?.t?.('errors.fileReadFailed') || 'Failed to read the selected file.';
                if (this.toastManager) {
                    this.toastManager.show(msg, 'error');
                }
                resolve(null);
            };
            reader.readAsDataURL(file);
        });
    }
    
    // Populate global font select with custom fonts
    populateGlobalFontSelect() {
        const select = document.getElementById('global-font-select');
        if (!select) return;

        const previousValue = select.value || this.globalFont;
        select.innerHTML = '';

        const visibleFonts = this.getManagedFontOptions().filter(font => font.visible);
        visibleFonts.forEach(font => {
            const option = document.createElement('option');
            option.value = font.value;
            option.textContent = font.label;
            select.appendChild(option);
        });

        const hasPrevious = visibleFonts.some(font => font.value === previousValue);
        if (hasPrevious) {
            select.value = previousValue;
        } else if (visibleFonts.length > 0) {
            select.value = visibleFonts[0].value;
        }

        if (select.value && this.globalFont !== select.value) {
            this.globalFont = select.value;
            safeLocalStorageSetItem('globalFont', this.globalFont);
            this.applyGlobalFont();
        }
    }

    getManagedFontOptions() {
        this.ensureFontPreferencesIntegrity();
        const baseMap = new Map(this.getBaseFontOptions().map(font => [font.value, font]));
        const customMap = new Map(this.customFonts.map(font => [font.name, font]));

        return this.fontPreferences.order
            .filter(value => baseMap.has(value) || customMap.has(value))
            .map(value => {
                const base = baseMap.get(value);
                const custom = customMap.get(value);
                let rawLabel = this.fontPreferences.aliases[value];
                if (!rawLabel) {
                    rawLabel = base ? base.label : value;
                }
                let translatedLabel = rawLabel;
                if (window.i18n && typeof rawLabel === 'string' && rawLabel.startsWith('settings.')) {
                    let translated = rawLabel;
                    try {
                        translated = window.i18n.t(rawLabel);
                    } catch (e) {
                        translated = rawLabel;
                    }
                    translatedLabel = (translated && translated !== rawLabel)
                        ? translated
                        : (base?.fallback || value);
                }
                return {
                    value,
                    label: translatedLabel,
                    visible: this.fontPreferences.visibility[value] !== false,
                    isCustom: Boolean(custom)
                };
            });
    }

    setFontVisibility(fontValue, visible) {
        this.ensureFontPreferencesIntegrity();
        this.fontPreferences.visibility[fontValue] = visible;
        this.saveFontPreferences();
        this.populateGlobalFontSelect();
    }

    setFontAlias(fontValue, alias) {
        this.ensureFontPreferencesIntegrity();
        const finalAlias = alias ? alias.trim() : '';
        if (finalAlias) {
            this.fontPreferences.aliases[fontValue] = finalAlias;
        } else {
            delete this.fontPreferences.aliases[fontValue];
        }
        this.saveFontPreferences();
        this.populateGlobalFontSelect();
    }

    setFontOrder(order) {
        this.ensureFontPreferencesIntegrity();
        const allValues = this.getAllFontValues();
        const deduped = this.normalizeFontOrder(order, allValues);
        const dedupedSet = new Set(deduped);
        allValues.forEach(value => {
            if (!dedupedSet.has(value)) {
                dedupedSet.add(value);
                deduped.push(value);
            }
        });
        this.fontPreferences.order = deduped;
        this.saveFontPreferences();
        this.populateGlobalFontSelect();
    }

    getFontPreviewSettings() {
        this.ensureFontPreviewSettingsIntegrity();
        return { ...this.fontPreviewSettings };
    }

    setFontPreviewSettings(partialSettings = {}) {
        this.ensureFontPreviewSettingsIntegrity();
        this.fontPreviewSettings = {
            ...this.fontPreviewSettings,
            ...partialSettings
        };
        this.ensureFontPreviewSettingsIntegrity();
    }

    resetFontPreviewSettings(options = {}) {
        const defaults = this.getDefaultFontPreviewSettings();
        const { text = true, size = true } = options;
        const nextSettings = { ...this.getFontPreviewSettings() };
        if (text) {
            nextSettings.sampleText = defaults.sampleText;
        }
        if (size) {
            nextSettings.fontSize = defaults.fontSize;
        }
        this.fontPreviewSettings = nextSettings;
        this.ensureFontPreviewSettingsIntegrity();
    }

    deleteCustomFont(fontValue) {
        const fontIndex = this.customFonts.findIndex(font => font.name === fontValue);
        if (fontIndex < 0) return false;

        const [removedFont] = this.customFonts.splice(fontIndex, 1);
        if (!this.saveCustomFonts()) {
            this.customFonts.splice(fontIndex, 0, removedFont);
            return false;
        }

        this.ensureFontPreferencesIntegrity();
        this.fontPreferences.order = this.fontPreferences.order.filter(value => value !== fontValue);
        delete this.fontPreferences.visibility[fontValue];
        delete this.fontPreferences.aliases[fontValue];
        this.saveFontPreferences();

        if (this.globalFont === fontValue) {
            this.globalFont = 'system';
            safeLocalStorageSetItem('globalFont', this.globalFont);
            this.applyGlobalFont();
        }

        this.populateGlobalFontSelect();
        return true;
    }

    resetFontManagementToDefaults() {
        const previousCustomFonts = this.customFonts;
        this.customFonts = [];
        if (!this.saveCustomFonts()) {
            this.customFonts = previousCustomFonts;
            return false;
        }
        this.fontPreferences = { order: [], visibility: {}, aliases: {} };
        this.ensureFontPreferencesIntegrity();
        this.resetFontPreviewSettings({ text: true, size: true });
        this.globalFont = 'system';
        safeLocalStorageSetItem('globalFont', this.globalFont);
        this.applyGlobalFont();
        this.populateGlobalFontSelect();
        return true;
    }

    getModalSizePreference(modalKey) {
        if (!modalKey || !this.modalSizePreferences || typeof this.modalSizePreferences !== 'object') {
            return null;
        }
        const size = this.modalSizePreferences[modalKey];
        if (!size || typeof size !== 'object') {
            return null;
        }
        const width = parseFloat(size.width);
        const height = parseFloat(size.height);
        if (!Number.isFinite(width) || !Number.isFinite(height)) {
            return null;
        }
        return { width, height };
    }

    setModalSizePreference(modalKey, size) {
        if (!modalKey || !size) return;
        const width = Math.round(parseFloat(size.width));
        const height = Math.round(parseFloat(size.height));
        if (!Number.isFinite(width) || !Number.isFinite(height)) return;
        this.modalSizePreferences[modalKey] = { width, height };
        this.saveModalSizePreferences();
    }

    getModalCenterPreference(modalKey) {
        if (!modalKey || !this.modalCenterPreferences || typeof this.modalCenterPreferences !== 'object') {
            return false;
        }
        return this.modalCenterPreferences[modalKey] === true;
    }

    setModalCenterPreference(modalKey, keepCentered) {
        if (!modalKey) return;
        if (keepCentered) {
            this.modalCenterPreferences[modalKey] = true;
        } else {
            delete this.modalCenterPreferences[modalKey];
        }
        this.saveModalCenterPreferences();
    }

    resetModalSizePreference(modalKey) {
        if (!modalKey || !this.modalSizePreferences?.[modalKey]) return;
        delete this.modalSizePreferences[modalKey];
        this.saveModalSizePreferences();
    }

    resetModalCenterPreference(modalKey) {
        if (!modalKey || !this.modalCenterPreferences?.[modalKey]) return;
        delete this.modalCenterPreferences[modalKey];
        this.saveModalCenterPreferences();
    }
    
    loadPatternPreferences() {
        const defaults = {
            'blank': true,
            'dots': true,
            'grid': true,
            'tianzige': true,
            'english-lines': true,
            'music-staff': true,
            'coordinate': true,
            'polar': true,
            'image': true
        };
        const saved = safeLocalStorageGetItem('patternPreferences');
        if (saved) {
            try {
                return { ...defaults, ...JSON.parse(saved) };
            } catch (error) {
                console.warn('Failed to parse patternPreferences, using defaults:', error);
            }
        }
        // Default: all patterns enabled
        return defaults;
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
        safeLocalStorageSetItem('patternPreferences', JSON.stringify(prefs));
    }
    
    switchTab(tabName) {
        const nextTab = document.querySelector(`.settings-tab-icon[data-tab="${tabName}"]`);
        const nextPanel = document.getElementById(`${tabName}-settings`);
        if (!nextTab || !nextPanel) {
            console.warn(`Settings tab is unavailable: ${tabName}`);
            return false;
        }

        document.querySelectorAll('.settings-tab-icon').forEach(tab => {
            tab.classList.remove('active');
        });
        
        document.querySelectorAll('.settings-tab-content').forEach(content => {
            content.classList.remove('active');
        });
        nextTab.classList.add('active');
        nextPanel.classList.add('active');
        return true;
    }
    
    updateToolbarSize() {
        const toolbar = document.getElementById('toolbar');
        if (!toolbar) {
            safeLocalStorageSetItem('toolbarSize', this.toolbarSize);
            return;
        }
        const buttons = toolbar.querySelectorAll('.tool-btn');
        const TOUCH_SMALL_SCREEN_THRESHOLD = 900;
        const PORTRAIT_TOUCH_MAX_BUTTON_SIZE = 46;
        const LANDSCAPE_TOUCH_MAX_BUTTON_SIZE = 52;
        const TOUCH_TOOLBAR_SAFE_MARGIN = 12;
        const NARROW_VIEWPORT_THRESHOLD = 900;
        
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
        
        const hasTouchPoints = typeof navigator !== 'undefined' && Number(navigator.maxTouchPoints) > 0;
        const isTouchDevice = typeof window.matchMedia === 'function'
            ? window.matchMedia('(pointer: coarse)').matches
            : hasTouchPoints;
        const shortestSide = Math.min(window.innerWidth, window.innerHeight);
        const isNarrowViewport = window.innerWidth <= NARROW_VIEWPORT_THRESHOLD;
        const touchMaxButtonSize = shortestSide <= TOUCH_SMALL_SCREEN_THRESHOLD
            ? (window.innerHeight > window.innerWidth ? PORTRAIT_TOUCH_MAX_BUTTON_SIZE : LANDSCAPE_TOUCH_MAX_BUTTON_SIZE)
            : this.toolbarSize;
        const viewportMaxButtonSize = window.innerHeight > window.innerWidth
            ? PORTRAIT_TOUCH_MAX_BUTTON_SIZE
            : LANDSCAPE_TOUCH_MAX_BUTTON_SIZE;
        const buttonSize = isTouchDevice
            ? Math.min(this.toolbarSize, touchMaxButtonSize)
            : (isNarrowViewport ? Math.min(this.toolbarSize, viewportMaxButtonSize) : this.toolbarSize);
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
        if (isTouchDevice || isNarrowViewport) {
            toolbar.style.maxWidth = `calc(100vw - ${TOUCH_TOOLBAR_SAFE_MARGIN}px)`;
            toolbar.style.overflowX = isVertical ? 'hidden' : 'auto';
            toolbar.style.overflowY = isVertical ? 'auto' : 'hidden';
        } else {
            toolbar.style.maxWidth = '';
            toolbar.style.overflowX = '';
            toolbar.style.overflowY = '';
        }
        
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
        
        safeLocalStorageSetItem('toolbarSize', this.toolbarSize);
        
        // Apply responsive text visibility after size update
        this.updateToolbarTextVisibility();
    }
    
    updateToolbarTextVisibility() {
        const toolbar = document.getElementById('toolbar');
        if (!toolbar) {
            return;
        }
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
        safeLocalStorageSetItem('showToolbarText', show);
        this.updateToolbarTextVisibility();
    }
    
    updateConfigScale() {
        const configArea = document.getElementById('config-area');
        if (!configArea) {
            safeLocalStorageSetItem('configScale', this.configScale);
            return;
        }
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
        safeLocalStorageSetItem('configScale', this.configScale);
    }
    
    setControlPosition(position, timeDisplayManager = null) {
        this.controlPosition = position;
        safeLocalStorageSetItem('controlPosition', position);
        
        const historyControls = document.getElementById('history-controls');
        const paginationControls = document.getElementById('pagination-controls');
        
        if (historyControls) {
            historyControls.className = '';
            historyControls.classList.add(position);
        }
        
        if (paginationControls) {
            paginationControls.className = '';
            if (!this.infiniteCanvas) {
                paginationControls.classList.add('show');
            }
            paginationControls.classList.add(position);
        }
        
        const positionButtons = typeof document.querySelectorAll === 'function'
            ? document.querySelectorAll('.position-option-btn')
            : [];
        positionButtons.forEach(btn => {
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

    normalizeUpdatePreference(value) {
        return value === 'auto' ? 'auto' : 'prompt';
    }

    syncUpdatePreferenceButtons() {
        document.querySelectorAll('.update-preference-option-btn').forEach(btn => {
            const isActive = btn.dataset.updatePreference === this.updatePreference;
            btn.classList.toggle('active', isActive);
            btn.setAttribute('aria-pressed', isActive ? 'true' : 'false');
        });
    }

    setUpdatePreference(value) {
        this.updatePreference = this.normalizeUpdatePreference(value);
        safeLocalStorageSetItem('updatePreference', this.updatePreference);
        this.syncUpdatePreferenceButtons();
        window.pwaManager?.setUpdatePreference?.(this.updatePreference);
        return this.updatePreference;
    }

    setLegacyProjectImportEnabled(enabled) {
        this.legacyProjectImportEnabled = enabled === true;
        safeLocalStorageSetItem('legacyProjectImportEnabled', this.legacyProjectImportEnabled ? 'true' : 'false');
        return this.legacyProjectImportEnabled;
    }

    setEdgeSnapEnabled(enabled) {
        this.edgeSnapEnabled = enabled === true;
        safeLocalStorageSetItem('edgeSnapEnabled', this.edgeSnapEnabled ? 'true' : 'false');
        return this.edgeSnapEnabled;
    }

    setTouchZoomEnabled(enabled) {
        this.touchZoomEnabled = enabled === true;
        safeLocalStorageSetItem('touchZoomEnabled', this.touchZoomEnabled ? 'true' : 'false');
        return this.touchZoomEnabled;
    }

    setUnlimitedZoom(enabled) {
        this.unlimitedZoom = enabled === true;
        safeLocalStorageSetItem('unlimitedZoom', this.unlimitedZoom ? 'true' : 'false');
        return this.unlimitedZoom;
    }

    setShowZoomControls(enabled) {
        this.showZoomControls = enabled === true;
        safeLocalStorageSetItem('showZoomControls', this.showZoomControls ? 'true' : 'false');
        return this.showZoomControls;
    }

    setShowImportExportBtn(enabled) {
        this.showImportExportBtn = enabled === true;
        safeLocalStorageSetItem('showImportExportBtn', this.showImportExportBtn ? 'true' : 'false');
        return this.showImportExportBtn;
    }

    setShowFullscreenBtn(enabled) {
        this.showFullscreenBtn = enabled === true;
        safeLocalStorageSetItem('showFullscreenBtn', this.showFullscreenBtn ? 'true' : 'false');
        return this.showFullscreenBtn;
    }

    setKeepMorePanelOpen(enabled) {
        this.keepMorePanelOpen = enabled === true;
        safeLocalStorageSetItem('keepMorePanelOpen', this.keepMorePanelOpen ? 'true' : 'false');
        return this.keepMorePanelOpen;
    }
    
    loadSettings() {
        updateElementById('toolbar-size-slider', element => {
            element.value = this.toolbarSize;
        });
        updateElementById('toolbar-size-value', element => {
            element.textContent = this.toolbarSize;
        });
        updateElementById('toolbar-size-input', element => {
            element.value = this.toolbarSize;
        });
        this.updateToolbarSize();
        
        updateElementById('config-scale-slider', element => {
            element.value = Math.round(this.configScale * 100);
        });
        updateElementById('config-scale-value', element => {
            element.textContent = Math.round(this.configScale * 100);
        });
        updateElementById('config-scale-input', element => {
            element.value = Math.round(this.configScale * 100);
        });
        this.updateConfigScale();
        
        this.setControlPosition(this.controlPosition);
        
        updateElementById('edge-snap-checkbox', element => {
            element.checked = this.edgeSnapEnabled;
        });
        updateElementById('touch-zoom-checkbox', element => {
            element.checked = this.touchZoomEnabled;
        });
        this.setUpdatePreference(this.updatePreference);
        updateElementById('legacy-project-import-checkbox', element => {
            element.checked = this.legacyProjectImportEnabled;
        });
        updateElementById('unlimited-zoom-checkbox', element => {
            element.checked = this.unlimitedZoom;
        });
        updateElementById('show-zoom-controls-checkbox', element => {
            element.checked = this.showZoomControls;
        });
        updateElementById('show-import-export-btn-checkbox', element => {
            element.checked = this.showImportExportBtn;
        });
        updateElementById('show-fullscreen-btn-checkbox', element => {
            element.checked = this.showFullscreenBtn;
        });
        
        // Load toolbar text visibility setting
        updateElementById('show-toolbar-text-checkbox', element => {
            element.checked = this.showToolbarText;
        });
        updateElementById('keep-more-panel-open-checkbox', element => {
            element.checked = this.keepMorePanelOpen;
        });
        this.updateToolbarTextVisibility();
        
        // Canvas is always in pagination mode now
        
        // Load canvas size settings
        updateElementById('canvas-width-input', element => {
            element.value = this.canvasWidth;
        });
        updateElementById('canvas-height-input', element => {
            element.value = this.canvasHeight;
        });
        document.querySelectorAll('.canvas-preset-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.preset === this.canvasPreset);
        });
        
        // Load pattern preferences
        document.querySelectorAll('.pattern-pref-checkbox').forEach(checkbox => {
            checkbox.checked = this.patternPreferences[checkbox.dataset.pattern] !== false;
        });
        
        // Load theme color
        this.applyThemeColor();
        updateElementById('custom-theme-color-picker', element => {
            element.value = this.themeColor;
        });
        document.querySelectorAll('.color-btn[data-theme-color]').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.themeColor === this.themeColor);
        });
        window.i18n?.syncGenericColorControls?.();
        
        // Load global font
        this.applyGlobalFont();
        this.populateGlobalFontSelect();
        const globalFontSelect = document.getElementById('global-font-select');
        if (globalFontSelect && [...globalFontSelect.options].some(option => option.value === this.globalFont)) {
            globalFontSelect.value = this.globalFont;
        }
        
        // Initialize language selector
        this.initLanguageSelector();
    }
    
    // Canvas mode is removed - always use pagination
    
    setCanvasPreset(preset) {
        this.canvasPreset = preset;
        safeLocalStorageSetItem('canvasPreset', preset);
        
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
            updateElementById('canvas-width-input', element => {
                element.value = this.canvasWidth;
            });
            updateElementById('canvas-height-input', element => {
                element.value = this.canvasHeight;
            });
            safeLocalStorageSetItem('canvasWidth', this.canvasWidth);
            safeLocalStorageSetItem('canvasHeight', this.canvasHeight);
        }
    }
    
    setCanvasSize(width, height) {
        const currentWidth = normalizeCanvasDimension(this.canvasWidth, defaultCanvasWidth);
        const currentHeight = normalizeCanvasDimension(this.canvasHeight, defaultCanvasHeight);
        const normalizedWidth = normalizeCanvasDimension(width, currentWidth);
        const normalizedHeight = normalizeCanvasDimension(height, currentHeight);
        this.canvasWidth = normalizedWidth;
        this.canvasHeight = normalizedHeight;
        safeLocalStorageSetItem('canvasWidth', normalizedWidth);
        safeLocalStorageSetItem('canvasHeight', normalizedHeight);
    }
    
    setThemeColor(color) {
        this.themeColor = normalizeThemeColorInput(color);
        safeLocalStorageSetItem('themeColor', this.themeColor);
        document.documentElement.style.setProperty('--theme-color', getAccessibleThemeColor(this.themeColor));
        window.i18n?.syncGenericColorControls?.();
    }
    
    applyThemeColor() {
        const normalizedThemeColor = normalizeThemeColorInput(this.themeColor);
        if (normalizedThemeColor !== this.themeColor) {
            this.themeColor = normalizedThemeColor;
            safeLocalStorageSetItem('themeColor', this.themeColor);
        }
        document.documentElement.style.setProperty('--theme-color', getAccessibleThemeColor(this.themeColor));
    }
    
    setGlobalFont(font) {
        this.globalFont = font;
        safeLocalStorageSetItem('globalFont', font);
        this.applyGlobalFont();
    }
    
    getFontFamilyStack(fontValue = this.globalFont) {
        let fontFamily;
        switch(fontValue) {
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
                fontFamily = '"KaiTi", "STKaiti", "DFKai-SB", cursive';
                break;
            case 'Noto Sans SC':
            case 'Microsoft YaHei':
            case 'SimHei':
                fontFamily = '"Noto Sans SC", "Microsoft YaHei", "PingFang SC", "Hiragino Sans GB", sans-serif';
                break;
            case 'Noto Serif SC':
            case 'SimSun':
            case 'FangSong':
                fontFamily = '"Noto Serif SC", "Songti SC", "STSong", "SimSun", serif';
                break;
            case 'LXGW WenKai':
                fontFamily = '"LXGW WenKai", "Kaiti SC", "KaiTi", "STKaiti", cursive';
                break;
            case 'KaiTi':
                fontFamily = '"KaiTi", "Kaiti SC", "STKaiti", "DFKai-SB", cursive';
                break;
            case 'STXingkai':
            case 'Ma Shan Zheng':
            case 'Zhi Mang Xing':
                fontFamily = '"STXingkai", "KaiTi", "STKaiti", "DFKai-SB", cursive';
                break;
            case 'Inter':
                fontFamily = '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';
                break;
            case 'Roboto':
                fontFamily = '"Roboto", "Helvetica Neue", Arial, sans-serif';
                break;
            case 'Open Sans':
                fontFamily = '"Open Sans", "Segoe UI", "Helvetica Neue", Arial, sans-serif';
                break;
            case 'Lora':
                fontFamily = '"Lora", "Noto Serif SC", "Songti SC", serif';
                break;
            case 'JetBrains Mono':
                fontFamily = '"JetBrains Mono", "Consolas", "Courier New", monospace';
                break;
            case 'Source Han Sans SC':
                fontFamily = '"Source Han Sans SC", "Noto Sans SC", "Microsoft YaHei", sans-serif';
                break;
            case 'Source Han Serif SC':
                fontFamily = '"Source Han Serif SC", "Noto Serif SC", "Songti SC", serif';
                break;
            default:
                // Check if it's a custom font
                const customFont = this.customFonts.find(f => f.name === fontValue);
                if (customFont) {
                    const safeFontName = String(fontValue).replace(/\\/g, '\\\\').replace(/"/g, '\\"');
                    fontFamily = `"${safeFontName}", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;
                } else {
                    fontFamily = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';
                }
        }
        return fontFamily;
    }

    applyGlobalFont() {
        const fontFamily = this.getFontFamilyStack(this.globalFont);
        document.body.style.fontFamily = fontFamily;
    }
    
    initLanguageSelector() {
        const languageSelect = document.getElementById('language-select');
        if (languageSelect && window.i18n) {
            // Set current language
            languageSelect.value = window.i18n.getCurrentLocale();

            if (languageSelect.dataset.languageBound !== 'true') {
                // Handle language change without page reload
                languageSelect.addEventListener('change', async (e) => {
                    const newLocale = e.target.value;
                    const didChangeLocale = await window.i18n.changeLocale(newLocale);
                    if (didChangeLocale === false) {
                        e.target.value = window.i18n.getCurrentLocale();
                    }
                    // No reload - translations are applied dynamically
                });
                languageSelect.dataset.languageBound = 'true';
            }

            if (languageSelect.dataset.languageSyncBound !== 'true') {
                window.addEventListener('localeChanged', () => {
                    languageSelect.value = window.i18n?.getCurrentLocale?.() || languageSelect.value;
                });
                languageSelect.dataset.languageSyncBound = 'true';
            }
        }
    }

    normalizeLocaleStateValue(locale) {
        if (typeof window.i18n?.normalizeSupportedLocale === 'function') {
            return window.i18n.normalizeSupportedLocale(locale);
        }

        if (locale == null) {
            return null;
        }

        const trimmedLocale = String(locale).trim();
        return trimmedLocale || null;
    }

    getLocaleSettingsState() {
        const downloadedLocalesRaw = safeLocalStorageGetItem('aboardDownloadedLocales');
        let downloadedLocales = [];
        if (window.i18n?.getDownloadedLocales) {
            downloadedLocales = window.i18n.getDownloadedLocales();
        } else if (downloadedLocalesRaw) {
            try {
                const parsed = JSON.parse(downloadedLocalesRaw);
                downloadedLocales = Array.isArray(parsed)
                    ? parsed
                        .map(locale => this.normalizeLocaleStateValue(locale))
                        .filter(Boolean)
                    : [];
            } catch (error) {
                console.warn('Failed to parse exported downloaded locales:', error);
            }
        }

        return {
            locale: window.i18n?.getCurrentLocale?.()
                || this.normalizeLocaleStateValue(safeLocalStorageGetItem('locale'))
                || 'zh-CN',
            preferenceMode: window.i18n?.getLocalePreferenceMode?.() || safeLocalStorageGetItem('aboardLocalePreferenceMode') || 'auto',
            downloadedLocales,
            dismissedPreferredLocaleSuggestion: window.i18n?.getDismissedPreferredLocaleSuggestion?.()
                || this.normalizeLocaleStateValue(safeLocalStorageGetItem('aboardDeferredLocaleSuggestionDismissed'))
        };
    }

    async applyLocaleSettings(localeSettings) {
        if (!localeSettings || typeof localeSettings !== 'object') {
            return;
        }

        if (Array.isArray(localeSettings.downloadedLocales)) {
            const normalizedDownloadedLocales = localeSettings.downloadedLocales
                .map(locale => this.normalizeLocaleStateValue(locale))
                .filter(Boolean);
            safeLocalStorageSetItem('aboardDownloadedLocales', JSON.stringify(normalizedDownloadedLocales));
        }

        const normalizedDismissedLocale = this.normalizeLocaleStateValue(localeSettings.dismissedPreferredLocaleSuggestion);
        if (normalizedDismissedLocale) {
            safeLocalStorageSetItem('aboardDeferredLocaleSuggestionDismissed', normalizedDismissedLocale);
        } else if (localeSettings.dismissedPreferredLocaleSuggestion === null) {
            safeLocalStorageRemoveItem('aboardDeferredLocaleSuggestionDismissed');
        }

        const localePreferenceMode = localeSettings.preferenceMode === 'manual' ? 'manual' : 'auto';
        safeLocalStorageSetItem('aboardLocalePreferenceMode', localePreferenceMode);

        if (typeof localeSettings.locale === 'string' && localeSettings.locale) {
            const normalizedLocale = this.normalizeLocaleStateValue(localeSettings.locale);
            if (window.i18n?.changeLocale) {
                await window.i18n.changeLocale(normalizedLocale || localeSettings.locale, {
                    skipDownloadPrompt: true,
                    preferenceMode: localePreferenceMode
                });
            } else {
                if (normalizedLocale) {
                    safeLocalStorageSetItem('locale', normalizedLocale);
                } else {
                    safeLocalStorageRemoveItem('locale');
                }
            }
        }
    }

    getCurrentSettingsState() {
        return {
            toolbarSize: this.toolbarSize,
            configScale: this.configScale,
            controlPosition: this.controlPosition,
            edgeSnapEnabled: this.edgeSnapEnabled,
            touchZoomEnabled: this.touchZoomEnabled,
            updatePreference: this.updatePreference,
            legacyProjectImportEnabled: this.legacyProjectImportEnabled,
            unlimitedZoom: this.unlimitedZoom,
            showZoomControls: this.showZoomControls,
            showImportExportBtn: this.showImportExportBtn,
            showFullscreenBtn: this.showFullscreenBtn,
            showToolbarText: this.showToolbarText,
            keepMorePanelOpen: this.keepMorePanelOpen,
            patternPreferences: this.patternPreferences,
            canvasWidth: this.canvasWidth,
            canvasHeight: this.canvasHeight,
            canvasPreset: this.canvasPreset,
            themeColor: this.themeColor,
            globalFont: this.globalFont,
            customFonts: (window.safeDeepClone || ((v) => JSON.parse(JSON.stringify(v))))(this.customFonts || []),
            fontPreferences: (window.safeDeepClone || ((v) => JSON.parse(JSON.stringify(v))))(this.fontPreferences || {}),
            fontPreviewSettings: (window.safeDeepClone || ((v) => JSON.parse(JSON.stringify(v))))(this.fontPreviewSettings || {}),
            modalSizePreferences: (window.safeDeepClone || ((v) => JSON.parse(JSON.stringify(v))))(this.modalSizePreferences || {}),
            modalCenterPreferences: (window.safeDeepClone || ((v) => JSON.parse(JSON.stringify(v))))(this.modalCenterPreferences || {}),
            localeSettings: this.getLocaleSettingsState(),
            // Also include toolbar customization
            toolbarOrder: safeLocalStorageGetItem('toolbarOrder'),
            toolbarVisibility: safeLocalStorageGetItem('toolbarVisibility'),
            controlButtonOrder: safeLocalStorageGetItem('controlButtonOrder'),
            // Control button visibility
            controlSettings: {
                zoom: safeLocalStorageGetItem('controlShowZoom') !== 'false',
                pagination: safeLocalStorageGetItem('controlShowPagination') !== 'false',
                time: safeLocalStorageGetItem('controlShowTime') !== 'false',
                fullscreen: safeLocalStorageGetItem('controlShowFullscreen') !== 'false',
                import: safeLocalStorageGetItem('controlShowImport') !== 'false',
                export: safeLocalStorageGetItem('controlShowExport') !== 'false'
            }
        };
    }

    validateImportedSettings(settings) {
        const invalid = (key) => {
            throw new TypeError(key
                ? `Invalid configuration field: ${key}`
                : 'Invalid configuration: expected a non-empty object');
        };

        if (!isPlainObject(settings) || Object.keys(settings).length === 0) {
            invalid();
        }

        const pendingValues = [{ value: settings, depth: 0 }];
        const seenValues = new Set();
        let totalEntries = 0;
        while (pendingValues.length > 0) {
            const { value, depth } = pendingValues.pop();
            if (!value || typeof value !== 'object') continue;
            if (seenValues.has(value)
                || depth > importedConfigMaxDepth
                || (Array.isArray(value) && value.length > importedConfigMaxCollectionEntries)) {
                invalid('complexity');
            }
            seenValues.add(value);

            const keys = Object.keys(value);
            totalEntries += keys.length;
            if (totalEntries > importedConfigMaxTotalEntries
                || keys.some((key) => importedConfigUnsafeKeys.has(key))) {
                invalid('complexity');
            }
            keys.forEach((key) => {
                const child = value[key];
                if (child && typeof child === 'object') {
                    pendingValues.push({ value: child, depth: depth + 1 });
                }
            });
        }

        const numberRanges = {
            toolbarSize: [30, 100],
            configScale: [0.5, 1.5],
            canvasWidth: [minCanvasDimension, maxCanvasDimension],
            canvasHeight: [minCanvasDimension, maxCanvasDimension]
        };
        Object.entries(numberRanges).forEach(([key, [minimum, maximum]]) => {
            if (settings[key] !== undefined && (
                typeof settings[key] !== 'number' ||
                !Number.isFinite(settings[key]) ||
                settings[key] < minimum ||
                settings[key] > maximum
            )) {
                invalid(key);
            }
        });

        [
            'edgeSnapEnabled', 'touchZoomEnabled', 'legacyProjectImportEnabled',
            'unlimitedZoom', 'showZoomControls', 'showImportExportBtn',
            'showFullscreenBtn', 'showToolbarText', 'keepMorePanelOpen'
        ].forEach((key) => {
            if (settings[key] !== undefined && typeof settings[key] !== 'boolean') {
                invalid(key);
            }
        });

        if (settings.controlPosition !== undefined && !validControlPositions.has(settings.controlPosition)) {
            invalid('controlPosition');
        }
        if (settings.updatePreference !== undefined && !['prompt', 'auto'].includes(settings.updatePreference)) {
            invalid('updatePreference');
        }
        if (settings.themeColor !== undefined && !parseThemeHexColor(settings.themeColor)) {
            invalid('themeColor');
        }
        ['canvasPreset', 'globalFont'].forEach((key) => {
            if (settings[key] !== undefined && typeof settings[key] !== 'string') {
                invalid(key);
            }
        });

        if (settings.patternPreferences !== undefined && (
            !isPlainObject(settings.patternPreferences) ||
            Object.values(settings.patternPreferences).some((value) => typeof value !== 'boolean')
        )) {
            invalid('patternPreferences');
        }

        if (settings.customFonts !== undefined && (
            !Array.isArray(settings.customFonts) ||
            settings.customFonts.length > importedConfigMaxCustomFonts ||
            settings.customFonts.some((font) => !isValidCustomFont(font))
        )) {
            invalid('customFonts');
        }

        [
            'fontPreferences', 'fontPreviewSettings', 'modalSizePreferences',
            'modalCenterPreferences', 'controlSettings', 'localeSettings'
        ].forEach((key) => {
            if (settings[key] !== undefined && !isPlainObject(settings[key])) {
                invalid(key);
            }
        });

        if (settings.controlSettings) {
            ['zoom', 'pagination', 'time', 'fullscreen', 'import', 'export'].forEach((key) => {
                if (settings.controlSettings[key] !== undefined && typeof settings.controlSettings[key] !== 'boolean') {
                    invalid(`controlSettings.${key}`);
                }
            });
        }

        const validateJsonSetting = (key, expectedType) => {
            if (settings[key] === undefined || settings[key] === null) {
                return;
            }
            if (typeof settings[key] !== 'string') {
                invalid(key);
            }
            try {
                const parsed = JSON.parse(settings[key]);
                const valid = expectedType === 'array'
                    ? Array.isArray(parsed)
                        && parsed.length <= importedConfigMaxCollectionEntries
                        && parsed.every((value) => typeof value === 'string')
                    : isPlainObject(parsed) && Object.values(parsed).every((value) => typeof value === 'boolean');
                if (!valid) invalid(key);
            } catch (error) {
                invalid(key);
            }
        };
        validateJsonSetting('toolbarOrder', 'array');
        validateJsonSetting('toolbarVisibility', 'object');
        validateJsonSetting('controlButtonOrder', 'array');

        return settings;
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
        const successMsg = window.i18n ? window.i18n.t('settings.exportSuccess') : 'Configuration exported successfully';
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
            } catch (e) {
                // Not valid JSON, fall through to primitive comparison
            }
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

        if (key.startsWith('localeSettings.locale')) {
            return i18n.t('settings.general.language');
        }

        if (key.startsWith('localeSettings.preferenceMode')) {
            return i18n.t('settings.general.language');
        }

        if (key.startsWith('localeSettings.downloadedLocales')) {
            return i18n.t('settings.general.downloadedLanguagePacks');
        }

        if (key.startsWith('localeSettings.dismissedPreferredLocaleSuggestion')) {
            return i18n.t('settings.general.dismissedLanguageSuggestion');
        }

        if (key.startsWith('toolbarVisibility.')) {
            const parts = key.split('.');
            const tool = parts.length > 1 ? parts[1] : '';
            // tool might be 'pen', 'eraser' etc.
            // mapping: settings.general.toolbarTools.pen
            return `${i18n.t('settings.general.toolbarCustomization')} - ${i18n.t(`settings.general.toolbarTools.${tool}`) || tool}`;
        }

        if (key.startsWith('toolbarOrder')) {
            return i18n.t('settings.general.toolbarCustomization');
        }

        if (key.startsWith('controlButtonOrder')) {
            return i18n.t('settings.general.controlButtonSettings');
        }

        if (key.startsWith('modalSizePreferences.')) {
            const parts = key.split('.');
            const modalKey = parts.length > 1 ? parts[1] : '';
            const sizeLabelKey = 'settings.display.windowScale';
            const translatedSizeLabel = i18n.t(sizeLabelKey);
            const modalNames = {
                settingsModal: i18n.t('settings.title'),
                timerSettingsModal: i18n.t('timer.settingsTitle'),
                timeDisplaySettingsModal: i18n.t('timeDisplay.settingsTitle'),
                randomPickerSettingsModal: i18n.t('randomPicker.settingsTitle')
            };
            const sizeLabel = translatedSizeLabel && translatedSizeLabel !== sizeLabelKey
                ? translatedSizeLabel
                : '窗口尺寸';
            return `${sizeLabel} - ${modalNames[modalKey] || modalKey}`;
        }

        if (key.startsWith('modalCenterPreferences.')) {
            const parts = key.split('.');
            const modalKey = parts.length > 1 ? parts[1] : '';
            const modalNames = {
                settingsModal: i18n.t('settings.title'),
                timerSettingsModal: i18n.t('timer.settingsTitle'),
                timeDisplaySettingsModal: i18n.t('timeDisplay.settingsTitle'),
                randomPickerSettingsModal: i18n.t('randomPicker.settingsTitle')
            };
            const centeredKey = 'common.keepCentered';
            const centeredLabel = i18n.t(centeredKey);
            return `${centeredLabel !== centeredKey ? centeredLabel : 'Keep Centered'} - ${modalNames[modalKey] || modalKey}`;
        }

        // Map internal keys to translation keys
        const map = {
            'toolbarSize': 'settings.display.toolbarSize',
            'configScale': 'settings.display.configScale',
            'controlPosition': 'settings.general.controlPosition',
            'edgeSnapEnabled': 'settings.general.edgeSnap',
            'touchZoomEnabled': 'settings.general.touchZoom',
            'updatePreference': 'settings.general.updatePreference',
            'legacyProjectImportEnabled': 'settings.more.legacyProjectImportEnabled',
            'unlimitedZoom': 'settings.canvas.unlimitedZoom',
            'showZoomControls': 'settings.display.showZoomControls',
            'showImportExportBtn': 'settings.display.showImportExportBtn',
            'showFullscreenBtn': 'settings.display.showFullscreenBtn',
            'showToolbarText': 'settings.display.showToolbarText',
            'keepMorePanelOpen': 'settings.general.morePanelBehaviorLabel',
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
        this.validateImportedSettings(newSettings);
        const keys = [
            'toolbarSize', 'configScale', 'controlPosition', 'edgeSnapEnabled',
            'touchZoomEnabled', 'updatePreference', 'legacyProjectImportEnabled', 'unlimitedZoom', 'showZoomControls', 'showImportExportBtn', 'showFullscreenBtn', 'keepMorePanelOpen',
            'showToolbarText', 'canvasWidth', 'canvasHeight', 'canvasPreset', 'themeColor', 'globalFont',
            'patternPreferences'
        ];

        keys.forEach(key => {
            if (newSettings[key] !== undefined) {
                this[key] = newSettings[key];

                // Update localStorage
                if (key === 'patternPreferences') {
                    safeLocalStorageSetItem('patternPreferences', JSON.stringify(this[key]));
                } else {
                    safeLocalStorageSetItem(key, this[key]);
                }
            }
        });

        // Handle special storage items
        if (newSettings.toolbarOrder) safeLocalStorageSetItem('toolbarOrder', newSettings.toolbarOrder);
        if (newSettings.toolbarVisibility) safeLocalStorageSetItem('toolbarVisibility', newSettings.toolbarVisibility);
        if (newSettings.controlButtonOrder) safeLocalStorageSetItem('controlButtonOrder', newSettings.controlButtonOrder);
        if (Array.isArray(newSettings.customFonts)) {
            const previousCustomFonts = this.customFonts;
            this.customFonts = (window.safeDeepClone || ((value) => JSON.parse(JSON.stringify(value))))(newSettings.customFonts);
            if (this.saveCustomFonts()) {
                this.loadCustomFontsToDocument();
            } else {
                this.customFonts = previousCustomFonts;
            }
        }
        if (newSettings.fontPreferences && typeof newSettings.fontPreferences === 'object') {
            this.fontPreferences = newSettings.fontPreferences;
            this.ensureFontPreferencesIntegrity();
        }
        if (newSettings.fontPreviewSettings && typeof newSettings.fontPreviewSettings === 'object') {
            this.fontPreviewSettings = newSettings.fontPreviewSettings;
            this.ensureFontPreviewSettingsIntegrity();
        }
        if (newSettings.modalSizePreferences && typeof newSettings.modalSizePreferences === 'object') {
            this.modalSizePreferences = newSettings.modalSizePreferences;
            this.saveModalSizePreferences();
        }
        if (newSettings.modalCenterPreferences && typeof newSettings.modalCenterPreferences === 'object') {
            this.modalCenterPreferences = newSettings.modalCenterPreferences;
            this.saveModalCenterPreferences();
        }

        if (newSettings.controlSettings) {
            safeLocalStorageSetItem('controlShowZoom', newSettings.controlSettings.zoom);
            safeLocalStorageSetItem('controlShowPagination', newSettings.controlSettings.pagination);
            safeLocalStorageSetItem('controlShowTime', newSettings.controlSettings.time);
            safeLocalStorageSetItem('controlShowFullscreen', newSettings.controlSettings.fullscreen);
            safeLocalStorageSetItem('controlShowImport', newSettings.controlSettings.import);
            safeLocalStorageSetItem('controlShowExport', newSettings.controlSettings.export);
        }

        if (newSettings.localeSettings) {
            return this.applyLocaleSettings(newSettings.localeSettings).then((result) => {
                this.loadSettings();
                return result;
            }, (error) => {
                this.loadSettings();
                throw error;
            });
        }

        // Apply changes visually
        this.loadSettings();
    }
}

window.SettingsManager = SettingsManager;
window.AboardSettingsManager = SettingsManager;
