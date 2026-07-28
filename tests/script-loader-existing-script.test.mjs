import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { loadClassicScript, loadLegacyScripts } from '../js/app/legacy-script-loader.js';

const scriptLoaderSource = fs.readFileSync(
  path.join(process.cwd(), 'js', 'infra', 'script-loader.js'),
  'utf8'
);
const scriptLoaderModuleUrl = `data:text/javascript;base64,${Buffer.from(scriptLoaderSource, 'utf8').toString('base64')}`;
const legacyGlobalScriptLoaderSource = fs.readFileSync(
  path.join(process.cwd(), 'js', 'modules', 'script-loader.js'),
  'utf8'
);

const { ScriptLoader } = await import(scriptLoaderModuleUrl);

function createScriptElement(src = '') {
  const listeners = new Map();
  let currentSrc = src;

  return {
    dataset: {},
    async: false,
    defer: false,
    isRemoved: false,
    get src() {
      return currentSrc ? new URL(currentSrc, 'http://localhost/').href : '';
    },
    set src(value) {
      currentSrc = value;
    },
    getAttribute(name) {
      if (name === 'src') {
        return currentSrc || null;
      }
      return null;
    },
    addEventListener(type, handler) {
      const handlers = listeners.get(type) || [];
      handlers.push(handler);
      listeners.set(type, handlers);
    },
    removeEventListener(type, handler) {
      const handlers = listeners.get(type) || [];
      listeners.set(type, handlers.filter((candidate) => candidate !== handler));
    },
    dispatch(type, payload = {}) {
      const handlers = listeners.get(type) || [];
      handlers.forEach((handler) => handler(payload));
    },
    remove() {
      this.isRemoved = true;
    }
  };
}

function createDocumentStub(existingScripts = []) {
  const scripts = [...existingScripts];
  let appendCount = 0;

  return {
    baseURI: 'http://localhost/',
    get scripts() {
      return scripts.filter((script) => !script.isRemoved);
    },
    head: {
      appendChild(script) {
        appendCount += 1;
        scripts.push(script);
      }
    },
    createElement(tagName) {
      assert.equal(tagName, 'script');
      return createScriptElement();
    },
    getAppendCount() {
      return appendCount;
    },
    getAppendedScripts() {
      return [...scripts];
    }
  };
}

function createLoader(doc) {
  class TestScriptLoader extends ScriptLoader {}
  TestScriptLoader.pendingLoads = new Map();
  TestScriptLoader.documentRef = doc;
  return TestScriptLoader;
}

function createLegacyGlobalLoader(doc) {
  const win = {};
  const loaderFactory = new Function(
    'window',
    'document',
    `${legacyGlobalScriptLoaderSource}; return window.ScriptLoader;`
  );
  const Loader = loaderFactory(win, doc);
  Loader.pendingLoads = new Map();
  return Loader;
}

async function raceWithTimeout(promise, timeoutMs = 50) {
  return Promise.race([
    promise.then((value) => ({ status: 'resolved', value }), (error) => ({ status: 'rejected', error })),
    new Promise((resolve) => setTimeout(() => resolve({ status: 'timed-out' }), timeoutMs))
  ]);
}

async function testExistingLoadedScriptWithoutMarkerResolvesImmediately() {
  const existingScript = createScriptElement('js/already-loaded.js');
  const doc = createDocumentStub([existingScript]);
  const Loader = createLoader(doc);

  const result = await raceWithTimeout(Loader.load('js/already-loaded.js', doc));

  assert.equal(result.status, 'resolved');
  assert.equal(result.value, existingScript);
  assert.equal(doc.getAppendCount(), 0);
}

async function testEquivalentRelativePathsDoNotDuplicateScripts() {
  const existingScript = createScriptElement('./js/equivalent.js');
  existingScript.dataset.loaded = 'true';
  const doc = createDocumentStub([existingScript]);
  const Loader = createLoader(doc);

  const result = await raceWithTimeout(Loader.load('js/equivalent.js', doc));

  assert.equal(result.status, 'resolved');
  assert.equal(result.value, existingScript);
  assert.equal(doc.getAppendCount(), 0);
}

