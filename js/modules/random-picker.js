/**
 * Random Picker Module
 * Allows users to pick random names or numbers
 */

function getRandomPickerText(key, fallback, params = {}) {
    if (!window.i18n?.t) {
        return fallback;
    }

    const translated = window.i18n.t(key, params);
    return translated && translated !== key ? translated : fallback;
}

function normalizeRandomPickerNumberRange(minValue, maxValue) {
    let min = parseInt(minValue, 10);
    let max = parseInt(maxValue, 10);

    if (Number.isNaN(min)) {
        min = 1;
    }
    if (Number.isNaN(max)) {
        max = 50;
    }
    if (min > max) {
        [min, max] = [max, min];
    }

    return { min, max };
}

function normalizeRandomPickerConfig(config) {
    const normalizedConfig = { ...config };
    if (normalizedConfig.mode === 'number') {
        const normalizedRange = normalizeRandomPickerNumberRange(
            normalizedConfig.min,
            normalizedConfig.max
        );
        normalizedConfig.min = normalizedRange.min;
        normalizedConfig.max = normalizedRange.max;
    }
    return normalizedConfig;
}

function pickRandomPickerNumber(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function pickSparseRandomPickerNumber(instance, min, max) {
    const rangeSize = max - min + 1;
    if (instance.remainingNumberCount <= 0 || instance.remainingNumberCount > rangeSize) {
        instance.resetRemainingNumbers();
    }

    const selectedOffset = Math.floor(Math.random() * instance.remainingNumberCount);
    const selectedMappedOffset = instance.remainingNumberMap.has(selectedOffset)
        ? instance.remainingNumberMap.get(selectedOffset)
        : selectedOffset;
    const lastOffset = instance.remainingNumberCount - 1;
    const lastMappedOffset = instance.remainingNumberMap.has(lastOffset)
        ? instance.remainingNumberMap.get(lastOffset)
        : lastOffset;

    instance.remainingNumberMap.set(selectedOffset, lastMappedOffset);
    instance.remainingNumberMap.delete(lastOffset);
    instance.remainingNumberCount -= 1;

    return min + selectedMappedOffset;
}

class RandomPickerInstance {
    constructor(id, manager, config = {}) {
        this.id = id;
        this.manager = manager;
        this.config = normalizeRandomPickerConfig({
            mode: 'name', // 'name' or 'number'
            names: [], // Array of names
            min: 1,
            max: 50,
            allowRepeats: true,
            title: '',
            ...config
        });

        // State
        this.isAnimating = false;
        this.remainingNames = [...(this.config.names || [])];
        this.remainingNumbers = [];
        this.remainingNumberMap = new Map();
        this.remainingNumberCount = 0;
        this.animationInterval = null;

        // Initialize remaining numbers
        this.resetRemainingNumbers();

        // UI
        this.element = null;
        this.resultElement = null;
        this.dragOffset = { x: 0, y: 0 };
        this.isDragging = false;
        this.localeChangeHandler = null;
        this.dragMoveHandler = null;
        this.dragEndHandler = null;

        this.createElement();
    }

    static escapeHtml(value) {
        return String(value ?? '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    createElement() {
        const div = document.createElement('div');
        div.className = 'random-picker-widget feature-widget';
        div.id = `random-picker-${this.id}`;

        // Default position
        const offset = (this.id % 5) * 20;
        div.style.left = `${window.innerWidth / 2 - 125 + offset}px`;
        div.style.top = `${window.innerHeight / 2 - 100 + offset}px`;

        const title = this.config.title || (this.config.mode === 'name' ?
            window.i18n.t('randomPicker.namePicker') :
            window.i18n.t('randomPicker.numberPicker'));
        div.innerHTML = `
            <div class="random-picker-header">
                <span class="random-picker-title"></span>
                <div style="display:flex; gap:6px;">
                    <button class="random-picker-help-btn" title="" aria-label="">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <circle cx="12" cy="12" r="10"></circle>
                            <path d="M9.09 9a3 3 0 1 1 5.82 1c0 2-3 2-3 4"></path>
                            <line x1="12" y1="17" x2="12" y2="17"></line>
                        </svg>
                    </button>
                    <button class="random-picker-close-btn" title="" aria-label="">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <line x1="18" y1="6" x2="6" y2="18"></line>
                            <line x1="6" y1="6" x2="18" y2="18"></line>
                        </svg>
                    </button>
                </div>
            </div>
            <div class="random-picker-content">
                <div class="random-picker-result">?</div>
                <div class="random-picker-controls">
                    <button class="random-picker-btn random-picker-start-btn" title="" aria-label="">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M5 12h14"></path>
                            <path d="M12 5l7 7-7 7"></path>
                        </svg>
                        <span></span>
                    </button>
                    <button class="random-picker-btn random-picker-settings-btn" title="" aria-label="">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <circle cx="12" cy="12" r="3"></circle>
                            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
                        </svg>
                    </button>
                </div>
            </div>
        `;

        document.body.appendChild(div);
        this.element = div;
        this.resultElement = div.querySelector('.random-picker-result');

        // Set title via textContent to prevent XSS from user-supplied titles
        const titleEl = div.querySelector('.random-picker-title');
        if (titleEl) {
            titleEl.textContent = title;
        }

        this.setupEvents();
        this.localeChangeHandler = () => {
            this.refreshLocalizedUI();
        };
        window.addEventListener('localeChanged', this.localeChangeHandler);
        this.refreshLocalizedUI();
    }

    setupEvents() {
        // Dragging
        const header = this.element.querySelector('.random-picker-header');

        const startDrag = (e) => {
            if (typeof e.button === 'number' && e.button !== 0) return;
            const closest = typeof e.target?.closest === 'function'
                ? e.target.closest.bind(e.target)
                : () => null;
            if (closest('.random-picker-close-btn')) return;
            // Stop propagation to prevent drawing
            e.stopPropagation();

            this.isDragging = true;
            this.element.classList.add('dragging');

            const primaryTouch = e.touches?.[0];
            const clientX = primaryTouch ? primaryTouch.clientX : e.clientX;
            const clientY = primaryTouch ? primaryTouch.clientY : e.clientY;

            const rect = this.element.getBoundingClientRect();
            this.dragOffset.x = clientX - rect.left;
            this.dragOffset.y = clientY - rect.top;

            e.preventDefault();
        };

        const doDrag = (e) => {
            if (!this.isDragging) return;
            if ((e.type === 'mousemove' || e.type === 'pointermove') && typeof e.buttons === 'number' && e.buttons === 0) {
                stopDrag();
                return;
            }
            if (e.type === 'touchmove') e.preventDefault();

            const primaryTouch = e.touches?.[0];
            const clientX = primaryTouch ? primaryTouch.clientX : e.clientX;
            const clientY = primaryTouch ? primaryTouch.clientY : e.clientY;

            let x = clientX - this.dragOffset.x;
            let y = clientY - this.dragOffset.y;

            // Apply edge snapping
            const edgeSnapDistance = 30;
            const windowWidth = window.innerWidth;
            const windowHeight = window.innerHeight;
            const rect = this.element.getBoundingClientRect();

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

            this.element.style.left = `${finalX}px`;
            this.element.style.top = `${finalY}px`;
            this.element.style.right = 'auto';
            this.element.style.bottom = 'auto';
        };

        const stopDrag = () => {
            this.isDragging = false;
            this.element.classList.remove('dragging');
        };

        header.addEventListener('mousedown', startDrag);
        header.addEventListener('pointerdown', startDrag);
        header.addEventListener('touchstart', startDrag, { passive: false });

        this.dragMoveHandler = doDrag;
        this.dragEndHandler = stopDrag;

        document.addEventListener('mousemove', this.dragMoveHandler);
        document.addEventListener('pointermove', this.dragMoveHandler);
        document.addEventListener('touchmove', this.dragMoveHandler, { passive: false });

        document.addEventListener('mouseup', this.dragEndHandler);
        document.addEventListener('pointerup', this.dragEndHandler);
        document.addEventListener('touchend', this.dragEndHandler);
        document.addEventListener('pointercancel', this.dragEndHandler);
        document.addEventListener('touchcancel', this.dragEndHandler);

        // Buttons propagation
        const btns = [
            this.element.querySelector('.random-picker-close-btn'),
            this.element.querySelector('.random-picker-help-btn'),
            this.element.querySelector('.random-picker-start-btn'),
            this.element.querySelector('.random-picker-settings-btn')
        ];

        btns.forEach(btn => {
            if (btn) {
                btn.addEventListener('mousedown', e => e.stopPropagation());
                btn.addEventListener('pointerdown', e => e.stopPropagation());
                btn.addEventListener('touchstart', e => e.stopPropagation());
            }
        });

        // Close
        this.element.querySelector('.random-picker-close-btn').addEventListener('click', () => {
            this.destroy();
        });

        this.element.querySelector('.random-picker-help-btn').addEventListener('click', () => {
            window.drawingBoard?.helpSystem?.showHelp('help.features.randomPicker');
        });

        // Start
        this.element.querySelector('.random-picker-start-btn').addEventListener('click', () => {
            this.togglePick();
        });

        // Settings
        this.element.querySelector('.random-picker-settings-btn').addEventListener('click', () => {
            this.manager.showSettings(this);
        });
    }

    togglePick() {
        if (this.isAnimating) {
            // Stop immediately and pick
            this.stopAnimation();
        } else {
            // Start picking
            this.startPick();
        }
    }

    startPick() {
        if (this.isAnimating) return;

        this.isAnimating = true;
        this.resultElement.classList.add('animating');
        const startBtnEl = this.element.querySelector('.random-picker-start-btn');
        const startBtnSpan = startBtnEl.querySelector('span');
        startBtnSpan.textContent = window.i18n.t('common.stop');
        startBtnEl.classList.add('is-stop');

        // Determine pool for animation
        let pool = [];
        if (this.config.mode === 'name') {
            if (this.config.names.length === 0) {
                this.resultElement.textContent = window.i18n.t('randomPicker.noNames');
                this.isAnimating = false;
                this.resultElement.classList.remove('animating');
                // Fix: startBtn variable was undefined, should use startBtnSpan or re-query
                startBtnSpan.textContent = window.i18n.t('common.start');
                startBtnEl.classList.remove('is-stop');
                this.refreshLocalizedUI();
                return;
            }

            if (!this.config.allowRepeats) {
                if (this.remainingNames.length === 0) {
                    // Reset if all used
                    this.remainingNames = [...this.config.names];
                }
                pool = this.remainingNames;
            } else {
                pool = this.config.names;
            }
        } else {
            // Number mode
            const { min, max } = normalizeRandomPickerNumberRange(this.config.min, this.config.max);

            if (!this.config.allowRepeats) {
                const usesSparseNumberPool = max - min + 1 > 10001;
                if (usesSparseNumberPool) {
                    if (this.remainingNumberCount <= 0) {
                        this.resetRemainingNumbers();
                    }
                } else if (this.remainingNumbers.length === 0) {
                    this.resetRemainingNumbers();
                }
                // If pool is empty (e.g. range invalid), fallback
                if (this.remainingNumbers.length === 0) {
                    for (let i = 0; i < 20; i++) {
                        pool.push(pickRandomPickerNumber(min, max));
                    }
                } else {
                    pool = this.remainingNumbers;
                }
            } else {
                // Create a small pool for animation visual
                for (let i = 0; i < 20; i++) {
                    pool.push(pickRandomPickerNumber(min, max));
                }
            }
        }

        // Animation loop
        this.animationInterval = setInterval(() => {
            const randomItem = pool[Math.floor(Math.random() * pool.length)];
            this.resultElement.textContent = randomItem;
        }, 50);

        // Auto stop after random time (e.g. 1-2 seconds) if not manual stop
        /*
        setTimeout(() => {
            if (this.isAnimating) this.stopAnimation();
        }, 1000 + Math.random() * 1000);
        */
        this.refreshLocalizedUI();
    }

    stopAnimation() {
        if (!this.isAnimating) return;

        clearInterval(this.animationInterval);
        this.isAnimating = false;
        this.resultElement.classList.remove('animating');

        const startBtnEl = this.element.querySelector('.random-picker-start-btn');
        const startBtnSpan = startBtnEl.querySelector('span');
        startBtnSpan.textContent = window.i18n.t('common.start');
        startBtnEl.classList.remove('is-stop');

        // Pick final result
        let result;
        if (this.config.mode === 'name') {
            let pool = this.config.allowRepeats ? this.config.names : this.remainingNames;
            if (pool.length === 0) {
                 // Should have reset in startPick, but just in case
                this.remainingNames = [...this.config.names];
                pool = this.remainingNames;
            }

            if (pool.length === 0) {
                // Name list is empty (e.g. cleared while animating) — surface a
                // hint instead of rendering "undefined".
                this.resultElement.textContent = window.i18n.t('randomPicker.noNames');
                this.refreshLocalizedUI();
                return;
            }

            const index = Math.floor(Math.random() * pool.length);
            result = pool[index];

            if (!this.config.allowRepeats) {
                this.remainingNames.splice(index, 1);
            }
        } else {
            // Number mode
            if (this.config.allowRepeats) {
                const { min, max } = normalizeRandomPickerNumberRange(this.config.min, this.config.max);
                result = pickRandomPickerNumber(min, max);
            } else {
                const { min, max } = normalizeRandomPickerNumberRange(this.config.min, this.config.max);
                const usesSparseNumberPool = max - min + 1 > 10001;
                if (usesSparseNumberPool) {
                    if (this.remainingNumberCount <= 0) {
                        this.resetRemainingNumbers();
                    }
                    result = pickSparseRandomPickerNumber(this, min, max);
                } else {
                    if (this.remainingNumbers.length === 0) {
                        this.resetRemainingNumbers();
                    }
                    const index = Math.floor(Math.random() * this.remainingNumbers.length);
                    result = this.remainingNumbers[index];
                    this.remainingNumbers.splice(index, 1);
                }
            }
        }

        this.resultElement.textContent = result;

        // Scale animation
        this.resultElement.style.transform = 'scale(1.5)';
        setTimeout(() => {
            this.resultElement.style.transform = 'scale(1)';
        }, 300);

        this.refreshLocalizedUI();
    }

    updateConfig(newConfig) {
        // If a pick animation is still running, stop it the same way
        // stopAnimation() does (clear interval, restore button/state) without
        // drawing a result from the soon-to-be-stale pool.
        if (this.isAnimating) {
            clearInterval(this.animationInterval);
            this.animationInterval = null;
            this.isAnimating = false;
            this.resultElement.classList.remove('animating');

            const startBtnEl = this.element.querySelector('.random-picker-start-btn');
            const startBtnSpan = startBtnEl?.querySelector('span');
            if (startBtnSpan) {
                startBtnSpan.textContent = window.i18n.t('common.start');
            }
            startBtnEl?.classList.remove('is-stop');
        }

        const previousConfig = this.config;
        const nextConfig = normalizeRandomPickerConfig({ ...previousConfig, ...newConfig });
        const namesChanged = nextConfig.mode !== previousConfig.mode
            || JSON.stringify(nextConfig.names) !== JSON.stringify(previousConfig.names);
        const numberPoolChanged = nextConfig.mode === 'number' && (
            previousConfig.mode !== 'number'
            || nextConfig.min !== previousConfig.min
            || nextConfig.max !== previousConfig.max
            || nextConfig.allowRepeats !== previousConfig.allowRepeats
        );

        if (namesChanged) {
            this.remainingNames = [...(nextConfig.names || [])];
        }

        this.config = nextConfig;
        if (numberPoolChanged) {
            this.resetRemainingNumbers();
        }

        // Update title
        const titleEl = this.element.querySelector('.random-picker-title');
        titleEl.textContent = this.config.title || (this.config.mode === 'name' ?
            window.i18n.t('randomPicker.namePicker') :
            window.i18n.t('randomPicker.numberPicker'));

        // Reset result
        this.resultElement.textContent = '?';
        this.refreshLocalizedUI();
    }

    refreshLocalizedUI() {
        if (!this.element) {
            return;
        }

        const titleEl = this.element.querySelector('.random-picker-title');
        if (titleEl && !this.config.title) {
            titleEl.textContent = this.config.mode === 'name'
                ? getRandomPickerText('randomPicker.namePicker', 'Name Picker')
                : getRandomPickerText('randomPicker.numberPicker', 'Number Picker');
        }

        const helpBtn = this.element.querySelector('.random-picker-help-btn');
        const helpLabel = getRandomPickerText('common.help', 'Help');
        if (helpBtn) {
            helpBtn.title = helpLabel;
            helpBtn.setAttribute('aria-label', helpLabel);
        }

        const closeBtn = this.element.querySelector('.random-picker-close-btn');
        const closeLabel = getRandomPickerText('common.close', 'Close');
        if (closeBtn) {
            closeBtn.title = closeLabel;
            closeBtn.setAttribute('aria-label', closeLabel);
        }

        const startBtn = this.element.querySelector('.random-picker-start-btn');
        const startLabel = this.isAnimating
            ? getRandomPickerText('common.stop', 'Stop')
            : getRandomPickerText('common.start', 'Start');
        if (startBtn) {
            startBtn.title = startLabel;
            startBtn.setAttribute('aria-label', startLabel);
            const startBtnSpan = startBtn.querySelector('span');
            if (startBtnSpan) {
                startBtnSpan.textContent = startLabel;
            }
        }

        const settingsBtn = this.element.querySelector('.random-picker-settings-btn');
        const settingsLabel = getRandomPickerText('randomPicker.settingsTitle', 'Settings');
        if (settingsBtn) {
            settingsBtn.title = settingsLabel;
            settingsBtn.setAttribute('aria-label', settingsLabel);
        }
    }

    resetRemainingNumbers() {
        const { min, max } = normalizeRandomPickerNumberRange(this.config.min, this.config.max);
        const rangeSize = max - min + 1;
        this.remainingNumberMap = new Map();
        this.remainingNumberCount = rangeSize;

        // Prevent massive arrays
        if (rangeSize > 10001) {
            this.remainingNumbers = [];
            return;
        }

        this.remainingNumbers = Array.from({length: rangeSize}, (_, i) => min + i);
    }

    destroy() {
        clearInterval(this.animationInterval);
        if (this.dragMoveHandler) {
            document.removeEventListener('mousemove', this.dragMoveHandler);
            document.removeEventListener('pointermove', this.dragMoveHandler);
            document.removeEventListener('touchmove', this.dragMoveHandler);
            this.dragMoveHandler = null;
        }
        if (this.dragEndHandler) {
            document.removeEventListener('mouseup', this.dragEndHandler);
            document.removeEventListener('pointerup', this.dragEndHandler);
            document.removeEventListener('touchend', this.dragEndHandler);
            document.removeEventListener('pointercancel', this.dragEndHandler);
            document.removeEventListener('touchcancel', this.dragEndHandler);
            this.dragEndHandler = null;
        }
        if (this.localeChangeHandler) {
            window.removeEventListener('localeChanged', this.localeChangeHandler);
            this.localeChangeHandler = null;
        }
        if (this.manager.currentInstance === this) {
            this.manager.currentInstance = null;
        }
        this.element.remove();
        this.manager.remove(this.id);
    }
}

class RandomPickerManager {
    constructor() {
        this.instances = new Map();
        this.nextId = 1;
        this.settingsModalPreviouslyFocusedElement = null;
        this.localeChangeHandler = () => {
            this.refreshSettingsModalText();
        };
        this.createSettingsModal();
        window.addEventListener('localeChanged', this.localeChangeHandler);
    }

    getSettingsModal() {
        const modal = document.getElementById('random-picker-settings-modal');
        if (!modal) {
            console.warn('Random picker settings modal is unavailable');
            return null;
        }
        return modal;
    }

    getSettingsElements(ids = []) {
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
            console.warn(`Random picker settings controls are unavailable: ${missing.join(', ')}`);
        }

        return elements;
    }

    updateSettingsModeVisibility(mode) {
        const {
            'rp-name-settings': nameSettings,
            'rp-number-settings': numberSettings
        } = this.getSettingsElements([
            'rp-name-settings',
            'rp-number-settings'
        ]);

        if (nameSettings) {
            nameSettings.style.display = mode === 'name' ? 'block' : 'none';
        }
        if (numberSettings) {
            numberSettings.style.display = mode === 'number' ? 'block' : 'none';
        }
    }

    getActiveSettingsMode(modal, fallbackMode = 'name') {
        const activeModeButton = modal?.querySelector('.random-picker-mode-btn.active');
        if (!activeModeButton) {
            console.warn(`Random picker mode button is unavailable, falling back to: ${fallbackMode}`);
            return fallbackMode;
        }
        return activeModeButton.dataset.mode || fallbackMode;
    }

    closeSettingsModal(clearCurrentInstance = true) {
        const modal = this.getSettingsModal();
        if (!modal) {
            return false;
        }

        modal.classList.remove('show');
        if (clearCurrentInstance) {
            this.currentInstance = null;
        }

        const restoreFocusTarget = this.settingsModalPreviouslyFocusedElement;
        this.settingsModalPreviouslyFocusedElement = null;
        if (typeof window.requestAnimationFrame === 'function') {
            window.requestAnimationFrame(() => restoreFocusTarget?.focus?.());
        } else {
            restoreFocusTarget?.focus?.();
        }
        return true;
    }

    createSettingsModal() {
        const modal = document.createElement('div');
        modal.id = 'random-picker-settings-modal';
        modal.className = 'modal';
        modal.setAttribute('role', 'dialog');
        modal.setAttribute('aria-modal', 'true');
        modal.setAttribute('aria-labelledby', 'random-picker-settings-title');
        modal.setAttribute('aria-describedby', 'rp-title-input');
        modal.tabIndex = -1;
        modal.innerHTML = `
            <div class="modal-content random-picker-modal-content settings-panel-modal-content">
                <div class="modal-header">
                    <h2 id="random-picker-settings-title"></h2>
                    <button type="button" class="modal-close-btn" title="" aria-label="">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <line x1="18" y1="6" x2="6" y2="18"></line>
                            <line x1="6" y1="6" x2="18" y2="18"></line>
                        </svg>
                    </button>
                </div>
                <div class="modal-body">
                    <div class="random-picker-mode-switch">
                        <button type="button" class="random-picker-mode-btn active" data-mode="name"></button>
                        <button type="button" class="random-picker-mode-btn" data-mode="number"></button>
                    </div>

                    <div class="random-picker-input-group">
                        <label for="rp-title-input" class="rp-title-label"></label>
                        <input type="text" id="rp-title-input" class="export-filename-input" placeholder="" aria-label="">
                    </div>

                    <div id="rp-name-settings">
                        <div class="random-picker-input-group">
                            <label for="rp-names-input" class="rp-names-label"></label>
                            <textarea id="rp-names-input" class="random-picker-textarea" placeholder="" aria-label=""></textarea>
                        </div>

                        <div class="random-picker-import-group" style="margin-bottom: 12px; border-top: 1px solid #eee; padding-top: 10px;">
                            <label class="rp-import-label" style="display:block;margin-bottom:5px;font-size:12px;color:#666;"></label>
                            <div style="display:flex; gap:8px; margin-bottom:5px;">
                                <input type="text" id="rp-import-col" value="" style="width:80px;padding:6px;border:1px solid #ddd;border-radius:4px;font-size:12px;" placeholder="" aria-label="">
                                <input type="file" id="rp-import-file" accept=".xlsx, .xls, .csv" style="display:none">
                                <button type="button" id="rp-import-btn" class="button-secondary" style="flex:1;padding:6px;font-size:12px;"></button>
                            </div>
                            <div class="settings-hint rp-import-hint"></div>
                        </div>
                    </div>

                    <div id="rp-number-settings" style="display: none;">
                        <div class="random-picker-input-group">
                            <label class="rp-range-label"></label>
                            <div class="random-picker-range-inputs">
                                <input type="number" id="rp-min-input" class="random-picker-number-input" value="1" aria-label="">
                                <span>-</span>
                                <input type="number" id="rp-max-input" class="random-picker-number-input" value="50" aria-label="">
                            </div>
                        </div>
                    </div>

                    <div class="random-picker-common-settings" style="margin-top: 10px; border-top: 1px solid #eee; padding-top: 10px;">
                        <label class="random-picker-checkbox">
                            <input type="checkbox" id="rp-allow-repeats" checked>
                            <span class="rp-allow-repeats-label"></span>
                        </label>
                    </div>

                    <div class="confirm-buttons">
                        <button type="button" class="confirm-btn ok-btn" id="rp-save-btn"></button>
                    </div>
                </div>
            </div>
        `;
        document.body.appendChild(modal);

        // Events
        modal.querySelector('.modal-close-btn').addEventListener('click', () => {
            this.closeSettingsModal();
        });
        modal.addEventListener('click', (event) => {
            if (event.target === modal) {
                this.closeSettingsModal();
            }
        });
        modal.addEventListener('keydown', (event) => {
            if (event.key === 'Escape') {
                event.preventDefault();
                this.closeSettingsModal();
            }
        });

        const modeBtns = modal.querySelectorAll('.random-picker-mode-btn');
        modeBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                modeBtns.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');

                const mode = btn.dataset.mode;
                this.updateSettingsModeVisibility(mode);
            });
        });

        document.getElementById('rp-save-btn').addEventListener('click', () => {
            this.saveSettings();
        });

        // Import functionality
        const importBtn = document.getElementById('rp-import-btn');
        const fileInput = document.getElementById('rp-import-file');

        if (importBtn && fileInput) {
            importBtn.addEventListener('click', () => {
                fileInput.click();
            });

            fileInput.addEventListener('change', (e) => {
                const file = e.target.files[0];
                if (!file) return;
                this.importFile(file);
                e.target.value = ''; // Reset
            });
        }

        this.refreshSettingsModalText();
        const importColumnInput = modal.querySelector('#rp-import-col');
        if (importColumnInput && !importColumnInput.value) {
            importColumnInput.value = getRandomPickerText('randomPicker.defaultColumnName', 'Name');
        }
    }

    refreshSettingsModalText() {
        const modal = document.getElementById('random-picker-settings-modal');
        if (!modal) {
            return;
        }

        const closeLabel = getRandomPickerText('common.close', 'Close');
        const closeBtn = modal.querySelector('.modal-close-btn');
        if (closeBtn) {
            closeBtn.title = closeLabel;
            closeBtn.setAttribute('aria-label', closeLabel);
        }

        const titleEl = modal.querySelector('#random-picker-settings-title');
        if (titleEl) {
            titleEl.textContent = getRandomPickerText('randomPicker.settingsTitle', 'Picker Settings');
        }

        const nameModeBtn = modal.querySelector('.random-picker-mode-btn[data-mode="name"]');
        if (nameModeBtn) {
            nameModeBtn.textContent = getRandomPickerText('randomPicker.modeName', 'Name Mode');
        }

        const numberModeBtn = modal.querySelector('.random-picker-mode-btn[data-mode="number"]');
        if (numberModeBtn) {
            numberModeBtn.textContent = getRandomPickerText('randomPicker.modeNumber', 'Number Mode');
        }

        const titleLabel = modal.querySelector('.rp-title-label');
        if (titleLabel) {
            titleLabel.textContent = getRandomPickerText('randomPicker.titleLabel', 'Title');
        }

        const titleInput = modal.querySelector('#rp-title-input');
        if (titleInput) {
            titleInput.placeholder = getRandomPickerText('randomPicker.titlePlaceholder', 'Custom Title (Optional)');
            titleInput.setAttribute('aria-label', getRandomPickerText('randomPicker.titleLabel', 'Title'));
        }

        const namesLabel = modal.querySelector('.rp-names-label');
        if (namesLabel) {
            namesLabel.textContent = getRandomPickerText('randomPicker.namesLabel', 'Names List (One per line)');
        }

        const namesInput = modal.querySelector('#rp-names-input');
        if (namesInput) {
            namesInput.placeholder = getRandomPickerText('randomPicker.namesPlaceholder', 'Student A\nStudent B\nStudent C');
            namesInput.setAttribute('aria-label', getRandomPickerText('randomPicker.namesLabel', 'Names List'));
        }

        const importLabel = modal.querySelector('.rp-import-label');
        if (importLabel) {
            importLabel.textContent = getRandomPickerText('randomPicker.importLabel', 'Import Names (Excel/CSV)');
        }

        const importColumnInput = modal.querySelector('#rp-import-col');
        if (importColumnInput) {
            importColumnInput.placeholder = getRandomPickerText('randomPicker.importColumnPlaceholder', 'Column');
            importColumnInput.setAttribute('aria-label', getRandomPickerText('randomPicker.importColumnPlaceholder', 'Column'));
        }

        const importBtn = modal.querySelector('#rp-import-btn');
        if (importBtn) {
            importBtn.textContent = getRandomPickerText('randomPicker.importBtn', 'Select File');
        }

        const importHint = modal.querySelector('.rp-import-hint');
        if (importHint) {
            importHint.textContent = getRandomPickerText('randomPicker.importHint', 'Tip: Reads data from the specified column name');
        }

        const rangeLabel = modal.querySelector('.rp-range-label');
        if (rangeLabel) {
            rangeLabel.textContent = getRandomPickerText('randomPicker.rangeLabel', 'Number Range');
        }

        const minInput = modal.querySelector('#rp-min-input');
        if (minInput) {
            minInput.setAttribute('aria-label', `${getRandomPickerText('randomPicker.rangeLabel', 'Number Range')} ${getRandomPickerText('randomPicker.rangeMin', 'Minimum')}`);
        }

        const maxInput = modal.querySelector('#rp-max-input');
        if (maxInput) {
            maxInput.setAttribute('aria-label', `${getRandomPickerText('randomPicker.rangeLabel', 'Number Range')} ${getRandomPickerText('randomPicker.rangeMax', 'Maximum')}`);
        }

        const allowRepeatsLabel = modal.querySelector('.rp-allow-repeats-label');
        if (allowRepeatsLabel) {
            allowRepeatsLabel.textContent = getRandomPickerText('randomPicker.allowRepeats', 'Allow Repeats');
        }

        const saveBtn = modal.querySelector('#rp-save-btn');
        if (saveBtn) {
            saveBtn.textContent = getRandomPickerText('common.confirm', 'Confirm');
        }
    }

    async importFile(file) {
        const validation = window.AboardFileValidation;
        try {
            validation?.validateSpreadsheetFile?.(file);
        } catch (error) {
            validation?.showValidationError?.(error, { dialog: window.appDialog });
            return;
        }

        if (!window.XLSX) {
            try {
                if (window.ScriptLoader) {
                    await ScriptLoader.load('js/libs/xlsx.full.min.js');
                } else {
                    throw new Error('ScriptLoader not found');
                }
            } catch (e) {
                console.error(e);
                window.appDialog?.showAlert(
                    getRandomPickerText('randomPicker.importLibraryLoadFailed', 'Failed to load the Excel import library. Please refresh and try again.'),
                    'error'
                );
                return;
            }
        }

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = new Uint8Array(e.target.result);
                const workbook = XLSX.read(data, { type: 'array' });
                const firstSheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[firstSheetName];
                const json = XLSX.utils.sheet_to_json(worksheet);

                const importColumnInput = document.getElementById('rp-import-col');
                const defaultColumnName = getRandomPickerText('randomPicker.defaultColumnName', 'Name');
                const colName = importColumnInput?.value?.trim() || defaultColumnName;

                const names = [];
                json.forEach(row => {
                    let val = row[colName];
                    // Case-insensitive fallback
                    if (val === undefined) {
                        const key = Object.keys(row).find(k => k.toLowerCase() === colName.toLowerCase());
                        if (key) val = row[key];
                    }

                    if (val !== undefined && val !== null && String(val).trim() !== '') {
                        names.push(String(val).trim());
                    }
                });

                if (names.length > 0) {
                    const textarea = document.getElementById('rp-names-input');
                    if (textarea) {
                        textarea.value = names.join('\n');
                    } else {
                        console.warn('Random picker names input is unavailable');
                    }
                    window.appDialog?.showAlert(window.i18n.t('randomPicker.importSuccess').replace('{count}', names.length), 'success');
                } else {
                    window.appDialog?.showAlert(window.i18n.t('randomPicker.importNoData'), 'warning');
                }
            } catch (err) {
                console.error(err);
                window.appDialog?.showAlert(window.i18n.t('randomPicker.importError'), 'error');
            }
        };
        reader.onerror = () => {
            console.warn('Failed to read Excel file for random picker import:', reader.error);
            const msg = window.i18n?.t?.('errors.fileReadFailed') || 'Failed to read the selected file.';
            window.appDialog?.showAlert?.(msg, 'error');
        };
        reader.readAsArrayBuffer(file);
    }

    create() {
        // Create with defaults, then show settings? Or just create.
        // Let's create with default settings.
        const id = this.nextId++;
        const instance = new RandomPickerInstance(id, this);
        this.instances.set(id, instance);

        const savedConfig = this.loadSavedConfig();
        if (savedConfig) {
            if (savedConfig.mode !== 'number' && !(Array.isArray(savedConfig.names) && savedConfig.names.length > 0)) {
                savedConfig.names = window.i18n.t('randomPicker.defaultNames').split('\n');
            }
            instance.updateConfig(savedConfig);
            return;
        }

        // Populate with example names if empty
        const defaultNames = window.i18n.t('randomPicker.defaultNames').split('\n');
        instance.updateConfig({
            names: defaultNames
        });
    }

    loadSavedConfig() {
        try {
            const raw = localStorage.getItem('randomPickerConfig');
            if (!raw) {
                return null;
            }
            const parsed = JSON.parse(raw);
            if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
                return null;
            }
            return parsed;
        } catch (e) {
            console.warn('Failed to load saved random picker config:', e);
            return null;
        }
    }

    persistConfig(config) {
        try {
            localStorage.setItem('randomPickerConfig', JSON.stringify(config));
        } catch (e) {
            console.warn('Failed to save random picker config:', e);
        }
    }

    remove(id) {
        this.instances.delete(id);
    }

    showSettings(instance) {
        const modal = this.getSettingsModal();
        if (!modal) {
            return false;
        }
        this.currentInstance = instance;

        const {
            'rp-title-input': titleInput,
            'rp-names-input': namesInput,
            'rp-allow-repeats': allowRepeatsInput,
            'rp-min-input': minInput,
            'rp-max-input': maxInput
        } = this.getSettingsElements([
            'rp-title-input',
            'rp-names-input',
            'rp-allow-repeats',
            'rp-min-input',
            'rp-max-input'
        ]);
        this.refreshSettingsModalText();

        // Populate form
        const config = instance.config;

        // Mode
        const modeBtns = modal.querySelectorAll('.random-picker-mode-btn');
        modeBtns.forEach(b => {
            if (b.dataset.mode === config.mode) {
                b.click(); // This also handles display toggling
            }
        });
        this.updateSettingsModeVisibility(config.mode);

        // Title
        if (titleInput) {
            titleInput.value = config.title || '';
        }

        // Names
        if (namesInput) {
            namesInput.value = (config.names || []).join('\n');
        }
        if (allowRepeatsInput) {
            allowRepeatsInput.checked = config.allowRepeats;
        }

        // Numbers
        if (minInput) {
            minInput.value = config.min;
        }
        if (maxInput) {
            maxInput.value = config.max;
        }

        this.settingsModalPreviouslyFocusedElement = document.activeElement && document.activeElement !== document.body
            ? document.activeElement
            : null;
        modal.classList.add('show');
        const focusTarget = titleInput || modal.querySelector('.modal-close-btn') || modal;
        if (typeof window.requestAnimationFrame === 'function') {
            window.requestAnimationFrame(() => focusTarget?.focus?.());
        } else {
            focusTarget?.focus?.();
        }
        return true;
    }

    saveSettings() {
        if (!this.currentInstance) return;

        const modal = this.getSettingsModal();
        if (!modal) {
            return false;
        }

        const {
            'rp-title-input': titleInput,
            'rp-allow-repeats': allowRepeatsInput,
            'rp-names-input': namesInput,
            'rp-min-input': minInput,
            'rp-max-input': maxInput
        } = this.getSettingsElements([
            'rp-title-input',
            'rp-allow-repeats',
            'rp-names-input',
            'rp-min-input',
            'rp-max-input'
        ]);

        const mode = this.getActiveSettingsMode(modal, this.currentInstance.config?.mode || 'name');
        const title = titleInput?.value || '';

        const config = {
            mode,
            title
        };

        config.allowRepeats = allowRepeatsInput?.checked === true;

        if (mode === 'name') {
            const namesText = namesInput?.value || '';
            config.names = namesText.split('\n').map(s => s.trim()).filter(s => s);
        } else {
            const normalizedRange = normalizeRandomPickerNumberRange(minInput?.value, maxInput?.value);
            config.min = normalizedRange.min;
            config.max = normalizedRange.max;
        }

        this.currentInstance.updateConfig(config);
        this.persistConfig(this.currentInstance.config);
        this.closeSettingsModal();
        return true;
    }
}

// Export
if (typeof window !== 'undefined') {
    window.RandomPickerManager = RandomPickerManager;
}
