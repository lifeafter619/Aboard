const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const REPO_ROOT = path.join(__dirname, '..');
const BIG_DATA_URL = `data:image/png;base64,${'A'.repeat(8192)}`;
const SECOND_DATA_URL = `data:image/png;base64,${'B'.repeat(4096)}`;

function readSource(relativePath) {
  return fs.readFileSync(path.join(REPO_ROOT, relativePath), 'utf8');
}

function createStorageStub(seed = {}) {
  const store = new Map(Object.entries(seed));
  return {
    store,
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

function loadModulesIntoContext(sandbox, files) {
  sandbox.globalThis = sandbox;
  sandbox.window.document = sandbox.document;
  sandbox.window.localStorage = sandbox.localStorage;
  vm.createContext(sandbox);
  for (const file of files) {
    vm.runInContext(readSource(file), sandbox, { filename: file });
  }
}

function loadPaginationAndProjectManager(localStorage) {
  const sandbox = {
    console,
    window: {
      safeDeepClone(value) {
        return JSON.parse(JSON.stringify(value));
      }
    },
    document: {
      getElementById() {
        return null;
      }
    },
    localStorage,
    JSON,
    Math,
    Object,
    Number,
    String,
    Boolean,
    Array,
    Set,
    Map,
    Date,
    Promise,
    parseInt,
    parseFloat,
    Image: class FakeImage {
      set src(value) {
        this._src = value;
      }
    }
  };
  loadModulesIntoContext(sandbox, [
    'js/modules/pagination-runtime.js',
    'js/modules/project-manager.js'
  ]);
  return sandbox;
}

// N1: imported project packages carry one full backgroundImageData payload
// per page; the import path must route them through the shared pool instead
// of writing N duplicated copies into localStorage.
async function testImportedPageBackgroundsGoThroughSharedPool() {
  const localStorage = createStorageStub();
  const sandbox = loadPaginationAndProjectManager(localStorage);
  const ProjectManager = sandbox.window.ProjectManager || sandbox.window.AboardProjectManager;
  const manager = Object.create(ProjectManager.prototype);
  const drawingBoard = {
    settingsManager: {},
    applyCanvasSize() {},
    uploadedImages: [],
    updateUploadedImagesButtons() {},
    pageBackgrounds: {},
    sharedPageBackgroundImages: new Map(),
    applySerializedPageScenes: async () => {},
    loadPage() {},
    enforcePageBitmapMemoryBudget() {},
    updatePaginationUI() {},
    updateBackgroundUI() {},
    updateUI() {},
    saveSessionDebounced() {},
    backgroundManager: {}
  };
  manager.drawingBoard = drawingBoard;

  await manager.applyImportedProjectState({
    settings: {},
    uploadedImages: [],
    globalBackground: null,
    pageBackgrounds: {
      1: { backgroundPattern: 'image', backgroundImageData: BIG_DATA_URL },
      2: { backgroundPattern: 'image', backgroundImageData: BIG_DATA_URL },
      3: { backgroundPattern: 'image', backgroundImageData: SECOND_DATA_URL },
      4: { backgroundPattern: 'grid', backgroundImageData: null }
    },
    pageScenes: {},
    pagesImageData: null,
    rasterFallbackPages: null,
    currentPage: 1,
    pageCount: 4
  });

  assert.ok(
    drawingBoard.pageBackgrounds[1].backgroundImageData.startsWith('shared:'),
    'imported page 1 must hold a compact shared-pool reference'
  );
  assert.equal(
    drawingBoard.pageBackgrounds[1].backgroundImageData,
    drawingBoard.pageBackgrounds[2].backgroundImageData,
    'pages sharing one payload must share one pool reference'
  );
  assert.ok(
    drawingBoard.pageBackgrounds[3].backgroundImageData.startsWith('shared:'),
    'a different payload gets its own pool entry'
  );
  assert.notEqual(
    drawingBoard.pageBackgrounds[3].backgroundImageData,
    drawingBoard.pageBackgrounds[1].backgroundImageData
  );
  assert.equal(
    drawingBoard.pageBackgrounds[4].backgroundImageData,
    null,
    'pages without a background image keep null'
  );
  assert.equal(
    drawingBoard.sharedPageBackgroundImages.size,
    2,
    'the pool should hold exactly the two distinct payloads'
  );

  const persistedPages = localStorage.getItem('pageBackgrounds');
  const persistedPool = localStorage.getItem('sharedPageBackgroundImages');
  assert.ok(persistedPages.includes('shared:'), 'persisted page entries use compact references');
  assert.ok(!persistedPages.includes(BIG_DATA_URL), 'persisted page entries must not embed the payload');
  assert.ok(persistedPool.includes(BIG_DATA_URL), 'the pool persists the payload');
  const totalOccurrences = (persistedPages.split(BIG_DATA_URL).length - 1)
    + (persistedPool.split(BIG_DATA_URL).length - 1);
  assert.equal(totalOccurrences, 1, 'the payload must be stored exactly once across both keys');
}

function loadBackgroundManagerClass() {
  const sandbox = {
    console: { warn() {}, log() {}, error() {} },
    window: {
      devicePixelRatio: 1,
      addEventListener() {},
      dispatchEvent() {},
      safeDeepClone(value) {
        return JSON.parse(JSON.stringify(value));
      }
    },
    document: {
      getElementById() {
        return null;
      },
      createElement() {
        return { style: {} };
      },
      createElementNS() {
        return { style: {} };
      },
      body: {
        contains() {
          return false;
        }
      }
    },
    localStorage: createStorageStub(),
    setTimeout,
    clearTimeout,
    CustomEvent: class FakeCustomEvent {
      constructor(type) {
        this.type = type;
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
    JSON,
    Promise,
    parseInt,
    parseFloat
  };
  sandbox.globalThis = sandbox;
  const source = `${readSource('js/background.js')}\nwindow.__BackgroundManager = BackgroundManager;`;
  vm.createContext(sandbox);
  vm.runInContext(source, sandbox, { filename: 'js/background.js' });
  return sandbox.window.__BackgroundManager;
}

// N2: the coordinate origin marker interpolates backgroundColor into SVG
// stroke attributes; an imported/corrupt value must go through
// sanitizeSvgColor like every other color sink in the overlay.
function testCoordinateOriginMarkerSanitizesBackgroundColor() {
  const BackgroundManager = loadBackgroundManagerClass();
  const proto = BackgroundManager.prototype;
  const maliciousBackground = '#ffffff" onbegin="window.__originXss=1"><animate attributeName="r" values="1;2';

  const stub = Object.create(proto);
  stub.backgroundColor = maliciousBackground;
  stub.patternIntensity = 0.5;
  stub.coordinateOverlayState = { showOrigin: true };
  stub.canvasLogicalToScreenPoint = (x, y) => ({ x, y });

  const markup = proto.renderCoordinateOriginSvg.call(stub, { x: 0, y: 0 }, {
    rect: { left: 0, top: 0 },
    scaleX: 1,
    scaleY: 1,
    visualScale: 1
  });

  assert.ok(
    !markup.includes(maliciousBackground),
    'the raw backgroundColor must never reach the origin marker markup'
  );
  assert.ok(
    !markup.includes('onbegin'),
    'attribute injection through backgroundColor must be neutralized'
  );
  assert.ok(
    markup.includes('stroke="#ffffff"'),
    'unparseable colors fall back to the sanitized white outline'
  );
}

// P1: renderCoordinateOverlay must not re-parse the overlay SVG DOM when the
// produced markup is unchanged (slider drags fire it on every input event).
function testCoordinateOverlaySkipsDomRewriteWhenMarkupUnchanged() {
  const BackgroundManager = loadBackgroundManagerClass();
  const proto = BackgroundManager.prototype;

  let innerHtmlAssignments = 0;
  const fakeSvg = {
    style: {},
    setAttribute() {},
    set innerHTML(value) {
      innerHtmlAssignments += 1;
      this._markup = value;
    },
    get innerHTML() {
      return this._markup;
    }
  };

  const markupSequence = [];
  const stub = Object.create(proto);
  stub.coordinateOverlayMarkup = '';
  stub.syncCoordinateOverlaySvgSize = () => ({
    svg: fakeSvg,
    logicalWidth: 1280,
    logicalHeight: 720,
    metrics: { rect: { left: 0, top: 0 }, scaleX: 1, scaleY: 1, visualScale: 1 }
  });
  stub.supportsMovableOrigin = () => true;
  stub.buildCoordinateOverlayMarkup = () => markupSequence[markupSequence.length - 1];

  markupSequence.push('<g>state-a</g>');
  proto.renderCoordinateOverlay.call(stub);
  markupSequence.push('<g>state-a</g>');
  proto.renderCoordinateOverlay.call(stub);
  assert.equal(
    innerHtmlAssignments,
    1,
    'an unchanged overlay markup must not reassign svg.innerHTML'
  );

  markupSequence.push('<g>state-b</g>');
  proto.renderCoordinateOverlay.call(stub);
  assert.equal(
    innerHtmlAssignments,
    2,
    'a changed overlay markup must still update svg.innerHTML'
  );
  assert.equal(fakeSvg.innerHTML, '<g>state-b</g>', 'the newest markup is rendered');
}

function loadExportManagerClass(link) {
  const sandbox = {
    console,
    window: {},
    document: {
      getElementById() {
        return null;
      },
      createElement(tag) {
        return tag === 'a' ? link : { style: {} };
      },
      body: {
        appendChild() {},
        removeChild() {}
      }
    },
    URL: {
      createObjectURL() {
        return 'blob:aboard-test';
      },
      revokeObjectURL() {}
    },
    JSON,
    Math,
    Object,
    Number,
    String,
    Boolean,
    Array,
    Date,
    Promise,
    parseInt,
    parseFloat
  };
  sandbox.globalThis = sandbox;
  const source = readSource('js/export.js');
  vm.createContext(sandbox);
  vm.runInContext(source, sandbox, { filename: 'js/export.js' });
  return sandbox.window.ExportManager;
}

// P2: single-page export must download through a Blob object URL (Firefox
// blocks data:-URL downloads); the multi-page zip path already works this way.
async function testSinglePageExportDownloadsViaBlobUrl() {
  const link = { download: null, href: null, click() {} };
  const ExportManager = loadExportManagerClass(link);

  const toBlobCalls = [];
  const toDataURLCalls = [];
  const canvas = {
    width: 100,
    height: 50,
    toBlob(callback, mimeType, quality) {
      toBlobCalls.push({ mimeType, quality });
      callback({ size: 7 });
    },
    toDataURL(...args) {
      toDataURLCalls.push(args);
      return 'data:image/png;base64,QUJD';
    }
  };
  const managerStub = {
    drawingBoard: {
      backgroundManager: { backgroundColor: '#ffffff' }
    }
  };

  await ExportManager.prototype.downloadCanvas.call(managerStub, canvas, 'my:page/name', 'png', null);

  assert.equal(toBlobCalls.length, 1, 'the page image must be encoded via canvas.toBlob');
  assert.equal(toBlobCalls[0].mimeType, 'image/png', 'PNG exports use the PNG mime type');
  assert.equal(toDataURLCalls.length, 0, 'toDataURL must not be used for downloads');
  assert.ok(link.href.startsWith('blob:'), 'the download link must use a blob object URL');
  assert.equal(link.download, 'my-page-name.png', 'unsafe filename characters are stripped');
}

async function main() {
  await testImportedPageBackgroundsGoThroughSharedPool();
  testCoordinateOriginMarkerSanitizesBackgroundColor();
  testCoordinateOverlaySkipsDomRewriteWhenMarkupUnchanged();
  await testSinglePageExportDownloadsViaBlobUrl();
  console.log('known-issues-2026-09-09-regression.test: all assertions passed');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
