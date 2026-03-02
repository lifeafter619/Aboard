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

        const helpBtn = document.getElementById('time-display-area-help-btn');
        if (helpBtn) {
            helpBtn.addEventListener('click', () => {
                window.drawingBoard?.helpSystem?.showHelp('help.features.timeDisplay');
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
        window.drawingBoard?.bringElementToFront(this.timeDisplayArea);
        
        // Position time-display-area above the "小功能" area (feature-area)
        // Fixed: Use proper inset positioning instead of transform for better accuracy
        const featureArea = document.getElementById('feature-area');
        if (featureArea && featureArea.classList.contains('show')) {
            const featureRect = featureArea.getBoundingClientRect();
            const timeDisplayHeight = this.timeDisplayArea.offsetHeight || 200; // Estimate if not rendered yet
            
            // Position above the feature area using inset (top, right, bottom, left)
            // Calculate top position: feature area top - time display height - gap
            const topPosition = featureRect.top - timeDisplayHeight - 10;
            
            this.timeDisplayArea.style.transform = 'none';
            this.timeDisplayArea.style.top = `${topPosition}px`;
            this.timeDisplayArea.style.left = `${featureRect.left}px`;
            this.timeDisplayArea.style.right = 'auto';
            this.timeDisplayArea.style.bottom = 'auto';
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
