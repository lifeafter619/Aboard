const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

function createPreviewContext(calls) {
  return {
    setTransform(...args) {
      calls.push(['setTransform', args]);
    },
    clearRect(...args) {
      calls.push(['clearRect', args]);
    }
  };
}

function loadDrawingEngine({ calls, createdCanvases }) {
  const source = fs.readFileSync(path.join(__dirname, '..', 'js', 'drawing.js'), 'utf8')
    + '\n;globalThis.__DrawingEngine = window.AboardDrawingEngine || window.DrawingEngine;';

  const document = {
    body: {
      appended: [],
      appendChild(element) {
        this.appended.push(element);
        element.parentNode = this;
        calls.push(['appendChild', element.id]);
      }
    },
    createElement(tagName) {
      calls.push(['createElement', tagName]);
      const element = {
        tagName,
        id: '',
        style: {},
        width: 0,
        height: 0,
        getContext(type, options) {
          calls.push(['getContext', type, options]);
          return createPreviewContext(calls);
        }
      };
      if (tagName === 'canvas') {
        createdCanvases.push(element);
      }
      return element;
    }
  };

  const sandbox = {
    console: {
      warn() {},
      error() {},
      log() {}
    },
    window: {
      document,
      devicePixelRatio: 2,
      innerWidth: 1280,
      innerHeight: 720,
      screen: {
        availWidth: 1280,
        availHeight: 720
      },
      drawingBoard: null
    },
    document,
    localStorage: {
      getItem() {
        return null;
      },
      setItem() {},
      removeItem() {}
    },
    Math,
    Number,
    String,
    Boolean,
    Array,
    Object,
    JSON,
    parseInt,
    parseFloat,
    requestAnimationFrame(callback) {
      callback();
      return 1;
    },
    cancelAnimationFrame() {}
  };
  sandbox.globalThis = sandbox;
  sandbox.self = sandbox;

  vm.createContext(sandbox);
  vm.runInContext(source, sandbox, { filename: 'drawing.js' });

  return {
    DrawingEngine: sandbox.__DrawingEngine,
    window: sandbox.window
  };
}

function createCanvasStub() {
  return {
    offsetWidth: 400,
    offsetHeight: 240,
    getBoundingClientRect() {
      return {
        left: 0,
        top: 0,
        width: 800,
        height: 480
      };
    }
  };
}

function testLivePreviewCanvasIsCreatedOnlyWhenHighZoomPreviewIsUsed() {
  const calls = [];
  const createdCanvases = [];
  const { DrawingEngine, window } = loadDrawingEngine({ calls, createdCanvases });
  const engine = new DrawingEngine(createCanvasStub(), {});

  assert.equal(engine.livePreviewCanvas, null, 'constructor should not create the pen live preview canvas');
  assert.equal(engine.livePreviewCtx, null, 'constructor should not create the pen live preview context');
  assert.equal(createdCanvases.length, 0, 'startup should not allocate the pen live preview canvas');

  window.drawingBoard = {
    shouldShowLiveStrokePreview() {
      return true;
    }
  };
  engine.isDrawing = true;
  engine.currentTool = 'pen';

  assert.equal(engine.shouldUseLiveStrokePreview(), true, 'high zoom pen drawing should enable live preview');
  assert.equal(createdCanvases.length, 1, 'first live preview use should allocate one canvas');
  assert.equal(engine.livePreviewCanvas.id, 'pen-live-preview-canvas');
  assert.equal(
    calls.filter(([name]) => name === 'getContext').length,
    1,
    'first live preview use should request one preview 2D context'
  );
}

function testStrokePreviewHonorsBreakIndices() {
  const calls = [];
  const createdCanvases = [];
  const { DrawingEngine } = loadDrawingEngine({ calls, createdCanvases });

  const drawn = [];
  const ctx = {
    fillStyle: '',
    beginPath() { drawn.push(['beginPath']); },
    moveTo(x, y) { drawn.push(['moveTo', x, y]); },
    lineTo(x, y) { drawn.push(['lineTo', x, y]); },
    stroke() { drawn.push(['stroke']); },
    arc() {},
    fill() {},
    setLineDash() {}
  };
  const engine = Object.create(DrawingEngine.prototype);
  engine.ctx = ctx;
  engine.points = [
    { x: 0, y: 0 },
    { x: 10, y: 0 },
    { x: 60, y: 0 },
    { x: 70, y: 0 }
  ];
  // Segment into index 2 was blocked by a teaching tool.
  engine.strokeBreakIndices = [2];
  engine.penLineStyle = 'solid';
  engine.penType = 'pen';
  engine.currentColor = '#000';
  engine.penSize = 4;
  engine.applyLineStyle = () => {};

  engine.drawStrokePathPreview();

  const lineTargets = drawn.filter(([name]) => name === 'lineTo').map(([, x]) => x);
  assert.ok(
    !lineTargets.includes(60),
    'the preview must not connect across a stroke break (no line into the blocked point)'
  );
  const moveTargets = drawn.filter(([name]) => name === 'moveTo').map(([, x]) => x);
  assert.ok(
    moveTargets.includes(60),
    'the preview must restart the path at the point after the break'
  );
  assert.ok(
    lineTargets.includes(70),
    'the preview must keep drawing the segment after the break'
  );
}

testLivePreviewCanvasIsCreatedOnlyWhenHighZoomPreviewIsUsed();
testStrokePreviewHonorsBreakIndices();
console.log('drawing-live-preview-lazy.test: all assertions passed');
