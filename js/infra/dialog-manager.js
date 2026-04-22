export class DialogManager {
  constructor(win = window, doc = document) {
    this.win = win;
    this.doc = doc;
    this.confirmModal = null;
    this.confirmModalKeydownHandler = null;
  }

  getText(key, fallback) {
    const translated = this.win.i18n?.t?.(key);
    return translated && translated !== key ? translated : fallback;
  }

  showAlert(message, type = 'info') {
    const text = String(message || '');
    if (this.win.drawingBoard?.settingsManager?.toastManager) {
      this.win.drawingBoard.settingsManager.toastManager.show(text, type);
      return;
    }
    if (this.win.toastManager) {
      this.win.toastManager.show(text, type);
      return;
    }
    if (this.win.ToastManager) {
      new this.win.ToastManager().show(text, type);
      return;
    }
    console.warn(text);
  }

  ensureConfirmModal() {
    if (this.confirmModal) return;
    const modal = this.doc.createElement('div');
    modal.id = 'app-confirm-modal';
    modal.className = 'modal';
    modal.innerHTML = `
      <div class="modal-content confirm-modal-content">
        <div class="modal-header">
          <h2 id="app-confirm-title"></h2>
        </div>
        <div class="modal-body">
          <p id="app-confirm-message" class="confirm-message"></p>
          <div id="app-confirm-options" class="app-confirm-options"></div>
          <div id="app-confirm-input-container" class="app-confirm-input-container"></div>
          <p id="app-confirm-footer" class="confirm-message app-confirm-footer"></p>
          <div class="confirm-buttons">
            <button id="app-confirm-cancel-btn" class="confirm-btn cancel-btn" aria-label="Cancel"></button>
            <button id="app-confirm-ok-btn" class="confirm-btn ok-btn" aria-label="OK"></button>
          </div>
        </div>
      </div>
    `;
    this.doc.body.appendChild(modal);
    this.confirmModal = modal;
  }

  getConfirmModalParts(modal = this.confirmModal) {
    if (!modal) {
      return null;
    }

    const parts = {
      modal,
      titleElement: modal.querySelector('#app-confirm-title'),
      messageElement: modal.querySelector('#app-confirm-message'),
      optionsContainer: modal.querySelector('#app-confirm-options'),
      inputContainer: modal.querySelector('#app-confirm-input-container'),
      footerElement: modal.querySelector('#app-confirm-footer'),
      cancelBtn: modal.querySelector('#app-confirm-cancel-btn'),
      okBtn: modal.querySelector('#app-confirm-ok-btn')
    };

    return Object.values(parts).every(Boolean) ? parts : null;
  }

  resetConfirmModal(modal = this.confirmModal) {
    if (this.confirmModalKeydownHandler && modal?.removeEventListener) {
      modal.removeEventListener('keydown', this.confirmModalKeydownHandler);
      this.confirmModalKeydownHandler = null;
    }
    modal?.remove?.();
    this.confirmModal = null;
  }

  ensureConfirmModalParts() {
    this.ensureConfirmModal();
    let parts = this.getConfirmModalParts();
    if (parts) {
      return parts;
    }

    console.warn('Confirm dialog template is incomplete. Rebuilding modal.');
    this.resetConfirmModal();
    this.ensureConfirmModal();
    parts = this.getConfirmModalParts();
    if (parts) {
      return parts;
    }

    console.warn('Confirm dialog template could not be rebuilt.');
    return null;
  }

  showConfirm(messageOrConfig, title = null) {
    const isConfigMode = typeof messageOrConfig === 'object' && messageOrConfig !== null;
    const config = isConfigMode ? messageOrConfig : { message: messageOrConfig, title };
    const localeTitle = config.title || (this.win.i18n ? this.win.i18n.t('common.confirm') : 'Confirm');
    const cancelText = config.cancelText || (this.win.i18n ? this.win.i18n.t('common.cancel') : 'Cancel');
    const okText = config.confirmText || (this.win.i18n ? this.win.i18n.t('common.confirm') : 'OK');
    const message = String(config.message || '');
    const footerText = String(config.footerText || '');
    const selectableItems = Array.isArray(config.selectableItems) ? config.selectableItems : [];
    const inputConfig = config.inputConfig && typeof config.inputConfig === 'object' ? config.inputConfig : null;
    const cancelledResult = config.returnDetails
      ? { confirmed: false, selectedValues: [], inputValue: null }
      : false;
    const modalParts = this.ensureConfirmModalParts();
    if (!modalParts) {
      return Promise.resolve(cancelledResult);
    }

    const {
      modal,
      titleElement,
      messageElement,
      optionsContainer,
      inputContainer,
      footerElement,
      cancelBtn,
      okBtn
    } = modalParts;

    titleElement.textContent = localeTitle;
    messageElement.textContent = message;
    messageElement.classList.toggle('compact', selectableItems.length > 0 || Boolean(footerText) || Boolean(inputConfig));
    optionsContainer.innerHTML = '';
    optionsContainer.classList.toggle('show', selectableItems.length > 0);
    inputContainer.innerHTML = '';
    inputContainer.classList.toggle('show', Boolean(inputConfig));
    footerElement.textContent = footerText;
    footerElement.classList.toggle('show', Boolean(footerText));

    selectableItems.forEach((item, index) => {
      const label = this.doc.createElement('label');
      label.className = 'checkbox-label app-confirm-option';

      const checkbox = this.doc.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.checked = item.checked !== false;
      checkbox.value = item.value ?? String(index);

      const text = this.doc.createElement('span');
      text.textContent = String(item.label || '');

      label.appendChild(checkbox);
      label.appendChild(text);
      optionsContainer.appendChild(label);
    });

    let inputElement = null;
    if (inputConfig) {
      const inputWrapper = this.doc.createElement('label');
      inputWrapper.className = 'app-confirm-input-wrapper';

      if (inputConfig.label) {
        const inputLabel = this.doc.createElement('span');
        inputLabel.className = 'app-confirm-input-label';
        inputLabel.textContent = String(inputConfig.label);
        inputWrapper.appendChild(inputLabel);
      }

      inputElement = this.doc.createElement('input');
      inputElement.id = inputConfig.id || 'app-dialog-prompt-input';
      inputElement.className = 'app-confirm-input';
      inputElement.type = inputConfig.type || 'text';
      inputElement.value = inputConfig.value == null ? '' : String(inputConfig.value);
      if (inputConfig.placeholder != null) inputElement.placeholder = String(inputConfig.placeholder);
      if (inputConfig.min != null) inputElement.min = String(inputConfig.min);
      if (inputConfig.max != null) inputElement.max = String(inputConfig.max);
      if (inputConfig.step != null) inputElement.step = String(inputConfig.step);
      if (inputConfig.inputMode) inputElement.inputMode = String(inputConfig.inputMode);
      if (inputConfig.autocomplete) inputElement.autocomplete = String(inputConfig.autocomplete);
      inputWrapper.appendChild(inputElement);
      inputContainer.appendChild(inputWrapper);
    }

    cancelBtn.textContent = cancelText;
    cancelBtn.setAttribute('aria-label', cancelText);
    okBtn.textContent = okText;
    okBtn.setAttribute('aria-label', okText);

    return new Promise((resolve) => {
      const restoreFocusTarget = this.doc.activeElement && this.doc.activeElement !== this.doc.body
        ? this.doc.activeElement
        : null;
      let isClosed = false;
      const confirmDialog = () => {
        okBtn?.click?.();
      };
      const close = (result) => {
        if (isClosed) {
          return;
        }
        isClosed = true;
        modal.classList.remove('show');
        cancelBtn.onclick = null;
        okBtn.onclick = null;
        modal.onclick = null;
        if (this.confirmModalKeydownHandler) {
          modal.removeEventListener('keydown', this.confirmModalKeydownHandler);
          this.confirmModalKeydownHandler = null;
        }
        if (inputElement) {
          inputElement.onkeydown = null;
        }
        const restoreFocus = () => {
          restoreFocusTarget?.focus?.();
        };
        if (typeof this.win.requestAnimationFrame === 'function') {
          this.win.requestAnimationFrame(restoreFocus);
        } else {
          restoreFocus();
        }
        resolve(result);
      };
      cancelBtn.onclick = () => {
        close(cancelledResult);
      };
      okBtn.onclick = () => {
        const selectedValues = Array.from(optionsContainer.querySelectorAll('input[type="checkbox"]:checked'))
          .map((input) => input.value);
        const inputValue = inputElement
          ? (inputConfig.trim === false ? inputElement.value : inputElement.value.trim())
          : null;
        if (selectableItems.length > 0 && config.requireSelection && selectedValues.length === 0) {
          this.showAlert(
                        config.requireSelectionMessage
                        || (this.win.i18n ? this.win.i18n.t('settings.more.selectCacheType') : 'Please select at least one item.'),
                        'warning'
                    );
                    return;
        }
        if (inputConfig?.required && !inputValue) {
          this.showAlert(
            inputConfig.requiredMessage || this.getText('common.inputRequired', 'Please enter a value.'),
            'warning'
          );
          inputElement?.focus();
          return;
        }
        if (inputConfig && typeof inputConfig.validate === 'function') {
          const validationMessage = inputConfig.validate(inputValue, inputElement);
          if (validationMessage) {
            this.showAlert(String(validationMessage), 'warning');
            inputElement?.focus();
            inputElement?.select?.();
            return;
          }
        }
        if (config.returnDetails) {
          close({ confirmed: true, selectedValues, inputValue });
          return;
        }
        close(true);
      };
      modal.onclick = (e) => {
        if (e.target === modal) {
          close(cancelledResult);
        }
      };
      this.confirmModalKeydownHandler = (event) => {
        if (event.key === 'Escape') {
          event.preventDefault();
          close(cancelledResult);
          return;
        }
        if (event.key === 'Enter' && !inputElement) {
          const target = event.target;
          const tagName = String(target?.tagName || '').toLowerCase();
          const isInteractiveTarget = tagName === 'button'
            || tagName === 'input'
            || tagName === 'textarea'
            || tagName === 'select'
            || Boolean(target?.isContentEditable);
          if (!isInteractiveTarget) {
            event.preventDefault();
            confirmDialog();
          }
        }
      };
      modal.addEventListener('keydown', this.confirmModalKeydownHandler);
      modal.classList.add('show');
      if (inputElement) {
        inputElement.onkeydown = (event) => {
          if (event.key === 'Enter') {
            event.preventDefault();
            okBtn?.click?.();
          }
        };
        const focusInput = () => {
          inputElement?.focus();
          inputElement?.select?.();
        };
        if (typeof this.win.requestAnimationFrame === 'function') {
          this.win.requestAnimationFrame(focusInput);
        } else {
          focusInput();
        }
      } else {
        const focusPreferredAction = () => {
          const preferredButton = config.preferredAction === 'cancel'
            ? cancelBtn
            : okBtn || cancelBtn;
          preferredButton?.focus?.();
        };
        if (typeof this.win.requestAnimationFrame === 'function') {
          this.win.requestAnimationFrame(focusPreferredAction);
        } else {
          focusPreferredAction();
        }
      }
    });
  }

  async showPrompt(messageOrConfig, title = null) {
    const isConfigMode = typeof messageOrConfig === 'object' && messageOrConfig !== null;
    const config = isConfigMode ? messageOrConfig : { message: messageOrConfig, title };
    const result = await this.showConfirm({
      title: config.title || title || this.getText('common.confirm', 'Confirm'),
      message: String(config.message || ''),
      confirmText: config.confirmText || this.getText('common.confirm', 'OK'),
      cancelText: config.cancelText || this.getText('common.cancel', 'Cancel'),
      footerText: config.footerText == null ? '' : String(config.footerText),
      inputConfig: {
        id: 'app-dialog-prompt-input',
        type: config.inputType || 'text',
        label: config.label || '',
        value: config.defaultValue == null ? '' : String(config.defaultValue),
        placeholder: config.placeholder == null ? '' : String(config.placeholder),
        min: config.min,
        max: config.max,
        step: config.step,
        inputMode: config.inputMode,
        autocomplete: config.autocomplete || 'off',
        trim: config.trim,
        required: config.required,
        requiredMessage: config.requiredMessage,
        validate: config.validate
      },
      returnDetails: true
    });

    return result?.confirmed ? result.inputValue : null;
  }
}

export function registerDialogManagerGlobal(win = window, doc = document) {
  const dialog = new DialogManager(win, doc);
  win.appDialog = dialog;
  return dialog;
}
