const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

function cloneValue(value) {
  if (typeof globalThis.structuredClone === 'function') {
    return globalThis.structuredClone(value);
  }
  return JSON.parse(JSON.stringify(value));
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

function createDefaultCoordinateOverlayState() {
  return {
    showTicks: true,
    showLabels: true,
    showPointLabels: true,
    showOrigin: true,
    pointLineMode: 'auto',
    connectPoints: true,
    snapToGrid: true,
    lineColor: '#2563eb',
    points: [],
    plots: [],
    groups: []
  };
}

function createCoordinateOverlayStateWithPoint() {
  return {
    ...createDefaultCoordinateOverlayState(),
    points: [{ id: 'pt-1', x: 1, y: 2, color: '#2563eb' }]
  };
}

function createDefaultImageTransform() {
  return {
    x: 0,
    y: 0,
    width: 0,
    height: 0,
    rotation: 0,
    scale: 1,
    flipHorizontal: false,
    flipVertical: false
  };
}

function loadPaginationRuntime(localStorage) {
  const source = fs.readFileSync(
    path.join(__dirname, '..', 'js', 'modules', 'pagination-runtime.js'),
    'utf8'
  );

  const context = {
    window: {
      safeDeepClone: cloneValue
    },
    document: {
      getElementById() {
        return null;
      }
    },
    localStorage,
    console,
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
    Image: class {}
  };

  context.globalThis = context;
  context.self = context;
  context.window.localStorage = localStorage;
  context.window.document = context.document;
  context.window.console = console;

  vm.createContext(context);
  vm.runInContext(source, context, { filename: 'pagination-runtime.js' });
  return context.window.AboardPaginationRuntime;
}

function createInheritanceBoard(runtime, localStorage) {
  const board = {
    currentPage: 1,
    pages: [{ existing: true }],
    pageBackgrounds: {},
    canvas: { width: 1280, height: 720 },
    ctx: {
      clearRect() {},
      getImageData() {
        return { blank: true };
      }
    },
    backgroundManager: {
      backgroundColor: '#112233',
      backgroundPattern: 'grid',
      bgOpacity: 0.8,
      patternIntensity: 0.65,
      patternDensity: 1.5,
      coordinateOriginX: 24,
      coordinateOriginY: -8,
      backgroundImageData: null,
      imageSize: 1,
      imageTransform: createDefaultImageTransform(),
      gifLoopCount: 0,
      backgroundOutsideLayerOrder: 1,
      getCoordinateOverlayState() {
        return cloneValue(createCoordinateOverlayStateWithPoint());
      },
      setCoordinateOverlayState() {},
      drawBackground() {}
    },
    historyManager: {
      saveState() {}
    },
    saveCurrentPageScene() {},
    restorePageScene() {},
    updatePaginationUI() {},
    saveSessionDebounced() {},
    loadPage(pageNumber) {
      return runtime.loadPage(this, pageNumber);
    },
    savePageBackground(pageNumber) {
      return runtime.savePageBackground(this, pageNumber);
    },
    restorePageBackground(pageNumber) {
      return runtime.restorePageBackground(this, pageNumber);
    },
    drawingEngine: {
      updateOffCanvasImageMirrors() {}
    },
    updateBackgroundUI() {},
    insertTextManager: null
  };

  board.localStorage = localStorage;
  return board;
}

function createGifResetBoard(runtime, localStorage) {
  const backgroundManager = {
    backgroundColor: '#112233',
    backgroundPattern: 'image',
    bgOpacity: 0.8,
    patternIntensity: 0.65,
    patternDensity: 1.5,
    coordinateOriginX: 24,
    coordinateOriginY: -8,
    coordinateOverlayState: createDefaultCoordinateOverlayState(),
    backgroundImageData: 'data:image/gif;base64,old-page',
    backgroundImage: { stale: true },
    imageSize: 1,
    imageTransform: createDefaultImageTransform(),
    gifLoopCount: 1,
    currentGifLoop: 1,
    isImagePaused: true,
    imageStaticData: 'data:image/png;base64,paused-frame',
    backgroundOutsideLayerOrder: 1,
    getCoordinateOverlayState() {
      return cloneValue(this.coordinateOverlayState);
    },
    setCoordinateOverlayState(state) {
      this.coordinateOverlayState = cloneValue(state);
    },
    drawBackground() {}
  };

  return {
    currentPage: 1,
    pages: [{ blank: true }, { blank: true }],
    pageBackgrounds: {
      2: {
        backgroundColor: '#ffffff',
        backgroundPattern: 'image',
        bgOpacity: 1,
        patternIntensity: 0.5,
        patternDensity: 1,
        coordinateOriginX: 0,
        coordinateOriginY: 0,
        coordinateOverlayState: createDefaultCoordinateOverlayState(),
        backgroundImageData: 'data:image/gif;base64,new-page',
        imageSize: 1,
        imageTransform: createDefaultImageTransform(),
        gifLoopCount: 3,
        backgroundOutsideLayerOrder: 1
      }
    },
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
      saveState() {}
    },
    saveCurrentPageScene() {},
    restorePageScene() {},
    updatePaginationUI() {},
    saveSessionDebounced() {},
    drawingEngine: {
      updateOffCanvasImageMirrors() {}
    },
    updateBackgroundUI() {},
    insertTextManager: null,
    localStorage,
    restorePageBackground(pageNumber) {
      return runtime.restorePageBackground(this, pageNumber);
    }
  };
}

