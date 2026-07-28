// Regression coverage for the defects confirmed in the 2026-07-26 full-source review.
// Each test is named after its KNOWN_ISSUES.md entry so a failure points straight at
// the documented root cause.

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

// ---------------------------------------------------------------------------
// Loaders
// ---------------------------------------------------------------------------

function createRecordingContext(ops) {
  const ctx = {
    canvas: { width: 800, height: 480 },
    globalAlpha: 1,
    lineWidth: 1,
    lineCap: 'round',
    lineJoin: 'round',
    strokeStyle: '#000',
    fillStyle: '#000',
    globalCompositeOperation: 'source-over',
    save() { ops.push(['save']); },
    restore() { ops.push(['restore']); },
    beginPath() { ops.push(['beginPath']); },
    moveTo(x, y) { ops.push(['moveTo', x, y]); },
    lineTo(x, y) { ops.push(['lineTo', x, y]); },
    arc(...args) { ops.push(['arc', ...args]); },
    fill() { ops.push(['fill']); },
    stroke() { ops.push(['stroke']); },
    setLineDash(pattern) { ops.push(['setLineDash', pattern]); },
    closePath() { ops.push(['closePath']); },
    clearRect(...args) { ops.push(['clearRect', ...args]); },
    setTransform(...args) { ops.push(['setTransform', ...args]); },
    drawImage(...args) { ops.push(['drawImage', ...args]); },
    translate(...args) { ops.push(['translate', ...args]); },
    rotate(...args) { ops.push(['rotate', ...args]); },
    scale(...args) { ops.push(['scale', ...args]); },
    quadraticCurveTo(...args) { ops.push(['quadraticCurveTo', ...args]); },
    createLinearGradient() {
      return { addColorStop() {} };
    }
  };
  return ctx;
}

function loadDrawingEngine() {
  const source = fs.readFileSync(path.join(__dirname, '..', 'js', 'drawing.js'), 'utf8')
    + '\n;globalThis.__DrawingEngine = window.AboardDrawingEngine || window.DrawingEngine;';

  const document = {
    body: {
      appendChild(element) { element.parentNode = this; }
    },
    createElement(tagName) {
      const element = {
        tagName,
        id: '',
        style: {},
        width: 0,
        height: 0,
        getContext() {
          return createRecordingContext([]);
        }
      };
      return element;
    }
  };

  const sandbox = {
    console: { warn() {}, error() {}, log() {} },
    window: {
      document,
      devicePixelRatio: 1,
      innerWidth: 1280,
      innerHeight: 720,
      screen: { availWidth: 1280, availHeight: 720 },
      drawingBoard: null
    },
    document,
    localStorage: { getItem() { return null; }, setItem() {}, removeItem() {} },
    Math, Number, String, Boolean, Array, Object, JSON, Set, Map, Date,
    parseInt, parseFloat,
    requestAnimationFrame(cb) { cb(); return 1; },
    cancelAnimationFrame() {}
  };
  sandbox.globalThis = sandbox;
  sandbox.self = sandbox;

  vm.createContext(sandbox);
  vm.runInContext(source, sandbox, { filename: 'drawing.js' });
  return sandbox.__DrawingEngine;
}

function createCanvasStub() {
  return {
    offsetWidth: 800,
    offsetHeight: 480,
    width: 800,
    height: 480,
    style: {},
    getBoundingClientRect() {
      return { left: 0, top: 0, width: 800, height: 480 };
    }
  };
}

function loadTeachingToolsManager() {
  const source = `${fs.readFileSync(path.join(__dirname, '..', 'js', 'modules', 'teaching-tools.js'), 'utf8')}\nwindow.__TeachingToolsManager = TeachingToolsManager;`;
  const document = {
    createElement() {
      return {
        style: {}, classList: { add() {}, remove() {}, toggle() {}, contains() { return false; } },
        appendChild() {}, addEventListener() {}, removeEventListener() {},
        querySelector() { return null; }, querySelectorAll() { return []; },
        setAttribute() {}, getBoundingClientRect() { return { left: 0, top: 0, width: 0, height: 0 }; }
      };
    },
    body: { appendChild() {} },
    getElementById() { return null; },
    querySelector() { return null; },
    querySelectorAll() { return []; },
    addEventListener() {},
    removeEventListener() {}
  };
  class FakeImage {
    set src(value) { this._src = value; }
    get src() { return this._src || ''; }
  }
  const sandbox = {
    console,
    window: {
      requestAnimationFrame(cb) { cb(); },
      addEventListener() {}, removeEventListener() {},
      i18n: { applyTranslations() {} },
      document
    },
    document,
    Image: FakeImage,
    Math, Number, String, Boolean, Array, Object, Set, Map, WeakMap, WeakSet, Date, JSON,
    parseInt, parseFloat, Promise
  };
  sandbox.globalThis = sandbox;
  sandbox.self = sandbox;

  vm.createContext(sandbox);
  vm.runInContext(source, sandbox, { filename: 'teaching-tools.js' });
  return sandbox.window.__TeachingToolsManager;
}

