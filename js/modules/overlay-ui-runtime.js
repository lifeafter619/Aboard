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

    const timeDisplayCheckbox = document.getElementById('show-time-display-checkbox');
    if (timeDisplayCheckbox) {
        timeDisplayCheckbox.checked = board.timeDisplayManager.enabled;
    }

    const timeDisplaySettings = document.getElementById('time-display-settings');
    const timezoneSettings = document.getElementById('timezone-settings');
    const timeFormatSettings = document.getElementById('time-format-settings');
    const dateFormatSettings = document.getElementById('date-format-settings');
    const timeColorSettings = document.getElementById('time-color-settings');
    const timeFontSizeSettings = document.getElementById('time-font-size-settings');
    const timeOpacitySettings = document.getElementById('time-opacity-settings');
    const timeFullscreenSettings = document.getElementById('time-fullscreen-settings');
    const timeFullscreenFontSizeSettings = document.getElementById('time-fullscreen-font-size-settings');

    const isEnabled = board.timeDisplayManager.enabled;
    if (timeDisplaySettings) timeDisplaySettings.style.display = isEnabled ? 'flex' : 'none';
    if (timezoneSettings) timezoneSettings.style.display = isEnabled ? 'flex' : 'none';
    if (timeFormatSettings) timeFormatSettings.style.display = isEnabled ? 'flex' : 'none';
    if (dateFormatSettings) dateFormatSettings.style.display = isEnabled ? 'flex' : 'none';
    if (timeColorSettings) timeColorSettings.style.display = isEnabled ? 'flex' : 'none';
    if (timeFontSizeSettings) timeFontSizeSettings.style.display = isEnabled ? 'flex' : 'none';
    if (timeOpacitySettings) timeOpacitySettings.style.display = isEnabled ? 'flex' : 'none';
    if (timeFullscreenSettings) timeFullscreenSettings.style.display = isEnabled ? 'flex' : 'none';
    if (timeFullscreenFontSizeSettings) timeFullscreenFontSizeSettings.style.display = isEnabled ? 'flex' : 'none';

    document.querySelectorAll('.display-option-btn').forEach(btn => btn.classList.remove('active'));
    let displayType = 'both';
    if (board.timeDisplayManager.showDate && !board.timeDisplayManager.showTime) {
        displayType = 'date-only';
    } else if (!board.timeDisplayManager.showDate && board.timeDisplayManager.showTime) {
        displayType = 'time-only';
    }
    const activeBtn = document.querySelector(`.display-option-btn[data-display-type="${displayType}"]`);
    if (activeBtn) {
        activeBtn.classList.add('active');
    }

    const timezoneSelect = document.getElementById('timezone-select');
    if (timezoneSelect) timezoneSelect.value = board.timeDisplayManager.timezone;

    const timeFormatSelect = document.getElementById('time-format-select');
    if (timeFormatSelect) timeFormatSelect.value = board.timeDisplayManager.timeFormat;

    const dateFormatSelect = document.getElementById('date-format-select');
    if (dateFormatSelect) dateFormatSelect.value = board.timeDisplayManager.dateFormat;

    const timeFontSizeSlider = document.getElementById('time-font-size-slider');
    if (timeFontSizeSlider) timeFontSizeSlider.value = board.timeDisplayManager.fontSize;

    const timeFontSizeValue = document.getElementById('time-font-size-value');
    if (timeFontSizeValue) timeFontSizeValue.textContent = board.timeDisplayManager.fontSize;

    const timeFontSizeInput = document.getElementById('time-font-size-input');
    if (timeFontSizeInput) timeFontSizeInput.value = board.timeDisplayManager.fontSize;

    const timeOpacitySlider = document.getElementById('time-opacity-slider');
    if (timeOpacitySlider) timeOpacitySlider.value = board.timeDisplayManager.opacity;

    const timeOpacityValue = document.getElementById('time-opacity-value');
    if (timeOpacityValue) timeOpacityValue.textContent = board.timeDisplayManager.opacity;

    const timeOpacityInput = document.getElementById('time-opacity-input');
    if (timeOpacityInput) timeOpacityInput.value = board.timeDisplayManager.opacity;

    const customTimeColorPicker = document.getElementById('custom-time-color-picker');
    if (customTimeColorPicker) customTimeColorPicker.value = board.timeDisplayManager.color;

    const defaultBgColor = '#FFFFFF';
    const customTimeBgColorPicker = document.getElementById('custom-time-bg-color-picker');
    if (customTimeBgColorPicker) {
        customTimeBgColorPicker.value = board.timeDisplayManager.bgColor === 'transparent'
            ? defaultBgColor
            : board.timeDisplayManager.bgColor;
    }

    document.querySelectorAll('.fullscreen-mode-btn').forEach(btn => {
        if (btn.dataset.mode === board.timeDisplayManager.fullscreenMode) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });

    const timeFullscreenFontSizeSlider = document.getElementById('time-fullscreen-font-size-slider');
    if (timeFullscreenFontSizeSlider) {
        timeFullscreenFontSizeSlider.value = board.timeDisplayManager.fullscreenFontSize;
        const timeFullscreenFontSizeValue = document.getElementById('time-fullscreen-font-size-value');
        if (timeFullscreenFontSizeValue) timeFullscreenFontSizeValue.textContent = board.timeDisplayManager.fullscreenFontSize;
        const timeFullscreenFontSizeInput = document.getElementById('time-fullscreen-font-size-input');
        if (timeFullscreenFontSizeInput) timeFullscreenFontSizeInput.value = board.timeDisplayManager.fullscreenFontSize;
    }
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
