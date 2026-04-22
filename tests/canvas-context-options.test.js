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

async function testModularBoardDependenciesSurviveOptionalUiManagerFailures() {
  const moduleUrl = pathToFileURL(
    path.join(__dirname, '..', 'js', 'app', 'create-board-runtime-dependencies.js')
  ).href;
  const { createBoardRuntimeDependencies } = await import(moduleUrl);

  class FakeDrawingEngine {
    setShapeDrawingManager(manager) {
      this.shapeDrawingManager = manager;
    }

    setEdgeDrawingManager(manager) {
      this.edgeDrawingManager = manager;
    }
  }

  class FakeHistoryManager {}
  class FakeBackgroundManager {}
  class FakeShapeDrawingManager {}

  class ThrowingImageControls {
    constructor() {
      throw new Error('image controls unavailable');
    }
  }

  class ThrowingTeachingToolsManager {
    constructor() {
      throw new Error('teaching tools unavailable');
    }
  }

  class ThrowingLineStyleModal {
    constructor() {
      throw new Error('line style modal unavailable');
    }
  }

  class FakeEdgeDrawingManager {
    constructor() {
      throw new Error('edge drawing should not initialize without teaching tools');
    }
  }

  const warnings = [];
  const originalWarn = console.warn;

  try {
    console.warn = (...args) => {
      warnings.push(args.map((value) => String(value)).join(' '));
    };

    const dependencies = createBoardRuntimeDependencies({
      doc: {
        getElementById(id) {
          if (id === 'canvas') {
            return {
              getContext() {
                return { kind: 'main-context' };
              }
            };
          }
          if (id === 'background-canvas') {
            return {
              getContext() {
                return { kind: 'background-context' };
              }
            };
          }
          if (id === 'eraser-cursor') {
            return { style: {} };
          }
          return null;
        }
      },
      win: {
        AboardDrawingEngine: FakeDrawingEngine,
        AboardHistoryManager: FakeHistoryManager,
        AboardBackgroundManager: FakeBackgroundManager,
        AboardImageControls: ThrowingImageControls,
        AboardTeachingToolsManager: ThrowingTeachingToolsManager,
        AboardShapeDrawingManager: FakeShapeDrawingManager,
        AboardLineStyleModal: ThrowingLineStyleModal,
        AboardEdgeDrawingManager: FakeEdgeDrawingManager
      },
      boardDependencies: {}
    });

    assert.ok(dependencies.drawingEngine instanceof FakeDrawingEngine, 'core drawing engine should still initialize');
    assert.ok(dependencies.historyManager instanceof FakeHistoryManager, 'core history manager should still initialize');
    assert.ok(dependencies.backgroundManager instanceof FakeBackgroundManager, 'core background manager should still initialize');
    assert.ok(dependencies.shapeDrawingManager instanceof FakeShapeDrawingManager, 'shape drawing should still initialize');
    assert.equal(
      dependencies.drawingEngine.shapeDrawingManager,
      dependencies.shapeDrawingManager,
      'core managers should still wire surviving shape drawing dependencies'
    );
    assert.equal(dependencies.imageControls, null, 'optional image controls should degrade when construction fails');
    assert.equal(dependencies.teachingToolsManager, null, 'optional teaching tools should degrade when construction fails');
    assert.equal(dependencies.lineStyleModal, null, 'optional line style modal should degrade when construction fails');
    assert.equal(dependencies.edgeDrawingManager, undefined, 'dependent optional managers should be skipped when prerequisites fail');
    assert.ok(
      warnings.some((entry) => entry.includes('ImageControls')),
      'optional image control failures should emit a warning'
    );
    assert.ok(
      warnings.some((entry) => entry.includes('TeachingToolsManager')),
      'optional teaching tools failures should emit a warning'
    );
    assert.ok(
      warnings.some((entry) => entry.includes('LineStyleModal')),
      'optional line style modal failures should emit a warning'
    );
  } finally {
    console.warn = originalWarn;
  }
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
  await testModularBoardDependenciesSurviveOptionalUiManagerFailures();
  testLegacyDrawingBoardUsesReadbackFriendlyContextOptions();
  console.log('canvas-context-options.test: all assertions passed');
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
