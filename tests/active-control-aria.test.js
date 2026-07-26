const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const rootDir = path.join(__dirname, '..');
const indexHtml = fs.readFileSync(path.join(rootDir, 'index.html'), 'utf8');
const styleCss = fs.readFileSync(path.join(rootDir, 'css', 'style.css'), 'utf8');
const shapeCss = fs.readFileSync(path.join(rootDir, 'css', 'modules', 'shape.css'), 'utf8');
const uiRuntimeSource = fs.readFileSync(path.join(rootDir, 'js', 'modules', 'ui-listeners-runtime.js'), 'utf8');
const toolRuntimeSource = fs.readFileSync(path.join(rootDir, 'js', 'modules', 'tool-runtime.js'), 'utf8');
const backgroundRuntimeSource = fs.readFileSync(path.join(rootDir, 'js', 'modules', 'background-ui-runtime.js'), 'utf8');

function loadUiRuntime() {
  const sandbox = {
    window: {},
    document: {},
    console,
    Element: class Element {}
  };
  sandbox.globalThis = sandbox;
  vm.createContext(sandbox);
  vm.runInContext(uiRuntimeSource, sandbox, { filename: 'ui-listeners-runtime.js' });
  return sandbox.window.AboardUiListenersRuntime;
}

function createButton() {
  const classes = new Set();
  const attributes = new Map();
  return {
    classList: {
      toggle(name, active) {
        if (active) classes.add(name);
        else classes.delete(name);
      },
      contains(name) {
        return classes.has(name);
      }
    },
    setAttribute(name, value) {
      attributes.set(name, String(value));
    },
    getAttribute(name) {
      return attributes.get(name) ?? null;
    }
  };
}

function testSharedPressedStateHelper() {
  const runtime = loadUiRuntime();
  assert.equal(typeof runtime.setActiveButtonState, 'function',
    'UI runtime should expose one shared active/aria-pressed state helper');

  const first = createButton();
  const second = createButton();
  runtime.setActiveButtonState(first, true);
  runtime.setActiveButtonState(second, false);

  assert.equal(first.classList.contains('active'), true);
  assert.equal(first.getAttribute('aria-pressed'), 'true');
  assert.equal(second.classList.contains('active'), false);
  assert.equal(second.getAttribute('aria-pressed'), 'false');
}

function testEveryExclusiveControlUsesPressedState() {
  [
    'pen-type-btn',
    'eraser-shape-btn',
    'shape-type-btn',
    'select-mode-btn',
    'pattern-choice-btn'
  ].forEach((className) => {
    const buttons = [...indexHtml.matchAll(new RegExp(`<button[^>]*class="[^"]*\\b${className}\\b[^"]*"[^>]*>`, 'g'))];
    assert.ok(buttons.length > 0, `expected .${className} controls`);
    buttons.forEach(([markup]) => {
      assert.match(markup, /aria-pressed="(?:true|false)"/,
        `.${className} should expose its initial selected state`);
    });
  });

  ['pen-btn', 'pan-btn', 'select-btn', 'eraser-btn', 'background-btn', 'more-btn'].forEach((id) => {
    const openingTag = indexHtml.match(new RegExp(`<button[^>]*id="${id}"[^>]*>`))?.[0] || '';
    assert.match(openingTag, /aria-pressed="(?:true|false)"/, `#${id} should expose pressed state`);
  });

  assert.match(uiRuntimeSource, /setActiveButtonState\(targetButton, true\)/,
    'configuration listeners should synchronize visual and semantic selection');
  assert.match(toolRuntimeSource, /setActiveButtonState\(btn, false\)/,
    'main toolbar refresh should clear visual and semantic selection together');
  assert.match(backgroundRuntimeSource, /setActiveButtonState\(btn, /,
    'background refresh should synchronize visual and semantic selection');
}

function testCanvasHasLocalizedAccessibleName() {
  const canvas = indexHtml.match(/<canvas\s+[^>]*id="canvas"[^>]*>/)?.[0] || '';
  assert.match(canvas, /aria-label="[^"]+"/, 'drawing canvas should have an accessible name before scripts run');
  assert.match(canvas, /data-i18n-aria-label="canvas\.drawingSurface"/,
    'drawing canvas accessible name should follow the active locale');
}

function testHybridTouchTargetsAndHintContrast() {
  assert.match(
    styleCss,
    /@media\s*\(any-pointer:\s*coarse\)\s*{[\s\S]*?\.color-btn[\s\S]*?min-height:\s*var\(--touch-target-size\)/,
    'hybrid touch devices should retain full-size touch targets even when a mouse is present'
  );
  assert.match(shapeCss, /\.shape-hint\s*{[^}]*color:\s*#(?:666|[0-5][0-9a-f]{2})\b/is,
    'small shape guidance text should use a comfortably readable foreground color');
}

testSharedPressedStateHelper();
testEveryExclusiveControlUsesPressedState();
testCanvasHasLocalizedAccessibleName();
testHybridTouchTargetsAndHintContrast();
console.log('active-control-aria.test: all assertions passed');
