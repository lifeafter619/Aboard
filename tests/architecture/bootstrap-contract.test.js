const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const repoRoot = path.resolve(__dirname, '..', '..');

function readRepoFile(relativePath) {
  return fs.readFileSync(path.join(repoRoot, relativePath), 'utf8');
}

function normalizeWhitespace(value) {
  return value.replace(/\s+/g, ' ').trim();
}

function extractArrayLiteral(source, exportName) {
  const match = source.match(new RegExp(`export const ${exportName} = \\[(.*?)\\];`, 's'));
  assert.ok(match, `${exportName} should be defined as an array literal`);
  return match[1];
}

test('index.html boots from a single ESM bootstrap entry instead of js/main.js', () => {
  const html = readRepoFile('index.html');
  const normalized = normalizeWhitespace(html);

  assert.match(
    normalized,
    /<script\s+type="module"\s+src="js\/app\/bootstrap\.js"><\/script>/,
    'index.html should load js/app/bootstrap.js as the module entry'
  );
  assert.doesNotMatch(
    normalized,
    /<script[^>]+src="js\/main\.js"[^>]*><\/script>/,
    'index.html should not load js/main.js directly anymore'
  );
});

test('main.js exports DrawingBoard globally without auto-starting the app', () => {
  const mainJs = readRepoFile('js/main.js');

  assert.match(
    mainJs,
    /window\.DrawingBoard\s*=\s*DrawingBoard\s*;/,
    'js/main.js should expose DrawingBoard on window'
  );
  assert.doesNotMatch(
    mainJs,
    /new\s+DrawingBoard\s*\(/,
    'js/main.js should not instantiate DrawingBoard during legacy script evaluation'
  );
});

test('browser check is migrated into the ESM layer', () => {
  const legacyManifest = readRepoFile('js/app/legacy-manifest.js');
  const createApp = readRepoFile('js/app/create-app.js');
  const browserCheckModulePath = path.join(repoRoot, 'js', 'infra', 'browser-check.js');

  assert.ok(
    fs.existsSync(browserCheckModulePath),
    'js/infra/browser-check.js should exist'
  );
  assert.doesNotMatch(
    legacyManifest,
    /browser-check\.js/,
    'legacy manifest should no longer load the legacy browser-check module'
  );
  assert.match(
    createApp,
    /import\s+\{\s*BrowserCheck\s*\}\s+from\s+'..\/infra\/browser-check\.js';/,
    'create-app.js should import BrowserCheck from the ESM infra layer'
  );
  assert.match(
    createApp,
    /BrowserCheck\.init\s*\(/,
    'create-app.js should initialize BrowserCheck from the ESM bootstrap flow'
  );
});

test('legacy startup manifest splits visible-core from post-visible startup', () => {
  const legacyManifest = readRepoFile('js/app/legacy-manifest.js');
  const createApp = readRepoFile('js/app/create-app.js');
  const lazyManagerRuntime = readRepoFile('js/modules/lazy-manager-runtime.js');
  const uiListenersCoreRuntimePath = path.join(repoRoot, 'js', 'modules', 'ui-listeners-core-runtime.js');
  const visibleCoreScripts = extractArrayLiteral(legacyManifest, 'VISIBLE_CORE_STARTUP_SCRIPTS');

  assert.ok(
    fs.existsSync(uiListenersCoreRuntimePath),
    'js/modules/ui-listeners-core-runtime.js should exist'
  );
  assert.match(
    legacyManifest,
    /export const VISIBLE_CORE_STARTUP_SCRIPTS = \[/,
    'legacy manifest should define visible-core startup scripts'
  );
  assert.match(
    legacyManifest,
    /export const POST_VISIBLE_STARTUP_SCRIPTS = \[/,
    'legacy manifest should define post-visible startup scripts'
  );
  assert.match(
    visibleCoreScripts,
    /js\/modules\/ui-listeners-core-runtime\.js/,
    'visible-core startup should include the core listener runtime'
  );
  assert.doesNotMatch(
    visibleCoreScripts,
    /js\/modules\/ui-listeners-runtime\.js/,
    'visible-core startup should not include the heavyweight deferred ui-listeners runtime'
  );
  assert.doesNotMatch(
    visibleCoreScripts,
    /js\/modules\/help-system\.js/,
    'visible-core startup should not include help system startup'
  );
  assert.match(
    createApp,
    /loadLegacyScripts\(VISIBLE_CORE_STARTUP_SCRIPTS,\s*\{\s*doc\s*\}\)/,
    'create-app.js should load visible-core startup scripts first'
  );
  assert.match(
    createApp,
    /loadLegacyScripts\(POST_VISIBLE_STARTUP_SCRIPTS,\s*\{\s*doc\s*\}\)/,
    'create-app.js should load post-visible startup scripts in the follow-up phase'
  );
  assert.match(
    createApp,
    /drawingBoard\.getTimerManager\?\.\(\)/,
    'create-app.js should proactively warm timer manager for immediate toolbar usage'
  );
  assert.match(
    createApp,
    /drawingBoard\.getInsertImageManager\?\.\(\)/,
    'create-app.js should proactively warm insert-image manager for immediate toolbar usage'
  );
  assert.match(
    createApp,
    /drawingBoard\.getInsertTextManager\?\.\(\)/,
    'create-app.js should proactively warm insert-text manager for immediate toolbar usage'
  );
  assert.match(
    createApp,
    /drawingBoard\.getRandomPickerManager\?\.\(\)/,
    'create-app.js should proactively warm random picker manager for immediate toolbar usage'
  );
  assert.match(
    createApp,
    /drawingBoard\.getScoreboardManager\?\.\(\)/,
    'create-app.js should proactively warm scoreboard manager for immediate toolbar usage'
  );
  assert.match(
    lazyManagerRuntime,
    /board\.moreFeaturePreloadScheduled = true/,
    'lazy manager runtime should still keep post-visible preload scheduling for follow-up features'
  );
});

test('service worker precaches the new app bootstrap assets', () => {
  const sw = readRepoFile('sw.js');

  const expectedAssets = [
    './js/app/bootstrap.js',
    './js/app/create-app.js',
    './js/app/create-app-context.js',
    './js/app/legacy-manifest.js',
    './js/app/legacy-script-loader.js',
    './js/legacy/runtime-bridge.js',
    './js/infra/browser-check.js',
    './js/modules/ui-listeners-core-runtime.js'
  ];

  for (const asset of expectedAssets) {
    assert.match(
      sw,
      new RegExp(asset.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')),
      `sw.js should precache ${asset}`
    );
  }
});