function loadProjectManagerModule() {
  const source = fs.readFileSync(path.join(__dirname, '..', 'js', 'modules', 'project-manager.js'), 'utf8')
    + '\n;globalThis.__normalizeImportedBackgroundState = typeof normalizeImportedBackgroundState === "function" ? normalizeImportedBackgroundState : null;';
  const sandbox = {
    console: { warn() {}, error() {}, log() {} },
    window: {},
    document: {
      createElement() { return { style: {}, getContext() { return createRecordingContext([]); } }; },
      body: { appendChild() {}, removeChild() {} }
    },
    localStorage: { getItem() { return null; }, setItem() {}, removeItem() {} },
    Math, Number, String, Boolean, Array, Object, JSON, Set, Map, Date, Promise,
    parseInt, parseFloat, isNaN,
    setTimeout, clearTimeout,
    Uint8Array, Blob: class {}, FileReader: class {}, Image: class {},
    fetch: () => Promise.reject(new Error('no network in tests'))
  };
  sandbox.globalThis = sandbox;
  sandbox.self = sandbox;
  vm.createContext(sandbox);
  vm.runInContext(source, sandbox, { filename: 'project-manager.js' });
  return sandbox.__normalizeImportedBackgroundState;
}

// ---------------------------------------------------------------------------
// A9 - single-point strokes must survive a scene rebuild
// ---------------------------------------------------------------------------

function testSinglePointStrokeIsPaintedOnRedraw() {
  const DrawingEngine = loadDrawingEngine();
  const engine = new DrawingEngine(createCanvasStub(), {});

  const ops = [];
  engine.ctx = createRecordingContext(ops);

  engine.redrawStroke({
    tool: 'pen',
    penType: 'normal',
    color: '#000000',
    size: 6,
    points: [{ x: 120, y: 90 }]
  });

  const lineTos = ops.filter(op => op[0] === 'lineTo');
  assert.ok(
    lineTos.length >= 1,
    'a single-point stroke must emit a degenerate lineTo, otherwise the lone moveTo '
    + 'produces no pixels and tap-dots vanish on every scene rebuild (KNOWN_ISSUES A9)'
  );
  assert.deepEqual(
    lineTos[0],
    ['lineTo', 120, 90],
    'the degenerate segment must land on the stroke point itself'
  );
  assert.ok(ops.some(op => op[0] === 'stroke'), 'the path still has to be stroked');
}

function testMultiPointStrokeIsUnchanged() {
  const DrawingEngine = loadDrawingEngine();
  const engine = new DrawingEngine(createCanvasStub(), {});

  const ops = [];
  engine.ctx = createRecordingContext(ops);

  engine.redrawStroke({
    tool: 'pen',
    penType: 'normal',
    color: '#000000',
    size: 6,
    points: [{ x: 10, y: 10 }, { x: 20, y: 20 }, { x: 30, y: 30 }]
  });

  const lineTos = ops.filter(op => op[0] === 'lineTo');
  assert.deepEqual(
    lineTos,
    [['lineTo', 20, 20], ['lineTo', 30, 30]],
    'multi-point strokes must not gain an extra degenerate segment'
  );
}

// ---------------------------------------------------------------------------
// A10 - eraser strokes are never user-selectable
// ---------------------------------------------------------------------------

