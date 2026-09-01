const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const alignmentApi = require(path.join(__dirname, '..', 'js', 'modules', 'alignment-guides.js'));

function loadSelectionManagerClass({ alignmentGuidesEnabled = true } = {}) {
  const context = {
    window: {
      AboardAlignmentGuides: alignmentApi,
      drawingBoard: { settingsManager: { alignmentGuidesEnabled } }
    },
    document: {},
    console,
    Math,
    Number,
    String,
    Boolean,
    Array,
    Object,
    Set,
    Map
  };
  context.globalThis = context;
  vm.createContext(context);
  vm.runInContext(
    `${fs.readFileSync(path.join(__dirname, '..', 'js', 'selection.js'), 'utf8')}\nwindow.__SelectionManager = SelectionManager;`,
    context,
    { filename: 'selection.js' }
  );
  const SelectionManager = context.window.__SelectionManager;
  SelectionManager.__sandboxWindow = context.window;
  return SelectionManager;
}

// Minimal stand-in with just the collaborators the snap path touches.
function makeSelection(
  SelectionManager,
  { images = [], selectedIndex = 0, backgroundColor = '#ffffff' } = {}
) {
  const proto = SelectionManager.prototype;
  return {
    drawingBoard: { bgCanvas: null, backgroundManager: { backgroundColor } },
    ALIGNMENT_GUIDE_COLOR: '#f43f5e',
    alignmentGuideCasing: null,
    resolveAlignmentGuideCasing: proto.resolveAlignmentGuideCasing,
    sampleBackgroundColor: proto.sampleBackgroundColor,
    canvas: { offsetWidth: 1000, offsetHeight: 600, width: 1000, height: 600 },
    selectionType: 'image',
    selectedIndex,
    selectedStrokes: [],
    selectedImages: [],
    selectedTexts: [],
    textManager: null,
    drawingEngine: {
      strokes: [],
      stampedImages: images,
      getImageBounds: (img) => ({ x: img.x, y: img.y, width: img.width, height: img.height })
    },
    ALIGNMENT_SNAP_THRESHOLD: 6,
    alignmentGuides: [],
    alignmentSnapBounds: null,
    alignmentSnapTargets: null,
    alignmentGuideOverlay: null,
    isCompoundSelection: () => false,
    isCoordinateSelection: () => false,
    getAlignmentSnapThreshold: proto.getAlignmentSnapThreshold,
    isAlignmentSnappingEnabled: proto.isAlignmentSnappingEnabled,
    getAlignmentBoundsForSelection: proto.getAlignmentBoundsForSelection,
    collectAlignmentTargets: proto.collectAlignmentTargets,
    beginAlignmentSnapping: proto.beginAlignmentSnapping,
    applyAlignmentSnap: proto.applyAlignmentSnap,
    clearAlignmentGuides: proto.clearAlignmentGuides
  };
}

function testSnapPullsDeltaOntoNeighbourEdge() {
  const SelectionManager = loadSelectionManagerClass();
  // y = 200 keeps the vertical axis clear of every reference line, so this case
  // isolates a single horizontal snap rather than leaning on an incidental
  // vertical alignment.
  const images = [
    { x: 0, y: 200, width: 50, height: 50 },   // dragged
    { x: 100, y: 20, width: 50, height: 50 }   // static target at x = 100
  ];
  const selection = makeSelection(SelectionManager, { images, selectedIndex: 0 });

  selection.beginAlignmentSnapping();
  assert.ok(selection.alignmentSnapBounds, 'gesture must capture the start bounds');
  assert.ok(selection.alignmentSnapTargets.length > 0, 'gesture must capture targets');

  // Drag to x = 98: two units short of the neighbour's left edge.
  const { deltaX, deltaY } = selection.applyAlignmentSnap(98, 0, 1);
  assert.equal(deltaX, 100, 'delta must be pulled onto the neighbour edge');
  assert.equal(deltaY, 0, 'the clear vertical axis must not be nudged');
  // Identical 50-wide boxes now coincide on all three vertical references
  // (100 / 125 / 150), so every one of them is a legitimate guide.
  const xGuides = selection.alignmentGuides.filter((guide) => guide.axis === 'x');
  assert.equal(xGuides.some((guide) => Math.abs(guide.position - 100) < 0.01), true,
    'a guide must sit on the edge that was snapped to');
  assert.equal(selection.alignmentGuides.every((guide) => guide.axis === 'x'), true,
    'no horizontal guide should appear when the vertical axis is clear');
}

