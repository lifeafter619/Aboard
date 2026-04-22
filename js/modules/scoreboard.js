/**
 * Scoreboard Module
 * Allows users to keep score for multiple teams
 */

function getScoreboardText(key, fallback) {
    if (!window.i18n?.t) {
        return fallback;
    }

    const translated = window.i18n.t(key);
    return translated && translated !== key ? translated : fallback;
}

function escapeScoreboardHtml(value) {
    return String(value ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function safeScoreboardStorageGetItem(key) {
    try {
        return localStorage.getItem(key);
    } catch (error) {
        console.warn(`Failed to read scoreboard localStorage key "${key}":`, error);
        return null;
    }
}

function safeScoreboardStorageSetItem(key, value) {
    try {
        localStorage.setItem(key, value);
        return true;
    } catch (error) {
        console.warn(`Failed to write scoreboard localStorage key "${key}":`, error);
        return false;
    }
}

const KNOWN_DEFAULT_TEAM_NAME_BASES = new Set([
    'Team',
    'Equipe',
    '\u00c9quipe',
    'Equipo',
    '\u961f\u4f0d',
    '\u968a\u4f0d',
    '\u30c1\u30fc\u30e0',
    '\ud300'
]);

function extractDefaultTeamSuffix(teamName, knownBases = KNOWN_DEFAULT_TEAM_NAME_BASES) {
    const normalizedName = String(teamName || '').trim();
    const match = normalizedName.match(/^(.+)\s([A-Z])$/);
    if (!match) {
        return null;
    }

    const baseName = match[1].trim();
    return knownBases.has(baseName) ? match[2] : null;
}

function getActiveScoreboardInstance() {
    return window.__activeScoreboardModalInstance || null;
}

function scheduleScoreboardFrame(win = window) {
    return typeof win.requestAnimationFrame === 'function'
        ? win.requestAnimationFrame.bind(win)
        : (callback) => callback();
}

function getScoreboardFocusableElement(doc = document) {
    return doc.activeElement && doc.activeElement !== doc.body
        ? doc.activeElement
        : null;
}

function showScoreboardDialog(instance, modal, focusTarget) {
    instance.scoreboardModalPreviouslyFocusedElement = getScoreboardFocusableElement();
    modal.classList.add('show');
    scheduleScoreboardFrame()(() => {
        focusTarget?.focus?.();
    });
}

function closeScoreboardDialog(instance, modal) {
    modal.classList.remove('show');
    const restoreFocusTarget = instance.scoreboardModalPreviouslyFocusedElement;
    instance.scoreboardModalPreviouslyFocusedElement = null;
    scheduleScoreboardFrame()(() => {
        restoreFocusTarget?.focus?.();
    });
}

class ScoreboardInstance {
    constructor(id, manager, config = {}) {
        this.id = id;
        this.manager = manager;

        // Load saved state if available
        const savedState = safeScoreboardStorageGetItem('scoreboard_data');
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
        this.localeChangeHandler = null;
        this.dragMoveHandler = null;
        this.dragEndHandler = null;
        this.scoreboardModalPreviouslyFocusedElement = null;

        this.createElement();
    }

    saveState() {
        const data = {
            teams: this.config.teams
        };
        safeScoreboardStorageSetItem('scoreboard_data', JSON.stringify(data));
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
        const addTeamLabel = getScoreboardText('scoreboard.addTeam', 'Add Team');
        const resetLabel = getScoreboardText('scoreboard.reset', 'Reset');
        const helpLabel = getScoreboardText('common.help', 'Help');
        const closeLabel = getScoreboardText('common.close', 'Close');

        div.innerHTML = `
            <div class="scoreboard-header">
                <span class="scoreboard-title">${escapeScoreboardHtml(title)}</span>
                <div class="scoreboard-controls-top">
                    <button class="scoreboard-icon-btn scoreboard-add-team-btn" title="${escapeScoreboardHtml(addTeamLabel)}" aria-label="${escapeScoreboardHtml(addTeamLabel)}">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <line x1="12" y1="5" x2="12" y2="19"></line>
                            <line x1="5" y1="12" x2="19" y2="12"></line>
                        </svg>
                    </button>
                    <button class="scoreboard-icon-btn scoreboard-reset-btn" title="${escapeScoreboardHtml(resetLabel)}" aria-label="${escapeScoreboardHtml(resetLabel)}">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"></path>
                            <path d="M21 3v5h-5"></path>
                            <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"></path>
                            <path d="M3 21v-5h5"></path>
                        </svg>
                    </button>
                    <button class="scoreboard-icon-btn scoreboard-help-btn" title="${escapeScoreboardHtml(helpLabel)}" aria-label="${escapeScoreboardHtml(helpLabel)}">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <circle cx="12" cy="12" r="10"></circle>
                            <path d="M9.09 9a3 3 0 1 1 5.82 1c0 2-3 2-3 4"></path>
                            <line x1="12" y1="17" x2="12" y2="17"></line>
                        </svg>
                    </button>
                    <button class="scoreboard-icon-btn scoreboard-close-btn" title="${escapeScoreboardHtml(closeLabel)}" aria-label="${escapeScoreboardHtml(closeLabel)}">
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
        this.localeChangeHandler = (e) => {
            this.handleLocaleChange(e.detail.locale, e.detail.oldLocale);
        };
        window.addEventListener('localeChanged', this.localeChangeHandler);
    }

    handleLocaleChange(newLocale, oldLocale) {
        const newTeamNameBase = window.i18n.t('scoreboard.teamDefault') || 'Team';
        const knownDefaultBases = new Set(KNOWN_DEFAULT_TEAM_NAME_BASES);
        knownDefaultBases.add(String(newTeamNameBase).trim());

        let changed = false;
        this.config.teams.forEach(team => {
            const suffix = extractDefaultTeamSuffix(team.name, knownDefaultBases);
            if (suffix) {
                const localizedName = `${newTeamNameBase} ${suffix}`;
                if (team.name !== localizedName) {
                    team.name = localizedName;
                    changed = true;
                }
            }
        });

        if (changed) {
            this.renderTeams();
            this.saveState();
        }

        this.refreshLocalizedUI();
    }

    getScoreControlLabel(action, teamName) {
        const normalizedTeamName = String(teamName || '').trim() || getScoreboardText('scoreboard.teamDefault', 'Team');
        return action === 'decrease'
            ? getScoreboardText('scoreboard.decreaseScore', 'Decrease score for {team}').replace('{team}', normalizedTeamName)
            : getScoreboardText('scoreboard.increaseScore', 'Increase score for {team}').replace('{team}', normalizedTeamName);
    }

    renderTeams() {
        const container = this.element.querySelector('.scoreboard-content');
        container.innerHTML = '';

        this.config.teams.forEach((team, index) => {
            const col = document.createElement('div');
            col.className = 'score-column';
            col.dataset.index = index;

            const removeTeamLabel = getScoreboardText('scoreboard.removeTeam', 'Remove Team');
            col.innerHTML = `
                <button class="score-remove-btn" title="${escapeScoreboardHtml(removeTeamLabel)}" aria-label="${escapeScoreboardHtml(removeTeamLabel)}">
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="4">
                        <line x1="18" y1="6" x2="6" y2="18"></line>
                        <line x1="6" y1="6" x2="18" y2="18"></line>
                    </svg>
                </button>
                <div class="score-team-name" contenteditable="true"></div>
                <div class="score-value">${team.score}</div>
                <div class="score-controls">
                    <button class="score-btn minus" title="Decrease score" aria-label="Decrease score">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
                            <line x1="5" y1="12" x2="19" y2="12"></line>
                        </svg>
                    </button>
                    <button class="score-btn plus" title="Increase score" aria-label="Increase score">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
                            <line x1="12" y1="5" x2="12" y2="19"></line>
                            <line x1="5" y1="12" x2="19" y2="12"></line>
                        </svg>
                    </button>
                </div>
            `;

            // Name edit
            const nameEl = col.querySelector('.score-team-name');
            nameEl.textContent = team.name;
            nameEl.addEventListener('blur', (e) => {
                this.config.teams[index].name = e.target.textContent;
                this.refreshLocalizedUI();
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

        this.refreshLocalizedUI();
    }

    refreshLocalizedUI() {
        if (!this.element) {
            return;
        }

        if (!this.config.title) {
            const titleEl = this.element.querySelector('.scoreboard-title');
            if (titleEl) {
                titleEl.textContent = getScoreboardText('scoreboard.title', 'Scoreboard');
            }
        }

        const buttonLabels = [
            ['.scoreboard-add-team-btn', 'scoreboard.addTeam', 'Add Team'],
            ['.scoreboard-reset-btn', 'scoreboard.reset', 'Reset'],
            ['.scoreboard-help-btn', 'common.help', 'Help'],
            ['.scoreboard-close-btn', 'common.close', 'Close']
        ];

        buttonLabels.forEach(([selector, key, fallback]) => {
            const btn = this.element.querySelector(selector);
            if (!btn) {
                return;
            }
            const label = getScoreboardText(key, fallback);
            btn.title = label;
            btn.setAttribute('aria-label', label);
        });

        this.element.querySelectorAll('.score-remove-btn').forEach(btn => {
            const label = getScoreboardText('scoreboard.removeTeam', 'Remove Team');
            btn.title = label;
            btn.setAttribute('aria-label', label);
        });

        this.element.querySelectorAll('.score-column').forEach((column, index) => {
            const teamName = this.config.teams[index]?.name;
            const minusBtn = column.querySelector('.score-btn.minus');
            const plusBtn = column.querySelector('.score-btn.plus');

            if (minusBtn) {
                const label = this.getScoreControlLabel('decrease', teamName);
                minusBtn.title = label;
                minusBtn.setAttribute('aria-label', label);
            }

            if (plusBtn) {
                const label = this.getScoreControlLabel('increase', teamName);
                plusBtn.title = label;
                plusBtn.setAttribute('aria-label', label);
            }
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
            if (typeof e.button === 'number' && e.button !== 0) return;
            const closest = typeof e.target?.closest === 'function'
                ? e.target.closest.bind(e.target)
                : () => null;
            if (closest('button')) return;
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
            modal.setAttribute('role', 'dialog');
            modal.setAttribute('aria-modal', 'true');
            modal.setAttribute('aria-labelledby', 'scoreboard-reset-title');
            modal.setAttribute('aria-describedby', 'scoreboard-reset-message');
            modal.tabIndex = -1;
            modal.innerHTML = `
                <div class="modal-content confirm-modal-content">
                    <div class="modal-header">
                        <h2 id="scoreboard-reset-title">${escapeScoreboardHtml(window.i18n.t('scoreboard.title'))}</h2>
                    </div>
                    <div class="modal-body">
                        <p id="scoreboard-reset-message" class="confirm-message">${escapeScoreboardHtml(window.i18n.t('scoreboard.confirmReset'))}</p>
                        <div class="confirm-buttons">
                            <button type="button" class="confirm-btn cancel-btn">${escapeScoreboardHtml(window.i18n.t('common.cancel'))}</button>
                            <button type="button" class="confirm-btn ok-btn">${escapeScoreboardHtml(window.i18n.t('common.confirm'))}</button>
                        </div>
                    </div>
                </div>
            `;
            document.body.appendChild(modal);

            // Event listeners
            const cancelBtn = modal.querySelector('.cancel-btn');
            const okBtn = modal.querySelector('.ok-btn');

            cancelBtn.addEventListener('click', () => {
                closeScoreboardDialog(getActiveScoreboardInstance() || this, modal);
            });

            okBtn.addEventListener('click', () => {
                getActiveScoreboardInstance()?.resetScores?.();
                closeScoreboardDialog(getActiveScoreboardInstance() || this, modal);
            });

            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    closeScoreboardDialog(getActiveScoreboardInstance() || this, modal);
                }
            });
            modal.addEventListener('keydown', (event) => {
                if (event.key === 'Escape') {
                    event.preventDefault();
                    closeScoreboardDialog(getActiveScoreboardInstance() || this, modal);
                }
            });
        } else {
             // Update text in case language changed
             modal.querySelector('.modal-header h2').textContent = window.i18n.t('scoreboard.title');
             modal.querySelector('.confirm-message').textContent = window.i18n.t('scoreboard.confirmReset');
             modal.querySelector('.cancel-btn').textContent = window.i18n.t('common.cancel');
             modal.querySelector('.ok-btn').textContent = window.i18n.t('common.confirm');
        }

        window.__activeScoreboardModalInstance = this;

        showScoreboardDialog(this, modal, modal.querySelector('.cancel-btn') || modal);
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
            modal.setAttribute('role', 'dialog');
            modal.setAttribute('aria-modal', 'true');
            modal.setAttribute('aria-labelledby', 'scoreboard-remove-title');
            modal.setAttribute('aria-describedby', 'scoreboard-remove-message');
            modal.tabIndex = -1;
            modal.innerHTML = `
                <div class="modal-content confirm-modal-content">
                    <div class="modal-header">
                        <h2 id="scoreboard-remove-title">${escapeScoreboardHtml(window.i18n.t('scoreboard.title'))}</h2>
                    </div>
                    <div class="modal-body">
                        <p id="scoreboard-remove-message" class="confirm-message">${escapeScoreboardHtml(window.i18n.t('scoreboard.confirmRemoveTeam'))}</p>
                        <div class="confirm-buttons">
                            <button type="button" class="confirm-btn cancel-btn">${escapeScoreboardHtml(window.i18n.t('common.cancel'))}</button>
                            <button type="button" class="confirm-btn ok-btn">${escapeScoreboardHtml(window.i18n.t('common.confirm'))}</button>
                        </div>
                    </div>
                </div>
            `;
            document.body.appendChild(modal);

            const cancelBtn = modal.querySelector('.cancel-btn');
            const okBtn = modal.querySelector('.ok-btn');

            cancelBtn.addEventListener('click', () => {
                closeScoreboardDialog(getActiveScoreboardInstance() || this, modal);
            });

            // Store the listener function so we can remove it if we wanted to be perfectly clean,
            // but for a singleton modal, we can just assign a new one or use a data attribute.
            // Using a property on the modal element is easy.
            okBtn.addEventListener('click', () => {
                const activeInstance = getActiveScoreboardInstance();
                const pendingIndex = parseInt(modal.dataset.pendingIndex, 10);
                if (activeInstance && !isNaN(pendingIndex)) {
                    activeInstance.removeTeam(pendingIndex);
                }
                closeScoreboardDialog(getActiveScoreboardInstance() || this, modal);
            });

            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    closeScoreboardDialog(getActiveScoreboardInstance() || this, modal);
                }
            });
            modal.addEventListener('keydown', (event) => {
                if (event.key === 'Escape') {
                    event.preventDefault();
                    closeScoreboardDialog(getActiveScoreboardInstance() || this, modal);
                }
            });
        } else {
             // Update text
             modal.querySelector('.modal-header h2').textContent = window.i18n.t('scoreboard.title');
             modal.querySelector('.confirm-message').textContent = window.i18n.t('scoreboard.confirmRemoveTeam');
             modal.querySelector('.cancel-btn').textContent = window.i18n.t('common.cancel');
             modal.querySelector('.ok-btn').textContent = window.i18n.t('common.confirm');
        }

        window.__activeScoreboardModalInstance = this;
        modal.dataset.pendingIndex = index;
        showScoreboardDialog(this, modal, modal.querySelector('.cancel-btn') || modal);
    }

    destroy() {
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
        if (window.__activeScoreboardModalInstance === this) {
            window.__activeScoreboardModalInstance = null;
        }
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
