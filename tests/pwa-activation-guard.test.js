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
    controller: {},
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

function loadPWAManager() {
  const sandboxConsole = {
    log() {},
    warn() {},
    error() {}
  };
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
  return context.window.PWAManager;
}

function testFailedWorkerActivationDoesNotArmReloadFlag() {
  const PWAManager = loadPWAManager();
  const manager = new PWAManager();

  const worker = {
    postMessage() {
      throw new Error('simulated activation failure');
    }
  };

  const activated = manager.activateWaitingWorker(worker);

  assert.equal(activated, false, 'activation should fail when SKIP_WAITING cannot be posted');
  assert.equal(
    manager.shouldReloadOnControllerChange,
    false,
    'controllerchange reload flag should stay disabled after a failed worker activation'
  );
}

function run() {
  testFailedWorkerActivationDoesNotArmReloadFlag();
  console.log('pwa-activation-guard.test: all assertions passed');
}

run();
