const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const SESSION_WRITE_EPOCH_KEY = 'aboardSessionWriteEpoch';

function createStorageStub(initialEntries = {}) {
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

class LockManagerStub {
  constructor() {
    this.held = false;
    this.queue = [];
  }

  request(name, optionsOrCallback, maybeCallback) {
    const hasOptions = typeof optionsOrCallback === 'object';
    const callback = hasOptions ? maybeCallback : optionsOrCallback;

    if (hasOptions && optionsOrCallback.ifAvailable) {
      if (this.held) {
        return Promise.resolve(callback(null));
      }
      this.held = true;
      return Promise.resolve(callback({ name })).then((value) => {
        this.held = false;
        this.runNext();
        return value;
      });
    }

    return new Promise((resolve, reject) => {
      this.queue.push({ name, callback, resolve, reject });
      this.runNext();
    });
  }

  runNext() {
    if (this.held || this.queue.length === 0) return;
    const next = this.queue.shift();
    this.held = true;
    Promise.resolve(next.callback({ name: next.name })).then(
      (value) => {
        this.held = false;
        next.resolve(value);
        this.runNext();
      },
      (error) => {
        this.held = false;
        next.reject(error);
        this.runNext();
      }
    );
  }
}

function loadSessionPersistenceRuntime(localStorage, lockManager) {
  const window = {
    addEventListener() {},
    i18n: null
  };
  const sandbox = {
    window,
    localStorage,
    navigator: { locks: lockManager },
    document: { body: null },
    console: { log() {}, warn() {}, error() {} },
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

function createBoard() {
  return {
    sessionWriteLockState: 'pending',
    sessionWriteDirtyWhileBlocked: false,
    saveCount: 0,
    saveSessionDebounced() {
      this.saveCount += 1;
    }
  };
}

async function testPeerCleanupInvalidatesBlockedDirtyWriter() {
  const localStorage = createStorageStub({ [SESSION_WRITE_EPOCH_KEY]: '0' });
  const lockManager = new LockManagerStub();
  const runtime = loadSessionPersistenceRuntime(localStorage, lockManager);
  const owner = createBoard();
  const blocked = createBoard();

  assert.equal(await runtime.initializeSessionWriteLock(owner), true);
  assert.equal(await runtime.initializeSessionWriteLock(blocked), false);
  await Promise.resolve();
  await Promise.resolve();
  assert.equal(blocked.sessionWriteLockState, 'blocked');

  blocked.sessionWriteDirtyWhileBlocked = true;
  assert.equal(runtime.rotateSessionWriteEpoch(owner), true);
  assert.notEqual(localStorage.getItem(SESSION_WRITE_EPOCH_KEY), '0');

  owner.releaseSessionWriteLock();
  await new Promise((resolve) => setImmediate(resolve));

  assert.equal(
    blocked.sessionWriteLockState,
    'invalidated',
    'a tab opened before peer cleanup must not become a session writer'
  );
  assert.equal(blocked.saveCount, 0, 'peer cleanup must discard the stale tab autosave request');
  assert.equal(blocked.sessionWriteDirtyWhileBlocked, false);

  const successor = createBoard();
  assert.equal(
    await runtime.initializeSessionWriteLock(successor),
    true,
    'an invalidated tab must release the lock for a fresh board instance'
  );
  successor.releaseSessionWriteLock();
}

(async function main() {
  await testPeerCleanupInvalidatesBlockedDirtyWriter();
  console.log('session-write-lock-invalidation.test: all assertions passed');
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
