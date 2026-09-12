const assert = require('node:assert/strict');

function timeoutGuard(promise, label, ms = 250) {
  return Promise.race([
    promise,
    new Promise((_, reject) => {
      setTimeout(() => reject(new Error(`${label} timed out`)), ms);
    })
  ]);
}

function createFakePart(id) {
  return {
    id,
    textContent: '',
    innerHTML: '',
    value: '',
    onclick: null,
    onkeydown: null,
    classes: new Set(),
    children: [],
    classList: {
      add(name) { this.owner.classes.add(name); },
      remove(name) { this.owner.classes.delete(name); },
      contains(name) { return this.owner.classes.has(name); },
      toggle(name, force) {
        if (force === true) {
          this.owner.classes.add(name);
          return true;
        }
        if (force === false) {
          this.owner.classes.delete(name);
          return false;
        }
        if (this.owner.classes.has(name)) {
          this.owner.classes.delete(name);
          return false;
        }
        this.owner.classes.add(name);
        return true;
      }
    },
    appendChild(child) {
      this.children.push(child);
      return child;
    },
    remove() {},
    addEventListener() {},
    removeEventListener() {},
    setAttribute() {},
    focus() {},
    select() {},
    querySelectorAll() {
      return [];
    }
  };
}

function createDialogHarness(DialogManager) {
  const parts = {
    '#app-confirm-title': createFakePart('app-confirm-title'),
    '#app-confirm-message': createFakePart('app-confirm-message'),
    '#app-confirm-options': createFakePart('app-confirm-options'),
    '#app-confirm-input-container': createFakePart('app-confirm-input-container'),
    '#app-confirm-footer': createFakePart('app-confirm-footer'),
    '#app-confirm-cancel-btn': createFakePart('app-confirm-cancel-btn'),
    '#app-confirm-ok-btn': createFakePart('app-confirm-ok-btn')
  };
  const modal = {
    id: 'app-confirm-modal',
    className: 'modal',
    innerHTML: '',
    classes: new Set(),
    classList: {
      add(name) { modal.classes.add(name); },
      remove(name) { modal.classes.delete(name); },
      contains(name) { return modal.classes.has(name); },
      toggle() {}
    },
    dataset: {},
    addEventListener() {},
    removeEventListener() {},
    appendChild() {},
    remove() {},
    querySelector(selector) {
      return parts[selector] || null;
    }
  };
  parts['#app-confirm-cancel-btn'].classList.owner = parts['#app-confirm-cancel-btn'];
  parts['#app-confirm-ok-btn'].classList.owner = parts['#app-confirm-ok-btn'];
  parts['#app-confirm-message'].classList.owner = parts['#app-confirm-message'];
  parts['#app-confirm-options'].classList.owner = parts['#app-confirm-options'];
  parts['#app-confirm-input-container'].classList.owner = parts['#app-confirm-input-container'];
  parts['#app-confirm-footer'].classList.owner = parts['#app-confirm-footer'];

  const win = {
    requestAnimationFrame(callback) { callback(); }
  };
  const doc = {
    activeElement: null,
    body: {
      appendChild() {}
    },
    createElement() {
      return modal;
    }
  };
  const dialog = new DialogManager(win, doc);
  return { dialog, modal, parts };
}

const tick = () => new Promise((resolve) => setTimeout(resolve, 0));

async function testOverlappingConfirmsSerialize(DialogManager) {
  const { dialog, modal, parts } = createDialogHarness(DialogManager);

  const first = dialog.showConfirm({ message: 'first', confirmText: 'OK-1' });
  await tick();
  assert.ok(modal.classes.has('show'), 'the first dialog must open immediately');

  const second = dialog.showConfirm({ message: 'second', confirmText: 'OK-2' });

  assert.equal(
    parts['#app-confirm-message'].textContent,
    'first',
    'a queued second dialog must not replace the visible first dialog'
  );

  parts['#app-confirm-ok-btn'].onclick();
  const firstResult = await timeoutGuard(first, 'first confirm result');
  assert.equal(firstResult, true, 'the first promise must resolve with its own OK click');

  await new Promise((resolve) => setTimeout(resolve, 0));
  assert.equal(
    parts['#app-confirm-message'].textContent,
    'second',
    'the queued dialog must appear only after the first one closed'
  );
  assert.ok(modal.classes.has('show'), 'the queued dialog must open after the first closed');

  parts['#app-confirm-cancel-btn'].onclick();
  const secondResult = await timeoutGuard(second, 'second confirm result');
  assert.equal(secondResult, false, 'the queued dialog resolves through its own cancel click');
}

async function testQueueAdvancesWhenFirstDialogIsCancelled(DialogManager) {
  const { dialog, parts } = createDialogHarness(DialogManager);

  const first = dialog.showConfirm({ message: 'first' });
  await tick();
  const second = dialog.showConfirm({ message: 'second' });

  parts['#app-confirm-cancel-btn'].onclick();
  assert.equal(await timeoutGuard(first, 'cancelled first confirm'), false);

  await new Promise((resolve) => setTimeout(resolve, 0));
  parts['#app-confirm-ok-btn'].onclick();
  assert.equal(await timeoutGuard(second, 'second confirm after cancel'), true);
}

async function main() {
  const { DialogManager } = await import('../js/infra/dialog-manager.js');
  
  await testOverlappingConfirmsSerialize(DialogManager);
  await testQueueAdvancesWhenFirstDialogIsCancelled(DialogManager);
  console.log('dialog-confirm-queue.test: all assertions passed');
}

main();
