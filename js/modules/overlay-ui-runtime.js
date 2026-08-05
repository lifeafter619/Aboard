function closeConfigPanel(board) {
    const configArea = document.getElementById('config-area');
    configArea?.classList.remove('show');
    board.toggleCoordinateSettingsPanel(false);
    board.toggleCoordinatePointPanel(false);
    board.exitShapeMode();
}

function closeFeaturePanel(board) {
    const featureArea = document.getElementById('feature-area');
    const moreButton = document.getElementById('more-btn');
    const shouldRestoreFocus = Boolean(featureArea?.contains?.(document.activeElement));
    featureArea?.classList.remove('show');
    if (featureArea) {
        featureArea.setAttribute('aria-hidden', 'true');
    }
    if (moreButton) {
        moreButton.setAttribute('aria-expanded', 'false');
    }
    if (board?.drawingEngine?.currentTool === 'more') {
        board.setTool?.('pan', false);
    }
    if (shouldRestoreFocus && typeof moreButton?.focus === 'function') {
        try {
            moreButton.focus({ preventScroll: true });
        } catch (error) {
            moreButton.focus();
        }
    }
}

function handleMoreFeaturePanelAfterAction(board) {
    if (!board.settingsManager.keepMorePanelOpen) {
        closeFeaturePanel(board);
    }
}

function scheduleOverlayFrame(callback) {
    if (typeof window.requestAnimationFrame === 'function') {
        window.requestAnimationFrame(callback);
        return;
    }
    callback();
}

function openSettings(board) {
    const modal = document.getElementById('settings-modal');
    const closeBtn = document.getElementById('settings-close-btn');

    board.ensureSettingsSurfaceReady?.();
    if (modal) {
        modal.setAttribute('role', 'dialog');
        modal.setAttribute('aria-modal', 'true');
        modal.setAttribute('aria-labelledby', 'settings-modal-title');
        modal.tabIndex = -1;

        if (modal.dataset.keyboardBindingsInitialized !== 'true') {
            modal.dataset.keyboardBindingsInitialized = 'true';
            modal.addEventListener('keydown', (event) => {
                if (event.key === 'Escape') {
                    event.preventDefault();
                    board.closeSettings();
                }
            });
        }
    }

    board.settingsPreviouslyFocusedElement = document.activeElement && document.activeElement !== document.body
        ? document.activeElement
        : null;
    board.syncResizableModalState('settings-modal');
    modal?.classList.add('show');
    scheduleOverlayFrame(() => {
        board.updateCacheSizeDisplay?.();
    });
    scheduleOverlayFrame(() => {
        (closeBtn || modal)?.focus?.();
    });
}

function closeSettings(board) {
    const modal = document.getElementById('settings-modal');
    const restoreFocusTarget = board?.settingsPreviouslyFocusedElement;

    if (board) {
        board.settingsPreviouslyFocusedElement = null;
    }

    modal?.classList.remove('show');
    scheduleOverlayFrame(() => {
        restoreFocusTarget?.focus?.();
    });
}

window.AboardOverlayUiRuntime = {
    closeConfigPanel,
    closeFeaturePanel,
    handleMoreFeaturePanelAfterAction,
    openSettings,
    closeSettings
};
