const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

function loadLazyManagerRuntime() {
  const source = fs.readFileSync(
    path.join(__dirname, '..', 'js', 'modules', 'lazy-manager-runtime.js'),
    'utf8'
  );

  const toastMessages = [];
  const alertMessages = [];
  const errors = [];
  const warnings = [];
  const window = {
    ScriptLoader: {
      async load(src) {
        throw new Error(`Failed to load ${src}`);
      }
    },
    i18n: {
      t(key, params = {}) {
        return `${key}:${params.feature || ''}`;
      }
    },
    appDialog: {
      showAlert(message, type) {
        alertMessages.push({ message, type });
      }
    }
  };

  const context = {
    window,
    console: {
      error(...args) {
        errors.push(args);
      },
      warn(...args) {
        warnings.push(args);
      }
    },
    Error,
    Promise
  };

  vm.createContext(context);
  new vm.Script(source, { filename: 'lazy-manager-runtime.js' }).runInContext(context);

  return {
    runtime: context.window.AboardLazyManagerRuntime,
    board: {
      settingsManager: {
        toastManager: {
          show(message, type) {
            toastMessages.push({ message, type });
          }
        }
      },
      initResizableModals() {}
    },
    toastMessages,
    alertMessages,
    errors,
    warnings
  };
}

async function testManagerLoadFailureRejectsWithoutUserNotification() {
  const { runtime, board, toastMessages, alertMessages } = loadLazyManagerRuntime();

  await assert.rejects(
    () => runtime.getTimerManager(board),
    /Failed to load js\/modules\/timer\.js/
  );

  assert.deepEqual(toastMessages, []);
  assert.deepEqual(alertMessages, []);
}

async function testPreloadFailuresStaySilentToUsers() {
  const { runtime, board, toastMessages, alertMessages, warnings } = loadLazyManagerRuntime();

  await runtime.preloadMoreFeatureManagers(board);

  assert.equal(warnings.length, 7);
  assert.deepEqual(toastMessages, []);
  assert.deepEqual(alertMessages, []);
}

async function run() {
  await testManagerLoadFailureRejectsWithoutUserNotification();
  await testPreloadFailuresStaySilentToUsers();
  console.log('lazy-manager-runtime.test: all assertions passed');
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
