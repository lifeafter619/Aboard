const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

function loadDrawingBoard(localStorage) {
  const source = fs.readFileSync(
    path.join(__dirname, '..', 'js', 'main.js'),
    'utf8'
  );

  const document = {
    body: {},
    addEventListener() {},
    querySelectorAll() {
      return [];
    },
    querySelector() {
      return null;
    },
    getElementById(id) {
      if (id === 'transform-layer') {
        return {};
      }
      return null;
    }
  };

  const window = {
    document,
    localStorage,
    addEventListener() {},
    removeEventListener() {}
  };

  const context = {
    window,
    document,
    localStorage,
    console: {
      log() {},
      warn() {},
      error() {}
    },
    setTimeout,
    clearTimeout,
    Uint8ClampedArray,
    Map,
    Set,
    WeakSet,
    Promise,
    Date,
    Math,
    Object,
    Array,
    String,
    Number,
    Boolean,
    Reflect
  };
  context.globalThis = context;

  vm.createContext(context);
  new vm.Script(source, { filename: 'main.js' }).runInContext(context);

  const DrawingBoard = context.window.DrawingBoard;
  [
    'resizeCanvas',
    'setupEventListeners',
    'setupModalInteractionLock',
    'initResizableModals',
    'updateUI',
    'revealToolbar',
    'updatePaginationUI',
    'initializeCanvasView',
    'updateZoomUI',
    'applyZoom',
    'updateZoomControlsVisibility',
    'updateImportExportBtnVisibility',
    'updateFullscreenBtnVisibility',
    'checkForRecovery',
    'loadUploadedImages'
  ].forEach((methodName) => {
    DrawingBoard.prototype[methodName] = function stubbedMethod() {
      if (methodName === 'loadUploadedImages') {
        return [];
      }
      return undefined;
    };
  });

  return DrawingBoard;
}

function createCanvasStub() {
  return {
    width: 32,
    height: 24,
    getContext() {
      return {
        getImageData() {
          return { data: new Uint8ClampedArray(0), width: 32, height: 24 };
        }
      };
    }
  };
}

function createBaseOptions() {
  return {
    canvas: createCanvasStub(),
    bgCanvas: { getContext() { return {}; } },
    eraserCursor: { style: {} },
    settingsManager: {
      unlimitedZoom: false,
      loadSettings() {}
    },
    historyManager: {
      saveState() {},
      setSceneStateHandlers() {}
    },
    backgroundManager: {
      drawBackground() {}
    },
    imageControls: {},
    selectionManager: {},
    teachingToolsManager: {},
    shapeDrawingManager: {},
    lineStyleModal: {},
    edgeDrawingManager: {},
    collapsibleManager: {},
    announcementManager: {},
    storageManager: {}
  };
}

function createStorageStub() {
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

function testMissingDrawingEngineFailsWithClearError() {
  const DrawingBoard = loadDrawingBoard(createStorageStub());
  const options = createBaseOptions();

  assert.throws(
    () => new DrawingBoard(options),
    (error) => /DrawingEngine/.test(String(error?.message)),
    'a missing DrawingEngine must fail construction with an actionable error, not a bare TypeError'
  );
}

function testProvidedDrawingEngineStillConstructs() {
  const DrawingBoard = loadDrawingBoard(createStorageStub());
  const options = createBaseOptions();
  options.drawingEngine = {
    setShapeDrawingManager() {},
    setEdgeDrawingManager() {}
  };

  let board = null;
  assert.doesNotThrow(() => {
    board = new DrawingBoard(options);
  }, 'a provided DrawingEngine must keep constructing the board');

  assert.equal(board.drawingEngine, options.drawingEngine);
}

function main() {
  testMissingDrawingEngineFailsWithClearError();
  testProvidedDrawingEngineStillConstructs();
  console.log('main-drawing-engine-dependency.test: all assertions passed');
}

main();
