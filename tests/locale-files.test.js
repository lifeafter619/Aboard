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

function run() {
  testLocaleFilesAreValidScripts();
  console.log('locale-files.test: all assertions passed');
}

run();
