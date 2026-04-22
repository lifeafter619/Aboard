const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

function loadCreateAppInternals() {
  const source = fs.readFileSync(
    path.join(__dirname, '..', 'js', 'app', 'create-app.js'),
    'utf8'
  );

  const sanitizedSource = source
    .replace(/^import[\s\S]*?;\r?\n/gm, '')
    .replace('export async function createApp', 'async function createApp')
    + '\n;globalThis.__createAppTestExports = { runStartupUpdateGate };';

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
    resolveStartupUpdateAction({ hasWaitingWorker = false } = {}) {
      return hasWaitingWorker ? 'prompt' : 'continue';
    },
    shouldContinuePostVisibleStartup() {
      return true;
    },
    createAppContext() {
      return {};
    },
    createBoardDependencies() {
      return {};
    },
    createBoardRuntimeDependencies() {
      return {};
    },
    createAppServices() {
      return {};
    },
    loadLegacyScripts() {
      return Promise.resolve();
    },
    resolveLegacyConstructor() {
      return null;
    },
    BrowserCheck: { init() {} },
    registerDialogManagerGlobal() {},
    registerRichTextParserGlobal() {},
    registerScriptLoaderGlobal() {},
    registerDeepCloneGlobal() {},
    registerToastManagerGlobal() {},
    registerAnnouncementManagerGlobal() {},
    registerGifManagerGlobal() {},
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
    VISIBLE_CORE_BOARD_DEPENDENCY_SCRIPTS: [],
    VISIBLE_CORE_SERVICE_SCRIPTS: [],
    VISIBLE_CORE_STARTUP_SCRIPTS: [],
    window: {},
    document: {},
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

  sandbox.globalThis = sandbox;
  vm.createContext(sandbox);
  vm.runInContext(sanitizedSource, sandbox, { filename: 'create-app.js' });
  return sandbox.__createAppTestExports;
}

async function testStartupUpdateGateWaitsForRecoveryAndSkipsPromptWhenRecoveryIsUnresolved() {
  const { runStartupUpdateGate } = loadCreateAppInternals();
  let promptCalls = 0;
  let resolveRecoveryCheck;
  const recoveryCheckPromise = new Promise((resolve) => {
    resolveRecoveryCheck = resolve;
  });

  const app = {
    drawingBoard: {
      recoveryCheckPromise,
      hasUnresolvedRecoveryData: false
    },
    services: {
      pwaManager: {
        async collectStartupUpdateState() {
          return { hasWaitingWorker: true, currentVersion: '1.0.0', latestVersion: '1.1.0' };
        },
        getUpdatePreference() {
          return 'prompt';
        },
        async promptForUpdate() {
          promptCalls += 1;
          return 'idle';
        }
      }
    }
  };

  const pendingGate = runStartupUpdateGate(app, { win: {} });
  await Promise.resolve();

  assert.equal(promptCalls, 0, 'startup update prompt should wait until recovery detection settles');

  app.drawingBoard.hasUnresolvedRecoveryData = true;
  resolveRecoveryCheck(true);

  const gateResult = await pendingGate;
  assert.equal(promptCalls, 0, 'startup update prompt should stay suppressed while recovery remains unresolved');
  assert.equal(gateResult.action, 'continue', 'startup should continue without presenting an update dialog during recovery');
  assert.equal(gateResult.userChoice, 'idle', 'recovery path should behave like a deferred startup update');
}

(async function main() {
  await testStartupUpdateGateWaitsForRecoveryAndSkipsPromptWhenRecoveryIsUnresolved();
  console.log('startup-update-recovery-gate.test: all assertions passed');
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
