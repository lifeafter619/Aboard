const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

function loadBackgroundUiRuntime() {
  const plotList = {
    innerHTML: ''
  };

  const sandbox = {
    console,
    window: {
      i18n: {
        t(key) {
          return key;
        }
      }
    },
    document: {
      getElementById(id) {
        if (id === 'coordinate-plot-list') {
          return plotList;
        }
        return null;
      }
    },
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
    JSON
  };

  sandbox.globalThis = sandbox;
  sandbox.self = sandbox;
  sandbox.window.document = sandbox.document;

  const source = fs.readFileSync(path.join(__dirname, '..', 'js', 'modules', 'background-ui-runtime.js'), 'utf8');
  vm.createContext(sandbox);
  vm.runInContext(source, sandbox, { filename: 'background-ui-runtime.js' });

  return {
    runtime: sandbox.window.AboardBackgroundUiRuntime,
    plotList
  };
}

function testCoordinatePlotListEscapesImportedColorValues() {
  const { runtime, plotList } = loadBackgroundUiRuntime();
  const maliciousColor = '#ff0000"; onmouseover="window.__plotXss=1';
  const board = {
    expandedCoordinatePlotId: null,
    backgroundManager: {
      getCoordinateOverlayState() {
        return {
          plots: [
            {
              id: 'plot-1',
              coordinateType: 'coordinate',
              color: maliciousColor,
              expression: 'sin(x)',
              dashStyle: 'solid',
              strokeWidth: 2.5,
              segments: []
            }
          ]
        };
      }
    },
    escapeHtml(value) {
      return String(value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
    },
    createCoordinatePlotRangeRowMarkup() {
      return '';
    },
    getCoordinateExpressionPrefix() {
      return 'y = ';
    }
  };

  runtime.renderCoordinatePlotList(board, 'coordinate');

  assert.ok(
    !plotList.innerHTML.includes(maliciousColor),
    'coordinate plot list should not inject raw imported color values into HTML'
  );
}

(function main() {
  testCoordinatePlotListEscapesImportedColorValues();
  console.log('background-ui-plot-color-escaping.test: all assertions passed');
})();
