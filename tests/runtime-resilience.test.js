const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

function loadCreateAppServices({ constructors, warnings }) {
  const source = fs.readFileSync(
    path.join(__dirname, '..', 'js', 'app', 'create-app-services.js'),
    'utf8'
  );

  const sanitizedSource = source
    .replace(/^import[\s\S]*?;\r?\n/gm, '')
    .replace('export async function createAppServices', 'async function createAppServices')
    + '\n;globalThis.__runtimeResilienceExports = { createAppServices };';

  const win = {};
  const sandbox = {
    window: win,
    console: {
      warn(...args) {
        warnings.push(args.map(String).join(' '));
      },
      log() {},
      error() {}
    },
    resolveLegacyConstructor(_win, className) {
      return constructors[className] || null;
    },
    Promise,
    Object,
    String,
    Number,
    Boolean,
    Array,
    Set,
    Map
  };

  sandbox.globalThis = sandbox;
  vm.createContext(sandbox);
  vm.runInContext(sanitizedSource, sandbox, { filename: 'create-app-services.js' });

  return {
    createAppServices: sandbox.__runtimeResilienceExports.createAppServices,
    win
  };
}

function loadCreateBoardDependencies({ constructors, warnings }) {
  const source = fs.readFileSync(
    path.join(__dirname, '..', 'js', 'app', 'create-board-dependencies.js'),
    'utf8'
  );

  const sanitizedSource = source
    .replace(/^import[\s\S]*?;\r?\n/gm, '')
    .replace('export function createBoardDependencies', 'function createBoardDependencies')
    + '\n;globalThis.__runtimeResilienceExports = { createBoardDependencies };';

  const sandbox = {
    window: {},
    console: {
      warn(...args) {
        warnings.push(args.map(String).join(' '));
      },
      log() {},
      error() {}
    },
    resolveLegacyConstructor(_win, className) {
      return constructors[className] || null;
    },
    Promise,
    Object,
    String,
    Number,
    Boolean,
    Array,
    Set,
    Map
  };

  sandbox.globalThis = sandbox;
  vm.createContext(sandbox);
  vm.runInContext(sanitizedSource, sandbox, { filename: 'create-board-dependencies.js' });

  return sandbox.__runtimeResilienceExports.createBoardDependencies;
}

function loadBoardConstruction({ constructors, warnings }) {
  const source = fs.readFileSync(
    path.join(__dirname, '..', 'js', 'modules', 'board-construction.js'),
    'utf8'
  );

  const sandbox = {
    window: { ...constructors },
    console: {
      warn(...args) {
        warnings.push(args.map(String).join(' '));
      },
      log() {},
      error() {}
    },
    Reflect,
    Promise,
    Object,
    String,
    Number,
    Boolean,
    Array,
    Set,
    Map
  };

  sandbox.globalThis = sandbox;
  vm.createContext(sandbox);
  vm.runInContext(source, sandbox, { filename: 'board-construction.js' });

  return sandbox.window.AboardBoardConstruction;
}

