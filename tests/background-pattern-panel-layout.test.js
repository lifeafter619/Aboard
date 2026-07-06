const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const rootDir = path.join(__dirname, '..');
const indexHtml = fs.readFileSync(path.join(rootDir, 'index.html'), 'utf8');
const styleCss = fs.readFileSync(path.join(rootDir, 'css', 'style.css'), 'utf8');
const displayRuntime = fs.readFileSync(path.join(rootDir, 'js', 'modules', 'display-runtime.js'), 'utf8');
const backgroundUiRuntime = fs.readFileSync(path.join(rootDir, 'js', 'modules', 'background-ui-runtime.js'), 'utf8');
const toolRuntime = fs.readFileSync(path.join(rootDir, 'js', 'modules', 'tool-runtime.js'), 'utf8');
const layoutRuntime = fs.readFileSync(path.join(rootDir, 'js', 'modules', 'layout-runtime.js'), 'utf8');
const uploadedImagesRuntime = fs.readFileSync(path.join(rootDir, 'js', 'modules', 'uploaded-images-runtime.js'), 'utf8');

function getPatternButtonMarkup(pattern) {
  const patternMarker = `data-pattern="${pattern}"`;
  const patternIndex = indexHtml.indexOf(patternMarker);
  assert.notEqual(patternIndex, -1, `missing ${pattern} pattern button`);

  const buttonStart = indexHtml.lastIndexOf('<button', patternIndex);
  const buttonEnd = indexHtml.indexOf('</button>', patternIndex);
  assert.notEqual(buttonStart, -1, `missing opening button for ${pattern}`);
  assert.notEqual(buttonEnd, -1, `missing closing button for ${pattern}`);

  return indexHtml.slice(buttonStart, buttonEnd + '</button>'.length);
}

function testPatternButtonsUseCompactChoiceClass() {
  [
    'blank',
    'dots',
    'grid',
    'tianzige',
    'english-lines',
    'music-staff',
    'coordinate',
    'polar',
    'image'
  ].forEach((pattern) => {
    const markup = getPatternButtonMarkup(pattern);

    assert.match(markup, /class="[^"]*\bpattern-choice-btn\b/, `${pattern} should opt into compact pattern choice styling`);
    assert.match(markup, /class="[^"]*\bpattern-option-icon\b/, `${pattern} should keep a left-side icon`);
    assert.match(markup, /class="[^"]*\bpattern-option-label\b/, `${pattern} should keep a right-side text label`);
  });
}

function testCoordinateActionsLiveWithPatternChoices() {
  const patternGridIndex = indexHtml.indexOf('id="pattern-grid"');
  const coordinateActionsIndex = indexHtml.indexOf('id="background-coordinate-actions"');
  const compactSlidersIndex = indexHtml.indexOf('class="compact-sliders"', patternGridIndex);

  assert.notEqual(patternGridIndex, -1, 'missing pattern grid');
  assert.notEqual(coordinateActionsIndex, -1, 'missing coordinate action group');
  assert.notEqual(compactSlidersIndex, -1, 'missing compact sliders after pattern grid');
  assert.ok(patternGridIndex < coordinateActionsIndex, 'coordinate actions should sit after pattern choices, not under background colors');
  assert.ok(coordinateActionsIndex < compactSlidersIndex, 'coordinate actions should stay close to coordinate pattern choices');
}

function testCssDefinesDensePatternColumnsAndCoordinateRows() {
  assert.match(
    styleCss,
    /#background-config\s+\.pattern-grid-compact\s*{[^}]*grid-template-columns:\s*repeat\(4,\s*minmax\(0,\s*1fr\)\)/s,
    'background pattern grid should use four compact columns on wide panels'
  );
  assert.match(
    styleCss,
    /#background-coordinate-actions\s*{[^}]*grid-template-columns:\s*repeat\(2,\s*minmax\(0,\s*1fr\)\)/s,
    'coordinate actions should be a two-column row near coordinate patterns'
  );
  assert.match(
    styleCss,
    /#background-config\.coordinate-pattern-active\s+\.pattern-grid-compact\s*{[^}]*grid-template-columns:\s*repeat\(5,\s*minmax\(0,\s*1fr\)\)/s,
    'coordinate and polar scenarios should tighten pattern choices to two compact rows'
  );
  assert.match(
    styleCss,
    /#background-config\.coordinate-pattern-active\s+#pattern-density-group\s*{[^}]*flex-direction:\s*row/s,
    'coordinate and polar scenarios should keep density controls on one row'
  );
}

function testBackgroundColorColumnLeavesRoomForSwatches() {
  assert.match(
    styleCss,
    /--background-color-column-width:\s*168px/,
    'background config should reserve enough width for two rows of four 36px color swatches'
  );
  assert.match(
    styleCss,
    /#background-config\.active\s*{[^}]*grid-template-columns:\s*var\(--background-color-column-width\)\s+minmax\(0,\s*1fr\)/s,
    'background config should use the reserved color column before pattern options'
  );
  assert.match(
    styleCss,
    /#background-config\.coordinate-pattern-active\.active\s*{[^}]*grid-template-columns:\s*var\(--background-color-column-width\)\s+minmax\(0,\s*1fr\)/s,
    'coordinate and polar background config should keep the same safe color column width'
  );
}

