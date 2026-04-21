const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

function createElementStub({
  id = '',
  dataset = {},
  checked = false,
  value = '',
  style = {}
} = {}) {
  const listeners = new Map();
  const classTokens = new Set();
  return {
    id,
    dataset,
    checked,
    value,
    style,
    innerHTML: '',
    textContent: '',
    children: [],
    classList: {
      add(...tokens) {
        tokens.forEach((token) => classTokens.add(token));
      },
      remove(...tokens) {
        tokens.forEach((token) => classTokens.delete(token));
      },
      contains(token) {
        return classTokens.has(token);
      },
      toggle(token, force) {
        if (force === true) {
          classTokens.add(token);
          return true;
        }
        if (force === false) {
          classTokens.delete(token);
          return false;
        }
        if (classTokens.has(token)) {
          classTokens.delete(token);
          return false;
        }
        classTokens.add(token);
        return true;
      }
    },
    addEventListener(type, handler) {
      listeners.set(type, handler);
    },
    dispatch(type, extra = {}) {
      const handler = listeners.get(type);
      if (handler) {
        handler({ target: this, preventDefault() {}, dataTransfer: { setData() {}, effectAllowed: '', dropEffect: '' }, ...extra });
      }
    },
    appendChild(child) {
      this.children.push(child);
      return child;
    },
    insertBefore(child, before) {
      const beforeIndex = this.children.indexOf(before);
      if (beforeIndex === -1) {
        this.children.push(child);
      } else {
        this.children.splice(beforeIndex, 0, child);
      }
      return child;
    },
    querySelector() {
      return null;
    },
    querySelectorAll() {
      return [];
    },
    getBoundingClientRect() {
      return { top: 0, height: 40 };
    },
    setAttribute() {},
    remove() {}
  };
}

function createThrowingStorageRecorder() {
  const calls = [];
  return {
    calls,
    getItem(key) {
      calls.push(['getItem', key]);
      throw new Error('storage blocked');
    },
    setItem(key, value) {
      calls.push(['setItem', key, value]);
      throw new Error('storage blocked');
    },
    removeItem(key) {
      calls.push(['removeItem', key]);
      throw new Error('storage blocked');
    }
  };
}

function loadBackgroundManager({ localStorage, warnings = [] }) {
  const source = fs.readFileSync(
    path.join(__dirname, '..', 'js', 'background.js'),
    'utf8'
  ) + '\n;globalThis.__bgCustomizationResilienceExports = { BackgroundManager: window.AboardBackgroundManager || window.BackgroundManager };';

  const sandbox = {
    console: {
      warn(...args) {
        warnings.push(args.map(String).join(' '));
      },
      log() {},
      error() {}
    },
    window: {
      devicePixelRatio: 1,
      dispatchEvent() {},
      safeDeepClone(value) {
        return JSON.parse(JSON.stringify(value));
      }
    },
    document: {
      body: {
        contains() {
          return false;
        }
      },
      getElementById() {
        return null;
      },
      createElementNS() {
        return createElementStub();
      },
      createElement() {
        return createElementStub();
      }
    },
    localStorage,
    sessionStorage: {
      getItem() { return null; },
      setItem() {},
      removeItem() {}
    },
    setTimeout() { return 1; },
    clearTimeout() {},
    CustomEvent: class CustomEvent {
      constructor(type, init = {}) {
        this.type = type;
        this.detail = init.detail;
      }
    },
    Image: class FakeImage {
      set src(value) {
        this._src = value;
      }
    },
    Math,
    Number,
    String,
    Boolean,
    Array,
    Object,
    Set,
    Map,
    Date,
    parseInt,
    parseFloat,
    JSON
  };

  sandbox.globalThis = sandbox;
  sandbox.window.document = sandbox.document;
  vm.createContext(sandbox);
  vm.runInContext(source, sandbox, { filename: 'background.js' });
  return sandbox.__bgCustomizationResilienceExports.BackgroundManager;
}

