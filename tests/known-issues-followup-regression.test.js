const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

function createStorage(initialEntries = {}) {
  const store = new Map(Object.entries(initialEntries).map(([key, value]) => [key, String(value)]));
  return {
    get length() { return store.size; },
    key(index) { return [...store.keys()][index] ?? null; },
    getItem(key) { return store.has(key) ? store.get(key) : null; },
    setItem(key, value) { store.set(key, String(value)); },
    removeItem(key) { store.delete(key); },
    clear() { store.clear(); }
  };
}

function loadProjectManagerForImageLimit(allocationAttempts) {
  class OversizedImage {
    constructor() {
      this.width = 20000;
      this.height = 20000;
    }

    set src(value) {
      this._src = value;
      this.onload?.();
    }
  }

  const context = {
    window: {},
    document: {
      createElement(tagName) {
        assert.equal(tagName, 'canvas');
        return {
          width: 0,
          height: 0,
          getContext() {
            return {
              drawImage() {},
              getImageData() {
                allocationAttempts.push('getImageData');
                throw new Error('unsafe pixel allocation reached');
              },
              putImageData() {}
            };
          },
          toDataURL() { return 'data:image/png;base64,'; }
        };
      },
      body: { appendChild() {}, removeChild() {} }
    },
    localStorage: createStorage(),
    console,
    Image: OversizedImage,
    Uint8Array,
    Blob,
    FileReader: class {},
    Promise,
    Math,
    Number,
    String,
    Boolean,
    Array,
    Object,
    JSON,
    Set,
    Map,
    Date,
    parseInt,
    parseFloat,
    isNaN,
    setTimeout,
    clearTimeout,
    fetch: () => Promise.reject(new Error('network disabled'))
  };
  context.globalThis = context;
  context.self = context;
  vm.createContext(context);
  const source = fs.readFileSync(path.join(__dirname, '..', 'js', 'modules', 'project-manager.js'), 'utf8')
    + '\n;globalThis.__ProjectManager = ProjectManager;';
  vm.runInContext(source, context, { filename: 'project-manager.js' });
  return context.__ProjectManager;
}

async function testOversizedImportedImageIsRejectedBeforePixelAllocation() {
  const allocationAttempts = [];
  const ProjectManager = loadProjectManagerForImageLimit(allocationAttempts);
  const manager = Object.create(ProjectManager.prototype);
  manager.t = (_key, fallback) => fallback;

  await assert.rejects(
    manager.base64ToImageData('data:image/png;base64,oversized'),
    /dimensions|pixels|too large/i,
    'oversized decoded images must be rejected before allocating a full RGBA canvas (KNOWN_ISSUES A8)'
  );
  assert.deepEqual(allocationAttempts, [], 'getImageData must not run for an oversized decoded image');
}

function loadCacheRuntime(localStorage, sessionStorage) {
  const context = {
    window: { setTimeout, clearTimeout },
    document: { getElementById() { return null; } },
    navigator: {},
    caches: { async keys() { return []; }, async delete() { return true; } },
    localStorage,
    sessionStorage,
    console,
    Promise,
    Set,
    Map,
    Object,
    String,
    Number,
    Boolean,
    Math,
    JSON,
    Blob,
    StorageManager: { estimateSessionSize() { return 0; } }
  };
  context.globalThis = context;
  context.self = context;
  vm.createContext(context);
  const source = fs.readFileSync(path.join(__dirname, '..', 'js', 'modules', 'cache-runtime.js'), 'utf8');
  vm.runInContext(source, context, { filename: 'cache-runtime.js' });
  return context.window.AboardCacheRuntime;
}

async function testOtherCacheCleanupPreservesApplicationSettings() {
  const protectedEntries = {
    locale: 'zh-CN',
    customFonts: '["Teacher Font"]',
    controlButtonOrder: '["zoom","time"]',
    fontPreferences: '{}',
    fontPreviewSettings: '{}',
    updatePreference: 'manual',
    legacyProjectImportEnabled: 'true',
    aboardLocalePreferenceMode: 'manual',
    aboardDownloadedLocales: '["zh-CN"]',
    collapsedSections: '["display"]',
    aboardDeferredLocaleSuggestionDismissed: 'true',
    timeDisplayMode: 'clock',
    shapeLineStyle: 'solid',
    scoreboard_data_main: '{}',
    randomPickerConfig: '{}',
    hideAnnouncement: 'true'
  };
  const localStorage = createStorage({ ...protectedEntries, disposableThirdPartyCache: 'remove-me' });
  const sessionStorage = createStorage();
  const runtime = loadCacheRuntime(localStorage, sessionStorage);
  const board = {
    syncSessionSnapshotKey: 'aboardSyncSessionSnapshot',
    isSessionWriteAllowed() { return true; },
    getCacheKeyGroups() { return runtime.getCacheKeyGroups(this); },
    setCacheStorageSizeSnapshot() {}
  };

  const result = await runtime.clearSelectedCache(board, { settings: false, canvas: false, other: true });
  assert.equal(result, true);
  for (const [key, value] of Object.entries(protectedEntries)) {
    assert.equal(localStorage.getItem(key), value, `other-cache cleanup must preserve ${key}`);
  }
  assert.equal(localStorage.getItem('disposableThirdPartyCache'), null,
    'unclassified disposable data should still be removed');
}

