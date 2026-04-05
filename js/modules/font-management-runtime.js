// Extracted font management runtime from main.js
// Preserves legacy board instance semantics by invoking methods with board as this.

function getTextWithFallback(key, fallback) {
        if (!window.i18n) return fallback;
        const translated = window.i18n.t(key);
        return translated && translated !== key ? translated : fallback;
    
}

function getFontPreviewSettings() {
        return this.settingsManager?.getFontPreviewSettings?.() || {
            sampleText: '一个白板-Aboard-123',
            fontSize: 48
        };
    
}

function updateSharedFontPreviewSettings(partialSettings = {}) {
        this.settingsManager?.setFontPreviewSettings?.(partialSettings);
        this.syncFontPreviewDisplays();
}

function resetSharedFontPreviewSettings(options = {}) {
        this.settingsManager?.resetFontPreviewSettings?.(options);
        this.syncFontPreviewDisplays();
}

function buildFontPreviewPanel(font) {
        const settings = this.getFontPreviewSettings();
        const previewPanel = document.createElement('div');
        previewPanel.className = 'font-preview-panel';
        previewPanel.hidden = !this.openFontPreviewPanels.has(font.value);

        const previewToolbar = document.createElement('div');
        previewToolbar.className = 'font-preview-toolbar';

        const textField = document.createElement('label');
        textField.className = 'font-preview-field';
        const textLabel = document.createElement('span');
        textLabel.textContent = this.getTextWithFallback('settings.general.fontPreviewText', '预览内容');
        const textInput = document.createElement('input');
        textInput.type = 'text';
        textInput.className = 'font-preview-text-input';
        textInput.dataset.fontPreviewControl = 'text';
        textInput.value = settings.sampleText;
        textField.appendChild(textLabel);
        textField.appendChild(textInput);

        const sizeField = document.createElement('div');
        sizeField.className = 'font-preview-field';
        const sizeLabel = document.createElement('span');
        sizeLabel.textContent = this.getTextWithFallback('settings.general.fontPreviewSize', '预览字号');
        const sizeRow = document.createElement('div');
        sizeRow.className = 'font-preview-size-row';
        const sizeRange = document.createElement('input');
        sizeRange.type = 'range';
        sizeRange.min = '16';
        sizeRange.max = '160';
        sizeRange.step = '1';
        sizeRange.className = 'slider';
        sizeRange.dataset.fontPreviewControl = 'size-range';
        sizeRange.value = String(settings.fontSize);
        const sizeInput = document.createElement('input');
        sizeInput.type = 'number';
        sizeInput.min = '16';
        sizeInput.max = '160';
        sizeInput.step = '1';
        sizeInput.className = 'size-input';
        sizeInput.dataset.fontPreviewControl = 'size-input';
        sizeInput.value = String(settings.fontSize);
        const sizeResetBtn = document.createElement('button');
        sizeResetBtn.type = 'button';
        sizeResetBtn.className = 'button-secondary font-preview-inline-btn';
        sizeResetBtn.dataset.fontPreviewControl = 'size-reset';
        sizeResetBtn.textContent = this.getTextWithFallback('common.restoreSize', '恢复大小');
        const textResetBtn = document.createElement('button');
        textResetBtn.type = 'button';
        textResetBtn.className = 'button-secondary font-preview-inline-btn';
        textResetBtn.dataset.fontPreviewControl = 'text-reset';
        textResetBtn.textContent = this.getTextWithFallback('settings.general.fontPreviewResetText', '恢复内容');
        sizeRow.appendChild(sizeRange);
        sizeRow.appendChild(sizeInput);
        sizeRow.appendChild(sizeResetBtn);
        sizeField.appendChild(sizeLabel);
        sizeField.appendChild(sizeRow);

        previewToolbar.appendChild(textField);
        previewToolbar.appendChild(sizeField);

        const previewActions = document.createElement('div');
        previewActions.className = 'font-preview-actions';
        previewActions.appendChild(textResetBtn);

        const previewSample = document.createElement('div');
        previewSample.className = 'font-preview-sample';
        previewSample.dataset.fontPreviewSample = font.value;

        previewPanel.appendChild(previewToolbar);
        previewPanel.appendChild(previewActions);
        previewPanel.appendChild(previewSample);

        textInput.addEventListener('input', (event) => {
            this.updateSharedFontPreviewSettings({ sampleText: event.target.value || '' });
        });

        const handlePreviewSizeUpdate = (value) => {
            const nextValue = Math.max(16, Math.min(160, parseInt(value, 10) || settings.fontSize));
            this.updateSharedFontPreviewSettings({ fontSize: nextValue });
        };
        sizeRange.addEventListener('input', (event) => handlePreviewSizeUpdate(event.target.value));
        sizeInput.addEventListener('input', (event) => handlePreviewSizeUpdate(event.target.value));

        sizeResetBtn.addEventListener('click', () => {
            this.resetSharedFontPreviewSettings({ text: false, size: true });
        });

        textResetBtn.addEventListener('click', () => {
            this.resetSharedFontPreviewSettings({ text: true, size: false });
        });

        return previewPanel;
    
}

