const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

function createElementStub(id = '') {
  const listeners = new Map();
  return {
    id,
    tagName: 'DIV',
    type: '',
    accept: '',
    files: [],
    value: '',
    checked: false,
    dataset: {},
    style: {},
    classList: {
      add() {},
      remove() {}
    },
    parentNode: null,
    listeners,
    removed: false,
    clicked: false,
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
    click() {
      this.clicked = true;
    },
    remove() {
      this.removed = true;
      if (!this.parentNode) {
        return;
      }
      const index = this.parentNode.children.indexOf(this);
      if (index >= 0) {
        this.parentNode.children.splice(index, 1);
      }
      this.parentNode = null;
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

  const windowListeners = new Map();
  const document = {
    body,
    addEventListener() {},
    querySelector() {
      return null;
    },
    querySelectorAll() {
      return [];
    },
    createElement(tagName) {
      const element = createElementStub();
      element.tagName = String(tagName || '').toUpperCase();
      return element;
    },
    getElementById(id) {
      if (!elements.has(id)) {
        elements.set(id, createElementStub(id));
      }
      return elements.get(id);
    }
  };

  const window = {
    addEventListener(type, handler) {
      windowListeners.set(type, handler);
    },
    removeEventListener(type) {
      windowListeners.delete(type);
    },
    setTimeout,
    clearTimeout
  };

  return {
    document,
    window,
    windowListeners
  };
}

function loadRuntime(relativePath, globalName, { document, window }) {
  const source = fs.readFileSync(
    path.join(__dirname, '..', relativePath),
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
    localStorage: {
      getItem() {
        return null;
      },
      setItem() {},
      removeItem() {}
    }
  };

  vm.createContext(context);
  new vm.Script(source, { filename: path.basename(relativePath) }).runInContext(context);
  return context.window[globalName];
}

async function testProjectImportFilePickerAttachesToDom() {
  const { document, window } = createDomEnvironment();
  const runtime = loadRuntime(
    path.join('js', 'modules', 'event-setup-runtime.js'),
    'AboardEventSetupRuntime',
    { document, window }
  );

  let importedFile = null;
  let projectManagerLoads = 0;
  const board = {
    canvas: createElementStub('canvas'),
    drawingEngine: {
      currentTool: 'pen',
      isDrawing: false,
      isPanning: false,
      stampedImages: [],
      objectGroups: [],
      clearStrokes() {},
      clearVectorScene() {},
      setVectorPreviewVisible() {},
      startDrawing() {},
      startPanning() {},
      stopPanning() {},
      pan() {},
      draw() {},
      drawBatch() {}
    },
    settingsManager: {
      legacyProjectImportEnabled: true,
      updateToolbarTextVisibility() {}
    },
    historyManager: {
      undo() { return false; },
      redo() { return false; }
    },
    strokeControls: {
      isActive: false,
      hideControls() {}
    },
    selectionManager: {
      hasSelection() { return false; },
      isBoxSelecting: false,
      isLassoSelecting: false,
      startSelection() {},
      continueBoxSelection() {},
      continueLassoSelection() {},
      endBoxSelection() {},
      endLassoSelection() {}
    },
    shapeDrawingManager: {
      isDrawing: false,
      startDrawing() {},
      draw() {}
    },
    teachingToolsManager: {
      isInteracting: false
    },
    imageControls: {
      isActive: false
    },
    backgroundManager: {
      supportsMovableOrigin() { return false; }
    },
    insertTextManager: {
      clearTextObjects() {}
    },
    activePointers: new Map(),
    setupToolConfigListeners() {},
    setupKeyboardShortcuts() {},
    setupDraggablePanels() {},
    setupCanvasZoom() {},
    syncInteractiveOverlays() {},
    recalculateAndRecenterCanvas() {},
    applyZoom() {},
    positionConfigArea() {},
    repositionToolbarsOnResize() {},
    repositionModalsOnResize() {},
    positionCoordinatePointPanel() {},
    refreshAdaptiveEraserSize() {},
    handleDrawingComplete() {},
    stopDraggingCoordinateOrigin() {},
    scheduleRenderQualityUpdate() {},
    updateEraserCursor() {},
    showEraserCursor() {},
    hideEraserCursor() {},
    getProjectManager: async () => {
      projectManagerLoads += 1;
      return {
        async importProject(file) {
          importedFile = file;
        }
      };
    },
    showLazyLoadError() {
      throw new Error('showLazyLoadError should not be called');
    }
  };

  runtime.setupEventListeners(board);

  const importButton = document.getElementById('import-project-btn');
  const clickHandler = importButton.listeners.get('click');
  assert.equal(typeof clickHandler, 'function', 'import button should register a click handler');

  await clickHandler();

  assert.equal(document.body.children.length, 1, 'project import should append a file input to the DOM');
  const input = document.body.children[0];
  assert.equal(input.type, 'file');
  assert.equal(input.accept, '.zip,.aboard,.json');
  assert.equal(input.clicked, true, 'project import should trigger the file picker');

  const file = { name: 'lesson.zip' };
  input.files = [file];

  const changeHandler = input.listeners.get('change');
  assert.equal(typeof changeHandler, 'function', 'project import file input should listen for change events');

  await changeHandler({ target: input });

  assert.equal(projectManagerLoads, 1);
  assert.equal(importedFile, file);
  assert.equal(input.removed, true, 'project import should remove the temporary file input after use');
  assert.equal(document.body.children.length, 0);
}

async function testSettingsImportFilePickerAttachesToDom() {
  const { document, window } = createDomEnvironment();
  const importErrors = [];
  const runtime = loadRuntime(
    path.join('js', 'modules', 'ui-listeners-runtime.js'),
    'AboardUiListenersRuntime',
    { document, window }
  );

  let importedSettings = null;
  let importedDiff = null;
  const board = {
    settingsManager: {
      toastManager: {
        show(message, type) {
          importErrors.push({ message, type });
        }
      },
      getSettingsDiff(nextSettings) {
        importedDiff = { changedKeys: Object.keys(nextSettings) };
        return importedDiff;
      },
      validateImportedSettings(nextSettings) {
        return nextSettings;
      }
    },
    showConfigDiffModal(diff, nextSettings) {
      importedSettings = { diff, nextSettings };
    },
    closeSettings() {},
    updateZoomControlsVisibility() {},
    updateImportExportBtnVisibility() {},
    updateFullscreenBtnVisibility() {},
    applyCanvasSize() {},
    updatePatternGrid() {},
    getCacheSizeSummary: async () => ({ settings: 0, canvas: 0, other: 0 }),
    formatBytes(value) {
      return `${value} B`;
    },
    clearSelectedCache: async () => {},
    updateCacheSizeDisplay: async () => {}
  };

  runtime.setupSettingsListeners(board);

  const importButton = document.getElementById('import-config-btn');
  const clickHandler = importButton.listeners.get('click');
  assert.equal(typeof clickHandler, 'function', 'settings import button should register a click handler');

  await clickHandler();

  assert.equal(document.body.children.length, 1, 'settings import should append a file input to the DOM');
  const input = document.body.children[0];
  assert.equal(input.type, 'file');
  assert.equal(input.accept, '.json');
  assert.equal(input.clicked, true, 'settings import should trigger the file picker');

  const file = {
    async text() {
      return JSON.stringify({ language: 'en-US' });
    }
  };
  input.files = [file];

  const changeHandler = input.listeners.get('change');
  assert.equal(typeof changeHandler, 'function', 'settings import file input should listen for change events');

  await changeHandler({ target: input });

  assert.deepEqual(importedDiff, { changedKeys: ['language'] });
  assert.deepEqual(importedSettings?.diff, { changedKeys: ['language'] });
  assert.equal(importedSettings?.nextSettings?.language, 'en-US');
  assert.equal(input.removed, true, 'settings import should remove the temporary file input after use');
  assert.equal(document.body.children.length, 0);

  await clickHandler();
  const unreadableInput = document.body.children[0];
  unreadableInput.files = [{
    async text() {
      throw new Error('read failed');
    }
  }];

  await assert.doesNotReject(
    () => unreadableInput.listeners.get('change')({ target: unreadableInput }),
    'configuration read failures should be handled by the import flow'
  );
  assert.deepEqual(importErrors, [{ message: 'Invalid configuration file', type: 'error' }]);
  assert.equal(unreadableInput.removed, true,
    'failed configuration imports should still clean up the temporary file input');
}

async function run() {
  await testProjectImportFilePickerAttachesToDom();
  await testSettingsImportFilePickerAttachesToDom();
  console.log('file-picker-dom-attachment.test: all assertions passed');
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
