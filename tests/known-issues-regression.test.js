const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

function loadHistoryManagerClass() {
  const context = {
    window: {},
    console,
    Uint8ClampedArray,
    ImageData: global.ImageData,
    Math,
    Number,
    String,
    Boolean,
    Array,
    Object
  };
  context.globalThis = context;
  vm.createContext(context);
  vm.runInContext(
    fs.readFileSync(path.join(__dirname, '..', 'js', 'history.js'), 'utf8'),
    context,
    { filename: 'history.js' }
  );
  return context.window.AboardHistoryManager;
}

function loadRenderQualityRuntime({ timers } = {}) {
  const context = {
    window: {
      innerWidth: 1280,
      innerHeight: 720,
      devicePixelRatio: 1,
      setTimeout: timers?.setTimeout || setTimeout,
      clearTimeout: timers?.clearTimeout || clearTimeout
    },
    document: {},
    console,
    setTimeout: timers?.setTimeout || setTimeout,
    clearTimeout: timers?.clearTimeout || clearTimeout,
    Math,
    Number,
    String,
    Boolean,
    Array,
    Object
  };
  context.globalThis = context;
  vm.createContext(context);
  vm.runInContext(
    fs.readFileSync(path.join(__dirname, '..', 'js', 'modules', 'render-quality-runtime.js'), 'utf8'),
    context,
    { filename: 'render-quality-runtime.js' }
  );
  return context.window.AboardRenderQualityRuntime;
}

function loadSessionPersistenceRuntime({ localStorageRecorder } = {}) {
  const context = {
    window: {},
    localStorage: localStorageRecorder || {
      setItem() {},
      getItem() { return null; },
      removeItem() {}
    },
    console,
    Date: { now: () => 123456 },
    JSON,
    Math,
    Number,
    String,
    Boolean,
    Array,
    Object,
    Promise,
    StorageManager: {
      imageDataToBlob(page) {
        return page;
      }
    }
  };
  context.globalThis = context;
  vm.createContext(context);
  vm.runInContext(
    fs.readFileSync(path.join(__dirname, '..', 'js', 'modules', 'session-persistence-runtime.js'), 'utf8'),
    context,
    { filename: 'session-persistence-runtime.js' }
  );
  return context.window.AboardSessionPersistenceRuntime;
}

function loadSelectionManagerClass() {
  const context = {
    window: {},
    document: {},
    console,
    Math,
    Number,
    String,
    Boolean,
    Array,
    Object,
    Set,
    Map
  };
  context.globalThis = context;
  vm.createContext(context);
  vm.runInContext(
    `${fs.readFileSync(path.join(__dirname, '..', 'js', 'selection.js'), 'utf8')}\nwindow.__SelectionManager = SelectionManager;`,
    context,
    { filename: 'selection.js' }
  );
  context.window.__SelectionManager.__sandboxWindow = context.window;
  return context.window.__SelectionManager;
}

function loadImageControlsClass() {
  const context = {
    window: {
      i18n: { applyTranslations() {} },
      dispatchEvent() {}
    },
    document: {
      body: { insertAdjacentHTML() {} },
      getElementById() { return null; },
      addEventListener() {}
    },
    console,
    CustomEvent: class CustomEvent {
      constructor(type) {
        this.type = type;
      }
    },
    Math,
    Number,
    String,
    Boolean,
    Array,
    Object,
    Set,
    Map
  };
  context.globalThis = context;
  vm.createContext(context);
  vm.runInContext(
    `${fs.readFileSync(path.join(__dirname, '..', 'js', 'image-controls.js'), 'utf8')}\nwindow.__ImageControls = window.AboardImageControls || window.ImageControls;`,
    context,
    { filename: 'image-controls.js' }
  );
  return context.window.__ImageControls;
}

