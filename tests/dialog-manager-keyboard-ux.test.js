const assert = require('node:assert/strict');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

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
    },
    contains(value) {
      return tokens.has(value);
    }
  };
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
    value: '',
    checked: false,
    hidden: false,
    type: '',
    onclick: null,
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
    hasAttribute(name) {
      return Object.prototype.hasOwnProperty.call(this.attributes, name);
    },
    addEventListener(type, handler, options = {}) {
      if (!listeners.has(type)) {
        listeners.set(type, []);
      }
      listeners.get(type).push({ handler, once: Boolean(options && options.once) });
    },
    removeEventListener(type, handler) {
      if (!listeners.has(type)) {
        return;
      }
      listeners.set(
        type,
        listeners.get(type).filter((entry) => entry.handler !== handler)
      );
    },
    trigger(type, event = {}) {
      const eventObject = {
        target: this,
        currentTarget: this,
        preventDefault() {
          this.defaultPrevented = true;
        },
        defaultPrevented: false,
        ...event
      };
      const entries = [...(listeners.get(type) || [])];
      entries.forEach((entry) => {
        entry.handler.call(this, eventObject);
        if (entry.once) {
          this.removeEventListener(type, entry.handler);
        }
      });
      return eventObject;
    },
    focus() {
      ownerDocument.activeElement = this;
    },
    contains(candidate) {
      if (candidate === this) {
        return true;
      }
      return this.children.some((child) => child.contains?.(candidate));
    },
    select() {},
    click() {
      if (typeof this.onclick === 'function') {
        this.onclick({ target: this, currentTarget: this, preventDefault() {} });
      }
      this.trigger('click');
    },
    querySelector(selector) {
      return this.querySelectorAll(selector)[0] || null;
    },
    querySelectorAll(selector) {
      const results = [];
      const matcher = createSelectorMatcher(selector);
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
      if (innerHtmlValue.includes('app-confirm-title')) {
        buildConfirmModalTemplate(ownerDocument, element);
      }
    }
  });

  return element;
}

function createSelectorMatcher(selector) {
  if (selector.includes(',')) {
    const matchers = selector.split(',').map((part) => createSelectorMatcher(part.trim()));
    return (element) => matchers.some((matcher) => matcher(element));
  }
  if (selector === '[aria-modal="true"]') {
    return (element) => element.getAttribute('aria-modal') === 'true';
  }
  if (selector === 'button:not([disabled])') {
    return (element) => element.tagName === 'BUTTON' && !element.disabled && !element.hasAttribute('disabled');
  }
  if (selector === 'input:not([disabled]):not([type="hidden"])') {
    return (element) => element.tagName === 'INPUT'
      && !element.disabled
      && !element.hasAttribute('disabled')
      && element.type !== 'hidden';
  }
  if (selector === 'select:not([disabled])') {
    return (element) => element.tagName === 'SELECT' && !element.disabled && !element.hasAttribute('disabled');
  }
  if (selector === 'textarea:not([disabled])') {
    return (element) => element.tagName === 'TEXTAREA' && !element.disabled && !element.hasAttribute('disabled');
  }
  if (selector === '[tabindex]:not([tabindex="-1"])') {
    return (element) => element.hasAttribute('tabindex') && element.getAttribute('tabindex') !== '-1';
  }
  if (selector.startsWith('.')) {
    const className = selector.slice(1);
    return (element) => element.classList.contains(className);
  }
  if (selector.startsWith('#')) {
    const id = selector.slice(1);
    return (element) => element.id === id;
  }
  if (selector === 'input[type="checkbox"]:checked') {
    return (element) => element.tagName === 'INPUT' && element.type === 'checkbox' && element.checked;
  }
  return () => false;
}

function buildConfirmModalTemplate(document, modal) {
  const content = document.createElement('div');
  content.className = 'modal-content';

  const header = document.createElement('div');
  const title = document.createElement('h2');
  title.id = 'app-confirm-title';
  header.appendChild(title);

  const body = document.createElement('div');
  const message = document.createElement('p');
  message.id = 'app-confirm-message';
  message.className = 'confirm-message';

  const options = document.createElement('div');
  options.id = 'app-confirm-options';

  const inputContainer = document.createElement('div');
  inputContainer.id = 'app-confirm-input-container';

  const footer = document.createElement('p');
  footer.id = 'app-confirm-footer';
  footer.className = 'confirm-message';

  const buttonRow = document.createElement('div');
  const cancelButton = document.createElement('button');
  cancelButton.id = 'app-confirm-cancel-btn';
  cancelButton.type = 'button';
  const okButton = document.createElement('button');
  okButton.id = 'app-confirm-ok-btn';
  okButton.type = 'button';

  buttonRow.appendChild(cancelButton);
  buttonRow.appendChild(okButton);
  body.appendChild(message);
  body.appendChild(options);
  body.appendChild(inputContainer);
  body.appendChild(footer);
  body.appendChild(buttonRow);
  content.appendChild(header);
  content.appendChild(body);
  modal.appendChild(content);
}

function createDocumentStub() {
  const listeners = new Map();
  const document = {
    activeElement: null,
    body: null,
    defaultView: {
      getComputedStyle(element) {
        return {
          display: element.hidden || element.style.display === 'none' ? 'none' : (element.style.display || 'block'),
          visibility: element.style.visibility || 'visible'
        };
      }
    },
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
    },
    addEventListener(type, handler) {
      if (!listeners.has(type)) {
        listeners.set(type, []);
      }
      listeners.get(type).push(handler);
    },
    trigger(type, event = {}) {
      const eventObject = {
        key: '',
        target: document.body,
        preventDefault() {
          this.defaultPrevented = true;
        },
        defaultPrevented: false,
        ...event
      };
      (listeners.get(type) || []).forEach((handler) => handler(eventObject));
      return eventObject;
    }
  };
  document.body = createElement(document, 'body');
  return document;
}

