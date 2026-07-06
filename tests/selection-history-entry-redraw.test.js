const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

function loadSelectionManagerClass() {
  const sandbox = {
    console,
    Math,
    Number,
    String,
    Boolean,
    Array,
    Object,
    Set,
    Map,
    window: {},
    document: {}
  };

  sandbox.globalThis = sandbox;
  const source = `${fs.readFileSync(path.join(__dirname, '..', 'js', 'selection.js'), 'utf8')}\nwindow.__SelectionManager = SelectionManager;`;
  vm.createContext(sandbox);
  vm.runInContext(source, sandbox, { filename: 'selection.js' });
  return sandbox.window.__SelectionManager;
}

function testRedrawCanvasUsesImageDataFromHistoryEntryObjects() {
  const SelectionManager = loadSelectionManagerClass();
  const imageData = { data: new Uint8ClampedArray(4), width: 1, height: 1 };
  let restoredImageData = null;
  let mirrorUpdates = 0;

  const selection = {
    canvas: { width: 1, height: 1 },
    ctx: {
      save() {},
      setTransform() {},
      clearRect() {},
      restore() {},
      putImageData(value) {
        restoredImageData = value;
      }
    },
    drawingEngine: {
      strokes: [],
      stampedImages: [],
      updateOffCanvasImageMirrors() {
        mirrorUpdates += 1;
      }
    },
    textManager: { textObjects: [] },
    historyManager: {
      historyStep: 0,
      history: [{ imageData, sceneState: { strokes: [] }, hasSceneState: true }]
    },
    selectionType: null
  };

  SelectionManager.prototype.redrawCanvas.call(selection);

  assert.equal(restoredImageData, imageData, 'redraw should pass the entry imageData to putImageData');
  assert.equal(mirrorUpdates, 1, 'redraw should continue updating off-canvas mirrors');
}

(function main() {
  testRedrawCanvasUsesImageDataFromHistoryEntryObjects();
  console.log('selection-history-entry-redraw.test: all assertions passed');
})();
