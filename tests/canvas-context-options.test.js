const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { pathToFileURL } = require('node:url');

async function testModularBoardDependenciesUseReadbackFriendlyContextOptions() {
  const moduleUrl = pathToFileURL(
    path.join(__dirname, '..', 'js', 'app', 'create-board-runtime-dependencies.js')
  ).href;
  const { createBoardRuntimeDependencies } = await import(moduleUrl);

  const canvasCalls = [];
  const canvas = {
    getContext(type, options) {
      canvasCalls.push({ type, options });
      return { kind: 'main-context' };
    }
  };
  const bgCanvas = {
    getContext() {
      return { kind: 'background-context' };
    }
  };

  const dependencies = createBoardRuntimeDependencies({
    doc: {
      getElementById(id) {
        if (id === 'canvas') return canvas;
        if (id === 'background-canvas') return bgCanvas;
        if (id === 'eraser-cursor') return { style: {} };
        return null;
      }
    },
    win: {},
    boardDependencies: {}
  });

  assert.equal(canvasCalls.length, 1);
  assert.equal(canvasCalls[0].type, '2d');
  assert.equal(canvasCalls[0].options?.desynchronized, true);
  assert.equal(canvasCalls[0].options?.alpha, true);
  assert.equal(canvasCalls[0].options?.willReadFrequently, true);
  assert.equal(dependencies.ctx?.kind, 'main-context');
}

function loadDrawingBoard() {
  const source = fs.readFileSync(
    path.join(__dirname, '..', 'js', 'main.js'),
    'utf8'
  );

  const localStorage = {
    getItem() {
      return null;
    },
    setItem() {},
    removeItem() {}
  };

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
    console,
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
    Number
  };

  vm.createContext(context);
  new vm.Script(source, { filename: 'main.js' }).runInContext(context);

  const DrawingBoard = context.window.DrawingBoard;
  const noOpMethods = [
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
  ];
  for (const methodName of noOpMethods) {
    DrawingBoard.prototype[methodName] = function stubbedMethod() {
      if (methodName === 'loadUploadedImages') {
        return [];
      }
      return undefined;
    };
  }

  return DrawingBoard;
}

function testLegacyDrawingBoardUsesReadbackFriendlyContextOptions() {
  const DrawingBoard = loadDrawingBoard();
  const canvasCalls = [];
  const canvas = {
    width: 32,
    height: 24,
    getContext(type, options) {
      canvasCalls.push({ type, options });
      return {
        getImageData() {
          return { data: new Uint8ClampedArray(0), width: 32, height: 24 };
        }
      };
    }
  };
  const bgCanvas = {
    getContext() {
      return {};
    }
  };

  new DrawingBoard({
    canvas,
    bgCanvas,
    eraserCursor: { style: {} },
    settingsManager: {
      unlimitedZoom: false,
      loadSettings() {}
    },
    drawingEngine: {
      setShapeDrawingManager() {},
      setEdgeDrawingManager() {}
    },
    historyManager: {
      saveState() {}
    },
    backgroundManager: {
      drawBackground() {}
    },
    imageControls: {},
    strokeControls: {},
    selectionManager: {},
    teachingToolsManager: {},
    shapeDrawingManager: {},
    lineStyleModal: {},
    edgeDrawingManager: {},
    collapsibleManager: {},
    announcementManager: {},
    storageManager: {}
  });

  assert.equal(canvasCalls.length, 1);
  assert.equal(canvasCalls[0].type, '2d');
  assert.equal(canvasCalls[0].options?.desynchronized, true);
  assert.equal(canvasCalls[0].options?.alpha, true);
  assert.equal(canvasCalls[0].options?.willReadFrequently, true);
}

async function run() {
  await testModularBoardDependenciesUseReadbackFriendlyContextOptions();
  testLegacyDrawingBoardUsesReadbackFriendlyContextOptions();
  console.log('canvas-context-options.test: all assertions passed');
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