function loadCollapsibleManager({ localStorage, warnings = [] }) {
  const source = fs.readFileSync(
    path.join(__dirname, '..', 'js', 'collapsible.js'),
    'utf8'
  ) + '\n;globalThis.__bgCustomizationResilienceExports = { CollapsibleManager: window.AboardCollapsibleManager || window.CollapsibleManager };';

  const sandbox = {
    console: {
      warn(...args) {
        warnings.push(args.map(String).join(' '));
      },
      log() {},
      error() {}
    },
    document: {
      readyState: 'complete',
      addEventListener() {},
      querySelectorAll() {
        return [];
      },
      createElement() {
        return createElementStub();
      }
    },
    window: {},
    localStorage,
    JSON,
    Math,
    Number,
    String,
    Boolean,
    Array,
    Object,
    Set,
    Map
  };

  sandbox.globalThis = sandbox;
  vm.createContext(sandbox);
  vm.runInContext(source, sandbox, { filename: 'collapsible.js' });
  return sandbox.__bgCustomizationResilienceExports.CollapsibleManager;
}

function loadCustomizationRuntime({ localStorage, warnings = [], document }) {
  const source = fs.readFileSync(
    path.join(__dirname, '..', 'js', 'modules', 'customization-runtime.js'),
    'utf8'
  ) + '\n;globalThis.__bgCustomizationResilienceExports = window.AboardCustomizationRuntime;';

  const sandbox = {
    console: {
      warn(...args) {
        warnings.push(args.map(String).join(' '));
      },
      log() {},
      error() {}
    },
    window: {
      getComputedStyle(element) {
        return { display: element?.style?.display || 'flex' };
      }
    },
    document,
    localStorage,
    Math,
    Number,
    String,
    Boolean,
    Array,
    Object,
    Set,
    Map,
    JSON
  };

  sandbox.globalThis = sandbox;
  vm.createContext(sandbox);
  vm.runInContext(source, sandbox, { filename: 'customization-runtime.js' });
  return sandbox.__bgCustomizationResilienceExports;
}

function testBackgroundManagerSurvivesBlockedLocalStorage() {
  const warnings = [];
  const storage = createThrowingStorageRecorder();
  const BackgroundManager = loadBackgroundManager({ localStorage: storage, warnings });
  const bgCanvas = { width: 1280, height: 720, clientWidth: 1280, clientHeight: 720, style: {} };
  const bgCtx = { clearRect() {}, fillRect() {}, save() {}, restore() {} };

  const manager = new BackgroundManager(bgCanvas, bgCtx);
  manager.drawBackground = () => {};
  manager.renderCoordinateOverlay = () => {};
  manager.emitBackgroundUiState = () => {};
  manager.supportsMovableOrigin = () => true;

  assert.equal(manager.backgroundColor, '#ffffff', 'background manager should fall back to default background color');
  assert.equal(manager.backgroundPattern, 'blank', 'background manager should fall back to default background pattern');
  assert.equal(manager.patternDensity, 1, 'background manager should fall back to default pattern density');
  assert.equal(manager.backgroundImageData, null, 'background manager should fall back to no background image');
  assert.doesNotThrow(() => manager.setBackgroundColor('#123456'), 'background color changes should degrade instead of throwing');
  assert.doesNotThrow(() => manager.setPatternDensity(1.5), 'pattern density changes should degrade instead of throwing');
  assert.doesNotThrow(() => manager.setCoordinateOverlayState({ points: [{ id: 'p1', x: 1, y: 2 }] }), 'overlay state changes should degrade instead of throwing');
  assert.doesNotThrow(() => manager.setCoordinateOrigin(12, 24), 'coordinate origin changes should degrade instead of throwing');
  assert.doesNotThrow(() => manager.clearBackgroundImage(), 'background image clearing should degrade instead of throwing');
  assert.ok(
    warnings.some((entry) => entry.includes('background') && entry.includes('localStorage')),
    'background manager storage failures should emit warnings'
  );
}

function testCollapsibleManagerSurvivesBlockedLocalStorage() {
  const warnings = [];
  const storage = createThrowingStorageRecorder();
  const CollapsibleManager = loadCollapsibleManager({ localStorage: storage, warnings });
  const manager = new CollapsibleManager();

  assert.deepEqual(
    { ...manager.collapsedState },
    { default: true },
    'collapsible manager should fall back to the default collapsed state'
  );
  assert.doesNotThrow(() => manager.saveCollapsedState(), 'collapsed state persistence should degrade instead of throwing');
  assert.ok(
    warnings.some((entry) => entry.includes('collapsed') && entry.includes('localStorage')),
    'collapsible manager storage failures should emit warnings'
  );
}

