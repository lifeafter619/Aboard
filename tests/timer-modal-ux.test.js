const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

function createClassList() {
  const tokens = new Set();
  return {
    add(...values) {
      values.forEach((value) => tokens.add(value));
    },
    remove(...values) {
      values.forEach((value) => tokens.delete(value));
    },
    contains(value) {
      return tokens.has(value);
    },
    toggle(value, force) {
      if (typeof force === 'boolean') {
        if (force) {
          tokens.add(value);
          return true;
        }
        tokens.delete(value);
        return false;
      }
      if (tokens.has(value)) {
        tokens.delete(value);
        return false;
      }
      tokens.add(value);
      return true;
    }
  };
}

function createElement(ownerDocument, id = '') {
  const listeners = new Map();
  return {
    ownerDocument,
    id,
    style: {},
    dataset: {},
    attributes: {},
    classList: createClassList(),
    textContent: '',
    value: '',
    checked: false,
    disabled: false,
    tabIndex: 0,
    setAttribute(name, value) {
      this.attributes[name] = String(value);
      if (name === 'id') {
        this.id = String(value);
      }
    },
    getAttribute(name) {
      return this.attributes[name] ?? null;
    },
    addEventListener(type, handler) {
      const handlers = listeners.get(type) || [];
      handlers.push(handler);
      listeners.set(type, handlers);
    },
    trigger(type, extra = {}) {
      const event = {
        target: this,
        currentTarget: this,
        defaultPrevented: false,
        preventDefault() {
          this.defaultPrevented = true;
        },
        stopPropagation() {},
        ...extra
      };
      (listeners.get(type) || []).forEach((handler) => handler(event));
      return event;
    },
    focus() {
      ownerDocument.activeElement = this;
    },
    closest() {
      return null;
    },
    querySelector() {
      return null;
    },
    querySelectorAll() {
      return [];
    }
  };
}

function createDocumentStub() {
  const elements = new Map();
  const document = {
    activeElement: null,
    body: null,
    visibilityState: 'visible',
    getElementById(id) {
      return elements.get(id) || null;
    },
    querySelector() {
      return null;
    },
    querySelectorAll() {
      return [];
    },
    createElement() {
      return createElement(document);
    },
    addEventListener() {},
    registerElement(element) {
      if (element?.id) {
        elements.set(element.id, element);
      }
      return element;
    }
  };

  document.body = createElement(document, 'body');
  document.body.appendChild = () => {};
  return document;
}

function loadTimerManagerClass({ AudioClass } = {}) {
  const document = createDocumentStub();
  const sandbox = {
    console,
    Math,
    Number,
    String,
    Boolean,
    Array,
    Object,
    Set,
    Map,
    WeakMap,
    WeakSet,
    Date,
    RegExp,
    JSON,
    Promise,
    parseInt,
    parseFloat,
    isNaN,
    setTimeout,
    clearTimeout,
    setInterval,
    clearInterval,
    Audio: AudioClass || class FakeAudio {
      addEventListener() {}
      pause() {}
      play() {
        return Promise.resolve();
      }
    },
    window: {
      i18n: {
        t(key) {
          return key;
        }
      },
      drawingBoard: {
        syncResizableModalState() {}
      },
      requestAnimationFrame(callback) {
        callback();
      },
      addEventListener() {},
      removeEventListener() {},
      innerWidth: 1280,
      innerHeight: 720
    },
    document,
    localStorage: {
      getItem() {
        return null;
      },
      setItem() {},
      removeItem() {}
    },
    CustomEvent: class CustomEvent {}
  };

  sandbox.globalThis = sandbox;
  sandbox.self = sandbox;
  sandbox.window.document = document;

  const source = `${fs.readFileSync(path.join(__dirname, '..', 'js', 'modules', 'timer.js'), 'utf8')}\nwindow.__TimerManager = TimerManager;`;
  vm.createContext(sandbox);
  vm.runInContext(source, sandbox, { filename: 'timer.js' });

  return {
    document,
    TimerManager: sandbox.window.__TimerManager
  };
}

function createTrackingAudioClass(events) {
  return class TrackingAudio {
    constructor(url) {
      this.url = url;
      this.paused = true;
      this.currentTime = 0;
      events.push({ type: 'construct', url });
    }

    addEventListener() {}

    load() {
      events.push({ type: 'load', url: this.url });
    }

    pause() {
      this.paused = true;
    }

    play() {
      this.paused = false;
      return Promise.resolve();
    }

    cloneNode() {
      return new TrackingAudio(this.url);
    }
  };
}

