// Time Display Settings Modal Module
// Handles the standalone settings modal for time display configuration

class TimeDisplaySettingsModal {
    constructor(timeDisplayManager) {
        this.timeDisplayManager = timeDisplayManager;
        this.modal = document.getElementById('time-display-settings-modal');
        this.setupEventListeners();
        this.setupSettingsControls();
        this.updateColorControlAccessibility();
    }

    updateColorControlAccessibility() {
        document.querySelectorAll(
            '.color-btn[data-td-time-color], .color-btn[data-td-time-bg-color], .color-btn[data-td-fs-color], .color-btn[data-td-fs-bg-color]'
        ).forEach((btn) => {
            btn.setAttribute('aria-pressed', btn.classList.contains('active') ? 'true' : 'false');
        });

        [
            'td-custom-time-color-picker',
            'td-custom-bg-color-picker',
            'td-custom-fs-color-picker',
            'td-custom-fs-bg-color-picker'
        ].forEach((pickerId) => {
            const trigger = document.querySelector(`label[for="${pickerId}"]`);
            if (trigger) {
                trigger.setAttribute('aria-pressed', trigger.classList.contains('active') ? 'true' : 'false');
            }
        });
    }
    
    setupEventListeners() {
        // Open buttons
        const areaSettingsBtn = document.getElementById('time-display-area-settings-btn');
        
        if (areaSettingsBtn) {
            areaSettingsBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.show();
            });
        }
        
        // Close button
        const closeBtn = document.getElementById('time-display-settings-close-btn');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => this.hide());
        }
        
        // Close on background click
        if (this.modal) {
            this.modal.addEventListener('click', (e) => {
                if (e.target === this.modal) {
                    this.hide();
                }
            });
        }
    }
    
    setupSettingsControls() {
        // Display type buttons - instant apply
        document.querySelectorAll('.display-option-btn[data-td-display-type]').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.display-option-btn[data-td-display-type]').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.applySettings(); // Instant apply
            });
        });
        
        // Fullscreen mode buttons - instant apply
        document.querySelectorAll('.fullscreen-mode-btn[data-td-mode]').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.fullscreen-mode-btn[data-td-mode]').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.applySettings(); // Instant apply
            });
        });
        
        // Color buttons - instant apply
        document.querySelectorAll('.color-btn[data-td-time-color]').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.color-btn[data-td-time-color]').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                // Deactivate custom time color picker
                const customTimeColorPickerBtn = document.querySelector('label[for="td-custom-time-color-picker"]');
                if (customTimeColorPickerBtn) {
                    customTimeColorPickerBtn.classList.remove('active');
                }
                this.updateColorControlAccessibility();
                this.applySettings(); // Instant apply
            });
        });
        
        document.querySelectorAll('.color-btn[data-td-time-bg-color]').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.color-btn[data-td-time-bg-color]').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                // Deactivate custom color picker
                const customBgColorPickerBtn = document.querySelector('label[for="td-custom-bg-color-picker"]');
                if (customBgColorPickerBtn) {
                    customBgColorPickerBtn.classList.remove('active');
                }
                this.updateColorControlAccessibility();
                this.applySettings(); // Instant apply
            });
        });
        
        // Custom color pickers - instant apply
        const customTimeColorPicker = document.getElementById('td-custom-time-color-picker');
        if (customTimeColorPicker) {
            const customTimeColorPickerBtn = document.querySelector('label[for="td-custom-time-color-picker"]');
            customTimeColorPicker.addEventListener('change', (e) => {
                // Deactivate all preset color buttons
                document.querySelectorAll('.color-btn[data-td-time-color]').forEach(b => b.classList.remove('active'));
                // Store custom color as data attribute for later use
                customTimeColorPicker.dataset.selectedColor = e.target.value;
                // Mark color picker button as active
                if (customTimeColorPickerBtn) {
                    customTimeColorPickerBtn.classList.add('active');
                }
                this.updateColorControlAccessibility();
                this.applySettings(); // Instant apply
            });
        }
        
        const customBgColorPicker = document.getElementById('td-custom-bg-color-picker');
        if (customBgColorPicker) {
            const customBgColorPickerBtn = document.querySelector('label[for="td-custom-bg-color-picker"]');
            customBgColorPicker.addEventListener('change', (e) => {
                // Deactivate all preset color buttons
                document.querySelectorAll('.color-btn[data-td-time-bg-color]').forEach(b => b.classList.remove('active'));
                // Store custom color as data attribute for later use
                customBgColorPicker.dataset.selectedColor = e.target.value;
                // Mark color picker button as active
                if (customBgColorPickerBtn) {
                    customBgColorPickerBtn.classList.add('active');
                }
                this.updateColorControlAccessibility();
                this.applySettings(); // Instant apply
            });
        }
        
        // Timezone, time format, date format - instant apply
        const tzSelect = document.getElementById('td-timezone-select');
        if (tzSelect) {
            tzSelect.addEventListener('change', () => this.applySettings());
        }
        
        const tfSelect = document.getElementById('td-time-format-select');
        if (tfSelect) {
            tfSelect.addEventListener('change', () => this.applySettings());
        }
        
        const dfSelect = document.getElementById('td-date-format-select');
        if (dfSelect) {
            dfSelect.addEventListener('change', () => this.applySettings());
        }
        
        // Font size slider sync - instant apply
        const fontSlider = document.getElementById('td-time-font-size-slider');
        const fontInput = document.getElementById('td-time-font-size-input');
        const fontValue = document.getElementById('td-time-font-size-value');
        
        if (fontSlider && fontInput) {
            fontSlider.addEventListener('input', () => {
                fontInput.value = fontSlider.value;
                if (fontValue) fontValue.textContent = fontSlider.value;
                this.applySettings(); // Instant apply on drag
            });
            fontInput.addEventListener('input', () => {
                fontSlider.value = fontInput.value;
                if (fontValue) fontValue.textContent = fontInput.value;
                this.applySettings(); // Instant apply on type
            });
        }
        
        // Opacity slider sync - instant apply
        const opacitySlider = document.getElementById('td-time-opacity-slider');
        const opacityInput = document.getElementById('td-time-opacity-input');
        const opacityValue = document.getElementById('td-time-opacity-value');
        
        if (opacitySlider && opacityInput) {
            opacitySlider.addEventListener('input', () => {
                opacityInput.value = opacitySlider.value;
                if (opacityValue) opacityValue.textContent = opacitySlider.value;
                this.applySettings(); // Instant apply on drag
            });
            opacityInput.addEventListener('input', () => {
                opacitySlider.value = opacityInput.value;
                if (opacityValue) opacityValue.textContent = opacityInput.value;
                this.applySettings(); // Instant apply on type
            });
        }
        
        // Fullscreen font size slider sync - instant apply
        const fsFontSlider = document.getElementById('td-time-fullscreen-font-size-slider');
        const fsFontInput = document.getElementById('td-time-fullscreen-font-size-input');
        const fsFontValue = document.getElementById('td-time-fullscreen-font-size-value');
        
        if (fsFontSlider && fsFontInput) {
            fsFontSlider.addEventListener('input', () => {
                fsFontInput.value = fsFontSlider.value;
                if (fsFontValue) fsFontValue.textContent = fsFontSlider.value;
                this.applySettings(); // Instant apply on drag
            });
            fsFontInput.addEventListener('input', () => {
                fsFontSlider.value = fsFontInput.value;
                if (fsFontValue) fsFontValue.textContent = fsFontInput.value;
                this.applySettings(); // Instant apply on type
            });
        }

        // Fullscreen Color buttons - instant apply
        document.querySelectorAll('.color-btn[data-td-fs-color]').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.color-btn[data-td-fs-color]').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                const customBtn = document.querySelector('label[for="td-custom-fs-color-picker"]');
                if (customBtn) customBtn.classList.remove('active');
                this.updateColorControlAccessibility();
                this.applySettings();
            });
        });

        document.querySelectorAll('.color-btn[data-td-fs-bg-color]').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.color-btn[data-td-fs-bg-color]').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                const customBtn = document.querySelector('label[for="td-custom-fs-bg-color-picker"]');
                if (customBtn) customBtn.classList.remove('active');
                this.updateColorControlAccessibility();
                this.applySettings();
            });
        });

        // Fullscreen Custom color pickers
        const customFsColorPicker = document.getElementById('td-custom-fs-color-picker');
        if (customFsColorPicker) {
            const customBtn = document.querySelector('label[for="td-custom-fs-color-picker"]');
            const handler = (e) => {
                document.querySelectorAll('.color-btn[data-td-fs-color]').forEach(b => b.classList.remove('active'));
                customFsColorPicker.dataset.selectedColor = e.target.value;
                if (customBtn) customBtn.classList.add('active');
                this.updateColorControlAccessibility();
                this.applySettings();
            };
            customFsColorPicker.addEventListener('change', handler);
            customFsColorPicker.addEventListener('input', handler);
        }

        const customFsBgColorPicker = document.getElementById('td-custom-fs-bg-color-picker');
        if (customFsBgColorPicker) {
            const customBtn = document.querySelector('label[for="td-custom-fs-bg-color-picker"]');
            const handler = (e) => {
                document.querySelectorAll('.color-btn[data-td-fs-bg-color]').forEach(b => b.classList.remove('active'));
                customFsBgColorPicker.dataset.selectedColor = e.target.value;
                if (customBtn) customBtn.classList.add('active');
                this.updateColorControlAccessibility();
                this.applySettings();
            };
            customFsBgColorPicker.addEventListener('change', handler);
            customFsBgColorPicker.addEventListener('input', handler);
        }

        // Fullscreen Opacity slider
        const fsOpacitySlider = document.getElementById('td-fs-opacity-slider');
        const fsOpacityInput = document.getElementById('td-fs-opacity-input');
        const fsOpacityValue = document.getElementById('td-fs-opacity-value');

        if (fsOpacitySlider && fsOpacityInput) {
            fsOpacitySlider.addEventListener('input', () => {
                fsOpacityInput.value = fsOpacitySlider.value;
                if (fsOpacityValue) fsOpacityValue.textContent = fsOpacitySlider.value;
                this.applySettings();
            });
            fsOpacityInput.addEventListener('input', () => {
                fsOpacitySlider.value = fsOpacityInput.value;
                if (fsOpacityValue) fsOpacityValue.textContent = fsOpacityInput.value;
                this.applySettings();
            });
        }

        // Tab Switching Logic
        const tabBtns = this.modal ? this.modal.querySelectorAll('.timer-tab-btn') : [];
        const tabContents = this.modal ? this.modal.querySelectorAll('.td-tab-content') : [];

        if (tabBtns.length > 0) {
            tabBtns.forEach(btn => {
                btn.addEventListener('click', () => {
                    const targetTab = btn.dataset.tab;

                    // Update button states
                    tabBtns.forEach(b => b.classList.remove('active'));
                    btn.classList.add('active');

                    // Update content visibility
                    tabContents.forEach(content => {
                        if (content.id === `td-tab-content-${targetTab}`) {
                            content.classList.add('active');
                        } else {
                            content.classList.remove('active');
                        }
                    });
                });
            });
        }
    }
    
    show() {
        if (this.modal) {
            window.drawingBoard?.syncResizableModalState?.('time-display-settings-modal');
            this.modal.classList.add('show');
            this.syncSettings();
        }
    }
    
    hide() {
        if (this.modal) {
            this.modal.classList.remove('show');
        }
    }
    
    syncSettings() {
        if (!this.timeDisplayManager) return;
        
        // Sync display type
        const displayType = this.timeDisplayManager.showTime && this.timeDisplayManager.showDate ? 'both' :
                           this.timeDisplayManager.showDate ? 'date-only' : 'time-only';
        document.querySelectorAll('.display-option-btn[data-td-display-type]').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.tdDisplayType === displayType);
        });
        
        // Sync timezone
        const tzSelect = document.getElementById('td-timezone-select');
        if (tzSelect) tzSelect.value = this.timeDisplayManager.timezone || 'Asia/Shanghai';
        
        // Sync time format
        const tfSelect = document.getElementById('td-time-format-select');
        if (tfSelect) tfSelect.value = this.timeDisplayManager.timeFormat || '24h';
        
        // Sync date format
        const dfSelect = document.getElementById('td-date-format-select');
        if (dfSelect) dfSelect.value = this.timeDisplayManager.dateFormat || 'yyyy-mm-dd';
        
        // Sync font size
        const fontSlider = document.getElementById('td-time-font-size-slider');
        const fontInput = document.getElementById('td-time-font-size-input');
        const fontValue = document.getElementById('td-time-font-size-value');
        if (fontSlider && fontInput) {
            fontSlider.value = this.timeDisplayManager.fontSize || 16;
            fontInput.value = this.timeDisplayManager.fontSize || 16;
            if (fontValue) fontValue.textContent = this.timeDisplayManager.fontSize || 16;
        }
        
        // Sync opacity
        const opacitySlider = document.getElementById('td-time-opacity-slider');
        const opacityInput = document.getElementById('td-time-opacity-input');
        const opacityValue = document.getElementById('td-time-opacity-value');
        const opacity = this.timeDisplayManager.opacity || 100; // Already in 0-100 range, no need to multiply
        if (opacitySlider && opacityInput) {
            opacitySlider.value = opacity;
            opacityInput.value = opacity;
            if (opacityValue) opacityValue.textContent = opacity;
        }

        // Sync colors
        const timeColor = this.timeDisplayManager.timeColor || this.timeDisplayManager.color || '#000000';
        let foundTimeColor = false;
        document.querySelectorAll('.color-btn[data-td-time-color]').forEach(btn => {
            if (btn.dataset.tdTimeColor.toLowerCase() === timeColor.toLowerCase()) {
                btn.classList.add('active');
                foundTimeColor = true;
            } else {
                btn.classList.remove('active');
            }
        });

        const customTimeColorBtn = document.querySelector('label[for="td-custom-time-color-picker"]');
        const customTimeColorPicker = document.getElementById('td-custom-time-color-picker');

        if (!foundTimeColor && customTimeColorBtn) {
            customTimeColorBtn.classList.add('active');
            if (customTimeColorPicker) {
                customTimeColorPicker.value = timeColor;
                customTimeColorPicker.dataset.selectedColor = timeColor;
            }
        } else if (customTimeColorBtn) {
            customTimeColorBtn.classList.remove('active');
        }

        // Sync bg color
        const bgColor = this.timeDisplayManager.bgColor || '#FFFFFF';
        let foundBgColor = false;
        document.querySelectorAll('.color-btn[data-td-time-bg-color]').forEach(btn => {
            if (btn.dataset.tdTimeBgColor.toLowerCase() === bgColor.toLowerCase()) {
                btn.classList.add('active');
                foundBgColor = true;
            } else {
                btn.classList.remove('active');
            }
        });

        const customBgColorBtn = document.querySelector('label[for="td-custom-bg-color-picker"]');
        const customBgColorPicker = document.getElementById('td-custom-bg-color-picker');

        if (!foundBgColor && customBgColorBtn && bgColor !== 'transparent') {
            customBgColorBtn.classList.add('active');
            if (customBgColorPicker) {
                if (bgColor.startsWith('#') && bgColor.length === 7) {
                    customBgColorPicker.value = bgColor;
                }
                customBgColorPicker.dataset.selectedColor = bgColor;
            }
        } else if (customBgColorBtn) {
            customBgColorBtn.classList.remove('active');
        }
        
        // Sync fullscreen mode
        const fsMode = this.timeDisplayManager.fullscreenMode || 'double';
        document.querySelectorAll('.fullscreen-mode-btn[data-td-mode]').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.tdMode === fsMode);
        });
        
        // Sync fullscreen font size
        const fsFontSlider = document.getElementById('td-time-fullscreen-font-size-slider');
        const fsFontInput = document.getElementById('td-time-fullscreen-font-size-input');
        const fsFontValue = document.getElementById('td-time-fullscreen-font-size-value');
        if (fsFontSlider && fsFontInput) {
            fsFontSlider.value = this.timeDisplayManager.fullscreenFontSize || 15;
            fsFontInput.value = this.timeDisplayManager.fullscreenFontSize || 15;
            if (fsFontValue) fsFontValue.textContent = this.timeDisplayManager.fullscreenFontSize || 15;
        }

        // Sync fullscreen colors
        const fsColor = this.timeDisplayManager.fullscreenColor || '#ffffff';
        let foundFsColor = false;
        document.querySelectorAll('.color-btn[data-td-fs-color]').forEach(btn => {
            if (btn.dataset.tdFsColor.toLowerCase() === fsColor.toLowerCase()) {
                btn.classList.add('active');
                foundFsColor = true;
            } else {
                btn.classList.remove('active');
            }
        });
        const customFsColorBtn = document.querySelector('label[for="td-custom-fs-color-picker"]');
        if (!foundFsColor && customFsColorBtn) {
            customFsColorBtn.classList.add('active');
            const picker = document.getElementById('td-custom-fs-color-picker');
            if (picker) picker.value = fsColor;
        } else if (customFsColorBtn) {
            customFsColorBtn.classList.remove('active');
        }

        const fsBgColor = this.timeDisplayManager.fullscreenBgColor || '#000000';
        let foundFsBgColor = false;
        document.querySelectorAll('.color-btn[data-td-fs-bg-color]').forEach(btn => {
            if (btn.dataset.tdFsBgColor.toLowerCase() === fsBgColor.toLowerCase()) {
                btn.classList.add('active');
                foundFsBgColor = true;
            } else {
                btn.classList.remove('active');
            }
        });
        const customFsBgColorBtn = document.querySelector('label[for="td-custom-fs-bg-color-picker"]');
        if (!foundFsBgColor && customFsBgColorBtn) {
            customFsBgColorBtn.classList.add('active');
            const picker = document.getElementById('td-custom-fs-bg-color-picker');
            if (picker) picker.value = fsBgColor;
        } else if (customFsBgColorBtn) {
            customFsBgColorBtn.classList.remove('active');
        }

        // Sync fullscreen opacity
        const fsOpacitySlider = document.getElementById('td-fs-opacity-slider');
        const fsOpacityInput = document.getElementById('td-fs-opacity-input');
        const fsOpacityValue = document.getElementById('td-fs-opacity-value');
        if (fsOpacitySlider && fsOpacityInput) {
            const opacity = this.timeDisplayManager.fullscreenOpacity || 95;
            fsOpacitySlider.value = opacity;
            fsOpacityInput.value = opacity;
            if (fsOpacityValue) fsOpacityValue.textContent = opacity;
        }

        this.updateColorControlAccessibility();
    }
    
    applySettings() {
        if (!this.timeDisplayManager) return;
        
        // Get display type
        const activeDisplayBtn = document.querySelector('.display-option-btn[data-td-display-type].active');
        const displayType = activeDisplayBtn ? activeDisplayBtn.dataset.tdDisplayType : 'both';
        this.timeDisplayManager.showDate = displayType === 'both' || displayType === 'date-only';
        this.timeDisplayManager.showTime = displayType === 'both' || displayType === 'time-only';
        
        // Get timezone
        const tzSelect = document.getElementById('td-timezone-select');
        if (tzSelect) this.timeDisplayManager.timezone = tzSelect.value;
        
        // Get time format
        const tfSelect = document.getElementById('td-time-format-select');
        if (tfSelect) this.timeDisplayManager.timeFormat = tfSelect.value;
        
        // Get date format
        const dfSelect = document.getElementById('td-date-format-select');
        if (dfSelect) this.timeDisplayManager.dateFormat = dfSelect.value;
        
        // Get colors
        const activeColorBtn = document.querySelector('.color-btn[data-td-time-color].active');
        const customTimeColorPicker = document.getElementById('td-custom-time-color-picker');
        const customTimeColorPickerBtn = document.querySelector('label[for="td-custom-time-color-picker"]');
        
        if (activeColorBtn) {
            this.timeDisplayManager.timeColor = activeColorBtn.dataset.tdTimeColor;
        } else if (customTimeColorPicker && customTimeColorPicker.dataset.selectedColor) {
            // Use custom color if no preset is active
            this.timeDisplayManager.timeColor = customTimeColorPicker.dataset.selectedColor;
        }
        
        // For background color, check preset buttons first, then fallback to custom picker
        const activeBgColorBtn = document.querySelector('.color-btn[data-td-time-bg-color].active');
        const customBgColorPicker = document.getElementById('td-custom-bg-color-picker');
        const customBgColorPickerBtn = document.querySelector('label[for="td-custom-bg-color-picker"]');
        
        if (activeBgColorBtn) {
            this.timeDisplayManager.bgColor = activeBgColorBtn.dataset.tdTimeBgColor;
        } else if (customBgColorPicker && customBgColorPickerBtn && customBgColorPickerBtn.classList.contains('active')) {
            this.timeDisplayManager.bgColor = customBgColorPicker.dataset.selectedColor || customBgColorPicker.value;
        }
        // If neither is active, keep the current bgColor (do nothing), protecting it from overwrite
        
        // Get font size
        const fontInput = document.getElementById('td-time-font-size-input');
        if (fontInput) this.timeDisplayManager.fontSize = parseInt(fontInput.value);
        
        // Get opacity
        const opacityInput = document.getElementById('td-time-opacity-input');
        if (opacityInput) this.timeDisplayManager.opacity = parseInt(opacityInput.value); // Store as 0-100, not 0-1
        
        // Get fullscreen mode
        const activeFsBtn = document.querySelector('.fullscreen-mode-btn[data-td-mode].active');
        if (activeFsBtn) this.timeDisplayManager.fullscreenMode = activeFsBtn.dataset.tdMode;
        
        // Get fullscreen font size
        const fsFontInput = document.getElementById('td-time-fullscreen-font-size-input');
        if (fsFontInput) this.timeDisplayManager.fullscreenFontSize = parseInt(fsFontInput.value);
        
        // Get fullscreen colors/opacity
        const activeFsColorBtn = document.querySelector('.color-btn[data-td-fs-color].active');
        const customFsColorPicker = document.getElementById('td-custom-fs-color-picker');
        const customFsColorBtn = document.querySelector('label[for="td-custom-fs-color-picker"]');

        if (activeFsColorBtn) {
            this.timeDisplayManager.setFullscreenColor(activeFsColorBtn.dataset.tdFsColor);
        } else if (customFsColorPicker && customFsColorBtn && customFsColorBtn.classList.contains('active')) {
            this.timeDisplayManager.setFullscreenColor(customFsColorPicker.dataset.selectedColor || customFsColorPicker.value);
        }

        const activeFsBgColorBtn = document.querySelector('.color-btn[data-td-fs-bg-color].active');
        const customFsBgColorPicker = document.getElementById('td-custom-fs-bg-color-picker');
        const customFsBgColorBtn = document.querySelector('label[for="td-custom-fs-bg-color-picker"]');

        if (activeFsBgColorBtn) {
            this.timeDisplayManager.setFullscreenBgColor(activeFsBgColorBtn.dataset.tdFsBgColor);
        } else if (customFsBgColorPicker && customFsBgColorBtn && customFsBgColorBtn.classList.contains('active')) {
            this.timeDisplayManager.setFullscreenBgColor(customFsBgColorPicker.dataset.selectedColor || customFsBgColorPicker.value);
        }

        const fsOpacityInput = document.getElementById('td-fs-opacity-input');
        if (fsOpacityInput) {
            this.timeDisplayManager.setFullscreenOpacity(parseInt(fsOpacityInput.value));
        }

        // Apply changes to the time display
        this.timeDisplayManager.applySettings();
        this.timeDisplayManager.updateDisplay();
        // Note: saveSettings() is called within applySettings() in time-display.js
    }
}

window.TimeDisplaySettingsModal = TimeDisplaySettingsModal;
window.AboardTimeDisplaySettingsModal = TimeDisplaySettingsModal;

// Export for use in main.js
if (typeof module !== 'undefined' && module.exports) {
    module.exports = TimeDisplaySettingsModal;
}