function testEraserStrokesAreNotSelectable() {
  const DrawingEngine = loadDrawingEngine();
  const engine = new DrawingEngine(createCanvasStub(), {});

  const inkStroke = { tool: 'pen', penType: 'normal', color: '#000', size: 4, points: [{ x: 1, y: 1 }, { x: 5, y: 5 }] };
  const eraserStroke = { tool: 'eraser', size: 40, points: [{ x: 10, y: 10 }, { x: 40, y: 40 }] };
  engine.strokes = [inkStroke, eraserStroke];

  assert.equal(engine.isSelectableStroke(inkStroke), true, 'ink strokes stay selectable');
  assert.equal(
    engine.isSelectableStroke(eraserStroke),
    false,
    'eraser strokes must not be selectable: selecting one lets the user delete it '
    + '(erased content reappears), drag it (the hole moves) or copy it to the top layer '
    + 'where it masks the whole scene (KNOWN_ISSUES A10)'
  );

  const selectable = engine.getSelectableRenderableObjects([]);
  const selectableStrokes = selectable.filter(renderable => renderable.type === 'stroke');
  assert.equal(selectableStrokes.length, 1, 'only the ink stroke may be offered to the selection tool');
  assert.equal(selectableStrokes[0].item, inkStroke);

  // Rendering must still see the eraser, otherwise erasing stops working entirely.
  const renderables = engine.getRenderableObjects([]);
  const renderedStrokes = renderables.filter(renderable => renderable.type === 'stroke');
  assert.equal(renderedStrokes.length, 2, 'the renderer must still receive eraser strokes');
}

// ---------------------------------------------------------------------------
// B7 - teaching tool rotation compensation direction
// ---------------------------------------------------------------------------

function testTeachingToolRotatePointMatchesCssRotation() {
  const TeachingToolsManager = loadTeachingToolsManager();
  const proto = TeachingToolsManager.prototype;

  // The overlay is positioned with CSS `rotate(${tool.rotation}deg)`, i.e. positive
  // angles turn clockwise in screen coordinates. rotatePoint must implement exactly
  // that so the +rotation / -rotation call sites mean local->world / world->local.
  const rotated = proto.rotatePoint(10, 0, 0, 0, 90);
  assert.ok(Math.abs(rotated.x - 0) < 1e-9, `expected x≈0, got ${rotated.x}`);
  assert.ok(Math.abs(rotated.y - 10) < 1e-9, `expected y≈10, got ${rotated.y}`);

  // World -> local must be the inverse. Previously rotatePoint implemented R(-angle)
  // while the call sites passed -tool.rotation, so the negatives cancelled and produced
  // R(+rotation): a 2*rotation error that made resize handles jump and reverse.
  const tool = { x: -50, y: -50, width: 100, height: 100, rotation: 90 };
  const local = proto.transformToToolSpace.call(proto, 0, 10, tool);
  assert.ok(Math.abs(local.x - 10) < 1e-9, `world->local x should be 10, got ${local.x}`);
  assert.ok(Math.abs(local.y - 0) < 1e-9, `world->local y should be 0, got ${local.y}`);
}

function testTeachingToolRotationRoundTrips() {
  const TeachingToolsManager = loadTeachingToolsManager();
  const proto = TeachingToolsManager.prototype;
  const tool = { x: 20, y: 40, width: 200, height: 120, rotation: 37 };
  const cx = tool.x + tool.width / 2;
  const cy = tool.y + tool.height / 2;

  const worldPoint = { x: 173, y: 61 };
  const local = proto.transformToToolSpace.call(proto, worldPoint.x, worldPoint.y, tool);
  // Rotating the local point forward by +rotation must return the original world point.
  const roundTrip = proto.rotatePoint(local.x, local.y, cx, cy, tool.rotation);

  assert.ok(
    Math.abs(roundTrip.x - worldPoint.x) < 1e-9 && Math.abs(roundTrip.y - worldPoint.y) < 1e-9,
    `world->local->world must round-trip; got (${roundTrip.x}, ${roundTrip.y}) `
    + `instead of (${worldPoint.x}, ${worldPoint.y}) (KNOWN_ISSUES B7)`
  );
}

// ---------------------------------------------------------------------------
// B8 - touch activation on image toolbar/flip controls must preserve click
// ---------------------------------------------------------------------------

