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
      child.parentNode = this;
      this.children.push(child);
      return child;
    },
    remove() {
      if (!this.parentNode) return;
      const index = this.parentNode.children.indexOf(this);
      if (index >= 0) this.parentNode.children.splice(index, 1);
      this.parentNode = null;
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

function testInsertImageDecodeFailureIsVisibleToTheUser() {
  const toasts = [];
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
      i18n: {
        t(key) {
          return key === 'errors.fileReadFailed' ? 'The image is damaged.' : key;
        }
      }
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
    FileReader: class SuccessfulFileReader {
      readAsDataURL() {
        this.onload?.({ target: { result: 'data:image/png;base64,broken' } });
      }
    },
    Image: class BrokenImage {
      set src(_value) {
        this.onerror?.(new Error('decode failed'));
      }
    },
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
    name: 'damaged.png',
    type: 'image/png',
    size: 4
  });

  assert.ok(
    toasts.some((message) => message.includes('The image is damaged.')),
    'image decode failures should show a user-visible error'
  );
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

async function testFloatingGifReadFailureRemovesTheEmptyContainer() {
  const layer = createElementStub('div');
  const toasts = [];
  let pendingReader = null;
  const context = {
    window: {
      AboardFileValidation: createValidationStub(toasts),
      i18n: {
        t(key) {
          return key === 'errors.fileReadFailed' ? 'The GIF could not be read.' : key;
        }
      },
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
    FileReader: class FailingFileReader {
      constructor() {
        pendingReader = this;
      }
      readAsDataURL() {}
    },
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

  const file = new context.File('damaged.gif', 'image/gif', 4);
  const id = context.window.GifManager.addFloatingGif(file);
  assert.equal(layer.children.length, 1, 'a pending GIF read may create one temporary container');

  pendingReader.error = new Error('read failed');
  pendingReader.onerror?.();

  assert.equal(context.window.GifManager.gifs.has(id), false, 'failed GIF state should be removed');
  assert.equal(layer.children.length, 0, 'failed GIF containers should not remain on the board');
  assert.ok(toasts.some((message) => message.includes('The GIF could not be read.')));

  const decoderId = 'gif-decoder-failure';
  const decoderContainer = createElementStub('div');
  layer.appendChild(decoderContainer);
  context.window.GifManager.gifs.set(decoderId, {
    container: decoderContainer,
    src: 'data:image/gif;base64,broken',
    loopCount: 0,
    isPlaying: true,
    controls: {}
  });
  context.window.SuperGif = class ThrowingGifDecoder {
    constructor() {
      throw new Error('decoder initialization failed');
    }
  };

  await context.window.GifManager._initSuperGif(
    createElementStub('img'),
    decoderContainer,
    decoderId,
    {}
  );

  assert.equal(context.window.GifManager.gifs.has(decoderId), false, 'decoder initialization failures should remove GIF state');
  assert.equal(layer.children.length, 0, 'decoder initialization failures should remove the GIF container');

  const parseId = 'gif-parse-failure';
  const parseContainer = createElementStub('div');
  layer.appendChild(parseContainer);
  context.window.GifManager.gifs.set(parseId, {
    container: parseContainer,
    src: 'data:image/gif;base64,broken',
    loopCount: 0,
    isPlaying: true,
    controls: {}
  });
  let decoderOptions = null;
  context.window.SuperGif = class CallbackGifDecoder {
    constructor(options) {
      decoderOptions = options;
    }
    load() {}
    pause() {}
  };

  await context.window.GifManager._initSuperGif(
    createElementStub('img'),
    parseContainer,
    parseId,
    {}
  );

  assert.equal(typeof decoderOptions?.on_error, 'function', 'the GIF decoder should expose parse failures to its manager');
  decoderOptions.on_error('parse');
  assert.equal(context.window.GifManager.gifs.has(parseId), false, 'asynchronous parse failures should remove GIF state');
  assert.equal(layer.children.length, 0, 'asynchronous parse failures should remove the GIF container');
}

async function testCustomFontIsValidatedBeforePersistence() {
  const toasts = [];
  const storageWrites = [];
  const context = {
    window: {
      i18n: {
        t(key) {
          return key === 'errors.fileReadFailed' ? 'The font is damaged.' : key;
        }
      }
    },
    document: {
      getElementById() {
        return null;
      },
      fonts: {
        add() {}
      }
    },
    localStorage: {
      getItem() {
        return null;
      },
      setItem(key, value) {
        storageWrites.push({ key, value });
      },
      removeItem() {}
    },
    FileReader: class SuccessfulFileReader {
      readAsDataURL() {
        this.onload?.({ target: { result: 'data:font/ttf;base64,broken' } });
      }
    },
    FontFace: class BrokenFontFace {
      load() {
        return Promise.reject(new Error('invalid font'));
      }
    },
    console: { warn() {}, error() {}, log() {} },
    Math,
    Number,
    String,
    Object,
    Array,
    Set,
    Map,
    JSON
  };
  context.globalThis = context;
  context.self = context;

  vm.createContext(context);
  vm.runInContext(
    fs.readFileSync(path.join(__dirname, '..', 'js', 'modules', 'settings-manager.js'), 'utf8'),
    context,
    { filename: 'settings-manager.js' }
  );

  const manager = Object.create(context.window.SettingsManager.prototype);
  manager.customFonts = [];
  manager.toastManager = {
    show(message, type) {
      toasts.push(`${type}:${message}`);
    }
  };

  const result = await manager.handleFontUpload({
    name: 'damaged.ttf',
    size: 4
  });

  assert.equal(result, null, 'a font that fails browser decoding should be rejected');
  assert.deepEqual(manager.customFonts, [], 'a rejected font must not enter the in-memory list');
  assert.deepEqual(storageWrites, [], 'a rejected font must not be persisted');
  assert.ok(toasts.some((message) => message.includes('The font is damaged.')));

  context.FontFace = class ThrowingFontFace {
    constructor() {
      throw new Error('invalid font source');
    }
  };
  const constructorResult = await manager.addFontToDocument(
    'invalid-source',
    'data:font/ttf;base64,broken'
  );
  assert.equal(constructorResult, null, 'synchronous FontFace construction failures should be rejected safely');
}

async function main() {
  testBackgroundImageUploadRejectsInvalidFileBeforeReading();
  testInsertImageRejectsInvalidFileBeforeReading();
  testInsertImageDecodeFailureIsVisibleToTheUser();
  testFloatingGifRejectsInvalidFileBeforeReading();
  await testFloatingGifReadFailureRemovesTheEmptyContainer();
  await testCustomFontIsValidatedBeforePersistence();
  console.log('file-import-validation.test: all assertions passed');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
