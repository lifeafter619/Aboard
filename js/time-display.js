// Time Display Module
// Handles the time and date display feature

class TimeDisplayManager {
    constructor(settingsManager) {
        this.settingsManager = settingsManager;
        this.timeDisplayElement = document.getElementById('time-display');
        this.timeFullscreenModal = document.getElementById('time-fullscreen-modal');
        this.timeFullscreenContent = document.getElementById('time-fullscreen-content');
        this.updateInterval = null;
        this.fullscreenUpdateInterval = null;
        this.isFullscreen = false;
        
        // Load settings from localStorage
        // Default to true if no value is stored (first time load)
        const storedEnabled = localStorage.getItem('timeDisplayEnabled');
        this.enabled = storedEnabled === null ? true : storedEnabled === 'true';

        // Auto-detect time format if not set
        const storedTimeFormat = localStorage.getItem('timeDisplayTimeFormat');
        if (storedTimeFormat) {
            this.timeFormat = storedTimeFormat;
        } else {
            // Detect system preference
            const dateString = new Date().toLocaleTimeString();
            const is12Hour = /AM|PM/.test(dateString) || /上午|下午/.test(dateString);
            this.timeFormat = is12Hour ? '12h' : '24h';
        }

        this.dateFormat = localStorage.getItem('timeDisplayDateFormat') || 'auto'; // Default to auto
        this.color = localStorage.getItem('timeDisplayColor') || '#000000';
        this.bgColor = localStorage.getItem('timeDisplayBgColor') || '#FFFFFF';
        this.fontSize = parseInt(localStorage.getItem('timeDisplayFontSize')) || 16;
        this.opacity = parseInt(localStorage.getItem('timeDisplayOpacity')) || 100;
        this.showDate = localStorage.getItem('timeDisplayShowDate') !== 'false'; // Default true
        this.showTime = localStorage.getItem('timeDisplayShowTime') !== 'false'; // Default true
        this.fullscreenMode = localStorage.getItem('timeDisplayFullscreenMode') || 'double'; // Default 'double' (disabled/single/double)
        this.fullscreenFontSize = parseInt(localStorage.getItem('timeDisplayFullscreenFontSize')) || 15; // Default 15 (vmin percentage)
        this.fullscreenTitleFontSize = parseInt(localStorage.getItem('timeDisplayFullscreenTitleFontSize')) || 5; // Default 5 (vmin percentage) for date
        this.fullscreenColor = localStorage.getItem('timeDisplayFullscreenColor') || '#ffffff';
        this.fullscreenBgColor = localStorage.getItem('timeDisplayFullscreenBgColor') || '#000000';
        this.fullscreenOpacity = parseInt(localStorage.getItem('timeDisplayFullscreenOpacity')) || 95;

        // Get user's current timezone by default, or use saved value
        this.timezone = localStorage.getItem('timeDisplayTimezone') || Intl.DateTimeFormat().resolvedOptions().timeZone;
        
        // Click detection settings
        this.clickTimeout = null;
        this.clickCount = 0;
        this.doubleClickDelay = 500; // Relaxed double click delay
        
        this.applySettings();
        this.setupFullscreenListeners();
        this.updatePosition();
    }
    
    updatePosition() {
        // Get the control position from settings manager
        const position = this.settingsManager ? this.settingsManager.controlPosition : 'top-right';
        
        // Remove all position classes
        this.timeDisplayElement.classList.remove('top-right', 'top-left', 'bottom-right', 'bottom-left');
        
        // Add the current position class
        this.timeDisplayElement.classList.add(position);
    }
    
    toggle() {
        this.enabled = !this.enabled;
        localStorage.setItem('timeDisplayEnabled', this.enabled);
        
        if (this.enabled) {
            this.show();
        } else {
            this.hide();
        }
    }
    
    show() {
        this.enabled = true;
        localStorage.setItem('timeDisplayEnabled', 'true');
        this.timeDisplayElement.classList.add('show');
        this.startUpdating();
    }
    
