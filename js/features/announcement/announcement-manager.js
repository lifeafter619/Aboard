function safeAnnouncementStorageGetItem(key) {
  try {
    return localStorage.getItem(key);
  } catch (error) {
    console.warn(`Failed to read announcement localStorage key "${key}":`, error);
    return null;
  }
}

function safeAnnouncementStorageSetItem(key, value) {
  try {
    localStorage.setItem(key, value);
    return true;
  } catch (error) {
    console.warn(`Failed to write announcement localStorage key "${key}":`, error);
    return false;
  }
}

export class AnnouncementManager {
  constructor(win = window, doc = document) {
    this.win = win;
    this.doc = doc;
    this.modal = this.doc.getElementById('announcement-modal');
    this.titleElement = this.doc.getElementById('announcement-title');
    this.contentElement = this.doc.getElementById('announcement-content');
    this.okButton = this.doc.getElementById('announcement-ok-btn');
    this.noShowButton = this.doc.getElementById('announcement-no-show-btn');
    this.previouslyFocusedElement = null;

    this.setupEventListeners();

    if (this.win.i18n) {
      this.checkAndShowAnnouncement();
      this.updateSettingsContent();
    } else {
      this.win.addEventListener('i18nReady', () => {
        this.checkAndShowAnnouncement();
        this.updateSettingsContent();
      });
    }

    this.win.addEventListener('localeChanged', () => {
      this.updateSettingsContent();
    });
  }

  setupEventListeners() {
    if (this.modal) {
      this.modal.setAttribute('role', 'dialog');
      this.modal.setAttribute('aria-modal', 'true');
      this.modal.setAttribute('aria-labelledby', 'announcement-title');
      this.modal.setAttribute('aria-describedby', 'announcement-content');
      this.modal.tabIndex = -1;
    }

    this.okButton?.addEventListener('click', () => {
      this.closeModal();
    });

    this.noShowButton?.addEventListener('click', () => {
      safeAnnouncementStorageSetItem('hideAnnouncement', 'true');
      this.closeModal();
    });

    this.modal?.addEventListener('click', (e) => {
      if (e.target === this.modal) {
        this.closeModal();
      }
    });

    this.modal?.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        this.closeModal();
      }
    });
  }

  checkAndShowAnnouncement() {
    const hideAnnouncement = safeAnnouncementStorageGetItem('hideAnnouncement');

    if (!hideAnnouncement && this.win.i18n) {
      this.showModal();
    }
  }

  showModal() {
    if (!this.win.i18n || !this.modal || !this.titleElement || !this.contentElement) return;

    this.previouslyFocusedElement = this.doc.activeElement && this.doc.activeElement !== this.doc.body
      ? this.doc.activeElement
      : null;

    if (this.win.drawingBoard?.syncResizableModalState) {
      this.win.drawingBoard.syncResizableModalState('announcement-modal');
    } else {
      this.win.setTimeout(() => {
        this.win.drawingBoard?.syncResizableModalState?.('announcement-modal');
      }, 0);
    }

    this.titleElement.textContent = this.win.i18n.t('settings.announcement.title');

    const content = this.win.i18n.t('settings.announcement.content');
    if (this.win.RichTextParser) {
      this.contentElement.innerHTML = this.win.RichTextParser.parse(content);
    } else if (Array.isArray(content)) {
      this.contentElement.innerHTML = '';
      content.forEach((line, i) => {
        if (i > 0) this.contentElement.appendChild(this.doc.createElement('br'));
        const parts = line.split(/(https?:\/\/[^\s]+)/g);
        parts.forEach(part => {
          if (/^https?:\/\//.test(part)) {
            const a = this.doc.createElement('a');
            a.href = part;
            a.target = '_blank';
            a.rel = 'noopener noreferrer';
            a.textContent = part;
            this.contentElement.appendChild(a);
          } else {
            this.contentElement.appendChild(this.doc.createTextNode(part));
          }
        });
      });
    } else {
      this.contentElement.textContent = content;
    }

    this.modal.classList.add('show');
    const focusTarget = this.okButton || this.modal;
    if (typeof this.win.requestAnimationFrame === 'function') {
      this.win.requestAnimationFrame(() => focusTarget?.focus?.());
    } else {
      focusTarget?.focus?.();
    }
  }

  closeModal() {
    const restoreFocusTarget = this.previouslyFocusedElement;
    this.previouslyFocusedElement = null;
    this.modal?.classList?.remove('show');
    if (typeof this.win.requestAnimationFrame === 'function') {
      this.win.requestAnimationFrame(() => restoreFocusTarget?.focus?.());
    } else {
      restoreFocusTarget?.focus?.();
    }
  }

  updateSettingsContent() {
    if (!this.win.i18n) return;

    const settingsContent = this.doc.getElementById('settings-announcement-content');
    if (!settingsContent) return;

    const content = this.win.i18n.t('settings.announcement.content');
    if (this.win.RichTextParser) {
      settingsContent.innerHTML = this.win.RichTextParser.parse(content);
    } else if (Array.isArray(content)) {
      settingsContent.innerHTML = '';
      content.forEach((line, i) => {
        if (i > 0) settingsContent.appendChild(this.doc.createElement('br'));
        const parts = line.split(/(https?:\/\/[^\s]+)/g);
        parts.forEach(part => {
          if (/^https?:\/\//.test(part)) {
            const a = this.doc.createElement('a');
            a.href = part;
            a.target = '_blank';
            a.rel = 'noopener noreferrer';
            a.style.cssText = 'color: #007AFF; text-decoration: none;';
            a.textContent = part;
            settingsContent.appendChild(a);
          } else {
            settingsContent.appendChild(this.doc.createTextNode(part));
          }
        });
      });
    } else {
      settingsContent.textContent = content;
    }
  }

  showFromSettings() {
    this.showModal();
  }
}

export function registerAnnouncementManagerGlobal(win = window, doc = document) {
  class BoundAnnouncementManager extends AnnouncementManager {
    constructor(...args) {
      super(win, doc, ...args);
    }
  }

  win.AnnouncementManager = BoundAnnouncementManager;
  return BoundAnnouncementManager;
}
