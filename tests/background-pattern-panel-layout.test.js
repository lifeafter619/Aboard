const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const rootDir = path.join(__dirname, '..');
const indexHtml = fs.readFileSync(path.join(rootDir, 'index.html'), 'utf8');
const styleCss = fs.readFileSync(path.join(rootDir, 'css', 'style.css'), 'utf8');
const displayRuntime = fs.readFileSync(path.join(rootDir, 'js', 'modules', 'display-runtime.js'), 'utf8');
const backgroundUiRuntime = fs.readFileSync(path.join(rootDir, 'js', 'modules', 'background-ui-runtime.js'), 'utf8');
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
  testPatternPreferenceRefreshPreservesFlexRows();
  testCoordinateActionRuntimePreservesGridRows();
  testUploadedImageButtonsUseCompactChoiceClass();
  console.log('background-pattern-panel-layout.test: all assertions passed');
})();
