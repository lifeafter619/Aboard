function closeConfigPanel(board) {
    const configArea = document.getElementById('config-area');
    configArea?.classList.remove('show');
    board.toggleCoordinateSettingsPanel(false);
    board.toggleCoordinatePointPanel(false);
    board.exitShapeMode();
}

function closeFeaturePanel() {
    document.getElementById('feature-area')?.classList.remove('show');
}

function handleMoreFeaturePanelAfterAction(board) {
    if (!board.settingsManager.keepMorePanelOpen) {
        closeFeaturePanel();
    }
}

function openSettings(board) {
    board.ensureSettingsSurfaceReady?.();
    board.syncResizableModalState('settings-modal');
    document.getElementById('settings-modal')?.classList.add('show');
    window.requestAnimationFrame(() => {
        board.updateCacheSizeDisplay();
    });
}

function closeSettings() {
    document.getElementById('settings-modal')?.classList.remove('show');
}

window.AboardOverlayUiRuntime = {
    closeConfigPanel,
    closeFeaturePanel,
    handleMoreFeaturePanelAfterAction,
    openSettings,
    closeSettings
};
