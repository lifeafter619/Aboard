const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

function createStubNode() {
  return {
    style: {},
    dataset: {},
    innerHTML: '',
    textContent: '',
    value: '',
    className: '',
    addEventListener() {},
    appendChild() {},
    remove() {},
    setAttribute() {},
    querySelector() {
      return null;
    },
    querySelectorAll() {
      return [];
    },
    classList: {
      add() {},
      remove() {},
      toggle() {}
    }
  };
}

function createDisplayStub() {
  const nodes = {
    '.timer-display-time': createStubNode(),
    '.timer-display-title': createStubNode(),
    '.timer-display-mode': createStubNode(),
    '.timer-help-btn': createStubNode(),
    '.timer-close-btn': createStubNode(),
    '.timer-reset-btn': createStubNode(),
    '.timer-minimal-btn': createStubNode(),
    '.timer-adjust-btn': createStubNode(),
    '.timer-fullscreen-btn': createStubNode(),
    '.timer-font-size-label': createStubNode(),
    '.timer-font-size-slider': createStubNode(),
    '.timer-play-pause-btn': createStubNode()
  };

  return {
    ...createStubNode(),
    querySelector(selector) {
      return nodes[selector] || null;
    },
    querySelectorAll() {
      return [];
    }
  };
}

function loadTimerRuntime() {
  const sandbox = {
    console,
    Math,
    Number,
    Date,
    Set,
    Map,
    WeakMap,
    WeakSet,
    Promise,
    Array,
    Object,
    String,
    Boolean,
    RegExp,
    JSON,
    parseInt,
    parseFloat,
    isNaN,
    Infinity,
    NaN,
    setInterval,
    clearInterval,
    setTimeout,
    clearTimeout,
    Audio: class FakeAudio {
      addEventListener() {}
      pause() {}
      play() { return Promise.resolve(); }
    },
    window: {
      i18n: { t: (key) => key },
      drawingBoard: { settingsManager: { toastManager: { show() {} } } },
      requestAnimationFrame(callback) { callback(); },
      innerWidth: 1280,
      innerHeight: 720,
      addEventListener() {},
      removeEventListener() {}
    },
    document: {
      body: {
        appendChild() {}
      },
      activeElement: null,
      getElementById() { return null; },
      createElement() { return createDisplayStub(); },
      addEventListener() {}
    },
    localStorage: { getItem() { return null; }, setItem() {}, removeItem() {} },
    CustomEvent: class CustomEvent {}
  };
  sandbox.globalThis = sandbox;
  sandbox.self = sandbox;
  sandbox.window.document = sandbox.document;

  const source = `${fs.readFileSync(path.join(__dirname, '..', 'js', 'modules', 'timer.js'), 'utf8')}\nwindow.__TimerInstance = TimerInstance;`;
  vm.createContext(sandbox);
  vm.runInContext(source, sandbox, { filename: 'timer.js' });
  return {
    TimerInstance: sandbox.window.__TimerInstance,
    sandbox
  };
}

function testCreateDisplayElementEscapesTitle() {
  const { TimerInstance, sandbox } = loadTimerRuntime();
  const proto = TimerInstance.prototype;
  const maliciousTitle = '<img src=x onerror="window.__timerXss=1">';
  const display = createDisplayStub();
  sandbox.document.createElement = () => display;
  sandbox.document.body.appendChild = () => {};

  const timer = {
    id: 1,
    title: maliciousTitle,
    mode: 'countdown',
    textColor: '#000000',
    bgColor: '#ffffff',
    remainingTime: 0,
    countdownDuration: 0,
    displayElement: null,
    setupEventListeners() {},
    setupDragging() {},
    refreshLocalizedUI() {},
    displayTime() {}
  };

  proto.createDisplayElement.call(timer);

  assert.ok(!display.innerHTML.includes(maliciousTitle), 'timer widget should not inject raw title HTML');
}

function testFullscreenDisplayEscapesTitle() {
  const { TimerInstance } = loadTimerRuntime();
  const proto = TimerInstance.prototype;
  const maliciousTitle = '<svg onload="window.__timerXss=1"></svg>';
  const fullscreenContent = createStubNode();
  const fullscreenModal = {
    style: {},
    querySelector() {
      return null;
    }
  };

  const timer = {
    title: maliciousTitle,
    mode: 'countdown',
    remainingTime: 0,
    showTime: true,
    showDate: false,
    fullscreenFontSizePercent: 15,
    fullscreenTitleFontSizePercent: 5,
    fullscreenTextColor: '#ffffff',
    fullscreenBgColor: '#000000',
    fullscreenContent,
    fullscreenModal
  };

  proto.updateFullscreenDisplay.call(timer);

  assert.ok(!fullscreenContent.innerHTML.includes(maliciousTitle), 'fullscreen timer view should not inject raw title HTML');
}

(function main() {
  testCreateDisplayElementEscapesTitle();
  testFullscreenDisplayEscapesTitle();
  console.log('timer-title-escaping.test: all assertions passed');
})();