function testDraggedObjectIsNotItsOwnTarget() {
  const SelectionManager = loadSelectionManagerClass();
  const images = [{ x: 100, y: 100, width: 50, height: 50 }];
  const selection = makeSelection(SelectionManager, { images, selectedIndex: 0 });

  selection.beginAlignmentSnapping();
  const selfBounds = selection.alignmentSnapTargets.filter(
    (target) => !target.spansCanvas && target.bounds.x === 100 && target.bounds.y === 100
  );
  assert.equal(selfBounds.length, 0, 'the dragged object must never be a snap target for itself');

  // With only the canvas left as a target, a small drag away from any canvas
  // reference must not be pulled back.
  const { deltaX, deltaY } = selection.applyAlignmentSnap(137, 143, 1);
  assert.equal(deltaX, 137, 'no phantom self-snap on x');
  assert.equal(deltaY, 143, 'no phantom self-snap on y');
}

function testDisabledSettingSkipsSnapEntirely() {
  const SelectionManager = loadSelectionManagerClass({ alignmentGuidesEnabled: false });
  const images = [
    { x: 0, y: 300, width: 50, height: 50 },
    { x: 100, y: 20, width: 50, height: 50 }
  ];
  const selection = makeSelection(SelectionManager, { images, selectedIndex: 0 });

  selection.beginAlignmentSnapping();
  assert.equal(selection.alignmentSnapBounds, null, 'disabled setting must not capture bounds');

  const { deltaX, deltaY } = selection.applyAlignmentSnap(98, 0, 1);
  assert.equal(deltaX, 98, 'disabled setting must leave the delta untouched');
  assert.equal(deltaY, 0, 'disabled setting must leave the delta untouched');
  assert.equal(selection.alignmentGuides.length, 0, 'disabled setting must draw no guides');
}

function testRotatedObjectsAreExcludedBothWays() {
  const SelectionManager = loadSelectionManagerClass();
  const images = [
    { x: 0, y: 300, width: 50, height: 50 },
    { x: 100, y: 20, width: 50, height: 50, rotation: 30 }
  ];
  const selection = makeSelection(SelectionManager, { images, selectedIndex: 0 });
  selection.beginAlignmentSnapping();
  const rotatedTargets = selection.alignmentSnapTargets.filter((t) => t.bounds.x === 100);
  assert.equal(rotatedTargets.length, 0, 'a rotated neighbour must not be a snap target');

  // And a rotated selection must not snap at all.
  const rotated = makeSelection(SelectionManager, {
    images: [{ x: 0, y: 300, width: 50, height: 50, rotation: 45 }, { x: 100, y: 20, width: 50, height: 50 }],
    selectedIndex: 0
  });
  rotated.beginAlignmentSnapping();
  assert.equal(rotated.alignmentSnapBounds, null, 'a rotated selection must not capture snap bounds');
}

function testSnapIsComputedFromRawDeltaEachMove() {
  const SelectionManager = loadSelectionManagerClass();
  // Dragged box starts at (0, 200); target sits at (100, 20). At dy = 0 the
  // vertical axis is clear of every reference (target 20/70/45, canvas
  // 0/600/300 against moving 200/250/225), so only x is in play.
  const images = [
    { x: 0, y: 200, width: 50, height: 50 },
    { x: 100, y: 20, width: 50, height: 50 }
  ];
  const selection = makeSelection(SelectionManager, { images, selectedIndex: 0 });
  selection.beginAlignmentSnapping();

  // Inside the threshold it snaps onto the target's left edge.
  assert.equal(selection.applyAlignmentSnap(98, 0, 1).deltaX, 100, 'snaps while close');
  // dx = 200 puts every moving edge (200/250/225) clear of every target and
  // canvas reference, so the snap must release rather than stay stuck.
  const released = selection.applyAlignmentSnap(200, 0, 1);
  assert.equal(released.deltaX, 200, 'must release once beyond the threshold');
  assert.equal(released.deltaY, 0, 'the vertical axis must stay untouched');
  assert.equal(selection.alignmentGuides.length, 0, 'released snap must clear its guides');
}

