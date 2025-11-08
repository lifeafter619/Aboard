// Timer Module - Refactored to support multiple timer instances
// Each timer can be stopwatch or countdown, independently controlled

// Single Timer Instance Class
class TimerInstance {
    constructor(id, mode, duration, playSound, selectedSound, customSoundUrl, loopSound, loopCount, manager) {
        this.id = id;
        this.mode = mode; // 'stopwatch' or 'countdown'
        this.manager = manager;
        
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
        this.isFullscreen = false;
        this.fontSize = 32;
        
        // For dragging
        this.isDragging = false;
        this.dragOffset = { x: 0, y: 0 };
        
        this.createDisplayElement();
        this.startTimerLoop();
        this.setupFullscreenChangeListener();
    }
    
    setupFullscreenChangeListener() {
        // Listen for fullscreen changes (e.g., ESC key)
        const handleFullscreenChange = () => {
            const isInFullscreen = document.fullscreenElement === this.displayElement ||
                                 document.webkitFullscreenElement === this.displayElement ||
                                 document.mozFullScreenElement === this.displayElement ||
                                 document.msFullscreenElement === this.displayElement;
            
            if (!isInFullscreen && this.isFullscreen) {
                // User exited fullscreen using ESC or browser UI
                this.isFullscreen = false;
                this.displayElement.classList.remove('fullscreen');
            }
        };
        
        document.addEventListener('fullscreenchange', handleFullscreenChange);
        document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
        document.addEventListener('mozfullscreenchange', handleFullscreenChange);
        document.addEventListener('MSFullscreenChange', handleFullscreenChange);
    }
    
    createDisplayElement() {
        const display = document.createElement('div');
        display.className = 'timer-display-widget';
        display.dataset.timerId = this.id;
        
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
        const adjustBtn = this.displayElement.querySelector('.timer-adjust-btn');
        const fullscreenBtn = this.displayElement.querySelector('.timer-fullscreen-btn');
        const fontSizeSlider = this.displayElement.querySelector('.timer-font-size-slider');
        
        playPauseBtn.addEventListener('click', () => this.togglePlayPause());
        resetBtn.addEventListener('click', () => this.resetTimer());
        closeBtn.addEventListener('click', () => this.closeTimer());
        adjustBtn.addEventListener('click', () => this.adjustTimer());
        fullscreenBtn.addEventListener('click', () => this.toggleFullscreen());
        fontSizeSlider.addEventListener('input', (e) => this.updateFontSize(e.target.value));
    }
    
