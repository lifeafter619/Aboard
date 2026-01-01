// Random Picker Module
// Handles the random number/name picker functionality

class RandomPickerManager {
    constructor() {
        this.widget = document.getElementById('random-picker-widget');
        this.modal = null;
        this.isVisible = false;
        this.isPicking = false;
        this.interval = null;

        // Default settings
        this.mode = 'number'; // 'number' or 'name'
        this.min = 1;
        this.max = 50;
        this.names = [];
        this.allowRepeat = true;
        this.pickedItems = [];

        // State for drag
        this.isDragging = false;
        this.dragOffset = { x: 0, y: 0 };

        this.init();
    }

    init() {
        this.createWidgetContent();
        this.createSettingsModal();
        this.setupEventListeners();
    }

    createWidgetContent() {
        this.widget.innerHTML = `
            <div class="random-picker-header">
                <div class="random-picker-title" data-i18n="randomPicker.title">点名器</div>
                <div style="display: flex; gap: 8px;">
                    <button class="random-picker-close-btn" id="random-picker-settings-btn">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <circle cx="12" cy="12" r="3"></circle>
                            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
                        </svg>
                    </button>
                    <button class="random-picker-close-btn" id="random-picker-close-btn">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <line x1="18" y1="6" x2="6" y2="18"></line>
                            <line x1="6" y1="6" x2="18" y2="18"></line>
                        </svg>
                    </button>
                </div>
            </div>
            <div class="random-picker-display" id="random-picker-display">Ready</div>
            <div class="random-picker-controls">
                <button class="random-picker-btn primary" id="random-picker-toggle-btn" data-i18n="randomPicker.start">Start</button>
            </div>
        `;
    }