function testThresholdScalesWithZoom() {
  const SelectionManager = loadSelectionManagerClass();
  const selection = makeSelection(SelectionManager);
  const proto = SelectionManager.prototype;

  assert.equal(proto.getAlignmentSnapThreshold.call(selection, 1), 6, 'base threshold at 100%');
  assert.equal(proto.getAlignmentSnapThreshold.call(selection, 4), 24,
    'a zoomed-in canvas needs a larger canvas-unit threshold for the same screen feel');
  assert.equal(proto.getAlignmentSnapThreshold.call(selection, 0), 6, 'a bogus scale falls back to the base');
}

function testClearResetsSnapState() {
  const SelectionManager = loadSelectionManagerClass();
  const images = [
    { x: 0, y: 300, width: 50, height: 50 },
    { x: 100, y: 20, width: 50, height: 50 }
  ];
  const selection = makeSelection(SelectionManager, { images, selectedIndex: 0 });
  selection.beginAlignmentSnapping();
  selection.applyAlignmentSnap(98, 0, 1);
  assert.equal(selection.alignmentGuides.length > 0, true, 'precondition: guides exist');

  selection.clearAlignmentGuides();
  assert.equal(selection.alignmentGuides.length, 0, 'guides must be dropped');
  assert.equal(selection.alignmentSnapBounds, null, 'snap bounds must be dropped');
  assert.equal(selection.alignmentSnapTargets, null, 'snap targets must be dropped');
}

