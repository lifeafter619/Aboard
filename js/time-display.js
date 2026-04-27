// Time Display Module
// Handles the time and date display feature

function scheduleTimeDisplayFrame(win = window) {
    return typeof win.requestAnimationFrame === 'function'
        ? win.requestAnimationFrame.bind(win)
        : (callback) => callback();
}

function getTimeDisplayFocusableElement(doc = document) {
    return doc.activeElement && doc.activeElement !== doc.body
        ? doc.activeElement
        : null;
}

function focusTimeDisplayElement(element, win = window) {
    scheduleTimeDisplayFrame(win)(() => {
        element?.focus?.();
    });
}

function safeTimeDisplayStorageGetItem(key) {
    try {
        return localStorage.getItem(key);
    } catch (error) {
        console.warn(`Failed to read time display localStorage key "${key}":`, error);
        return null;
    }
}

function safeTimeDisplayStorageSetItem(key, value) {
    try {
        localStorage.setItem(key, value);
        return true;
    } catch (error) {
        console.warn(`Failed to write time display localStorage key "${key}":`, error);
        return false;
    }
}

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
        const storedEnabled = safeTimeDisplayStorageGetItem('timeDisplayEnabled');
        this.enabled = storedEnabled === null ? true : storedEnabled === 'true';

        // Auto-detect time format if not set
        const storedTimeFormat = safeTimeDisplayStorageGetItem('timeDisplayTimeFormat');
        if (storedTimeFormat) {
            this.timeFormat = storedTimeFormat;
        } else {
            // Detect system preference
            const dateString = new Date().toLocaleTimeString();
            const is12Hour = /AM|PM/.test(dateString) || /上午|下午/.test(dateString);
            this.timeFormat = is12Hour ? '12h' : '24h';
        }

        const storedFontSize = parseInt(safeTimeDisplayStorageGetItem('timeDisplayFontSize'), 10);
        const storedOpacity = parseInt(safeTimeDisplayStorageGetItem('timeDisplayOpacity'), 10);
        const storedFullscreenFontSize = parseInt(safeTimeDisplayStorageGetItem('timeDisplayFullscreenFontSize'), 10);
        const storedFullscreenTitleFontSize = parseInt(safeTimeDisplayStorageGetItem('timeDisplayFullscreenTitleFontSize'), 10);
        const storedFullscreenOpacity = parseInt(safeTimeDisplayStorageGetItem('timeDisplayFullscreenOpacity'), 10);

        this.dateFormat = safeTimeDisplayStorageGetItem('timeDisplayDateFormat') || 'auto'; // Default to auto
        this.color = safeTimeDisplayStorageGetItem('timeDisplayColor') || '#000000';
        this.bgColor = safeTimeDisplayStorageGetItem('timeDisplayBgColor') || '#FFFFFF';
        this.fontSize = Number.isNaN(storedFontSize) ? 16 : Math.max(12, Math.min(48, storedFontSize));
        this.opacity = Number.isNaN(storedOpacity) ? 100 : Math.max(0, Math.min(100, storedOpacity));
        this.showDate = safeTimeDisplayStorageGetItem('timeDisplayShowDate') !== 'false'; // Default true
        this.showTime = safeTimeDisplayStorageGetItem('timeDisplayShowTime') !== 'false'; // Default true
        this.fullscreenMode = safeTimeDisplayStorageGetItem('timeDisplayFullscreenMode') || 'double'; // Default 'double' (disabled/single/double)
        this.fullscreenFontSize = Number.isNaN(storedFullscreenFontSize) ? 15 : Math.max(10, Math.min(85, storedFullscreenFontSize)); // Default 15 (vmin percentage)
        this.fullscreenTitleFontSize = Number.isNaN(storedFullscreenTitleFontSize) ? 5 : Math.max(2, Math.min(20, storedFullscreenTitleFontSize)); // Default 5 (vmin percentage) for date
        this.fullscreenColor = safeTimeDisplayStorageGetItem('timeDisplayFullscreenColor') || '#ffffff';
        this.fullscreenBgColor = safeTimeDisplayStorageGetItem('timeDisplayFullscreenBgColor') || '#000000';
        this.fullscreenOpacity = Number.isNaN(storedFullscreenOpacity) ? 95 : Math.max(0, Math.min(100, storedFullscreenOpacity));

        // Get user's current timezone by default, or use saved value
        this.timezone = safeTimeDisplayStorageGetItem('timeDisplayTimezone') || Intl.DateTimeFormat().resolvedOptions().timeZone;
        
        // Click detection settings
        this.clickTimeout = null;
        this.clickCount = 0;
        this.doubleClickDelay = 500; // Relaxed double click delay
        this.fullscreenPreviouslyFocusedElement = null;
        
        this.applySettings();
        this.setupFullscreenListeners();
        this.updatePosition();
    }
    
    updatePosition() {
        if (!this.timeDisplayElement) {
            return;
        }

        // Get the control position from settings manager
        const position = this.settingsManager ? this.settingsManager.controlPosition : 'top-right';
        
        // Remove all position classes
        this.timeDisplayElement.classList.remove('top-right', 'top-left', 'bottom-right', 'bottom-left');
        
        // Add the current position class
        this.timeDisplayElement.classList.add(position);
    }
    
    toggle() {
        this.enabled = !this.enabled;
        safeTimeDisplayStorageSetItem('timeDisplayEnabled', this.enabled);
        
        if (this.enabled) {
            this.show();
        } else {
            this.hide();
        }
    }
    
    show() {
        this.enabled = true;
        safeTimeDisplayStorageSetItem('timeDisplayEnabled', 'true');
        if (!this.timeDisplayElement) {
            return;
        }

        this.timeDisplayElement.classList.add('show');
        this.startUpdating();
    }
    
    hide() {
        this.enabled = false;
        safeTimeDisplayStorageSetItem('timeDisplayEnabled', 'false');
        if (!this.timeDisplayElement) {
            return;
        }

        this.timeDisplayElement.classList.remove('show');
        this.stopUpdating();
    }
    
    startUpdating() {
        // Update immediately
        this.updateDisplay();

        if (this.updateInterval) {
            return;
        }
        
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
        if (!this.timeDisplayElement) {
            return;
        }

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
                    const hour12 = parseInt(parts[1], 10);
                    const m = parseInt(parts[2], 10);
                    const s = parseInt(parts[3], 10);
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
                    return `${this.padZero(parseInt(parts[1], 10))}:${this.padZero(parseInt(parts[2], 10))}:${this.padZero(parseInt(parts[3], 10))}`;
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
        const fallbackWeekdays = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六'];
        const getWeekdayText = (weekdayIndex) => (
            window.i18n
                ? window.i18n.t(`days.${weekdayKeys[weekdayIndex]}`)
                : fallbackWeekdays[weekdayIndex]
        );
        let weekday = getWeekdayText(date.getDay());
        
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
                    if (part.type === 'year') tzYear = parseInt(part.value, 10);
                    if (part.type === 'month') tzMonth = parseInt(part.value, 10);
                    if (part.type === 'day') tzDay = parseInt(part.value, 10);
                });
                
                if (tzYear && tzMonth && tzDay) {
                    const weekdayParts = new Intl.DateTimeFormat('en-US', {
                        timeZone: this.timezone,
                        weekday: 'long'
                    }).formatToParts(date);
                    const weekdayPart = weekdayParts.find(part => part.type === 'weekday');
                    const weekdayIndex = weekdayPart
                        ? ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'].indexOf(weekdayPart.value)
                        : -1;
                    if (weekdayIndex >= 0) {
                        weekday = getWeekdayText(weekdayIndex);
                    }

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
        safeTimeDisplayStorageSetItem('timeDisplayTimeFormat', format);
        if (this.enabled) {
            this.updateDisplay();
        }
    }
    
    setDateFormat(format) {
        this.dateFormat = format;
        safeTimeDisplayStorageSetItem('timeDisplayDateFormat', format);
        if (this.enabled) {
            this.updateDisplay();
        }
    }
    
    setTimezone(timezone) {
        this.timezone = timezone;
        safeTimeDisplayStorageSetItem('timeDisplayTimezone', timezone);
        if (this.enabled) {
            this.updateDisplay();
        }
    }
    
    setColor(color) {
        this.color = color;
        safeTimeDisplayStorageSetItem('timeDisplayColor', color);
        this.applySettings();
    }
    
    setBgColor(bgColor) {
        this.bgColor = bgColor;
        safeTimeDisplayStorageSetItem('timeDisplayBgColor', bgColor);
        this.applySettings();
    }
    
    setFullscreenMode(mode) {
        this.fullscreenMode = mode;
        safeTimeDisplayStorageSetItem('timeDisplayFullscreenMode', mode);
    }
    
    setFullscreenFontSize(size) {
        // Constrain to 10-85% range for safety
        this.fullscreenFontSize = Math.max(10, Math.min(85, size));
        safeTimeDisplayStorageSetItem('timeDisplayFullscreenFontSize', this.fullscreenFontSize);
        if (this.isFullscreen) {
            this.updateFullscreenDisplay();
        }
    }
    
    setFullscreenTitleFontSize(size) {
        // Constrain to 2-20% range for date/title
        this.fullscreenTitleFontSize = Math.max(2, Math.min(20, size));
        safeTimeDisplayStorageSetItem('timeDisplayFullscreenTitleFontSize', this.fullscreenTitleFontSize);
        if (this.isFullscreen) {
            this.updateFullscreenDisplay();
        }
    }

    setFullscreenColor(color) {
        this.fullscreenColor = color;
        safeTimeDisplayStorageSetItem('timeDisplayFullscreenColor', color);
        if (this.isFullscreen) {
            this.updateFullscreenDisplay();
        }
    }

    setFullscreenBgColor(color) {
        this.fullscreenBgColor = color;
        safeTimeDisplayStorageSetItem('timeDisplayFullscreenBgColor', color);
        if (this.isFullscreen) {
            this.updateFullscreenDisplay();
        }
    }

    setFullscreenOpacity(opacity) {
        const numericOpacity = parseInt(opacity, 10);
        this.fullscreenOpacity = Number.isNaN(numericOpacity)
            ? this.fullscreenOpacity
            : Math.max(0, Math.min(100, numericOpacity));
        safeTimeDisplayStorageSetItem('timeDisplayFullscreenOpacity', this.fullscreenOpacity);
        if (this.isFullscreen) {
            this.updateFullscreenDisplay();
        }
    }
    
    setFontSize(size) {
        const numericSize = parseInt(size, 10);
        this.fontSize = Number.isNaN(numericSize)
            ? this.fontSize
            : Math.max(12, Math.min(48, numericSize));
        safeTimeDisplayStorageSetItem('timeDisplayFontSize', this.fontSize);
        this.applySettings();
        if (this.enabled) {
            this.updateDisplay();
        }
    }
    
    setOpacity(opacity) {
        const numericOpacity = parseInt(opacity, 10);
        this.opacity = Number.isNaN(numericOpacity)
            ? this.opacity
            : Math.max(0, Math.min(100, numericOpacity));
        safeTimeDisplayStorageSetItem('timeDisplayOpacity', this.opacity);
        this.applySettings();
    }
    
    setShowDate(show) {
        this.showDate = show;
        safeTimeDisplayStorageSetItem('timeDisplayShowDate', show);
        if (this.enabled) {
            this.updateDisplay();
        }
    }
    
    setShowTime(show) {
        this.showTime = show;
        safeTimeDisplayStorageSetItem('timeDisplayShowTime', show);
        if (this.enabled) {
            this.updateDisplay();
        }
    }
    
    applySettings() {
        if (!this.timeDisplayElement) {
            return;
        }

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
        if (this.timeFullscreenModal) {
            this.timeFullscreenModal.setAttribute('role', 'dialog');
            this.timeFullscreenModal.setAttribute('aria-modal', 'true');
            this.timeFullscreenModal.tabIndex = -1;
            this.timeFullscreenModal.setAttribute(
                'aria-label',
                window.i18n?.t?.('timeDisplay.fullscreenDisplay') || 'Fullscreen Time Display'
            );
        }

        // Click listener with support for single/double click modes
        if (this.timeDisplayElement) {
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
        }
        
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
                e.preventDefault();
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
        if (!this.timeFullscreenModal) {
            return;
        }

        this.fullscreenPreviouslyFocusedElement = getTimeDisplayFocusableElement();
        const settingsPanel = document.getElementById('time-fullscreen-settings-panel');
        const settingsBtn = document.getElementById('time-fullscreen-settings-btn');
        if (settingsPanel) {
            settingsPanel.style.display = 'none';
        }
        settingsBtn?.classList.remove('active');
        this.isFullscreen = true;
        this.timeFullscreenModal.classList.add('show');
        this.startFullscreenUpdating();
        focusTimeDisplayElement(document.getElementById('time-fullscreen-close-btn') || this.timeFullscreenModal);
    }
    
    exitFullscreen() {
        const restoreFocusTarget = this.fullscreenPreviouslyFocusedElement;
        this.fullscreenPreviouslyFocusedElement = null;
        if (!this.timeFullscreenModal) {
            this.isFullscreen = false;
            focusTimeDisplayElement(restoreFocusTarget);
            return;
        }

        this.isFullscreen = false;
        this.timeFullscreenModal.classList.remove('show');
        const settingsPanel = document.getElementById('time-fullscreen-settings-panel');
        const settingsBtn = document.getElementById('time-fullscreen-settings-btn');
        if (settingsPanel) {
            settingsPanel.style.display = 'none';
        }
        settingsBtn?.classList.remove('active');
        this.stopFullscreenUpdating();
        focusTimeDisplayElement(restoreFocusTarget);
    }
    
    startFullscreenUpdating() {
        // Update immediately
        this.updateFullscreenDisplay();

        if (this.fullscreenUpdateInterval) {
            return;
        }
        
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
        if (!this.timeFullscreenModal || !this.timeFullscreenContent) {
            return;
        }

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

window.TimeDisplayManager = TimeDisplayManager;
window.AboardTimeDisplayManager = TimeDisplayManager;
