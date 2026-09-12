const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const STORAGE_KEY = 'pageTeachingTools';

function createStorageStub() {
  const store = new Map();
  return {
    getItem(key) {
      return store.has(key) ? store.get(key) : null;
    },
    setItem(key, value) {
      store.set(key, String(value));
    },
    removeItem(key) {
      store.delete(key);
    }
  };
}

function createFakeElement(tagName = 'div') {
  const children = [];
  const element = {
    tagName: String(tagName).toUpperCase(),
    children,
    parentElement: null,
    get className() {
      return Array.from(element._classes).join(' ');
    },
    set className(value) {
      element._classes = new Set(String(value).split(/\s+/).filter(Boolean));
    },
    dataset: {},
    style: {
      setProperty(name, value) {
        this[name] = value;
      }
    },
    classList: {
      add(...names) { names.forEach((name) => element._classes.add(name)); },
      remove(...names) { names.forEach((name) => element._classes.delete(name)); },
      contains(name) { return element._classes.has(name); },
      toggle(name, force) {
        if (force === false) {
          element._classes.delete(name);
          return false;
        }
        element._classes.add(name);
        return true;
      }
    },
    _classes: new Set(),
    appendChild(child) {
      child.parentElement = element;
      children.push(child);
      return child;
    },
    remove() {
      if (element.parentElement) {
        const siblings = element.parentElement.children;
        const index = siblings.indexOf(element);
        if (index >= 0) siblings.splice(index, 1);
        element.parentElement = null;
      }
    },
    matches(selector) {
      if (selector.startsWith('.')) {
        return element._classes.has(selector.slice(1));
      }
      if (selector.startsWith('#')) {
        return element.id === selector.slice(1);
      }
      return false;
    },
    querySelector(selector) {
      for (const child of children) {
        if (child.matches(selector)) return child;
        const nested = typeof child.querySelector === 'function' ? child.querySelector(selector) : null;
        if (nested) return nested;
      }
      return null;
    },
    querySelectorAll(selector) {
      const found = [];
      const walk = (node) => {
        node.children.forEach((child) => {
          if (child.matches(selector)) found.push(child);
          walk(child);
        });
      };
      walk(element);
      return found;
    },
    addEventListener() {},
    removeEventListener() {}
  };
  return element;
}

function createFakeDocument() {
  const body = createFakeElement('body');
  return {
    body,
    createElement(tagName) {
      const element = createFakeElement(tagName);
      if (String(tagName).toLowerCase() === 'img') {
        element._src = '';
        Object.defineProperty(element, 'src', {
          get() { return element._src; },
          set(value) { element._src = value; }
        });
      }
      return element;
    },
    getElementById() {
      return null;
    },
    addEventListener() {},
    removeEventListener() {}
  };
}

function loadTeachingToolsManager(localStorage) {
  const source = fs.readFileSync(
    path.join(__dirname, '..', 'js', 'modules', 'teaching-tools.js'),
    'utf8'
  );

  const context = {
    window: {
      addEventListener() {},
      removeEventListener() {},
      requestAnimationFrame(callback) { callback(); }
    },
    document: createFakeDocument(),
    localStorage,
    console,
    Math,
    Date,
    JSON,
    Number,
    String,
    Boolean,
    Object,
    Array,
    Set,
    Map,
    Image: class FakeImage {
      constructor() {
        this._src = '';
      }
      get src() {
        return this._src;
      }
      set src(value) {
        this._src = value;
      }
    }
  };
  context.globalThis = context;

  vm.createContext(context);
  vm.runInContext(source, context, { filename: 'teaching-tools.js' });
  const Manager = context.window.AboardTeachingToolsManager;
  assert.equal(typeof Manager, 'function', 'teaching-tools.js must expose AboardTeachingToolsManager');
  return Manager;
}

function createManager(Manager, localStorage) {
  const manager = new (Manager)(
    {
      getBoundingClientRect() {
        return { left: 0, top: 0, width: 1280, height: 720 };
      },
      offsetWidth: 1280,
      offsetHeight: 720
    },
    {},
    null
  );
  manager.canvasScaleFactor = 1;
  manager.__localStorage = localStorage;
  return manager;
}

function addStubTool(manager, overrides = {}) {
  const tool = {
    type: 'ruler',
    variant: 1,
    x: 10,
    y: 20,
    width: 300,
    height: 80,
    rotation: 0,
    image: { src: 'img/ruler_1.png' },
    overlay: null,
    ...overrides
  };
  manager.tools.push(tool);
  return tool;
}

function testSaveCurrentPageStatePersistsCompactSnapshot(localStorage, Manager) {
  const manager = createManager(Manager, localStorage);
  const overlay = createFakeElement('div');
  addStubTool(manager, { overlay });
  addStubTool(manager, {
    type: 'setSquare',
    variant: 45,
    x: 55.4,
    y: 66.6,
    width: 200.2,
    height: 200.8,
    rotation: 42.49,
    image: { src: 'img/set_square_2.png' },
    overlay: createFakeElement('div')
  });

  manager.saveCurrentPageState(1);

  assert.equal(manager.tools.length, 2, 'saving page state must not clear the live tools');
  const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
  assert.ok(saved && saved['1'], 'page 1 entry must be persisted');
  assert.equal(saved['1'].length, 2, 'both tools must be captured');
  const second = saved['1'][1];
  assert.equal(second.type, 'setSquare');
  assert.equal(second.variant, 45);
  assert.equal(second.x, 55, 'positions must be rounded to integers for compact storage');
  assert.equal(second.rotation, 42, 'rotations must be rounded to integers');
  assert.ok(!('image' in second) && !('overlay' in second) && !('id' in second), 'snapshot must stay DOM-free');
}