    createSettingsModal() {
        // Create modal element
        const modal = document.createElement('div');
        modal.id = 'random-picker-settings-modal';
        modal.className = 'modal';
        modal.innerHTML = `
            <div class="modal-content random-picker-modal-content">
                <div class="modal-header">
                    <h2 data-i18n="randomPicker.settingsTitle">Random Picker Settings</h2>
                    <button class="modal-close-btn" id="random-picker-settings-close">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <line x1="18" y1="6" x2="6" y2="18"></line>
                            <line x1="6" y1="6" x2="18" y2="18"></line>
                        </svg>
                    </button>
                </div>
                <div class="modal-body">
                    <div class="random-picker-mode-group">
                        <div class="random-picker-mode-btn active" data-mode="number" data-i18n="randomPicker.numberMode">Number</div>
                        <div class="random-picker-mode-btn" data-mode="name" data-i18n="randomPicker.nameMode">Name</div>
                    </div>

                    <div id="random-picker-number-settings">
                        <div class="random-picker-input-group">
                            <label data-i18n="randomPicker.numberRange">Range</label>
                            <div class="random-picker-range-inputs">
                                <input type="number" id="random-picker-min" value="${this.min}" min="0">
                                <span>-</span>
                                <input type="number" id="random-picker-max" value="${this.max}" min="1">
                            </div>
                        </div>
                    </div>

                    <div id="random-picker-name-settings" style="display: none;">
                        <div class="random-picker-input-group">
                            <label data-i18n="randomPicker.names">Names</label>
                            <textarea id="random-picker-names" class="random-picker-textarea" data-i18n-placeholder="randomPicker.namesHint" placeholder="Enter names, one per line"></textarea>
                        </div>
                    </div>

                    <div class="random-picker-checkbox">
                        <input type="checkbox" id="random-picker-allow-repeat" ${this.allowRepeat ? 'checked' : ''}>
                        <span data-i18n="randomPicker.allowRepeat">Allow Repeats</span>
                    </div>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
        this.modal = modal;

        // Settings modal listeners
        document.getElementById('random-picker-settings-close').addEventListener('click', () => {
            this.saveSettings();
            this.modal.classList.remove('show');
        });

        // Mode switch
        modal.querySelectorAll('.random-picker-mode-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const mode = e.target.dataset.mode;
                this.setMode(mode);
            });
        });
    }

    setupEventListeners() {
        // Toggle visibility via feature button (will be connected in main.js)
        // Widget close button
        document.getElementById('random-picker-close-btn').addEventListener('click', () => {
            this.hide();
        });

        // Settings button
        document.getElementById('random-picker-settings-btn').addEventListener('click', () => {
            this.modal.classList.add('show');
        });

        // Start/Stop button
        document.getElementById('random-picker-toggle-btn').addEventListener('click', () => {
            this.togglePicking();
        });

        // Drag functionality
        this.widget.addEventListener('mousedown', (e) => {
            if (e.target.closest('button') || e.target.closest('input')) return;
            this.isDragging = true;
            const rect = this.widget.getBoundingClientRect();
            this.dragOffset.x = e.clientX - rect.left;
            this.dragOffset.y = e.clientY - rect.top;
            this.widget.classList.add('dragging');
        });

        document.addEventListener('mousemove', (e) => {
            if (!this.isDragging) return;
            e.preventDefault();

            const x = e.clientX - this.dragOffset.x;
            const y = e.clientY - this.dragOffset.y;

            // Constrain to window
            const rect = this.widget.getBoundingClientRect();
            const maxX = window.innerWidth - rect.width;
            const maxY = window.innerHeight - rect.height;

            this.widget.style.left = `${Math.max(0, Math.min(x, maxX))}px`;
            this.widget.style.top = `${Math.max(0, Math.min(y, maxY))}px`;
            this.widget.style.right = 'auto'; // Reset right positioning
        });

        document.addEventListener('mouseup', () => {
            this.isDragging = false;
            this.widget.classList.remove('dragging');
        });
    }

    setMode(mode) {
        this.mode = mode;
        const numberSettings = document.getElementById('random-picker-number-settings');
        const nameSettings = document.getElementById('random-picker-name-settings');
        const modeBtns = this.modal.querySelectorAll('.random-picker-mode-btn');

        modeBtns.forEach(btn => {
            if (btn.dataset.mode === mode) btn.classList.add('active');
            else btn.classList.remove('active');
        });

        if (mode === 'number') {
            numberSettings.style.display = 'block';
            nameSettings.style.display = 'none';
        } else {
            numberSettings.style.display = 'none';
            nameSettings.style.display = 'block';
        }

        // Reset state
        this.pickedItems = [];
        const display = document.getElementById('random-picker-display');
        if (display) display.textContent = 'Ready';
    }

    saveSettings() {
        this.min = parseInt(document.getElementById('random-picker-min').value) || 1;
        this.max = parseInt(document.getElementById('random-picker-max').value) || 50;

        const namesText = document.getElementById('random-picker-names').value;
        this.names = namesText.split('\n').map(n => n.trim()).filter(n => n.length > 0);

        this.allowRepeat = document.getElementById('random-picker-allow-repeat').checked;

        // Reset picked history if settings changed
        this.pickedItems = [];
        document.getElementById('random-picker-display').textContent = 'Ready';
    }

    togglePicking() {
        const btn = document.getElementById('random-picker-toggle-btn');
        const display = document.getElementById('random-picker-display');

        if (this.isPicking) {
            // Stop
            this.isPicking = false;
            clearInterval(this.interval);
            btn.textContent = window.i18n ? window.i18n.t('randomPicker.start') : 'Start';
            btn.classList.add('primary');

            // Pick final result
            const result = this.generateResult();
            if (result !== null) {
                display.textContent = result;
                if (!this.allowRepeat) {
                    this.pickedItems.push(result);
                }
            } else {
                display.textContent = 'End';
            }
        } else {
            // Start
            // Check availability first
            if (!this.allowRepeat) {
                if (this.mode === 'number') {
                    const total = this.max - this.min + 1;
                    if (this.pickedItems.length >= total) {
                        alert('All numbers have been picked!');
                        return;
                    }
                } else {
                    if (this.names.length === 0) {
                        alert('Please enter names first!');
                        return;
                    }
                    if (this.pickedItems.length >= this.names.length) {
                        alert('All names have been picked!');
                        return;
                    }
                }
            } else {
                 if (this.mode === 'name' && this.names.length === 0) {
                    alert('Please enter names first!');
                    return;
                }
            }

            this.isPicking = true;
            btn.textContent = window.i18n ? window.i18n.t('randomPicker.stop') : 'Stop';
            btn.classList.remove('primary');

            this.interval = setInterval(() => {
                const temp = this.getRandomItem(true); // Allow repeat for animation
                display.textContent = temp;
            }, 50);
        }
    }

    getRandomItem(forAnimation = false) {
        if (this.mode === 'number') {
            return Math.floor(Math.random() * (this.max - this.min + 1)) + this.min;
        } else {
            if (this.names.length === 0) return 'No Names';
            const index = Math.floor(Math.random() * this.names.length);
            return this.names[index];
        }
    }

    generateResult() {
        if (this.mode === 'number') {
            if (!this.allowRepeat) {
                const available = [];
                for (let i = this.min; i <= this.max; i++) {
                    if (!this.pickedItems.includes(i)) available.push(i);
                }
                if (available.length === 0) return null;
                const index = Math.floor(Math.random() * available.length);
                return available[index];
            } else {
                return Math.floor(Math.random() * (this.max - this.min + 1)) + this.min;
            }
        } else {
            if (this.names.length === 0) return null;
            if (!this.allowRepeat) {
                const available = this.names.filter(n => !this.pickedItems.includes(n));
                if (available.length === 0) return null;
                const index = Math.floor(Math.random() * available.length);
                return available[index];
            } else {
                const index = Math.floor(Math.random() * this.names.length);
                return this.names[index];
            }
        }
    }

    show() {
        this.widget.classList.add('show');
        this.isVisible = true;

        // Translate static UI elements
        if (window.i18n) {
            const elements = this.widget.querySelectorAll('[data-i18n]');
            elements.forEach(el => {
                const key = el.getAttribute('data-i18n');
                el.textContent = window.i18n.t(key);
            });

            // Re-update button state text
            const btn = document.getElementById('random-picker-toggle-btn');
            if (this.isPicking) {
                btn.textContent = window.i18n.t('randomPicker.stop');
            } else {
                btn.textContent = window.i18n.t('randomPicker.start');
            }
        }

        // Activate button in More menu
        const btn = document.getElementById('random-picker-feature-btn');
        if (btn) btn.classList.add('active');
    }

    hide() {
        this.widget.classList.remove('show');
        this.isVisible = false;

        if (this.isPicking) {
            this.togglePicking(); // Stop if running
        }

        // Deactivate button in More menu
        const btn = document.getElementById('random-picker-feature-btn');
        if (btn) btn.classList.remove('active');
    }
}