function testCustomizationRuntimeSurvivesBlockedLocalStorage() {
  const warnings = [];
  const storage = createThrowingStorageRecorder();
  const toolbarItems = ['pen', 'eraser'].map((tool) => {
    const checkbox = createElementStub({ checked: true });
    return {
      dataset: { tool },
      classList: { add() {}, remove() {} },
      addEventListener() {},
      querySelector(selector) {
        if (selector === 'input[type="checkbox"]') {
          return checkbox;
        }
        return null;
      }
    };
  });
  const controlItems = ['zoom', 'fullscreen'].map((control) => ({
    dataset: { control },
    classList: { add() {}, remove() {} },
    addEventListener() {}
  }));
  const elements = {
    'toolbar-customization-list': {
      querySelectorAll(selector) {
        return selector === '.toolbar-item' ? toolbarItems : [];
      }
    },
    'toolbar': {
      appendChild() {}
    },
    'control-button-list': {
      querySelectorAll(selector) {
        return selector === '.control-button-item' ? controlItems : [];
      }
    },
    'history-controls': {
      appendChild() {},
      children: [createElementStub({ style: { display: 'flex' } })],
      style: {}
    },
    'zoom-out-btn': createElementStub({ style: {} }),
    'zoom-input': createElementStub({ style: {} }),
    'zoom-in-btn': createElementStub({ style: {} }),
    'pagination-controls': createElementStub({ style: {} }),
    'time-display': createElementStub(),
    'time-display-area': createElementStub({ style: {} }),
    'fullscreen-btn': createElementStub({ style: {} }),
    'import-project-btn': createElementStub({ style: {} }),
    'export-btn-top': createElementStub({ style: {} }),
    'control-show-zoom': createElementStub(),
    'control-show-pagination': createElementStub(),
    'control-show-time': createElementStub(),
    'control-show-fullscreen': createElementStub(),
    'control-show-import': createElementStub(),
    'control-show-export': createElementStub()
  };

  const document = {
    getElementById(id) {
      return elements[id] || null;
    },
    querySelectorAll(selector) {
      if (selector === '#toolbar-customization-list .toolbar-item') {
        return toolbarItems;
      }
      return [];
    }
  };

  const runtime = loadCustomizationRuntime({
    localStorage: storage,
    warnings,
    document
  });

  const board = {
    reorderToolbarItems() {},
    applyToolbarVisibility() {},
    applyToolbarOrder() {},
    initControlButtonDragDrop() {},
    reorderControlButtonList() {},
    reorderControlButtons() {},
    applyControlButtonVisibility() {},
    saveControlButtonOrder() {}
  };

  assert.doesNotThrow(() => runtime.initToolbarCustomization(board), 'toolbar customization init should degrade instead of throwing');
  assert.doesNotThrow(() => runtime.saveToolbarOrder(board), 'toolbar order persistence should degrade instead of throwing');
  assert.doesNotThrow(() => runtime.saveToolbarVisibility(board), 'toolbar visibility persistence should degrade instead of throwing');
  assert.doesNotThrow(() => runtime.initControlButtonSettings(board), 'control button settings init should degrade instead of throwing');
  assert.doesNotThrow(() => runtime.saveControlButtonOrder(board), 'control button order persistence should degrade instead of throwing');
  assert.doesNotThrow(() => runtime.applyControlButtonVisibility(board), 'control button visibility should degrade instead of throwing');
  assert.ok(
    warnings.some((entry) => entry.includes('toolbar') && entry.includes('localStorage'))
      && warnings.some((entry) => entry.includes('control button') && entry.includes('localStorage')),
    'customization runtime storage failures should emit warnings'
  );
}

(function main() {
  testBackgroundManagerSurvivesBlockedLocalStorage();
  testCollapsibleManagerSurvivesBlockedLocalStorage();
  testCustomizationRuntimeSurvivesBlockedLocalStorage();
  console.log('background-customization-resilience.test: all assertions passed');
})();
