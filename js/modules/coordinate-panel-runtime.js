function scheduleCoordinatePanelFrame(callback) {
    if (typeof window.requestAnimationFrame === 'function') {
        window.requestAnimationFrame(callback);
        return;
    }
    callback();
}

function getCoordinateFocusTarget() {
    return document.activeElement && document.activeElement !== document.body
        ? document.activeElement
        : null;
}

function restoreCoordinateFocus(board, propertyName) {
    const restoreFocusTarget = board[propertyName];
    board[propertyName] = null;
    scheduleCoordinatePanelFrame(() => {
        restoreFocusTarget?.focus?.();
    });
}

function ensureCoordinateModalAccessibility(modal, labelledBy, describedBy) {
    if (!modal) {
        return;
    }

    modal.setAttribute('role', 'dialog');
    modal.setAttribute('aria-modal', 'true');
    modal.setAttribute('aria-labelledby', labelledBy);
    if (describedBy) {
        modal.setAttribute('aria-describedby', describedBy);
    } else {
        modal.removeAttribute('aria-describedby');
    }
    modal.tabIndex = -1;
}

function toggleCoordinateSettingsPanel(board, force) {
    const supportsCoordinateTools = board.backgroundManager.supportsMovableOrigin(board.backgroundManager.backgroundPattern);
    const wasVisible = !!board.isCoordinateSettingsExpanded;
    board.isCoordinateSettingsExpanded = supportsCoordinateTools && (typeof force === 'boolean'
        ? force
        : !board.isCoordinateSettingsExpanded);

    const modal = document.getElementById('coordinate-tools-modal');
    const toggleBtn = document.getElementById('coordinate-settings-toggle-btn');
    const closeBtn = document.getElementById('coordinate-tools-modal-close-btn');
    const firstToggle = document.getElementById('coordinate-show-ticks');
    ensureCoordinateModalAccessibility(modal, 'coordinate-tools-title', 'coordinate-tools-group');
    if (board.isCoordinateSettingsExpanded && !wasVisible) {
        board.coordinateSettingsPreviouslyFocusedElement = getCoordinateFocusTarget();
    }
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

    if (board.isCoordinateSettingsExpanded) {
        scheduleCoordinatePanelFrame(() => {
            (firstToggle || closeBtn || modal)?.focus?.();
        });
    } else if (wasVisible) {
        restoreCoordinateFocus(board, 'coordinateSettingsPreviouslyFocusedElement');
    }

    board.updateBackgroundUI();
}

function toggleCoordinatePointPanel(board, force) {
    const supportsCoordinateTools = board.backgroundManager.supportsMovableOrigin(board.backgroundManager.backgroundPattern);
    const wasVisible = !!board.isCoordinatePointPanelVisible;
    board.isCoordinatePointPanelVisible = supportsCoordinateTools && (typeof force === 'boolean'
        ? force
        : !board.isCoordinatePointPanelVisible);

    const modal = document.getElementById('coordinate-point-modal');
    const toggleBtn = document.getElementById('coordinate-point-toggle-btn');
    const closeBtn = document.getElementById('coordinate-point-modal-close-btn');
    const primaryBtn = document.getElementById('coordinate-add-point-btn');
    ensureCoordinateModalAccessibility(modal, 'coordinate-point-title');
    if (board.isCoordinatePointPanelVisible && !wasVisible) {
        board.coordinatePointPreviouslyFocusedElement = getCoordinateFocusTarget();
    }
    if (modal) {
        modal.classList.toggle('show', board.isCoordinatePointPanelVisible);
    }
    if (toggleBtn) {
        toggleBtn.classList.toggle('active', board.isCoordinatePointPanelVisible || board.isCoordinatePointMode);
        toggleBtn.setAttribute('aria-expanded', board.isCoordinatePointPanelVisible ? 'true' : 'false');
    }

    if (board.isCoordinatePointPanelVisible) {
        scheduleCoordinatePanelFrame(() => {
            board.positionCoordinatePointPanel?.();
            (primaryBtn || closeBtn || modal)?.focus?.();
        });
    }

    if (!board.isCoordinatePointPanelVisible) {
        toggleCoordinateInputPanel(board, false);
    }

    if (!board.isCoordinatePointPanelVisible && wasVisible) {
        restoreCoordinateFocus(board, 'coordinatePointPreviouslyFocusedElement');
    }

    board.updateBackgroundUI();
}

function toggleCoordinateInputPanel(board, force) {
    const supportsCoordinateTools = board.backgroundManager.supportsMovableOrigin(board.backgroundManager.backgroundPattern);
    const wasVisible = !!board.isCoordinateInputPanelVisible;
    board.isCoordinateInputPanelVisible = supportsCoordinateTools && board.isCoordinatePointPanelVisible && (typeof force === 'boolean'
        ? force
        : !board.isCoordinateInputPanelVisible);

    const keypadModal = document.getElementById('coordinate-keypad-modal');
    const keypadToggleBtn = document.getElementById('coordinate-keypad-toggle-btn');
    const closeBtn = document.getElementById('coordinate-keypad-modal-close-btn');
    const firstActionBtn = keypadModal?.querySelector('.coordinate-keypad-btn');
    ensureCoordinateModalAccessibility(keypadModal, 'coordinate-keypad-title', 'coordinate-keypad-expression-display');
    if (board.isCoordinateInputPanelVisible && !wasVisible) {
        board.coordinateKeypadPreviouslyFocusedElement = getCoordinateFocusTarget();
    }

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
        scheduleCoordinatePanelFrame(() => {
            (firstActionBtn || closeBtn || keypadModal)?.focus?.();
        });
    } else if (wasVisible) {
        if (board.coordinateKeypadSuppressFocusRestore) {
            board.coordinateKeypadSuppressFocusRestore = false;
            board.coordinateKeypadPreviouslyFocusedElement = null;
        } else {
            restoreCoordinateFocus(board, 'coordinateKeypadPreviouslyFocusedElement');
        }
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
