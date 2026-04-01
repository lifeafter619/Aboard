// Extracted runtime from main.js
// Preserves legacy board instance semantics by invoking methods with board as this.

function renderCoordinatePlotList(currentPattern) {
        const plotList = document.getElementById('coordinate-plot-list');
        if (!plotList) return;

        const activePlots = this.backgroundManager
            .getCoordinateOverlayState()
            .plots
            .filter(plot => plot.coordinateType === currentPattern);

        if (activePlots.length === 0) {
            const emptyText = window.i18n ? window.i18n.t('background.noPlots') : '暂无函数图像';
            plotList.innerHTML = `<div class="coordinate-empty-state">${emptyText}</div>`;
            return;
        }

        const editTitle = window.i18n ? window.i18n.t('selection.edit') : '编辑';
        const deleteTitle = window.i18n ? window.i18n.t('selection.delete') : '删除';
        const dashStyleLabels = {
            solid: '实线',
            dashed: '虚线',
            dotted: '点线',
            dashdot: '点划线'
        };

        plotList.innerHTML = activePlots.map(plot => {
            const isExpanded = this.expandedCoordinatePlotId === plot.id;
            const dashOptions = Object.entries(dashStyleLabels)
                .map(([value, label]) => `<option value="${value}"${value === (plot.dashStyle || 'solid') ? ' selected' : ''}>${label}</option>`)
                .join('');
            const rangeRows = Array.isArray(plot.segments) && plot.segments.length
                ? plot.segments.map(segment => this.createCoordinatePlotRangeRowMarkup(segment, plot.coordinateType)).join('')
                : '<div class="coordinate-plot-range-empty">未限制显示范围，默认显示全部</div>';

            return `
                <div class="coordinate-plot-item ${isExpanded ? 'expanded' : ''}" data-plot-id="${this.escapeHtml(plot.id)}" data-coordinate-type="${this.escapeHtml(plot.coordinateType)}">
                    <div class="coordinate-plot-summary">
                        <span class="coordinate-plot-color" style="background:${plot.color};"></span>
                        <span class="coordinate-plot-expression">${this.getCoordinateExpressionPrefix(plot.coordinateType)}${this.escapeHtml(plot.expression)}</span>
                        <div class="coordinate-plot-actions">
                            <button type="button" class="coordinate-plot-action-btn" data-plot-toggle-edit="${this.escapeHtml(plot.id)}" title="${this.escapeHtml(editTitle)}">✎</button>
                            <button type="button" class="coordinate-plot-remove" data-plot-remove="${this.escapeHtml(plot.id)}" title="${this.escapeHtml(deleteTitle)}">×</button>
                        </div>
                    </div>
                    <div class="coordinate-plot-editor">
                        <div class="coordinate-plot-field">
                            <label>表达式</label>
                            <input type="text" data-plot-field="expression" value="${this.escapeHtml(plot.expression)}">
                        </div>
                        <div class="coordinate-plot-style-grid">
                            <div class="coordinate-plot-field">
                                <label>颜色</label>
                                <input class="coordinate-plot-color-input" type="color" data-plot-field="color" value="${this.escapeHtml(plot.color)}">
                            </div>
                            <div class="coordinate-plot-field">
                                <label>线型</label>
                                <select data-plot-field="dashStyle">${dashOptions}</select>
                            </div>
                            <div class="coordinate-plot-field">
                                <label>粗细</label>
                                <input type="number" min="1" max="12" step="0.5" data-plot-field="strokeWidth" value="${this.escapeHtml(plot.strokeWidth ?? 2.5)}">
                            </div>
                        </div>
                        <div class="coordinate-plot-field">
                            <div class="coordinate-plot-range-title">显示范围（可组合多段）</div>
                            <div class="coordinate-plot-range-header">
                                <span>控制量</span>
                                <span>最小值</span>
                                <span>最大值</span>
                                <span></span>
                            </div>
                            <div class="coordinate-plot-range-list">${rangeRows}</div>
                        </div>
                        <div class="coordinate-plot-editor-actions">
                            <div class="coordinate-plot-editor-actions-left">
                                <button type="button" class="coordinate-plot-editor-btn" data-plot-add-segment="${this.escapeHtml(plot.id)}">添加范围段</button>
                            </div>
                            <div class="coordinate-plot-editor-actions-right">
                                <button type="button" class="coordinate-plot-editor-btn" data-plot-cancel="${this.escapeHtml(plot.id)}">收起</button>
                                <button type="button" class="coordinate-plot-editor-btn primary" data-plot-save="${this.escapeHtml(plot.id)}">保存</button>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        }).join('');
    
}

function updateBackgroundUI() {
        const currentPattern = this.backgroundManager.backgroundPattern;
        const activeUploadedImage = currentPattern === 'image'
            ? this.uploadedImages.find(image => image.data === this.backgroundManager.backgroundImageData)
            : null;

        // Update background color buttons
        document.querySelectorAll('.color-btn[data-bg-color]').forEach(btn => {
            if (btn.dataset.bgColor === this.backgroundManager.backgroundColor) {
                btn.classList.add('active');
            } else {
                btn.classList.remove('active');
            }
        });
        
        // Update pattern buttons
        document.querySelectorAll('#pattern-grid .pattern-option-btn').forEach(btn => {
            const isPatternMatch = btn.dataset.pattern && btn.dataset.pattern === currentPattern;
            const isUploadedMatch = activeUploadedImage && btn.dataset.imageId === activeUploadedImage.id;
            btn.classList.toggle('active', !!(isPatternMatch || isUploadedMatch));
        });
        
        // Update custom color picker
        const customBgColorPicker = document.getElementById('custom-bg-color-picker');
        if (customBgColorPicker) {
            customBgColorPicker.value = this.backgroundManager.backgroundColor;
        }

        const patternDensitySlider = document.getElementById('pattern-density-slider');
        const patternDensityValue = document.getElementById('pattern-density-value');
        if (patternDensitySlider && patternDensityValue) {
            const densityPercent = Math.round((this.backgroundManager.patternDensity ?? 1) * 100);
            patternDensitySlider.value = densityPercent;
            patternDensityValue.textContent = densityPercent;
        }

        const bgImageSizeSlider = document.getElementById('bg-image-size-slider');
        const bgImageSizeValue = document.getElementById('bg-image-size-value');
        if (bgImageSizeSlider && bgImageSizeValue) {
            const sizePercent = Math.round((this.backgroundManager.imageSize ?? 1) * 100);
            bgImageSizeSlider.value = sizePercent;
            bgImageSizeValue.textContent = sizePercent;
        }

        const bgOpacitySlider = document.getElementById('bg-opacity-slider');
        const bgOpacityValue = document.getElementById('bg-opacity-value');
        const bgOpacityInput = document.getElementById('bg-opacity-input');
        if (bgOpacitySlider && bgOpacityValue && bgOpacityInput) {
            const opacityPercent = Math.round((this.backgroundManager.bgOpacity ?? 1) * 100);
            bgOpacitySlider.value = opacityPercent;
            bgOpacityValue.textContent = opacityPercent;
            bgOpacityInput.value = opacityPercent;
        }

        const patternIntensitySlider = document.getElementById('pattern-intensity-slider');
        const patternIntensityValue = document.getElementById('pattern-intensity-value');
        const patternIntensityInput = document.getElementById('pattern-intensity-input');
        if (patternIntensitySlider && patternIntensityValue && patternIntensityInput) {
            const intensityPercent = Math.round((this.backgroundManager.patternIntensity ?? 0.5) * 100);
            patternIntensitySlider.value = intensityPercent;
            patternIntensityValue.textContent = intensityPercent;
            patternIntensityInput.value = intensityPercent;
        }

        const patternDensityGroup = document.getElementById('pattern-density-group');
        if (patternDensityGroup) {
            patternDensityGroup.style.display = currentPattern !== 'blank' && currentPattern !== 'image' ? 'flex' : 'none';
        }

        const imageSizeGroup = document.getElementById('image-size-group');
        if (imageSizeGroup) {
            imageSizeGroup.style.display = currentPattern === 'image' ? 'flex' : 'none';
        }

        const coordinateSettingsToggleBtn = document.getElementById('coordinate-settings-toggle-btn');
        const coordinatePointToggleBtn = document.getElementById('coordinate-point-toggle-btn');
        const backgroundCoordinateActions = document.getElementById('background-coordinate-actions');
        const coordinateToolsModal = document.getElementById('coordinate-tools-modal');
        const coordinatePointModal = document.getElementById('coordinate-point-modal');
        const coordinateToolsGroup = document.getElementById('coordinate-tools-group');
        const coordinateState = this.backgroundManager.getCoordinateOverlayState();
        const supportsCoordinateTools = this.backgroundManager.supportsMovableOrigin(currentPattern);

        if (!supportsCoordinateTools) {
            this.isCoordinateSettingsExpanded = false;
            this.isCoordinatePointPanelVisible = false;
            this.isCoordinateInputPanelVisible = false;
        }

        if (backgroundCoordinateActions) {
            backgroundCoordinateActions.style.display = supportsCoordinateTools ? 'flex' : 'none';
        }

        if (coordinateSettingsToggleBtn) {
            coordinateSettingsToggleBtn.style.display = supportsCoordinateTools ? 'inline-flex' : 'none';
            coordinateSettingsToggleBtn.classList.toggle('active', supportsCoordinateTools && this.isCoordinateSettingsExpanded);
            coordinateSettingsToggleBtn.setAttribute('aria-expanded', supportsCoordinateTools && this.isCoordinateSettingsExpanded ? 'true' : 'false');
        }

        if (coordinatePointToggleBtn) {
            coordinatePointToggleBtn.style.display = supportsCoordinateTools ? 'inline-flex' : 'none';
            coordinatePointToggleBtn.classList.toggle('active', supportsCoordinateTools && (this.isCoordinatePointPanelVisible || this.isCoordinatePointMode));
            coordinatePointToggleBtn.setAttribute('aria-expanded', supportsCoordinateTools && this.isCoordinatePointPanelVisible ? 'true' : 'false');
        }

        if (coordinateToolsModal) {
            coordinateToolsModal.classList.toggle('show', supportsCoordinateTools && this.isCoordinateSettingsExpanded);
        }

        if (coordinatePointModal) {
            coordinatePointModal.classList.toggle('show', supportsCoordinateTools && this.isCoordinatePointPanelVisible);
            if (supportsCoordinateTools && this.isCoordinatePointPanelVisible) {
                requestAnimationFrame(() => this.positionCoordinatePointPanel());
            }
        }

        if (coordinateToolsGroup) {
            coordinateToolsGroup.style.display = supportsCoordinateTools ? 'flex' : 'none';
        }

        const toggleMap = {
            'coordinate-show-ticks': coordinateState.showTicks,
            'coordinate-show-labels': coordinateState.showLabels,
            'coordinate-show-point-labels': coordinateState.showPointLabels,
            'coordinate-show-origin': coordinateState.showOrigin,
            'coordinate-snap-grid': coordinateState.snapToGrid
        };

        Object.entries(toggleMap).forEach(([id, value]) => {
            const checkbox = document.getElementById(id);
            if (checkbox) {
                checkbox.checked = !!value;
            }
        });

        const pointCountValue = document.getElementById('coordinate-point-count-value');
        if (pointCountValue) {
            pointCountValue.textContent = coordinateState.points.length;
        }

        const coordinatePointMode = this.getCoordinatePointLineMode();
        document.querySelectorAll('[data-coordinate-point-mode]').forEach((btn) => {
            const btnMode = btn.dataset.coordinatePointMode;
            btn.classList.toggle('active', supportsCoordinateTools && btnMode === coordinatePointMode);
            btn.disabled = !supportsCoordinateTools;
        });

        const coordinatePointModeHint = document.getElementById('coordinate-point-mode-hint');
        if (coordinatePointModeHint) {
            const modeMeta = this.getCoordinatePointLineModeMeta(coordinatePointMode);
            const translated = window.i18n ? window.i18n.t(modeMeta.hintKey) : modeMeta.hintFallback;
            coordinatePointModeHint.textContent = translated === modeMeta.hintKey ? modeMeta.hintFallback : translated;
        }

        const coordinatePlotHint = document.getElementById('coordinate-plot-hint');
        if (coordinatePlotHint) {
            const hintKey = currentPattern === 'polar' ? 'background.plotHintPolar' : 'background.plotHintCartesian';
            const fallback = currentPattern === 'polar'
                ? '极坐标：输入 r = f(theta)，theta 为弧度，deg 为角度'
                : '直角坐标：输入 y = f(x)，可用 sin cos PI';
            const translated = window.i18n ? window.i18n.t(hintKey) : fallback;
            coordinatePlotHint.textContent = translated === hintKey ? fallback : translated;
        }

        const coordinateExpressionInput = document.getElementById('coordinate-expression-input');
        if (coordinateExpressionInput) {
            const placeholderKey = currentPattern === 'polar'
                ? 'background.plotPlaceholderPolar'
                : 'background.plotPlaceholderCartesian';
            const fallback = currentPattern === 'polar' ? '如：2 * sin(4 * theta)' : '如：sin(x) + 2';
            const translated = window.i18n ? window.i18n.t(placeholderKey) : fallback;
            coordinateExpressionInput.placeholder = translated === placeholderKey ? fallback : translated;
        }

        const coordinateAddPointBtn = document.getElementById('coordinate-add-point-btn');
        if (coordinateAddPointBtn) {
            coordinateAddPointBtn.classList.toggle('active', supportsCoordinateTools && this.isCoordinatePointMode);
        }

        this.syncCoordinatePointModeSectionVisibility(supportsCoordinateTools && this.isCoordinatePointMode);

        if (!coordinateState.plots.some(plot => plot.id === this.expandedCoordinatePlotId && plot.coordinateType === currentPattern)) {
            this.expandedCoordinatePlotId = null;
        }

        this.syncCoordinateInputPanelButtons();
        this.syncCoordinateExpressionDisplay();
        this.toggleCoordinateInputPanel(this.isCoordinateInputPanelVisible);
        this.renderCoordinatePlotList(currentPattern);
        
        // Update move-origin-btn visibility based on current pattern
        const moveOriginBtn = document.getElementById('move-origin-btn');
        if (moveOriginBtn) {
            moveOriginBtn.style.display = this.backgroundManager.supportsMovableOrigin(currentPattern) ? 'inline-flex' : 'none';
        }

        if (!this.backgroundManager.supportsMovableOrigin(currentPattern)) {
            this.disableCoordinateOriginDragMode();
            this.setCoordinatePointMode(false);
        }
    
}

window.AboardBackgroundUiRuntime = {
    renderCoordinatePlotList(board, currentPattern) {
        return renderCoordinatePlotList.call(board, currentPattern);
    },
    updateBackgroundUI(board) {
        return updateBackgroundUI.call(board);
    }
};
