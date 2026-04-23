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

function loadExportModalCreator(translate) {
  let insertedHtml = '';
  const exportModal = {
    querySelector() {
      return null;
    }
  };
  const sandbox = {
    console,
    window: {
      i18n: {
        t: translate,
        applyTranslations() {}
      }
    },
    document: {
      body: {
        insertAdjacentHTML(_position, html) {
          insertedHtml = String(html || '');
        }
      },
      getElementById(id) {
        return id === 'export-modal' ? exportModal : null;
      },
      querySelector() {
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

  const source = fs.readFileSync(path.join(__dirname, '..', 'js', 'export.js'), 'utf8');
  vm.createContext(sandbox);
  vm.runInContext(source, sandbox, { filename: 'export.js' });

  return {
    ExportManager: sandbox.window.ExportManager,
    getInsertedHtml() {
      return insertedHtml;
    }
  };
}

function createHelpElementStub(tagName = 'div') {
  const attributes = {};
  const classes = new Set();

  return {
    tagName: tagName.toUpperCase(),
    id: '',
    className: '',
    style: {},
    dataset: {},
    textContent: '',
    title: '',
    scrollTop: 0,
    _innerHTML: '',
    get innerHTML() {
      return this._innerHTML;
    },
    set innerHTML(value) {
      this._innerHTML = String(value || '');
    },
    setAttribute(name, value) {
      attributes[name] = String(value);
      if (name === 'id') {
        this.id = String(value);
      }
    },
    getAttribute(name) {
      return attributes[name] || null;
    },
    addEventListener() {},
    appendChild() {},
    focus() {},
    querySelector() {
      return null;
    },
    classList: {
      add(...names) {
        names.forEach(name => classes.add(name));
      },
      remove(...names) {
        names.forEach(name => classes.delete(name));
      },
      contains(name) {
        return classes.has(name);
      }
    }
  };
}

function loadHelpSystem(translate) {
  const modal = createHelpElementStub('div');
  const title = createHelpElementStub('h2');
  const closeButton = createHelpElementStub('button');
  const content = createHelpElementStub('div');
  const elements = {};

  modal.querySelector = (selector) => {
    if (selector === '#help-modal-title') return title;
    if (selector === '.modal-close-btn') return closeButton;
    if (selector === '.help-content') return content;
    return null;
  };

  const sandbox = {
    console,
    window: {
      i18n: {
        t: translate
      },
      requestAnimationFrame(callback) {
        callback();
      },
      drawingBoard: {
        registerResizableModal() {},
        syncResizableModalState() {}
      },
      addEventListener() {}
    },
    document: {
      activeElement: null,
      body: {
        appendChild(element) {
          elements[element.id] = element;
        }
      },
      getElementById(id) {
        return elements[id] || null;
      },
      createElement(tagName) {
        if (tagName === 'div') {
          return modal;
        }
        return createHelpElementStub(tagName);
      },
      querySelectorAll() {
        return [];
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
    JSON,
    setTimeout
  };

  sandbox.globalThis = sandbox;
  sandbox.self = sandbox;
  sandbox.window.document = sandbox.document;

  const source = fs.readFileSync(path.join(__dirname, '..', 'js', 'modules', 'help-system.js'), 'utf8');
  vm.createContext(sandbox);
  vm.runInContext(source, sandbox, { filename: 'help-system.js' });

  return {
    HelpSystem: sandbox.window.HelpSystem,
    modal,
    title,
    closeButton,
    content
  };
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

function testExportModalTemplateEscapesTranslatedHtml() {
  const maliciousLabel = '<img src=x onerror="window.__exportModalXss=1">';
  const { ExportManager, getInsertedHtml } = loadExportModalCreator(() => maliciousLabel);

  ExportManager.prototype.createExportModal.call({
    exportModal: null,
    refreshTranslations() {}
  });

  const insertedHtml = getInsertedHtml();
  assert.ok(insertedHtml, 'export modal should insert template HTML');
  assert.ok(
    !insertedHtml.includes(maliciousLabel),
    'export modal initial template should not inject raw translated HTML'
  );
  assert.ok(
    insertedHtml.includes('&lt;img'),
    'export modal initial template should contain escaped translated text'
  );
}

function testHelpModalEscapesTranslatedTemplateAndFallbackContent() {
  const maliciousHelpLabel = '<img src=x onerror="window.__helpTitleXss=1">';
  const maliciousCloseLabel = '" autofocus onfocus="window.__helpCloseXss=1';
  const maliciousHelpContent = '<svg onload="window.__helpContentXss=1"></svg>';
  const { HelpSystem, modal, title, closeButton, content } = loadHelpSystem((key) => {
    if (key === 'common.help') return maliciousHelpLabel;
    if (key === 'common.close') return maliciousCloseLabel;
    if (key === 'help.tools.pen') return maliciousHelpContent;
    return key;
  });

  new HelpSystem().showHelp('help.tools.pen');

  assert.ok(
    !modal.innerHTML.includes(maliciousHelpLabel),
    'help modal template should not inject raw translated title HTML'
  );
  assert.ok(
    !modal.innerHTML.includes(maliciousCloseLabel),
    'help modal template should not inject raw translated close label HTML'
  );
  assert.equal(title.textContent, maliciousHelpLabel);
  assert.equal(closeButton.title, maliciousCloseLabel);
  assert.equal(closeButton.getAttribute('aria-label'), maliciousCloseLabel);
  assert.ok(
    !content.innerHTML.includes(maliciousHelpContent),
    'help modal should not inject raw translated fallback content when RichTextParser is unavailable'
  );
  assert.equal(content.textContent, maliciousHelpContent);
}

(function main() {
  testConfigImportNoChangeMessageEscapesTranslatedHtml();
  testExportPageSelectionHintEscapesTranslatedHtml();
  testExportModalTemplateEscapesTranslatedHtml();
  testHelpModalEscapesTranslatedTemplateAndFallbackContent();
  console.log('text-escaping-guards.test: all assertions passed');
})();
