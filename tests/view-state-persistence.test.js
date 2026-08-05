const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const VIEW_STATE_STORAGE_KEYS = ['canvasScale', 'panOffsetX', 'panOffsetY', 'canvasViewStateVersion'];

function createCanvasContextStub() {
  return {
    clearRect() {},
    save() {},
    restore() {},
    scale() {},
    setTransform() {},
    drawImage() {},
    getImageData() {
      return { data: { byteLength: 0 } };
    },
    putImageData() {},
    beginPath() {},
    moveTo() {},
    lineTo() {},
    stroke() {},
    fill() {},
    fillRect() {},
    rect() {},
    arc() {},
    setLineDash() {},
    closePath() {}
  };
}

function createCanvasElementStub() {
  return {
    id: '',
    width: 0,
    height: 0,
    style: {},
    classList: { add() {}, remove() {} },
    getContext() {
      return createCanvasContextStub();
    },
    getBoundingClientRect() {
      return { left: 0, top: 0, width: 1280, height: 720 };
    }
  };
}

function loadDrawingEngine({ localStorage, warnings = [] } = {}) {
  const source = fs.readFileSync(
    path.join(__dirname, '..', 'js', 'drawing.js'),
    'utf8'
  ) + '\n;globalThis.__viewStatePersistenceExports = { DrawingEngine: window.AboardDrawingEngine || window.DrawingEngine };';

  const scheduledTimeouts = new Map();
  let nextTimeoutId = 1;
  const body = {
    appendChild() {},
    contains() {
      return false;
    }
  };
  const document = {
    body,
    createElement(tagName) {
      if (tagName === 'canvas') {
        return createCanvasElementStub();
      }
      return {
        style: {},
        classList: { add() {}, remove() {} },
        appendChild() {},
        remove() {},
        querySelector() { return null; },
        querySelectorAll() { return []; },
        setAttribute() {}
      };
    },
    createElementNS() {
      return {
        style: {},
        appendChild() {},
        setAttribute() {},
        querySelector() { return null; },
        remove() {}
      };
    },
    getElementById() {
      return null;
    }
  };

  const sandbox = {
    console: {
      warn(...args) {
        warnings.push(args.map(String).join(' '));
      },
      log() {},
      error() {}
    },
    window: {
      innerWidth: 1280,
      innerHeight: 720,
      devicePixelRatio: 1,
      screen: {
        availWidth: 1280,
        availHeight: 720
      }
    },
    document,
    localStorage,
    setTimeout(callback) {
      const id = nextTimeoutId++;
      scheduledTimeouts.set(id, callback);
      return id;
    },
    clearTimeout(id) {
      scheduledTimeouts.delete(id);
    },
    requestAnimationFrame() {
      return 1;
    },
    cancelAnimationFrame() {},
    Math,
    Number,
    String,
    Boolean,
    Array,
    Object,
    Set,
    Map,
    WeakMap,
    Date,
    parseInt,
    parseFloat
  };

  sandbox.globalThis = sandbox;
  sandbox.window.document = document;
  vm.createContext(sandbox);
  vm.runInContext(source, sandbox, { filename: 'drawing.js' });

  return {
    DrawingEngine: sandbox.__viewStatePersistenceExports.DrawingEngine,
    scheduledTimeouts
  };
}

