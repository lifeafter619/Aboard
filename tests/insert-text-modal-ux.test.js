const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

function createClassList() {
  const tokens = new Set();
  return {
    add(...values) {
      values.forEach((value) => tokens.add(value));
    },
    remove(...values) {
      values.forEach((value) => tokens.delete(value));
    },
    contains(value) {
      return tokens.has(value);
    }
  };
}

function createElement(ownerDocument, id = '') {
  const listeners = new Map();
  return {
    ownerDocument,
    id,
    style: {},
    dataset: {},
    attributes: {},
    classList: createClassList(),
    textContent: '',
    value: '',
    setAttribute(name, value) {
      this.attributes[name] = String(value);
      if (name === 'id') {
        this.id = String(value);
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
        defaultPrevented: false,
        preventDefault() {
          this.defaultPrevented = true;
        },
        ...extra
      };
      (listeners.get(type) || []).forEach((handler) => handler(event));
      return event;
    },
    focus() {
      ownerDocument.activeElement = this;
    }
  };
}

function createDocumentStub() {
  const elements = new Map();
  const document = {
    activeElement: null,
    body: null,
    getElementById(id) {
      return elements.get(id) || null;
    },
    registerElement(element) {
      if (element?.id) {
        elements.set(element.id, element);
      }
      return element;
    }
  };

  document.body = createElement(document, 'body');
  return document;
}

function loadInsertTextManagerPrototype() {
  const source = `${fs.readFileSync(path.join(__dirname, '..', 'js', 'modules', 'insert-text-manager.js'), 'utf8')}\nwindow.__InsertTextManager = InsertTextManager;`;
  const document = createDocumentStub();
  const sandbox = {
    console,
    window: {
      requestAnimationFrame(callback) {
        callback();
      },
      drawingBoard: {
        syncVectorPreviewState() {}
      }
    },
    document,
    localStorage: {
      getItem() { return null; },
      setItem() { return true; }
    },
    FontFace: class FakeFontFace {},
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
    Date,
    JSON,
    parseInt,
    parseFloat,
    Promise
  };
  sandbox.globalThis = sandbox;
  sandbox.self = sandbox;
  sandbox.window.document = document;

  vm.createContext(sandbox);
  vm.runInContext(source, sandbox, { filename: 'insert-text-manager.js' });

  return {
    document,
    InsertTextManager: sandbox.window.__InsertTextManager
  };
}

function createManagerHarness(proto, document) {
  const modal = document.registerElement(createElement(document, 'insert-text-modal'));
  const input = document.registerElement(createElement(document, 'insert-text-input'));
  const closeBtn = document.registerElement(createElement(document, 'insert-text-modal-close-btn'));
  const title = document.registerElement(createElement(document, 'insert-text-modal-title'));

  const manager = {
    modal,
    modalPreviouslyFocusedElement: null,
    editingTextIndex: 7,
    textConfig: {
      fontSize: 48
    },
    populateFonts() {},
    updateDecorationControlsVisibility() {},
    getFocusableElement: proto.getFocusableElement,
    scheduleModalFrame: proto.scheduleModalFrame,
    bindModalAccessibility: proto.bindModalAccessibility,
    hideModal: proto.hideModal,
    closeModal: proto.closeModal,
    showModal: proto.showModal
  };

  return {
    manager,
    modal,
    input,
    closeBtn,
    title
  };
}

function testInsertTextModalSupportsDialogSemanticsAndFocusRestoration() {
  const { document, InsertTextManager } = loadInsertTextManagerPrototype();
  const proto = InsertTextManager.prototype;
  const trigger = createElement(document, 'open-insert-text');
  const { manager, modal, input } = createManagerHarness(proto, document);

  trigger.focus();
  manager.bindModalAccessibility();

  assert.equal(modal.getAttribute('role'), 'dialog');
  assert.equal(modal.getAttribute('aria-modal'), 'true');
  assert.equal(modal.getAttribute('aria-labelledby'), 'insert-text-modal-title');
  assert.equal(modal.getAttribute('aria-describedby'), 'insert-text-input');
  assert.equal(modal.tabIndex, -1);

  manager.showModal(false);

  assert.equal(modal.classList.contains('show'), true, 'showModal should reveal the insert text dialog');
  assert.equal(document.activeElement, input, 'showModal should move focus into the text field');

  const escapeEvent = modal.trigger('keydown', { key: 'Escape' });

  assert.equal(escapeEvent.defaultPrevented, true, 'Escape should prevent default browser handling');
  assert.equal(modal.classList.contains('show'), false, 'Escape should close the insert text dialog');
  assert.equal(document.activeElement, trigger, 'closing the dialog should restore focus to the opener');
  assert.equal(manager.editingTextIndex, null, 'closing the dialog should clear the editing marker');
}

function testBackdropClickAlsoRestoresFocus() {
  const { document, InsertTextManager } = loadInsertTextManagerPrototype();
  const proto = InsertTextManager.prototype;
  const trigger = createElement(document, 'open-insert-text-backdrop');
  const { manager, modal } = createManagerHarness(proto, document);

  trigger.focus();
  manager.bindModalAccessibility();
  manager.showModal(false);
  modal.trigger('click', { target: modal });

  assert.equal(modal.classList.contains('show'), false, 'backdrop click should dismiss the insert text dialog');
  assert.equal(document.activeElement, trigger, 'backdrop dismissal should restore focus to the opener');
}

(function main() {
  testInsertTextModalSupportsDialogSemanticsAndFocusRestoration();
  testBackdropClickAlsoRestoresFocus();
  console.log('insert-text-modal-ux.test: all assertions passed');
})();
