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

function createBlockedStorageStub(initialEntries = {}, blockedMethods = []) {
  const storage = createStorageStub(initialEntries);
  const blocked = new Set(blockedMethods);

  return {
    get length() {
      return storage.length;
    },
    key(index) {
      return storage.key(index);
    },
    getItem(key) {
      if (blocked.has('getItem')) {
        throw new Error(`Blocked getItem for ${key}`);
      }
      return storage.getItem(key);
    },
    setItem(key, value) {
      if (blocked.has('setItem')) {
        throw new Error(`Blocked setItem for ${key}`);
      }
      return storage.setItem(key, value);
    },
    removeItem(key) {
      if (blocked.has('removeItem')) {
        throw new Error(`Blocked removeItem for ${key}`);
      }
      return storage.removeItem(key);
    },
    clear() {
      if (blocked.has('clear')) {
        throw new Error('Blocked clear');
      }
      return storage.clear();
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

async function testCanvasClearSurvivesBlockedLocalStorageRemoval() {
  const localStorage = createBlockedStorageStub({
    pageBackgrounds: '{"1":{"backgroundPattern":"image"}}',
    backgroundImageData: 'data:image/png;base64,abc',
    uploadedImages: '[{"id":"img-1","data":"data:image/png;base64,abc"}]'
  }, ['removeItem']);
  const sessionStorage = createStorageStub({
    backgroundImageData: 'data:image/png;base64,abc',
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

  await assert.doesNotReject(async () => {
    await runtime.clearSelectedCache(board, {
      canvas: true,
      settings: false,
      other: false
    });
  }, 'canvas cache clear should not reject when localStorage removals are blocked');

  assert.equal(clearSessionDataCalls, 1);
  assert.equal(
    sessionStorage.getItem('backgroundImageData'),
    null,
    'canvas cache clear should still clear matching sessionStorage entries when localStorage removal fails'
  );
  assert.equal(sessionStorage.getItem('uploadedImages'), null);
}

async function testClearAllLocalDataSurvivesBlockedLocalStorageClear() {
  const localStorage = createBlockedStorageStub({
    pageBackgrounds: '{"1":{"backgroundPattern":"image"}}'
  }, ['clear']);
  const sessionStorage = createStorageStub({
    backgroundImageData: 'data:image/png;base64,abc'
  });
  const runtime = loadCacheRuntime(localStorage, sessionStorage);

  let clearSessionDataCalls = 0;
  let closeDbCalls = 0;
  const board = {
    isClearingLocalData: false,
    saveTimeout: null,
    storageManager: {
      dbName: null,
      closeDB() {
        closeDbCalls += 1;
      }
    },
    async clearSessionData() {
      clearSessionDataCalls += 1;
    },
    setCacheStorageSizeSnapshot() {}
  };

  await assert.doesNotReject(async () => {
    await runtime.clearAllLocalData(board);
  }, 'clear-all flow should not reject when localStorage.clear is blocked');

  assert.equal(clearSessionDataCalls, 1);
  assert.equal(closeDbCalls, 1);
  assert.equal(sessionStorage.getItem('backgroundImageData'), null);
  assert.equal(board.isClearingLocalData, false);
}

(async function main() {
  await testCanvasClearRemovesExtendedBoardStateKeys();
  await testCanvasClearSurvivesBlockedLocalStorageRemoval();
  await testClearAllLocalDataSurvivesBlockedLocalStorageClear();
  console.log('cache-runtime-clear-selected-canvas.test: all assertions passed');
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
