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
  const element = {
    ownerDocument,
    id,
    style: {},
    dataset: {},
    attributes: {},
    classList: createClassList(),
    textContent: '',
    value: '',
    tabIndex: 0,
    _innerHTML: '',
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
    },
    querySelector() {
      return null;
    }
  };

  Object.defineProperty(element, 'innerHTML', {
    configurable: true,
    get() {
      return this._innerHTML;
    },
    set(value) {
      this._innerHTML = String(value);
    }
  });

  return element;
}

function createCoordinatePositionList(ownerDocument) {
  const element = createElement(ownerDocument, 'selection-coordinate-position-list');
  let firstInput = null;

  Object.defineProperty(element, 'innerHTML', {
    configurable: true,
    get() {
      return this._innerHTML;
    },
    set(value) {
      this._innerHTML = String(value);
      firstInput = null;
      if (this._innerHTML.includes('input type="number"')) {
        firstInput = createElement(ownerDocument, 'selection-coordinate-position-first-input');
      }
    }
  });

  element.querySelector = (selector) => {
    if (selector === 'input[data-point-id][data-axis]') {
      return firstInput;
    }
    return null;
  };

  return element;
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
    window: {
      requestAnimationFrame(callback) {
        callback();
      }
    },
    document: createDocumentStub()
  };

  sandbox.globalThis = sandbox;
  sandbox.self = sandbox;
  sandbox.window.document = sandbox.document;

  const source = `${fs.readFileSync(path.join(__dirname, '..', 'js', 'selection.js'), 'utf8')}\nwindow.__SelectionManager = SelectionManager;`;
  vm.createContext(sandbox);
  vm.runInContext(source, sandbox, { filename: 'selection.js' });

  return {
    document: sandbox.document,
    SelectionManager: sandbox.window.__SelectionManager
  };
}

function createManagerHarness(proto, document) {
  const modal = document.registerElement(createElement(document, 'selection-coordinate-position-modal'));
  const list = document.registerElement(createCoordinatePositionList(document));
  const closeBtn = document.registerElement(createElement(document, 'selection-coordinate-position-close-btn'));
  const cancelBtn = document.registerElement(createElement(document, 'selection-coordinate-position-cancel-btn'));
  const saveBtn = document.registerElement(createElement(document, 'selection-coordinate-position-save-btn'));
  const title = document.registerElement(createElement(document, 'selection-coordinate-position-title'));

  const manager = {
    coordinatePositionModal: modal,
    coordinatePositionList: list,
    coordinatePositionPreviouslyFocusedElement: null,
    selectedCoordinatePointIds: ['p1'],
    backgroundManager: {
      getCoordinatePointEntries() {
        return [{ id: 'p1', index: 0, x: 12, y: 34 }];
      },
      getPointDisplayLabel() {
        return 'Point 1';
      }
    },
    isCoordinateSelection() {
      return true;
    },
    hasSelection() {
      return true;
    },
    updateControlBox() {},
    escapeHtml: proto.escapeHtml,
    getFocusableElement: proto.getFocusableElement,
    scheduleCoordinatePositionFrame: proto.scheduleCoordinatePositionFrame,
    configureCoordinatePositionDialog: proto.configureCoordinatePositionDialog,
    bindCoordinatePositionDialogDismissal: proto.bindCoordinatePositionDialogDismissal,
    openCoordinatePositionEditor: proto.openCoordinatePositionEditor,
    closeCoordinatePositionEditor: proto.closeCoordinatePositionEditor
  };

  return {
    manager,
    modal,
    list,
    closeBtn,
    cancelBtn,
    saveBtn,
    title
  };
}

function testCoordinatePositionDialogSupportsDialogSemanticsAndRestoresFocusOnEscape() {
  const { document, SelectionManager } = loadSelectionManagerClass();
  const proto = SelectionManager.prototype;
  const trigger = createElement(document, 'open-coordinate-position');
  const { manager, modal, list } = createManagerHarness(proto, document);

  trigger.focus();
  manager.configureCoordinatePositionDialog();
  manager.bindCoordinatePositionDialogDismissal();

  assert.equal(modal.getAttribute('role'), 'dialog');
  assert.equal(modal.getAttribute('aria-modal'), 'true');
  assert.equal(modal.getAttribute('aria-labelledby'), 'selection-coordinate-position-title');
  assert.equal(modal.getAttribute('aria-describedby'), 'selection-coordinate-position-list');
  assert.equal(modal.tabIndex, -1);

  const didOpen = manager.openCoordinatePositionEditor();

  assert.equal(didOpen, true, 'coordinate position editor should open when coordinate entries are available');
  assert.equal(modal.classList.contains('show'), true, 'coordinate position editor should become visible');
  assert.equal(
    document.activeElement,
    list.querySelector('input[data-point-id][data-axis]'),
    'opening the coordinate position editor should focus the first coordinate input'
  );

  const escapeEvent = modal.trigger('keydown', { key: 'Escape' });

  assert.equal(escapeEvent.defaultPrevented, true, 'Escape should prevent default browser handling');
  assert.equal(modal.classList.contains('show'), false, 'Escape should close the coordinate position editor');
  assert.equal(document.activeElement, trigger, 'closing should restore focus to the toolbar trigger');
}

function testCoordinatePositionDialogBackdropDismissalRestoresFocus() {
  const { document, SelectionManager } = loadSelectionManagerClass();
  const proto = SelectionManager.prototype;
  const trigger = createElement(document, 'open-coordinate-position-backdrop');
  const { manager, modal } = createManagerHarness(proto, document);

  trigger.focus();
  manager.configureCoordinatePositionDialog();
  manager.bindCoordinatePositionDialogDismissal();
  manager.openCoordinatePositionEditor();
  modal.trigger('click', { target: modal });

  assert.equal(modal.classList.contains('show'), false, 'backdrop click should close the coordinate position editor');
  assert.equal(document.activeElement, trigger, 'backdrop dismissal should restore focus to the toolbar trigger');
}

(function main() {
  testCoordinatePositionDialogSupportsDialogSemanticsAndRestoresFocusOnEscape();
  testCoordinatePositionDialogBackdropDismissalRestoresFocus();
  console.log('selection-coordinate-position-modal-ux.test: all assertions passed');
})();