// The behavioural cases above drive the snap methods directly, which cannot
// catch the whole feature being unhooked from the gesture. drag() needs a full
// DOM and pointer setup to invoke, so lock its call sites by source instead.
function testDragPathIsActuallyWiredToTheSnap() {
  const src = fs.readFileSync(path.join(__dirname, '..', 'js', 'selection.js'), 'utf8');

  const startDrag = src.slice(src.indexOf('        this.dragStartPos = this.getClientPos(e);'));
  assert.match(startDrag.slice(0, 400), /beginAlignmentSnapping\(\)/,
    'startDrag must sample the snap targets for the gesture');

  const dragBody = src.slice(src.indexOf('    drag(e) {'), src.indexOf('    stopDrag() {'));
  assert.match(dragBody, /applyAlignmentSnap\(deltaX, deltaY/,
    'drag() must route its delta through the snap');
  assert.match(dragBody, /renderAlignmentGuides\(\)/,
    'drag() must draw the guides it just computed');

  // The snap has to run after the move threshold, otherwise a tap could shift
  // an object onto a neighbour edge.
  const thresholdIndex = dragBody.indexOf('this.hasDragMoved = true;');
  const snapIndex = dragBody.indexOf('applyAlignmentSnap(');
  assert.equal(thresholdIndex >= 0 && snapIndex > thresholdIndex, true,
    'the snap must be applied only after the drag threshold is passed');

  // deltaX/deltaY must be reassignable for the snap to take effect.
  assert.match(dragBody, /let deltaX =/, 'deltaX must be mutable for the snap to apply');
  assert.match(dragBody, /let deltaY =/, 'deltaY must be mutable for the snap to apply');
}

function testGuidesAreClearedBeforeHistorySaveInStopDrag() {
  // Ordering matters: a guide still on the overlay when a snapshot is taken
  // would be baked into history and exports.
  const src = fs.readFileSync(path.join(__dirname, '..', 'js', 'selection.js'), 'utf8');
  const stopDrag = src.slice(src.indexOf('    stopDrag() {'));
  const clearIndex = stopDrag.indexOf('clearAlignmentGuides()');
  assert.equal(clearIndex >= 0, true, 'stopDrag must clear alignment guides');

  const saveIndex = stopDrag.search(/saveState\(\)|saveSession/);
  if (saveIndex >= 0) {
    assert.equal(clearIndex < saveIndex, true,
      'guides must be cleared before any history/session save in stopDrag');
  }
}

function testClearSelectionAlsoClearsGuides() {
  const src = fs.readFileSync(path.join(__dirname, '..', 'js', 'selection.js'), 'utf8');
  const clearSelection = src.slice(src.indexOf('    clearSelection(options = {}) {'));
  const body = clearSelection.slice(0, clearSelection.indexOf('\n    }'));
  assert.match(body, /clearAlignmentGuides\(\)/,
    'clearSelection must clear guides so a cancelled gesture cannot leave one on screen');
}

// A guide that snaps correctly but cannot be seen is still a broken guide, so
// the casing has to be resolved as part of starting the gesture.
function testCasingIsResolvedForLowContrastBoards() {
  const SelectionManager = loadSelectionManagerClass();
  const images = [
    { x: 100, y: 100, width: 50, height: 50 },
    { x: 300, y: 100, width: 50, height: 50 }
  ];

  const onGreen = makeSelection(SelectionManager, { images, backgroundColor: '#2d5016' });
  onGreen.beginAlignmentSnapping();
  assert.equal(onGreen.alignmentGuideCasing, '#ffffff',
    'the green chalkboard must resolve a light casing');

  const onWhite = makeSelection(SelectionManager, { images, backgroundColor: '#ffffff' });
  onWhite.beginAlignmentSnapping();
  assert.equal(onWhite.alignmentGuideCasing, null,
    'a white board must stay plain, with no casing');
}

function testClearResetsTheCasingToo() {
  const SelectionManager = loadSelectionManagerClass();
  const images = [
    { x: 100, y: 100, width: 50, height: 50 },
    { x: 300, y: 100, width: 50, height: 50 }
  ];
  const selection = makeSelection(SelectionManager, { images, backgroundColor: '#2d5016' });
  selection.beginAlignmentSnapping();
  assert.equal(selection.alignmentGuideCasing, '#ffffff', 'casing present first');
  selection.clearAlignmentGuides();
  assert.equal(selection.alignmentGuideCasing, null,
    'a stale casing must not survive into the next gesture on another page');
}

// Sampling the painted pixels rather than the configured colour is what makes
// background *images* work; assert the read path and its guards.
function testBackgroundIsSampledFromPaintedPixels() {
  const SelectionManager = loadSelectionManagerClass();
  const selection = makeSelection(SelectionManager, { backgroundColor: '#ffffff' });
  const reads = [];
  selection.drawingBoard.bgCanvas = {
    width: 100, height: 100,
    getContext: () => ({
      getImageData: (x, y) => {
        reads.push([x, y]);
        return { data: [45, 80, 22, 255] };
      }
    })
  };
  // Built inside the vm realm, so compare by value rather than deepEqual.
  const sampled = selection.sampleBackgroundColor();
  assert.equal(Array.from(sampled).join(','), '45,80,22',
    'must average the sampled pixels, not read backgroundColor');
  assert.equal(reads.length, 9, 'samples a 3x3 grid once, not per pointermove');
  assert.ok(reads.every(([x, y]) => x < 100 && y < 100),
    'samples must stay inside the canvas bounds');
}

function testTransparentBackgroundFallsBackToConfiguredColour() {
  const SelectionManager = loadSelectionManagerClass();
  const selection = makeSelection(SelectionManager, { backgroundColor: '#2d5016' });
  selection.drawingBoard.bgCanvas = {
    width: 100, height: 100,
    getContext: () => ({ getImageData: () => ({ data: [0, 0, 0, 0] }) })
  };
  // An unpainted background canvas is transparent, not black; treating alpha 0
  // as black would pick a casing for a board that is actually light.
  assert.equal(selection.sampleBackgroundColor(), '#2d5016',
    'transparent samples must fall back to the configured colour');
}

function testTaintedCanvasDoesNotBreakDragging() {
  const SelectionManager = loadSelectionManagerClass();
  const selection = makeSelection(SelectionManager, { backgroundColor: '#4a7c59' });
  selection.drawingBoard.bgCanvas = {
    width: 100, height: 100,
    getContext: () => ({
      getImageData: () => { throw new Error('SecurityError'); }
    })
  };
  assert.equal(selection.sampleBackgroundColor(), '#4a7c59',
    'a cross-origin background must not throw out of the drag path');
}

function testRenderStrokesCasingBeneathTheCore() {
  const src = fs.readFileSync(path.join(__dirname, '..', 'js', 'selection.js'), 'utf8');
  const render = src.slice(src.indexOf('    renderAlignmentGuides() {'));
  const body = render.slice(0, render.indexOf('\n    }\n'));
  const casingIndex = body.indexOf('this.alignmentGuideCasing');
  const coreIndex = body.indexOf('this.ALIGNMENT_GUIDE_COLOR');
  assert.ok(casingIndex > -1, 'render must consider the casing');
  assert.ok(coreIndex > -1, 'render must still stroke the core colour');
  assert.ok(casingIndex < coreIndex,
    'casing must be stroked before the core so the core sits inside it');
  assert.match(body, /lineWidth = 3/,
    'the casing must be wider than the core to show as an outline');
}

// The overlay draws in the canvas's coordinate space, so its CSS box has to be
// the canvas's box. It shares #transform-layer with the canvas, and that layer
// is viewport-sized: sizing the overlay to the layer (inset:0 / 100%) stretched
// 1280 internal px across a 1920 px box and put every guide ~1.5x out from the
// edge it marked. Guides were visually wrong on every board because of it.
function testOverlayBoxTracksTheCanvasNotTheLayer() {
  const SelectionManager = loadSelectionManagerClass();
  const selection = makeSelection(SelectionManager);
  // Canvas smaller than its parent layer, and offset inside it.
  selection.canvas = {
    offsetLeft: 12, offsetTop: 34, offsetWidth: 1280, offsetHeight: 720,
    width: 1280, height: 720
  };
  const style = {};
  SelectionManager.prototype.syncAlignmentOverlayBox.call(selection, { style });

  assert.equal(style.width, '1280px', 'overlay width must match the canvas, not the layer');
  assert.equal(style.height, '720px', 'overlay height must match the canvas');
  assert.equal(style.left, '12px', 'overlay must sit at the canvas offset');
  assert.equal(style.top, '34px', 'overlay must sit at the canvas offset');
  assert.notEqual(style.width, '100%', 'percentage sizing resolves against the layer');
}

function testOverlayBoxIsResyncedOnEveryRender() {
  const src = fs.readFileSync(path.join(__dirname, '..', 'js', 'selection.js'), 'utf8');
  const render = src.slice(src.indexOf('    renderAlignmentGuides() {'));
  const body = render.slice(0, render.indexOf('\n    }\n'));
  assert.match(body, /syncAlignmentOverlayBox\(/,
    'render must re-sync the box; the canvas resizes with window, zoom and page changes');
  // A stale percentage rule would silently reintroduce the stretch.
  assert.ok(!/style\.width\s*=\s*'100%'/.test(src),
    'the overlay must never be sized as a percentage of its parent layer');
}

function testOverlayBoxSyncIgnoresAnUnmeasuredCanvas() {
  const SelectionManager = loadSelectionManagerClass();
  const selection = makeSelection(SelectionManager);
  selection.canvas = { offsetLeft: 0, offsetTop: 0, offsetWidth: 0, offsetHeight: 0 };
  const style = {};
  SelectionManager.prototype.syncAlignmentOverlayBox.call(selection, { style });
  assert.deepEqual(Object.keys(style), [],
    'a canvas with no layout box yet must not be written as 0px and freeze the overlay');
}

function main() {
  testOverlayBoxTracksTheCanvasNotTheLayer();
  testOverlayBoxIsResyncedOnEveryRender();
  testOverlayBoxSyncIgnoresAnUnmeasuredCanvas();
  testCasingIsResolvedForLowContrastBoards();
  testClearResetsTheCasingToo();
  testBackgroundIsSampledFromPaintedPixels();
  testTransparentBackgroundFallsBackToConfiguredColour();
  testTaintedCanvasDoesNotBreakDragging();
  testRenderStrokesCasingBeneathTheCore();
  testSnapPullsDeltaOntoNeighbourEdge();
  testDraggedObjectIsNotItsOwnTarget();
  testDisabledSettingSkipsSnapEntirely();
  testRotatedObjectsAreExcludedBothWays();
  testSnapIsComputedFromRawDeltaEachMove();
  testThresholdScalesWithZoom();
  testClearResetsSnapState();
  testDragPathIsActuallyWiredToTheSnap();
  testGuidesAreClearedBeforeHistorySaveInStopDrag();
  testClearSelectionAlsoClearsGuides();
  console.log('alignment-snap-wiring.test: all assertions passed');
}

main();
