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
    toggle(value, force) {
      if (force === true) {
        tokens.add(value);
        return true;
      }
      if (force === false) {
        tokens.delete(value);
        return false;
      }
      if (tokens.has(value)) {
        tokens.delete(value);
        return false;
      }
      tokens.add(value);
      return true;
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
    tabIndex: 0,
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
    querySelectorAll() {
      return [];
    },
    querySelector() {
      return null;
    }
  };
}

function createPopoverElement(ownerDocument, id, swatches) {
  const element = createElement(ownerDocument, id);
  element.querySelectorAll = (selector) => {
    if (selector === '.selection-color-swatch') {
      return swatches;
    }
    return [];
  };
  element.querySelector = (selector) => {
    if (selector === '.selection-color-swatch') {
      return swatches[0] || null;
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
  const colorButton = document.registerElement(createElement(document, 'selection-color-btn'));
  const colorWrapper = document.registerElement(createElement(document, 'selection-color-wrapper'));
  const pickerToggle = document.registerElement(createElement(document, 'selection-color-picker-toggle-btn'));
  const swatches = ['#ef4444', '#2563eb', '#16a34a'].map((color, index) => {
    const swatch = createElement(document, `selection-swatch-${index}`);
    swatch.dataset.color = color;
    return swatch;
  });
  const colorPopover = document.registerElement(createPopoverElement(document, 'selection-color-popover', swatches));

  const manager = {
    colorButton,
    colorWrapper,
    colorPopover,
    selectionColorPopoverVisible: false,
    selectionColorPopoverPreviouslyFocusedElement: null,
    isCoordinateSelection() {
      return true;
    },
    syncSelectionColorUI() {},
    getFocusableElement: proto.getFocusableElement,
    scheduleCoordinatePositionFrame: proto.scheduleCoordinatePositionFrame,
    getSelectionColorSwatches: proto.getSelectionColorSwatches,
    focusSelectionColorSwatch: proto.focusSelectionColorSwatch,
    configureSelectionColorPopoverAccessibility: proto.configureSelectionColorPopoverAccessibility,
    bindSelectionColorPopoverKeyboardSupport: proto.bindSelectionColorPopoverKeyboardSupport,
    toggleSelectionColorPopover: proto.toggleSelectionColorPopover,
    hideSelectionColorPopover: proto.hideSelectionColorPopover
  };

  return {
    manager,
    colorButton,
    colorWrapper,
    colorPopover,
    pickerToggle,
    swatches
  };
}

function testColorPopoverKeyboardOpenAndEscapeRestoreFocus() {
  const { document, SelectionManager } = loadSelectionManagerClass();
  const proto = SelectionManager.prototype;
  const { manager, colorButton, colorWrapper, colorPopover, swatches } = createManagerHarness(proto, document);

  manager.configureSelectionColorPopoverAccessibility();
  manager.bindSelectionColorPopoverKeyboardSupport();

  assert.equal(colorButton.getAttribute('aria-controls'), 'selection-color-popover');
  assert.equal(colorButton.getAttribute('aria-expanded'), 'false');
  assert.equal(colorPopover.getAttribute('role'), 'group');

  colorButton.focus();
  const openEvent = colorButton.trigger('keydown', { key: 'ArrowDown' });

  assert.equal(openEvent.defaultPrevented, true, 'ArrowDown should prevent default browser handling');
  assert.equal(manager.selectionColorPopoverVisible, true, 'ArrowDown should open the color popover');
  assert.equal(colorWrapper.classList.contains('show-color-popover'), true, 'opening should reveal the color popover');
  assert.equal(colorButton.getAttribute('aria-expanded'), 'true', 'opening should update aria-expanded');
  assert.equal(document.activeElement, swatches[0], 'opening should move focus to the first color swatch');

  const escapeEvent = colorPopover.trigger('keydown', { key: 'Escape', target: swatches[0] });

  assert.equal(escapeEvent.defaultPrevented, true, 'Escape should prevent default browser handling');
  assert.equal(manager.selectionColorPopoverVisible, false, 'Escape should close the color popover');
  assert.equal(colorWrapper.classList.contains('show-color-popover'), false, 'Escape should hide the color popover');
  assert.equal(colorButton.getAttribute('aria-expanded'), 'false', 'closing should reset aria-expanded');
  assert.equal(document.activeElement, colorButton, 'closing should restore focus to the color trigger');
}

function testColorPopoverArrowNavigationCyclesSwatches() {
  const { document, SelectionManager } = loadSelectionManagerClass();
  const proto = SelectionManager.prototype;
  const { manager, colorPopover, swatches } = createManagerHarness(proto, document);

  manager.configureSelectionColorPopoverAccessibility();
  manager.bindSelectionColorPopoverKeyboardSupport();
  manager.toggleSelectionColorPopover(true, { focusIndex: 0 });

  assert.equal(document.activeElement, swatches[0], 'opening should focus the first color swatch');

  const rightEvent = colorPopover.trigger('keydown', { key: 'ArrowRight', target: swatches[0] });
  assert.equal(rightEvent.defaultPrevented, true, 'ArrowRight should prevent default browser handling');
  assert.equal(document.activeElement, swatches[1], 'ArrowRight should move focus to the next swatch');

  const leftEvent = colorPopover.trigger('keydown', { key: 'ArrowLeft', target: swatches[1] });
  assert.equal(leftEvent.defaultPrevented, true, 'ArrowLeft should prevent default browser handling');
  assert.equal(document.activeElement, swatches[0], 'ArrowLeft should move focus to the previous swatch');

  colorPopover.trigger('keydown', { key: 'End', target: swatches[0] });
  assert.equal(document.activeElement, swatches[2], 'End should jump to the last swatch');

  colorPopover.trigger('keydown', { key: 'Home', target: swatches[2] });
  assert.equal(document.activeElement, swatches[0], 'Home should jump back to the first swatch');
}

(function main() {
  testColorPopoverKeyboardOpenAndEscapeRestoreFocus();
  testColorPopoverArrowNavigationCyclesSwatches();
  console.log('selection-color-popover-ux.test: all assertions passed');
})();
