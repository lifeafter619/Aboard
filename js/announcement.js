// Announcement Management Module
// Handles announcement display and user preferences

class AnnouncementManager {
    constructor() {
        this.modal = document.getElementById('announcement-modal');
        this.titleElement = document.getElementById('announcement-title');
        this.contentElement = document.getElementById('announcement-content');
        this.okButton = document.getElementById('announcement-ok-btn');
        this.noShowButton = document.getElementById('announcement-no-show-btn');
        
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
                // Convert links to HTML anchor tags
                const htmlContent = content.map(line => {
                    // Match URLs in the text
                    return line.replace(/(https?:\/\/[^\s]+)/g, '<a href="$1" target="_blank" rel="noopener noreferrer">$1</a>');
                }).join('<br>');
                this.contentElement.innerHTML = htmlContent;
            } else {
                this.contentElement.textContent = content;
            }
        }
        
        // Show modal
        this.modal.classList.add('show');
    }
    
    closeModal() {
        this.modal.classList.remove('show');
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
                    // Convert links to HTML anchor tags
                    const htmlContent = content.map(line => {
                        // Match URLs in the text
                        return line.replace(/(https?:\/\/[^\s]+)/g, '<a href="$1" target="_blank" rel="noopener noreferrer" style="color: #007AFF; text-decoration: none;">$1</a>');
                    }).join('<br>');
                    settingsContent.innerHTML = htmlContent;
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
