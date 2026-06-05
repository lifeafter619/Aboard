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
  const children = [];
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
    children,
    type: '',
    appendChild(child) {
      children.push(child);
      child.parentElement = this;
      return child;
    },
    remove() {},
    querySelectorAll() {
      return [];
    },
    querySelector() {
      return null;
    },
    closest() {
      return null;
    },
    setAttribute(name, value) {
      this.attributes[name] = String(value);
      if (name === 'id') {
        this.id = String(value);
        ownerDocument.registerElement(this);
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
    createElement(tagName) {
      const element = createElement(document);
      element.tagName = String(tagName).toUpperCase();
      Object.defineProperty(element, 'innerHTML', {
        get() {
          return this._innerHTML || '';
        },
        set(value) {
          this._innerHTML = String(value);
          for (const [, id] of this._innerHTML.matchAll(/\sid="([^"]+)"/g)) {
            document.registerElement(createElement(document, id));
          }
        }
      });
      return element;
    },
    getElementById(id) {
      return elements.get(id) || null;
    },
    querySelector() {
      return null;
    },
    querySelectorAll() {
      return [];
    },
    addEventListener() {},
    removeEventListener() {},
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

function loadTeachingToolsManagerPrototype() {
  const source = `${fs.readFileSync(path.join(__dirname, '..', 'js', 'modules', 'teaching-tools.js'), 'utf8')}\nwindow.__TeachingToolsManager = TeachingToolsManager;`;
  const document = createDocumentStub();
  const imageSources = [];
  class FakeImage {
    set src(value) {
      imageSources.push(value);
      this._src = value;
    }
    get src() {
      return this._src || '';
    }
  }
  const sandbox = {
    console,
    window: {
      requestAnimationFrame(callback) {
        callback();
      },
      addEventListener() {},
      removeEventListener() {},
      i18n: {
        applyTranslations() {}
      }
    },
    document,
    Image: FakeImage,
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
  vm.runInContext(source, sandbox, { filename: 'teaching-tools.js' });

  return {
    document,
    imageSources,
    TeachingToolsManager: sandbox.window.__TeachingToolsManager
  };
}

function createManagerHarness(proto, document) {
  const modal = document.registerElement(createElement(document, 'teaching-tools-modal'));
  const input = document.registerElement(createElement(document, 'ruler1-count-input'));
  const closeBtn = document.registerElement(createElement(document, 'teaching-tools-close-btn'));
  const confirmBtn = document.registerElement(createElement(document, 'teaching-tools-confirm-btn'));
  const title = document.registerElement(createElement(document, 'teaching-tools-modal-title'));
  const hint = document.registerElement(createElement(document, 'teaching-tools-modal-hint'));
  document.registerElement(createElement(document, 'ruler2-count-input'));
  document.registerElement(createElement(document, 'set-square-60-count-input'));
  document.registerElement(createElement(document, 'set-square-45-count-input'));

  const manager = {
    modal,
    modalPreviouslyFocusedElement: null,
    ruler1Count: 3,
    ruler2Count: 2,
    setSquare60Count: 1,
    setSquare45Count: 4,
    updateCurrentCountDisplay() {},
    updateCounterButtonLabels() {},
    getFocusableElement: proto.getFocusableElement,
    scheduleModalFrame: proto.scheduleModalFrame,
    configureModalAccessibility: proto.configureModalAccessibility,
    bindModalDismissal: proto.bindModalDismissal,
    showModal: proto.showModal,
    hideModal: proto.hideModal
  };

  return {
    manager,
    modal,
    input,
    closeBtn,
    confirmBtn,
    title,
    hint
  };
}

function testTeachingToolsModalSupportsDialogSemanticsAndRestoresFocusOnEscape() {
  const { document, TeachingToolsManager } = loadTeachingToolsManagerPrototype();
  const proto = TeachingToolsManager.prototype;
  const trigger = createElement(document, 'open-teaching-tools');
  const { manager, modal, input } = createManagerHarness(proto, document);

  trigger.focus();
  manager.configureModalAccessibility();
  manager.bindModalDismissal();

  assert.equal(modal.getAttribute('role'), 'dialog');
  assert.equal(modal.getAttribute('aria-modal'), 'true');
  assert.equal(modal.getAttribute('aria-labelledby'), 'teaching-tools-modal-title');
  assert.equal(modal.getAttribute('aria-describedby'), 'teaching-tools-modal-hint');
  assert.equal(modal.tabIndex, -1);

  manager.showModal();

  assert.equal(modal.classList.contains('show'), true, 'showModal should reveal the teaching tools dialog');
  assert.equal(document.activeElement, input, 'showModal should move focus to the first editable count input');
  assert.equal(manager.ruler1Count, 0, 'showModal should reset the pending ruler 1 count');
  assert.equal(manager.ruler2Count, 0, 'showModal should reset the pending ruler 2 count');
  assert.equal(manager.setSquare60Count, 0, 'showModal should reset the pending 60-degree set square count');
  assert.equal(manager.setSquare45Count, 0, 'showModal should reset the pending 45-degree set square count');

  const escapeEvent = modal.trigger('keydown', { key: 'Escape' });

  assert.equal(escapeEvent.defaultPrevented, true, 'Escape should prevent default browser handling');
  assert.equal(modal.classList.contains('show'), false, 'Escape should close the teaching tools dialog');
  assert.equal(document.activeElement, trigger, 'closing should restore focus to the element that opened the dialog');
}

function testTeachingToolsModalBackdropDismissalRestoresFocus() {
  const { document, TeachingToolsManager } = loadTeachingToolsManagerPrototype();
  const proto = TeachingToolsManager.prototype;
  const trigger = createElement(document, 'open-teaching-tools-backdrop');
  const { manager, modal } = createManagerHarness(proto, document);

  trigger.focus();
  manager.configureModalAccessibility();
  manager.bindModalDismissal();
  manager.showModal();
  modal.trigger('click', { target: modal });

  assert.equal(modal.classList.contains('show'), false, 'backdrop click should close the teaching tools dialog');
  assert.equal(document.activeElement, trigger, 'backdrop dismissal should restore focus to the opener');
}

function testTeachingToolsConstructorDefersHeavyImagesUntilUse() {
  const { imageSources, TeachingToolsManager } = loadTeachingToolsManagerPrototype();
  const canvas = {
    getBoundingClientRect() {
      return { left: 0, top: 0, right: 1280, bottom: 720 };
    }
  };

  new TeachingToolsManager(canvas, {}, {});

  assert.deepEqual(
    imageSources,
    [],
    'constructing teaching tools should not request ruler or set-square images before the feature is opened'
  );
}

(function main() {
  testTeachingToolsModalSupportsDialogSemanticsAndRestoresFocusOnEscape();
  testTeachingToolsModalBackdropDismissalRestoresFocus();
  testTeachingToolsConstructorDefersHeavyImagesUntilUse();
  console.log('teaching-tools-modal-ux.test: all assertions passed');
})();
