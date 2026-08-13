const MODAL_DRAG_START_THRESHOLD = 8;
const MODAL_RESIZE_EDGE_MARGIN = 20;
const MODAL_RESIZE_MIN_WIDTH = 360;
const MODAL_RESIZE_MIN_HEIGHT = 280;

function getResizableModalConfigs() {
    return [
        {
            key: 'settingsModal',
            selector: '#settings-modal .settings-modal-content',
            minWidth: 700,
            minHeight: 420
        },
        {
            key: 'timeDisplaySettingsModal',
            selector: '#time-display-settings-modal .timer-modal-content',
            minWidth: 440,
            minHeight: 360
        },
        {
            key: 'timerSettingsModal',
            selector: '#timer-settings-modal .timer-modal-content',
            minWidth: 460,
            minHeight: 420
        },
        {
            key: 'randomPickerSettingsModal',
            selector: '#random-picker-settings-modal .random-picker-modal-content',
            minWidth: 440,
            minHeight: 360
        },
        {
            key: 'helpModal',
            selector: '#help-modal .help-modal-content',
            minWidth: 420,
            minHeight: 320
        },
        {
            key: 'announcementModal',
            selector: '#announcement-modal .announcement-modal-content',
            minWidth: 420,
            responsiveMinWidth: 320,
            minHeight: 280
        },
        {
            key: 'coordinateToolsModal',
            selector: '#coordinate-tools-modal .coordinate-tools-modal-content',
            minWidth: 420,
            minHeight: 320
        },
        {
            key: 'coordinatePointModal',
            selector: '#coordinate-point-modal .coordinate-point-modal-content',
            minWidth: 320,
            minHeight: 260,
            showResizeHandles: false,
            showHeaderActions: false
        },
        {
            key: 'coordinateKeypadModal',
            selector: '#coordinate-keypad-modal .coordinate-keypad-modal-content',
            minWidth: 320,
            minHeight: 300
        },
        {
            key: 'fontPreviewModal',
            selector: '#font-preview-modal .font-preview-modal-content',
            minWidth: 520,
            minHeight: 360
        }
    ];
}

function initResizableModals(board) {
    getResizableModalConfigs().forEach(config => {
        registerResizableModal(board, config);
    });
}

function getLocaleText(key, fallback) {
    const translated = window.i18n?.t(key);
    return translated && translated !== key ? translated : fallback;
}

function registerResizableModal(board, config) {
    const content = document.querySelector(config.selector);
    if (!content || content.dataset.modalResizeRegistered === 'true') {
        return;
    }

    const showResizeHandles = config.showResizeHandles !== false;
    const showHeaderActions = config.showHeaderActions !== false;

    content.dataset.modalResizeRegistered = 'true';
    content.dataset.modalResizeKey = config.key;
    content.dataset.modalResizeMinWidth = String(config.minWidth || MODAL_RESIZE_MIN_WIDTH);
    content.dataset.modalResizeResponsiveMinWidth = String(config.responsiveMinWidth || config.minWidth || MODAL_RESIZE_MIN_WIDTH);
    content.dataset.modalResizeMinHeight = String(config.minHeight || MODAL_RESIZE_MIN_HEIGHT);
    content.dataset.defaultInlineWidth = content.style.width || '';
    content.dataset.defaultInlineHeight = content.style.height || '';
    content.dataset.defaultInlineMaxWidth = content.style.maxWidth || '';
    content.dataset.defaultInlineMaxHeight = content.style.maxHeight || '';
    content.dataset.defaultInlineLeft = content.style.left || '';
    content.dataset.defaultInlineTop = content.style.top || '';
    content.dataset.defaultInlineRight = content.style.right || '';
    content.dataset.defaultInlineBottom = content.style.bottom || '';
    content.dataset.defaultInlinePosition = content.style.position || '';
    content.dataset.defaultInlineMargin = content.style.margin || '';
    content.dataset.defaultInlineTransform = content.style.transform || '';

    content.classList.add('resizable-modal-content');

    const header = content.querySelector('.modal-header, .timer-modal-header');
    const title = header?.querySelector('h2');
    if (header && title) {
        header.classList.add('modal-draggable-header');
        if (header.dataset.modalDragBound !== 'true') {
            header.dataset.modalDragBound = 'true';
            header.addEventListener('pointerdown', event => startModalDrag(board, event, content, header));
        }

        let titleGroup = header.querySelector('.modal-title-group');
        if (!titleGroup) {
            titleGroup = document.createElement('div');
            titleGroup.className = 'modal-title-group';
            header.insertBefore(titleGroup, title);
            titleGroup.appendChild(title);
        }

        if (!showHeaderActions) {
            content.classList.add('no-modal-header-actions');
            titleGroup.querySelectorAll('.modal-reset-size-btn, .modal-keep-centered-btn').forEach(btn => btn.remove());
        } else if (!titleGroup.querySelector('.modal-reset-size-btn')) {
            const resetButton = document.createElement('button');
            resetButton.type = 'button';
            resetButton.className = 'modal-reset-size-btn';
            resetButton.addEventListener('click', event => {
                event.stopPropagation();
                resetResizableModalSize(board, content);
            });
            titleGroup.appendChild(resetButton);
        }

        if (showHeaderActions && !titleGroup.querySelector('.modal-keep-centered-btn')) {
            const keepCenteredButton = document.createElement('button');
            keepCenteredButton.type = 'button';
            keepCenteredButton.className = 'modal-keep-centered-btn';
            keepCenteredButton.addEventListener('click', event => {
                event.stopPropagation();
                toggleModalKeepCentered(board, content);
            });
            titleGroup.appendChild(keepCenteredButton);
        }
    }

    if (!showResizeHandles) {
        content.classList.add('no-modal-resize-handles');
        content.querySelectorAll('.modal-resize-handle').forEach(handle => handle.remove());
    } else {
        ['top-left', 'top-right', 'bottom-left', 'bottom-right'].forEach(handleName => {
            const handle = document.createElement('div');
            handle.className = `modal-resize-handle ${handleName}`;
            handle.dataset.handle = handleName;
            handle.addEventListener('pointerdown', event => startModalResize(board, event, content, handleName));
            content.appendChild(handle);
        });
    }

    syncResizableModalState(board, content);
}

