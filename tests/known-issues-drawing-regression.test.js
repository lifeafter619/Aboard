const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

function createRecordingContext(ops = []) {
  return {
    canvas: { width: 800, height: 480 },
    globalAlpha: 1,
    lineWidth: 1,
    lineCap: 'round',
    lineJoin: 'round',
    strokeStyle: '#000000',
    fillStyle: '#000000',
    globalCompositeOperation: 'source-over',
    lineDashOffset: 0,
    save() { ops.push(['save']); },
    restore() { ops.push(['restore']); },
    beginPath() { ops.push(['beginPath']); },
    moveTo(x, y) { ops.push(['moveTo', x, y]); },
    lineTo(x, y) { ops.push(['lineTo', x, y]); },
    stroke() { ops.push(['stroke', this.lineWidth, this.globalAlpha]); },
    fill() { ops.push(['fill']); },
    arc(...args) { ops.push(['arc', ...args]); },
    setLineDash(pattern) { ops.push(['setLineDash', Array.from(pattern)]); },
    clearRect() {},
    setTransform() {},
    createLinearGradient() { return { addColorStop() {} }; }
  };
}

function createSandbox() {
  const document = {
    body: { appendChild() {} },
    createElement() {
      return {
        style: {},
        getContext() { return createRecordingContext(); }
      };
    },
    getElementById() { return null; },
    querySelector() { return null; },
    querySelectorAll() { return []; },
    addEventListener() {},
    removeEventListener() {}
  };
  const sandbox = {
    console: { log() {}, warn() {}, error() {} },
    window: {
      document,
      devicePixelRatio: 1,
      innerWidth: 1280,
      innerHeight: 720,
      screen: { availWidth: 1280, availHeight: 720 },
      drawingBoard: null,
      addEventListener() {},
      removeEventListener() {},
      requestAnimationFrame(callback) { callback(); return 1; },
      i18n: { applyTranslations() {} }
    },
    document,
    localStorage: { getItem() { return null; }, setItem() {}, removeItem() {} },
    Image: class {},
    Math, Number, String, Boolean, Array, Object, JSON, Set, Map, Date, Promise,
    parseInt, parseFloat,
    requestAnimationFrame(callback) { callback(); return 1; },
    cancelAnimationFrame() {}
  };
  sandbox.globalThis = sandbox;
  sandbox.self = sandbox;
  return sandbox;
}

function loadClass(relativePath, exportExpression) {
  const sandbox = createSandbox();
  const source = fs.readFileSync(path.join(__dirname, '..', relativePath), 'utf8')
    + `\n;globalThis.__ExportedClass = ${exportExpression};`;
  vm.createContext(sandbox);
  vm.runInContext(source, sandbox, { filename: relativePath });
  return sandbox.__ExportedClass;
}

function createCanvas() {
  return {
    width: 800,
    height: 480,
    offsetWidth: 800,
    offsetHeight: 480,
    style: {},
    getBoundingClientRect() {
      return { left: 0, top: 0, width: 800, height: 480 };
    }
  };
}

function testMultiLineGeometryCoversVisibleInk() {
  const DrawingEngine = loadClass('js/drawing.js', 'window.AboardDrawingEngine || window.DrawingEngine');
  const engine = new DrawingEngine(createCanvas(), createRecordingContext());
  const stroke = {
    tool: 'pen',
    penType: 'normal',
    color: '#000000',
    size: 4,
    lineStyle: 'multi',
    shapeMultiLineCount: 5,
    shapeMultiLineSpacing: 30,
    points: [{ x: 20, y: 100 }, { x: 220, y: 100 }]
  };

  assert.ok(engine.getStrokeHitThreshold(stroke) >= 62,
    'multi-line hit testing must include the outermost visible line (KNOWN_ISSUES B10)');
  assert.equal(engine.isPointNearStroke(100, 160, stroke, engine.getStrokeHitThreshold(stroke)), true);
  const bounds = engine.getStrokeBounds(stroke);
  assert.ok(bounds.y <= 32 && bounds.y + bounds.height >= 168,
    'multi-line selection bounds must enclose the full rendered band (KNOWN_ISSUES B10)');
}

function testMultiLineStrokePersistsAndReplaysItsParameters() {
  const DrawingEngine = loadClass('js/drawing.js', 'window.AboardDrawingEngine || window.DrawingEngine');
  const engine = new DrawingEngine(createCanvas(), createRecordingContext());
  engine.isDrawing = true;
  engine.currentTool = 'pen';
  engine.penType = 'normal';
  engine.penLineStyle = 'multi';
  engine.penMultiLineCount = 4;
  engine.penMultiLineSpacing = 18;
  engine.points = [{ x: 10, y: 20 }, { x: 110, y: 20 }];
  engine.stopDrawing();

  const stroke = engine.strokes.at(-1);
  assert.equal(stroke.multiLineCount, 4, 'line count must be stored with the stroke (KNOWN_ISSUES B13)');
  assert.equal(stroke.multiLineSpacing, 18, 'line spacing must be stored with the stroke (KNOWN_ISSUES B13)');

  const ops = [];
  engine.ctx = createRecordingContext(ops);
  engine.redrawStroke(stroke);
  assert.equal(ops.filter(([name]) => name === 'stroke').length, 4,
    'redraw must recreate every parallel line (KNOWN_ISSUES B13)');
  assert.match(engine.buildSvgStrokeMarkup(stroke), /<g[^>]*>[\s\S]*<path[\s\S]*<path/,
    'vector preview must preserve multi-line strokes (KNOWN_ISSUES B13)');
}

