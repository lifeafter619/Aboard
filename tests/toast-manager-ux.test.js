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
    },
    toString() {
      return Array.from(tokens).join(' ');
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
  return () => false;
}

function createDocumentStub() {
  const document = {
    activeElement: null,
    body: null,
    createElement(tagName) {
      return createElement(document, tagName);
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

function createWindowStub() {
  const timers = [];
  let nextTimerId = 1;
  return {
    requestAnimationFrame(callback) {
      callback();
      return 1;
    },
    setTimeout(callback, delay = 0) {
      const entry = {
        id: nextTimerId++,
        delay,
        callback,
        cleared: false
      };
      timers.push(entry);
      return entry.id;
    },
    clearTimeout(timerId) {
      const timer = timers.find((entry) => entry.id === timerId);
      if (timer) {
        timer.cleared = true;
      }
    },
    runAllTimers() {
      let executed = true;
      while (executed) {
        executed = false;
        const pendingTimers = timers.filter((entry) => !entry.cleared);
        if (pendingTimers.length === 0) {
          return;
        }
        const nextTimer = pendingTimers[0];
        nextTimer.cleared = true;
        executed = true;
        nextTimer.callback();
      }
    }
  };
}

async function loadToastManager() {
  const moduleUrl = pathToFileURL(
    path.join(__dirname, '..', 'js', 'features', 'toast', 'toast-manager.js')
  ).href;
  const { ToastManager } = await import(moduleUrl);
  return ToastManager;
}

async function testDuplicateMessagesCollapseIntoSingleToast() {
  const ToastManager = await loadToastManager();
  const document = createDocumentStub();
  const window = createWindowStub();
  const manager = new ToastManager(window, document);

  manager.show('Storage unavailable', 'warning', 3000);
  manager.show('Storage unavailable', 'warning', 3000);

  const container = document.querySelector('.toast-container');
  assert.ok(container, 'toast container should be created');
  assert.equal(container.children.length, 1, 'duplicate messages should not stack identical toasts');

  const toast = container.children[0];
  const repeatBadge = toast.querySelector('.toast-repeat-count');
  assert.ok(repeatBadge, 'duplicate toasts should render a repeat badge');
  assert.equal(repeatBadge.textContent, '2', 'repeat badge should reflect the duplicate count');
}

async function testToastFallsBackToTimedRemovalWhenTransitionDoesNotFire() {
  const ToastManager = await loadToastManager();
  const document = createDocumentStub();
  const window = createWindowStub();
  const manager = new ToastManager(window, document);

  manager.show('Saved', 'success', 10);

  const container = document.querySelector('.toast-container');
  assert.equal(container.children.length, 1, 'toast should be mounted before timers run');

  window.runAllTimers();

  assert.equal(
    container.children.length,
    0,
    'toast should still be removed even when transitionend never fires'
  );
}

(async function main() {
  await testDuplicateMessagesCollapseIntoSingleToast();
  await testToastFallsBackToTimedRemovalWhenTransitionDoesNotFire();
  console.log('toast-manager-ux.test: all assertions passed');
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
