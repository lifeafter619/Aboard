const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

function loadModalRuntime() {
  const documentStub = {
    addEventListener() {},
    removeEventListener() {},
    getElementById() { return null; },
    querySelector() { return null; }
  };
  const sandbox = {
    console,
    document: documentStub,
    window: { innerWidth: 1280, innerHeight: 800, i18n: null }
  };
  vm.createContext(sandbox);
  vm.runInContext(
    fs.readFileSync(path.join(__dirname, '..', 'js', 'modules', 'modal-runtime.js'), 'utf8'),
    sandbox,
    { filename: 'modal-runtime.js' }
  );
  return sandbox.window.AboardModalRuntime;
}

function createContentStub() {
  return {
    dataset: { modalResizeKey: 'testModal' },
    style: {},
    classes: new Set(),
    classList: {
      add: (name) => {},
      remove: (name) => {}
    },
    querySelector() { return null; },
    getBoundingClientRect() {
      return { left: 100, top: 100, width: 400, height: 300 };
    }
  };
}

function createBoard() {
  const sizeWrites = [];
  return {
    sizeWrites,
    modalResizeState: null,
    settingsManager: {
      getModalCenterPreference() { return false; },
      getModalSizePreference() { return null; },
      setModalSizePreference(key, size) { sizeWrites.push({ key, size }); },
      setModalCenterPreference() {}
    }
  };
}

function makePointerEvent(overrides = {}) {
  return {
    button: 0,
    buttons: 1,
    pointerId: 7,
    pointerType: 'mouse',
    clientX: 500,
    clientY: 400,
    preventDefault() {},
    stopPropagation() {},
    ...overrides
  };
}

function testReleasedMouseButtonEndsResizeAndPersistsOnce() {
  const runtime = loadModalRuntime();
  const board = createBoard();
  const content = createContentStub();

  runtime.startModalResize(board, makePointerEvent(), content, 'bottom-right');
  assert.ok(board.modalResizeState, 'resize state should start for a primary-button press');

  // Pointer returns to the window with no buttons held (pointerup was missed
  // outside the window) — the resize must self-terminate, not keep tracking.
  runtime.handleModalResize(board, makePointerEvent({ buttons: 0, clientX: 900, clientY: 700 }));
  assert.equal(board.modalResizeState, null, 'a buttons=0 mouse move must finish the resize');
  assert.equal(board.sizeWrites.length, 1, 'finishing persists the size exactly once');

  // Follow-up moves after the self-heal must be inert.
  runtime.handleModalResize(board, makePointerEvent({ buttons: 0 }));
  assert.equal(board.sizeWrites.length, 1, 'no further writes after the state is cleared');
}

function testNonPrimaryButtonDoesNotStartResize() {
  const runtime = loadModalRuntime();
  const board = createBoard();
  const content = createContentStub();

  runtime.startModalResize(board, makePointerEvent({ button: 2, buttons: 2 }), content, 'bottom-right');
  assert.equal(board.modalResizeState, null, 'right-click must not start a modal resize');
}

function testOtherPointersDoNotDisturbActiveResize() {
  const runtime = loadModalRuntime();
  const board = createBoard();
  const content = createContentStub();

  runtime.startModalResize(board, makePointerEvent({ pointerId: 7 }), content, 'bottom-right');
  runtime.handleModalResize(board, makePointerEvent({ pointerId: 9, buttons: 0 }));
  assert.ok(board.modalResizeState, 'a different pointer must not terminate the active resize');
}

testReleasedMouseButtonEndsResizeAndPersistsOnce();
testNonPrimaryButtonDoesNotStartResize();
testOtherPointersDoNotDisturbActiveResize();
console.log('modal-resize-self-heal.test: all assertions passed');
