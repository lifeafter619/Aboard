export class AnnouncementManager {
  constructor() {
    this.modal = document.getElementById('announcement-modal');
    this.titleElement = document.getElementById('announcement-title');
    this.contentElement = document.getElementById('announcement-content');
    this.okButton = document.getElementById('announcement-ok-btn');
    this.noShowButton = document.getElementById('announcement-no-show-btn');

    this.setupEventListeners();

    if (window.i18n) {
      this.checkAndShowAnnouncement();
      this.updateSettingsContent();
    } else {
      window.addEventListener('i18nReady', () => {
        this.checkAndShowAnnouncement();
        this.updateSettingsContent();
      });
    }

    window.addEventListener('localeChanged', () => {
      this.updateSettingsContent();
    });
  }

  setupEventListeners() {
    this.okButton?.addEventListener('click', () => {
      this.closeModal();
    });

    this.noShowButton?.addEventListener('click', () => {
      localStorage.setItem('hideAnnouncement', 'true');
      this.closeModal();
    });

    this.modal?.addEventListener('click', (e) => {
      if (e.target === this.modal) {
        this.closeModal();
      }
    });
  }

  checkAndShowAnnouncement() {
    const hideAnnouncement = localStorage.getItem('hideAnnouncement');

    if (!hideAnnouncement && window.i18n) {
      this.showModal();
    }
  }

  showModal() {
    if (!window.i18n || !this.modal || !this.titleElement || !this.contentElement) return;

    if (window.drawingBoard?.syncResizableModalState) {
      window.drawingBoard.syncResizableModalState('announcement-modal');
    } else {
      window.setTimeout(() => {
        window.drawingBoard?.syncResizableModalState?.('announcement-modal');
      }, 0);
    }

    this.titleElement.textContent = window.i18n.t('settings.announcement.title');

    const content = window.i18n.t('settings.announcement.content');
    if (window.RichTextParser) {
      this.contentElement.innerHTML = window.RichTextParser.parse(content);
    } else if (Array.isArray(content)) {
      const htmlContent = content
        .map((line) => line.replace(/(https?:\/\/[^\s]+)/g, '<a href="$1" target="_blank" rel="noopener noreferrer">$1</a>'))
        .join('<br>');
      this.contentElement.innerHTML = htmlContent;
    } else {
      this.contentElement.textContent = content;
    }

    this.modal.classList.add('show');
  }

  closeModal() {
    this.modal?.classList?.remove('show');
  }

  updateSettingsContent() {
    if (!window.i18n) return;

    const settingsContent = document.getElementById('settings-announcement-content');
    if (!settingsContent) return;

    const content = window.i18n.t('settings.announcement.content');
    if (window.RichTextParser) {
      settingsContent.innerHTML = window.RichTextParser.parse(content);
    } else if (Array.isArray(content)) {
      const htmlContent = content
        .map((line) => line.replace(/(https?:\/\/[^\s]+)/g, '<a href="$1" target="_blank" rel="noopener noreferrer" style="color: #007AFF; text-decoration: none;">$1</a>'))
        .join('<br>');
      settingsContent.innerHTML = htmlContent;
    } else {
      settingsContent.textContent = content;
    }
  }

  showFromSettings() {
    this.showModal();
  }
}

export function registerAnnouncementManagerGlobal(win = window) {
  win.AnnouncementManager = AnnouncementManager;
  return AnnouncementManager;
}
