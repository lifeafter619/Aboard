// Extracted runtime from main.js
// Preserves legacy board instance semantics by invoking methods with board as this.

function showConfigDiffModal(diff, newSettings) {
        const modal = document.getElementById('config-diff-modal');
        const list = document.getElementById('config-diff-list');
        list.innerHTML = '';

        if (diff.length === 0) {
            const noChangeMsg = window.i18n ? window.i18n.t('settings.importNoChange') : '没有检测到配置变更';
            list.innerHTML = `<div style="padding:10px; text-align:center;">${noChangeMsg}</div>`;
        } else {
            diff.forEach((item, index) => {
                const div = document.createElement('div');
                div.className = 'diff-item';

                // Get localized label
                let displayKey = this.settingsManager.getSettingLabel(item.key);

                // Format old value for display
                let oldValDisplay = item.old;
                if (typeof oldValDisplay === 'boolean') {
                    oldValDisplay = oldValDisplay ? (window.i18n ? window.i18n.t('common.yes') : 'Yes') : (window.i18n ? window.i18n.t('common.no') : 'No');
                }

                // Use DOM creation instead of innerHTML for security (XSS prevention)
                const keyDiv = document.createElement('div');
                keyDiv.className = 'diff-key';
                keyDiv.style.fontWeight = 'bold';
                keyDiv.style.fontSize = '13px';
                keyDiv.style.color = '#333';
                keyDiv.textContent = displayKey;

                const valuesDiv = document.createElement('div');
                valuesDiv.className = 'diff-values';
                valuesDiv.style.display = 'flex';
                valuesDiv.style.alignItems = 'center';
                valuesDiv.style.gap = '8px';
                valuesDiv.style.fontSize = '13px';
                valuesDiv.style.marginTop = '4px';

                const oldSpan = document.createElement('span');
                oldSpan.className = 'diff-old';
                oldSpan.style.color = '#999';
                oldSpan.style.textDecoration = 'line-through';
                oldSpan.textContent = String(oldValDisplay ?? '');

                const arrowSpan = document.createElement('span');
                arrowSpan.className = 'diff-arrow';
                arrowSpan.style.color = '#666';
                arrowSpan.textContent = '→';

                const inputContainer = document.createElement('div');
                inputContainer.className = 'diff-new-input-container';

                valuesDiv.appendChild(oldSpan);
                valuesDiv.appendChild(arrowSpan);
                valuesDiv.appendChild(inputContainer);

                div.appendChild(keyDiv);
                div.appendChild(valuesDiv);

                div.style.padding = '8px 0';
                div.style.borderBottom = '1px solid #eee';

                // Create input based on type
                let input;

                if (typeof item.new === 'boolean') {
                    input = document.createElement('input');
                    input.type = 'checkbox';
                    input.checked = item.new;
                    // Add label for checkbox
                    const label = document.createElement('label');
                    label.style.marginLeft = '4px';
                    label.textContent = item.new ? (window.i18n ? window.i18n.t('common.yes') : 'Yes') : (window.i18n ? window.i18n.t('common.no') : 'No');
                    input.addEventListener('change', () => {
                        label.textContent = input.checked ? (window.i18n ? window.i18n.t('common.yes') : 'Yes') : (window.i18n ? window.i18n.t('common.no') : 'No');
                    });
                    inputContainer.appendChild(input);
                    inputContainer.appendChild(label);
                } else if (typeof item.new === 'number') {
                    input = document.createElement('input');
                    input.type = 'number';
                    input.value = item.new;
                    input.style.width = '80px';
                    inputContainer.appendChild(input);
                } else {
                    // String or other
                    input = document.createElement('input');
                    input.type = 'text';
                    // Handle null/undefined values to prevent "undefined" string
                    const safeValue = (item.new === null || item.new === undefined) ? '' : String(item.new);
                    input.value = safeValue;
                    input.style.width = '120px';
                    // Disable editing for complex JSON strings if displayed raw
                    if (item.key === 'toolbarOrder' || item.key === 'toolbarVisibility') {
                        // These are usually handled by sub-keys in diff if parsed,
                        // but if deepCompare returned the string itself (unlikely if parsed), disable it.
                        // deepCompare parses strings, so we likely get 'toolbarOrder.0'.
                    }
                    inputContainer.appendChild(input);
                }

                input.dataset.key = item.key;
                input.dataset.type = typeof item.new;

                list.appendChild(div);
            });
        }

        const okBtn = document.getElementById('config-diff-ok-btn');
        // Remove old listener to avoid multiple bindings
        const newOkBtn = okBtn.cloneNode(true);
        okBtn.parentNode.replaceChild(newOkBtn, okBtn);

        newOkBtn.addEventListener('click', () => {
            if (diff.length > 0) {
                // Clone and parse stringified JSONs in newSettings to allow deep setting
                const pendingSettings = JSON.parse(JSON.stringify(newSettings));
                ['toolbarOrder', 'toolbarVisibility'].forEach(key => {
                    if (typeof pendingSettings[key] === 'string') {
                        try {
                            pendingSettings[key] = JSON.parse(pendingSettings[key]);
                        } catch (e) {}
                    }
                });

                // Apply changes from inputs
                const inputs = list.querySelectorAll('input[data-key]');
                inputs.forEach(input => {
                    const key = input.dataset.key;
                    const type = input.dataset.type;
                    let value;

                    if (input.type === 'checkbox') {
                        value = input.checked;
                    } else if (type === 'number') {
                        value = parseFloat(input.value);
                    } else {
                        value = input.value;
                    }

                    // Set deep value
                    const parts = key.split('.');
                    let current = pendingSettings;
                    for (let i = 0; i < parts.length - 1; i++) {
                        if (!current[parts[i]]) current[parts[i]] = {};
                        current = current[parts[i]];
                    }
                    current[parts[parts.length - 1]] = value;
                });

                // Stringify back special keys
                ['toolbarOrder', 'toolbarVisibility'].forEach(key => {
                    if (typeof pendingSettings[key] === 'object') {
                        pendingSettings[key] = JSON.stringify(pendingSettings[key]);
                    }
                });

                this.settingsManager.applySettings(pendingSettings);
                // Also update UI that depends on settings immediately
                this.recalculateAndRecenterCanvas();
                this.applyZoom(true);
                this.updateZoomControlsVisibility();
                this.updateImportExportBtnVisibility();
                this.updateFullscreenBtnVisibility();
                this.updatePatternGrid();
                this.repositionModalsOnResize();

                const successMsg = window.i18n ? window.i18n.t('settings.importSuccess') : '配置已导入';
                if (this.settingsManager.toastManager) {
                    this.settingsManager.toastManager.show(successMsg, 'success');
                } else {
                    window.appDialog?.showAlert(successMsg, 'success');
                }
            }
            modal.classList.remove('show');
        });

        modal.classList.add('show');
    
}

window.AboardConfigImportRuntime = {
    showConfigDiffModal(board, diff, newSettings) {
        return showConfigDiffModal.call(board, diff, newSettings);
    }
};
