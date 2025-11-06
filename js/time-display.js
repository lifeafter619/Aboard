// Time Display Module
// Handles the time and date display feature

class TimeDisplayManager {
    constructor() {
        this.timeDisplayElement = document.getElementById('time-display');
        this.updateInterval = null;
        
        // Load settings from localStorage
        this.enabled = localStorage.getItem('timeDisplayEnabled') === 'true';
        this.timeFormat = localStorage.getItem('timeDisplayTimeFormat') || '24h';
        this.dateFormat = localStorage.getItem('timeDisplayDateFormat') || 'yyyy-mm-dd';
        this.color = localStorage.getItem('timeDisplayColor') || '#000000';
        this.fontSize = parseInt(localStorage.getItem('timeDisplayFontSize')) || 16;
        this.opacity = parseInt(localStorage.getItem('timeDisplayOpacity')) || 100;
        this.showDate = localStorage.getItem('timeDisplayShowDate') !== 'false'; // Default true
        this.showTime = localStorage.getItem('timeDisplayShowTime') !== 'false'; // Default true
        
        this.applySettings();
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
        const now = new Date();
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
    
    formatTime(date) {
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
    
    setColor(color) {
        this.color = color;
        localStorage.setItem('timeDisplayColor', color);
        this.applySettings();
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
        
        // If enabled, start updating
        if (this.enabled) {
            this.show();
        }
    }
}
