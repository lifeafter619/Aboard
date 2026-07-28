const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

class FakeAudio {
  constructor(url) {
    this.url = url;
    this.handlers = new Map();
    this.playbackRate = 1;
  }

  addEventListener(type, handler) {
    const listeners = this.handlers.get(type) || [];
    listeners.push(handler);
    this.handlers.set(type, listeners);
  }

  pause() {}

  play() {
    const error = new Error('simulated play failure');
    const errorListeners = this.handlers.get('error') || [];
    errorListeners.forEach((listener) => listener(error));
    return Promise.reject(error);
  }
}

function createElementStub() {
  return {
    className: '',
    dataset: {},
    style: {},
    innerHTML: '',
    appendChild() {},
    addEventListener() {},
    querySelector() { return null; },
    querySelectorAll() { return []; },
    setAttribute() {},
    classList: { add() {}, remove() {}, toggle() {} }
  };
}

function loadTimerInstanceClass() {
  const sandboxConsole = {
    log() {},
    warn() {},
    error() {}
  };
  const sandbox = {
    console: sandboxConsole,
    Math,
    Number,
    Date,
    Set,
    Map,
    WeakMap,
    Promise,
    Array,
    Object,
    String,
    Boolean,
    RegExp,
    parseInt,
    parseFloat,
    isNaN,
    Infinity,
    NaN,
    setInterval,
    clearInterval,
    setTimeout,
    clearTimeout,
    Audio: FakeAudio,
    window: {
      i18n: { t: (key) => key },
      drawingBoard: { settingsManager: { toastManager: { show() {} } } }
    },
    document: {
      body: {},
      activeElement: null,
      getElementById() { return null; },
      createElement: createElementStub,
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
  return sandbox.window.__TimerInstance;
}

async function testAudioFallbackOnlyNotifiesOnce() {
  const TimerInstance = loadTimerInstanceClass();
  const proto = TimerInstance.prototype;
  let fallbackCount = 0;

  const timer = {
    manager: { sounds: {} },
    currentAudio: null,
    loopTimeoutId: null,
    playbackSpeed: 1,
    loopSound: false,
    currentLoopIteration: 0,
    loopCount: 1,
    loopInterval: 0,
    notifyAudioFallback() {
      fallbackCount += 1;
    }
  };

  proto.playSound_Internal.call(timer, 'fake.mp3');
  await new Promise((resolve) => setTimeout(resolve, 0));

  assert.equal(fallbackCount, 1, 'audio fallback should notify exactly once per failed playback');
}

function testResetStopsActiveAlarmAndCountdownRoundsUp() {
  const TimerInstance = loadTimerInstanceClass();
  const proto = TimerInstance.prototype;
  let pauseCount = 0;
  const timeDisplay = { textContent: '', classList: { remove() {}, add() {} } };
  const timer = {
    mode: 'countdown',
    countdownDuration: 10000,
    remainingTime: 250,
    intervalId: null,
    currentAudio: {
      currentTime: 4,
      pause() { pauseCount += 1; }
    },
    loopTimeoutId: setTimeout(() => {}, 10000),
    currentLoopIteration: 2,
    isRunning: true,
    isPaused: false,
    displayElement: {
      querySelector(selector) {
        return selector === '.timer-display-time' ? timeDisplay : null;
      }
    },
    updatePlayPauseButton() {},
    updateTimerDisplayClass() {},
    stopFinishSound: proto.stopFinishSound,
    displayTime: proto.displayTime
  };

  proto.displayTime.call(timer, 250);
  assert.equal(timeDisplay.textContent, '00:00:01',
    'a running countdown must not display zero before it has finished');

  proto.resetTimer.call(timer);
  assert.equal(pauseCount, 1, 'resetting a timer must stop an active alarm');
  assert.equal(timer.currentAudio, null);
  assert.equal(timer.loopTimeoutId, null);
  assert.equal(timer.currentLoopIteration, 0);
}

(async function main() {
  await testAudioFallbackOnlyNotifiesOnce();
  testResetStopsActiveAlarmAndCountdownRoundsUp();
  console.log('timer-audio-fallback.test: all assertions passed');
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
