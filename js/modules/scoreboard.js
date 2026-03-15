/**
 * Scoreboard Module
 * Allows users to keep score for multiple teams
 */

class ScoreboardInstance {
    constructor(id, manager, config = {}) {
        this.id = id;
        this.manager = manager;

        // Load saved state if available
        const savedState = localStorage.getItem('scoreboard_data');
        let initialTeams = null;
        if (savedState) {
            try {
                const parsed = JSON.parse(savedState);
                if (parsed.teams && Array.isArray(parsed.teams)) {
                    initialTeams = parsed.teams;
                }
            } catch (e) {
                console.error('Failed to load scoreboard data', e);
            }
        }

        // If no saved teams, use defaults with localized names
        if (!initialTeams && !config.teams) {
            const teamNameBase = window.i18n.t('scoreboard.teamDefault') || 'Team';
            initialTeams = [
                { name: `${teamNameBase} A`, score: 0 },
                { name: `${teamNameBase} B`, score: 0 }
            ];
        }

        this.config = {
            title: '',
            teams: initialTeams || config.teams,
            ...config
        };

        // UI
        this.element = null;
        this.dragOffset = { x: 0, y: 0 };
        this.isDragging = false;

        this.createElement();
    }

    saveState() {
        const data = {
            teams: this.config.teams
        };
        localStorage.setItem('scoreboard_data', JSON.stringify(data));
    }

    createElement() {
        const div = document.createElement('div');
        div.className = 'scoreboard-widget feature-widget';
        div.id = `scoreboard-${this.id}`;

        // Default position
        const offset = (this.id % 5) * 20;
        div.style.left = `${window.innerWidth / 2 - 150 + offset}px`;
        div.style.top = `${window.innerHeight / 2 - 100 + offset}px`;

        const title = this.config.title || window.i18n.t('scoreboard.title');

        div.innerHTML = `
            <div class="scoreboard-header">
                <span class="scoreboard-title">${title}</span>
                <div class="scoreboard-controls-top">
                    <button class="scoreboard-icon-btn scoreboard-add-team-btn" title="${window.i18n.t('scoreboard.addTeam')}">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <line x1="12" y1="5" x2="12" y2="19"></line>
                            <line x1="5" y1="12" x2="19" y2="12"></line>
                        </svg>
                    </button>
                    <button class="scoreboard-icon-btn scoreboard-reset-btn" title="${window.i18n.t('scoreboard.reset')}">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"></path>
                            <path d="M21 3v5h-5"></path>
                            <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"></path>
                            <path d="M3 21v-5h5"></path>
                        </svg>
                    </button>
                    <button class="scoreboard-icon-btn scoreboard-help-btn" title="${window.i18n.t('common.help')}">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <circle cx="12" cy="12" r="10"></circle>
                            <path d="M9.09 9a3 3 0 1 1 5.82 1c0 2-3 2-3 4"></path>
                            <line x1="12" y1="17" x2="12" y2="17"></line>
                        </svg>
                    </button>
                    <button class="scoreboard-icon-btn scoreboard-close-btn" title="${window.i18n.t('common.close')}">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <line x1="18" y1="6" x2="6" y2="18"></line>
                            <line x1="6" y1="6" x2="18" y2="18"></line>
                        </svg>
                    </button>
                </div>
            </div>
            <div class="scoreboard-content">
                <!-- Teams will be injected here -->
            </div>
        `;

        document.body.appendChild(div);
        this.element = div;

        this.renderTeams();
        this.setupEvents();

        // Listen for locale changes
        window.addEventListener('localeChanged', (e) => {
            this.handleLocaleChange(e.detail.locale, e.detail.oldLocale);
        });
    }