function testImageControlTouchButtonsDoNotSuppressClick() {
  const source = fs.readFileSync(path.join(__dirname, '..', 'js', 'image-controls.js'), 'utf8');
  const setupStart = source.indexOf('setupEventListeners()');
  const setupEnd = source.indexOf('// Resize handles', setupStart);
  const dragStartBlock = source.slice(setupStart, setupEnd);
  const interactiveGuard = dragStartBlock.indexOf("hasClass('flip-handle')");
  const preventDefault = dragStartBlock.indexOf('e.preventDefault?.()');

  assert.ok(interactiveGuard >= 0, 'image control drag handling must guard flip and toolbar controls');
  assert.ok(
    preventDefault >= 0 && interactiveGuard < preventDefault,
    'touchstart must return for flip/toolbar controls before preventDefault; otherwise the '
    + 'synthesized click is suppressed and those controls are unusable (KNOWN_ISSUES B8)'
  );
  assert.match(dragStartBlock, /closest\('\.image-controls-toolbar'\)/,
    'the image controls toolbar must be excluded from drag activation');
}

// ---------------------------------------------------------------------------
// A5 - patternDensity must stay strictly positive across import
// ---------------------------------------------------------------------------

function testImportedPatternDensityIsClampedPositive() {
  const normalize = loadProjectManagerModule();
  assert.ok(typeof normalize === 'function', 'normalizeImportedBackgroundState should be reachable');

  const negative = normalize(null, { patternDensity: -1 });
  assert.ok(
    negative.patternDensity > 0,
    'a negative patternDensity must never reach the renderers: every pattern derives its '
    + 'spacing as `base / patternDensity`, so a non-positive value makes the render loops '
    + 'spin forever and freezes the page (KNOWN_ISSUES A5)'
  );

  const zero = normalize(null, { patternDensity: 0 });
  assert.ok(zero.patternDensity > 0, 'zero density must be rejected too');

  const huge = normalize(null, { patternDensity: 5000 });
  assert.ok(huge.patternDensity <= 3, 'absurdly high densities must be clamped as well');

  const sane = normalize(null, { patternDensity: 1.5 });
  assert.equal(sane.patternDensity, 1.5, 'valid densities must pass through untouched');
}

// ---------------------------------------------------------------------------
// B9 / C5 / C6 - toolbar customisation must not lock the user out
// ---------------------------------------------------------------------------

function testSettingsToolCannotBeHiddenAndSelectIsMapped() {
  const source = fs.readFileSync(path.join(__dirname, '..', 'js', 'modules', 'customization-runtime.js'), 'utf8');

  assert.ok(
    /ALWAYS_VISIBLE_TOOLS/.test(source),
    'toolbar visibility must protect entries that would otherwise be unreachable'
  );
  assert.ok(
    /'select':\s*'select-btn'/.test(source),
    "getToolToButtonIdMap must map 'select' to select-btn, otherwise applyToolbarOrder "
    + 'skips it (leaving it as the only unmoved button, pushed to the far left) and its '
    + 'visibility checkbox silently does nothing (KNOWN_ISSUES C5)'
  );

  const indexHtml = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
  const settingsCheckbox = indexHtml.match(/<input[^>]*id="toolbar-show-settings"[^>]*>/);
  assert.ok(settingsCheckbox, 'the settings visibility checkbox should exist');
  assert.ok(
    /\bdisabled\b/.test(settingsCheckbox[0]),
    'the settings toolbar checkbox must be disabled: the settings button is the only '
    + 'entry point to the dialog, so hiding it locks the user out of every setting - '
    + 'including the toggle that would bring it back (KNOWN_ISSUES B9)'
  );
}

function testToolbarOrderIsReplayedOnStartup() {
  const source = fs.readFileSync(path.join(__dirname, '..', 'js', 'modules', 'customization-runtime.js'), 'utf8');
  const initBody = source.slice(
    source.indexOf('function initToolbarCustomization'),
    source.indexOf('function getToolToButtonIdMap')
  );
  assert.ok(
    /applyToolbarOrder\(\)/.test(initBody),
    'initToolbarCustomization must replay the saved toolbar order on startup; otherwise '
    + 'a custom order is silently dropped on every launch while the settings panel keeps '
    + 'showing it as active (KNOWN_ISSUES C6)'
  );
}

// ---------------------------------------------------------------------------
// A4 - the unzip filter must reject bombs before anything is inflated
// ---------------------------------------------------------------------------

