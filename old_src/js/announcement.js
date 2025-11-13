// Announcement Management Module
// Handles announcement display and user preferences

class AnnouncementManager {
    constructor() {
        this.announcementData = null;
        this.modal = document.getElementById('announcement-modal');
        this.titleElement = document.getElementById('announcement-title');
        this.contentElement = document.getElementById('announcement-content');
        this.okButton = document.getElementById('announcement-ok-btn');
        this.noShowButton = document.getElementById('announcement-no-show-btn');
        
        this.setupEventListeners();
        this.loadAnnouncementData();
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
    
    async loadAnnouncementData() {
        try {
            const response = await fetch('announcements.json');
            this.announcementData = await response.json();
            this.updateSettingsContent();
            this.checkAndShowAnnouncement();
        } catch (error) {
            console.warn('Failed to load announcement data:', error);
        }
    }
    
    checkAndShowAnnouncement() {
        // Check if user has chosen not to show the announcement
        const hideAnnouncement = localStorage.getItem('hideAnnouncement');
        
        if (!hideAnnouncement && this.announcementData) {
            // Show announcement on first visit
            this.showModal();
        }
    }
    
    showModal() {
        if (!this.announcementData) return;
        
        // Set title and content
        this.titleElement.textContent = this.announcementData.title;
        this.contentElement.textContent = this.announcementData.content.join('\n');
        
        // Show modal
        this.modal.classList.add('show');
    }
    
    closeModal() {
        this.modal.classList.remove('show');
    }
    
    updateSettingsContent() {
        if (!this.announcementData) return;
        
        const settingsContent = document.getElementById('settings-announcement-content');
        if (settingsContent) {
            settingsContent.textContent = this.announcementData.content.join('\n');
        }
    }
    
    // Public method to show announcement from settings
    showFromSettings() {
        this.showModal();
    }
}
