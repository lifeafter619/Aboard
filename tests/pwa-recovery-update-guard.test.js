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

  let nextTimerId = 1;
  const timeouts = new Map();
  const intervals = new Map();
  const fakeSetTimeout = (callback, delay) => {
    const id = nextTimerId++;
    timeouts.set(id, { callback, delay });
    return id;
  };
  const fakeClearTimeout = (id) => {
    timeouts.delete(id);
  };
  const fakeSetInterval = (callback, delay) => {
    const id = nextTimerId++;
    intervals.set(id, { callback, delay });
    return id;
  };
  const fakeClearInterval = (id) => {
    intervals.delete(id);
  };

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
    setTimeout: fakeSetTimeout,
    clearTimeout: fakeClearTimeout,
    setInterval: fakeSetInterval,
    clearInterval: fakeClearInterval,
    requestAnimationFrame(callback) {
      return fakeSetTimeout(callback, 0);
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
    setTimeout: fakeSetTimeout,
    clearTimeout: fakeClearTimeout,
    setInterval: fakeSetInterval,
    clearInterval: fakeClearInterval,
    Promise,
    WeakSet,
    Object,
    String
  };

  vm.createContext(context);
  new vm.Script(source, { filename: 'pwa-manager.js' }).runInContext(context);

  return {
    PWAManager: context.window.PWAManager,
    window: context.window,
    timers: {
      timeouts,
      intervals,
      runTimeout(id) {
        const entry = timeouts.get(id);
        if (!entry) {
          return false;
        }
        timeouts.delete(id);
        entry.callback();
        return true;
      }
    }
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

async function testIdleUpdateTimeoutFallsBackToLowFrequencyRetry() {
  const { PWAManager, timers } = loadPWAManagerHarness();
  const manager = new PWAManager();

  manager.scheduleIdleUpdate({ reason: 'background', currentVersion: '1.0.0', latestVersion: '1.0.1' });
  manager.idleUpdatePollStartedAt = 1;

  const result = await manager.maybeApplyIdleUpdate();

  assert.equal(result, false, 'timed-out idle updates should pause instead of forcing an immediate apply');
  assert.ok(manager.pendingIdleUpdateIntent, 'timed-out idle updates should preserve the pending update intent');
  assert.equal(manager.idleUpdateCheckTimer, null, 'timed-out idle updates should stop the 1 Hz polling interval');
  assert.equal(timers.intervals.size, 0, 'timed-out idle updates should clear the active interval');
  assert.equal(timers.timeouts.size, 1, 'timed-out idle updates should schedule a low-frequency retry');
}

async function testIdleUpdateRetryRestartsPollingWhenIntentStillExists() {
  const { PWAManager, timers } = loadPWAManagerHarness();
  const manager = new PWAManager();

  manager.pendingIdleUpdateIntent = manager.buildPlannedUpdateIntent({
    mode: 'idle',
    reason: 'background',
    currentVersion: '1.0.0',
    latestVersion: '1.0.1'
  });

  const scheduled = manager.scheduleIdleUpdateRetry();
  const [retryTimeoutId] = [...timers.timeouts.keys()];

  assert.equal(scheduled, true, 'retry scheduling should succeed while an idle intent is pending');
  assert.ok(retryTimeoutId, 'retry scheduling should create a timeout');

  timers.runTimeout(retryTimeoutId);

  assert.notEqual(manager.idleUpdateCheckTimer, null, 'running the retry timer should restart idle polling');
  assert.equal(timers.intervals.size, 1, 'retry restart should recreate the 1 Hz polling interval');
}

async function testScheduleIdleUpdateSucceedsWhenPollingIsAlreadyRunning() {
  const { PWAManager, timers } = loadPWAManagerHarness();
  const manager = new PWAManager();

  const firstScheduled = manager.scheduleIdleUpdate({
    reason: 'background',
    currentVersion: '1.0.0',
    latestVersion: '1.0.1'
  });
  const secondScheduled = manager.scheduleIdleUpdate({
    reason: 'background',
    currentVersion: '1.0.0',
    latestVersion: '1.0.2'
  });

  assert.equal(firstScheduled, true, 'initial idle update scheduling should succeed');
  assert.equal(secondScheduled, true, 'refreshing an existing idle update intent should still report success');
  assert.equal(timers.intervals.size, 1, 'refreshing the intent should reuse the existing polling interval');
  assert.equal(manager.pendingIdleUpdateIntent.latestVersion, '1.0.2', 'refreshing the intent should keep the newer update metadata');
}

(async function main() {
  await testPreparePlannedUpdateReloadSkipsPersistenceWhenRecoveryPromptIsOpen();
  await testPreparePlannedUpdateReloadWaitsForRecoveryCheckToFinish();
  await testPreparePlannedUpdateReloadSkipsWhenRecoveryIsStillUnresolved();
  await testIdleUpdateTimeoutFallsBackToLowFrequencyRetry();
  await testIdleUpdateRetryRestartsPollingWhenIntentStillExists();
  await testScheduleIdleUpdateSucceedsWhenPollingIsAlreadyRunning();
  console.log('pwa-recovery-update-guard.test: all assertions passed');
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
