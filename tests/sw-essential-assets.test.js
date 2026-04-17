const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const REPO_ROOT = path.join(__dirname, '..');
const ENTRY_FILES = [
  'js/main.js',
  'js/app/bootstrap.js'
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

function run() {
  testEssentialCacheCoversOfflineBootstrapImportClosure();
  console.log('sw-essential-assets.test: all assertions passed');
}

run();
