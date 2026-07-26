const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const rootDir = path.join(__dirname, '..');
const indexHtml = fs.readFileSync(path.join(rootDir, 'index.html'), 'utf8');
const styleCss = fs.readFileSync(path.join(rootDir, 'css', 'style.css'), 'utf8');
const shapeCss = fs.readFileSync(path.join(rootDir, 'css', 'modules', 'shape.css'), 'utf8');
const uiRuntimeSource = fs.readFileSync(path.join(rootDir, 'js', 'modules', 'ui-listeners-runtime.js'), 'utf8');
const uiCoreRuntimeSource = fs.readFileSync(path.join(rootDir, 'js', 'modules', 'ui-listeners-core-runtime.js'), 'utf8');
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

function createInteractiveButton(dataset) {
  const button = createButton();
  button.dataset = dataset;
  button.listeners = {};
  button.addEventListener = (eventName, handler) => {
    button.listeners[eventName] = button.listeners[eventName] || [];
    button.listeners[eventName].push(handler);
  };
  button.click = () => {
    (button.listeners.click || []).forEach((handler) => handler({ currentTarget: button }));
  };
  return button;
}

// Behavioral check against the runtime that main.js actually wires
// (uiListenersCoreRuntime.setupToolConfigListeners): clicking a pen-type or
// eraser-shape button must flip aria-pressed for the whole group.
function testWiredCoreRuntimeSyncsAriaPressed() {
  const penButtons = [
    createInteractiveButton({ penType: 'normal' }),
    createInteractiveButton({ penType: 'pencil' })
  ];
  const eraserButtons = [
    createInteractiveButton({ eraserShape: 'circle' }),
    createInteractiveButton({ eraserShape: 'rectangle' })
  ];
  const sandbox = {
    console,
    document: {
      getElementById: () => null,
      querySelector: () => null,
      querySelectorAll: (selector) => {
        if (selector === '.pen-type-btn') return penButtons;
        if (selector === '.eraser-shape-btn') return eraserButtons;
        return [];
      }
    },
    window: {}
  };
  sandbox.globalThis = sandbox;
  vm.createContext(sandbox);
  vm.runInContext(uiCoreRuntimeSource, sandbox, { filename: 'ui-listeners-core-runtime.js' });
  const coreRuntime = sandbox.window.AboardUiListenersCoreRuntime;
  assert.equal(typeof coreRuntime?.setupToolConfigListeners, 'function',
    'core runtime should expose the tool config listener setup used by main.js');

  const board = {
    drawingEngine: {
      setPenType() {},
      setColor() {},
      setEraserShape() {},
      setPenSize() {},
      setEraserSize() {},
      currentTool: 'pen'
    },
    updateEraserCursorShape() {},
    syncEraserSizeControls() {}
  };
  coreRuntime.setupToolConfigListeners(board);

  penButtons[1].click();
  assert.equal(penButtons[1].getAttribute('aria-pressed'), 'true',
    'clicked pen type should be announced as pressed');
  assert.equal(penButtons[0].getAttribute('aria-pressed'), 'false',
    'previous pen type should be announced as not pressed');
  assert.equal(penButtons[1].classList.contains('active'), true);

  eraserButtons[1].click();
  assert.equal(eraserButtons[1].getAttribute('aria-pressed'), 'true',
    'clicked eraser shape should be announced as pressed');
  assert.equal(eraserButtons[0].getAttribute('aria-pressed'), 'false',
    'previous eraser shape should be announced as not pressed');
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
testWiredCoreRuntimeSyncsAriaPressed();
testEveryExclusiveControlUsesPressedState();
testCanvasHasLocalizedAccessibleName();
testHybridTouchTargetsAndHintContrast();
console.log('active-control-aria.test: all assertions passed');
