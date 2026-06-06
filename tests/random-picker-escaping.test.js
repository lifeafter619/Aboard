const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

function createClassList(initial = []) {
  const values = new Set(initial);
  return {
    add(...tokens) {
      tokens.forEach((token) => values.add(token));
    },
    remove(...tokens) {
      tokens.forEach((token) => values.delete(token));
    },
    contains(token) {
      return values.has(token);
    }
  };
}

function createElementStub(document, tagName = 'div') {
  const selectors = new Map();
  const selectorLists = new Map();
  const listeners = new Map();
  const element = {
    ownerDocument: document,
    tagName: tagName.toUpperCase(),
    id: '',
    className: '',
    textContent: '',
    value: '',
    checked: false,
    title: '',
    style: {},
    dataset: {},
    attributes: {},
    classList: createClassList(),
    children: [],
    _innerHTML: '',
    get innerHTML() {
      return this._innerHTML;
    },
    set innerHTML(value) {
      this._innerHTML = String(value || '');
      configureKnownRandomPickerChildren(document, this, this._innerHTML, selectors, selectorLists);
    },
    setAttribute(name, value) {
      this.attributes[name] = String(value);
      if (name === 'id') {
        this.id = String(value);
        document.registerElement(this);
      }
    },
    getAttribute(name) {
      return this.attributes[name] ?? null;
    },
    addEventListener(type, handler) {
      const handlers = listeners.get(type) || [];
      handlers.push(handler);
      listeners.set(type, handlers);
    },
    trigger(type, extra = {}) {
      const event = {
        target: this,
        currentTarget: this,
        preventDefault() {},
        stopPropagation() {},
        ...extra
      };
      (listeners.get(type) || []).forEach((handler) => handler(event));
      return event;
    },
    appendChild(child) {
      this.children.push(child);
      document.registerElement(child);
      return child;
    },
    remove() {},
    focus() {
      document.activeElement = this;
    },
    querySelector(selector) {
      return selectors.get(selector) || null;
    },
    querySelectorAll(selector) {
      return selectorLists.get(selector) || [];
    }
  };

  return element;
}

function registerSelector(document, selectors, selector, element) {
  selectors.set(selector, element);
  document.registerElement(element);
  return element;
}

function configureKnownRandomPickerChildren(document, root, html, selectors, selectorLists) {
  if (html.includes('random-picker-header')) {
    const header = createElementStub(document);
    const title = createElementStub(document, 'span');
    const result = createElementStub(document);
    const startLabel = createElementStub(document, 'span');
    const startButton = createElementStub(document, 'button');
    startButton.querySelector = (selector) => selector === 'span' ? startLabel : null;

    registerSelector(document, selectors, '.random-picker-header', header);
    registerSelector(document, selectors, '.random-picker-title', title);
    registerSelector(document, selectors, '.random-picker-result', result);
    registerSelector(document, selectors, '.random-picker-help-btn', createElementStub(document, 'button'));
    registerSelector(document, selectors, '.random-picker-close-btn', createElementStub(document, 'button'));
    registerSelector(document, selectors, '.random-picker-start-btn', startButton);
    registerSelector(document, selectors, '.random-picker-settings-btn', createElementStub(document, 'button'));
  }

  if (html.includes('random-picker-modal-content')) {
    const closeButton = createElementStub(document, 'button');
    const title = createElementStub(document, 'h2');
    title.id = 'random-picker-settings-title';

    const nameModeButton = createElementStub(document, 'button');
    nameModeButton.dataset.mode = 'name';
    nameModeButton.classList = createClassList(['active']);
    const numberModeButton = createElementStub(document, 'button');
    numberModeButton.dataset.mode = 'number';

    registerSelector(document, selectors, '.modal-close-btn', closeButton);
    registerSelector(document, selectors, '#random-picker-settings-title', title);
    registerSelector(document, selectors, '.random-picker-mode-btn[data-mode="name"]', nameModeButton);
    registerSelector(document, selectors, '.random-picker-mode-btn[data-mode="number"]', numberModeButton);
    selectorLists.set('.random-picker-mode-btn', [nameModeButton, numberModeButton]);

    [
      ['.rp-title-label', createElementStub(document, 'label')],
      ['#rp-title-input', createElementStub(document, 'input')],
      ['.rp-names-label', createElementStub(document, 'label')],
      ['#rp-names-input', createElementStub(document, 'textarea')],
      ['.rp-import-label', createElementStub(document, 'label')],
      ['#rp-import-col', createElementStub(document, 'input')],
      ['#rp-import-btn', createElementStub(document, 'button')],
      ['#rp-import-file', createElementStub(document, 'input')],
      ['.rp-import-hint', createElementStub(document)],
      ['.rp-range-label', createElementStub(document, 'label')],
      ['#rp-min-input', createElementStub(document, 'input')],
      ['#rp-max-input', createElementStub(document, 'input')],
      ['.rp-allow-repeats-label', createElementStub(document, 'span')],
      ['#rp-save-btn', createElementStub(document, 'button')],
      ['#rp-name-settings', createElementStub(document)],
      ['#rp-number-settings', createElementStub(document)]
    ].forEach(([selector, element]) => {
      if (selector.startsWith('#')) {
        element.id = selector.slice(1);
      }
      registerSelector(document, selectors, selector, element);
    });
  }
}

function createDocumentStub() {
  const elements = new Map();
  const appended = [];
  const document = {
    activeElement: null,
    body: null,
    appended,
    createElement(tagName) {
      return createElementStub(document, tagName);
    },
    getElementById(id) {
      return elements.get(id) || null;
    },
    registerElement(element) {
      if (element?.id) {
        elements.set(element.id, element);
      }
    },
    addEventListener() {},
    removeEventListener() {}
  };
  document.body = createElementStub(document, 'body');
  document.body.appendChild = (child) => {
    appended.push(child);
    document.registerElement(child);
    return child;
  };
  return document;
}

