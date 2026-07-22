const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const style = fs.readFileSync(path.join(__dirname, '..', 'css', 'style.css'), 'utf8');

function testFormControlsUseOneFocusLayer() {
  const rule = style.match(
    /:where\(\s*input:not\(\[type="checkbox"\]\)[\s\S]*?\):focus-visible\s*\{([^}]*)\}/
  );

  assert.ok(rule, 'text-like form controls should have a dedicated focus-visible rule');
  assert.match(rule[1], /outline:\s*none\s*!important/, 'form controls should remove the competing outer outline');
  assert.match(rule[1], /border-color:\s*#0b57d0\s*!important/, 'form controls should retain a clear blue focus boundary');
  assert.match(rule[1], /box-shadow:\s*inset\s+0\s+0\s+0\s+1px\s+#0b57d0\s*!important/,
    'form controls should strengthen the same boundary inward instead of drawing a second ring');
  assert.doesNotMatch(rule[1], /outline-offset/, 'the single form focus boundary should not reserve an outer gap');
}

function testFormControlsRestoreAnOutlineInForcedColors() {
  const forcedColorsRule = style.match(
    /@media\s*\(forced-colors:\s*active\)\s*\{[\s\S]*?:where\([\s\S]*?input:not\(\[type="checkbox"\]\)[\s\S]*?\):focus-visible\s*\{([^}]*)\}/
  );

  assert.ok(forcedColorsRule, 'forced-colors mode should restore a system-visible focus outline');
  assert.match(forcedColorsRule[1], /outline:\s*2px\s+solid\s+CanvasText\s*!important/,
    'forced-colors focus should use a system color instead of relying on box-shadow');
  assert.match(forcedColorsRule[1], /outline-offset:\s*2px\s*!important/,
    'forced-colors focus should separate the outline from the control boundary');
  assert.match(forcedColorsRule[1], /box-shadow:\s*none\s*!important/,
    'forced-colors focus should not rely on a shadow that the system suppresses');
}

testFormControlsUseOneFocusLayer();
testFormControlsRestoreAnOutlineInForcedColors();
console.log('form-focus-ring-ux.test: all assertions passed');
