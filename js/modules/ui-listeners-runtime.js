// Extracted UI listener runtime from main.js
// Keeps legacy instance semantics by executing with board as this.

function bindIfPresent(element, eventName, handler, options) {
        element?.addEventListener?.(eventName, handler, options);
}

function getLazyFeatureLabel(key, fallback) {
        if (!window.i18n?.t) {
            return fallback;
        }

        const translated = window.i18n.t(key);
        return translated && translated !== key ? translated : fallback;
}

function setupToolConfigListeners() {
        const customColorPicker = document.getElementById('custom-color-picker');
        const customColorPickerBtn = document.querySelector('label[for="custom-color-picker"]');
        const penSizeSlider = document.getElementById('pen-size-slider');
        const penSizeValue = document.getElementById('pen-size-value');
        const shapeSizeSlider = document.getElementById('shape-size-slider');
        const shapeSizeValue = document.getElementById('shape-size-value');
        const arrowSizeSlider = document.getElementById('arrow-size-slider');
        const arrowSizeValue = document.getElementById('arrow-size-value');
        const eraserSizeSlider = document.getElementById('eraser-size-slider');
        const eraserSizeValue = document.getElementById('eraser-size-value');
        const syncGenericColorAccessibility = () => window.i18n?.syncGenericColorControls?.();

// Pen type buttons
        document.querySelectorAll('.pen-type-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const targetButton = e.currentTarget;
                const penType = targetButton.dataset.penType;
                if (!penType) {
                    return;
                }
                this.drawingEngine.setPenType(penType);
                document.querySelectorAll('.pen-type-btn').forEach(b => b.classList.remove('active'));
                targetButton.classList.add('active');
            });
        });
        
        // Color picker
        document.querySelectorAll('.color-btn[data-color]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const targetButton = e.currentTarget;
                this.drawingEngine.setColor(targetButton.dataset.color);
                document.querySelectorAll('.color-btn[data-color]').forEach(b => b.classList.remove('active'));
                targetButton.classList.add('active');
                // Sync shape color picker value
                const shapeColorPicker = document.getElementById('shape-custom-color-picker');
                if (shapeColorPicker) {
                    shapeColorPicker.value = targetButton.dataset.color;
                }
                syncGenericColorAccessibility();
            });
        });
        
        if (customColorPicker) {
            customColorPicker.addEventListener('input', (e) => {
                this.drawingEngine.setColor(e.target.value);
                document.querySelectorAll('.color-btn[data-color]').forEach(b => b.classList.remove('active'));
                // Mark color picker button as active
                if (customColorPickerBtn) {
                    customColorPickerBtn.classList.add('active');
                }
                // Sync shape color picker
                const shapeColorPicker = document.getElementById('shape-custom-color-picker');
                if (shapeColorPicker) {
                    shapeColorPicker.value = e.target.value;
                }
                syncGenericColorAccessibility();
            });
        }
        // Deactivate color picker when a preset is selected
        document.querySelectorAll('.color-btn[data-color]').forEach(btn => {
            btn.addEventListener('click', () => {
                if (customColorPickerBtn) {
                    customColorPickerBtn.classList.remove('active');
                }
                // Also deactivate shape color picker button
                const shapeCustomColorPickerBtn = document.querySelector('label[for="shape-custom-color-picker"]');
                if (shapeCustomColorPickerBtn) {
                    shapeCustomColorPickerBtn.classList.remove('active');
                }
                syncGenericColorAccessibility();
            });
        });
        
        // Sliders
        
        // Pen size slider - syncs with shape slider
        if (penSizeSlider) {
            penSizeSlider.addEventListener('input', (e) => {
            const size = parseInt(e.target.value);
            this.drawingEngine.setPenSize(size);
            // Ensure penSizeValue element exists and update text content
            if (penSizeValue) {
                penSizeValue.textContent = size;
            }
            // Sync shape slider
            if (shapeSizeSlider) {
                shapeSizeSlider.value = size;
                if (shapeSizeValue) {
                    shapeSizeValue.textContent = size;
                }
            }

            // Enforce arrow size constraint
            if (arrowSizeSlider && arrowSizeValue) {
                if (parseInt(arrowSizeSlider.value) < size) {
                    arrowSizeSlider.value = size;
                    arrowSizeValue.textContent = size;
                    this.shapeDrawingManager?.setArrowSize?.(size);
                }
            }
            });
        }
        
        // Shape size slider - syncs with pen slider
        if (shapeSizeSlider) {
            shapeSizeSlider.addEventListener('input', (e) => {
                const size = parseInt(e.target.value);
                this.drawingEngine.setPenSize(size);
                if (shapeSizeValue) {
                    shapeSizeValue.textContent = size;
                }
                // Sync pen slider
                if (penSizeSlider) {
                    penSizeSlider.value = size;
                }
                if (penSizeValue) {
                    penSizeValue.textContent = size;
                }

                // Enforce arrow size constraint
                if (arrowSizeSlider && arrowSizeValue) {
                    if (parseInt(arrowSizeSlider.value) < size) {
                        arrowSizeSlider.value = size;
                        arrowSizeValue.textContent = size;
                        this.shapeDrawingManager?.setArrowSize?.(size);
                    }
                }
            });
        }
        
        // Eraser shape buttons
        document.querySelectorAll('.eraser-shape-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const targetBtn = e.currentTarget;
                this.drawingEngine.setEraserShape(targetBtn.dataset.eraserShape);
                document.querySelectorAll('.eraser-shape-btn').forEach(b => b.classList.remove('active'));
                targetBtn.classList.add('active');
                // Update cursor shape
                this.updateEraserCursorShape();
            });
        });
        
        if (eraserSizeSlider) {
            eraserSizeSlider.addEventListener('input', (e) => {
                this.drawingEngine.setEraserSize(parseInt(e.target.value));
                if (eraserSizeValue) {
                    eraserSizeValue.textContent = e.target.value;
                }
                if (this.drawingEngine.currentTool === 'eraser' && this.eraserCursor) {
                    this.eraserCursor.style.width = e.target.value + 'px';
                    this.eraserCursor.style.height = e.target.value + 'px';
                }
            });
        }
        this.syncEraserSizeControls();
        
        // Line style settings buttons (open modal)
        const penLineStyleSettingsBtn = document.getElementById('pen-line-style-settings-btn');
        if (penLineStyleSettingsBtn) {
            penLineStyleSettingsBtn.addEventListener('click', () => {
                this.lineStyleModal.show('pen');
            });
        }

}

