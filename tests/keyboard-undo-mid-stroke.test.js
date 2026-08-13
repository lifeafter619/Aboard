const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

function loadBoardHelpersRuntime() {
  const listeners = new Map();
  const context = {
    window: {
      addEventListener() {}
    },
    document: {
      addEventListener(type, handler) {
        listeners.set(type, handler);
      },
      querySelector() {
        return null;
      },
      getElementById() {
        return null;
      }
    },
    localStorage: {
      setItem() {},
      getItem() { return null; },
      removeItem() {}
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
    fs.readFileSync(path.join(__dirname, '..', 'js', 'modules', 'board-helpers-runtime.js'), 'utf8'),
    context,
    { filename: 'board-helpers-runtime.js' }
  );
  return { runtime: context.window.AboardBoardHelpersRuntime, listeners };
}

function makeKeyEvent(key, { ctrlKey = true, shiftKey = false } = {}) {
  const event = {
    key,
    ctrlKey,
    metaKey: false,
    shiftKey,
    target: null,
    prevented: 0,
    preventDefault() {
      this.prevented += 1;
    }
  };
  return event;
}

function testUndoMidStrokeDiscardsInsteadOfRestoring() {
  const { runtime, listeners } = loadBoardHelpersRuntime();
  const calls = { undo: 0, redo: 0, discard: 0 };
  const board = {
    drawingEngine: { isDrawing: true },
    historyManager: {
      undo() { calls.undo += 1; return true; },
      redo() { calls.redo += 1; return true; },
      lastRestoreHadSceneState: true
    },
    discardCurrentStroke() { calls.discard += 1; },
    updateUI() {},
    saveSessionDebounced() {},
    selectionManager: null,
    insertTextManager: null
  };
  runtime.setupKeyboardShortcuts(board);
  const keydown = listeners.get('keydown');
  assert.ok(keydown, 'setupKeyboardShortcuts must register a keydown listener');

  // Mid-stroke Ctrl+Z must cancel the live stroke, not restore history under it.
  const undoEvent = makeKeyEvent('z');
  keydown(undoEvent);
  assert.equal(calls.undo, 0, 'undo must not run while a stroke is being drawn');
  assert.equal(calls.discard, 1, 'mid-stroke undo must discard the in-progress stroke');
  assert.equal(undoEvent.prevented, 1);

  // Mid-stroke redo gets the same guard.
  board.drawingEngine.isDrawing = true;
  keydown(makeKeyEvent('y'));
  assert.equal(calls.redo, 0, 'redo must not run while a stroke is being drawn');
  assert.equal(calls.discard, 2);

  // Once the stroke is finished, undo/redo behave normally again.
  board.drawingEngine.isDrawing = false;
  keydown(makeKeyEvent('z'));
  assert.equal(calls.undo, 1, 'undo must work normally when no stroke is in progress');
  keydown(makeKeyEvent('y'));
  assert.equal(calls.redo, 1, 'redo must work normally when no stroke is in progress');
  assert.equal(calls.discard, 2, 'finished strokes must not be discarded');
}

testUndoMidStrokeDiscardsInsteadOfRestoring();
console.log('keyboard-undo-mid-stroke.test: all assertions passed');
