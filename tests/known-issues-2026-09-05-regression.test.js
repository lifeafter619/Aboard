const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const REPO_ROOT = path.join(__dirname, '..');
const BIG_DATA_URL = `data:image/png;base64,${'A'.repeat(8192)}`;
const SECOND_DATA_URL = `data:image/png;base64,${'B'.repeat(4096)}`;

function readSource(relativePath) {
  return fs.readFileSync(path.join(REPO_ROOT, relativePath), 'utf8');
}

function createStorageStub(seed = {}) {
  const store = new Map(Object.entries(seed));
  return {
    store,
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

function loadModulesIntoContext(sandbox, files) {
  sandbox.globalThis = sandbox;
  sandbox.window.document = sandbox.document;
  sandbox.window.localStorage = sandbox.localStorage;
  vm.createContext(sandbox);
  for (const file of files) {
    vm.runInContext(readSource(file), sandbox, { filename: file });
  }
}

function loadPaginationRuntime(localStorage) {
  const loadedImages = [];
  const sandbox = {
    console,
    window: {
      safeDeepClone(value) {
        return JSON.parse(JSON.stringify(value));
      }
    },
    document: {
      getElementById() {
        return null;
      }
    },
    localStorage,
    JSON,
    Math,
    Object,
    Number,
    String,
    Array,
    Set,
    Map,
    Date,
    Promise,
    Image: class FakeImage {
      set src(value) {
        this._src = value;
        loadedImages.push(this);
      }

      get src() {
        return this._src;
      }
    }
  };
  loadModulesIntoContext(sandbox, ['js/modules/pagination-runtime.js']);
  const runtime = sandbox.window.AboardPaginationRuntime;
  runtime.__loadedImages = loadedImages;
  return runtime;
}

function createBackgroundManagerStub(overrides = {}) {
  return {
    backgroundColor: '#112233',
    backgroundPattern: 'image',
    bgOpacity: 0.8,
    patternIntensity: 0.65,
    patternDensity: 1.5,
    coordinateOriginX: 24,
    coordinateOriginY: -8,
    backgroundImageData: BIG_DATA_URL,
    imageSize: 1,
    imageTransform: {
      x: 0, y: 0, width: 0, height: 0, rotation: 0, scale: 1,
      flipHorizontal: false, flipVertical: false
    },
    gifLoopCount: 0,
    backgroundOutsideLayerOrder: 1,
    getCoordinateOverlayState() {
      return {
        showTicks: true, showLabels: true, showPointLabels: true, showOrigin: true,
        pointLineMode: 'auto', connectPoints: true, snapToGrid: true,
        lineColor: '#2563eb', points: [], plots: [], groups: []
      };
    },
    setCoordinateOverlayState() {},
    drawBackground() {},
    ...overrides
  };
}

function createPaginationBoard(runtime, localStorage, backgroundManager = createBackgroundManagerStub()) {
  return {
    currentPage: 1,
    pages: [{}],
    pageBackgrounds: {},
    sharedPageBackgroundImages: new Map(),
    canvas: { width: 1280, height: 720 },
    ctx: {
      clearRect() {},
      putImageData() {},
      getImageData() {
        return { blank: true };
      }
    },
    backgroundManager,
    historyManager: {
      saveState() {},
      reset() {}
    },
    saveCurrentPageScene() {},
    restorePageScene() {
      return null;
    },
    updatePaginationUI() {},
    saveSessionDebounced() {},
    enforcePageBitmapMemoryBudget() {},
    canRegeneratePageBitmap() {
      return false;
    },
    getPageRasterFallbackBase() {
      return null;
    },
    drawingEngine: {
      updateOffCanvasImageMirrors() {},
      renderScene() {}
    },
    updateBackgroundUI() {},
    insertTextManager: null,
    loadPage(pageNumber) {
      return runtime.loadPage(this, pageNumber);
    },
    savePageBackground(pageNumber) {
      return runtime.savePageBackground(this, pageNumber);
    },
    restorePageBackground(pageNumber) {
      return runtime.restorePageBackground(this, pageNumber);
    }
  };
}

function testSharedBackgroundImageIsStoredOnceAcrossPages() {
  const localStorage = createStorageStub();
  const runtime = loadPaginationRuntime(localStorage);
  const board = createPaginationBoard(runtime, localStorage);

  runtime.savePageBackground(board, 1);
  runtime.addPage(board);
  runtime.goToPage(board, 3);

  const persistedPages = localStorage.getItem('pageBackgrounds');
  const persistedPool = localStorage.getItem('sharedPageBackgroundImages');

  assert.ok(persistedPages.includes('shared:'), 'page entries should reference the shared pool');
  assert.ok(!persistedPages.includes(BIG_DATA_URL), 'page entries must not embed the full image payload');
  assert.ok(persistedPool.includes(BIG_DATA_URL), 'the pool should hold the shared payload');

  const totalOccurrences = (persistedPages.split(BIG_DATA_URL).length - 1)
    + (persistedPool.split(BIG_DATA_URL).length - 1);
  assert.equal(totalOccurrences, 1, 'the payload must be stored exactly once across both keys');
}

function testRestorePageBackgroundResolvesSharedReference() {
  const localStorage = createStorageStub();
  const runtime = loadPaginationRuntime(localStorage);
  const board = createPaginationBoard(runtime, localStorage);

  runtime.savePageBackground(board, 1);

  const restoredBoard = createPaginationBoard(runtime, localStorage, createBackgroundManagerStub({ backgroundImageData: null }));
  restoredBoard.pageBackgrounds = JSON.parse(localStorage.getItem('pageBackgrounds'));
  const savedPool = JSON.parse(localStorage.getItem('sharedPageBackgroundImages'));
  restoredBoard.sharedPageBackgroundImages = new Map(Object.entries(savedPool));

  runtime.restorePageBackground(restoredBoard, 1);

  assert.equal(
    restoredBoard.backgroundManager.backgroundImageData,
    BIG_DATA_URL,
    'page restore should materialize the shared reference back into the payload'
  );

  runtime.__loadedImages[0].onload();
}

function testLegacyPlainDataUrlEntriesStillRestore() {
  const localStorage = createStorageStub();
  const runtime = loadPaginationRuntime(localStorage);
  const board = createPaginationBoard(runtime, localStorage, createBackgroundManagerStub({ backgroundImageData: null }));

  board.pageBackgrounds[1] = {
    backgroundColor: '#112233',
    backgroundPattern: 'image',
    bgOpacity: 1,
    patternIntensity: 0.5,
    patternDensity: 1,
    coordinateOriginX: 0,
    coordinateOriginY: 0,
    coordinateOverlayState: board.backgroundManager.getCoordinateOverlayState(),
    backgroundImageData: BIG_DATA_URL,
    imageSize: 1,
    imageTransform: { x: 0, y: 0, width: 0, height: 0, rotation: 0, scale: 1, flipHorizontal: false, flipVertical: false },
    gifLoopCount: 0,
    backgroundOutsideLayerOrder: 1
  };

  runtime.restorePageBackground(board, 1);

  assert.equal(
    board.backgroundManager.backgroundImageData,
    BIG_DATA_URL,
    'legacy entries with inline payloads must keep restoring'
  );
  runtime.__loadedImages[0].onload();
}

function testSharedImagePoolIsPrunedWhenNoLongerReferenced() {
  const localStorage = createStorageStub();
  const runtime = loadPaginationRuntime(localStorage);
  const board = createPaginationBoard(runtime, localStorage);

  runtime.savePageBackground(board, 1);
  board.backgroundManager.backgroundImageData = SECOND_DATA_URL;
  runtime.savePageBackground(board, 1);

  const persistedPool = JSON.parse(localStorage.getItem('sharedPageBackgroundImages'));
  assert.deepEqual(
    Object.values(persistedPool),
    [SECOND_DATA_URL],
    'pool entries without any referencing page should be pruned on persist'
  );
}

function testUnresolvedSharedReferenceDegradesToEmptyImage() {
  const localStorage = createStorageStub();
  const runtime = loadPaginationRuntime(localStorage);
  const board = createPaginationBoard(runtime, localStorage, createBackgroundManagerStub({ backgroundImageData: null }));

  board.pageBackgrounds[1] = {
    backgroundColor: '#ffffff',
    backgroundPattern: 'image',
    bgOpacity: 1,
    patternIntensity: 0.5,
    patternDensity: 1,
    coordinateOriginX: 0,
    coordinateOriginY: 0,
    coordinateOverlayState: board.backgroundManager.getCoordinateOverlayState(),
    backgroundImageData: 'shared:does-not-exist',
    imageSize: 1,
    imageTransform: { x: 0, y: 0, width: 0, height: 0, rotation: 0, scale: 1, flipHorizontal: false, flipVertical: false },
    gifLoopCount: 0,
    backgroundOutsideLayerOrder: 1
  };

  runtime.restorePageBackground(board, 1);

  assert.equal(
    board.backgroundManager.backgroundImageData,
    null,
    'a dangling shared reference must not be handed to the image loader'
  );
}

function loadSessionRuntime(localStorage) {
  const sandbox = {
    console,
    window: {
      safeDeepClone(value) {
        return JSON.parse(JSON.stringify(value));
      }
    },
    document: {
      getElementById() {
        return null;
      }
    },
    localStorage,
    sessionStorage: createStorageStub(),
    JSON,
    Math,
    Object,
    Number,
    String,
    Boolean,
    Array,
    Set,
    Map,
    Date,
    Promise,
    parseInt,
    parseFloat
  };
  loadModulesIntoContext(sandbox, ['js/modules/session-runtime.js']);
  return sandbox.window.AboardSessionRuntime;
}

async function testSessionRestoreRebuildsSharedImagePool() {
  const localStorage = createStorageStub();
  const runtime = loadSessionRuntime(localStorage);

  const signature = `8227:${BIG_DATA_URL.slice(0, 64)}:${BIG_DATA_URL.slice(-64)}`;
  const board = {
    currentPage: 1,
    pages: [null],
    pageBackgrounds: {},
    sharedPageBackgroundImages: new Map(),
    pageRasterFallbackPages: new Set(),
    pageRasterFallbackBases: new Map(),
    pageRasterFallbackScaledBases: new Map(),
    pageScenes: {},
    syncSessionSnapshotKey: 'aboardSyncSessionSnapshot',
    getCacheKeyGroups() {
      return null;
    },
    storageManager: {
      async loadSession() {
        return {
          id: 'current_session',
          timestamp: 1000,
          pages: [],
          settings: {
            currentPage: 1,
            rasterFallbackTrackingVersion: 1,
            rasterFallbackPages: [],
            pageBackgrounds: {
              1: { backgroundPattern: 'image', backgroundImageData: `shared:${signature}` }
            },
            sharedPageBackgroundImages: {
              [signature]: BIG_DATA_URL
            }
          }
        };
      },
      async hasSession() {
        return true;
      }
    },
    backgroundManager: createBackgroundManagerStub({ backgroundImageData: null }),
    drawingEngine: {
      setPenSize() {}, setColor() {}, setPenType() {}, setEraserSize() {}, setEraserShape() {},
      canvasScale: 1, panOffset: { x: 0, y: 0 }, updateOffCanvasImageMirrors() {}
    },
    insertTextManager: null,
    setTool() {},
    updateUploadedImagesButtons() {},
    async applySerializedPageScenes() {},
    enforcePageBitmapMemoryBudget() {},
    updateUI() {},
    updateZoomUI() {},
    applyZoom() {},
    updatePaginationUI() {},
    syncSettingsUI() {},
    saveSessionDebounced() {},
    loadPage(pageNumber) {
      this.loadedPage = pageNumber;
    }
  };

  const restored = await runtime.restoreSession(board);

  assert.equal(restored, true, 'the session should restore');
  assert.equal(board.loadedPage, 1, 'the current page should be reloaded');
  assert.equal(
    board.sharedPageBackgroundImages.get(signature),
    BIG_DATA_URL,
    'restore must rebuild the shared image pool before pages load'
  );
  assert.equal(
    board.pageBackgrounds[1].backgroundImageData,
    `shared:${signature}`,
    'page entries keep their compact reference in memory'
  );
}

function testProjectExportMaterializesSharedReference() {
  const localStorage = createStorageStub();
  const sandbox = {
    console,
    window: {
      safeDeepClone(value) {
        return JSON.parse(JSON.stringify(value));
      }
    },
    document: {
      getElementById() {
        return null;
      }
    },
    localStorage,
    JSON,
    Math,
    Object,
    Number,
    String,
    Boolean,
    Array,
    Set,
    Map,
    Date,
    Promise,
    parseInt,
    parseFloat,
    Image: class FakeImage {
      set src(value) {
        this._src = value;
      }
    }
  };
  loadModulesIntoContext(sandbox, [
    'js/modules/pagination-runtime.js',
    'js/modules/project-manager.js'
  ]);

  const ProjectManager = sandbox.window.ProjectManager || sandbox.window.AboardProjectManager;
  const signature = `${BIG_DATA_URL.length}:${BIG_DATA_URL.slice(0, 64)}:${BIG_DATA_URL.slice(-64)}`;
  const manager = Object.create(ProjectManager.prototype);
  const drawingBoard = {
    currentPage: 2,
    pageBackgrounds: {
      1: { backgroundPattern: 'image', backgroundImageData: `shared:${signature}` }
    },
    sharedPageBackgroundImages: new Map([[signature, BIG_DATA_URL]]),
    backgroundManager: createBackgroundManagerStub()
  };
  manager.drawingBoard = drawingBoard;
  manager.cloneSerializable = (value) => JSON.parse(JSON.stringify(value));

  const snapshot = manager.getPageBackgroundSnapshot.call(manager, 1);

  assert.equal(
    snapshot.backgroundImageData,
    BIG_DATA_URL,
    'exported page backgrounds must carry the payload, not the shared reference'
  );
}

function loadSelectionManagerClass() {
  const sandbox = {
    console,
    Math,
    Number,
    String,
    Boolean,
    Array,
    Object,
    Set,
    Map,
    window: {},
    document: {}
  };
  sandbox.globalThis = sandbox;
  const source = `${readSource('js/selection.js')}\nwindow.__SelectionManager = SelectionManager;`;
  vm.createContext(sandbox);
  vm.runInContext(source, sandbox, { filename: 'js/selection.js' });
  return sandbox.window.__SelectionManager;
}

function loadDrawingEngineClass() {
  const sandbox = {
    console: { warn() {}, log() {}, error() {} },
    Math,
    Number,
    String,
    Boolean,
    Array,
    Object,
    Set,
    Map,
    Date,
    JSON,
    parseInt,
    parseFloat,
    window: { devicePixelRatio: 1 },
    document: {
      getElementById() {
        return null;
      },
      createElement() {
        return { style: {}, getContext() { return null; } };
      },
      createElementNS() {
        return { style: {}, setAttribute() {}, appendChild() {} };
      },
      body: {
        contains() {
          return false;
        },
        appendChild() {}
      }
    }
  };
  sandbox.globalThis = sandbox;
  const source = `${readSource('js/drawing.js')}\nwindow.__DrawingEngine = DrawingEngine;`;
  vm.createContext(sandbox);
  vm.runInContext(source, sandbox, { filename: 'js/drawing.js' });
  return sandbox.window.__DrawingEngine;
}

function testRotatedMultiLineStrokeSelectionBoundsIncludeStyleExtent() {
  const SelectionManager = loadSelectionManagerClass();
  const DrawingEngine = loadDrawingEngineClass();
  const engine = new DrawingEngine({ width: 1280, height: 720 }, {});

  const basePoints = [
    { x: 100, y: 100 },
    { x: 200, y: 100 },
    { x: 200, y: 150 },
    { x: 100, y: 150 }
  ];
  const strokeStyle = {
    size: 4,
    lineStyle: 'multi',
    multiLineCount: 3,
    multiLineSpacing: 10,
    tool: 'pen'
  };

  const selectionHelpers = {
    drawingEngine: engine,
    rotatePoint: SelectionManager.prototype.rotatePoint,
    getBoundsFromPoints: SelectionManager.prototype.getBoundsFromPoints
  };

  const upright = { ...strokeStyle, points: basePoints.map((p) => ({ ...p })), rotation: 0 };
  const uprightBounds = SelectionManager.prototype.getStrokeSelectionBounds.call(selectionHelpers, upright);
  assert.equal(uprightBounds.x, 82, 'upright multi-line bounds should include size and style extent');

  const rotate = (point, deg) => SelectionManager.prototype.rotatePoint.call(selectionHelpers, point.x, point.y, 150, 125, deg);
  const rotated = {
    ...strokeStyle,
    points: basePoints.map((p) => rotate(p, 45)),
    rotation: 45,
    rotationCenter: { x: 150, y: 125 }
  };
  const rotatedBounds = SelectionManager.prototype.getStrokeSelectionBounds.call(selectionHelpers, rotated);

  assert.equal(
    rotatedBounds.x,
    82,
    'rotated strokes must keep the same selection padding, including the line-style outer extent'
  );
}

function createTextResizeSelection(handle, startBounds, event) {
  const SelectionManager = loadSelectionManagerClass();
  const textObject = {
    text: 'Hello',
    x: startBounds.x,
    y: startBounds.y,
    fontSize: startBounds.fontSize,
    color: '#000000',
    fontFamily: 'Arial',
    scale: 1
  };
  const selection = {
    isResizing: true,
    hasResizeChanged: true,
    resizeHandle: handle,
    resizeStartPos: { x: 0, y: 0 },
    resizeStartBounds: startBounds,
    selectionType: 'text',
    selectedIndex: 0,
    MIN_SIZE: 10,
    DRAG_MOVE_THRESHOLD: 3,
    isCompoundSelection: SelectionManager.prototype.isCompoundSelection,
    isCoordinateSelection: SelectionManager.prototype.isCoordinateSelection,
    getClientPos: SelectionManager.prototype.getClientPos,
    getCanvasScales: SelectionManager.prototype.getCanvasScales,
    canvas: {
      offsetWidth: 1280,
      offsetHeight: 720,
      getBoundingClientRect() {
        return { left: 0, top: 0, width: 1280, height: 720 };
      }
    },
    textManager: {
      MIN_FONT_SIZE: 12,
      normalizeTextObjectScale(t) {
        t.scale = 1;
      },
      textObjects: [textObject]
    },
    getActiveSelectionRotation() {
      return 0;
    },
    updateControlBox() {},
    redrawCanvas() {}
  };
  SelectionManager.prototype.resize.call(selection, event);
  return textObject;
}

function testTextBottomHandleScalesFontSize() {
  const textObject = createTextResizeSelection(
    'bottom',
    { x: 10, y: 20, width: 120, height: 60, fontSize: 30 },
    { clientX: 0, clientY: 30 }
  );

  assert.equal(
    textObject.fontSize,
    45,
    'dragging the bottom edge handle must scale the font by the height ratio'
  );
}

function testTextCornerHandleStillScalesByWidth() {
  const textObject = createTextResizeSelection(
    'right',
    { x: 10, y: 20, width: 120, height: 60, fontSize: 30 },
    { clientX: 60, clientY: 0 }
  );

  assert.equal(textObject.fontSize, 45, 'corner/edge horizontal handles keep the width ratio');
}

function testTextResizeGuardsAgainstZeroWidthStartBounds() {
  const textObject = createTextResizeSelection(
    'right',
    { x: 0, y: 0, width: 0, height: 50, fontSize: 30 },
    { clientX: 40, clientY: 0 }
  );

  assert.ok(
    Number.isFinite(textObject.fontSize),
    'a zero-width start bounds must not poison fontSize with Infinity'
  );
}

function loadBoardHelpersRuntime() {
  const sandbox = {
    console,
    window: {},
    document: {
      getElementById() {
        return null;
      }
    },
    JSON,
    Math,
    Object,
    Number,
    String,
    Boolean,
    Array,
    Set,
    Map,
    Date,
    Promise
  };
  loadModulesIntoContext(sandbox, ['js/modules/board-helpers-runtime.js']);
  return sandbox.window.AboardBoardHelpersRuntime;
}

function testBoardContentEmptinessDetection() {
  const helpers = loadBoardHelpersRuntime();
  const isBoardContentEmpty = helpers.isBoardContentEmpty;

  assert.ok(typeof isBoardContentEmpty === 'function', 'isBoardContentEmpty should be exported');
  assert.equal(isBoardContentEmpty(null), true, 'a missing board counts as empty');
  assert.equal(isBoardContentEmpty({}), true, 'a bare board counts as empty');
  assert.equal(
    isBoardContentEmpty({ pages: [null], backgroundManager: { backgroundPattern: 'blank', backgroundColor: '#ffffff' } }),
    true,
    'a single blank page with default background counts as empty'
  );
  assert.equal(isBoardContentEmpty({ pages: [{}, {}] }), false, 'multiple pages count as content');
  assert.equal(isBoardContentEmpty({ drawingEngine: { strokes: [{}] } }), false, 'strokes count as content');
  assert.equal(
    isBoardContentEmpty({ backgroundManager: { backgroundPattern: 'grid', backgroundColor: '#ffffff' } }),
    false,
    'a non-blank pattern counts as content'
  );
  assert.equal(
    isBoardContentEmpty({ backgroundManager: { backgroundPattern: 'blank', backgroundColor: '#112233' } }),
    false,
    'a custom background color counts as content'
  );
  assert.equal(
    isBoardContentEmpty({ backgroundManager: { backgroundPattern: 'blank', backgroundColor: '#ffffff', hasBackgroundImage: () => true } }),
    false,
    'a background image counts as content'
  );
  assert.equal(
    isBoardContentEmpty({ backgroundManager: { backgroundPattern: 'blank', backgroundColor: '#ffffff', hasCoordinateSelectableContent: () => true } }),
    false,
    'coordinate overlay content counts as content'
  );
  assert.equal(
    isBoardContentEmpty({ pageScenes: { 2: { strokes: [{}] } }, pages: [null] }),
    false,
    'scene content on other pages counts as content'
  );
}

function testAlignmentGuideParseColorSupportsAlphaHex() {
  const guides = require(path.join(REPO_ROOT, 'js', 'modules', 'alignment-guides.js'));

  assert.deepEqual(guides.parseColor('#112233aa'), [17, 34, 51], '8-digit hex should parse ignoring alpha');
  assert.deepEqual(guides.parseColor('#123a'), [17, 34, 51], '4-digit hex should expand like 3-digit hex');
  assert.deepEqual(guides.parseColor('rgb(17 34 51)'), [17, 34, 51], 'space-separated rgb should parse');
  assert.deepEqual(guides.parseColor('#112233'), [17, 34, 51], '6-digit hex keeps parsing');
  assert.equal(guides.parseColor('hsl(120, 50%, 50%)'), null, 'unsupported formats still return null');
}

function loadBackgroundManagerClass() {
  const sandbox = {
    console: { warn() {}, log() {}, error() {} },
    window: {
      devicePixelRatio: 1,
      addEventListener() {},
      dispatchEvent() {},
      safeDeepClone(value) {
        return JSON.parse(JSON.stringify(value));
      }
    },
    document: {
      getElementById() {
        return null;
      },
      createElement() {
        return { style: {} };
      },
      createElementNS() {
        return { style: {} };
      },
      body: {
        contains() {
          return false;
        }
      }
    },
    localStorage: createStorageStub(),
    sessionStorage: {
      getItem() {
        return null;
      },
      setItem() {},
      removeItem() {}
    },
    setTimeout,
    clearTimeout,
    CustomEvent: class FakeCustomEvent {
      constructor(type) {
        this.type = type;
      }
    },
    Image: class FakeImage {
      set src(value) {
        this._src = value;
      }
    },
    Math,
    Number,
    String,
    Boolean,
    Array,
    Object,
    Set,
    Map,
    Date,
    JSON,
    Promise,
    parseInt,
    parseFloat
  };
  sandbox.globalThis = sandbox;
  const source = `${readSource('js/background.js')}\nwindow.__BackgroundManager = BackgroundManager;`;
  vm.createContext(sandbox);
  vm.runInContext(source, sandbox, { filename: 'js/background.js' });
  return sandbox.window.__BackgroundManager;
}

function testIsLightBackgroundParsesNonHexColorFormats() {
  const BackgroundManager = loadBackgroundManagerClass();
  const isLight = (color) => BackgroundManager.prototype.isLightBackground.call({ backgroundColor: color });

  assert.equal(isLight('#ffffff'), true, '6-digit white hex stays light');
  assert.equal(isLight('#112233'), false, '6-digit dark hex stays dark');
  assert.equal(isLight('#fff'), true, '3-digit hex must parse');
  assert.equal(isLight('#112233aa'), false, '8-digit hex must parse ignoring alpha');
  assert.equal(isLight('rgb(17, 34, 51)'), false, 'comma-separated rgb must parse');
  assert.equal(isLight('rgb(255 255 255)'), true, 'space-separated rgb must parse');
  assert.equal(isLight('white'), true, 'the white keyword must resolve to light');
  assert.equal(isLight('black'), false, 'the black keyword must stay on the dark side');
  assert.equal(isLight('transparent'), true, 'transparent shows the light page behind by default');
  assert.equal(isLight('not-a-color'), true, 'unparseable values default to light so the default dark ink stays visible');
}

async function main() {
  testSharedBackgroundImageIsStoredOnceAcrossPages();
  testRestorePageBackgroundResolvesSharedReference();
  testLegacyPlainDataUrlEntriesStillRestore();
  testSharedImagePoolIsPrunedWhenNoLongerReferenced();
  testUnresolvedSharedReferenceDegradesToEmptyImage();
  await testSessionRestoreRebuildsSharedImagePool();
  testProjectExportMaterializesSharedReference();
  testRotatedMultiLineStrokeSelectionBoundsIncludeStyleExtent();
  testTextBottomHandleScalesFontSize();
  testTextCornerHandleStillScalesByWidth();
  testTextResizeGuardsAgainstZeroWidthStartBounds();
  testBoardContentEmptinessDetection();
  testAlignmentGuideParseColorSupportsAlphaHex();
  testIsLightBackgroundParsesNonHexColorFormats();
  console.log('known-issues-2026-09-05-regression.test: all assertions passed');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
