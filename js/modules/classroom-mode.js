class ClassroomModeManager {
    constructor(board) {
        this.board = board;
        this.isActive = false;
        this.isTimerRunning = false;
        this.elapsedSeconds = 0;
        this.timerInterval = null;
        this.bound = false;

        this.elements = {
            bar: document.getElementById('classroom-mode-bar'),
            prevPageBtn: document.getElementById('classroom-prev-page-btn'),
            pageStatus: document.getElementById('classroom-page-status'),
            nextPageBtn: document.getElementById('classroom-next-page-btn'),
            timerDisplay: document.getElementById('classroom-timer-display'),
            timerToggleBtn: document.getElementById('classroom-timer-toggle-btn'),
            timerResetBtn: document.getElementById('classroom-timer-reset-btn'),
            exitBtn: document.getElementById('classroom-exit-btn')
        };

        this.bindEvents();
        this.updatePageStatus();
        this.updateTimerDisplay();
        this.updateLocalizedLabels();
    }

    bindEvents() {
        if (this.bound) {
            return;
        }
        this.bound = true;

        this.elements.prevPageBtn?.addEventListener('click', () => this.goToPreviousPage());
        this.elements.nextPageBtn?.addEventListener('click', () => this.goToNextPage());
        this.elements.timerToggleBtn?.addEventListener('click', () => this.toggleTimer());
        this.elements.timerResetBtn?.addEventListener('click', () => this.resetTimer());
        this.elements.exitBtn?.addEventListener('click', () => this.exit());
        window.addEventListener('localeChanged', () => this.updateLocalizedLabels());
        document.addEventListener('keydown', (event) => {
            if (event.key === 'Escape' && this.isActive) {
                event.preventDefault();
                this.exit();
            }
        });
    }

    enter() {
        if (this.isActive) {
            this.updatePageStatus();
            this.updateTimerDisplay();
            return;
        }

        this.isActive = true;
        this.board.exitShapeMode?.();
        this.board.setTool?.('pen', false);
        this.closeTransientSurfaces();
        document.body?.classList.add('classroom-mode-active');
        this.elements.bar?.removeAttribute('hidden');
        this.updatePageStatus();
        this.updateTimerDisplay();
        this.updateLocalizedLabels();
        this.elements.timerToggleBtn?.focus?.({ preventScroll: true });
    }

    exit() {
        if (!this.isActive) {
            return;
        }

        this.isActive = false;
        document.body?.classList.remove('classroom-mode-active');
        this.pauseTimer();
        this.updateTimerDisplay();
        this.board.updatePaginationUI?.();
    }

    toggle() {
        if (this.isActive) {
            this.exit();
            return;
        }
        this.enter();
    }

    closeTransientSurfaces() {
        [
            'config-area',
            'feature-area',
            'time-display-area',
            'timer-settings-modal'
        ].forEach((id) => {
            document.getElementById(id)?.classList.remove('show');
        });
        this.board.toggleCoordinateSettingsPanel?.(false);
        this.board.toggleCoordinatePointPanel?.(false);
    }

    goToPreviousPage() {
        this.board.prevPage?.();
        this.updatePageStatus();
    }

    goToNextPage() {
        const totalPages = this.getTotalPages();
        if (this.board.currentPage >= totalPages) {
            this.updatePageStatus();
            return;
        }
        this.board.goToPage?.(this.board.currentPage + 1);
        this.updatePageStatus();
    }

    getTotalPages() {
        return Math.max(1, this.board.pages?.length || 1);
    }

    updatePageStatus() {
        const currentPage = Math.max(1, Number(this.board.currentPage) || 1);
        const totalPages = this.getTotalPages();

        if (this.elements.pageStatus) {
            this.elements.pageStatus.textContent = `${currentPage} / ${totalPages}`;
        }
        if (this.elements.prevPageBtn) {
            this.elements.prevPageBtn.disabled = currentPage <= 1;
        }
        if (this.elements.nextPageBtn) {
            this.elements.nextPageBtn.disabled = currentPage >= totalPages;
        }
    }

    toggleTimer() {
        if (this.isTimerRunning) {
            this.pauseTimer();
            return;
        }
        this.startTimer();
    }

    startTimer() {
        if (this.isTimerRunning) {
            return;
        }

        this.isTimerRunning = true;
        this.timerInterval = setInterval(() => {
            this.elapsedSeconds += 1;
            this.updateTimerDisplay();
        }, 1000);
        this.updateTimerDisplay();
    }

    pauseTimer() {
        if (!this.isTimerRunning) {
            return;
        }

        this.isTimerRunning = false;
        clearInterval(this.timerInterval);
        this.timerInterval = null;
        this.updateTimerDisplay();
    }

    resetTimer() {
        this.elapsedSeconds = 0;
        this.updateTimerDisplay();
    }

    formatElapsedTime() {
        const minutes = Math.floor(this.elapsedSeconds / 60);
        const seconds = this.elapsedSeconds % 60;
        return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    }

    updateTimerDisplay() {
        if (this.elements.timerDisplay) {
            this.elements.timerDisplay.textContent = this.formatElapsedTime();
        }
        this.elements.timerToggleBtn?.classList.toggle('timer-running', this.isTimerRunning);
        this.updateLocalizedLabels();
    }

    getText(key, fallback) {
        const translated = window.i18n?.t?.(key);
        return translated && translated !== key ? translated : fallback;
    }

    setButtonLabel(button, key, fallback) {
        if (!button) {
            return;
        }
        const label = this.getText(key, fallback);
        button.title = label;
        button.setAttribute('aria-label', label);
    }

    updateLocalizedLabels() {
        this.setButtonLabel(this.elements.prevPageBtn, 'classroom.prevPage', 'Previous page');
        this.setButtonLabel(this.elements.nextPageBtn, 'classroom.nextPage', 'Next page');
        this.setButtonLabel(
            this.elements.timerToggleBtn,
            this.isTimerRunning ? 'classroom.pauseTimer' : 'classroom.startTimer',
            this.isTimerRunning ? 'Pause timer' : 'Start timer'
        );
        this.setButtonLabel(this.elements.timerResetBtn, 'classroom.resetTimer', 'Reset timer');
        this.setButtonLabel(this.elements.exitBtn, 'classroom.exit', 'Exit classroom mode');
    }
}

window.AboardClassroomModeManager = ClassroomModeManager;
