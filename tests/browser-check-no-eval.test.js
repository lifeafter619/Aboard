const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

function createDocumentStub() {
  return {
    body: {
      appendChild() {}
    },
    activeElement: null,
    getElementById() {
      return null;
    },
    createElement() {
      return {
        id: '',
        style: {},
        dataset: {},
        tabIndex: -1,
        textContent: '',
        appendChild() {},
        addEventListener() {},
        setAttribute() {},
        remove() {},
        focus() {}
      };
    }
  };
}

function createModernWindow(evalSpy) {
  return {
    HTMLCanvasElement: class HTMLCanvasElement {},
    Promise,
    Map,
    Set,
    WeakMap,
    WeakSet,
    Symbol,
    Array,
    Object,
    requestAnimationFrame(callback) {
      callback();
    },
    eval: evalSpy,
    i18n: { t: (key) => key }
  };
}

function loadInfraBrowserCheck() {
  const source = fs.readFileSync(
    path.join(__dirname, '..', 'js', 'infra', 'browser-check.js'),
    'utf8'
  );
  const sanitizedSource = source.replace('export class BrowserCheck', 'class BrowserCheck')
    + '\n;globalThis.__browserCheckExports = { BrowserCheck };';

  const sandbox = {
    console,
    window: {},
    document: {},
    Array,
    Object,
    Promise,
    Map,
    Set,
    WeakMap,
    WeakSet,
    Symbol,
    String
  };
  sandbox.globalThis = sandbox;

  vm.createContext(sandbox);
  vm.runInContext(sanitizedSource, sandbox, { filename: 'browser-check.js' });
  return sandbox.__browserCheckExports.BrowserCheck;
}

function loadLegacyBrowserCheck(evalSpy) {
  const source = fs.readFileSync(
    path.join(__dirname, '..', 'js', 'modules', 'browser-check.js'),
    'utf8'
  );
  const document = createDocumentStub();
  const window = createModernWindow(evalSpy);
  window.document = document;

  const sandbox = {
    console,
    window,
    document,
    eval: evalSpy,
    Array,
    Object,
    Promise,
    Map,
    Set,
    WeakMap,
    WeakSet,
    Symbol,
    String
  };
  sandbox.globalThis = sandbox;
  sandbox.self = sandbox;

  vm.createContext(sandbox);
  vm.runInContext(source, sandbox, { filename: 'legacy-browser-check.js' });
  return {
    BrowserCheck: sandbox.window.BrowserCheck,
    window: sandbox.window
  };
}

function testInfraBrowserCheckAvoidsEvalAndDetectsMissingModernApis() {
  const BrowserCheck = loadInfraBrowserCheck();
  let evalCalls = 0;
  let warnings = null;
  const evalSpy = () => {
    evalCalls += 1;
    throw new Error('eval should not run');
  };
  const win = createModernWindow(evalSpy);
  const doc = createDocumentStub();

  BrowserCheck.showWarning = (missingFeatures) => {
    warnings = missingFeatures;
  };

  BrowserCheck.init(win, doc);
  assert.equal(evalCalls, 0, 'infra browser check should not call eval while probing browser support');
  assert.equal(warnings, null, 'infra browser check should not warn when required modern APIs exist');

  delete win.Promise;
  BrowserCheck.init(win, doc);
  assert.equal(
    Array.from(warnings, (warning) => warning.key).join(','),
    'es6',
    'infra browser check should warn when required modern APIs are missing'
  );
}

function testLegacyBrowserCheckAvoidsEvalAndDetectsMissingModernApis() {
  let evalCalls = 0;
  let warnings = null;
  const evalSpy = () => {
    evalCalls += 1;
    throw new Error('eval should not run');
  };
  const { BrowserCheck, window } = loadLegacyBrowserCheck(evalSpy);

  BrowserCheck.showWarning = (missingFeatures) => {
    warnings = missingFeatures;
  };

  BrowserCheck.init();
  assert.equal(evalCalls, 0, 'legacy browser check should not call eval while probing browser support');
  assert.equal(warnings, null, 'legacy browser check should not warn when required modern APIs exist');

  delete window.Promise;
  BrowserCheck.init();
  assert.equal(
    Array.from(warnings, (warning) => warning.key).join(','),
    'es6',
    'legacy browser check should warn when required modern APIs are missing'
  );
}

(function main() {
  testInfraBrowserCheckAvoidsEvalAndDetectsMissingModernApis();
  testLegacyBrowserCheckAvoidsEvalAndDetectsMissingModernApis();
  console.log('browser-check-no-eval.test: all assertions passed');
})();