function testBackgroundPanelFitsInsideFloatingConfigArea() {
  assert.match(
    styleCss,
    /#config-area\s*{[^}]*max-width:\s*min\(660px,\s*calc\(100vw - 40px\)\)/s,
    'floating config area should be wide enough for the full background panel'
  );
  assert.match(
    styleCss,
    /#config-area\s*{[^}]*overflow-x:\s*hidden/s,
    'floating config area should not expose a horizontal scrollbar'
  );
  assert.match(
    styleCss,
    /#background-config\.coordinate-pattern-active\.active\s*{[^}]*width:\s*620px;[^}]*max-width:\s*100%/s,
    'coordinate and polar background config should fit inside the floating panel instead of forcing horizontal overflow'
  );
  assert.match(
    styleCss,
    /#config-area\.background-config-mode:not\(\.vertical\)\s*{[^}]*width:\s*max-content/s,
    'background tool should let the floating config area shrink to the active background content'
  );
  assert.match(
    styleCss,
    /#config-area\.background-config-mode:not\(\.vertical\)\s*{[^}]*max-width:\s*min\(660px,\s*calc\(100vw - 40px\)\)/s,
    'background tool should keep the content-sized floating config area inside the viewport'
  );
  assert.doesNotMatch(
    styleCss,
    /#config-area\.background-config-mode:not\(\.vertical\)\s*{[^}]*[\r\n]\s*width:\s*min\(660px,\s*calc\(100vw - (?:40|32)px\)\)/s,
    'background tool should not force a 660px outer panel that leaves blank space beside 548px content'
  );
}

function testNarrowBackgroundLayoutsCollapseToSingleColumn() {
  assert.match(
    styleCss,
    /@media \(max-height:\s*500px\) and \(orientation:\s*landscape\)[\s\S]*#config-area\.background-config-mode:not\(\.vertical\)\s*{[^}]*width:\s*min\(460px,\s*calc\(100vw - 24px\)\)/s,
    'phone landscape background config should keep enough width for a compact two-column layout'
  );
  assert.match(
    styleCss,
    /#config-area\.vertical #background-config\.active\s*{[^}]*flex-direction:\s*column/s,
    'side-docked background config should stay single-column'
  );
}

function testBackgroundModeClassAndInlineWidthReset() {
  assert.match(
    toolRuntime,
    /configArea\?\.classList\?\.toggle\('background-config-mode',\s*tool === 'background'\)/,
    'background tool should mark the config area for background-specific sizing'
  );
  assert.match(
    layoutRuntime,
    /configArea\.style\.width\s*=\s*''/,
    'config positioning should clear stale inline width before applying normal layout'
  );
  assert.match(
    layoutRuntime,
    /configArea\.style\.maxWidth\s*=\s*''/,
    'config positioning should clear stale inline max-width before applying normal layout'
  );
}

function testPatternPreferenceRefreshPreservesFlexRows() {
  assert.match(
    displayRuntime,
    /btn\.style\.display\s*=\s*'inline-flex'/,
    'visible pattern choices should keep inline-flex icon-label layout'
  );
}

function testCoordinateActionRuntimePreservesGridRows() {
  assert.match(
    backgroundUiRuntime,
    /backgroundCoordinateActions\.style\.display\s*=\s*supportsCoordinateTools\s*\?\s*'grid'\s*:\s*'none'/,
    'coordinate action group should render as grid when coordinate tools are available'
  );
  assert.match(
    backgroundUiRuntime,
    /backgroundConfig\.classList\.toggle\(\s*'coordinate-pattern-active',\s*supportsCoordinateTools\s*\)/,
    'background config should expose coordinate/polar mode for layout-specific compression'
  );
}

function testUploadedImageButtonsUseCompactChoiceClass() {
  assert.match(
    uploadedImagesRuntime,
    /btn\.className\s*=\s*'pattern-option-btn pattern-choice-btn uploaded-image-btn'/,
    'uploaded background buttons should share compact pattern choice styling'
  );
}

(function main() {
  testPatternButtonsUseCompactChoiceClass();
  testCoordinateActionsLiveWithPatternChoices();
  testCssDefinesDensePatternColumnsAndCoordinateRows();
  testBackgroundColorColumnLeavesRoomForSwatches();
  testBackgroundPanelFitsInsideFloatingConfigArea();
  testNarrowBackgroundLayoutsCollapseToSingleColumn();
  testBackgroundModeClassAndInlineWidthReset();
  testPatternPreferenceRefreshPreservesFlexRows();
  testCoordinateActionRuntimePreservesGridRows();
  testUploadedImageButtonsUseCompactChoiceClass();
  console.log('background-pattern-panel-layout.test: all assertions passed');
})();
