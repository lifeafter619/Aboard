// Random Picker Module - Redesigned
// A unified widget for picking random names or numbers

class RandomPickerManager {
    constructor() {
        this.isVisible = false;
        this.element = null;
        this.isRunning = false;
        this.mode = 'names'; // 'names' | 'numbers'
        this.intervalId = null;

        // Data
        this.names = [];
        this.minNum = 1;
        this.maxNum = 50;

        // Dragging state
        this.isDragging = false;
        this.dragOffset = { x: 0, y: 0 };

        this.createPickerElement();
        this.setupEventListeners();
        this.loadSettings();
    }

    createPickerElement() {
        const div = document.createElement('div');
        div.id = 'random-picker-widget';
        div.className = 'feature-widget hidden'; // Use common widget styles

        // Labels
        const titleLabel = window.i18n ? window.i18n.t('randomPicker.title') : '随机点名';
        const namesLabel = window.i18n ? window.i18n.t('randomPicker.names') : '名字';
        const numbersLabel = window.i18n ? window.i18n.t('randomPicker.numbers') : '数字';
        const startLabel = window.i18n ? window.i18n.t('randomPicker.start') : '开始';
        const resetLabel = window.i18n ? window.i18n.t('common.reset') : '重置';
        const minLabel = window.i18n ? window.i18n.t('randomPicker.min') : '最小';
        const maxLabel = window.i18n ? window.i18n.t('randomPicker.max') : '最大';
        const placeholder = window.i18n ? window.i18n.t('randomPicker.placeholder') : '输入名字，每行一个...';

        div.innerHTML = `
            <div class="widget-header">
                <span class="widget-title">${titleLabel}</span>
                <button class="widget-close-btn">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <line x1="18" y1="6" x2="6" y2="18"></line>
                        <line x1="6" y1="6" x2="18" y2="18"></line>
                    </svg>
                </button>
            </div>

            <div class="widget-content">
                <div class="picker-mode-switch">
                    <button class="mode-btn active" data-mode="names">${namesLabel}</button>
                    <button class="mode-btn" data-mode="numbers">${numbersLabel}</button>
                </div>

                <div class="picker-result-container">
                    <div id="picker-result" class="picker-result">?</div>
                </div>

                <!-- Names Section -->
                <div id="section-names" class="picker-input-section active">
                    <textarea id="picker-names-input" class="names-input" placeholder="${placeholder}"></textarea>
                </div>

                <!-- Numbers Section -->
                <div id="section-numbers" class="picker-input-section">
                    <div class="number-range-inputs">
                        <div class="number-input-group">
                            <label>${minLabel}</label>
                            <input type="number" id="picker-min" class="widget-input" value="1">
                        </div>
                        <div class="number-input-group">
                            <label>${maxLabel}</label>
                            <input type="number" id="picker-max" class="widget-input" value="50">
                        </div>
                    </div>
                </div>

                <div class="picker-controls">
                    <button id="picker-start-btn" class="widget-btn primary">${startLabel}</button>
                    <button id="picker-reset-btn" class="widget-btn secondary">${resetLabel}</button>
                </div>
            </div>
        `;

        document.body.appendChild(div);
        this.element = div;
    }

