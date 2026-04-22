function resolveLegacyClass(name) {
    return typeof window[name] === 'function' ? window[name] : null;
}

function instantiateLegacyClass(name, args = []) {
    const LegacyClass = resolveLegacyClass(name);
    return typeof LegacyClass === 'function' ? Reflect.construct(LegacyClass, args) : null;
}

function instantiatePreferredOptionalLegacyClass(label, names, args = []) {
    for (const name of names) {
        const LegacyClass = resolveLegacyClass(name);
        if (typeof LegacyClass !== 'function') {
            continue;
        }

        try {
            return Reflect.construct(LegacyClass, args);
        } catch (error) {
            console.warn(`Aboard optional legacy dependency "${label}" failed to initialize:`, error);
        }
    }

    return null;
}

function instantiatePreferredLegacyClass(names, args = []) {
    for (const name of names) {
        const instance = instantiateLegacyClass(name, args);
        if (instance) {
            return instance;
        }
    }

    return null;
}

function createTimeDisplayDependencies(options, settingsManager) {
    const timeDisplayManager = options.timeDisplayManager || instantiatePreferredOptionalLegacyClass('TimeDisplayManager', ['AboardTimeDisplayManager', 'TimeDisplayManager'], [settingsManager]);

    return {
        timeDisplayManager,
        timeDisplayControls: options.timeDisplayControls || (
            timeDisplayManager ? instantiatePreferredOptionalLegacyClass('TimeDisplayControls', ['AboardTimeDisplayControls', 'TimeDisplayControls'], [timeDisplayManager]) : null
        ),
        timeDisplaySettingsModal: options.timeDisplaySettingsModal || (
            timeDisplayManager ? instantiatePreferredOptionalLegacyClass('TimeDisplaySettingsModal', ['AboardTimeDisplaySettingsModal', 'TimeDisplaySettingsModal'], [timeDisplayManager]) : null
        )
    };
}

function createCoreRuntimeDependencies(options, refs) {
    const drawingEngine = options.drawingEngine || instantiatePreferredLegacyClass(['AboardDrawingEngine', 'DrawingEngine'], [refs.canvas, refs.ctx]);
    const historyManager = options.historyManager || instantiatePreferredLegacyClass(['AboardHistoryManager', 'HistoryManager'], [refs.canvas, refs.ctx]);
    const backgroundManager = options.backgroundManager || instantiatePreferredLegacyClass(['AboardBackgroundManager', 'BackgroundManager'], [refs.bgCanvas, refs.bgCtx]);
    const imageControls = options.imageControls || (backgroundManager ? instantiatePreferredOptionalLegacyClass('ImageControls', ['AboardImageControls', 'ImageControls'], [backgroundManager]) : null);
    const strokeControls = options.strokeControls || (
        drawingEngine && historyManager
            ? instantiatePreferredOptionalLegacyClass('StrokeControls', ['AboardStrokeControls', 'StrokeControls'], [drawingEngine, refs.canvas, refs.ctx, historyManager])
            : null
    );
    const selectionManager = options.selectionManager || (
        drawingEngine && strokeControls
            ? instantiatePreferredOptionalLegacyClass('SelectionManager', ['AboardSelectionManager', 'SelectionManager'], [refs.canvas, refs.ctx, drawingEngine, strokeControls])
            : null
    );

    selectionManager?.setHistoryManager?.(historyManager);
    selectionManager?.setBackgroundManager?.(backgroundManager);

    const teachingToolsManager = options.teachingToolsManager || (
        historyManager ? instantiatePreferredOptionalLegacyClass('TeachingToolsManager', ['AboardTeachingToolsManager', 'TeachingToolsManager'], [refs.canvas, refs.ctx, historyManager]) : null
    );
    const shapeDrawingManager = options.shapeDrawingManager || (
        drawingEngine && historyManager
            ? instantiatePreferredOptionalLegacyClass('ShapeDrawingManager', ['AboardShapeDrawingManager', 'ShapeDrawingManager'], [refs.canvas, refs.ctx, drawingEngine, historyManager])
            : null
    );
    drawingEngine?.setShapeDrawingManager?.(shapeDrawingManager);

    const lineStyleModal = options.lineStyleModal || (
        drawingEngine && shapeDrawingManager
            ? instantiatePreferredOptionalLegacyClass('LineStyleModal', ['AboardLineStyleModal', 'LineStyleModal'], [drawingEngine, shapeDrawingManager])
            : null
    );
    const edgeDrawingManager = options.edgeDrawingManager || (
        teachingToolsManager && drawingEngine
            ? instantiatePreferredOptionalLegacyClass('EdgeDrawingManager', ['AboardEdgeDrawingManager', 'EdgeDrawingManager'], [teachingToolsManager, drawingEngine])
            : null
    );
    drawingEngine?.setEdgeDrawingManager?.(edgeDrawingManager);

    return {
        drawingEngine,
        historyManager,
        backgroundManager,
        imageControls,
        strokeControls,
        selectionManager,
        teachingToolsManager,
        shapeDrawingManager,
        lineStyleModal,
        edgeDrawingManager
    };
}

window.AboardBoardConstruction = {
    resolveLegacyClass,
    instantiateLegacyClass,
    instantiatePreferredLegacyClass,
    createTimeDisplayDependencies,
    createCoreRuntimeDependencies
};
