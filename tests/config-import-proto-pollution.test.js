// Regression: imported config keys are attacker-controlled. A crafted diff key
// like "__proto__.polluted" must not pollute Object.prototype when the user
// confirms the import (audit-2026-07-26 M1).

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

function createElementStub(tagName) {
  const element = {
    tagName: String(tagName || 'div').toUpperCase(),
    style: {},
    dataset: {},
    children: [],
    listeners: {},
    className: '',
    textContent: '',
    value: '',
    checked: false,
    type: '',
    tabIndex: 0,
    parentNode: null,
    attributes: {},
    classList: {
      add() {},
      remove() {}
    },
    setAttribute(name, value) { element.attributes[name] = value; },
    appendChild(child) {
      child.parentNode = element;
      element.children.push(child);
      return child;
    },
    replaceChild(newChild, oldChild) {
      const index = element.children.indexOf(oldChild);
      if (index >= 0) element.children[index] = newChild;
      newChild.parentNode = element;
      return oldChild;
    },
    cloneNode() {
      const clone = createElementStub(element.tagName);
      clone.parentNode = element.parentNode;
      return clone;
    },
    addEventListener(type, handler) {
      (element.listeners[type] = element.listeners[type] || []).push(handler);
    },
    async dispatch(type, event) {
      for (const handler of element.listeners[type] || []) {
        await handler(event || { key: '' });
      }
    },
    focus() {}
  };
  Object.defineProperty(element, 'innerHTML', {
    set() { element.children = []; },
    get() { return ''; }
  });
  return element;
}

async function main() {
  const createdInputs = [];

  const modal = createElementStub('div');
  const list = createElementStub('div');
  list.querySelectorAll = (selector) => {
    assert.equal(selector, 'input[data-key]');
    return createdInputs.filter((input) => input.dataset.key !== undefined);
  };
  const okBtn = createElementStub('button');
  const cancelBtn = createElementStub('button');
  const okParent = createElementStub('div');
  okParent.appendChild(okBtn);

  const elementsById = {
    'config-diff-modal': modal,
    'config-diff-list': list,
    'config-diff-ok-btn': okBtn,
    'config-diff-cancel-btn': cancelBtn
  };

  const sandbox = {
    console,
    window: {
      i18n: { t: (key) => key },
      requestAnimationFrame: (callback) => callback()
    },
    document: {
      body: createElementStub('body'),
      activeElement: null,
      getElementById: (id) => elementsById[id] || null,
      createElement(tagName) {
        const element = createElementStub(tagName);
        if (element.tagName === 'INPUT') createdInputs.push(element);
        return element;
      },
      addEventListener() {},
      removeEventListener() {}
    },
    Math, Number, String, Boolean, Array, Object, Set, Map, JSON, Promise
  };
  sandbox.globalThis = sandbox;
  sandbox.self = sandbox;
  sandbox.window.document = sandbox.document;

  const source = fs.readFileSync(
    path.join(__dirname, '..', 'js', 'modules', 'config-import-runtime.js'),
    'utf8'
  );
  vm.createContext(sandbox);
  vm.runInContext(source, sandbox, { filename: 'config-import-runtime.js' });

  let appliedSettings = null;
  const board = {
    settingsManager: {
      getSettingLabel: (key) => key,
      async applySettings(settings) { appliedSettings = settings; }
    },
    recalculateAndRecenterCanvas() {},
    applyZoom() {},
    updateZoomControlsVisibility() {},
    updateImportExportBtnVisibility() {},
    updateFullscreenBtnVisibility() {},
    updatePatternGrid() {},
    repositionModalsOnResize() {}
  };

  const diff = [
    { key: '__proto__.polluted', old: '', new: 'owned' },
    { key: 'constructor.prototype.polluted2', old: '', new: 'owned' },
    { key: 'penSize', old: 4, new: 8 }
  ];
  const shown = sandbox.window.AboardConfigImportRuntime.showConfigDiffModal(
    board,
    diff,
    { penSize: 4 }
  );
  assert.equal(shown, true, 'modal must open for a non-empty diff');

  // The OK button is replaced with a clone before the listener is attached.
  const newOkBtn = okParent.children[0];
  await newOkBtn.dispatch('click');

  assert.equal(appliedSettings !== null, true, 'confirm must still apply settings');
  assert.equal(appliedSettings.penSize, 8, 'legitimate keys must still be applied');
  assert.equal(
    Object.prototype.polluted,
    undefined,
    '__proto__ path segments must not pollute Object.prototype'
  );
  assert.equal(
    Object.prototype.polluted2,
    undefined,
    'constructor.prototype path segments must not pollute Object.prototype'
  );
  assert.equal(
    Object.keys(appliedSettings).some((key) => key === '__proto__' || key === 'constructor'),
    false,
    'unsafe keys must not be written into the applied settings object'
  );

  console.log('config-import-proto-pollution.test: all assertions passed');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
