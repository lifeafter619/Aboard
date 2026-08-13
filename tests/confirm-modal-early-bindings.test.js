const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

function createElementStub(id) {
  const listeners = new Map();
  return {
    id,
    dataset: {},
    tabIndex: 0,
    attributes: {},
    classes: new Set(),
    classList: {
      add(name) { this.owner.classes.add(name); },
      remove(name) { this.owner.classes.delete(name); },
      contains(name) { return this.owner.classes.has(name); }
    },
    listeners,
    setAttribute(name, value) { this.attributes[name] = value; },
    addEventListener(type, handler) {
      if (!listeners.has(type)) listeners.set(type, []);
      listeners.get(type).push(handler);
    },
    dispatch(type, event = {}) {
      (listeners.get(type) || []).forEach((handler) => handler(event));
    },
    focus() {}
  };
}

function loadDrawingActionsRuntime(elements) {
  const context = {
    window: { requestAnimationFrame: (callback) => callback() },
    document: {
      getElementById(id) { return elements[id] || null; },
      activeElement: null,
      body: {}
    },
    console,
    Math,
    Number,
    String,
    Boolean,
    Array,
    Object
  };
  context.globalThis = context;
  vm.createContext(context);
  vm.runInContext(
    fs.readFileSync(path.join(__dirname, '..', 'js', 'modules', 'drawing-actions-runtime.js'), 'utf8'),
    context,
    { filename: 'drawing-actions-runtime.js' }
  );
  return context.window.AboardDrawingActionsRuntime;
}

function makeElements() {
  const modal = createElementStub('confirm-modal');
  const cancelBtn = createElementStub('confirm-cancel-btn');
  const okBtn = createElementStub('confirm-ok-btn');
  [modal, cancelBtn, okBtn].forEach((element) => { element.classList.owner = element; });
  return { 'confirm-modal': modal, 'confirm-cancel-btn': cancelBtn, 'confirm-ok-btn': okBtn };
}

function testEarlyConfirmClearIsFullyInteractive() {
  const elements = makeElements();
  const runtime = loadDrawingActionsRuntime(elements);
  const clears = [];
  const board = {
    confirmModalPreviouslyFocusedElement: null,
    clearCanvas(saveToHistory) { clears.push(saveToHistory); }
  };

  // Simulate the early window: confirmClear runs before any settings
  // listeners exist. The modal must open already wired.
  runtime.confirmClear(board);
  const modal = elements['confirm-modal'];
  assert.ok(modal.classes.has('show'), 'confirmClear must show the modal');

  modal.dispatch('keydown', { key: 'Escape', preventDefault() {} });
  assert.ok(!modal.classes.has('show'), 'Escape must close the modal without settings listeners');

  runtime.confirmClear(board);
  elements['confirm-cancel-btn'].dispatch('click');
  assert.ok(!modal.classes.has('show'), 'Cancel must close the modal without settings listeners');
  assert.equal(clears.length, 0, 'cancel paths must not clear the canvas');

  runtime.confirmClear(board);
  elements['confirm-ok-btn'].dispatch('click');
  assert.ok(!modal.classes.has('show'), 'OK must close the modal');
  assert.deepEqual(clears, [true], 'OK must clear the canvas exactly once');
}

function testRepeatedBindingCallsDoNotStackHandlers() {
  const elements = makeElements();
  const runtime = loadDrawingActionsRuntime(elements);
  const clears = [];
  const board = {
    confirmModalPreviouslyFocusedElement: null,
    clearCanvas(saveToHistory) { clears.push(saveToHistory); }
  };

  // confirmClear binds once; a later setupSettingsListeners delegation call
  // must not add a second set of handlers.
  runtime.confirmClear(board);
  runtime.ensureConfirmModalBindings(board);
  runtime.ensureConfirmModalBindings(board);

  elements['confirm-ok-btn'].dispatch('click');
  assert.deepEqual(clears, [true], 'OK must fire a single clear even after repeated binding calls');
  assert.equal(
    elements['confirm-ok-btn'].listeners.get('click').length,
    1,
    'repeat binding calls must not stack click handlers'
  );
}

function testSettingsListenersDelegateConfirmBindings() {
  const source = fs.readFileSync(
    path.join(__dirname, '..', 'js', 'modules', 'ui-listeners-runtime.js'),
    'utf8'
  );
  assert.match(
    source,
    /ensureConfirmModalBindings/,
    'setupSettingsListeners must delegate confirm-modal bindings to the core runtime'
  );
  assert.doesNotMatch(
    source,
    /confirm-ok-btn'\)\s*,\s*'click'/,
    'ui-listeners-runtime must not bind confirm-ok-btn directly (double clear hazard)'
  );
}

testEarlyConfirmClearIsFullyInteractive();
testRepeatedBindingCallsDoNotStackHandlers();
testSettingsListenersDelegateConfirmBindings();
console.log('confirm-modal-early-bindings.test: all assertions passed');
