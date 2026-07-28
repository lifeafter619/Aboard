import { createAppContext } from './create-app-context.js';
import { createBoardDependencies } from './create-board-dependencies.js';
import { createBoardRuntimeDependencies } from './create-board-runtime-dependencies.js';
import {
  POST_VISIBLE_BOARD_DEPENDENCY_SCRIPTS,
  POST_VISIBLE_SERVICE_SCRIPTS,
  POST_VISIBLE_STARTUP_SCRIPTS,
  VISIBLE_CORE_BOARD_DEPENDENCY_SCRIPTS,
  VISIBLE_CORE_SERVICE_SCRIPTS,
  VISIBLE_CORE_STARTUP_SCRIPTS
} from './legacy-manifest.js';
import {
  STARTUP_UPDATE_ACTIONS,
  STARTUP_UPDATE_USER_CHOICES,
  resolveStartupUpdateAction,
  shouldContinuePostVisibleStartup
} from './startup-update-policy.js';
import { createAppServices } from './create-app-services.js';
import { loadLegacyScripts } from './legacy-script-loader.js';
import { resolveLegacyConstructor } from './resolve-legacy-constructor.js';
import { BrowserCheck } from '../infra/browser-check.js';
import { registerDialogManagerGlobal } from '../infra/dialog-manager.js';
import { registerRichTextParserGlobal } from '../infra/rich-text-parser.js';
import { registerScriptLoaderGlobal } from '../infra/script-loader.js';
import { registerDeepCloneGlobal } from '../infra/deep-clone.js';
import { bindLabelButtonKeyboardSupport } from '../infra/label-button-keyboard.js';
import { registerToastManagerGlobal } from '../features/toast/toast-manager.js';
import { registerAnnouncementManagerGlobal } from '../features/announcement/announcement-manager.js';
import { registerGifManagerGlobal } from '../features/media/gif-manager.js';
import { createLegacyRuntimeBridge } from '../legacy/runtime-bridge.js';

const appStartupPromises = new WeakMap();

function scheduleAfterFirstPaint(win, callback) {
  if (typeof win.requestAnimationFrame === 'function') {
    win.requestAnimationFrame(() => {
      win.requestAnimationFrame(() => callback());
    });
    return;
  }

  win.setTimeout(callback, 32);
}

function scheduleDeferredLocaleSuggestion(app, win) {
  if (app.deferredLocaleSuggestionScheduled) {
    return;
  }

  app.deferredLocaleSuggestionScheduled = true;
  win.setTimeout(() => {
    void app.services?.i18n?.maybePromptForPreferredLocale?.();
  }, 0);
}

function initializeDeferredFeature(label, initializer) {
  try {
    return initializer();
  } catch (error) {
    console.warn(`Aboard deferred ${label} failed to initialize:`, error);
    return null;
  }
}

function initializeDeferredBoardFeatures(app, win) {
  const { drawingBoard } = app;
  if (!drawingBoard) {
    return;
  }

  if (!drawingBoard.helpSystem) {
    const HelpSystem = resolveLegacyConstructor(win, 'AboardHelpSystem')
      || resolveLegacyConstructor(win, 'HelpSystem');
    if (typeof HelpSystem === 'function') {
      const helpSystem = initializeDeferredFeature('HelpSystem', () => {
        const instance = new HelpSystem();
        instance.init?.();
        return instance;
      });
      if (helpSystem) {
        drawingBoard.helpSystem = helpSystem;
      }
    }
  }

  if (!drawingBoard.timeDisplayManager) {
    const timeDisplayDependencies = initializeDeferredFeature('TimeDisplayDependencies', () => (
      win.AboardBoardConstruction?.createTimeDisplayDependencies({
        timeDisplayManager: drawingBoard.timeDisplayManager,
        timeDisplayControls: drawingBoard.timeDisplayControls,
        timeDisplaySettingsModal: drawingBoard.timeDisplaySettingsModal
      }, drawingBoard.settingsManager || app.boardDependencies?.settingsManager)
    ));

    if (timeDisplayDependencies?.timeDisplayManager) {
      drawingBoard.timeDisplayManager = timeDisplayDependencies.timeDisplayManager;
      drawingBoard.timeDisplayControls = timeDisplayDependencies.timeDisplayControls || drawingBoard.timeDisplayControls;
      drawingBoard.timeDisplaySettingsModal = timeDisplayDependencies.timeDisplaySettingsModal || drawingBoard.timeDisplaySettingsModal;
      app.boardDependencies = {
        ...app.boardDependencies,
        ...timeDisplayDependencies
      };
    }
  }

  const restoredUploadedImages = initializeDeferredFeature('uploaded image restoration', () => (
    drawingBoard.loadUploadedImages?.()
  ));
  drawingBoard.uploadedImages = restoredUploadedImages || drawingBoard.uploadedImages || [];
}

