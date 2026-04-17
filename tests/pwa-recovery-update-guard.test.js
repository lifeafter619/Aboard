const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

function createDocumentStub() {
  return {
    readyState: 'loading',
    visibilityState: 'visible',
    activeElement: null,
    body: {
      appendChild() {}
    },
    documentElement: {
      lang: 'en-US'
    },
    addEventListener() {},
    getElementById() {
      return null;
    },
    querySelector() {
      return null;
    },
    createElement() {
      return {
        id: '',
        type: '',
        className: '',
        tabIndex: -1,
        textContent: '',
        style: {},
        classList: {
          add() {},
          remove() {},
          toggle() {},
          contains() {
            return false;
          }
        },
        appendChild() {},
        setAttribute() {},
        addEventListener() {},
        focus() {}
      };
    }
  };
}

function createServiceWorkerStub() {
  return {
    controller: null,
    ready: Promise.resolve(null),
    addEventListener() {},
    async getRegistration() {
      return null;
    },
    async register() {
      return {
        scope: './',
        waiting: null,
        installing: null,
        active: null,
        addEventListener() {},
        async update() {}
      };
    }
  };
}

function createLocalStorageStub() {
  const store = new Map();
  return {
    getItem(key) {
      return store.has(key) ? store.get(key) : null;
    },
    setItem(key, value) {
      store.set(key, String(value));
    },
    removeItem(key) {
      store.delete(key);
    }
  };
}

function loadPWAManagerHarness() {
  const source = fs.readFileSync(
    path.join(__dirname, '..', 'js', 'modules', 'pwa-manager.js'),
    'utf8'
  );

  const document = createDocumentStub();
  const navigator = {
    language: 'en-US',
    onLine: true,
    serviceWorker: createServiceWorkerStub()
  };
  const localStorage = createLocalStorageStub();
  const window = {
    document,
    navigator,
    localStorage,
    addEventListener() {},
    removeEventListener() {},
    setTimeout,
    clearTimeout,
    setInterval,
    clearInterval,
    requestAnimationFrame(callback) {
      return setTimeout(callback, 0);
    },
    location: {
      reload() {}
    }
  };

  const sandboxConsole = {
    log() {},
    warn() {},
    error() {}
  };

  const context = {
    window,
    document,
    navigator,
    localStorage,
    console: sandboxConsole,
    fetch: async () => ({ ok: false }),
    setTimeout,
    clearTimeout,
    setInterval,
    clearInterval,
    Promise,
    WeakSet,
    Object,
    String
  };

  vm.createContext(context);
  new vm.Script(source, { filename: 'pwa-manager.js' }).runInContext(context);

  return {
    PWAManager: context.window.PWAManager,
    window: context.window
  };
}

async function testPreparePlannedUpdateReloadSkipsPersistenceWhenRecoveryPromptIsOpen() {
  const { PWAManager, window } = loadPWAManagerHarness();
  const manager = new PWAManager();
  let persistCalls = 0;

  window.drawingBoard = {
    recoveryPromptOpen: true,
    async persistSessionForUpdateReload() {
      persistCalls += 1;
      return { hasSyncSnapshot: true, savedToIndexedDb: true };
    }
  };

  const result = await manager.preparePlannedUpdateReload({ mode: 'immediate' });

  assert.equal(result.canReload, false, 'planned reload should be blocked while recovery prompt is open');
  assert.equal(persistCalls, 0, 'recovery prompt should prevent session persistence that would overwrite restorable data');
}

async function testPreparePlannedUpdateReloadWaitsForRecoveryCheckToFinish() {
  const { PWAManager, window } = loadPWAManagerHarness();
  const manager = new PWAManager();
  let persistCalls = 0;
  let resolveRecoveryCheck;

  const recoveryCheckPromise = new Promise((resolve) => {
    resolveRecoveryCheck = resolve;
  });

  window.drawingBoard = {
    recoveryPromptOpen: false,
    recoveryCheckPromise,
    async persistSessionForUpdateReload() {
      persistCalls += 1;
      return { hasSyncSnapshot: true, savedToIndexedDb: true };
    }
  };

  const pending = manager.preparePlannedUpdateReload({ mode: 'immediate' });
  await Promise.resolve();

  assert.equal(persistCalls, 0, 'planned reload should wait for recovery detection before persisting');

  window.drawingBoard.recoveryPromptOpen = true;
  resolveRecoveryCheck(true);

  const result = await pending;
  assert.equal(result.canReload, false, 'recovery prompt discovered during the pending check should cancel the planned reload');
  assert.equal(persistCalls, 0, 'persistence must stay blocked when recovery becomes pending');
}

async function testPreparePlannedUpdateReloadSkipsWhenRecoveryIsStillUnresolved() {
  const { PWAManager, window } = loadPWAManagerHarness();
  const manager = new PWAManager();
  let persistCalls = 0;

  window.drawingBoard = {
    recoveryPromptOpen: false,
    recoveryCheckPromise: null,
    hasUnresolvedRecoveryData: true,
    async persistSessionForUpdateReload() {
      persistCalls += 1;
      return { hasSyncSnapshot: true, savedToIndexedDb: true };
    }
  };

  const result = await manager.preparePlannedUpdateReload({ mode: 'idle' });

  assert.equal(
    result.canReload,
    false,
    'planned reload should stay blocked until the user explicitly resolves recoverable session data'
  );
  assert.equal(
    persistCalls,
    0,
    'unresolved recovery data should prevent persistence that would overwrite the older session snapshot'
  );
}

(async function main() {
  await testPreparePlannedUpdateReloadSkipsPersistenceWhenRecoveryPromptIsOpen();
  await testPreparePlannedUpdateReloadWaitsForRecoveryCheckToFinish();
  await testPreparePlannedUpdateReloadSkipsWhenRecoveryIsStillUnresolved();
  console.log('pwa-recovery-update-guard.test: all assertions passed');
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
