const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

function createEventTarget() {
  const listeners = new Map();
  return {
    listeners,
    addEventListener(type, handler) {
      listeners.set(type, handler);
    }
  };
}

function createElementStub() {
  return {
    addEventListener() {},
    getBoundingClientRect() {
      return { left: 0, top: 0 };
    },
    style: {},
    classList: {
      add() {},
      remove() {}
    }
  };
}

function loadEventSetupRuntime() {
  const source = fs.readFileSync(
    path.join(__dirname, '..', 'js', 'modules', 'event-setup-runtime.js'),
    'utf8'
  );

  const documentTarget = createEventTarget();
  const windowTarget = createEventTarget();
  const canvasTarget = createEventTarget();
  const genericElement = createElementStub();

  const context = {
    window: {
      addEventListener: windowTarget.addEventListener.bind(windowTarget),
      setTimeout,
      clearTimeout
    },
    document: {
      addEventListener: documentTarget.addEventListener.bind(documentTarget),
      getElementById() {
        return genericElement;
      },
      querySelector() {
        return null;
      },
      querySelectorAll() {
        return [];
      },
      createElement() {
        return createElementStub();
      }
    },
    console,
    clearTimeout,
    setTimeout,
    parseInt
  };

  vm.createContext(context);
  new vm.Script(source, { filename: 'event-setup-runtime.js' }).runInContext(context);

  return {
    runtime: context.window.AboardEventSetupRuntime,
    canvasTarget,
    documentTarget
  };
}

function createBoard(canvasTarget) {
  let pinchEndCalls = 0;
  let touchPinchStartCalls = 0;
  let pointerPinchStartCalls = 0;
  let drawingCompleteCalls = 0;
  let drawCalls = 0;
  const drawBatchCalls = [];

  return {
    canvas: {
      addEventListener: canvasTarget.addEventListener.bind(canvasTarget),
      getBoundingClientRect() {
        return { left: 0, top: 0 };
      },
      style: {}
    },
    drawingEngine: {
      currentTool: 'pen',
      isDrawing: false,
      isPanning: false,
      stampedImages: [],
      objectGroups: [],
      clearStrokes() {},
      clearVectorScene() {},
      setVectorPreviewVisible() {},
      startDrawing() {
        this.isDrawing = true;
      },
      startPanning() {},
      stopPanning() {},
      pan() {},
      draw() {
        drawCalls += 1;
      },
      drawBatch(events) {
        drawBatchCalls.push(events);
      }
    },
    settingsManager: {
      updateToolbarTextVisibility() {}
    },
    historyManager: {
      undo() { return false; },
      redo() { return false; }
    },
    strokeControls: {
      isActive: false,
      hideControls() {}
    },
    selectionManager: {
      hasSelection() { return false; },
      isBoxSelecting: false,
      isLassoSelecting: false,
      startSelection() {},
      continueBoxSelection() {},
      continueLassoSelection() {},
      endBoxSelection() {},
      endLassoSelection() {}
    },
    shapeDrawingManager: {
      isDrawing: false,
      startDrawing() {},
      draw() {}
    },
    teachingToolsManager: {
      isInteracting: false
    },
    imageControls: {
      isActive: false
    },
    backgroundManager: {
      supportsMovableOrigin() { return false; }
    },
    insertTextManager: {
      clearTextObjects() {}
    },
    activePointers: new Map(),
    isPinching: false,
    hasTwoFingers: false,
    isPotentialTap: false,
    isPotentialGesture: false,
    maxTouchesInGesture: 0,
    handlePinchStart() {
      touchPinchStartCalls += 1;
      this.isPinching = true;
    },
    handlePinchMove() {},
    handlePinchEnd() {
      pinchEndCalls += 1;
      this.isPinching = false;
    },
    handlePointerPinchStart() {
      pointerPinchStartCalls += 1;
      this.isPinching = true;
      this.hasTwoFingers = true;
    },
    handlePointerPinchMove() {},
    handlePointerPinchEnd() {
      this.isPinching = false;
      this.hasTwoFingers = false;
    },
    handleDrawingComplete() {
      drawingCompleteCalls += 1;
      this.drawingEngine.isDrawing = false;
    },
    discardCurrentStroke() {
      this.drawingEngine.isDrawing = false;
    },
    stopDraggingCoordinateOrigin() {},
    scheduleRenderQualityUpdate() {},
    updateEraserCursor() {},
    showEraserCursor() {},
    hideEraserCursor() {},
    setupToolConfigListeners() {},
    setupKeyboardShortcuts() {},
    setupDraggablePanels() {},
    setupCanvasZoom() {},
    syncInteractiveOverlays() {},
    recalculateAndRecenterCanvas() {},
    applyZoom() {},
    positionConfigArea() {},
    repositionToolbarsOnResize() {},
    repositionModalsOnResize() {},
    positionCoordinatePointPanel() {},
    refreshAdaptiveEraserSize() {},
    get pinchEndCalls() {
      return pinchEndCalls;
    },
    get touchPinchStartCalls() {
      return touchPinchStartCalls;
    },
    get pointerPinchStartCalls() {
      return pointerPinchStartCalls;
    },
    get drawingCompleteCalls() {
      return drawingCompleteCalls;
    },
    get drawCalls() {
      return drawCalls;
    },
    get drawBatchCalls() {
      return drawBatchCalls;
    }
  };
}