function loadZoomRuntime() {
  const source = fs.readFileSync(
    path.join(__dirname, '..', 'js', 'modules', 'zoom-runtime.js'),
    'utf8'
  ) + '\n;globalThis.__viewStatePersistenceZoomExports = window.AboardZoomRuntime;';

  let wheelHandler = null;
  const sandbox = {
    window: {},
    document: {
      addEventListener(type, handler) {
        if (type === 'wheel') {
          wheelHandler = handler;
        }
      }
    },
    localStorage: {
      setItem() {
        throw new Error('zoom runtime should not write view state directly when drawingEngine persistence exists');
      }
    },
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
  vm.runInContext(source, sandbox, { filename: 'zoom-runtime.js' });

  return {
    zoomRuntime: sandbox.__viewStatePersistenceZoomExports,
    getWheelHandler() {
      return wheelHandler;
    }
  };
}

function loadViewControlsRuntime() {
  const source = fs.readFileSync(
    path.join(__dirname, '..', 'js', 'modules', 'view-controls-runtime.js'),
    'utf8'
  ) + '\n;globalThis.__viewStatePersistenceViewControlsExports = window.AboardViewControlsRuntime;';

  const sandbox = {
    window: {},
    document: {
      getElementById() {
        return null;
      }
    },
    localStorage: {
      setItem() {
        throw new Error('view controls runtime should not write view state directly when drawingEngine persistence exists');
      }
    },
    requestAnimationFrame(callback) {
      callback();
      return 1;
    },
    setTimeout(callback) {
      callback();
      return 1;
    },
    Object,
    String,
    Number,
    Boolean,
    Array,
    Set,
    Map,
    Math,
    parseInt,
    isNaN
  };

  sandbox.globalThis = sandbox;
  vm.createContext(sandbox);
  vm.runInContext(source, sandbox, { filename: 'view-controls-runtime.js' });
  return sandbox.__viewStatePersistenceViewControlsExports;
}

function loadInteractionRuntime() {
  const source = fs.readFileSync(
    path.join(__dirname, '..', 'js', 'modules', 'interaction-runtime.js'),
    'utf8'
  ) + '\n;globalThis.__viewStatePersistenceInteractionExports = window.AboardInteractionRuntime;';

  const sandbox = {
    window: {
      innerWidth: 1280,
      innerHeight: 720
    },
    document: {
      getElementById() {
        return {
          classList: { add() {}, remove() {} }
        };
      }
    },
    localStorage: {
      setItem() {
        throw new Error('interaction runtime should not write view state directly when drawingEngine persistence exists');
      }
    },
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
  return sandbox.__viewStatePersistenceInteractionExports;
}

function loadCanvasViewRuntime(options = {}) {
  const testLocalStorage = options.localStorage || {
    getItem() {
      throw new Error('canvas view runtime should not read localStorage directly when blocked');
    },
    setItem() {
      throw new Error('canvas view runtime should not write view state directly when drawingEngine persistence exists');
    }
  };

  const source = fs.readFileSync(
    path.join(__dirname, '..', 'js', 'modules', 'canvas-view-runtime.js'),
    'utf8'
  ) + '\n;globalThis.__viewStatePersistenceCanvasViewExports = window.AboardCanvasViewRuntime;';

  const sandbox = {
    window: {
      innerWidth: 1280,
      innerHeight: 720
    },
    localStorage: testLocalStorage,
    document: {
      createElement() {
        return createCanvasElementStub();
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

  sandbox.globalThis = sandbox;
  vm.createContext(sandbox);
  vm.runInContext(source, sandbox, { filename: 'canvas-view-runtime.js' });
  return sandbox.__viewStatePersistenceCanvasViewExports;
}

function createStorageRecorder({ throwOnSet = false } = {}) {
  const calls = [];
  return {
    calls,
    getItem() {
      return null;
    },
    setItem(key, value) {
      calls.push([key, value]);
      if (throwOnSet) {
        throw new Error('storage blocked');
      }
    },
    removeItem() {}
  };
}

function createEngine(localStorage, warnings = []) {
  const { DrawingEngine, scheduledTimeouts } = loadDrawingEngine({ localStorage, warnings });
  const canvas = createCanvasElementStub();
  const ctx = createCanvasContextStub();
  const engine = new DrawingEngine(canvas, ctx);
  return { engine, scheduledTimeouts };
}

function flushScheduledTimeouts(queue) {
  const pending = Array.from(queue.entries());
  queue.clear();
  pending.forEach(([, callback]) => callback());
}

function testPanDebouncesViewStatePersistence() {
  const storage = createStorageRecorder();
  const { engine, scheduledTimeouts } = createEngine(storage);

  engine.startPanning({ clientX: 0, clientY: 0 });
  engine.pan({ clientX: 20, clientY: 30 });
  engine.pan({ clientX: 40, clientY: 60 });
  engine.pan({ clientX: 80, clientY: 90 });

  assert.equal(storage.calls.length, 0, 'continuous panning should not persist view state on every move event');
  assert.equal(scheduledTimeouts.size, 1, 'continuous panning should collapse persistence into a single pending write');

  flushScheduledTimeouts(scheduledTimeouts);

  assert.deepEqual(
    storage.calls.map(([key]) => key),
    VIEW_STATE_STORAGE_KEYS,
    'debounced persistence should write the view state only once after panning settles'
  );
}

function testStopPanningFlushesPendingViewStatePersistence() {
  const storage = createStorageRecorder();
  const { engine, scheduledTimeouts } = createEngine(storage);

  engine.startPanning({ clientX: 0, clientY: 0 });
  engine.pan({ clientX: 25, clientY: 15 });

  assert.equal(storage.calls.length, 0, 'panning should still be buffered before stopPanning flushes it');
  assert.equal(scheduledTimeouts.size, 1, 'a pending persistence write should exist before panning stops');

  engine.stopPanning();

  assert.deepEqual(
    storage.calls.map(([key]) => key),
    VIEW_STATE_STORAGE_KEYS,
    'stopPanning should flush the latest buffered view state immediately'
  );
  assert.equal(scheduledTimeouts.size, 0, 'stopPanning should cancel the buffered timeout after flushing');
}

function testViewStatePersistenceSurvivesBlockedLocalStorage() {
  const warnings = [];
  const storage = createStorageRecorder({ throwOnSet: true });
  const { engine, scheduledTimeouts } = createEngine(storage, warnings);

  assert.doesNotThrow(() => {
    engine.persistViewState({ immediate: true });
  }, 'view state persistence should degrade instead of throwing when localStorage writes fail');

  engine.startPanning({ clientX: 0, clientY: 0 });
  assert.doesNotThrow(() => {
    engine.pan({ clientX: 10, clientY: 10 });
    flushScheduledTimeouts(scheduledTimeouts);
  }, 'debounced view state persistence should also degrade instead of throwing when storage is blocked');

  assert.ok(
    warnings.some((entry) => entry.includes('view state') && entry.includes('localStorage')),
    'storage failures during view state persistence should emit warnings'
  );
}

function testDrawingEngineStartupSurvivesBlockedLocalStorage() {
  const warnings = [];
  const storage = {
    getItem() {
      throw new Error('storage blocked');
    },
    setItem() {
      throw new Error('storage blocked');
    },
    removeItem() {}
  };
  const { engine } = createEngine(storage, warnings);

  assert.equal(engine.penType, 'normal', 'drawing engine should fall back to the default pen type');
  assert.equal(engine.eraserShape, 'circle', 'drawing engine should fall back to the default eraser shape');
  assert.equal(engine.penLineStyle, 'solid', 'drawing engine should fall back to the default line style');
  assert.equal(engine.canvasScale, 1, 'drawing engine should fall back to the default canvas scale');
  assert.deepEqual(
    { ...engine.panOffset },
    { x: 0, y: 0 },
    'drawing engine should fall back to centered pan offsets'
  );
  assert.ok(
    warnings.some((entry) => entry.includes('drawing') && entry.includes('localStorage')),
    'blocked drawing engine storage should emit warnings'
  );
}

function testDrawingEngineRejectsInvalidSavedViewState() {
  for (const invalidScale of ['Infinity', '-1']) {
    const storage = {
      getItem(key) {
        if (key === 'canvasScale') return invalidScale;
        if (key === 'panOffsetX') return 'Infinity';
        if (key === 'panOffsetY') return '-Infinity';
        return null;
      },
      setItem() {}
    };
    const { engine } = createEngine(storage);

    assert.equal(engine.canvasScale, 1, 'drawing engine should reject non-finite and non-positive saved scales');
    assert.deepEqual(
      { ...engine.panOffset },
      { x: 0, y: 0 },
      'drawing engine should reject non-finite saved pan offsets'
    );
  }
}

function testWheelZoomUsesDrawingEnginePersistenceHook() {
  const { zoomRuntime, getWheelHandler } = loadZoomRuntime();
  let persistCalls = 0;
  const board = {
    canvas: {
      getBoundingClientRect() {
        return { left: 0, top: 0, width: 1200, height: 800 };
      }
    },
    drawingEngine: {
      canvasScale: 1,
      panOffset: { x: 0, y: 0 },
      persistViewState() {
        persistCalls += 1;
      }
    },
    MAX_CANVAS_SCALE: 4,
    MIN_CANVAS_SCALE: 0.5,
    updateZoomUI() {},
    applyZoom() {}
  };

  zoomRuntime.setupCanvasZoom(board);
  const wheelHandler = getWheelHandler();
  assert.equal(typeof wheelHandler, 'function', 'zoom runtime should register a wheel handler');

  assert.doesNotThrow(() => {
    wheelHandler({
      ctrlKey: true,
      metaKey: false,
      deltaY: -1,
      clientX: 600,
      clientY: 400,
      preventDefault() {}
    });
  }, 'wheel zoom should delegate view state persistence to the drawing engine hook');

  assert.equal(persistCalls, 1, 'wheel zoom should persist through the drawing engine hook exactly once per zoom action');
}

function testViewControlsUseDrawingEnginePersistenceHook() {
  const viewControlsRuntime = loadViewControlsRuntime();
  let persistCalls = 0;
  const board = {
    canvas: {
      getBoundingClientRect() {
        return { left: 0, top: 0, width: 1200, height: 800 };
      }
    },
    drawingEngine: {
      canvasScale: 1,
      panOffset: { x: 0, y: 0 },
      persistViewState() {
        persistCalls += 1;
      }
    },
    MAX_CANVAS_SCALE: 4,
    updateZoomUI() {},
    applyZoom() {},
    transformLayer: null
  };

  assert.doesNotThrow(() => {
    viewControlsRuntime.zoomToPoint(board, 600, 400, 2, false);
    viewControlsRuntime.zoomIn(board);
    viewControlsRuntime.zoomOut(board);
    viewControlsRuntime.setZoom(board, '150');
  }, 'view controls should delegate persistence through the drawing engine hook');

  assert.equal(persistCalls, 4, 'view controls should persist exactly once per zoom action via the drawing engine hook');
}

function testInteractionRuntimeUsesDrawingEnginePersistenceHook() {
  const interactionRuntime = loadInteractionRuntime();
  let persistCalls = 0;
  const board = {
    settingsManager: { touchZoomEnabled: true },
    drawingEngine: {
      canvasScale: 1.5,
      panOffset: { x: 10, y: 20 },
      persistViewState() {
        persistCalls += 1;
      },
      isDrawing: false,
      isPanning: false
    },
    scheduleRenderQualityUpdate() {},
    isPinching: true,
    hasTwoFingers: true,
    lastPinchDistance: 120,
    lastPinchCenter: { x: 100, y: 100 },
    activePointers: new Map(),
    applyZoom() {},
    updateZoomUI() {}
  };

  assert.doesNotThrow(() => {
    interactionRuntime.handlePinchEnd(board);
    interactionRuntime.handlePointerPinchEnd(board);
  }, 'interaction runtime should delegate persistence through the drawing engine hook');

  assert.equal(persistCalls, 2, 'pinch interactions should persist exactly once when each gesture ends');
}

function testCanvasViewRuntimeUsesDrawingEnginePersistenceHook() {
  const canvasViewRuntime = loadCanvasViewRuntime();
  let persistCalls = 0;
  const board = {
    MAX_CANVAS_SCALE: 4,
    calculateCanvasFitScale() {
      return 1;
    },
    centerCanvas(options = {}) {
      return canvasViewRuntime.centerCanvas(this, options);
    },
    applyPanTransform() {},
    syncInteractiveOverlays() {},
    drawingEngine: {
      canvasScale: 1,
      panOffset: { x: 50, y: -30 },
      persistViewState() {
        persistCalls += 1;
      }
    }
  };

  assert.doesNotThrow(() => {
    canvasViewRuntime.initializeCanvasView(board);
    canvasViewRuntime.centerCanvas(board);
  }, 'canvas view runtime should not crash when storage is unavailable');

  assert.equal(
    persistCalls >= 1,
    true,
    'canvas view runtime should use the drawing engine persistence hook when it changes the view state'
  );
}

function createCanvasViewBoard(canvasViewRuntime, { persistCallsRef }) {
  const canvas = createCanvasElementStub();
  const bgCanvas = createCanvasElementStub();

  return {
    canvas,
    bgCanvas,
    ctx: createCanvasContextStub(),
    bgCtx: createCanvasContextStub(),
    historyManager: { historyStep: -1 },
    backgroundManager: { drawBackground() {} },
    settingsManager: {
      canvasWidth: 1920,
      canvasHeight: 1080
    },
    dynamicRenderScale: 1,
    MAX_CANVAS_SCALE: 4,
    getRenderPixelRatio() {
      return 1;
    },
    calculateCanvasFitScale() {
      return 0.5;
    },
    centerCanvas(options = {}) {
      return canvasViewRuntime.centerCanvas(this, options);
    },
    recalculateAndRecenterCanvas(options = {}) {
      return canvasViewRuntime.recalculateAndRecenterCanvas(this, options);
    },
    applyPanTransform() {},
    syncInteractiveOverlays() {},
    drawingEngine: {
      canvasScale: 1,
      panOffset: { x: 25, y: -15 },
      persistViewState() {
        persistCallsRef.count += 1;
      }
    }
  };
}

function testStartupResizeDoesNotCreateSyntheticSavedScale() {
  const canvasViewRuntime = loadCanvasViewRuntime();
  const persistCallsRef = { count: 0 };
  const board = createCanvasViewBoard(canvasViewRuntime, { persistCallsRef });

  canvasViewRuntime.resizeCanvas(board, { persistViewState: false });

  assert.equal(
    persistCallsRef.count,
    0,
    'startup resize should not persist canvasScale=1 before initializeCanvasView checks saved state'
  );
  assert.equal(board.drawingEngine.canvasScale, 1, 'startup resize should not change the user zoom scale');
  assert.deepEqual(
    board.drawingEngine.panOffset,
    { x: 25, y: -15 },
    'startup resize should not wipe a previously restored pan offset before initialization decides whether to keep it'
  );

  canvasViewRuntime.initializeCanvasView(board);

  assert.equal(
    board.drawingEngine.canvasScale,
    1.4,
    'initializeCanvasView should still apply the default coverage scale when no saved scale exists'
  );
  assert.equal(
    persistCallsRef.count,
    1,
    'initializeCanvasView should persist only the final initialized view state'
  );
}

function testInitializeCanvasViewMigratesSyntheticSavedScale() {
  const storage = {
    getItem(key) {
      if (key === 'canvasScale') return '1';
      if (key === 'panOffsetX' || key === 'panOffsetY') return '0';
      return null;
    },
    setItem() {}
  };
  const canvasViewRuntime = loadCanvasViewRuntime({ localStorage: storage });
  const persistCallsRef = { count: 0 };
  const board = createCanvasViewBoard(canvasViewRuntime, { persistCallsRef });

  canvasViewRuntime.initializeCanvasView(board);

  assert.equal(
    board.drawingEngine.canvasScale,
    1.4,
    'initializeCanvasView should treat centered canvasScale=1 as the startup persistence regression and restore default coverage'
  );
}

function testInitializeCanvasViewPreservesExplicitSavedScale() {
  const storage = {
    getItem(key) {
      if (key === 'canvasScale') return '2';
      if (key === 'panOffsetX' || key === 'panOffsetY') return '0';
      return null;
    },
    setItem() {}
  };
  const canvasViewRuntime = loadCanvasViewRuntime({ localStorage: storage });
  const persistCallsRef = { count: 0 };
  const board = createCanvasViewBoard(canvasViewRuntime, { persistCallsRef });

  board.drawingEngine.canvasScale = 2;
  canvasViewRuntime.initializeCanvasView(board);

  assert.equal(
    board.drawingEngine.canvasScale,
    2,
    'initializeCanvasView should preserve explicit non-default saved zoom values'
  );
  assert.equal(
    persistCallsRef.count,
    1,
    'initializeCanvasView should version legacy explicit saved views once so later startups keep them intact'
  );
}

function testInitializeCanvasViewPreservesVersionedCenteredScaleOne() {
  const storage = {
    getItem(key) {
      if (key === 'canvasScale') return '1';
      if (key === 'canvasViewStateVersion') return '1';
      if (key === 'panOffsetX' || key === 'panOffsetY') return '0';
      return null;
    },
    setItem() {}
  };
  const canvasViewRuntime = loadCanvasViewRuntime({ localStorage: storage });
  const persistCallsRef = { count: 0 };
  const board = createCanvasViewBoard(canvasViewRuntime, { persistCallsRef });

  board.drawingEngine.canvasScale = 1;
  canvasViewRuntime.initializeCanvasView(board);

  assert.equal(
    board.drawingEngine.canvasScale,
    1,
    'initializeCanvasView should preserve user-saved centered 100% zoom once the view state is versioned'
  );
}

function testInitializeCanvasViewPreservesSavedPanOffset() {
  const storage = {
    getItem(key) {
      if (key === 'canvasScale') return '2';
      if (key === 'canvasViewStateVersion') return '1';
      if (key === 'panOffsetX') return '25';
      if (key === 'panOffsetY') return '-15';
      return null;
    },
    setItem() {}
  };
  const canvasViewRuntime = loadCanvasViewRuntime({ localStorage: storage });
  const persistCallsRef = { count: 0 };
  const board = createCanvasViewBoard(canvasViewRuntime, { persistCallsRef });

  board.drawingEngine.canvasScale = 2;
  board.drawingEngine.panOffset = { x: 25, y: -15 };
  canvasViewRuntime.initializeCanvasView(board);

  assert.deepEqual(
    board.drawingEngine.panOffset,
    { x: 25, y: -15 },
    'initializeCanvasView should preserve a previously saved pan offset instead of recentring on startup'
  );
  assert.equal(
    persistCallsRef.count,
    0,
    'initializeCanvasView should not rewrite already versioned saved views when it only reapplies them'
  );
}

(function main() {
  testPanDebouncesViewStatePersistence();
  testStopPanningFlushesPendingViewStatePersistence();
  testViewStatePersistenceSurvivesBlockedLocalStorage();
  testDrawingEngineStartupSurvivesBlockedLocalStorage();
  testDrawingEngineRejectsInvalidSavedViewState();
  testWheelZoomUsesDrawingEnginePersistenceHook();
  testViewControlsUseDrawingEnginePersistenceHook();
  testInteractionRuntimeUsesDrawingEnginePersistenceHook();
  testCanvasViewRuntimeUsesDrawingEnginePersistenceHook();
  testStartupResizeDoesNotCreateSyntheticSavedScale();
  testInitializeCanvasViewMigratesSyntheticSavedScale();
  testInitializeCanvasViewPreservesExplicitSavedScale();
  testInitializeCanvasViewPreservesVersionedCenteredScaleOne();
  testInitializeCanvasViewPreservesSavedPanOffset();
  console.log('view-state-persistence.test: all assertions passed');
})();
