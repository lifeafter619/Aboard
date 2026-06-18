const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const rootDir = path.join(__dirname, '..');
const indexHtml = fs.readFileSync(path.join(rootDir, 'index.html'), 'utf8');
const manifest = fs.readFileSync(path.join(rootDir, 'js', 'app', 'legacy-manifest.js'), 'utf8');
const uiListenersRuntime = fs.readFileSync(path.join(rootDir, 'js', 'modules', 'ui-listeners-runtime.js'), 'utf8');
const classroomModePath = path.join(rootDir, 'js', 'modules', 'classroom-mode.js');
const classroomModeCssPath = path.join(rootDir, 'css', 'modules', 'classroom-mode.css');

function readRequiredFile(filePath, label) {
  assert.ok(fs.existsSync(filePath), `${label} should exist`);
  return fs.readFileSync(filePath, 'utf8');
}

function getElementMarkup(html, id) {
  const marker = `id="${id}"`;
  const markerIndex = html.indexOf(marker);
  assert.notEqual(markerIndex, -1, `missing #${id}`);

  const tagStart = html.lastIndexOf('<', markerIndex);
  const tagNameMatch = html.slice(tagStart).match(/^<([a-z0-9-]+)/i);
  assert.ok(tagNameMatch, `missing opening tag for #${id}`);

  const tagName = tagNameMatch[1];
  const closeMarker = `</${tagName}>`;
  const closeIndex = html.indexOf(closeMarker, markerIndex);
  assert.notEqual(closeIndex, -1, `missing closing tag for #${id}`);

  return html.slice(tagStart, closeIndex + closeMarker.length);
}

function testMorePanelExposesClassroomMode() {
  const buttonMarkup = getElementMarkup(indexHtml, 'classroom-mode-feature-btn');

  assert.match(buttonMarkup, /class="[^"]*\bfeature-btn\b/, 'classroom entry should use the existing More panel feature button style');
  assert.match(buttonMarkup, /data-i18n-title="features\.classroomMode"/, 'classroom entry should be translated');
  assert.match(buttonMarkup, /data-i18n="features\.classroomMode"/, 'classroom entry label should be translated');
}

function testClassroomControlBarExistsOutsideFeaturePanel() {
  const featureAreaIndex = indexHtml.indexOf('id="feature-area"');
  const classroomBarIndex = indexHtml.indexOf('id="classroom-mode-bar"');
  assert.notEqual(classroomBarIndex, -1, 'missing classroom mode control bar');
  assert.ok(classroomBarIndex > featureAreaIndex, 'classroom control bar should be a standalone surface outside the More panel');

  [
    'classroom-prev-page-btn',
    'classroom-page-status',
    'classroom-next-page-btn',
    'classroom-timer-display',
    'classroom-timer-toggle-btn',
    'classroom-timer-reset-btn',
    'classroom-exit-btn'
  ].forEach((id) => {
    assert.match(indexHtml, new RegExp(`id="${id}"`), `missing #${id}`);
  });
}

function testClassroomModeScriptsAndStylesAreLoaded() {
  assert.match(indexHtml, /css\/modules\/classroom-mode\.css/, 'classroom mode stylesheet should be linked');
  assert.match(manifest, /js\/modules\/classroom-mode\.js/, 'classroom mode runtime should load with startup scripts');
}

function testMorePanelButtonEntersClassroomMode() {
  assert.match(uiListenersRuntime, /classroom-mode-feature-btn/, 'More panel runtime should bind the classroom mode button');
  assert.match(uiListenersRuntime, /AboardClassroomModeManager/, 'runtime should create the classroom mode manager when needed');
  assert.match(uiListenersRuntime, /classroomModeManager\.enter\(\)/, 'clicking classroom mode should enter presentation mode');
  assert.match(uiListenersRuntime, /handleMoreFeaturePanelAfterAction\(\)/, 'classroom mode should close or respect the More panel after action');
}

function testClassroomRuntimeOwnsModeStatePaginationAndTimer() {
  const classroomMode = readRequiredFile(classroomModePath, 'classroom mode runtime');

  assert.match(classroomMode, /class ClassroomModeManager/, 'runtime should define a classroom mode manager');
  assert.match(classroomMode, /window\.AboardClassroomModeManager\s*=\s*ClassroomModeManager/, 'runtime should expose the manager on window');
  assert.match(classroomMode, /classroom-mode-active/, 'runtime should toggle the active body class');
  assert.match(classroomMode, /goToPage\?\.\(this\.board\.currentPage \+ 1\)/, 'next page should navigate to an existing page without creating a blank page');
  assert.match(classroomMode, /prevPage\?\.\(\)/, 'previous page should reuse board pagination');
  assert.match(classroomMode, /setInterval/, 'timer should tick without depending on the existing timer modal');
  assert.match(classroomMode, /localeChanged/, 'labels should refresh when locale changes');
}

function testClassroomModeLayoutDoesNotOverflowHorizontally() {
  const css = readRequiredFile(classroomModeCssPath, 'classroom mode stylesheet');

  assert.match(css, /#classroom-mode-bar\s*{[^}]*max-width:\s*calc\(100vw - 24px\)/s, 'control bar should fit inside narrow viewports');
  assert.match(css, /#classroom-mode-bar\s*{[^}]*overflow-x:\s*hidden/s, 'control bar should never expose a horizontal scrollbar');
  assert.match(css, /#classroom-mode-bar\s*{[^}]*flex-wrap:\s*wrap/s, 'control bar controls should wrap instead of overflowing');
  assert.match(css, /body\.classroom-mode-active\s+#toolbar/s, 'classroom mode should hide the normal toolbar');
  assert.match(css, /body\.classroom-mode-active\s+#pagination-controls/s, 'classroom mode should hide normal pagination controls');
  assert.match(css, /@media \(max-width:\s*520px\)[\s\S]*#classroom-mode-bar/s, 'small screens should have a dedicated classroom bar layout');
}

function testClassroomModeLocaleKeysExist() {
  const localeFiles = fs
    .readdirSync(path.join(rootDir, 'js', 'locales'))
    .filter((fileName) => fileName.endsWith('.js') && fileName !== 'overrides.js');

  for (const fileName of localeFiles) {
    const source = fs.readFileSync(path.join(rootDir, 'js', 'locales', fileName), 'utf8');
    assert.match(source, /classroomMode:/, `${fileName} should translate features.classroomMode`);
    assert.match(source, /classroom:\s*{/, `${fileName} should define classroom labels`);
    ['prevPage', 'nextPage', 'startTimer', 'pauseTimer', 'resetTimer', 'exit'].forEach((key) => {
      assert.match(source, new RegExp(`${key}:`), `${fileName} should translate classroom.${key}`);
    });
  }
}

(function main() {
  testMorePanelExposesClassroomMode();
  testClassroomControlBarExistsOutsideFeaturePanel();
  testClassroomModeScriptsAndStylesAreLoaded();
  testMorePanelButtonEntersClassroomMode();
  testClassroomRuntimeOwnsModeStatePaginationAndTimer();
  testClassroomModeLayoutDoesNotOverflowHorizontally();
  testClassroomModeLocaleKeysExist();
  console.log('classroom-mode-ux.test: all assertions passed');
})();
