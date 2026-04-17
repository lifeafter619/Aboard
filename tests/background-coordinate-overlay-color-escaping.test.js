const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

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
    localStorage: {
      getItem() { return null; },
      setItem() {},
      removeItem() {}
    }
  };
  sandbox.globalThis = sandbox;
  sandbox.self = sandbox;
  sandbox.window.document = sandbox.document;

  const src = fs.readFileSync(path.join(__dirname, '..', 'js', 'background.js'), 'utf8');
  vm.createContext(sandbox);
  vm.runInContext(src, sandbox, { filename: 'background.js' });
  return sandbox.window.BackgroundManager;
}

function testRenderCoordinatePlotsEscapesImportedPlotColor(BackgroundManager) {
  const proto = BackgroundManager.prototype;
  const maliciousColor = '#ff0000" onload="window.__plotXss=1';
  const stub = Object.create(proto);
  stub.backgroundPattern = 'coordinate';
  stub.coordinateOverlayState = {
    plots: [
      {
        id: 'plot-1',
        coordinateType: 'coordinate',
        expression: 'x',
        color: maliciousColor,
        strokeWidth: 2,
        dashStyle: 'solid',
        segments: []
      }
    ]
  };
  stub.getPatternOriginLogical = () => ({ x: 0, y: 0 });
  stub.getCoordinateUnitSize = () => 10;
  stub.createPlotEvaluator = () => (x) => x;
  stub.plotMatchesSegments = () => true;
  stub.mathToScreenPoint = (x, y) => ({ x, y });

  const markup = proto.renderCoordinatePlots.call(stub, 100, 100, {
    viewportWidth: 100,
    viewportHeight: 100,
    visualScale: 1
  });

  assert.ok(
    !markup.includes(maliciousColor),
    'coordinate plot SVG should not inject raw plot colors into stroke attributes'
  );
}

function testRenderCoordinatePointsEscapesImportedPointAndLineColors(BackgroundManager) {
  const proto = BackgroundManager.prototype;
  const maliciousPointColor = '#00ff00" onmouseover="window.__pointXss=1';
  const maliciousLineColor = '#0000ff" onclick="window.__lineXss=1';
  const maliciousBackgroundColor = '#ffffff" data-pwn="1';
  const stub = Object.create(proto);
  stub.coordinateOverlayState = {
    points: [{ id: 'p1' }, { id: 'p2' }],
    showPointLabels: true
  };
  stub.backgroundColor = maliciousBackgroundColor;
  stub.getCoordinatePointEntries = () => ([
    { id: 'p1', index: 0, canvasX: 10, canvasY: 10, color: maliciousPointColor },
    { id: 'p2', index: 1, canvasX: 20, canvasY: 20, color: maliciousPointColor }
  ]);
  stub.canvasLogicalToScreenPoint = (x, y) => ({ x, y });
  stub.shouldShowCoordinatePoints = () => true;
  stub.getCoordinateLinePaths = () => [{ pointIds: ['p1', 'p2'], transient: false }];
  stub.getCoordinateLineColor = () => maliciousLineColor;
  stub.getCoordinatePaletteColor = () => '#2563eb';
  stub.getPointDisplayLabel = () => 'Point';

  const markup = proto.renderCoordinatePoints.call(stub, {
    visualScale: 1
  });

  assert.ok(
    !markup.includes(maliciousPointColor),
    'coordinate point SVG should not inject raw point colors into fill attributes'
  );
  assert.ok(
    !markup.includes(maliciousLineColor),
    'coordinate point SVG should not inject raw line colors into stroke attributes'
  );
  assert.ok(
    !markup.includes(maliciousBackgroundColor),
    'coordinate point SVG should not inject raw background colors into stroke attributes'
  );
}

(function main() {
  const BackgroundManager = loadBackgroundManager();
  testRenderCoordinatePlotsEscapesImportedPlotColor(BackgroundManager);
  testRenderCoordinatePointsEscapesImportedPointAndLineColors(BackgroundManager);
  console.log('background-coordinate-overlay-color-escaping.test: all assertions passed');
})();
