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
      const shouldAdd = force === undefined ? !tokens.has(value) : Boolean(force);
      if (shouldAdd) {
        tokens.add(value);
      } else {
        tokens.delete(value);
      }
      return shouldAdd;
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
  const selectorLists = new Map();
  const document = {
    activeElement: null,
    body: null,
    getElementById(id) {
      return elements.get(id) || null;
    },
    querySelector(selector) {
      return selectors.get(selector) || null;
    },
    querySelectorAll(selector) {
      return selectorLists.get(selector) || [];
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
    },
    setSelectorAll(selector, list) {
      selectorLists.set(selector, list);
      return list;
    }
  };

  document.body = createElement(document, 'body');
  document.body.insertAdjacentHTML = () => {};
  return document;
}

function registerLineStyleModalElements(document) {
  const modal = document.registerElement(createElement(document, 'line-style-modal'));
  const closeBtn = document.registerElement(createElement(document, 'line-style-modal-close'));
  const applyBtn = document.registerElement(createElement(document, 'line-style-modal-apply'));
  const previewContainer = document.registerElement(createElement(document, 'line-style-preview-container'));
  const previewCanvas = document.registerElement(createCanvasElement(document, 'line-style-preview-canvas'));
  const expandBtn = document.registerElement(createElement(document, 'preview-expand-btn'));
  const settings = document.registerElement(createElement(document, 'modal-line-style-settings'));
  const dashSetting = document.registerElement(createElement(document, 'modal-dash-density-setting'));
  const waveSetting = document.registerElement(createElement(document, 'modal-wave-density-setting'));
  const lineCountSetting = document.registerElement(createElement(document, 'modal-line-count-setting'));
  const lineSpacingSetting = document.registerElement(createElement(document, 'modal-line-spacing-setting'));
  const dashSlider = document.registerElement(createElement(document, 'modal-dash-density-slider'));
  const dashValue = document.registerElement(createElement(document, 'modal-dash-density-value'));
  const waveSlider = document.registerElement(createElement(document, 'modal-wave-density-slider'));
  const waveValue = document.registerElement(createElement(document, 'modal-wave-density-value'));
  const lineCountSlider = document.registerElement(createElement(document, 'modal-line-count-slider'));
  const lineCountValue = document.registerElement(createElement(document, 'modal-line-count-value'));
  const lineSpacingSlider = document.registerElement(createElement(document, 'modal-line-spacing-slider'));
  const lineSpacingValue = document.registerElement(createElement(document, 'modal-line-spacing-value'));
  const styleButtons = ['solid', 'dashed', 'dotted', 'wavy', 'multi'].map((style) => {
    const button = createElement(document, `line-style-${style}-btn`);
    button.dataset.modalLineStyle = style;
    return button;
  });

  dashSlider.value = '50';
  waveSlider.value = '10';
  lineCountSlider.value = '2';
  lineSpacingSlider.value = '10';

  document.setSelectorAll('#modal-line-style-grid .line-style-type-btn', styleButtons);
  document.setSelector('#modal-line-style-grid .line-style-type-btn.active', styleButtons[0]);
  document.setSelector('#modal-line-style-grid .line-style-type-btn[data-modal-line-style="wavy"]', styleButtons[3]);

  return {
    modal,
    closeBtn,
    applyBtn,
    previewContainer,
    previewCanvas,
    expandBtn,
    settings,
    dashSetting,
    waveSetting,
    lineCountSetting,
    lineSpacingSetting,
    styleButtons
  };
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
    ensureModalReady() {
      return modal;
    },
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

function testLineStyleModalDefersDomUntilShown() {
  const { document, LineStyleModal } = loadLineStyleModalClass();
  let insertedCount = 0;
  document.body.insertAdjacentHTML = () => {
    insertedCount += 1;
    registerLineStyleModalElements(document);
  };

  const manager = new LineStyleModal(
    {
      penLineStyle: 'solid',
      penDashDensity: 50,
      penMultiLineSpacing: 10,
      penMultiLineCount: 2,
      penSize: 5
    },
    {
      lineStyle: 'solid',
      dashDensity: 50,
      waveDensity: 10,
      multiLineSpacing: 10,
      multiLineCount: 2,
      drawingEngine: {
        penSize: 5
      }
    }
  );

  assert.equal(insertedCount, 0, 'constructor should not insert the line style modal DOM');
  assert.equal(document.getElementById('line-style-modal'), null, 'constructor should not create modal elements');
  assert.equal(manager.previewCanvas, null, 'constructor should not request preview canvas references');

  manager.show('pen');

  assert.equal(insertedCount, 1, 'show should create the modal on first use');
  assert.equal(manager.modal, document.getElementById('line-style-modal'));
  assert.ok(manager.previewCanvas, 'show should initialize the preview canvas');
  assert.equal(manager.modal.classList.contains('show'), true, 'show should reveal the lazily-created modal');

  manager.hide();
  manager.show('shape');

  assert.equal(insertedCount, 1, 'subsequent show calls should reuse the same modal DOM');
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
  testLineStyleModalDefersDomUntilShown();
  testExpandedPreviewDialogRestoresFocusOnEscape();
  console.log('line-style-modal-ux.test: all assertions passed');
})();
