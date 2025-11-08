// Timer Module
// Handles stopwatch and countdown timer functionality

class TimerManager {
    constructor() {
        this.mode = 'stopwatch'; // 'stopwatch' or 'countdown'
        this.isRunning = false;
        this.isPaused = false;
        this.startTime = 0;
        this.elapsedTime = 0;
        this.countdownDuration = 0; // in milliseconds
        this.remainingTime = 0; // in milliseconds
        this.intervalId = null;
        this.playSound = false;
        this.selectedSound = 'class-bell';
        this.customSoundUrl = null;
        
        // Preloaded sounds
        this.sounds = {
            'class-bell': '/sounds/class-bell.mp3',
            'exam-end': '/sounds/exam-end.mp3',
            'gentle-alarm': '/sounds/gentle-alarm.mp3',
            'digital-beep': '/sounds/digital-beep.mp3'
        };
        
        // For dragging
        this.isDragging = false;
        this.dragOffset = { x: 0, y: 0 };
        
        this.setupEventListeners();
    }
    
    setupEventListeners() {
        // Timer mode buttons
        document.querySelectorAll('.timer-mode-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.mode = e.currentTarget.dataset.mode;
                document.querySelectorAll('.timer-mode-btn').forEach(b => b.classList.remove('active'));
                e.currentTarget.classList.add('active');
                this.updateSoundGroupVisibility();
            });
        });
        
        // Sound checkbox
        const soundCheckbox = document.getElementById('timer-sound-checkbox');
        if (soundCheckbox) {
            soundCheckbox.addEventListener('change', (e) => {
                this.playSound = e.target.checked;
            });
        }
        
        // Sound preset buttons
        document.querySelectorAll('.sound-preset-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const button = e.currentTarget;
                this.selectedSound = button.dataset.sound;
                this.customSoundUrl = null;
                document.querySelectorAll('.sound-preset-btn').forEach(b => b.classList.remove('active'));
                button.classList.add('active');
            });
        });
        
        // Sound preview buttons
        document.querySelectorAll('.sound-preview-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const sound = e.currentTarget.closest('.sound-preset-btn').dataset.sound;
                this.previewSound(sound);
            });
        });
        
        // Sound upload
        const soundUploadInput = document.getElementById('timer-sound-upload');
        if (soundUploadInput) {
            soundUploadInput.addEventListener('change', (e) => {
                const file = e.target.files[0];
                if (file && file.type.startsWith('audio/')) {
                    const url = URL.createObjectURL(file);
                    this.customSoundUrl = url;
                    this.selectedSound = null;
                    // Update UI to show custom sound is selected
                    document.querySelectorAll('.sound-preset-btn').forEach(b => b.classList.remove('active'));
                    alert('自定义音频已上传');
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
        
        // Timer display controls
        const playPauseBtn = document.getElementById('timer-play-pause-btn');
        if (playPauseBtn) {
            playPauseBtn.addEventListener('click', () => {
                this.togglePlayPause();
            });
        }
        
        const resetBtn = document.getElementById('timer-reset-btn');
        if (resetBtn) {
            resetBtn.addEventListener('click', () => {
                this.resetTimer();
            });
        }
        
        // Close timer display
        const timerCloseBtn = document.getElementById('timer-display-close-btn');
        if (timerCloseBtn) {
            timerCloseBtn.addEventListener('click', () => {
                this.closeTimer();
            });
        }
        
        // Setup dragging for timer display
        this.setupTimerDisplayDragging();
    }
    
    updateSoundGroupVisibility() {
        const soundGroup = document.querySelector('.timer-sound-group');
        if (soundGroup) {
            if (this.mode === 'countdown') {
                soundGroup.classList.remove('disabled');
            } else {
                soundGroup.classList.add('disabled');
            }
        }
    }
    
    showSettingsModal() {
        const modal = document.getElementById('timer-settings-modal');
        if (modal) {
            modal.classList.add('show');
            
            // Reset to defaults
            this.mode = 'stopwatch';
            document.querySelectorAll('.timer-mode-btn').forEach(b => b.classList.remove('active'));
            document.querySelector('.timer-mode-btn[data-mode="stopwatch"]').classList.add('active');
            
            this.updateSoundGroupVisibility();
            
            // Clear time inputs
            document.getElementById('timer-hours').value = '0';
            document.getElementById('timer-minutes').value = '0';
            document.getElementById('timer-seconds').value = '0';
            
            // Reset sound settings
            document.getElementById('timer-sound-checkbox').checked = false;
            this.playSound = false;
            document.querySelectorAll('.sound-preset-btn').forEach(b => b.classList.remove('active'));
            document.querySelector('.sound-preset-btn[data-sound="class-bell"]').classList.add('active');
            this.selectedSound = 'class-bell';
            this.customSoundUrl = null;
        }
    }
    
    hideSettingsModal() {
        const modal = document.getElementById('timer-settings-modal');
        if (modal) {
            modal.classList.remove('show');
        }
    }
    
    startTimer() {
        // Get time input values
        const hours = parseInt(document.getElementById('timer-hours').value) || 0;
        const minutes = parseInt(document.getElementById('timer-minutes').value) || 0;
        const seconds = parseInt(document.getElementById('timer-seconds').value) || 0;
        
        if (this.mode === 'countdown') {
            this.countdownDuration = (hours * 3600 + minutes * 60 + seconds) * 1000;
            if (this.countdownDuration === 0) {
                alert('请设置倒计时时间');
                return;
            }
            this.remainingTime = this.countdownDuration;
        } else {
            // Stopwatch mode - can start from a specific time if set
            this.elapsedTime = (hours * 3600 + minutes * 60 + seconds) * 1000;
        }
        
        this.hideSettingsModal();
        this.showTimerDisplay();
        this.startTimerLoop();
    }
    
    startTimerLoop() {
        this.isRunning = true;
        this.isPaused = false;
        this.startTime = Date.now();
        
        this.intervalId = setInterval(() => {
            this.updateTimer();
        }, 100); // Update every 100ms for smooth display
        
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
        
        const timeDisplay = document.querySelector('.timer-display-time');
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
        const btn = document.getElementById('timer-play-pause-btn');
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
        const timeDisplay = document.querySelector('.timer-display-time');
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
        this.isPaused = false;
        
        if (this.mode === 'stopwatch') {
            this.elapsedTime = 0;
            this.displayTime(0);
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
        
        const timeDisplay = document.querySelector('.timer-display-time');
        if (timeDisplay) {
            timeDisplay.classList.add('finished');
        }
        
        // Play sound if enabled
        if (this.playSound) {
            this.playFinishSound();
        }
    }
    
    previewSound(soundKey) {
        const soundUrl = this.sounds[soundKey];
        if (soundUrl) {
            const audio = new Audio(soundUrl);
            audio.play().catch(err => {
                console.warn('无法播放音频预览:', err);
                // Fallback to a simple beep
                this.playBeep();
            });
        }
    }
    
    playFinishSound() {
        let soundUrl;
        if (this.customSoundUrl) {
            soundUrl = this.customSoundUrl;
        } else if (this.selectedSound && this.sounds[this.selectedSound]) {
            soundUrl = this.sounds[this.selectedSound];
        }
        
        if (soundUrl) {
            const audio = new Audio(soundUrl);
            audio.play().catch(err => {
                console.warn('无法播放音频:', err);
                // Fallback to a simple beep
                this.playBeep();
            });
        } else {
            this.playBeep();
        }
    }
    
    playBeep() {
        // Create a simple beep sound using Web Audio API
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        oscillator.frequency.value = 800;
        oscillator.type = 'sine';
        
        gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
        
        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + 0.5);
    }
    
    showTimerDisplay() {
        const display = document.getElementById('timer-display');
        if (display) {
            display.classList.add('show');
            
            // Set mode label
            const modeLabel = document.querySelector('.timer-display-mode');
            if (modeLabel) {
                modeLabel.textContent = this.mode === 'stopwatch' ? '正计时' : '倒计时';
            }
            
            // Initialize time display
            if (this.mode === 'stopwatch') {
                this.displayTime(this.elapsedTime);
            } else {
                this.displayTime(this.remainingTime);
            }
        }
    }
    
    closeTimer() {
        // Stop the timer
        if (this.intervalId) {
            clearInterval(this.intervalId);
            this.intervalId = null;
        }
        
        this.isRunning = false;
        this.isPaused = false;
        this.elapsedTime = 0;
        this.remainingTime = 0;
        
        // Hide the display
        const display = document.getElementById('timer-display');
        if (display) {
            display.classList.remove('show');
        }
    }
    
    setupTimerDisplayDragging() {
        const timerDisplay = document.getElementById('timer-display');
        if (!timerDisplay) return;
        
        timerDisplay.addEventListener('mousedown', (e) => {
            // Don't start dragging if clicking on buttons
            if (e.target.closest('button')) return;
            
            this.isDragging = true;
            timerDisplay.classList.add('dragging');
            
            const rect = timerDisplay.getBoundingClientRect();
            this.dragOffset.x = e.clientX - rect.left;
            this.dragOffset.y = e.clientY - rect.top;
            
            e.preventDefault();
        });
        
        document.addEventListener('mousemove', (e) => {
            if (!this.isDragging) return;
            
            const x = e.clientX - this.dragOffset.x;
            const y = e.clientY - this.dragOffset.y;
            
            // Apply edge snapping
            const edgeSnapDistance = 30;
            const windowWidth = window.innerWidth;
            const windowHeight = window.innerHeight;
            const rect = timerDisplay.getBoundingClientRect();
            
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
            
            timerDisplay.style.left = `${finalX}px`;
            timerDisplay.style.top = `${finalY}px`;
            timerDisplay.style.right = 'auto';
            timerDisplay.style.bottom = 'auto';
        });
        
        document.addEventListener('mouseup', () => {
            if (this.isDragging) {
                this.isDragging = false;
                timerDisplay.classList.remove('dragging');
            }
        });
    }
}
