const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

function createElementStub() {
  return {
    style: {},
    innerHTML: '',
    classList: {
      add() {},
      remove() {},
      contains() {
        return false;
      }
    },
    appendChild() {},
    insertBefore(child) {
      return child;
    },
    setAttribute() {},
    querySelector() {
      return null;
    },
    querySelectorAll() {
      return [];
    }
  };
}

function createStorageRecorder(seed = {}) {
  const store = new Map(
    Object.entries(seed).map(([key, value]) => [key, String(value)])
  );
  const calls = [];

  return {
    calls,
    getItem(key) {
      calls.push(['getItem', key]);
      return store.has(key) ? store.get(key) : null;
    },
    setItem(key, value) {
      calls.push(['setItem', key, String(value)]);
      store.set(key, String(value));
    },
    removeItem(key) {
      calls.push(['removeItem', key]);
      store.delete(key);
    }
  };
}

function createTimerHarness() {
  let nextId = 1;
  const scheduled = new Map();

  return {
    setTimeout(callback) {
      const id = nextId++;
      scheduled.set(id, callback);
      return id;
    },
    clearTimeout(id) {
      scheduled.delete(id);
    },
    flushAll() {
      while (scheduled.size > 0) {
        const entries = Array.from(scheduled.entries());
        scheduled.clear();
        entries.forEach(([, callback]) => callback());
      }
    }
  };
}

function loadBackgroundManager({ localStorage }) {
  const timers = createTimerHarness();
  const source = fs.readFileSync(
    path.join(__dirname, '..', 'js', 'background.js'),
    'utf8'
  ) + '\n;globalThis.__backgroundPersistenceBatchingExports = { BackgroundManager: window.AboardBackgroundManager || window.BackgroundManager };';

  const sandbox = {
    console: {
      warn() {},
      log() {},
      error() {}
    },
    window: {
      devicePixelRatio: 1,
      dispatchEvent() {},
      safeDeepClone(value) {
        return JSON.parse(JSON.stringify(value));
      }
    },
    document: {
      body: {
        contains() {
          return false;
        }
      },
      getElementById() {
        return null;
      },
      createElementNS() {
        return createElementStub();
      },
      createElement() {
        return createElementStub();
      }
    },
    localStorage,
    sessionStorage: {
      getItem() {
        return null;
      },
      setItem() {},
      removeItem() {}
    },
    setTimeout: timers.setTimeout,
    clearTimeout: timers.clearTimeout,
    CustomEvent: class CustomEvent {
      constructor(type, init = {}) {
        this.type = type;
        this.detail = init.detail;
      }
    },
    Image: class FakeImage {
      set src(value) {
        this._src = value;
      }
    },
    Math,
    Number,
    String,
    Boolean,
    Array,
    Object,
    Set,
    Map,
    Date,
    parseInt,
    parseFloat,
    JSON
  };

  sandbox.globalThis = sandbox;
  sandbox.window.document = sandbox.document;
  vm.createContext(sandbox);
  vm.runInContext(source, sandbox, { filename: 'background.js' });

  return {
    BackgroundManager: sandbox.__backgroundPersistenceBatchingExports.BackgroundManager,
    flushTimers: timers.flushAll
  };
}

function countStorageWrites(storage, key) {
  return storage.calls.filter(([type, candidateKey]) => type === 'setItem' && candidateKey === key).length;
}

function getLastStorageWrite(storage, key) {
  const matches = storage.calls.filter(([type, candidateKey]) => type === 'setItem' && candidateKey === key);
  return matches.length ? matches[matches.length - 1][2] : null;
}

function createManager() {
  const storage = createStorageRecorder();
  const { BackgroundManager, flushTimers } = loadBackgroundManager({ localStorage: storage });
  const bgCanvas = {
    width: 1280,
    height: 720,
    clientWidth: 1280,
    clientHeight: 720,
    style: {}
  };
  const bgCtx = {
    clearRect() {},
    fillRect() {},
    save() {},
    restore() {}
  };

  const manager = new BackgroundManager(bgCanvas, bgCtx);
  manager.drawBackground = () => {};
  manager.renderCoordinateOverlay = () => {};
  manager.emitBackgroundUiState = () => {};
  manager.supportsMovableOrigin = () => true;
  manager.backgroundPattern = 'image';

  return { manager, storage, flushTimers };
}