function testTouchCancelEndsPinchGestureAndClearsFlags() {
  const { runtime, canvasTarget } = loadEventSetupRuntime();
  const board = createBoard(canvasTarget);
  board.isPinching = true;
  board.hasTwoFingers = true;
  board.isPotentialTap = true;
  board.isPotentialGesture = true;
  board.maxTouchesInGesture = 2;

  runtime.setupEventListeners(board);

  const touchCancelHandler = canvasTarget.listeners.get('touchcancel');
  assert.equal(typeof touchCancelHandler, 'function', 'touchcancel handler should be registered');

  touchCancelHandler({
    touches: [],
    changedTouches: []
  });

  assert.equal(board.pinchEndCalls, 1);
  assert.equal(board.isPinching, false);
  assert.equal(board.hasTwoFingers, false);
  assert.equal(board.isPotentialTap, false);
  assert.equal(board.isPotentialGesture, false);
  assert.equal(board.maxTouchesInGesture, 0);
}

function testPureTouchPinchUsesTouchPathOnly() {
  const { runtime, canvasTarget, documentTarget } = loadEventSetupRuntime();
  const board = createBoard(canvasTarget);

  runtime.setupEventListeners(board);

  const pointerDownHandler = documentTarget.listeners.get('pointerdown');
  const touchStartHandler = canvasTarget.listeners.get('touchstart');
  const target = {
    closest() {
      return null;
    }
  };

  pointerDownHandler({
    pointerType: 'touch',
    pointerId: 1,
    clientX: 10,
    clientY: 10,
    isPrimary: true,
    button: 0,
    shiftKey: false,
    target
  });
  pointerDownHandler({
    pointerType: 'touch',
    pointerId: 2,
    clientX: 30,
    clientY: 10,
    isPrimary: false,
    button: 0,
    shiftKey: false,
    target
  });

  touchStartHandler({
    touches: [
      { clientX: 10, clientY: 10 },
      { clientX: 30, clientY: 10 }
    ],
    preventDefault() {}
  });

  assert.equal(board.pointerPinchStartCalls, 0);
  assert.equal(board.touchPinchStartCalls, 1);
}

function testPenAndTouchPinchUsesPointerPath() {
  const { runtime, canvasTarget, documentTarget } = loadEventSetupRuntime();
  const board = createBoard(canvasTarget);

  runtime.setupEventListeners(board);

  const pointerDownHandler = documentTarget.listeners.get('pointerdown');
  const target = {
    closest() {
      return null;
    }
  };

  pointerDownHandler({
    pointerType: 'pen',
    pointerId: 1,
    clientX: 10,
    clientY: 10,
    isPrimary: true,
    button: 0,
    shiftKey: false,
    target
  });
  pointerDownHandler({
    pointerType: 'touch',
    pointerId: 2,
    clientX: 30,
    clientY: 10,
    isPrimary: false,
    button: 0,
    shiftKey: false,
    target
  });

  assert.equal(board.pointerPinchStartCalls, 1);
}

function testPrimaryPointerCancelCompletesActiveDrawing() {
  const { runtime, canvasTarget, documentTarget } = loadEventSetupRuntime();
  const board = createBoard(canvasTarget);

  runtime.setupEventListeners(board);

  const pointerDownHandler = documentTarget.listeners.get('pointerdown');
  const pointerCancelHandler = documentTarget.listeners.get('pointercancel');
  const target = {
    closest() {
      return null;
    }
  };

  pointerDownHandler({
    pointerType: 'pen',
    pointerId: 1,
    clientX: 10,
    clientY: 10,
    isPrimary: true,
    button: 0,
    shiftKey: false,
    target
  });

  assert.equal(board.drawingEngine.isDrawing, true);

  pointerCancelHandler({
    pointerType: 'pen',
    pointerId: 1,
    clientX: 20,
    clientY: 20,
    isPrimary: true,
    target
  });

  assert.equal(board.drawingCompleteCalls, 1);
  assert.equal(board.drawingEngine.isDrawing, false);
}

function testPointerMoveFallsBackWhenCoalescedEventsAreEmpty() {
  const { runtime, canvasTarget, documentTarget } = loadEventSetupRuntime();
  const board = createBoard(canvasTarget);

  runtime.setupEventListeners(board);

  const pointerDownHandler = documentTarget.listeners.get('pointerdown');
  const pointerMoveHandler = documentTarget.listeners.get('pointermove');
  const target = {
    closest() {
      return null;
    }
  };

  pointerDownHandler({
    pointerType: 'mouse',
    pointerId: 1,
    clientX: 10,
    clientY: 10,
    isPrimary: true,
    button: 0,
    shiftKey: false,
    target
  });

  pointerMoveHandler({
    pointerType: 'mouse',
    pointerId: 1,
    clientX: 30,
    clientY: 30,
    isPrimary: true,
    buttons: 1,
    target,
    getCoalescedEvents() {
      return [];
    }
  });

  assert.equal(board.drawCalls, 1, 'empty coalesced event lists should fall back to drawing the current pointer event');
  assert.equal(board.drawBatchCalls.length, 0, 'empty coalesced event lists should not be sent to drawBatch');
}

function run() {
  testTouchCancelEndsPinchGestureAndClearsFlags();
  testPureTouchPinchUsesTouchPathOnly();
  testPenAndTouchPinchUsesPointerPath();
  testPrimaryPointerCancelCompletesActiveDrawing();
  testPointerMoveFallsBackWhenCoalescedEventsAreEmpty();
  console.log('event-setup-touchcancel.test: all assertions passed');
}

run();
