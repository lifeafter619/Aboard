const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

function loadCreateAppWithHooks({ events, createAppServices }) {
  const source = fs.readFileSync(
    path.join(__dirname, '..', 'js', 'app', 'create-app.js'),
    'utf8'
  );

  const sanitizedSource = source
    .replace(/import[\s\S]*?;\n/g, '')
    .replace('export async function createApp', 'async function createApp')
    + '\n;globalThis.__createAppTestExports = { createApp };';

  const sandbox = {
    console: {
      log() {},
      warn() {},
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
    resolveLegacyConstructor() {
      return null;
    },
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

(async function main() {
  await testBrowserCheckRunsBeforeServiceCreation();
  console.log('create-app-browser-check-order.test: all assertions passed');
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