function loadPageSceneRuntime({ warnings = [] } = {}) {
  const source = fs.readFileSync(
    path.join(__dirname, '..', 'js', 'modules', 'page-scene-runtime.js'),
    'utf8'
  );

  const sandbox = {
    window: {},
    console: {
      warn(...args) {
        warnings.push(args.map(String).join(' '));
      },
      log() {},
      error() {}
    },
    Promise,
    Object,
    String,
    Number,
    Boolean,
    Array,
    Set,
    Map,
    JSON,
    Math,
    Image: class FakeImage {
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

  sandbox.globalThis = sandbox;
  vm.createContext(sandbox);
  vm.runInContext(source, sandbox, { filename: 'page-scene-runtime.js' });

  return sandbox.window.AboardPageSceneRuntime;
}

function loadToolRuntime() {
  const source = fs.readFileSync(
    path.join(__dirname, '..', 'js', 'modules', 'tool-runtime.js'),
    'utf8'
  );

  const sandbox = {
    window: {},
    document: {
      getElementById() {
        return null;
      },
      querySelectorAll() {
        return [];
      }
    },
    console: {
      warn() {},
      log() {},
      error() {}
    },
    Promise,
    Object,
    String,
    Number,
    Boolean,
    Array,
    Set,
    Map
  };

  sandbox.globalThis = sandbox;
  vm.createContext(sandbox);
  vm.runInContext(source, sandbox, { filename: 'tool-runtime.js' });

  return sandbox.window.AboardToolRuntime;
}

function loadInteractionRuntime() {
  const source = fs.readFileSync(
    path.join(__dirname, '..', 'js', 'modules', 'interaction-runtime.js'),
    'utf8'
  );

  const sandbox = {
    window: {
      AboardBoardHelpersRuntime: {
        persistViewState() {}
      }
    },
    document: {
      getElementById() {
        return null;
      }
    },
    console: {
      warn() {},
      log() {},
      error() {}
    },
    Promise,
    Object,
    String,
    Number,
    Boolean,
    Array,
    Set,
    Map,
    Math
  };

  sandbox.globalThis = sandbox;
  vm.createContext(sandbox);
  vm.runInContext(source, sandbox, { filename: 'interaction-runtime.js' });

  return sandbox.window.AboardInteractionRuntime;
}

function loadHistoryManager() {
  const source = fs.readFileSync(
    path.join(__dirname, '..', 'js', 'history.js'),
    'utf8'
  ) + '\n;globalThis.__runtimeResilienceExports = { HistoryManager: window.AboardHistoryManager || window.HistoryManager };';

  const sandbox = {
    window: {},
    console,
    Object,
    String,
    Number,
    Boolean,
    Array,
    Set,
    Map
  };

  sandbox.globalThis = sandbox;
  vm.createContext(sandbox);
  vm.runInContext(source, sandbox, { filename: 'history.js' });
  return sandbox.__runtimeResilienceExports.HistoryManager;
}

function loadDrawingEngine() {
  const source = fs.readFileSync(
    path.join(__dirname, '..', 'js', 'drawing.js'),
    'utf8'
  ) + '\n;globalThis.__runtimeResilienceExports = { DrawingEngine: window.AboardDrawingEngine || window.DrawingEngine };';

  const sandbox = {
    window: {},
    localStorage: {
      getItem() {
        return null;
      },
      setItem() {},
      removeItem() {}
    },
    document: {},
    console,
    Object,
    String,
    Number,
    Boolean,
    Array,
    Set,
    Map,
    Math
  };

  sandbox.globalThis = sandbox;
  vm.createContext(sandbox);
  vm.runInContext(source, sandbox, { filename: 'drawing.js' });
  return sandbox.__runtimeResilienceExports.DrawingEngine;
}

function loadCustomizationRuntime(document = {}) {
  const source = fs.readFileSync(
    path.join(__dirname, '..', 'js', 'modules', 'customization-runtime.js'),
    'utf8'
  );

  const sandbox = {
    window: {},
    document,
    localStorage: {
      getItem() {
        return null;
      },
      setItem() {}
    },
    console,
    JSON,
    Object,
    String,
    Array
  };

  sandbox.globalThis = sandbox;
  vm.createContext(sandbox);
  vm.runInContext(source, sandbox, { filename: 'customization-runtime.js' });
  return sandbox.window.AboardCustomizationRuntime;
}

function loadFontManagementRuntime() {
  const source = fs.readFileSync(
    path.join(__dirname, '..', 'js', 'modules', 'font-management-runtime.js'),
    'utf8'
  );

  const sandbox = {
    window: {},
    document: {},
    console,
    Object,
    String,
    Number,
    Boolean,
    Array,
    Set,
    Map,
    parseInt
  };

  sandbox.globalThis = sandbox;
  vm.createContext(sandbox);
  vm.runInContext(source, sandbox, { filename: 'font-management-runtime.js' });
  return sandbox.window.AboardFontManagementRuntime;
}

function loadStorageManager({
  indexedDB,
  warnings = [],
  document: customDocument,
  createImageBitmap,
  Image,
  URL,
  atob
} = {}) {
  const source = fs.readFileSync(
    path.join(__dirname, '..', 'js', 'modules', 'storage-manager.js'),
    'utf8'
  ) + '\n;globalThis.__runtimeResilienceExports = { StorageManager: window.AboardStorageManager || window.StorageManager };';

  const defaultDocument = {
    createElement() {
      return {
        getContext() {
          return {
            putImageData() {},
            drawImage() {},
            getImageData() {
              return { restored: true };
            }
          };
        }
      };
    }
  };

  const sandbox = {
    window: {},
    indexedDB,
    localStorage: {
      getItem() {
        return null;
      },
      setItem() {},
      removeItem() {}
    },
    document: customDocument || defaultDocument,
    createImageBitmap,
    Image,
    URL,
    atob,
    Blob,
    console: {
      warn(...args) {
        warnings.push(args.map(String).join(' '));
      },
      log() {},
      error() {}
    },
    Promise,
    Object,
    String,
    Number,
    Boolean,
    Array,
    Set,
    Map,
    Date,
    Math,
    Uint8Array
  };

  sandbox.globalThis = sandbox;
  vm.createContext(sandbox);
  vm.runInContext(source, sandbox, { filename: 'storage-manager.js' });
  return sandbox.__runtimeResilienceExports.StorageManager;
}

function loadSettingsManager({ localStorage, warnings = [], documentOverrides = {} } = {}) {
  const source = fs.readFileSync(
    path.join(__dirname, '..', 'js', 'modules', 'settings-manager.js'),
    'utf8'
  ) + '\n;globalThis.__runtimeResilienceExports = { SettingsManager: window.AboardSettingsManager || window.SettingsManager };';

  class FakeToastManager {
    show() {}
  }

  const sandbox = {
    window: {
      innerWidth: 1366,
      devicePixelRatio: 1,
      i18n: null
    },
    document: {
      fonts: {
        add() {}
      },
      body: {
        style: {}
      },
      documentElement: {
        style: {
          setProperty() {}
        }
      },
      getElementById() {
        return null;
      },
      querySelectorAll() {
        return [];
      },
      ...documentOverrides
    },
    localStorage,
    ToastManager: FakeToastManager,
    FontFace: undefined,
    console: {
      warn(...args) {
        warnings.push(args.map(String).join(' '));
      },
      log() {},
      error() {}
    },
    Promise,
    Object,
    String,
    Number,
    Boolean,
    Array,
    Set,
    Map,
    Date,
    Math,
    parseInt,
    parseFloat
  };

  sandbox.globalThis = sandbox;
  vm.createContext(sandbox);
  vm.runInContext(source, sandbox, { filename: 'settings-manager.js' });
  return sandbox.__runtimeResilienceExports.SettingsManager;
}

async function testCreateAppServicesSurvivesFailingOptionalPwaManager() {
  class FakeI18n {
    constructor() {
      this.initCalls = 0;
    }

    async init() {
      this.initCalls += 1;
    }
  }

  class ThrowingPwaManager {
    constructor() {
      throw new Error('pwa unavailable');
    }
  }

  const warnings = [];
  const { createAppServices, win } = loadCreateAppServices({
    constructors: {
      AboardI18n: FakeI18n,
      AboardPWAManager: ThrowingPwaManager
    },
    warnings
  });

  const services = await createAppServices(win);

  assert.ok(services.i18n instanceof FakeI18n, 'core i18n service should still initialize');
  assert.equal(services.i18n.initCalls, 1, 'i18n should still complete initialization');
  assert.equal(services.pwaManager, null, 'optional PWA failures should degrade instead of aborting startup');
  assert.equal(win.i18n, services.i18n, 'initialized core services should still be exposed on window');
  assert.equal(Object.prototype.hasOwnProperty.call(win, 'pwaManager'), false, 'failed optional service should not leave a broken instance behind');
  assert.ok(
    warnings.some((entry) => entry.includes('pwaManager')),
    'service creation should log a warning for optional startup degradations'
  );
}

async function testCreateBoardDependenciesFallsBackForOptionalManagers() {
  class FakeSettingsManager {}

  class ThrowingStorageManager {
    constructor() {
      throw new Error('indexeddb unavailable');
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
  const createBoardDependencies = loadCreateBoardDependencies({
    constructors: {
      AboardSettingsManager: FakeSettingsManager,
      AboardStorageManager: ThrowingStorageManager,
      AboardCollapsibleManager: ThrowingCollapsibleManager,
      AnnouncementManager: ThrowingAnnouncementManager,
      AboardHelpSystem: ThrowingHelpSystem
    },
    warnings
  });

  const deps = createBoardDependencies({});

  assert.ok(deps.settingsManager instanceof FakeSettingsManager, 'core settings manager should still initialize');
  assert.equal(await deps.storageManager.loadSession(), null, 'storage fallback should behave like an empty persisted session');
  assert.equal(await deps.storageManager.hasSession(), false, 'storage fallback should report no recovery payload');
  assert.equal(await deps.storageManager.saveSession({}), false, 'storage fallback should no-op failed persistence writes');
  assert.doesNotThrow(() => deps.collapsibleManager.initializeCollapsibles(), 'collapsible fallback should be inert');
  assert.doesNotThrow(() => deps.announcementManager.showFromSettings(), 'announcement fallback should be inert');
  assert.doesNotThrow(() => deps.helpSystem.showHelp('help.any'), 'help fallback should be inert');
  assert.ok(
    warnings.some((entry) => entry.includes('StorageManager'))
      && warnings.some((entry) => entry.includes('AnnouncementManager')),
    'fallback creation should emit warnings for degraded optional dependencies'
  );
}

async function testCreateBoardDependenciesFallsBackForTimeDisplayFailures() {
  class FakeSettingsManager {}

  class ThrowingTimeDisplayManager {
    constructor() {
      throw new Error('localStorage unavailable');
    }
  }

  const warnings = [];
  const createBoardDependencies = loadCreateBoardDependencies({
    constructors: {
      AboardSettingsManager: FakeSettingsManager,
      AboardTimeDisplayManager: ThrowingTimeDisplayManager
    },
    warnings
  });

  const deps = createBoardDependencies({});

  assert.ok(deps.settingsManager instanceof FakeSettingsManager, 'core settings manager should still initialize');
  assert.equal(
    deps.timeDisplayManager,
    null,
    'time display failures should degrade instead of aborting startup'
  );
  assert.equal(
    typeof deps.timeDisplayControls,
    'undefined',
    'time display controls should be skipped when the manager is unavailable'
  );
  assert.equal(
    typeof deps.timeDisplaySettingsModal,
    'undefined',
    'time display settings modal should be skipped when the manager is unavailable'
  );
  assert.ok(
    warnings.some((entry) => entry.includes('TimeDisplayManager')),
    'time display degradation should emit a warning'
  );
}

function testLegacyBoardConstructionFallsBackForOptionalManagers() {
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

  class ThrowingImageControls {
    constructor() {
      throw new Error('image controls unavailable');
    }
  }

  class FakeSelectionManager {
    setHistoryManager(manager) {
      this.historyManager = manager;
    }

    setBackgroundManager(manager) {
      this.backgroundManager = manager;
    }
  }

  class ThrowingTeachingToolsManager {
    constructor() {
      throw new Error('teaching tools unavailable');
    }
  }

  class ThrowingShapeDrawingManager {
    constructor() {
      throw new Error('shape drawing unavailable');
    }
  }

  class ThrowingTimeDisplayManager {
    constructor() {
      throw new Error('time display unavailable');
    }
  }

  const warnings = [];
  const boardConstruction = loadBoardConstruction({
    constructors: {
      AboardDrawingEngine: FakeDrawingEngine,
      AboardHistoryManager: FakeHistoryManager,
      AboardBackgroundManager: FakeBackgroundManager,
      AboardImageControls: ThrowingImageControls,
      AboardSelectionManager: FakeSelectionManager,
      AboardTeachingToolsManager: ThrowingTeachingToolsManager,
      AboardShapeDrawingManager: ThrowingShapeDrawingManager,
      AboardTimeDisplayManager: ThrowingTimeDisplayManager
    },
    warnings
  });

  const runtimeDeps = boardConstruction.createCoreRuntimeDependencies({}, {
    canvas: {},
    ctx: {},
    bgCanvas: {},
    bgCtx: {}
  });
  const timeDisplayDeps = boardConstruction.createTimeDisplayDependencies({}, {});

  assert.ok(runtimeDeps.drawingEngine instanceof FakeDrawingEngine, 'legacy core drawing engine should still initialize');
  assert.ok(runtimeDeps.historyManager instanceof FakeHistoryManager, 'legacy history manager should still initialize');
  assert.ok(runtimeDeps.backgroundManager instanceof FakeBackgroundManager, 'legacy background manager should still initialize');
  assert.equal(runtimeDeps.imageControls, null, 'legacy image controls should degrade instead of aborting startup');
  assert.equal(runtimeDeps.strokeControls, undefined, 'retired stroke controls should not be constructed');
  assert.ok(runtimeDeps.selectionManager instanceof FakeSelectionManager,
    'selection should initialize without the retired stroke editor dependency');
  assert.equal(runtimeDeps.selectionManager.historyManager, runtimeDeps.historyManager);
  assert.equal(runtimeDeps.selectionManager.backgroundManager, runtimeDeps.backgroundManager);
  assert.equal(runtimeDeps.teachingToolsManager, null, 'legacy teaching tools should degrade instead of aborting startup');
  assert.equal(runtimeDeps.shapeDrawingManager, null, 'legacy shape drawing should degrade instead of aborting startup');
  assert.equal(runtimeDeps.lineStyleModal, null, 'legacy line style modal should be skipped when shape drawing is unavailable');
  assert.equal(runtimeDeps.edgeDrawingManager, null, 'legacy edge drawing should be skipped when teaching tools are unavailable');
  assert.equal(runtimeDeps.drawingEngine.shapeDrawingManager, null, 'legacy drawing engine should still accept a degraded shape drawing dependency');
  assert.equal(runtimeDeps.drawingEngine.edgeDrawingManager, null, 'legacy drawing engine should still accept a degraded edge drawing dependency');
  assert.equal(timeDisplayDeps.timeDisplayManager, null, 'legacy time display manager should degrade instead of aborting startup');
  assert.equal(timeDisplayDeps.timeDisplayControls, null, 'legacy time display controls should be skipped when the manager is unavailable');
  assert.equal(timeDisplayDeps.timeDisplaySettingsModal, null, 'legacy time display settings modal should be skipped when the manager is unavailable');
  assert.ok(
    warnings.some((entry) => entry.includes('ImageControls'))
      && warnings.some((entry) => entry.includes('TeachingToolsManager'))
      && warnings.some((entry) => entry.includes('ShapeDrawingManager'))
      && warnings.some((entry) => entry.includes('TimeDisplayManager')),
    'legacy optional manager degradations should emit warnings'
  );
}

async function testPageSceneRestoreSurvivesFailingLazyTextManager() {
  const warnings = [];
  const pageSceneRuntime = loadPageSceneRuntime({ warnings });
  const board = {
    pageScenes: null,
    insertTextManager: null,
    async getInsertTextManager() {
      throw new Error('text-manager-load-failed');
    }
  };
  const serializedScenes = {
    1: {
      pageNumber: 1,
      textObjects: [{ id: 'text-1', text: 'Restored text' }],
      strokes: [],
      objectGroups: [],
      stampedImages: []
    }
  };

  await assert.doesNotReject(async () => {
    await pageSceneRuntime.applySerializedPageScenes(board, serializedScenes);
  }, 'page scene restoration should degrade instead of aborting when lazy text manager initialization fails');

  assert.deepEqual(
    JSON.parse(JSON.stringify(board.pageScenes)),
    serializedScenes,
    'serialized page scenes should still be preserved when text manager initialization fails'
  );
  assert.equal(board.insertTextManager, null, 'failed lazy text manager initialization should leave the optional dependency unset');
  assert.ok(
    warnings.some((entry) => entry.includes('InsertTextManager')),
    'page scene restoration degradation should emit a warning when lazy text manager initialization fails'
  );
}

async function testPageSceneRestoreNormalizesImportedSceneNumbers() {
  const pageSceneRuntime = loadPageSceneRuntime();
  const board = {};
  const serializedScenes = {
    1: {
      pageNumber: 1,
      textObjects: [{
        id: 'text-1',
        text: 'Safe text',
        x: '10" onload="alert(1)',
        y: '20',
        fontSize: 'not-a-number',
        rotation: '15',
        decorationWidth: '4'
      }],
      strokes: [{
        points: [
          { x: '10', y: '20' },
          { x: '0" onload="alert(1)', y: 30 }
        ],
        size: '12',
        rotation: 'bad',
        layerOrder: '7',
        shapeDashDensity: 1e9,
        shapeWaveDensity: 1e-300,
        shapeMultiLineCount: 1e9,
        shapeMultiLineSpacing: -1e9,
        arrowSize: 1e9
      }],
      stampedImages: [{
        imageSrc: 'data:image/png;base64,aW1hZ2U=',
        x: '5" onload="alert(1)',
        y: '15',
        width: '100',
        height: 'oops',
        rotation: '45',
        layerOrder: '3'
      }],
      objectGroups: []
    }
  };

  await pageSceneRuntime.applySerializedPageScenes(board, serializedScenes);

  const scene = board.pageScenes['1'];
  assert.equal(scene.strokes.length, 1, 'valid imported strokes should be retained');
  assert.deepEqual(
    JSON.parse(JSON.stringify(scene.strokes[0].points)),
    [{ x: 10, y: 20 }],
    'non-finite or attribute-like stroke point coordinates should be discarded before SVG rendering'
  );
  assert.equal(scene.strokes[0].size, 12, 'numeric stroke sizes should be normalized from import payloads');
  assert.equal(scene.strokes[0].rotation, 0, 'invalid stroke rotation should fall back to a finite number');
  assert.equal(scene.strokes[0].layerOrder, 7, 'numeric layer order should be normalized from import payloads');
  assert.equal(scene.strokes[0].shapeDashDensity, 100, 'shape dash density should stay within the renderer setting range');
  assert.equal(scene.strokes[0].shapeWaveDensity, 5, 'shape wave density must not create an unbounded render loop');
  assert.equal(scene.strokes[0].shapeMultiLineCount, 10, 'shape line count must not create an unbounded render loop');
  assert.equal(scene.strokes[0].shapeMultiLineSpacing, 5, 'shape line spacing should stay within the renderer setting range');
  assert.equal(scene.strokes[0].arrowSize, 100, 'shape arrow size should stay within the renderer setting range');

  assert.equal(scene.stampedImages.length, 1, 'valid imported images should be retained');
  assert.equal(scene.stampedImages[0].x, 0, 'invalid image x coordinate should fall back to a finite number');
  assert.equal(scene.stampedImages[0].y, 15, 'numeric image y coordinate should be normalized');
  assert.equal(scene.stampedImages[0].width, 100, 'numeric image width should be normalized');
  assert.equal(scene.stampedImages[0].height, 0, 'invalid image height should fall back to a finite number');
  assert.equal(scene.stampedImages[0].rotation, 45, 'numeric image rotation should be normalized');

  assert.equal(scene.textObjects.length, 1, 'text objects should remain restorable after numeric normalization');
  assert.equal(scene.textObjects[0].x, 0, 'invalid text x coordinate should fall back to a finite number');
  assert.equal(scene.textObjects[0].y, 20, 'numeric text y coordinate should be normalized');
  assert.equal(scene.textObjects[0].fontSize, 48, 'invalid text font size should use the default finite size');
  assert.equal(scene.textObjects[0].rotation, 15, 'numeric text rotation should be normalized');
  assert.equal(scene.textObjects[0].decorationWidth, 4, 'numeric text decoration width should be normalized');
}

function testPageSceneSerializationSurvivesMalformedStoredSceneCollections() {
  const pageSceneRuntime = loadPageSceneRuntime();
  const board = {
    currentPage: 2,
    pageScenes: {
      1: {
        pageNumber: 1,
        objectGroups: 'not-an-array',
        textObjects: 'not-an-array',
        strokes: { invalid: true },
        stampedImages: { invalid: true }
      }
    }
  };

  let serializedScenes = null;
  assert.doesNotThrow(() => {
    serializedScenes = pageSceneRuntime.getSerializedPageScenes(board, null, { includeCurrentPage: false });
  }, 'page scene serialization should ignore malformed stored scene collections instead of crashing');

  assert.deepEqual(
    JSON.parse(JSON.stringify(serializedScenes)),
    {},
    'malformed stored page scene collections should not be serialized as renderable scene content'
  );
}

async function testPageSceneHydrationIgnoresMalformedOnlyScenes() {
  const pageSceneRuntime = loadPageSceneRuntime();
  const board = {};

  await pageSceneRuntime.applySerializedPageScenes(board, {
    1: {
      pageNumber: 1,
      objectGroups: 'not-an-array',
      textObjects: 'not-an-array',
      strokes: { invalid: true },
      stampedImages: { invalid: true }
    }
  });

  assert.deepEqual(
    JSON.parse(JSON.stringify(board.pageScenes)),
    {},
    'malformed-only imported scenes should not be preserved as renderable page content'
  );
}

function testPageSceneCaptureSurvivesMalformedRuntimeCollections() {
  const pageSceneRuntime = loadPageSceneRuntime();
  const board = {
    currentPage: 1,
    drawingEngine: {
      objectGroups: 'not-an-array',
      strokes: [{
        points: { invalid: true },
        size: '7',
        color: '#000000'
      }],
      stampedImages: { invalid: true },
      getNextObjectId() {
        return 'obj-1';
      }
    },
    insertTextManager: {
      getTextObjects() {
        return 'not-an-array';
      }
    }
  };

  let scene = null;
  assert.doesNotThrow(() => {
    scene = pageSceneRuntime.capturePageScene(board, 1, { includeEmpty: true, includeImageElements: false });
  }, 'capturing the current page scene should tolerate malformed runtime collections');

  assert.deepEqual(
    JSON.parse(JSON.stringify(scene.strokes[0].points)),
    [],
    'malformed runtime stroke point collections should serialize as an empty point list'
  );
  assert.deepEqual(
    JSON.parse(JSON.stringify(scene.stampedImages)),
    [],
    'malformed runtime stamped image collections should serialize as an empty image list'
  );
}

function testToolSelectionSurvivesMissingSelectionManager() {
  const toolRuntime = loadToolRuntime();

  const exitingSelectBoard = {
    drawingEngine: {
      currentTool: 'select',
      setTool(tool) {
        this.currentTool = tool;
      }
    },
    selectionManager: null,
    isCoordinateOriginDragMode: false,
    isCoordinatePointMode: false,
    disableCoordinateOriginDragMode() {},
    setCoordinatePointMode() {},
    toggleCoordinateSettingsPanel() {},
    toggleCoordinatePointPanel() {},
    ensureShapeToolConfigListenersInitialized() {},
    ensureSelectToolConfigListenersInitialized() {},
    ensureBackgroundPanelPrepared() {},
    hideEraserCursor() {},
    updateUI() {}
  };

  assert.doesNotThrow(() => {
    toolRuntime.setTool(exitingSelectBoard, 'pen', false);
  }, 'tool switching should degrade instead of throwing when exiting select mode without a selection manager');
  assert.equal(exitingSelectBoard.drawingEngine.currentTool, 'pen');

  const enteringSelectBoard = {
    drawingEngine: {
      currentTool: 'pen',
      setTool(tool) {
        this.currentTool = tool;
      }
    },
    selectionManager: null,
    insertTextManager: { textObjects: [] },
    isCoordinateOriginDragMode: false,
    isCoordinatePointMode: false,
    disableCoordinateOriginDragMode() {},
    setCoordinatePointMode() {},
    toggleCoordinateSettingsPanel() {},
    toggleCoordinatePointPanel() {},
    ensureShapeToolConfigListenersInitialized() {},
    ensureSelectToolConfigListenersInitialized() {},
    ensureBackgroundPanelPrepared() {},
    hideEraserCursor() {},
    updateUI() {}
  };

  assert.doesNotThrow(() => {
    toolRuntime.setTool(enteringSelectBoard, 'select', false);
  }, 'select tool activation should degrade instead of throwing when the optional selection manager is unavailable');
  assert.equal(enteringSelectBoard.drawingEngine.currentTool, 'select');
}

function testSelectToolUsesDefaultCanvasCursor() {
  const toolRuntime = loadToolRuntime();
  const board = {
    canvas: { style: {} },
    drawingEngine: {
      currentTool: 'select'
    },
    historyManager: {
      canUndo() {
        return false;
      },
      canRedo() {
        return false;
      }
    },
    positionFeatureArea() {},
    syncEraserSizeControls() {}
  };

  toolRuntime.updateUI(board);

  assert.equal(board.canvas.style.cursor, 'default', 'select mode should keep the normal pointer cursor');
}

function testVectorPreviewStaysOffForMarkerStrokes() {
  const interactionRuntime = loadInteractionRuntime();
  const board = {
    canvasFitScale: 1,
    drawingEngine: {
      canvasScale: 2,
      strokes: [{ tool: 'pen', penType: 'marker', points: [{ x: 1, y: 1 }, { x: 2, y: 2 }] }],
      stampedImages: [],
      isDrawing: false,
      shouldUseLiveStrokePreview() {
        return false;
      },
      shouldUseLiveEraserPreview() {
        return false;
      }
    },
    insertTextManager: null,
    insertImageManager: null,
    shapeDrawingManager: null,
    selectionManager: {
      hasSelection() {
        return false;
      }
    },
    strokeControls: null,
    hasVectorPreviewContent() {
      return interactionRuntime.hasVectorPreviewContent(board);
    }
  };

  assert.equal(
    interactionRuntime.shouldUseVectorPreview(board),
    false,
    'stored marker strokes should remain on the raster canvas so their translucent overlap does not fade at high zoom'
  );
}

function testCreateBoardDependenciesLeavesDeferredHelpUninitialized() {
  class FakeSettingsManager {}

  const createBoardDependencies = loadCreateBoardDependencies({
    constructors: {
      AboardSettingsManager: FakeSettingsManager
    },
    warnings: []
  });

  const deps = createBoardDependencies({});

  assert.equal(
    deps.helpSystem,
    undefined,
    'help must remain unset until the post-visible HelpSystem constructor is available'
  );
}

function testOffCanvasImageMirrorLookupHandlesSelectorSpecialChars() {
  const DrawingEngine = loadDrawingEngine();
  const mirror = {
    dataset: {
      objectId: 'imported"]#bad'
    }
  };
  let selectorUsed = null;
  const layer = {
    querySelectorAll(selector) {
      selectorUsed = selector;
      return [mirror];
    }
  };
  const engine = Object.create(DrawingEngine.prototype);

  const found = engine.findOffCanvasImageMirror(layer, 'imported"]#bad');

  assert.equal(found, mirror, 'off-canvas image mirrors should be found without interpolating object ids into selectors');
  assert.equal(selectorUsed, '[data-object-id]', 'mirror lookup should use a static selector only');
}

function testCustomizationReorderingHandlesSelectorSpecialChars() {
  const suspiciousName = 'imported"]#bad';
  const toolItem = { dataset: { tool: suspiciousName } };
  const controlItem = { dataset: { control: suspiciousName } };
  const appended = [];

  const makeList = (expectedSelector, item) => ({
    querySelector(selector) {
      throw new Error(`dynamic selector should not be used: ${selector}`);
    },
    querySelectorAll(selector) {
      assert.equal(selector, expectedSelector, 'reordering should use a static data selector');
      return [item];
    },
    appendChild(itemToAppend) {
      appended.push(itemToAppend);
    }
  });
  const controlList = makeList('[data-control]', controlItem);
  const runtime = loadCustomizationRuntime({
    getElementById(id) {
      return id === 'control-button-list' ? controlList : null;
    }
  });

  runtime.reorderToolbarItems({}, makeList('[data-tool]', toolItem), [suspiciousName]);
  runtime.reorderControlButtonList({}, [suspiciousName]);

  assert.deepEqual(appended, [toolItem, controlItem], 'customization reordering should match data attributes by value without selector interpolation');
}

function testFontAliasLookupHandlesSelectorSpecialCharsWithoutCssEscape() {
  const runtime = loadFontManagementRuntime();
  const suspiciousFont = 'Font"]#bad';
  const aliasInput = {};
  const fontItem = {
    dataset: {
      font: suspiciousFont
    },
    querySelector(selector) {
      assert.equal(selector, '.font-alias-input', 'font alias lookup should query inside the matched item only');
      return aliasInput;
    }
  };
  const list = {
    querySelector(selector) {
      throw new Error(`dynamic selector should not be used: ${selector}`);
    },
    querySelectorAll(selector) {
      assert.equal(selector, '.font-management-item[data-font]', 'font alias lookup should use a static data selector');
      return [fontItem];
    }
  };

  const found = runtime.findFontAliasInput(list, suspiciousFont);

  assert.equal(found, aliasInput, 'font alias input lookup should not depend on CSS.escape or selector interpolation');
}

async function testStorageManagerGracefullyHandlesMissingIndexedDb() {
  const warnings = [];
  const StorageManager = loadStorageManager({ indexedDB: undefined, warnings });
  const manager = new StorageManager();

  assert.equal(await manager.hasSession(), false, 'missing IndexedDB should look like an empty persisted session');
  assert.equal(await manager.loadSession(), null, 'missing IndexedDB should not throw when loading session data');
  assert.equal(await manager.saveSession({ pages: [] }), false, 'missing IndexedDB should no-op session saves');
  assert.equal(await manager.clearSession(), false, 'missing IndexedDB should no-op session clears');
  assert.ok(
    warnings.some((entry) => entry.includes('IndexedDB')),
    'storage degradation should emit a warning when IndexedDB is unavailable'
  );
}

async function testStorageManagerFallsBackWhenCanvasToBlobIsUnavailable() {
  let putImageDataCalls = 0;
  const StorageManager = loadStorageManager({
    document: {
      createElement(tagName) {
        assert.equal(tagName, 'canvas', 'storage helper should create a canvas element');
        return {
          width: 0,
          height: 0,
          getContext() {
            return {
              putImageData() {
                putImageDataCalls += 1;
              }
            };
          },
          toDataURL(type) {
            assert.equal(type, 'image/png', 'fallback should preserve PNG encoding');
            return 'data:image/png;base64,QUJD';
          }
        };
      }
    },
    atob(value) {
      return Buffer.from(value, 'base64').toString('binary');
    }
  });

  const blob = await StorageManager.imageDataToBlob({
    width: 2,
    height: 2,
    data: new Uint8ClampedArray(16)
  });

  assert.ok(blob instanceof Blob, 'imageDataToBlob should still return a Blob when canvas.toBlob is unavailable');
  assert.equal(blob.size, 3, 'fallback blob should contain decoded image bytes from the data URL');
  assert.equal(putImageDataCalls, 1, 'image data should still be written onto the temporary canvas');
}

async function testStorageManagerFallsBackWhenCreateImageBitmapIsUnavailable() {
  const revokedObjectUrls = [];
  let drawImageCalls = 0;
  const StorageManager = loadStorageManager({
    createImageBitmap: undefined,
    Image: class FakeImage {
      constructor() {
        this.width = 23;
        this.height = 17;
        this.onload = null;
        this.onerror = null;
      }

      set src(value) {
        this._src = value;
        if (value === 'blob:mock-image' && typeof this.onload === 'function') {
          this.onload();
        }
      }
    },
    URL: {
      createObjectURL(blob) {
        assert.ok(blob instanceof Blob, 'fallback should create an object URL for the provided blob');
        return 'blob:mock-image';
      },
      revokeObjectURL(url) {
        revokedObjectUrls.push(url);
      }
    },
    document: {
      createElement(tagName) {
        assert.equal(tagName, 'canvas', 'image restoration should render through a canvas');
        return {
          width: 0,
          height: 0,
          getContext() {
            return {
              drawImage(image) {
                drawImageCalls += 1;
                assert.equal(image.width, 23, 'fallback should draw the decoded image onto the canvas');
                assert.equal(image.height, 17, 'fallback should retain the decoded image dimensions');
              },
              getImageData(_x, _y, width, height) {
                return { restored: true, width, height };
              }
            };
          }
        };
      }
    }
  });

  const restored = await StorageManager.blobToImageData(new Blob(['png-bytes'], { type: 'image/png' }));

  assert.deepEqual(
    restored,
    { restored: true, width: 23, height: 17 },
    'blobToImageData should fall back to Image decoding when createImageBitmap is unavailable'
  );
  assert.equal(drawImageCalls, 1, 'fallback image restoration should draw exactly once');
  assert.deepEqual(
    revokedObjectUrls,
    ['blob:mock-image'],
    'object URLs created for fallback image restoration should always be released'
  );
}

function testSettingsManagerUsesDefaultsWhenLocalStorageUnavailable() {
  const warnings = [];
  const throwingStorage = {
    getItem() {
      throw new Error('storage blocked');
    },
    setItem() {
      throw new Error('storage blocked');
    },
    removeItem() {
      throw new Error('storage blocked');
    }
  };
  const SettingsManager = loadSettingsManager({
    localStorage: throwingStorage,
    warnings
  });

  const manager = new SettingsManager();

  assert.equal(manager.toolbarSize, 60, 'settings manager should fall back to default toolbar size');
  assert.equal(manager.configScale, 1, 'settings manager should fall back to default config scale');
  assert.equal(manager.controlPosition, 'top-right', 'settings manager should fall back to the default control position');
  assert.equal(manager.canvasWidth, 1920, 'settings manager should fall back to the default canvas width');
  assert.equal(manager.canvasHeight, 1080, 'settings manager should fall back to the default canvas height');
  assert.deepEqual(
    Array.from(manager.customFonts || []),
    [],
    'settings manager should fall back to empty custom fonts'
  );
  assert.ok(
    warnings.some((entry) => entry.includes('localStorage')),
    'settings degradation should emit warnings when storage is blocked'
  );
}

function testSettingsManagerStateExportSurvivesBlockedLocalStorage() {
  const warnings = [];
  const throwingStorage = {
    getItem() {
      throw new Error('storage blocked');
    },
    setItem() {
      throw new Error('storage blocked');
    },
    removeItem() {
      throw new Error('storage blocked');
    }
  };
  const SettingsManager = loadSettingsManager({
    localStorage: throwingStorage,
    warnings
  });

  const manager = new SettingsManager();
  const state = manager.getCurrentSettingsState();

  assert.equal(state.localeSettings.locale, 'zh-CN', 'settings export should fall back to the default locale');
  assert.equal(state.toolbarOrder, null, 'settings export should tolerate blocked toolbar order storage');
  assert.deepEqual(
    { ...state.controlSettings },
    {
      zoom: true,
      pagination: true,
      time: true,
      fullscreen: true,
      import: true,
      export: true
    },
    'settings export should fall back to default control visibility when storage is blocked'
  );
  assert.ok(
    warnings.some((entry) => entry.includes('localStorage')),
    'settings export degradation should emit warnings when storage is blocked'
  );
}

function testSettingsManagerApplySettingsSurvivesBlockedLocalStorage() {
  const warnings = [];
  const throwingStorage = {
    getItem() {
      throw new Error('storage blocked');
    },
    setItem() {
      throw new Error('storage blocked');
    },
    removeItem() {
      throw new Error('storage blocked');
    }
  };
  const SettingsManager = loadSettingsManager({
    localStorage: throwingStorage,
    warnings
  });

  const manager = new SettingsManager();
  manager.loadSettings = () => {};

  assert.doesNotThrow(() => {
    manager.applySettings({
      themeColor: '#ff5500',
      showToolbarText: false,
      controlSettings: {
        zoom: false,
        pagination: true,
        time: true,
        fullscreen: true,
        import: false,
        export: true
      }
    });
  }, 'settings import/apply flow should degrade instead of throwing when localStorage writes fail');

  assert.equal(manager.themeColor, '#ff5500', 'settings should still update in memory when persistence is unavailable');
  assert.equal(manager.showToolbarText, false, 'boolean settings should still update in memory when persistence is unavailable');
  assert.ok(
    warnings.some((entry) => entry.includes('localStorage')),
    'settings apply degradation should emit warnings when storage is blocked'
  );
}

async function testStorageManagerRecoversAfterBlockedOpenSucceeds() {
  let openRequest;
  const sessionCountRequest = {};
  const db = {
    transaction() {
      return {
        objectStore() {
          return {
            count() {
              queueMicrotask(() => {
                sessionCountRequest.result = 1;
                sessionCountRequest.onsuccess?.();
              });
              return sessionCountRequest;
            }
          };
        }
      };
    }
  };
  const StorageManager = loadStorageManager({
    indexedDB: {
      open() {
        openRequest = {};
        return openRequest;
      }
    }
  });
  const manager = new StorageManager();

  openRequest.onblocked();
  await manager.initPromise;
  openRequest.onsuccess({ target: { result: db } });

  assert.equal(
    await manager.hasSession(),
    true,
    'a database connection that succeeds after being blocked should restore persistence'
  );
}

function testSettingsManagerNormalizesMalformedStoredSettings() {
  const storedValues = {
    toolbarSize: 'NaN',
    configScale: '99',
    controlPosition: 'center',
    customFonts: JSON.stringify([
      null,
      { name: '', data: 'data:font/woff2;base64,bad' },
      { name: 'Teacher Font', data: 'data:font/woff2;base64,dGVzdA==' }
    ])
  };
  const SettingsManager = loadSettingsManager({
    localStorage: {
      getItem(key) { return storedValues[key] ?? null; },
      setItem() {},
      removeItem() {}
    }
  });

  const manager = new SettingsManager();

  assert.equal(manager.toolbarSize, 60, 'invalid stored toolbar sizes should use the display default');
  assert.equal(manager.configScale, 1, 'out-of-range stored config scales should use the display default');
  assert.equal(manager.controlPosition, 'top-right', 'invalid stored control positions should use the default');
  assert.deepEqual(
    JSON.parse(JSON.stringify(manager.customFonts)),
    [{ name: 'Teacher Font', data: 'data:font/woff2;base64,dGVzdA==' }],
    'malformed stored custom font entries should not prevent settings startup'
  );
}

function testSettingsManagerRejectsMalformedImportedSettings() {
  const SettingsManager = loadSettingsManager({
    localStorage: {
      getItem() { return null; },
      setItem() {},
      removeItem() {}
    }
  });
  const manager = new SettingsManager();

  assert.throws(
    () => manager.validateImportedSettings(null),
    /configuration/i,
    'configuration imports must use a plain object root'
  );
  assert.throws(
    () => manager.validateImportedSettings({ toolbarSize: 1000 }),
    /toolbarSize/,
    'toolbar size imports must stay within the supported UI range'
  );
  assert.throws(
    () => manager.validateImportedSettings({ configScale: Infinity }),
    /configScale/,
    'config scale imports must be finite and within the supported UI range'
  );
  assert.throws(
    () => manager.validateImportedSettings({ customFonts: [null] }),
    /customFonts/,
    'custom font imports must contain valid font records'
  );
  assert.throws(
    () => manager.validateImportedSettings({ edgeSnapEnabled: 'false' }),
    /edgeSnapEnabled/,
    'boolean settings must not accept truthy strings'
  );
  assert.throws(
    () => manager.validateImportedSettings({ patternPreferences: { grid: 'yes' } }),
    /patternPreferences/,
    'pattern preferences must contain booleans'
  );
  assert.throws(
    () => manager.validateImportedSettings({ toolbarOrder: '{"pen":1}' }),
    /toolbarOrder/,
    'toolbar order must decode to an array'
  );
  let deeplyNestedPreferences = {};
  for (let depth = 0; depth < 25; depth += 1) {
    deeplyNestedPreferences = { child: deeplyNestedPreferences };
  }
  assert.throws(
    () => manager.validateImportedSettings({ fontPreferences: deeplyNestedPreferences }),
    /complexity/i,
    'configuration imports must reject structures deep enough to overflow recursive diffing'
  );
  assert.throws(
    () => manager.validateImportedSettings({
      customFonts: Array.from({ length: 101 }, (_, index) => ({
        name: `Font ${index}`,
        data: 'data:font/woff2;base64,dGVzdA=='
      }))
    }),
    /customFonts/,
    'configuration imports must cap custom font collections before loading every font'
  );
  assert.throws(
    () => manager.validateImportedSettings({
      toolbarOrder: JSON.stringify(Array.from({ length: 1001 }, () => 'pen'))
    }),
    /toolbarOrder/,
    'configuration imports must cap serialized ordering collections'
  );
  assert.doesNotThrow(
    () => manager.validateImportedSettings({
      toolbarSize: 65,
      configScale: 1.1,
      edgeSnapEnabled: false,
      patternPreferences: { grid: true },
      toolbarOrder: '["pen","eraser"]',
      customFonts: [{ name: 'Teacher Font', data: 'data:font/woff2;base64,dGVzdA==' }]
    })
  );
  assert.doesNotThrow(
    () => manager.validateImportedSettings(manager.getCurrentSettingsState()),
    'the application must accept its own complete exported settings format'
  );
  assert.throws(
    () => manager.applySettings({ toolbarSize: 1000 }),
    /toolbarSize/,
    'the final settings write boundary must revalidate edited import values'
  );
}

function testSettingsManagerLayoutUpdatesSurviveMissingUiElements() {
  const SettingsManager = loadSettingsManager({
    localStorage: {
      getItem() {
        return null;
      },
      setItem() {},
      removeItem() {}
    }
  });

  const manager = new SettingsManager();

  assert.doesNotThrow(() => {
    manager.updateToolbarSize();
  }, 'toolbar sizing should degrade instead of throwing when the toolbar element is missing');
  assert.doesNotThrow(() => {
    manager.updateToolbarTextVisibility();
  }, 'toolbar text visibility should degrade instead of throwing when the toolbar element is missing');
  assert.doesNotThrow(() => {
    manager.updateConfigScale();
  }, 'config scale updates should degrade instead of throwing when the config area is missing');
  assert.doesNotThrow(() => {
    manager.setControlPosition('top-left');
  }, 'control position updates should degrade instead of throwing when control areas are missing');
}

function testSettingsManagerLoadSettingsSurvivesMissingUiElements() {
  const SettingsManager = loadSettingsManager({
    localStorage: {
      getItem() {
        return null;
      },
      setItem() {},
      removeItem() {}
    }
  });

  const manager = new SettingsManager();

  assert.doesNotThrow(() => {
    manager.loadSettings();
  }, 'settings initialization should degrade instead of throwing when settings inputs are missing');
  assert.doesNotThrow(() => {
    manager.setCanvasPreset('A4-portrait');
  }, 'canvas preset updates should degrade instead of throwing when canvas inputs are missing');
  assert.equal(manager.canvasWidth, 794, 'preset application should still update the stored canvas width');
  assert.equal(manager.canvasHeight, 1123, 'preset application should still update the stored canvas height');
}

function testHistoryManagerUsesSmallerDefaultMemoryCap() {
  const HistoryManager = loadHistoryManager();
  const manager = new HistoryManager(
    { width: 1920, height: 1080 },
    {
      getImageData() {
        return { data: { byteLength: 0 } };
      },
      putImageData() {}
    }
  );

  const largeStateBytes = 80 * 1024 * 1024;
  manager.history = [
    { data: { byteLength: largeStateBytes } },
    { data: { byteLength: largeStateBytes } }
  ];
  manager.historyStep = 1;

  assert.equal(
    manager.memoryLimitBytes,
    128 * 1024 * 1024,
    'history should default to a tighter memory cap to reduce long-session crashes'
  );

  manager.trimToMemoryLimit();

  assert.equal(manager.history.length, 1, 'history trimming should shed the oldest snapshots once the cap is exceeded');
  assert.equal(manager.historyStep, 0, 'history step should stay aligned after trimming');
}

(async function main() {
  await testCreateAppServicesSurvivesFailingOptionalPwaManager();
  await testCreateBoardDependenciesFallsBackForOptionalManagers();
  testCreateBoardDependenciesLeavesDeferredHelpUninitialized();
  await testCreateBoardDependenciesFallsBackForTimeDisplayFailures();
  testLegacyBoardConstructionFallsBackForOptionalManagers();
  await testPageSceneRestoreSurvivesFailingLazyTextManager();
  await testPageSceneRestoreNormalizesImportedSceneNumbers();
  testPageSceneSerializationSurvivesMalformedStoredSceneCollections();
  await testPageSceneHydrationIgnoresMalformedOnlyScenes();
  testPageSceneCaptureSurvivesMalformedRuntimeCollections();
  testToolSelectionSurvivesMissingSelectionManager();
  testSelectToolUsesDefaultCanvasCursor();
  testVectorPreviewStaysOffForMarkerStrokes();
  testOffCanvasImageMirrorLookupHandlesSelectorSpecialChars();
  testCustomizationReorderingHandlesSelectorSpecialChars();
  testFontAliasLookupHandlesSelectorSpecialCharsWithoutCssEscape();
  await testStorageManagerGracefullyHandlesMissingIndexedDb();
  await testStorageManagerRecoversAfterBlockedOpenSucceeds();
  await testStorageManagerFallsBackWhenCanvasToBlobIsUnavailable();
  await testStorageManagerFallsBackWhenCreateImageBitmapIsUnavailable();
  testSettingsManagerUsesDefaultsWhenLocalStorageUnavailable();
  testSettingsManagerNormalizesMalformedStoredSettings();
  testSettingsManagerStateExportSurvivesBlockedLocalStorage();
  testSettingsManagerApplySettingsSurvivesBlockedLocalStorage();
  testSettingsManagerRejectsMalformedImportedSettings();
  testSettingsManagerLayoutUpdatesSurviveMissingUiElements();
  testSettingsManagerLoadSettingsSurvivesMissingUiElements();
  testHistoryManagerUsesSmallerDefaultMemoryCap();
  console.log('runtime-resilience.test: all assertions passed');
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
