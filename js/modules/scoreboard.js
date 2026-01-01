// Scoreboard Module
// Handles the scoreboard functionality

class ScoreboardManager {
    constructor() {
        this.widget = document.getElementById('scoreboard-widget');
        this.modal = null;
        this.isVisible = false;

        // Data
        this.teams = [
            { name: 'Group A', score: 0, color: '#FF3B30' },
            { name: 'Group B', score: 0, color: '#007AFF' },
            { name: 'Group C', score: 0, color: '#34C759' },
            { name: 'Group D', score: 0, color: '#FF9500' }
        ];

        // State
        this.isDragging = false;
        this.dragOffset = { x: 0, y: 0 };

        this.init();
    }

    init() {
        this.renderWidget();
        this.createSettingsModal();
        this.setupEventListeners();
    }

    renderWidget() {
        // Base structure
        this.widget.innerHTML = `
            <div class="scoreboard-header">
                <div class="scoreboard-title" data-i18n="scoreboard.title">Scoreboard</div>
                <div class="scoreboard-controls-top">
                    <button class="scoreboard-icon-btn" id="scoreboard-reset-btn" title="Reset">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"></path>
                            <path d="M21 3v5h-5"></path>
                            <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"></path>
                            <path d="M3 21v-5h5"></path>
                        </svg>
                    </button>
                    <button class="scoreboard-icon-btn" id="scoreboard-settings-btn" title="Settings">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <circle cx="12" cy="12" r="3"></circle>
                            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
                        </svg>
                    </button>
                    <button class="scoreboard-icon-btn scoreboard-close-btn" id="scoreboard-close-btn" title="Close">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <line x1="18" y1="6" x2="6" y2="18"></line>
                            <line x1="6" y1="6" x2="18" y2="18"></line>
                        </svg>
                    </button>
                </div>
            </div>
            <div class="scoreboard-grid" id="scoreboard-grid">
                <!-- Team columns will be injected here -->
            </div>
        `;
        this.updateGrid();
    }

