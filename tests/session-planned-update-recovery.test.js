const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const PLANNED_UPDATE_RELOAD_KEY = 'aboardPlannedUpdateReload';
const SYNC_SNAPSHOT_KEY = 'aboardSyncSessionSnapshot';

function createLocalStorageStub(initialEntries = {}) {
  const store = new Map(
    Object.entries(initialEntries).map(([key, value]) => [key, String(value)])
  );

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

function loadSessionPersistenceRuntime(localStorage) {
  const sandboxConsole = {
    log() {},
    warn() {},
    error() {}
  };
  const window = {};
  const sandbox = {
    window,
    localStorage,
    console: sandboxConsole,
    JSON,
    Promise,
    Object,
    String,
    Number,
    Boolean,
    Date,
    Math,
    setTimeout,
    clearTimeout
  };

  sandbox.globalThis = sandbox;
  sandbox.self = sandbox;
  sandbox.window.localStorage = localStorage;

  const source = fs.readFileSync(
    path.join(__dirname, '..', 'js', 'modules', 'session-persistence-runtime.js'),
    'utf8'
  );

  vm.createContext(sandbox);
  vm.runInContext(source, sandbox, { filename: 'session-persistence-runtime.js' });
  return sandbox.window.AboardSessionPersistenceRuntime;
}

async function testFailedPlannedUpdateRestoreClearsOneShotMarker() {
  const localStorage = createLocalStorageStub({
    [SYNC_SNAPSHOT_KEY]: JSON.stringify({ timestamp: Date.now() }),
    [PLANNED_UPDATE_RELOAD_KEY]: JSON.stringify({
      reason: 'update',
      mode: 'immediate',
      createdAt: Date.now()
    })
  });
  const runtime = loadSessionPersistenceRuntime(localStorage);

  let restoreAttempts = 0;
  let recoveryModalCount = 0;
  const board = {
    syncSessionSnapshotKey: SYNC_SNAPSHOT_KEY,
    storageManager: {
      async hasSession() {
        return false;
      }
    },
    async restoreSession() {
      restoreAttempts += 1;
      return false;
    },
    showRecoveryModal() {
      recoveryModalCount += 1;
    }
  };

  const handled = await runtime.checkForRecovery(board);

  assert.equal(handled, true, 'failed auto-restore should still surface recovery UI');
  assert.equal(restoreAttempts, 1, 'planned update marker should trigger one auto-restore attempt');
  assert.equal(recoveryModalCount, 1, 'user should be offered manual recovery after failed auto-restore');
  assert.equal(
    localStorage.getItem(PLANNED_UPDATE_RELOAD_KEY),
    null,
    'planned update marker should be cleared after the first automatic restore attempt'
  );
}

async function testMissingRecoveryDataAlsoClearsStalePlannedUpdateMarker() {
  const localStorage = createLocalStorageStub({
    [PLANNED_UPDATE_RELOAD_KEY]: JSON.stringify({
      reason: 'update',
      mode: 'idle',
      createdAt: Date.now()
    })
  });
  const runtime = loadSessionPersistenceRuntime(localStorage);

  let restoreAttempts = 0;
  let recoveryModalCount = 0;
  const board = {
    syncSessionSnapshotKey: SYNC_SNAPSHOT_KEY,
    storageManager: {
      async hasSession() {
        return false;
      }
    },
    async restoreSession() {
      restoreAttempts += 1;
      return false;
    },
    showRecoveryModal() {
      recoveryModalCount += 1;
    }
  };

  const handled = await runtime.checkForRecovery(board);

  assert.equal(handled, false, 'no recovery UI should appear when no recoverable data exists');
  assert.equal(restoreAttempts, 0, 'auto-restore should not run without recoverable data');
  assert.equal(recoveryModalCount, 0, 'recovery modal should stay hidden without recoverable data');
  assert.equal(
    localStorage.getItem(PLANNED_UPDATE_RELOAD_KEY),
    null,
    'stale planned update marker should be cleared even when recovery data is missing'
  );
}

(async function main() {
  await testFailedPlannedUpdateRestoreClearsOneShotMarker();
  await testMissingRecoveryDataAlsoClearsStalePlannedUpdateMarker();
  console.log('session-planned-update-recovery.test: all assertions passed');
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
