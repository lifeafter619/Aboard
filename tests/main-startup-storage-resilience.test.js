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
    Boolean
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

function createThrowingStorageRecorder() {
  return {
    getItem() {
      throw new Error('storage blocked');
    },
    setItem() {},
    removeItem() {}
  };
}

function testLegacyDrawingBoardSurvivesBlockedPageBackgroundStorage() {
  const DrawingBoard = loadDrawingBoard(createThrowingStorageRecorder());
  const canvas = {
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
  const bgCanvas = {
    getContext() {
      return {};
    }
  };

  let board = null;
  assert.doesNotThrow(() => {
    board = new DrawingBoard({
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
  }, 'DrawingBoard should still construct when page background storage is unavailable');

  assert.deepEqual(
    JSON.parse(JSON.stringify(board.pageBackgrounds)),
    {},
    'page backgrounds should fall back to an empty object when storage is unavailable'
  );
}

(function main() {
  testLegacyDrawingBoardSurvivesBlockedPageBackgroundStorage();
  console.log('main-startup-storage-resilience.test: all assertions passed');
})();
