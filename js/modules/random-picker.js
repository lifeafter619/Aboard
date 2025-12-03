// Random Picker Module
// A simple random name picker for classroom activities

class RandomPickerManager {
    constructor() {
        this.isVisible = false;
        this.element = null;
        this.isRunning = false;
        this.names = [];
        this.intervalId = null;

        // Dragging state
        this.isDragging = false;
        this.dragOffset = { x: 0, y: 0 };

        this.createPickerElement();
        this.setupEventListeners();
    }

    createPickerElement() {
        const div = document.createElement('div');
        div.id = 'random-picker-widget';
        div.className = 'feature-widget hidden';

        const titleLabel = window.i18n ? window.i18n.t('randomPicker.title') : '随机点名';
        const placeholder = window.i18n ? window.i18n.t('randomPicker.placeholder') : '输入名字，每行一个...';
        const startLabel = window.i18n ? window.i18n.t('randomPicker.start') : '开始';
        const resetLabel = window.i18n ? window.i18n.t('common.reset') : '重置';

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
            <div class="picker-content">
                <div class="picker-display">
                    <span id="picker-result">?</span>
                </div>
                <div class="picker-input-area">
                    <textarea id="picker-names-input" placeholder="${placeholder}"></textarea>
                </div>
                <div class="picker-controls">
                    <button class="picker-btn primary" id="picker-start-btn">${startLabel}</button>
                    <button class="picker-btn secondary" id="picker-reset-btn">${resetLabel}</button>
                </div>
            </div>
        `;

        document.body.appendChild(div);
        this.element = div;
    }

    setupEventListeners() {
        // Close button
        this.element.querySelector('.widget-close-btn').addEventListener('click', () => {
            this.hide();
        });

        // Start/Stop button
        const startBtn = document.getElementById('picker-start-btn');
        startBtn.addEventListener('click', () => {
            if (this.isRunning) {
                this.stopPicking();
            } else {
                this.startPicking();
            }
        });

        // Reset button
        document.getElementById('picker-reset-btn').addEventListener('click', () => {
            this.reset();
        });

        // Input textarea - save names
        const input = document.getElementById('picker-names-input');
        input.addEventListener('change', () => {
            this.parseNames();
        });

        // Load saved names if any
        const savedNames = localStorage.getItem('randomPickerNames');
        if (savedNames) {
            input.value = savedNames;
            this.parseNames();
        }

        // Dragging (same logic as Scoreboard)
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
            e.preventDefault();
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

    parseNames() {
        const input = document.getElementById('picker-names-input');
        const text = input.value.trim();
        if (!text) {
            this.names = [];
        } else {
            this.names = text.split('\n').map(n => n.trim()).filter(n => n.length > 0);
        }
        localStorage.setItem('randomPickerNames', input.value);
    }

    startPicking() {
        this.parseNames(); // Ensure names are up to date

        if (this.names.length === 0) {
            alert(window.i18n ? window.i18n.t('randomPicker.noNames') : '请输入名字');
            return;
        }

        // Collapse input area to focus on result
        this.element.querySelector('.picker-input-area').style.display = 'none';

        this.isRunning = true;
        const startBtn = document.getElementById('picker-start-btn');
        startBtn.textContent = window.i18n ? window.i18n.t('randomPicker.stop') : '停止';
        startBtn.classList.add('stop-mode');

        const display = document.getElementById('picker-result');

        // Fast rolling animation
        this.intervalId = setInterval(() => {
            const randomIndex = Math.floor(Math.random() * this.names.length);
            display.textContent = this.names[randomIndex];
        }, 50);
    }

    stopPicking() {
        if (!this.isRunning) return;

        clearInterval(this.intervalId);
        this.isRunning = false;

        const startBtn = document.getElementById('picker-start-btn');
        startBtn.textContent = window.i18n ? window.i18n.t('randomPicker.start') : '开始';
        startBtn.classList.remove('stop-mode');

        const display = document.getElementById('picker-result');
        display.classList.add('winner');

        // Play sound if available (reuse timer beep if possible, or just visual)

        setTimeout(() => display.classList.remove('winner'), 500);
    }

    reset() {
        if (this.isRunning) this.stopPicking();

        document.getElementById('picker-result').textContent = '?';
        this.element.querySelector('.picker-input-area').style.display = 'block';
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
        this.stopPicking();
    }

    toggle() {
        if (this.isVisible) this.hide();
        else this.show();
    }

    updateLabels() {
        if (!window.i18n) return;
        this.element.querySelector('.widget-title').textContent = window.i18n.t('randomPicker.title');
        document.getElementById('picker-names-input').placeholder = window.i18n.t('randomPicker.placeholder');
        if (!this.isRunning) {
            document.getElementById('picker-start-btn').textContent = window.i18n.t('randomPicker.start');
        } else {
            document.getElementById('picker-start-btn').textContent = window.i18n.t('randomPicker.stop');
        }
        document.getElementById('picker-reset-btn').textContent = window.i18n.t('common.reset');
    }
}
