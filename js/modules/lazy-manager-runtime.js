const LAZY_MANAGER_SCRIPTS = {
    ExportManager: 'js/export.js',
    ProjectManager: 'js/modules/project-manager.js',
    TimerManager: 'js/modules/timer.js',
    InsertImageManager: 'js/insert-image.js',
    InsertTextManager: 'js/modules/insert-text-manager.js',
    RandomPickerManager: 'js/modules/random-picker.js',
    ScoreboardManager: 'js/modules/scoreboard.js'
};

const LAZY_MANAGER_PREFETCH_SCRIPTS = [
    LAZY_MANAGER_SCRIPTS.InsertImageManager,
    LAZY_MANAGER_SCRIPTS.InsertTextManager,
    LAZY_MANAGER_SCRIPTS.TimerManager,
    LAZY_MANAGER_SCRIPTS.RandomPickerManager,
    LAZY_MANAGER_SCRIPTS.ScoreboardManager,
    LAZY_MANAGER_SCRIPTS.ExportManager,
    LAZY_MANAGER_SCRIPTS.ProjectManager
];

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
    const message = window.i18n
        ? window.i18n.t('errors.lazyLoadFailed', { feature: featureName })
        : `Failed to load ${featureName}. Please refresh and try again.`;
    if (board.settingsManager?.toastManager) {
        board.settingsManager.toastManager.show(message, 'error');
        return;
    }
    window.appDialog?.showAlert(message, 'error');
}

// Concurrent calls (e.g. a double-tap on a feature button while its script is
// still downloading, or session restore racing a user click) must share one
// in-flight creation — a second `new Ctor()` would double-register the
// constructor's document/window listeners.
function getOrCreateManager(board, cacheKey, create) {
    if (board[cacheKey]) {
        return Promise.resolve(board[cacheKey]);
    }
    const pendingKey = `${cacheKey}Pending`;
    if (!board[pendingKey]) {
        board[pendingKey] = (async () => {
            try {
                return await create();
            } finally {
                board[pendingKey] = null;
            }
        })();
    }
    return board[pendingKey];
}

async function getExportManager(board) {
    return getOrCreateManager(board, 'exportManager', async () => {
        const ExportManagerCtor = await loadManagerConstructor(board, 'ExportManager');
        board.exportManager = new ExportManagerCtor(board.canvas, board.bgCanvas, board);
        return board.exportManager;
    });
}

async function getProjectManager(board) {
    return getOrCreateManager(board, 'projectManager', async () => {
        const ProjectManagerCtor = await loadManagerConstructor(board, 'ProjectManager');
        board.projectManager = new ProjectManagerCtor(board);
        return board.projectManager;
    });
}

async function getTimerManager(board) {
    return getOrCreateManager(board, 'timerManager', async () => {
        const TimerManagerCtor = await loadManagerConstructor(board, 'TimerManager');
        board.timerManager = new TimerManagerCtor();
        board.initResizableModals();
        return board.timerManager;
    });
}

async function getInsertTextManager(board) {
    return getOrCreateManager(board, 'insertTextManager', async () => {
        const InsertTextManagerCtor = await loadManagerConstructor(board, 'InsertTextManager');
        board.insertTextManager = new InsertTextManagerCtor(board.canvas, board.ctx, board.historyManager, board.drawingEngine);
        board.selectionManager?.setTextManager?.(board.insertTextManager);
        return board.insertTextManager;
    });
}

async function getInsertImageManager(board) {
    return getOrCreateManager(board, 'insertImageManager', async () => {
        const InsertImageManagerCtor = await loadManagerConstructor(board, 'InsertImageManager');
        board.insertImageManager = new InsertImageManagerCtor(board.canvas, board.ctx, board.historyManager, board.drawingEngine);
        return board.insertImageManager;
    });
}

async function getRandomPickerManager(board) {
    return getOrCreateManager(board, 'randomPickerManager', async () => {
        const RandomPickerManagerCtor = await loadManagerConstructor(board, 'RandomPickerManager');
        board.randomPickerManager = new RandomPickerManagerCtor();
        board.initResizableModals();
        return board.randomPickerManager;
    });
}

async function getScoreboardManager(board) {
    return getOrCreateManager(board, 'scoreboardManager', async () => {
        const ScoreboardManagerCtor = await loadManagerConstructor(board, 'ScoreboardManager');
        board.scoreboardManager = new ScoreboardManagerCtor();
        return board.scoreboardManager;
    });
}

function scheduleMoreFeaturePreload(board) {
    if (board.moreFeaturePreloadScheduled) {
        return;
    }
    board.moreFeaturePreloadScheduled = true;

    const runWhenIdle = () => {
        if (typeof window.requestIdleCallback === 'function') {
            window.requestIdleCallback(() => {
                void preloadMoreFeatureManagers(board);
            }, { timeout: 1500 });
            return;
        }

        window.setTimeout(() => {
            void preloadMoreFeatureManagers(board);
        }, 600);
    };

    const afterFirstPaint = () => {
        window.requestAnimationFrame(() => {
            window.requestAnimationFrame(() => {
                runWhenIdle();
            });
        });
    };

    afterFirstPaint();
}

function getPrefetchDocument() {
    if (window.document?.createElement) {
        return window.document;
    }
    if (typeof document !== 'undefined' && document.createElement) {
        return document;
    }
    return null;
}

function hasScriptPrefetch(doc, src) {
    if (!doc.querySelector) {
        return false;
    }
    return Boolean(doc.querySelector(`link[rel="prefetch"][as="script"][href="${src}"]`));
}

function prefetchLazyManagerScript(src) {
    const doc = getPrefetchDocument();
    if (!doc?.head?.appendChild || hasScriptPrefetch(doc, src)) {
        return null;
    }

    const link = doc.createElement('link');
    link.rel = 'prefetch';
    link.as = 'script';
    link.href = src;
    if ('fetchPriority' in link) {
        link.fetchPriority = 'low';
    }
    doc.head.appendChild(link);
    return link;
}

async function preloadMoreFeatureManagers() {
    return LAZY_MANAGER_PREFETCH_SCRIPTS.map(prefetchLazyManagerScript).filter(Boolean);
}

window.AboardLazyManagerRuntime = {
    LAZY_MANAGER_SCRIPTS,
    LAZY_MANAGER_PREFETCH_SCRIPTS,
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
