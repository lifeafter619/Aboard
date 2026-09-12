const assert = require('node:assert/strict');

function createFakeElement(tagName = 'div') {
  const children = [];
  const listeners = new Map();
  const element = {
    tagName: String(tagName).toUpperCase(),
    children,
    listeners,
    parentElement: null,
    dataset: {},
    draggable: false,
    innerHTML: '',
    className: '',
    title: '',
    hidden: false,
    setAttribute() {},
    removeAttribute() {},
    style: {
      setProperty(name, value) {
        this[name] = value;
      }
    },
    classList: {
      add(...names) { names.forEach((name) => element._classes.add(name)); },
      remove(...names) { names.forEach((name) => element._classes.delete(name)); },
      contains(name) { return element._classes.has(name); },
      toggle() {}
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
      if (selector.startsWith('.')) return element._classes.has(selector.slice(1));
      if (selector.startsWith('#')) return element.id === selector.slice(1);
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
    addEventListener(type, handler) {
      if (!listeners.has(type)) listeners.set(type, []);
      listeners.get(type).push(handler);
    },
    removeEventListener(type, handler) {
      const bucket = listeners.get(type);
      if (!bucket) return;
      const index = bucket.indexOf(handler);
      if (index >= 0) bucket.splice(index, 1);
    },
    dispatch(type, event = {}) {
      (listeners.get(type) || []).slice().forEach((handler) => handler(event));
    }
  };
  return element;
}

function createFakeDocument() {
  const gifLayer = createFakeElement('div');
  const doc = {
    gifLayer,
    body: createFakeElement('body'),
    documentListeners: new Map(),
    createElement(tagName) {
      return createFakeElement(tagName);
    },
    getElementById(id) {
      return id === 'gif-layer' ? gifLayer : null;
    },
    addEventListener(type, handler) {
      if (!doc.documentListeners.has(type)) doc.documentListeners.set(type, []);
      doc.documentListeners.get(type).push(handler);
    },
    removeEventListener(type, handler) {
      const bucket = doc.documentListeners.get(type);
      if (!bucket) return;
      const index = bucket.indexOf(handler);
      if (index >= 0) bucket.splice(index, 1);
    }
  };
  return doc;
}

function createFakeIndexedDbFactory() {
  const store = new Map();
  const db = {
    objectStoreNames: { contains: () => true },
    createObjectStore() {},
    transaction() {
      return {
        objectStore() {
          return {
            get(key) {
              const request = {};
              queueMicrotask(() => {
                request.result = store.has(key) ? JSON.parse(JSON.stringify(store.get(key))) : undefined;
                if (request.onsuccess) request.onsuccess({ target: request });
              });
              return request;
            },
            put(value, key) {
              const request = {};
              queueMicrotask(() => {
                store.set(key, JSON.parse(JSON.stringify(value)));
                if (request.onsuccess) request.onsuccess({ target: request });
              });
              return request;
            }
          };
        }
      };
    }
  };
  const factory = {
    __store: store,
    open() {
      const request = {};
      queueMicrotask(() => {
        if (request.onupgradeneeded) request.onupgradeneeded({ target: request });
        request.result = db;
        if (request.onsuccess) request.onsuccess({ target: request });
      });
      return request;
    }
  };
  return factory;
}

function createFakeWin({ indexedDB = null, localStorage = null } = {}) {
  return {
    addEventListener() {},
    removeEventListener() {},
    requestAnimationFrame(callback) { callback(); },
    setTimeout,
    clearTimeout,
    innerWidth: 800,
    innerHeight: 600,
    matchMedia() {
      return { matches: false };
    },
    i18n: { t: (key) => key },
    indexedDB,
    localStorage
  };
}

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

const tick = () => new Promise((resolve) => setTimeout(resolve, 0));

async function testDragUsesPointerEventsOnly(GifManager) {
  const win = createFakeWin({ indexedDB: createFakeIndexedDbFactory() });
  const doc = createFakeDocument();
  const manager = new GifManager(win, doc);
  await manager.storageReadyPromise;

  const container = createFakeElement('div');
  manager.setupDrag(container);

  assert.ok(container.listeners.get('pointerdown'), 'drag must bind pointerdown');
  assert.equal(container.listeners.get('mousedown'), undefined, 'drag must not bind mousedown');
  assert.equal(container.listeners.get('touchstart'), undefined, 'drag must not bind touchstart');

  container.dispatch('pointerdown', {
    pointerId: 7,
    clientX: 40,
    clientY: 30,
    target: { closest: () => null },
    preventDefault() {}
  });

  const moveTypes = Array.from(doc.documentListeners.keys());
  assert.ok(moveTypes.includes('pointermove'), 'drag must listen for pointermove on the document');
  assert.ok(moveTypes.includes('pointerup'), 'drag must listen for pointerup on the document');
  assert.ok(moveTypes.includes('pointercancel'), 'drag must listen for pointercancel on the document');
  assert.equal(moveTypes.includes('mousemove'), false, 'drag must not listen for mousemove');
  assert.equal(moveTypes.includes('touchmove'), false, 'drag must not listen for touchmove');

  const before = `${container.style.left}/${container.style.top}`;
  doc.documentListeners.get('pointermove')
    .forEach((handler) => handler({ pointerId: 7, clientX: 90, clientY: 80 }));
  assert.notEqual(`${container.style.left}/${container.style.top}`, before, 'matching pointer must move the gif');

  doc.documentListeners.get('pointermove')
    .forEach((handler) => handler({ pointerId: 99, clientX: 900, clientY: 900 }));
  assert.equal(
    `${container.style.left}/${container.style.top}`,
    '50px/50px',
    'a different pointer id must not move the gif'
  );
}

async function testIndexedDbRoundTrip(GifManager) {
  const factory = createFakeIndexedDbFactory();
  const doc = createFakeDocument();
  const manager = new GifManager(createFakeWin({ indexedDB: factory }), doc);
  await manager.storageReadyPromise;

  const id = manager.addFloatingGif('data:image/gif;base64,AAA', { x: 12, y: 34 });
  assert.ok(id, 'adding a gif must return an id');
  await tick();

  const saved = factory.__store.get('floatingGifs');
  assert.ok(Array.isArray(saved) && saved.length === 1, 'the gif state must be written to IndexedDB');
  assert.equal(saved[0].src, 'data:image/gif;base64,AAA');
  assert.equal(saved[0].x, 12);

  const restarted = new GifManager(createFakeWin({ indexedDB: factory }), createFakeDocument());
  await restarted.storageReadyPromise;
  await tick();

  assert.equal(restarted.gifs.size, 1, 'a fresh manager must restore gifs from IndexedDB');
  const restored = Array.from(restarted.gifs.values())[0];
  assert.equal(restored.src, 'data:image/gif;base64,AAA');
}

async function testLegacyLocalStorageMigratesIntoIndexedDb(GifManager) {
  const factory = createFakeIndexedDbFactory();
  const localStorage = createStorageStub();
  localStorage.setItem('floatingGifs', JSON.stringify([
    { src: 'data:image/gif;base64,LEGACY', x: 5, y: 6, width: 100, height: 60, loopCount: 2, autoPlay: false }
  ]));

  const manager = new GifManager(
    createFakeWin({ indexedDB: factory, localStorage }),
    createFakeDocument()
  );
  await manager.storageReadyPromise;
  await tick();

  assert.equal(manager.gifs.size, 1, 'legacy localStorage gifs must be restored');
  const migrated = factory.__store.get('floatingGifs');
  assert.ok(Array.isArray(migrated) && migrated[0].src === 'data:image/gif;base64,LEGACY',
    'legacy state must be migrated into IndexedDB');
  assert.equal(localStorage.getItem('floatingGifs'), null, 'the legacy key must be removed after migration');
}

async function testLocalStorageFallbackWithoutIndexedDb(GifManager) {
  const localStorage = createStorageStub();
  const doc = createFakeDocument();
  const manager = new GifManager(createFakeWin({ indexedDB: null, localStorage }), doc);
  await manager.storageReadyPromise;

  manager.addFloatingGif('data:image/gif;base64,FALLBACK', { x: 1, y: 2 });
  await tick();

  const saved = JSON.parse(localStorage.getItem('floatingGifs'));
  assert.ok(Array.isArray(saved) && saved.length === 1, 'without IndexedDB the localStorage path must persist gifs');
  assert.equal(saved[0].src, 'data:image/gif;base64,FALLBACK');
}

async function main() {
  const { GifManager } = await import('../js/features/media/gif-manager.js');
  
  await testDragUsesPointerEventsOnly(GifManager);
  await testIndexedDbRoundTrip(GifManager);
  await testLegacyLocalStorageMigratesIntoIndexedDb(GifManager);
  await testLocalStorageFallbackWithoutIndexedDb(GifManager);
  console.log('gif-pointer-persistence.test: all assertions passed');
}

main();
