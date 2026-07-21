const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const rootDir = path.join(__dirname, '..');
const indexHtml = fs.readFileSync(path.join(rootDir, 'index.html'), 'utf8');
const manifest = fs.readFileSync(path.join(rootDir, 'js', 'app', 'legacy-manifest.js'), 'utf8');
const uiListenersRuntime = fs.readFileSync(path.join(rootDir, 'js', 'modules', 'ui-listeners-runtime.js'), 'utf8');
const eventSetupRuntime = fs.readFileSync(path.join(rootDir, 'js', 'modules', 'event-setup-runtime.js'), 'utf8');
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
  assert.match(buttonMarkup, /class="[^"]*\bclassroom-mode-entry\b/, 'classroom entry should have a dedicated state hook');
  assert.match(buttonMarkup, /aria-pressed="false"/, 'classroom entry should expose inactive pressed state');
  assert.match(buttonMarkup, /data-i18n-title="features\.classroomMode"/, 'classroom entry should be translated');
  assert.match(buttonMarkup, /data-i18n="features\.classroomMode"/, 'classroom entry label should be translated');
}

function testClassroomControlBarExistsOutsideFeaturePanel() {
  const featureAreaIndex = indexHtml.indexOf('id="feature-area"');
  const classroomBarIndex = indexHtml.indexOf('id="classroom-mode-bar"');
  assert.notEqual(classroomBarIndex, -1, 'missing classroom mode control bar');
  assert.ok(classroomBarIndex > featureAreaIndex, 'classroom control bar should be a standalone surface outside the More panel');

  [
    'classroom-mode-status',
    'classroom-pen-btn',
    'classroom-eraser-btn',
    'classroom-select-btn',
    'classroom-pan-btn',
    'classroom-pen-settings-btn',
    'classroom-pen-settings',
    'classroom-pen-size-slider',
    'classroom-undo-btn',
    'classroom-redo-btn',
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

  const statusMarkup = getElementMarkup(indexHtml, 'classroom-mode-status');
  assert.match(statusMarkup, /data-i18n="classroom\.modeActive"/, 'classroom bar should label the active teaching state');

  ['pen', 'eraser', 'select', 'pan'].forEach((tool) => {
    const toolMarkup = getElementMarkup(indexHtml, `classroom-${tool}-btn`);
    assert.match(toolMarkup, new RegExp(`data-classroom-tool="${tool}"`), `classroom dock should expose the ${tool} tool`);
  });

  ['#000000', '#FF3B30', '#0A63C9', '#16815A'].forEach((color) => {
    assert.match(indexHtml, new RegExp(`data-classroom-color="${color}"`, 'i'), `classroom pen settings should expose ${color}`);
  });
}

function testClassroomModeScriptsAndStylesAreLoaded() {
  assert.match(indexHtml, /css\/modules\/classroom-mode\.css/, 'classroom mode stylesheet should be linked');
  assert.match(manifest, /js\/modules\/classroom-mode\.js/, 'classroom mode runtime should load with startup scripts');
}

function testMorePanelButtonEntersClassroomMode() {
  assert.match(uiListenersRuntime, /classroom-mode-feature-btn/, 'More panel runtime should bind the classroom mode button');
  assert.match(uiListenersRuntime, /setClassroomModeButtonState/, 'More panel runtime should keep classroom button state visible');
  assert.match(uiListenersRuntime, /classroom-mode-entering/, 'clicking classroom mode should expose immediate entering feedback');
  assert.match(uiListenersRuntime, /AboardClassroomModeManager/, 'runtime should create the classroom mode manager when needed');
  assert.match(uiListenersRuntime, /classroomModeManager\.enter\(\)/, 'clicking classroom mode should enter presentation mode');
  assert.match(uiListenersRuntime, /handleMoreFeaturePanelAfterAction\(\)/, 'classroom mode should close or respect the More panel after action');
}

function testClassroomRuntimeOwnsModeStatePaginationAndTimer() {
  const classroomMode = readRequiredFile(classroomModePath, 'classroom mode runtime');

  assert.match(classroomMode, /class ClassroomModeManager/, 'runtime should define a classroom mode manager');
  assert.match(classroomMode, /window\.AboardClassroomModeManager\s*=\s*ClassroomModeManager/, 'runtime should expose the manager on window');
  assert.match(classroomMode, /classroom-mode-active/, 'runtime should toggle the active body class');
  assert.match(classroomMode, /modeStatus/, 'runtime should own the visible classroom mode status label');
  assert.match(classroomMode, /classroom\.modeActive/, 'runtime should localize the active classroom mode status');
  assert.match(classroomMode, /goToPage\?\.\(this\.board\.currentPage \+ 1\)/, 'next page should navigate to an existing page without creating a blank page');
  assert.match(classroomMode, /prevPage\?\.\(\)/, 'previous page should reuse board pagination');
  assert.match(classroomMode, /setInterval/, 'timer should tick without depending on the existing timer modal');
  assert.match(classroomMode, /localeChanged/, 'labels should refresh when locale changes');
  assert.match(classroomMode, /data-classroom-tool/, 'runtime should bind the dedicated classroom drawing tools');
  assert.match(classroomMode, /drawingEngine\?\.setColor/, 'runtime should update the existing drawing engine color');
  assert.match(classroomMode, /drawingEngine\?\.setPenSize/, 'runtime should update the existing drawing engine pen size');
  assert.match(classroomMode, /undo-btn/, 'classroom undo should reuse the existing history action');
  assert.match(classroomMode, /redo-btn/, 'classroom redo should reuse the existing history action');
}

function testClassroomModeUsesStableResponsiveDocks() {
  const css = readRequiredFile(classroomModeCssPath, 'classroom mode stylesheet');

  assert.match(css, /\.classroom-tool-dock\s*{[^}]*position:\s*absolute/s, 'drawing tools should live in a stable dock');
  assert.match(css, /\.classroom-session-dock\s*{[^}]*position:\s*absolute/s, 'page and timer controls should live in a separate stable dock');
  assert.doesNotMatch(css, /#classroom-mode-bar\s*{[^}]*flex-wrap:\s*wrap/s, 'the classroom shell should not unpredictably wrap one long toolbar');
  assert.match(css, /\.classroom-mode-status\s*{[^}]*font-weight:\s*600/s, 'active classroom label should be readable on a projector');
  assert.match(css, /body\.classroom-mode-active\s+#toolbar/s, 'classroom mode should hide the normal toolbar');
  assert.match(css, /body\.classroom-mode-active\s+#pagination-controls/s, 'classroom mode should hide normal pagination controls');
  assert.match(css, /@media \(max-width:\s*520px\)[\s\S]*#classroom-mode-bar/s, 'small screens should have a dedicated classroom bar layout');
  assert.match(css, /\.classroom-color-btn\s*{[^}]*width:\s*44px[^}]*height:\s*44px/s,
    'quick color controls should preserve a 44px touch target');
}

function testClassroomControlsDoNotLeakPointerInputToCanvas() {
  assert.match(
    eventSetupRuntime,
    /closest\('#classroom-mode-bar'\)/,
    'canvas pointer handling should ignore the dedicated classroom controls'
  );
}

function testClassroomModeLocaleKeysExist() {
  const localeFiles = fs
    .readdirSync(path.join(rootDir, 'js', 'locales'))
    .filter((fileName) => fileName.endsWith('.js') && fileName !== 'overrides.js');

  for (const fileName of localeFiles) {
    const source = fs.readFileSync(path.join(rootDir, 'js', 'locales', fileName), 'utf8');
    assert.match(source, /classroomMode:/, `${fileName} should translate features.classroomMode`);
    assert.match(source, /classroom:\s*{/, `${fileName} should define classroom labels`);
    ['modeActive', 'prevPage', 'nextPage', 'startTimer', 'pauseTimer', 'resetTimer', 'exit'].forEach((key) => {
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
  testClassroomModeUsesStableResponsiveDocks();
  testClassroomControlsDoNotLeakPointerInputToCanvas();
  testClassroomModeLocaleKeysExist();
  console.log('classroom-mode-ux.test: all assertions passed');
})();
