const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

function loadDrawingBoard(localStorage, { globals = {}, warnings = [] } = {}) {
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
    ...globals,
    addEventListener() {},
    removeEventListener() {}
  };

  const context = {
    window,
    document,
    localStorage,
    console: {
      log() {},
      warn(...args) {
        warnings.push(args.map(String).join(' '));
      },
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
    Reflect,
    ...globals
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

function testLegacyDrawingBoardSurvivesFailingOptionalManagers() {
  class ThrowingStorageManager {
    constructor() {
      throw new Error('storage unavailable');
    }
  }

  class ThrowingCollapsibleManager {
    constructor() {
      throw new Error('collapsible unavailable');
    }
  }

  class ThrowingAnnouncementManager {
    constructor() {
      throw new Error('announcement unavailable');
    }
  }

  class ThrowingHelpSystem {
    constructor() {
      throw new Error('help unavailable');
    }
  }

  const warnings = [];
  const DrawingBoard = loadDrawingBoard(createThrowingStorageRecorder(), {
    globals: {
      StorageManager: ThrowingStorageManager,
      CollapsibleManager: ThrowingCollapsibleManager,
      AnnouncementManager: ThrowingAnnouncementManager,
      HelpSystem: ThrowingHelpSystem
    },
    warnings
  });

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
        saveState() {},
        onStateChanged: null
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
      edgeDrawingManager: {}
    });
  }, 'DrawingBoard should still construct when optional legacy managers fail to initialize');

  assert.ok(board.storageManager, 'storage manager should fall back to a safe no-op implementation');
  assert.equal(typeof board.storageManager.loadSession, 'function', 'storage fallback should expose session APIs');
  assert.ok(board.collapsibleManager, 'collapsible manager should fall back to a safe no-op implementation');
  assert.equal(typeof board.collapsibleManager.initializeCollapsibles, 'function', 'collapsible fallback should expose setup APIs');
  assert.ok(board.announcementManager, 'announcement manager should fall back to a safe no-op implementation');
  assert.equal(typeof board.announcementManager.showFromSettings, 'function', 'announcement fallback should expose modal APIs');
  assert.ok(board.helpSystem, 'help system should fall back to a safe no-op implementation');
  assert.equal(typeof board.helpSystem.showHelp, 'function', 'help fallback should expose help APIs');
  assert.ok(
    warnings.some((entry) => entry.includes('StorageManager'))
      && warnings.some((entry) => entry.includes('CollapsibleManager'))
      && warnings.some((entry) => entry.includes('AnnouncementManager'))
      && warnings.some((entry) => entry.includes('HelpSystem')),
    'optional legacy manager failures should emit warnings during startup degradation'
  );
}

(function main() {
  testLegacyDrawingBoardSurvivesBlockedPageBackgroundStorage();
  testLegacyDrawingBoardSurvivesFailingOptionalManagers();
  console.log('main-startup-storage-resilience.test: all assertions passed');
})();
