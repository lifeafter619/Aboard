const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

function loadBackgroundUiRuntime(translate) {
  const plotList = {
    innerHTML: ''
  };

  const sandbox = {
    console,
    window: {
      i18n: {
        t: translate
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

function testCoordinatePlotListEscapesEmptyStateText() {
  const maliciousEmptyText = '<img src=x onerror="window.__emptyStateXss=1">';
  const { runtime, plotList } = loadBackgroundUiRuntime((key) => {
    if (key === 'background.noPlots') {
      return maliciousEmptyText;
    }
    return key;
  });

  const board = {
    backgroundManager: {
      getCoordinateOverlayState() {
        return { plots: [] };
      }
    },
    escapeHtml(value) {
      return String(value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
    }
  };

  runtime.renderCoordinatePlotList(board, 'coordinate');

  assert.ok(
    !plotList.innerHTML.includes(maliciousEmptyText),
    'coordinate plot empty state should not inject raw translated HTML'
  );
}

(function main() {
  testCoordinatePlotListEscapesEmptyStateText();
  console.log('background-ui-empty-state-escaping.test: all assertions passed');
})();
