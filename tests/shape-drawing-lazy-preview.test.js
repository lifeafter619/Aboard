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
    },
    setLineDash() {},
    beginPath() {},
    moveTo() {},
    lineTo() {},
    stroke() {},
    closePath() {},
    save() {},
    restore() {}
  };
}

function loadShapeDrawingManager({ calls, createdCanvases }) {
  const source = fs.readFileSync(
    path.join(__dirname, '..', 'js', 'modules', 'shape-drawing.js'),
    'utf8'
  ) + '\n;globalThis.__ShapeDrawingManager = window.AboardShapeDrawingManager || window.ShapeDrawingManager;';

  const sandbox = {
    console: {
      warn() {},
      error() {},
      log() {}
    },
    localStorage: {
      getItem() {
        return null;
      },
      setItem() {}
    },
    document: {
      body: {
        appended: [],
        appendChild(element) {
          this.appended.push(element);
          element.parentNode = this;
          calls.push(['appendChild', element.id]);
        },
        removeChild(element) {
          this.appended = this.appended.filter((candidate) => candidate !== element);
        }
      },
      createElement(tagName) {
        calls.push(['createElement', tagName]);
        if (tagName !== 'canvas') {
          return { style: {} };
        }

        const canvas = {
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
        createdCanvases.push(canvas);
        return canvas;
      }
    },
    window: {
      devicePixelRatio: 2,
      drawingBoard: null
    },
    requestAnimationFrame(callback) {
      callback();
      return 1;
    },
    cancelAnimationFrame() {},
    Math,
    Number,
    String,
    Boolean,
    Array,
    Object,
    JSON,
    parseInt,
    parseFloat
  };
  sandbox.globalThis = sandbox;
  sandbox.window.document = sandbox.document;

  vm.createContext(sandbox);
  vm.runInContext(source, sandbox, { filename: 'shape-drawing.js' });

  return {
    ShapeDrawingManager: sandbox.__ShapeDrawingManager,
    window: sandbox.window
  };
}

function createCanvasStub() {
  return {
    offsetWidth: 320,
    getBoundingClientRect() {
      return {
        left: 10,
        top: 20,
        width: 320,
        height: 180
      };
    }
  };
}

function createDrawingEngineStub() {
  return {
    currentColor: '#111111',
    penSize: 4,
    penType: 'normal',
    strokes: [],
    getPosition(event) {
      return {
        x: event.clientX,
        y: event.clientY
      };
    },
    getNextLayerOrder() {
      return 1;
    },
    getNextObjectId() {
      return 'shape-1';
    }
  };
}

function testPreviewCanvasIsCreatedOnlyWhenShapeDrawingStarts() {
  const calls = [];
  const createdCanvases = [];
  const { ShapeDrawingManager, window } = loadShapeDrawingManager({ calls, createdCanvases });

  let manager;
  const vectorPreviewChecks = [];
  window.drawingBoard = {
    syncVectorPreviewState() {
      vectorPreviewChecks.push(Boolean(manager.previewCanvas));
    }
  };

  manager = new ShapeDrawingManager(
    createCanvasStub(),
    {},
    createDrawingEngineStub(),
    { saveState() {} }
  );

  assert.equal(manager.previewCanvas, null, 'constructor should not create the shape preview canvas');
  assert.equal(manager.previewCtx, null, 'constructor should not request a preview rendering context');
  assert.equal(createdCanvases.length, 0, 'startup should not allocate the shape preview canvas');

  manager.startDrawing({ clientX: 24, clientY: 48 });

  assert.equal(createdCanvases.length, 1, 'first shape draw should allocate one preview canvas');
  assert.equal(manager.previewCanvas.id, 'shape-preview-canvas');
  assert.equal(manager.previewCanvas.style.display, 'block');
  assert.deepEqual(vectorPreviewChecks, [true], 'vector preview sync should see the lazily-created preview canvas');
  assert.equal(
    calls.filter(([name]) => name === 'getContext').length,
    1,
    'first shape draw should request one preview 2D context'
  );
}

testPreviewCanvasIsCreatedOnlyWhenShapeDrawingStarts();
console.log('shape-drawing-lazy-preview.test: all assertions passed');