function loadRandomPickerClasses(translate, {
  windowOverrides = {},
  sandboxOverrides = {}
} = {}) {
  const document = createDocumentStub();
  const sandbox = {
    console,
    window: {
      innerWidth: 1280,
      innerHeight: 720,
      i18n: {
        t: translate
      },
      addEventListener() {},
      removeEventListener() {},
      requestAnimationFrame(callback) {
        callback();
      },
      ...windowOverrides
    },
    document,
    setInterval() {
      return 1;
    },
    clearInterval() {},
    setTimeout(callback) {
      callback();
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
    parseInt,
    Uint8Array,
    ...sandboxOverrides
  };

  sandbox.globalThis = sandbox;
  sandbox.self = sandbox;
  sandbox.window.document = document;

  const source = `${fs.readFileSync(path.join(__dirname, '..', 'js', 'modules', 'random-picker.js'), 'utf8')}
window.__RandomPickerInstance = RandomPickerInstance;
window.__RandomPickerManager = RandomPickerManager;`;
  vm.createContext(sandbox);
  vm.runInContext(source, sandbox, { filename: 'random-picker.js' });

  return {
    document,
    RandomPickerInstance: sandbox.window.__RandomPickerInstance,
    RandomPickerManager: sandbox.window.__RandomPickerManager
  };
}

function testRandomPickerWidgetDoesNotInjectTranslatedHtml() {
  const malicious = '<img src=x onerror="window.__randomPickerXss=1">';
  const { document, RandomPickerInstance } = loadRandomPickerClasses(() => malicious);
  const manager = {
    currentInstance: null,
    remove() {},
    showSettings() {}
  };

  const instance = new RandomPickerInstance(1, manager);

  assert.ok(instance.element, 'random picker widget should be created');
  assert.ok(
    !instance.element.innerHTML.includes(malicious),
    'random picker widget should not inject translated text into its initial HTML template'
  );
  assert.equal(document.appended.includes(instance.element), true);
}

function testRandomPickerSettingsDoesNotInjectTranslatedHtml() {
  const malicious = '<svg onload="window.__randomPickerSettingsXss=1"></svg>';
  const { document, RandomPickerManager } = loadRandomPickerClasses(() => malicious);

  const manager = new RandomPickerManager();
  const modal = document.getElementById('random-picker-settings-modal');

  assert.ok(manager, 'random picker manager should be created');
  assert.ok(modal, 'random picker settings modal should be created');
  assert.ok(
    !modal.innerHTML.includes(malicious),
    'random picker settings modal should not inject translated text into its initial HTML template'
  );
}

function testNumberModeInvalidRangeFallsBackToFiniteDefaults() {
  const { RandomPickerInstance } = loadRandomPickerClasses((key) => key);
  const manager = {
    currentInstance: null,
    remove() {},
    showSettings() {}
  };

  const instance = new RandomPickerInstance(1, manager, {
    mode: 'number',
    min: 'not-a-number',
    max: 'also-bad',
    allowRepeats: true
  });

  instance.startPick();
  instance.stopAnimation();

  const result = Number(instance.resultElement.textContent);
  assert.ok(Number.isInteger(result), 'number picker should not render NaN for invalid imported ranges');
  assert.ok(result >= 1 && result <= 50, 'invalid imported ranges should fall back to the default 1-50 range');
}

async function testOversizedSpreadsheetImportIsRejectedBeforeFileReaderRuns() {
  const toasts = [];
  let readCalls = 0;
  let xlsxReadCalls = 0;
  const fileValidation = {
    validateSpreadsheetFile(file) {
      if (file?.size > 10) {
        throw new Error('Selected spreadsheet is too large.');
      }
    },
    showValidationError(error) {
      toasts.push(error.message);
    }
  };
  const { RandomPickerManager } = loadRandomPickerClasses((key) => key, {
    windowOverrides: {
      AboardFileValidation: fileValidation,
      XLSX: {
        read() {
          xlsxReadCalls += 1;
          return { SheetNames: [], Sheets: {} };
        },
        utils: {
          sheet_to_json() {
            return [];
          }
        }
      },
      appDialog: {
        showAlert(message, type) {
          toasts.push(`${type}:${message}`);
        }
      }
    },
    sandboxOverrides: {
      XLSX: {
        read() {
          xlsxReadCalls += 1;
          return { SheetNames: [], Sheets: {} };
        },
        utils: {
          sheet_to_json() {
            return [];
          }
        }
      },
      FileReader: class FakeFileReader {
        readAsArrayBuffer() {
          readCalls += 1;
        }
      }
    }
  });

  const manager = new RandomPickerManager();
  await manager.importFile({
    name: 'huge.xlsx',
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    size: 11
  });

  assert.equal(readCalls, 0, 'oversized spreadsheet imports should be rejected before FileReader reads them');
  assert.equal(xlsxReadCalls, 0, 'oversized spreadsheet imports should not enter XLSX parsing');
  assert.ok(
    toasts.some((message) => message.includes('Selected spreadsheet is too large.')),
    'oversized spreadsheet imports should show a validation error'
  );
}

(async function main() {
  testRandomPickerWidgetDoesNotInjectTranslatedHtml();
  testRandomPickerSettingsDoesNotInjectTranslatedHtml();
  testNumberModeInvalidRangeFallsBackToFiniteDefaults();
  await testOversizedSpreadsheetImportIsRejectedBeforeFileReaderRuns();
  console.log('random-picker-escaping.test: all assertions passed');
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
