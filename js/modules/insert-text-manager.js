// Insert Text Module
// Handles inserting text onto the canvas as stamped pixels

function safeInsertTextStorageGetItem(key) {
    try {
        return localStorage.getItem(key);
    } catch (error) {
        console.warn(`Failed to read custom fonts localStorage key "${key}":`, error);
        return null;
    }
}

function safeInsertTextStorageSetItem(key, value) {
    try {
        localStorage.setItem(key, value);
        return true;
    } catch (error) {
        console.warn(`Failed to write custom fonts localStorage key "${key}":`, error);
        return false;
    }
}

class InsertTextManager {
    constructor(canvas, ctx, historyManager, drawingEngine) {
        this.canvas = canvas;
        this.ctx = ctx;
        this.historyManager = historyManager;
        this.drawingEngine = drawingEngine;

        // State
        this.isActive = false;
        this.textConfig = {
            text: '',
            fontSize: 48,
            color: '#000000',
            fontFamily: 'sans-serif',
            bold: false,
            italic: false,
            underline: false,
            strikethrough: false,
            decorationStyle: 'solid',
            decorationColor: '#000000',
            decorationWidth: 2
        };

        // Custom fonts storage
        this.customFonts = this.loadCustomFonts();

        this.textPosition = { x: 0, y: 0 };
        this.textRotation = 0;
        this.textScale = 1.0; // We use scale to adjust font size visually during manipulation

        // Interaction State
        this.isDragging = false;
        this.isResizing = false;
        this.isRotating = false;

        this.dragStartPos = { x: 0, y: 0 };
        this.dragStartTextPos = { x: 0, y: 0 };

        this.resizeHandle = null;
        this.resizeStartScale = 1.0;
        this.resizeStartFontSize = 48;
        this.resizeStartPos = { x: 0, y: 0 };

        this.rotateStartAngle = 0;
        this.rotateStartRotation = 0;

        // Text objects storage for selection support
        this.textObjects = [];
        this.selectedTextIndex = null;
        this.editingTextIndex = null; // Index of text being edited

        this.DEFAULT_DECORATION_WIDTH = 2;
        this.DOTTED_LINE_GAP_MULTIPLIER = 2.2; // Gap = lineWidth * 2.2 keeps dots legible down to 12px fonts.
        this.MIN_FONT_SIZE = 12;
        this.DEFAULT_MAX_FONT_SIZE = 200;
        this.MAX_FONT_SIZE_LIMIT = 10000;
        this.textColorKeyMap = {
            '#000000': { key: 'colors.black', fallback: 'Black' },
            '#FF0000': { key: 'colors.red', fallback: 'Red' },
            '#0000FF': { key: 'colors.blue', fallback: 'Blue' },
            '#008000': { key: 'colors.green', fallback: 'Green' },
            '#FFA500': { key: 'colors.orange', fallback: 'Orange' },
            '#800080': { key: 'colors.purple', fallback: 'Purple' },
            '#FFC0CB': { key: 'colors.pink', fallback: 'Pink' }
        };
        this.modalPreviouslyFocusedElement = null;

        this.createControls();
        this.setupEventListeners();
        this.loadCustomFontsToDocument();
        this.localeChangeHandler = () => {
            this.updateTextColorButtonLabels();
        };
        window.addEventListener('localeChanged', this.localeChangeHandler);
    }

    getText(key, fallback) {
        const translated = window.i18n?.t?.(key);
        return translated && translated !== key ? translated : fallback;
    }

