function toggleCoordinateSettingsPanel(board, force) {
    const supportsCoordinateTools = board.backgroundManager.supportsMovableOrigin(board.backgroundManager.backgroundPattern);
    board.isCoordinateSettingsExpanded = supportsCoordinateTools && (typeof force === 'boolean'
        ? force
        : !board.isCoordinateSettingsExpanded);

    const modal = document.getElementById('coordinate-tools-modal');
    const toggleBtn = document.getElementById('coordinate-settings-toggle-btn');
    if (modal) {
        modal.classList.toggle('show', board.isCoordinateSettingsExpanded);
    }
    if (toggleBtn) {
        toggleBtn.classList.toggle('active', board.isCoordinateSettingsExpanded);
        toggleBtn.setAttribute('aria-expanded', board.isCoordinateSettingsExpanded ? 'true' : 'false');
    }

    if (!board.isCoordinateSettingsExpanded) {
        toggleCoordinateInputPanel(board, false);
    }

    board.updateBackgroundUI();
}

function toggleCoordinatePointPanel(board, force) {
    const supportsCoordinateTools = board.backgroundManager.supportsMovableOrigin(board.backgroundManager.backgroundPattern);
    board.isCoordinatePointPanelVisible = supportsCoordinateTools && (typeof force === 'boolean'
        ? force
        : !board.isCoordinatePointPanelVisible);

    const modal = document.getElementById('coordinate-point-modal');
    const toggleBtn = document.getElementById('coordinate-point-toggle-btn');
    if (modal) {
        modal.classList.toggle('show', board.isCoordinatePointPanelVisible);
    }
    if (toggleBtn) {
        toggleBtn.classList.toggle('active', board.isCoordinatePointPanelVisible || board.isCoordinatePointMode);
        toggleBtn.setAttribute('aria-expanded', board.isCoordinatePointPanelVisible ? 'true' : 'false');
    }

    if (board.isCoordinatePointPanelVisible) {
        requestAnimationFrame(() => board.positionCoordinatePointPanel());
    }

    if (!board.isCoordinatePointPanelVisible) {
        toggleCoordinateInputPanel(board, false);
    }

    board.updateBackgroundUI();
}

function toggleCoordinateInputPanel(board, force) {
    const supportsCoordinateTools = board.backgroundManager.supportsMovableOrigin(board.backgroundManager.backgroundPattern);
    board.isCoordinateInputPanelVisible = supportsCoordinateTools && board.isCoordinatePointPanelVisible && (typeof force === 'boolean'
        ? force
        : !board.isCoordinateInputPanelVisible);

    const keypadModal = document.getElementById('coordinate-keypad-modal');
    const keypadToggleBtn = document.getElementById('coordinate-keypad-toggle-btn');

    if (keypadModal) {
        keypadModal.classList.toggle('show', board.isCoordinateInputPanelVisible);
    }

    if (keypadToggleBtn) {
        keypadToggleBtn.classList.toggle('active', board.isCoordinateInputPanelVisible);
        keypadToggleBtn.setAttribute('aria-expanded', board.isCoordinateInputPanelVisible ? 'true' : 'false');
    }

    if (board.isCoordinateInputPanelVisible) {
        syncCoordinateInputPanelButtons(board);
        board.syncCoordinateExpressionDisplay();
    }
}

function syncCoordinateInputPanelButtons(board) {
    const variableBtn = document.querySelector('[data-coordinate-variable-btn]');
    if (!variableBtn) {
        return;
    }

    const isPolar = board.backgroundManager.backgroundPattern === 'polar';
    variableBtn.textContent = isPolar ? 'θ' : 'x';
    variableBtn.title = isPolar ? 'theta' : 'x';
}

function insertCoordinateExpressionAtCursor(board, value) {
    const input = document.getElementById('coordinate-expression-input');
    if (!input) {
        return;
    }

    input.focus();
    const start = input.selectionStart ?? input.value.length;
    const end = input.selectionEnd ?? input.value.length;

    if (typeof input.setRangeText === 'function') {
        input.setRangeText(value, start, end, 'end');
        board.syncCoordinateExpressionDisplay();
        return;
    }

    input.value = `${input.value.slice(0, start)}${value}${input.value.slice(end)}`;
    const nextCursor = start + value.length;
    input.setSelectionRange(nextCursor, nextCursor);
    board.syncCoordinateExpressionDisplay();
}

function handleCoordinateExpressionAction(board, action) {
    const input = document.getElementById('coordinate-expression-input');
    if (!input) {
        return;
    }

    input.focus();
    const start = input.selectionStart ?? input.value.length;
    const end = input.selectionEnd ?? input.value.length;

    if (action === 'clear') {
        input.value = '';
        input.setSelectionRange(0, 0);
        board.syncCoordinateExpressionDisplay();
        return;
    }

    if (action === 'backspace') {
        if (typeof input.setRangeText === 'function') {
            if (start !== end) {
                input.setRangeText('', start, end, 'end');
            } else if (start > 0) {
                input.setRangeText('', start - 1, start, 'end');
            }
            board.syncCoordinateExpressionDisplay();
            return;
        }

        if (start !== end) {
            input.value = `${input.value.slice(0, start)}${input.value.slice(end)}`;
            input.setSelectionRange(start, start);
        } else if (start > 0) {
            const nextCursor = start - 1;
            input.value = `${input.value.slice(0, nextCursor)}${input.value.slice(start)}`;
            input.setSelectionRange(nextCursor, nextCursor);
        }
        board.syncCoordinateExpressionDisplay();
    }
}

window.AboardCoordinatePanelRuntime = {
    toggleCoordinateSettingsPanel,
    toggleCoordinatePointPanel,
    toggleCoordinateInputPanel,
    syncCoordinateInputPanelButtons,
    insertCoordinateExpressionAtCursor,
    handleCoordinateExpressionAction
};
