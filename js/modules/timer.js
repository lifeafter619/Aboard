// Timer Module - Refactored to support multiple timer instances
// Each timer can be stopwatch or countdown, independently controlled

function getTimerText(key, fallback) {
    if (!window.i18n?.t) {
        return fallback;
    }

    const translated = window.i18n.t(key);
    return translated && translated !== key ? translated : fallback;
}

function isQuotaExceededError(error) {
    if (!error) {
        return false;
    }

    return error.name === 'QuotaExceededError'
        || error.name === 'NS_ERROR_DOM_QUOTA_REACHED'
        || error.code === 22
        || error.code === 1014;
}

function scheduleTimerFrame(win = window) {
    return typeof win.requestAnimationFrame === 'function'
        ? win.requestAnimationFrame.bind(win)
        : (callback) => callback();
}

function getTimerFocusableElement(doc = document) {
    return doc.activeElement && doc.activeElement !== doc.body
        ? doc.activeElement
        : null;
}

function focusTimerElement(element, win = window) {
    scheduleTimerFrame(win)(() => {
        element?.focus?.();
    });
}

function normalizeTimerNumberInputValue(rawValue, {
    min,
    max,
    fallbackValue
} = {}) {
    const parsedValue = parseInt(rawValue, 10);
    if (Number.isNaN(parsedValue)) {
        return fallbackValue;
    }

    return Math.max(min, Math.min(max, parsedValue));
}