function loadFflate() {
  const src = fs.readFileSync(path.join(__dirname, '..', 'js', 'libs', 'fflate.min.js'), 'utf8');
  const sandbox = { window: {}, self: {}, module: { exports: {} }, exports: {} };
  sandbox.globalThis = sandbox;
  sandbox.self = sandbox;
  vm.createContext(sandbox);
  vm.runInContext(src, sandbox, { filename: 'fflate.min.js' });
  return sandbox.module.exports;
}

function loadProjectManagerClass() {
  const source = fs.readFileSync(path.join(__dirname, '..', 'js', 'modules', 'project-manager.js'), 'utf8')
    + '\n;globalThis.__ProjectManager = (typeof ProjectManager === "function") ? ProjectManager : (window.ProjectManager || null);';
  const sandbox = {
    console: { warn() {}, error() {}, log() {} },
    window: {},
    document: {
      createElement() { return { style: {}, getContext() { return createRecordingContext([]); } }; },
      body: { appendChild() {}, removeChild() {} }
    },
    localStorage: { getItem() { return null; }, setItem() {}, removeItem() {} },
    Math, Number, String, Boolean, Array, Object, JSON, Set, Map, Date, Promise,
    parseInt, parseFloat, isNaN,
    setTimeout, clearTimeout,
    Uint8Array, Blob: class {}, FileReader: class {}, Image: class {},
    fetch: () => Promise.reject(new Error('no network in tests'))
  };
  sandbox.globalThis = sandbox;
  sandbox.self = sandbox;
  vm.createContext(sandbox);
  vm.runInContext(source, sandbox, { filename: 'project-manager.js' });
  return sandbox.__ProjectManager;
}

function testZipEntryFilterRejectsBeforeInflating() {
  const fflate = loadFflate();
  const ProjectManager = loadProjectManagerClass();
  assert.ok(typeof ProjectManager === 'function', 'ProjectManager should be constructible for this test');

  // The filter only needs `t()`; build a bare instance without running the constructor.
  const manager = Object.create(ProjectManager.prototype);
  manager.t = (key, fallback) => fallback || key;

  const oversized = 400 * 1024 * 1024; // well past every per-entry budget
  const filter = manager.createProjectPackageEntryFilter();

  let inflatedCount = 0;
  assert.throws(
    () => {
      filter({ name: 'document.json', originalSize: oversized, size: 4096 });
      inflatedCount += 1;
    },
    /too large/i,
    'an entry declaring a huge uncompressed size must be rejected outright (KNOWN_ISSUES A4)'
  );
  assert.equal(inflatedCount, 0, 'rejection must happen before the entry is processed');

  // Normal entries pass through.
  const freshFilter = manager.createProjectPackageEntryFilter();
  assert.equal(freshFilter({ name: 'document.json', originalSize: 2048, size: 512 }), true);
  assert.equal(freshFilter({ name: 'assets/a.png', originalSize: 4096, size: 2048 }), true);

  // The running total is enforced across entries, not just per entry.
  const totalFilter = manager.createProjectPackageEntryFilter();
  assert.throws(
    () => {
      for (let i = 0; i < 20; i += 1) {
        totalFilter({ name: `assets/chunk-${i}.bin`, originalSize: 24 * 1024 * 1024, size: 1024 });
      }
    },
    /too much data|too large/i,
    'many individually-legal entries must still be capped by the total uncompressed budget'
  );

  // And the guard is actually wired into fflate: throwing from the filter aborts
  // extraction with nothing inflated.
  const zip = fflate.zipSync(
    { 'document.json': fflate.strToU8('hello world'), 'assets/a.png': fflate.strToU8('x') },
    { level: 0 }
  );
  let inflated = 0;
  assert.throws(() => {
    fflate.unzipSync(zip, {
      filter: (entry) => {
        if (Number(entry?.originalSize ?? 0) > 0) throw new Error('entry too large');
        inflated += 1;
        return true;
      }
    });
  }, /too large/);
  assert.equal(inflated, 0, 'fflate must not inflate any entry once the filter throws');

  const relaxed = fflate.unzipSync(zip, { filter: () => true });
  assert.deepEqual(
    Object.keys(relaxed).sort(),
    ['assets/a.png', 'document.json'],
    'a package within budget must still extract normally'
  );
}