async function runImmediatePostVisibleSetup(app) {
  if (app.immediatePostVisibleSetupPromise) {
    return app.immediatePostVisibleSetupPromise;
  }

  app.immediatePostVisibleSetupPromise = (async () => {
    const tasks = [
      ['preload more feature managers', () => app.drawingBoard?.preloadMoreFeatureManagers?.()],
      ['prepare settings surface', () => app.drawingBoard?.ensureSettingsSurfaceReady?.()],
      ['prepare shape tool listeners', () => app.drawingBoard?.ensureShapeToolConfigListenersInitialized?.()],
      ['prepare select tool listeners', () => app.drawingBoard?.ensureSelectToolConfigListenersInitialized?.()],
      ['prepare background panel', () => app.drawingBoard?.ensureBackgroundPanelPrepared?.()],
      ['prepare more feature listeners', () => app.drawingBoard?.ensureMoreFeatureToolConfigListenersInitialized?.()]
    ];

    const results = await Promise.allSettled(
      tasks.map(([_, task]) => Promise.resolve().then(task))
    );

    results.forEach((result, index) => {
      if (result.status === 'rejected') {
        console.warn(`Aboard ${tasks[index][0]} failed:`, result.reason);
      }
    });

    return app;
  })().catch((error) => {
    app.immediatePostVisibleSetupPromise = null;
    throw error;
  });

  return app.immediatePostVisibleSetupPromise;
}

async function startPostVisibleStartup(app, { win = window, doc = document } = {}) {
  if (app.postVisibleStartupPromise) {
    return app.postVisibleStartupPromise;
  }

  app.postVisibleStartupPromise = (async () => {
    const scriptGroups = [
      ['feature', POST_VISIBLE_STARTUP_SCRIPTS],
      ['service', POST_VISIBLE_SERVICE_SCRIPTS],
      ['board dependency', POST_VISIBLE_BOARD_DEPENDENCY_SCRIPTS]
    ];
    const scriptFailures = [];

    for (const [label, scripts] of scriptGroups) {
      try {
        const result = await loadLegacyScripts(scripts, { doc, continueOnError: true });
        for (const failure of result?.failures || []) {
          scriptFailures.push({ group: label, ...failure });
        }
      } catch (error) {
        scriptFailures.push({ group: label, error });
      }
    }

    if (scriptFailures.length > 0) {
      console.warn(
        `Aboard post-visible scripts had ${scriptFailures.length} isolated load failure(s); continuing startup:`,
        scriptFailures
      );
      const featureLabel = 'Aboard startup features';
      const translatedMessage = win.i18n?.t?.('errors.lazyLoadFailed', { feature: featureLabel });
      const message = translatedMessage && translatedMessage !== 'errors.lazyLoadFailed'
        ? translatedMessage
        : `Failed to load ${featureLabel}. Please refresh and try again.`;
      const toastManager = app.drawingBoard?.settingsManager?.toastManager;
      if (toastManager?.show) {
        toastManager.show(message, 'error');
      } else {
        win.appDialog?.showAlert?.(message, 'error');
      }
    }
    app.postVisibleScriptFailures = scriptFailures;

    const postVisibleServices = await createAppServices(win);
    app.services = {
      ...app.services,
      ...postVisibleServices
    };
    app.context = createAppContext(app.bridge, app.services);
    app.bridge.setPwaManager?.(app.services.pwaManager);
    initializeDeferredBoardFeatures(app, win);
    return app;
  })().catch((error) => {
    app.postVisibleStartupPromise = null;
    throw error;
  });

  return app.postVisibleStartupPromise;
}