function syncFontPreviewDisplays() {
        const settings = this.getFontPreviewSettings();
        document.querySelectorAll('.font-management-item').forEach((item) => {
            const fontValue = item.dataset.font;
            const previewSample = item.querySelector('.font-preview-sample');
            const textInput = item.querySelector('[data-font-preview-control="text"]');
            const sizeRange = item.querySelector('[data-font-preview-control="size-range"]');
            const sizeInput = item.querySelector('[data-font-preview-control="size-input"]');
            if (textInput && textInput.value !== settings.sampleText) {
                textInput.value = settings.sampleText;
            }
            if (sizeRange && sizeRange.value !== String(settings.fontSize)) {
                sizeRange.value = String(settings.fontSize);
            }
            if (sizeInput && sizeInput.value !== String(settings.fontSize)) {
                sizeInput.value = String(settings.fontSize);
            }
            if (previewSample) {
                previewSample.textContent = settings.sampleText;
                previewSample.style.fontSize = `${settings.fontSize}px`;
                previewSample.style.fontFamily = this.settingsManager.getFontFamilyStack(fontValue);
            }
        });

        this.syncFontPreviewModal();
    
}

function initFontPreviewModal() {
        const modal = document.getElementById('font-preview-modal');
        const closeBtn = document.getElementById('font-preview-modal-close-btn');
        const textInput = document.getElementById('font-preview-modal-text-input');
        const sizeRange = document.getElementById('font-preview-modal-size-range');
        const sizeInput = document.getElementById('font-preview-modal-size-input');
        const sizeIncreaseBtn = document.getElementById('font-preview-modal-size-increase-btn');
        const sizeResetBtn = document.getElementById('font-preview-modal-size-reset-btn');
        const textResetBtn = document.getElementById('font-preview-modal-text-reset-btn');

        if (!modal) return;

        modal.addEventListener('click', (event) => {
            if (event.target === modal) {
                this.closeFontPreviewModal();
            }
        });

        closeBtn?.addEventListener('click', () => this.closeFontPreviewModal());
        textInput?.addEventListener('input', (event) => {
            this.updateSharedFontPreviewSettings({ sampleText: event.target.value || '' });
        });

        const handleModalSizeChange = (value) => {
            const nextValue = Math.max(16, Math.min(160, parseInt(value, 10) || this.getFontPreviewSettings().fontSize));
            this.updateSharedFontPreviewSettings({ fontSize: nextValue });
        };
        sizeRange?.addEventListener('input', (event) => handleModalSizeChange(event.target.value));
        sizeInput?.addEventListener('input', (event) => handleModalSizeChange(event.target.value));
        sizeIncreaseBtn?.addEventListener('click', () => {
            handleModalSizeChange(this.getFontPreviewSettings().fontSize + 8);
        });
        sizeResetBtn?.addEventListener('click', () => {
            this.resetSharedFontPreviewSettings({ text: false, size: true });
        });
        textResetBtn?.addEventListener('click', () => {
            this.resetSharedFontPreviewSettings({ text: true, size: false });
        });
    
}

