const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const REPO_ROOT = path.join(__dirname, '..');
const ENTRY_FILES = [
  'js/main.js',
  'js/app/bootstrap.js'
];
const LEGACY_MANIFEST_ARRAY_NAMES = [
  'VISIBLE_CORE_SERVICE_SCRIPTS',
  'VISIBLE_CORE_BOARD_DEPENDENCY_SCRIPTS',
  'VISIBLE_CORE_STARTUP_SCRIPTS'
];

const IMPORT_RE = /^\s*import\s+(?:[^'";]+?\s+from\s+)?['"]([^'"]+)['"]/gm;

function readText(relPath) {
  return fs.readFileSync(path.join(REPO_ROOT, relPath), 'utf8');
}

function collectStaticModuleClosure(entryFiles) {
  const visited = new Set();
  const queue = [...entryFiles];

  while (queue.length > 0) {
    const relPath = queue.shift().replace(/\\/g, '/');
    if (visited.has(relPath)) {
      continue;
    }

    visited.add(relPath);
    const source = readText(relPath);
    for (const match of source.matchAll(IMPORT_RE)) {
      const specifier = match[1];
      if (!specifier.startsWith('.')) {
        continue;
      }

      const resolved = path.posix.normalize(
        path.posix.join(path.posix.dirname(relPath), specifier)
      );
      queue.push(resolved);
    }
  }

  return [...visited].sort();
}

function readEssentialCoreAssets() {
  const source = readText('sw.js');
  const match = source.match(/const ESSENTIAL_CORE_ASSETS = \[(.*?)\];/s);
  assert.ok(match, 'ESSENTIAL_CORE_ASSETS should exist in sw.js');

  return new Set(
    [...match[1].matchAll(/'([^']+)'/g)].map(([, assetPath]) =>
      assetPath.replace(/^\.\//, '')
    )
  );
}

function readCoreAssets() {
  const source = readText('sw.js');
  const match = source.match(/const CORE_ASSETS = \[(.*?)\];/s);
  assert.ok(match, 'CORE_ASSETS should exist in sw.js');

  return new Set(
    [...match[1].matchAll(/'([^']+)'/g)].map(([, assetPath]) =>
      assetPath.replace(/^\.\//, '')
    )
  );
}

function readLegacyManifestArray(arrayName) {
  const source = readText('js/app/legacy-manifest.js');
  const match = source.match(new RegExp(`export const ${arrayName} = \\[(.*?)\\];`, 's'));
  assert.ok(match, `${arrayName} should exist in js/app/legacy-manifest.js`);

  return [...match[1].matchAll(/'([^']+)'/g)].map(([, assetPath]) => assetPath);
}

function testEssentialCacheCoversOfflineBootstrapImportClosure() {
  const requiredModules = collectStaticModuleClosure(ENTRY_FILES);
  const essentialAssets = readEssentialCoreAssets();
  const missingModules = requiredModules.filter((modulePath) => !essentialAssets.has(modulePath));

  assert.deepEqual(
    missingModules,
    [],
    `ESSENTIAL_CORE_ASSETS is missing offline bootstrap modules: ${missingModules.join(', ')}`
  );
}

function testEssentialCacheCoversVisibleCoreLegacyStartupAssets() {
  const essentialAssets = readEssentialCoreAssets();
  const requiredAssets = LEGACY_MANIFEST_ARRAY_NAMES.flatMap((arrayName) => readLegacyManifestArray(arrayName));
  const missingAssets = requiredAssets.filter((assetPath) => !essentialAssets.has(assetPath));

  assert.deepEqual(
    missingAssets,
    [],
    `ESSENTIAL_CORE_ASSETS is missing visible-core legacy startup assets: ${missingAssets.join(', ')}`
  );
}

function testCorePrecacheExcludesLargeLazyAssets() {
  const coreAssets = readCoreAssets();
  const largeLazyAssets = [
    'js/libs/xlsx.full.min.js',
    'js/libs/fflate.min.js',
    'img/ruler_1.png',
    'img/ruler_2.png',
    'img/set_square_1.png',
    'img/set_square_2.png',
    'sounds/class-bell.MP3',
    'sounds/exam-end.MP3',
    'sounds/gentle-alarm.MP3',
    'sounds/digital-beep.MP3'
  ];
  const stillPrecached = largeLazyAssets.filter((asset) => coreAssets.has(asset));

  assert.deepEqual(
    stillPrecached,
    [],
    `Large lazy assets should be runtime-cached on demand, not core-precached: ${stillPrecached.join(', ')}`
  );
}

function testRuntimeCacheCoversLazyTimerAudioAssets() {
  const source = `${readText('sw.js')}\n;globalThis.__swTestExports = { isRuntimeCacheableRequest };`;
  const sandbox = {
    console: {
      warn() {}
    },
    self: {
      location: {
        origin: 'https://example.test'
      },
      addEventListener() {}
    },
    Set,
    URL
  };
  sandbox.globalThis = sandbox;

  vm.createContext(sandbox);
  vm.runInContext(source, sandbox, { filename: 'sw.js' });

  const createRequest = (destination = '') => ({
    mode: 'cors',
    destination,
    headers: {
      has() {
        return false;
      }
    }
  });
  const audioUrl = new URL('https://example.test/sounds/class-bell.MP3');

  assert.equal(
    sandbox.__swTestExports.isRuntimeCacheableRequest(createRequest('audio'), audioUrl),
    true,
    'timer audio requests should be runtime-cacheable when the browser marks destination=audio'
  );
  assert.equal(
    sandbox.__swTestExports.isRuntimeCacheableRequest(createRequest(''), audioUrl),
    true,
    'timer audio requests should be runtime-cacheable by file extension when destination is unavailable'
  );
}

function testCorePrecacheCoversIndexClassicScripts() {
  const html = readText('index.html');
  const coreAssets = readCoreAssets();
  const scriptSources = [...html.matchAll(/<script\s+(?![^>]*type=["']module["'])[^>]*src=["']([^"']+)["']/gi)]
    .map(([, assetPath]) => assetPath.replace(/^\.\//, ''));
  const missingAssets = scriptSources.filter((assetPath) => !coreAssets.has(assetPath));

  assert.deepEqual(
    missingAssets,
    [],
    `CORE_ASSETS is missing classic script entries used by index.html: ${missingAssets.join(', ')}`
  );
}

function testCorePrecacheCoversIndexStylesheets() {
  const html = readText('index.html');
  const coreAssets = readCoreAssets();
  const stylesheetSources = [...html.matchAll(/<link\s+[^>]*(?:rel=["']stylesheet["'][^>]*href=["']([^"']+)["']|href=["']([^"']+)["'][^>]*rel=["']stylesheet["'])/gi)]
    .map(([, hrefAfterRel, hrefBeforeRel]) => (hrefAfterRel || hrefBeforeRel).replace(/^\.\//, ''));
  const missingAssets = stylesheetSources.filter((assetPath) => !coreAssets.has(assetPath));

  assert.deepEqual(
    missingAssets,
    [],
    `CORE_ASSETS is missing stylesheet entries used by index.html: ${missingAssets.join(', ')}`
  );
}

async function testOptionalPrecacheLimitsConcurrentFetches() {
  const source = `${readText('sw.js')}\n;globalThis.__swTestExports = { precacheCoreAssets, CORE_ASSETS, ESSENTIAL_CORE_ASSETS };`;
  let activeFetches = 0;
  let maxActiveFetches = 0;
  let optionalFetchCount = 0;

  const sandbox = {
    console: {
      warn() {}
    },
    self: {
      location: {
        origin: 'https://example.test'
      },
      addEventListener() {}
    },
    fetch: async () => {
      activeFetches += 1;
      optionalFetchCount += 1;
      maxActiveFetches = Math.max(maxActiveFetches, activeFetches);
      await new Promise((resolve) => setTimeout(resolve, 0));
      activeFetches -= 1;
      return {
        ok: true,
        status: 200
      };
    },
    Promise,
    Set,
    URL,
    setTimeout
  };
  sandbox.globalThis = sandbox;

  vm.createContext(sandbox);
  vm.runInContext(source, sandbox, { filename: 'sw.js' });

  const cache = {
    async addAll(assets) {
      assert.deepEqual(assets, sandbox.__swTestExports.ESSENTIAL_CORE_ASSETS);
    },
    async put() {}
  };

  await sandbox.__swTestExports.precacheCoreAssets(cache);

  assert.ok(optionalFetchCount > 6, 'test fixture should exercise more optional assets than the concurrency cap');
  assert.ok(
    maxActiveFetches <= 6,
    `optional service worker precache fetches should be capped at 6 concurrent requests, saw ${maxActiveFetches}`
  );
}

async function run() {
  testEssentialCacheCoversOfflineBootstrapImportClosure();
  testEssentialCacheCoversVisibleCoreLegacyStartupAssets();
  testCorePrecacheExcludesLargeLazyAssets();
  testRuntimeCacheCoversLazyTimerAudioAssets();
  testCorePrecacheCoversIndexClassicScripts();
  testCorePrecacheCoversIndexStylesheets();
  await testOptionalPrecacheLimitsConcurrentFetches();
  console.log('sw-essential-assets.test: all assertions passed');
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
