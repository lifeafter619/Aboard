// Regression: imported config keys are attacker-controlled. A crafted diff key
// like "__proto__.polluted" must not pollute Object.prototype when the user
// confirms the import (audit-2026-07-26 M1).

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

function createElementStub(tagName) {
  const classes = new Set();
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
      add(name) { classes.add(name); },
      remove(name) { classes.delete(name); },
      contains(name) { return classes.has(name); }
    },
    setAttribute(name, value) { element.attributes[name] = value; },
    appendChild(child) {
      child.parentNode = element;
      element.children.push(child);
      return child;
    },
    replaceChild(newChild, oldChild) {
      const index = element.children.indexOf(oldChild);
      if (index >= 0) {
        element.children[index] = newChild;
      } else {
        element.children.push(newChild);
      }
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
  const importMessages = [];

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
  let rejectApply = false;
  const board = {
    settingsManager: {
      getSettingLabel: (key) => key,
      toastManager: {
        show(message, type) { importMessages.push({ message, type }); }
      },
      async applySettings(settings) {
        if (rejectApply) throw new Error('invalid imported value');
        appliedSettings = settings;
      }
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
    { key: 'penSize', old: 4, new: 8 },
    {
      key: 'customFonts.0',
      old: undefined,
      new: { name: 'Teacher Font', data: 'data:font/woff2;base64,dGVzdA==' }
    }
  ];
  const shown = sandbox.window.AboardConfigImportRuntime.showConfigDiffModal(
    board,
    diff,
    {
      penSize: 4,
      customFonts: [
        { name: 'Teacher Font', data: 'data:font/woff2;base64,dGVzdA==' }
      ]
    }
  );
  assert.equal(shown, true, 'modal must open for a non-empty diff');

  // The OK button is replaced with a clone before the listener is attached.
  const newOkBtn = okParent.children[0];
  await newOkBtn.dispatch('click');

  assert.equal(appliedSettings !== null, true, 'confirm must still apply settings');
  assert.equal(appliedSettings.penSize, 8, 'legitimate keys must still be applied');
  assert.deepEqual(
    appliedSettings.customFonts,
    [{ name: 'Teacher Font', data: 'data:font/woff2;base64,dGVzdA==' }],
    'structured config values must survive the diff confirmation without string coercion'
  );
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

  rejectApply = true;
  sandbox.window.AboardConfigImportRuntime.showConfigDiffModal(
    board,
    [{ key: 'toolbarSize', old: 60, new: 65 }],
    { toolbarSize: 65 }
  );
  const rejectingOkBtn = okParent.children.at(-1);
  await assert.doesNotReject(
    () => rejectingOkBtn.dispatch('click'),
    'settings validation failures should be handled by the confirmation flow'
  );
  assert.deepEqual(
    importMessages.at(-1),
    { message: 'settings.importError', type: 'error' },
    'failed imports must show an error instead of a success message'
  );
  assert.equal(modal.classList.contains('show'), true, 'failed imports should leave the review modal open');

  console.log('config-import-proto-pollution.test: all assertions passed');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