function openFontPreviewModal(fontValue) {
        const modal = document.getElementById('font-preview-modal');
        if (!modal) return;
        this.activeFontPreviewFont = fontValue;
        modal.classList.add('show');
        this.syncFontPreviewModal();
    
}

function closeFontPreviewModal() {
        const modal = document.getElementById('font-preview-modal');
        if (!modal) return;
        modal.classList.remove('show');
    
}

function syncFontPreviewModal() {
        const modal = document.getElementById('font-preview-modal');
        if (!modal) return;

        const title = document.getElementById('font-preview-modal-title');
        const sample = document.getElementById('font-preview-modal-sample');
        const textInput = document.getElementById('font-preview-modal-text-input');
        const sizeRange = document.getElementById('font-preview-modal-size-range');
        const sizeInput = document.getElementById('font-preview-modal-size-input');
        const settings = this.getFontPreviewSettings();
        const fontOptions = this.settingsManager.getManagedFontOptions();
        const activeFont = fontOptions.find(font => font.value === this.activeFontPreviewFont) || fontOptions[0];

        if (!activeFont) return;

        this.activeFontPreviewFont = activeFont.value;
        if (title) {
            title.textContent = `${this.getTextWithFallback('common.preview', '预览')} · ${activeFont.label}`;
        }
        if (sample) {
            sample.textContent = settings.sampleText;
            sample.style.fontFamily = this.settingsManager.getFontFamilyStack(activeFont.value);
            sample.style.fontSize = `${settings.fontSize}px`;
        }
        if (textInput && textInput.value !== settings.sampleText) {
            textInput.value = settings.sampleText;
        }
        if (sizeRange && sizeRange.value !== String(settings.fontSize)) {
            sizeRange.value = String(settings.fontSize);
        }
        if (sizeInput && sizeInput.value !== String(settings.fontSize)) {
            sizeInput.value = String(settings.fontSize);
        }
    
}