function resolveResizableModalContent(target) {
    return typeof target === 'string'
        ? document.querySelector(`#${target} .settings-modal-content, #${target} .timer-modal-content, #${target} .random-picker-modal-content, #${target} .help-modal-content, #${target} .announcement-modal-content`)
        : target;
}

function syncResizableModalState(board, target) {
    const content = resolveResizableModalContent(target);
    if (!content) {
        return;
    }

    const modalKey = content.dataset.modalResizeKey;
    const savedSize = board.settingsManager.getModalSizePreference(modalKey);
    const keepCentered = board.settingsManager.getModalCenterPreference(modalKey);
    if (savedSize) {
        applyCustomModalLayout(board, content, savedSize.width, savedSize.height, keepCentered);
    } else {
        restoreDefaultModalLayout(content);
    }
    updateModalHeaderActionButtons(board, content);
}

function startModalDrag(board, event, content, header) {
    if (!content || !header) {
        return;
    }

    if (event.pointerType === 'mouse' && event.button !== 0) {
        return;
    }

    if (event.target?.closest('.modal-resize-handle, button, input, select, textarea, a, [contenteditable="true"]')) {
        return;
    }

    event.preventDefault();
    event.stopPropagation();

    const startRect = content.getBoundingClientRect();
    board.modalDragState = {
        content,
        header,
        pointerId: Number.isFinite(event.pointerId) ? event.pointerId : null,
        startX: event.clientX,
        startY: event.clientY,
        offsetX: event.clientX - startRect.left,
        offsetY: event.clientY - startRect.top,
        width: startRect.width,
        height: startRect.height,
        keepCentered: board.settingsManager.getModalCenterPreference(content.dataset.modalResizeKey),
        hasStarted: false,
        moveHandler: null,
        endHandler: null
    };

    const moveHandler = moveEvent => handleModalDrag(board, moveEvent);
    const endHandler = endEvent => finishModalDrag(board, endEvent);
    board.modalDragState.moveHandler = moveHandler;
    board.modalDragState.endHandler = endHandler;

    document.addEventListener('pointermove', moveHandler);
    document.addEventListener('pointerup', endHandler);
    document.addEventListener('pointercancel', endHandler);
}

