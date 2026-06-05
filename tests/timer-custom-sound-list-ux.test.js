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
      if (force === true) {
        tokens.add(value);
        return true;
      }
      if (force === false) {
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

function createSelectorMatcher(selector) {
  if (selector.startsWith('.')) {
    const className = selector.slice(1);
    return (element) => element.classList.contains(className);
  }
  if (selector.startsWith('#')) {
    const id = selector.slice(1);
    return (element) => element.id === id;
  }
  return () => false;
}

function createElement(ownerDocument, tagName = 'div') {
  const listeners = new Map();
  const element = {
    ownerDocument,
    tagName: String(tagName || 'div').toUpperCase(),
    children: [],
    parentElement: null,
    style: {},
    dataset: {},
    attributes: {},
    classList: createClassList(),
    textContent: '',
    appendChild(child) {
      child.parentElement = this;
      this.children.push(child);
      return child;
    },
    removeChild(child) {
      this.children = this.children.filter((entry) => entry !== child);
      child.parentElement = null;
      return child;
    },
    remove() {
      if (this.parentElement) {
        this.parentElement.removeChild(this);
      }
    },
    setAttribute(name, value) {
      this.attributes[name] = String(value);
      if (name === 'id') {
        this.id = String(value);
      }
      if (name === 'class') {
        this.className = String(value);
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
    removeEventListener(type, handler) {
      const handlers = listeners.get(type) || [];
      listeners.set(
        type,
        handlers.filter((entry) => entry !== handler)
      );
    },
    trigger(type, extra = {}) {
      const event = {
        target: this,
        currentTarget: this,
        defaultPrevented: false,
        propagationStopped: false,
        preventDefault() {
          this.defaultPrevented = true;
        },
        stopPropagation() {
          this.propagationStopped = true;
        },
        ...extra
      };
      (listeners.get(type) || []).forEach((handler) => handler.call(this, event));
      return event;
    },
    querySelector(selector) {
      return this.querySelectorAll(selector)[0] || null;
    },
    querySelectorAll(selector) {
      const matcher = createSelectorMatcher(selector);
      const results = [];
      const visit = (node) => {
        node.children.forEach((child) => {
          if (matcher(child)) {
            results.push(child);
          }
          visit(child);
        });
      };
      visit(this);
      return results;
    },
    closest(selector) {
      const matcher = createSelectorMatcher(selector);
      let current = this;
      while (current) {
        if (matcher(current)) {
          return current;
        }
        current = current.parentElement;
      }
      return null;
    }
  };

  let classNameValue = '';
  Object.defineProperty(element, 'className', {
    get() {
      return classNameValue;
    },
    set(value) {
      classNameValue = String(value || '');
      element.classList = createClassList();
      classNameValue
        .split(/\s+/)
        .filter(Boolean)
        .forEach((token) => element.classList.add(token));
    }
  });

  let idValue = '';
  Object.defineProperty(element, 'id', {
    get() {
      return idValue;
    },
    set(value) {
      idValue = String(value || '');
      element.attributes.id = idValue;
    }
  });

  let innerHtmlValue = '';
  Object.defineProperty(element, 'innerHTML', {
    get() {
      return innerHtmlValue;
    },
    set(value) {
      innerHtmlValue = String(value || '');
      element.children = [];
    }
  });

  return element;
}

function createDocumentStub() {
  const document = {
    body: null,
    createElement(tagName) {
      return createElement(document, tagName);
    },
    getElementById(id) {
      return document.body.querySelector(`#${id}`);
    },
    querySelector(selector) {
      return document.body.querySelector(selector);
    },
    querySelectorAll(selector) {
      return document.body.querySelectorAll(selector);
    }
  };
  document.body = createElement(document, 'body');
  return document;
}

function loadTimerManagerPrototype(document, {
  windowOverrides = {},
  localStorage,
  FileReader,
  fileValidation
} = {}) {
  const sandboxConsole = {
    log() {},
    warn() {},
    error() {}
  };
  const sandbox = {
    console: sandboxConsole,
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
    RegExp,
    JSON,
    Promise,
    parseInt,
    parseFloat,
    isNaN,
    setTimeout,
    clearTimeout,
    setInterval,
    clearInterval,
    Audio: class FakeAudio {},
    FileReader: FileReader || class FakeFileReader {},
    window: {
      i18n: {
        t(key) {
          return key;
        }
      },
      drawingBoard: {
        syncResizableModalState() {}
      },
      requestAnimationFrame(callback) {
        callback();
      },
      addEventListener() {},
      removeEventListener() {},
      innerWidth: 1280,
      innerHeight: 720,
      AboardFileValidation: fileValidation
    },
    document,
    localStorage: localStorage || {
      getItem() {
        return null;
      },
      setItem() {},
      removeItem() {}
    },
    CustomEvent: class CustomEvent {}
  };

  sandbox.globalThis = sandbox;
  sandbox.self = sandbox;
  sandbox.window = {
    ...sandbox.window,
    ...windowOverrides
  };
  sandbox.window.document = document;

  const source = `${fs.readFileSync(path.join(__dirname, '..', 'js', 'modules', 'timer.js'), 'utf8')}\nwindow.__TimerManager = TimerManager;`;
  vm.createContext(sandbox);
  vm.runInContext(source, sandbox, { filename: 'timer.js' });
  return sandbox.window.__TimerManager.prototype;
}

function createRejectingFileValidation(toasts) {
  return {
    validateAudioFile(file) {
      if (file?.size > 10) {
        throw new Error('Selected audio file is too large.');
      }
    },
    showValidationError(error, { toast } = {}) {
      (toast || { show() {} }).show(error.message, 'error');
      toasts.push(error.message);
    }
  };
}

function testCustomSoundRowsUseSeparateActionButtons() {
  const document = createDocumentStub();
  const container = document.createElement('div');
  container.id = 'custom-sounds-list';
  document.body.appendChild(container);

  const proto = loadTimerManagerPrototype(document);
  const previewCalls = [];
  const removedIds = [];
  let updateCalls = 0;
  const sound = {
    id: 'custom-1',
    name: 'Very-Long-Custom-Alarm-Track.mp3',
    url: 'data:audio/mp3;base64,AAA'
  };

  const manager = {
    customSounds: [sound],
    updateMainPreviewButtonState() {
      updateCalls += 1;
    },
    previewSoundByUrl(url, trigger) {
      previewCalls.push({ url, trigger });
    },
    removeCustomSound(id) {
      removedIds.push(id);
    }
  };

  proto.renderCustomSounds.call(manager);

  assert.equal(container.children.length, 1, 'should render one custom sound row');
  assert.equal(updateCalls, 1, 'render should refresh preview button availability');

  const row = container.children[0];
  assert.equal(row.classList.contains('sound-preset-custom-row'), true, 'custom sounds should render in dedicated rows');

  const selectButton = row.querySelector('.sound-preset-btn');
  const previewButton = row.querySelector('.sound-preview-btn');
  const deleteButton = row.querySelector('.sound-delete-btn');

  assert.ok(selectButton, 'custom row should include a sound selection button');
  assert.ok(previewButton, 'custom row should include a preview action button');
  assert.ok(deleteButton, 'custom row should include a delete action button');
  assert.equal(selectButton.querySelector('.sound-preview-btn'), null, 'preview action should not be nested inside the selection button');
  assert.equal(selectButton.querySelector('.sound-delete-btn'), null, 'delete action should not be nested inside the selection button');
  assert.match(previewButton.getAttribute('aria-label'), /Preview: Very-Long-Custom-Alarm-Track\.mp3/, 'preview action should expose the full filename');
  assert.match(deleteButton.getAttribute('aria-label'), /Delete: Very-Long-Custom-Alarm-Track\.mp3/, 'delete action should expose the full filename');

  selectButton.trigger('click');
  assert.equal(selectButton.classList.contains('active'), true, 'selecting a custom sound should activate the button');
  assert.equal(updateCalls, 2, 'selecting a custom sound should refresh preview button availability');

  previewButton.trigger('click');
  assert.deepEqual(previewCalls, [{ url: sound.url, trigger: previewButton }], 'preview action should play the matching custom audio without selecting it');

  deleteButton.trigger('click');
  assert.deepEqual(removedIds, [sound.id], 'delete action should remove only the matching custom audio');
}

function testAddCustomSoundDoesNotMutateUiWhenStorageWriteFails() {
  const document = createDocumentStub();
  const toasts = [];
  const proto = loadTimerManagerPrototype(document, {
    windowOverrides: {
      toastManager: {
        show(message, type) {
          toasts.push({ message, type });
        }
      }
    },
    localStorage: {
      getItem() {
        return null;
      },
      setItem() {
        const error = new Error('localStorage blocked');
        error.name = 'SecurityError';
        throw error;
      },
      removeItem() {}
    },
    FileReader: class FakeFileReader {
      readAsDataURL() {
        this.onload?.({
          target: {
            result: 'data:audio/mp3;base64,AAA'
          }
        });
      }
    }
  });

  let renderCalls = 0;
  const manager = {
    customSounds: [],
    saveCustomSounds(customSounds) {
      return proto.saveCustomSounds.call(this, customSounds);
    },
    renderCustomSounds() {
      renderCalls += 1;
    }
  };

  proto.addCustomSound.call(manager, { name: 'alarm.mp3' });

  assert.equal(manager.customSounds.length, 0, 'failed writes should not leave an unsaved custom sound in memory');
  assert.equal(renderCalls, 0, 'failed writes should not repaint the custom sound list as if the save succeeded');
  assert.deepEqual(
    toasts,
    [{
      message: 'Failed to save custom sounds. Please check browser storage permissions and try again.',
      type: 'error'
    }],
    'non-quota storage failures should surface a generic storage-permission error'
  );
}

function testRemoveCustomSoundKeepsExistingEntryWhenStorageWriteFails() {
  const document = createDocumentStub();
  const toasts = [];
  const proto = loadTimerManagerPrototype(document, {
    windowOverrides: {
      toastManager: {
        show(message, type) {
          toasts.push({ message, type });
        }
      }
    },
    localStorage: {
      getItem() {
        return null;
      },
      setItem() {
        const error = new Error('localStorage blocked');
        error.name = 'SecurityError';
        throw error;
      },
      removeItem() {}
    }
  });

  const originalSounds = [{
    id: 'custom-1',
    name: 'alarm.mp3',
    url: 'data:audio/mp3;base64,AAA'
  }];
  let renderCalls = 0;
  const manager = {
    customSounds: [...originalSounds],
    saveCustomSounds(customSounds) {
      return proto.saveCustomSounds.call(this, customSounds);
    },
    renderCustomSounds() {
      renderCalls += 1;
    }
  };

  const removed = proto.removeCustomSound.call(manager, 'custom-1');

  assert.equal(removed, false, 'removal should report failure when storage cannot persist the new list');
  assert.deepEqual(manager.customSounds, originalSounds, 'failed removals should keep the existing custom sound list intact');
  assert.equal(renderCalls, 0, 'failed removals should not repaint the list as if deletion succeeded');
  assert.deepEqual(
    toasts,
    [{
      message: 'Failed to save custom sounds. Please check browser storage permissions and try again.',
      type: 'error'
    }],
    'failed removals should surface the same storage-permission error'
  );
}

function testOversizedCustomSoundIsRejectedBeforeFileReaderRuns() {
  const document = createDocumentStub();
  const toasts = [];
  let readCalls = 0;
  const proto = loadTimerManagerPrototype(document, {
    fileValidation: createRejectingFileValidation(toasts),
    windowOverrides: {
      toastManager: {
        show(message, type) {
          toasts.push(`${type}:${message}`);
        }
      }
    },
    FileReader: class FakeFileReader {
      readAsDataURL() {
        readCalls += 1;
      }
    }
  });

  let renderCalls = 0;
  const manager = {
    customSounds: [],
    saveCustomSounds(customSounds) {
      this.customSounds = customSounds;
      return true;
    },
    renderCustomSounds() {
      renderCalls += 1;
    }
  };

  proto.addCustomSound.call(manager, {
    name: 'huge-alarm.mp3',
    type: 'audio/mpeg',
    size: 11
  });

  assert.equal(readCalls, 0, 'oversized custom sounds should be rejected before FileReader reads them');
  assert.equal(manager.customSounds.length, 0, 'oversized custom sounds should not be added to memory');
  assert.equal(renderCalls, 0, 'oversized custom sounds should not repaint the custom sound list');
  assert.ok(
    toasts.some((entry) => entry.includes('Selected audio file is too large.')),
    'oversized custom sounds should show a validation error'
  );
}

function main() {
  testCustomSoundRowsUseSeparateActionButtons();
  testAddCustomSoundDoesNotMutateUiWhenStorageWriteFails();
  testRemoveCustomSoundKeepsExistingEntryWhenStorageWriteFails();
  testOversizedCustomSoundIsRejectedBeforeFileReaderRuns();
  console.log('timer-custom-sound-list-ux.test: all assertions passed');
}

main();
