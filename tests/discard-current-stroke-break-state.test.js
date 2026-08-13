const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

// discardCurrentStroke must reset every piece of live-stroke state so a
// cancelled stroke cannot bleed into the next pen-down. fa40a34 added
// strokeBreakIndices / pendingStrokeBreak (set while teaching tools block
// segments) but discardCurrentStroke only cleared points/lastPoint/isDrawing,
// so a Ctrl+Z mid-stroke over a tool body left stale break indices behind
// until the next stroke started — at which point the first segment could be
// falsely split.

function loadDrawingActionsRuntime() {
  const context = {
    window: {},
    document: {
      getElementById() { return null; }
    },
    console,
    Math,
    Number,
    String,
    Boolean,
    Array,
    Object,
    JSON
  };
  context.globalThis = context;
  vm.createContext(context);
  vm.runInContext(
    fs.readFileSync(path.join(__dirname, '..', 'js', 'modules', 'drawing-actions-runtime.js'), 'utf8'),
    context,
    { filename: 'drawing-actions-runtime.js' }
  );
  return context.window.AboardDrawingActionsRuntime;
}

function testDiscardCurrentStrokeClearsBreakState() {
  const runtime = loadDrawingActionsRuntime();
  const drawingEngine = {
    isDrawing: true,
    points: [{ x: 0, y: 0 }, { x: 5, y: 5 }],
    lastPoint: { x: 5, y: 5 },
    strokeBreakIndices: [1],
    pendingStrokeBreak: true,
    hideActiveToolPreviewCalls: 0,
    hideActiveToolPreview() { this.hideActiveToolPreviewCalls += 1; }
  };
  const board = {
    drawingEngine,
    historyManager: {
      historyStep: -1,
      restoreState() {}
    }
  };

  runtime.discardCurrentStroke(board);

  assert.equal(drawingEngine.isDrawing, false, 'isDrawing must be cleared');
  assert.equal(Array.isArray(drawingEngine.points) && drawingEngine.points.length, 0, 'points must be cleared');
  assert.equal(drawingEngine.lastPoint, null, 'lastPoint must be cleared');
  assert.equal(Array.isArray(drawingEngine.strokeBreakIndices) && drawingEngine.strokeBreakIndices.length, 0, 'strokeBreakIndices must be cleared so the next stroke does not inherit a false break');
  assert.equal(drawingEngine.pendingStrokeBreak, false, 'pendingStrokeBreak must be cleared');
  assert.equal(drawingEngine.hideActiveToolPreviewCalls, 1, 'the live preview layer must still be hidden');
}

function testDiscardCurrentStrokeNoOpWhenAlreadyClean() {
  // The same resets must be safe when there is nothing to clear (no
  // TypeError on undefined fields, no spurious preview toggling).
  const runtime = loadDrawingActionsRuntime();
  const drawingEngine = {
    isDrawing: false,
    points: [],
    lastPoint: null,
    strokeBreakIndices: [],
    pendingStrokeBreak: false,
    hideActiveToolPreview() {}
  };
  const board = {
    drawingEngine,
    historyManager: { historyStep: -1, restoreState() {} }
  };

  runtime.discardCurrentStroke(board);

  assert.equal(drawingEngine.strokeBreakIndices.length, 0);
  assert.equal(drawingEngine.pendingStrokeBreak, false);
}

testDiscardCurrentStrokeClearsBreakState();
testDiscardCurrentStrokeNoOpWhenAlreadyClean();
console.log('discard-current-stroke-break-state.test: all assertions passed');
