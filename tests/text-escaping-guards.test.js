const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

function loadConfigImportRuntime(translate) {
  const modal = {
    classList: {
      add() {},
      remove() {}
    },
    setAttribute() {},
    tabIndex: -1,
    onclick: null,
    onkeydown: null
  };
  const list = {
    innerHTML: '',
    children: [],
    appendChild(child) {
      this.children.push(child);
    },
    querySelectorAll() {
      return [];
    }
  };
  const okBtn = {
    parentNode: {
      replaceChild() {}
    },
    onclick: null,
    cloneNode() {
      return {
        addEventListener() {},
        focus() {}
      };
    }
  };
  const cancelBtn = {
    onclick: null,
    focus() {}
  };

  const sandbox = {
    console,
    window: {
      i18n: {
        t: translate
      },
      requestAnimationFrame(callback) {
        callback();
      }
    },
    document: {
      activeElement: null,
      body: {},
      getElementById(id) {
        switch (id) {
          case 'config-diff-modal':
            return modal;
          case 'config-diff-list':
            return list;
          case 'config-diff-ok-btn':
            return okBtn;
          case 'config-diff-cancel-btn':
            return cancelBtn;
          default:
            return null;
        }
      },
      createElement() {
        return {
          className: '',
          style: {},
          textContent: '',
          appendChild() {}
        };
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

  const source = fs.readFileSync(path.join(__dirname, '..', 'js', 'modules', 'config-import-runtime.js'), 'utf8');
  vm.createContext(sandbox);
  vm.runInContext(source, sandbox, { filename: 'config-import-runtime.js' });

  return {
    runtime: sandbox.window.AboardConfigImportRuntime,
    list
  };
}

function loadExportManager(translate) {
  const sandbox = {
    console,
    window: {
      i18n: {
        t: translate
      }
    },
    document: {
      createElement(tagName) {
        return {
          tagName,
          className: '',
          textContent: ''
        };
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

  const source = fs.readFileSync(path.join(__dirname, '..', 'js', 'export.js'), 'utf8');
  vm.createContext(sandbox);
  vm.runInContext(source, sandbox, { filename: 'export.js' });

  return sandbox.window.ExportManager;
}

function testConfigImportNoChangeMessageEscapesTranslatedHtml() {
  const maliciousMessage = '<img src=x onerror="window.__configImportXss=1">';
  const { runtime, list } = loadConfigImportRuntime((key) => {
    if (key === 'settings.importNoChange') {
      return maliciousMessage;
    }
    return key;
  });

  const board = {
    settingsManager: {
      getSettingLabel() {
        return '';
      }
    }
  };

  runtime.showConfigDiffModal(board, [], {});

  assert.ok(
    !list.innerHTML.includes(maliciousMessage),
    'config import diff modal should not inject raw translated HTML into the no-change state'
  );
  assert.equal(list.children[0]?.textContent, maliciousMessage);
}

function testExportPageSelectionHintEscapesTranslatedHtml() {
  const maliciousHint = '<img src=x onerror="window.__exportHintXss=1">';
  const ExportManager = loadExportManager((key) => {
    if (key === 'export.noPages') {
      return maliciousHint;
    }
    return key;
  });

  const container = {
    innerHTML: '',
    children: [],
    appendChild(child) {
      this.children.push(child);
    }
  };

  ExportManager.prototype.generatePageSelectionButtons.call({
    drawingBoard: {
      pages: []
    }
  }, container);

  assert.ok(
    !container.innerHTML.includes(maliciousHint),
    'export page selection hint should not inject raw translated HTML into the container'
  );
  assert.equal(container.children[0]?.textContent, maliciousHint);
}

(function main() {
  testConfigImportNoChangeMessageEscapesTranslatedHtml();
  testExportPageSelectionHintEscapesTranslatedHtml();
  console.log('text-escaping-guards.test: all assertions passed');
})();
