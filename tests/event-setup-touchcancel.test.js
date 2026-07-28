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
  let startDrawingCalls = 0;
  let drawCalls = 0;
  let undoCalls = 0;
  let redoCalls = 0;
  let doubleTapCalls = 0;
  const capturedPointers = [];
  const drawBatchCalls = [];

  return {
    canvas: {
      addEventListener: canvasTarget.addEventListener.bind(canvasTarget),
      setPointerCapture(pointerId) {
        capturedPointers.push(pointerId);
      },
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
        startDrawingCalls += 1;
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
      touchZoomEnabled: true,
      updateToolbarTextVisibility() {}
    },
    historyManager: {
      undo() { undoCalls += 1; return true; },
      redo() { redoCalls += 1; return true; },
      lastRestoreHadSceneState: true
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
      if (!this.settingsManager.touchZoomEnabled) return;
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
    handleDoubleTap() {
      doubleTapCalls += 1;
    },
    stopDraggingCoordinateOrigin() {},
    scheduleRenderQualityUpdate() {},
    updateEraserCursor() {},
    showEraserCursor() {},
    hideEraserCursor() {},
    updateUI() {},
    saveSessionDebounced() {},
    setupToolConfigListeners() {},
    setupKeyboardShortcuts() {},
    setupDraggablePanels() {},
    setupCanvasZoom() {},
    calculateCanvasFitScale() { return 1; },
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
    get startDrawingCalls() {
      return startDrawingCalls;
    },
    get drawCalls() {
      return drawCalls;
    },
    get drawBatchCalls() {
      return drawBatchCalls;
    },
    get capturedPointers() {
      return capturedPointers;
    },
    get undoCalls() {
      return undoCalls;
    },
    get redoCalls() {
      return redoCalls;
    },
    get doubleTapCalls() {
      return doubleTapCalls;
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
    // Primary is scoped per pointer type, so a finger remains primary while
    // a pen from the same digitizer is also active.
    isPrimary: true,
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

function testPenPointerDownCapturesPointerToCanvas() {
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
    pointerType: 'mouse',
    pointerId: 7,
    clientX: 10,
    clientY: 10,
    isPrimary: true,
    button: 0,
    shiftKey: false,
    target
  });

  assert.deepEqual(board.capturedPointers, [7], 'pen drawing should capture the active pointer on the canvas');
}

function testPrimaryTouchCannotTakeOverActivePenWhenTouchZoomIsDisabled() {
  const { runtime, canvasTarget, documentTarget } = loadEventSetupRuntime();
  const board = createBoard(canvasTarget);
  board.settingsManager.touchZoomEnabled = false;
  runtime.setupEventListeners(board);

  const pointerDownHandler = documentTarget.listeners.get('pointerdown');
  const pointerUpHandler = documentTarget.listeners.get('pointerup');
  const target = { closest() { return null; } };

  pointerDownHandler({
    pointerType: 'pen', pointerId: 11, clientX: 10, clientY: 10,
    isPrimary: true, button: 0, shiftKey: false, target
  });
  pointerDownHandler({
    pointerType: 'touch', pointerId: 22, clientX: 30, clientY: 30,
    isPrimary: true, button: 0, shiftKey: false, target
  });
  pointerUpHandler({
    pointerType: 'touch', pointerId: 22, clientX: 30, clientY: 30,
    isPrimary: true, button: 0, target
  });

  assert.equal(board.startDrawingCalls, 1,
    'a primary touch pointer must not restart an active pen stroke when touch zoom is disabled');
  assert.equal(board.drawingCompleteCalls, 0,
    'lifting the ignored touch pointer must not finish the active pen stroke');
  assert.equal(board.drawingEngine.isDrawing, true);
}

function testSecondTouchDoesNotFreezePenStrokeWhenTouchZoomIsDisabled() {
  const { runtime, canvasTarget, documentTarget } = loadEventSetupRuntime();
  const board = createBoard(canvasTarget);
  board.settingsManager.touchZoomEnabled = false;
  runtime.setupEventListeners(board);

  const pointerDownHandler = documentTarget.listeners.get('pointerdown');
  const pointerMoveHandler = documentTarget.listeners.get('pointermove');
  const target = { closest() { return null; } };

  pointerDownHandler({
    pointerType: 'pen', pointerId: 11, clientX: 10, clientY: 10,
    isPrimary: true, button: 0, shiftKey: false, target
  });
  assert.equal(board.drawingEngine.isDrawing, true);

  // A palm/second finger lands outside the canvas (e.g. on the toolbar).
  pointerDownHandler({
    pointerType: 'touch', pointerId: 22, clientX: 300, clientY: 30,
    isPrimary: true, button: 0, shiftKey: false, target
  });

  assert.equal(board.pointerPinchStartCalls, 0,
    'with touch zoom disabled, a second pointer must not enter the pointer-pinch state');
  assert.equal(board.isPointerPinching || false, false);

  pointerMoveHandler({
    pointerType: 'pen', pointerId: 11, clientX: 40, clientY: 40,
    isPrimary: true, buttons: 1, target,
    getCoalescedEvents() { return []; }
  });

  assert.equal(board.drawCalls, 1,
    'the pen stroke must keep drawing after a second touch when touch zoom is disabled '
    + '(audit-2026-07-26 M2: pinch branch used to swallow every pointermove)');
}

function performSingleTouchTap(canvasTarget, x = 20, y = 20) {
  canvasTarget.listeners.get('touchstart')({
    touches: [{ identifier: 1, clientX: x, clientY: y }],
    preventDefault() {}
  });
  canvasTarget.listeners.get('touchend')({
    touches: [],
    changedTouches: [{ identifier: 1, clientX: x, clientY: y }],
    preventDefault() {}
  });
}

function testDoubleTapZoomRequiresPanToolAndTouchZoom() {
  const { runtime, canvasTarget } = loadEventSetupRuntime();
  const board = createBoard(canvasTarget);
  board.drawingEngine.currentTool = 'pen';
  runtime.setupEventListeners(board);

  performSingleTouchTap(canvasTarget);
  performSingleTouchTap(canvasTarget);

  assert.equal(board.doubleTapCalls, 0,
    'double taps while drawing must not unexpectedly zoom the canvas');
}

function testSimultaneousMultiTouchEndTriggersUndo() {
  const { runtime, canvasTarget } = loadEventSetupRuntime();
  const board = createBoard(canvasTarget);
  runtime.setupEventListeners(board);

  board.isPotentialGesture = true;
  board.isPotentialTap = false;
  board.maxTouchesInGesture = 2;
  board.gestureStartTime = Date.now();
  canvasTarget.listeners.get('touchend')({
    touches: [],
    changedTouches: [
      { identifier: 1, clientX: 10, clientY: 10 },
      { identifier: 2, clientX: 20, clientY: 10 }
    ],
    preventDefault() {}
  });

  assert.equal(board.undoCalls, 1,
    'a two-finger tap must undo even when both fingers are reported in one touchend');
}

function run() {
  testTouchCancelEndsPinchGestureAndClearsFlags();
  testPureTouchPinchUsesTouchPathOnly();
  testPenAndTouchPinchUsesPointerPath();
  testPrimaryPointerCancelCompletesActiveDrawing();
  testPointerMoveFallsBackWhenCoalescedEventsAreEmpty();
  testPenPointerDownCapturesPointerToCanvas();
  testPrimaryTouchCannotTakeOverActivePenWhenTouchZoomIsDisabled();
  testSecondTouchDoesNotFreezePenStrokeWhenTouchZoomIsDisabled();
  testDoubleTapZoomRequiresPanToolAndTouchZoom();
  testSimultaneousMultiTouchEndTriggersUndo();
  console.log('event-setup-touchcancel.test: all assertions passed');
}

run();