function assertPageInheritedBackground(board, pageNumber, message) {
  assert.deepEqual(
    cloneValue(board.pageBackgrounds[String(pageNumber)] || board.pageBackgrounds[pageNumber]),
    {
      backgroundColor: '#112233',
      backgroundPattern: 'grid',
      bgOpacity: 0.8,
      patternIntensity: 0.65,
      patternDensity: 1.5,
      coordinateOriginX: 24,
      coordinateOriginY: -8,
      coordinateOverlayState: createCoordinateOverlayStateWithPoint(),
      backgroundImageData: null,
      imageSize: 1,
      imageTransform: createDefaultImageTransform(),
      gifLoopCount: 0,
      backgroundOutsideLayerOrder: 1
    },
    message
  );
}

function testAddPageSnapshotsInheritedBackground() {
  const localStorage = createStorageStub();
  const runtime = loadPaginationRuntime(localStorage);
  const board = createInheritanceBoard(runtime, localStorage);

  runtime.addPage(board);

  assert.equal(board.currentPage, 2);
  assert.equal(board.pages.length, 2);
  assertPageInheritedBackground(
    board,
    2,
    'newly added pages should snapshot the inherited background immediately'
  );
}

function testGoToPageSnapshotsInheritedBackgroundForIntermediatePages() {
  const localStorage = createStorageStub();
  const runtime = loadPaginationRuntime(localStorage);
  const board = createInheritanceBoard(runtime, localStorage);

  runtime.goToPage(board, 3);

  assert.equal(board.currentPage, 3);
  assert.equal(board.pages.length, 3);
  assertPageInheritedBackground(
    board,
    2,
    'pages created while jumping forward should snapshot the inherited background'
  );
  assertPageInheritedBackground(
    board,
    3,
    'target pages created while jumping forward should snapshot the inherited background'
  );
}

function testRestorePageBackgroundClearsPausedGifRuntimeState() {
  const localStorage = createStorageStub();
  const runtime = loadPaginationRuntime(localStorage);
  const board = createGifResetBoard(runtime, localStorage);

  runtime.restorePageBackground(board, 2);

  assert.equal(
    board.backgroundManager.backgroundImageData,
    'data:image/gif;base64,new-page',
    'page restore should load the target page image payload'
  );
  assert.equal(
    board.backgroundManager.isImagePaused,
    false,
    'switching pages should not keep a paused GIF state from the previous page'
  );
  assert.equal(
    board.backgroundManager.currentGifLoop,
    0,
    'switching pages should reset the previous GIF loop counter'
  );
  assert.equal(
    board.backgroundManager.imageStaticData,
    null,
    'switching pages should clear the frozen GIF frame cache from the previous page'
  );
}

(function main() {
  testAddPageSnapshotsInheritedBackground();
  testGoToPageSnapshotsInheritedBackgroundForIntermediatePages();
  testRestorePageBackgroundClearsPausedGifRuntimeState();
  console.log('pagination-background-state.test: all assertions passed');
})();
