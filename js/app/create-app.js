import { createAppContext } from './create-app-context.js';
import { createBoardDependencies } from './create-board-dependencies.js';
import { createBoardRuntimeDependencies } from './create-board-runtime-dependencies.js';
import {
  APP_OWNED_BOARD_DEPENDENCY_SCRIPTS,
  APP_OWNED_SERVICE_SCRIPTS,
  LEGACY_STARTUP_SCRIPTS
} from './legacy-manifest.js';
import { createAppServices } from './create-app-services.js';
import { loadLegacyScripts } from './legacy-script-loader.js';
import { BrowserCheck } from '../infra/browser-check.js';
import { registerDialogManagerGlobal } from '../infra/dialog-manager.js';
import { registerRichTextParserGlobal } from '../infra/rich-text-parser.js';
import { registerScriptLoaderGlobal } from '../infra/script-loader.js';
import { registerToastManagerGlobal } from '../features/toast/toast-manager.js';
import { registerAnnouncementManagerGlobal } from '../features/announcement/announcement-manager.js';
import { registerGifManagerGlobal } from '../features/media/gif-manager.js';
import { createLegacyRuntimeBridge } from '../legacy/runtime-bridge.js';

let appStartupPromise = null;

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

    await loadLegacyScripts(LEGACY_STARTUP_SCRIPTS, { doc });
    await loadLegacyScripts(APP_OWNED_SERVICE_SCRIPTS, { doc });
    const services = await createAppServices(win);

    BrowserCheck.init(win, doc);

    const bridge = createLegacyRuntimeBridge(win);
    await loadLegacyScripts(APP_OWNED_BOARD_DEPENDENCY_SCRIPTS, { doc });

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
    return app;
  })();

  return appStartupPromise;
}
