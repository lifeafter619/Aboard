// Timer Module - Refactored to support multiple timer instances
// Each timer can be stopwatch or countdown, independently controlled

// Single Timer Instance Class
class TimerInstance {
    constructor(options) {
        this.id = options.id;
        this.mode = options.mode; // 'stopwatch' or 'countdown'
        this.manager = options.manager;
        this.title = options.title || ''; // Timer title
        
        // Color settings
        this.textColor = options.textColor || '#333333';
        this.bgColor = options.bgColor || '#FFFFFF';
        this.fullscreenTextColor = options.fullscreenTextColor || '#FFFFFF'; // Default white text
        this.fullscreenBgColor = options.fullscreenBgColor || '#000000';     // Default black bg
        
        // Timer state
        this.isRunning = false;
        this.isPaused = false;
        this.startTime = 0;
        
        const duration = options.duration || 0;

        // For stopwatch mode, duration is the starting time
        // For countdown mode, duration is the total time
        if (this.mode === 'stopwatch') {
            this.elapsedTime = duration; // Start from this time
        } else {
            this.elapsedTime = 0;
        }
        
        this.countdownDuration = duration; // in milliseconds
        this.remainingTime = duration; // in milliseconds
        this.intervalId = null;
        
        // Sound settings
        this.playSound = options.playSound;
        this.selectedSound = options.selectedSound;
        this.customSoundUrl = options.customSoundUrl;
        this.loopSound = options.loopSound;
        this.loopCount = options.loopCount;
        this.loopInterval = options.loopInterval || 0;
        this.playbackSpeed = options.playbackSpeed || 1.0;
        this.currentAudio = null; // Track the current audio element
        this.currentLoopIteration = 0; // Track current loop iteration
        this.loopTimeoutId = null; // Track loop timeout
        
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
        this.fullscreenTitleFontSizePercent = 5; // percentage of viewport for title in fullscreen
        
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
        this.fullscreenTitleFontSlider = document.getElementById('timer-fullscreen-title-font-slider');
        this.fullscreenSettingsPanel = document.getElementById('timer-fullscreen-settings-panel');
        
        if (!this.fullscreenModal || !this.fullscreenContent || !this.fullscreenFontSlider) {
            console.warn('Timer fullscreen modal elements not found');
            return;
        }
        
        // Set initial slider value
        this.fullscreenFontSlider.value = this.fullscreenFontSizePercent;
        if (this.fullscreenTitleFontSlider) {
            this.fullscreenTitleFontSlider.value = this.fullscreenTitleFontSizePercent;
        }
        
        // Setup close button
        const closeBtn = document.getElementById('timer-fullscreen-close-btn');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => {
                this.exitFullscreen();
            });
        }
        
        // Setup settings button
        const settingsBtn = document.getElementById('timer-fullscreen-settings-btn');
        if (settingsBtn && this.fullscreenSettingsPanel) {
            settingsBtn.addEventListener('click', () => {
                const isVisible = this.fullscreenSettingsPanel.style.display !== 'none';
                this.fullscreenSettingsPanel.style.display = isVisible ? 'none' : 'block';
                settingsBtn.classList.toggle('active', !isVisible);
            });
        }
        
        // Setup font size slider
        this.fullscreenFontSlider.addEventListener('input', (e) => {
            this.fullscreenFontSizePercent = parseFloat(e.target.value);
            if (this.isFullscreen) {
                this.updateFullscreenDisplay();
            }
        });
        
        // Setup title font size slider
        if (this.fullscreenTitleFontSlider) {
            this.fullscreenTitleFontSlider.addEventListener('input', (e) => {
                this.fullscreenTitleFontSizePercent = parseFloat(e.target.value);
                if (this.isFullscreen) {
                    this.updateFullscreenDisplay();
                }
            });
        }
        
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
        
        const modeText = this.mode === 'stopwatch' ? window.i18n.t('timer.stopwatch') : window.i18n.t('timer.countdown');

        display.innerHTML = `
            <div class="timer-display-header">
                <div class="timer-display-mode">${modeText}</div>
                <button class="timer-close-btn" title="${window.i18n.t('common.close')}">
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
                    ${window.i18n.t('timer.pause')}
                </button>
                <button class="timer-control-btn timer-reset-btn">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"></path>
                        <path d="M21 3v5h-5"></path>
                        <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"></path>
                        <path d="M3 21v-5h5"></path>
                    </svg>
                    ${window.i18n.t('timer.reset')}
                </button>
            </div>
            <div class="timer-display-actions">
                <button class="timer-action-btn timer-minimal-btn" title="${window.i18n.t('timer.minimalMode') || '最简显示 (双击恢复)'}">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                        <line x1="9" y1="9" x2="15" y2="15"></line>
                        <line x1="15" y1="9" x2="9" y2="15"></line>
                    </svg>
                    ${window.i18n.t('timer.minimal') || '最简'}
                </button>
                <button class="timer-action-btn timer-adjust-btn" title="${window.i18n.t('timer.adjust')}">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <circle cx="12" cy="12" r="3"></circle>
                        <path d="M12 1v6m0 6v6M5.6 5.6l4.2 4.2m4.2 4.2l4.2 4.2M1 12h6m6 0h6M5.6 18.4l4.2-4.2m4.2-4.2l4.2-4.2"></path>
                    </svg>
                    ${window.i18n.t('timer.adjust')}
                </button>
                <button class="timer-action-btn timer-fullscreen-btn" title="${window.i18n.t('timeDisplay.fullscreenDisplay')}">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"></path>
                    </svg>
                    ${window.i18n.t('timeDisplay.fullscreenDisplay')}
                </button>
            </div>
            <div class="timer-font-size-control">
                <label>${window.i18n.t('timer.fontSize')}</label>
                <input type="range" class="timer-font-size-slider" min="16" max="60" value="32" step="2">
            </div>
        `;
        
        document.body.appendChild(display);
        this.displayElement = display;
        
        // Apply custom colors
        display.style.backgroundColor = this.bgColor;
        display.style.color = this.textColor;
        
        // Also apply to specific elements that have their own color
        const timeDisplay = display.querySelector('.timer-display-time');
        const titleDisplay = display.querySelector('.timer-display-title');
        const modeDisplay = display.querySelector('.timer-display-mode');
        if (timeDisplay) timeDisplay.style.color = this.textColor;
        if (titleDisplay) titleDisplay.style.color = this.textColor;
        if (modeDisplay) modeDisplay.style.color = this.textColor;
        
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
        // Unified handler for mouse and touch start
        const handleStart = (e) => {
            // Don't start dragging if clicking on interactive elements
            if (e.target.closest('button') || e.target.closest('input')) return;
            
            e.stopPropagation(); // Prevent drawing on canvas

            this.isDragging = true;
            this.displayElement.classList.add('dragging');
            
            const rect = this.displayElement.getBoundingClientRect();
            const clientX = e.touches ? e.touches[0].clientX : e.clientX;
            const clientY = e.touches ? e.touches[0].clientY : e.clientY;
            
            this.dragOffset.x = clientX - rect.left;
            this.dragOffset.y = clientY - rect.top;
            
            e.preventDefault();
        };
        
        // Allow dragging from the entire widget
        // Add both mouse and touch event listeners for better touch device support
        this.displayElement.addEventListener('mousedown', handleStart);
        this.displayElement.addEventListener('touchstart', handleStart, { passive: false });
        
        // Unified handler for mouse and touch move
        const handleMove = (e) => {
            if (!this.isDragging) return;
            
            const clientX = e.touches ? e.touches[0].clientX : e.clientX;
            const clientY = e.touches ? e.touches[0].clientY : e.clientY;
            
            const x = clientX - this.dragOffset.x;
            const y = clientY - this.dragOffset.y;

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
        };
        
        // Unified handler for mouse and touch end
        const handleEnd = () => {
            if (this.isDragging) {
                this.isDragging = false;
                this.displayElement.classList.remove('dragging');
            }
        };
        
        // Keep listeners attached permanently to document for better touch support
        this.mouseMoveHandler = handleMove;
        this.mouseUpHandler = handleEnd;
        
        // Add both mouse and touch event listeners
        document.addEventListener('mousemove', this.mouseMoveHandler);
        document.addEventListener('mouseup', this.mouseUpHandler);
        document.addEventListener('touchmove', this.mouseMoveHandler, { passive: false });
        document.addEventListener('touchend', this.mouseUpHandler);
        document.addEventListener('touchcancel', this.mouseUpHandler);
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
                    ${window.i18n.t('timer.continue') || '继续'}
                `;
            } else {
                btn.innerHTML = `
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <rect x="6" y="4" width="4" height="16"></rect>
                        <rect x="14" y="4" width="4" height="16"></rect>
                    </svg>
                    ${window.i18n.t('timer.pause')}
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
        
        // Clear any pending loop timeout
        if (this.loopTimeoutId) {
            clearTimeout(this.loopTimeoutId);
            this.loopTimeoutId = null;
        }

        const audio = new Audio(soundUrl);
        // Apply playback speed
        audio.playbackRate = this.playbackSpeed;

        this.currentAudio = audio;
        
        audio.addEventListener('ended', () => {
            if (this.loopSound && this.currentLoopIteration < this.loopCount - 1) {
                this.currentLoopIteration++;

                // Handle loop interval
                if (this.loopInterval > 0) {
                    this.loopTimeoutId = setTimeout(() => {
                        this.playSound_Internal(soundUrl);
                    }, this.loopInterval * 1000);
                } else {
                    // Play immediately
                    this.playSound_Internal(soundUrl);
                }
            } else {
                this.currentAudio = null;
                this.currentLoopIteration = 0;
                this.loopTimeoutId = null;
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
        
        // Calculate font size based on slider values
        const vmin = Math.min(window.innerWidth, window.innerHeight);
        const timeFontSize = Math.floor(vmin * (this.fullscreenFontSizePercent / 100));
        const titleFontSize = Math.floor(vmin * (this.fullscreenTitleFontSizePercent / 100));
        const modeFontSize = Math.floor(vmin * 0.02);
        
        // Update content with title if available, applying custom colors
        const modeText = this.mode === 'stopwatch' ? window.i18n.t('timer.stopwatch') : window.i18n.t('timer.countdown');

        // Use configured fullscreen colors
        const fsTextColor = this.fullscreenTextColor;
        const fsBgColor = this.fullscreenBgColor;

        const titleHTML = this.title ? `<div class="timer-fullscreen-title" style="font-size: ${titleFontSize}px; color: ${fsTextColor};">${this.title}</div>` : '';
        
        this.fullscreenContent.innerHTML = `
            <div class="timer-fullscreen-mode" style="font-size: ${modeFontSize}px; color: ${fsTextColor};">${modeText}</div>
            ${titleHTML}
            <div class="timer-fullscreen-time" style="font-size: ${timeFontSize}px; color: ${fsTextColor};">${timeString}</div>
        `;
        
        // Apply background color to fullscreen modal
        if (this.fullscreenModal) {
            this.fullscreenModal.style.backgroundColor = fsBgColor;
        }
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
        
        // Clear any pending loop timeout
        if (this.loopTimeoutId) {
            clearTimeout(this.loopTimeoutId);
            this.loopTimeoutId = null;
        }

        // Remove event listeners
        if (this.mouseMoveHandler) {
            document.removeEventListener('mousemove', this.mouseMoveHandler);
            document.removeEventListener('touchmove', this.mouseMoveHandler);
        }
        if (this.mouseUpHandler) {
            document.removeEventListener('mouseup', this.mouseUpHandler);
            document.removeEventListener('touchend', this.mouseUpHandler);
            document.removeEventListener('touchcancel', this.mouseUpHandler);
        }
        
        // Remove from DOM
        if (this.displayElement) {
            this.displayElement.remove();
        }
        
        // Remove from manager
        this.manager.removeTimer(this.id);
    }
    
    updateSettings(duration, playSound, selectedSound, customSoundUrl, loopSound, loopCount, loopInterval, playbackSpeed, title = '', textColor = null, bgColor = null, fullscreenTextColor = null, fullscreenBgColor = null) {
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
        this.loopInterval = loopInterval;
        this.playbackSpeed = playbackSpeed;
        this.title = title;
        
        // Update colors if provided
        if (textColor) this.textColor = textColor;
        if (bgColor) this.bgColor = bgColor;
        if (fullscreenTextColor) this.fullscreenTextColor = fullscreenTextColor;
        if (fullscreenBgColor) this.fullscreenBgColor = fullscreenBgColor;
        
        // Apply colors to display element
        if (this.displayElement) {
            this.displayElement.style.backgroundColor = this.bgColor;
            this.displayElement.style.color = this.textColor;
            
            const timeDisplay = this.displayElement.querySelector('.timer-display-time');
            const titleDisplay = this.displayElement.querySelector('.timer-display-title');
            const modeDisplay = this.displayElement.querySelector('.timer-display-mode');
            if (timeDisplay) timeDisplay.style.color = this.textColor;
            if (titleDisplay) titleDisplay.style.color = this.textColor;
            if (modeDisplay) modeDisplay.style.color = this.textColor;
        }
        
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

// Timer Manager - Manages multiple timer instances
class TimerManager {
    constructor() {
        this.timers = new Map();
        this.nextTimerId = 1;
        
        // Preloaded sounds (use correct case-insensitive paths)
        this.sounds = {
            'class-bell': 'sounds/class-bell.MP3',
            'exam-end': 'sounds/exam-end.MP3',
            'gentle-alarm': 'sounds/gentle-alarm.MP3',
            'digital-beep': 'sounds/digital-beep.MP3'
        };
        
        // Preload all sounds on initialization
        this.preloadedAudio = {};
        this.preloadSounds();
        
        // Load custom sounds from localStorage
        this.customSounds = this.loadCustomSounds();
        
        // Current timer being adjusted (for adjust functionality)
        this.adjustingTimer = null;
        
        // Audio preview state
        this.previewAudio = null;
        this.currentPreviewButton = null;
        
        this.setupEventListeners();
        this.renderCustomSounds();
    }
    
    updateMainPreviewButtonState() {
        const previewBtn = document.getElementById('timer-sound-preview-btn');
        if (!previewBtn) return;

        const soundCheckbox = document.getElementById('timer-sound-checkbox');
        const activeSoundBtn = document.querySelector('.sound-preset-btn.active');

        if (soundCheckbox && soundCheckbox.checked && activeSoundBtn) {
            previewBtn.disabled = false;
        } else {
            previewBtn.disabled = true;
        }
    }

    updateMoreSettingsState() {
        const moreSettingsBtn = document.getElementById('timer-more-settings-btn');
        if (!moreSettingsBtn) return;

        const loopCheckbox = document.getElementById('timer-loop-checkbox');
        const speedSlider = document.getElementById('timer-playback-speed');
        const intervalInput = document.getElementById('timer-loop-interval');

        const isLoop = loopCheckbox && loopCheckbox.checked;
        const isSpeedChanged = speedSlider && parseFloat(speedSlider.value) !== 1.0;
        const isIntervalSet = intervalInput && parseInt(intervalInput.value) > 0;

        // Active if any setting is non-default
        if (isLoop || isSpeedChanged || (isLoop && isIntervalSet)) {
            moreSettingsBtn.classList.add('active-settings');
        } else {
            moreSettingsBtn.classList.remove('active-settings');
        }
    }

    preloadSounds() {
        // Preload all preset sounds for immediate playback
        Object.keys(this.sounds).forEach(key => {
            const audio = new Audio(this.sounds[key]);
            audio.preload = 'auto';
            audio.load();
            this.preloadedAudio[key] = audio;
        });
    }
    
    loadCustomSounds() {
        // Load custom sounds from localStorage
        try {
            const saved = localStorage.getItem('timerCustomSounds');
            if (saved) {
                return JSON.parse(saved);
            }
        } catch (e) {
            console.warn('Failed to load custom sounds:', e);
        }
        return [];
    }
    
    saveCustomSounds() {
        // Save custom sounds to localStorage
        try {
            localStorage.setItem('timerCustomSounds', JSON.stringify(this.customSounds));
        } catch (e) {
            console.warn('Failed to save custom sounds:', e);
        }
    }
    
    addCustomSound(file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            const dataUrl = e.target.result;
            const customSound = {
                id: 'custom-' + Date.now(),
                name: file.name,
                url: dataUrl
            };
            
            this.customSounds.push(customSound);
            this.saveCustomSounds();
            this.renderCustomSounds();
        };
        reader.readAsDataURL(file);
    }
    
    removeCustomSound(id) {
        this.customSounds = this.customSounds.filter(s => s.id !== id);
        this.saveCustomSounds();
        this.renderCustomSounds();
    }
    
    renderCustomSounds() {
        const container = document.getElementById('custom-sounds-list');
        if (!container) return;
        
        container.innerHTML = '';
        
        this.customSounds.forEach(sound => {
            const btn = document.createElement('button');
            btn.className = 'sound-preset-btn';
            btn.dataset.sound = sound.id;
            btn.dataset.url = sound.url;
            
            // Truncate filename if too long
            const displayName = sound.name.length > 25 ? sound.name.substring(0, 22) + '...' : sound.name;
            
            btn.innerHTML = `
                ${displayName}
                <div style="display: flex; gap: 4px;">
                    <button class="sound-preview-btn" title="试听">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <polygon points="5 3 19 12 5 21 5 3"></polygon>
                        </svg>
                    </button>
                    <button class="sound-delete-btn" title="删除">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <line x1="18" y1="6" x2="6" y2="18"></line>
                            <line x1="6" y1="6" x2="18" y2="18"></line>
                        </svg>
                    </button>
                </div>
            `;
            
            // Add click handler for selecting
            btn.addEventListener('click', (e) => {
                if (e.target.closest('.sound-preview-btn') || e.target.closest('.sound-delete-btn')) {
                    return;
                }
                
                document.querySelectorAll('.sound-preset-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
            });
            
            // Add preview button handler
            const previewBtn = btn.querySelector('.sound-preview-btn');
            previewBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.previewSoundByUrl(sound.url, e.currentTarget);
            });
            
            // Add delete button handler
            const deleteBtn = btn.querySelector('.sound-delete-btn');
            deleteBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.removeCustomSound(sound.id);
            });
            
            container.appendChild(btn);
        });
    }
    
    setupEventListeners() {
        // Timer mode buttons
        document.querySelectorAll('.timer-mode-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const mode = e.currentTarget.dataset.mode;
                document.querySelectorAll('.timer-mode-btn').forEach(b => b.classList.remove('active'));
                e.currentTarget.classList.add('active');
                this.updateSoundGroupVisibility(mode);
                this.updateTimerLabel(mode);
            });
        });
        
        // Sound checkbox - handle enabling/disabling sound options
        const soundCheckbox = document.getElementById('timer-sound-checkbox');
        const soundSettingsContent = document.getElementById('sound-settings-content');
        if (soundCheckbox && soundSettingsContent) {
            soundCheckbox.addEventListener('change', (e) => {
                if (e.target.checked) {
                    soundSettingsContent.style.display = 'block';
                } else {
                    soundSettingsContent.style.display = 'none';
                }
                this.updateMainPreviewButtonState();
            });
        }

        // Main preview button
        const mainPreviewBtn = document.getElementById('timer-sound-preview-btn');
        if (mainPreviewBtn) {
            mainPreviewBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                // Find active preset
                const activeSoundBtn = document.querySelector('.sound-preset-btn.active');
                if (activeSoundBtn) {
                    const soundUrl = activeSoundBtn.dataset.url;
                    const soundKey = activeSoundBtn.dataset.sound;
                    if (soundUrl) {
                        this.previewSoundByUrl(soundUrl, mainPreviewBtn);
                    } else if (soundKey && this.sounds[soundKey]) {
                        this.previewSound(soundKey, mainPreviewBtn);
                    }
                }
            });
        }
        
        // Sound preset buttons
        document.querySelectorAll('.sound-preset-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                if (e.target.classList.contains('sound-preview-btn') || 
                    e.target.closest('.sound-preview-btn')) {
                    return; // Let the preview button handle it
                }
                
                const button = e.currentTarget;
                if (button.dataset.sound) {
                    document.querySelectorAll('.sound-preset-btn').forEach(b => b.classList.remove('active'));
                    button.classList.add('active');
                    this.updateMainPreviewButtonState();
                }
            });
        });
        
        // Sound preview buttons - immediate playback on click
        document.querySelectorAll('.sound-preview-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const presetBtn = e.currentTarget.closest('.sound-preset-btn');
                if (presetBtn) {
                    const soundUrl = presetBtn.dataset.url;
                    const soundKey = presetBtn.dataset.sound;
                    if (soundUrl) {
                        this.previewSoundByUrl(soundUrl, e.currentTarget);
                    } else if (soundKey && this.sounds[soundKey]) {
                        this.previewSound(soundKey, e.currentTarget);
                    }
                }
            });
        });
        
        // Sound upload - support multiple files
        const soundUploadInput = document.getElementById('timer-sound-upload');
        if (soundUploadInput) {
            soundUploadInput.addEventListener('change', (e) => {
                const files = Array.from(e.target.files);
                files.forEach(file => {
                    if (file && file.type.startsWith('audio/')) {
                        this.addCustomSound(file);
                    }
                });
                // Clear input so same file can be uploaded again if needed
                e.target.value = '';
            });
        }
        
        // More Settings Toggle
        const moreSettingsBtn = document.getElementById('timer-more-settings-btn');
        const moreSettingsContent = document.getElementById('timer-more-settings-content');
        if (moreSettingsBtn && moreSettingsContent) {
            moreSettingsBtn.addEventListener('click', () => {
                const isExpanded = moreSettingsBtn.classList.toggle('expanded');
                moreSettingsContent.style.display = isExpanded ? 'block' : 'none';
            });
        }

        // Loop checkbox
        const loopCheckbox = document.getElementById('timer-loop-checkbox');
        const loopCountGroup = document.getElementById('sound-loop-count-group');
        if (loopCheckbox && loopCountGroup) {
            loopCheckbox.addEventListener('change', (e) => {
                if (e.target.checked) {
                    loopCountGroup.style.display = 'flex';
                } else {
                    loopCountGroup.style.display = 'none';
                }
                this.updateMoreSettingsState();
            });
        }

        // Loop interval input
        const loopIntervalInput = document.getElementById('timer-loop-interval');
        if (loopIntervalInput) {
            loopIntervalInput.addEventListener('change', () => {
                this.updateMoreSettingsState();
            });
            loopIntervalInput.addEventListener('input', () => {
                this.updateMoreSettingsState();
            });
        }

        // Speed slider
        const speedSlider = document.getElementById('timer-playback-speed');
        const speedValue = document.getElementById('timer-playback-speed-value');
        if (speedSlider && speedValue) {
            speedSlider.addEventListener('input', (e) => {
                speedValue.textContent = `${e.target.value}x`;
                this.updateMoreSettingsState();
            });
        }

        // Timer color picker buttons
        document.querySelectorAll('.color-btn[data-timer-text-color]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                document.querySelectorAll('.color-btn[data-timer-text-color]').forEach(b => b.classList.remove('active'));
                e.currentTarget.classList.add('active');
            });
        });
        
        document.querySelectorAll('.color-btn[data-timer-bg-color]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                document.querySelectorAll('.color-btn[data-timer-bg-color]').forEach(b => b.classList.remove('active'));
                e.currentTarget.classList.add('active');
            });
        });
        
        // Timer color picker buttons (Fullscreen)
        document.querySelectorAll('.color-btn[data-timer-fs-text-color]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                document.querySelectorAll('.color-btn[data-timer-fs-text-color]').forEach(b => b.classList.remove('active'));
                e.currentTarget.classList.add('active');
            });
        });

        document.querySelectorAll('.color-btn[data-timer-fs-bg-color]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                document.querySelectorAll('.color-btn[data-timer-fs-bg-color]').forEach(b => b.classList.remove('active'));
                e.currentTarget.classList.add('active');
            });
        });

        // Timer color settings checkbox toggle
        const timerColorCheckbox = document.getElementById('timer-color-checkbox');
        const timerColorSettings = document.getElementById('timer-color-settings');
        if (timerColorCheckbox && timerColorSettings) {
            timerColorCheckbox.addEventListener('change', (e) => {
                if (e.target.checked) {
                    timerColorSettings.style.display = 'block';
                } else {
                    timerColorSettings.style.display = 'none';
                }
            });
        }
        
        // Custom color pickers (Fullscreen)
        const customFsTextColorPicker = document.getElementById('custom-timer-fs-text-color-picker');
        if (customFsTextColorPicker) {
            customFsTextColorPicker.addEventListener('input', (e) => {
                document.querySelectorAll('.color-btn[data-timer-fs-text-color]').forEach(b => b.classList.remove('active'));
                const parentBtn = e.target.closest('.color-picker-icon-btn');
                if (parentBtn) parentBtn.classList.add('active-custom');
            });
        }

        const customFsBgColorPicker = document.getElementById('custom-timer-fs-bg-color-picker');
        if (customFsBgColorPicker) {
            customFsBgColorPicker.addEventListener('input', (e) => {
                document.querySelectorAll('.color-btn[data-timer-fs-bg-color]').forEach(b => b.classList.remove('active'));
                const parentBtn = e.target.closest('.color-picker-icon-btn');
                if (parentBtn) parentBtn.classList.add('active-custom');
            });
        }

        // Custom color pickers
        const customTextColorPicker = document.getElementById('custom-timer-text-color-picker');
        if (customTextColorPicker) {
            customTextColorPicker.addEventListener('input', (e) => {
                // Deselect all preset buttons
                document.querySelectorAll('.color-btn[data-timer-text-color]').forEach(b => b.classList.remove('active'));
                // Update the custom picker parent button as active
                const parentBtn = e.target.closest('.color-picker-icon-btn');
                if (parentBtn) {
                    parentBtn.classList.add('active-custom');
                }
            });
        }
        
        const customBgColorPicker = document.getElementById('custom-timer-bg-color-picker');
        if (customBgColorPicker) {
            customBgColorPicker.addEventListener('input', (e) => {
                // Deselect all preset buttons
                document.querySelectorAll('.color-btn[data-timer-bg-color]').forEach(b => b.classList.remove('active'));
                // Update the custom picker parent button as active
                const parentBtn = e.target.closest('.color-picker-icon-btn');
                if (parentBtn) {
                    parentBtn.classList.add('active-custom');
                }
            });
        }
        
        // Action buttons - only start button
        const timerStartBtn = document.getElementById('timer-start-btn');
        if (timerStartBtn) {
            timerStartBtn.addEventListener('click', () => {
                this.startTimer();
            });
        }
        
        // Timer settings modal close button
        const timerSettingsCloseBtn = document.getElementById('timer-settings-close-btn');
        if (timerSettingsCloseBtn) {
            timerSettingsCloseBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.hideSettingsModal();
            });
        }
        
        // Timer alert modal OK button
        const timerAlertOkBtn = document.getElementById('timer-alert-ok-btn');
        if (timerAlertOkBtn) {
            timerAlertOkBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.hideAlertModal();
            });
        }
    }
    
    showAlertModal(message) {
        const modal = document.getElementById('timer-alert-modal');
        const messageEl = document.getElementById('timer-alert-message');
        if (modal && messageEl) {
            messageEl.textContent = message;
            modal.classList.add('show');
        }
    }
    
    hideAlertModal() {
        const modal = document.getElementById('timer-alert-modal');
        if (modal) {
            modal.classList.remove('show');
        }
    }
    
    updateSoundGroupVisibility(mode) {
        const soundGroup = document.querySelector('.timer-sound-group');
        if (soundGroup) {
            if (mode === 'countdown') {
                soundGroup.classList.remove('disabled');
                soundGroup.style.display = 'block';
            } else {
                soundGroup.classList.add('disabled');
                soundGroup.style.display = 'none';
                // Stop any playing preview when switching to stopwatch mode
                this.stopPreviewAudio();
                // Also hide sound settings content when switching modes
                const soundSettingsContent = document.getElementById('sound-settings-content');
                if (soundSettingsContent) {
                    soundSettingsContent.style.display = 'none';
                }
                // Uncheck the sound checkbox
                const soundCheckbox = document.getElementById('timer-sound-checkbox');
                if (soundCheckbox) {
                    soundCheckbox.checked = false;
                }
            }
        }
    }
    
    updateTimerLabel(mode) {
        const label = document.getElementById('timer-time-label');
        if (label) {
            if (mode === 'stopwatch') {
                label.textContent = window.i18n.t('timer.setStartTime');
            } else {
                label.textContent = window.i18n.t('timer.duration');
            }
        }
    }
    
    showSettingsModal() {
        this.adjustingTimer = null; // Not adjusting, creating new timer
        
        const modal = document.getElementById('timer-settings-modal');
        if (modal) {
            modal.classList.add('show');
            
            // Reset to defaults
            const mode = 'stopwatch';
            document.querySelectorAll('.timer-mode-btn').forEach(b => b.classList.remove('active'));
            document.querySelector('.timer-mode-btn[data-mode="stopwatch"]').classList.add('active');
            
            this.updateSoundGroupVisibility(mode);
            this.updateTimerLabel(mode);
            
            // Clear time inputs
            document.getElementById('timer-hours').value = '0';
            document.getElementById('timer-minutes').value = '0';
            document.getElementById('timer-seconds').value = '0';
            
            // Reset sound settings
            document.getElementById('timer-sound-checkbox').checked = false;
            const soundSettingsContent = document.getElementById('sound-settings-content');
            if (soundSettingsContent) {
                soundSettingsContent.style.display = 'none';
            }
            document.querySelectorAll('.sound-preset-btn').forEach(b => b.classList.remove('active'));
            const firstPreset = document.querySelector('.sound-preset-btn[data-sound="class-bell"]');
            if (firstPreset) {
                firstPreset.classList.add('active');
            }
            
            // Reset loop settings
            const loopCheckbox = document.getElementById('timer-loop-checkbox');
            const loopCountGroup = document.getElementById('sound-loop-count-group');
            if (loopCheckbox) {
                loopCheckbox.checked = false;
            }
            if (loopCountGroup) {
                loopCountGroup.style.display = 'none';
            }
            document.getElementById('timer-loop-count').value = '3';

            // Reset new settings
            document.getElementById('timer-playback-speed').value = '1.0';
            document.getElementById('timer-playback-speed-value').textContent = '1.0x';
            document.getElementById('timer-loop-interval').value = '1';

            // Reset More Settings UI
            const moreSettingsBtn = document.getElementById('timer-more-settings-btn');
            const moreSettingsContent = document.getElementById('timer-more-settings-content');
            if (moreSettingsBtn) moreSettingsBtn.classList.remove('expanded');
            if (moreSettingsContent) moreSettingsContent.style.display = 'none';

            this.updateMainPreviewButtonState();
            this.updateMoreSettingsState();
        }
    }
    
    showSettingsModalForTimer(timer) {
        this.adjustingTimer = timer;
        
        const modal = document.getElementById('timer-settings-modal');
        if (modal) {
            modal.classList.add('show');
            
            // Set mode based on timer
            document.querySelectorAll('.timer-mode-btn').forEach(b => b.classList.remove('active'));
            document.querySelector(`.timer-mode-btn[data-mode="${timer.mode}"]`).classList.add('active');
            
            this.updateSoundGroupVisibility(timer.mode);
            this.updateTimerLabel(timer.mode);
            
            // Set time inputs based on timer duration
            const totalSeconds = Math.floor(timer.countdownDuration / 1000);
            const hours = Math.floor(totalSeconds / 3600);
            const minutes = Math.floor((totalSeconds % 3600) / 60);
            const seconds = totalSeconds % 60;
            
            document.getElementById('timer-hours').value = hours;
            document.getElementById('timer-minutes').value = minutes;
            document.getElementById('timer-seconds').value = seconds;
            
            // Set sound settings
            document.getElementById('timer-sound-checkbox').checked = timer.playSound;
            const soundSettingsContent = document.getElementById('sound-settings-content');
            if (soundSettingsContent) {
                soundSettingsContent.style.display = timer.playSound ? 'block' : 'none';
            }
            
            // Set loop settings
            const loopCheckbox = document.getElementById('timer-loop-checkbox');
            const loopCountGroup = document.getElementById('sound-loop-count-group');
            if (loopCheckbox) {
                loopCheckbox.checked = timer.loopSound;
                if (timer.loopSound && loopCountGroup) {
                    loopCountGroup.style.display = 'flex';
                } else if (loopCountGroup) {
                    loopCountGroup.style.display = 'none';
                }
            }
            
            const loopCountInput = document.getElementById('timer-loop-count');
            if (loopCountInput) {
                loopCountInput.value = timer.loopCount;
            }
            
            // Set new settings
            const speedSlider = document.getElementById('timer-playback-speed');
            const speedValue = document.getElementById('timer-playback-speed-value');
            if (speedSlider) speedSlider.value = timer.playbackSpeed || 1.0;
            if (speedValue) speedValue.textContent = `${timer.playbackSpeed || 1.0}x`;

            const intervalInput = document.getElementById('timer-loop-interval');
            if (intervalInput) intervalInput.value = timer.loopInterval || 0;

            // Update More Settings State
            const moreSettingsBtn = document.getElementById('timer-more-settings-btn');
            const moreSettingsContent = document.getElementById('timer-more-settings-content');

            // Always collapse by default when opening settings for a timer, user can expand if they want to see details
            // OR: keep expanded if it has active settings?
            // Let's reset expansion but set active state correctly

            if (moreSettingsBtn) {
                moreSettingsBtn.classList.remove('expanded');
                if (moreSettingsContent) moreSettingsContent.style.display = 'none';
            }

            this.updateMoreSettingsState();

            if (timer.selectedSound) {
                document.querySelectorAll('.sound-preset-btn').forEach(b => b.classList.remove('active'));
                const soundBtn = document.querySelector(`.sound-preset-btn[data-sound="${timer.selectedSound}"]`);
                if (soundBtn) {
                    soundBtn.classList.add('active');
                }
            }

            // Set colors (Widget)
            // ... (handled implicitly by existing logic if I didn't break it? wait, existing logic is missing in search block, but I need to add Fullscreen color population)

            // Set colors (Fullscreen)
            // Reset all active states first
            document.querySelectorAll('.color-btn[data-timer-fs-text-color]').forEach(b => b.classList.remove('active'));
            document.querySelectorAll('.color-btn[data-timer-fs-bg-color]').forEach(b => b.classList.remove('active'));
            document.querySelectorAll('.timer-color-picker-icon').forEach(b => b.classList.remove('active-custom'));

            // Text Color (Fullscreen)
            const fsTextColorBtn = document.querySelector(`.color-btn[data-timer-fs-text-color="${timer.fullscreenTextColor}"]`);
            if (fsTextColorBtn) {
                fsTextColorBtn.classList.add('active');
            } else {
                // Custom color
                const picker = document.getElementById('custom-timer-fs-text-color-picker');
                if (picker) {
                    picker.value = timer.fullscreenTextColor;
                    const parent = picker.closest('.color-picker-icon-btn');
                    if (parent) parent.classList.add('active-custom');
                }
            }

            // Bg Color (Fullscreen)
            const fsBgColorBtn = document.querySelector(`.color-btn[data-timer-fs-bg-color="${timer.fullscreenBgColor}"]`);
            if (fsBgColorBtn) {
                fsBgColorBtn.classList.add('active');
            } else {
                // Custom color
                const picker = document.getElementById('custom-timer-fs-bg-color-picker');
                if (picker) {
                    picker.value = timer.fullscreenBgColor;
                    const parent = picker.closest('.color-picker-icon-btn');
                    if (parent) parent.classList.add('active-custom');
                }
            }

            this.updateMainPreviewButtonState();
        }
    }
    
    hideSettingsModal() {
        const modal = document.getElementById('timer-settings-modal');
        if (modal) {
            modal.classList.remove('show');
        }
        this.adjustingTimer = null;
    }
    
    startTimer() {
        // Get time input values
        const hours = parseInt(document.getElementById('timer-hours').value) || 0;
        const minutes = parseInt(document.getElementById('timer-minutes').value) || 0;
        const seconds = parseInt(document.getElementById('timer-seconds').value) || 0;
        
        // Get title
        const title = document.getElementById('timer-title-input').value.trim();
        
        // Get mode
        const activeMode = document.querySelector('.timer-mode-btn.active');
        const mode = activeMode ? activeMode.dataset.mode : 'stopwatch';
        
        // Get sound settings
        const playSound = document.getElementById('timer-sound-checkbox').checked;
        const activeSoundBtn = document.querySelector('.sound-preset-btn.active');
        const selectedSound = activeSoundBtn ? activeSoundBtn.dataset.sound : 'class-bell';
        
        // Get custom sound URL if custom sound is selected
        let customSoundUrl = null;
        if (activeSoundBtn && activeSoundBtn.dataset.url) {
            customSoundUrl = activeSoundBtn.dataset.url;
        }
        
        // Get loop settings
        const loopSound = document.getElementById('timer-loop-checkbox').checked;
        const loopCount = parseInt(document.getElementById('timer-loop-count').value) || 3;
        const loopInterval = parseInt(document.getElementById('timer-loop-interval').value) || 0;
        const playbackSpeed = parseFloat(document.getElementById('timer-playback-speed').value) || 1.0;
        
        // Get color settings - check custom pickers first, then preset buttons
        let textColor = '#333333';
        let bgColor = '#FFFFFF';
        
        const activeTextColorBtn = document.querySelector('.color-btn.active[data-timer-text-color]');
        const customTextColorPicker = document.getElementById('custom-timer-text-color-picker');
        const customTextPickerParent = customTextColorPicker?.closest('.color-picker-icon-btn');
        
        if (customTextPickerParent && customTextPickerParent.classList.contains('active-custom')) {
            textColor = customTextColorPicker.value;
        } else if (activeTextColorBtn) {
            textColor = activeTextColorBtn.dataset.timerTextColor;
        }
        
        const activeBgColorBtn = document.querySelector('.color-btn.active[data-timer-bg-color]');
        const customBgColorPicker = document.getElementById('custom-timer-bg-color-picker');
        const customBgPickerParent = customBgColorPicker?.closest('.color-picker-icon-btn');
        
        if (customBgPickerParent && customBgPickerParent.classList.contains('active-custom')) {
            bgColor = customBgColorPicker.value;
        } else if (activeBgColorBtn) {
            bgColor = activeBgColorBtn.dataset.timerBgColor;
        }
        
        // Get Fullscreen color settings
        let fsTextColor = '#FFFFFF';
        let fsBgColor = '#000000';

        const activeFsTextColorBtn = document.querySelector('.color-btn.active[data-timer-fs-text-color]');
        const customFsTextColorPicker = document.getElementById('custom-timer-fs-text-color-picker');
        const customFsTextPickerParent = customFsTextColorPicker?.closest('.color-picker-icon-btn');

        if (customFsTextPickerParent && customFsTextPickerParent.classList.contains('active-custom')) {
            fsTextColor = customFsTextColorPicker.value;
        } else if (activeFsTextColorBtn) {
            fsTextColor = activeFsTextColorBtn.dataset.timerFsTextColor;
        }

        const activeFsBgColorBtn = document.querySelector('.color-btn.active[data-timer-fs-bg-color]');
        const customFsBgColorPicker = document.getElementById('custom-timer-fs-bg-color-picker');
        const customFsBgPickerParent = customFsBgColorPicker?.closest('.color-picker-icon-btn');

        if (customFsBgPickerParent && customFsBgPickerParent.classList.contains('active-custom')) {
            fsBgColor = customFsBgColorPicker.value;
        } else if (activeFsBgColorBtn) {
            fsBgColor = activeFsBgColorBtn.dataset.timerFsBgColor;
        }

        const duration = (hours * 3600 + minutes * 60 + seconds) * 1000;
        
        // Use custom modal instead of browser alert
        if (mode === 'countdown' && duration === 0) {
            this.showAlertModal(window.i18n.t('timer.alertSetTime') || '请设置倒计时时间');
            return;
        }
        
        if (this.adjustingTimer) {
            // Update existing timer
            this.adjustingTimer.updateSettings(duration, playSound, selectedSound, customSoundUrl, loopSound, loopCount, loopInterval, playbackSpeed, title, textColor, bgColor, fsTextColor, fsBgColor);
            this.adjustingTimer = null;
        } else {
            // Create new timer
            const id = this.nextTimerId++;
            const options = {
                id: id,
                mode: mode,
                duration: duration,
                playSound: playSound,
                selectedSound: selectedSound,
                customSoundUrl: customSoundUrl,
                loopSound: loopSound,
                loopCount: loopCount,
                loopInterval: loopInterval,
                playbackSpeed: playbackSpeed,
                manager: this,
                title: title,
                textColor: textColor,
                bgColor: bgColor,
                fullscreenTextColor: fsTextColor,
                fullscreenBgColor: fsBgColor
            };
            const timer = new TimerInstance(options);
            this.timers.set(id, timer);
        }
        
        this.hideSettingsModal();
    }
    
    removeTimer(id) {
        this.timers.delete(id);
    }
    
    stopPreviewAudio() {
        if (this.previewAudio) {
            this.previewAudio.pause();
            this.previewAudio.currentTime = 0;
            this.previewAudio = null;
        }
        
        // Reset all preview button states
        if (this.currentPreviewButton) {
            if (this.currentPreviewButton.id === 'timer-sound-preview-btn') {
                this.currentPreviewButton.textContent = window.i18n.t('common.preview') || '试听';
            } else {
                this.currentPreviewButton.innerHTML = `
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <polygon points="5 3 19 12 5 21 5 3"></polygon>
                    </svg>
                `;
                this.currentPreviewButton.title = window.i18n.t('common.preview') || '试听';
            }
            this.currentPreviewButton = null;
        }
    }
    
    previewSound(soundKey, previewButton) {
        // If same button clicked and audio is playing, pause it
        if (this.currentPreviewButton === previewButton && this.previewAudio && !this.previewAudio.paused) {
            this.stopPreviewAudio();
            return;
        }
        
        // Stop any currently playing preview
        this.stopPreviewAudio();
        
        // Use preloaded audio for immediate playback
        const preloadedAudio = this.preloadedAudio[soundKey];
        if (preloadedAudio) {
            // Clone the preloaded audio to allow concurrent previews
            this.previewAudio = preloadedAudio.cloneNode();
            this.currentPreviewButton = previewButton;
            
            // Update button to show pause icon
            if (previewButton.id === 'timer-sound-preview-btn') {
                previewButton.textContent = window.i18n.t('common.stop') || '停止';
            } else {
                previewButton.innerHTML = `
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <rect x="6" y="4" width="4" height="16"></rect>
                        <rect x="14" y="4" width="4" height="16"></rect>
                    </svg>
                `;
                previewButton.title = window.i18n.t('common.stop') || '停止';
            }
            
            // Reset button when audio ends
            this.previewAudio.addEventListener('ended', () => {
                this.stopPreviewAudio();
            });
            
            // Play immediately
            this.previewAudio.play().catch(err => {
                console.warn('无法播放音频预览:', err);
                this.stopPreviewAudio();
            });
        }
    }
    
    previewSoundByUrl(soundUrl, previewButton) {
        // If same button clicked and audio is playing, pause it
        if (this.currentPreviewButton === previewButton && this.previewAudio && !this.previewAudio.paused) {
            this.stopPreviewAudio();
            return;
        }
        
        // Stop any currently playing preview
        this.stopPreviewAudio();
        
        if (soundUrl) {
            this.previewAudio = new Audio(soundUrl);
            this.currentPreviewButton = previewButton;
            
            // Update button to show pause icon
            if (previewButton.id === 'timer-sound-preview-btn') {
                previewButton.textContent = window.i18n.t('common.stop') || '停止';
            } else {
                previewButton.innerHTML = `
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <rect x="6" y="4" width="4" height="16"></rect>
                        <rect x="14" y="4" width="4" height="16"></rect>
                    </svg>
                `;
                previewButton.title = window.i18n.t('common.stop') || '停止';
            }
            
            // Reset button when audio ends
            this.previewAudio.addEventListener('ended', () => {
                this.stopPreviewAudio();
            });
            
            this.previewAudio.play().catch(err => {
                console.warn('无法播放音频预览:', err);
                this.stopPreviewAudio();
            });
        }
    }
}
