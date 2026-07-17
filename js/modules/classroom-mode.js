class ClassroomModeManager {
    constructor(board) {
        this.board = board;
        this.isActive = false;
        this.isTimerRunning = false;
        this.elapsedSeconds = 0;
        this.accumulatedMs = 0;
        this.runStartTimestamp = 0;
        this.timerInterval = null;
        this.bound = false;
        this.supportedTools = new Set(['pen', 'eraser', 'select', 'pan']);

        this.elements = {
            bar: document.getElementById('classroom-mode-bar'),
            modeStatus: document.getElementById('classroom-mode-status'),
            penSettingsBtn: document.getElementById('classroom-pen-settings-btn'),
            penSettings: document.getElementById('classroom-pen-settings'),
            penSizeSlider: document.getElementById('classroom-pen-size-slider'),
            penSizeValue: document.getElementById('classroom-pen-size-value'),
            undoBtn: document.getElementById('classroom-undo-btn'),
            redoBtn: document.getElementById('classroom-redo-btn'),
            prevPageBtn: document.getElementById('classroom-prev-page-btn'),
            pageStatus: document.getElementById('classroom-page-status'),
            nextPageBtn: document.getElementById('classroom-next-page-btn'),
            timerDisplay: document.getElementById('classroom-timer-display'),
            timerToggleBtn: document.getElementById('classroom-timer-toggle-btn'),
            timerResetBtn: document.getElementById('classroom-timer-reset-btn'),
            exitBtn: document.getElementById('classroom-exit-btn')
        };
        this.toolButtons = Array.from(document.querySelectorAll?.('[data-classroom-tool]') || []);
        this.colorButtons = Array.from(document.querySelectorAll?.('[data-classroom-color]') || []);

        this.bindEvents();
        this.syncBoardState();
        this.updateLocalizedLabels();
    }

    bindEvents() {
        if (this.bound) {
            return;
        }
        this.bound = true;

        this.toolButtons.forEach((button) => {
            button.addEventListener('click', () => this.selectTool(button.dataset.classroomTool));
        });
        this.colorButtons.forEach((button) => {
            button.addEventListener('click', () => this.setColor(button.dataset.classroomColor));
        });
        this.elements.penSettingsBtn?.addEventListener('click', () => this.togglePenSettings());
        this.elements.penSizeSlider?.addEventListener('input', (event) => this.setPenSize(event));
        this.elements.undoBtn?.addEventListener('click', () => this.runHistoryAction('undo'));
        this.elements.redoBtn?.addEventListener('click', () => this.runHistoryAction('redo'));
        this.elements.prevPageBtn?.addEventListener('click', () => this.goToPreviousPage());
        this.elements.nextPageBtn?.addEventListener('click', () => this.goToNextPage());
        this.elements.timerToggleBtn?.addEventListener('click', () => this.toggleTimer());
        this.elements.timerResetBtn?.addEventListener('click', () => this.resetTimer());
        this.elements.exitBtn?.addEventListener('click', () => this.exit());

        window.addEventListener('localeChanged', () => this.updateLocalizedLabels());
        document.addEventListener('pointerup', () => {
            if (this.isActive) {
                this.syncBoardState();
            }
        });
        document.addEventListener('keyup', () => {
            if (this.isActive) {
                this.syncBoardState();
            }
        });
        document.addEventListener('pointerdown', (event) => {
            if (!this.isPenSettingsOpen()) {
                return;
            }
            const target = event.target;
            if (!target?.closest?.('#classroom-pen-settings, #classroom-pen-settings-btn')) {
                this.setPenSettingsOpen(false);
            }
        }, true);
        document.addEventListener('keydown', (event) => this.handleKeydown(event), true);
    }

    handleKeydown(event) {
        if (event.key !== 'Escape' || !this.isActive) {
            return;
        }
        if (this.isPenSettingsOpen()) {
            event.preventDefault();
            event.stopPropagation?.();
            this.setPenSettingsOpen(false);
            this.elements.penSettingsBtn?.focus?.({ preventScroll: true });
            return;
        }
        if (this.hasBlockingOverlay()) {
            return;
        }
        event.preventDefault();
        this.exit();
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
            this.syncBoardState();
            return;
        }

        this.isActive = true;
        const currentTool = this.board.drawingEngine?.currentTool;
        if (!this.supportedTools.has(currentTool)) {
            this.board.exitShapeMode?.();
            this.board.setTool?.('pen', false);
        }
        this.closeTransientSurfaces();
        document.body?.classList.add('classroom-mode-active');
        this.elements.bar?.removeAttribute('hidden');
        if (this.elements.bar) {
            this.elements.bar.hidden = false;
        }
        this.syncBoardState();
        this.updateLocalizedLabels();
        this.emitModeChange(true);

        this.elements.bar?.focus?.({ preventScroll: true });
    }

    exit() {
        if (!this.isActive) {
            return;
        }

        this.isActive = false;
        this.setPenSettingsOpen(false);
        document.body?.classList.remove('classroom-mode-active');
        if (this.elements.bar) {
            this.elements.bar.hidden = true;
            this.elements.bar.setAttribute('hidden', '');
        }
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
        ['config-area', 'feature-area', 'time-display-area', 'timer-settings-modal'].forEach((id) => {
            document.getElementById(id)?.classList.remove('show');
        });
        this.board.toggleCoordinateSettingsPanel?.(false);
        this.board.toggleCoordinatePointPanel?.(false);
    }

    selectTool(tool) {
        if (!this.supportedTools.has(tool)) {
            return;
        }
        this.board.setTool?.(tool, false);
        this.closeTransientSurfaces();
        this.updateToolState();
    }

    togglePenSettings() {
        const shouldOpen = !this.isPenSettingsOpen();
        if (shouldOpen && this.board.drawingEngine?.currentTool !== 'pen') {
            this.board.setTool?.('pen', false);
        }
        this.setPenSettingsOpen(shouldOpen);
        this.syncPenSettings();
        this.updateToolState();
    }

    isPenSettingsOpen() {
        return Boolean(this.elements.penSettings && !this.elements.penSettings.hidden);
    }

    setPenSettingsOpen(open) {
        if (this.elements.penSettings) {
            this.elements.penSettings.hidden = !open;
            this.elements.penSettings.classList.toggle('show', open);
            if (open) {
                this.elements.penSettings.removeAttribute('hidden');
            } else {
                this.elements.penSettings.setAttribute('hidden', '');
            }
        }
        this.elements.penSettingsBtn?.setAttribute('aria-expanded', open ? 'true' : 'false');
    }

    setColor(color) {
        if (!/^#[0-9a-f]{6}$/i.test(String(color || ''))) {
            return;
        }
        this.board.drawingEngine?.setColor?.(color);
        this.syncBasePenColorControls(color);
        this.board.setTool?.('pen', false);
        this.syncPenSettings();
        this.updateToolState();
    }

    syncBasePenColorControls(color) {
        const normalizedColor = String(color).toUpperCase();
        let matchedPreset = false;
        document.querySelectorAll?.('.color-btn[data-color]')?.forEach((button) => {
            const active = String(button.dataset.color || '').toUpperCase() === normalizedColor;
            button.classList.toggle('active', active);
            matchedPreset ||= active;
        });
        ['custom-color-picker', 'shape-custom-color-picker'].forEach((id) => {
            const picker = document.getElementById(id);
            if (picker) {
                picker.value = color;
            }
        });
        [
            'label[for="custom-color-picker"]',
            'label[for="shape-custom-color-picker"]'
        ].forEach((selector) => {
            document.querySelector?.(selector)?.classList.toggle('active', !matchedPreset);
        });
        window.i18n?.syncGenericColorControls?.();
    }

    setPenSize(event) {
        const rawValue = Number.parseInt(event?.currentTarget?.value, 10);
        if (!Number.isFinite(rawValue)) {
            return;
        }
        const size = Math.min(50, Math.max(1, rawValue));
        this.board.drawingEngine?.setPenSize?.(size);
        this.syncBasePenSizeControls(size);
        if (this.elements.penSizeSlider) {
            this.elements.penSizeSlider.value = String(size);
        }
        if (this.elements.penSizeValue) {
            this.elements.penSizeValue.textContent = String(size);
        }
    }

    syncBasePenSizeControls(size) {
        ['pen-size-slider', 'shape-size-slider'].forEach((id) => {
            const slider = document.getElementById(id);
            if (slider) {
                slider.value = String(size);
            }
        });
        ['pen-size-value', 'shape-size-value'].forEach((id) => {
            const value = document.getElementById(id);
            if (value) {
                value.textContent = String(size);
            }
        });
        const arrowSizeSlider = document.getElementById('arrow-size-slider');
        const arrowSizeValue = document.getElementById('arrow-size-value');
        if (arrowSizeSlider && Number.parseInt(arrowSizeSlider.value, 10) < size) {
            arrowSizeSlider.value = String(size);
            if (arrowSizeValue) {
                arrowSizeValue.textContent = String(size);
            }
            this.board.shapeDrawingManager?.setArrowSize?.(size);
        }
    }

    runHistoryAction(action) {
        if (action !== 'undo' && action !== 'redo') {
            return;
        }
        const sourceButton = document.getElementById(`${action}-btn`);
        if (!sourceButton?.disabled) {
            sourceButton?.click?.();
        }
        this.updateHistoryState();
    }

    goToPreviousPage() {
        this.board.prevPage?.();
        this.syncBoardState();
    }

    goToNextPage() {
        const totalPages = this.getTotalPages();
        if (this.board.currentPage >= totalPages) {
            this.updatePageStatus();
            return;
        }
        this.board.goToPage?.(this.board.currentPage + 1);
        this.syncBoardState();
    }

    getTotalPages() {
        return Math.max(1, this.board.pages?.length || 1);
    }

    syncBoardState() {
        this.updateToolState();
        this.syncPenSettings();
        this.updateHistoryState();
        this.updatePageStatus();
        this.updateTimerDisplay();
    }

    updateToolState() {
        const currentTool = this.board.drawingEngine?.currentTool || 'pen';
        this.toolButtons.forEach((button) => {
            const active = button.dataset.classroomTool === currentTool;
            button.classList.toggle('active', active);
            button.setAttribute('aria-pressed', active ? 'true' : 'false');
        });
    }

    syncPenSettings() {
        const drawingEngine = this.board.drawingEngine;
        const currentColor = String(drawingEngine?.currentColor || '#000000').toUpperCase();
        const penSize = Math.min(50, Math.max(1, Number.parseInt(drawingEngine?.penSize, 10) || 5));

        this.colorButtons.forEach((button) => {
            const active = String(button.dataset.classroomColor || '').toUpperCase() === currentColor;
            button.classList.toggle('active', active);
            button.setAttribute('aria-pressed', active ? 'true' : 'false');
        });
        this.elements.penSettingsBtn?.style?.setProperty('--classroom-current-color', currentColor);
        if (this.elements.penSizeSlider) {
            this.elements.penSizeSlider.value = String(penSize);
        }
        if (this.elements.penSizeValue) {
            this.elements.penSizeValue.textContent = String(penSize);
        }
    }

    updateHistoryState() {
        const history = this.board.historyManager;
        if (this.elements.undoBtn) {
            this.elements.undoBtn.disabled = history?.canUndo?.() === false;
        }
        if (this.elements.redoBtn) {
            this.elements.redoBtn.disabled = history?.canRedo?.() === false;
        }
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
        this.updateTimerButtonLabel();
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
        const textTarget = element.querySelector?.('span:last-child');
        if (textTarget) {
            textTarget.textContent = this.getText(key, fallback);
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

    updateTimerButtonLabel() {
        this.setButtonLabel(
            this.elements.timerToggleBtn,
            this.isTimerRunning ? 'classroom.pauseTimer' : 'classroom.startTimer',
            this.isTimerRunning ? 'Pause timer' : 'Start timer'
        );
    }

    updateLocalizedLabels() {
        this.setTextContent(this.elements.modeStatus, 'classroom.modeActive', 'Classroom mode');
        const toolLabels = {
            pen: ['toolbar.pen', 'Pen'],
            eraser: ['toolbar.eraser', 'Eraser'],
            select: ['toolbar.select', 'Select'],
            pan: ['toolbar.move', 'Move']
        };
        this.toolButtons.forEach((button) => {
            const [key, fallback] = toolLabels[button.dataset.classroomTool] || ['', 'Tool'];
            this.setButtonLabel(button, key, fallback);
        });
        this.setButtonLabel(this.elements.penSettingsBtn, 'tools.pen.colorAndSize', 'Color and size');
        this.colorButtons.forEach((button) => {
            const colorName = button.dataset.colorName || 'black';
            this.setButtonLabel(button, `colors.${colorName}`, colorName);
        });
        this.setButtonLabel(this.elements.penSizeSlider, 'tools.pen.thickness', 'Pen thickness');
        this.setButtonLabel(this.elements.undoBtn, 'toolbar.undo', 'Undo');
        this.setButtonLabel(this.elements.redoBtn, 'toolbar.redo', 'Redo');
        this.setButtonLabel(this.elements.prevPageBtn, 'classroom.prevPage', 'Previous page');
        this.setButtonLabel(this.elements.nextPageBtn, 'classroom.nextPage', 'Next page');
        this.updateTimerButtonLabel();
        this.setButtonLabel(this.elements.timerResetBtn, 'classroom.resetTimer', 'Reset timer');
        this.setButtonLabel(this.elements.exitBtn, 'classroom.exit', 'Exit classroom mode');
        const modeLabel = this.getText('classroom.modeActive', 'Classroom mode');
        this.elements.bar?.setAttribute('aria-label', modeLabel);
    }
}

window.AboardClassroomModeManager = ClassroomModeManager;