function escapeTimerHtml(value) {
    return String(value ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

// Strict CSS-color whitelist — refuses anything that could break out of a style attribute.
// Accepted: #rgb/#rgba/#rrggbb/#rrggbbaa hex, rgb()/rgba()/hsl()/hsla() with safe chars only,
// or a pure-letter CSS named color (red, transparent, currentColor, ...).
function sanitizeTimerColor(value, fallback) {
    if (typeof value !== 'string') return fallback;
    const trimmed = value.trim();
    if (!trimmed || trimmed.length > 64) return fallback;
    const hexPattern = /^#([0-9a-fA-F]{3,4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/;
    const rgbPattern = /^rgba?\(\s*[-+\d.,%\s/]+\s*\)$/i;
    const hslPattern = /^hsla?\(\s*[-+\d.,%\s/deg]+\s*\)$/i;
    const namedPattern = /^[a-zA-Z]+$/;
    if (hexPattern.test(trimmed) || rgbPattern.test(trimmed) || hslPattern.test(trimmed) || namedPattern.test(trimmed)) {
        return trimmed;
    }
    return fallback;
}

const timerPreviewPlayIconSvg = `
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <polygon points="5 3 19 12 5 21 5 3"></polygon>
    </svg>
`;

const timerPreviewPauseIconSvg = `
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <rect x="6" y="4" width="4" height="16"></rect>
        <rect x="14" y="4" width="4" height="16"></rect>
    </svg>
`;

const timerDeleteIconSvg = `
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <line x1="18" y1="6" x2="6" y2="18"></line>
        <line x1="6" y1="6" x2="18" y2="18"></line>
    </svg>
`;

function getTimerSoundActionLabel(key, fallback, soundName = '') {
    const baseLabel = getTimerText(key, fallback);
    return soundName ? `${baseLabel}: ${soundName}` : baseLabel;
}

function setTimerPreviewButtonState(previewButton, isPlaying) {
    if (!previewButton) {
        return;
    }

    const soundName = previewButton.dataset?.soundName || '';
    const actionKey = isPlaying ? 'common.stop' : 'timer.preview';
    const fallback = isPlaying ? 'Stop' : 'Preview';
    const actionLabel = getTimerSoundActionLabel(actionKey, fallback, soundName);
    previewButton.setAttribute?.('aria-label', actionLabel);
    previewButton.title = actionLabel;

    if (previewButton.id === 'timer-sound-preview-btn') {
        previewButton.textContent = getTimerText(actionKey, fallback);
        return;
    }

    previewButton.innerHTML = isPlaying ? timerPreviewPauseIconSvg : timerPreviewPlayIconSvg;
}

function findTimerSoundPresetButton(soundId, root = document) {
    if (!root?.querySelectorAll || soundId === null || typeof soundId === 'undefined') {
        return null;
    }

    const targetSoundId = String(soundId);
    return Array.from(root.querySelectorAll('.sound-preset-btn[data-sound]'))
        .find(button => button?.dataset?.sound === targetSoundId) || null;
}

// Single Timer Instance Class
class TimerInstance {
    constructor(options) {
        this.id = options.id;
        this.mode = options.mode; // 'stopwatch' or 'countdown'
        this.manager = options.manager;
        this.title = options.title || ''; // Timer title
        
        // Color settings
        this.textColor = sanitizeTimerColor(options.textColor, '#333333');
        this.bgColor = sanitizeTimerColor(options.bgColor, '#FFFFFF');
        this.fullscreenTextColor = sanitizeTimerColor(options.fullscreenTextColor, '#FFFFFF');
        this.fullscreenBgColor = sanitizeTimerColor(options.fullscreenBgColor, '#000000');
        
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
        this.loopCount = normalizeTimerNumberInputValue(options.loopCount, {
            min: 1,
            max: 100,
            fallbackValue: 3
        });
        this.loopInterval = normalizeTimerNumberInputValue(options.loopInterval, {
            min: 0,
            max: 60,
            fallbackValue: 0
        });
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
        this.localeChangeHandler = null;
        this.fullscreenPreviouslyFocusedElement = null;

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

        this.fullscreenModal.setAttribute('role', 'dialog');
        this.fullscreenModal.setAttribute('aria-modal', 'true');
        this.fullscreenModal.tabIndex = -1;
        this.fullscreenModal.setAttribute(
            'aria-label',
            getTimerText('timeDisplay.fullscreenDisplay', 'Fullscreen Display')
        );
        
        // Set initial slider value
        this.fullscreenFontSlider.value = this.fullscreenFontSizePercent;
        if (this.fullscreenTitleFontSlider) {
            this.fullscreenTitleFontSlider.value = this.fullscreenTitleFontSizePercent;
        }

        if (this.fullscreenModal.dataset.timerFullscreenBindingsInitialized === 'true') {
            return;
        }

        this.fullscreenModal.dataset.timerFullscreenBindingsInitialized = 'true';
        
        // Setup close button
        const closeBtn = document.getElementById('timer-fullscreen-close-btn');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => {
                window.__activeTimerFullscreenInstance?.exitFullscreen?.();
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
            const activeTimer = window.__activeTimerFullscreenInstance;
            if (!activeTimer) {
                return;
            }
            activeTimer.fullscreenFontSizePercent = parseFloat(e.target.value);
            if (activeTimer.isFullscreen) {
                activeTimer.updateFullscreenDisplay();
            }
        });
        
        // Setup title font size slider
        if (this.fullscreenTitleFontSlider) {
            this.fullscreenTitleFontSlider.addEventListener('input', (e) => {
                const activeTimer = window.__activeTimerFullscreenInstance;
                if (!activeTimer) {
                    return;
                }
                activeTimer.fullscreenTitleFontSizePercent = parseFloat(e.target.value);
                if (activeTimer.isFullscreen) {
                    activeTimer.updateFullscreenDisplay();
                }
            });
        }
        
        // ESC key to exit fullscreen
        document.addEventListener('keydown', (e) => {
            const activeTimer = window.__activeTimerFullscreenInstance;
            if (e.key === 'Escape' && activeTimer?.isFullscreen) {
                e.preventDefault();
                // Closing the fullscreen overlay consumes this Escape press so
                // lower layers (e.g. classroom mode) don't also react to it.
                e.stopImmediatePropagation();
                activeTimer.exitFullscreen();
            }
        });
    }

    createDisplayElement() {
        const display = document.createElement('div');
        display.className = 'timer-display-widget';
        display.dataset.timerId = this.id;
        
        const titleHTML = this.title ? `<div class="timer-display-title">${escapeTimerHtml(this.title)}</div>` : '';
        
        const modeText = this.mode === 'stopwatch' ? window.i18n.t('timer.stopwatch') : window.i18n.t('timer.countdown');
        const helpLabel = getTimerText('common.help', 'Help');
        const closeLabel = getTimerText('common.close', 'Close');
        const pauseLabel = getTimerText('timer.pause', 'Pause');
        const resetLabel = getTimerText('timer.reset', 'Reset');
        const minimalLabel = getTimerText('timer.minimal', 'Minimal');
        const minimalTitle = getTimerText('timer.minimalMode', 'Minimal mode (double-click to restore)');
        const adjustLabel = getTimerText('timer.adjust', 'Adjust');
        const fullscreenLabel = getTimerText('timeDisplay.fullscreenDisplay', 'Fullscreen Display');
        const fontSizeLabel = getTimerText('timer.fontSize', 'Font Size');

        display.innerHTML = `
            <div class="timer-display-header">
                <div class="timer-display-mode">${escapeTimerHtml(modeText)}</div>
                <div class="timer-display-header-actions">
                    <button class="timer-help-btn" type="button" data-help-key="help.features.timer" data-i18n-title="common.help" aria-label="${escapeTimerHtml(helpLabel)}" title="${escapeTimerHtml(helpLabel)}">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <circle cx="12" cy="12" r="10"></circle>
                            <path d="M9.09 9a3 3 0 1 1 5.82 1c0 2-3 2-3 4"></path>
                            <line x1="12" y1="17" x2="12" y2="17"></line>
                        </svg>
                    </button>
                    <button class="timer-close-btn" type="button" title="${escapeTimerHtml(closeLabel)}" aria-label="${escapeTimerHtml(closeLabel)}">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <line x1="18" y1="6" x2="6" y2="18"></line>
                            <line x1="6" y1="6" x2="18" y2="18"></line>
                        </svg>
                    </button>
                </div>
            </div>
            ${titleHTML}
            <div class="timer-display-time">00:00:00</div>
            <div class="timer-display-controls">
                <button class="timer-control-btn timer-play-pause-btn" title="${escapeTimerHtml(pauseLabel)}" aria-label="${escapeTimerHtml(pauseLabel)}">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <rect x="6" y="4" width="4" height="16"></rect>
                        <rect x="14" y="4" width="4" height="16"></rect>
                    </svg>
                    <span class="timer-play-pause-label">${escapeTimerHtml(pauseLabel)}</span>
                </button>
                <button class="timer-control-btn timer-reset-btn" title="${escapeTimerHtml(resetLabel)}" aria-label="${escapeTimerHtml(resetLabel)}">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"></path>
                        <path d="M21 3v5h-5"></path>
                        <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"></path>
                        <path d="M3 21v-5h5"></path>
                    </svg>
                    <span class="timer-reset-label">${escapeTimerHtml(resetLabel)}</span>
                </button>
            </div>
            <div class="timer-display-actions">
                <button class="timer-action-btn timer-minimal-btn" title="${escapeTimerHtml(minimalTitle)}" aria-label="${escapeTimerHtml(minimalTitle)}">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                        <line x1="9" y1="9" x2="15" y2="15"></line>
                        <line x1="15" y1="9" x2="9" y2="15"></line>
                    </svg>
                    <span class="timer-minimal-label">${escapeTimerHtml(minimalLabel)}</span>
                </button>
                <button class="timer-action-btn timer-adjust-btn" title="${escapeTimerHtml(adjustLabel)}" aria-label="${escapeTimerHtml(adjustLabel)}">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <circle cx="12" cy="12" r="3"></circle>
                        <path d="M12 1v6m0 6v6M5.6 5.6l4.2 4.2m4.2 4.2l4.2 4.2M1 12h6m6 0h6M5.6 18.4l4.2-4.2m4.2-4.2l4.2-4.2"></path>
                    </svg>
                    <span class="timer-adjust-label">${escapeTimerHtml(adjustLabel)}</span>
                </button>
                <button class="timer-action-btn timer-fullscreen-btn" title="${escapeTimerHtml(fullscreenLabel)}" aria-label="${escapeTimerHtml(fullscreenLabel)}">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"></path>
                    </svg>
                    <span class="timer-fullscreen-label">${escapeTimerHtml(fullscreenLabel)}</span>
                </button>
            </div>
            <div class="timer-font-size-control">
                <label><span class="timer-font-size-label">${escapeTimerHtml(fontSizeLabel)}</span></label>
                <input type="range" class="timer-font-size-slider" min="16" max="60" value="32" step="2" aria-label="${escapeTimerHtml(fontSizeLabel)}" title="${escapeTimerHtml(fontSizeLabel)}">
            </div>
        `;
        
        document.body.appendChild(display);
        this.displayElement = display;
        window.drawingBoard?.helpSystem?.bindDataHelpButtons?.();
        window.drawingBoard?.helpSystem?.refreshHelpButtonLabels?.();
        this.localeChangeHandler = () => {
            this.refreshLocalizedUI();
        };
        window.addEventListener('localeChanged', this.localeChangeHandler);

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

        this.refreshLocalizedUI();
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
        const restoreFromMinimal = () => {
            if (this.isMinimal) {
                this.lastMinimalRestoreTime = Date.now();
                this.toggleMinimal();
            }
        };
        timeDisplay.addEventListener('dblclick', () => {
            if (Date.now() - (this.lastMinimalRestoreTime || 0) < 500) return;
            restoreFromMinimal();
        });
        // The widget's touchstart handler calls preventDefault() (see
        // setupDragging), which suppresses the synthesized dblclick on touch
        // screens — detect a double-tap from pointerup timing so minimal mode
        // can still be exited by touch.
        timeDisplay.addEventListener('pointerup', (e) => {
            if (!this.isMinimal || e.pointerType === 'mouse') return;
            const now = Date.now();
            const previousTap = this.lastMinimalTapTime || 0;
            this.lastMinimalTapTime = now;
            if (now - previousTap < 400) {
                this.lastMinimalTapTime = 0;
                restoreFromMinimal();
            }
        });
    }
    
    setupDragging() {
        // Unified handler for mouse and touch start
        const handleStart = (e) => {
            if (typeof e.button === 'number' && e.button !== 0) return;
            // Don't start dragging if clicking on interactive elements
            const closest = typeof e.target?.closest === 'function'
                ? e.target.closest.bind(e.target)
                : () => null;
            if (closest('button') || closest('input')) return;
            
            e.stopPropagation(); // Prevent drawing on canvas

            this.isDragging = true;
            this.displayElement.classList.add('dragging');
            
            const rect = this.displayElement.getBoundingClientRect();
            // e.touches may exist but be length 0 during an aborted multi-touch
            // gesture — fall back to the pointer/mouse coordinates instead of
            // dereferencing an undefined touch and computing NaN offsets.
            const primaryTouch = e.touches?.[0];
            const clientX = primaryTouch ? primaryTouch.clientX : e.clientX;
            const clientY = primaryTouch ? primaryTouch.clientY : e.clientY;
            
            this.dragOffset.x = clientX - rect.left;
            this.dragOffset.y = clientY - rect.top;
            
            e.preventDefault();
        };
        
        // Allow dragging from the entire widget
        // Add both mouse and touch event listeners for better touch device support
        this.displayElement.addEventListener('pointerdown', handleStart);
        this.displayElement.addEventListener('touchstart', handleStart, { passive: false });
        
        // Unified handler for mouse and touch move
        const handleMove = (e) => {
            if (!this.isDragging) return;
            if ((e.type === 'mousemove' || e.type === 'pointermove') && typeof e.buttons === 'number' && e.buttons === 0) {
                handleEnd();
                return;
            }
            if (e.type === 'touchmove') e.preventDefault();

            const primaryTouch = e.touches?.[0];
            const clientX = primaryTouch ? primaryTouch.clientX : e.clientX;
            const clientY = primaryTouch ? primaryTouch.clientY : e.clientY;
            
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

        // Pointer events cover mouse + pen + touch; binding mouse* alongside
        // pointer* makes desktop mouse moves run handleMove twice per tick.
        // Touch listeners stay for iOS edge cases where pointercancel can be
        // dropped.
        document.addEventListener('pointermove', this.mouseMoveHandler);
        document.addEventListener('pointerup', this.mouseUpHandler);
        document.addEventListener('touchmove', this.mouseMoveHandler, { passive: false });
        document.addEventListener('touchend', this.mouseUpHandler);
        document.addEventListener('touchcancel', this.mouseUpHandler);
        document.addEventListener('pointercancel', this.mouseUpHandler);
    }
    
    startTimerLoop() {
        this.isRunning = true;
        this.isPaused = false;
        this.startTime = Date.now();

        // For stopwatch mode, if there's an initial duration, it means we start from that time
        // For countdown mode, we already have remainingTime set

        // Defensive: ensure any previous interval is cleared so reentry cannot leak it.
        if (this.intervalId) {
            clearInterval(this.intervalId);
            this.intervalId = null;
        }
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
        const normalizedMilliseconds = Math.max(0, milliseconds);
        const totalSeconds = this.mode === 'countdown'
            ? Math.ceil(normalizedMilliseconds / 1000)
            : Math.floor(normalizedMilliseconds / 1000);
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
            if (this.mode === 'countdown' && this.remainingTime <= 0) {
                // A finished countdown must be reset before it can continue,
                // otherwise the restarted interval would refire timerFinished
                // (and replay the bell) immediately.
                return;
            }
            // Mark the timer as actively running again so state consumers like
            // refreshAfterVisibilityRestore() and updateTimerDisplayClass()
            // treat a reset-then-continued timer the same as a fresh one.
            this.isRunning = true;
            this.isPaused = false;
            this.startTime = Date.now();
            if (this.intervalId) {
                clearInterval(this.intervalId);
                this.intervalId = null;
            }
            this.intervalId = setInterval(() => {
                this.updateTimer();
            }, 100);
        } else {
            // Pause: settle the partial tick since the last interval fire first
            // so up to 100ms isn't silently dropped on every pause.
            if (this.isRunning) {
                this.updateTimer();
                if (!this.isRunning) {
                    // The settle crossed zero and timerFinished() already
                    // handled the state/button updates.
                    return;
                }
            }
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
            const label = this.isPaused
                ? getTimerText('timer.continue', 'Continue')
                : getTimerText('timer.pause', 'Pause');
            btn.title = label;
            btn.setAttribute('aria-label', label);
            if (this.isPaused) {
                btn.innerHTML = `
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <polygon points="5 3 19 12 5 21 5 3"></polygon>
                    </svg>
                    <span class="timer-play-pause-label">${escapeTimerHtml(label)}</span>
                `;
            } else {
                btn.innerHTML = `
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <rect x="6" y="4" width="4" height="16"></rect>
                        <rect x="14" y="4" width="4" height="16"></rect>
                    </svg>
                    <span class="timer-play-pause-label">${escapeTimerHtml(label)}</span>
                `;
            }
        }
    }

    refreshLocalizedUI() {
        if (!this.displayElement) {
            return;
        }

        const modeDisplay = this.displayElement.querySelector('.timer-display-mode');
        if (modeDisplay) {
            modeDisplay.textContent = this.mode === 'stopwatch'
                ? getTimerText('timer.stopwatch', 'Stopwatch')
                : getTimerText('timer.countdown', 'Countdown');
        }

        const helpBtn = this.displayElement.querySelector('.timer-help-btn');
        const helpLabel = getTimerText('common.help', 'Help');
        if (helpBtn) {
            helpBtn.title = helpLabel;
            helpBtn.setAttribute('aria-label', helpLabel);
        }

        const closeBtn = this.displayElement.querySelector('.timer-close-btn');
        const closeLabel = getTimerText('common.close', 'Close');
        if (closeBtn) {
            closeBtn.title = closeLabel;
            closeBtn.setAttribute('aria-label', closeLabel);
        }

        const resetBtn = this.displayElement.querySelector('.timer-reset-btn');
        const resetLabel = getTimerText('timer.reset', 'Reset');
        if (resetBtn) {
            resetBtn.title = resetLabel;
            resetBtn.setAttribute('aria-label', resetLabel);
            const resetLabelEl = resetBtn.querySelector('.timer-reset-label');
            if (resetLabelEl) {
                resetLabelEl.textContent = resetLabel;
            }
        }

        const minimalBtn = this.displayElement.querySelector('.timer-minimal-btn');
        const minimalText = getTimerText('timer.minimal', 'Minimal');
        const minimalTitle = getTimerText('timer.minimalMode', 'Minimal mode (double-click to restore)');
        if (minimalBtn) {
            minimalBtn.title = minimalTitle;
            minimalBtn.setAttribute('aria-label', minimalTitle);
            const minimalLabelEl = minimalBtn.querySelector('.timer-minimal-label');
            if (minimalLabelEl) {
                minimalLabelEl.textContent = minimalText;
            }
        }

        const adjustBtn = this.displayElement.querySelector('.timer-adjust-btn');
        const adjustLabel = getTimerText('timer.adjust', 'Adjust');
        if (adjustBtn) {
            adjustBtn.title = adjustLabel;
            adjustBtn.setAttribute('aria-label', adjustLabel);
            const adjustLabelEl = adjustBtn.querySelector('.timer-adjust-label');
            if (adjustLabelEl) {
                adjustLabelEl.textContent = adjustLabel;
            }
        }

        const fullscreenBtn = this.displayElement.querySelector('.timer-fullscreen-btn');
        const fullscreenLabel = getTimerText('timeDisplay.fullscreenDisplay', 'Fullscreen Display');
        if (fullscreenBtn) {
            fullscreenBtn.title = fullscreenLabel;
            fullscreenBtn.setAttribute('aria-label', fullscreenLabel);
            const fullscreenLabelEl = fullscreenBtn.querySelector('.timer-fullscreen-label');
            if (fullscreenLabelEl) {
                fullscreenLabelEl.textContent = fullscreenLabel;
            }
        }

        const fontSizeLabel = this.displayElement.querySelector('.timer-font-size-label');
        if (fontSizeLabel) {
            fontSizeLabel.textContent = getTimerText('timer.fontSize', 'Font Size');
        }

        const fontSizeSlider = this.displayElement.querySelector('.timer-font-size-slider');
        if (fontSizeSlider) {
            const fontSizeControlLabel = getTimerText('timer.fontSize', 'Font Size');
            fontSizeSlider.setAttribute('aria-label', fontSizeControlLabel);
            fontSizeSlider.title = fontSizeControlLabel;
        }

        this.updatePlayPauseButton();

        if (this.isFullscreen) {
            this.updateFullscreenDisplay();
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

    stopFinishSound() {
        if (this.currentAudio) {
            this.currentAudio.pause();
            try {
                this.currentAudio.currentTime = 0;
            } catch (error) {
                console.warn('Failed to rewind timer audio:', error);
            }
            this.currentAudio = null;
        }
        if (this.loopTimeoutId !== null) {
            clearTimeout(this.loopTimeoutId);
            this.loopTimeoutId = null;
        }
        this.currentLoopIteration = 0;
    }
    
    resetTimer() {
        this.stopFinishSound();
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
        // Require an explicit reset before "continue" does anything again;
        // togglePlayPause() refuses to resume a countdown at zero.
        this.isPaused = true;
        this.hasFinishedUnnotified = true;
        this.updatePlayPauseButton();

        const timeDisplay = this.displayElement.querySelector('.timer-display-time');
        if (timeDisplay) {
            timeDisplay.classList.add('finished');
        }

        // Play sound if enabled
        if (this.playSound) {
            this.playFinishSound();
        }
    }

    // Called by TimerManager when the tab becomes visible again. setInterval is
    // throttled to ~1Hz in backgrounded tabs, so until this runs the visible UI
    // may be several seconds stale; for countdown timers that crossed zero we
    // surface the finished state that the user would otherwise miss.
    refreshAfterVisibilityRestore() {
        if (!this.isRunning || this.isPaused) {
            return;
        }
        // Advance the timer state once synchronously so the next paint is accurate.
        try {
            this.updateTimer();
        } catch (error) {
            console.warn('Failed to refresh timer after visibility restore:', error);
        }
        if (this.isFullscreen && typeof this.updateFullscreenDisplay === 'function') {
            try {
                this.updateFullscreenDisplay();
            } catch (error) {
                console.warn('Failed to refresh fullscreen timer after visibility restore:', error);
            }
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
        let audioFailureHandled = false;

        const handleAudioFailure = (err) => {
            if (audioFailureHandled) {
                return;
            }
            audioFailureHandled = true;
            console.warn('Failed to play timer audio:', err);
            this.currentAudio = null;
            this.notifyAudioFallback();
        };
        
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
            handleAudioFailure(err);
        });

        audio.play().catch(err => {
            // autoplay / codec / network failures tend to fail silently which is
            // catastrophic in a classroom — surface a visible fallback so the
            // teacher still knows the timer hit zero.
            handleAudioFailure(err);
        });
    }

    notifyAudioFallback() {
        const timeDisplay = this.displayElement?.querySelector('.timer-display-time');
        if (timeDisplay) {
            timeDisplay.classList.add('finished');
            // CSS already animates .finished; this simply guarantees it's visible
            // even if the caller bypassed the normal finished flow.
        }
        const fallbackMessage = getTimerText('timer.audioFallback', 'Timer finished (sound unavailable)');
        const toast = (typeof window !== 'undefined')
            ? (window.drawingBoard?.settingsManager?.toastManager || window.toastManager)
            : null;
        try {
            toast?.show?.(fallbackMessage, 'warning');
        } catch (error) {
            console.warn('Failed to display timer audio fallback toast:', error);
        }
    }
    
    adjustTimer() {
        this.stopFinishSound();
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

        this.fullscreenPreviouslyFocusedElement = getTimerFocusableElement();
        if (window.__activeTimerFullscreenInstance && window.__activeTimerFullscreenInstance !== this) {
            window.__activeTimerFullscreenInstance.exitFullscreen();
        }

        window.__activeTimerFullscreenInstance = this;
        if (this.fullscreenFontSlider) {
            this.fullscreenFontSlider.value = this.fullscreenFontSizePercent;
        }
        if (this.fullscreenTitleFontSlider) {
            this.fullscreenTitleFontSlider.value = this.fullscreenTitleFontSizePercent;
        }
        if (this.fullscreenSettingsPanel) {
            this.fullscreenSettingsPanel.style.display = 'none';
        }
        document.getElementById('timer-fullscreen-settings-btn')?.classList.remove('active');
        
        this.isFullscreen = true;
        this.fullscreenModal.setAttribute(
            'aria-label',
            this.title
                ? `${getTimerText('timeDisplay.fullscreenDisplay', 'Fullscreen Display')} · ${this.title}`
                : getTimerText('timeDisplay.fullscreenDisplay', 'Fullscreen Display')
        );
        this.fullscreenModal.classList.add('show');
        this.startFullscreenUpdating();
        focusTimerElement(document.getElementById('timer-fullscreen-close-btn') || this.fullscreenModal);
    }
    
    exitFullscreen() {
        if (!this.fullscreenModal) {
            return;
        }
        const restoreFocusTarget = this.fullscreenPreviouslyFocusedElement;
        this.fullscreenPreviouslyFocusedElement = null;
        
        this.isFullscreen = false;
        if (window.__activeTimerFullscreenInstance === this) {
            window.__activeTimerFullscreenInstance = null;
        }
        this.fullscreenModal.classList.remove('show');
        if (this.fullscreenSettingsPanel) {
            this.fullscreenSettingsPanel.style.display = 'none';
        }
        document.getElementById('timer-fullscreen-settings-btn')?.classList.remove('active');
        this.stopFullscreenUpdating();
        focusTimerElement(restoreFocusTarget);
    }
    
    startFullscreenUpdating() {
        // Update immediately
        this.updateFullscreenDisplay();

        if (this.fullscreenUpdateInterval) {
            return;
        }
        
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
        const normalizedMilliseconds = Math.max(0, milliseconds);
        const totalSeconds = this.mode === 'countdown'
            ? Math.ceil(normalizedMilliseconds / 1000)
            : Math.floor(normalizedMilliseconds / 1000);
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

        const titleHTML = this.title
            ? `<div class="timer-fullscreen-title" style="font-size: ${titleFontSize}px; color: ${fsTextColor};">${escapeTimerHtml(this.title)}</div>`
            : '';
        
        this.fullscreenContent.innerHTML = `
            <div class="timer-fullscreen-mode" style="font-size: ${modeFontSize}px; color: ${fsTextColor};">${escapeTimerHtml(modeText)}</div>
            ${titleHTML}
            <div class="timer-fullscreen-time" style="font-size: ${timeFontSize}px; color: ${fsTextColor};">${timeString}</div>
        `;
        
        // Apply background color to fullscreen modal
        if (this.fullscreenModal) {
            this.fullscreenModal.style.backgroundColor = fsBgColor;
        }
    }
    
    updateFontSize(size) {
        this.fontSize = parseInt(size, 10);
        const timeDisplay = this.displayElement.querySelector('.timer-display-time');
        if (timeDisplay) {
            timeDisplay.style.fontSize = `${this.fontSize}px`;
        }
    }
    
    closeTimer() {
        if (this.localeChangeHandler) {
            window.removeEventListener('localeChanged', this.localeChangeHandler);
            this.localeChangeHandler = null;
        }

        // Exit fullscreen if active
        if (this.isFullscreen) {
            this.exitFullscreen();
        }
        
        // Stop the timer
        if (this.intervalId) {
            clearInterval(this.intervalId);
            this.intervalId = null;
        }
        
        this.stopFinishSound();

        // Remove event listeners
        if (this.mouseMoveHandler) {
            document.removeEventListener('pointermove', this.mouseMoveHandler);
            document.removeEventListener('touchmove', this.mouseMoveHandler);
            this.mouseMoveHandler = null;
        }
        if (this.mouseUpHandler) {
            document.removeEventListener('pointerup', this.mouseUpHandler);
            document.removeEventListener('touchend', this.mouseUpHandler);
            document.removeEventListener('touchcancel', this.mouseUpHandler);
            document.removeEventListener('pointercancel', this.mouseUpHandler);
            this.mouseUpHandler = null;
        }

        if (this.manager.adjustingTimer === this) {
            this.manager.adjustingTimer = null;
        }
        
        // Remove from DOM
        if (this.displayElement) {
            this.displayElement.remove();
        }
        
        // Remove from manager
        this.manager.removeTimer(this.id);
    }
    
    updateSettings(duration, playSound, selectedSound, customSoundUrl, loopSound, loopCount, loopInterval, playbackSpeed, title = '', textColor = null, bgColor = null, fullscreenTextColor = null, fullscreenBgColor = null, mode = null) {
        if ((mode === 'stopwatch' || mode === 'countdown') && mode !== this.mode) {
            // The adjust dialog allows switching stopwatch/countdown; apply the
            // choice so elapsed/remaining semantics and labels follow the mode.
            this.mode = mode;
        }
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
        this.loopCount = normalizeTimerNumberInputValue(loopCount, {
            min: 1,
            max: 100,
            fallbackValue: 3
        });
        this.loopInterval = normalizeTimerNumberInputValue(loopInterval, {
            min: 0,
            max: 60,
            fallbackValue: 0
        });
        this.playbackSpeed = playbackSpeed;
        this.title = title;
        
        if (textColor) this.textColor = sanitizeTimerColor(textColor, this.textColor);
        if (bgColor) this.bgColor = sanitizeTimerColor(bgColor, this.bgColor);
        if (fullscreenTextColor) this.fullscreenTextColor = sanitizeTimerColor(fullscreenTextColor, this.fullscreenTextColor);
        if (fullscreenBgColor) this.fullscreenBgColor = sanitizeTimerColor(fullscreenBgColor, this.fullscreenBgColor);
        
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
        // Refresh the widget's mode label (and other localized text) in case
        // the mode changed above.
        this.refreshLocalizedUI();
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

        // Preset sounds are loaded lazily after explicit user intent.
        this.preloadedAudio = {};

        // Load custom sounds from localStorage
        this.customSounds = this.loadCustomSounds();

        // Current timer being adjusted (for adjust functionality)
        this.adjustingTimer = null;
        this.timerSettingsPreviouslyFocusedElement = null;
        this.timerAlertPreviouslyFocusedElement = null;

        // Audio preview state
        this.previewAudio = null;
        this.currentPreviewButton = null;

        this.setupEventListeners();
        this.renderCustomSounds();

        // Backgrounded tabs throttle setInterval down to ~1Hz, so when the user
        // switches back we force every running timer to refresh immediately so
        // they don't see a multi-second "jump". We also flush the finished state
        // for timers that crossed zero while hidden so the classroom gets the
        // visual cue they would have missed.
        this.handleVisibilityChange = () => {
            if (document.visibilityState !== 'visible') return;
            this.timers.forEach((timer) => {
                if (typeof timer.refreshAfterVisibilityRestore === 'function') {
                    timer.refreshAfterVisibilityRestore();
                }
            });
        };
        document.addEventListener('visibilitychange', this.handleVisibilityChange);
    }
    
    updateMainPreviewButtonState() {
        const previewBtn = document.getElementById('timer-sound-preview-btn');
        if (!previewBtn) return;

        document.querySelectorAll('.sound-preset-btn').forEach((button) => {
            button.setAttribute('aria-pressed', button.classList.contains('active') ? 'true' : 'false');
        });

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
        const isIntervalSet = intervalInput && parseInt(intervalInput.value, 10) > 0;

        // Active if any setting is non-default
        if (isLoop || isSpeedChanged || (isLoop && isIntervalSet)) {
            moreSettingsBtn.classList.add('active-settings');
        } else {
            moreSettingsBtn.classList.remove('active-settings');
        }
    }

    updateTimerColorAccessibility() {
        document.querySelectorAll(
            '.color-btn[data-timer-text-color], .color-btn[data-timer-bg-color], .color-btn[data-timer-fs-text-color], .color-btn[data-timer-fs-bg-color]'
        ).forEach((btn) => {
            btn.setAttribute('aria-pressed', btn.classList.contains('active') ? 'true' : 'false');
        });

        document.querySelectorAll('label.timer-color-picker-icon[for]').forEach((trigger) => {
            trigger.setAttribute('aria-pressed', trigger.classList.contains('active-custom') ? 'true' : 'false');
        });
    }

    syncTimerColorSelections({
        textColor = '#333333',
        bgColor = '#FFFFFF',
        fullscreenTextColor = '#FFFFFF',
        fullscreenBgColor = '#000000'
    } = {}) {
        const syncGroup = (selector, datasetKey, value, pickerId) => {
            const normalizedValue = String(value || '').toLowerCase();
            let foundPreset = false;

            document.querySelectorAll(selector).forEach((btn) => {
                const isMatch = String(btn.dataset[datasetKey] || '').toLowerCase() === normalizedValue;
                btn.classList.toggle('active', isMatch);
                if (isMatch) {
                    foundPreset = true;
                }
            });

            const picker = document.getElementById(pickerId);
            const trigger = picker?.closest('.color-picker-icon-btn');
            if (trigger) {
                trigger.classList.toggle('active-custom', !foundPreset);
            }
            if (picker && /^#[0-9a-f]{6}$/i.test(String(value || ''))) {
                picker.value = value;
            }
        };

        syncGroup('.color-btn[data-timer-text-color]', 'timerTextColor', textColor, 'custom-timer-text-color-picker');
        syncGroup('.color-btn[data-timer-bg-color]', 'timerBgColor', bgColor, 'custom-timer-bg-color-picker');
        syncGroup('.color-btn[data-timer-fs-text-color]', 'timerFsTextColor', fullscreenTextColor, 'custom-timer-fs-text-color-picker');
        syncGroup('.color-btn[data-timer-fs-bg-color]', 'timerFsBgColor', fullscreenBgColor, 'custom-timer-fs-bg-color-picker');
        this.updateTimerColorAccessibility();
    }

    preloadSounds(soundKey = null) {
        const soundKeys = soundKey ? [soundKey] : Object.keys(this.sounds);

        soundKeys.forEach(key => {
            if (!this.sounds[key] || this.preloadedAudio[key]) {
                return;
            }

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
                const parsed = JSON.parse(saved);
                if (!Array.isArray(parsed)) {
                    console.warn('Ignoring malformed custom sounds payload: expected an array.');
                    return [];
                }
                return parsed.filter(sound => (
                    sound
                    && typeof sound === 'object'
                    && typeof sound.id === 'string'
                    && typeof sound.name === 'string'
                    && typeof sound.url === 'string'
                    && sound.id
                    && sound.name
                    && sound.url
                ));
            }
        } catch (e) {
            console.warn('Failed to load custom sounds:', e);
        }
        return [];
    }
    
    saveCustomSounds(customSounds = this.customSounds) {
        // Save custom sounds to localStorage
        try {
            localStorage.setItem('timerCustomSounds', JSON.stringify(customSounds));
            return true;
        } catch (e) {
            console.warn('Failed to save custom sounds:', e);
            const message = isQuotaExceededError(e)
                ? getTimerText(
                    'timer.customSoundQuotaExceeded',
                    'Storage quota exceeded. Please delete some custom sounds.'
                )
                : getTimerText(
                    'errors.storageWriteFailed',
                    'Failed to save custom sounds. Please check browser storage permissions and try again.'
                );
            const toast = (typeof window !== 'undefined')
                ? (window.drawingBoard?.settingsManager?.toastManager || window.toastManager)
                : null;
            try {
                toast?.show?.(message, 'error');
            } catch (toastError) {
                console.warn('Failed to display custom sound storage-error toast:', toastError);
            }
            return false;
        }
    }
    
    addCustomSound(file) {
        const validation = window.AboardFileValidation;
        const toast = window.drawingBoard?.settingsManager?.toastManager || window.toastManager;
        try {
            validation?.validateAudioFile?.(file);
        } catch (error) {
            validation?.showValidationError?.(error, { toast, dialog: window.appDialog });
            return;
        }

        const reader = new FileReader();
        reader.onload = (e) => {
            const dataUrl = e.target.result;
            const customSound = {
                id: 'custom-' + Date.now(),
                name: file.name,
                url: dataUrl
            };

            const nextCustomSounds = [...this.customSounds, customSound];
            if (!this.saveCustomSounds(nextCustomSounds)) {
                return;
            }
            this.customSounds = nextCustomSounds;
            this.renderCustomSounds();
        };
        reader.onerror = () => {
            console.warn('Failed to read custom sound file:', reader.error);
            const msg = getTimerText('errors.fileReadFailed', 'Failed to read the selected file.');
            try {
                toast?.show?.(msg, 'error');
            } catch (toastError) {
                console.warn('Failed to display custom sound read-error toast:', toastError);
            }
        };
        reader.readAsDataURL(file);
    }
    
    removeCustomSound(id) {
        const nextCustomSounds = this.customSounds.filter(s => s.id !== id);
        if (!this.saveCustomSounds(nextCustomSounds)) {
            return false;
        }
        this.customSounds = nextCustomSounds;
        this.renderCustomSounds();
        return true;
    }
    
    renderCustomSounds() {
        const container = document.getElementById('custom-sounds-list');
        if (!container) return;
        
        container.innerHTML = '';
        
        this.customSounds.forEach(sound => {
            const row = document.createElement('div');
            row.className = 'sound-preset-custom-row';

            const selectBtn = document.createElement('button');
            selectBtn.type = 'button';
            selectBtn.className = 'sound-preset-btn sound-preset-custom-select';
            selectBtn.dataset.sound = sound.id;
            selectBtn.dataset.url = sound.url;
            selectBtn.setAttribute('aria-pressed', 'false');
            selectBtn.setAttribute('aria-label', sound.name);
            selectBtn.title = sound.name;

            // Truncate filename if too long
            const displayName = sound.name.length > 25 ? sound.name.substring(0, 22) + '...' : sound.name;

            const label = document.createElement('span');
            label.className = 'sound-preset-label';
            label.textContent = displayName;
            selectBtn.appendChild(label);

            const actions = document.createElement('div');
            actions.className = 'sound-preset-actions';

            const previewBtn = document.createElement('button');
            previewBtn.type = 'button';
            previewBtn.className = 'sound-preview-btn';
            previewBtn.dataset.soundName = sound.name;
            setTimerPreviewButtonState(previewBtn, false);

            const deleteBtn = document.createElement('button');
            deleteBtn.type = 'button';
            deleteBtn.className = 'sound-delete-btn';
            deleteBtn.setAttribute('aria-label', getTimerSoundActionLabel('common.delete', 'Delete', sound.name));
            deleteBtn.title = getTimerSoundActionLabel('common.delete', 'Delete', sound.name);
            deleteBtn.innerHTML = timerDeleteIconSvg;

            actions.appendChild(previewBtn);
            actions.appendChild(deleteBtn);
            row.appendChild(selectBtn);
            row.appendChild(actions);

            selectBtn.addEventListener('click', () => {
                document.querySelectorAll('.sound-preset-btn').forEach(b => b.classList.remove('active'));
                selectBtn.classList.add('active');
                this.updateMainPreviewButtonState();
            });
            
            previewBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.previewSoundByUrl(sound.url, e.currentTarget);
            });
            
            deleteBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.removeCustomSound(sound.id);
            });
            
            container.appendChild(row);
        });

        this.updateMainPreviewButtonState();
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
                    this.preloadSounds();
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
                const closest = typeof e.target?.closest === 'function'
                    ? e.target.closest.bind(e.target)
                    : () => null;
                const hasClass = (className) => Boolean(e.target?.classList?.contains?.(className));
                if (hasClass('sound-preview-btn') || 
                    closest('.sound-preview-btn')) {
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
                const previewButton = e.currentTarget;
                const soundUrl = previewButton.dataset?.soundUrl;
                const soundKey = previewButton.dataset?.soundKey;

                if (soundUrl) {
                    this.previewSoundByUrl(soundUrl, previewButton);
                    return;
                }

                if (soundKey && this.sounds[soundKey]) {
                    this.previewSound(soundKey, previewButton);
                    return;
                }

                const presetBtn = previewButton.closest('.sound-preset-btn');
                if (!presetBtn) {
                    return;
                }

                if (presetBtn.dataset.url) {
                    this.previewSoundByUrl(presetBtn.dataset.url, previewButton);
                } else if (presetBtn.dataset.sound && this.sounds[presetBtn.dataset.sound]) {
                    this.previewSound(presetBtn.dataset.sound, previewButton);
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
                const customTrigger = document.querySelector('label[for="custom-timer-text-color-picker"]');
                if (customTrigger) {
                    customTrigger.classList.remove('active-custom');
                }
                this.updateTimerColorAccessibility();
            });
        });
        
        document.querySelectorAll('.color-btn[data-timer-bg-color]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                document.querySelectorAll('.color-btn[data-timer-bg-color]').forEach(b => b.classList.remove('active'));
                e.currentTarget.classList.add('active');
                const customTrigger = document.querySelector('label[for="custom-timer-bg-color-picker"]');
                if (customTrigger) {
                    customTrigger.classList.remove('active-custom');
                }
                this.updateTimerColorAccessibility();
            });
        });
        
        // Timer color picker buttons (Fullscreen)
        document.querySelectorAll('.color-btn[data-timer-fs-text-color]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                document.querySelectorAll('.color-btn[data-timer-fs-text-color]').forEach(b => b.classList.remove('active'));
                e.currentTarget.classList.add('active');
                const customTrigger = document.querySelector('label[for="custom-timer-fs-text-color-picker"]');
                if (customTrigger) {
                    customTrigger.classList.remove('active-custom');
                }
                this.updateTimerColorAccessibility();
            });
        });

        document.querySelectorAll('.color-btn[data-timer-fs-bg-color]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                document.querySelectorAll('.color-btn[data-timer-fs-bg-color]').forEach(b => b.classList.remove('active'));
                e.currentTarget.classList.add('active');
                const customTrigger = document.querySelector('label[for="custom-timer-fs-bg-color-picker"]');
                if (customTrigger) {
                    customTrigger.classList.remove('active-custom');
                }
                this.updateTimerColorAccessibility();
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
                this.updateTimerColorAccessibility();
            });
        }

        const customFsBgColorPicker = document.getElementById('custom-timer-fs-bg-color-picker');
        if (customFsBgColorPicker) {
            customFsBgColorPicker.addEventListener('input', (e) => {
                document.querySelectorAll('.color-btn[data-timer-fs-bg-color]').forEach(b => b.classList.remove('active'));
                const parentBtn = e.target.closest('.color-picker-icon-btn');
                if (parentBtn) parentBtn.classList.add('active-custom');
                this.updateTimerColorAccessibility();
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
                this.updateTimerColorAccessibility();
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
                this.updateTimerColorAccessibility();
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
        const timerSettingsModal = this.getTimerSettingsModal();
        if (timerSettingsModal) {
            timerSettingsModal.setAttribute('role', 'dialog');
            timerSettingsModal.setAttribute('aria-modal', 'true');
            timerSettingsModal.setAttribute('aria-labelledby', 'timer-settings-title');
            timerSettingsModal.tabIndex = -1;
            if (timerSettingsModal.dataset.keyboardBindingsInitialized !== 'true') {
                timerSettingsModal.dataset.keyboardBindingsInitialized = 'true';
                timerSettingsModal.addEventListener('click', (event) => {
                    if (event.target === timerSettingsModal) {
                        this.hideSettingsModal();
                    }
                });
                timerSettingsModal.addEventListener('keydown', (event) => {
                    if (event.key === 'Escape') {
                        event.preventDefault();
                        this.hideSettingsModal();
                    }
                });
            }
        }
        const timerSettingsCloseBtn = document.getElementById('timer-settings-close-btn');
        if (timerSettingsCloseBtn) {
            timerSettingsCloseBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.hideSettingsModal();
            });
        }
        
        // Timer alert modal OK button
        const timerAlertModal = document.getElementById('timer-alert-modal');
        if (timerAlertModal) {
            timerAlertModal.setAttribute('role', 'dialog');
            timerAlertModal.setAttribute('aria-modal', 'true');
            timerAlertModal.setAttribute('aria-labelledby', 'timer-alert-title');
            timerAlertModal.setAttribute('aria-describedby', 'timer-alert-message');
            timerAlertModal.tabIndex = -1;
            if (timerAlertModal.dataset.keyboardBindingsInitialized !== 'true') {
                timerAlertModal.dataset.keyboardBindingsInitialized = 'true';
                timerAlertModal.addEventListener('click', (event) => {
                    if (event.target === timerAlertModal) {
                        this.hideAlertModal();
                    }
                });
                timerAlertModal.addEventListener('keydown', (event) => {
                    if (event.key === 'Escape') {
                        event.preventDefault();
                        this.hideAlertModal();
                    }
                });
            }
        }
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
            this.timerAlertPreviouslyFocusedElement = getTimerFocusableElement();
            messageEl.textContent = message;
            modal.classList.add('show');
            focusTimerElement(document.getElementById('timer-alert-ok-btn') || modal);
        }
    }
    
    hideAlertModal() {
        const modal = document.getElementById('timer-alert-modal');
        const restoreFocusTarget = this.timerAlertPreviouslyFocusedElement;
        this.timerAlertPreviouslyFocusedElement = null;
        if (modal) {
            modal.classList.remove('show');
        }
        focusTimerElement(restoreFocusTarget);
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

    getTimerSettingsModal() {
        const modal = document.getElementById('timer-settings-modal');
        if (!modal) {
            console.warn('Timer settings modal is unavailable');
            return null;
        }
        return modal;
    }

    getTimerSettingsElements(ids = []) {
        const elements = {};
        const missing = [];

        ids.forEach((id) => {
            const element = document.getElementById(id);
            if (element) {
                elements[id] = element;
            } else {
                missing.push(id);
            }
        });

        if (missing.length > 0) {
            console.warn(`Timer settings controls are unavailable: ${missing.join(', ')}`);
        }

        return elements;
    }

    setActiveTimerMode(mode) {
        const modeButton = document.querySelector(`.timer-mode-btn[data-mode="${mode}"]`);
        if (!modeButton) {
            console.warn(`Timer mode button is unavailable: ${mode}`);
            return false;
        }

        document.querySelectorAll('.timer-mode-btn').forEach(b => b.classList.remove('active'));
        modeButton.classList.add('active');
        return true;
    }
    
    showSettingsModal() {
        this.adjustingTimer = null; // Not adjusting, creating new timer
        
        const modal = this.getTimerSettingsModal();
        if (modal) {
            const {
                'timer-hours': hoursInput,
                'timer-minutes': minutesInput,
                'timer-seconds': secondsInput,
                'timer-title-input': titleInput,
                'timer-sound-checkbox': soundCheckbox,
                'timer-loop-count': loopCountInput,
                'timer-playback-speed': playbackSpeedInput,
                'timer-playback-speed-value': playbackSpeedValue,
                'timer-loop-interval': loopIntervalInput
            } = this.getTimerSettingsElements([
                'timer-hours',
                'timer-minutes',
                'timer-seconds',
                'timer-title-input',
                'timer-sound-checkbox',
                'timer-loop-count',
                'timer-playback-speed',
                'timer-playback-speed-value',
                'timer-loop-interval'
            ]);

            this.timerSettingsPreviouslyFocusedElement = getTimerFocusableElement();
            window.drawingBoard?.syncResizableModalState?.('timer-settings-modal');
            modal.classList.add('show');
            
            // Reset to defaults
            const mode = 'stopwatch';
            this.setActiveTimerMode(mode);
            
            this.updateSoundGroupVisibility(mode);
            this.updateTimerLabel(mode);
            
            // Clear time inputs
            if (hoursInput) hoursInput.value = '0';
            if (minutesInput) minutesInput.value = '0';
            if (secondsInput) secondsInput.value = '0';
            if (titleInput) titleInput.value = '';
            
            // Reset sound settings
            if (soundCheckbox) {
                soundCheckbox.checked = false;
            }
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
            if (loopCountInput) {
                loopCountInput.value = '3';
            }

            // Reset new settings
            if (playbackSpeedInput) {
                playbackSpeedInput.value = '1.0';
            }
            if (playbackSpeedValue) {
                playbackSpeedValue.textContent = '1.0x';
            }
            if (loopIntervalInput) {
                loopIntervalInput.value = '1';
            }

            const colorCheckbox = document.getElementById('timer-color-checkbox');
            const colorSettings = document.getElementById('timer-color-settings');
            if (colorCheckbox) {
                colorCheckbox.checked = false;
            }
            if (colorSettings) {
                colorSettings.style.display = 'none';
            }

            this.syncTimerColorSelections();

            // Reset More Settings UI
            const moreSettingsBtn = document.getElementById('timer-more-settings-btn');
            const moreSettingsContent = document.getElementById('timer-more-settings-content');
            if (moreSettingsBtn) moreSettingsBtn.classList.remove('expanded');
            if (moreSettingsContent) moreSettingsContent.style.display = 'none';

            this.updateMainPreviewButtonState();
            this.updateMoreSettingsState();
            focusTimerElement(hoursInput || titleInput || document.getElementById('timer-settings-close-btn') || modal);
        }

        return !!modal;
    }
    
    showSettingsModalForTimer(timer) {
        const modal = this.getTimerSettingsModal();
        if (modal) {
            this.adjustingTimer = timer;

            const {
                'timer-hours': hoursInput,
                'timer-minutes': minutesInput,
                'timer-seconds': secondsInput,
                'timer-title-input': titleInput,
                'timer-sound-checkbox': soundCheckbox,
                'timer-loop-count': loopCountInput,
                'timer-playback-speed': speedSlider,
                'timer-playback-speed-value': speedValue,
                'timer-loop-interval': intervalInput
            } = this.getTimerSettingsElements([
                'timer-hours',
                'timer-minutes',
                'timer-seconds',
                'timer-title-input',
                'timer-sound-checkbox',
                'timer-loop-count',
                'timer-playback-speed',
                'timer-playback-speed-value',
                'timer-loop-interval'
            ]);

            this.timerSettingsPreviouslyFocusedElement = getTimerFocusableElement();
            window.drawingBoard?.syncResizableModalState?.('timer-settings-modal');
            modal.classList.add('show');
            
            // Set mode based on timer
            this.setActiveTimerMode(timer.mode);
            
            this.updateSoundGroupVisibility(timer.mode);
            this.updateTimerLabel(timer.mode);
            
            // Set time inputs based on timer duration
            const totalSeconds = Math.floor(timer.countdownDuration / 1000);
            const hours = Math.floor(totalSeconds / 3600);
            const minutes = Math.floor((totalSeconds % 3600) / 60);
            const seconds = totalSeconds % 60;
            
            if (hoursInput) hoursInput.value = hours;
            if (minutesInput) minutesInput.value = minutes;
            if (secondsInput) secondsInput.value = seconds;
            if (titleInput) titleInput.value = timer.title || '';
            
            // Set sound settings
            if (soundCheckbox) {
                soundCheckbox.checked = timer.playSound;
            }
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
            
            if (loopCountInput) {
                loopCountInput.value = timer.loopCount;
            }
            
            // Set new settings
            if (speedSlider) speedSlider.value = timer.playbackSpeed || 1.0;
            if (speedValue) speedValue.textContent = `${timer.playbackSpeed || 1.0}x`;

            if (intervalInput) intervalInput.value = timer.loopInterval || 0;

            const colorCheckbox = document.getElementById('timer-color-checkbox');
            const colorSettings = document.getElementById('timer-color-settings');
            const hasCustomColors = (
                timer.textColor && timer.textColor !== '#333333'
            ) || (
                timer.bgColor && timer.bgColor !== '#FFFFFF'
            ) || (
                timer.fullscreenTextColor && timer.fullscreenTextColor !== '#FFFFFF'
            ) || (
                timer.fullscreenBgColor && timer.fullscreenBgColor !== '#000000'
            );
            if (colorCheckbox) {
                colorCheckbox.checked = hasCustomColors;
            }
            if (colorSettings) {
                colorSettings.style.display = hasCustomColors ? 'block' : 'none';
            }

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
                const soundBtn = findTimerSoundPresetButton(timer.selectedSound);
                if (soundBtn) {
                    soundBtn.classList.add('active');
                }
            }

            this.syncTimerColorSelections({
                textColor: timer.textColor,
                bgColor: timer.bgColor,
                fullscreenTextColor: timer.fullscreenTextColor,
                fullscreenBgColor: timer.fullscreenBgColor
            });

            this.updateMainPreviewButtonState();
            focusTimerElement(hoursInput || titleInput || document.getElementById('timer-settings-close-btn') || modal);
        }

        return !!modal;
    }
    
    hideSettingsModal() {
        this.stopPreviewAudio();
        const modal = document.getElementById('timer-settings-modal');
        const restoreFocusTarget = this.timerSettingsPreviouslyFocusedElement;
        this.timerSettingsPreviouslyFocusedElement = null;
        if (modal) {
            modal.classList.remove('show');
        }
        this.adjustingTimer = null;
        focusTimerElement(restoreFocusTarget);
    }
    
    startTimer() {
        const {
            'timer-hours': hoursInput,
            'timer-minutes': minutesInput,
            'timer-seconds': secondsInput,
            'timer-title-input': titleInput,
            'timer-sound-checkbox': soundCheckbox,
            'timer-loop-checkbox': loopCheckbox,
            'timer-loop-count': loopCountInput,
            'timer-loop-interval': loopIntervalInput,
            'timer-playback-speed': playbackSpeedInput
        } = this.getTimerSettingsElements([
            'timer-hours',
            'timer-minutes',
            'timer-seconds',
            'timer-title-input',
            'timer-sound-checkbox',
            'timer-loop-checkbox',
            'timer-loop-count',
            'timer-loop-interval',
            'timer-playback-speed'
        ]);

        // Get time input values
        const hours = normalizeTimerNumberInputValue(hoursInput?.value, {
            min: 0,
            max: 23,
            fallbackValue: 0
        });
        const minutes = normalizeTimerNumberInputValue(minutesInput?.value, {
            min: 0,
            max: 59,
            fallbackValue: 0
        });
        const seconds = normalizeTimerNumberInputValue(secondsInput?.value, {
            min: 0,
            max: 59,
            fallbackValue: 0
        });
        if (hoursInput) hoursInput.value = hours;
        if (minutesInput) minutesInput.value = minutes;
        if (secondsInput) secondsInput.value = seconds;
        
        // Get title
        const title = titleInput?.value?.trim() || '';
        
        // Get mode
        const activeMode = document.querySelector('.timer-mode-btn.active');
        const mode = activeMode ? activeMode.dataset.mode : 'stopwatch';
        
        // Get sound settings
        const playSound = soundCheckbox?.checked === true;
        const activeSoundBtn = document.querySelector('.sound-preset-btn.active');
        const selectedSound = activeSoundBtn ? activeSoundBtn.dataset.sound : 'class-bell';
        
        // Get custom sound URL if custom sound is selected
        let customSoundUrl = null;
        if (activeSoundBtn && activeSoundBtn.dataset.url) {
            customSoundUrl = activeSoundBtn.dataset.url;
        }
        
        // Get loop settings
        const loopSound = loopCheckbox?.checked === true;
        const loopCount = normalizeTimerNumberInputValue(loopCountInput?.value, {
            min: 1,
            max: 100,
            fallbackValue: 3
        });
        const loopInterval = normalizeTimerNumberInputValue(loopIntervalInput?.value, {
            min: 0,
            max: 60,
            fallbackValue: 0
        });
        if (loopCountInput) loopCountInput.value = loopCount;
        if (loopIntervalInput) loopIntervalInput.value = loopInterval;
        const playbackSpeed = parseFloat(playbackSpeedInput?.value) || 1.0;
        
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
            this.showAlertModal(getTimerText('timer.alertSetTime', 'Please set the countdown time.'));
            return;
        }

        if (playSound && !customSoundUrl) {
            this.preloadSounds(selectedSound);
        }
        
        if (this.adjustingTimer) {
            // Update existing timer (including a stopwatch/countdown switch)
            this.adjustingTimer.updateSettings(duration, playSound, selectedSound, customSoundUrl, loopSound, loopCount, loopInterval, playbackSpeed, title, textColor, bgColor, fsTextColor, fsBgColor, mode);
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
        return true;
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
            setTimerPreviewButtonState(this.currentPreviewButton, false);
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

        this.preloadSounds(soundKey);
        
        // Use preloaded audio for immediate playback
        const preloadedAudio = this.preloadedAudio[soundKey];
        if (preloadedAudio) {
            // Clone the preloaded audio to allow concurrent previews
            this.previewAudio = preloadedAudio.cloneNode();
            this.currentPreviewButton = previewButton;
            
            setTimerPreviewButtonState(previewButton, true);

            // Reset button when audio ends
            this.previewAudio.addEventListener('ended', () => {
                this.stopPreviewAudio();
            });

            // Also reset on decode/network failure — otherwise the button
            // silently sticks in the "Stop" state because `ended` never fires.
            this.previewAudio.addEventListener('error', (err) => {
                console.warn('Timer preview audio error:', err);
                this.stopPreviewAudio();
            });

            // Play immediately
            this.previewAudio.play().catch(err => {
                console.warn('Failed to play timer audio preview:', err);
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

            setTimerPreviewButtonState(previewButton, true);

            // Reset button when audio ends
            this.previewAudio.addEventListener('ended', () => {
                this.stopPreviewAudio();
            });

            this.previewAudio.addEventListener('error', (err) => {
                console.warn('Timer preview audio error:', err);
                this.stopPreviewAudio();
            });

            this.previewAudio.play().catch(err => {
                console.warn('Failed to play timer audio preview:', err);
                this.stopPreviewAudio();
            });
        }
    }
}

if (typeof window !== 'undefined') {
    window.AboardTimerRuntime = {
        normalizeTimerNumberInputValue,
        findTimerSoundPresetButton
    };
    window.TimerManager = TimerManager;
}
