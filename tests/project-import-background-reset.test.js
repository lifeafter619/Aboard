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

function createBlockedLocalStorageStub() {
  const storage = createLocalStorageStub();
  return {
    ...storage,
    setItem() {
      throw new Error('localStorage blocked');
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

function loadProjectImportRuntime(localStorage = createLocalStorageStub()) {
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

  const legacySource = fs.readFileSync(
    path.join(__dirname, '..', 'js', 'modules', 'project-legacy-compat.js'),
    'utf8'
  );
  vm.runInContext(legacySource, context, { filename: 'project-legacy-compat.js' });

  return {
    ProjectManager: context.window.ProjectManager,
    paginationRuntime: context.window.AboardPaginationRuntime,
    legacyCompat: context.window.AboardLegacyProjectCompat,
    localStorage,
    window
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
      validateImportedSettings(settings) {
        if (settings.unlimitedZoom !== undefined && typeof settings.unlimitedZoom !== 'boolean') {
          throw new TypeError('Invalid configuration field: unlimitedZoom');
        }
        return settings;
      },
      setCanvasSize(width, height) {
        this.canvasWidth = width;
        this.canvasHeight = height;
      },
      setUnlimitedZoom(value) {
        this.unlimitedZoom = value;
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

async function withSuppressedConsoleWarn(callback) {
  const originalWarn = console.warn;
  console.warn = () => {};
  try {
    return await callback();
  } finally {
    console.warn = originalWarn;
  }
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

async function testImportStillRestoresStateWhenLocalStorageIsBlocked() {
  const { ProjectManager, paginationRuntime } = loadProjectImportRuntime(createBlockedLocalStorageStub());
  const board = createBoard(paginationRuntime);
  const manager = new ProjectManager(board);
  const uploadedImages = [{ id: 'img-1', name: 'Imported image', data: 'data:image/png;base64,imported' }];
  const pageBackgrounds = {
    1: {
      backgroundColor: '#f8fafc',
      backgroundPattern: 'image',
      bgOpacity: 1,
      patternIntensity: 0.5,
      patternDensity: 1,
      coordinateOriginX: 0,
      coordinateOriginY: 0,
      coordinateOverlayState: createDefaultCoordinateOverlayState(),
      backgroundImageData: 'data:image/png;base64,imported-page',
      imageSize: 1,
      imageTransform: createDefaultImageTransform(),
      gifLoopCount: 0,
      backgroundOutsideLayerOrder: 1
    }
  };

  await withSuppressedConsoleWarn(async () => {
    await assert.doesNotReject(async () => {
      await manager.applyImportedProjectState({
        settings: {},
        uploadedImages,
        globalBackground: null,
        pageBackgrounds,
        pagesImageData: [{ blank: true }],
        currentPage: 1,
        pageCount: 1
      });
    }, 'project import should not fail when localStorage writes are blocked');
  });

  assert.deepEqual(board.uploadedImages, uploadedImages);
  assert.deepEqual(board.pageBackgrounds, pageBackgrounds);
  assert.equal(board.currentPage, 1);
  assert.equal(
    board.backgroundManager.backgroundImageData,
    'data:image/png;base64,imported-page',
    'blocked storage should not prevent imported backgrounds from being applied in memory'
  );
}

async function testOversizedProjectImportIsRejectedBeforeZipLibraryLoads() {
  const { ProjectManager, paginationRuntime } = loadProjectImportRuntime();
  const board = createBoard(paginationRuntime);
  const manager = new ProjectManager(board);
  let zipLibraryLoaded = false;
  manager.ensureZipLibrary = async () => {
    zipLibraryLoaded = true;
    throw new Error('ZIP library should not load for oversized files');
  };

  const result = await manager.importProject({
    name: 'too-large.zip',
    size: 101 * 1024 * 1024
  });

  assert.equal(result, false, 'oversized project imports should fail gracefully');
  assert.equal(zipLibraryLoaded, false, 'oversized project imports should be rejected before loading the ZIP library');
}

async function testOversizedLegacyProjectImportIsRejectedBeforeCompatLoads() {
  const { ProjectManager, paginationRuntime } = loadProjectImportRuntime();
  const board = createBoard(paginationRuntime);
  board.settingsManager.legacyProjectImportEnabled = true;
  const manager = new ProjectManager(board);
  let legacyCompatLoaded = false;
  manager.ensureLegacyCompat = async () => {
    legacyCompatLoaded = true;
    throw new Error('legacy compatibility should not load for oversized files');
  };

  const result = await manager.importProject({
    name: 'too-large.aboard',
    size: 101 * 1024 * 1024
  });

  assert.equal(result, false, 'oversized legacy imports should fail gracefully');
  assert.equal(legacyCompatLoaded, false, 'oversized legacy imports should be rejected before loading legacy compatibility');
}

async function testAsyncZipImportErrorsAreHandledByProjectImporter() {
  const { ProjectManager, paginationRuntime, window } = loadProjectImportRuntime();
  const board = createBoard(paginationRuntime);
  const manager = new ProjectManager(board);
  const alerts = [];

  window.appDialog = {
    showAlert(message, type) {
      alerts.push({ message, type });
    }
  };
  manager.importZipProject = async () => {
    throw new Error('bad zip payload');
  };

  const result = await manager.importProject({
    name: 'broken.zip',
    size: 100,
    slice() {
      return {
        async arrayBuffer() {
          return Buffer.from('PK');
        }
      };
    }
  });

  assert.equal(result, false, 'async project import failures should resolve to false');
  assert.equal(alerts[0]?.type, 'error');
  assert.match(alerts[0]?.message || '', /bad zip payload/);
}

function testProjectPackagePathValidationRejectsUnsafePaths() {
  const { ProjectManager, paginationRuntime } = loadProjectImportRuntime();
  const board = createBoard(paginationRuntime);
  const manager = new ProjectManager(board);

  assert.throws(
    () => manager.validateProjectPackagePath('../document.json', { label: 'document path' }),
    /Unsafe project package path/,
    'project package paths should reject parent traversal'
  );
  assert.throws(
    () => manager.validateProjectPackagePath('/document.json', { label: 'document path' }),
    /Unsafe project package path/,
    'project package paths should reject absolute paths'
  );
  assert.throws(
    () => manager.validateProjectPackagePath('document.json.bak', {
      label: 'document path',
      allowedPrefixes: ['document.json', 'documents/']
    }),
    /Unsafe project package path/,
    'project package paths should not treat exact file names as arbitrary prefixes'
  );
  assert.equal(
    manager.validateProjectPackagePath('pages/page-0001.json', { label: 'page path', allowedPrefixes: ['pages/'] }),
    'pages/page-0001.json',
    'project package paths should allow expected page entries'
  );
}

function testProjectPackagePageLimitRejectsUnboundedImports() {
  const { ProjectManager, paginationRuntime } = loadProjectImportRuntime();
  const board = createBoard(paginationRuntime);
  const manager = new ProjectManager(board);
  const tooManyPages = Array.from({ length: 301 }, (_, index) => ({
    path: `pages/page-${String(index + 1).padStart(4, '0')}.json`,
    index: index + 1
  }));

  assert.throws(
    () => manager.validateProjectPackageStructure({ pages: tooManyPages }, {}),
    /too many pages/i,
    'project package imports should reject excessive page counts before rendering'
  );
}

async function testProjectPackageRejectsOutOfRangePageIndexes() {
  const { ProjectManager, paginationRuntime } = loadProjectImportRuntime();
  const board = createBoard(paginationRuntime);
  const manager = new ProjectManager(board);

  assert.throws(
    () => manager.validateProjectPackageStructure({
      currentPage: 301,
      pages: [{ path: 'pages/page-0001.json', index: 1 }]
    }, {}),
    /page/i,
    'project package imports should reject currentPage values beyond the supported page limit'
  );

  assert.throws(
    () => manager.validateProjectPackageStructure({
      currentPage: 1,
      pages: [{ path: 'pages/page-0001.json', index: 301 }]
    }, {}),
    /page/i,
    'project package imports should reject document page indexes beyond the supported page limit'
  );

  const encodeJson = (value) => Buffer.from(JSON.stringify(value), 'utf8');
  manager.ensureZipLibrary = async () => ({
    unzipSync() {
      return {
        'document.json': encodeJson({
          currentPage: 1,
          pages: [{ path: 'pages/page-0001.json', index: 1 }]
        }),
        'pages/page-0001.json': encodeJson({
          index: 301,
          background: null,
          scene: null
        })
      };
    },
    strFromU8(bytes) {
      return Buffer.from(bytes).toString('utf8');
    }
  });
  manager.confirmImportOverwrite = async () => true;

  await assert.rejects(
    () => manager.importZipProject({
      async arrayBuffer() {
        return Buffer.from('zip');
      }
    }),
    /page/i,
    'project package imports should reject page payload indexes beyond the supported page limit'
  );
}

async function testProjectPackageHelpersIgnoreMalformedCollections() {
  const { ProjectManager, paginationRuntime } = loadProjectImportRuntime();
  const board = createBoard(paginationRuntime);
  const manager = new ProjectManager(board);
  const assetStore = manager.createAssetStore();

  let serializedImages = null;
  await assert.doesNotReject(async () => {
    serializedImages = await manager.serializeUploadedImagesForPackage({ invalid: true }, assetStore);
  }, 'project export should ignore malformed uploaded image collections instead of crashing');
  assert.deepEqual(
    JSON.parse(JSON.stringify(serializedImages)),
    [],
    'malformed uploaded image collections should export as an empty list'
  );

  let serializedScene = null;
  await assert.doesNotReject(async () => {
    serializedScene = await manager.serializeSceneForPackage({ stampedImages: { invalid: true } }, assetStore);
  }, 'project export should ignore malformed stamped image collections instead of crashing');
  assert.deepEqual(
    JSON.parse(JSON.stringify(serializedScene.stampedImages)),
    [],
    'malformed stamped image collections should export as an empty list'
  );

  let inflatedImages = null;
  assert.doesNotThrow(() => {
    inflatedImages = manager.inflateUploadedImagesFromPackage({ invalid: true }, () => 'data:image/png;base64,ok');
  }, 'project import should ignore malformed uploaded image collections instead of crashing');
  assert.deepEqual(
    JSON.parse(JSON.stringify(inflatedImages)),
    [],
    'malformed uploaded image import collections should restore as an empty list'
  );

  let inflatedScene = null;
  assert.doesNotThrow(() => {
    inflatedScene = manager.inflateSceneFromPackage({ stampedImages: { invalid: true } }, () => 'data:image/png;base64,ok');
  }, 'project import should ignore malformed stamped image collections instead of crashing');
  assert.deepEqual(
    JSON.parse(JSON.stringify(inflatedScene.stampedImages)),
    [],
    'malformed stamped image import collections should restore as an empty list'
  );
}

async function testProjectImportValidatesSettingsAtFinalWriteBoundary() {
  const { ProjectManager, paginationRuntime } = loadProjectImportRuntime();
  const board = createBoard(paginationRuntime);
  const manager = new ProjectManager(board);

  await assert.rejects(
    () => manager.applyImportedProjectState({
      settings: { unlimitedZoom: 'false' },
      pageCount: 1
    }),
    /unlimitedZoom/,
    'project imports must reject truthy string booleans before mutating settings'
  );
  assert.equal(board.settingsManager.unlimitedZoom, false);
}

async function testLegacyProjectRejectsExcessivePagesBeforeBitmapDecoding() {
  const { ProjectManager, paginationRuntime, legacyCompat } = loadProjectImportRuntime();
  const board = createBoard(paginationRuntime);
  const manager = new ProjectManager(board);
  let decodedPages = 0;

  manager.confirmImportOverwrite = async () => true;
  manager.base64ToImageData = async () => {
    decodedPages += 1;
    return null;
  };

  await assert.rejects(
    () => legacyCompat.importLegacyProject(manager, {
      async text() {
        return JSON.stringify({
          pages: Array.from({ length: 301 }, (_, index) => ({ index: index + 1, data: null }))
        });
      }
    }),
    /too many pages/i,
    'legacy imports must enforce the shared page limit before allocating page bitmaps'
  );
  assert.equal(decodedPages, 0, 'legacy page bitmaps must not be decoded after the page limit is exceeded');
}

async function testProjectImportRejectsExcessiveRenderableComplexity() {
  const { ProjectManager, paginationRuntime } = loadProjectImportRuntime();
  const board = createBoard(paginationRuntime);
  const manager = new ProjectManager(board);

  await assert.rejects(
    () => manager.applyImportedProjectState({
      pageScenes: {
        1: { strokes: [{ points: Array(125001) }] },
        2: { strokes: [{ points: Array(125000) }] }
      },
      pageCount: 2
    }),
    /complex/i,
    'project imports must cap stroke points cumulatively across pages'
  );

  await assert.rejects(
    () => manager.applyImportedProjectState({
      globalBackground: {
        coordinateOverlayState: { points: Array(250001), plots: [], groups: [] }
      },
      pageCount: 1
    }),
    /complex/i,
    'project imports must include coordinate overlay points in the complexity budget'
  );

  await assert.rejects(
    () => manager.applyImportedProjectState({
      pageScenes: { 1: { stampedImages: Array(5001) } },
      pageCount: 1
    }),
    /complex/i,
    'project imports must cap stamped image counts before hydration'
  );
}

(async function main() {
  await testPageBackgroundImportResetsStaleEnhancedState();
  await testGlobalBackgroundImportResetsStaleEnhancedState();
  await testMissingGlobalBackgroundAlsoClearsStaleState();
  await testGlobalBackgroundImportNormalizesLegacyScaledImageTransform();
  await testPageBackgroundImportNormalizesLegacyScaledImageTransform();
  await testGlobalBackgroundImportClearsPausedGifRuntimeState();
  await testImportStillRestoresStateWhenLocalStorageIsBlocked();
  await testOversizedProjectImportIsRejectedBeforeZipLibraryLoads();
  await testOversizedLegacyProjectImportIsRejectedBeforeCompatLoads();
  await testAsyncZipImportErrorsAreHandledByProjectImporter();
  testProjectPackagePathValidationRejectsUnsafePaths();
  testProjectPackagePageLimitRejectsUnboundedImports();
  await testProjectPackageRejectsOutOfRangePageIndexes();
  await testProjectPackageHelpersIgnoreMalformedCollections();
  await testProjectImportValidatesSettingsAtFinalWriteBoundary();
  await testLegacyProjectRejectsExcessivePagesBeforeBitmapDecoding();
  await testProjectImportRejectsExcessiveRenderableComplexity();
  console.log('project-import-background-reset.test: all assertions passed');
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