function setupShapeToolConfigListeners() {
        const shapeSizeSlider = document.getElementById('shape-size-slider');
        const shapeSizeValue = document.getElementById('shape-size-value');
        const arrowSizeSlider = document.getElementById('arrow-size-slider');
        const arrowSizeValue = document.getElementById('arrow-size-value');
        const arrowSizeGroup = document.getElementById('arrow-size-group');
        const shapeCustomColorPicker = document.getElementById('shape-custom-color-picker');
        const shapeCustomColorPickerBtn = document.querySelector('label[for="shape-custom-color-picker"]');
        const penColorPicker = document.getElementById('custom-color-picker');
        const penColorPickerBtn = document.querySelector('label[for="custom-color-picker"]');
        const syncGenericColorAccessibility = () => window.i18n?.syncGenericColorControls?.();

        if (shapeSizeSlider && shapeSizeValue) {
            shapeSizeSlider.value = this.drawingEngine.penSize;
            shapeSizeValue.textContent = this.drawingEngine.penSize;

            shapeSizeSlider.addEventListener('input', (e) => {
                const size = parseInt(e.target.value);
                this.drawingEngine.setPenSize(size);
                shapeSizeValue.textContent = size;

                const penSizeSlider = document.getElementById('pen-size-slider');
                const penSizeValue = document.getElementById('pen-size-value');
                if (penSizeSlider) {
                    penSizeSlider.value = size;
                }
                if (penSizeValue) {
                    penSizeValue.textContent = size;
                }

                if (arrowSizeSlider && arrowSizeValue && parseInt(arrowSizeSlider.value) < size) {
                    arrowSizeSlider.value = size;
                    arrowSizeValue.textContent = size;
                    this.shapeDrawingManager.setArrowSize(size);
                }
            });
        }

        if (arrowSizeSlider && arrowSizeValue) {
            arrowSizeSlider.value = this.shapeDrawingManager.arrowSize;
            arrowSizeValue.textContent = this.shapeDrawingManager.arrowSize;

            arrowSizeSlider.addEventListener('input', (e) => {
                let val = parseInt(e.target.value);
                const minSize = this.drawingEngine.penSize;
                if (val < minSize) {
                    val = minSize;
                    e.target.value = val;
                }
                this.shapeDrawingManager.setArrowSize(val);
                arrowSizeValue.textContent = val;
            });
        }

        if (shapeCustomColorPicker) {
            shapeCustomColorPicker.value = this.drawingEngine.currentColor;
            shapeCustomColorPicker.addEventListener('input', (e) => {
                this.drawingEngine.setColor(e.target.value);
                document.querySelectorAll('.color-btn[data-color]').forEach(b => b.classList.remove('active'));
                if (shapeCustomColorPickerBtn) {
                    shapeCustomColorPickerBtn.classList.add('active');
                }
                if (penColorPicker) {
                    penColorPicker.value = e.target.value;
                }
                if (penColorPickerBtn) {
                    penColorPickerBtn.classList.add('active');
                }
                syncGenericColorAccessibility();
            });
        }

        document.querySelectorAll('.shape-type-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.shapeType === this.shapeDrawingManager.currentShape);
            btn.addEventListener('click', (e) => {
                const targetButton = e.currentTarget;
                const shapeType = targetButton.dataset.shapeType;
                this.shapeDrawingManager.setShape(shapeType);
                document.querySelectorAll('.shape-type-btn').forEach(b => b.classList.remove('active'));
                targetButton.classList.add('active');

                if (arrowSizeGroup) {
                    arrowSizeGroup.style.display = (shapeType === 'arrow' || shapeType === 'doubleArrow') ? '' : 'none';
                }
            });
        });

        if (arrowSizeGroup) {
            const currentShape = this.shapeDrawingManager.currentShape;
            arrowSizeGroup.style.display = (currentShape === 'arrow' || currentShape === 'doubleArrow') ? '' : 'none';
        }

        const shapeLineStyleSettingsBtn = document.getElementById('shape-line-style-settings-btn');
        if (shapeLineStyleSettingsBtn) {
            shapeLineStyleSettingsBtn.addEventListener('click', () => {
                this.lineStyleModal.show('shape');
            });
        }
}

function setupSelectToolConfigListeners() {
        document.querySelectorAll('.select-mode-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.mode === this.selectionManager?.selectionMode);
            btn.addEventListener('click', (e) => {
                document.querySelectorAll('.select-mode-btn').forEach(b => b.classList.remove('active'));
                e.currentTarget.classList.add('active');
                const mode = e.currentTarget.dataset.mode;
                if (this.selectionManager) {
                    this.selectionManager.selectionMode = mode;
                }
            });
        });
}

function setupMoreFeatureToolConfigListeners() {
        // Timer Feature Button
        const timerFeatureBtn = document.getElementById('timer-feature-btn');
        if (timerFeatureBtn) {
            timerFeatureBtn.addEventListener('click', async () => {
                this.exitShapeMode();
                try {
                    const timerManager = await this.getTimerManager();
                    timerManager.showSettingsModal();
                    this.handleMoreFeaturePanelAfterAction();
                } catch (error) {
                    this.showLazyLoadError(getLazyFeatureLabel('features.timer', 'Timer'), error);
                }
            });
        }

        // Insert Text Feature Button
        const insertTextBtn = document.getElementById('insert-text-feature-btn');
        if (insertTextBtn) {
            insertTextBtn.addEventListener('click', async () => {
                this.exitShapeMode();
                try {
                    const insertTextManager = await this.getInsertTextManager();
                    insertTextManager.trigger();
                    this.handleMoreFeaturePanelAfterAction();
                } catch (error) {
                    this.showLazyLoadError(getLazyFeatureLabel('features.insertText', 'Insert Text'), error);
                }
            });
        }

        // Random Picker Feature Button
        const randomPickerBtn = document.getElementById('random-picker-feature-btn');
        if (randomPickerBtn) {
            randomPickerBtn.addEventListener('click', async () => {
                this.exitShapeMode();
                try {
                    const randomPickerManager = await this.getRandomPickerManager();
                    randomPickerManager.create();
                    this.bringLatestElement('.random-picker-widget');
                    this.handleMoreFeaturePanelAfterAction();
                } catch (error) {
                    this.showLazyLoadError(getLazyFeatureLabel('features.randomPicker', 'Random Picker'), error);
                }
            });
        }

        // Scoreboard Feature Button
        const scoreboardBtn = document.getElementById('scoreboard-feature-btn');
        if (scoreboardBtn) {
            scoreboardBtn.addEventListener('click', async () => {
                this.exitShapeMode();
                try {
                    const scoreboardManager = await this.getScoreboardManager();
                    scoreboardManager.create();
                    this.bringLatestElement('.scoreboard-widget');
                    this.handleMoreFeaturePanelAfterAction();
                } catch (error) {
                    this.showLazyLoadError(getLazyFeatureLabel('features.scoreboard', 'Scoreboard'), error);
                }
            });
        }

        // Insert Image Feature Button
        const insertImageBtn = document.getElementById('insert-image-feature-btn');
        if (insertImageBtn) {
            insertImageBtn.addEventListener('click', async () => {
                try {
                    this.exitShapeMode();
                    const insertImageManager = await this.getInsertImageManager();
                    insertImageManager.triggerSelect();
                    this.handleMoreFeaturePanelAfterAction();
                } catch (error) {
                    this.showLazyLoadError(getLazyFeatureLabel('features.insertImage', 'Insert Image'), error);
                }
            });
        }
        
        // Timer settings modal close button
        const timerSettingsCloseBtn = document.getElementById('timer-settings-close-btn');
        if (timerSettingsCloseBtn) {
            timerSettingsCloseBtn.addEventListener('click', () => {
                if (this.timerManager) {
                    this.timerManager.hideSettingsModal();
                }
            });
        }
        
}

