const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const localesDir = path.join(__dirname, '..', 'js', 'locales');

function loadLocaleFile(fileName) {
  const source = fs.readFileSync(path.join(localesDir, fileName), 'utf8');
  const context = {
    window: {},
    console
  };

  vm.createContext(context);
  new vm.Script(source, { filename: fileName }).runInContext(context);

  return context.window.translations;
}

function testLocaleFilesAreValidScripts() {
  const localeFiles = fs
    .readdirSync(localesDir)
    .filter((fileName) => fileName.endsWith('.js') && fileName !== 'overrides.js');

  assert.ok(localeFiles.length > 0, 'expected at least one locale file');

  for (const fileName of localeFiles) {
    const translations = loadLocaleFile(fileName);

    assert.equal(typeof translations, 'object', `${fileName} should define translations`);
    assert.equal(
      typeof translations.common?.keepCentered,
      'string',
      `${fileName} should define common.keepCentered`
    );
    assert.equal(
      typeof translations.gestures?.pinchZoom,
      'string',
      `${fileName} should define gestures.pinchZoom`
    );
  }
}

function flattenKeys(obj, prefix = '') {
  const keys = [];
  for (const [key, value] of Object.entries(obj)) {
    if (value && typeof value === 'object') {
      keys.push(...flattenKeys(value, `${prefix}${key}.`));
    } else {
      keys.push(`${prefix}${key}`);
    }
  }
  return keys;
}

// Duplicate top-level sections silently shadow the earlier block's keys
// (later object literal keys win), so any duplicate is a latent translation loss.
function testNoDuplicateTopLevelSections() {
  const localeFiles = fs
    .readdirSync(localesDir)
    .filter((fileName) => fileName.endsWith('.js') && fileName !== 'overrides.js');

  for (const fileName of localeFiles) {
    const source = fs.readFileSync(path.join(localesDir, fileName), 'utf8');
    const counts = {};
    for (const match of source.matchAll(/^    ([A-Za-z]+): \{/gm)) {
      counts[match[1]] = (counts[match[1]] || 0) + 1;
    }
    const duplicates = Object.entries(counts).filter(([, count]) => count > 1);
    assert.deepEqual(
      duplicates,
      [],
      `${fileName} has duplicate top-level sections: ${duplicates.map(([name]) => name).join(', ')}`
    );
  }
}

// Known translation gaps vs zh-CN. These counts may only shrink — new keys
// must be added to every locale (or its allowance lowered here after backfill).
const MISSING_KEY_ALLOWANCE = {
  'de-DE.js': 118,
  'es-ES.js': 129,
  'fr-FR.js': 129,
  'ja-JP.js': 104,
  'ko-KR.js': 104
};

function testKeyParityAgainstBaseline() {
  const baseline = new Set(flattenKeys(loadLocaleFile('zh-CN.js')));
  const localeFiles = fs
    .readdirSync(localesDir)
    .filter(
      (fileName) => fileName.endsWith('.js') && fileName !== 'overrides.js' && fileName !== 'zh-CN.js'
    );

  for (const fileName of localeFiles) {
    const keys = new Set(flattenKeys(loadLocaleFile(fileName)));
    const missing = [...baseline].filter((key) => !keys.has(key));
    const allowance = MISSING_KEY_ALLOWANCE[fileName] ?? 0;
    assert.ok(
      missing.length <= allowance,
      `${fileName} is missing ${missing.length} keys vs zh-CN (allowed ${allowance}). ` +
        `New/regressed keys: ${missing.slice(0, 10).join(', ')}${missing.length > 10 ? ', …' : ''}`
    );
  }
}

function run() {
  testLocaleFilesAreValidScripts();
  testNoDuplicateTopLevelSections();
  testKeyParityAgainstBaseline();
  console.log('locale-files.test: all assertions passed');
}

run();
