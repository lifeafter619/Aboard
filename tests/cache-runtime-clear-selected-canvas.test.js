const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

function createStorageStub(initialEntries = {}) {
  const store = new Map(
    Object.entries(initialEntries).map(([key, value]) => [key, String(value)])
  );

  return {
    get length() {
      return store.size;
    },
    key(index) {
      return [...store.keys()][index] ?? null;
    },
    getItem(key) {
      return store.has(key) ? store.get(key) : null;
    },
    setItem(key, value) {
      store.set(key, String(value));
    },
    removeItem(key) {
      store.delete(key);
    },
    clear() {
      store.clear();
    }
  };
}

function loadCacheRuntime(localStorage, sessionStorage) {
  const window = {
    setTimeout,
    clearTimeout
  };
  const context = {
    window,
    document: {
      getElementById() {
        return null;
      }
    },
    navigator: {},
    caches: {
      async keys() {
        return [];
      }
    },
    localStorage,
    sessionStorage,
    console,
    Promise,
    Set,
    Map,
    Object,
    String,
    Number,
    Boolean,
    Math,
    JSON,
    Blob,
    StorageManager: {
      estimateSessionSize() {
        return 0;
      }
    }
  };

  context.globalThis = context;
  context.self = context;
  context.window.localStorage = localStorage;
  context.window.sessionStorage = sessionStorage;

  vm.createContext(context);
  const source = fs.readFileSync(
    path.join(__dirname, '..', 'js', 'modules', 'cache-runtime.js'),
    'utf8'
  );
  vm.runInContext(source, context, { filename: 'cache-runtime.js' });
  return context.window.AboardCacheRuntime;
}

async function testCanvasClearRemovesExtendedBoardStateKeys() {
  const localStorage = createStorageStub({
    pageBackgrounds: '{"1":{"backgroundPattern":"image"}}',
    backgroundColor: '#112233',
    backgroundPattern: 'image',
    bgOpacity: '0.85',
    patternIntensity: '0.62',
    patternDensity: '1.5',
    backgroundImageData: 'data:image/png;base64,abc',
    imageTransform: '{"x":12,"y":24,"width":320,"height":180}',
    imageSize: '1.75',
    coordinateOriginX: '12',
    coordinateOriginY: '24',
    coordinateOverlayState: '{"points":[{"id":"p1","x":1,"y":2}]}',
    backgroundOutsideLayerOrder: '7',
    backgroundImageConfirmed: 'true',
    uploadedImages: '[{"id":"img-1","data":"data:image/png;base64,abc"}]',
    pageScenes: '{"1":{"strokes":[]}}',
    themeColor: '#336699'
  });
  const sessionStorage = createStorageStub({
    backgroundImageData: 'data:image/png;base64,abc',
    imageTransform: '{"x":12,"y":24,"width":320,"height":180}',
    uploadedImages: '[{"id":"img-1"}]'
  });
  const runtime = loadCacheRuntime(localStorage, sessionStorage);

  let clearSessionDataCalls = 0;
  const board = {
    cacheStorageSizeSnapshotKey: 'aboardCacheStorageSnapshot',
    getCacheKeyGroups() {
      return runtime.getCacheKeyGroups(this);
    },
    async clearSessionData() {
      clearSessionDataCalls += 1;
    },
    storageManager: {
      getSessionSizeEstimate() {
        return 0;
      }
    }
  };

  await runtime.clearSelectedCache(board, {
    canvas: true,
    settings: false,
    other: false
  });

  assert.equal(clearSessionDataCalls, 1, 'canvas cache clear should clear persisted session data first');
  assert.equal(localStorage.getItem('pageBackgrounds'), null);
  assert.equal(localStorage.getItem('backgroundColor'), null);
  assert.equal(localStorage.getItem('backgroundPattern'), null);
  assert.equal(localStorage.getItem('bgOpacity'), null);
  assert.equal(localStorage.getItem('patternIntensity'), null);
  assert.equal(localStorage.getItem('patternDensity'), null);
  assert.equal(localStorage.getItem('backgroundImageData'), null);
  assert.equal(localStorage.getItem('imageTransform'), null);
  assert.equal(localStorage.getItem('imageSize'), null);
  assert.equal(localStorage.getItem('coordinateOriginX'), null);
  assert.equal(localStorage.getItem('coordinateOriginY'), null);
  assert.equal(localStorage.getItem('coordinateOverlayState'), null);
  assert.equal(localStorage.getItem('backgroundOutsideLayerOrder'), null);
  assert.equal(localStorage.getItem('backgroundImageConfirmed'), null);
  assert.equal(localStorage.getItem('uploadedImages'), null);
  assert.equal(localStorage.getItem('pageScenes'), null);
  assert.equal(sessionStorage.getItem('backgroundImageData'), null);
  assert.equal(sessionStorage.getItem('imageTransform'), null);
  assert.equal(sessionStorage.getItem('uploadedImages'), null);
  assert.equal(
    localStorage.getItem('themeColor'),
    '#336699',
    'canvas-only cache clear should not remove settings keys'
  );
}

(async function main() {
  await testCanvasClearRemovesExtendedBoardStateKeys();
  console.log('cache-runtime-clear-selected-canvas.test: all assertions passed');
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