    setupDragging() {
        const header = this.displayElement.querySelector('.timer-display-header');
        
        const handleMouseMove = (e) => {
            if (!this.isDragging) return;
            
            // Use requestAnimationFrame for smooth dragging performance
            requestAnimationFrame(() => {
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
                document.removeEventListener('mousemove', handleMouseMove);
                document.removeEventListener('mouseup', handleMouseUp);
            }
        };
        
        header.addEventListener('mousedown', (e) => {
            // Don't start dragging if clicking on close button
            if (e.target.closest('.timer-close-btn')) return;
            
            this.isDragging = true;
            this.displayElement.classList.add('dragging');
            
            const rect = this.displayElement.getBoundingClientRect();
            this.dragOffset.x = e.clientX - rect.left;
            this.dragOffset.y = e.clientY - rect.top;
            
            // Add listeners only when dragging starts
            document.addEventListener('mousemove', handleMouseMove);
            document.addEventListener('mouseup', handleMouseUp);
            
            e.preventDefault();
        });
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
    
    toggleFullscreen() {
        if (this.isFullscreen) {
            this.exitFullscreen();
        } else {
            this.enterFullscreen();
        }
    }
    
    enterFullscreen() {
        this.isFullscreen = true;
        
        // Use browser's fullscreen API for true fullscreen
        if (this.displayElement.requestFullscreen) {
            this.displayElement.requestFullscreen().then(() => {
                this.displayElement.classList.add('fullscreen');
            }).catch(err => {
                console.warn('无法进入全屏:', err);
                // Fallback to CSS fullscreen
                this.displayElement.classList.add('fullscreen');
            });
        } else if (this.displayElement.webkitRequestFullscreen) {
            this.displayElement.webkitRequestFullscreen();
            this.displayElement.classList.add('fullscreen');
        } else if (this.displayElement.mozRequestFullScreen) {
            this.displayElement.mozRequestFullScreen();
            this.displayElement.classList.add('fullscreen');
        } else if (this.displayElement.msRequestFullscreen) {
            this.displayElement.msRequestFullscreen();
            this.displayElement.classList.add('fullscreen');
        } else {
            // Fallback to CSS fullscreen
            this.displayElement.classList.add('fullscreen');
        }
    }
    
    exitFullscreen() {
        this.isFullscreen = false;
        
        // Exit browser fullscreen if active
        if (document.fullscreenElement === this.displayElement ||
            document.webkitFullscreenElement === this.displayElement ||
            document.mozFullScreenElement === this.displayElement ||
            document.msFullscreenElement === this.displayElement) {
            if (document.exitFullscreen) {
                document.exitFullscreen();
            } else if (document.webkitExitFullscreen) {
                document.webkitExitFullscreen();
            } else if (document.mozCancelFullScreen) {
                document.mozCancelFullScreen();
            } else if (document.msExitFullscreen) {
                document.msExitFullscreen();
            }
        }
        
        this.displayElement.classList.remove('fullscreen');
    }
    
    updateFontSize(size) {
        this.fontSize = parseInt(size);
        const timeDisplay = this.displayElement.querySelector('.timer-display-time');
        if (timeDisplay) {
            timeDisplay.style.fontSize = `${this.fontSize}px`;
        }
    }
    
    closeTimer() {
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
        
        // Remove from DOM
        if (this.displayElement) {
            this.displayElement.remove();
        }
        
        // Remove from manager
        this.manager.removeTimer(this.id);
    }
    
    updateSettings(duration, playSound, selectedSound, customSoundUrl, loopSound, loopCount) {
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
        
        // Current timer being adjusted (for adjust functionality)
        this.adjustingTimer = null;
        
        this.setupEventListeners();
    }
    
    setupEventListeners() {
        // Timer mode buttons
        document.querySelectorAll('.timer-mode-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const mode = e.currentTarget.dataset.mode;
                document.querySelectorAll('.timer-mode-btn').forEach(b => b.classList.remove('active'));
                e.currentTarget.classList.add('active');
                this.updateSoundGroupVisibility(mode);
                this.updateTimerLabel(mode);
            });
        });
        
