const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

function loadResolveLegacyConstructor() {
  const source = fs.readFileSync(
    path.join(__dirname, '..', 'js', 'app', 'resolve-legacy-constructor.js'),
    'utf8'
  );
  const sanitizedSource = source.replace(
    'export function resolveLegacyConstructor',
    'function resolveLegacyConstructor'
  ) + '\n;globalThis.__resolveLegacyConstructor = resolveLegacyConstructor;';

  const sandbox = {
    console,
    window: {},
    globalThis: null
  };
  sandbox.globalThis = sandbox;

  vm.createContext(sandbox);
  vm.runInContext(sanitizedSource, sandbox, { filename: 'resolve-legacy-constructor.js' });
  return sandbox.__resolveLegacyConstructor;
}

function loadBoardConstruction(windowObject) {
  const source = fs.readFileSync(
    path.join(__dirname, '..', 'js', 'modules', 'board-construction.js'),
    'utf8'
  );
  const sandbox = {
    console,
    window: windowObject,
    globalThis: null,
    Reflect
  };
  sandbox.globalThis = sandbox;

  vm.createContext(sandbox);
  vm.runInContext(source, sandbox, { filename: 'board-construction.js' });
  return sandbox.window.AboardBoardConstruction;
}

function testResolveLegacyConstructorAvoidsEval() {
  let evalCalls = 0;
  const ExampleCtor = function ExampleCtor() {};
  const win = {
    ExampleCtor,
    eval() {
      evalCalls += 1;
      throw new Error('eval should not run');
    }
  };

  const resolveLegacyConstructor = loadResolveLegacyConstructor();
  const resolved = resolveLegacyConstructor(win, 'ExampleCtor');

  assert.equal(resolved, ExampleCtor);
  assert.equal(evalCalls, 0, 'resolveLegacyConstructor should resolve via window properties without eval');
}

function testBoardConstructionAvoidsEval() {
  let evalCalls = 0;
  const ExampleCtor = function ExampleCtor() {};
  const windowObject = {
    ExampleCtor,
    eval() {
      evalCalls += 1;
      throw new Error('eval should not run');
    }
  };

  const boardConstruction = loadBoardConstruction(windowObject);
  const resolved = boardConstruction.resolveLegacyClass('ExampleCtor');

  assert.equal(resolved, ExampleCtor);
  assert.equal(evalCalls, 0, 'board-construction should resolve via window properties without eval');
}

(function main() {
  testResolveLegacyConstructorAvoidsEval();
  testBoardConstructionAvoidsEval();
  console.log('legacy-constructor-no-eval.test: all assertions passed');
})();
