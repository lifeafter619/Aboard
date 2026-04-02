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
import { createAppServices } from './create-app-services.js';
import { loadLegacyScripts } from './legacy-script-loader.js';
import { resolveLegacyConstructor } from './resolve-legacy-constructor.js';
import { BrowserCheck } from '../infra/browser-check.js';
import { registerDialogManagerGlobal } from '../infra/dialog-manager.js';
import { registerRichTextParserGlobal } from '../infra/rich-text-parser.js';
import { registerScriptLoaderGlobal } from '../infra/script-loader.js';
import { registerToastManagerGlobal } from '../features/toast/toast-manager.js';
import { registerAnnouncementManagerGlobal } from '../features/announcement/announcement-manager.js';
import { registerGifManagerGlobal } from '../features/media/gif-manager.js';
import { createLegacyRuntimeBridge } from '../legacy/runtime-bridge.js';

let appStartupPromise = null;

function scheduleAfterFirstPaint(win, callback) {
  if (typeof win.requestAnimationFrame === 'function') {
    win.requestAnimationFrame(() => {
      win.requestAnimationFrame(() => callback());
    });
    return;
  }

  win.setTimeout(callback, 32);
}

async function warmVisibleManagers(drawingBoard) {
  await Promise.allSettled([
    drawingBoard.getExportManager?.(),
    drawingBoard.getProjectManager?.(),
    drawingBoard.getTimerManager?.(),
    drawingBoard.getInsertImageManager?.(),
    drawingBoard.getInsertTextManager?.(),
    drawingBoard.getRandomPickerManager?.(),
    drawingBoard.getScoreboardManager?.()
  ]);
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
      drawingBoard.helpSystem = new HelpSystem();
      drawingBoard.helpSystem.init?.();
    }
  }

  drawingBoard.uploadedImages = drawingBoard.loadUploadedImages?.() || drawingBoard.uploadedImages || [];
}

async function startPostVisibleStartup(app, { win = window, doc = document } = {}) {
  if (app.postVisibleStartupPromise) {
    return app.postVisibleStartupPromise;
  }

  app.postVisibleStartupPromise = (async () => {
    await loadLegacyScripts(POST_VISIBLE_STARTUP_SCRIPTS, { doc });
    await loadLegacyScripts(POST_VISIBLE_SERVICE_SCRIPTS, { doc });
    await loadLegacyScripts(POST_VISIBLE_BOARD_DEPENDENCY_SCRIPTS, { doc });

    const postVisibleServices = await createAppServices(win);
    app.services = {
      ...app.services,
      ...postVisibleServices
    };
    app.context = createAppContext(app.bridge, app.services);
    app.bridge.setPwaManager?.(app.services.pwaManager);
    initializeDeferredBoardFeatures(app, win);
    app.drawingBoard?.scheduleDeferredUiInitialization?.();
    return app;
  })();

  return app.postVisibleStartupPromise;
}

export async function createApp({ win = window, doc = document } = {}) {
  if (win.__ABOARD_APP__) {
    return win.__ABOARD_APP__;
  }

  if (appStartupPromise) {
    return appStartupPromise;
  }

  appStartupPromise = (async () => {
    registerDialogManagerGlobal(win);
    registerRichTextParserGlobal(win);
    registerScriptLoaderGlobal(win);
    registerToastManagerGlobal(win);
    registerAnnouncementManagerGlobal(win);
    registerGifManagerGlobal(win);

    await loadLegacyScripts(VISIBLE_CORE_STARTUP_SCRIPTS, { doc });
    await loadLegacyScripts(VISIBLE_CORE_SERVICE_SCRIPTS, { doc });
    const services = await createAppServices(win);

    BrowserCheck.init(win, doc);

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

    await warmVisibleManagers(drawingBoard);
    win.__ABOARD_APP__ = app;
    scheduleAfterFirstPaint(win, () => {
      void startPostVisibleStartup(app, { win, doc });
    });
    return app;
  })();

  return appStartupPromise;
}