function handleModalDrag(board, event) {
    const state = board.modalDragState;
    if (!state?.content) {
        return;
    }

    if (state.pointerId !== null && event.pointerId !== state.pointerId) {
        return;
    }

    if (event.pointerType === 'mouse' && event.buttons === 0) {
        finishModalDrag(board, event);
        return;
    }

    const dx = event.clientX - state.startX;
    const dy = event.clientY - state.startY;

    if (!state.hasStarted) {
        if (Math.hypot(dx, dy) < MODAL_DRAG_START_THRESHOLD) {
            return;
        }

        state.hasStarted = true;

        if (state.keepCentered) {
            board.settingsManager.setModalCenterPreference(state.content.dataset.modalResizeKey, false);
            updateModalHeaderActionButtons(board, state.content);
        }

        applyCustomModalLayout(board, state.content, state.width, state.height, false);
        state.content.classList.add('modal-dragging');
    }

    event.preventDefault();

    let left = event.clientX - state.offsetX;
    let top = event.clientY - state.offsetY;

    const maxLeft = Math.max(MODAL_RESIZE_EDGE_MARGIN, window.innerWidth - MODAL_RESIZE_EDGE_MARGIN - state.width);
    const maxTop = Math.max(MODAL_RESIZE_EDGE_MARGIN, window.innerHeight - MODAL_RESIZE_EDGE_MARGIN - state.height);

    left = Math.min(maxLeft, Math.max(MODAL_RESIZE_EDGE_MARGIN, left));
    top = Math.min(maxTop, Math.max(MODAL_RESIZE_EDGE_MARGIN, top));

    state.content.style.left = `${Math.round(left)}px`;
    state.content.style.top = `${Math.round(top)}px`;
}

function finishModalDrag(board, event = null) {
    const state = board.modalDragState;
    if (!state?.content) {
        return;
    }

    if (event && state.pointerId !== null && event.pointerId !== state.pointerId) {
        return;
    }

    document.removeEventListener('pointermove', state.moveHandler);
    document.removeEventListener('pointerup', state.endHandler);
    document.removeEventListener('pointercancel', state.endHandler);

    state.content.classList.remove('modal-dragging');
    board.modalDragState = null;
}

function updateModalHeaderActionButtons(board, content) {
    const resetButton = content?.querySelector('.modal-reset-size-btn');
    const keepCenteredButton = content?.querySelector('.modal-keep-centered-btn');
    if (!resetButton && !keepCenteredButton) {
        return;
    }

    const modalKey = content.dataset.modalResizeKey;
    const hasCustomSize = Boolean(board.settingsManager.getModalSizePreference(modalKey));
    const keepCentered = board.settingsManager.getModalCenterPreference(modalKey);
    const restoreSizeText = getLocaleText('common.restoreSize', 'Restore Size');
    const keepCenteredText = getLocaleText('common.keepCentered', 'Keep Centered');

    if (resetButton) {
        resetButton.textContent = restoreSizeText;
        resetButton.classList.toggle('show', hasCustomSize);
    }
    if (keepCenteredButton) {
        keepCenteredButton.textContent = keepCenteredText;
        keepCenteredButton.classList.toggle('show', hasCustomSize);
        keepCenteredButton.classList.toggle('active', hasCustomSize && keepCentered);
        keepCenteredButton.setAttribute('aria-pressed', String(hasCustomSize && keepCentered));
    }
}

function getModalLayoutBounds(content) {
    const availableWidth = Math.max(260, window.innerWidth - MODAL_RESIZE_EDGE_MARGIN * 2);
    const availableHeight = Math.max(220, window.innerHeight - MODAL_RESIZE_EDGE_MARGIN * 2);
    const responsiveMinWidth = parseFloat(content.dataset.modalResizeResponsiveMinWidth) || MODAL_RESIZE_MIN_WIDTH;
    const desktopMinWidth = parseFloat(content.dataset.modalResizeMinWidth) || responsiveMinWidth;
    const configuredMinWidth = window.innerWidth <= 480 ? responsiveMinWidth : Math.max(responsiveMinWidth, desktopMinWidth);
    const configuredMinHeight = Math.max(MODAL_RESIZE_MIN_HEIGHT, parseFloat(content.dataset.modalResizeMinHeight) || MODAL_RESIZE_MIN_HEIGHT);
    const maxWidth = availableWidth;
    const maxHeight = availableHeight;
    const minWidth = Math.min(configuredMinWidth, maxWidth);
    const minHeight = Math.min(configuredMinHeight, maxHeight);
    return { minWidth, minHeight, maxWidth, maxHeight };
}

