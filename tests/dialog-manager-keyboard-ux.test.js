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
  const document = {
    activeElement: null,
    body: null,
    createElement(tagName) {
      return createElement(document, tagName);
    },
    getElementById(id) {
      return document.body.querySelector(`#${id}`);
    },
    querySelector(selector) {
      return document.body.querySelector(selector);
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

(async function main() {
  await testConfirmDialogDefaultsToPrimaryActionAndSupportsEnterKey();
  console.log('dialog-manager-keyboard-ux.test: all assertions passed');
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
