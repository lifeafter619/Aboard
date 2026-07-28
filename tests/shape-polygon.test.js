const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

function loadShapeDrawingManager() {
  const context = {
    window: {},
    console,
    localStorage: {
      getItem() {
        return null;
      },
      setItem() {}
    },
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
    fs.readFileSync(path.join(__dirname, '..', 'js', 'modules', 'shape-drawing.js'), 'utf8'),
    context,
    { filename: 'shape-drawing.js' }
  );
  return context.window.ShapeDrawingManager;
}

function createManager() {
  const ShapeDrawingManager = loadShapeDrawingManager();
  return Object.create(ShapeDrawingManager.prototype);
}

// vm-created objects have a different realm prototype; normalize before deepEqual.
function plain(value) {
  return JSON.parse(JSON.stringify(value));
}

function createCtxStub() {
  const calls = [];
  return {
    calls,
    save() { calls.push(['save']); },
    restore() { calls.push(['restore']); },
    beginPath() { calls.push(['beginPath']); },
    moveTo(x, y) { calls.push(['moveTo', x, y]); },
    lineTo(x, y) { calls.push(['lineTo', x, y]); },
    closePath() { calls.push(['closePath']); },
    stroke() { calls.push(['stroke']); },
    setLineDash() {},
    set lineWidth(v) {}, get lineWidth() { return 1; },
    set globalAlpha(v) {}, get globalAlpha() { return 1; }
  };
}

function testTrianglePointsFormClosedApexUpPolygon() {
  const manager = createManager();
  const points = plain(manager.getShapeSelectionPoints('triangle', { x: 10, y: 40 }, { x: 50, y: 0 }));

  assert.equal(points.length, 4, 'triangle should be a closed 3-vertex polygon');
  assert.deepEqual(points[0], { x: 30, y: 0 }, 'apex should sit at top middle');
  assert.deepEqual(points[1], { x: 50, y: 40 });
  assert.deepEqual(points[2], { x: 10, y: 40 });
  assert.deepEqual(points[3], points[0], 'polygon should close on the first vertex');
}

function testDiamondPointsFormClosedMidpointPolygon() {
  const manager = createManager();
  const points = plain(manager.getShapeSelectionPoints('diamond', { x: 0, y: 0 }, { x: 40, y: 20 }));

  assert.equal(points.length, 5, 'diamond should be a closed 4-vertex polygon');
  assert.deepEqual(points[0], { x: 20, y: 0 });
  assert.deepEqual(points[1], { x: 40, y: 10 });
  assert.deepEqual(points[2], { x: 20, y: 20 });
  assert.deepEqual(points[3], { x: 0, y: 10 });
  assert.deepEqual(points[4], points[0]);
}

function testSolidPolygonDrawsClosedPath() {
  const manager = createManager();
  manager.lineStyle = 'solid';
  const ctx = createCtxStub();

  manager.drawPolygonWithStyle(ctx, [
    { x: 0, y: 0 },
    { x: 10, y: 0 },
    { x: 5, y: 8 },
    { x: 0, y: 0 }
  ]);

  const names = ctx.calls.map(([name]) => name);
  assert.ok(names.includes('closePath'), 'solid polygon should close the path');
  assert.equal(names.filter((name) => name === 'stroke').length, 1);
  assert.equal(names.filter((name) => name === 'lineTo').length, 2, 'closing vertex must not add an extra edge');
}

function testWavyPolygonDrawsOneWavyLinePerEdge() {
  const manager = createManager();
  manager.lineStyle = 'wavy';
  const wavyEdges = [];
  manager.drawWavyLine = (ctx, from, to) => {
    wavyEdges.push([from, to]);
  };

  manager.drawPolygonWithStyle(createCtxStub(), [
    { x: 0, y: 0 },
    { x: 10, y: 0 },
    { x: 5, y: 8 },
    { x: 0, y: 0 }
  ]);

  assert.equal(wavyEdges.length, 3, 'triangle should get one wavy segment per edge');
  assert.deepEqual(wavyEdges[2], [{ x: 5, y: 8 }, { x: 0, y: 0 }], 'last edge should return to the first vertex');
}