function testImageTransformWritesAreBatched() {
  const { manager, storage, flushTimers } = createManager();

  manager.updateImageTransform({ x: 10, y: 20, width: 100, height: 60, rotation: 0, scale: 1 });
  manager.updateImageTransform({ x: 40, y: 50, width: 100, height: 60, rotation: 0, scale: 1 });
  manager.updateImageTransform({ x: 70, y: 80, width: 100, height: 60, rotation: 0, scale: 1 });

  assert.equal(
    countStorageWrites(storage, 'imageTransform'),
    0,
    'image transform writes should be deferred while dragging is still active'
  );

  flushTimers();

  assert.equal(
    countStorageWrites(storage, 'imageTransform'),
    1,
    'image transform writes should be coalesced into a single flush'
  );
  assert.deepEqual(
    JSON.parse(getLastStorageWrite(storage, 'imageTransform')),
    { x: 70, y: 80, width: 100, height: 60, rotation: 0, scale: 1, flipHorizontal: false, flipVertical: false },
    'the flushed image transform should keep only the latest state'
  );
}

function testCoordinateOriginWritesAreBatched() {
  const { manager, storage, flushTimers } = createManager();

  manager.setCoordinateOrigin(12, 24);
  manager.setCoordinateOrigin(36, 48);
  manager.setCoordinateOrigin(72, 96);

  assert.equal(
    countStorageWrites(storage, 'coordinateOriginX'),
    0,
    'coordinate origin x should not write synchronously during drag updates'
  );
  assert.equal(
    countStorageWrites(storage, 'coordinateOriginY'),
    0,
    'coordinate origin y should not write synchronously during drag updates'
  );

  flushTimers();

  assert.equal(countStorageWrites(storage, 'coordinateOriginX'), 1);
  assert.equal(countStorageWrites(storage, 'coordinateOriginY'), 1);
  assert.equal(getLastStorageWrite(storage, 'coordinateOriginX'), '72');
  assert.equal(getLastStorageWrite(storage, 'coordinateOriginY'), '96');
}

function testCoordinateOverlayWritesAreBatched() {
  const { manager, storage, flushTimers } = createManager();

  manager.setCoordinateOverlayState({ points: [{ id: 'p1', x: 1, y: 2 }] });
  manager.setCoordinateOverlayState({ points: [{ id: 'p2', x: 3, y: 4 }] });
  manager.updateCoordinateOverlayOptions({ showTicks: false });

  assert.equal(
    countStorageWrites(storage, 'coordinateOverlayState'),
    0,
    'coordinate overlay persistence should be deferred during rapid edits'
  );

  flushTimers();

  assert.equal(
    countStorageWrites(storage, 'coordinateOverlayState'),
    1,
    'coordinate overlay persistence should be flushed once with the latest state'
  );
  const persistedState = JSON.parse(getLastStorageWrite(storage, 'coordinateOverlayState'));
  assert.equal(persistedState.points.length, 1);
  assert.equal(persistedState.points[0].id, 'p2');
  assert.equal(persistedState.showTicks, false);
}

function testImageSizeWritesAreBatched() {
  const { manager, storage, flushTimers } = createManager();
  manager.imageTransform = {
    x: 0,
    y: 0,
    width: 120,
    height: 80,
    rotation: 0,
    scale: 1,
    flipHorizontal: false,
    flipVertical: false
  };

  manager.setImageSize(1.2);
  manager.setImageSize(1.5);
  manager.setImageSize(1.8);

  assert.equal(
    countStorageWrites(storage, 'imageSize'),
    0,
    'image size writes should not happen on every slider input frame'
  );
  assert.equal(
    countStorageWrites(storage, 'imageTransform'),
    0,
    'resized image transforms should also wait for the batched flush'
  );

  flushTimers();

  assert.equal(countStorageWrites(storage, 'imageSize'), 1);
  assert.equal(countStorageWrites(storage, 'imageTransform'), 1);
  assert.equal(getLastStorageWrite(storage, 'imageSize'), '1.8');
}

(function main() {
  testImageTransformWritesAreBatched();
  testCoordinateOriginWritesAreBatched();
  testCoordinateOverlayWritesAreBatched();
  testImageSizeWritesAreBatched();
  console.log('background-persistence-batching.test: all assertions passed');
})();
