const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

function createClassList() {
  const classes = new Set();
  return {
    add(name) {
      classes.add(name);
    },
    remove(name) {
      classes.delete(name);
    },
    contains(name) {
      return classes.has(name);
    }
  };
}

function createElement(id) {
  return {
    id,
    disabled: false,
    onclick: null,
    onkeydown: null,
    tabIndex: 0,
    classList: createClassList(),
    style: {},
    attributes: new Map(),
    setAttribute(name, value) {
      this.attributes.set(name, value);
    },
    focus() {}
  };
}

function loadSessionRuntime(document, window) {
  const source = fs.readFileSync(
    path.join(__dirname, '..', 'js', 'modules', 'session-runtime.js'),
    'utf8'
  );

  const context = {
    window,
    document,
    localStorage: {
      getItem() {
        return null;
      },
      setItem() {},
      removeItem() {}
    },
    console: {
      log() {},
      warn() {},
      error() {}
    },
    Promise,
    Object,
    String,
    Number,
    Boolean,
    Date,
    Math
  };

  context.globalThis = context;
  vm.createContext(context);
  vm.runInContext(source, context, { filename: 'session-runtime.js' });
  return context.window.AboardSessionRuntime;
}

async function testEscapeDoesNotCloseRecoveryModalWhileRestoreIsPending() {
  const modal = createElement('recovery-modal');
  const restoreBtn = createElement('recovery-restore-btn');
  const discardBtn = createElement('recovery-discard-btn');
  const title = createElement('recovery-title');
  const message = createElement('recovery-message');
  const elements = new Map([
    ['recovery-modal', modal],
    ['recovery-restore-btn', restoreBtn],
    ['recovery-discard-btn', discardBtn],
    ['recovery-title', title],
    ['recovery-message', message]
  ]);

  const document = {
    activeElement: null,
    body: {},
    getElementById(id) {
      return elements.get(id) || null;
    }
  };

  let resolveRestore;
  const restorePromise = new Promise((resolve) => {
    resolveRestore = resolve;
  });

  const window = {
    requestAnimationFrame(callback) {
      callback();
    },
    appDialog: {
      showAlert() {}
    }
  };

  const runtime = loadSessionRuntime(document, window);
  const board = {
    recoveryPromptOpen: false,
    restoreSession() {
      return restorePromise;
    },
    clearSessionData() {
      return Promise.resolve();
    }
  };

  runtime.showRecoveryModal(board);
  const restorePending = restoreBtn.onclick();

  modal.onkeydown({
    key: 'Escape',
    preventDefault() {}
  });

  assert.equal(modal.classList.contains('show'), true, 'recovery modal should remain visible while restore is pending');
  assert.equal(board.recoveryPromptOpen, true, 'pending restore should keep recovery prompt marked as open');

  resolveRestore(false);
  await restorePending;
}

(async function main() {
  await testEscapeDoesNotCloseRecoveryModalWhileRestoreIsPending();
  console.log('recovery-modal-pending-escape-guard.test: all assertions passed');
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