function setupBackgroundToolConfigListeners() {
        const syncGenericColorAccessibility = () => window.i18n?.syncGenericColorControls?.();
        // Background color picker
        document.querySelectorAll('.color-btn[data-bg-color]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const targetButton = e.currentTarget;
                this.backgroundManager.setBackgroundColor(targetButton.dataset.bgColor);
                document.querySelectorAll('.color-btn[data-bg-color]').forEach(b => b.classList.remove('active'));
                targetButton.classList.add('active');
                // Save page background in paginated mode
                if (!this.settingsManager.infiniteCanvas) {
                    this.savePageBackground(this.currentPage);
                }
                syncGenericColorAccessibility();
            });
        });
        
        const customBgColorPicker = document.getElementById('custom-bg-color-picker');
        const customBgColorPickerBtn = document.querySelector('label[for="custom-bg-color-picker"]');
        if (customBgColorPicker) {
            customBgColorPicker.addEventListener('input', (e) => {
                this.backgroundManager.setBackgroundColor(e.target.value);
                document.querySelectorAll('.color-btn[data-bg-color]').forEach(b => b.classList.remove('active'));
                // Mark color picker button as active
                if (customBgColorPickerBtn) {
                    customBgColorPickerBtn.classList.add('active');
                }
                // Save page background in paginated mode
                if (!this.settingsManager.infiniteCanvas) {
                    this.savePageBackground(this.currentPage);
                }
                syncGenericColorAccessibility();
            });
        }
        // Deactivate color picker when a preset is selected
        document.querySelectorAll('.color-btn[data-bg-color]').forEach(btn => {
            btn.addEventListener('click', () => {
                if (customBgColorPickerBtn) {
                    customBgColorPickerBtn.classList.remove('active');
                }
                syncGenericColorAccessibility();
            });
        });
        
        // Background pattern buttons
        document.querySelectorAll('#pattern-grid .pattern-option-btn[data-pattern]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                // Use currentTarget to ensure we get the data from the button, not its children
                const pattern = e.currentTarget.dataset.pattern;
                if (pattern === 'image') {
                    document.getElementById('bg-image-upload')?.click();
                } else {
                    this.backgroundManager.setBackgroundPattern(pattern);
                    this.updateBackgroundUI();

                    if (!this.backgroundManager.supportsMovableOrigin(pattern)) {
                        this.disableCoordinateOriginDragMode();
                        this.setCoordinatePointMode(false);
                    }
                    
                    // Save page background in paginated mode
                    if (!this.settingsManager.infiniteCanvas) {
                        this.savePageBackground(this.currentPage);
                    }
                }
            });
        });
        
        // Background image upload
        bindIfPresent(document.getElementById('bg-image-upload'), 'change', (e) => {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = async (event) => {
                    const imageData = event.target.result;
                    
                    // Reset confirmation state for new image
                    this.imageControls.resetConfirmation();
                    
                    await this.backgroundManager.setBackgroundImage(imageData);
                    this.updateBackgroundUI();
                    this.setCoordinatePointMode(false);
                    
                    // Save uploaded image
                    this.saveUploadedImage(imageData);
                    
                    // Show image controls for manipulation
                    const imgData = this.backgroundManager.getImageData();
                    if (imgData) {
                        this.imageControls.showControls(imgData);
                    }
                };
                reader.readAsDataURL(file);
            }
        });

        const refreshBackgroundMediaControls = () => {
            const playbackBtn = document.getElementById('bg-image-playback-btn');
            if (!playbackBtn) return;

            const isGif = this.backgroundManager.isGif(this.backgroundManager.backgroundImageData);
            playbackBtn.style.display = isGif ? 'inline-flex' : 'none';
            const playbackLabel = this.backgroundManager.isImagePaused
                ? (window.i18n?.t?.('timer.continue') || 'Continue')
                : (window.i18n?.t?.('timer.pause') || 'Pause');
            playbackBtn.title = playbackLabel;
            playbackBtn.setAttribute('aria-label', playbackLabel);

            if (this.backgroundManager.isImagePaused) {
                playbackBtn.classList.add('paused');
                playbackBtn.innerHTML = `
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <polygon points="5 3 19 12 5 21 5 3"></polygon>
                    </svg>
                `;
            } else {
                playbackBtn.classList.remove('paused');
                playbackBtn.innerHTML = `
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <rect x="6" y="4" width="4" height="16"></rect>
                        <rect x="14" y="4" width="4" height="16"></rect>
                    </svg>
                `;
            }
        };

        window.addEventListener('backgroundMediaStateChanged', refreshBackgroundMediaControls);
        window.addEventListener('localeChanged', refreshBackgroundMediaControls);
        
        // Background image size slider
        const bgImageSizeSlider = document.getElementById('bg-image-size-slider');
        const bgImageSizeValue = document.getElementById('bg-image-size-value');
        if (bgImageSizeSlider) {
            bgImageSizeSlider.addEventListener('input', (e) => {
                this.backgroundManager.setImageSize(parseInt(e.target.value) / 100);
                if (bgImageSizeValue) bgImageSizeValue.textContent = e.target.value;
            });
        }
        
        // Adjust background image button
        const adjustBgImageBtn = document.getElementById('adjust-bg-image-btn');
        if (adjustBgImageBtn) {
            adjustBgImageBtn.addEventListener('click', () => {
                // Reset confirmation state to allow re-adjustment
                this.imageControls.resetConfirmation();
                
                // Show image controls for the current background image
                const imgData = this.backgroundManager.getImageData();
                if (imgData) {
                    this.imageControls.showControls(imgData);
                }
            });
        }

        // Background GIF settings button
        const gifSettingsBtn = document.getElementById('bg-gif-settings-btn');
        const gifSettingsModal = document.getElementById('gif-settings-modal');
        const gifSettingsInput = document.getElementById('gif-loop-count-input');
        const gifSettingsCloseBtn = document.getElementById('gif-settings-close-btn');
        const gifSettingsCancelBtn = document.getElementById('gif-settings-cancel-btn');
        const scheduleModalFrame = typeof window.requestAnimationFrame === 'function'
            ? window.requestAnimationFrame.bind(window)
            : (callback) => callback();
        const closeGifSettingsModal = () => {
            if (!gifSettingsModal) {
                return;
            }
            gifSettingsModal.classList.remove('show');
            const restoreFocusTarget = this.gifSettingsPreviouslyFocusedElement;
            this.gifSettingsPreviouslyFocusedElement = null;
            scheduleModalFrame(() => {
                restoreFocusTarget?.focus?.();
            });
        };
        if (gifSettingsModal) {
            gifSettingsModal.setAttribute('role', 'dialog');
            gifSettingsModal.setAttribute('aria-modal', 'true');
            gifSettingsModal.setAttribute('aria-labelledby', 'gif-settings-title');
            gifSettingsModal.setAttribute('aria-describedby', 'gif-loop-count-input');
            gifSettingsModal.tabIndex = -1;
            if (gifSettingsModal.dataset.keyboardBindingsInitialized !== 'true') {
                gifSettingsModal.dataset.keyboardBindingsInitialized = 'true';
                gifSettingsModal.addEventListener('keydown', (event) => {
                    if (event.key === 'Escape') {
                        event.preventDefault();
                        closeGifSettingsModal();
                    }
                });
                gifSettingsModal.addEventListener('click', (event) => {
                    if (event.target === gifSettingsModal) {
                        closeGifSettingsModal();
                    }
                });
            }
        }
        if (gifSettingsBtn && gifSettingsModal) {
            gifSettingsBtn.addEventListener('click', () => {
                this.gifSettingsPreviouslyFocusedElement = document.activeElement && document.activeElement !== document.body
                    ? document.activeElement
                    : null;
                if (gifSettingsInput) {
                    gifSettingsInput.value = this.backgroundManager.gifLoopCount;
                }
                gifSettingsModal.classList.add('show');
                scheduleModalFrame(() => {
                    (gifSettingsInput || gifSettingsCloseBtn || gifSettingsModal)?.focus?.();
                });
            });
        }

        if (gifSettingsCancelBtn && gifSettingsModal) {
            gifSettingsCancelBtn.addEventListener('click', () => {
                closeGifSettingsModal();
            });
        }

        const gifSettingsOkBtn = document.getElementById('gif-settings-ok-btn');
        if (gifSettingsOkBtn && gifSettingsModal) {
            gifSettingsOkBtn.addEventListener('click', () => {
                if (gifSettingsInput) {
                    this.backgroundManager.setGifLoopCount(parseInt(gifSettingsInput.value));
                }
                closeGifSettingsModal();
            });
        }

        if (gifSettingsCloseBtn && gifSettingsModal) {
            gifSettingsCloseBtn.addEventListener('click', () => {
                closeGifSettingsModal();
            });
        }

        // Background playback toggle (for GIFs)
        const playbackBtn = document.getElementById('bg-image-playback-btn');
        if (playbackBtn) {
            playbackBtn.addEventListener('click', () => {
                this.backgroundManager.toggleImagePlayback();
            });

            // Listen for auto-pause event from background manager
            window.addEventListener('backgroundGifPaused', refreshBackgroundMediaControls);
            refreshBackgroundMediaControls();
        }
        
        // Pattern density slider
        const patternDensitySlider = document.getElementById('pattern-density-slider');
        const patternDensityValue = document.getElementById('pattern-density-value');
        if (patternDensitySlider && patternDensityValue) {
            patternDensitySlider.addEventListener('input', (e) => {
                this.backgroundManager.setPatternDensity(parseInt(e.target.value) / 100);
                patternDensityValue.textContent = e.target.value;
            });
        }

        // Move Coordinate Origin Button
        const moveOriginBtn = document.getElementById('move-origin-btn');
        if (moveOriginBtn) {
            moveOriginBtn.addEventListener('click', () => {
                // Toggle the button active state
                const isActive = moveOriginBtn.classList.contains('active');
                
                if (isActive) {
                    this.disableCoordinateOriginDragMode();
                } else {
                    this.setCoordinatePointMode(false);
                    // Enable coordinate origin drag mode
                    moveOriginBtn.classList.add('active');
                    this.isCoordinateOriginDragMode = true;
                    
                    // Change cursor to indicate dragging is available
                    this.canvas.style.cursor = 'move';
                }
            });
        }

        const bindCoordinateOverlayCheckbox = (id, key) => {
            const checkbox = document.getElementById(id);
            if (!checkbox) return;
            checkbox.addEventListener('change', (e) => {
                this.backgroundManager.updateCoordinateOverlayOptions({ [key]: e.target.checked });
                this.savePageBackground(this.currentPage);
                this.updateBackgroundUI();
            });
        };

        bindCoordinateOverlayCheckbox('coordinate-show-ticks', 'showTicks');
        bindCoordinateOverlayCheckbox('coordinate-show-labels', 'showLabels');
        bindCoordinateOverlayCheckbox('coordinate-show-point-labels', 'showPointLabels');
        bindCoordinateOverlayCheckbox('coordinate-show-origin', 'showOrigin');
        bindCoordinateOverlayCheckbox('coordinate-snap-grid', 'snapToGrid');

        const coordinateSettingsToggleBtn = document.getElementById('coordinate-settings-toggle-btn');
        if (coordinateSettingsToggleBtn) {
            coordinateSettingsToggleBtn.addEventListener('click', () => {
                this.toggleCoordinateSettingsPanel();
            });
        }

        const coordinatePointToggleBtn = document.getElementById('coordinate-point-toggle-btn');
        if (coordinatePointToggleBtn) {
            coordinatePointToggleBtn.addEventListener('click', () => {
                this.toggleCoordinatePointPanel();
            });
        }

        const coordinateToolsModal = document.getElementById('coordinate-tools-modal');
        const coordinateToolsModalCloseBtn = document.getElementById('coordinate-tools-modal-close-btn');
        const coordinateToolsModalOkBtn = document.getElementById('coordinate-tools-modal-ok-btn');
        if (coordinateToolsModal) {
            coordinateToolsModal.setAttribute('role', 'dialog');
            coordinateToolsModal.setAttribute('aria-modal', 'true');
            coordinateToolsModal.setAttribute('aria-labelledby', 'coordinate-tools-title');
            coordinateToolsModal.setAttribute('aria-describedby', 'coordinate-tools-group');
            coordinateToolsModal.tabIndex = -1;
            if (coordinateToolsModal.dataset.keyboardBindingsInitialized !== 'true') {
                coordinateToolsModal.dataset.keyboardBindingsInitialized = 'true';
                coordinateToolsModal.addEventListener('click', (e) => {
                    if (e.target === coordinateToolsModal) {
                        this.toggleCoordinateSettingsPanel(false);
                    }
                });
                coordinateToolsModal.addEventListener('keydown', (event) => {
                    if (event.key === 'Escape') {
                        event.preventDefault();
                        this.toggleCoordinateSettingsPanel(false);
                    }
                });
            }
        }
        if (coordinateToolsModalCloseBtn) {
            coordinateToolsModalCloseBtn.addEventListener('click', () => {
                this.toggleCoordinateSettingsPanel(false);
            });
        }
        if (coordinateToolsModalOkBtn) {
            coordinateToolsModalOkBtn.addEventListener('click', () => {
                this.toggleCoordinateSettingsPanel(false);
            });
        }

        const coordinatePointModal = document.getElementById('coordinate-point-modal');
        const coordinatePointModalCloseBtn = document.getElementById('coordinate-point-modal-close-btn');
        const coordinatePointModalOkBtn = document.getElementById('coordinate-point-modal-ok-btn');
        if (coordinatePointModal) {
            coordinatePointModal.setAttribute('role', 'dialog');
            coordinatePointModal.setAttribute('aria-modal', 'true');
            coordinatePointModal.setAttribute('aria-labelledby', 'coordinate-point-title');
            coordinatePointModal.tabIndex = -1;
            if (coordinatePointModal.dataset.keyboardBindingsInitialized !== 'true') {
                coordinatePointModal.dataset.keyboardBindingsInitialized = 'true';
                coordinatePointModal.addEventListener('click', (e) => {
                    if (e.target === coordinatePointModal) {
                        this.toggleCoordinatePointPanel(false);
                    }
                });
                coordinatePointModal.addEventListener('keydown', (event) => {
                    if (event.key === 'Escape') {
                        event.preventDefault();
                        this.toggleCoordinatePointPanel(false);
                    }
                });
            }
        }
        if (coordinatePointModalCloseBtn) {
            coordinatePointModalCloseBtn.addEventListener('click', () => {
                this.toggleCoordinatePointPanel(false);
            });
        }
        if (coordinatePointModalOkBtn) {
            coordinatePointModalOkBtn.addEventListener('click', () => {
                this.toggleCoordinatePointPanel(false);
            });
        }

        const coordinateAddPointBtn = document.getElementById('coordinate-add-point-btn');
        if (coordinateAddPointBtn) {
            coordinateAddPointBtn.addEventListener('click', () => {
                const nextEnabled = !this.isCoordinatePointMode;
                this.setCoordinatePointMode(nextEnabled);
                this.showCoordinatePointModeStatus(nextEnabled);
            });
        }

        document.querySelectorAll('[data-coordinate-point-mode]').forEach((btn) => {
            btn.addEventListener('click', () => {
                const nextMode = btn.dataset.coordinatePointMode;
                if (!nextMode) return;
                this.setCoordinatePointLineMode(nextMode);
            });
        });

        const coordinateClearPointsBtn = document.getElementById('coordinate-clear-points-btn');
        if (coordinateClearPointsBtn) {
            coordinateClearPointsBtn.addEventListener('click', () => {
                this.resetSelectedCoordinateLineConnection({ clearSelection: true });
                this.backgroundManager.clearCoordinatePoints();
                this.savePageBackground(this.currentPage);
                this.updateBackgroundUI();
                this.showCoordinateToast('background.pointsCleared', 'Coordinate points cleared.', 'success');
            });
        }

        const coordinateClearPlotsBtn = document.getElementById('coordinate-clear-plots-btn');
        if (coordinateClearPlotsBtn) {
            coordinateClearPlotsBtn.addEventListener('click', () => {
                this.expandedCoordinatePlotId = null;
                this.backgroundManager.clearCoordinatePlots(this.backgroundManager.backgroundPattern);
                this.savePageBackground(this.currentPage);
                this.updateBackgroundUI();
                this.showCoordinateToast('background.plotsCleared', 'Function plots cleared.', 'success');
            });
        }

        const coordinatePlotBtn = document.getElementById('coordinate-plot-btn');
        const coordinateExpressionInput = document.getElementById('coordinate-expression-input');
        const addCoordinatePlot = () => {
            const expression = coordinateExpressionInput?.value?.trim();
            if (!expression || !this.backgroundManager.supportsMovableOrigin()) return;

            try {
                this.backgroundManager.addCoordinatePlot(expression, this.backgroundManager.backgroundPattern);
                this.expandedCoordinatePlotId = null;
                coordinateExpressionInput.value = '';
                this.syncCoordinateExpressionDisplay();
                this.savePageBackground(this.currentPage);
                this.updateBackgroundUI();
                this.showCoordinateToast('background.plotAdded', 'Function plot added.', 'success');
            } catch (error) {
                console.error('Failed to add coordinate plot:', error);
                this.showCoordinateToast('background.plotError', 'Invalid expression. Unable to plot.', 'error');
            }
        };

        if (coordinatePlotBtn) {
            coordinatePlotBtn.addEventListener('click', addCoordinatePlot);
        }

        if (coordinateExpressionInput) {
            coordinateExpressionInput.addEventListener('input', () => {
                this.syncCoordinateExpressionDisplay();
            });
            coordinateExpressionInput.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    addCoordinatePlot();
                }
            });
        }
        this.syncCoordinateExpressionDisplay();

        const coordinateKeypadToggleBtn = document.getElementById('coordinate-keypad-toggle-btn');
        if (coordinateKeypadToggleBtn) {
            coordinateKeypadToggleBtn.addEventListener('click', () => {
                this.toggleCoordinateInputPanel();
            });
        }

        const coordinateKeypadModal = document.getElementById('coordinate-keypad-modal');
        const coordinateKeypadModalCloseBtn = document.getElementById('coordinate-keypad-modal-close-btn');
        const coordinateKeypadConfirmBtn = document.getElementById('coordinate-keypad-confirm-btn');
        if (coordinateKeypadModal) {
            coordinateKeypadModal.setAttribute('role', 'dialog');
            coordinateKeypadModal.setAttribute('aria-modal', 'true');
            coordinateKeypadModal.setAttribute('aria-labelledby', 'coordinate-keypad-title');
            coordinateKeypadModal.setAttribute('aria-describedby', 'coordinate-keypad-expression-display');
            coordinateKeypadModal.tabIndex = -1;
            if (coordinateKeypadModal.dataset.keyboardBindingsInitialized !== 'true') {
                coordinateKeypadModal.dataset.keyboardBindingsInitialized = 'true';
                coordinateKeypadModal.addEventListener('click', (e) => {
                    if (e.target === coordinateKeypadModal) {
                        this.toggleCoordinateInputPanel(false);
                    }
                });
                coordinateKeypadModal.addEventListener('keydown', (event) => {
                    if (event.key === 'Escape') {
                        event.preventDefault();
                        this.toggleCoordinateInputPanel(false);
                    }
                });
            }
        }
        if (coordinateKeypadModalCloseBtn) {
            coordinateKeypadModalCloseBtn.addEventListener('click', () => {
                this.toggleCoordinateInputPanel(false);
            });
        }
        if (coordinateKeypadConfirmBtn) {
            coordinateKeypadConfirmBtn.addEventListener('click', () => {
                this.syncCoordinateExpressionDisplay();
                this.coordinateKeypadSuppressFocusRestore = true;
                this.toggleCoordinateInputPanel(false);
                if (typeof window.requestAnimationFrame === 'function') {
                    window.requestAnimationFrame(() => coordinateExpressionInput?.focus?.());
                } else {
                    coordinateExpressionInput?.focus?.();
                }
            });
        }

        const coordinateKeypadPanel = document.getElementById('coordinate-keypad-panel');
        if (coordinateKeypadPanel) {
            coordinateKeypadPanel.addEventListener('click', (e) => {
                const closest = typeof e.target?.closest === 'function'
                    ? e.target.closest.bind(e.target)
                    : () => null;
                const button = closest('[data-coordinate-action], [data-coordinate-insert], [data-coordinate-variable-btn]');
                if (!button) return;

                if (button.dataset.coordinateAction) {
                    this.handleCoordinateExpressionAction(button.dataset.coordinateAction);
                    return;
                }

                let value = button.dataset.coordinateInsert;
                if (button.hasAttribute('data-coordinate-variable-btn')) {
                    value = this.backgroundManager.backgroundPattern === 'polar'
                        ? button.dataset.insertPolar
                        : button.dataset.insertCartesian;
                }

                if (value) {
                    this.insertCoordinateExpressionAtCursor(value);
                }
            });
        }

        const coordinatePlotList = document.getElementById('coordinate-plot-list');
        if (coordinatePlotList) {
            coordinatePlotList.addEventListener('click', (e) => {
                this.handleCoordinatePlotListClick(e);
            });
        }
        
}

