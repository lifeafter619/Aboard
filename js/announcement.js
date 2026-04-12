// Announcement Management Module
// Handles announcement display and user preferences

class AnnouncementManager {
    constructor() {
        this.modal = document.getElementById('announcement-modal');
        this.titleElement = document.getElementById('announcement-title');
        this.contentElement = document.getElementById('announcement-content');
        this.okButton = document.getElementById('announcement-ok-btn');
        this.noShowButton = document.getElementById('announcement-no-show-btn');
        this.previouslyFocusedElement = null;
        
        this.setupEventListeners();
        
        // Wait for i18n to be ready before checking announcement
        if (window.i18n) {
            this.checkAndShowAnnouncement();
            this.updateSettingsContent();
        } else {
            window.addEventListener('i18nReady', () => {
                this.checkAndShowAnnouncement();
                this.updateSettingsContent();
            });
        }
        
        // Listen for language changes to update announcement content
        window.addEventListener('localeChanged', () => {
            this.updateSettingsContent();
        });
    }
    
    setupEventListeners() {
        this.modal.setAttribute('role', 'dialog');
        this.modal.setAttribute('aria-modal', 'true');
        this.modal.setAttribute('aria-labelledby', 'announcement-title');
        this.modal.setAttribute('aria-describedby', 'announcement-content');
        this.modal.tabIndex = -1;

        // OK button - just close the modal
        this.okButton.addEventListener('click', () => {
            this.closeModal();
        });
        
        // Don't show again button - save preference and close
        this.noShowButton.addEventListener('click', () => {
            localStorage.setItem('hideAnnouncement', 'true');
            this.closeModal();
        });
        
        // Close on background click
        this.modal.addEventListener('click', (e) => {
            if (e.target === this.modal) {
                this.closeModal();
            }
        });

        this.modal.addEventListener('keydown', (event) => {
            if (event.key === 'Escape') {
                event.preventDefault();
                this.closeModal();
            }
        });
    }
    
    checkAndShowAnnouncement() {
        // Check if user has chosen not to show the announcement
        const hideAnnouncement = localStorage.getItem('hideAnnouncement');
        
        if (!hideAnnouncement && window.i18n) {
            // Show announcement on first visit
            this.showModal();
        }
    }
    
    showModal() {
        if (!window.i18n) return;
        this.previouslyFocusedElement = document.activeElement && document.activeElement !== document.body
            ? document.activeElement
            : null;

        if (window.drawingBoard?.syncResizableModalState) {
            window.drawingBoard.syncResizableModalState('announcement-modal');
        } else {
            window.setTimeout(() => {
                window.drawingBoard?.syncResizableModalState?.('announcement-modal');
            }, 0);
        }
        
        // Set title and content from i18n
        this.titleElement.textContent = window.i18n.t('settings.announcement.title');
        
        // Get content array from i18n and convert links to clickable
        const content = window.i18n.t('settings.announcement.content');
        if (window.RichTextParser) {
            this.contentElement.innerHTML = window.RichTextParser.parse(content);
        } else {
            // Fallback if RichTextParser is not loaded
            if (Array.isArray(content)) {
                // Use textContent for each line, create links via DOM for safety
                this.contentElement.innerHTML = '';
                content.forEach((line, i) => {
                    if (i > 0) this.contentElement.appendChild(document.createElement('br'));
                    // Split line by URLs and create text/link nodes
                    const parts = line.split(/(https?:\/\/[^\s]+)/g);
                    parts.forEach(part => {
                        if (/^https?:\/\//.test(part)) {
                            const a = document.createElement('a');
                            a.href = part;
                            a.target = '_blank';
                            a.rel = 'noopener noreferrer';
                            a.textContent = part;
                            this.contentElement.appendChild(a);
                        } else {
                            this.contentElement.appendChild(document.createTextNode(part));
                        }
                    });
                });
            } else {
                this.contentElement.textContent = content;
            }
        }
        
        // Show modal
        this.modal.classList.add('show');
        const focusTarget = this.okButton || this.modal;
        if (typeof window.requestAnimationFrame === 'function') {
            window.requestAnimationFrame(() => focusTarget?.focus?.());
        } else {
            focusTarget?.focus?.();
        }
    }
    
    closeModal() {
        const restoreFocusTarget = this.previouslyFocusedElement;
        this.previouslyFocusedElement = null;
        this.modal.classList.remove('show');
        if (typeof window.requestAnimationFrame === 'function') {
            window.requestAnimationFrame(() => restoreFocusTarget?.focus?.());
        } else {
            restoreFocusTarget?.focus?.();
        }
    }
    
    updateSettingsContent() {
        if (!window.i18n) return;
        
        const settingsContent = document.getElementById('settings-announcement-content');
        if (settingsContent) {
            const content = window.i18n.t('settings.announcement.content');
            if (window.RichTextParser) {
                settingsContent.innerHTML = window.RichTextParser.parse(content);
            } else {
                if (Array.isArray(content)) {
                    settingsContent.innerHTML = '';
                    content.forEach((line, i) => {
                        if (i > 0) settingsContent.appendChild(document.createElement('br'));
                        const parts = line.split(/(https?:\/\/[^\s]+)/g);
                        parts.forEach(part => {
                            if (/^https?:\/\//.test(part)) {
                                const a = document.createElement('a');
                                a.href = part;
                                a.target = '_blank';
                                a.rel = 'noopener noreferrer';
                                a.style.cssText = 'color: #007AFF; text-decoration: none;';
                                a.textContent = part;
                                settingsContent.appendChild(a);
                            } else {
                                settingsContent.appendChild(document.createTextNode(part));
                            }
                        });
                    });
                } else {
                    settingsContent.textContent = content;
                }
            }
        }
    }
    
    // Public method to show announcement from settings
    showFromSettings() {
        this.showModal();
    }
}