function testPageInputCannotCreatePages() {
  const paginationSource = fs.readFileSync(
    path.join(__dirname, '..', 'js', 'modules', 'pagination-runtime.js'),
    'utf8'
  );
  const eventSource = fs.readFileSync(
    path.join(__dirname, '..', 'js', 'modules', 'event-setup-runtime.js'),
    'utf8'
  );
  const indexHtml = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');

  assert.match(paginationSource, /function goToPage\(pageNumber,\s*options\s*=\s*\{\}\)/,
    'goToPage must distinguish navigation from explicit page creation (KNOWN_ISSUES A13)');
  assert.match(eventSource, /goToPage\([^\n]+allowCreate:\s*false/,
    'the page-number input must navigate existing pages only');
  assert.match(indexHtml, /id="page-input"[^>]*max="1"/,
    'the page-number input needs an initial max bound');
  assert.match(paginationSource, /pageInput\.max\s*=\s*this\.pages\.length/,
    'the page-number input max must follow the current page count');
}

function testBackgroundImageModeIsPersisted() {
  const source = fs.readFileSync(path.join(__dirname, '..', 'js', 'background.js'), 'utf8');
  const start = source.indexOf('setBackgroundImage(imageData)');
  const end = source.indexOf('toggleImagePlayback()', start);
  const body = source.slice(start, end);
  const modeAssignment = body.indexOf("this.backgroundPattern = 'image'");
  const modePersistence = body.indexOf("safeBackgroundStorageSetItem('backgroundPattern', 'image')");
  assert.ok(modeAssignment >= 0 && modePersistence > modeAssignment,
    'setBackgroundImage must persist image mode with its data (KNOWN_ISSUES A15)');
}

function loadPaginationRuntimeForSnapshotScale(scaledSnapshot) {
  let createdCanvases = 0;
  const context = {
    window: {
      safeDeepClone(value) { return JSON.parse(JSON.stringify(value)); }
    },
    document: {
      getElementById() { return null; },
      createElement(tagName) {
        assert.equal(tagName, 'canvas');
        createdCanvases += 1;
        return {
          width: 0,
          height: 0,
          getContext() {
            if (createdCanvases === 1) {
              return { putImageData() {} };
            }
            return {
              drawImage() {},
              getImageData() { return scaledSnapshot; }
            };
          }
        };
      }
    },
    localStorage: createStorage(),
    console,
    Promise,
    Set,
    Map,
    Object,
    String,
    Number,
    Boolean,
    Math,
    JSON,
    Date,
    parseInt
  };
  context.globalThis = context;
  context.self = context;
  vm.createContext(context);
  const source = fs.readFileSync(path.join(__dirname, '..', 'js', 'modules', 'pagination-runtime.js'), 'utf8');
  vm.runInContext(source, context, { filename: 'pagination-runtime.js' });
  return context.window.AboardPaginationRuntime;
}

function testScaledPageRestorePreservesOriginalSnapshot() {
  const originalSnapshot = { width: 100, height: 50, data: { byteLength: 20000 } };
  const scaledSnapshot = { width: 200, height: 100, data: { byteLength: 80000 } };
  const runtime = loadPaginationRuntimeForSnapshotScale(scaledSnapshot);
  const board = {
    currentPage: 1,
    pages: [originalSnapshot],
    canvas: { width: 200, height: 100 },
    ctx: {
      save() {},
      setTransform() {},
      clearRect() {},
      restore() {},
      putImageData() {}
    },
    restorePageScene() { return null; },
    restorePageBackground() { return Promise.resolve(); },
    historyManager: { reset() {}, saveState() {} },
    drawingEngine: { updateOffCanvasImageMirrors() {} },
    saveSessionDebounced() {},
    insertTextManager: null
  };

  runtime.loadPage(board, 1);

  assert.equal(board.pages[0], originalSnapshot,
    'scaling a page for display must not replace its original snapshot (KNOWN_ISSUES A14)');
}

function testViewportResizePreservesPanAndPanSyncsTeachingTools() {
  const eventSource = fs.readFileSync(
    path.join(__dirname, '..', 'js', 'modules', 'event-setup-runtime.js'),
    'utf8'
  );
  const resizeStart = eventSource.indexOf("window.addEventListener('resize'");
  const resizeEnd = eventSource.indexOf('// Ctrl+scroll to zoom canvas', resizeStart);
  const resizeBody = eventSource.slice(resizeStart, resizeEnd);
  assert.doesNotMatch(resizeBody, /recalculateAndRecenterCanvas\s*\(/,
    'viewport resize must preserve the current pan offset (KNOWN_ISSUES B27)');
  assert.match(resizeBody, /canvasFitScale\s*=\s*this\.calculateCanvasFitScale\s*\(/,
    'viewport resize must still refresh the fit scale');

  const interactionSource = fs.readFileSync(
    path.join(__dirname, '..', 'js', 'modules', 'interaction-runtime.js'),
    'utf8'
  );
  const syncStart = interactionSource.indexOf('function syncInteractiveOverlays()');
  const syncEnd = interactionSource.indexOf('function shouldShowLiveStrokePreview()', syncStart);
  const syncBody = interactionSource.slice(syncStart, syncEnd);
  assert.match(syncBody, /teachingToolsManager\?\.redrawTools\?\.\(\)/,
    'panning must keep teaching-tool overlays aligned with the canvas (KNOWN_ISSUES B43)');
}

function testOverlayTransformsTrackOwningPointer() {
  const files = [
    'js/image-controls.js',
    'js/insert-image.js',
    'js/modules/insert-text-manager.js'
  ];
  for (const relativePath of files) {
    const source = fs.readFileSync(path.join(__dirname, '..', relativePath), 'utf8');
    assert.match(source, /activeGesturePointerKey\s*=\s*null/,
      `${relativePath} must track the pointer that started a transform (KNOWN_ISSUES B21)`);
    assert.match(source, /eventOwns[A-Za-z]+Gesture\(/,
      `${relativePath} must ignore move/end events from other pointers`);
  }
}

function loadBackgroundManager() {
  const sandbox = {
    console,
    Math,
    Number,
    Set,
    Date,
    Infinity,
    window: {},
    document: {
      createElement() {
        return { style: {}, appendChild() {}, setAttribute() {}, getContext() { return {}; } };
      }
    },
    localStorage: createStorage()
  };
  sandbox.globalThis = sandbox;
  sandbox.self = sandbox;
  sandbox.window.document = sandbox.document;
  vm.createContext(sandbox);
  const source = fs.readFileSync(path.join(__dirname, '..', 'js', 'background.js'), 'utf8');
  vm.runInContext(source, sandbox, { filename: 'background.js' });
  return sandbox.window.BackgroundManager;
}

function testPolarSnapAndCoordinateDuplicateThresholdFollowGrid() {
  const BackgroundManager = loadBackgroundManager();
  const proto = BackgroundManager.prototype;
  const polar = Object.create(proto);
  polar.backgroundPattern = 'polar';
  polar.coordinateOverlayState = { snapToGrid: true };
  polar.getPatternOriginLogical = () => ({ x: 0, y: 0 });
  polar.getCoordinateUnitSize = () => 10;
  polar.getPolarAngleStep = () => 30;

  const snapped = proto.canvasLogicalToMathPoint.call(polar, 17.32, -10);
  assert.ok(Math.abs(snapped.x - 1.73) < 0.001 && Math.abs(snapped.y - 1) < 0.001,
    'polar snapping must target ring/ray intersections instead of Cartesian integers (KNOWN_ISSUES B32)');

  const dense = Object.create(proto);
  dense.backgroundPattern = 'coordinate';
  dense.coordinateOverlayState = { snapToGrid: true };
  dense.canvasLogicalToMathPoint = () => ({ x: 1, y: 0 });
  dense.findCoordinatePointByMathPosition = () => null;
  let duplicateThreshold = null;
  dense.findCoordinatePointNearCanvasPoint = (_x, _y, threshold) => {
    duplicateThreshold = threshold;
    return null;
  };
  dense.getCoordinateUnitSize = () => 20 / 3;
  dense.getCoordinateOverlayState = () => ({ points: [] });
  dense.setCoordinateOverlayState = () => {};
  dense.getCoordinatePaletteColor = () => '#000000';
  proto.addCoordinatePoint.call(dense, 20 / 3, 0);
  assert.ok(duplicateThreshold < 3,
    'duplicate detection must shrink below adjacent grid spacing at high density (KNOWN_ISSUES B33)');
}

function testRetriggeringInsertTextEditsPendingOverlay() {
  const source = fs.readFileSync(
    path.join(__dirname, '..', 'js', 'modules', 'insert-text-manager.js'),
    'utf8'
  );
  const start = source.indexOf('trigger() {');
  const reset = source.indexOf('// Reset state for new text', start);
  const guard = source.slice(start, reset);
  assert.match(guard, /if\s*\(this\.isActive\)[\s\S]*showModal\(true\)[\s\S]*return/,
    'retriggering insert text must edit the pending overlay instead of replacing it (KNOWN_ISSUES B22)');
}

function testWritingPaperPatternsMatchTheirNames() {
  const BackgroundManager = loadBackgroundManager();
  const proto = BackgroundManager.prototype;
  const manager = Object.create(proto);
  manager.patternDensity = 1;
  manager.getPatternColor = () => '#123456';
  manager.isLightBackground = () => true;

  const tianzigeSvg = proto.renderTianzigePatternSvg.call(manager, 60, 60);
  assert.doesNotMatch(tianzigeSvg, /M 0 0 L 60 60|M 60 0 L 0 60/,
    'tianzige must not contain the diagonal guides that distinguish mizige (KNOWN_ISSUES B41)');

  const englishSvg = proto.renderEnglishLinesPatternSvg.call(manager, 240, 240);
  const groupStarts = Array.from(englishSvg.matchAll(/<line x1="0" y1="([^"]+)"/g), match => Number(match[1]))
    .filter((_value, index) => index % 4 === 0);
  assert.deepEqual(groupStarts, [60, 150],
    'English four-line groups need a larger gap between groups than within a group (KNOWN_ISSUES B42)');

  const segments = [];
  let segmentStart = null;
  manager.bgCanvas = { width: 60, height: 60 };
  manager.bgCtx = {
    strokeStyle: '',
    lineWidth: 0,
    strokeRect() {},
    beginPath() { segmentStart = null; },
    moveTo(x, y) { segmentStart = [x, y]; },
    lineTo(x, y) { segments.push([segmentStart, [x, y]]); },
    stroke() {}
  };
  proto.drawTianzigePattern.call(manager, 1, '#123456');
  assert.deepEqual(segments, [
    [[30, 0], [30, 60]],
    [[0, 30], [60, 30]]
  ], 'Canvas tianzige rendering must also omit both diagonals (KNOWN_ISSUES B41)');

  const canvasLineYs = [];
  manager.bgCanvas = { width: 240, height: 240 };
  manager.bgCtx = {
    strokeStyle: '',
    lineWidth: 0,
    beginPath() {},
    moveTo(_x, y) { canvasLineYs.push(y); },
    lineTo() {},
    stroke() {},
    setLineDash() {}
  };
  proto.drawEnglishLinesPattern.call(manager, 1, '#123456');
  assert.deepEqual(canvasLineYs.filter((_value, index) => index % 4 === 0), [60, 150],
    'Canvas English four-line rendering must leave a visible inter-group gap (KNOWN_ISSUES B42)');

  manager.patternDensity = 3;
  const denseDots = proto.renderDotsPatternSvg.call(manager, 3840, 2160);
  assert.equal((denseDots.match(/<circle\b/g) || []).length, 1,
    'dense dot paper must use one reusable SVG pattern node (KNOWN_ISSUES C8)');
  assert.ok(denseDots.length < 2000,
    '4K dot paper markup must remain constant-size instead of allocating one node per dot');

  const denseTianzige = proto.renderTianzigePatternSvg.call(manager, 3840, 2160);
  assert.equal((denseTianzige.match(/<rect\b/g) || []).length, 1,
    'dense tianzige must use one reusable SVG pattern tile (KNOWN_ISSUES C8)');
  assert.ok(denseTianzige.length < 2500,
    '4K tianzige markup must remain constant-size instead of allocating one node per cell');
}

async function main() {
  await testOversizedImportedImageIsRejectedBeforePixelAllocation();
  await testOtherCacheCleanupPreservesApplicationSettings();
  testPageInputCannotCreatePages();
  testBackgroundImageModeIsPersisted();
  testScaledPageRestorePreservesOriginalSnapshot();
  testViewportResizePreservesPanAndPanSyncsTeachingTools();
  testOverlayTransformsTrackOwningPointer();
  testPolarSnapAndCoordinateDuplicateThresholdFollowGrid();
  testRetriggeringInsertTextEditsPendingOverlay();
  testWritingPaperPatternsMatchTheirNames();
  console.log('known-issues-followup-regression.test: all assertions passed');
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
