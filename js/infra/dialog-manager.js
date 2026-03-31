export class DialogManager {
  constructor() {
    this.confirmModal = null;
  }

  showAlert(message, type = 'info') {
    const text = String(message || '');
    if (window.drawingBoard?.settingsManager?.toastManager) {
      window.drawingBoard.settingsManager.toastManager.show(text, type);
      return;
    }
    if (window.toastManager) {
      window.toastManager.show(text, type);
      return;
    }
    if (window.ToastManager) {
      new window.ToastManager().show(text, type);
      return;
    }
    console.warn(text);
  }

  ensureConfirmModal() {
    if (this.confirmModal) return;
    const modal = document.createElement('div');
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
          <p id="app-confirm-footer" class="confirm-message app-confirm-footer"></p>
          <div class="confirm-buttons">
            <button id="app-confirm-cancel-btn" class="confirm-btn cancel-btn"></button>
            <button id="app-confirm-ok-btn" class="confirm-btn ok-btn"></button>
          </div>
        </div>
      </div>
    `;
    document.body.appendChild(modal);
    this.confirmModal = modal;
  }

  showConfirm(messageOrConfig, title = null) {
    this.ensureConfirmModal();
    const modal = this.confirmModal;
    const isConfigMode = typeof messageOrConfig === 'object' && messageOrConfig !== null;
    const config = isConfigMode ? messageOrConfig : { message: messageOrConfig, title };
    const localeTitle = config.title || (window.i18n ? window.i18n.t('common.confirm') : 'Confirm');
    const cancelText = config.cancelText || (window.i18n ? window.i18n.t('common.cancel') : 'Cancel');
    const okText = config.confirmText || (window.i18n ? window.i18n.t('common.confirm') : 'OK');
    const message = String(config.message || '');
    const footerText = String(config.footerText || '');
    const selectableItems = Array.isArray(config.selectableItems) ? config.selectableItems : [];
    const optionsContainer = modal.querySelector('#app-confirm-options');
    const footerElement = modal.querySelector('#app-confirm-footer');
    const messageElement = modal.querySelector('#app-confirm-message');

    modal.querySelector('#app-confirm-title').textContent = localeTitle;
    messageElement.textContent = message;
    messageElement.classList.toggle('compact', selectableItems.length > 0 || Boolean(footerText));
    optionsContainer.innerHTML = '';
    optionsContainer.classList.toggle('show', selectableItems.length > 0);
    footerElement.textContent = footerText;
    footerElement.classList.toggle('show', Boolean(footerText));

    selectableItems.forEach((item, index) => {
      const label = document.createElement('label');
      label.className = 'checkbox-label app-confirm-option';

      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.checked = item.checked !== false;
      checkbox.value = item.value ?? String(index);

      const text = document.createElement('span');
      text.textContent = String(item.label || '');

      label.appendChild(checkbox);
      label.appendChild(text);
      optionsContainer.appendChild(label);
    });
    modal.querySelector('#app-confirm-cancel-btn').textContent = cancelText;
    modal.querySelector('#app-confirm-ok-btn').textContent = okText;

    return new Promise((resolve) => {
      const close = (result) => {
        modal.classList.remove('show');
        modal.querySelector('#app-confirm-cancel-btn').onclick = null;
        modal.querySelector('#app-confirm-ok-btn').onclick = null;
        modal.onclick = null;
        resolve(result);
      };
      modal.querySelector('#app-confirm-cancel-btn').onclick = () => {
        close(config.returnDetails ? { confirmed: false, selectedValues: [] } : false);
      };
      modal.querySelector('#app-confirm-ok-btn').onclick = () => {
        const selectedValues = Array.from(optionsContainer.querySelectorAll('input[type="checkbox"]:checked'))
          .map((input) => input.value);
        if (selectableItems.length > 0 && config.requireSelection && selectedValues.length === 0) {
          this.showAlert(
            config.requireSelectionMessage
              || (window.i18n ? window.i18n.t('settings.more.selectCacheType') : 'Please select at least one item.'),
            'warning'
          );
          return;
        }
        if (config.returnDetails) {
          close({ confirmed: true, selectedValues });
          return;
        }
        close(true);
      };
      modal.onclick = (e) => {
        if (e.target === modal) {
          close(config.returnDetails ? { confirmed: false, selectedValues: [] } : false);
        }
      };
      modal.classList.add('show');
    });
  }
}

export function registerDialogManagerGlobal(win = window) {
  const dialog = new DialogManager();
  win.appDialog = dialog;
  return dialog;
}
