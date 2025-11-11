/**
 * Timer Instance Module - 计时器实例模块
 * Individual timer instance (stopwatch or countdown)
 * 单个计时器实例（正计时或倒计时）
 * 
 * Features:
 * - Stopwatch and countdown modes (正计时和倒计时模式)
 * - Sound notifications with loop support (带循环支持的声音通知)
 * - Draggable timer widget (可拖动的计时器小部件)
 * - Fullscreen mode (全屏模式)
 * - Minimal display mode (最简显示模式)
 * - Customizable font size (可自定义字体大小)
 */
class TimerInstance {
    constructor(id, mode, duration, playSound, selectedSound, customSoundUrl, loopSound, loopCount, manager, title = '') {
        this.id = id;
        this.mode = mode; // 'stopwatch' or 'countdown'
        this.manager = manager;
        this.title = title; // Timer title
        
        // Timer state
        this.isRunning = false;
        this.isPaused = false;
        this.startTime = 0;
        
        // For stopwatch mode, duration is the starting time
        // For countdown mode, duration is the total time
        if (mode === 'stopwatch') {
            this.elapsedTime = duration; // Start from this time
        } else {
            this.elapsedTime = 0;
        }
        
        this.countdownDuration = duration; // in milliseconds
        this.remainingTime = duration; // in milliseconds
        this.intervalId = null;
        
        // Sound settings
        this.playSound = playSound;
        this.selectedSound = selectedSound;
        this.customSoundUrl = customSoundUrl;
        this.loopSound = loopSound;
        this.loopCount = loopCount;
        this.currentAudio = null; // Track the current audio element
        this.currentLoopIteration = 0; // Track current loop iteration
        
        // UI elements
        this.displayElement = null;
        this.fullscreenModal = null;
        this.fullscreenContent = null;
        this.fullscreenFontSlider = null;
        this.fullscreenUpdateInterval = null;
        this.isFullscreen = false;
        this.fontSize = 32;
        this.fullscreenFontSizePercent = 15; // percentage of viewport for fullscreen
        
        // For dragging
        this.isDragging = false;
        this.dragOffset = { x: 0, y: 0 };
        
        // Minimal display mode (replaces auto-hide)
        this.isMinimal = false;
        
        this.createDisplayElement();
        this.setupFullscreenModal();
        this.startTimerLoop();
        this.setupFullscreenChangeListener();
    }
    
    setupFullscreenChangeListener() {
        // No browser fullscreen API listeners needed - using CSS fullscreen only
    }
    