function createManagerHarness(proto, document) {
  const timerSettingsModal = document.registerElement(createElement(document, 'timer-settings-modal'));
  const timerSettingsCloseBtn = document.registerElement(createElement(document, 'timer-settings-close-btn'));
  const timerHours = document.registerElement(createElement(document, 'timer-hours'));
  const timerMinutes = document.registerElement(createElement(document, 'timer-minutes'));
  const timerSeconds = document.registerElement(createElement(document, 'timer-seconds'));
  const timerTitleInput = document.registerElement(createElement(document, 'timer-title-input'));
  const timerSoundCheckbox = document.registerElement(createElement(document, 'timer-sound-checkbox'));
  const timerLoopCheckbox = document.registerElement(createElement(document, 'timer-loop-checkbox'));
  const timerLoopCount = document.registerElement(createElement(document, 'timer-loop-count'));
  const timerPlaybackSpeed = document.registerElement(createElement(document, 'timer-playback-speed'));
  const timerPlaybackSpeedValue = document.registerElement(createElement(document, 'timer-playback-speed-value'));
  const timerLoopInterval = document.registerElement(createElement(document, 'timer-loop-interval'));
  const soundSettingsContent = document.registerElement(createElement(document, 'sound-settings-content'));
  const soundLoopCountGroup = document.registerElement(createElement(document, 'sound-loop-count-group'));
  const timerColorCheckbox = document.registerElement(createElement(document, 'timer-color-checkbox'));
  const timerColorSettings = document.registerElement(createElement(document, 'timer-color-settings'));
  const timerMoreSettingsBtn = document.registerElement(createElement(document, 'timer-more-settings-btn'));
  const timerMoreSettingsContent = document.registerElement(createElement(document, 'timer-more-settings-content'));
  const timerStartBtn = document.registerElement(createElement(document, 'timer-start-btn'));
  const timerAlertModal = document.registerElement(createElement(document, 'timer-alert-modal'));
  const timerAlertMessage = document.registerElement(createElement(document, 'timer-alert-message'));
  const timerAlertOkBtn = document.registerElement(createElement(document, 'timer-alert-ok-btn'));

  const manager = {
    adjustingTimer: null,
    timerSettingsPreviouslyFocusedElement: null,
    timerAlertPreviouslyFocusedElement: null,
    sounds: {},
    getTimerSettingsModal: proto.getTimerSettingsModal,
    getTimerSettingsElements: proto.getTimerSettingsElements,
    setupEventListeners: proto.setupEventListeners,
    showSettingsModal: proto.showSettingsModal,
    hideSettingsModal: proto.hideSettingsModal,
    showAlertModal: proto.showAlertModal,
    hideAlertModal: proto.hideAlertModal,
    updateSoundGroupVisibility() {},
    updateTimerLabel() {},
    syncTimerColorSelections() {},
    updateMainPreviewButtonState() {},
    updateMoreSettingsState() {},
    updateTimerColorAccessibility() {},
    setActiveTimerMode() {
      return true;
    },
    stopPreviewAudio() {},
    previewSound() {},
    previewSoundByUrl() {},
    startTimer() {}
  };

  timerLoopCount.value = '3';
  timerPlaybackSpeed.value = '1.0';
  timerLoopInterval.value = '1';

  return {
    manager,
    timerSettingsModal,
    timerSettingsCloseBtn,
    timerHours,
    timerMinutes,
    timerSeconds,
    timerTitleInput,
    timerSoundCheckbox,
    timerLoopCheckbox,
    timerLoopCount,
    timerPlaybackSpeed,
    timerPlaybackSpeedValue,
    timerLoopInterval,
    soundSettingsContent,
    soundLoopCountGroup,
    timerColorCheckbox,
    timerColorSettings,
    timerMoreSettingsBtn,
    timerMoreSettingsContent,
    timerStartBtn,
    timerAlertModal,
    timerAlertMessage,
    timerAlertOkBtn
  };
}