    // Load custom fonts from localStorage
    loadCustomFonts() {
        const saved = safeInsertTextStorageGetItem('customFonts');
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
            const persisted = safeInsertTextStorageSetItem('customFonts', JSON.stringify(this.customFonts));
            if (!persisted) {
                throw new Error('custom-font-persistence-failed');
            }
        } catch (e) {
            // Handle storage quota exceeded
            const msg = window.i18n ? window.i18n.t('tools.text.storageQuotaExceeded') : 'Storage quota exceeded. Please delete some custom fonts.';
            if (window.toastManager) {
                window.toastManager.show(msg, 'error');
            }
            console.warn('Failed to save custom fonts to localStorage:', e);
        }
    }

    // Load custom fonts into the document
    loadCustomFontsToDocument() {
        const loadPromises = this.customFonts.map(font => {
            return this.addFontToDocument(font.name, font.data);
        });
        return Promise.all(loadPromises);
    }

    // Add a font to the document
    addFontToDocument(name, data) {
        const fontSet = typeof document !== 'undefined' ? document.fonts : null;
        if (typeof FontFace !== 'function' || !fontSet || typeof fontSet.add !== 'function') {
            console.warn(`FontFace API is unavailable, skipping custom font ${name}`);
            return Promise.resolve(null);
        }

        const fontFace = new FontFace(name, `url(${data})`);
        return fontFace.load().then(loadedFace => {
            fontSet.add(loadedFace);
            return loadedFace;
        }).catch(err => {
            console.warn(`Failed to load custom font ${name}:`, err);
            return null;
        });
    }

    // Handle font file upload
    handleFontUpload(file) {
        if (!file) return;
        
        // Check file size (limit to 2MB to avoid localStorage issues)
        const maxSize = 2 * 1024 * 1024; // 2MB
        if (file.size > maxSize) {
            const msg = window.i18n ? window.i18n.t('tools.text.fontTooLarge') : 'Font file is too large. Maximum size is 2MB.';
            if (window.toastManager) {
                window.toastManager.show(msg, 'error');
            } else {
                window.appDialog?.showAlert(msg, 'error');
            }
            return;
        }
        
        const extension = file.name.split('.').pop().toLowerCase();
        const validExtensions = ['ttf', 'otf', 'woff', 'woff2'];
        
        if (!validExtensions.includes(extension)) {
            const msg = window.i18n ? window.i18n.t('tools.text.invalidFontFormat') : 'Invalid font format. Please use TTF, OTF, WOFF, or WOFF2 files.';
            if (window.toastManager) {
                window.toastManager.show(msg, 'error');
            } else {
                window.appDialog?.showAlert(msg, 'error');
            }
            return;
        }

        const reader = new FileReader();
        reader.onload = (e) => {
            const fontData = e.target.result;
            // Extract font name by removing the extension (handle multiple dots in filename)
            const lastDotIndex = file.name.lastIndexOf('.');
            const fontName = lastDotIndex > 0 ? file.name.substring(0, lastDotIndex) : file.name;
            
            // Check if font already exists
            const exists = this.customFonts.find(f => f.name === fontName);
            if (!exists) {
                this.customFonts.push({ name: fontName, data: fontData });
                this.saveCustomFonts();
                this.addFontToDocument(fontName, fontData);
                this.populateFonts();
                
                // Select the newly uploaded font
                const select = document.getElementById('insert-text-font-select');
                if (select) {
                    select.value = fontName;
                    this.textConfig.fontFamily = fontName;
                }
                
                const msg = window.i18n ? window.i18n.t('tools.text.fontUploadSuccess') : 'Font uploaded successfully!';
                if (window.toastManager) {
                    window.toastManager.show(msg, 'success');
                }
            } else {
                const msg = window.i18n ? window.i18n.t('tools.text.fontExists') : 'This font already exists.';
                if (window.toastManager) {
                    window.toastManager.show(msg, 'warning');
                }
            }
        };
        reader.onerror = () => {
            console.warn('Failed to read font file:', reader.error);
            const msg = window.i18n?.t?.('errors.fileReadFailed') || 'Failed to read the selected file.';
            if (window.toastManager) {
                window.toastManager.show(msg, 'error');
            } else {
                window.appDialog?.showAlert?.(msg, 'error');
            }
        };
        reader.readAsDataURL(file);
    }

    createControls() {
        // Create Modal HTML if not exists
        if (!document.getElementById('insert-text-modal')) {
            const modalHTML = `
            <div id="insert-text-modal" class="modal">
                <div class="modal-content text-input-modal-content">
                    <div class="modal-header">
                        <h2 id="insert-text-modal-title" data-i18n="tools.text.insertTitle"></h2>
                        <button id="insert-text-modal-close-btn" class="modal-close-btn" data-i18n-title="common.close" title="Close" aria-label="Close">
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <line x1="18" y1="6" x2="6" y2="18"></line>
                                <line x1="6" y1="6" x2="18" y2="18"></line>
                            </svg>
                        </button>
                    </div>
                    <div class="modal-body">
                        <textarea id="insert-text-input" class="text-input-area" placeholder="Enter text..." data-i18n-placeholder="tools.text.placeholder" data-i18n-aria-label="tools.text.placeholder" aria-label="Enter text..."></textarea>

                        <div class="text-input-controls">
                            <div class="text-control-group">
                                <label data-i18n="tools.text.font">Font</label>
                                <div class="font-selection-row">
                                    <select id="insert-text-font-select" class="format-select" data-i18n-aria-label="tools.text.font" aria-label="Font">
                                        <option value="sans-serif">Sans Serif</option>
                                        <option value="serif">Serif</option>
                                        <option value="monospace">Monospace</option>
                                        <option value="cursive">Cursive</option>
                                    </select>
                                    <label class="font-upload-btn" for="insert-text-font-upload" role="button" tabindex="0" data-i18n-title="tools.text.uploadFont" aria-label="Upload Font">
                                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                                            <polyline points="17 8 12 3 7 8"></polyline>
                                            <line x1="12" y1="3" x2="12" y2="15"></line>
                                        </svg>
                                        <input type="file" id="insert-text-font-upload" accept=".ttf,.otf,.woff,.woff2" style="display: none;" data-i18n-aria-label="tools.text.uploadFont" aria-label="Upload Font">
                                    </label>
                                </div>
                            </div>

                            <div class="text-control-group">
                                <label data-i18n="tools.text.style">Style</label>
                                <div class="text-style-buttons">
                                    <button id="insert-text-bold-btn" class="text-style-btn" data-i18n-title="tools.text.bold" aria-label="Bold" aria-pressed="false">
                                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
                                            <path d="M6 4h8a4 4 0 0 1 4 4 4 4 0 0 1-4 4H6z"></path>
                                            <path d="M6 12h9a4 4 0 0 1 4 4 4 4 0 0 1-4 4H6z"></path>
                                        </svg>
                                    </button>
                                    <button id="insert-text-italic-btn" class="text-style-btn" data-i18n-title="tools.text.italic" aria-label="Italic" aria-pressed="false">
                                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                            <line x1="19" y1="4" x2="10" y2="4"></line>
                                            <line x1="14" y1="20" x2="5" y2="20"></line>
                                            <line x1="15" y1="4" x2="9" y2="20"></line>
                                        </svg>
                                    </button>
                                    <button id="insert-text-underline-btn" class="text-style-btn" data-i18n-title="tools.text.underline" aria-label="Underline" aria-pressed="false">
                                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                            <path d="M6 3v7a6 6 0 0 0 6 6 6 6 0 0 0 6-6V3"></path>
                                            <line x1="4" y1="21" x2="20" y2="21"></line>
                                        </svg>
                                    </button>
                                    <button id="insert-text-strikethrough-btn" class="text-style-btn" data-i18n-title="tools.text.strikethrough" aria-label="Strikethrough" aria-pressed="false">
                                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                            <line x1="4" y1="12" x2="20" y2="12"></line>
                                            <path d="M17.5 7.5c0-2-1.5-3.5-5.5-3.5S6.5 5.5 6.5 7.5c0 2 1.5 3 5.5 4.5"></path>
                                            <path d="M6.5 16.5c0 2 1.5 3.5 5.5 3.5s5.5-1.5 5.5-3.5c0-2-1.5-3-5.5-4.5"></path>
                                        </svg>
                                    </button>
                                </div>
                            </div>

                            <div id="text-decoration-settings" class="text-decoration-settings" aria-hidden="true">
                                <div class="text-control-group">
                                    <label data-i18n="tools.text.decorationStyle">Line Style</label>
                                    <select id="insert-text-decoration-style" class="format-select" data-i18n-aria-label="tools.text.decorationStyle" aria-label="Line Style">
                                        <option value="solid" data-i18n="tools.lineStyle.solid">Solid</option>
                                        <option value="dashed" data-i18n="tools.lineStyle.dashed">Dashed</option>
                                        <option value="dotted" data-i18n="tools.lineStyle.dotted">Dotted</option>
                                        <option value="wavy" data-i18n="tools.lineStyle.wavy">Wavy</option>
                                    </select>
                                </div>

                                <div class="text-control-group">
                                    <label><span data-i18n="tools.text.decorationWidth">Line Width</span>: <span id="insert-text-decoration-width-value">2</span>px</label>
                                    <input type="range" id="insert-text-decoration-width" min="1" max="8" value="2" class="slider touch-friendly-slider" data-i18n-aria-label="tools.text.decorationWidth" aria-label="Line Width">
                                </div>

                                <div class="text-control-group">
                                    <label data-i18n="tools.text.decorationColor">Line Color</label>
                                    <input type="color" id="insert-text-decoration-color" class="text-decoration-color-input" value="#000000" data-i18n-aria-label="tools.text.decorationColor" aria-label="Line Color">
                                </div>
                            </div>

                            <div class="text-control-group">
                                <label><span data-i18n="tools.text.size">Size</span>: <span id="insert-text-size-value">48</span>px</label>
                                <input type="range" id="insert-text-size-slider" min="12" max="200" value="48" class="slider touch-friendly-slider" data-i18n-aria-label="tools.text.size" aria-label="Size">
                            </div>

                            <div class="text-control-group">
                                <label data-i18n="tools.text.color">Color</label>
                                <div class="color-picker-row">
                                    <div class="color-picker-main">
                                        <button class="color-btn active touch-target" data-text-color="#000000" style="background-color: #000000;" title="Black" aria-label="Black"></button>
                                        <button class="color-btn touch-target" data-text-color="#FF0000" style="background-color: #FF0000;" title="Red" aria-label="Red"></button>
                                        <button class="color-btn touch-target" data-text-color="#0000FF" style="background-color: #0000FF;" title="Blue" aria-label="Blue"></button>
                                        <button class="color-btn touch-target" data-text-color="#008000" style="background-color: #008000;" title="Green" aria-label="Green"></button>
                                    </div>
                                    <div class="color-picker-main">
                                        <button class="color-btn touch-target" data-text-color="#FFA500" style="background-color: #FFA500;" title="Orange" aria-label="Orange"></button>
                                        <button class="color-btn touch-target" data-text-color="#800080" style="background-color: #800080;" title="Purple" aria-label="Purple"></button>
                                        <button class="color-btn touch-target" data-text-color="#FFC0CB" style="background-color: #FFC0CB;" title="Pink" aria-label="Pink"></button>
                                        <label class="color-picker-icon-btn touch-target" for="insert-text-custom-color" data-i18n-title="tools.text.colorPicker" data-color-picker-label-key="tools.text.colorPicker" title="Color Picker" aria-label="Color Picker" role="button" tabindex="0">
                                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                                <path d="M20 14.66V20a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h5.34"></path>
                                                <polygon points="18 2 22 6 12 16 8 16 8 12 18 2"></polygon>
                                            </svg>
                                            <input type="color" id="insert-text-custom-color" class="custom-color-picker-input" value="#000000">
                                        </label>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div class="text-input-buttons">
                            <button id="insert-text-modal-cancel-btn" class="confirm-btn cancel-btn touch-target" data-i18n="common.cancel" aria-label="Cancel">Cancel</button>
                            <button id="insert-text-modal-ok-btn" class="confirm-btn ok-btn touch-target" data-i18n="common.confirm" aria-label="Confirm">Confirm</button>
                        </div>
                    </div>
                </div>
            </div>`;
            document.body.insertAdjacentHTML('beforeend', modalHTML);
        }

        // Create Overlay HTML
        if (!document.getElementById('insert-text-overlay')) {
            const overlayHTML = `
            <div id="insert-text-overlay" style="display: none;">
                <div id="insert-text-box">
                    <div id="insert-text-content"></div>

                    <!-- Resize Handles -->
                    <div class="resize-handle top-left" data-handle="top-left"></div>
                    <div class="resize-handle top-right" data-handle="top-right"></div>
                    <div class="resize-handle bottom-left" data-handle="bottom-left"></div>
                    <div class="resize-handle bottom-right" data-handle="bottom-right"></div>

                    <!-- Rotation Handle -->
                    <div class="rotate-handle" id="insert-text-rotate-handle" data-i18n-title="imageControls.rotate" aria-label="Rotate">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2">
                            <path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.2"/>
                        </svg>
                    </div>

                    <!-- Toolbar -->
                    <div class="text-controls-toolbar">
                        <button id="insert-text-edit-btn" class="text-control-btn text-edit-btn" data-i18n-title="common.edit" aria-label="Edit">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                            </svg>
                        </button>
                        <button id="insert-text-cancel-btn" class="text-control-btn text-cancel-btn" data-i18n-title="common.cancel" aria-label="Cancel">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                                <line x1="18" y1="6" x2="6" y2="18"></line>
                                <line x1="6" y1="6" x2="18" y2="18"></line>
                            </svg>
                        </button>
                        <button id="insert-text-confirm-btn" class="text-control-btn text-done-btn" data-i18n-title="common.confirm" aria-label="Confirm">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                                <polyline points="20 6 9 17 4 12"></polyline>
                            </svg>
                        </button>
                    </div>
                </div>
            </div>`;
            document.body.insertAdjacentHTML('beforeend', overlayHTML);
        }

        this.modal = document.getElementById('insert-text-modal');
        this.overlay = document.getElementById('insert-text-overlay');
        this.controlBox = document.getElementById('insert-text-box');
        this.textContentDiv = document.getElementById('insert-text-content');
        this.rotateHandle = document.getElementById('insert-text-rotate-handle');
        this.toolbar = this.controlBox.querySelector('.text-controls-toolbar');

        if (window.i18n) {
            window.i18n.applyTranslations();
        }
        this.updateTextColorButtonLabels();

        // Populate fonts
        this.populateFonts();
    }

    updateTextColorButtonLabels() {
        const colorLabel = this.getText('tools.text.color', 'Color');
        document.querySelectorAll('#insert-text-modal .color-btn[data-text-color]').forEach((button) => {
            const colorValue = button.getAttribute('data-text-color');
            const colorMeta = this.textColorKeyMap[colorValue];
            const colorName = colorMeta
                ? this.getText(colorMeta.key, colorMeta.fallback)
                : colorValue;
            const label = `${colorLabel}: ${colorName}`;
            button.title = label;
            button.setAttribute('aria-label', label);
            button.setAttribute('aria-pressed', button.classList.contains('active') ? 'true' : 'false');
        });

        const customColorLabel = this.getText('tools.text.colorPicker', 'Color Picker');
        const customColorTrigger = document.querySelector('label[for="insert-text-custom-color"]');
        if (customColorTrigger) {
            customColorTrigger.title = customColorLabel;
            customColorTrigger.setAttribute('aria-label', customColorLabel);
        }

        const customColorInput = document.getElementById('insert-text-custom-color');
        if (customColorInput) {
            customColorInput.setAttribute('aria-label', customColorLabel);
        }
    }

    populateFonts() {
        const select = document.getElementById('insert-text-font-select');
        if (!select) return;

        const settingsManager = window.drawingBoard?.settingsManager;
        const managedFontOptions = settingsManager && typeof settingsManager.getManagedFontOptions === 'function'
            ? settingsManager.getManagedFontOptions()
            : null;
        const managedFonts = managedFontOptions
            ? managedFontOptions.filter(font => font.visible).map(font => ({ value: font.value, label: font.label }))
            : null;
        const fonts = (managedFonts && managedFonts.length > 0)
            ? managedFonts
            : [
                { value: 'sans-serif', label: 'settings.general.fonts.sansSerif' },
                { value: 'serif', label: 'settings.general.fonts.serif' },
                { value: 'monospace', label: 'settings.general.fonts.monospace' },
                { value: 'cursive', label: 'settings.general.fonts.cursive' }
            ];

        select.innerHTML = '';
        
        // Add system fonts
        fonts.forEach(font => {
            const option = document.createElement('option');
            option.value = font.value;
            // Use translation if available
            option.textContent = window.i18n && font.label.startsWith('settings.')
                ? window.i18n.t(font.label)
                : font.label;
            select.appendChild(option);
        });

        if (window.drawingBoard?.settingsManager?.customFonts) {
            this.customFonts = window.drawingBoard.settingsManager.customFonts;
        }
    }

    getFocusableElement() {
        return document.activeElement && document.activeElement !== document.body
            ? document.activeElement
            : null;
    }

    scheduleModalFrame(callback) {
        if (typeof window.requestAnimationFrame === 'function') {
            window.requestAnimationFrame(callback);
            return;
        }
        callback();
    }

    bindModalAccessibility() {
        if (!this.modal) {
            return;
        }

        this.modal.setAttribute('role', 'dialog');
        this.modal.setAttribute('aria-modal', 'true');
        this.modal.setAttribute('aria-labelledby', 'insert-text-modal-title');
        this.modal.setAttribute('aria-describedby', 'insert-text-input');
        this.modal.tabIndex = -1;

        if (this.modal.dataset.keyboardBindingsInitialized === 'true') {
            return;
        }

        this.modal.dataset.keyboardBindingsInitialized = 'true';
        this.modal.addEventListener('click', (event) => {
            if (event.target === this.modal) {
                this.closeModal();
            }
        });
        this.modal.addEventListener('keydown', (event) => {
            if (event.key === 'Escape') {
                event.preventDefault();
                this.closeModal();
            }
        });
    }

    hideModal({ restoreFocus = true, clearEditingState = true } = {}) {
        const restoreFocusTarget = restoreFocus ? this.modalPreviouslyFocusedElement : null;
        this.modalPreviouslyFocusedElement = null;
        this.modal?.classList?.remove('show');
        if (clearEditingState) {
            this.editingTextIndex = null;
        }
        window.drawingBoard?.syncVectorPreviewState?.();
        if (restoreFocusTarget) {
            this.scheduleModalFrame(() => {
                restoreFocusTarget?.focus?.();
            });
        }
    }

    setupEventListeners() {
        this.bindModalAccessibility();

        // Modal Events
        document.getElementById('insert-text-modal-close-btn').addEventListener('click', () => this.closeModal());
        document.getElementById('insert-text-modal-cancel-btn').addEventListener('click', () => this.closeModal());
        document.getElementById('insert-text-modal-ok-btn').addEventListener('click', () => this.confirmModal());

        const sizeSlider = document.getElementById('insert-text-size-slider');
        const sizeValue = document.getElementById('insert-text-size-value');
        sizeSlider.addEventListener('input', (e) => {
            sizeValue.textContent = e.target.value;
            this.textConfig.fontSize = parseInt(e.target.value, 10);
            this.textScale = 1.0;
            if (this.isActive) {
                this.updateOverlay();
            }
            this.updateSizeSliderRange();
        });

        const decorationStyleSelect = document.getElementById('insert-text-decoration-style');
        if (decorationStyleSelect) {
            decorationStyleSelect.addEventListener('change', (e) => {
                this.textConfig.decorationStyle = e.target.value;
                if (this.isActive) {
                    this.updateOverlay();
                }
            });
        }

        const decorationWidthSlider = document.getElementById('insert-text-decoration-width');
        const decorationWidthValue = document.getElementById('insert-text-decoration-width-value');
        if (decorationWidthSlider && decorationWidthValue) {
            decorationWidthSlider.addEventListener('input', (e) => {
                const widthValue = parseInt(e.target.value, 10);
                decorationWidthValue.textContent = e.target.value;
                this.textConfig.decorationWidth = widthValue;
                if (this.isActive) {
                    this.updateOverlay();
                }
            });
        }

        const decorationColorInput = document.getElementById('insert-text-decoration-color');
        if (decorationColorInput) {
            decorationColorInput.addEventListener('input', (e) => {
                this.textConfig.decorationColor = e.target.value;
                if (this.isActive) {
                    this.updateOverlay();
                }
            });
        }

        // Font Selection
        const fontSelect = document.getElementById('insert-text-font-select');
        fontSelect.addEventListener('change', (e) => {
            this.textConfig.fontFamily = e.target.value;
            if (this.isActive) {
                this.updateOverlay();
            }
        });

        // Font Upload
        const fontUpload = document.getElementById('insert-text-font-upload');
        if (fontUpload) {
            fontUpload.addEventListener('change', (e) => {
                if (e.target.files && e.target.files[0]) {
                    if (window.drawingBoard?.settingsManager) {
                        window.drawingBoard.settingsManager.handleFontUpload(e.target.files[0]);
                        this.customFonts = window.drawingBoard.settingsManager.customFonts;
                        this.populateFonts();
                        const select = document.getElementById('insert-text-font-select');
                        const uploadedName = e.target.files[0].name.replace(/\.[^/.]+$/, '');
                        if (select && [...select.options].some(opt => opt.value === uploadedName)) {
                            select.value = uploadedName;
                            this.textConfig.fontFamily = uploadedName;
                        }
                    } else {
                        this.handleFontUpload(e.target.files[0]);
                    }
                }
            });

            const fontUploadTrigger = fontUpload.closest('label.font-upload-btn');
            if (fontUploadTrigger) {
                fontUploadTrigger.addEventListener('keydown', (e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        fontUpload.click();
                    }
                });
            }
        }

        // Bold Button
        const boldBtn = document.getElementById('insert-text-bold-btn');
        if (boldBtn) {
            boldBtn.addEventListener('click', () => {
                this.textConfig.bold = !this.textConfig.bold;
                boldBtn.classList.toggle('active', this.textConfig.bold);
                boldBtn.setAttribute('aria-pressed', this.textConfig.bold.toString());
            });
        }

        // Italic Button
        const italicBtn = document.getElementById('insert-text-italic-btn');
        if (italicBtn) {
            italicBtn.addEventListener('click', () => {
                this.textConfig.italic = !this.textConfig.italic;
                italicBtn.classList.toggle('active', this.textConfig.italic);
                italicBtn.setAttribute('aria-pressed', this.textConfig.italic.toString());
            });
        }

        // Underline Button
        const underlineBtn = document.getElementById('insert-text-underline-btn');
        if (underlineBtn) {
            underlineBtn.addEventListener('click', () => {
                this.textConfig.underline = !this.textConfig.underline;
                underlineBtn.classList.toggle('active', this.textConfig.underline);
                underlineBtn.setAttribute('aria-pressed', this.textConfig.underline.toString());
                this.updateDecorationControlsVisibility();
                if (this.isActive) {
                    this.updateOverlay();
                }
            });
        }

        // Strikethrough Button
        const strikethroughBtn = document.getElementById('insert-text-strikethrough-btn');
        if (strikethroughBtn) {
            strikethroughBtn.addEventListener('click', () => {
                this.textConfig.strikethrough = !this.textConfig.strikethrough;
                strikethroughBtn.classList.toggle('active', this.textConfig.strikethrough);
                strikethroughBtn.setAttribute('aria-pressed', this.textConfig.strikethrough.toString());
                this.updateDecorationControlsVisibility();
                if (this.isActive) {
                    this.updateOverlay();
                }
            });
        }

        // Color Picking
        document.querySelectorAll('#insert-text-modal .color-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const targetButton = e.currentTarget;
                const color = targetButton.dataset.textColor;
                this.updateColor(color);

                // Update active state
                document.querySelectorAll('#insert-text-modal .color-btn').forEach(b => b.classList.remove('active'));
                targetButton.classList.add('active');

                // Deactivate custom picker visual
                const customLabel = document.querySelector('label[for="insert-text-custom-color"]');
                if (customLabel) customLabel.classList.remove('active');
                this.updateTextColorButtonLabels();
            });
        });

        const customColorPicker = document.getElementById('insert-text-custom-color');
        customColorPicker.addEventListener('input', (e) => {
            this.updateColor(e.target.value);

            document.querySelectorAll('#insert-text-modal .color-btn').forEach(b => b.classList.remove('active'));
            const customLabel = document.querySelector('label[for="insert-text-custom-color"]');
            if (customLabel) customLabel.classList.add('active');
            this.updateTextColorButtonLabels();
        });
        const customColorLabel = document.querySelector('label[for="insert-text-custom-color"]');
        customColorLabel?.addEventListener('keydown', (event) => {
            if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                customColorPicker.click();
            }
        });

        // Overlay Events
        const handleDragStart = (e) => {
            e.stopPropagation();
            const target = e.target;
            const closest = typeof target?.closest === 'function'
                ? target.closest.bind(target)
                : () => null;
            const hasClass = (className) => Boolean(target?.classList?.contains?.(className));
            if (target === this.controlBox || closest('#insert-text-box') === this.controlBox) {
                // Ignore touches on handles or toolbar buttons
                if (!hasClass('resize-handle') &&
                    !hasClass('rotate-handle') &&
                    !closest('.resize-handle') &&
                    !closest('.rotate-handle') &&
                    !closest('.text-controls-toolbar')) {
                    this.startDrag(e);
                }
            }
        };

        this.controlBox.addEventListener('mousedown', handleDragStart);
        this.controlBox.addEventListener('pointerdown', handleDragStart);
        this.controlBox.addEventListener('touchstart', handleDragStart, { passive: false });

        // Resize Handles
        this.controlBox.querySelectorAll('.resize-handle').forEach(handle => {
            const startResize = (e) => {
                e.stopPropagation();
                e.preventDefault?.();
                this.startResize(e, handle.dataset.handle);
            };
            handle.addEventListener('mousedown', startResize);
            handle.addEventListener('pointerdown', startResize);
            handle.addEventListener('touchstart', startResize, { passive: false });
        });

        // Rotate Handle
        const startRotate = (e) => {
            e.stopPropagation();
            e.preventDefault?.();
            this.startRotate(e);
        };
        this.rotateHandle.addEventListener('mousedown', startRotate);
        this.rotateHandle.addEventListener('pointerdown', startRotate);
        this.rotateHandle.addEventListener('touchstart', startRotate, { passive: false });

        // Overlay Toolbar
        document.getElementById('insert-text-cancel-btn').addEventListener('click', () => this.cancelOverlay());
        document.getElementById('insert-text-confirm-btn').addEventListener('click', () => this.stampText());
        document.getElementById('insert-text-edit-btn').addEventListener('click', () => this.showModal(true)); // Re-open modal for editing

        // Double click to edit
        this.controlBox.addEventListener('dblclick', () => this.showModal(true));

        // Global Move/Up
        const handleMove = (e) => {
            if ((this.isDragging || this.isResizing || this.isRotating) && e.type === 'touchmove') {
                e.preventDefault();
            }
            if (this.isDragging) this.drag(e);
            else if (this.isResizing) this.resize(e);
            else if (this.isRotating) this.rotate(e);
        };

        const handleEnd = () => {
            this.stopDrag();
            this.stopResize();
            this.stopRotate();
        };

        document.addEventListener('mousemove', handleMove);
        document.addEventListener('pointermove', handleMove);
        document.addEventListener('touchmove', handleMove, { passive: false });
        document.addEventListener('mouseup', handleEnd);
        document.addEventListener('pointerup', handleEnd);
        document.addEventListener('touchend', handleEnd);
        document.addEventListener('pointercancel', handleEnd);
        document.addEventListener('touchcancel', handleEnd);
    }

    trigger() {
        // Reset state for new text
        this.textConfig = {
            text: '',
            fontSize: 48,
            color: '#000000',
            fontFamily: 'sans-serif',
            bold: false,
            italic: false,
            underline: false,
            strikethrough: false,
            decorationStyle: 'solid',
            decorationColor: '#000000',
            decorationWidth: this.DEFAULT_DECORATION_WIDTH
        };
        this.textScale = 1.0;
        // Reset slider
        document.getElementById('insert-text-size-slider').value = 48;
        document.getElementById('insert-text-size-value').textContent = '48';
        this.updateSizeSliderRange();
        document.getElementById('insert-text-input').value = '';

        const decorationStyleSelect = document.getElementById('insert-text-decoration-style');
        if (decorationStyleSelect) decorationStyleSelect.value = 'solid';
        const decorationWidthSlider = document.getElementById('insert-text-decoration-width');
        const decorationWidthValue = document.getElementById('insert-text-decoration-width-value');
        if (decorationWidthSlider) decorationWidthSlider.value = this.DEFAULT_DECORATION_WIDTH;
        if (decorationWidthValue) decorationWidthValue.textContent = this.DEFAULT_DECORATION_WIDTH;
        const decorationColorInput = document.getElementById('insert-text-decoration-color');
        if (decorationColorInput) decorationColorInput.value = '#000000';

        // Reset font
        const fontSelect = document.getElementById('insert-text-font-select');
        if (fontSelect) fontSelect.value = 'sans-serif';

        // Reset bold/italic/underline/strikethrough buttons
        const boldBtn = document.getElementById('insert-text-bold-btn');
        const italicBtn = document.getElementById('insert-text-italic-btn');
        const underlineBtn = document.getElementById('insert-text-underline-btn');
        const strikethroughBtn = document.getElementById('insert-text-strikethrough-btn');
        if (boldBtn) {
            boldBtn.classList.remove('active');
            boldBtn.setAttribute('aria-pressed', 'false');
        }
        if (italicBtn) {
            italicBtn.classList.remove('active');
            italicBtn.setAttribute('aria-pressed', 'false');
        }
        if (underlineBtn) {
            underlineBtn.classList.remove('active');
            underlineBtn.setAttribute('aria-pressed', 'false');
        }
        if (strikethroughBtn) {
            strikethroughBtn.classList.remove('active');
            strikethroughBtn.setAttribute('aria-pressed', 'false');
        }

        // Reset active color to black
        document.querySelectorAll('#insert-text-modal .color-btn').forEach(b => b.classList.remove('active'));
        const defaultColorBtn = document.querySelector('#insert-text-modal .color-btn[data-text-color="#000000"]');
        if (defaultColorBtn) {
            defaultColorBtn.classList.add('active');
        }
        const customLabel = document.querySelector('label[for="insert-text-custom-color"]');
        if (customLabel) customLabel.classList.remove('active');
        this.updateTextColorButtonLabels();
        this.updateDecorationControlsVisibility();

        this.showModal();
    }

    showModal(isEditing = false) {
        if (!this.modal.classList.contains('show')) {
            this.modalPreviouslyFocusedElement = this.getFocusableElement();
        }
        this.modal.classList.add('show');
        // Re-populate fonts to ensure translations are up to date
        this.populateFonts();

        const input = document.getElementById('insert-text-input');

        // Update modal title to indicate editing mode
        const modalTitle = document.getElementById('insert-text-modal-title');
        if (modalTitle) {
            if (isEditing) {
                const editLabel = window.i18n ? window.i18n.t('tools.text.editTitle') : 'Edit Text';
                modalTitle.textContent = editLabel;
            } else {
                const insertLabel = window.i18n ? window.i18n.t('tools.text.insertTitle') : 'Insert Text';
                modalTitle.textContent = insertLabel;
            }
        }

        if (isEditing) {
            input.value = this.textConfig.text;
            this.updateSizeSliderRange();
            document.getElementById('insert-text-size-slider').value = this.textConfig.fontSize;
            document.getElementById('insert-text-size-value').textContent = this.textConfig.fontSize;
            document.getElementById('insert-text-font-select').value = this.textConfig.fontFamily;
            const decorationStyleSelect = document.getElementById('insert-text-decoration-style');
            if (decorationStyleSelect) decorationStyleSelect.value = this.textConfig.decorationStyle || 'solid';
            const decorationWidthSlider = document.getElementById('insert-text-decoration-width');
            const decorationWidthValue = document.getElementById('insert-text-decoration-width-value');
            if (decorationWidthSlider) decorationWidthSlider.value = this.textConfig.decorationWidth || this.DEFAULT_DECORATION_WIDTH;
            if (decorationWidthValue) decorationWidthValue.textContent = this.textConfig.decorationWidth || this.DEFAULT_DECORATION_WIDTH;
            const decorationColorInput = document.getElementById('insert-text-decoration-color');
            if (decorationColorInput) decorationColorInput.value = this.textConfig.decorationColor || this.textConfig.color;
            
            // Restore bold/italic/underline/strikethrough states
            const boldBtn = document.getElementById('insert-text-bold-btn');
            const italicBtn = document.getElementById('insert-text-italic-btn');
            const underlineBtn = document.getElementById('insert-text-underline-btn');
            const strikethroughBtn = document.getElementById('insert-text-strikethrough-btn');
            if (boldBtn) {
                boldBtn.classList.toggle('active', this.textConfig.bold);
                boldBtn.setAttribute('aria-pressed', (!!this.textConfig.bold).toString());
            }
            if (italicBtn) {
                italicBtn.classList.toggle('active', this.textConfig.italic);
                italicBtn.setAttribute('aria-pressed', (!!this.textConfig.italic).toString());
            }
            if (underlineBtn) {
                underlineBtn.classList.toggle('active', this.textConfig.underline);
                underlineBtn.setAttribute('aria-pressed', (!!this.textConfig.underline).toString());
            }
            if (strikethroughBtn) {
                strikethroughBtn.classList.toggle('active', this.textConfig.strikethrough);
                strikethroughBtn.setAttribute('aria-pressed', (!!this.textConfig.strikethrough).toString());
            }
        }
        this.updateDecorationControlsVisibility();

        const closeBtn = document.getElementById('insert-text-modal-close-btn');
        const focusTarget = input || closeBtn || this.modal;
        this.scheduleModalFrame(() => {
            focusTarget?.focus?.();
        });
    }

    closeModal() {
        this.hideModal();
    }

    confirmModal() {
        const text = document.getElementById('insert-text-input').value;
        if (!text.trim()) {
            this.closeModal();
            return;
        }

        this.textConfig.text = text;

        // When editing an existing text object, update it directly in-place
        // without showing the overlay (preserves position, scale, rotation)
        const isEditingStampedText = this.editingTextIndex !== null;
        const isEditingActiveOverlay = this.isActive && !isEditingStampedText;
        
        // Close modal (this resets editingTextIndex, so we check isEditing first)
        this.hideModal({
            restoreFocus: false,
            clearEditingState: false
        });

        if (isEditingStampedText) {
            this.stampText();
            return;
        }

        if (isEditingActiveOverlay) {
            this.updateOverlay();
            window.drawingBoard?.syncVectorPreviewState?.();
            return;
        }

        // Show Overlay for new text insertion
        this.showOverlay();
    }

    updateColor(color) {
        const previousColor = this.textConfig.color;
        this.textConfig.color = color;
        if (!this.textConfig.decorationColor || this.textConfig.decorationColor === previousColor) {
            this.textConfig.decorationColor = color;
            const decorationColorInput = document.getElementById('insert-text-decoration-color');
            if (decorationColorInput) decorationColorInput.value = color;
        }
        if (this.isActive) {
            this.updateOverlay();
        }
    }

    updateDecorationControlsVisibility() {
        const decorationSettings = document.getElementById('text-decoration-settings');
        if (!decorationSettings) return;
        const shouldShow = this.textConfig.underline || this.textConfig.strikethrough;
        decorationSettings.style.display = shouldShow ? 'flex' : 'none';
        decorationSettings.setAttribute('aria-hidden', (!shouldShow).toString());
    }

    updateSizeSliderRange() {
        const sizeSlider = document.getElementById('insert-text-size-slider');
        if (!sizeSlider) return;
        const maxValue = Math.max(this.DEFAULT_MAX_FONT_SIZE, Math.ceil(this.textConfig.fontSize));
        sizeSlider.max = Math.min(this.MAX_FONT_SIZE_LIMIT, maxValue);
    }

    showOverlay() {
        this.isActive = true;
        this.overlay.style.display = 'block';
        this.textScale = 1.0;
        this.textRotation = 0;
        window.drawingBoard?.syncVectorPreviewState?.();

        // Calculate initial position (center of screen)
        const cx = window.innerWidth / 2;
        const cy = window.innerHeight / 2;

        const canvasRect = this.canvas.getBoundingClientRect();
        const logicalSize = this.getLogicalCanvasSize();
        const scaleX = canvasRect.width / logicalSize.width;
        const scaleY = canvasRect.height / logicalSize.height;

        this.textPosition.x = (cx - canvasRect.left) / scaleX;
        this.textPosition.y = (cy - canvasRect.top) / scaleY;

        this.updateOverlay();

        // Adjust to center the box
        const boxRect = this.controlBox.getBoundingClientRect();
        const logicalW = boxRect.width / scaleX;
        const logicalH = boxRect.height / scaleY;

        this.textPosition.x -= logicalW / 2;
        this.textPosition.y -= logicalH / 2;

        this.updateOverlay();
    }

    updateOverlay() {
        const canvasRect = this.canvas.getBoundingClientRect();
        const { width: logicalWidth, height: logicalHeight } = this.getLogicalCanvasSize();
        const scaleX = canvasRect.width / logicalWidth;
        const scaleY = canvasRect.height / logicalHeight;

        const screenX = canvasRect.left + this.textPosition.x * scaleX;
        const screenY = canvasRect.top + this.textPosition.y * scaleY;

        this.controlBox.style.left = `${screenX}px`;
        this.controlBox.style.top = `${screenY}px`;

        const effectiveFontSize = this.textConfig.fontSize * this.textScale;
        this.textContentDiv.style.fontSize = `${effectiveFontSize * scaleX}px`; // Apply zoom scale to font
        this.textContentDiv.style.color = this.textConfig.color;
        this.textContentDiv.style.fontFamily = this.textConfig.fontFamily;
        this.textContentDiv.style.fontWeight = this.textConfig.bold ? 'bold' : 'normal';
        this.textContentDiv.style.fontStyle = this.textConfig.italic ? 'italic' : 'normal';
        const decorationLines = [];
        if (this.textConfig.underline) decorationLines.push('underline');
        if (this.textConfig.strikethrough) decorationLines.push('line-through');
        this.textContentDiv.style.textDecorationLine = decorationLines.length > 0 ? decorationLines.join(' ') : 'none';
        this.textContentDiv.style.textDecorationStyle = this.textConfig.decorationStyle || 'solid';
        this.textContentDiv.style.textDecorationColor = this.textConfig.decorationColor || this.textConfig.color;
        const decorationWidth = this.textConfig.decorationWidth || this.DEFAULT_DECORATION_WIDTH;
        this.textContentDiv.style.textDecorationThickness = `${decorationWidth}px`;
        this.textContentDiv.textContent = this.textConfig.text;

        this.controlBox.style.transform = `rotate(${this.textRotation}deg)`;

        const boxRect = this.controlBox.getBoundingClientRect();
        this.updateAdaptiveControlsLayout(boxRect.width, boxRect.height);
    }

    cancelOverlay() {
        this.isActive = false;
        this.overlay.style.display = 'none';
        window.drawingBoard?.syncVectorPreviewState?.();
    }

    stampText() {
        const fontStyle = this.textConfig.italic ? 'italic' : 'normal';
        const fontWeight = this.textConfig.bold ? 'bold' : 'normal';
        const baseFontSize = this.textConfig.fontSize;
        const effectiveFontSize = baseFontSize * this.textScale;
        // Normalize to a single font size before inserting the text object.
        this.textConfig.fontSize = effectiveFontSize;
        this.textScale = 1.0;
        
        // Measure text dimensions at base (unscaled) font size so that
        // width/height are consistent with scale multiplication elsewhere.
        this.ctx.save();
        this.ctx.font = `${fontStyle} ${fontWeight} ${effectiveFontSize}px ${this.normalizeFontFamilyForCanvas(this.textConfig.fontFamily)}`;
        this.ctx.textBaseline = 'top';
        
        const lines = this.textConfig.text.split('\n');
        const baseLineHeight = effectiveFontSize * 1.2;
        
        let maxWidth = 0;
        lines.forEach(line => {
            const m = this.ctx.measureText(line);
            if (m.width > maxWidth) maxWidth = m.width;
        });
        this.ctx.restore();

        // Create text object for selection support
        const textObj = {
            text: this.textConfig.text,
            x: this.textPosition.x,
            y: this.textPosition.y,
            fontSize: effectiveFontSize,
            color: this.textConfig.color,
            fontFamily: this.textConfig.fontFamily,
            bold: this.textConfig.bold || false,
            italic: this.textConfig.italic || false,
            underline: this.textConfig.underline || false,
            strikethrough: this.textConfig.strikethrough || false,
            decorationStyle: this.textConfig.decorationStyle || 'solid',
            decorationColor: this.textConfig.decorationColor || this.textConfig.color,
            decorationWidth: this.textConfig.decorationWidth || this.DEFAULT_DECORATION_WIDTH,
            rotation: this.textRotation,
            scale: 1,
            layerOrder: this.editingTextIndex !== null && this.textObjects[this.editingTextIndex]
                ? (this.textObjects[this.editingTextIndex].layerOrder ?? this.drawingEngine?.getNextLayerOrder?.())
                : (this.drawingEngine?.getNextLayerOrder?.() ?? Date.now()),
            objectId: this.editingTextIndex !== null && this.textObjects[this.editingTextIndex]
                ? (this.textObjects[this.editingTextIndex].objectId ?? this.drawingEngine?.getNextObjectId?.())
                : (this.drawingEngine?.getNextObjectId?.() ?? `obj-${Date.now()}`),
            groupId: this.editingTextIndex !== null && this.textObjects[this.editingTextIndex]
                ? (this.textObjects[this.editingTextIndex].groupId ?? null)
                : null,
            width: maxWidth + 8, // Include padding
            height: lines.length * baseLineHeight + 8
        };
        
        if (this.editingTextIndex !== null && this.editingTextIndex < this.textObjects.length) {
            // Update existing text object
            this.textObjects[this.editingTextIndex] = textObj;
            this.editingTextIndex = null;
        } else {
            // Add new text object
            this.textObjects.push(textObj);
        }

        // Draw all text objects
        this.redrawCanvas();
        
        this.historyManager.saveState();
        this.cancelOverlay();
        window.drawingBoard?.syncVectorPreviewState?.(true);
    }
    
    // Draw all stored text objects on canvas
    drawAllTextObjects() {
        this.textObjects.forEach(textObj => {
            this.drawTextObject(textObj);
        });
    }
    
    // Draw a single text object
    drawTextObject(textObj, targetCtx = this.ctx) {
        this.normalizeTextObjectScale(textObj);
        targetCtx.save();
        
        const fontSize = textObj.fontSize;
        const fontStyle = textObj.italic ? 'italic' : 'normal';
        const fontWeight = textObj.bold ? 'bold' : 'normal';
        targetCtx.font = `${fontStyle} ${fontWeight} ${fontSize}px ${this.normalizeFontFamilyForCanvas(textObj.fontFamily)}`;
        targetCtx.textBaseline = 'top';
        targetCtx.fillStyle = textObj.color;
        
        const lines = textObj.text.split('\n');
        const lineHeight = fontSize * 1.2;
        
        // Center of text box
        let maxWidth = 0;
        lines.forEach(line => {
            const m = targetCtx.measureText(line);
            if (m.width > maxWidth) maxWidth = m.width;
        });
        const totalHeight = lines.length * lineHeight;
        const centerX = textObj.x + maxWidth / 2;
        const centerY = textObj.y + totalHeight / 2;
        
        targetCtx.translate(centerX, centerY);
        targetCtx.rotate((textObj.rotation || 0) * Math.PI / 180);
        targetCtx.translate(-centerX, -centerY);
        
        // Pre-calculate decoration constants
        const hasDecorations = textObj.underline || textObj.strikethrough;
        const decorationStrokeWidth = hasDecorations ? (textObj.decorationWidth || Math.max(1, fontSize * 0.05)) : 0;
        const decorationColor = textObj.decorationColor || textObj.color;
        const decorationStyle = textObj.decorationStyle || 'solid';
        const UNDERLINE_Y_OFFSET = 1.05;
        const STRIKETHROUGH_Y_OFFSET = 0.55;
        
        lines.forEach((line, i) => {
            const padding = 4;
            const lineX = textObj.x + padding;
            const lineY = textObj.y + padding + (i * lineHeight);
            targetCtx.fillText(line, lineX, lineY);
            
            // Draw text decorations (underline, strikethrough)
            if (hasDecorations) {
                const measuredLineWidth = targetCtx.measureText(line).width;
                if (measuredLineWidth > 0) {
                    if (textObj.underline) {
                        const underlineY = lineY + fontSize * UNDERLINE_Y_OFFSET;
                        this.drawDecorationLine(lineX, underlineY, measuredLineWidth, decorationStyle, decorationStrokeWidth, decorationColor, targetCtx);
                    }
                    
                    if (textObj.strikethrough) {
                        const strikeY = lineY + fontSize * STRIKETHROUGH_Y_OFFSET;
                        this.drawDecorationLine(lineX, strikeY, measuredLineWidth, decorationStyle, decorationStrokeWidth, decorationColor, targetCtx);
                    }
                }
            }
        });
        
        targetCtx.restore();
    }

    drawDecorationLine(x, y, width, style, lineWidth, color, targetCtx = this.ctx) {
        targetCtx.save();
        targetCtx.strokeStyle = color;
        targetCtx.lineWidth = lineWidth;
        targetCtx.lineCap = 'round';
        targetCtx.lineJoin = 'round';

        if (style === 'dashed') {
            targetCtx.setLineDash([lineWidth * 4, lineWidth * 2]);
        } else if (style === 'dotted') {
            targetCtx.setLineDash([lineWidth, lineWidth * this.DOTTED_LINE_GAP_MULTIPLIER]);
        } else {
            targetCtx.setLineDash([]);
        }

        if (style === 'wavy') {
            const amplitude = Math.max(1, lineWidth * 1.2);
            const wavelength = Math.max(6, lineWidth * 4);
            const step = Math.max(2, wavelength / 4);
            targetCtx.beginPath();
            for (let offset = 0; offset <= width; offset += step) {
                const waveY = y + Math.sin((offset / wavelength) * Math.PI * 2) * amplitude;
                if (offset === 0) {
                    targetCtx.moveTo(x + offset, waveY);
                } else {
                    targetCtx.lineTo(x + offset, waveY);
                }
            }
            targetCtx.stroke();
        } else {
            targetCtx.beginPath();
            targetCtx.moveTo(x, y);
            targetCtx.lineTo(x + width, y);
            targetCtx.stroke();
        }

        targetCtx.restore();
    }
    
    // Draw selection indicator for selected text
    drawTextSelection() {
        if (this.selectedTextIndex === null || this.selectedTextIndex < 0) return;
        const textObj = this.textObjects[this.selectedTextIndex];
        if (!textObj) return;
        
        const bounds = this.getTextBounds(textObj);
        const rotation = textObj.rotation || 0;
        
        this.ctx.save();
        this.ctx.strokeStyle = '#0066FF';
        this.ctx.lineWidth = 2;
        
        // Apply the same rotation as the text object so the border moves/rotates with it
        if (rotation !== 0) {
            const centerX = bounds.x + bounds.width / 2;
            const centerY = bounds.y + bounds.height / 2;
            this.ctx.translate(centerX, centerY);
            this.ctx.rotate(rotation * Math.PI / 180);
            this.ctx.translate(-centerX, -centerY);
        }
        
        this.ctx.strokeRect(bounds.x, bounds.y, bounds.width, bounds.height);
        this.ctx.restore();
    }
    
    // Hit test for text objects at given canvas coordinates
    hitTestText(x, y) {
        for (let i = this.textObjects.length - 1; i >= 0; i--) {
            const textObj = this.textObjects[i];
            if (!textObj) continue;

            const bounds = this.getTextBounds(textObj);
            const rotation = textObj.rotation || 0;

            let testX = x;
            let testY = y;
            if (rotation !== 0) {
                // drawTextObject rotates around the bounds center, so rotate the
                // test point back around the same center before the AABB check
                const centerX = bounds.x + bounds.width / 2;
                const centerY = bounds.y + bounds.height / 2;
                const rad = -rotation * Math.PI / 180;
                const dx = x - centerX;
                const dy = y - centerY;
                testX = centerX + dx * Math.cos(rad) - dy * Math.sin(rad);
                testY = centerY + dx * Math.sin(rad) + dy * Math.cos(rad);
            }

            if (testX >= bounds.x && testX <= bounds.x + bounds.width &&
                testY >= bounds.y && testY <= bounds.y + bounds.height) {
                return i;
            }
        }
        return -1;
    }

    // Calculate bounds for a text object matching the actual drawn text size
    getTextBounds(textObj) {
        this.normalizeTextObjectScale(textObj);
        const fontSize = textObj.fontSize;
        const fontStyle = textObj.italic ? 'italic' : 'normal';
        const fontWeight = textObj.bold ? 'bold' : 'normal';
        const padding = 4;
        
        this.ctx.save();
        this.ctx.font = `${fontStyle} ${fontWeight} ${fontSize}px ${this.normalizeFontFamilyForCanvas(textObj.fontFamily)}`;
        
        const lines = textObj.text.split('\n');
        const lineHeight = fontSize * 1.2;
        let maxWidth = 0;
        lines.forEach(line => {
            const m = this.ctx.measureText(line);
            if (m.width > maxWidth) maxWidth = m.width;
        });
        this.ctx.restore();
        
        const bounds = {
            x: textObj.x,
            y: textObj.y,
            width: maxWidth + padding * 2,
            height: lines.length * lineHeight + padding * 2
        };
        textObj.width = bounds.width;
        textObj.height = bounds.height;
        return bounds;
    }
    
    // Copy selected text object
    copySelectedText() {
        if (this.selectedTextIndex === null || this.selectedTextIndex < 0) return false;
        const textObj = this.textObjects[this.selectedTextIndex];
        if (!textObj) return false;
        
        const copy = {
            ...textObj,
            x: textObj.x + 20,
            y: textObj.y + 20,
            layerOrder: this.drawingEngine?.getNextLayerOrder?.() ?? Date.now(),
            objectId: this.drawingEngine?.getNextObjectId?.() ?? `obj-${Date.now()}`,
            groupId: null
        };
        this.textObjects.push(copy);
        this.selectedTextIndex = this.textObjects.length - 1;
        this.redrawCanvas();
        return true;
    }
    
    // Delete selected text object
    deleteSelectedText() {
        if (this.selectedTextIndex === null || this.selectedTextIndex < 0) return false;
        this.textObjects.splice(this.selectedTextIndex, 1);
        this.selectedTextIndex = null;
        this.redrawCanvas();
        return true;
    }
    
    // Edit an existing text object by reopening the modal
    editExistingText(index) {
        if (index < 0 || index >= this.textObjects.length) return;
        const textObj = this.textObjects[index];
        if (!textObj) return;

        this.normalizeTextObjectScale(textObj);
        
        // Store which text object we're editing
        this.editingTextIndex = index;
        
        // Restore text config from the object
        this.textConfig.text = textObj.text;
        this.textConfig.fontSize = textObj.fontSize;
        this.textConfig.color = textObj.color;
        this.textConfig.fontFamily = textObj.fontFamily;
        this.textConfig.bold = textObj.bold || false;
        this.textConfig.italic = textObj.italic || false;
        this.textConfig.underline = textObj.underline || false;
        this.textConfig.strikethrough = textObj.strikethrough || false;
        this.textConfig.decorationStyle = textObj.decorationStyle || 'solid';
        this.textConfig.decorationColor = textObj.decorationColor || textObj.color || '#000000';
        this.textConfig.decorationWidth = textObj.decorationWidth || this.DEFAULT_DECORATION_WIDTH;
        
        // Restore position and transform
        this.textPosition = { x: textObj.x, y: textObj.y };
        this.textRotation = textObj.rotation || 0;
        this.textScale = 1.0;
        
        // Show the modal in edit mode
        this.showModal(true);
    }

    normalizeTextObjectScale(textObj) {
        if (!textObj) return;
        const scale = textObj.scale || 1;
        if (scale !== 1) {
            const baseFontSize = textObj.fontSize || 48;
            textObj.fontSize = baseFontSize * scale;
            textObj.scale = 1;
        } else if (typeof textObj.scale === 'undefined') {
            textObj.scale = 1;
        }
        if (!textObj.fontSize) {
            textObj.fontSize = 48;
        }
        if (!textObj.decorationStyle) textObj.decorationStyle = 'solid';
        if (!textObj.decorationColor) textObj.decorationColor = textObj.color || '#000000';
        if (!textObj.decorationWidth) textObj.decorationWidth = this.DEFAULT_DECORATION_WIDTH;
    }

    normalizeFontFamilyForCanvas(fontFamily) {
        if (!fontFamily || typeof fontFamily !== 'string') return 'sans-serif';
        return fontFamily.split(',')
            .map(part => part.trim())
            .filter(Boolean)
            .map(part => {
                const normalized = part.replace(/^["']|["']$/g, '').trim();
                return !/\s/.test(normalized) ? normalized : `"${normalized}"`;
            })
            .join(', ');
    }
    
    // Get all text objects (for serialization)
    getTextObjects() {
        return this.textObjects;
    }
    
    // Set text objects (for deserialization)
    setTextObjects(objects) {
        this.textObjects = objects || [];
        this.textObjects.forEach(textObj => {
            this.normalizeTextObjectScale(textObj);
            if (this.drawingEngine?.ensureObjectId) {
                this.drawingEngine.ensureObjectId(textObj);
            }
            if (typeof textObj.groupId === 'undefined') {
                textObj.groupId = null;
            }
        });
        if (this.drawingEngine?.syncLayerCounter) {
            this.drawingEngine.syncLayerCounter(this.textObjects);
        }
    }
    
    // Clear all text objects
    clearTextObjects() {
        this.textObjects = [];
        this.selectedTextIndex = null;
        this.editingTextIndex = null;
    }
    
    // Trigger a canvas redraw 
    redrawCanvas() {
        // Clear and redraw canvas contents
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        if (this.drawingEngine?.renderScene) {
            this.drawingEngine.renderScene(this);
            return;
        }
        
        // Redraw all text objects
        this.drawAllTextObjects();
    }

    // Interactions
    getClientPos(e) {
        if (e.touches && e.touches.length > 0) {
            return { x: e.touches[0].clientX, y: e.touches[0].clientY };
        }
        return { x: e.clientX, y: e.clientY };
    }

    // Logical (CSS) canvas size. canvas.width includes devicePixelRatio AND the
    // dynamic render scale (see render-quality-runtime.js), so backing-store
    // dimensions must never be used to derive logical coordinates.
    getLogicalCanvasSize() {
        const dpr = window.devicePixelRatio || 1;
        const width = this.canvas.clientWidth ||
            parseFloat(this.canvas.style?.width) ||
            (this.canvas.width / dpr);
        const height = this.canvas.clientHeight ||
            parseFloat(this.canvas.style?.height) ||
            (this.canvas.height / dpr);
        return { width, height };
    }

    getCanvasScales() {
        const rect = this.canvas.getBoundingClientRect();
        const { width: logicalWidth, height: logicalHeight } = this.getLogicalCanvasSize();
        return {
            scaleX: rect.width / logicalWidth,
            scaleY: rect.height / logicalHeight
        };
    }

    clamp(value, min, max) {
        return Math.min(max, Math.max(min, value));
    }

    updateAdaptiveControlsLayout(boxWidth, boxHeight) {
        const safeWidth = Math.max(boxWidth, 1);
        const safeHeight = Math.max(boxHeight, 1);
        const minSide = Math.max(Math.min(safeWidth, safeHeight), 1);

        const resizeHandleSize = this.clamp(minSide * 0.22, 12, 20);
        this.controlBox.style.setProperty('--resize-handle-size', `${resizeHandleSize}px`);
        this.controlBox.style.setProperty('--resize-handle-offset', `${-(resizeHandleSize / 2)}px`);

        const floatingSize = this.clamp(minSide * 0.34, 24, 52);
        const floatingIconSize = this.clamp(floatingSize * 0.46, 12, 22);
        const inset = this.clamp(minSide * 0.1, 4, 12);
        const handleTop = safeHeight >= floatingSize * 2.5 ? -(floatingSize + 8) : inset;
        const handleLeft = safeWidth >= floatingSize * 2.5
            ? safeWidth / 2
            : this.clamp(safeWidth - (floatingSize / 2) - inset, floatingSize / 2, Math.max(floatingSize / 2, safeWidth - (floatingSize / 2)));

        if (this.rotateHandle) {
            this.rotateHandle.style.left = `${handleLeft}px`;
            this.rotateHandle.style.top = `${handleTop}px`;
            this.rotateHandle.style.width = `${floatingSize}px`;
            this.rotateHandle.style.height = `${floatingSize}px`;
            this.rotateHandle.style.setProperty('--handle-connector-top', `${floatingSize}px`);
            this.rotateHandle.style.setProperty('--handle-connector-height', `${Math.max(8, Math.round(floatingSize * 0.4))}px`);

            const icon = this.rotateHandle.querySelector('svg');
            if (icon) {
                icon.style.width = `${floatingIconSize}px`;
                icon.style.height = `${floatingIconSize}px`;
            }
        }

        this.controlBox.style.setProperty('--floating-control-size', `${floatingSize}px`);
        this.controlBox.style.setProperty('--floating-control-icon-size', `${floatingIconSize}px`);

        if (!this.toolbar) return;

        const toolbarButtons = Array.from(this.toolbar.querySelectorAll('.text-control-btn'));
        const toolbarButtonSize = this.clamp(Math.min(safeWidth * 0.3, minSide * 0.44), 20, 40);
        const toolbarGap = this.clamp(toolbarButtonSize * 0.18, 4, 8);
        const toolbarPaddingX = this.clamp(toolbarButtonSize * 0.22, 4, 10);
        const toolbarPaddingY = this.clamp(toolbarButtonSize * 0.18, 4, 10);
        const toolbarHorizontalWidth = (toolbarButtonSize * toolbarButtons.length) + (toolbarGap * Math.max(toolbarButtons.length - 1, 0)) + toolbarPaddingX * 2;
        const toolbarTwoColWidth = (toolbarButtonSize * Math.min(toolbarButtons.length, 2)) + (toolbarGap * Math.max(Math.min(toolbarButtons.length, 2) - 1, 0)) + toolbarPaddingX * 2;

        toolbarButtons.forEach((button) => {
            button.style.width = `${toolbarButtonSize}px`;
            button.style.height = `${toolbarButtonSize}px`;
            const icon = button.querySelector('svg');
            if (icon) {
                const toolbarIconSize = this.clamp(toolbarButtonSize * 0.45, 10, 20);
                icon.style.width = `${toolbarIconSize}px`;
                icon.style.height = `${toolbarIconSize}px`;
            }
        });

        this.controlBox.style.setProperty('--toolbar-button-size', `${toolbarButtonSize}px`);
        this.controlBox.style.setProperty('--toolbar-gap', `${toolbarGap}px`);
        this.controlBox.style.setProperty('--toolbar-padding-x', `${toolbarPaddingX}px`);
        this.controlBox.style.setProperty('--toolbar-padding-y', `${toolbarPaddingY}px`);

        this.toolbar.style.left = `${safeWidth / 2}px`;
        this.toolbar.style.bottom = safeHeight >= toolbarButtonSize * 2.5
            ? `${-(toolbarButtonSize + toolbarPaddingY + 10)}px`
            : `${inset}px`;
        this.toolbar.style.transform = 'translateX(-50%)';
        this.toolbar.style.display = 'flex';
        this.toolbar.style.flexDirection = 'row';
        this.toolbar.style.justifyContent = 'center';
        this.toolbar.style.alignItems = 'center';
        this.toolbar.style.width = 'auto';
        this.toolbar.style.gridTemplateColumns = '';
        this.toolbar.style.justifyItems = '';

        if (safeWidth < toolbarHorizontalWidth + inset * 2) {
            this.toolbar.style.bottom = `${inset}px`;
            if (safeWidth >= toolbarTwoColWidth + inset * 2 && toolbarButtons.length > 2) {
                this.toolbar.style.display = 'grid';
                this.toolbar.style.gridTemplateColumns = 'repeat(2, minmax(0, 1fr))';
                this.toolbar.style.justifyItems = 'center';
                this.toolbar.style.width = `${Math.max(toolbarTwoColWidth, Math.min(safeWidth - inset * 2, toolbarHorizontalWidth))}px`;
            } else {
                this.toolbar.style.flexDirection = 'column';
            }
        }
    }

    startDrag(e) {
        this.isDragging = true;
        this.dragStartPos = this.getClientPos(e);
        this.dragStartTextPos = { ...this.textPosition };
    }

    drag(e) {
        const pos = this.getClientPos(e);
        const { scaleX, scaleY } = this.getCanvasScales();

        const dx = (pos.x - this.dragStartPos.x) / scaleX;
        const dy = (pos.y - this.dragStartPos.y) / scaleY;

        this.textPosition.x = this.dragStartTextPos.x + dx;
        this.textPosition.y = this.dragStartTextPos.y + dy;

        this.updateOverlay();
    }

    stopDrag() {
        this.isDragging = false;
    }

    startResize(e, handle) {
        this.isResizing = true;
        this.resizeHandle = handle;
        this.resizeStartPos = this.getClientPos(e);
        this.resizeStartScale = 1.0;
        this.resizeStartFontSize = this.textConfig.fontSize;
    }

    resize(e) {
        const pos = this.getClientPos(e);
        const { scaleX, scaleY } = this.getCanvasScales(); // Screen pixels per Logical unit

        const dy = (pos.y - this.resizeStartPos.y) / scaleY;
        const dx = (pos.x - this.resizeStartPos.x) / scaleX;

        let change = 0;
        if (this.resizeHandle.includes('right') || this.resizeHandle.includes('bottom')) {
            change = (dx + dy) / 2; // Rough approximation
        } else {
            change = -(dx + dy) / 2;
        }

        // Sensitivity
        const sensitivity = 0.01;
        const scaleFactor = Math.max(0.1, this.resizeStartScale + (change * sensitivity));
        const newFontSize = Math.max(this.MIN_FONT_SIZE, Math.round(this.resizeStartFontSize * scaleFactor));
        this.textConfig.fontSize = newFontSize;
        this.textScale = 1.0;

        const sizeSlider = document.getElementById('insert-text-size-slider');
        const sizeValue = document.getElementById('insert-text-size-value');
        if (sizeSlider) sizeSlider.value = newFontSize;
        if (sizeValue) sizeValue.textContent = newFontSize;
        this.updateSizeSliderRange();

        this.updateOverlay();
    }

    stopResize() {
        this.isResizing = false;
    }

    startRotate(e) {
        this.isRotating = true;
        const rect = this.controlBox.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;

        const pos = this.getClientPos(e);
        this.rotateStartAngle = Math.atan2(pos.y - centerY, pos.x - centerX) * 180 / Math.PI;
        this.rotateStartRotation = this.textRotation;
    }

    rotate(e) {
        const rect = this.controlBox.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;

        const pos = this.getClientPos(e);
        const currentAngle = Math.atan2(pos.y - centerY, pos.x - centerX) * 180 / Math.PI;
        const angleDelta = currentAngle - this.rotateStartAngle;

        this.textRotation = this.rotateStartRotation + angleDelta;
        this.updateOverlay();
    }

    stopRotate() {
        this.isRotating = false;
    }
}

if (typeof window !== 'undefined') {
    window.InsertTextManager = InsertTextManager;
}