function createWindowStub(document) {
  return {
    document,
    requestAnimationFrame(callback) {
      callback();
      return 1;
    },
    i18n: {
      t(key) {
        if (key === 'common.confirm') {
          return 'Confirm';
        }
        if (key === 'common.cancel') {
          return 'Cancel';
        }
        return key;
      }
    }
  };
}

async function loadDialogManager() {
  const moduleUrl = pathToFileURL(
    path.join(__dirname, '..', 'js', 'infra', 'dialog-manager.js')
  ).href;
  const { DialogManager } = await import(moduleUrl);
  return DialogManager;
}

async function testConfirmDialogDefaultsToPrimaryActionAndSupportsEnterKey() {
  const DialogManager = await loadDialogManager();
  const document = createDocumentStub();
  const window = createWindowStub(document);
  const dialog = new DialogManager(window, document);

  const confirmPromise = dialog.showConfirm('Apply changes?');

  const modal = document.getElementById('app-confirm-modal');
  const okButton = document.getElementById('app-confirm-ok-btn');
  assert.equal(
    document.activeElement,
    okButton,
    'keyboard focus should land on the primary confirm action by default'
  );

  let resolved = false;
  let result = null;
  confirmPromise.then((value) => {
    resolved = true;
    result = value;
  });

  modal.trigger('keydown', { key: 'Enter', target: modal });
  await new Promise((resolve) => setImmediate(resolve));

  assert.equal(resolved, true, 'pressing Enter on the dialog should confirm it');
  assert.equal(result, true, 'dialog should resolve as confirmed after Enter');
  assert.equal(modal.classList.contains('show'), false, 'dialog should close after confirmation');
}

async function testConfirmDialogRebuildsBrokenModalTemplate() {
  const DialogManager = await loadDialogManager();
  const document = createDocumentStub();
  const window = createWindowStub(document);
  const dialog = new DialogManager(window, document);
  const warnings = [];
  const originalWarn = console.warn;

  dialog.ensureConfirmModal();
  const brokenModal = document.getElementById('app-confirm-modal');
  brokenModal.querySelector('#app-confirm-ok-btn').remove();
  brokenModal.querySelector('#app-confirm-message').remove();

  let confirmPromise;
  let rebuiltModal;
  let rebuiltOkButton;

  try {
    console.warn = (...args) => {
      warnings.push(args.map((value) => String(value)).join(' '));
    };

    confirmPromise = dialog.showConfirm('Recover dialog?');
    rebuiltModal = document.getElementById('app-confirm-modal');
    rebuiltOkButton = document.getElementById('app-confirm-ok-btn');
  } finally {
    console.warn = originalWarn;
  }

  assert.notEqual(rebuiltModal, brokenModal, 'dialog should replace a broken confirm modal instead of reusing it');
  assert.equal(brokenModal.parentElement, null, 'broken confirm modal should be removed from the document');
  assert.ok(rebuiltOkButton, 'rebuilt confirm modal should restore required action buttons');
  assert.ok(
    warnings.some((entry) => entry.includes('Confirm dialog template is incomplete')),
    'dialog should warn when it has to rebuild a broken confirm modal'
  );

  rebuiltOkButton.click();

  const result = await confirmPromise;
  assert.equal(result, true, 'rebuilt confirm modal should still resolve the primary action');
}

async function importDialogManagerWithGlobalDocument(document, suffix) {
  const originalDocument = global.document;
  global.document = document;
  try {
    await import(`${pathToFileURL(path.join(__dirname, '..', 'js', 'infra', 'dialog-manager.js')).href}?${suffix}`);
  } finally {
    if (originalDocument === undefined) {
      delete global.document;
    } else {
      global.document = originalDocument;
    }
  }
}

async function testModalFocusTrapIgnoresHiddenPanelControls() {
  const document = createDocumentStub();
  const modal = document.createElement('div');
  modal.className = 'modal show';
  modal.setAttribute('aria-modal', 'true');

  const firstButton = document.createElement('button');
  const lastVisibleButton = document.createElement('button');
  const hiddenPanel = document.createElement('div');
  hiddenPanel.hidden = true;
  const hiddenButton = document.createElement('button');

  hiddenPanel.appendChild(hiddenButton);
  modal.appendChild(firstButton);
  modal.appendChild(lastVisibleButton);
  modal.appendChild(hiddenPanel);
  document.body.appendChild(modal);

  await importDialogManagerWithGlobalDocument(document, 'focus-trap-hidden-panel-test');

  document.activeElement = lastVisibleButton;
  const event = document.trigger('keydown', {
    key: 'Tab',
    target: lastVisibleButton
  });

  assert.equal(event.defaultPrevented, true, 'Tab should wrap from the last visible control');
  assert.equal(document.activeElement, firstButton, 'hidden panel controls should not be included in the tab order');
}

(async function main() {
  await testModalFocusTrapIgnoresHiddenPanelControls();
  await testConfirmDialogDefaultsToPrimaryActionAndSupportsEnterKey();
  await testConfirmDialogRebuildsBrokenModalTemplate();
  console.log('dialog-manager-keyboard-ux.test: all assertions passed');
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