    hide() {
        this.enabled = false;
        localStorage.setItem('timeDisplayEnabled', 'false');
        this.timeDisplayElement.classList.remove('show');
        this.stopUpdating();
    }
    
    startUpdating() {
        // Update immediately
        this.updateDisplay();
        
        // Update every second
        this.updateInterval = setInterval(() => {
            this.updateDisplay();
        }, 1000);
    }
    
    stopUpdating() {
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
            this.updateInterval = null;
        }
    }
    
    updateDisplay() {
        const now = this.getCurrentTime();
        const timeString = this.formatTime(now);
        const dateString = this.formatDate(now);
        
        let html = '';
        if (this.showTime) {
            html += `<div class="time-line" style="font-size: ${this.fontSize * 1.2}px; font-weight: 600;">${timeString}</div>`;
        }
        if (this.showDate) {
            html += `<div class="time-line" style="font-size: ${this.fontSize}px; ${this.showTime ? 'margin-top: 4px;' : ''}">${dateString}</div>`;
        }
        
        this.timeDisplayElement.innerHTML = html;
    }
    
    getCurrentTime() {
        // Get current time in the specified timezone
        try {
            // Simply return the current date - the timezone will be handled by formatting
            return new Date();
        } catch (e) {
            console.error('Error getting current time:', e);
            return new Date();
        }
    }
    
    formatTime(date) {
        // Apply timezone conversion
        try {
            // Convert to specified timezone using toLocaleString
            const options = { 
                timeZone: this.timezone,
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
                hour12: this.timeFormat === '12h'
            };
            const timeStr = date.toLocaleString('en-US', options);
            
            // Parse the formatted string to get hours, minutes, seconds
            if (this.timeFormat === '12h') {
                // Format: "09:37:03 AM" or "09:37:03 PM"
                const parts = timeStr.match(/(\d+):(\d+):(\d+)\s*(AM|PM)/i);
                if (parts) {
                    const hour12 = parseInt(parts[1]);
                    const m = parseInt(parts[2]);
                    const s = parseInt(parts[3]);
                    const period = parts[4].toUpperCase();
                    
                    const amText = window.i18n ? window.i18n.t('timeDisplay.am') : 'AM';
                    const pmText = window.i18n ? window.i18n.t('timeDisplay.pm') : 'PM';
                    const ampm = period === 'PM' ? pmText : amText;
                    return `${ampm} ${this.padZero(hour12)}:${this.padZero(m)}:${this.padZero(s)}`;
                }
            } else {
                // Format: "09:37:03"
                const parts = timeStr.match(/(\d+):(\d+):(\d+)/);
                if (parts) {
                    return `${this.padZero(parseInt(parts[1]))}:${this.padZero(parseInt(parts[2]))}:${this.padZero(parseInt(parts[3]))}`;
                }
            }
        } catch (e) {
            console.error('Error formatting time with timezone:', e);
        }
        
        // Fallback to local time
        const hours = date.getHours();
        const minutes = date.getMinutes();
        const seconds = date.getSeconds();
        
        if (this.timeFormat === '12h') {
            const hour12 = hours % 12 || 12;
            const amText = window.i18n ? window.i18n.t('timeDisplay.am') : 'AM';
            const pmText = window.i18n ? window.i18n.t('timeDisplay.pm') : 'PM';
            const ampm = hours >= 12 ? pmText : amText;
            return `${ampm} ${this.padZero(hour12)}:${this.padZero(minutes)}:${this.padZero(seconds)}`;
        } else {
            return `${this.padZero(hours)}:${this.padZero(minutes)}:${this.padZero(seconds)}`;
        }
    }
    
    formatDate(date) {
        // Use translated weekday names from i18n
        const weekdayKeys = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
        const weekday = window.i18n ? window.i18n.t(`days.${weekdayKeys[date.getDay()]}`) : ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六'][date.getDay()];
        
        // Handle "auto" format using Intl.DateTimeFormat
        if (this.dateFormat === 'auto') {
            try {
                const options = {
                    timeZone: this.timezone,
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                    weekday: 'long'
                };
                // Use current locale if available
                const locale = window.i18n ? window.i18n.getCurrentLocale() : 'zh-CN';
                return new Intl.DateTimeFormat(locale, options).format(date);
            } catch (e) {
                console.error('Error auto-formatting date:', e);
                // Fallback to yyyy-mm-dd
            }
        }

        const year = date.getFullYear();
        const month = date.getMonth() + 1;
        const day = date.getDate();

        // Apply timezone conversion for date if needed
        try {
            if (this.timezone !== Intl.DateTimeFormat().resolvedOptions().timeZone) {
                const options = {
                    timeZone: this.timezone,
                    year: 'numeric',
                    month: '2-digit',
                    day: '2-digit'
                };
                const parts = new Intl.DateTimeFormat('en-US', options).formatToParts(date);
                
                let tzYear, tzMonth, tzDay;
                parts.forEach(part => {
                    if (part.type === 'year') tzYear = parseInt(part.value);
                    if (part.type === 'month') tzMonth = parseInt(part.value);
                    if (part.type === 'day') tzDay = parseInt(part.value);
                });
                
                if (tzYear && tzMonth && tzDay) {
                    switch (this.dateFormat) {
                        case 'yyyy-mm-dd':
                            return `${tzYear}-${this.padZero(tzMonth)}-${this.padZero(tzDay)} ${weekday}`;
                        case 'mm-dd-yyyy':
                            return `${this.padZero(tzMonth)}-${this.padZero(tzDay)}-${tzYear} ${weekday}`;
                        case 'dd-mm-yyyy':
                            return `${this.padZero(tzDay)}-${this.padZero(tzMonth)}-${tzYear} ${weekday}`;
                        case 'chinese':
                            return `${tzYear}年${tzMonth}月${tzDay}日 ${weekday}`;
                        default:
                            return `${tzYear}-${this.padZero(tzMonth)}-${this.padZero(tzDay)} ${weekday}`;
                    }
                }
            }
        } catch (e) {
            console.error('Error formatting date with timezone:', e);
        }
        
        // Use local date
        switch (this.dateFormat) {
            case 'yyyy-mm-dd':
                return `${year}-${this.padZero(month)}-${this.padZero(day)} ${weekday}`;
            case 'mm-dd-yyyy':
                return `${this.padZero(month)}-${this.padZero(day)}-${year} ${weekday}`;
            case 'dd-mm-yyyy':
                return `${this.padZero(day)}-${this.padZero(month)}-${year} ${weekday}`;
            case 'chinese':
                return `${year}年${month}月${day}日 ${weekday}`;
            default:
                return `${year}-${this.padZero(month)}-${this.padZero(day)} ${weekday}`;
        }
    }
    
    padZero(num) {
        return num.toString().padStart(2, '0');
    }
    
    setTimeFormat(format) {
        this.timeFormat = format;
        localStorage.setItem('timeDisplayTimeFormat', format);
        if (this.enabled) {
            this.updateDisplay();
        }
    }
    
    setDateFormat(format) {
        this.dateFormat = format;
        localStorage.setItem('timeDisplayDateFormat', format);
        if (this.enabled) {
            this.updateDisplay();
        }
    }
    
    setTimezone(timezone) {
        this.timezone = timezone;
        localStorage.setItem('timeDisplayTimezone', timezone);
        if (this.enabled) {
            this.updateDisplay();
        }
    }
    
    setColor(color) {
        this.color = color;
        localStorage.setItem('timeDisplayColor', color);
        this.applySettings();
    }
    
    setBgColor(bgColor) {
        this.bgColor = bgColor;
        localStorage.setItem('timeDisplayBgColor', bgColor);
        this.applySettings();
    }
    
    setFullscreenMode(mode) {
        this.fullscreenMode = mode;
        localStorage.setItem('timeDisplayFullscreenMode', mode);
    }
    
    setFullscreenFontSize(size) {
        // Constrain to 10-85% range for safety
        this.fullscreenFontSize = Math.max(10, Math.min(85, size));
        localStorage.setItem('timeDisplayFullscreenFontSize', this.fullscreenFontSize);
        if (this.isFullscreen) {
            this.updateFullscreenDisplay();
        }
    }
    
    setFullscreenTitleFontSize(size) {
        // Constrain to 2-20% range for date/title
        this.fullscreenTitleFontSize = Math.max(2, Math.min(20, size));
        localStorage.setItem('timeDisplayFullscreenTitleFontSize', this.fullscreenTitleFontSize);
        if (this.isFullscreen) {
            this.updateFullscreenDisplay();
        }
    }

    setFullscreenColor(color) {
        this.fullscreenColor = color;
        localStorage.setItem('timeDisplayFullscreenColor', color);
        if (this.isFullscreen) {
            this.updateFullscreenDisplay();
        }
    }

    setFullscreenBgColor(color) {
        this.fullscreenBgColor = color;
        localStorage.setItem('timeDisplayFullscreenBgColor', color);
        if (this.isFullscreen) {
            this.updateFullscreenDisplay();
        }
    }

    setFullscreenOpacity(opacity) {
        this.fullscreenOpacity = opacity;
        localStorage.setItem('timeDisplayFullscreenOpacity', opacity);
        if (this.isFullscreen) {
            this.updateFullscreenDisplay();
        }
    }
    
    setFontSize(size) {
        this.fontSize = size;
        localStorage.setItem('timeDisplayFontSize', size);
        this.applySettings();
        if (this.enabled) {
            this.updateDisplay();
        }
    }
    
    setOpacity(opacity) {
        this.opacity = opacity;
        localStorage.setItem('timeDisplayOpacity', opacity);
        this.applySettings();
    }
    
    setShowDate(show) {
        this.showDate = show;
        localStorage.setItem('timeDisplayShowDate', show);
        if (this.enabled) {
            this.updateDisplay();
        }
    }
    
    setShowTime(show) {
        this.showTime = show;
        localStorage.setItem('timeDisplayShowTime', show);
        if (this.enabled) {
            this.updateDisplay();
        }
    }
    
    applySettings() {
        this.timeDisplayElement.style.color = this.color;
        this.timeDisplayElement.style.opacity = this.opacity / 100;
        
        // Apply background color (support transparent)
        if (this.bgColor === 'transparent') {
            this.timeDisplayElement.style.backgroundColor = 'transparent';
            this.timeDisplayElement.style.boxShadow = 'none';
        } else {
            this.timeDisplayElement.style.backgroundColor = this.bgColor;
            // Adjust shadow based on background brightness
            const rgb = this.hexToRgb(this.bgColor);
            if (rgb) {
                const brightness = (rgb.r * 299 + rgb.g * 587 + rgb.b * 114) / 1000;
                if (brightness > 128) {
                    this.timeDisplayElement.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.15)';
                } else {
                    this.timeDisplayElement.style.boxShadow = '0 2px 8px rgba(255, 255, 255, 0.15)';
                }
            } else {
                // Fallback shadow for invalid colors
                this.timeDisplayElement.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.15)';
            }
        }
        
        // If enabled, start updating
        if (this.enabled) {
            this.show();
        }
    }
    
    hexToRgb(hex) {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? {
            r: parseInt(result[1], 16),
            g: parseInt(result[2], 16),
            b: parseInt(result[3], 16)
        } : null;
    }
    
    setupFullscreenListeners() {
        // Click listener with support for single/double click modes
        this.timeDisplayElement.addEventListener('click', (e) => {
            if (this.fullscreenMode === 'disabled' || !this.enabled) return;
            
            if (this.fullscreenMode === 'single') {
                // Single-click mode - Enter immediately
                this.enterFullscreen();
            } else if (this.fullscreenMode === 'double') {
                // Double-click mode - Use timeout logic
                this.clickCount++;
                
                if (this.clickCount === 1) {
                    // First click, set timeout
                    this.clickTimeout = setTimeout(() => {
                        // Timeout expired, was just a single click
                        this.clickCount = 0;
                    }, this.doubleClickDelay);
                } else {
                    // Second click within timeout
                    clearTimeout(this.clickTimeout);
                    this.clickCount = 0;
                    this.enterFullscreen();
                }
            }
        });
        
        // Close button
        const closeBtn = document.getElementById('time-fullscreen-close-btn');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => {
                this.exitFullscreen();
            });
        }
        
        // Settings button
        const settingsBtn = document.getElementById('time-fullscreen-settings-btn');
        const settingsPanel = document.getElementById('time-fullscreen-settings-panel');
        if (settingsBtn && settingsPanel) {
            settingsBtn.addEventListener('click', () => {
                const isVisible = settingsPanel.style.display !== 'none';
                settingsPanel.style.display = isVisible ? 'none' : 'block';
                settingsBtn.classList.toggle('active', !isVisible);
            });
        }
        
        // Fullscreen font size slider (time)
        const fontSlider = document.getElementById('time-fullscreen-font-slider');
        if (fontSlider) {
            fontSlider.value = this.fullscreenFontSize;
            fontSlider.addEventListener('input', (e) => {
                this.setFullscreenFontSize(parseFloat(e.target.value));
            });
        }
        
        // Fullscreen title font size slider (date)
        const titleFontSlider = document.getElementById('time-fullscreen-title-font-slider');
        if (titleFontSlider) {
            titleFontSlider.value = this.fullscreenTitleFontSize;
            titleFontSlider.addEventListener('input', (e) => {
                this.setFullscreenTitleFontSize(parseFloat(e.target.value));
            });
        }
        
        // ESC key to exit
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.isFullscreen) {
                this.exitFullscreen();
            }
        });
    }
    
    // Method to directly show fullscreen (called from button)
    showFullscreen() {
        if (!this.enabled) {
            this.show();
        }
        this.enterFullscreen();
    }
    
    enterFullscreen() {
        this.isFullscreen = true;
        this.timeFullscreenModal.classList.add('show');
        this.startFullscreenUpdating();
    }
    
    exitFullscreen() {
        this.isFullscreen = false;
        this.timeFullscreenModal.classList.remove('show');
        this.stopFullscreenUpdating();
    }
    
    startFullscreenUpdating() {
        // Update immediately
        this.updateFullscreenDisplay();
        
        // Update every second
        this.fullscreenUpdateInterval = setInterval(() => {
            this.updateFullscreenDisplay();
        }, 1000);
    }
    
    stopFullscreenUpdating() {
        if (this.fullscreenUpdateInterval) {
            clearInterval(this.fullscreenUpdateInterval);
            this.fullscreenUpdateInterval = null;
        }
    }
    
    updateFullscreenDisplay() {
        const now = this.getCurrentTime();
        const timeString = this.formatTime(now);
        const dateString = this.formatDate(now);
        
        // Use the configurable fullscreen font sizes
        const vmin = Math.min(window.innerWidth, window.innerHeight);
        const timeFontSize = Math.floor(vmin * (this.fullscreenFontSize / 100));
        const dateFontSize = Math.floor(vmin * (this.fullscreenTitleFontSize / 100));
        
        let html = '';
        if (this.showTime) {
            html += `<div class="time-line" style="font-size: ${timeFontSize}px; font-weight: 600; margin-bottom: ${vmin * 0.02}px;">${timeString}</div>`;
        }
        if (this.showDate) {
            html += `<div class="time-line" style="font-size: ${dateFontSize}px;">${dateString}</div>`;
        }
        
        this.timeFullscreenContent.innerHTML = html;
        this.timeFullscreenContent.style.color = this.fullscreenColor;

        // Apply color to controls
        const controls = this.timeFullscreenModal.querySelector('.fullscreen-bottom-controls');
        if (controls) {
            controls.style.color = this.fullscreenColor;
        }

        // Apply background color and opacity to modal
        if (this.timeFullscreenModal) {
            const rgb = this.hexToRgb(this.fullscreenBgColor) || { r: 0, g: 0, b: 0 };
            this.timeFullscreenModal.style.backgroundColor = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${this.fullscreenOpacity / 100})`;
        }
    }
}