// ---------------------------------------------------------------------------
// A6 - a missing raster-fallback base must not disable autosave forever
// ---------------------------------------------------------------------------

function testMissingRasterFallbackBaseIsDemotedInsteadOfBlockingSaves() {
  const source = fs.readFileSync(
    path.join(__dirname, '..', 'js', 'modules', 'session-runtime.js'),
    'utf8'
  );
  const decodeBlock = source.slice(
    source.indexOf('Failed to restore raster fallback base'),
    source.indexOf('// Restore pages')
  );
  assert.ok(
    /rasterFallbackPages\.delete\(pageNumber\)/.test(decodeBlock),
    'a page whose raster base failed to decode must be demoted out of rasterFallbackPages; '
    + 'otherwise saveSession() rejects the "declared but missing" combination on every '
    + 'later autosave and the whole lesson silently stops reaching IndexedDB '
    + '(KNOWN_ISSUES A6)'
  );

  const persistence = fs.readFileSync(
    path.join(__dirname, '..', 'js', 'modules', 'session-persistence-runtime.js'),
    'utf8'
  );
  assert.ok(
    /treating it as a normal page so autosave can continue/.test(persistence),
    'saveSession must self-heal the "marked as raster fallback but no base" state instead '
    + 'of returning false forever (KNOWN_ISSUES A6)'
  );
  assert.ok(
    persistence.indexOf('treating it as a normal page so autosave can continue')
      < persistence.indexOf('saveSessionSnapshotSync.call(this)'),
    'raster fallback metadata must be repaired before sync and IndexedDB settings are captured'
  );
}

// ---------------------------------------------------------------------------
// A7 - a newer sync snapshot must invalidate the stale IndexedDB bitmap
// ---------------------------------------------------------------------------

function testNewerSyncSnapshotDropsStalePageBitmap() {
  const source = fs.readFileSync(
    path.join(__dirname, '..', 'js', 'modules', 'session-runtime.js'),
    'utf8'
  );
  assert.ok(
    /this\.pages\[staleBitmapIndex\] = null;/.test(source),
    'when the localStorage snapshot is newer than the IndexedDB session, the stale page '
    + 'bitmap must be dropped so loadPage() re-renders from the newer vector scene; '
    + 'otherwise cleared/erased content reappears and cannot be undone (KNOWN_ISSUES A7)'
  );
  assert.ok(
    /!rasterFallbackPages\.has\(staleBitmapPage\)/.test(source),
    'raster-fallback pages must be exempt from that invalidation - their bitmap is the '
    + 'only representation they have'
  );
}

// ---------------------------------------------------------------------------
// B12 - hit-test radius must follow the ink actually drawn
// ---------------------------------------------------------------------------

function testThickStrokeHitThresholdFollowsRenderedWidth() {
  const DrawingEngine = loadDrawingEngine();
  const engine = new DrawingEngine(createCanvasStub(), {});

  const hairline = { tool: 'pen', penType: 'normal', size: 2, points: [{ x: 0, y: 0 }, { x: 100, y: 0 }] };
  const marker = { tool: 'pen', penType: 'marker', size: 30, points: [{ x: 0, y: 0 }, { x: 100, y: 0 }] };
  const brush = { tool: 'pen', penType: 'brush', size: 30, points: [{ x: 0, y: 0 }, { x: 100, y: 0 }] };

  assert.equal(
    engine.getStrokeHitThreshold(hairline),
    engine.SELECTION_THRESHOLD,
    'thin strokes keep the flat threshold as a floor so they stay easy to hit'
  );
  assert.equal(engine.getStrokeHitThreshold(marker), (30 * 2.2) / 2, 'marker renders at size*2.2');
  assert.equal(engine.getStrokeHitThreshold(brush), (30 * 1.5) / 2, 'brush renders at size*1.5');

  // A click 20px off the centre line lands on visible marker ink (half-width 33px) but
  // outside the old flat 10px threshold.
  assert.equal(
    engine.isPointNearStroke(50, 20, marker, engine.getStrokeHitThreshold(marker)),
    true,
    'clicking the outer part of a thick marker stroke must select it (KNOWN_ISSUES B12)'
  );
  assert.equal(
    engine.isPointNearStroke(50, 20, marker, engine.SELECTION_THRESHOLD),
    false,
    'sanity check: the old flat threshold really did miss that click'
  );
}