    setupFullscreenModal() {
        // Get or create fullscreen modal elements
        this.fullscreenModal = document.getElementById('timer-fullscreen-modal');
        this.fullscreenContent = document.getElementById('timer-fullscreen-content');
        this.fullscreenFontSlider = document.getElementById('timer-fullscreen-font-slider');
        
        if (!this.fullscreenModal || !this.fullscreenContent || !this.fullscreenFontSlider) {
            console.warn('Timer fullscreen modal elements not found');
            return;
        }
        
        // Set initial slider value
        this.fullscreenFontSlider.value = this.fullscreenFontSizePercent;
        
        // Setup close button
        const closeBtn = document.getElementById('timer-fullscreen-close-btn');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => {
                this.exitFullscreen();
            });
        }
        
        // Setup font size slider
        this.fullscreenFontSlider.addEventListener('input', (e) => {
            this.fullscreenFontSizePercent = parseFloat(e.target.value);
            if (this.isFullscreen) {
                this.updateFullscreenDisplay();
            }
        });
        
        // ESC key to exit fullscreen
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.isFullscreen) {
                this.exitFullscreen();
            }
        });
    }

    createDisplayElement() {
        const display = document.createElement('div');
        display.className = 'timer-display-widget';
        display.dataset.timerId = this.id;
        
        const titleHTML = this.title ? `<div class="timer-display-title">${this.title}</div>` : '';
        
        display.innerHTML = `
            <div class="timer-display-header">
                <div class="timer-display-mode">${this.mode === 'stopwatch' ? '正计时' : '倒计时'}</div>
                <button class="timer-close-btn" title="关闭">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <line x1="18" y1="6" x2="6" y2="18"></line>
                        <line x1="6" y1="6" x2="18" y2="18"></line>
                    </svg>
                </button>
            </div>
            ${titleHTML}
            <div class="timer-display-time">00:00:00</div>
            <div class="timer-display-controls">
                <button class="timer-control-btn timer-play-pause-btn">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <rect x="6" y="4" width="4" height="16"></rect>
                        <rect x="14" y="4" width="4" height="16"></rect>
                    </svg>
                    暂停
                </button>
                <button class="timer-control-btn timer-reset-btn">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"></path>
                        <path d="M21 3v5h-5"></path>
                        <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"></path>
                        <path d="M3 21v-5h5"></path>
                    </svg>
                    重置
                </button>
            </div>
            <div class="timer-display-actions">
                <button class="timer-action-btn timer-minimal-btn" title="最简显示 (双击恢复)">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                        <line x1="9" y1="9" x2="15" y2="15"></line>
                        <line x1="15" y1="9" x2="9" y2="15"></line>
                    </svg>
                    最简
                </button>
                <button class="timer-action-btn timer-adjust-btn" title="调整">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <circle cx="12" cy="12" r="3"></circle>
                        <path d="M12 1v6m0 6v6M5.6 5.6l4.2 4.2m4.2 4.2l4.2 4.2M1 12h6m6 0h6M5.6 18.4l4.2-4.2m4.2-4.2l4.2-4.2"></path>
                    </svg>
                    调整
                </button>
                <button class="timer-action-btn timer-fullscreen-btn" title="全屏">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"></path>
                    </svg>
                    全屏
                </button>
            </div>
            <div class="timer-font-size-control">
                <label>字体大小</label>
                <input type="range" class="timer-font-size-slider" min="16" max="60" value="32" step="2">
            </div>
        `;
        
        document.body.appendChild(display);
        this.displayElement = display;
        
        // Position the timer (stagger based on id)
        const offset = (this.id % 5) * 30;
        display.style.top = `${180 + offset}px`;
        display.style.right = `${20 + offset}px`;
        
        this.setupEventListeners();
        this.setupDragging();
        
        // Initialize time display
        if (this.mode === 'stopwatch') {
            this.displayTime(this.elapsedTime);
        } else {
            this.displayTime(this.remainingTime);
        }
    }
    
    setupEventListeners() {
        const playPauseBtn = this.displayElement.querySelector('.timer-play-pause-btn');
        const resetBtn = this.displayElement.querySelector('.timer-reset-btn');
        const closeBtn = this.displayElement.querySelector('.timer-close-btn');
        const minimalBtn = this.displayElement.querySelector('.timer-minimal-btn');
        const adjustBtn = this.displayElement.querySelector('.timer-adjust-btn');
        const fullscreenBtn = this.displayElement.querySelector('.timer-fullscreen-btn');
        const fontSizeSlider = this.displayElement.querySelector('.timer-font-size-slider');
        const timeDisplay = this.displayElement.querySelector('.timer-display-time');
        
        playPauseBtn.addEventListener('click', () => {
            this.togglePlayPause();
        });
        resetBtn.addEventListener('click', () => {
            this.resetTimer();
        });
        closeBtn.addEventListener('click', () => {
            this.closeTimer();
        });
        minimalBtn.addEventListener('click', () => {
            this.toggleMinimal();
        });
        adjustBtn.addEventListener('click', () => {
            this.adjustTimer();
        });
        fullscreenBtn.addEventListener('click', () => {
            this.toggleFullscreen();
        });
        fontSizeSlider.addEventListener('input', (e) => {
            this.updateFontSize(e.target.value);
        });
        
        // Double-click on time display to restore from minimal mode
        timeDisplay.addEventListener('dblclick', () => {
            if (this.isMinimal) {
                this.toggleMinimal();
            }
        });
    }
    
    setupDragging() {
        const header = this.displayElement.querySelector('.timer-display-header');
        const timeDisplay = this.displayElement.querySelector('.timer-display-time');
        
        const handleMouseDown = (e) => {
            // Don't start dragging if clicking on close button
            if (e.target.closest('.timer-close-btn')) return;
            
            this.isDragging = true;
            this.displayElement.classList.add('dragging');
            
            const rect = this.displayElement.getBoundingClientRect();
            this.dragOffset.x = e.clientX - rect.left;
            this.dragOffset.y = e.clientY - rect.top;
            
            e.preventDefault();
        };
        
        // Allow dragging from header or time display (when compact)
        header.addEventListener('mousedown', handleMouseDown);
        timeDisplay.addEventListener('mousedown', handleMouseDown);
        
        const handleMouseMove = (e) => {
            if (!this.isDragging) return;
            
            // Use requestAnimationFrame for smooth dragging performance
            requestAnimationFrame(() => {
                if (!this.isDragging) return; // Double check inside RAF
                
                const x = e.clientX - this.dragOffset.x;
                const y = e.clientY - this.dragOffset.y;
                
                // Apply edge snapping
                const edgeSnapDistance = 30;
                const windowWidth = window.innerWidth;
                const windowHeight = window.innerHeight;
                const rect = this.displayElement.getBoundingClientRect();
                
                let finalX = x;
                let finalY = y;
                
                // Snap to edges
                if (x < edgeSnapDistance) {
                    finalX = 10;
                } else if (x + rect.width > windowWidth - edgeSnapDistance) {
                    finalX = windowWidth - rect.width - 10;
                }
                
                if (y < edgeSnapDistance) {
                    finalY = 10;
                } else if (y + rect.height > windowHeight - edgeSnapDistance) {
                    finalY = windowHeight - rect.height - 10;
                }
                
                // Keep within bounds
                finalX = Math.max(0, Math.min(finalX, windowWidth - rect.width));
                finalY = Math.max(0, Math.min(finalY, windowHeight - rect.height));
                
                this.displayElement.style.left = `${finalX}px`;
                this.displayElement.style.top = `${finalY}px`;
                this.displayElement.style.right = 'auto';
                this.displayElement.style.bottom = 'auto';
            });
        };
        
        const handleMouseUp = () => {
            if (this.isDragging) {
                this.isDragging = false;
                this.displayElement.classList.remove('dragging');
            }
        };
        
        // Keep listeners attached permanently to document
        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);
        
        // Store references for cleanup when timer is closed
        this.mouseMoveHandler = handleMouseMove;
        this.mouseUpHandler = handleMouseUp;
    }
    
    startTimerLoop() {
        this.isRunning = true;
        this.isPaused = false;
        this.startTime = Date.now();
        
        // For stopwatch mode, if there's an initial duration, it means we start from that time
        // For countdown mode, we already have remainingTime set
        
        this.intervalId = setInterval(() => {
            this.updateTimer();
        }, 100);
        
        this.updatePlayPauseButton();
        this.updateTimerDisplayClass();
    }
    
    updateTimer() {
        if (this.mode === 'stopwatch') {
            const now = Date.now();
            const delta = now - this.startTime;
            this.elapsedTime += delta;
            this.startTime = now;
            
            this.displayTime(this.elapsedTime);
        } else if (this.mode === 'countdown') {
            const now = Date.now();
            const delta = now - this.startTime;
            this.remainingTime -= delta;
            this.startTime = now;
            
            if (this.remainingTime <= 0) {
                this.remainingTime = 0;
                this.timerFinished();
            }
            
            this.displayTime(this.remainingTime);
        }
    }
    
    displayTime(milliseconds) {
        const totalSeconds = Math.floor(milliseconds / 1000);
        const hours = Math.floor(totalSeconds / 3600);
        const minutes = Math.floor((totalSeconds % 3600) / 60);
        const seconds = totalSeconds % 60;
        
        const timeString = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
        
        const timeDisplay = this.displayElement.querySelector('.timer-display-time');
        if (timeDisplay) {
            timeDisplay.textContent = timeString;
        }
    }
    
    togglePlayPause() {
        if (this.isPaused) {
            // Resume
            this.isPaused = false;
            this.startTime = Date.now();
            this.intervalId = setInterval(() => {
                this.updateTimer();
            }, 100);
        } else {
            // Pause
            this.isPaused = true;
            if (this.intervalId) {
                clearInterval(this.intervalId);
                this.intervalId = null;
            }
        }
        
        this.updatePlayPauseButton();
        this.updateTimerDisplayClass();
    }
    
    updatePlayPauseButton() {
        const btn = this.displayElement.querySelector('.timer-play-pause-btn');
        if (btn) {
            if (this.isPaused) {
                btn.innerHTML = `
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <polygon points="5 3 19 12 5 21 5 3"></polygon>
                    </svg>
                    开始
                `;
            } else {
                btn.innerHTML = `
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <rect x="6" y="4" width="4" height="16"></rect>
                        <rect x="14" y="4" width="4" height="16"></rect>
                    </svg>
                    暂停
                `;
            }
        }
    }
    
    updateTimerDisplayClass() {
        const timeDisplay = this.displayElement.querySelector('.timer-display-time');
        if (timeDisplay) {
            timeDisplay.classList.remove('running', 'paused', 'finished');
            if (this.isPaused) {
                timeDisplay.classList.add('paused');
            } else if (this.isRunning) {
                timeDisplay.classList.add('running');
            }
        }
    }
    
    resetTimer() {
        if (this.intervalId) {
            clearInterval(this.intervalId);
            this.intervalId = null;
        }
        
        this.isRunning = false;
        this.isPaused = true; // Set to paused state after reset
        
        if (this.mode === 'stopwatch') {
            // Reset to the initial starting time (which is stored in countdownDuration)
            this.elapsedTime = this.countdownDuration;
            this.displayTime(this.countdownDuration);
        } else {
            this.remainingTime = this.countdownDuration;
            this.displayTime(this.countdownDuration);
        }
        
        this.updatePlayPauseButton();
        this.updateTimerDisplayClass();
    }
    
    timerFinished() {
        if (this.intervalId) {
            clearInterval(this.intervalId);
            this.intervalId = null;
        }
        
        this.isRunning = false;
        
        const timeDisplay = this.displayElement.querySelector('.timer-display-time');
        if (timeDisplay) {
            timeDisplay.classList.add('finished');
        }
        
        // Play sound if enabled
        if (this.playSound) {
            this.playFinishSound();
        }
    }
    
    playFinishSound() {
        let soundUrl;
        if (this.customSoundUrl) {
            soundUrl = this.customSoundUrl;
        } else if (this.selectedSound && this.manager.sounds[this.selectedSound]) {
            soundUrl = this.manager.sounds[this.selectedSound];
        }
        
        if (soundUrl) {
            this.currentLoopIteration = 0;
            this.playSound_Internal(soundUrl);
        }
    }
    
    playSound_Internal(soundUrl) {
        // Stop any currently playing audio
        if (this.currentAudio) {
            this.currentAudio.pause();
            this.currentAudio = null;
        }
        
        const audio = new Audio(soundUrl);
        this.currentAudio = audio;
        
        audio.addEventListener('ended', () => {
            if (this.loopSound && this.currentLoopIteration < this.loopCount - 1) {
                this.currentLoopIteration++;
                // Play again for the next loop
                this.playSound_Internal(soundUrl);
            } else {
                this.currentAudio = null;
                this.currentLoopIteration = 0;
            }
        });
        
        audio.addEventListener('error', (err) => {
            console.warn('无法播放音频:', err);
            this.currentAudio = null;
        });
        
        audio.play().catch(err => {
            console.warn('无法播放音频:', err);
            this.currentAudio = null;
        });
    }
    
    adjustTimer() {
        // Show settings modal to adjust this timer
        this.manager.showSettingsModalForTimer(this);
    }
    
    toggleMinimal() {
        this.isMinimal = !this.isMinimal;
        if (this.isMinimal) {
            this.displayElement.classList.add('minimal');
        } else {
            this.displayElement.classList.remove('minimal');
        }
    }
    
    toggleFullscreen() {
        if (this.isFullscreen) {
            this.exitFullscreen();
        } else {
            this.enterFullscreen();
        }
    }
    
    enterFullscreen() {
        if (!this.fullscreenModal || !this.fullscreenContent) {
            console.warn('Timer fullscreen modal not available');
            return;
        }
        
        this.isFullscreen = true;
        this.fullscreenModal.classList.add('show');
        this.startFullscreenUpdating();
    }
    
    exitFullscreen() {
        if (!this.fullscreenModal) {
            return;
        }
        
        this.isFullscreen = false;
        this.fullscreenModal.classList.remove('show');
        this.stopFullscreenUpdating();
    }
    
    startFullscreenUpdating() {
        // Update immediately
        this.updateFullscreenDisplay();
        
        // Update every 100ms for smooth countdown
        this.fullscreenUpdateInterval = setInterval(() => {
            this.updateFullscreenDisplay();
        }, 100);
    }
    
    stopFullscreenUpdating() {
        if (this.fullscreenUpdateInterval) {
            clearInterval(this.fullscreenUpdateInterval);
            this.fullscreenUpdateInterval = null;
        }
    }
    
    updateFullscreenDisplay() {
        if (!this.fullscreenContent) {
            return;
        }
        
        // Get current time to display
        let milliseconds;
        if (this.mode === 'stopwatch') {
            milliseconds = this.elapsedTime;
        } else {
            milliseconds = this.remainingTime;
        }
        
        // Format time
        const totalSeconds = Math.floor(milliseconds / 1000);
        const hours = Math.floor(totalSeconds / 3600);
        const minutes = Math.floor((totalSeconds % 3600) / 60);
        const seconds = totalSeconds % 60;
        const timeString = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
        
        // Calculate font size based on slider value
        const vmin = Math.min(window.innerWidth, window.innerHeight);
        const timeFontSize = Math.floor(vmin * (this.fullscreenFontSizePercent / 100));
        const modeFontSize = Math.floor(vmin * 0.02);
        const titleFontSize = Math.floor(vmin * 0.03);
        
        // Update content with title if available
        const modeText = this.mode === 'stopwatch' ? '正计时' : '倒计时';
        const titleHTML = this.title ? `<div class="timer-fullscreen-title" style="font-size: ${titleFontSize}px;">${this.title}</div>` : '';
        
        this.fullscreenContent.innerHTML = `
            <div class="timer-fullscreen-mode" style="font-size: ${modeFontSize}px;">${modeText}</div>
            ${titleHTML}
            <div class="timer-fullscreen-time" style="font-size: ${timeFontSize}px;">${timeString}</div>
        `;
    }
    
    updateFontSize(size) {
        this.fontSize = parseInt(size);
        const timeDisplay = this.displayElement.querySelector('.timer-display-time');
        if (timeDisplay) {
            timeDisplay.style.fontSize = `${this.fontSize}px`;
        }
    }
    
    closeTimer() {
        // Exit fullscreen if active
        if (this.isFullscreen) {
            this.exitFullscreen();
        }
        
        // Stop the timer
        if (this.intervalId) {
            clearInterval(this.intervalId);
            this.intervalId = null;
        }
        
        // Stop any playing audio
        if (this.currentAudio) {
            this.currentAudio.pause();
            this.currentAudio = null;
        }
        
        // Remove event listeners
        if (this.mouseMoveHandler) {
            document.removeEventListener('mousemove', this.mouseMoveHandler);
        }
        if (this.mouseUpHandler) {
            document.removeEventListener('mouseup', this.mouseUpHandler);
        }
        
        // Remove from DOM
        if (this.displayElement) {
            this.displayElement.remove();
        }
        
        // Remove from manager
        this.manager.removeTimer(this.id);
    }
    
    updateSettings(duration, playSound, selectedSound, customSoundUrl, loopSound, loopCount, title = '') {
        this.countdownDuration = duration;
        
        if (this.mode === 'stopwatch') {
            this.elapsedTime = duration;
        } else {
            this.remainingTime = duration;
        }
        
        this.playSound = playSound;
        this.selectedSound = selectedSound;
        this.customSoundUrl = customSoundUrl;
        this.loopSound = loopSound;
        this.loopCount = loopCount;
        this.title = title;
        
        // Update title in display if changed
        const oldTitleElement = this.displayElement.querySelector('.timer-display-title');
        if (this.title) {
            if (oldTitleElement) {
                oldTitleElement.textContent = this.title;
            } else {
                // Insert title after header
                const header = this.displayElement.querySelector('.timer-display-header');
                const titleElement = document.createElement('div');
                titleElement.className = 'timer-display-title';
                titleElement.textContent = this.title;
                header.insertAdjacentElement('afterend', titleElement);
            }
        } else {
            // Remove title if it was cleared
            if (oldTitleElement) {
                oldTitleElement.remove();
            }
        }
        
        // Reset timer with new settings
        this.resetTimer();
    }
}
