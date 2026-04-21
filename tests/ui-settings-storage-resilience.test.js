const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

function createElementStub(id = '') {
  const listeners = new Map();
  return {
    id,
    checked: false,
    value: '',
    dataset: {},
    style: {},
    classList: {
      add() {},
      remove() {},
      toggle() {}
    },
    listeners,
    addEventListener(type, handler) {
      listeners.set(type, handler);
    },
    removeEventListener(type) {
      listeners.delete(type);
    },
    setAttribute() {},
    closest() {
      return null;
    },
    click() {},
    querySelector() {
      return null;
    },
    querySelectorAll() {
      return [];
    }
  };
}

function createDomEnvironment() {
  const elements = new Map();
  const body = {
    children: [],
    appendChild(element) {
      element.parentNode = body;
      body.children.push(element);
      return element;
    }
  };

  const document = {
    body,
    addEventListener() {},
    querySelector() {
      return null;
    },
    querySelectorAll(selector) {
      if (selector === '.position-option-btn' || selector === '.update-preference-option-btn' || selector === '.canvas-preset-btn' || selector === '.color-btn[data-theme-color]' || selector === '.pattern-pref-checkbox') {
        return [];
      }
      return [];
    },
    createElement() {
      return createElementStub();
    },
    getElementById(id) {
      if (!elements.has(id)) {
        elements.set(id, createElementStub(id));
      }
      return elements.get(id);
    }
  };

  const window = {
    addEventListener() {},
    removeEventListener() {},
    setTimeout,
    clearTimeout,
    i18n: {
      t(key) {
        return key;
      },
      syncGenericColorControls() {}
    },
    appDialog: {
      async showConfirm() {
        return { confirmed: false, selectedValues: [] };
      },
      showAlert() {}
    }
  };

  return { document, window };
}

function createThrowingStorageRecorder() {
  return {
    getItem() {
      throw new Error('storage blocked');
    },
    setItem() {
      throw new Error('storage blocked');
    },
    removeItem() {
      throw new Error('storage blocked');
    }
  };
}

function loadRuntime({ document, window, localStorage }) {
  const source = fs.readFileSync(
    path.join(__dirname, '..', 'js', 'modules', 'ui-listeners-runtime.js'),
    'utf8'
  );

  const context = {
    window,
    document,
    console,
    setTimeout,
    clearTimeout,
    parseInt,
    Promise,
    Error,
    localStorage
  };

  vm.createContext(context);
  new vm.Script(source, { filename: 'ui-listeners-runtime.js' }).runInContext(context);
  return context.window.AboardUiListenersRuntime;
}

function createBoard() {
  const calls = {
    updateMaxCanvasScale: 0,
    updateZoomControlsVisibility: 0,
    updateImportExportBtnVisibility: 0,
    updateFullscreenBtnVisibility: 0,
    setters: []
  };

  const settingsManager = {
    edgeSnapEnabled: true,
    touchZoomEnabled: true,
    unlimitedZoom: false,
    showZoomControls: true,
    showImportExportBtn: true,
    showFullscreenBtn: true,
    keepMorePanelOpen: true,
    setUpdatePreference() {},
    setLegacyProjectImportEnabled() {},
    setGlobalFont() {},
    setCanvasSize() {},
    setShowToolbarText() {},
    setThemeColor() {},
    exportSettings() {},
    getSettingsDiff() {
      return {};
    },
    setEdgeSnapEnabled(value) {
      this.edgeSnapEnabled = value;
      calls.setters.push(['edgeSnap', value]);
    },
    setTouchZoomEnabled(value) {
      this.touchZoomEnabled = value;
      calls.setters.push(['touchZoom', value]);
    },
    setUnlimitedZoom(value) {
      this.unlimitedZoom = value;
      calls.setters.push(['unlimitedZoom', value]);
    },
    setShowZoomControls(value) {
      this.showZoomControls = value;
      calls.setters.push(['showZoomControls', value]);
    },
    setShowImportExportBtn(value) {
      this.showImportExportBtn = value;
      calls.setters.push(['showImportExportBtn', value]);
    },
    setShowFullscreenBtn(value) {
      this.showFullscreenBtn = value;
      calls.setters.push(['showFullscreenBtn', value]);
    },
    setKeepMorePanelOpen(value) {
      this.keepMorePanelOpen = value;
      calls.setters.push(['keepMorePanelOpen', value]);
    }
  };

  return {
    board: {
      settingsManager,
      closeSettings() {},
      updateZoomControlsVisibility() {
        calls.updateZoomControlsVisibility += 1;
      },
      updateImportExportBtnVisibility() {
        calls.updateImportExportBtnVisibility += 1;
      },
      updateFullscreenBtnVisibility() {
        calls.updateFullscreenBtnVisibility += 1;
      },
      applyCanvasSize() {},
      updatePatternGrid() {},
      getCacheSizeSummary: async () => ({ settings: 0, canvas: 0, other: 0 }),
      formatBytes(value) {
        return `${value} B`;
      },
      clearSelectedCache: async () => {},
      updateCacheSizeDisplay: async () => {},
      showConfigDiffModal() {},
      updateMaxCanvasScale() {
        calls.updateMaxCanvasScale += 1;
      }
    },
    calls
  };
}

function testSettingsTogglesSurviveBlockedStorage() {
  const { document, window } = createDomEnvironment();
  const runtime = loadRuntime({
    document,
    window,
    localStorage: createThrowingStorageRecorder()
  });
  const { board, calls } = createBoard();

  runtime.setupSettingsListeners(board);

  const triggerChange = (id, checked) => {
    const element = document.getElementById(id);
    element.checked = checked;
    const handler = element.listeners.get('change');
    assert.equal(typeof handler, 'function', `${id} should register a change handler`);
    return () => handler({ target: element });
  };

  assert.doesNotThrow(triggerChange('edge-snap-checkbox', false));
  assert.doesNotThrow(triggerChange('touch-zoom-checkbox', false));
  assert.doesNotThrow(triggerChange('unlimited-zoom-checkbox', true));
  assert.doesNotThrow(triggerChange('show-zoom-controls-checkbox', false));
  assert.doesNotThrow(triggerChange('show-import-export-btn-checkbox', false));
  assert.doesNotThrow(triggerChange('show-fullscreen-btn-checkbox', false));
  assert.doesNotThrow(triggerChange('keep-more-panel-open-checkbox', false));

  assert.deepEqual(calls.setters, [
    ['edgeSnap', false],
    ['touchZoom', false],
    ['unlimitedZoom', true],
    ['showZoomControls', false],
    ['showImportExportBtn', false],
    ['showFullscreenBtn', false],
    ['keepMorePanelOpen', false]
  ]);
  assert.equal(calls.updateMaxCanvasScale, 1);
  assert.equal(calls.updateZoomControlsVisibility, 1);
  assert.equal(calls.updateImportExportBtnVisibility, 1);
  assert.equal(calls.updateFullscreenBtnVisibility, 1);
}

(function main() {
  testSettingsTogglesSurviveBlockedStorage();
  console.log('ui-settings-storage-resilience.test: all assertions passed');
})();