async function runStartupUpdateGate(app, { win = window } = {}) {
  const pwaManager = app.services?.pwaManager || win.pwaManager;
  const drawingBoard = app.drawingBoard || win.drawingBoard || null;
  if (!pwaManager?.collectStartupUpdateState || !pwaManager?.getUpdatePreference) {
    return {
      action: STARTUP_UPDATE_ACTIONS.CONTINUE,
      userChoice: null,
      updateState: null
    };
  }

  try {
    if (drawingBoard?.recoveryCheckPromise) {
      try {
        await drawingBoard.recoveryCheckPromise;
      } catch (error) {
        console.warn('Aboard startup update gate could not await recovery check:', error);
      }
    }

    if (drawingBoard?.hasUnresolvedRecoveryData) {
      return {
        action: STARTUP_UPDATE_ACTIONS.CONTINUE,
        userChoice: STARTUP_UPDATE_USER_CHOICES.IDLE,
        updateState: null
      };
    }

    const updateState = await pwaManager.collectStartupUpdateState();
    const action = resolveStartupUpdateAction({
      currentVersion: updateState?.currentVersion,
      latestVersion: updateState?.latestVersion,
      updatePreference: pwaManager.getUpdatePreference(),
      hasWaitingWorker: updateState?.hasWaitingWorker
    });

    if (action === STARTUP_UPDATE_ACTIONS.APPLY_PREFERENCE) {
      const userChoice = pwaManager.getPreferredUpdateChoice?.() === STARTUP_UPDATE_USER_CHOICES.IMMEDIATE
        ? STARTUP_UPDATE_USER_CHOICES.IMMEDIATE
        : STARTUP_UPDATE_USER_CHOICES.IDLE;
      const didRequestUpdate = await pwaManager.requestUpdateApplication?.({
        mode: userChoice === STARTUP_UPDATE_USER_CHOICES.IMMEDIATE ? 'immediate' : 'idle',
        reason: 'startup',
        currentVersion: updateState?.currentVersion,
        latestVersion: updateState?.latestVersion
      });
      if (!didRequestUpdate && userChoice === STARTUP_UPDATE_USER_CHOICES.IMMEDIATE) {
        pwaManager.deferUpdatePromptForCurrentSession?.();
        return {
          action: STARTUP_UPDATE_ACTIONS.CONTINUE,
          userChoice: STARTUP_UPDATE_USER_CHOICES.IDLE,
          updateState
        };
      }

      return {
        action,
        userChoice,
        updateState
      };
    }

    if (action === STARTUP_UPDATE_ACTIONS.PROMPT) {
      const userChoice = await pwaManager.promptForUpdate?.({
        reason: 'startup',
        currentVersion: updateState?.currentVersion,
        latestVersion: updateState?.latestVersion
      }) || STARTUP_UPDATE_USER_CHOICES.IDLE;

      const didRequestUpdate = await pwaManager.requestUpdateApplication?.({
        mode: userChoice === STARTUP_UPDATE_USER_CHOICES.IMMEDIATE ? 'immediate' : 'idle',
        reason: 'startup',
        currentVersion: updateState?.currentVersion,
        latestVersion: updateState?.latestVersion
      });
      if (!didRequestUpdate && userChoice === STARTUP_UPDATE_USER_CHOICES.IMMEDIATE) {
        pwaManager.deferUpdatePromptForCurrentSession?.();
        return {
          action: STARTUP_UPDATE_ACTIONS.CONTINUE,
          userChoice: STARTUP_UPDATE_USER_CHOICES.IDLE,
          updateState
        };
      }

      return {
        action,
        userChoice,
        updateState
      };
    }

    return {
      action,
      userChoice: null,
      updateState
    };
  } catch (error) {
    console.warn('Aboard startup update gate failed, continuing startup:', error);
    return {
      action: STARTUP_UPDATE_ACTIONS.CONTINUE,
      userChoice: STARTUP_UPDATE_USER_CHOICES.IDLE,
      updateState: null
    };
  }
}

