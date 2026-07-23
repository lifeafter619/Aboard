const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const rootDir = path.join(__dirname, '..');

function readText(relativePath) {
  return fs.readFileSync(path.join(rootDir, relativePath), 'utf8');
}

function createClassList(initial = []) {
  const values = new Set(initial);
  return {
    add(...tokens) {
      tokens.forEach((token) => values.add(token));
    },
    remove(...tokens) {
      tokens.forEach((token) => values.delete(token));
    },
    contains(token) {
      return values.has(token);
    }
  };
}

function loadPanelRuntime({ width, height, toolbarClasses = [], dataset = {} }) {
  const toolbar = {
    id: 'toolbar',
    classList: createClassList(toolbarClasses),
    dataset: { ...dataset },
    style: {},
    getBoundingClientRect() {
      if (this.classList.contains('vertical')) {
        return { left: 290, top: -35, right: 350, bottom: 675, width: 60, height: 710 };
      }
      return { left: 10, top: 568, right: 350, bottom: 630, width: 340, height: 62 };
    }
  };

  const windowObject = {
    innerWidth: width,
    innerHeight: height,
    getComputedStyle(element) {
      return {
        left: element.style.left || 'auto',
        top: element.style.top || 'auto',
        right: element.style.right || 'auto',
        bottom: element.style.bottom || 'auto',
        transform: element.style.transform || 'none'
      };
    }
  };
  const sandbox = {
    console,
    window: windowObject,
    document: {
      getElementById(id) {
        return id === 'toolbar' ? toolbar : null;
      }
    }
  };
  vm.createContext(sandbox);
  vm.runInContext(readText('js/modules/panel-runtime.js'), sandbox, { filename: 'panel-runtime.js' });
  return { runtime: sandbox.window.AboardPanelRuntime, toolbar };
}

function testPhonePortraitUsesScrollableBottomToolbar() {
  const { runtime, toolbar } = loadPanelRuntime({
    width: 360,
    height: 640,
    toolbarClasses: ['vertical', 'user-positioned'],
    dataset: { relativeLeft: '1.000', relativeTop: '0.500' }
  });

  runtime.repositionToolbarsOnResize({});

  assert.equal(toolbar.classList.contains('vertical'), false,
    'phone portrait should switch an over-tall toolbar to the horizontal bottom layout');
  assert.equal(toolbar.style.left, '50%', 'compact toolbar should remain centered');
  assert.equal(toolbar.style.bottom, '10px', 'compact toolbar should stay in the thumb-reachable bottom area');
  assert.match(toolbar.style.transform, /translateX\(-50%\)/,
    'compact toolbar should use horizontal centering');
}