function testComplexPensReplayThroughLiveSegmentRenderer() {
  const DrawingEngine = loadClass('js/drawing.js', 'window.AboardDrawingEngine || window.DrawingEngine');
  const cases = [
    { penType: 'pencil', expectedStrokes: 3, expectedFirstWidth: 9 },
    { penType: 'ballpoint', expectedStrokes: 1, expectedFirstWidth: 7 },
    { penType: 'fountain', expectedStrokes: 1, expectedFirstWidth: 4 },
    { penType: 'brush', expectedStrokes: 5, expectedFirstWidth: 8 },
    { penType: 'marker', expectedStrokes: 1, expectedFirstWidth: 16 }
  ];

  for (const testCase of cases) {
    const ops = [];
    const engine = new DrawingEngine(createCanvas(), createRecordingContext());
    engine.ctx = createRecordingContext(ops);
    engine.redrawStroke({
      tool: 'pen',
      penType: testCase.penType,
      color: '#123456',
      size: 10,
      lineStyle: 'solid',
      points: [{ x: 0, y: 0 }, { x: 20, y: 0 }]
    });

    const strokes = ops.filter(([name]) => name === 'stroke');
    assert.equal(strokes.length, testCase.expectedStrokes,
      `${testCase.penType} replay must preserve its live texture layers (KNOWN_ISSUES B15)`);
    assert.ok(Math.abs(strokes[0][1] - testCase.expectedFirstWidth) < 0.001,
      `${testCase.penType} replay must preserve its live speed-sensitive width (KNOWN_ISSUES B15)`);
  }
}

function testBlockedTeachingToolRegionBreaksStroke() {
  const DrawingEngine = loadClass('js/drawing.js', 'window.AboardDrawingEngine || window.DrawingEngine');
  const ops = [];
  const engine = new DrawingEngine(createCanvas(), createRecordingContext(ops));
  engine.ctx = createRecordingContext(ops);
  engine.isDrawing = true;
  engine.currentTool = 'pen';
  engine.penType = 'normal';
  engine.penLineStyle = 'solid';
  engine.points = [{ x: 0, y: 0 }];
  engine.lastPoint = engine.points[0];
  engine.getPosition = event => ({ x: event.x, y: event.y });
  engine.edgeDrawingManager = {
    processDrawingPoint(x, y) {
      return { x, y, snapped: false, blocked: x === 50 };
    },
    resetSnapping() {}
  };

  engine.drawBatch([{ x: 25, y: 0 }, { x: 50, y: 0 }, { x: 75, y: 0 }]);
  engine.stopDrawing();

  assert.deepEqual(Array.from(engine.strokes.at(-1).breakIndices), [2],
    'a blocked interval must be serialized as a stroke break (KNOWN_ISSUES B14)');
  assert.equal(ops.some(op => op[0] === 'lineTo' && op[1] === 75 && op[2] === 0), false,
    'live drawing must not bridge from the pre-block point into the post-block point');
}

function testShapePreviewAndDashUseCommittedCoordinates() {
  const ShapeDrawingManager = loadClass(
    'js/modules/shape-drawing.js',
    'window.AboardShapeDrawingManager || window.ShapeDrawingManager'
  );
  const manager = Object.create(ShapeDrawingManager.prototype);
  manager.canvas = {
    getBoundingClientRect() { return { left: 10, top: 20, width: 200, height: 100 }; }
  };
  assert.deepEqual(
    JSON.parse(JSON.stringify(manager.getPosition({ clientX: 260, clientY: 5 }))),
    { x: 200, y: 0 },
    'shape preview endpoints must clamp to the same visible canvas boundary as final geometry (KNOWN_ISSUES B11)'
  );

  const dashCalls = [];
  manager.lineStyle = 'dashed';
  manager.dashDensity = 10;
  manager.canvasCssScale = 2;
  manager.applyLineStyle({ setLineDash(value) { dashCalls.push(Array.from(value)); } }, true);
  assert.deepEqual(dashCalls.at(-1), [80, 48],
    'preview dash lengths must scale with the preview coordinate system (KNOWN_ISSUES B38)');
}

function testSetSquareUsesOneConsistentLocalGeometry() {
  const TeachingToolsManager = loadClass(
    'js/modules/teaching-tools.js',
    'window.AboardTeachingToolsManager || window.TeachingToolsManager'
  );
  const teaching = Object.create(TeachingToolsManager.prototype);
  teaching.canvas = createCanvas();
  teaching.canvasScaleFactor = 1;
  const tool = { type: 'setSquare', x: 0, y: 0, width: 100, height: 100, rotation: 90 };
  assert.equal(teaching.isPointInSetSquareFreeArea(20, 80, tool), true,
    'rotated set-square hit testing must transform the pointer back into tool space (KNOWN_ISSUES B16)');

  const EdgeDrawingManager = loadClass(
    'js/modules/edge-drawing.js',
    'window.AboardEdgeDrawingManager || window.EdgeDrawingManager'
  );
  const edge = Object.create(EdgeDrawingManager.prototype);
  edge.edgeTolerance = 15;
  edge.distanceToSegment = EdgeDrawingManager.prototype.distanceToSegment;
  assert.equal(edge.isPointInsideSetSquare({ x: 30, y: 30 }, {
    x: 0, y: 0, width: 100, height: 100
  }), true, 'every interior point outside the snap band must be blocked (KNOWN_ISSUES B17)');
}

function main() {
  testMultiLineGeometryCoversVisibleInk();
  testMultiLineStrokePersistsAndReplaysItsParameters();
  testComplexPensReplayThroughLiveSegmentRenderer();
  testBlockedTeachingToolRegionBreaksStroke();
  testShapePreviewAndDashUseCommittedCoordinates();
  testSetSquareUsesOneConsistentLocalGeometry();
  console.log('known-issues-drawing-regression.test: all assertions passed');
}

main();