    handleLocaleChange(newLocale, oldLocale) {
        // Simple regex to match default team names in various languages
        // e.g., "Team A", "队伍 A", "Équipe A", etc.
        // We assume the pattern is "Name [A-Z]"
        const teamNameRegex = /^(.+)\s([A-Z])$/;

        // Get the default "Team" prefix for the old locale if possible
        // Since we don't have access to old translations easily, we'll try to guess based on current names
        // or just apply the new locale's default name if it matches a known pattern.

        // Better approach: Check if the name matches the *current* default name pattern
        // and if so, update it to the *new* default name pattern.

        // Since we can't easily get the old translation, we will rely on the structure.
        // If a team name ends with a space and a single uppercase letter, we assume it's a default name.

        const newTeamNameBase = window.i18n.t('scoreboard.teamDefault') || 'Team';

        let changed = false;
        this.config.teams.forEach(team => {
            const match = team.name.match(teamNameRegex);
            if (match) {
                // It looks like a default name "Something X"
                // Check if "Something" is a known localization of "Team"
                // Actually, let's just update it if it matches the pattern to the new locale
                // This might be aggressive but users requested "switch to English, team name also switch"
                const suffix = match[2];
                team.name = `${newTeamNameBase} ${suffix}`;
                changed = true;
            }
        });

        if (changed) {
            this.renderTeams();
            this.saveState();
        }
    }

    renderTeams() {
        const container = this.element.querySelector('.scoreboard-content');
        container.innerHTML = '';

        this.config.teams.forEach((team, index) => {
            const col = document.createElement('div');
            col.className = 'score-column';
            col.dataset.index = index;

            col.innerHTML = `
                <button class="score-remove-btn" title="${window.i18n.t('scoreboard.removeTeam')}">
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="4">
                        <line x1="18" y1="6" x2="6" y2="18"></line>
                        <line x1="6" y1="6" x2="18" y2="18"></line>
                    </svg>
                </button>
                <div class="score-team-name" contenteditable="true">${team.name}</div>
                <div class="score-value">${team.score}</div>
                <div class="score-controls">
                    <button class="score-btn minus">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
                            <line x1="5" y1="12" x2="19" y2="12"></line>
                        </svg>
                    </button>
                    <button class="score-btn plus">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
                            <line x1="12" y1="5" x2="12" y2="19"></line>
                            <line x1="5" y1="12" x2="19" y2="12"></line>
                        </svg>
                    </button>
                </div>
            `;

            // Name edit
            const nameEl = col.querySelector('.score-team-name');
            nameEl.addEventListener('blur', (e) => {
                this.config.teams[index].name = e.target.textContent;
                this.saveState();
            });
            nameEl.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    e.target.blur();
                }
            });

            // Score controls
            const minusBtn = col.querySelector('.score-btn.minus');
            const plusBtn = col.querySelector('.score-btn.plus');

            [minusBtn, plusBtn].forEach(btn => {
                if (btn) {
                    btn.addEventListener('mousedown', e => e.stopPropagation());
                    btn.addEventListener('pointerdown', e => e.stopPropagation());
                    btn.addEventListener('touchstart', e => e.stopPropagation());
                }
            });

            minusBtn.addEventListener('click', () => {
                this.config.teams[index].score--;
                this.updateScore(index);
                this.saveState();
            });

            plusBtn.addEventListener('click', () => {
                this.config.teams[index].score++;
                this.updateScore(index);
                this.saveState();
            });

