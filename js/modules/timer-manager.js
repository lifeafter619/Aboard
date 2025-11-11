/**
 * Timer Manager Module - 计时器管理器模块  
 * Manages multiple timer instances and settings modal
 * 管理多个计时器实例和设置模态框
 * 
 * Features:
 * - Create and manage multiple timer instances (创建和管理多个计时器实例)
 * - Settings modal for timer configuration (计时器配置的设置模态框)
 * - Sound management (default and custom sounds) (声音管理（默认和自定义声音）)
 * - Sound preview and upload (声音预览和上传)
 */
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
        
        const duration = (hours * 3600 + minutes * 60 + seconds) * 1000;
        
        // Use custom modal instead of browser alert
        if (mode === 'countdown' && duration === 0) {
            this.showAlertModal('请设置倒计时时间');
            return;
        }
        
        if (this.adjustingTimer) {
            // Update existing timer
            this.adjustingTimer.updateSettings(duration, playSound, selectedSound, customSoundUrl, loopSound, loopCount, title);
            this.adjustingTimer = null;
        } else {
            // Create new timer
            const id = this.nextTimerId++;
            const timer = new TimerInstance(id, mode, duration, playSound, selectedSound, customSoundUrl, loopSound, loopCount, this, title);
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