async function testLegacyExistingLoadedScriptWithoutMarkerResolvesImmediately() {
  const existingScript = createScriptElement('js/modules/already-loaded.js');
  const doc = createDocumentStub([existingScript]);

  const result = await raceWithTimeout(loadClassicScript('js/modules/already-loaded.js', { doc }));

  assert.equal(result.status, 'resolved');
  assert.equal(result.value, existingScript);
  assert.equal(doc.getAppendCount(), 0);
}

async function testLegacyGlobalExistingLoadedScriptWithoutMarkerResolvesImmediately() {
  const existingScript = createScriptElement('js/modules/already-loaded-global.js');
  const doc = createDocumentStub([existingScript]);
  const Loader = createLegacyGlobalLoader(doc);

  const result = await raceWithTimeout(Loader.load('js/modules/already-loaded-global.js'));

  assert.equal(result.status, 'resolved');
  assert.equal(result.value, existingScript);
  assert.equal(doc.getAppendCount(), 0);
}

async function testLegacyGlobalEquivalentRelativePathsDoNotDuplicateScripts() {
  const existingScript = createScriptElement('./js/modules/equivalent-global.js');
  existingScript.dataset.loaded = 'true';
  const doc = createDocumentStub([existingScript]);
  const Loader = createLegacyGlobalLoader(doc);

  const result = await raceWithTimeout(Loader.load('js/modules/equivalent-global.js'));

  assert.equal(result.status, 'resolved');
  assert.equal(result.value, existingScript);
  assert.equal(doc.getAppendCount(), 0);
}

async function testLegacyScriptRetriesOnceAfterTransientFailure() {
  const doc = createDocumentStub();
  const resultPromise = raceWithTimeout(
    loadClassicScript('js/modules/retry-once.js', { doc, retries: 1 }),
    100
  );

  doc.getAppendedScripts()[0].dispatch('error');
  await Promise.resolve();

  assert.equal(doc.getAppendCount(), 2, 'a transient load error should append one retry script');
  doc.getAppendedScripts()[1].dispatch('load');

  const result = await resultPromise;
  assert.equal(result.status, 'resolved', 'the retry should allow the legacy script load to recover');
  assert.equal(result.value.dataset.loaded, 'true');
}

async function testLegacyScriptBatchCanCollectFailuresWithoutRejecting() {
  const doc = createDocumentStub();
  const batchPromise = loadLegacyScripts(
    ['js/modules/failed.js', 'js/modules/loaded.js'],
    { doc, retries: 0, continueOnError: true }
  );
  await Promise.resolve();

  const [failedScript, loadedScript] = doc.getAppendedScripts();
  failedScript.dispatch('error');
  loadedScript.dispatch('load');

  const result = await batchPromise;
  assert.equal(result.failures.length, 1, 'the batch result should expose the isolated failed script');
  assert.equal(result.failures[0].src, 'js/modules/failed.js');
  assert.equal(result.loaded.length, 1, 'successful scripts in the same batch should still complete');
}

async function run() {
  await testExistingLoadedScriptWithoutMarkerResolvesImmediately();
  await testEquivalentRelativePathsDoNotDuplicateScripts();
  await testLegacyExistingLoadedScriptWithoutMarkerResolvesImmediately();
  await testLegacyGlobalExistingLoadedScriptWithoutMarkerResolvesImmediately();
  await testLegacyGlobalEquivalentRelativePathsDoNotDuplicateScripts();
  await testLegacyScriptRetriesOnceAfterTransientFailure();
  await testLegacyScriptBatchCanCollectFailuresWithoutRejecting();
  console.log('script-loader-existing-script.test: all assertions passed');
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
