const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

function loadBackgroundManager() {
  // Stand up a minimal window/document so background.js can be evaluated
  // without triggering the constructor. We only need the exported class
  // to exercise its plot evaluator on the prototype.
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

function makeEvaluator(BackgroundManager, expression) {
  const proto = BackgroundManager.prototype;
  const stub = Object.create(proto);
  return proto.createPlotEvaluator.call(stub, expression, 'coordinate');
}

function approxEqual(a, b, epsilon = 1e-9) {
  return Math.abs(a - b) < epsilon;
}

function testArithmetic(BackgroundManager) {
  const cases = [
    ['3*x+2', 1, 5],
    ['x*x+2*x+1', 3, 16],
    ['2**3', 0, 8],
    ['2^-3', 0, 0.125],
    ['-x+5', 2, 3],
    ['(x+1)*(x-1)', 4, 15],
    ['-x^2', 2, -4],
    ['-2^2', 0, -4]
  ];
  for (const [expr, x, expected] of cases) {
    const fn = makeEvaluator(BackgroundManager, expr);
    const actual = fn(x, 0, 0);
    assert.ok(approxEqual(actual, expected), `expected ${expr}|x=${x} => ${expected}, got ${actual}`);
  }
}

function testTranscendentals(BackgroundManager) {
  const fn = makeEvaluator(BackgroundManager, 'sin(PI/2)');
  assert.ok(approxEqual(fn(0, 0, 0), 1), 'sin(PI/2) should be 1');
  const fn2 = makeEvaluator(BackgroundManager, 'cos(0)');
  assert.ok(approxEqual(fn2(0, 0, 0), 1), 'cos(0) should be 1');
  const fn3 = makeEvaluator(BackgroundManager, 'sqrt(16)');
  assert.ok(approxEqual(fn3(0, 0, 0), 4), 'sqrt(16) should be 4');
  const fn4 = makeEvaluator(BackgroundManager, 'atan2(1,1)');
  assert.ok(approxEqual(fn4(0, 0, 0), Math.PI / 4), 'atan2(1,1) should be PI/4');
}

function testMultiArgFunctions(BackgroundManager) {
  const fnMax = makeEvaluator(BackgroundManager, 'max(3,7)');
  assert.equal(fnMax(0, 0, 0), 7, 'max(3,7) should be 7');
  const fnMaxVariadic = makeEvaluator(BackgroundManager, 'max(3,7,5)');
  assert.equal(fnMaxVariadic(0, 0, 0), 7, 'max(3,7,5) should be 7');
  const fnMin = makeEvaluator(BackgroundManager, 'min(3,7)');
  assert.equal(fnMin(0, 0, 0), 3, 'min(3,7) should be 3');
  const fnMinVariadic = makeEvaluator(BackgroundManager, 'min(3,7,5)');
  assert.equal(fnMinVariadic(0, 0, 0), 3, 'min(3,7,5) should be 3');
  const fnHypot = makeEvaluator(BackgroundManager, 'hypot(3,4)');
  assert.ok(approxEqual(fnHypot(0, 0, 0), 5), 'hypot(3,4) should be 5');
  const fnHypotVariadic = makeEvaluator(BackgroundManager, 'hypot(2,3,6)');
  assert.ok(approxEqual(fnHypotVariadic(0, 0, 0), 7), 'hypot(2,3,6) should be 7');
}

function testRejectsHostile(BackgroundManager) {
  // Every one of these, if the evaluator were still backed by `new Function`,
  // would execute arbitrary code in the page origin. The allowlist should cut
  // them off at the RPN stage.
  const hostile = [
    'alert(1)',
    'document.cookie',
    'constructor.constructor("return 1")()',
    'random()',          // not whitelisted
    'eval("1")',         // not whitelisted
    'self.location',     // not whitelisted
    'window.localStorage'
  ];
  for (const expr of hostile) {
    assert.throws(
      () => {
        const fn = makeEvaluator(BackgroundManager, expr);
        fn(0, 0, 0);
      },
      /invalid-expression/,
      `expected expression "${expr}" to be rejected`
    );
  }
}

function testVariables(BackgroundManager) {
  const fnX = makeEvaluator(BackgroundManager, 'x+theta+deg');
  assert.equal(fnX(1, 2, 3), 6, 'x+theta+deg should propagate arguments');
}

function testScientificNotation(BackgroundManager) {
  const proto = BackgroundManager.prototype;
  const stub = Object.create(proto);
  const cases = [
    ['1e-3*x', 2000, 2],
    ['2E3+x', 5, 2005],
    ['.5e2', 0, 50]
  ];

  for (const [expr, x, expected] of cases) {
    const fn = proto.createPlotEvaluator.call(stub, expr, 'coordinate');
    const actual = fn(x, 0, 0, Math.PI, Math.E);
    assert.ok(approxEqual(actual, expected), `expected ${expr}|x=${x} => ${expected}, got ${actual}`);
  }
}

(function main() {
  const BackgroundManager = loadBackgroundManager();
  assert.ok(typeof BackgroundManager === 'function', 'BackgroundManager class should be exposed');
  testArithmetic(BackgroundManager);
  testTranscendentals(BackgroundManager);
  testMultiArgFunctions(BackgroundManager);
  testRejectsHostile(BackgroundManager);
  testVariables(BackgroundManager);
  testScientificNotation(BackgroundManager);
  console.log('safe-plot-evaluator.test: all assertions passed');
})();
