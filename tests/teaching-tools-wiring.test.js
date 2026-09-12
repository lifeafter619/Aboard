const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

function readSource(...segments) {
  return fs.readFileSync(path.join(__dirname, '..', ...segments), 'utf8');
}

function testPaginationSavesAndRestoresToolState() {
  const source = readSource('js', 'modules', 'pagination-runtime.js');
  assert.match(
    source,
    /teachingToolsManager\?\.saveCurrentPageState\?\.\(/,
    'page snapshots must capture the outgoing page teaching tools'
  );
  assert.match(
    source,
    /teachingToolsManager\?\.restorePageState\?\.\(/,
    'loadPage must restore the target page teaching tools'
  );
}

function testSessionSnapshotCarriesTeachingTools() {
  const source = readSource('js', 'modules', 'session-persistence-runtime.js');
  const matches = source.match(/pageTeachingTools/g) || [];
  assert.ok(
    matches.length >= 2,
    'both the sync snapshot and the persistent session record must carry pageTeachingTools'
  );
}

function testSessionRestoreAppliesTeachingTools() {
  const source = readSource('js', 'modules', 'session-runtime.js');
  assert.match(
    source,
    /importPageToolStates/,
    'restoreSession must import persisted teaching tool page states'
  );
  assert.match(
    source,
    /resetPageToolStates/,
    'runtime canvas reset must clear teaching tool page states'
  );
  assert.match(
    source,
    /restorePageState/,
    'session restore must re-apply the current page teaching tools'
  );
  const fallbackKeys = source.match(/'pageTeachingTools'/) || [];
  assert.ok(
    fallbackKeys.length >= 1,
    'the canvas-state storage key fallback list must include pageTeachingTools'
  );
}

function testCacheClearIncludesTeachingToolsKey() {
  const source = readSource('js', 'modules', 'cache-runtime.js');
  assert.match(
    source,
    /'pageTeachingTools'/,
    'cache clearing must include the pageTeachingTools storage key'
  );
}

function testEmptyBoardCheckCountsTeachingTools() {
  const source = readSource('js', 'modules', 'board-helpers-runtime.js');
  assert.match(
    source,
    /teachingToolsManager/,
    'the beforeunload empty-board check must account for teaching tools'
  );
}

function testProjectImportResetsTeachingTools() {
  const source = readSource('js', 'modules', 'project-manager.js');
  assert.match(
    source,
    /resetPageToolStates/,
    'importing a project must reset per-page teaching tool state'
  );
}

function testSwVersionProbeMatchesSubPathDeployments() {
  const source = readSource('sw.js');
  assert.doesNotMatch(
    source,
    /url\.pathname\s*===\s*'\/api\/version'/,
    'the /api/version probe must not use an absolute-path equality check'
  );
  assert.match(
    source,
    /pathname\.endsWith\('\/api\/version'\)/,
    'the /api/version probe must use endsWith so sub-path deployments match'
  );
}

function testSwPrecacheListsTeachingToolsAsset() {
  const source = readSource('sw.js');
  assert.match(
    source,
    /'\.\/js\/modules\/teaching-tools\.js'/,
    'teaching-tools.js must stay in the precache manifest'
  );
}

function main() {
  testPaginationSavesAndRestoresToolState();
  testSessionSnapshotCarriesTeachingTools();
  testSessionRestoreAppliesTeachingTools();
  testCacheClearIncludesTeachingToolsKey();
  testEmptyBoardCheckCountsTeachingTools();
  testProjectImportResetsTeachingTools();
  testSwVersionProbeMatchesSubPathDeployments();
  testSwPrecacheListsTeachingToolsAsset();
  console.log('teaching-tools-wiring.test: all assertions passed');
}

main();
