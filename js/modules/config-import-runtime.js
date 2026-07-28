// Extracted runtime from main.js
// Preserves legacy board instance semantics by invoking methods with board as this.

const UNSAFE_CONFIG_KEY_SEGMENTS = new Set(['__proto__', 'constructor', 'prototype']);

function coerceConfigImportInputValue(input, type, fallbackValue) {
        if (!input) {
            return fallbackValue;
        }

        if (input.type === 'checkbox') {
            return input.checked;
        }

        if (type === 'number') {
            const parsedValue = parseFloat(input.value);
            return Number.isFinite(parsedValue) ? parsedValue : fallbackValue;
        }

        return input.value;
}

function showConfigDiffModal(diff, newSettings) {
        const modal = document.getElementById('config-diff-modal');
        const list = document.getElementById('config-diff-list');
        const okBtn = document.getElementById('config-diff-ok-btn');
        const cancelBtn = document.getElementById('config-diff-cancel-btn');
        if (!modal || !list || !okBtn || !okBtn.parentNode || !cancelBtn) {
            return false;
        }
        const scheduleFrame = typeof window.requestAnimationFrame === 'function'
            ? window.requestAnimationFrame.bind(window)
            : (callback) => callback();
        const restoreFocusTarget = document.activeElement && document.activeElement !== document.body
            ? document.activeElement
            : null;
        let isClosed = false;

        modal.setAttribute('role', 'dialog');
        modal.setAttribute('aria-modal', 'true');
        modal.setAttribute('aria-labelledby', 'config-diff-title');
        modal.setAttribute('aria-describedby', 'config-diff-description');
        modal.tabIndex = -1;

        const closeModal = () => {
            if (isClosed) {
                return;
            }
            isClosed = true;
            modal.classList.remove('show');
            scheduleFrame(() => {
                restoreFocusTarget?.focus?.();
            });
        };
        list.innerHTML = '';

        // Keys missing from the imported file surface as `new === undefined`;
        // writing them back would blank the current value, so keep them unchanged.
        diff = diff.filter((item) => item.new !== undefined);

        if (diff.length === 0) {
            const noChangeMsg = window.i18n?.t('settings.importNoChange') || 'No configuration changes detected';
            const emptyState = document.createElement('div');
            emptyState.style.padding = '10px';
            emptyState.style.textAlign = 'center';
            emptyState.textContent = noChangeMsg;
            list.appendChild(emptyState);
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
                input.dataset.fallbackValue = typeof item.new === 'number'
                    ? String(item.new)
                    : '';

                list.appendChild(div);
            });
        }

        // Remove old listener to avoid multiple bindings
        const newOkBtn = okBtn.cloneNode(true);
        okBtn.parentNode.replaceChild(newOkBtn, okBtn);

        newOkBtn.addEventListener('click', async () => {
            if (diff.length > 0) {
                // Clone and parse stringified JSONs in newSettings to allow deep setting
                const pendingSettings = JSON.parse(JSON.stringify(newSettings));
                ['toolbarOrder', 'toolbarVisibility', 'controlButtonOrder'].forEach(key => {
                    if (typeof pendingSettings[key] === 'string') {
                        try {
                            pendingSettings[key] = JSON.parse(pendingSettings[key]);
                        } catch (e) {
                            console.warn(`Failed to parse ${key} setting:`, e);
                        }
                    }
                });

                // Apply changes from inputs
                const inputs = list.querySelectorAll('input[data-key]');
                inputs.forEach(input => {
                    const key = input.dataset.key;
                    const type = input.dataset.type;
                    const numericFallback = type === 'number'
                        ? parseFloat(input.dataset.fallbackValue)
                        : undefined;
                    const fallbackValue = type === 'number' && Number.isFinite(numericFallback)
                        ? numericFallback
                        : input.value;
                    const value = coerceConfigImportInputValue(input, type, fallbackValue);

                    // Set deep value. Reject prototype-polluting path segments:
                    // imported config keys are attacker-controlled data.
                    const parts = key.split('.');
                    if (parts.some((part) => UNSAFE_CONFIG_KEY_SEGMENTS.has(part))) {
                        console.warn(`Skipped unsafe config key: ${key}`);
                        return;
                    }
                    let current = pendingSettings;
                    for (let i = 0; i < parts.length - 1; i++) {
                        if (!current[parts[i]]) current[parts[i]] = {};
                        current = current[parts[i]];
                    }
                    current[parts[parts.length - 1]] = value;
                });

                // Stringify back special keys
                ['toolbarOrder', 'toolbarVisibility', 'controlButtonOrder'].forEach(key => {
                    if (typeof pendingSettings[key] === 'object') {
                        pendingSettings[key] = JSON.stringify(pendingSettings[key]);
                    }
                });

                await this.settingsManager.applySettings(pendingSettings);
                // Also update UI that depends on settings immediately
                this.recalculateAndRecenterCanvas();
                // false: the config-area scale was just applied from the
                // imported configScale by loadSettings — passing true would
                // overwrite it with the canvas zoom factor.
                this.applyZoom(false);
                this.updateZoomControlsVisibility();
                this.updateImportExportBtnVisibility();
                this.updateFullscreenBtnVisibility();
                this.applyControlButtonVisibility?.(pendingSettings.controlSettings);
                this.updatePatternGrid();
                this.applyToolbarOrder?.();
                this.applyToolbarVisibility?.();
                if (pendingSettings.controlButtonOrder) {
                    try {
                        const controlButtonOrder = JSON.parse(pendingSettings.controlButtonOrder);
                        this.reorderControlButtons?.(controlButtonOrder);
                        this.reorderControlButtonList?.(controlButtonOrder);
                    } catch (error) {
                        console.warn('Failed to apply imported control button order:', error);
                    }
                }
                this.repositionModalsOnResize();

                const successMsg = window.i18n?.t('settings.importSuccess') || 'Configuration imported successfully';
                if (this.settingsManager.toastManager) {
                    this.settingsManager.toastManager.show(successMsg, 'success');
                } else {
                    window.appDialog?.showAlert(successMsg, 'success');
                }
            }
            closeModal();
        });

        cancelBtn.onclick = () => {
            closeModal();
        };
        modal.onclick = (event) => {
            if (event.target === modal) {
                closeModal();
            }
        };
        modal.onkeydown = (event) => {
            if (event.key === 'Escape') {
                event.preventDefault();
                closeModal();
            }
        };

        modal.classList.add('show');
        scheduleFrame(() => {
            (cancelBtn || modal)?.focus?.();
        });
        return true;
    
}

window.AboardConfigImportRuntime = {
    coerceConfigImportInputValue,
    showConfigDiffModal(board, diff, newSettings) {
        return showConfigDiffModal.call(board, diff, newSettings);
    }
};
