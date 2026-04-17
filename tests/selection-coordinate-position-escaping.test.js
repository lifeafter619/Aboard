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
    WeakMap,
    WeakSet,
    JSON,
    parseInt,
    parseFloat,
    isNaN,
    window: {},
    document: {}
  };

  sandbox.globalThis = sandbox;
  sandbox.self = sandbox;
  sandbox.window.document = sandbox.document;

  const source = `${fs.readFileSync(path.join(__dirname, '..', 'js', 'selection.js'), 'utf8')}\nwindow.__SelectionManager = SelectionManager;`;
  vm.createContext(sandbox);
  vm.runInContext(source, sandbox, { filename: 'selection.js' });
  return sandbox.window.__SelectionManager;
}

function testCoordinatePositionEditorEscapesPointValues() {
  const SelectionManager = loadSelectionManagerClass();
  const maliciousValue = '0" autofocus onfocus="window.__selectionXss=1';
  const coordinatePositionList = {
    innerHTML: ''
  };
  let modalShown = false;

  const selection = {
    backgroundManager: {
      getCoordinatePointEntries() {
        return [
          {
            id: 'p1',
            index: 0,
            x: maliciousValue,
            y: maliciousValue
          }
        ];
      },
      getPointDisplayLabel() {
        return 'Point 1';
      }
    },
    coordinatePositionModal: {
      classList: {
        add(className) {
          if (className === 'show') {
            modalShown = true;
          }
        }
      }
    },
    coordinatePositionList,
    selectedCoordinatePointIds: ['p1'],
    isCoordinateSelection() {
      return true;
    },
    escapeHtml: SelectionManager.prototype.escapeHtml
  };

  const didOpen = SelectionManager.prototype.openCoordinatePositionEditor.call(selection);

  assert.equal(didOpen, true, 'coordinate position editor should open when coordinate points exist');
  assert.equal(modalShown, true, 'coordinate position editor should show the modal');
  assert.ok(
    !coordinatePositionList.innerHTML.includes(maliciousValue),
    'coordinate position editor should not inject raw coordinate values into HTML attributes'
  );
}

(function main() {
  testCoordinatePositionEditorEscapesPointValues();
  console.log('selection-coordinate-position-escaping.test: all assertions passed');
})();
