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
    width: 0,
    height: 0,
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

function createCanvasElement(ownerDocument, id) {
  const element = createElement(ownerDocument, id);
  element.getContext = () => ({
    setTransform() {},
    clearRect() {},
    beginPath() {},
    moveTo() {},
    lineTo() {},
    stroke() {},
    fill() {},
    closePath() {},
    quadraticCurveTo() {},
    setLineDash() {}
  });
  return element;
}

function createDocumentStub() {
  const elements = new Map();
  const selectors = new Map();
  const document = {
    activeElement: null,
    body: null,
    getElementById(id) {
      return elements.get(id) || null;
    },
    querySelector(selector) {
      return selectors.get(selector) || null;
    },
    registerElement(element) {
      if (element?.id) {
        elements.set(element.id, element);
      }
      return element;
    },
    setSelector(selector, element) {
      selectors.set(selector, element);
      return element;
    }
  };

  document.body = createElement(document, 'body');
  document.body.insertAdjacentHTML = () => {};
  return document;
}

function loadLineStyleModalClass() {
  const source = `${fs.readFileSync(path.join(__dirname, '..', 'js', 'modules', 'line-style-modal.js'), 'utf8')}\nwindow.__LineStyleModal = LineStyleModal;`;
  const document = createDocumentStub();
  const sandbox = {
    console,
    window: {
      requestAnimationFrame(callback) {
        callback();
      },
      innerWidth: 1280,
      innerHeight: 720,
      devicePixelRatio: 1,
      i18n: {
        t(key) {
          return key;
        },
        applyTranslations() {}
      }
    },
    document,
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
  vm.runInContext(source, sandbox, { filename: 'line-style-modal.js' });

  return {
    document,
    LineStyleModal: sandbox.window.__LineStyleModal
  };
}

function testMainLineStyleDialogRestoresFocusOnEscape() {
  const { document, LineStyleModal } = loadLineStyleModalClass();
  const proto = LineStyleModal.prototype;
  const modal = document.registerElement(createElement(document, 'line-style-modal'));
  const closeBtn = document.registerElement(createElement(document, 'line-style-modal-close'));
  const applyBtn = document.registerElement(createElement(document, 'line-style-modal-apply'));
  const activeStyleBtn = createElement(document, 'active-style-btn');
  const wavyBtn = createElement(document, 'wavy-style-btn');
  const trigger = createElement(document, 'line-style-trigger');

  document.setSelector('#modal-line-style-grid .line-style-type-btn.active', activeStyleBtn);
  document.setSelector('#modal-line-style-grid .line-style-type-btn[data-modal-line-style="wavy"]', wavyBtn);

  const manager = {
    modal,
    currentMode: 'pen',
    mainModalPreviouslyFocusedElement: null,
    loadCurrentSettings() {},
    updatePreview() {},
    getFocusableElement: proto.getFocusableElement,
    scheduleDialogFrame: proto.scheduleDialogFrame,
    configureDialog: proto.configureDialog,
    bindDialogDismissal: proto.bindDialogDismissal,
    show: proto.show,
    hide: proto.hide
  };

  trigger.focus();
  manager.configureDialog(modal, {
    labelledBy: 'line-style-modal-title',
    describedBy: 'line-style-preview-container'
  });
  manager.bindDialogDismissal(modal, () => manager.hide(), 'lineStyleBindingsInitialized');
  manager.show('pen');

  assert.equal(modal.getAttribute('role'), 'dialog');
  assert.equal(modal.getAttribute('aria-modal'), 'true');
  assert.equal(modal.getAttribute('aria-labelledby'), 'line-style-modal-title');
  assert.equal(modal.getAttribute('aria-describedby'), 'line-style-preview-container');
  assert.equal(modal.classList.contains('show'), true, 'show should reveal the line style dialog');
  assert.equal(wavyBtn.style.display, 'none', 'pen mode should hide the unsupported wavy option');
  assert.equal(document.activeElement, activeStyleBtn, 'show should focus the active line style choice');

  const escapeEvent = modal.trigger('keydown', { key: 'Escape' });

  assert.equal(escapeEvent.defaultPrevented, true, 'Escape should prevent default browser handling');
  assert.equal(modal.classList.contains('show'), false, 'Escape should close the line style dialog');
  assert.equal(document.activeElement, trigger, 'closing should restore focus to the opener');
}

function testExpandedPreviewDialogRestoresFocusOnEscape() {
  const { document, LineStyleModal } = loadLineStyleModalClass();
  const proto = LineStyleModal.prototype;
  const trigger = createElement(document, 'preview-expand-trigger');
  const dashDensity = document.registerElement(createElement(document, 'modal-dash-density-slider'));
  const waveDensity = document.registerElement(createElement(document, 'modal-wave-density-slider'));
  const lineCount = document.registerElement(createElement(document, 'modal-line-count-slider'));
  const lineSpacing = document.registerElement(createElement(document, 'modal-line-spacing-slider'));

  dashDensity.value = '50';
  waveDensity.value = '10';
  lineCount.value = '2';
  lineSpacing.value = '10';

  document.body.insertAdjacentHTML = () => {
    document.registerElement(createElement(document, 'line-style-preview-expanded-modal'));
    document.registerElement(createElement(document, 'expanded-preview-close'));
    document.registerElement(createElement(document, 'line-style-preview-expanded-title'));
    document.registerElement(createCanvasElement(document, 'expanded-preview-canvas'));
  };

  const manager = {
    currentMode: 'pen',
    expandedPreviewPreviouslyFocusedElement: null,
    drawingEngine: {
      penSize: 5
    },
    shapeDrawingManager: {
      drawingEngine: {
        penSize: 5
      }
    },
    getCurrentLineStyle() {
      return 'solid';
    },
    drawWavyPreview() {},
    drawMultiLinePreview() {},
    getFocusableElement: proto.getFocusableElement,
    scheduleDialogFrame: proto.scheduleDialogFrame,
    configureDialog: proto.configureDialog,
    bindDialogDismissal: proto.bindDialogDismissal,
    hideExpandedPreview: proto.hideExpandedPreview,
    showExpandedPreview: proto.showExpandedPreview
  };

  trigger.focus();
  manager.showExpandedPreview();

  const expandedModal = document.getElementById('line-style-preview-expanded-modal');
  const closeBtn = document.getElementById('expanded-preview-close');

  assert.ok(expandedModal, 'expanded preview modal should be created on demand');
  assert.equal(expandedModal.getAttribute('role'), 'dialog');
  assert.equal(expandedModal.getAttribute('aria-modal'), 'true');
  assert.equal(expandedModal.getAttribute('aria-labelledby'), 'line-style-preview-expanded-title');
  assert.equal(expandedModal.getAttribute('aria-describedby'), 'expanded-preview-canvas');
  assert.equal(expandedModal.classList.contains('show'), true, 'expanded preview should become visible');
  assert.equal(document.activeElement, closeBtn, 'expanded preview should focus its close button');

  const escapeEvent = expandedModal.trigger('keydown', { key: 'Escape' });

  assert.equal(escapeEvent.defaultPrevented, true, 'expanded preview Escape should prevent default handling');
  assert.equal(expandedModal.classList.contains('show'), false, 'Escape should close the expanded preview');
  assert.equal(document.activeElement, trigger, 'closing the expanded preview should restore focus to the opener');
}

(function main() {
  testMainLineStyleDialogRestoresFocusOnEscape();
  testExpandedPreviewDialogRestoresFocusOnEscape();
  console.log('line-style-modal-ux.test: all assertions passed');
})();
