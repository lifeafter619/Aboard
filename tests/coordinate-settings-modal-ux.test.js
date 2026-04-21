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
      if (typeof force === 'boolean') {
        if (force) {
          tokens.add(value);
          return true;
        }
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

function createElement(ownerDocument, id = '') {
  return {
    ownerDocument,
    id,
    style: {},
    dataset: {},
    attributes: {},
    classList: createClassList(),
    tabIndex: 0,
    setAttribute(name, value) {
      this.attributes[name] = String(value);
      if (name === 'id') {
        this.id = String(value);
      }
    },
    getAttribute(name) {
      return this.attributes[name] ?? null;
    },
    focus() {
      ownerDocument.activeElement = this;
    },
    querySelector() {
      return null;
    }
  };
}

function createDocumentStub() {
  const elements = new Map();
  const document = {
    activeElement: null,
    body: null,
    getElementById(id) {
      return elements.get(id) || null;
    },
    registerElement(element) {
      if (element?.id) {
        elements.set(element.id, element);
      }
      return element;
    }
  };

  document.body = createElement(document, 'body');
  return document;
}

function loadCoordinatePanelRuntime() {
  const document = createDocumentStub();
  const sandbox = {
    console,
    window: {
      requestAnimationFrame(callback) {
        callback();
      }
    },
    document,
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
    JSON
  };

  sandbox.globalThis = sandbox;
  sandbox.self = sandbox;
  sandbox.window.document = document;

  const source = fs.readFileSync(path.join(__dirname, '..', 'js', 'modules', 'coordinate-panel-runtime.js'), 'utf8');
  vm.createContext(sandbox);
  vm.runInContext(source, sandbox, { filename: 'coordinate-panel-runtime.js' });

  return {
    document,
    runtime: sandbox.window.AboardCoordinatePanelRuntime
  };
}

function testCoordinateSettingsModalFocusesFirstSettingAndRestoresTriggerFocus() {
  const { document, runtime } = loadCoordinatePanelRuntime();
  const modal = document.registerElement(createElement(document, 'coordinate-tools-modal'));
  const trigger = document.registerElement(createElement(document, 'coordinate-settings-toggle-btn'));
  const closeBtn = document.registerElement(createElement(document, 'coordinate-tools-modal-close-btn'));
  const firstToggle = document.registerElement(createElement(document, 'coordinate-show-ticks'));

  const board = {
    backgroundManager: {
      backgroundPattern: 'coordinate',
      supportsMovableOrigin() {
        return true;
      }
    },
    isCoordinateSettingsExpanded: false,
    isCoordinatePointPanelVisible: false,
    isCoordinateInputPanelVisible: false,
    isCoordinatePointMode: false,
    coordinateSettingsPreviouslyFocusedElement: null,
    coordinateKeypadPreviouslyFocusedElement: null,
    coordinateKeypadSuppressFocusRestore: false,
    updateBackgroundUI() {},
    syncCoordinateExpressionDisplay() {}
  };

  trigger.focus();
  runtime.toggleCoordinateSettingsPanel(board, true);

  assert.equal(modal.getAttribute('role'), 'dialog');
  assert.equal(modal.getAttribute('aria-modal'), 'true');
  assert.equal(modal.getAttribute('aria-labelledby'), 'coordinate-tools-title');
  assert.equal(modal.getAttribute('aria-describedby'), 'coordinate-tools-group');
  assert.equal(trigger.getAttribute('aria-expanded'), 'true');
  assert.equal(modal.classList.contains('show'), true, 'opening should reveal the coordinate settings dialog');
  assert.equal(document.activeElement, firstToggle, 'opening should focus the first coordinate settings toggle');

  runtime.toggleCoordinateSettingsPanel(board, false);

  assert.equal(modal.classList.contains('show'), false, 'closing should hide the coordinate settings dialog');
  assert.equal(trigger.getAttribute('aria-expanded'), 'false');
  assert.equal(document.activeElement, trigger, 'closing should restore focus to the trigger button');
  assert.notEqual(document.activeElement, closeBtn, 'focus should not remain on the close button after dismissal');
}

(function main() {
  testCoordinateSettingsModalFocusesFirstSettingAndRestoresTriggerFocus();
  console.log('coordinate-settings-modal-ux.test: all assertions passed');
})();
