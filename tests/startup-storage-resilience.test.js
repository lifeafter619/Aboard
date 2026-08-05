const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

function createThrowingStorageRecorder() {
  const calls = [];
  return {
    calls,
    getItem(key) {
      calls.push(['getItem', key]);
      throw new Error('storage blocked');
    },
    setItem(key, value) {
      calls.push(['setItem', key, value]);
      throw new Error('storage blocked');
    },
    removeItem(key) {
      calls.push(['removeItem', key]);
      throw new Error('storage blocked');
    }
  };
}

function createWarningConsole(warnings) {
  return {
    warn(...args) {
      warnings.push(args.map(String).join(' '));
    },
    log() {},
    error() {}
  };
}

function loadSessionPersistenceRuntime({ localStorage, warnings = [] }) {
  const source = fs.readFileSync(
    path.join(__dirname, '..', 'js', 'modules', 'session-persistence-runtime.js'),
    'utf8'
  );

  const sandbox = {
    window: {},
    localStorage,
    console: createWarningConsole(warnings),
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

  vm.createContext(sandbox);
  vm.runInContext(source, sandbox, { filename: 'session-persistence-runtime.js' });
  return sandbox.window.AboardSessionPersistenceRuntime;
}

function loadUploadedImagesRuntime({ localStorage, warnings = [], errors = [] }) {
  const source = fs.readFileSync(
    path.join(__dirname, '..', 'js', 'modules', 'uploaded-images-runtime.js'),
    'utf8'
  );

  const sandbox = {
    window: {
      i18n: {
        t(key) {
          return key;
        }
      },
      appDialog: {
        showAlert(message, level) {
          errors.push([message, level]);
        }
      }
    },
    document: {
      getElementById() {
        return {
          querySelectorAll() {
            return [];
          },
          querySelector() {
            return null;
          },
          insertBefore() {}
        };
      },
      createElement() {
        return {
          className: '',
          dataset: {},
          textContent: '',
          addEventListener() {}
        };
      }
    },
    localStorage,
    console: createWarningConsole(warnings),
    Blob,
    Date,
    JSON,
    Object,
    String,
    Number,
    Boolean,
    Array,
    Math
  };

  sandbox.globalThis = sandbox;
  vm.createContext(sandbox);
  vm.runInContext(source, sandbox, { filename: 'uploaded-images-runtime.js' });
  return sandbox.window.AboardUploadedImagesRuntime;
}

function loadShapeDrawingManager({ localStorage, warnings = [] }) {
  const source = fs.readFileSync(
    path.join(__dirname, '..', 'js', 'modules', 'shape-drawing.js'),
    'utf8'
  ) + '\nwindow.__ShapeDrawingManager = ShapeDrawingManager;';

  const sandbox = {
    window: {
      devicePixelRatio: 1,
      addEventListener() {},
      removeEventListener() {},
      requestAnimationFrame(callback) {
        callback();
        return 1;
      },
      cancelAnimationFrame() {}
    },
    document: {
      createElement() {
        return {
          id: '',
          style: {},
          width: 0,
          height: 0,
          getContext() {
            return {
              clearRect() {},
              save() {},
              restore() {}
            };
          }
        };
      },
      body: {
        appendChild() {}
      }
    },
    localStorage,
    console: createWarningConsole(warnings),
    Math,
    Number,
    String,
    Boolean,
    Array,
    Object,
    Set,
    Map,
    Date,
    parseInt,
    parseFloat
  };

  vm.createContext(sandbox);
  vm.runInContext(source, sandbox, { filename: 'shape-drawing.js' });
  return sandbox.window.__ShapeDrawingManager;
}

function loadInsertTextManager({ localStorage, warnings = [] }) {
  const source = fs.readFileSync(
    path.join(__dirname, '..', 'js', 'modules', 'insert-text-manager.js'),
    'utf8'
  ) + '\nwindow.__InsertTextManager = InsertTextManager;';

  const sandbox = {
    window: {
      addEventListener() {},
      i18n: {
        t(key) {
          return key;
        }
      },
      toastManager: {
        show() {}
      }
    },
    document: {
      createElement() {
        return {
          style: {},
          classList: {
            add() {},
            remove() {},
            contains() {
              return false;
            }
          },
          addEventListener() {},
          appendChild() {},
          querySelector() {
            return null;
          },
          querySelectorAll() {
            return [];
          },
          setAttribute() {}
        };
      },
      getElementById() {
        return null;
      },
      body: {
        appendChild() {}
      },
      fonts: {
        add() {}
      }
    },
    localStorage,
    console: createWarningConsole(warnings),
    FontFace: class FakeFontFace {
      load() {
        return Promise.resolve(this);
      }
    },
    CustomEvent: class CustomEvent {
      constructor(type) {
        this.type = type;
      }
    },
    setTimeout,
    clearTimeout,
    Math,
    Number,
    String,
    Boolean,
    Array,
    Object,
    Set,
    Map,
    Date,
    parseInt,
    parseFloat,
    JSON,
    Promise
  };

  vm.createContext(sandbox);
  vm.runInContext(source, sandbox, { filename: 'insert-text-manager.js' });
  return sandbox.window.__InsertTextManager;
}

async function testSessionRecoveryStillWorksWhenLocalStorageIsBlocked() {
  const warnings = [];
  const runtime = loadSessionPersistenceRuntime({
    localStorage: createThrowingStorageRecorder(),
    warnings
  });

  let recoveryModalCount = 0;
  const board = {
    syncSessionSnapshotKey: 'aboardSyncSessionSnapshot',
    storageManager: {
      async hasSession() {
        return true;
      }
    },
    async restoreSession() {
      return false;
    },
    showRecoveryModal() {
      recoveryModalCount += 1;
    }
  };

  const handled = await runtime.checkForRecovery(board);

  assert.equal(
    handled,
    true,
    'session recovery should still surface the recovery modal when IndexedDB data exists'
  );
  assert.equal(recoveryModalCount, 1);
  assert.ok(
    warnings.some((entry) => entry.includes('session persistence') && entry.includes('localStorage')),
    'session persistence storage failures should emit warnings'
  );
}

function testUploadedImagesRuntimeSurvivesBlockedStorage() {
  const warnings = [];
  const errors = [];
  const runtime = loadUploadedImagesRuntime({
    localStorage: createThrowingStorageRecorder(),
    warnings,
    errors
  });

  const board = {
    uploadedImages: [],
    imageControls: {
      resetConfirmation() {}
    },
    backgroundManager: {
      async setBackgroundImage() {},
      getImageData() {
        return null;
      }
    },
    settingsManager: {
      toastManager: null
    },
    updateBackgroundUI() {},
    updateUploadedImagesButtons() {}
  };

  assert.deepEqual(
    JSON.parse(JSON.stringify(runtime.loadUploadedImages(board))),
    [],
    'uploaded images should fall back to an empty list when storage is unavailable'
  );
  assert.doesNotThrow(
    () => runtime.saveUploadedImage(board, 'data:image/png;base64,abc'),
    'saving uploaded images should degrade instead of throwing when storage is unavailable'
  );
  assert.equal(board.uploadedImages.length, 0, 'failed persistence should not leave partially-added images in memory');
  assert.ok(errors.length >= 1, 'users should still be notified when uploaded image persistence fails');
  assert.ok(
    warnings.some((entry) => entry.includes('uploaded images') && entry.includes('localStorage')),
    'uploaded image storage failures should emit warnings'
  );
}

function testUploadedImagesRuntimeIgnoresMalformedStoredCollections() {
  let storedValue = JSON.stringify({ unexpected: true });
  const runtime = loadUploadedImagesRuntime({
    localStorage: {
      getItem() { return storedValue; },
      setItem(_key, value) { storedValue = value; },
      removeItem() { storedValue = null; }
    }
  });
  const board = {
    uploadedImages: runtime.loadUploadedImages({}),
    settingsManager: { toastManager: null },
    updateUploadedImagesButtons() {}
  };

  assert.deepEqual(
    JSON.parse(JSON.stringify(board.uploadedImages)),
    [],
    'non-array uploaded image storage should fall back to an empty library'
  );
  assert.doesNotThrow(
    () => runtime.saveUploadedImage(board, 'data:image/png;base64,abc'),
    'a malformed stored image library should not break the next upload'
  );
  assert.equal(board.uploadedImages.length, 1);
}

function testShapeDrawingSurvivesBlockedStorage() {
  const warnings = [];
  const ShapeDrawingManager = loadShapeDrawingManager({
    localStorage: createThrowingStorageRecorder(),
    warnings
  });

  ShapeDrawingManager.prototype.createPreviewCanvas = function createPreviewCanvasStub() {
    this.previewCanvas = { style: {} };
    this.previewCtx = {
      clearRect() {},
      save() {},
      restore() {}
    };
  };

  const manager = new ShapeDrawingManager(
    { parentElement: { appendChild() {} } },
    {},
    {},
    {}
  );

  assert.equal(manager.lineStyle, 'solid');
  assert.equal(manager.arrowSize, manager.ARROW_SIZE_DEFAULT);
  assert.doesNotThrow(() => manager.setLineStyle('dashed'));
  assert.doesNotThrow(() => manager.setArrowSize(22));
  assert.ok(
    warnings.some((entry) => entry.includes('shape drawing') && entry.includes('localStorage')),
    'shape drawing storage failures should emit warnings'
  );
}

function testInsertTextManagerSurvivesBlockedStorage() {
  const warnings = [];
  const InsertTextManager = loadInsertTextManager({
    localStorage: createThrowingStorageRecorder(),
    warnings
  });

  InsertTextManager.prototype.createControls = function createControlsStub() {};
  InsertTextManager.prototype.setupEventListeners = function setupEventListenersStub() {};
  InsertTextManager.prototype.loadCustomFontsToDocument = function loadCustomFontsToDocumentStub() {
    return Promise.resolve([]);
  };

  const manager = new InsertTextManager({}, {}, {}, {});
  manager.customFonts = [{ name: 'Demo Font', data: 'data:font/ttf;base64,abc' }];

  assert.deepEqual(
    JSON.parse(JSON.stringify(manager.customFonts)),
    [{ name: 'Demo Font', data: 'data:font/ttf;base64,abc' }],
    'insert text manager should still keep in-memory custom fonts when persistence degrades'
  );
  assert.doesNotThrow(() => manager.saveCustomFonts());
  assert.ok(
    warnings.some((entry) => entry.includes('custom fonts') && entry.includes('localStorage')),
    'insert text storage failures should emit warnings'
  );
}

function testInsertTextManagerIgnoresMalformedStoredFonts() {
  const InsertTextManager = loadInsertTextManager({
    localStorage: {
      getItem() {
        return JSON.stringify([
          null,
          { name: '', data: 'data:font/woff2;base64,bad' },
          { name: 'Teacher Font', data: 'data:font/woff2;base64,dGVzdA==' }
        ]);
      },
      setItem() {},
      removeItem() {}
    }
  });

  InsertTextManager.prototype.createControls = function createControlsStub() {};
  InsertTextManager.prototype.setupEventListeners = function setupEventListenersStub() {};
  InsertTextManager.prototype.loadCustomFontsToDocument = function loadCustomFontsToDocumentStub() {
    return Promise.resolve([]);
  };

  const manager = new InsertTextManager({}, {}, {}, {});
  assert.deepEqual(
    JSON.parse(JSON.stringify(manager.customFonts)),
    [{ name: 'Teacher Font', data: 'data:font/woff2;base64,dGVzdA==' }],
    'malformed stored font entries should not break the text tool startup'
  );
}

(async function main() {
  await testSessionRecoveryStillWorksWhenLocalStorageIsBlocked();
  testUploadedImagesRuntimeSurvivesBlockedStorage();
  testUploadedImagesRuntimeIgnoresMalformedStoredCollections();
  testShapeDrawingSurvivesBlockedStorage();
  testInsertTextManagerSurvivesBlockedStorage();
  testInsertTextManagerIgnoresMalformedStoredFonts();
  console.log('startup-storage-resilience.test: all assertions passed');
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
