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

function createLocalStorageStub() {
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

function normalizeLegacyScaledTransform(transform) {
  const normalized = cloneValue(transform);
  const scale = Number.isFinite(normalized.scale) ? normalized.scale : 1;
  if (scale !== 1 && normalized.width > 0 && normalized.height > 0) {
    const factor = Math.abs(scale);
    const newWidth = normalized.width * factor;
    const newHeight = normalized.height * factor;
    normalized.x -= (newWidth - normalized.width) / 2;
    normalized.y -= (newHeight - normalized.height) / 2;
    normalized.width = newWidth;
    normalized.height = newHeight;
  }
  normalized.scale = 1;
  normalized.flipHorizontal = !!normalized.flipHorizontal;
  normalized.flipVertical = !!normalized.flipVertical;
  return normalized;
}

function createBackgroundManagerWithStaleState() {
  return {
    backgroundColor: '#112233',
    backgroundPattern: 'image',
    bgOpacity: 0.37,
    patternIntensity: 0.91,
    patternDensity: 1.75,
    imageSize: 2.25,
    backgroundImageData: 'data:image/png;base64,stale',
    backgroundImage: { stale: true },
    isImagePaused: true,
    currentGifLoop: 7,
    imageStaticData: 'data:image/png;base64,paused-frame',
    coordinateOriginX: 48,
    coordinateOriginY: -12,
    coordinateOverlayState: {
      showTicks: false,
      showLabels: false,
      showPointLabels: false,
      showOrigin: false,
      pointLineMode: 'line',
      connectPoints: false,
      snapToGrid: false,
      lineColor: '#ff0000',
      points: [{ id: 'old-point', x: 1, y: 2, color: '#ff0000' }],
      plots: [],
      groups: []
    },
    imageTransform: {
      x: 120,
      y: 45,
      width: 320,
      height: 180,
      rotation: 33,
      scale: 1,
      flipHorizontal: true,
      flipVertical: true
    },
    gifLoopCount: 9,
    backgroundOutsideLayerOrder: 27,
    getCoordinateOverlayState() {
      return cloneValue(this.coordinateOverlayState);
    },
    getDefaultCoordinateOverlayState() {
      return createDefaultCoordinateOverlayState();
    },
    setCoordinateOverlayState(state) {
      this.coordinateOverlayState = state ? cloneValue(state) : createDefaultCoordinateOverlayState();
    },
    updateImageTransform(transform) {
      this.imageTransform = cloneValue(transform);
    },
    setGifLoopCount(count) {
      this.gifLoopCount = count;
    },
    drawBackground() {},
    emitBackgroundUiState() {}
  };
}

function loadProjectImportRuntime() {
  const localStorage = createLocalStorageStub();
  const window = {
    safeDeepClone: cloneValue
  };
  const document = {
    getElementById() {
      return null;
    }
  };
  const context = {
    window,
    document,
    localStorage,
    console,
    JSON,
    Promise,
    Object,
    String,
    Number,
    Boolean,
    Date,
    Math,
    parseInt,
    setTimeout,
    clearTimeout,
    TextEncoder,
    TextDecoder,
    Image: class {
      set src(value) {
        this._src = value;
        if (typeof this.onload === 'function') {
          this.onload();
        }
      }

      get src() {
        return this._src;
      }
    }
  };

  context.globalThis = context;
  context.self = context;
  context.window.localStorage = localStorage;
  context.window.document = document;
  context.window.console = console;

  vm.createContext(context);

  const paginationSource = fs.readFileSync(
    path.join(__dirname, '..', 'js', 'modules', 'pagination-runtime.js'),
    'utf8'
  );
  vm.runInContext(paginationSource, context, { filename: 'pagination-runtime.js' });

  const managerSource = fs.readFileSync(
    path.join(__dirname, '..', 'js', 'modules', 'project-manager.js'),
    'utf8'
  );
  vm.runInContext(managerSource, context, { filename: 'project-manager.js' });

  return {
    ProjectManager: context.window.ProjectManager,
    paginationRuntime: context.window.AboardPaginationRuntime,
    localStorage
  };
}

function createBoard(paginationRuntime) {
  return {
    canvas: { width: 1280, height: 720 },
    ctx: {
      clearRect() {},
      getImageData() {
        return { blank: true };
      }
    },
    settingsManager: {
      canvasWidth: 1280,
      canvasHeight: 720,
      canvasPreset: 'custom',
      unlimitedZoom: false,
      setCanvasSize(width, height) {
        this.canvasWidth = width;
        this.canvasHeight = height;
      }
    },
    drawingEngine: {
      renderScene() {},
      updateOffCanvasImageMirrors() {}
    },
    historyManager: {
      saveState() {}
    },
    backgroundManager: createBackgroundManagerWithStaleState(),
    uploadedImages: [],
    pageBackgrounds: {},
    pageScenes: {},
    pages: [],
    currentPage: 1,
    applyCanvasSize() {},
    updateMaxCanvasScale() {},
    updateUploadedImagesButtons() {},
    async applySerializedPageScenes(serializedScenes = {}) {
      this.pageScenes = cloneValue(serializedScenes);
      return this.pageScenes;
    },
    restorePageScene() {},
    loadPage(pageNumber) {
      this.currentPage = pageNumber;
      paginationRuntime.restorePageBackground(this, pageNumber);
    },
    updatePaginationUI() {},
    updateBackgroundUI() {},
    updateUI() {},
    saveSessionDebounced() {}
  };
}

async function testPageBackgroundImportResetsStaleEnhancedState() {
  const { ProjectManager, paginationRuntime } = loadProjectImportRuntime();
  const board = createBoard(paginationRuntime);
  const manager = new ProjectManager(board);

  await manager.applyImportedProjectState({
    settings: {},
    globalBackground: null,
    pageBackgrounds: {
      1: {
        backgroundColor: '#ffffff',
        backgroundPattern: 'blank',
        bgOpacity: 1,
        patternIntensity: 0.5,
        patternDensity: 1,
        coordinateOriginX: 0,
        coordinateOriginY: 0,
        backgroundImageData: null,
        imageSize: 1
      }
    },
    pagesImageData: [{ blank: true }],
    currentPage: 1,
    pageCount: 1
  });

  assert.equal(board.backgroundManager.backgroundImageData, null);
  assert.deepEqual(
    board.backgroundManager.imageTransform,
    createDefaultImageTransform(),
    'page import should not keep the previous project image transform when imported background data omits it'
  );
  assert.equal(
    board.backgroundManager.gifLoopCount,
    0,
    'page import should reset legacy-missing GIF loop settings to the default'
  );
  assert.equal(
    board.backgroundManager.backgroundOutsideLayerOrder,
    1,
    'page import should reset legacy-missing outside-layer order to the default'
  );
}

async function testGlobalBackgroundImportResetsStaleEnhancedState() {
  const { ProjectManager, paginationRuntime } = loadProjectImportRuntime();
  const board = createBoard(paginationRuntime);
  const manager = new ProjectManager(board);

  await manager.applyImportedProjectState({
    settings: {},
    globalBackground: {
      backgroundColor: '#ffffff',
      backgroundPattern: 'blank',
      bgOpacity: 1,
      patternIntensity: 0.5,
      patternDensity: 1,
      backgroundImageData: null,
      imageSize: 1
    },
    pageBackgrounds: {},
    pagesImageData: [{ blank: true }],
    currentPage: 1,
    pageCount: 1
  });

  assert.equal(board.backgroundManager.backgroundImageData, null);
  assert.deepEqual(
    board.backgroundManager.imageTransform,
    createDefaultImageTransform(),
    'global import should not keep the previous project image transform when imported data omits it'
  );
  assert.equal(
    board.backgroundManager.gifLoopCount,
    0,
    'global import should reset legacy-missing GIF loop settings to the default'
  );
  assert.equal(
    board.backgroundManager.backgroundOutsideLayerOrder,
    1,
    'global import should reset legacy-missing outside-layer order to the default'
  );
}

async function testMissingGlobalBackgroundAlsoClearsStaleState() {
  const { ProjectManager, paginationRuntime } = loadProjectImportRuntime();
  const board = createBoard(paginationRuntime);
  const manager = new ProjectManager(board);

  await manager.applyImportedProjectState({
    settings: {},
    globalBackground: null,
    pageBackgrounds: {},
    pagesImageData: [{ blank: true }],
    currentPage: 1,
    pageCount: 1
  });

  assert.equal(board.backgroundManager.backgroundImageData, null);
  assert.deepEqual(
    board.backgroundManager.imageTransform,
    createDefaultImageTransform(),
    'imports without a global background should still clear the previous project image transform'
  );
  assert.equal(
    board.backgroundManager.gifLoopCount,
    0,
    'imports without a global background should reset the GIF loop state to the default'
  );
  assert.equal(
    board.backgroundManager.backgroundOutsideLayerOrder,
    1,
    'imports without a global background should reset the outside-layer order to the default'
  );
}

async function testGlobalBackgroundImportNormalizesLegacyScaledImageTransform() {
  const { ProjectManager, paginationRuntime } = loadProjectImportRuntime();
  const board = createBoard(paginationRuntime);
  const manager = new ProjectManager(board);
  const legacyTransform = {
    x: 50,
    y: 20,
    width: 200,
    height: 100,
    rotation: 15,
    scale: 1.5,
    flipHorizontal: true,
    flipVertical: false
  };

  await manager.applyImportedProjectState({
    settings: {},
    globalBackground: {
      backgroundColor: '#ffffff',
      backgroundPattern: 'image',
      bgOpacity: 1,
      patternIntensity: 0.5,
      patternDensity: 1,
      backgroundImageData: null,
      imageSize: 1,
      imageTransform: legacyTransform
    },
    pageBackgrounds: {},
    pagesImageData: [{ blank: true }],
    currentPage: 1,
    pageCount: 1
  });

  assert.deepEqual(
    board.backgroundManager.imageTransform,
    normalizeLegacyScaledTransform(legacyTransform),
    'global background import should expand legacy scaled image transforms before storing them'
  );
}

async function testGlobalBackgroundImportClearsPausedGifRuntimeState() {
  const { ProjectManager, paginationRuntime } = loadProjectImportRuntime();
  const board = createBoard(paginationRuntime);
  const manager = new ProjectManager(board);

  await manager.applyImportedProjectState({
    settings: {},
    globalBackground: {
      backgroundColor: '#ffffff',
      backgroundPattern: 'image',
      bgOpacity: 1,
      patternIntensity: 0.5,
      patternDensity: 1,
      backgroundImageData: 'data:image/gif;base64,new-imported-page',
      imageSize: 1,
      imageTransform: createDefaultImageTransform(),
      gifLoopCount: 2
    },
    pageBackgrounds: {},
    pagesImageData: [{ blank: true }],
    currentPage: 1,
    pageCount: 1
  });

  assert.equal(board.backgroundManager.backgroundImageData, 'data:image/gif;base64,new-imported-page');
  assert.equal(
    board.backgroundManager.isImagePaused,
    false,
    'global background import should clear a paused GIF state from the previous project'
  );
  assert.equal(
    board.backgroundManager.currentGifLoop,
    0,
    'global background import should reset the previous GIF loop counter'
  );
  assert.equal(
    board.backgroundManager.imageStaticData,
    null,
    'global background import should discard the previous frozen GIF frame cache'
  );
}

async function testPageBackgroundImportNormalizesLegacyScaledImageTransform() {
  const { ProjectManager, paginationRuntime } = loadProjectImportRuntime();
  const board = createBoard(paginationRuntime);
  const manager = new ProjectManager(board);
  const legacyTransform = {
    x: 120,
    y: 80,
    width: 160,
    height: 90,
    rotation: 0,
    scale: 0.5,
    flipHorizontal: false,
    flipVertical: true
  };

  await manager.applyImportedProjectState({
    settings: {},
    globalBackground: null,
    pageBackgrounds: {
      1: {
        backgroundColor: '#ffffff',
        backgroundPattern: 'image',
        bgOpacity: 1,
        patternIntensity: 0.5,
        patternDensity: 1,
        coordinateOriginX: 0,
        coordinateOriginY: 0,
        backgroundImageData: null,
        imageSize: 1,
        imageTransform: legacyTransform
      }
    },
    pagesImageData: [{ blank: true }],
    currentPage: 1,
    pageCount: 1
  });

  assert.deepEqual(
    board.backgroundManager.imageTransform,
    normalizeLegacyScaledTransform(legacyTransform),
    'page background import should expand legacy scaled image transforms before restoring them'
  );
}

(async function main() {
  await testPageBackgroundImportResetsStaleEnhancedState();
  await testGlobalBackgroundImportResetsStaleEnhancedState();
  await testMissingGlobalBackgroundAlsoClearsStaleState();
  await testGlobalBackgroundImportNormalizesLegacyScaledImageTransform();
  await testPageBackgroundImportNormalizesLegacyScaledImageTransform();
  await testGlobalBackgroundImportClearsPausedGifRuntimeState();
  console.log('project-import-background-reset.test: all assertions passed');
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
