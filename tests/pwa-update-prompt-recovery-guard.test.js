const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

function createDocumentStub() {
  const appendedNodes = [];
  const body = {
    appendChild(node) {
      appendedNodes.push(node);
    }
  };

  return {
    appendedNodes,
    body,
    readyState: 'loading',
    visibilityState: 'visible',
    activeElement: null,
    documentElement: {
      lang: 'en-US'
    },
    addEventListener() {},
    getElementById(id) {
      return appendedNodes.find((node) => node.id === id) || null;
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
        dataset: {},
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
    window: context.window,
    document
  };
}

async function testBackgroundUpdatePromptSkipsWhileRecoveryIsUnresolved() {
  const { PWAManager, window, document } = loadPWAManagerHarness();
  const manager = new PWAManager();

  window.drawingBoard = {
    recoveryCheckPromise: Promise.resolve(true),
    hasUnresolvedRecoveryData: true,
    recoveryPromptOpen: false
  };

  const outcome = await Promise.race([
    manager.promptForUpdate({ reason: 'background' }).then((value) => ({ status: 'resolved', value })),
    new Promise((resolve) => setTimeout(() => resolve({ status: 'pending' }), 0))
  ]);

  assert.deepEqual(
    outcome,
    { status: 'resolved', value: 'idle' },
    'background update prompts should immediately defer while recoverable content is unresolved'
  );
  assert.equal(document.appendedNodes.length, 0, 'no update modal should be created while recovery resolution is pending');
}

async function testStartupPromptKeepsStartupContextAfterRecoveryGuardPasses() {
  const { PWAManager, window } = loadPWAManagerHarness();
  const manager = new PWAManager();

  window.drawingBoard = {
    recoveryCheckPromise: Promise.resolve(false),
    hasUnresolvedRecoveryData: false,
    recoveryPromptOpen: false
  };

  const promptPromise = manager.promptForUpdate({ reason: 'startup' });
  await new Promise((resolve) => setTimeout(resolve, 0));

  assert.equal(
    manager.updateModalContext?.reason,
    'startup',
    'startup update prompts should preserve startup context after recovery guard passes'
  );

  manager.resolveUpdateModalChoice('idle');
  await promptPromise;
}

(async function main() {
  await testBackgroundUpdatePromptSkipsWhileRecoveryIsUnresolved();
  await testStartupPromptKeepsStartupContextAfterRecoveryGuardPasses();
  console.log('pwa-update-prompt-recovery-guard.test: all assertions passed');
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
