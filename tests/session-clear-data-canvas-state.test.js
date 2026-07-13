const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

function createStorageStub(initialEntries = {}) {
  const store = new Map(
    Object.entries(initialEntries).map(([key, value]) => [key, String(value)])
  );

  return {
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
    ...storage,
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

function toPlainObject(value) {
  return JSON.parse(JSON.stringify(value));
}

function loadSessionRuntime(localStorage, sessionStorage, {
  StorageManager,
  warnings = []
} = {}) {
  const source = fs.readFileSync(
    path.join(__dirname, '..', 'js', 'modules', 'session-runtime.js'),
    'utf8'
  );

  const context = {
    window: {},
    document: {
      getElementById() {
        return null;
      }
    },
    localStorage,
    sessionStorage,
    StorageManager,
    console: {
      log() {},
      warn(...args) {
        warnings.push(args.map(String).join(' '));
      },
      error() {}
    },
    Promise,
    Object,
    String,
    Number,
    Boolean,
    Date,
    Math,
    JSON
  };

  context.globalThis = context;
  context.self = context;
  vm.createContext(context);
  vm.runInContext(source, context, { filename: 'session-runtime.js' });
  return context.window.AboardSessionRuntime;
}

async function testRestoreSessionRehydratesLegacyImageTransformWithoutPageBackgrounds() {
  const localStorage = createStorageStub();
  const sessionStorage = createStorageStub();
  const runtime = loadSessionRuntime(localStorage, sessionStorage);

  const legacyImageTransform = {
    x: 64,
    y: 96,
    width: 320,
    height: 180,
    rotation: 12,
    scale: 1,
    flipHorizontal: true,
    flipVertical: false
  };

  let loadPageCalls = 0;
  let updateUiCalls = 0;
  let updateZoomUiCalls = 0;
  let applyZoomCalls = 0;
  let updatePaginationUiCalls = 0;

  const board = {
    storageManager: {
      async loadSession() {
        return {
          pagesRaw: [{ restored: true }],
          settings: {
            currentPage: 1,
            backgroundPattern: 'image',
            backgroundImageData: 'data:image/png;base64,recovered',
            imageSize: 1.25,
            imageTransform: legacyImageTransform,
            backgroundOutsideLayerOrder: 4,
            coordinateOverlayState: createDefaultCoordinateOverlayState()
          }
        };
      }
    },
    drawingEngine: {
      currentTool: 'pen',
      penSize: 4,
      currentColor: '#000000',
      penType: 'pen',
      eraserSize: 12,
      eraserShape: 'circle',
      canvasScale: 1,
      panOffset: { x: 0, y: 0 }
    },
    selectionManager: {
      setTextManager() {}
    },
    backgroundManager: {
      backgroundColor: '#ffffff',
      backgroundPattern: 'blank',
      bgOpacity: 1,
      patternIntensity: 0.5,
      patternDensity: 1,
      coordinateOriginX: 0,
      coordinateOriginY: 0,
      coordinateOverlayState: createDefaultCoordinateOverlayState(),
      imageSize: 1,
      backgroundImageData: null,
      imageTransform: createDefaultImageTransform(),
      backgroundOutsideLayerOrder: 1,
      setCoordinateOverlayState(state) {
        this.coordinateOverlayState = JSON.parse(JSON.stringify(state));
      }
    },
    pageBackgrounds: {},
    pages: [],
    currentPage: 1,
    canvas: { width: 1280, height: 720 },
    ctx: {
      getImageData() {
        return { blank: true };
      }
    },
    async applySerializedPageScenes() {},
    loadPage(pageNumber) {
      loadPageCalls += 1;
      this.currentPage = pageNumber;
      this.backgroundManager.drawBackground?.();
    },
    updateUI() {
      updateUiCalls += 1;
    },
    updateZoomUI() {
      updateZoomUiCalls += 1;
    },
    applyZoom() {
      applyZoomCalls += 1;
    },
    updatePaginationUI() {
      updatePaginationUiCalls += 1;
    },
    syncSettingsUI() {},
    setTool() {}
  };

  const restored = await runtime.restoreSession(board);

  assert.equal(restored, true, 'legacy recovery payload should restore successfully');
  assert.equal(loadPageCalls, 1, 'restore should load the recovered current page exactly once');
  assert.equal(updateUiCalls, 1);
  assert.equal(updateZoomUiCalls, 1);
  assert.equal(applyZoomCalls, 1);
  assert.equal(updatePaginationUiCalls, 1);
  assert.equal(board.backgroundManager.backgroundImageData, 'data:image/png;base64,recovered');
  assert.deepEqual(
    toPlainObject(board.backgroundManager.imageTransform),
    legacyImageTransform,
    'legacy recovery should restore image transforms even when pageBackgrounds are unavailable'
  );
  assert.equal(board.backgroundManager.imageSize, 1.25);
  assert.equal(board.backgroundManager.backgroundOutsideLayerOrder, 4);
}

async function testRestoreSessionClearsPausedGifRuntimeState() {
  const localStorage = createStorageStub();
  const sessionStorage = createStorageStub();
  const runtime = loadSessionRuntime(localStorage, sessionStorage);

  const board = {
    storageManager: {
      async loadSession() {
        return {
          pagesRaw: [{ restored: true }],
          settings: {
            currentPage: 1,
            backgroundPattern: 'image',
            backgroundImageData: 'data:image/gif;base64,recovered',
            imageSize: 1,
            gifLoopCount: 2,
            imageTransform: createDefaultImageTransform(),
            coordinateOverlayState: createDefaultCoordinateOverlayState()
          }
        };
      }
    },
    drawingEngine: {
      currentTool: 'pen',
      penSize: 4,
      currentColor: '#000000',
      penType: 'pen',
      eraserSize: 12,
      eraserShape: 'circle',
      canvasScale: 1,
      panOffset: { x: 0, y: 0 }
    },
    selectionManager: {
      setTextManager() {}
    },
    backgroundManager: {
      backgroundColor: '#ffffff',
      backgroundPattern: 'image',
      bgOpacity: 1,
      patternIntensity: 0.5,
      patternDensity: 1,
      coordinateOriginX: 0,
      coordinateOriginY: 0,
      coordinateOverlayState: createDefaultCoordinateOverlayState(),
      imageSize: 1,
      backgroundImageData: 'data:image/gif;base64,old',
      imageTransform: createDefaultImageTransform(),
      gifLoopCount: 1,
      currentGifLoop: 1,
      isImagePaused: true,
      imageStaticData: 'data:image/png;base64,paused-frame',
      backgroundOutsideLayerOrder: 1,
      setCoordinateOverlayState(state) {
        this.coordinateOverlayState = JSON.parse(JSON.stringify(state));
      }
    },
    pageBackgrounds: {},
    pages: [],
    currentPage: 1,
    canvas: { width: 1280, height: 720 },
    ctx: {
      getImageData() {
        return { blank: true };
      }
    },
    async applySerializedPageScenes() {},
    loadPage(pageNumber) {
      this.currentPage = pageNumber;
      this.backgroundManager.drawBackground?.();
    },
    updateUI() {},
    updateZoomUI() {},
    applyZoom() {},
    updatePaginationUI() {},
    syncSettingsUI() {},
    setTool() {}
  };

  const restored = await runtime.restoreSession(board);

  assert.equal(restored, true);
  assert.equal(board.backgroundManager.backgroundImageData, 'data:image/gif;base64,recovered');
  assert.equal(
    board.backgroundManager.isImagePaused,
    false,
    'session recovery should clear a paused GIF state from the previous runtime'
  );
  assert.equal(
    board.backgroundManager.currentGifLoop,
    0,
    'session recovery should reset the previous GIF loop counter'
  );
  assert.equal(
    board.backgroundManager.imageStaticData,
    null,
    'session recovery should discard the previous frozen GIF frame cache'
  );
}

async function testRestoreSessionFallsBackWhenSyncSnapshotStorageIsBlocked() {
  const localStorage = createBlockedStorageStub({}, ['getItem']);
  const sessionStorage = createStorageStub();
  const runtime = loadSessionRuntime(localStorage, sessionStorage);

  const board = {
    storageManager: {
      async loadSession() {
        return {
          pagesRaw: [{ restored: true }],
          settings: {
            currentPage: 1,
            backgroundPattern: 'image',
            backgroundImageData: 'data:image/png;base64,recovered',
            imageSize: 1,
            imageTransform: {
              x: 32,
              y: 48,
              width: 240,
              height: 135,
              rotation: 10,
              scale: 1,
              flipHorizontal: false,
              flipVertical: true
            },
            coordinateOverlayState: createDefaultCoordinateOverlayState()
          }
        };
      }
    },
    drawingEngine: {
      currentTool: 'pen',
      penSize: 4,
      currentColor: '#000000',
      penType: 'pen',
      eraserSize: 12,
      eraserShape: 'circle',
      canvasScale: 1,
      panOffset: { x: 0, y: 0 }
    },
    selectionManager: {
      setTextManager() {}
    },
    backgroundManager: {
      backgroundColor: '#ffffff',
      backgroundPattern: 'blank',
      bgOpacity: 1,
      patternIntensity: 0.5,
      patternDensity: 1,
      coordinateOriginX: 0,
      coordinateOriginY: 0,
      coordinateOverlayState: createDefaultCoordinateOverlayState(),
      imageSize: 1,
      backgroundImageData: null,
      imageTransform: createDefaultImageTransform(),
      backgroundOutsideLayerOrder: 1,
      setCoordinateOverlayState(state) {
        this.coordinateOverlayState = JSON.parse(JSON.stringify(state));
      }
    },
    pageBackgrounds: {},
    pages: [],
    currentPage: 1,
    canvas: { width: 1280, height: 720 },
    ctx: {
      getImageData() {
        return { blank: true };
      }
    },
    async applySerializedPageScenes() {},
    loadPage(pageNumber) {
      this.currentPage = pageNumber;
    },
    updateUI() {},
    updateZoomUI() {},
    applyZoom() {},
    updatePaginationUI() {},
    syncSettingsUI() {},
    setTool() {}
  };

  const restored = await runtime.restoreSession(board);

  assert.equal(restored, true, 'restore should still succeed when sync snapshot storage is unavailable');
  assert.equal(board.backgroundManager.backgroundImageData, 'data:image/png;base64,recovered');
  assert.deepEqual(
    toPlainObject(board.backgroundManager.imageTransform),
    {
      x: 32,
      y: 48,
      width: 240,
      height: 135,
      rotation: 10,
      scale: 1,
      flipHorizontal: false,
      flipVertical: true
    }
  );
}

async function testRestoreSessionKeepsRecoveringWhenOnePageBlobFails() {
  const localStorage = createStorageStub();
  const sessionStorage = createStorageStub();
  const warnings = [];
  const runtime = loadSessionRuntime(localStorage, sessionStorage, {
    warnings,
    StorageManager: {
      async blobToImageData(blob) {
        if (blob === 'bad-page') {
          throw new Error('decode failed');
        }
        return { restored: blob };
      }
    }
  });

  let loadPageCalls = 0;
  const board = {
    storageManager: {
      async loadSession() {
        return {
          pages: ['good-page', 'bad-page'],
          settings: {
            currentPage: 2,
            coordinateOverlayState: createDefaultCoordinateOverlayState()
          }
        };
      }
    },
    drawingEngine: {
      currentTool: 'pen',
      penSize: 4,
      currentColor: '#000000',
      penType: 'pen',
      eraserSize: 12,
      eraserShape: 'circle',
      canvasScale: 1,
      panOffset: { x: 0, y: 0 }
    },
    selectionManager: {
      setTextManager() {}
    },
    backgroundManager: {
      backgroundColor: '#ffffff',
      backgroundPattern: 'blank',
      bgOpacity: 1,
      patternIntensity: 0.5,
      patternDensity: 1,
      coordinateOriginX: 0,
      coordinateOriginY: 0,
      coordinateOverlayState: createDefaultCoordinateOverlayState(),
      imageSize: 1,
      backgroundImageData: null,
      imageTransform: createDefaultImageTransform(),
      backgroundOutsideLayerOrder: 1,
      setCoordinateOverlayState(state) {
        this.coordinateOverlayState = JSON.parse(JSON.stringify(state));
      }
    },
    pageBackgrounds: {},
    pages: [],
    currentPage: 1,
    canvas: { width: 1280, height: 720 },
    ctx: {
      getImageData() {
        return { blank: false };
      },
      createImageData(width, height) {
        return { blank: true, width, height };
      }
    },
    async applySerializedPageScenes() {},
    loadPage(pageNumber) {
      loadPageCalls += 1;
      this.currentPage = pageNumber;
    },
    updateUI() {},
    updateZoomUI() {},
    applyZoom() {},
    updatePaginationUI() {},
    syncSettingsUI() {},
    setTool() {}
  };

  const restored = await runtime.restoreSession(board);

  assert.equal(restored, true, 'restore should still succeed when one blob page cannot be decoded');
  assert.deepEqual(toPlainObject(board.pages[0]), { restored: 'good-page' });
  assert.equal(
    board.pages[1],
    null,
    'failed blob pages should use the lazy blank-page sentinel instead of aborting the entire restore'
  );
  assert.equal(loadPageCalls, 1, 'restore should still finish applying the recovered session');
  assert.equal(board.currentPage, 2, 'restore should preserve the requested current page');
  assert.ok(
    warnings.some((warning) => warning.includes('Failed to restore page 2')),
    'restore should log which page blob failed to decode'
  );
}

async function testRestoreSessionSurvivesMissingSelectionManagerWhenTextManagerExists() {
  const localStorage = createStorageStub();
  const sessionStorage = createStorageStub();
  const runtime = loadSessionRuntime(localStorage, sessionStorage);

  const board = {
    storageManager: {
      async loadSession() {
        return {
          pagesRaw: [{ restored: true }],
          settings: {
            currentPage: 1,
            coordinateOverlayState: createDefaultCoordinateOverlayState()
          }
        };
      }
    },
    drawingEngine: {
      currentTool: 'pen',
      penSize: 4,
      currentColor: '#000000',
      penType: 'pen',
      eraserSize: 12,
      eraserShape: 'circle',
      canvasScale: 1,
      panOffset: { x: 0, y: 0 }
    },
    selectionManager: null,
    insertTextManager: {
      textObjects: [{ id: 'text-1' }]
    },
    backgroundManager: {
      backgroundColor: '#ffffff',
      backgroundPattern: 'blank',
      bgOpacity: 1,
      patternIntensity: 0.5,
      patternDensity: 1,
      coordinateOriginX: 0,
      coordinateOriginY: 0,
      coordinateOverlayState: createDefaultCoordinateOverlayState(),
      imageSize: 1,
      backgroundImageData: null,
      imageTransform: createDefaultImageTransform(),
      backgroundOutsideLayerOrder: 1,
      setCoordinateOverlayState(state) {
        this.coordinateOverlayState = JSON.parse(JSON.stringify(state));
      }
    },
    pageBackgrounds: {},
    pages: [],
    currentPage: 1,
    canvas: { width: 1280, height: 720 },
    ctx: {
      getImageData() {
        return { blank: true };
      }
    },
    async applySerializedPageScenes() {},
    loadPage(pageNumber) {
      this.currentPage = pageNumber;
    },
    updateUI() {},
    updateZoomUI() {},
    applyZoom() {},
    updatePaginationUI() {},
    syncSettingsUI() {},
    setTool() {}
  };

  const restored = await runtime.restoreSession(board);

  assert.equal(
    restored,
    true,
    'session restoration should degrade instead of failing when the optional selection manager is unavailable'
  );
  assert.equal(board.currentPage, 1);
}

async function testClearSessionDataDropsPersistedCanvasStateAndResetsRuntimeState() {
  const syncKey = 'aboardSyncSessionSnapshot';
  const localStorage = createStorageStub({
    backgroundImageData: 'data:image/png;base64,stale',
    imageTransform: '{"x":12,"y":24,"width":300,"height":180}',
    coordinateOverlayState: '{"points":[{"id":"pt-1","x":1,"y":2}]}',
    uploadedImages: '[{"id":"img-1"}]',
    pageBackgrounds: '{"1":{"backgroundPattern":"image"}}',
    pageScenes: '{"1":{"strokes":[1]}}',
    [syncKey]: '{"timestamp":1}',
    aboardPlannedUpdateReload: '{"reason":"update"}'
  });
  const sessionStorage = createStorageStub({
    backgroundImageData: 'data:image/png;base64,stale'
  });
  const runtime = loadSessionRuntime(localStorage, sessionStorage);

  let clearSessionCalls = 0;
  let clearEstimateCalls = 0;
  let clearAllPageScenesCalls = 0;
  let clearBackgroundImageCalls = 0;
  let updateUploadedImageButtonsCalls = 0;
  let updateBackgroundUiCalls = 0;
  let updatePaginationUiCalls = 0;
  let rotateSessionWriteEpochCalls = 0;

  const board = {
    syncSessionSnapshotKey: syncKey,
    storageManager: {
      async clearSession() {
        clearSessionCalls += 1;
        return true;
      },
      async hasSession() {
        return false;
      },
      clearSessionSizeEstimate() {
        clearEstimateCalls += 1;
      }
    },
    getCacheKeyGroups() {
      return {
        canvasKeys: new Set([
          'backgroundImageData',
          'imageTransform',
          'coordinateOverlayState',
          'uploadedImages',
          'pageBackgrounds',
          'pageScenes'
        ])
      };
    },
    rotateSessionWriteEpoch() {
      rotateSessionWriteEpochCalls += 1;
      return true;
    },
    pageBackgrounds: {
      1: { backgroundPattern: 'image' }
    },
    pageScenes: {
      1: { strokes: [1] }
    },
    uploadedImages: [{ id: 'img-1' }],
    currentPage: 3,
    pages: [{ existing: true }],
    canvas: { width: 1280, height: 720 },
    ctx: {
      clearRect() {},
      getImageData() {
        return { blank: true };
      }
    },
    clearAllPageScenes() {
      clearAllPageScenesCalls += 1;
      this.pageScenes = {};
    },
    updateUploadedImagesButtons() {
      updateUploadedImageButtonsCalls += 1;
    },
    updateBackgroundUI() {
      updateBackgroundUiCalls += 1;
    },
    updatePaginationUI() {
      updatePaginationUiCalls += 1;
    },
    imageControls: {
      resetConfirmation() {}
    },
    backgroundManager: {
      backgroundColor: '#112233',
      backgroundPattern: 'image',
      bgOpacity: 0.2,
      patternIntensity: 0.8,
      patternDensity: 1.4,
      backgroundImageData: 'data:image/png;base64,stale',
      backgroundImage: { stale: true },
      imageSize: 1.8,
      coordinateOriginX: 10,
      coordinateOriginY: 20,
      coordinateOverlayState: {
        ...createDefaultCoordinateOverlayState(),
        points: [{ id: 'pt-1', x: 1, y: 2, color: '#ff0000' }]
      },
      imageTransform: {
        x: 12,
        y: 24,
        width: 300,
        height: 180,
        rotation: 30,
        scale: 1,
        flipHorizontal: true,
        flipVertical: false
      },
      gifLoopCount: 5,
      backgroundOutsideLayerOrder: 9,
      getDefaultCoordinateOverlayState() {
        return createDefaultCoordinateOverlayState();
      },
      setCoordinateOverlayState(state) {
        this.coordinateOverlayState = JSON.parse(JSON.stringify(state));
      },
      clearBackgroundImage() {
        clearBackgroundImageCalls += 1;
        this.backgroundImage = null;
        this.backgroundImageData = null;
        this.imageTransform = createDefaultImageTransform();
        this.backgroundPattern = 'blank';
        this.backgroundOutsideLayerOrder = 1;
      },
      drawBackground() {},
      emitBackgroundUiState() {}
    },
    hasUnresolvedRecoveryData: true
  };

  const cleared = await runtime.clearSessionData(board);

  assert.equal(cleared, true);
  assert.equal(clearSessionCalls, 1);
  assert.equal(clearEstimateCalls, 1);
  assert.equal(clearAllPageScenesCalls, 1, 'discarding recovery data should clear page scene runtime state');
  assert.equal(clearBackgroundImageCalls, 1, 'discarding recovery data should clear the loaded background image');
  assert.equal(updateUploadedImageButtonsCalls, 1, 'discarding recovery data should refresh uploaded image UI');
  assert.equal(updateBackgroundUiCalls, 1, 'discarding recovery data should refresh background UI');
  assert.equal(updatePaginationUiCalls, 1, 'discarding recovery data should refresh pagination UI');
  assert.equal(rotateSessionWriteEpochCalls, 1, 'successful cleanup should invalidate stale writers in other tabs');

  assert.deepEqual(toPlainObject(board.pageBackgrounds), {});
  assert.deepEqual(toPlainObject(board.pageScenes), {});
  assert.deepEqual(toPlainObject(board.uploadedImages), []);
  assert.equal(board.currentPage, 1);
  assert.deepEqual(toPlainObject(board.pages), [null]);
  assert.equal(board.hasUnresolvedRecoveryData, false);

  assert.equal(board.backgroundManager.backgroundPattern, 'blank');
  assert.equal(board.backgroundManager.backgroundImageData, null);
  assert.deepEqual(toPlainObject(board.backgroundManager.imageTransform), createDefaultImageTransform());
  assert.equal(board.backgroundManager.coordinateOriginX, 0);
  assert.equal(board.backgroundManager.coordinateOriginY, 0);
  assert.deepEqual(
    toPlainObject(board.backgroundManager.coordinateOverlayState),
    createDefaultCoordinateOverlayState()
  );
  assert.equal(board.backgroundManager.gifLoopCount, 0);
  assert.equal(board.backgroundManager.backgroundOutsideLayerOrder, 1);

  assert.equal(localStorage.getItem('backgroundImageData'), null);
  assert.equal(localStorage.getItem('imageTransform'), null);
  assert.equal(localStorage.getItem('coordinateOverlayState'), null);
  assert.equal(localStorage.getItem('uploadedImages'), null);
  assert.equal(localStorage.getItem('pageBackgrounds'), null);
  assert.equal(localStorage.getItem('pageScenes'), null);
  assert.equal(localStorage.getItem(syncKey), null);
  assert.equal(localStorage.getItem('aboardPlannedUpdateReload'), null);
  assert.equal(sessionStorage.getItem('backgroundImageData'), null);
}

async function testClearSessionDataStillClearsSessionStorageWhenLocalStorageRemoveIsBlocked() {
  const syncKey = 'aboardSyncSessionSnapshot';
  const localStorage = createBlockedStorageStub({
    backgroundImageData: 'data:image/png;base64,stale',
    imageTransform: '{"x":12,"y":24,"width":300,"height":180}',
    [syncKey]: '{"timestamp":1}'
  }, ['removeItem']);
  const sessionStorage = createStorageStub({
    backgroundImageData: 'data:image/png;base64,stale',
    imageTransform: '{"x":12,"y":24,"width":300,"height":180}',
    [syncKey]: '{"timestamp":1}',
    aboardPlannedUpdateReload: '{"reason":"update"}'
  });
  const runtime = loadSessionRuntime(localStorage, sessionStorage);

  const board = {
    syncSessionSnapshotKey: syncKey,
    storageManager: {
      async clearSession() {
        return true;
      },
      async hasSession() {
        return false;
      },
      clearSessionSizeEstimate() {}
    },
    getCacheKeyGroups() {
      return {
        canvasKeys: new Set([
          'backgroundImageData',
          'imageTransform'
        ])
      };
    },
    pageBackgrounds: {
      1: { backgroundPattern: 'image' }
    },
    pageScenes: {
      1: { strokes: [1] }
    },
    uploadedImages: [{ id: 'img-1' }],
    currentPage: 2,
    pages: [{ existing: true }],
    canvas: { width: 1280, height: 720 },
    ctx: {
      clearRect() {},
      getImageData() {
        return { blank: true };
      }
    },
    updateUploadedImagesButtons() {},
    updateBackgroundUI() {},
    updatePaginationUI() {},
    imageControls: {
      resetConfirmation() {}
    },
    backgroundManager: {
      backgroundColor: '#112233',
      backgroundPattern: 'image',
      bgOpacity: 0.2,
      patternIntensity: 0.8,
      patternDensity: 1.4,
      backgroundImageData: 'data:image/png;base64,stale',
      imageSize: 1.8,
      coordinateOriginX: 10,
      coordinateOriginY: 20,
      coordinateOverlayState: createDefaultCoordinateOverlayState(),
      imageTransform: {
        x: 12,
        y: 24,
        width: 300,
        height: 180,
        rotation: 30,
        scale: 1,
        flipHorizontal: true,
        flipVertical: false
      },
      gifLoopCount: 5,
      backgroundOutsideLayerOrder: 9,
      getDefaultCoordinateOverlayState() {
        return createDefaultCoordinateOverlayState();
      },
      setCoordinateOverlayState(state) {
        this.coordinateOverlayState = JSON.parse(JSON.stringify(state));
      },
      clearBackgroundImage() {
        this.backgroundImageData = null;
        this.imageTransform = createDefaultImageTransform();
        this.backgroundPattern = 'blank';
        this.backgroundOutsideLayerOrder = 1;
      },
      drawBackground() {},
      emitBackgroundUiState() {}
    },
    hasUnresolvedRecoveryData: true
  };

  const cleared = await runtime.clearSessionData(board);

  assert.equal(cleared, false, 'cleanup should report failure while the synchronous recovery snapshot remains');
  assert.equal(
    sessionStorage.getItem('backgroundImageData'),
    null,
    'session fallback cleanup should still clear sessionStorage keys when localStorage removal is blocked'
  );
  assert.equal(sessionStorage.getItem('imageTransform'), null);
  assert.equal(sessionStorage.getItem(syncKey), null);
  assert.equal(sessionStorage.getItem('aboardPlannedUpdateReload'), null);
  assert.notEqual(localStorage.getItem('backgroundImageData'), null);
  assert.equal(board.hasUnresolvedRecoveryData, true, 'failed cleanup should keep recovery state unresolved');
  assert.equal(board.currentPage, 2, 'failed cleanup should not discard the in-memory board');
}

(async function main() {
  await testRestoreSessionRehydratesLegacyImageTransformWithoutPageBackgrounds();
  await testRestoreSessionClearsPausedGifRuntimeState();
  await testClearSessionDataDropsPersistedCanvasStateAndResetsRuntimeState();
  await testRestoreSessionFallsBackWhenSyncSnapshotStorageIsBlocked();
  await testRestoreSessionKeepsRecoveringWhenOnePageBlobFails();
  await testRestoreSessionSurvivesMissingSelectionManagerWhenTextManagerExists();
  await testClearSessionDataStillClearsSessionStorageWhenLocalStorageRemoveIsBlocked();
  console.log('session-clear-data-canvas-state.test: all assertions passed');
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
