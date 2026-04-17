// Visible-core UI listeners extracted from ui-listeners-runtime.js
// These listeners power controls the user sees and can use immediately on first load.

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
        
        document.querySelectorAll('.color-btn[data-color]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const targetButton = e.currentTarget;
                this.drawingEngine.setColor(targetButton.dataset.color);
                document.querySelectorAll('.color-btn[data-color]').forEach(b => b.classList.remove('active'));
                targetButton.classList.add('active');
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
                if (customColorPickerBtn) {
                    customColorPickerBtn.classList.add('active');
                }
                const shapeColorPicker = document.getElementById('shape-custom-color-picker');
                if (shapeColorPicker) {
                    shapeColorPicker.value = e.target.value;
                }
                syncGenericColorAccessibility();
            });
        }

        document.querySelectorAll('.color-btn[data-color]').forEach(btn => {
            btn.addEventListener('click', () => {
                if (customColorPickerBtn) {
                    customColorPickerBtn.classList.remove('active');
                }
                const shapeCustomColorPickerBtn = document.querySelector('label[for="shape-custom-color-picker"]');
                if (shapeCustomColorPickerBtn) {
                    shapeCustomColorPickerBtn.classList.remove('active');
                }
                syncGenericColorAccessibility();
            });
        });
        
        if (penSizeSlider) {
            penSizeSlider.addEventListener('input', (e) => {
            const size = parseInt(e.target.value, 10);
            this.drawingEngine.setPenSize(size);
            if (penSizeValue) {
                penSizeValue.textContent = size;
            }
            if (shapeSizeSlider) {
                shapeSizeSlider.value = size;
                if (shapeSizeValue) {
                    shapeSizeValue.textContent = size;
                }
            }

            if (arrowSizeSlider && arrowSizeValue) {
                if (parseInt(arrowSizeSlider.value, 10) < size) {
                    arrowSizeSlider.value = size;
                    arrowSizeValue.textContent = size;
                    this.shapeDrawingManager?.setArrowSize?.(size);
                }
            }
            });
        }

        if (shapeSizeSlider) {
            shapeSizeSlider.addEventListener('input', (e) => {
                const size = parseInt(e.target.value, 10);
                this.drawingEngine.setPenSize(size);
                if (shapeSizeValue) {
                    shapeSizeValue.textContent = size;
                }
                if (penSizeSlider) {
                    penSizeSlider.value = size;
                }
                if (penSizeValue) {
                    penSizeValue.textContent = size;
                }

                if (arrowSizeSlider && arrowSizeValue) {
                    if (parseInt(arrowSizeSlider.value) < size) {
                        arrowSizeSlider.value = size;
                        arrowSizeValue.textContent = size;
                        this.shapeDrawingManager?.setArrowSize?.(size);
                    }
                }
            });
        }
        
        document.querySelectorAll('.eraser-shape-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const targetBtn = e.currentTarget;
                this.drawingEngine.setEraserShape(targetBtn.dataset.eraserShape);
                document.querySelectorAll('.eraser-shape-btn').forEach(b => b.classList.remove('active'));
                targetBtn.classList.add('active');
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
                    this.eraserCursor.style.width = `${e.target.value}px`;
                    this.eraserCursor.style.height = `${e.target.value}px`;
                }
            });
        }
        this.syncEraserSizeControls();
        
        const penLineStyleSettingsBtn = document.getElementById('pen-line-style-settings-btn');
        if (penLineStyleSettingsBtn) {
            penLineStyleSettingsBtn.addEventListener('click', () => {
                this.lineStyleModal.show('pen');
            });
        }
}

window.AboardUiListenersCoreRuntime = {
    setupToolConfigListeners(board) {
        return setupToolConfigListeners.call(board);
    }
};