        // Sound checkbox
        const soundCheckbox = document.getElementById('timer-sound-checkbox');
        if (soundCheckbox) {
            soundCheckbox.addEventListener('change', (e) => {
                // This is handled when creating the timer
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
                }
            });
        });
        
        // Sound preview buttons
        document.querySelectorAll('.sound-preview-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const presetBtn = e.currentTarget.closest('.sound-preset-btn');
                if (presetBtn && presetBtn.dataset.sound) {
                    this.previewSound(presetBtn.dataset.sound);
                }
            });
        });
        
        // Sound upload
        const soundUploadInput = document.getElementById('timer-sound-upload');
        if (soundUploadInput) {
            soundUploadInput.addEventListener('change', (e) => {
                const file = e.target.files[0];
                if (file && file.type.startsWith('audio/')) {
                    const url = URL.createObjectURL(file);
                    soundUploadInput.dataset.customSoundUrl = url;
                    // Update UI to show custom sound is selected
                    document.querySelectorAll('.sound-preset-btn').forEach(b => b.classList.remove('active'));
                    alert('自定义音频已上传');
                }
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
            });
        }
        
        // Action buttons
        const timerCancelBtn = document.getElementById('timer-cancel-btn');
        if (timerCancelBtn) {
            timerCancelBtn.addEventListener('click', () => {
                this.hideSettingsModal();
            });
        }
        
        const timerStartBtn = document.getElementById('timer-start-btn');
        if (timerStartBtn) {
            timerStartBtn.addEventListener('click', () => {
                this.startTimer();
            });
        }
        
        // Timer settings modal close button
        const timerSettingsCloseBtn = document.getElementById('timer-settings-close-btn');
        if (timerSettingsCloseBtn) {
            timerSettingsCloseBtn.addEventListener('click', () => {
                this.hideSettingsModal();
            });
        }
    }
    
    updateSoundGroupVisibility(mode) {
        const soundGroup = document.querySelector('.timer-sound-group');
        if (soundGroup) {
            if (mode === 'countdown') {
                soundGroup.classList.remove('disabled');
            } else {
                soundGroup.classList.add('disabled');
            }
        }
    }
    
    updateTimerLabel(mode) {
        const label = document.getElementById('timer-time-label');
        if (label) {
            if (mode === 'stopwatch') {
                label.textContent = '设置开始时间';
            } else {
                label.textContent = '设置总时间';
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
            document.querySelectorAll('.sound-preset-btn').forEach(b => b.classList.remove('active'));
            document.querySelector('.sound-preset-btn[data-sound="class-bell"]').classList.add('active');
            
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
            
            const soundUploadInput = document.getElementById('timer-sound-upload');
            if (soundUploadInput) {
                soundUploadInput.value = '';
                delete soundUploadInput.dataset.customSoundUrl;
            }
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
            
            if (timer.selectedSound) {
                document.querySelectorAll('.sound-preset-btn').forEach(b => b.classList.remove('active'));
                const soundBtn = document.querySelector(`.sound-preset-btn[data-sound="${timer.selectedSound}"]`);
                if (soundBtn) {
                    soundBtn.classList.add('active');
                }
            }
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
        
        // Get mode
        const activeMode = document.querySelector('.timer-mode-btn.active');
        const mode = activeMode ? activeMode.dataset.mode : 'stopwatch';
        
        // Get sound settings
        const playSound = document.getElementById('timer-sound-checkbox').checked;
        const activeSoundBtn = document.querySelector('.sound-preset-btn.active');
        const selectedSound = activeSoundBtn ? activeSoundBtn.dataset.sound : 'class-bell';
        const soundUploadInput = document.getElementById('timer-sound-upload');
        const customSoundUrl = soundUploadInput ? soundUploadInput.dataset.customSoundUrl : null;
        
        // Get loop settings
        const loopSound = document.getElementById('timer-loop-checkbox').checked;
        const loopCount = parseInt(document.getElementById('timer-loop-count').value) || 3;
        
        const duration = (hours * 3600 + minutes * 60 + seconds) * 1000;
        
        if (mode === 'countdown' && duration === 0) {
            alert('请设置倒计时时间');
            return;
        }
        
        if (this.adjustingTimer) {
            // Update existing timer
            this.adjustingTimer.updateSettings(duration, playSound, selectedSound, customSoundUrl, loopSound, loopCount);
            this.adjustingTimer = null;
        } else {
            // Create new timer
            const id = this.nextTimerId++;
            const timer = new TimerInstance(id, mode, duration, playSound, selectedSound, customSoundUrl, loopSound, loopCount, this);
            this.timers.set(id, timer);
        }
        
        this.hideSettingsModal();
    }
    
    removeTimer(id) {
        this.timers.delete(id);
    }
    
    previewSound(soundKey) {
        const soundUrl = this.sounds[soundKey];
        if (soundUrl) {
            const audio = new Audio(soundUrl);
            audio.play().catch(err => {
                console.warn('无法播放音频预览:', err);
            });
        }
    }
}
