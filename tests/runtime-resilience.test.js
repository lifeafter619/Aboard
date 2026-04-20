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
    .replace(/import[\s\S]*?;\n/g, '')
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
    .replace(/import[\s\S]*?;\n/g, '')
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

function loadSettingsManager({ localStorage, warnings = [] } = {}) {
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
      }
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
  await testCreateBoardDependenciesFallsBackForTimeDisplayFailures();
  await testStorageManagerGracefullyHandlesMissingIndexedDb();
  await testStorageManagerFallsBackWhenCanvasToBlobIsUnavailable();
  await testStorageManagerFallsBackWhenCreateImageBitmapIsUnavailable();
  testSettingsManagerUsesDefaultsWhenLocalStorageUnavailable();
  testSettingsManagerStateExportSurvivesBlockedLocalStorage();
  testSettingsManagerApplySettingsSurvivesBlockedLocalStorage();
  testHistoryManagerUsesSmallerDefaultMemoryCap();
  console.log('runtime-resilience.test: all assertions passed');
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