    setupEventListeners() {
        // Prevent drawing on canvas when interacting with widget
        this.element.addEventListener('mousedown', (e) => e.stopPropagation());
        this.element.addEventListener('touchstart', (e) => e.stopPropagation());

        // Close button
        this.element.querySelector('.widget-close-btn').addEventListener('click', () => {
            this.hide();
        });

        // Mode switching
        this.element.querySelectorAll('.mode-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.setMode(e.target.dataset.mode);
            });
        });

        // Start/Stop
        const startBtn = document.getElementById('picker-start-btn');
        startBtn.addEventListener('click', () => {
            if (this.isRunning) {
                this.stop();
            } else {
                this.start();
            }
        });

        // Reset
        document.getElementById('picker-reset-btn').addEventListener('click', () => {
            this.reset();
        });

        // Inputs
        document.getElementById('picker-names-input').addEventListener('change', (e) => {
            this.parseNames(e.target.value);
            this.saveSettings();
        });

        document.getElementById('picker-min').addEventListener('change', (e) => {
            this.minNum = parseInt(e.target.value) || 1;
            this.saveSettings();
        });

        document.getElementById('picker-max').addEventListener('change', (e) => {
            this.maxNum = parseInt(e.target.value) || 50;
            this.saveSettings();
        });

        // Dragging
        this.setupDragging();
    }

    setupDragging() {
        const header = this.element.querySelector('.widget-header');

        const handleStart = (e) => {
            if (e.target.closest('.widget-close-btn')) return;

            this.isDragging = true;
            this.element.classList.add('dragging');

            const rect = this.element.getBoundingClientRect();
            const clientX = e.touches ? e.touches[0].clientX : e.clientX;
            const clientY = e.touches ? e.touches[0].clientY : e.clientY;

            this.dragOffset.x = clientX - rect.left;
            this.dragOffset.y = clientY - rect.top;

            // Critical: stop propagation to prevent drawing
            e.preventDefault();
            e.stopPropagation();
        };

        const handleMove = (e) => {
            if (!this.isDragging) return;

            const clientX = e.touches ? e.touches[0].clientX : e.clientX;
            const clientY = e.touches ? e.touches[0].clientY : e.clientY;

            requestAnimationFrame(() => {
                if (!this.isDragging) return;

                const x = clientX - this.dragOffset.x;
                const y = clientY - this.dragOffset.y;

                const windowWidth = window.innerWidth;
                const windowHeight = window.innerHeight;
                const rect = this.element.getBoundingClientRect();

                // Keep within bounds
                const finalX = Math.max(0, Math.min(x, windowWidth - rect.width));
                const finalY = Math.max(0, Math.min(y, windowHeight - rect.height));

                this.element.style.left = `${finalX}px`;
                this.element.style.top = `${finalY}px`;
                this.element.style.transform = 'none';
            });
        };

        const handleEnd = () => {
            if (this.isDragging) {
                this.isDragging = false;
                this.element.classList.remove('dragging');
            }
        };

        header.addEventListener('mousedown', handleStart);
        header.addEventListener('touchstart', handleStart, { passive: false });

        document.addEventListener('mousemove', handleMove);
        document.addEventListener('touchmove', handleMove, { passive: false });

        document.addEventListener('mouseup', handleEnd);
        document.addEventListener('touchend', handleEnd);
    }

    setMode(mode) {
        this.mode = mode;

        // Update UI buttons
        this.element.querySelectorAll('.mode-btn').forEach(btn => {
            if (btn.dataset.mode === mode) btn.classList.add('active');
            else btn.classList.remove('active');
        });

        // Show/hide sections
        document.getElementById('section-names').classList.remove('active');
        document.getElementById('section-numbers').classList.remove('active');
        document.getElementById(`section-${mode}`).classList.add('active');

        this.resetResult();
    }

    parseNames(text) {
        if (!text) {
            this.names = [];
            return;
        }
        this.names = text.split('\n')
            .map(n => n.trim())
            .filter(n => n.length > 0);
    }

    start() {
        if (this.mode === 'names') {
            const text = document.getElementById('picker-names-input').value;
            this.parseNames(text);

            if (this.names.length === 0) {
                alert(window.i18n ? window.i18n.t('randomPicker.noNames') : '请输入名字');
                return;
            }
        } else {
            // Validate numbers
            const min = parseInt(document.getElementById('picker-min').value);
            const max = parseInt(document.getElementById('picker-max').value);

            if (isNaN(min) || isNaN(max)) {
                alert('请输入有效数字');
                return;
            }
            if (min >= max) {
                alert('最小值必须小于最大值');
                return;
            }
            this.minNum = min;
            this.maxNum = max;
        }

        this.isRunning = true;
        const startBtn = document.getElementById('picker-start-btn');
        startBtn.textContent = window.i18n ? window.i18n.t('randomPicker.stop') : '停止';
        // Add style for stop button if needed, or rely on text
        startBtn.classList.add('primary'); // Make sure it's primary

        const resultEl = document.getElementById('picker-result');
        resultEl.classList.remove('highlight');

        // Start animation loop
        this.intervalId = setInterval(() => {
            this.updateRandomDisplay();
        }, 50);
    }

    stop() {
        if (!this.isRunning) return;

        clearInterval(this.intervalId);
        this.intervalId = null;
        this.isRunning = false;

        const startBtn = document.getElementById('picker-start-btn');
        startBtn.textContent = window.i18n ? window.i18n.t('randomPicker.start') : '开始';

        const resultEl = document.getElementById('picker-result');
        resultEl.classList.add('highlight');

        // Ensure final result is valid
        this.updateRandomDisplay();
    }

    updateRandomDisplay() {
        const resultEl = document.getElementById('picker-result');

        if (this.mode === 'names') {
            if (this.names.length > 0) {
                const idx = Math.floor(Math.random() * this.names.length);
                resultEl.textContent = this.names[idx];
            }
        } else {
            const range = this.maxNum - this.minNum + 1;
            const num = Math.floor(Math.random() * range) + this.minNum;
            resultEl.textContent = num;
        }
    }

    reset() {
        if (this.isRunning) this.stop();
        this.resetResult();
    }

    resetResult() {
        document.getElementById('picker-result').textContent = '?';
        document.getElementById('picker-result').classList.remove('highlight');
    }

    loadSettings() {
        const savedNames = localStorage.getItem('randomPickerNames');
        if (savedNames) {
            document.getElementById('picker-names-input').value = savedNames;
            this.parseNames(savedNames);
        }

        // Could save numbers range too, but not critical
    }

    saveSettings() {
        const names = document.getElementById('picker-names-input').value;
        localStorage.setItem('randomPickerNames', names);
    }

    show() {
        this.isVisible = true;
        this.element.classList.remove('hidden');
        if (!this.element.style.left) {
            this.element.style.left = '50%';
            this.element.style.top = '50%';
            this.element.style.transform = 'translate(-50%, -50%)';
        }
    }

    hide() {
        this.isVisible = false;
        this.element.classList.add('hidden');
        if (this.isRunning) this.stop();
    }
}

// Export
if (typeof window !== 'undefined') {
    window.RandomPickerManager = RandomPickerManager;
}
