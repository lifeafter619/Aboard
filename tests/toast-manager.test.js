const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

function createElement(tagName, documentRef) {
  const element = {
    tagName: tagName.toUpperCase(),
    className: '',
    children: [],
    parentElement: null,
    listeners: {},
    _innerHTML: '',
    _textContent: '',
    classList: {
      add(className) {
        if (!element.className.split(/\s+/).includes(className)) {
          element.className = `${element.className} ${className}`.trim();
        }
      },
      remove(className) {
        element.className = element.className
          .split(/\s+/)
          .filter(Boolean)
          .filter((name) => name !== className)
          .join(' ');
      }
    },
    appendChild(child) {
      child.parentElement = element;
      element.children.push(child);
      if (child.className === 'toast-container') {
        documentRef.toastContainer = child;
      }
      return child;
    },
    addEventListener(type, handler) {
      element.listeners[type] = handler;
    },
    remove() {
      if (!element.parentElement) return;
      element.parentElement.children = element.parentElement.children.filter((child) => child !== element);
      element.parentElement = null;
    },
    set innerHTML(value) {
      element._innerHTML = String(value);
    },
    get innerHTML() {
      return element._innerHTML;
    },
    set textContent(value) {
      element._textContent = String(value);
    },
    get textContent() {
      return element._textContent;
    }
  };
  return element;
}

function createDocumentStub() {
  const documentRef = {
    toastContainer: null,
    body: null,
    querySelector(selector) {
      if (selector === '.toast-container') return this.toastContainer;
      return null;
    },
    createElement(tagName) {
      return createElement(tagName, this);
    }
  };
  documentRef.body = createElement('body', documentRef);
  return documentRef;
}

function loadToastManager(document) {
  const source = fs.readFileSync(path.join(__dirname, '..', 'js', 'modules', 'toast-manager.js'), 'utf8');
  const sandbox = {
    window: {},
    document,
    requestAnimationFrame(callback) {
      callback();
    },
    setTimeout(callback) {
      callback();
    }
  };
  sandbox.globalThis = sandbox;
  vm.createContext(sandbox);
  vm.runInContext(source, sandbox, { filename: 'toast-manager.js' });
  return sandbox.window.ToastManager;
}

function testToastMessageIsInsertedAsText() {
  const document = createDocumentStub();
  const ToastManager = loadToastManager(document);
  const manager = new ToastManager();

  manager.show('<img src=x onerror=alert(1)>', 'info', 1);

  const toast = document.toastContainer.children[0];
  assert.equal(toast.innerHTML.includes('onerror'), false);
  const message = toast.children.find((child) => child.tagName === 'SPAN');
  assert.equal(message.textContent, '<img src=x onerror=alert(1)>');
}

function main() {
  testToastMessageIsInsertedAsText();
  console.log('toast-manager.test: all assertions passed');
}

main();
