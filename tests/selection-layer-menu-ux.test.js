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

function createMenuElement(ownerDocument, id, items) {
  const element = createElement(ownerDocument, id);
  element.querySelectorAll = (selector) => {
    if (selector === '[data-layer-action]' || selector === '.selection-layer-item') {
      return items;
    }
    return [];
  };
  element.querySelector = (selector) => {
    if (selector === '[data-layer-action]' || selector === '.selection-layer-item') {
      return items[0] || null;
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
  const layerButton = document.registerElement(createElement(document, 'selection-layer-btn'));
  const firstItem = createElement(document, 'layer-action-front');
  firstItem.dataset.layerAction = 'bring-to-front';
  const secondItem = createElement(document, 'layer-action-back');
  secondItem.dataset.layerAction = 'send-to-back';
  const thirdItem = createElement(document, 'layer-action-up');
  thirdItem.dataset.layerAction = 'move-forward';
  const items = [firstItem, secondItem, thirdItem];
  const layerMenu = document.registerElement(createMenuElement(document, 'selection-layer-menu', items));

  const manager = {
    layerButton,
    layerMenu,
    layerMenuVisible: false,
    layerMenuPreviouslyFocusedElement: null,
    getFocusableElement: proto.getFocusableElement,
    getLayerMenuItems: proto.getLayerMenuItems,
    scheduleCoordinatePositionFrame: proto.scheduleCoordinatePositionFrame,
    configureLayerMenuAccessibility: proto.configureLayerMenuAccessibility,
    bindLayerMenuKeyboardSupport: proto.bindLayerMenuKeyboardSupport,
    focusLayerMenuItem: proto.focusLayerMenuItem,
    showLayerMenu: proto.showLayerMenu,
    hideLayerMenu: proto.hideLayerMenu,
    toggleLayerMenu: proto.toggleLayerMenu
  };

  return {
    manager,
    layerButton,
    layerMenu,
    items
  };
}

function testLayerMenuKeyboardOpenAndEscapeCloseRestoreFocus() {
  const { document, SelectionManager } = loadSelectionManagerClass();
  const proto = SelectionManager.prototype;
  const { manager, layerButton, layerMenu, items } = createManagerHarness(proto, document);

  manager.configureLayerMenuAccessibility();
  manager.bindLayerMenuKeyboardSupport();

  assert.equal(layerButton.getAttribute('aria-haspopup'), 'menu');
  assert.equal(layerButton.getAttribute('aria-controls'), 'selection-layer-menu');
  assert.equal(layerButton.getAttribute('aria-expanded'), 'false');
  assert.equal(layerMenu.getAttribute('role'), 'menu');
  assert.equal(items[0].getAttribute('role'), 'menuitem');

  layerButton.focus();
  const openEvent = layerButton.trigger('keydown', { key: 'ArrowDown' });

  assert.equal(openEvent.defaultPrevented, true, 'ArrowDown should prevent default browser handling');
  assert.equal(manager.layerMenuVisible, true, 'ArrowDown should open the layer menu');
  assert.equal(layerMenu.classList.contains('show'), true, 'opening should reveal the layer menu');
  assert.equal(layerButton.getAttribute('aria-expanded'), 'true', 'opening should update aria-expanded');
  assert.equal(document.activeElement, items[0], 'opening should move focus to the first layer action');

  const escapeEvent = layerMenu.trigger('keydown', { key: 'Escape', target: items[0] });

  assert.equal(escapeEvent.defaultPrevented, true, 'Escape should prevent default browser handling');
  assert.equal(manager.layerMenuVisible, false, 'Escape should close the layer menu');
  assert.equal(layerMenu.classList.contains('show'), false, 'Escape should hide the layer menu');
  assert.equal(layerButton.getAttribute('aria-expanded'), 'false', 'closing should reset aria-expanded');
  assert.equal(document.activeElement, layerButton, 'closing should restore focus to the layer trigger');
}

function testLayerMenuArrowNavigationCyclesItems() {
  const { document, SelectionManager } = loadSelectionManagerClass();
  const proto = SelectionManager.prototype;
  const { manager, layerMenu, items } = createManagerHarness(proto, document);

  manager.configureLayerMenuAccessibility();
  manager.bindLayerMenuKeyboardSupport();
  manager.showLayerMenu();

  assert.equal(document.activeElement, items[0], 'showLayerMenu should focus the first layer action');

  const downEvent = layerMenu.trigger('keydown', { key: 'ArrowDown', target: items[0] });
  assert.equal(downEvent.defaultPrevented, true, 'ArrowDown inside the menu should prevent default handling');
  assert.equal(document.activeElement, items[1], 'ArrowDown should move focus to the next layer action');

  const upEvent = layerMenu.trigger('keydown', { key: 'ArrowUp', target: items[1] });
  assert.equal(upEvent.defaultPrevented, true, 'ArrowUp inside the menu should prevent default handling');
  assert.equal(document.activeElement, items[0], 'ArrowUp should move focus to the previous layer action');

  layerMenu.trigger('keydown', { key: 'End', target: items[0] });
  assert.equal(document.activeElement, items[2], 'End should jump to the last layer action');

  layerMenu.trigger('keydown', { key: 'Home', target: items[2] });
  assert.equal(document.activeElement, items[0], 'Home should jump back to the first layer action');
}

(function main() {
  testLayerMenuKeyboardOpenAndEscapeCloseRestoreFocus();
  testLayerMenuArrowNavigationCyclesItems();
  console.log('selection-layer-menu-ux.test: all assertions passed');
})();