    updateGrid() {
        const grid = document.getElementById('scoreboard-grid');
        grid.innerHTML = '';

        this.teams.forEach((team, index) => {
            const col = document.createElement('div');
            col.className = 'scoreboard-column';
            col.innerHTML = `
                <div class="scoreboard-team-name" style="color: ${team.color}" title="${team.name}">${team.name}</div>
                <div class="scoreboard-score ${team.score < 0 ? 'negative' : ''}">${team.score}</div>
                <div class="scoreboard-score-controls">
                    <button class="scoreboard-score-btn minus" data-index="${index}">-1</button>
                    <button class="scoreboard-score-btn plus" data-index="${index}">+1</button>
                </div>
            `;
            grid.appendChild(col);
        });

        // Re-attach event listeners for +/- buttons
        grid.querySelectorAll('.plus').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const index = parseInt(e.target.dataset.index);
                this.updateScore(index, 1);
            });
        });

        grid.querySelectorAll('.minus').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const index = parseInt(e.target.dataset.index);
                this.updateScore(index, -1);
            });
        });

        // Re-attach event listeners for header/close buttons in case renderWidget was called
        // But here we only updated the grid, so header events persist if renderWidget called only once
    }

    updateScore(index, delta) {
        this.teams[index].score += delta;
        this.updateGrid();
    }

    createSettingsModal() {
        const modal = document.createElement('div');
        modal.id = 'scoreboard-settings-modal';
        modal.className = 'modal';
        modal.innerHTML = `
            <div class="modal-content scoreboard-modal-content">
                <div class="modal-header">
                    <h2 data-i18n="scoreboard.settingsTitle">Scoreboard Settings</h2>
                    <button class="modal-close-btn" id="scoreboard-settings-close">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <line x1="18" y1="6" x2="6" y2="18"></line>
                            <line x1="6" y1="6" x2="18" y2="18"></line>
                        </svg>
                    </button>
                </div>
                <div class="modal-body">
                    <div class="scoreboard-settings-row">
                        <span class="scoreboard-settings-label" data-i18n="scoreboard.columnCount">Teams Count</span>
                        <div class="scoreboard-counter">
                            <button class="scoreboard-counter-btn" id="team-count-minus">-</button>
                            <div class="scoreboard-counter-value" id="team-count-value">${this.teams.length}</div>
                            <button class="scoreboard-counter-btn" id="team-count-plus">+</button>
                        </div>
                    </div>

                    <div class="scoreboard-teams-list" id="scoreboard-teams-list">
                        <!-- Team settings will be injected here -->
                    </div>

                    <div class="scoreboard-settings-row" style="margin-top: 20px; border-bottom: none;">
                        <button class="confirm-btn ok-btn" id="scoreboard-settings-save" style="width: 100%;" data-i18n="common.save">Save</button>
                    </div>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
        this.modal = modal;

        // Listeners
        document.getElementById('scoreboard-settings-close').addEventListener('click', () => {
            this.modal.classList.remove('show');
        });

        document.getElementById('team-count-minus').addEventListener('click', () => {
            if (this.teams.length > 1) {
                this.teams.pop();
                this.renderSettingsList();
                document.getElementById('team-count-value').textContent = this.teams.length;
            }
        });

        document.getElementById('team-count-plus').addEventListener('click', () => {
            if (this.teams.length < 8) {
                const colors = ['#FF3B30', '#007AFF', '#34C759', '#FF9500', '#AF52DE', '#5856D6', '#FF2D55', '#5AC8FA'];
                const nextIndex = this.teams.length;
                this.teams.push({
                    name: `Group ${String.fromCharCode(65 + nextIndex)}`,
                    score: 0,
                    color: colors[nextIndex % colors.length]
                });
                this.renderSettingsList();
                document.getElementById('team-count-value').textContent = this.teams.length;
            }
        });

        document.getElementById('scoreboard-settings-save').addEventListener('click', () => {
            // Read inputs
            const inputs = document.querySelectorAll('.scoreboard-team-name-input');
            inputs.forEach((input, i) => {
                if (this.teams[i]) this.teams[i].name = input.value;
            });
            this.updateGrid();
            this.modal.classList.remove('show');
        });
    }

    renderSettingsList() {
        const list = document.getElementById('scoreboard-teams-list');
        list.innerHTML = '';
        this.teams.forEach((team, index) => {
            const item = document.createElement('div');
            item.className = 'scoreboard-team-item';
            item.innerHTML = `
                <div class="color-indicator" style="background-color: ${team.color}"></div>
                <input type="text" class="scoreboard-team-name-input" value="${team.name}" data-index="${index}">
            `;
            list.appendChild(item);
        });
    }

    setupEventListeners() {
        // Widget close button
        const closeBtn = document.getElementById('scoreboard-close-btn');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => {
                this.hide();
            });
        }

        // Reset button
        const resetBtn = document.getElementById('scoreboard-reset-btn');
        if (resetBtn) {
            resetBtn.addEventListener('click', () => {
                if (confirm(window.i18n ? window.i18n.t('scoreboard.confirmReset') : 'Reset all scores?')) {
                    this.teams.forEach(t => t.score = 0);
                    this.updateGrid();
                }
            });
        }

        // Settings button
        const settingsBtn = document.getElementById('scoreboard-settings-btn');
        if (settingsBtn) {
            settingsBtn.addEventListener('click', () => {
                this.renderSettingsList();
                document.getElementById('team-count-value').textContent = this.teams.length;
                this.modal.classList.add('show');
            });
        }

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

    show() {
        this.widget.classList.add('show');
        this.isVisible = true;

        // Translate elements
        if (window.i18n) {
            const elements = this.widget.querySelectorAll('[data-i18n]');
            elements.forEach(el => {
                const key = el.getAttribute('data-i18n');
                el.textContent = window.i18n.t(key);
            });
        }

        const btn = document.getElementById('scoreboard-feature-btn');
        if (btn) btn.classList.add('active');
    }

    hide() {
        this.widget.classList.remove('show');
        this.isVisible = false;

        const btn = document.getElementById('scoreboard-feature-btn');
        if (btn) btn.classList.remove('active');
    }
}
