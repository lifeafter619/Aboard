// Time Display Module
// Handles the time and date display feature

class TimeDisplayManager {
    constructor() {
        this.timeDisplayElement = document.getElementById('time-display');
        this.timeFullscreenModal = document.getElementById('time-fullscreen-modal');
        this.timeFullscreenContent = document.getElementById('time-fullscreen-content');
        this.updateInterval = null;
        this.fullscreenUpdateInterval = null;
        this.isFullscreen = false;
        
        // Load settings from localStorage
        this.enabled = localStorage.getItem('timeDisplayEnabled') === 'true';
        this.timeFormat = localStorage.getItem('timeDisplayTimeFormat') || '24h';
        this.dateFormat = localStorage.getItem('timeDisplayDateFormat') || 'yyyy-mm-dd';
        this.color = localStorage.getItem('timeDisplayColor') || '#000000';
        this.bgColor = localStorage.getItem('timeDisplayBgColor') || '#FFFFFF';
        this.fontSize = parseInt(localStorage.getItem('timeDisplayFontSize')) || 16;
        this.opacity = parseInt(localStorage.getItem('timeDisplayOpacity')) || 100;
        this.showDate = localStorage.getItem('timeDisplayShowDate') !== 'false'; // Default true
        this.showTime = localStorage.getItem('timeDisplayShowTime') !== 'false'; // Default true
        this.fullscreenEnabled = localStorage.getItem('timeDisplayFullscreenEnabled') === 'true'; // Default false
        // Get user's current timezone by default, or use saved value
        this.timezone = localStorage.getItem('timeDisplayTimezone') || Intl.DateTimeFormat().resolvedOptions().timeZone;
        
        this.applySettings();
        this.setupFullscreenListeners();
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
                    
                    const ampm = period === 'PM' ? '下午' : '上午';
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
            const ampm = hours >= 12 ? '下午' : '上午';
            return `${ampm} ${this.padZero(hour12)}:${this.padZero(minutes)}:${this.padZero(seconds)}`;
        } else {
            return `${this.padZero(hours)}:${this.padZero(minutes)}:${this.padZero(seconds)}`;
        }
    }
    
    formatDate(date) {
        // Apply timezone conversion for date
        try {
            const options = {
                timeZone: this.timezone,
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
                weekday: 'long'
            };
            const parts = new Intl.DateTimeFormat('zh-CN', options).formatToParts(date);
            
            let year, month, day, weekday;
            parts.forEach(part => {
                if (part.type === 'year') year = parseInt(part.value);
                if (part.type === 'month') month = parseInt(part.value);
                if (part.type === 'day') day = parseInt(part.value);
                if (part.type === 'weekday') weekday = part.value;
            });
            
            if (year && month && day) {
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
        } catch (e) {
            console.error('Error formatting date with timezone:', e);
        }
        
        // Fallback to local date
        const year = date.getFullYear();
        const month = date.getMonth() + 1;
        const day = date.getDate();
        const weekdays = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六'];
        const weekday = weekdays[date.getDay()];
        
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
    
    setFullscreenEnabled(enabled) {
        this.fullscreenEnabled = enabled;
        localStorage.setItem('timeDisplayFullscreenEnabled', enabled);
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
        // Double-click to enter fullscreen
        this.timeDisplayElement.addEventListener('dblclick', () => {
            if (this.fullscreenEnabled && this.enabled) {
                this.enterFullscreen();
            }
        });
        
        // Close button
        const closeBtn = document.getElementById('time-fullscreen-close-btn');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => {
                this.exitFullscreen();
            });
        }
        
        // ESC key to exit
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.isFullscreen) {
                this.exitFullscreen();
            }
        });
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
        
        // Calculate font size based on viewport
        const vmin = Math.min(window.innerWidth, window.innerHeight);
        const timeFontSize = Math.floor(vmin * 0.15);
        const dateFontSize = Math.floor(vmin * 0.05);
        
        let html = '';
        if (this.showTime) {
            html += `<div class="time-line" style="font-size: ${timeFontSize}px; font-weight: 600; margin-bottom: ${vmin * 0.02}px;">${timeString}</div>`;
        }
        if (this.showDate) {
            html += `<div class="time-line" style="font-size: ${dateFontSize}px;">${dateString}</div>`;
        }
        
        this.timeFullscreenContent.innerHTML = html;
    }
}