async function startPostVisibleOrchestration(app, { win = window, doc = document } = {}) {
  if (app.postVisibleOrchestrationPromise) {
    return app.postVisibleOrchestrationPromise;
  }

  app.postVisibleOrchestrationPromise = (async () => {
    await startPostVisibleStartup(app, { win, doc });
    const gateResult = await runStartupUpdateGate(app, { win });
    if (!shouldContinuePostVisibleStartup(gateResult)) {
      return app;
    }

    await runImmediatePostVisibleSetup(app);
    scheduleDeferredLocaleSuggestion(app, win);
    return app;
  })().catch((error) => {
    app.postVisibleOrchestrationPromise = null;
    throw error;
  });

  return app.postVisibleOrchestrationPromise;
}

export async function createApp({ win = window, doc = document } = {}) {
  if (win.__ABOARD_APP__) {
    return win.__ABOARD_APP__;
  }

  if (appStartupPromises.has(win)) {
    return appStartupPromises.get(win);
  }

  const startupPromise = (async () => {
    registerDialogManagerGlobal(win, doc);
    registerRichTextParserGlobal(win);
    registerScriptLoaderGlobal(win, doc);
    registerDeepCloneGlobal(win);
    bindLabelButtonKeyboardSupport(doc);
    registerToastManagerGlobal(win, doc);
    registerAnnouncementManagerGlobal(win, doc);
    registerGifManagerGlobal(win, doc);

    // Run compatibility checks before loading/initializing app services so
    // partially supported browsers still see the warning overlay.
    BrowserCheck.init(win, doc);

    await loadLegacyScripts(VISIBLE_CORE_STARTUP_SCRIPTS, { doc });
    await loadLegacyScripts(VISIBLE_CORE_SERVICE_SCRIPTS, { doc });
    const services = await createAppServices(win);

    const bridge = createLegacyRuntimeBridge(win);
    await loadLegacyScripts(VISIBLE_CORE_BOARD_DEPENDENCY_SCRIPTS, { doc });

    const boardDependencies = createBoardDependencies(win);
    const boardRuntimeDependencies = createBoardRuntimeDependencies({
      win,
      doc,
      boardDependencies
    });
    const DrawingBoard = bridge.getDrawingBoardClass();
    const drawingBoard = bridge.setDrawingBoard(new DrawingBoard({
      ...boardDependencies,
      ...boardRuntimeDependencies
    }));
    const context = createAppContext(bridge, services);

    const app = {
      bridge,
      context,
      services,
      boardDependencies,
      boardRuntimeDependencies,
      drawingBoard
    };

    win.__ABOARD_APP__ = app;
    scheduleAfterFirstPaint(win, () => {
      void startPostVisibleOrchestration(app, { win, doc }).catch((error) => {
        console.error('Aboard post-visible startup failed:', error);
      });
    });
    return app;
  })().then((app) => {
    if (win.__ABOARD_APP__) {
      appStartupPromises.delete(win);
    }
    return app;
  }, (error) => {
    appStartupPromises.delete(win);
    throw error;
  });

  appStartupPromises.set(win, startupPromise);
  return startupPromise;
}