function applyCustomModalLayout(_board, content, desiredWidth, desiredHeight, centerInViewport = false) {
    if (!content) {
        return;
    }

    const { minWidth, minHeight, maxWidth, maxHeight } = getModalLayoutBounds(content);
    const width = Math.min(maxWidth, Math.max(minWidth, Math.round(desiredWidth)));
    const height = Math.min(maxHeight, Math.max(minHeight, Math.round(desiredHeight)));

    content.classList.add('modal-custom-sized');
    content.style.position = 'fixed';
    content.style.width = `${width}px`;
    content.style.height = `${height}px`;
    content.style.maxWidth = `${maxWidth}px`;
    content.style.maxHeight = `${maxHeight}px`;
    content.style.right = 'auto';
    content.style.bottom = 'auto';
    content.style.margin = '0';
    content.style.transform = 'none';

    let left = parseFloat(content.style.left);
    let top = parseFloat(content.style.top);

    if (centerInViewport || !Number.isFinite(left) || !Number.isFinite(top)) {
        left = Math.round((window.innerWidth - width) / 2);
        top = Math.round((window.innerHeight - height) / 2);
    }

    const maxLeft = Math.max(MODAL_RESIZE_EDGE_MARGIN, window.innerWidth - MODAL_RESIZE_EDGE_MARGIN - width);
    const maxTop = Math.max(MODAL_RESIZE_EDGE_MARGIN, window.innerHeight - MODAL_RESIZE_EDGE_MARGIN - height);

    content.style.left = `${Math.min(maxLeft, Math.max(MODAL_RESIZE_EDGE_MARGIN, left))}px`;
    content.style.top = `${Math.min(maxTop, Math.max(MODAL_RESIZE_EDGE_MARGIN, top))}px`;
}

function restoreDefaultModalLayout(content) {
    if (!content) {
        return;
    }

    content.classList.remove('modal-custom-sized');
    content.style.width = content.dataset.defaultInlineWidth || '';
    content.style.height = content.dataset.defaultInlineHeight || '';
    content.style.maxWidth = content.dataset.defaultInlineMaxWidth || '';
    content.style.maxHeight = content.dataset.defaultInlineMaxHeight || '';
    content.style.left = content.dataset.defaultInlineLeft || '';
    content.style.top = content.dataset.defaultInlineTop || '';
    content.style.right = content.dataset.defaultInlineRight || '';
    content.style.bottom = content.dataset.defaultInlineBottom || '';
    content.style.position = content.dataset.defaultInlinePosition || '';
    content.style.margin = content.dataset.defaultInlineMargin || '';
    content.style.transform = content.dataset.defaultInlineTransform || '';
}

function resetResizableModalSize(board, content) {
    if (!content) {
        return;
    }

    const modalKey = content.dataset.modalResizeKey;
    board.settingsManager.resetModalSizePreference(modalKey);
    board.settingsManager.resetModalCenterPreference(modalKey);
    restoreDefaultModalLayout(content);
    updateModalHeaderActionButtons(board, content);
}

function toggleModalKeepCentered(board, content) {
    if (!content) {
        return;
    }

    const modalKey = content.dataset.modalResizeKey;
    if (!board.settingsManager.getModalSizePreference(modalKey)) {
        return;
    }

    const nextValue = !board.settingsManager.getModalCenterPreference(modalKey);
    board.settingsManager.setModalCenterPreference(modalKey, nextValue);
    if (nextValue) {
        const rect = content.getBoundingClientRect();
        applyCustomModalLayout(board, content, rect.width, rect.height, true);
    }
    updateModalHeaderActionButtons(board, content);
}

function startModalResize(board, event, content, handleName) {
    if (!content || !handleName) {
        return;
    }

    if (typeof event.button === 'number' && event.button !== 0) {
        return;
    }

    event.preventDefault();
    event.stopPropagation();

    const rect = content.getBoundingClientRect();
    applyCustomModalLayout(board, content, rect.width, rect.height, false);

    board.modalResizeState = {
        content,
        handleName,
        pointerId: typeof event.pointerId === 'number' ? event.pointerId : null,
        startX: event.clientX,
        startY: event.clientY,
        startRect: content.getBoundingClientRect(),
        keepCentered: board.settingsManager.getModalCenterPreference(content.dataset.modalResizeKey)
    };

    content.classList.add('modal-resizing');
    const moveHandler = moveEvent => handleModalResize(board, moveEvent);
    const endHandler = () => finishModalResize(board);
    board.modalResizeState.moveHandler = moveHandler;
    board.modalResizeState.endHandler = endHandler;

    document.addEventListener('pointermove', moveHandler);
    document.addEventListener('pointerup', endHandler, { once: true });
    document.addEventListener('pointercancel', endHandler, { once: true });
}

