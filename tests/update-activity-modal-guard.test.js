const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

function loadDrawingBoard(documentStub) {
  const source = fs.readFileSync(
    path.join(__dirname, '..', 'js', 'main.js'),
    'utf8'
  );

  const localStorage = {
    getItem() {
      return null;
    },
    setItem() {},
    removeItem() {}
  };

  const window = {
    document: documentStub,
    localStorage,
    addEventListener() {},
    removeEventListener() {}
  };

  const context = {
    window,
    document: documentStub,
    localStorage,
    console,
    setTimeout,
    clearTimeout,
    Uint8ClampedArray,
    Map,
    Set,
    WeakSet,
    Proxy,
    Promise,
    Date,
    Math,
    Object,
    Array,
    String,
    Number,
    Boolean
  };

  vm.createContext(context);
  new vm.Script(source, { filename: 'main.js' }).runInContext(context);
  return context.window.DrawingBoard;
}

function createDocumentStub({ blockingModalOpen = false, activeElement = null } = {}) {
  return {
    body: {},
    activeElement,
    addEventListener() {},
    querySelector(selector) {
      if (selector.includes('.modal.show:not(.non-blocking-modal)')) {
        return blockingModalOpen ? { id: 'blocking-modal' } : null;
      }
      return null;
    },
    querySelectorAll() {
      return [];
    },
    getElementById(id) {
      if (id === 'transform-layer') {
        return {};
      }
      return null;
    }
  };
}

function testBlockingModalCountsAsUpdateBusyState() {
  const documentStub = createDocumentStub({ blockingModalOpen: true });
  const DrawingBoard = loadDrawingBoard(documentStub);
  const board = Object.create(DrawingBoard.prototype);
  board.lastUserActivityAt = Date.now();
  board.drawingEngine = {};
  board.shapeDrawingManager = {};
  board.activePointers = new Set();
  board.selectionManager = {};
  board.strokeControls = {};
  board.insertTextManager = {};
  board.imageControls = {};
  board.insertImageManager = {};
  board.teachingToolsManager = {};
  board.modalDragState = null;
  board.modalResizeState = null;

  const snapshot = board.getUpdateActivitySnapshot();

  assert.equal(
    snapshot.isModalBusy,
    true,
    'visible blocking modals should pause idle update application'
  );
}

function testNonBlockingModalDoesNotCountAsBusyState() {
  const documentStub = createDocumentStub({ blockingModalOpen: false });
  const DrawingBoard = loadDrawingBoard(documentStub);
  const board = Object.create(DrawingBoard.prototype);
  board.lastUserActivityAt = Date.now();
  board.drawingEngine = {};
  board.shapeDrawingManager = {};
  board.activePointers = new Set();
  board.selectionManager = {};
  board.strokeControls = {};
  board.insertTextManager = {};
  board.imageControls = {};
  board.insertImageManager = {};
  board.teachingToolsManager = {};
  board.modalDragState = null;
  board.modalResizeState = null;

  const snapshot = board.getUpdateActivitySnapshot();

  assert.equal(snapshot.isModalBusy, false, 'no blocking modal should keep idle updates eligible');
}

function run() {
  testBlockingModalCountsAsUpdateBusyState();
  testNonBlockingModalDoesNotCountAsBusyState();
  console.log('update-activity-modal-guard.test: all assertions passed');
}

run();
