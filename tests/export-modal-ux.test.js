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
    },
    toggle(value, force) {
      if (typeof force === 'boolean') {
        if (force) {
          tokens.add(value);
          return true;
        }
        tokens.delete(value);
        return false;
      }
      if (tokens.has(value)) {
        tokens.delete(value);
        return false;
      }
      tokens.add(value);
      return true;
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
    checked: false,
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
        stopPropagation() {},
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
  const selectors = new Map();
  const selectorAllMap = new Map();
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
      return selectorAllMap.get(selector) || [];
    },
    setQuerySelector(selector, element) {
      selectors.set(selector, element);
    },
    setQuerySelectorAll(selector, elementsForSelector) {
      selectorAllMap.set(selector, elementsForSelector);
    },
    registerElement(element) {
      if (element?.id) {
        elements.set(element.id, element);
      }
      return element;
    }
  };

  document.body = createElement(document, 'body');
  document.body.insertAdjacentHTML = () => {};
  return document;
}

function loadExportManagerClass() {
  const document = createDocumentStub();
  const sandbox = {
    console,
    window: {
      i18n: {
        t(key) {
          return key;
        },
        applyTranslations() {}
      },
      requestAnimationFrame(callback) {
        callback();
      },
      addEventListener() {},
      removeEventListener() {}
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
    Promise,
    parseInt,
    parseFloat,
    module: { exports: {} },
    exports: {}
  };

  sandbox.globalThis = sandbox;
  sandbox.self = sandbox;
  sandbox.window.document = document;

  const source = `${fs.readFileSync(path.join(__dirname, '..', 'js', 'export.js'), 'utf8')}\nwindow.__ExportManager = ExportManager;`;
  vm.createContext(sandbox);
  vm.runInContext(source, sandbox, { filename: 'export.js' });

  return {
    document,
    ExportManager: sandbox.window.__ExportManager
  };
}

function createHarness(document) {
  const exportModal = document.registerElement(createElement(document, 'export-modal'));
  const closeBtn = document.registerElement(createElement(document, 'export-close-btn'));
  const cancelBtn = document.registerElement(createElement(document, 'export-cancel-btn'));
  const confirmBtn = document.registerElement(createElement(document, 'export-confirm-btn'));
  const filenameInput = document.registerElement(createElement(document, 'export-filename'));
  const qualityGroup = document.registerElement(createElement(document, 'jpeg-quality-group'));
  const qualitySlider = document.registerElement(createElement(document, 'export-quality-slider'));
  const qualityValue = document.registerElement(createElement(document, 'export-quality-value'));
  const filenameHint = document.registerElement(createElement(document, 'export-filename-hint'));
  const filenameLabel = document.registerElement(createElement(document, 'filename-label'));
  const imageTabBtn = createElement(document, 'export-tab-image-btn');
  const projectTabBtn = createElement(document, 'export-tab-project-btn');
  const imagePanel = document.registerElement(createElement(document, 'export-tab-image'));
  const projectPanel = document.registerElement(createElement(document, 'export-tab-project'));
  const imageScopeCurrentBtn = createElement(document, 'export-image-scope-current-btn');
  const projectScopeCurrentBtn = createElement(document, 'export-project-scope-current-btn');

  imageTabBtn.classList.add('export-tab-btn', 'active');
  imageTabBtn.dataset.tab = 'image';
  projectTabBtn.classList.add('export-tab-btn');
  projectTabBtn.dataset.tab = 'project';
  imagePanel.classList.add('export-tab-content', 'active');
  projectPanel.classList.add('export-tab-content');
  imageScopeCurrentBtn.classList.add('export-scope-btn', 'active');
  imageScopeCurrentBtn.dataset.scope = 'current';
  projectScopeCurrentBtn.classList.add('export-project-scope-btn', 'active');
  projectScopeCurrentBtn.dataset.scope = 'current';

  qualitySlider.value = '90';
  qualityValue.textContent = '90';
  filenameInput.value = '';

  document.setQuerySelectorAll('.export-tab-btn', [imageTabBtn, projectTabBtn]);
  document.setQuerySelectorAll('.export-tab-content', [imagePanel, projectPanel]);
  document.setQuerySelectorAll('.export-scope-btn', [imageScopeCurrentBtn]);
  document.setQuerySelectorAll('.export-project-scope-btn', [projectScopeCurrentBtn]);
  document.setQuerySelectorAll('.export-format-btn', []);
  document.setQuerySelector('.export-tab-btn[data-tab="image"]', imageTabBtn);
  document.setQuerySelector('.export-scope-btn[data-scope="current"]', imageScopeCurrentBtn);
  document.setQuerySelector('.export-project-scope-btn[data-scope="current"]', projectScopeCurrentBtn);
  document.setQuerySelector('.page-selection-group', createElement(document, 'page-selection-group'));
  document.setQuerySelector('.page-selection-buttons', createElement(document, 'page-selection-buttons'));
  document.setQuerySelector('.project-page-selection-group', createElement(document, 'project-page-selection-group'));
  document.setQuerySelector('.project-page-selection-buttons', createElement(document, 'project-page-selection-buttons'));

  return {
    exportModal,
    closeBtn,
    cancelBtn,
    confirmBtn,
    filenameInput,
    qualityGroup,
    qualitySlider,
    qualityValue,
    filenameHint,
    filenameLabel,
    imageTabBtn,
    projectTabBtn,
    imagePanel,
    projectPanel
  };
}

function testExportModalTabsExposeAccessibleSemanticsAndFocusActiveTab() {
  const { document, ExportManager } = loadExportManagerClass();
  const harness = createHarness(document);
  const proto = ExportManager.prototype;
  const trigger = createElement(document, 'open-export-modal');

  const manager = {
    exportModal: harness.exportModal,
    drawingBoard: { currentPage: 1, pages: [{}, {}] },
    previouslyFocusedElement: null,
    refreshTranslations() {},
    updateUIForScope() {},
    closeModal: proto.closeModal,
    setupTabAccessibility: proto.setupTabAccessibility,
    setupEventListeners: proto.setupEventListeners,
    getTabButtons: proto.getTabButtons,
    getTabPanels: proto.getTabPanels,
    getActiveTabButton: proto.getActiveTabButton,
    activateTab: proto.activateTab,
    handleTabKeydown: proto.handleTabKeydown,
    showModal: proto.showModal
  };

  manager.setupTabAccessibility();

  assert.equal(harness.imageTabBtn.getAttribute('role'), 'tab');
  assert.equal(harness.projectTabBtn.getAttribute('role'), 'tab');
  assert.equal(harness.imagePanel.getAttribute('role'), 'tabpanel');
  assert.equal(harness.projectPanel.getAttribute('role'), 'tabpanel');
  assert.equal(harness.imageTabBtn.getAttribute('aria-selected'), 'true');
  assert.equal(harness.projectTabBtn.getAttribute('aria-selected'), 'false');
  assert.equal(harness.imagePanel.hidden, false, 'active export panel should remain visible');
  assert.equal(harness.projectPanel.hidden, true, 'inactive export panel should be hidden');

  trigger.focus();
  manager.showModal();

  assert.equal(harness.exportModal.classList.contains('show'), true, 'showModal should reveal the export dialog');
  assert.equal(document.activeElement, harness.imageTabBtn, 'opening should focus the active export tab');
}

function testExportModalTabsSupportArrowKeyNavigation() {
  const { document, ExportManager } = loadExportManagerClass();
  const harness = createHarness(document);
  const proto = ExportManager.prototype;

  const manager = {
    exportModal: harness.exportModal,
    drawingBoard: { currentPage: 1, pages: [{}, {}] },
    previouslyFocusedElement: null,
    refreshTranslations() {},
    updateUIForScope() {},
    setupTabAccessibility: proto.setupTabAccessibility,
    getTabButtons: proto.getTabButtons,
    getTabPanels: proto.getTabPanels,
    getActiveTabButton: proto.getActiveTabButton,
    activateTab: proto.activateTab,
    handleTabKeydown: proto.handleTabKeydown
  };

  manager.setupTabAccessibility();
  harness.imageTabBtn.focus();

  const keyEvent = harness.imageTabBtn.trigger('keydown', { key: 'ArrowRight' });

  assert.equal(keyEvent.defaultPrevented, true, 'Arrow key export tab navigation should prevent default browser handling');
  assert.equal(document.activeElement, harness.projectTabBtn, 'ArrowRight should move focus to the next export tab');
  assert.equal(harness.imageTabBtn.classList.contains('active'), false);
  assert.equal(harness.projectTabBtn.classList.contains('active'), true);
  assert.equal(harness.imageTabBtn.getAttribute('aria-selected'), 'false');
  assert.equal(harness.projectTabBtn.getAttribute('aria-selected'), 'true');
  assert.equal(harness.imagePanel.hidden, true, 'inactive image export panel should be hidden after switching tabs');
  assert.equal(harness.projectPanel.hidden, false, 'project export panel should become visible after switching tabs');
}

(function main() {
  testExportModalTabsExposeAccessibleSemanticsAndFocusActiveTab();
  testExportModalTabsSupportArrowKeyNavigation();
  console.log('export-modal-ux.test: all assertions passed');
})();