function testTimerSettingsModalBackdropDismissalRestoresFocus() {
  const { document, TimerManager } = loadTimerManagerClass();
  const proto = TimerManager.prototype;
  const trigger = createElement(document, 'open-timer-settings');
  const { manager, timerSettingsModal, timerHours } = createManagerHarness(proto, document);

  trigger.focus();
  manager.setupEventListeners();

  assert.equal(timerSettingsModal.getAttribute('role'), 'dialog');
  assert.equal(timerSettingsModal.getAttribute('aria-modal'), 'true');
  assert.equal(timerSettingsModal.getAttribute('aria-labelledby'), 'timer-settings-title');

  manager.showSettingsModal();

  assert.equal(timerSettingsModal.classList.contains('show'), true, 'showSettingsModal should reveal the timer settings dialog');
  assert.equal(document.activeElement, timerHours, 'showSettingsModal should focus the first time input');

  timerSettingsModal.trigger('click', { target: timerSettingsModal });

  assert.equal(timerSettingsModal.classList.contains('show'), false, 'backdrop click should close the timer settings dialog');
  assert.equal(document.activeElement, trigger, 'backdrop dismissal should restore focus to the opener');
}

function testTimerAlertModalBackdropDismissalRestoresFocus() {
  const { document, TimerManager } = loadTimerManagerClass();
  const proto = TimerManager.prototype;
  const trigger = createElement(document, 'open-timer-alert');
  const { manager, timerAlertModal, timerAlertMessage, timerAlertOkBtn } = createManagerHarness(proto, document);

  trigger.focus();
  manager.setupEventListeners();

  assert.equal(timerAlertModal.getAttribute('role'), 'dialog');
  assert.equal(timerAlertModal.getAttribute('aria-modal'), 'true');
  assert.equal(timerAlertModal.getAttribute('aria-labelledby'), 'timer-alert-title');
  assert.equal(timerAlertModal.getAttribute('aria-describedby'), 'timer-alert-message');

  manager.showAlertModal('Please set the countdown time.');

  assert.equal(timerAlertMessage.textContent, 'Please set the countdown time.');
  assert.equal(timerAlertModal.classList.contains('show'), true, 'showAlertModal should reveal the timer alert dialog');
  assert.equal(document.activeElement, timerAlertOkBtn, 'showAlertModal should focus the alert confirmation button');

  timerAlertModal.trigger('click', { target: timerAlertModal });

  assert.equal(timerAlertModal.classList.contains('show'), false, 'backdrop click should close the timer alert dialog');
  assert.equal(document.activeElement, trigger, 'alert backdrop dismissal should restore focus to the opener');
}

function testTimerPresetSoundsLoadOnlyAfterUserIntent() {
  const firstAudioEvents = [];
  const firstLoad = loadTimerManagerClass({
    AudioClass: createTrackingAudioClass(firstAudioEvents)
  });
  const firstDocument = firstLoad.document;
  firstDocument.registerElement(createElement(firstDocument, 'timer-settings-modal'));
  const timerSoundCheckbox = firstDocument.registerElement(createElement(firstDocument, 'timer-sound-checkbox'));
  firstDocument.registerElement(createElement(firstDocument, 'sound-settings-content'));

  new firstLoad.TimerManager();

  assert.deepEqual(
    firstAudioEvents.filter((event) => event.type === 'load'),
    [],
    'TimerManager construction should not download preset sounds before the user asks for sound'
  );

  timerSoundCheckbox.checked = true;
  timerSoundCheckbox.trigger('change');

  assert.equal(
    firstAudioEvents.filter((event) => event.type === 'load').length,
    4,
    'enabling timer sound should preload the preset sounds once'
  );

  timerSoundCheckbox.trigger('change');

  assert.equal(
    firstAudioEvents.filter((event) => event.type === 'load').length,
    4,
    're-enabling timer sound should not reload audio that is already preloaded'
  );

  const secondAudioEvents = [];
  const secondLoad = loadTimerManagerClass({
    AudioClass: createTrackingAudioClass(secondAudioEvents)
  });
  secondLoad.document.registerElement(createElement(secondLoad.document, 'timer-settings-modal'));
  const previewManager = new secondLoad.TimerManager();
  const previewButton = createElement(secondLoad.document, 'timer-sound-preview-btn');

  previewManager.previewSound('gentle-alarm', previewButton);

  assert.deepEqual(
    secondAudioEvents.filter((event) => event.type === 'load').map((event) => event.url),
    ['sounds/gentle-alarm.MP3'],
    'previewing one preset sound should preload only that audio file'
  );
}

(function main() {
  testTimerSettingsModalBackdropDismissalRestoresFocus();
  testTimerAlertModalBackdropDismissalRestoresFocus();
  testTimerPresetSoundsLoadOnlyAfterUserIntent();
  console.log('timer-modal-ux.test: all assertions passed');
})();
