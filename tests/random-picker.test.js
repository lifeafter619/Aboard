const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

function createElement(tagName, documentRef) {
  const element = {
    tagName: tagName.toUpperCase(),
    id: '',
    className: '',
    children: [],
    style: {},
    listeners: {},
    _innerHTML: '',
    classList: {
      add() {},
      remove() {}
    },
    appendChild(child) {
      element.children.push(child);
      return child;
    },
    addEventListener(type, handler) {
      element.listeners[type] = handler;
    },
    querySelector(selector) {
      return documentRef.getElementForSelector(selector);
    },
    querySelectorAll() {
      return [];
    },
    set innerHTML(value) {
      element._innerHTML = String(value);
    },
    get innerHTML() {
      return element._innerHTML;
    }
  };
  return element;
}

function createDocumentStub() {
  const documentRef = {
    selectorElements: new Map(),
    body: null,
    createElement(tagName) {
      return createElement(tagName, this);
    },
    addEventListener() {},
    getElementForSelector(selector) {
      if (!this.selectorElements.has(selector)) {
        this.selectorElements.set(selector, createElement('div', this));
      }
      return this.selectorElements.get(selector);
    }
  };
  documentRef.body = createElement('body', documentRef);
  return documentRef;
}

function loadRandomPickerInstance(document) {
  const source = `${fs.readFileSync(path.join(__dirname, '..', 'js', 'modules', 'random-picker.js'), 'utf8')}\nwindow.__RandomPickerInstance = RandomPickerInstance;`;
  const sandbox = {
    window: {
      innerWidth: 1024,
      innerHeight: 768,
      i18n: {
        t(key) {
          const values = {
            'common.help': 'Help',
            'common.start': 'Start',
            'randomPicker.namePicker': 'Name Picker',
            'randomPicker.numberPicker': 'Number Picker'
          };
          return values[key] || key;
        }
      }
    },
    document,
    setTimeout() {},
    setInterval() {
      return 1;
    },
    clearInterval() {},
    Math,
    JSON,
    parseInt
  };
  sandbox.globalThis = sandbox;
  vm.createContext(sandbox);
  vm.runInContext(source, sandbox, { filename: 'random-picker.js' });
  return sandbox.window.__RandomPickerInstance;
}

function testInitialTitleIsEscapedBeforeTemplateInsertion() {
  const document = createDocumentStub();
  const RandomPickerInstance = loadRandomPickerInstance(document);

  new RandomPickerInstance(1, { showSettings() {}, remove() {} }, {
    title: '<img src=x onerror=alert(1)>'
  });

  const widget = document.body.children[0];
  assert.equal(widget.innerHTML.includes('<img'), false);
  assert.equal(widget.innerHTML.includes('&lt;img src=x onerror=alert(1)&gt;'), true);
}

function main() {
  testInitialTitleIsEscapedBeforeTemplateInsertion();
  console.log('random-picker.test: all assertions passed');
}

main();