function testStoredStyledTriangleRestylesFromItsPoints() {
  const manager = createManager();
  manager.lineStyle = 'solid';
  manager.dashDensity = 10;
  manager.waveDensity = 10;
  manager.multiLineCount = 4;
  manager.multiLineSpacing = 4;
  manager.arrowSize = 10;
  manager.drawingEngine = null;

  const polygonCalls = [];
  manager.drawPolygonWithStyle = (ctx, points) => {
    polygonCalls.push(points);
  };
  manager.drawLineWithStyle = () => {
    throw new Error('styled triangle must not collapse to a single line');
  };

  const stroke = {
    renderMode: 'shape',
    shapeType: 'triangle',
    lineStyle: 'wavy',
    shapeLineStyle: 'wavy',
    color: '#ff0000',
    size: 3,
    penType: 'normal',
    points: [
      { x: 5, y: 0 },
      { x: 10, y: 10 },
      { x: 0, y: 10 },
      { x: 5, y: 0 }
    ],
    shapeStart: { x: 0, y: 0 },
    shapeEnd: { x: 10, y: 10 }
  };

  manager.drawStoredShapeOnContext(createCtxStub(), stroke);

  assert.equal(polygonCalls.length, 1, 'stored wavy triangle should redraw through the polygon path');
  assert.deepEqual(polygonCalls[0], stroke.points, 'redraw should reuse the (possibly transformed) stored points');
}

// Regression (audit-2026-07-26 M4): moving the window to a monitor with a
// different scale factor changes devicePixelRatio; the preview canvas must
// re-render its buffer instead of reusing the DPR cached at creation time.
function testPreviewCanvasResizesWhenDevicePixelRatioChanges() {
  const context = {
    window: { devicePixelRatio: 1 },
    console,
    Math, Number, String, Boolean, Array, Object
  };
  context.globalThis = context;
  vm.createContext(context);
  vm.runInContext(
    fs.readFileSync(path.join(__dirname, '..', 'js', 'modules', 'shape-drawing.js'), 'utf8'),
    context,
    { filename: 'shape-drawing.js' }
  );

  const manager = Object.create(context.window.ShapeDrawingManager.prototype);
  const transforms = [];
  manager.canvas = {
    offsetWidth: 800,
    getBoundingClientRect() {
      return { left: 0, top: 0, width: 800, height: 600 };
    }
  };
  manager.previewCanvas = { width: 0, height: 0, style: {} };
  manager.previewCtx = {
    setTransform(...args) { transforms.push(args); }
  };
  manager.cachedDpr = 1;
  manager.lastCanvasRect = { width: 800, height: 600 };

  // Same CSS size, unchanged DPR: no resize expected.
  manager.syncPreviewCanvas();
  assert.equal(transforms.length, 0, 'unchanged DPR and size must not trigger a resize');

  // The window moves to a 2x monitor: buffer and transform must follow.
  context.window.devicePixelRatio = 2;
  manager.syncPreviewCanvas();
  assert.equal(manager.previewCanvas.width, 1600, 'buffer width must use the fresh DPR');
  assert.equal(manager.previewCanvas.height, 1200, 'buffer height must use the fresh DPR');
  assert.deepEqual(plain(transforms.at(-1)), [2, 0, 0, 2, 0, 0], 'context transform must use the fresh DPR');
  assert.equal(manager.cachedDpr, 2, 'cached DPR must be refreshed');
}

function main() {
  testTrianglePointsFormClosedApexUpPolygon();
  testDiamondPointsFormClosedMidpointPolygon();
  testSolidPolygonDrawsClosedPath();
  testWavyPolygonDrawsOneWavyLinePerEdge();
  testStoredStyledTriangleRestylesFromItsPoints();
  testPreviewCanvasResizesWhenDevicePixelRatioChanges();
  console.log('shape-polygon.test: all assertions passed');
}

main();