function setupSettingsListeners() {
        const settingsModal = document.getElementById('settings-modal');
        if (settingsModal) {
            settingsModal.setAttribute('role', 'dialog');
            settingsModal.setAttribute('aria-modal', 'true');
            settingsModal.setAttribute('aria-labelledby', 'settings-modal-title');
            settingsModal.tabIndex = -1;
            if (settingsModal.dataset.keyboardBindingsInitialized !== 'true') {
                settingsModal.dataset.keyboardBindingsInitialized = 'true';
                settingsModal.addEventListener('keydown', (event) => {
                    if (event.key === 'Escape') {
                        event.preventDefault();
                        this.closeSettings();
                    }
                });
            }
        }

        bindIfPresent(document.getElementById('settings-close-btn'), 'click', () => this.closeSettings());
        
        document.querySelectorAll('.settings-tab-icon').forEach(tab => {
            tab.addEventListener('click', (e) => {
                const tabName = e.currentTarget.dataset.tab;
                this.settingsManager.switchTab(tabName);
            });
        });
        
        const toolbarSizeSlider = document.getElementById('toolbar-size-slider');
        const toolbarSizeValue = document.getElementById('toolbar-size-value');
        const toolbarSizeInput = document.getElementById('toolbar-size-input');
        if (toolbarSizeSlider && toolbarSizeValue && toolbarSizeInput) {
            toolbarSizeSlider.addEventListener('input', (e) => {
                this.settingsManager.toolbarSize = parseInt(e.target.value);
                toolbarSizeValue.textContent = e.target.value;
                toolbarSizeInput.value = e.target.value;
                this.settingsManager.updateToolbarSize();
            });
            toolbarSizeInput.addEventListener('input', (e) => {
                const value = Math.max(30, Math.min(100, parseInt(e.target.value) || 40));
                e.target.value = value;
                toolbarSizeSlider.value = value;
                this.settingsManager.toolbarSize = value;
                toolbarSizeValue.textContent = value;
                this.settingsManager.updateToolbarSize();
            });
        }
        
        const configScaleSlider = document.getElementById('config-scale-slider');
        const configScaleValue = document.getElementById('config-scale-value');
        const configScaleInput = document.getElementById('config-scale-input');
        if (configScaleSlider && configScaleValue && configScaleInput) {
            configScaleSlider.addEventListener('input', (e) => {
                this.settingsManager.configScale = parseInt(e.target.value) / 100;
                configScaleValue.textContent = Math.round(this.settingsManager.configScale * 100);
                configScaleInput.value = e.target.value;
                this.settingsManager.updateConfigScale();
            });
            configScaleInput.addEventListener('input', (e) => {
                const value = Math.max(50, Math.min(150, parseInt(e.target.value) || 100));
                e.target.value = value;
                configScaleSlider.value = value;
                this.settingsManager.configScale = value / 100;
                configScaleValue.textContent = value;
                this.settingsManager.updateConfigScale();
            });
        }
        
        // Background opacity and pattern intensity from settings
        const bgOpacitySlider = document.getElementById('bg-opacity-slider');
        const bgOpacityValue = document.getElementById('bg-opacity-value');
        const bgOpacityInput = document.getElementById('bg-opacity-input');
        if (bgOpacitySlider && bgOpacityValue && bgOpacityInput) {
            bgOpacitySlider.addEventListener('input', (e) => {
                this.backgroundManager.setOpacity(parseInt(e.target.value) / 100);
                bgOpacityValue.textContent = e.target.value;
                bgOpacityInput.value = e.target.value;
            });
            bgOpacityInput.addEventListener('input', (e) => {
                const parsedValue = parseInt(e.target.value, 10);
                const value = Number.isNaN(parsedValue) ? 100 : Math.max(0, Math.min(100, parsedValue));
                e.target.value = value;
                bgOpacitySlider.value = value;
                this.backgroundManager.setOpacity(value / 100);
                bgOpacityValue.textContent = value;
            });
        }
        
        const patternIntensitySlider = document.getElementById('pattern-intensity-slider');
        const patternIntensityValue = document.getElementById('pattern-intensity-value');
        const patternIntensityInput = document.getElementById('pattern-intensity-input');
        if (patternIntensitySlider && patternIntensityValue && patternIntensityInput) {
            patternIntensitySlider.addEventListener('input', (e) => {
                this.backgroundManager.setPatternIntensity(parseInt(e.target.value) / 100);
                patternIntensityValue.textContent = e.target.value;
                patternIntensityInput.value = e.target.value;
            });
            patternIntensityInput.addEventListener('input', (e) => {
                const value = Math.max(10, Math.min(200, parseInt(e.target.value) || 50));
                e.target.value = value;
                patternIntensitySlider.value = value;
                this.backgroundManager.setPatternIntensity(value / 100);
                patternIntensityValue.textContent = value;
            });
        }
        
        document.querySelectorAll('.position-option-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const targetButton = e.currentTarget;
                this.settingsManager.setControlPosition(targetButton.dataset.position, this.timeDisplayManager);
            });
        });
        
        bindIfPresent(document.getElementById('edge-snap-checkbox'), 'change', (e) => {
            this.settingsManager.edgeSnapEnabled = e.target.checked;
            localStorage.setItem('edgeSnapEnabled', e.target.checked);
        });
        
        bindIfPresent(document.getElementById('touch-zoom-checkbox'), 'change', (e) => {
            this.settingsManager.touchZoomEnabled = e.target.checked;
            localStorage.setItem('touchZoomEnabled', e.target.checked);
        });

        document.querySelectorAll('.update-preference-option-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const nextPreference = e.currentTarget?.dataset?.updatePreference;
                this.settingsManager.setUpdatePreference(nextPreference);
            });
        });

        bindIfPresent(document.getElementById('legacy-project-import-checkbox'), 'change', (e) => {
            this.settingsManager.setLegacyProjectImportEnabled(e.target.checked);
        });

        bindIfPresent(document.getElementById('unlimited-zoom-checkbox'), 'change', (e) => {
            this.settingsManager.unlimitedZoom = e.target.checked;
            localStorage.setItem('unlimitedZoom', e.target.checked);
            this.updateMaxCanvasScale();
        });

        // Global font selector
        bindIfPresent(document.getElementById('global-font-select'), 'change', (e) => {
            this.settingsManager.setGlobalFont(e.target.value);
        });
        
        // Global font upload
        const globalFontUpload = document.getElementById('global-font-upload');
        if (globalFontUpload) {
            globalFontUpload.addEventListener('change', (e) => {
                if (e.target.files && e.target.files[0]) {
                    this.settingsManager.handleFontUpload(e.target.files[0]);
                    this.insertTextManager?.populateFonts?.();
                    this.renderFontManagementList?.();
                }
            });

            const globalFontUploadTrigger = globalFontUpload.closest('label.font-upload-btn');
            if (globalFontUploadTrigger) {
                globalFontUploadTrigger.addEventListener('keydown', (e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        globalFontUpload.click();
                    }
                });
            }
        }
        
        // Populate custom fonts on load
        this.settingsManager.populateGlobalFontSelect?.();
        
        // Canvas mode buttons removed - pagination is always active
        
        // Canvas preset buttons
        document.querySelectorAll('.canvas-preset-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const targetButton = e.currentTarget;
                const preset = targetButton.dataset.preset;
                this.settingsManager.setCanvasPreset(preset);
                document.querySelectorAll('.canvas-preset-btn').forEach(b => b.classList.remove('active'));
                targetButton.classList.add('active');
                this.applyCanvasSize();
            });
        });
        
        // Canvas size inputs
        bindIfPresent(document.getElementById('canvas-width-input'), 'change', (e) => {
            const width = parseInt(e.target.value);
            const heightInput = document.getElementById('canvas-height-input');
            const height = parseInt(heightInput?.value);
            this.settingsManager.setCanvasSize(width, height);
            // Set to custom when manually changing size
            document.querySelectorAll('.canvas-preset-btn').forEach(b => b.classList.remove('active'));
            document.querySelector('.canvas-preset-btn[data-preset="custom"]')?.classList.add('active');
            this.applyCanvasSize();
        });
        
        bindIfPresent(document.getElementById('canvas-height-input'), 'change', (e) => {
            const height = parseInt(e.target.value);
            const widthInput = document.getElementById('canvas-width-input');
            const width = parseInt(widthInput?.value);
            this.settingsManager.setCanvasSize(width, height);
            // Set to custom when manually changing size
            document.querySelectorAll('.canvas-preset-btn').forEach(b => b.classList.remove('active'));
            document.querySelector('.canvas-preset-btn[data-preset="custom"]')?.classList.add('active');
            this.applyCanvasSize();
        });
        
        // Canvas ratio selector
        bindIfPresent(document.getElementById('canvas-ratio-select'), 'change', (e) => {
            const ratio = e.target.value;
            if (ratio !== 'custom') {
                const widthInput = document.getElementById('canvas-width-input');
                const width = parseInt(widthInput?.value);
                let height;
                
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
                
                const canvasHeightInput = document.getElementById('canvas-height-input');
                if (canvasHeightInput) {
                    canvasHeightInput.value = height;
                }
                this.settingsManager.setCanvasSize(width, height);
            }
        });
        
        // Show/hide zoom controls
        bindIfPresent(document.getElementById('show-zoom-controls-checkbox'), 'change', (e) => {
            this.settingsManager.showZoomControls = e.target.checked;
            localStorage.setItem('showZoomControls', e.target.checked);
            this.updateZoomControlsVisibility();
        });

        // Show/hide import/export buttons
        const showImportExportBtnCheckbox = document.getElementById('show-import-export-btn-checkbox');
        if (showImportExportBtnCheckbox) {
            showImportExportBtnCheckbox.addEventListener('change', (e) => {
                this.settingsManager.showImportExportBtn = e.target.checked;
                localStorage.setItem('showImportExportBtn', e.target.checked);
                this.updateImportExportBtnVisibility();
            });
        }
        
        // Show/hide fullscreen button
        bindIfPresent(document.getElementById('show-fullscreen-btn-checkbox'), 'change', (e) => {
            this.settingsManager.showFullscreenBtn = e.target.checked;
            localStorage.setItem('showFullscreenBtn', e.target.checked);
            this.updateFullscreenBtnVisibility();
        });
        
        // Show/hide toolbar text
        const showToolbarTextCheckbox = document.getElementById('show-toolbar-text-checkbox');
        if (showToolbarTextCheckbox) {
            showToolbarTextCheckbox.addEventListener('change', (e) => {
                this.settingsManager.setShowToolbarText(e.target.checked);
            });
        }
        
        // Settings-heavy customization/font/control initialization is deferred
        // until after first paint or the first Settings open.
        
        // Theme color buttons
        document.querySelectorAll('.color-btn[data-theme-color]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const targetButton = e.currentTarget;
                this.settingsManager.setThemeColor(targetButton.dataset.themeColor);
                document.querySelectorAll('.color-btn[data-theme-color]').forEach(b => b.classList.remove('active'));
                targetButton.classList.add('active');
                window.i18n?.syncGenericColorControls?.();
            });
        });
        
        const customThemeColorPicker = document.getElementById('custom-theme-color-picker');
        const customThemeColorPickerBtn = document.querySelector('label[for="custom-theme-color-picker"]');
        if (customThemeColorPicker) {
            customThemeColorPicker.addEventListener('input', (e) => {
                this.settingsManager.setThemeColor(e.target.value);
                document.querySelectorAll('.color-btn[data-theme-color]').forEach(b => b.classList.remove('active'));
                // Mark color picker button as active
                if (customThemeColorPickerBtn) {
                    customThemeColorPickerBtn.classList.add('active');
                }
                window.i18n?.syncGenericColorControls?.();
            });
        }
        // Deactivate color picker when a preset is selected
        document.querySelectorAll('.color-btn[data-theme-color]').forEach(btn => {
            btn.addEventListener('click', () => {
                if (customThemeColorPickerBtn) {
                    customThemeColorPickerBtn.classList.remove('active');
                }
                window.i18n?.syncGenericColorControls?.();
            });
        });
        
        // Pattern preferences
        document.querySelectorAll('.pattern-pref-checkbox').forEach(checkbox => {
            checkbox.addEventListener('change', (e) => {
                this.settingsManager.updatePatternPreferences();
                this.updatePatternGrid();
            });
        });
        
        // Export Config
        bindIfPresent(document.getElementById('export-config-btn'), 'click', () => {
            this.settingsManager.exportSettings();
        });

        // Import Config
        bindIfPresent(document.getElementById('import-config-btn'), 'click', () => {
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = '.json';
            input.onchange = async (e) => {
                if (e.target.files.length > 0) {
                    const file = e.target.files[0];
                    const text = await file.text();
                    try {
                        const newSettings = JSON.parse(text);
                        const diff = this.settingsManager.getSettingsDiff(newSettings);
                        this.showConfigDiffModal(diff, newSettings);
                    } catch (err) {
                        const errorMsg = window.i18n?.t('settings.importError') || 'Invalid configuration file';
                        if (this.settingsManager.toastManager) {
                            this.settingsManager.toastManager.show(errorMsg, 'error');
                        } else {
                            window.appDialog?.showAlert(errorMsg, 'error');
                        }
                    }
                }
            };
            input.click();
        });

        const clearLocalCacheBtn = document.getElementById('clear-local-cache-btn');
        if (clearLocalCacheBtn) {
            clearLocalCacheBtn.addEventListener('click', async () => {
                const sizes = await this.getCacheSizeSummary();
                const settingsLabel = window.i18n ? window.i18n.t('settings.more.clearSettingsCache') : 'Settings Cache';
                const canvasLabel = window.i18n ? window.i18n.t('settings.more.clearCanvasCache') : 'Canvas Cache';
                const otherLabel = window.i18n ? window.i18n.t('settings.more.clearOtherCache') : 'Other Cache';
                const selectableItems = [
                    {
                        value: 'settings',
                        label: `${settingsLabel}: ${this.formatBytes(sizes.settings)}`,
                        checked: document.getElementById('clear-settings-cache-checkbox')?.checked
                    },
                    {
                        value: 'canvas',
                        label: `${canvasLabel}: ${this.formatBytes(sizes.canvas)}`,
                        checked: document.getElementById('clear-canvas-cache-checkbox')?.checked
                    },
                    {
                        value: 'other',
                        label: `${otherLabel}: ${this.formatBytes(sizes.other)}`,
                        checked: document.getElementById('clear-other-cache-checkbox')?.checked
                    }
                ];
                const confirmTitle = window.i18n ? window.i18n.t('settings.more.confirmClearTitle') : 'Confirm Cleanup';
                const confirmMessage = window.i18n ? window.i18n.t('settings.more.confirmClearSelectedCache') : 'Select the cache items to clear:';
                const selectMsg = window.i18n ? window.i18n.t('settings.more.selectCacheType') : 'Please select at least one cache type.';
                const confirmResult = await window.appDialog?.showConfirm({
                    title: confirmTitle,
                    message: confirmMessage,
                    selectableItems,
                    requireSelection: true,
                    requireSelectionMessage: selectMsg,
                    returnDetails: true
                });
                if (!confirmResult?.confirmed) return;
                const selectedValues = new Set(confirmResult.selectedValues || []);
                const options = {
                    settings: selectedValues.has('settings'),
                    canvas: selectedValues.has('canvas'),
                    other: selectedValues.has('other')
                };
                const settingsCheckbox = document.getElementById('clear-settings-cache-checkbox');
                const canvasCheckbox = document.getElementById('clear-canvas-cache-checkbox');
                const otherCheckbox = document.getElementById('clear-other-cache-checkbox');
                if (settingsCheckbox) settingsCheckbox.checked = options.settings;
                if (canvasCheckbox) canvasCheckbox.checked = options.canvas;
                if (otherCheckbox) otherCheckbox.checked = options.other;
                await this.clearSelectedCache(options);
                await this.updateCacheSizeDisplay();
            });
        }

        const keepMorePanelOpenCheckbox = document.getElementById('keep-more-panel-open-checkbox');
        if (keepMorePanelOpenCheckbox) {
            keepMorePanelOpenCheckbox.addEventListener('change', (e) => {
                this.settingsManager.keepMorePanelOpen = e.target.checked;
                localStorage.setItem('keepMorePanelOpen', e.target.checked);
            });
        }

        // Diff Modal Actions
        const configDiffModal = document.getElementById('config-diff-modal');
        bindIfPresent(document.getElementById('config-diff-cancel-btn'), 'click', () => {
            configDiffModal?.classList.remove('show');
        });

        bindIfPresent(configDiffModal, 'click', (e) => {
            if (e.target.id === 'config-diff-modal') {
                configDiffModal.classList.remove('show');
            }
        });

        bindIfPresent(document.getElementById('settings-modal'), 'click', (e) => {
            if (e.target.id === 'settings-modal') {
                this.closeSettings();
            }
        });
        
        // Confirm modal
        const confirmModal = document.getElementById('confirm-modal');
        const scheduleUiModalFrame = typeof window.requestAnimationFrame === 'function'
            ? window.requestAnimationFrame.bind(window)
            : (callback) => callback();
        const closeConfirmModal = () => {
            if (!confirmModal) {
                return;
            }
            confirmModal.classList.remove('show');
            const restoreFocusTarget = this.confirmModalPreviouslyFocusedElement;
            this.confirmModalPreviouslyFocusedElement = null;
            scheduleUiModalFrame(() => {
                restoreFocusTarget?.focus?.();
            });
        };
        if (confirmModal) {
            confirmModal.setAttribute('role', 'dialog');
            confirmModal.setAttribute('aria-modal', 'true');
            confirmModal.setAttribute('aria-labelledby', 'confirm-modal-title');
            confirmModal.setAttribute('aria-describedby', 'confirm-modal-message');
            confirmModal.tabIndex = -1;
            if (confirmModal.dataset.keyboardBindingsInitialized !== 'true') {
                confirmModal.dataset.keyboardBindingsInitialized = 'true';
                confirmModal.addEventListener('keydown', (event) => {
                    if (event.key === 'Escape') {
                        event.preventDefault();
                        closeConfirmModal();
                    }
                });
            }
        }
        bindIfPresent(document.getElementById('confirm-cancel-btn'), 'click', () => {
            closeConfirmModal();
        });
        
        bindIfPresent(document.getElementById('confirm-ok-btn'), 'click', () => {
            closeConfirmModal();
            this.clearCanvas(true);
        });
        
        bindIfPresent(confirmModal, 'click', (e) => {
            if (e.target.id === 'confirm-modal') {
                closeConfirmModal();
            }
        });

        const bringFloatingPanelToFront = (e) => {
            if (!(e.target instanceof Element)) return;
            const floatingPanel = e.target.closest('.feature-widget, .timer-display-widget, #feature-area, #config-area, #time-display-area');
            if (floatingPanel) {
                this.bringElementToFront(floatingPanel);
            }
        };

        document.addEventListener('mousedown', bringFloatingPanelToFront);
        document.addEventListener('pointerdown', bringFloatingPanelToFront);
}

window.AboardUiListenersRuntime = {
    setupToolConfigListeners(board) {
        return setupToolConfigListeners.call(board);
    },
    setupShapeToolConfigListeners(board) {
        return setupShapeToolConfigListeners.call(board);
    },
    setupSelectToolConfigListeners(board) {
        return setupSelectToolConfigListeners.call(board);
    },
    setupMoreFeatureToolConfigListeners(board) {
        return setupMoreFeatureToolConfigListeners.call(board);
    },
    setupBackgroundToolConfigListeners(board) {
        return setupBackgroundToolConfigListeners.call(board);
    },
    setupSettingsListeners(board) {
        return setupSettingsListeners.call(board);
    },
};
