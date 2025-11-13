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
    }
    
    toggleTimeDisplayArea() {
        if (this.timeDisplayArea.classList.contains('show')) {
            this.hideTimeDisplayArea();
        } else {
            this.showTimeDisplayArea();
        }
    }
    
    showTimeDisplayArea() {
        this.timeDisplayArea.classList.add('show');
        
        // Position time-display-area above the "小功能" area (feature-area)
        const featureArea = document.getElementById('feature-area');
        if (featureArea && featureArea.classList.contains('show')) {
            const featureRect = featureArea.getBoundingClientRect();
            
            // Position above the feature area
            this.timeDisplayArea.style.bottom = 'auto';
            this.timeDisplayArea.style.left = `${featureRect.left}px`;
            this.timeDisplayArea.style.top = `${featureRect.top - 10}px`;
            this.timeDisplayArea.style.transform = 'translateY(-100%)';
        }
        
        // Also show the time display if not already shown
        if (!this.timeDisplayManager.enabled) {
            this.timeDisplayManager.show();
        }
    }
    
    hideTimeDisplayArea() {
        this.timeDisplayArea.classList.remove('show');
    }
}