function renderFontManagementList() {
        const list = document.getElementById('font-management-list');
        if (!list || !this.settingsManager?.getManagedFontOptions) return;

        const fonts = this.settingsManager.getManagedFontOptions();
        const showLabel = this.getTextWithFallback('settings.general.showFont', '显示字体');
        const renameLabel = this.getTextWithFallback('settings.general.renameFont', '修改名称');
        const previewLabel = this.getTextWithFallback('common.preview', '预览');
        const expandLabel = this.getTextWithFallback('settings.general.expandPreview', '放大');
        const confirmLabel = this.getTextWithFallback('common.confirm', '确定');
        const cancelLabel = this.getTextWithFallback('common.cancel', '取消');
        const deleteLabel = this.getTextWithFallback('common.delete', '删除');
        list.innerHTML = '';

        fonts.forEach(font => {
            const item = document.createElement('div');
            item.className = 'font-management-item';
            item.dataset.font = font.value;
            item.draggable = true;

            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.checked = font.visible;
            checkbox.setAttribute('aria-label', showLabel);

            const dragHandle = document.createElement('span');
            dragHandle.className = 'drag-handle';
            dragHandle.textContent = '☰';

            const nameSpan = document.createElement('span');
            nameSpan.className = 'font-display-name';
            nameSpan.title = font.label;
            nameSpan.textContent = font.label;

            const actionGroup = document.createElement('div');
            actionGroup.className = 'font-action-group';

            const editButton = document.createElement('button');
            editButton.type = 'button';
            editButton.className = 'font-action-btn edit-btn';
            editButton.textContent = renameLabel;

            const previewButton = document.createElement('button');
            previewButton.type = 'button';
            previewButton.className = 'font-action-btn preview-btn';
            previewButton.textContent = previewLabel;
            previewButton.classList.toggle('active', this.openFontPreviewPanels.has(font.value));

            const expandButton = document.createElement('button');
            expandButton.type = 'button';
            expandButton.className = 'font-action-btn expand-btn';
            expandButton.textContent = expandLabel;

            actionGroup.appendChild(editButton);
            actionGroup.appendChild(previewButton);
            actionGroup.appendChild(expandButton);

            if (font.isCustom) {
                const deleteButton = document.createElement('button');
                deleteButton.type = 'button';
                deleteButton.className = 'font-action-btn danger-btn delete-btn';
                deleteButton.textContent = deleteLabel;
                actionGroup.appendChild(deleteButton);
            }

            item.appendChild(checkbox);
            item.appendChild(dragHandle);
            item.appendChild(nameSpan);
            item.appendChild(actionGroup);

            const aliasEditor = document.createElement('div');
            aliasEditor.className = 'font-alias-editor';
            aliasEditor.hidden = this.editingFontAliasFont !== font.value;
            const aliasInput = document.createElement('input');
            aliasInput.type = 'text';
            aliasInput.className = 'font-alias-input';
            aliasInput.value = font.label;
            const aliasConfirmBtn = document.createElement('button');
            aliasConfirmBtn.type = 'button';
            aliasConfirmBtn.className = 'button-primary';
            aliasConfirmBtn.textContent = confirmLabel;
            const aliasCancelBtn = document.createElement('button');
            aliasCancelBtn.type = 'button';
            aliasCancelBtn.className = 'button-secondary';
            aliasCancelBtn.textContent = cancelLabel;
            aliasEditor.appendChild(aliasInput);
            aliasEditor.appendChild(aliasConfirmBtn);
            aliasEditor.appendChild(aliasCancelBtn);
            item.appendChild(aliasEditor);

            const previewPanel = this.buildFontPreviewPanel(font);
            item.appendChild(previewPanel);
            list.appendChild(item);

            checkbox.addEventListener('change', (event) => {
                this.settingsManager.setFontVisibility(item.dataset.font, event.target.checked);
                this.insertTextManager?.populateFonts?.();
            });

            editButton.addEventListener('click', () => {
                this.editingFontAliasFont = font.value;
                this.renderFontManagementList();
                requestAnimationFrame(() => {
                    const nextInput = list.querySelector(`.font-management-item[data-font="${CSS.escape(font.value)}"] .font-alias-input`);
                    nextInput?.focus();
                    nextInput?.select();
                });
            });

            const confirmRename = () => {
                this.settingsManager.setFontAlias(item.dataset.font, aliasInput.value.trim());
                this.editingFontAliasFont = null;
                this.renderFontManagementList();
                this.insertTextManager?.populateFonts?.();
            };
            aliasConfirmBtn.addEventListener('click', confirmRename);
            aliasCancelBtn.addEventListener('click', () => {
                this.editingFontAliasFont = null;
                this.renderFontManagementList();
            });
            aliasInput.addEventListener('keydown', (event) => {
                if (event.key === 'Enter') {
                    event.preventDefault();
                    confirmRename();
                } else if (event.key === 'Escape') {
                    this.editingFontAliasFont = null;
                    this.renderFontManagementList();
                }
            });

            previewButton.addEventListener('click', () => {
                if (this.openFontPreviewPanels.has(font.value)) {
                    this.openFontPreviewPanels.delete(font.value);
                } else {
                    this.openFontPreviewPanels.add(font.value);
                }
                previewPanel.hidden = !this.openFontPreviewPanels.has(font.value);
                previewButton.classList.toggle('active', !previewPanel.hidden);
                if (!previewPanel.hidden) {
                    this.syncFontPreviewDisplays();
                }
            });

            expandButton.addEventListener('click', () => {
                this.openFontPreviewPanels.add(font.value);
                this.openFontPreviewModal(font.value);
                this.syncFontPreviewDisplays();
            });

            const deleteBtn = actionGroup.querySelector('.delete-btn');
            deleteBtn?.addEventListener('click', () => {
                const confirmed = window.confirm(`确定删除自定义字体“${font.label}”吗？`);
                if (!confirmed) return;
                if (this.settingsManager.deleteCustomFont(font.value)) {
                    this.openFontPreviewPanels.delete(font.value);
                    if (this.activeFontPreviewFont === font.value) {
                        this.activeFontPreviewFont = null;
                    }
                    this.editingFontAliasFont = null;
                    this.insertTextManager?.populateFonts?.();
                    this.renderFontManagementList();
                    this.syncFontPreviewModal();
                }
            });
        });

        let draggedItem = null;
        list.querySelectorAll('.font-management-item').forEach(item => {
            item.addEventListener('dragstart', () => {
                draggedItem = item;
                item.classList.add('dragging');
            });

            item.addEventListener('dragend', () => {
                item.classList.remove('dragging');
                draggedItem = null;
                this.saveFontOrderFromList();
            });

            item.addEventListener('dragover', (event) => {
                event.preventDefault();
                if (!draggedItem || draggedItem === item) return;
                const rect = item.getBoundingClientRect();
                const isBefore = event.clientY < rect.top + rect.height / 2;
                list.insertBefore(draggedItem, isBefore ? item : item.nextSibling);
            });
        });

        this.syncFontPreviewDisplays();
    
}

