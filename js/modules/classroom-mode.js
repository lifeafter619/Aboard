class ClassroomModeManager {
    constructor(board) {
        this.board = board;
        this.isActive = false;
        this.isTimerRunning = false;
        this.elapsedSeconds = 0;
        // Time is tracked from real timestamps rather than counting interval
        // ticks: backgrounded tabs throttle (or freeze) setInterval, so a
        // tick-counting timer drifts behind wall-clock whenever the teacher
        // switches windows or the panel sleeps. accumulatedMs holds completed
        // run time; runStartTimestamp marks the start of the current run.
        this.accumulatedMs = 0;
        this.runStartTimestamp = 0;
        this.timerInterval = null;
        this.bound = false;

        this.elements = {
            bar: document.getElementById('classroom-mode-bar'),
            modeStatus: document.getElementById('classroom-mode-status'),
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
                if (this.hasBlockingOverlay()) {
                    // A visible overlay above the classroom bar (fullscreen
                    // timer/clock, any modal) owns this Escape press; let its
                    // own handler close it instead of exiting classroom mode.
                    return;
                }
                event.preventDefault();
                this.exit();
            }
        }, true); // capture: overlays close themselves on Escape before this
                  // check runs in bubble phase, which made the same key press
                  // also exit classroom mode.
    }

    hasBlockingOverlay() {
        return Boolean(document.querySelector?.(
            '.timer-fullscreen-modal.show, .time-fullscreen-modal.show, .modal.show, '
            + '[role="dialog"][aria-modal="true"].show, '
            + '#timer-settings-modal.show, #time-display-settings-modal.show'
        ));
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
        this.emitModeChange(true);
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
        this.emitModeChange(false);
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
        this.runStartTimestamp = Date.now();
        // Tick frequently so the visible display stays smooth, but derive the
        // shown value from elapsed wall-clock time inside syncElapsedFromClock
        // so throttled/missed ticks never lose time.
        this.timerInterval = setInterval(() => {
            this.syncElapsedFromClock();
            this.updateTimerDisplay();
        }, 250);
        this.syncElapsedFromClock();
        this.updateTimerDisplay();
    }

    pauseTimer() {
        if (!this.isTimerRunning) {
            return;
        }

        // Fold the current run into the accumulated total before stopping so
        // resuming continues from the correct elapsed time.
        this.accumulatedMs += Math.max(0, Date.now() - this.runStartTimestamp);
        this.runStartTimestamp = 0;
        this.isTimerRunning = false;
        clearInterval(this.timerInterval);
        this.timerInterval = null;
        this.syncElapsedFromClock();
        this.updateTimerDisplay();
    }

    resetTimer() {
        this.accumulatedMs = 0;
        this.runStartTimestamp = this.isTimerRunning ? Date.now() : 0;
        this.elapsedSeconds = 0;
        this.updateTimerDisplay();
    }

    // Recompute elapsedSeconds from real timestamps. Robust to setInterval
    // throttling in backgrounded tabs and to the device sleeping mid-run.
    syncElapsedFromClock() {
        let totalMs = this.accumulatedMs;
        if (this.isTimerRunning && this.runStartTimestamp) {
            totalMs += Math.max(0, Date.now() - this.runStartTimestamp);
        }
        this.elapsedSeconds = Math.floor(totalMs / 1000);
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

    setTextContent(element, key, fallback) {
        if (!element) {
            return;
        }
        element.textContent = this.getText(key, fallback);
    }

    emitModeChange(active) {
        if (typeof window.CustomEvent !== 'function' || typeof window.dispatchEvent !== 'function') {
            return;
        }
        window.dispatchEvent(new window.CustomEvent('classroomModeChanged', {
            detail: { active }
        }));
    }

    updateLocalizedLabels() {
        this.setTextContent(this.elements.modeStatus, 'classroom.modeActive', 'Classroom mode');
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
