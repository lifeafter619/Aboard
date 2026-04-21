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
  const querySelectorAllMap = new Map();
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
    hidden: false,
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
    },
    setQuerySelectorAll(selector, elements) {
      querySelectorAllMap.set(selector, elements);
    },
    querySelector(selector) {
      return (querySelectorAllMap.get(selector) || [])[0] || null;
    },
    querySelectorAll(selector) {
      return querySelectorAllMap.get(selector) || [];
    }
  };
}

function createDocumentStub() {
  const elements = new Map();
  const selectorAllMap = new Map();
  const document = {
    activeElement: null,
    body: null,
    getElementById(id) {
      return elements.get(id) || null;
    },
    querySelector(selector) {
      return (selectorAllMap.get(selector) || [])[0] || null;
    },
    querySelectorAll(selector) {
      return selectorAllMap.get(selector) || [];
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
  return document;
}

function loadTimeDisplaySettingsModalClass() {
  const document = createDocumentStub();
  const sandbox = {
    console,
    window: {
      requestAnimationFrame(callback) {
        callback();
      },
      drawingBoard: {
        syncResizableModalState() {}
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
    module: { exports: {} },
    exports: {}
  };

  sandbox.globalThis = sandbox;
  sandbox.self = sandbox;
  sandbox.window.document = document;

  const source = `${fs.readFileSync(path.join(__dirname, '..', 'js', 'modules', 'time-display-settings.js'), 'utf8')}\nwindow.__TimeDisplaySettingsModal = TimeDisplaySettingsModal;`;
  vm.createContext(sandbox);
  vm.runInContext(source, sandbox, { filename: 'time-display-settings.js' });

  return {
    document,
    TimeDisplaySettingsModal: sandbox.window.__TimeDisplaySettingsModal
  };
}

function createHarness(document) {
  const modal = document.registerElement(createElement(document, 'time-display-settings-modal'));
  const openBtn = document.registerElement(createElement(document, 'time-display-area-settings-btn'));
  const closeBtn = document.registerElement(createElement(document, 'time-display-settings-close-btn'));
  const widgetTab = createElement(document, 'time-display-tab-widget');
  const fullscreenTab = createElement(document, 'time-display-tab-fullscreen');
  const widgetPanel = createElement(document, 'td-tab-content-widget');
  const fullscreenPanel = createElement(document, 'td-tab-content-fullscreen');

  widgetTab.classList.add('timer-tab-btn', 'active');
  widgetTab.dataset.tab = 'widget';
  fullscreenTab.classList.add('timer-tab-btn');
  fullscreenTab.dataset.tab = 'fullscreen';
  widgetPanel.classList.add('td-tab-content', 'active');
  fullscreenPanel.classList.add('td-tab-content');

  modal.setQuerySelectorAll('.timer-tab-btn', [widgetTab, fullscreenTab]);
  modal.setQuerySelectorAll('.td-tab-content', [widgetPanel, fullscreenPanel]);

  [
    '.display-option-btn[data-td-display-type]',
    '.fullscreen-mode-btn[data-td-mode]',
    '.color-btn[data-td-time-color]',
    '.color-btn[data-td-time-bg-color]',
    '.color-btn[data-td-fs-color]',
    '.color-btn[data-td-fs-bg-color]'
  ].forEach((selector) => {
    document.setQuerySelectorAll(selector, []);
  });

  const timeDisplayManager = {
    showTime: true,
    showDate: true,
    timezone: 'Asia/Shanghai',
    timeFormat: '24h',
    dateFormat: 'yyyy-mm-dd',
    fontSize: 16,
    opacity: 100,
    timeColor: '#000000',
    bgColor: '#FFFFFF',
    fullscreenMode: 'double',
    fullscreenFontSize: 15,
    fullscreenColor: '#ffffff',
    fullscreenBgColor: '#000000',
    fullscreenOpacity: 95,
    updateDisplay() {}
  };

  return {
    modal,
    openBtn,
    closeBtn,
    widgetTab,
    fullscreenTab,
    widgetPanel,
    fullscreenPanel,
    timeDisplayManager
  };
}

function testTimeDisplaySettingsTabsExposeAccessibleSemanticsAndFocusActiveTab() {
  const { document, TimeDisplaySettingsModal } = loadTimeDisplaySettingsModalClass();
  const {
    modal,
    openBtn,
    widgetTab,
    fullscreenTab,
    widgetPanel,
    fullscreenPanel,
    timeDisplayManager
  } = createHarness(document);

  const instance = new TimeDisplaySettingsModal(timeDisplayManager);

  assert.equal(modal.getAttribute('role'), 'dialog');
  assert.equal(modal.getAttribute('aria-modal'), 'true');
  assert.equal(widgetTab.getAttribute('role'), 'tab');
  assert.equal(fullscreenTab.getAttribute('role'), 'tab');
  assert.equal(widgetPanel.getAttribute('role'), 'tabpanel');
  assert.equal(fullscreenPanel.getAttribute('role'), 'tabpanel');
  assert.equal(widgetTab.getAttribute('aria-selected'), 'true');
  assert.equal(fullscreenTab.getAttribute('aria-selected'), 'false');
  assert.equal(widgetPanel.hidden, false, 'active time display settings panel should remain visible');
  assert.equal(fullscreenPanel.hidden, true, 'inactive time display settings panel should be hidden');

  openBtn.focus();
  instance.show();

  assert.equal(modal.classList.contains('show'), true, 'show should reveal the time display settings dialog');
  assert.equal(document.activeElement, widgetTab, 'opening should focus the active settings tab');
}

function testTimeDisplaySettingsTabsSupportArrowKeyNavigation() {
  const { document, TimeDisplaySettingsModal } = loadTimeDisplaySettingsModalClass();
  const {
    widgetTab,
    fullscreenTab,
    widgetPanel,
    fullscreenPanel,
    timeDisplayManager
  } = createHarness(document);

  new TimeDisplaySettingsModal(timeDisplayManager);
  widgetTab.focus();

  const keyEvent = widgetTab.trigger('keydown', { key: 'ArrowRight' });

  assert.equal(keyEvent.defaultPrevented, true, 'Arrow key tab navigation should prevent default browser handling');
  assert.equal(document.activeElement, fullscreenTab, 'ArrowRight should move focus to the next tab');
  assert.equal(widgetTab.classList.contains('active'), false, 'previous tab should deactivate after keyboard navigation');
  assert.equal(fullscreenTab.classList.contains('active'), true, 'next tab should activate after keyboard navigation');
  assert.equal(widgetTab.getAttribute('aria-selected'), 'false');
  assert.equal(fullscreenTab.getAttribute('aria-selected'), 'true');
  assert.equal(widgetPanel.hidden, true, 'inactive widget settings panel should be hidden after switching tabs');
  assert.equal(fullscreenPanel.hidden, false, 'newly active fullscreen settings panel should become visible');
}

(function main() {
  testTimeDisplaySettingsTabsExposeAccessibleSemanticsAndFocusActiveTab();
  testTimeDisplaySettingsTabsSupportArrowKeyNavigation();
  console.log('time-display-settings-modal-ux.test: all assertions passed');
})();