function initFontManagement() {
        const resetDefaultsBtn = document.getElementById('font-reset-defaults-btn');
        resetDefaultsBtn?.addEventListener('click', () => {
            const confirmed = window.confirm('恢复默认状态会删除已上传字体，并重置字体顺序、名称和预览设置。是否继续？');
            if (!confirmed) return;
            this.settingsManager.resetFontManagementToDefaults();
            this.openFontPreviewPanels.clear();
            this.editingFontAliasFont = null;
            this.activeFontPreviewFont = null;
            this.insertTextManager?.populateFonts?.();
            this.renderFontManagementList();
            this.closeFontPreviewModal();
        });

        this.initFontPreviewModal();
        this.renderFontManagementList();
}

function saveFontOrderFromList() {
        const list = document.getElementById('font-management-list');
        if (!list) return;
        const order = [...list.querySelectorAll('.font-management-item')].map(item => item.dataset.font);
        this.settingsManager.setFontOrder(order);
        this.insertTextManager?.populateFonts?.();
    
}

window.AboardFontManagementRuntime = {
    getTextWithFallback(board, key, fallback) {
        return getTextWithFallback.call(board, key, fallback);
    },
    getFontPreviewSettings(board) {
        return getFontPreviewSettings.call(board);
    },
    updateSharedFontPreviewSettings(board, partialSettings) {
        return updateSharedFontPreviewSettings.call(board, partialSettings);
    },
    resetSharedFontPreviewSettings(board, options) {
        return resetSharedFontPreviewSettings.call(board, options);
    },
    buildFontPreviewPanel(board, font) {
        return buildFontPreviewPanel.call(board, font);
    },
    syncFontPreviewDisplays(board) {
        return syncFontPreviewDisplays.call(board);
    },
    initFontPreviewModal(board) {
        return initFontPreviewModal.call(board);
    },
    openFontPreviewModal(board, fontValue) {
        return openFontPreviewModal.call(board, fontValue);
    },
    closeFontPreviewModal(board) {
        return closeFontPreviewModal.call(board);
    },
    syncFontPreviewModal(board) {
        return syncFontPreviewModal.call(board);
    },
    renderFontManagementList(board) {
        return renderFontManagementList.call(board);
    },
    saveFontOrderFromList(board) {
        return saveFontOrderFromList.call(board);
    },
    initFontManagement(board) {
        return initFontManagement.call(board);
    },
};
