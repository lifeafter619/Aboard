class DialogManager {
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

    showConfirm(message, title = null) {
        this.ensureConfirmModal();
        const modal = this.confirmModal;
        const localeTitle = title || (window.i18n ? window.i18n.t('common.confirm') : 'Confirm');
        const cancelText = window.i18n ? window.i18n.t('common.cancel') : 'Cancel';
        const okText = window.i18n ? window.i18n.t('common.confirm') : 'OK';

        modal.querySelector('#app-confirm-title').textContent = localeTitle;
        modal.querySelector('#app-confirm-message').textContent = String(message || '');
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
            modal.querySelector('#app-confirm-cancel-btn').onclick = () => close(false);
            modal.querySelector('#app-confirm-ok-btn').onclick = () => close(true);
            modal.onclick = (e) => {
                if (e.target === modal) close(false);
            };
            modal.classList.add('show');
        });
    }
}

window.appDialog = new DialogManager();
