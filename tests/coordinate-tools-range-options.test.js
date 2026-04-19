const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

function loadCoordinateToolsRuntime() {
  const sandbox = {
    console,
    window: {
      i18n: {
        t(key) {
          return key;
        }
      }
    },
    document: {},
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
    Date
  };

  sandbox.globalThis = sandbox;
  sandbox.self = sandbox;
  sandbox.window.document = sandbox.document;

  const source = fs.readFileSync(path.join(__dirname, '..', 'js', 'modules', 'coordinate-tools-runtime.js'), 'utf8');
  vm.createContext(sandbox);
  vm.runInContext(source, sandbox, { filename: 'coordinate-tools-runtime.js' });

  return sandbox.window.AboardCoordinateToolsRuntime;
}

function testCoordinatePlotRangeRowRendersOptionMarkup() {
  const runtime = loadCoordinateToolsRuntime();
  const board = {
    escapeHtml(value) {
      return String(value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
    },
    getCoordinatePlotAxisOptions() {
      return [
        { value: 'x', label: 'x' },
        { value: 'y', label: 'y' }
      ];
    }
  };

  const markup = runtime.createCoordinatePlotRangeRowMarkup(board, { axis: 'y', min: 1, max: 2 }, 'coordinate');

  assert.ok(markup.includes('<option value="x">x</option>'));
  assert.ok(markup.includes('<option value="y" selected>y</option>'));
  assert.ok(
    !markup.includes('[object Object]'),
    'coordinate plot range row should render <option> markup instead of serializing option objects'
  );
}

(function main() {
  testCoordinatePlotRangeRowRendersOptionMarkup();
  console.log('coordinate-tools-range-options.test: all assertions passed');
})();