function testRestorePageStateRecreatesAndClearsTools(localStorage, Manager) {
  const manager = createManager(Manager, localStorage);
  const firstOverlay = createFakeElement('div');
  const tool = addStubTool(manager, { overlay: firstOverlay });
  manager.saveCurrentPageState(1);

  manager.restorePageState(2);

  assert.equal(manager.tools.length, 0, 'a page without tools must clear the previous page tools');
  assert.ok(!firstOverlay.parentElement, 'cleared tool overlays must be detached from the DOM');

  manager.restorePageState(1);

  assert.equal(manager.tools.length, 1, 'restoring the saved page must recreate its tools');
  const restored = manager.tools[0];
  assert.equal(restored.type, 'ruler');
  assert.equal(restored.variant, 1);
  assert.equal(restored.x, 10);
  assert.equal(restored.y, 20);
  assert.equal(restored.width, 300);
  assert.equal(restored.height, 80);
  assert.ok(restored.overlay, 'restored tools must get a fresh overlay');
  assert.equal(restored.image.src, 'img/ruler_1.png', 'restored tools must resolve their asset by variant');
  assert.notEqual(restored.id, tool.id, 'restored tools must get fresh ids');
}

function testImportSanitizesCorruptState(localStorage, Manager) {
  const manager = createManager(Manager, localStorage);
  manager.importPageToolStates({
    1: [
      { type: 'ruler', variant: 2, x: 5, y: 6, width: 100, height: 40, rotation: 0 },
      { type: 'drops', variant: 1, x: 0, y: 0, width: 10, height: 10 },
      { type: 'ruler', variant: 9, x: 0, y: 0, width: 'huge', height: 10 },
      null,
      { type: 'setSquare', variant: 60, x: Number.NaN, y: 0, width: 10, height: 10 }
    ],
    bogus: 'nope',
    2: 'not-an-array'
  });

  const exported = manager.exportPageToolStates();
  // vm-realm objects differ in prototype from host literals, so compare JSON.
  assert.equal(JSON.stringify(exported['1']), JSON.stringify([
    { type: 'ruler', variant: 2, x: 5, y: 6, width: 100, height: 40, rotation: 0 }
  ]), 'only valid tool entries may survive the import');
  assert.ok(!('bogus' in exported), 'non-numeric page keys must be dropped');
  assert.equal(JSON.stringify(exported['2']), '[]', 'non-array page payloads become empty pages');

  const persisted = JSON.parse(localStorage.getItem(STORAGE_KEY));
  assert.equal(persisted['1'].length, 1, 'sanitized state must be persisted');
}

function testImportRejectsOversizedState(localStorage, Manager) {
  const manager = createManager(Manager, localStorage);
  const pages = {};
  for (let page = 1; page <= 400; page += 1) {
    pages[page] = [];
  }
  manager.importPageToolStates(pages);

  const exported = manager.exportPageToolStates();
  assert.ok(
    Object.keys(exported).length <= 300,
    'page state import must stay within the pagination page budget'
  );

  manager.importPageToolStates({
    1: Array.from({ length: 60 }, () => ({
      type: 'ruler', variant: 1, x: 1, y: 2, width: 3, height: 4, rotation: 0
    }))
  });
  assert.ok(
    manager.exportPageToolStates()['1'].length <= 40,
    'per-page tool counts must stay bounded'
  );
}

function testResetPageToolStatesClearsEverything(localStorage, Manager) {
  const manager = createManager(Manager, localStorage);
  addStubTool(manager, { overlay: createFakeElement('div') });
  manager.saveCurrentPageState(3);
  assert.ok(localStorage.getItem(STORAGE_KEY), 'state must exist before reset');

  manager.resetPageToolStates();

  assert.equal(manager.tools.length, 0, 'reset must clear live tools');
  assert.equal(JSON.stringify(manager.exportPageToolStates()), '{}', 'reset must clear the page map');
  assert.equal(localStorage.getItem(STORAGE_KEY), null, 'reset must remove the persisted key');
}

function testConstructorRestoresPersistedMap(localStorage, Manager) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({
    2: [{ type: 'setSquare', variant: 45, x: 7, y: 8, width: 150, height: 150, rotation: 15 }]
  }));

  const manager = createManager(Manager, localStorage);

  assert.equal(
    JSON.stringify(manager.exportPageToolStates()['2']),
    JSON.stringify([{ type: 'setSquare', variant: 45, x: 7, y: 8, width: 150, height: 150, rotation: 15 }]),
    'a fresh manager must pick up the persisted per-page state'
  );
}

function testConstructorSurvivesCorruptStorage(localStorage, Manager) {
  localStorage.setItem(STORAGE_KEY, '{not json');

  const manager = createManager(Manager, localStorage);

  assert.equal(JSON.stringify(manager.exportPageToolStates()), '{}', 'corrupt storage must degrade to an empty map');
}

function main() {
  const localStorage = createStorageStub();
  const Manager = loadTeachingToolsManager(localStorage);

  // The vm context binds the storage stub at load time, so every test must
  // share the one stub the loader received.
  testSaveCurrentPageStatePersistsCompactSnapshot(localStorage, Manager);
  testRestorePageStateRecreatesAndClearsTools(localStorage, Manager);
  testImportSanitizesCorruptState(localStorage, Manager);
  testImportRejectsOversizedState(localStorage, Manager);
  testResetPageToolStatesClearsEverything(localStorage, Manager);
  testConstructorRestoresPersistedMap(localStorage, Manager);
  testConstructorSurvivesCorruptStorage(localStorage, Manager);

  console.log('teaching-tools-page-state.test: all assertions passed');
}

main();
