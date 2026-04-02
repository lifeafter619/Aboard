const LAZY_MANAGER_SCRIPTS = {
    ExportManager: 'js/export.js',
    ProjectManager: 'js/modules/project-manager.js',
    TimerManager: 'js/modules/timer.js',
    InsertImageManager: 'js/insert-image.js',
    InsertTextManager: 'js/modules/insert-text-manager.js',
    RandomPickerManager: 'js/modules/random-picker.js',
    ScoreboardManager: 'js/modules/scoreboard.js'
};

async function loadManagerConstructor(board, name) {
    const existingCtor = window[name];
    if (typeof existingCtor === 'function') {
        return existingCtor;
    }

    const src = LAZY_MANAGER_SCRIPTS[name];
    if (!src) {
        throw new Error(`No lazy script registered for ${name}`);
    }
    if (!window.ScriptLoader?.load) {
        throw new Error('ScriptLoader is not available');
    }

    await window.ScriptLoader.load(src);
    const ctor = window[name];
    if (typeof ctor !== 'function') {
        throw new Error(`${name} did not register on window after loading ${src}`);
    }
    return ctor;
}

function showLazyLoadError(board, featureName, error) {
    console.error(`Failed to load ${featureName}:`, error);
    const message = `加载${featureName}功能失败，请刷新页面后重试。`;
    if (board.settingsManager?.toastManager) {
        board.settingsManager.toastManager.show(message, 'error');
        return;
    }
    window.appDialog?.showAlert(message, 'error');
}

async function getExportManager(board) {
    if (!board.exportManager) {
        const ExportManagerCtor = await loadManagerConstructor(board, 'ExportManager');
        board.exportManager = new ExportManagerCtor(board.canvas, board.bgCanvas, board);
    }
    return board.exportManager;
}

async function getProjectManager(board) {
    if (!board.projectManager) {
        const ProjectManagerCtor = await loadManagerConstructor(board, 'ProjectManager');
        board.projectManager = new ProjectManagerCtor(board);
    }
    return board.projectManager;
}

async function getTimerManager(board) {
    if (!board.timerManager) {
        const TimerManagerCtor = await loadManagerConstructor(board, 'TimerManager');
        board.timerManager = new TimerManagerCtor();
        board.initResizableModals();
    }
    return board.timerManager;
}

async function getInsertTextManager(board) {
    if (!board.insertTextManager) {
        const InsertTextManagerCtor = await loadManagerConstructor(board, 'InsertTextManager');
        board.insertTextManager = new InsertTextManagerCtor(board.canvas, board.ctx, board.historyManager, board.drawingEngine);
        board.selectionManager.setTextManager(board.insertTextManager);
    }
    return board.insertTextManager;
}

async function getInsertImageManager(board) {
    if (!board.insertImageManager) {
        const InsertImageManagerCtor = await loadManagerConstructor(board, 'InsertImageManager');
        board.insertImageManager = new InsertImageManagerCtor(board.canvas, board.ctx, board.historyManager, board.drawingEngine);
    }
    return board.insertImageManager;
}

async function getRandomPickerManager(board) {
    if (!board.randomPickerManager) {
        const RandomPickerManagerCtor = await loadManagerConstructor(board, 'RandomPickerManager');
        board.randomPickerManager = new RandomPickerManagerCtor();
        board.initResizableModals();
    }
    return board.randomPickerManager;
}

async function getScoreboardManager(board) {
    if (!board.scoreboardManager) {
        const ScoreboardManagerCtor = await loadManagerConstructor(board, 'ScoreboardManager');
        board.scoreboardManager = new ScoreboardManagerCtor();
    }
    return board.scoreboardManager;
}

function scheduleMoreFeaturePreload(board) {
    if (board.moreFeaturePreloadScheduled) {
        return;
    }
    board.moreFeaturePreloadScheduled = true;

    const afterFirstPaint = () => {
        window.requestAnimationFrame(() => {
            window.requestAnimationFrame(() => {
                void preloadMoreFeatureManagers(board);
            });
        });
    };

    afterFirstPaint();
}

async function preloadMoreFeatureManagers(board) {
    const preloadTasks = [
        () => getInsertImageManager(board),
        () => getInsertTextManager(board),
        () => getTimerManager(board),
        () => getRandomPickerManager(board),
        () => getScoreboardManager(board),
        () => getExportManager(board),
        () => getProjectManager(board)
    ];

    const results = await Promise.allSettled(preloadTasks.map(preload => preload()));
    results.forEach((result) => {
        if (result.status === 'rejected') {
            console.warn('Silent more-feature preload failed:', result.reason);
        }
    });
}

window.AboardLazyManagerRuntime = {
    LAZY_MANAGER_SCRIPTS,
    loadManagerConstructor,
    showLazyLoadError,
    getExportManager,
    getProjectManager,
    getTimerManager,
    getInsertImageManager,
    getInsertTextManager,
    getRandomPickerManager,
    getScoreboardManager,
    scheduleMoreFeaturePreload,
    preloadMoreFeatureManagers
};