function createPwaDocumentStub() {
  return {
    readyState: 'loading',
    visibilityState: 'visible',
    activeElement: null,
    body: { appendChild() {} },
    documentElement: { lang: 'en-US' },
    addEventListener() {},
    getElementById() { return null; },
    querySelector() { return null; },
    createElement() {
      return {
        id: '',
        type: '',
        className: '',
        tabIndex: -1,
        textContent: '',
        style: {},
        dataset: {},
        classList: {
          add() {},
          remove() {},
          toggle() {},
          contains() { return false; }
        },
        appendChild() {},
        setAttribute() {},
        addEventListener() {},
        focus() {}
      };
    }
  };
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

function loadPwaManagerHarness() {
  const timeouts = new Map();
  const intervals = new Map();
  let nextTimerId = 1;
  const fakeSetTimeout = (callback, delay) => {
    const id = nextTimerId++;
    timeouts.set(id, { callback, delay });
    return id;
  };
  const fakeClearTimeout = (id) => {
    timeouts.delete(id);
  };
  const fakeSetInterval = (callback, delay) => {
    const id = nextTimerId++;
    intervals.set(id, { callback, delay });
    return id;
  };
  const fakeClearInterval = (id) => {
    intervals.delete(id);
  };

  const document = createPwaDocumentStub();
  const localStorage = createLocalStorageStub();
  const navigator = {
    language: 'en-US',
    onLine: true,
    serviceWorker: {
      controller: {},
      ready: Promise.resolve(null),
      addEventListener() {},
      async getRegistration() { return null; },
      async register() {
        return {
          scope: './',
          waiting: null,
          installing: null,
          active: null,
          addEventListener() {},
          async update() {}
        };
      }
    }
  };
  const window = {
    document,
    navigator,
    localStorage,
    addEventListener() {},
    removeEventListener() {},
    setTimeout: fakeSetTimeout,
    clearTimeout: fakeClearTimeout,
    setInterval: fakeSetInterval,
    clearInterval: fakeClearInterval,
    requestAnimationFrame(callback) {
      return fakeSetTimeout(callback, 0);
    },
    location: { reload() {} }
  };
  const context = {
    window,
    document,
    navigator,
    localStorage,
    console: { log() {}, warn() {}, error() {} },
    fetch: async () => ({ ok: false }),
    setTimeout: fakeSetTimeout,
    clearTimeout: fakeClearTimeout,
    setInterval: fakeSetInterval,
    clearInterval: fakeClearInterval,
    Promise,
    WeakSet,
    Object,
    String
  };

  vm.createContext(context);
  vm.runInContext(
    fs.readFileSync(path.join(__dirname, '..', 'js', 'modules', 'pwa-manager.js'), 'utf8'),
    context,
    { filename: 'pwa-manager.js' }
  );

  return {
    PWAManager: context.window.PWAManager,
    window,
    timers: { timeouts, intervals }
  };
}

function makeImageData(width, height) {
  return {
    width,
    height,
    data: new Uint8ClampedArray(width * height * 4)
  };
}

function testHistoryRestoresMismatchedImageDataWithoutDirectPut() {
  const HistoryManager = loadHistoryManagerClass();
  let directPutWithMismatchedSize = false;
  const canvas = { width: 4, height: 4 };
  const ctx = {
    putImageData(imageData) {
      if (imageData.width !== canvas.width || imageData.height !== canvas.height) {
        directPutWithMismatchedSize = true;
      }
    },
    drawImage() {},
    save() {},
    restore() {},
    setTransform() {},
    clearRect() {}
  };
  const history = new HistoryManager(canvas, ctx);
  history.history = [{ imageData: makeImageData(2, 2), sceneState: { strokes: [] }, hasSceneState: true }];
  history.historyStep = 0;

  history.restoreState();

  assert.equal(directPutWithMismatchedSize, false, 'mismatched history bitmap must be scaled or skipped before restore');
}

function testOversizeHistoryEntriesPreserveUndoWithSceneStateOnly() {
  const HistoryManager = loadHistoryManagerClass();
  const canvas = { width: 1, height: 1 };
  let captureCount = 0;
  const ctx = {
    getImageData() {
      return { width: 8192, height: 4096, data: { byteLength: 8192 * 4096 * 4 } };
    },
    putImageData() {}
  };
  const history = new HistoryManager(canvas, ctx);
  history.setSceneStateHandlers({
    capture() {
      captureCount += 1;
      return { strokes: [{ id: captureCount }] };
    },
    restore() {}
  });

  history.saveState();
  history.saveState();

  assert.equal(history.history.length, 2, 'oversize bitmap entries with scene state should not collapse undo history to one entry');
  assert.equal(history.canUndo(), true, 'undo should remain available after two oversize scene-backed states');
  assert.equal(history.history.every((entry) => entry.hasSceneState && !entry.imageData), true, 'oversize entries should drop full bitmap data');
}

function testRenderQualityCancelsStaleTimerAndDefersDuringDrawing() {
  const timers = [];
  let cleared = 0;
  const runtime = loadRenderQualityRuntime({
    timers: {
      setTimeout(callback) {
        timers.push(callback);
        return timers.length;
      },
      clearTimeout() {
        cleared += 1;
      }
    }
  });
  const board = {
    settingsManager: { unlimitedZoom: true, canvasWidth: 100, canvasHeight: 100 },
    dynamicRenderScale: 1,
    qualityUpdateTimer: null,
    drawingEngine: {
      canvasScale: 4,
      isDrawing: false,
      isPanning: false,
      renderScene() {}
    },
    shapeDrawingManager: { isDrawing: false },
    isPinching: false,
    hasTwoFingers: false,
    canvas: { width: 100, height: 100, style: { width: '100px', height: '100px' } },
    bgCanvas: { width: 100, height: 100, style: {} },
    ctx: { setTransform() {}, scale() {}, clearRect() {} },
    bgCtx: { setTransform() {}, scale() {}, clearRect() {} },
    backgroundManager: { drawBackground() {} },
    getTargetRenderScale() {
      return runtime.getTargetRenderScale(board);
    },
    applyRenderQualityScale(scale) {
      return runtime.applyRenderQualityScale(board, scale);
    },
    getRenderPixelRatio() {
      return runtime.getRenderPixelRatio(board);
    },
    scheduleRenderQualityUpdate() {
      return runtime.scheduleRenderQualityUpdate(board);
    }
  };

  runtime.scheduleRenderQualityUpdate(board);
  board.drawingEngine.canvasScale = 1;
  runtime.scheduleRenderQualityUpdate(board);

  assert.equal(cleared, 1, 'returning inside the schedule threshold should cancel a stale pending timer');

  board.dynamicRenderScale = 1;
  board.drawingEngine.isDrawing = true;
  runtime.applyRenderQualityScale(board, 2);

  assert.equal(board.dynamicRenderScale, 1, 'render quality changes should be deferred during an active stroke');
  assert.equal(board.canvas.width, 100, 'deferring render quality must not reset the drawing canvas');
}

function testSyncSnapshotOmitsLargeLocalStorageFields() {
  const writes = [];
  const runtime = loadSessionPersistenceRuntime({
    localStorageRecorder: {
      setItem(key, value) {
        writes.push([key, value]);
      },
      getItem() { return null; },
      removeItem() {}
    }
  });
  const bigDataUrl = `data:image/png;base64,${'a'.repeat(3 * 1024 * 1024)}`;
  const board = {
    currentPage: 1,
    pages: [null],
    canvas: {
      width: 100,
      height: 100,
      toDataURL() {
        throw new Error('sync snapshots should not encode full-page PNG data');
      }
    },
    ctx: {
      getImageData() {
        return makeImageData(1, 1);
      }
    },
    savePageBackground() {},
    saveCurrentPageScene() {},
    getPageScene() {
      return {
        stampedImages: [{ imageSrc: bigDataUrl, x: 1, y: 2, width: 10, height: 10 }],
        strokes: []
      };
    },
    drawingEngine: {
      currentTool: 'pen',
      penSize: 4,
      currentColor: '#111',
      penType: 'solid',
      eraserSize: 12,
      eraserShape: 'circle',
      canvasScale: 1,
      panOffset: { x: 0, y: 0 }
    },
    pageBackgrounds: {},
    backgroundManager: {
      backgroundColor: '#fff',
      backgroundPattern: 'blank',
      bgOpacity: 1,
      patternIntensity: 0.5,
      patternDensity: 1,
      coordinateOriginX: 0,
      coordinateOriginY: 0,
      getCoordinateOverlayState() { return { points: [] }; },
      imageSize: 1,
      backgroundImageData: bigDataUrl,
      backgroundOutsideLayerOrder: 1
    },
    uploadedImages: [{ id: 'library-image', data: bigDataUrl, name: 'large.png' }]
  };

  const snapshot = runtime.saveSessionSnapshotSync(board);

  assert.ok(snapshot, 'snapshot should still be produced');
  assert.equal(snapshot.pageDataUrl, undefined, 'sync snapshot should omit full-page PNG data URL');
  assert.equal(snapshot.settings.uploadedImages, undefined, 'sync snapshot should omit the uploaded image library');
  assert.equal(snapshot.settings.backgroundImageData, null, 'oversize background image data should be reduced to metadata/null');
  assert.equal(snapshot.currentPageScene.stampedImages[0].imageSrc, null, 'stamped image data URLs should be omitted from sync snapshot');
  assert.ok(writes[0][1].length < 2 * 1024 * 1024, 'sync snapshot JSON should stay under the localStorage safety budget');
}

function testPastingSelectionSwitchesToSelectTool() {
  const SelectionManager = loadSelectionManagerClass();
  let selectedTool = null;
  let controlsShown = false;
  const selection = {
    COPY_OFFSET: 20,
    clipboard: {
      strokes: [{ points: [{ x: 1, y: 2 }], size: 2, color: '#111' }],
      images: [],
      texts: []
    },
    drawingEngine: {
      strokes: [],
      stampedImages: [],
      getNextLayerOrder() { return 1; },
      getNextObjectId() { return 'object-1'; }
    },
    textManager: { textObjects: [] },
    selectedCoordinatePointIds: [],
    selectedCoordinateGroupId: null,
    selectStroke(index) {
      this.selectionType = 'stroke';
      this.selectedIndex = index;
      controlsShown = true;
    },
    saveHistory() {},
    redrawWithSelection() {},
    showControls() {
      controlsShown = true;
    },
    groupSelection() {},
    createTextCopy(textObj) {
      return { ...textObj };
    },
    applyPasteOffset(object, offsetX, offsetY) {
      return { ...object, x: (object.x || 0) + offsetX, y: (object.y || 0) + offsetY };
    }
  };
  const sandboxWindow = SelectionManager.__sandboxWindow;
  const previousDrawingBoard = sandboxWindow.drawingBoard;
  sandboxWindow.drawingBoard = {
    currentTool: 'pen',
    setTool(tool) {
      selectedTool = tool;
      this.currentTool = tool;
    }
  };

  const pasted = SelectionManager.prototype.pasteClipboard.call(selection);

  sandboxWindow.drawingBoard = previousDrawingBoard;
  assert.equal(pasted, true, 'paste should succeed');
  assert.equal(controlsShown, true, 'paste should keep the pasted object selected');
  assert.equal(selectedTool, 'select', 'paste should switch the board to the select tool when it shows selection controls');
}

function testTextSelectionFlipIsNoOpAndCssHidesInvalidHandles() {
  const SelectionManager = loadSelectionManagerClass();
  let updated = false;
  let redrawn = false;
  const selection = {
    selectionType: 'text',
    selectedIndex: 0,
    hasSelection() { return true; },
    textManager: { textObjects: [{ text: 'A', x: 10, y: 10, fontSize: 20 }] },
    drawingEngine: { strokes: [], stampedImages: [] },
    updateControlBox() { updated = true; },
    redrawCanvas() { redrawn = true; },
    hasUnsavedChanges: false
  };

  SelectionManager.prototype.flipHorizontal.call(selection);

  assert.equal(selection.hasUnsavedChanges, false, 'text flip should not mark a no-op selection as dirty');
  assert.equal(updated, false, 'text flip should return before refreshing controls');
  assert.equal(redrawn, false, 'text flip should not redraw when nothing changed');

  const css = fs.readFileSync(path.join(__dirname, '..', 'css', 'modules', 'selection-controls.css'), 'utf8');
  assert.match(css, /\.text-selection-only\s+#selection-flip-h-handle/s,
    'text selections should hide the unsupported horizontal flip handle');
  assert.doesNotMatch(css, /\.text-selection-only\s+\.selection-transform-handle/s,
    'text selections should keep supported transform handles such as rotate 90 degrees');
  assert.match(css, /\.text-selection-only\s+\.resize-handle\.top\b/s, 'text selections should hide top edge resize handle');
  assert.match(css, /\.text-selection-only\s+\.resize-handle\.bottom\b/s, 'text selections should hide bottom edge resize handle');
}

function testSceneOnlyHistoryRestoreRedrawsCanvas() {
  const mainSource = fs.readFileSync(path.join(__dirname, '..', 'js', 'main.js'), 'utf8');
  assert.match(
    mainSource,
    /setSceneStateHandlers\?\.\(\{[\s\S]*restore:\s*\(sceneState\)\s*=>\s*\{[\s\S]*selectionManager\?\.redrawCanvas\?\.\(\)/,
    'scene-only history restore should redraw restored vector content when the bitmap is omitted'
  );
}

function testTapSelectionBoxDoesNotDirtyHistory() {
  const SelectionManager = loadSelectionManagerClass();
  const selection = {
    selectionType: 'text',
    selectedIndex: 0,
    isDragging: false,
    isResizing: false,
    isRotating: false,
    activePointerId: null,
    hasUnsavedChanges: false,
    controlBox: { style: {} },
    textManager: { textObjects: [{ x: 10, y: 20 }] },
    isCompoundSelection() { return false; },
    isCoordinateSelection() { return false; },
    getClientPos(event) { return { x: event.clientX, y: event.clientY }; },
    updateControlBox() {},
    redrawCanvas() {}
  };

  SelectionManager.prototype.startDrag.call(selection, {
    clientX: 100,
    clientY: 100,
    preventDefault() {}
  });
  SelectionManager.prototype.stopDrag.call(selection);

  assert.equal(selection.hasUnsavedChanges, false, 'tapping a selection box without movement should not create a dirty selection');
}

function testDraggingPastThresholdStillMovesSelection() {
  const SelectionManager = loadSelectionManagerClass();
  const selection = {
    selectionType: 'text',
    selectedIndex: 0,
    isDragging: false,
    isResizing: false,
    isRotating: false,
    activePointerId: null,
    hasUnsavedChanges: false,
    controlBox: { style: {} },
    dragStartPos: { x: 0, y: 0 },
    canvas: {
      offsetWidth: 200,
      offsetHeight: 100,
      getBoundingClientRect() {
        return { width: 200, height: 100 };
      }
    },
    textManager: { textObjects: [{ x: 10, y: 20 }] },
    isCompoundSelection() { return false; },
    isCoordinateSelection() { return false; },
    getClientPos(event) { return { x: event.clientX, y: event.clientY }; },
    updateControlBox() {},
    redrawCanvas() {}
  };

  SelectionManager.prototype.startDrag.call(selection, {
    clientX: 100,
    clientY: 100,
    preventDefault() {}
  });
  SelectionManager.prototype.drag.call(selection, { clientX: 110, clientY: 105 });
  SelectionManager.prototype.stopDrag.call(selection);

  assert.equal(selection.textManager.textObjects[0].x, 20, 'dragging past the threshold should still move selected text');
  assert.equal(selection.textManager.textObjects[0].y, 25, 'dragging past the threshold should still move selected text vertically');
  assert.equal(selection.hasUnsavedChanges, true, 'real drags should still mark selection changes dirty');
}

function testTappingResizeAndRotateHandlesDoesNotDirtyHistory() {
  const SelectionManager = loadSelectionManagerClass();
  const resizeSelection = {
    isResizing: true,
    hasResizeChanged: false,
    hasUnsavedChanges: false,
    selectionType: 'text',
    selectedIndex: 0,
    resizeHandle: 'bottom-right',
    resizeStartBounds: { x: 10, y: 20, width: 100, height: 40 },
    isCompoundSelection() { return false; }
  };

  SelectionManager.prototype.stopResize.call(resizeSelection);
  assert.equal(resizeSelection.hasUnsavedChanges, false,
    'tapping a resize handle without movement should not create a dirty selection');

  const rotateSelection = {
    isRotating: true,
    hasRotateChanged: false,
    hasUnsavedChanges: false,
    selectionType: 'text',
    selectedIndex: 0,
    isCompoundSelection() { return false; }
  };

  SelectionManager.prototype.stopRotate.call(rotateSelection);
  assert.equal(rotateSelection.hasUnsavedChanges, false,
    'tapping a rotate handle without movement should not create a dirty selection');
}

function testResizeAndRotateThresholdsPreserveRealGestures() {
  const SelectionManager = loadSelectionManagerClass();
  const image = { x: 0, y: 0, width: 100, height: 100, rotation: 0 };
  const resizeSelection = Object.assign(Object.create(SelectionManager.prototype), {
    isResizing: true,
    hasResizeChanged: false,
    hasUnsavedChanges: false,
    selectionType: 'image',
    selectedIndex: 0,
    resizeHandle: 'bottom-right',
    resizeStartPos: { x: 0, y: 0 },
    resizeStartBounds: { x: 0, y: 0, width: 100, height: 100 },
    DRAG_MOVE_THRESHOLD: 3,
    MIN_SIZE: 10,
    drawingEngine: { stampedImages: [image] },
    isCompoundSelection() { return false; },
    getClientPos(event) { return { x: event.clientX, y: event.clientY }; },
    getCanvasScales() { return { scaleX: 1, scaleY: 1 }; },
    updateControlBox() {},
    redrawCanvas() {}
  });

  resizeSelection.resize({ clientX: 1, clientY: 1 });
  assert.deepEqual(
    { width: image.width, height: image.height },
    { width: 100, height: 100 },
    'resize movement below the gesture threshold should not mutate the selection'
  );
  resizeSelection.resize({ clientX: 10, clientY: 10 });
  resizeSelection.stopResize();
  assert.deepEqual(
    { width: image.width, height: image.height },
    { width: 110, height: 110 },
    'resize movement past the gesture threshold should still resize the selection'
  );
  assert.equal(resizeSelection.hasUnsavedChanges, true,
    'a real resize gesture should mark the selection dirty');

  const textObject = { rotation: 0 };
  const rotateSelection = Object.assign(Object.create(SelectionManager.prototype), {
    isRotating: true,
    hasRotateChanged: false,
    hasUnsavedChanges: false,
    selectionType: 'text',
    selectedIndex: 0,
    rotateStartPos: { x: 100, y: 0 },
    rotateStartAngle: 0,
    rotateStartRotation: 0,
    DRAG_MOVE_THRESHOLD: 3,
    textManager: { textObjects: [textObject] },
    isCompoundSelection() { return false; },
    getControlBoxScreenCenter() { return { x: 0, y: 0 }; },
    getClientPos(event) { return { x: event.clientX, y: event.clientY }; },
    updateControlBox() {},
    redrawCanvas() {}
  });

  rotateSelection.rotate({ clientX: 101, clientY: 0 });
  assert.equal(textObject.rotation, 0,
    'rotate movement below the gesture threshold should not mutate the selection');
  rotateSelection.rotate({ clientX: 0, clientY: 100 });
  rotateSelection.stopRotate();
  assert.equal(textObject.rotation, 90,
    'rotate movement past the gesture threshold should still rotate the selection');
  assert.equal(rotateSelection.hasUnsavedChanges, true,
    'a real rotate gesture should mark the selection dirty');
}

function rotatePoint(point, center, angleDeg) {
  const angleRad = angleDeg * Math.PI / 180;
  const cos = Math.cos(angleRad);
  const sin = Math.sin(angleRad);
  const relX = point.x - center.x;
  const relY = point.y - center.y;
  return {
    x: center.x + relX * cos - relY * sin,
    y: center.y + relX * sin + relY * cos
  };
}

function testRotatedStrokeBoundsUseOriginalRotationCenterAndPadding() {
  const SelectionManager = loadSelectionManagerClass();
  const originalPoints = [
    { x: 0, y: 0 },
    { x: 100, y: 0 },
    { x: 0, y: 50 }
  ];
  const center = { x: 50, y: 25 };
  const stroke = {
    points: originalPoints.map((point) => rotatePoint(point, center, 45)),
    rotation: 45,
    rotationCenter: center,
    size: 2
  };
  const selection = Object.create(SelectionManager.prototype);
  selection.drawingEngine = {
    getStrokeBounds(targetStroke) {
      const xs = targetStroke.points.map((point) => point.x);
      const ys = targetStroke.points.map((point) => point.y);
      const padding = targetStroke.size * 2;
      const minX = Math.min(...xs);
      const maxX = Math.max(...xs);
      const minY = Math.min(...ys);
      const maxY = Math.max(...ys);
      return {
        x: minX - padding,
        y: minY - padding,
        width: maxX - minX + padding * 2,
        height: maxY - minY + padding * 2
      };
    }
  };

  const bounds = selection.getStrokeSelectionBounds(stroke);

  assert.ok(Math.abs((bounds.x + bounds.width / 2) - center.x) < 0.0001, 'rotated stroke selection bounds should preserve the original rotation center');
  assert.ok(Math.abs((bounds.y + bounds.height / 2) - center.y) < 0.0001, 'rotated stroke selection bounds should preserve the original rotation center');
  assert.equal(bounds.width, 108, 'stroke selection bounds should retain getStrokeBounds padding after unrotation');
  assert.equal(bounds.height, 58, 'stroke selection bounds should retain getStrokeBounds padding after unrotation');
}

function testRotatedSelectionResizeUsesLocalPointerDelta() {
  const SelectionManager = loadSelectionManagerClass();
  const image = { x: 0, y: 0, width: 100, height: 100, rotation: 180 };
  const selection = Object.assign(Object.create(SelectionManager.prototype), {
    selectionType: 'image',
    selectedIndex: 0,
    isResizing: true,
    resizeStartBounds: { x: 0, y: 0, width: 100, height: 100 },
    resizeStartPos: { x: 0, y: 0 },
    resizeHandle: 'top-left',
    MIN_SIZE: 10,
    drawingEngine: { stampedImages: [image] },
    isCompoundSelection() { return false; },
    getClientPos(event) { return { x: event.clientX, y: event.clientY }; },
    getCanvasScales() { return { scaleX: 1, scaleY: 1 }; },
    updateControlBox() {},
    redrawCanvas() {}
  });

  SelectionManager.prototype.resize.call(selection, { clientX: 10, clientY: 10 });

  assert.ok(image.width > 100, 'dragging the visual bottom-right handle outward on a 180-degree image should increase width');
  assert.ok(image.height > 100, 'dragging the visual bottom-right handle outward on a 180-degree image should increase height');
}

function testRotatedBackgroundImageResizeUsesLocalPointerDelta() {
  const ImageControls = loadImageControlsClass();
  const controls = {
    isResizing: true,
    resizeHandle: 'top-left',
    resizeStartPos: { x: 0, y: 0 },
    resizeStartSize: { width: 100, height: 100 },
    dragStartImagePos: { x: 0, y: 0 },
    imageSize: { width: 100, height: 100 },
    imagePosition: { x: 0, y: 0 },
    imageRotation: 180,
    MIN_IMAGE_SIZE: 10,
    backgroundManager: {
      bgCanvas: {
        getBoundingClientRect() {
          return { width: 100, height: 100 };
        }
      }
    },
    getLogicalCanvasSize() {
      return { width: 100, height: 100 };
    },
    getClientPos(event) {
      return { x: event.clientX, y: event.clientY };
    },
    updateControlBox() {}
  };

  ImageControls.prototype.resize.call(controls, { clientX: 10, clientY: 10 });

  assert.ok(controls.imageSize.width > 100, 'rotated background image resize should account for local X direction');
  assert.ok(controls.imageSize.height > 100, 'rotated background image resize should account for local Y direction');
}

async function testImmediatePwaUpdateWaitsForInstallingWorkerToBecomeWaiting() {
  const { PWAManager, timers } = loadPwaManagerHarness();
  const manager = new PWAManager();
  const postedMessages = [];
  const workerListeners = new Map();
  const installingWorker = {
    state: 'installing',
    postMessage(message) {
      postedMessages.push(message);
    },
    addEventListener(type, listener) {
      const listeners = workerListeners.get(type) || [];
      listeners.push(listener);
      workerListeners.set(type, listeners);
    },
    removeEventListener(type, listener) {
      const listeners = workerListeners.get(type) || [];
      workerListeners.set(type, listeners.filter((entry) => entry !== listener));
    }
  };
  const registration = {
    waiting: null,
    installing: installingWorker,
    active: {},
    addEventListener() {},
    async update() {}
  };
  manager.getServiceWorkerRegistration = async () => registration;

  const pendingApply = manager.applyUpdateNow({ timeoutMs: 50, reason: 'manual' });
  await Promise.resolve();

  installingWorker.state = 'installed';
  for (const listener of workerListeners.get('statechange') || []) {
    listener();
  }

  const result = await Promise.race([
    pendingApply.then((value) => ({ status: 'resolved', value })),
    new Promise((resolve) => setTimeout(() => resolve({ status: 'pending' }), 0))
  ]);

  assert.deepEqual(result, { status: 'resolved', value: true }, 'immediate updates should wait for an installing worker to become waiting');
  assert.equal(postedMessages.length, 1, 'installed worker should be activated after it finishes installing');
  assert.equal(postedMessages[0].type, 'SKIP_WAITING', 'installed worker should receive the SKIP_WAITING message');
  assert.equal(
    [...timers.timeouts.values()].some((entry) => entry.delay === 50),
    false,
    'the wait timeout should not be left behind after worker activation'
  );
  assert.equal(timers.intervals.size, 0, 'waiting for an installing worker should not leave polling intervals behind');
}

async function testPreparedPwaUpdateTimeoutShowsUserFeedback() {
  const { PWAManager, window } = loadPwaManagerHarness();
  const manager = new PWAManager();
  const toasts = [];
  let suppressBeforeUnload = null;
  window.drawingBoard = {
    setSuppressBeforeUnloadPrompt(value) {
      suppressBeforeUnload = value;
    },
    settingsManager: {
      toastManager: {
        show(message, type) {
          toasts.push({ message, type });
        }
      }
    }
  };
  manager.applyUpdateNow = async () => false;
  manager.autoActivateUpdates = true;
  manager.autoActivateResetTimer = 123;

  const activated = await manager.applyPreparedUpdateNow({
    mode: 'immediate',
    requestedBy: 'manual'
  });

  assert.equal(activated, false, 'unavailable waiting workers should leave the update unapplied');
  assert.equal(suppressBeforeUnload, false, 'failed immediate updates should restore beforeunload prompts');
  assert.equal(manager.autoActivateUpdates, false, 'failed immediate updates should stop auto-activating a late installing worker');
  assert.equal(manager.autoActivateResetTimer, null, 'failed immediate updates should clear the auto-activate reset timer');
  assert.deepEqual(
    toasts,
    [{ message: 'Update is still downloading in the background. It will apply automatically when the whiteboard is idle.', type: 'warning' }],
    'failed immediate updates should explain that the update is still downloading instead of failing silently'
  );
}

async function main() {
  testHistoryRestoresMismatchedImageDataWithoutDirectPut();
  testOversizeHistoryEntriesPreserveUndoWithSceneStateOnly();
  testRenderQualityCancelsStaleTimerAndDefersDuringDrawing();
  testSyncSnapshotOmitsLargeLocalStorageFields();
  testPastingSelectionSwitchesToSelectTool();
  testTextSelectionFlipIsNoOpAndCssHidesInvalidHandles();
  testSceneOnlyHistoryRestoreRedrawsCanvas();
  testTapSelectionBoxDoesNotDirtyHistory();
  testDraggingPastThresholdStillMovesSelection();
  testTappingResizeAndRotateHandlesDoesNotDirtyHistory();
  testResizeAndRotateThresholdsPreserveRealGestures();
  testRotatedStrokeBoundsUseOriginalRotationCenterAndPadding();
  testRotatedSelectionResizeUsesLocalPointerDelta();
  testRotatedBackgroundImageResizeUsesLocalPointerDelta();
  await testImmediatePwaUpdateWaitsForInstallingWorkerToBecomeWaiting();
  await testPreparedPwaUpdateTimeoutShowsUserFeedback();
  console.log('known-issues-regression.test: all assertions passed');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