function handleModalResize(board, event) {
    const state = board.modalResizeState;
    if (!state?.content) {
        return;
    }

    if (state.pointerId !== null && event.pointerId !== state.pointerId) {
        return;
    }

    // Self-heal a missed pointerup (released outside the window): without
    // this the modal keeps resizing with no button held and the garbled size
    // is then persisted. Mirrors the drag handler's guard.
    if (event.pointerType === 'mouse' && event.buttons === 0) {
        finishModalResize(board);
        return;
    }

    event.preventDefault();

    const { content, handleName, startRect, startX, startY, keepCentered } = state;
    const { minWidth, minHeight, maxWidth, maxHeight } = getModalLayoutBounds(content);
    const startRight = startRect.left + startRect.width;
    const startBottom = startRect.top + startRect.height;
    const dx = event.clientX - startX;
    const dy = event.clientY - startY;

    let left = startRect.left;
    let top = startRect.top;
    let width = startRect.width;
    let height = startRect.height;

    if (handleName.includes('left')) {
        left = Math.min(startRight - minWidth, Math.max(MODAL_RESIZE_EDGE_MARGIN, startRect.left + dx));
        width = startRight - left;
    } else {
        width = Math.max(minWidth, Math.min(maxWidth, startRect.width + dx));
    }

    if (handleName.includes('top')) {
        top = Math.min(startBottom - minHeight, Math.max(MODAL_RESIZE_EDGE_MARGIN, startRect.top + dy));
        height = startBottom - top;
    } else {
        height = Math.max(minHeight, Math.min(maxHeight, startRect.height + dy));
    }

    width = Math.min(maxWidth, Math.max(minWidth, width));
    height = Math.min(maxHeight, Math.max(minHeight, height));

    if (keepCentered) {
        left = (window.innerWidth - width) / 2;
        top = (window.innerHeight - height) / 2;
    } else {
        if (handleName.includes('left')) {
            left = startRight - width;
        } else {
            left = Math.min(Math.max(MODAL_RESIZE_EDGE_MARGIN, left), window.innerWidth - MODAL_RESIZE_EDGE_MARGIN - width);
        }

        if (handleName.includes('top')) {
            top = startBottom - height;
        } else {
            top = Math.min(Math.max(MODAL_RESIZE_EDGE_MARGIN, top), window.innerHeight - MODAL_RESIZE_EDGE_MARGIN - height);
        }
    }

    content.style.left = `${Math.round(left)}px`;
    content.style.top = `${Math.round(top)}px`;
    content.style.width = `${Math.round(width)}px`;
    content.style.height = `${Math.round(height)}px`;
}

function finishModalResize(board) {
    const state = board.modalResizeState;
    if (!state?.content) {
        return;
    }

    document.removeEventListener('pointermove', state.moveHandler);
    // The two end listeners are registered with {once:true}, but only the one
    // that fired auto-removes itself — drop the other one too, or a later
    // unrelated pointercancel would terminate the next resize mid-gesture.
    document.removeEventListener('pointerup', state.endHandler);
    document.removeEventListener('pointercancel', state.endHandler);
    state.content.classList.remove('modal-resizing');

    const rect = state.content.getBoundingClientRect();
    board.settingsManager.setModalSizePreference(state.content.dataset.modalResizeKey, {
        width: rect.width,
        height: rect.height
    });
    updateModalHeaderActionButtons(board, state.content);
    board.modalResizeState = null;
}

function repositionModalsOnResize(board) {
    getResizableModalConfigs().forEach(config => {
        const modalContent = document.querySelector(config.selector);
        if (!modalContent) {
            return;
        }

        const modalKey = modalContent.dataset.modalResizeKey;
        const savedSize = board.settingsManager.getModalSizePreference(modalKey);
        const keepCentered = board.settingsManager.getModalCenterPreference(modalKey);
        if (savedSize) {
            applyCustomModalLayout(board, modalContent, savedSize.width, savedSize.height, keepCentered);
        } else {
            restoreDefaultModalLayout(modalContent);
        }
        updateModalHeaderActionButtons(board, modalContent);
    });
}

window.AboardModalRuntime = {
    MODAL_DRAG_START_THRESHOLD,
    MODAL_RESIZE_EDGE_MARGIN,
    MODAL_RESIZE_MIN_WIDTH,
    MODAL_RESIZE_MIN_HEIGHT,
    getResizableModalConfigs,
    initResizableModals,
    getLocaleText,
    registerResizableModal,
    syncResizableModalState,
    startModalDrag,
    handleModalDrag,
    finishModalDrag,
    updateModalHeaderActionButtons,
    getModalLayoutBounds,
    applyCustomModalLayout,
    restoreDefaultModalLayout,
    resetResizableModalSize,
    toggleModalKeepCentered,
    startModalResize,
    handleModalResize,
    finishModalResize,
    repositionModalsOnResize
};
