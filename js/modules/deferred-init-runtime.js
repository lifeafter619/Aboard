// Extracted deferred initialization runtime from main.js
// Preserves legacy board instance semantics by invoking methods with board as this.

function hasRuntimeMethod(runtimeName, methodName) {
    return typeof window[runtimeName]?.[methodName] === 'function';
}

function ensureSettingsInfrastructureInitialized() {
    if (this.settingsInfrastructureInitialized) {
        return;
    }
    if (!hasRuntimeMethod('AboardCustomizationRuntime', 'initToolbarCustomization')
        || !hasRuntimeMethod('AboardFontManagementRuntime', 'initFontManagement')
        || !hasRuntimeMethod('AboardCustomizationRuntime', 'initControlButtonSettings')) {
        return;
    }
    this.initToolbarCustomization();
    this.initFontManagement();
    this.initControlButtonSettings();
    this.settingsInfrastructureInitialized = true;
}

function ensureSettingsListenersInitialized() {
    if (this.settingsListenersInitialized) {
        return;
    }
    if (!hasRuntimeMethod('AboardUiListenersRuntime', 'setupSettingsListeners')) {
        return;
    }
    this.setupSettingsListeners();
    this.settingsListenersInitialized = true;
}

function ensureSettingsSurfaceReady() {
    this.ensureSettingsListenersInitialized();
    this.ensureSettingsInfrastructureInitialized();
}

function ensureShapeToolConfigListenersInitialized() {
    if (this.shapeToolConfigListenersInitialized) {
        return;
    }
    if (!hasRuntimeMethod('AboardUiListenersRuntime', 'setupShapeToolConfigListeners')) {
        return;
    }
    this.setupShapeToolConfigListeners();
    this.shapeToolConfigListenersInitialized = true;
}

function ensureSelectToolConfigListenersInitialized() {
    if (this.selectToolConfigListenersInitialized) {
        return;
    }
    if (!hasRuntimeMethod('AboardUiListenersRuntime', 'setupSelectToolConfigListeners')) {
        return;
    }
    this.setupSelectToolConfigListeners();
    this.selectToolConfigListenersInitialized = true;
}

function ensureBackgroundPanelPrepared() {
    if (!this.backgroundPanelPrepared) {
        if (!hasRuntimeMethod('AboardDisplayRuntime', 'updatePatternGrid')
            || !hasRuntimeMethod('AboardUploadedImagesRuntime', 'updateUploadedImagesButtons')) {
            return;
        }
        this.updatePatternGrid();
        this.updateUploadedImagesButtons();
        this.backgroundPanelPrepared = true;
    }
    this.ensureBackgroundToolConfigListenersInitialized();
}

function ensureMoreFeatureToolConfigListenersInitialized() {
    if (this.moreFeatureToolConfigListenersInitialized) {
        return;
    }
    if (!hasRuntimeMethod('AboardUiListenersRuntime', 'setupMoreFeatureToolConfigListeners')) {
        return;
    }
    this.setupMoreFeatureToolConfigListeners();
    this.moreFeatureToolConfigListenersInitialized = true;
}

function ensureBackgroundToolConfigListenersInitialized() {
    if (this.backgroundToolConfigListenersInitialized) {
        return;
    }
    if (!hasRuntimeMethod('AboardUiListenersRuntime', 'setupBackgroundToolConfigListeners')) {
        return;
    }
    this.setupBackgroundToolConfigListeners();
    this.backgroundToolConfigListenersInitialized = true;
}

function scheduleDeferredUiInitialization() {
    const runDeferredSettingsInitialization = () => {
        try {
            this.ensureSettingsSurfaceReady();
        } catch (error) {
            console.warn('Deferred settings initialization failed:', error);
        }
    };

    const scheduleIdle = () => {
        if (typeof window.requestIdleCallback === 'function') {
            window.requestIdleCallback(runDeferredSettingsInitialization, { timeout: 1500 });
        } else {
            window.setTimeout(runDeferredSettingsInitialization, 600);
        }
    };

    const afterFirstPaint = () => {
        window.requestAnimationFrame(() => {
            window.requestAnimationFrame(() => {
                try {
                    this.ensureShapeToolConfigListenersInitialized();
                } catch (error) {
                    console.warn('Deferred shape tool preparation failed:', error);
                }
                try {
                    this.ensureSelectToolConfigListenersInitialized();
                } catch (error) {
                    console.warn('Deferred select tool preparation failed:', error);
                }
                try {
                    this.ensureBackgroundPanelPrepared();
                } catch (error) {
                    console.warn('Deferred background panel preparation failed:', error);
                }
                try {
                    this.ensureMoreFeatureToolConfigListenersInitialized();
                } catch (error) {
                    console.warn('Deferred more feature panel preparation failed:', error);
                }
                scheduleIdle();
            });
        });
    };

    afterFirstPaint();
}

window.AboardDeferredInitRuntime = {
    ensureSettingsInfrastructureInitialized(board) {
        return ensureSettingsInfrastructureInitialized.call(board);
    },
    ensureSettingsListenersInitialized(board) {
        return ensureSettingsListenersInitialized.call(board);
    },
    ensureSettingsSurfaceReady(board) {
        return ensureSettingsSurfaceReady.call(board);
    },
    ensureShapeToolConfigListenersInitialized(board) {
        return ensureShapeToolConfigListenersInitialized.call(board);
    },
    ensureSelectToolConfigListenersInitialized(board) {
        return ensureSelectToolConfigListenersInitialized.call(board);
    },
    ensureBackgroundPanelPrepared(board) {
        return ensureBackgroundPanelPrepared.call(board);
    },
    ensureMoreFeatureToolConfigListenersInitialized(board) {
        return ensureMoreFeatureToolConfigListenersInitialized.call(board);
    },
    ensureBackgroundToolConfigListenersInitialized(board) {
        return ensureBackgroundToolConfigListenersInitialized.call(board);
    },
    scheduleDeferredUiInitialization(board) {
        return scheduleDeferredUiInitialization.call(board);
    }
};
