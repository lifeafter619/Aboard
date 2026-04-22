const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

function loadCreateAppWithHooks({
  events,
  createAppServices,
  resolveLegacyConstructor = () => null,
  warnings = []
}) {
  const source = fs.readFileSync(
    path.join(__dirname, '..', 'js', 'app', 'create-app.js'),
    'utf8'
  );

  const sanitizedSource = source
    .replace(/^import[\s\S]*?;\r?\n/gm, '')
    .replace('export async function createApp', 'async function createApp')
    + '\n;globalThis.__createAppTestExports = { createApp, startPostVisibleStartup };';

  const sandbox = {
    console: {
      log() {},
      warn(...args) {
        warnings.push(args.map(String).join(' '));
      },
      error() {}
    },
    STARTUP_UPDATE_ACTIONS: Object.freeze({
      CONTINUE: 'continue',
      APPLY_PREFERENCE: 'apply-preference',
      PROMPT: 'prompt'
    }),
    STARTUP_UPDATE_USER_CHOICES: Object.freeze({
      IDLE: 'idle',
      IMMEDIATE: 'immediate'
    }),
    resolveStartupUpdateAction() {
      return 'continue';
    },
    shouldContinuePostVisibleStartup() {
      return true;
    },
    createAppContext() {
      return {};
    },
    createBoardDependencies() {
      events.push('createBoardDependencies');
      return {};
    },
    createBoardRuntimeDependencies() {
      events.push('createBoardRuntimeDependencies');
      return {};
    },
    createAppServices,
    loadLegacyScripts(scripts) {
      events.push(`loadLegacyScripts:${scripts.join(',')}`);
      return Promise.resolve();
    },
    resolveLegacyConstructor,
    BrowserCheck: {
      init() {
        events.push('BrowserCheck.init');
      }
    },
    registerDialogManagerGlobal() {
      events.push('registerDialogManagerGlobal');
    },
    registerRichTextParserGlobal() {
      events.push('registerRichTextParserGlobal');
    },
    registerScriptLoaderGlobal() {
      events.push('registerScriptLoaderGlobal');
    },
    registerDeepCloneGlobal() {
      events.push('registerDeepCloneGlobal');
    },
    bindLabelButtonKeyboardSupport() {
      events.push('bindLabelButtonKeyboardSupport');
    },
    registerToastManagerGlobal() {
      events.push('registerToastManagerGlobal');
    },
    registerAnnouncementManagerGlobal() {
      events.push('registerAnnouncementManagerGlobal');
    },
    registerGifManagerGlobal() {
      events.push('registerGifManagerGlobal');
    },
    createLegacyRuntimeBridge() {
      return {
        getDrawingBoardClass() {
          return function DrawingBoard() {};
        },
        setDrawingBoard(board) {
          return board;
        },
        setPwaManager() {}
      };
    },
    POST_VISIBLE_BOARD_DEPENDENCY_SCRIPTS: [],
    POST_VISIBLE_SERVICE_SCRIPTS: [],
    POST_VISIBLE_STARTUP_SCRIPTS: [],
    VISIBLE_CORE_BOARD_DEPENDENCY_SCRIPTS: ['board-deps.js'],
    VISIBLE_CORE_SERVICE_SCRIPTS: ['i18n.js'],
    VISIBLE_CORE_STARTUP_SCRIPTS: ['startup.js'],
    window: null,
    document: null,
    WeakMap,
    Promise,
    Object,
    String,
    Number,
    Boolean,
    Array,
    Set,
    Map
  };

  const win = {
    setTimeout,
    clearTimeout,
    requestAnimationFrame(callback) {
      callback();
    }
  };
  const doc = {
    body: {
      appendChild() {}
    }
  };

  sandbox.window = win;
  sandbox.document = doc;
  sandbox.globalThis = sandbox;
  vm.createContext(sandbox);
  vm.runInContext(sanitizedSource, sandbox, { filename: 'create-app.js' });

  return {
    createApp: sandbox.__createAppTestExports.createApp,
    startPostVisibleStartup: sandbox.__createAppTestExports.startPostVisibleStartup,
    win,
    doc
  };
}

async function testBrowserCheckRunsBeforeServiceCreation() {
  const events = [];
  const { createApp, win, doc } = loadCreateAppWithHooks({
    events,
    async createAppServices() {
      events.push('createAppServices');
      throw new Error('service initialization failed');
    }
  });

  await assert.rejects(
    createApp({ win, doc }),
    /service initialization failed/
  );

  assert.notEqual(
    events.indexOf('BrowserCheck.init'),
    -1,
    'createApp should run BrowserCheck even when service initialization fails'
  );
  assert.notEqual(
    events.indexOf('createAppServices'),
    -1,
    'test setup should reach service creation'
  );
  assert.ok(
    events.indexOf('BrowserCheck.init') < events.indexOf('createAppServices'),
    'BrowserCheck should run before service creation so incompatible browsers are warned before startup crashes'
  );
}

async function testPostVisibleStartupSurvivesDeferredOptionalFeatureFailures() {
  const events = [];
  const warnings = [];

  class ThrowingHelpSystem {
    constructor() {
      throw new Error('help unavailable');
    }
  }

  const { startPostVisibleStartup, win, doc } = loadCreateAppWithHooks({
    events,
    warnings,
    async createAppServices() {
      events.push('createAppServices');
      return {};
    },
    resolveLegacyConstructor(_win, className) {
      if (className === 'AboardHelpSystem' || className === 'HelpSystem') {
        return ThrowingHelpSystem;
      }
      return null;
    }
  });

  let timeDisplayCalls = 0;
  win.AboardBoardConstruction = {
    createTimeDisplayDependencies() {
      timeDisplayCalls += 1;
      throw new Error('time display unavailable');
    }
  };

  const app = {
    bridge: {
      setPwaManager() {}
    },
    services: {},
    drawingBoard: {
      settingsManager: {},
      uploadedImages: ['existing-image'],
      loadUploadedImages() {
        throw new Error('image restore unavailable');
      }
    },
    boardDependencies: {}
  };

  await assert.doesNotReject(
    startPostVisibleStartup(app, { win, doc }),
    'post-visible startup should degrade instead of rejecting when deferred optional features fail'
  );

  assert.equal(timeDisplayCalls, 1, 'deferred time display initialization should still be attempted once');
  assert.equal(app.drawingBoard.helpSystem, undefined, 'failed deferred help initialization should not leave a broken instance behind');
  assert.equal(app.drawingBoard.timeDisplayManager, undefined, 'failed deferred time display initialization should not set a broken manager');
  assert.deepEqual(
    app.drawingBoard.uploadedImages,
    ['existing-image'],
    'uploaded image restoration should preserve the last known state when deferred restoration fails'
  );
  assert.ok(
    warnings.some((entry) => entry.includes('HelpSystem')),
    'deferred help initialization failures should emit a warning'
  );
  assert.ok(
    warnings.some((entry) => entry.includes('TimeDisplayDependencies')),
    'deferred time display initialization failures should emit a warning'
  );
  assert.ok(
    warnings.some((entry) => entry.includes('uploaded image restoration')),
    'deferred uploaded image restoration failures should emit a warning'
  );
}

(async function main() {
  await testBrowserCheckRunsBeforeServiceCreation();
  await testPostVisibleStartupSurvivesDeferredOptionalFeatureFailures();
  console.log('create-app-browser-check-order.test: all assertions passed');
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