function testResizePositionsToolbarBeforeDependentPanels() {
  const source = readText('js/modules/event-setup-runtime.js');
  const handler = source.match(/window\.addEventListener\('resize',[\s\S]*?resizeTimeout\s*=\s*setTimeout\(\(\)\s*=>\s*\{([\s\S]*?)\n\s*\},\s*\d+\);/);
  assert.ok(handler, 'resize handler should exist');

  const toolbarIndex = handler[1].indexOf('this.repositionToolbarsOnResize()');
  const configIndex = handler[1].indexOf('this.positionConfigArea()');
  assert.ok(toolbarIndex >= 0 && configIndex >= 0, 'resize handler should reposition the toolbar and config area');
  assert.ok(toolbarIndex < configIndex,
    'resize handler should establish the toolbar anchor before positioning its dependent config area');
}

function testPortraitPromptOwnsKeyboardFocus() {
  const html = readText('index.html');
  const bootstrap = readText('js/app/bootstrap.js');
  const overlay = html.match(/<div id="portrait-orientation-overlay"[^>]*>/)?.[0] || '';

  assert.match(overlay, /role="dialog"/, 'portrait prompt should be exposed as a dialog');
  assert.match(overlay, /aria-modal="true"/, 'portrait prompt should identify itself as modal');
  assert.match(overlay, /aria-labelledby="portrait-orientation-title"/,
    'portrait prompt should reference its visible title');
  assert.match(overlay, /aria-describedby="portrait-orientation-tip"/,
    'portrait prompt should reference its visible guidance');
  assert.match(bootstrap, /portrait-orientation-continue-btn[\s\S]*focus/,
    'portrait prompt should move focus to its continue action');
  assert.match(bootstrap, /event\.key\s*===\s*'Tab'/,
    'portrait prompt should keep Tab navigation inside the overlay');
  assert.match(bootstrap, /focusin/,
    'portrait prompt should recover focus if another startup surface attempts to take it');
}

function testMorePanelExposesAndManagesExpandedState() {
  const html = readText('index.html');
  const toolRuntime = readText('js/modules/tool-runtime.js');
  const overlayRuntime = readText('js/modules/overlay-ui-runtime.js');
  const eventRuntime = readText('js/modules/event-setup-runtime.js');
  const moreButton = html.match(/<button id="more-btn"[^>]*>/)?.[0] || '';
  const featureArea = html.match(/<div id="feature-area"[^>]*>/)?.[0] || '';

  assert.match(moreButton, /aria-controls="feature-area"/,
    'More button should identify the panel it controls');
  assert.match(moreButton, /aria-expanded="false"/,
    'More button should expose its initial collapsed state');
  assert.match(featureArea, /role="region"/, 'More panel should be a named landmark');
  assert.match(featureArea, /aria-labelledby="more-btn"/, 'More panel should use the trigger as its label');
  assert.match(toolRuntime, /setAttribute\('aria-expanded',\s*'true'\)/,
    'opening More should expose expanded state');
  assert.match(toolRuntime, /more-shape-btn[\s\S]*focus/,
    'opening More should move focus to its first action');
  assert.match(overlayRuntime, /setAttribute\('aria-expanded',\s*'false'\)/,
    'closing More should expose collapsed state');
  assert.match(eventRuntime, /featureArea[\s\S]*event\.key\s*===\s*'Escape'/,
    'Escape should close the More panel and return to the trigger');
}

function testAutomaticMorePanelCloseRestoresFocus() {
  const focusedAction = { id: 'random-picker-feature-btn' };
  const attributes = new Map();
  let focusOptions = null;
  const featureArea = {
    classList: createClassList(['show']),
    contains(element) {
      return element === focusedAction;
    },
    setAttribute(name, value) {
      attributes.set(`feature:${name}`, value);
    }
  };
  const moreButton = {
    setAttribute(name, value) {
      attributes.set(`more:${name}`, value);
    },
    focus(options) {
      focusOptions = options;
    }
  };
  const sandbox = {
    window: {},
    document: {
      activeElement: focusedAction,
      getElementById(id) {
        if (id === 'feature-area') return featureArea;
        if (id === 'more-btn') return moreButton;
        return null;
      }
    }
  };

  vm.createContext(sandbox);
  vm.runInContext(readText('js/modules/overlay-ui-runtime.js'), sandbox, {
    filename: 'overlay-ui-runtime.js'
  });
  sandbox.window.AboardOverlayUiRuntime.closeFeaturePanel();

  assert.equal(featureArea.classList.contains('show'), false,
    'automatic More panel close should hide the panel');
  assert.equal(attributes.get('feature:aria-hidden'), 'true',
    'automatic More panel close should hide the panel from assistive technology');
  assert.equal(attributes.get('more:aria-expanded'), 'false',
    'automatic More panel close should collapse the trigger state');
  assert.equal(focusOptions?.preventScroll, true,
    'automatic More panel close should return focus to the More trigger');
}

testPhonePortraitUsesScrollableBottomToolbar();
testResizePositionsToolbarBeforeDependentPanels();
testPortraitPromptOwnsKeyboardFocus();
testMorePanelExposesAndManagesExpandedState();
testAutomaticMorePanelCloseRestoresFocus();
console.log('panel-adaptation-ux.test: all assertions passed');
