const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

function loadLazyManagerRuntime({
  loadImpl,
  windowOverrides = {},
  boardOverrides = {}
} = {}) {
  const source = fs.readFileSync(
    path.join(__dirname, '..', 'js', 'modules', 'lazy-manager-runtime.js'),
    'utf8'
  );

  const toastMessages = [];
  const alertMessages = [];
  const errors = [];
  const warnings = [];
  const appendedLinks = [];
  const document = {
    head: {
      appendChild(element) {
        appendedLinks.push(element);
      }
    },
    createElement(tagName) {
      return {
        tagName: tagName.toUpperCase(),
        rel: '',
        as: '',
        href: '',
        fetchPriority: ''
      };
    },
    querySelector(selector) {
      const hrefMatch = selector.match(/href="([^"]+)"/);
      if (!hrefMatch) {
        return null;
      }
      return appendedLinks.find((link) => link.href === hrefMatch[1]) || null;
    }
  };
  const window = {
    ScriptLoader: {
      async load(src) {
        if (typeof loadImpl === 'function') {
          return loadImpl(src, window);
        }
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
    },
    document,
    ...windowOverrides
  };

  const context = {
    window,
    document: window.document,
    console: {
      error(...args) {
        errors.push(args);
      },
      warn(...args) {
        warnings.push(args);
      }
    },
    Error,
    Array,
    Set,
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
      initResizableModals() {},
      ...boardOverrides
    },
    toastMessages,
    alertMessages,
    appendedLinks,
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

async function testPreloadPrefetchesScriptsWithoutInstantiatingManagers() {
  const loadedScripts = [];
  const { runtime, board, toastMessages, alertMessages, appendedLinks, warnings } = loadLazyManagerRuntime({
    loadImpl: async (src, runtimeWindow) => {
      loadedScripts.push(src);
      runtimeWindow[src] = class UnexpectedManager {};
    }
  });

  await runtime.preloadMoreFeatureManagers(board);

  assert.deepEqual(loadedScripts, [], 'preload should not execute lazy feature scripts');
  assert.equal(board.timerManager, undefined, 'preload should not instantiate timer manager');
  assert.equal(board.insertTextManager, undefined, 'preload should not instantiate insert text manager');
  assert.equal(board.projectManager, undefined, 'preload should not instantiate project manager');
  assert.deepEqual(
    appendedLinks.map((link) => [link.rel, link.as, link.href]),
    [
      ['prefetch', 'script', 'js/insert-image.js'],
      ['prefetch', 'script', 'js/modules/insert-text-manager.js'],
      ['prefetch', 'script', 'js/modules/timer.js'],
      ['prefetch', 'script', 'js/modules/random-picker.js'],
      ['prefetch', 'script', 'js/modules/scoreboard.js'],
      ['prefetch', 'script', 'js/export.js'],
      ['prefetch', 'script', 'js/modules/project-manager.js']
    ]
  );
  await runtime.preloadMoreFeatureManagers(board);
  assert.equal(appendedLinks.length, 7, 'repeated preloads should reuse existing prefetch links');
  assert.deepEqual(warnings, []);
  assert.deepEqual(toastMessages, []);
  assert.deepEqual(alertMessages, []);
}

async function testInsertTextManagerSurvivesMissingSelectionManager() {
  const { runtime, board, toastMessages, alertMessages } = loadLazyManagerRuntime({
    loadImpl: async (src, runtimeWindow) => {
      assert.equal(src, 'js/modules/insert-text-manager.js');
      runtimeWindow.InsertTextManager = class InsertTextManager {
        constructor(canvas, ctx, historyManager, drawingEngine) {
          this.canvas = canvas;
          this.ctx = ctx;
          this.historyManager = historyManager;
          this.drawingEngine = drawingEngine;
        }
      };
    },
    boardOverrides: {
      canvas: { id: 'canvas' },
      ctx: { id: 'ctx' },
      historyManager: { id: 'history' },
      drawingEngine: { id: 'engine' },
      selectionManager: null
    }
  });

  const manager = await runtime.getInsertTextManager(board);

  assert.equal(board.insertTextManager, manager);
  assert.equal(manager.canvas, board.canvas);
  assert.equal(manager.ctx, board.ctx);
  assert.deepEqual(toastMessages, []);
  assert.deepEqual(alertMessages, []);
}

async function run() {
  await testManagerLoadFailureRejectsWithoutUserNotification();
  await testPreloadPrefetchesScriptsWithoutInstantiatingManagers();
  await testInsertTextManagerSurvivesMissingSelectionManager();
  console.log('lazy-manager-runtime.test: all assertions passed');
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