// ---------------------------------------------------------------------------
// A11 / B23 / B24 / B25 - selection edit-commit and copy/flip/lasso semantics
// ---------------------------------------------------------------------------

function loadSelectionManagerPrototype() {
  const source = fs.readFileSync(path.join(__dirname, '..', 'js', 'selection.js'), 'utf8')
    + '\n;globalThis.__SelectionManager = (typeof SelectionManager === "function") ? SelectionManager : (window.SelectionManager || null);';
  const elementStub = () => ({
    style: {}, dataset: {},
    classList: { add() {}, remove() {}, toggle() {}, contains() { return false; } },
    appendChild() {}, removeChild() {}, addEventListener() {}, removeEventListener() {},
    setAttribute() {}, removeAttribute() {}, querySelector() { return null; },
    querySelectorAll() { return []; },
    getBoundingClientRect() { return { left: 0, top: 0, width: 0, height: 0 }; }
  });
  const document = {
    createElement: elementStub,
    createElementNS: elementStub,
    body: { appendChild() {}, removeChild() {} },
    getElementById() { return null; },
    querySelector() { return null; },
    querySelectorAll() { return []; },
    addEventListener() {}, removeEventListener() {}
  };
  const sandbox = {
    console: { warn() {}, error() {}, log() {} },
    window: { document, addEventListener() {}, removeEventListener() {}, devicePixelRatio: 1, i18n: { t: (k, f) => f || k } },
    document,
    localStorage: { getItem() { return null; }, setItem() {}, removeItem() {} },
    Math, Number, String, Boolean, Array, Object, JSON, Set, Map, Date, Promise,
    parseInt, parseFloat, isNaN,
    requestAnimationFrame(cb) { cb(); return 1; },
    cancelAnimationFrame() {},
    setTimeout, clearTimeout
  };
  sandbox.globalThis = sandbox;
  sandbox.self = sandbox;
  vm.createContext(sandbox);
  vm.runInContext(source, sandbox, { filename: 'selection.js' });
  return sandbox.__SelectionManager;
}

function testAbandoningASelectionCommitsPendingEdits() {
  const SelectionManager = loadSelectionManagerPrototype();
  assert.ok(typeof SelectionManager === 'function', 'SelectionManager should be loadable');
  const proto = SelectionManager.prototype;

  const makeStub = () => {
    const saved = [];
    return {
      saved,
      hasUnsavedChanges: true,
      saveHistory() { saved.push('saveHistory'); }
    };
  };

  const dirty = makeStub();
  const committed = proto.commitPendingSelectionChanges.call(dirty);
  assert.equal(committed, true, 'a dirty selection reports that it committed');
  assert.deepEqual(dirty.saved, ['saveHistory'], 'the pending edit must reach history');
  assert.equal(dirty.hasUnsavedChanges, false, 'the dirty flag is cleared after committing');

  const clean = makeStub();
  clean.hasUnsavedChanges = false;
  assert.equal(proto.commitPendingSelectionChanges.call(clean), false);
  assert.deepEqual(clean.saved, [], 'a clean selection must not create an empty history entry');

  // The three abandon paths must all commit before clearing.
  const source = fs.readFileSync(path.join(__dirname, '..', 'js', 'selection.js'), 'utf8');
  for (const fnName of ['deactivate', 'startBoxSelection', 'startLassoSelection']) {
    // Match the method DEFINITION (start of line + indentation), not a call site.
    const definition = new RegExp(`^\\s{4}${fnName}\\s*\\([^)]*\\)\\s*\\{`, 'm');
    const match = definition.exec(source);
    assert.ok(match, `${fnName} definition should exist`);
    const body = source.slice(match.index, match.index + 500);
    const commitAt = body.indexOf('commitPendingSelectionChanges');
    const clearAt = body.indexOf('clearSelection');
    assert.ok(
      commitAt > -1 && clearAt > -1 && commitAt < clearAt,
      `${fnName} must commit pending edits before dropping the selection (KNOWN_ISSUES A11)`
    );
  }
}

