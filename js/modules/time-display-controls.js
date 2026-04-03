// Time Display Controls Module
// Handles the time display area panel and its controls

class TimeDisplayControls {
    constructor(timeDisplayManager) {
        this.timeDisplayManager = timeDisplayManager;
        this.timeDisplayArea = document.getElementById('time-display-area');
        this.setupEventListeners();
    }
    
    setupEventListeners() {
        // Time display toggle button
        const timeDisplayFeatureBtn = document.getElementById('time-display-feature-btn');
        if (timeDisplayFeatureBtn) {
            timeDisplayFeatureBtn.addEventListener('click', () => {
                this.toggleTimeDisplayArea();
            });
        }
        
        // Show date checkbox
        const showDateCheckbox = document.getElementById('show-date-checkbox-area');
        if (showDateCheckbox) {
            showDateCheckbox.checked = this.timeDisplayManager.showDate;
            showDateCheckbox.addEventListener('change', (e) => {
                this.timeDisplayManager.setShowDate(e.target.checked);
            });
        }
        
        // Show time checkbox
        const showTimeCheckbox = document.getElementById('show-time-checkbox-area');
        if (showTimeCheckbox) {
            showTimeCheckbox.checked = this.timeDisplayManager.showTime;
            showTimeCheckbox.addEventListener('change', (e) => {
                this.timeDisplayManager.setShowTime(e.target.checked);
            });
        }
        
        // Close button
        const closeBtn = document.getElementById('time-display-area-close-btn');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => {
                this.hideTimeDisplayArea();
            });
        }
        
        // Fullscreen display button
        const fullscreenBtn = document.getElementById('time-display-fullscreen-btn');
        if (fullscreenBtn) {
            fullscreenBtn.addEventListener('click', () => {
                this.timeDisplayManager.showFullscreen();
            });
        }

    }
    
    toggleTimeDisplayArea() {
        if (!this.timeDisplayArea) {
            return;
        }

        if (this.timeDisplayArea.classList.contains('show')) {
            this.hideTimeDisplayArea();
        } else {
            this.showTimeDisplayArea();
        }
    }
    
    showTimeDisplayArea() {
        if (!this.timeDisplayArea) {
            return;
        }

        this.timeDisplayArea.classList.add('show');
        window.drawingBoard?.bringElementToFront(this.timeDisplayArea);

        // First open: center above the trigger button with a small gap.
        // If user has dragged it before, keep user position.
        if (this.timeDisplayArea.dataset.userDragged !== 'true') {
            const triggerBtn = document.getElementById('time-display-feature-btn');
            if (triggerBtn) {
                const btnRect = triggerBtn.getBoundingClientRect();
                const gap = 16;
                this.timeDisplayArea.style.left = `${btnRect.left + (btnRect.width / 2)}px`;
                this.timeDisplayArea.style.top = `${btnRect.top - gap}px`;
                this.timeDisplayArea.style.right = 'auto';
                this.timeDisplayArea.style.bottom = 'auto';
                this.timeDisplayArea.style.transform = 'translate(-50%, -100%)';
            }
        }
        
        // Also show the time display if not already shown
        if (!this.timeDisplayManager.enabled) {
            this.timeDisplayManager.show();
        }
    }
    
    hideTimeDisplayArea() {
        if (!this.timeDisplayArea) {
            return;
        }

        this.timeDisplayArea.classList.remove('show');
    }
}

window.TimeDisplayControls = TimeDisplayControls;
window.AboardTimeDisplayControls = TimeDisplayControls;
