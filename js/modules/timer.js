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
        this.fullscreenFontSizePercent = 15; // percentage of viewport for fullscreen
        
        // For dragging
        this.isDragging = false;
        this.dragOffset = { x: 0, y: 0 };
        
        // Minimal display mode (replaces auto-hide)
        this.isMinimal = false;
        
        this.createDisplayElement();
        this.startTimerLoop();
        this.setupFullscreenChangeListener();
    }
    
    setupFullscreenChangeListener() {
        // No browser fullscreen API listeners needed - using CSS fullscreen only
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
        this.isFullscreen = true;
        
        // Apply fullscreen font size based on saved percentage (10-85%)
        // Constrain the value to be within the safe range
        const constrainedPercent = Math.max(10, Math.min(85, this.fullscreenFontSizePercent));
        const timeDisplay = this.displayElement.querySelector('.timer-display-time');
        if (timeDisplay) {
            timeDisplay.style.fontSize = `${constrainedPercent}vmin`;
        }
        
        // Use CSS fullscreen only (no browser fullscreen API)
        this.displayElement.classList.add('fullscreen');
    }
    
    exitFullscreen() {
        this.isFullscreen = false;
        
        // Restore normal font size
        const timeDisplay = this.displayElement.querySelector('.timer-display-time');
        if (timeDisplay) {
            timeDisplay.style.fontSize = `${this.fontSize}px`;
        }
        
        // Remove CSS fullscreen class
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
        
        // Timer alert modal OK button
        const timerAlertOkBtn = document.getElementById('timer-alert-ok-btn');
        if (timerAlertOkBtn) {
            timerAlertOkBtn.addEventListener('click', () => {
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
        
        // Get custom sound URL if custom sound is selected
        let customSoundUrl = null;
        if (activeSoundBtn && activeSoundBtn.dataset.url) {
            customSoundUrl = activeSoundBtn.dataset.url;
        }
        
        // Get loop settings
        const loopSound = document.getElementById('timer-loop-checkbox').checked;
        const loopCount = parseInt(document.getElementById('timer-loop-count').value) || 3;
        
        const duration = (hours * 3600 + minutes * 60 + seconds) * 1000;
        
        // Use custom modal instead of browser alert
        if (mode === 'countdown' && duration === 0) {
            this.showAlertModal('请设置倒计时时间');
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
    
    stopPreviewAudio() {
        if (this.previewAudio) {
            this.previewAudio.pause();
            this.previewAudio.currentTime = 0;
            this.previewAudio = null;
        }
        
        // Reset all preview button states
        if (this.currentPreviewButton) {
            this.currentPreviewButton.innerHTML = `
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <polygon points="5 3 19 12 5 21 5 3"></polygon>
                </svg>
            `;
            this.currentPreviewButton.title = '试听';
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
            previewButton.innerHTML = `
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <rect x="6" y="4" width="4" height="16"></rect>
                    <rect x="14" y="4" width="4" height="16"></rect>
                </svg>
            `;
            previewButton.title = '暂停';
            
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
            previewButton.innerHTML = `
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <rect x="6" y="4" width="4" height="16"></rect>
                    <rect x="14" y="4" width="4" height="16"></rect>
                </svg>
            `;
            previewButton.title = '暂停';
            
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