function testUncopyableSelectionsDoNotWipeTheClipboard() {
  const SelectionManager = loadSelectionManagerPrototype();
  const proto = SelectionManager.prototype;

  // Stubbed richly enough that removing the guard would let cacheSelection() run to its
  // "nothing was cached" branch and null the clipboard - so this test fails for the right
  // reason, not because of a missing helper.
  const baseStub = () => ({
    selectedStrokes: [],
    selectedImages: [],
    selectedTexts: [],
    selectedIndex: null,
    selectedGroupId: null,
    drawingEngine: { strokes: [], stampedImages: [] },
    textManager: { textObjects: [] },
    hasSelection() { return true; },
    isCompoundSelection() { return false; },
    createStrokeCopy(stroke) { return stroke; },
    createImageCopy(image) { return image; },
    createTextCopy(text) { return text; }
  });

  const stub = Object.assign(baseStub(), {
    clipboard: { strokes: [{ id: 'previously-copied' }], images: [], texts: [] },
    selectionType: 'background',
    isCoordinateSelection() { return false; }
  });
  const result = proto.cacheSelection.call(stub);
  assert.equal(result, false, 'a background selection cannot be cached');
  assert.deepEqual(
    stub.clipboard,
    { strokes: [{ id: 'previously-copied' }], images: [], texts: [] },
    'Ctrl+C on an uncopyable selection must leave an existing clipboard intact '
    + '(KNOWN_ISSUES B24)'
  );

  const coordStub = Object.assign(baseStub(), {
    clipboard: { strokes: [{ id: 'kept' }], images: [], texts: [] },
    selectionType: 'coordinate',
    isCoordinateSelection() { return true; }
  });
  assert.equal(proto.cacheSelection.call(coordStub), false);
  assert.deepEqual(coordStub.clipboard, { strokes: [{ id: 'kept' }], images: [], texts: [] });
}

function testMirroringARotatedImageNegatesItsRotation() {
  const source = fs.readFileSync(path.join(__dirname, '..', 'js', 'selection.js'), 'utf8');
  const horizontal = source.slice(source.indexOf('flipHorizontal()'), source.indexOf('flipVertical()'));
  const vertical = source.slice(source.indexOf('flipVertical()'), source.indexOf('flipVertical()') + 2500);

  assert.ok(
    /img\.rotation = -img\.rotation/.test(horizontal),
    'horizontally mirroring a rotated image must negate its angle, otherwise strokes in the '
    + 'same selection flip their tilt while images keep theirs (KNOWN_ISSUES B23)'
  );
  assert.ok(
    /img\.rotation = -img\.rotation/.test(vertical),
    'vertical mirroring needs the same correction'
  );
}

function testLassoSelectsPartiallyEnclosedImages() {
  const source = fs.readFileSync(path.join(__dirname, '..', 'js', 'selection.js'), 'utf8');
  const lassoImages = source.slice(
    source.indexOf('// Find stamped images inside lasso'),
    source.indexOf('// Find stamped images inside lasso') + 1200
  );
  assert.ok(
    /polygonIntersectsRect\(canvasLassoPoints, bounds\)/.test(lassoImages),
    'lassoing part of an image must select it: strokes fall back to their sample points and '
    + 'texts to a rect-intersection test, so images must not stay centre-only '
    + '(KNOWN_ISSUES B25)'
  );
}

// ---------------------------------------------------------------------------

function main() {
  testThickStrokeHitThresholdFollowsRenderedWidth();
  testAbandoningASelectionCommitsPendingEdits();
  testUncopyableSelectionsDoNotWipeTheClipboard();
  testMirroringARotatedImageNegatesItsRotation();
  testLassoSelectsPartiallyEnclosedImages();
  testZipEntryFilterRejectsBeforeInflating();
  testMissingRasterFallbackBaseIsDemotedInsteadOfBlockingSaves();
  testNewerSyncSnapshotDropsStalePageBitmap();
  testSinglePointStrokeIsPaintedOnRedraw();
  testMultiPointStrokeIsUnchanged();
  testEraserStrokesAreNotSelectable();
  testTeachingToolRotatePointMatchesCssRotation();
  testTeachingToolRotationRoundTrips();
  testImageControlTouchButtonsDoNotSuppressClick();
  testImportedPatternDensityIsClampedPositive();
  testSettingsToolCannotBeHiddenAndSelectIsMapped();
  testToolbarOrderIsReplayedOnStartup();
  console.log('known-issues-2026-07-26-regression.test: all assertions passed');
}

main();