            // Remove team button
            const removeBtn = col.querySelector('.score-remove-btn');
            if (removeBtn) {
                removeBtn.addEventListener('mousedown', e => e.stopPropagation());
                removeBtn.addEventListener('pointerdown', e => e.stopPropagation());
                removeBtn.addEventListener('touchstart', e => e.stopPropagation());

                removeBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    this.showRemoveTeamConfirmation(index);
                });
            }

            container.appendChild(col);
        });
    }

    updateScore(index) {
        const col = this.element.querySelector(`.score-column[data-index="${index}"]`);
        if (col) {
            col.querySelector('.score-value').textContent = this.config.teams[index].score;
        }
    }

    addTeam() {
        const newIndex = this.config.teams.length;
        this.config.teams.push({
            name: `${window.i18n.t('scoreboard.teamDefault')} ${String.fromCharCode(65 + newIndex)}`,
            score: 0
        });
        this.renderTeams();
        this.saveState();
    }

    removeTeam(index) {
        if (this.config.teams.length <= 1) return; // Keep at least one
        this.config.teams.splice(index, 1);
        this.renderTeams();
        this.saveState();
    }

    resetScores() {
        this.config.teams.forEach(t => t.score = 0);
        this.renderTeams();
        this.saveState();
    }

    setupEvents() {
        // Dragging
        const header = this.element.querySelector('.scoreboard-header');

        const startDrag = (e) => {
            if (e.target.closest('button')) return;
            // Stop propagation to prevent drawing
            e.stopPropagation();

            this.isDragging = true;
            this.element.classList.add('dragging');

            const clientX = e.touches ? e.touches[0].clientX : e.clientX;
            const clientY = e.touches ? e.touches[0].clientY : e.clientY;

            const rect = this.element.getBoundingClientRect();
            this.dragOffset.x = clientX - rect.left;
            this.dragOffset.y = clientY - rect.top;

            e.preventDefault();
        };

        const doDrag = (e) => {
            if (!this.isDragging) return;
            if (e.type === 'touchmove') e.preventDefault();

            const clientX = e.touches ? e.touches[0].clientX : e.clientX;
            const clientY = e.touches ? e.touches[0].clientY : e.clientY;

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

        document.addEventListener('mousemove', doDrag);
        document.addEventListener('pointermove', doDrag);
        document.addEventListener('touchmove', doDrag, { passive: false });

        document.addEventListener('mouseup', stopDrag);
        document.addEventListener('pointerup', stopDrag);
        document.addEventListener('touchend', stopDrag);
        document.addEventListener('pointercancel', stopDrag);
        document.addEventListener('touchcancel', stopDrag);

        // Buttons
        const btns = [
            this.element.querySelector('.scoreboard-close-btn'),
            this.element.querySelector('.scoreboard-add-team-btn'),
            this.element.querySelector('.scoreboard-reset-btn'),
            this.element.querySelector('.scoreboard-help-btn')
        ];

        btns.forEach(btn => {
            if (!btn) return;
            // Stop propagation to prevent drawing
            btn.addEventListener('mousedown', e => e.stopPropagation());
            btn.addEventListener('pointerdown', e => e.stopPropagation());
            btn.addEventListener('touchstart', e => e.stopPropagation());
        });

        this.element.querySelector('.scoreboard-close-btn').addEventListener('click', () => {
            this.destroy();
        });

        this.element.querySelector('.scoreboard-add-team-btn').addEventListener('click', () => {
            this.addTeam();
        });

        this.element.querySelector('.scoreboard-reset-btn').addEventListener('click', () => {
            this.showResetConfirmation();
        });

        this.element.querySelector('.scoreboard-help-btn').addEventListener('click', () => {
            window.drawingBoard?.helpSystem?.showHelp('help.features.scoreboard');
        });
    }

    showResetConfirmation() {
        // Create custom modal for reset confirmation
        const modalId = 'scoreboard-reset-modal';
        let modal = document.getElementById(modalId);

        if (!modal) {
            modal = document.createElement('div');
            modal.id = modalId;
            modal.className = 'modal';
            modal.innerHTML = `
                <div class="modal-content confirm-modal-content">
                    <div class="modal-header">
                        <h2>${window.i18n.t('scoreboard.title')}</h2>
                    </div>
                    <div class="modal-body">
                        <p class="confirm-message">${window.i18n.t('scoreboard.confirmReset')}</p>
                        <div class="confirm-buttons">
                            <button class="confirm-btn cancel-btn">${window.i18n.t('common.cancel')}</button>
                            <button class="confirm-btn ok-btn">${window.i18n.t('common.confirm')}</button>
                        </div>
                    </div>
                </div>
            `;
            document.body.appendChild(modal);

            // Event listeners
            const cancelBtn = modal.querySelector('.cancel-btn');
            const okBtn = modal.querySelector('.ok-btn');

            cancelBtn.addEventListener('click', () => {
                modal.classList.remove('show');
            });

            okBtn.addEventListener('click', () => {
                this.resetScores();
                modal.classList.remove('show');
            });

            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    modal.classList.remove('show');
                }
            });
        } else {
             // Update text in case language changed
             modal.querySelector('.modal-header h2').textContent = window.i18n.t('scoreboard.title');
             modal.querySelector('.confirm-message').textContent = window.i18n.t('scoreboard.confirmReset');
             modal.querySelector('.cancel-btn').textContent = window.i18n.t('common.cancel');
             modal.querySelector('.ok-btn').textContent = window.i18n.t('common.confirm');
        }

        modal.classList.add('show');
    }

    showRemoveTeamConfirmation(index) {
        const modalId = 'scoreboard-remove-team-modal';
        let modal = document.getElementById(modalId);

        // We need to recreate or update the listener for the current index
        // Since the index changes, let's just create a new one or handle the OK click dynamically
        // But the simplest way is to store the pending index

        if (!modal) {
            modal = document.createElement('div');
            modal.id = modalId;
            modal.className = 'modal';
            modal.innerHTML = `
                <div class="modal-content confirm-modal-content">
                    <div class="modal-header">
                        <h2>${window.i18n.t('scoreboard.title')}</h2>
                    </div>
                    <div class="modal-body">
                        <p class="confirm-message">${window.i18n.t('scoreboard.confirmRemoveTeam')}</p>
                        <div class="confirm-buttons">
                            <button class="confirm-btn cancel-btn">${window.i18n.t('common.cancel')}</button>
                            <button class="confirm-btn ok-btn">${window.i18n.t('common.confirm')}</button>
                        </div>
                    </div>
                </div>
            `;
            document.body.appendChild(modal);

            const cancelBtn = modal.querySelector('.cancel-btn');
            const okBtn = modal.querySelector('.ok-btn');

            cancelBtn.addEventListener('click', () => {
                modal.classList.remove('show');
            });

            // Store the listener function so we can remove it if we wanted to be perfectly clean,
            // but for a singleton modal, we can just assign a new one or use a data attribute.
            // Using a property on the modal element is easy.
            okBtn.addEventListener('click', () => {
                const pendingIndex = parseInt(modal.dataset.pendingIndex);
                if (!isNaN(pendingIndex)) {
                    this.removeTeam(pendingIndex);
                }
                modal.classList.remove('show');
            });

            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    modal.classList.remove('show');
                }
            });
        } else {
             // Update text
             modal.querySelector('.modal-header h2').textContent = window.i18n.t('scoreboard.title');
             modal.querySelector('.confirm-message').textContent = window.i18n.t('scoreboard.confirmRemoveTeam');
             modal.querySelector('.cancel-btn').textContent = window.i18n.t('common.cancel');
             modal.querySelector('.ok-btn').textContent = window.i18n.t('common.confirm');
        }

        modal.dataset.pendingIndex = index;
        modal.classList.add('show');
    }

    destroy() {
        this.element.remove();
        this.manager.remove(this.id);
    }
}

class ScoreboardManager {
    constructor() {
        this.instances = new Map();
        this.nextId = 1;
    }

    create() {
        const id = this.nextId++;
        const instance = new ScoreboardInstance(id, this);
        this.instances.set(id, instance);
    }

    remove(id) {
        this.instances.delete(id);
    }
}

// Export
if (typeof window !== 'undefined') {
    window.ScoreboardManager = ScoreboardManager;
}
