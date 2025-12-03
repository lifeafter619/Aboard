// Scoreboard Module
// A simple scoreboard for classroom activities

class ScoreboardManager {
    constructor() {
        this.isVisible = false;
        this.element = null;
        this.scores = {
            teamA: 0,
            teamB: 0
        };
        this.names = {
            teamA: 'Team A',
            teamB: 'Team B'
        };

        // Dragging state
        this.isDragging = false;
        this.dragOffset = { x: 0, y: 0 };

        this.createScoreboardElement();
        this.setupEventListeners();
    }

    createScoreboardElement() {
        const div = document.createElement('div');
        div.id = 'scoreboard-widget';
        div.className = 'feature-widget hidden';

        // Use i18n for initial labels if available, otherwise defaults
        const teamALabel = window.i18n ? window.i18n.t('scoreboard.teamA') : 'Team A';
        const teamBLabel = window.i18n ? window.i18n.t('scoreboard.teamB') : 'Team B';
        const titleLabel = window.i18n ? window.i18n.t('scoreboard.title') : '计分板';

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
            <div class="scoreboard-content">
                <div class="team team-a">
                    <input type="text" class="team-name" value="${teamALabel}" data-team="teamA">
                    <div class="score-display" id="score-a">0</div>
                    <div class="score-controls">
                        <button class="score-btn minus" data-team="teamA" data-action="minus">-</button>
                        <button class="score-btn plus" data-team="teamA" data-action="plus">+</button>
                    </div>
                </div>
                <div class="vs-divider">VS</div>
                <div class="team team-b">
                    <input type="text" class="team-name" value="${teamBLabel}" data-team="teamB">
                    <div class="score-display" id="score-b">0</div>
                    <div class="score-controls">
                        <button class="score-btn minus" data-team="teamB" data-action="minus">-</button>
                        <button class="score-btn plus" data-team="teamB" data-action="plus">+</button>
                    </div>
                </div>
            </div>
            <div class="scoreboard-footer">
                <button class="reset-btn" id="scoreboard-reset-btn">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"></path>
                        <path d="M21 3v5h-5"></path>
                        <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"></path>
                        <path d="M3 21v-5h5"></path>
                    </svg>
                    <span data-i18n="common.reset">重置</span>
                </button>
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

        // Score buttons
        this.element.querySelectorAll('.score-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const team = e.target.dataset.team;
                const action = e.target.dataset.action;
                this.updateScore(team, action === 'plus' ? 1 : -1);
            });
        });

        // Reset button
        document.getElementById('scoreboard-reset-btn').addEventListener('click', () => {
            this.resetScores();
        });

        // Team name inputs
        this.element.querySelectorAll('.team-name').forEach(input => {
            input.addEventListener('change', (e) => {
                this.names[e.target.dataset.team] = e.target.value;
            });
        });

        // Dragging
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

                // Boundary checks
                const windowWidth = window.innerWidth;
                const windowHeight = window.innerHeight;
                const rect = this.element.getBoundingClientRect();

                const finalX = Math.max(0, Math.min(x, windowWidth - rect.width));
                const finalY = Math.max(0, Math.min(y, windowHeight - rect.height));

                this.element.style.left = `${finalX}px`;
                this.element.style.top = `${finalY}px`;
                this.element.style.transform = 'none'; // Clear any centering transform
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

    updateScore(team, delta) {
        this.scores[team] += delta;
        if (this.scores[team] < 0) this.scores[team] = 0;

        const display = team === 'teamA' ? document.getElementById('score-a') : document.getElementById('score-b');
        display.textContent = this.scores[team];

        // Add animation class
        display.classList.add('score-updated');
        setTimeout(() => display.classList.remove('score-updated'), 300);
    }

    resetScores() {
        this.scores.teamA = 0;
        this.scores.teamB = 0;
        document.getElementById('score-a').textContent = '0';
        document.getElementById('score-b').textContent = '0';
    }

    show() {
        this.isVisible = true;
        this.element.classList.remove('hidden');

        // Center on screen if first time showing or reset position
        if (!this.element.style.left) {
            this.element.style.left = '50%';
            this.element.style.top = '50%';
            this.element.style.transform = 'translate(-50%, -50%)';
        }
    }

    hide() {
        this.isVisible = false;
        this.element.classList.add('hidden');
    }

    toggle() {
        if (this.isVisible) {
            this.hide();
        } else {
            this.show();
        }
    }

    updateLabels() {
        if (!window.i18n) return;

        const title = this.element.querySelector('.widget-title');
        if (title) title.textContent = window.i18n.t('scoreboard.title');

        const resetSpan = this.element.querySelector('.reset-btn span');
        if (resetSpan) resetSpan.textContent = window.i18n.t('common.reset');

        // Only update team names if they haven't been edited (check against default/previous)
        // Or just let user edit them manually.
    }
}
