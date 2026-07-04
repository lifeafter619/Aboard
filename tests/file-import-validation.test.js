const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

function createElementStub(tagName = 'div') {
  const listeners = new Map();
  return {
    tagName: String(tagName).toUpperCase(),
    children: [],
    files: [],
    style: {},
    dataset: {},
    classList: {
      add() {},
      remove() {},
      toggle() {}
    },
    addEventListener(type, handler) {
      const handlers = listeners.get(type) || [];
      handlers.push(handler);
      listeners.set(type, handlers);
    },
    removeEventListener() {},
    appendChild(child) {
      this.children.push(child);
      return child;
    },
    querySelector() {
      return null;
    },
    querySelectorAll() {
      return [];
    },
    setAttribute() {},
    trigger(type, event = {}) {
      const normalizedEvent = {
        target: this,
        currentTarget: this,
        preventDefault() {},
        stopPropagation() {},
        ...event
      };
      (listeners.get(type) || []).forEach((handler) => handler(normalizedEvent));
    }
  };
}

function createValidationStub(toasts) {
  const rejectOversized = (file) => {
    if (file?.size > 10) {
      throw new Error('Selected file is too large.');
    }
  };

  return {
    validateImageFile: rejectOversized,
    validateGifFile: rejectOversized,
    showValidationError(error, { toast } = {}) {
      (toast || { show() {} }).show(error.message, 'error');
      toasts.push(error.message);
    }
  };
}

function createFileReaderCounter() {
  const counter = { reads: 0 };
  class CountingFileReader {
    readAsDataURL() {
      counter.reads += 1;
      this.onload?.({ target: { result: 'data:image/png;base64,AAA' } });
    }
  }
  return { counter, FileReader: CountingFileReader };
}

function testBackgroundImageUploadRejectsInvalidFileBeforeReading() {
  const uploadInput = createElementStub('input');
  const toasts = [];
  const { counter, FileReader } = createFileReaderCounter();
  const context = {
    window: {
      AboardFileValidation: createValidationStub(toasts),
      i18n: null,
      addEventListener() {},
      removeEventListener() {},
      toastManager: {
        show(message, type) {
          toasts.push(`${type}:${message}`);
        }
      }
    },
    document: {
      getElementById(id) {
        return id === 'bg-image-upload' ? uploadInput : null;
      },
      querySelector() {
        return null;
      },
      querySelectorAll() {
        return [];
      }
    },
    FileReader,
    console: { warn() {}, error() {}, log() {} },
    parseInt,
    Number,
    Math,
    String,
    Array,
    Object,
    JSON
  };
  context.globalThis = context;
  context.self = context;

  vm.createContext(context);
  vm.runInContext(
    fs.readFileSync(path.join(__dirname, '..', 'js', 'modules', 'ui-listeners-runtime.js'), 'utf8'),
    context,
    { filename: 'ui-listeners-runtime.js' }
  );

  const board = {
    settingsManager: {
      infiniteCanvas: false,
      toastManager: {
        show(message, type) {
          toasts.push(`${type}:${message}`);
        }
      }
    },
    backgroundManager: {},
    imageControls: {},
    updateBackgroundUI() {},
    savePageBackground() {},
    setCoordinatePointMode() {},
    syncCoordinateExpressionDisplay() {}
  };
  context.window.AboardUiListenersRuntime.setupBackgroundToolConfigListeners(board);

  uploadInput.files = [{ name: 'huge.png', type: 'image/png', size: 11 }];
  uploadInput.trigger('change');

  assert.equal(counter.reads, 0, 'invalid background images should be rejected before FileReader reads them');
  assert.ok(
    toasts.some((message) => message.includes('Selected file is too large.')),
    'invalid background images should show a validation error'
  );
}

function testInsertImageRejectsInvalidFileBeforeReading() {
  const toasts = [];
  const { counter, FileReader } = createFileReaderCounter();
  const context = {
    window: {
      AboardFileValidation: createValidationStub(toasts),
      drawingBoard: {
        settingsManager: {
          toastManager: {
            show(message, type) {
              toasts.push(`${type}:${message}`);
            }
          }
        }
      },
      i18n: null
    },
    document: {
      createElement() {
        return createElementStub();
      },
      body: {
        appendChild() {},
        insertAdjacentHTML() {}
      },
      getElementById() {
        return createElementStub();
      },
      addEventListener() {}
    },
    FileReader,
    Image: class FakeImage {},
    console: { warn() {}, error() {}, log() {} },
    Math,
    Number,
    String,
    Object,
    Array,
    JSON
  };
  context.globalThis = context;
  context.self = context;

  vm.createContext(context);
  vm.runInContext(
    `${fs.readFileSync(path.join(__dirname, '..', 'js', 'insert-image.js'), 'utf8')}\nwindow.__InsertImageManager = InsertImageManager;`,
    context,
    { filename: 'insert-image.js' }
  );

  context.window.__InsertImageManager.prototype.loadImage.call({}, {
    name: 'huge.jpg',
    type: 'image/jpeg',
    size: 11
  });

  assert.equal(counter.reads, 0, 'invalid inserted images should be rejected before FileReader reads them');
}

function testFloatingGifRejectsInvalidFileBeforeReading() {
  const layer = createElementStub('div');
  const toasts = [];
  const { counter, FileReader } = createFileReaderCounter();
  const context = {
    window: {
      AboardFileValidation: createValidationStub(toasts),
      i18n: null,
      addEventListener() {},
      innerWidth: 1280,
      innerHeight: 720,
      drawingBoard: {
        settingsManager: {
          toastManager: {
            show(message, type) {
              toasts.push(`${type}:${message}`);
            }
          }
        }
      }
    },
    document: {
      getElementById(id) {
        return id === 'gif-layer' ? layer : null;
      },
      createElement: createElementStub,
      addEventListener() {},
      removeEventListener() {}
    },
    localStorage: {
      getItem() {
        return null;
      },
      setItem() {}
    },
    File: class FakeFile {
      constructor(name, type, size) {
        this.name = name;
        this.type = type;
        this.size = size;
      }
    },
    FileReader,
    console: { warn() {}, error() {}, log() {} },
    parseInt,
    Math,
    Number,
    String,
    Object,
    Array,
    Map,
    JSON
  };
  context.globalThis = context;
  context.self = context;

  vm.createContext(context);
  const gifManagerSource = fs
    .readFileSync(path.join(__dirname, '..', 'js', 'features', 'media', 'gif-manager.js'), 'utf8')
    .replace(/^export class GifManager/m, 'class GifManager')
    .replace(/^export function registerGifManagerGlobal/m, 'function registerGifManagerGlobal');
  vm.runInContext(
    `${gifManagerSource}\nregisterGifManagerGlobal(window, document);`,
    context,
    { filename: 'gif-manager.js' }
  );

  const file = new context.File('huge.gif', 'image/gif', 11);
  context.window.GifManager.addFloatingGif(file);

  assert.equal(counter.reads, 0, 'invalid GIFs should be rejected before FileReader reads them');
  assert.equal(layer.children.length, 0, 'invalid GIFs should not create floating containers');
}

function main() {
  testBackgroundImageUploadRejectsInvalidFileBeforeReading();
  testInsertImageRejectsInvalidFileBeforeReading();
  testFloatingGifRejectsInvalidFileBeforeReading();
  console.log('file-import-validation.test: all assertions passed');
}

main();
