const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

function createThrowingStorageRecorder() {
  const calls = [];
  return {
    calls,
    getItem(key) {
      calls.push(['getItem', key]);
      throw new Error('storage blocked');
    },
    setItem(key, value) {
      calls.push(['setItem', key, value]);
      throw new Error('storage blocked');
    },
    removeItem(key) {
      calls.push(['removeItem', key]);
      throw new Error('storage blocked');
    }
  };
}

function createWarningConsole(warnings) {
  return {
    warn(...args) {
      warnings.push(args.map(String).join(' '));
    },
    log() {},
    error() {}
  };
}

function loadI18nHarness({ localStorage, warnings = [] }) {
  const source = fs.readFileSync(
    path.join(__dirname, '..', 'js', 'modules', 'i18n.js'),
    'utf8'
  );

  const document = {
    documentElement: { lang: 'zh-CN' },
    querySelectorAll() {
      return [];
    },
    querySelector() {
      return null;
    },
    getElementById() {
      return null;
    }
  };

  const context = {
    window: {
      appDialog: null,
      dispatchEvent() {}
    },
    document,
    localStorage,
    navigator: {
      language: 'ja-JP',
      userLanguage: 'ja-JP',
      languages: ['ja-JP']
    },
    console: createWarningConsole(warnings),
    fetch: async () => ({ ok: false }),
    Intl,
    CustomEvent: class CustomEvent {
      constructor(type, init = {}) {
        this.type = type;
        this.detail = init.detail;
      }
    },
    setTimeout,
    clearTimeout,
    Promise,
    JSON,
    Object,
    Array,
    String,
    Map,
    Set,
    WeakSet
  };

  vm.createContext(context);
  new vm.Script(source, { filename: 'i18n.js' }).runInContext(context);
  return context.window.I18n;
}

function loadPwaHarness({ localStorage, warnings = [] }) {
  const source = fs.readFileSync(
    path.join(__dirname, '..', 'js', 'modules', 'pwa-manager.js'),
    'utf8'
  );

  const document = {
    readyState: 'complete',
    visibilityState: 'visible',
    activeElement: null,
    body: { appendChild() {} },
    documentElement: { lang: 'en-US' },
    addEventListener() {},
    getElementById() {
      return null;
    },
    querySelector() {
      return null;
    },
    createElement() {
      return {
        style: {},
        classList: {
          add() {},
          remove() {},
          toggle() {},
          contains() {
            return false;
          }
        },
        appendChild() {},
        setAttribute() {},
        addEventListener() {},
        focus() {}
      };
    }
  };

  const navigator = {
    language: 'en-US',
    onLine: true,
    serviceWorker: {
      controller: {},
      ready: Promise.resolve(null),
      addEventListener() {},
      async getRegistration() {
        return null;
      },
      async register() {
        return {
          scope: './',
          waiting: null,
          installing: null,
          active: null,
          addEventListener() {},
          async update() {}
        };
      }
    }
  };

  const window = {
    document,
    navigator,
    localStorage,
    addEventListener() {},
    removeEventListener() {},
    setTimeout,
    clearTimeout,
    setInterval,
    clearInterval,
    requestAnimationFrame(callback) {
      return setTimeout(callback, 0);
    },
    location: {
      reload() {}
    }
  };

  const context = {
    window,
    document,
    navigator,
    localStorage,
    console: createWarningConsole(warnings),
    fetch: async () => ({ ok: false }),
    setTimeout,
    clearTimeout,
    setInterval,
    clearInterval,
    Promise,
    WeakSet,
    Object,
    String,
    JSON,
    Date
  };

  vm.createContext(context);
  new vm.Script(source, { filename: 'pwa-manager.js' }).runInContext(context);
  return context.window.PWAManager;
}

function loadImageControlsHarness({ localStorage, warnings = [] }) {
  const source = fs.readFileSync(
    path.join(__dirname, '..', 'js', 'image-controls.js'),
    'utf8'
  ) + '\nwindow.__ImageControls = window.AboardImageControls || window.ImageControls;';

  const context = {
    window: {
      i18n: {
        applyTranslations() {}
      },
      dispatchEvent() {}
    },
    document: {
      getElementById() {
        return null;
      },
      body: {
        insertAdjacentHTML() {}
      },
      addEventListener() {}
    },
    localStorage,
    console: createWarningConsole(warnings),
    CustomEvent: class CustomEvent {
      constructor(type) {
        this.type = type;
      }
    },
    Math,
    Number,
    String,
    Boolean,
    Array,
    Object,
    Set,
    Map
  };

  vm.createContext(context);
  new vm.Script(source, { filename: 'image-controls.js' }).runInContext(context);
  return context.window.__ImageControls;
}

function loadScoreboardHarness({ localStorage, warnings = [] }) {
  const source = fs.readFileSync(
    path.join(__dirname, '..', 'js', 'modules', 'scoreboard.js'),
    'utf8'
  ) + '\nwindow.__ScoreboardInstance = ScoreboardInstance;';

  const context = {
    window: {
      i18n: {
        t(key) {
          return key === 'scoreboard.teamDefault' ? 'Team' : key;
        }
      },
      addEventListener() {},
      removeEventListener() {},
      innerWidth: 1440,
      innerHeight: 900
    },
    document: {
      body: {
        appendChild() {}
      },
      activeElement: null
    },
    localStorage,
    console: createWarningConsole(warnings),
    Math,
    Number,
    String,
    Boolean,
    Array,
    Object,
    Set,
    Map
  };

  vm.createContext(context);
  new vm.Script(source, { filename: 'scoreboard.js' }).runInContext(context);
  return context.window.__ScoreboardInstance;
}

function testI18nSurvivesBlockedStorage() {
  const warnings = [];
  const localStorage = createThrowingStorageRecorder();
  const I18n = loadI18nHarness({ localStorage, warnings });
  const i18n = new I18n();
  i18n.detectBrowserLocale = () => 'ja-JP';

  assert.equal(
    i18n.resolveInitialLocale(),
    'ja-JP',
    'i18n should fall back to browser locale when storage is unavailable'
  );
  assert.doesNotThrow(() => i18n.saveLocale('en-US'));
  assert.doesNotThrow(() => i18n.saveLocalePreferenceMode('manual'));
  assert.doesNotThrow(() => i18n.setDismissedPreferredLocaleSuggestion('zh-TW'));
  assert.ok(
    warnings.some((entry) => entry.includes('i18n') && entry.includes('localStorage')),
    'i18n storage failures should emit warnings'
  );
}

function testPwaManagerSurvivesBlockedStorage() {
  const warnings = [];
  const localStorage = createThrowingStorageRecorder();
  const PWAManager = loadPwaHarness({ localStorage, warnings });
  const manager = new PWAManager();

  assert.equal(
    manager.getUpdatePreference(),
    'prompt',
    'PWA manager should fall back to prompt mode when storage is unavailable'
  );
  assert.doesNotThrow(() => manager.setUpdatePreference('auto'));
  assert.doesNotThrow(() => manager.writePlannedUpdateIntent({ reason: 'update', mode: 'idle' }));
  assert.doesNotThrow(() => manager.clearPlannedUpdateIntent());
  assert.ok(
    warnings.some((entry) => entry.includes('PWA') && entry.includes('localStorage')),
    'PWA storage failures should emit warnings'
  );
}

function testImageControlsSurviveBlockedStorage() {
  const warnings = [];
  const localStorage = createThrowingStorageRecorder();
  const ImageControls = loadImageControlsHarness({ localStorage, warnings });

  ImageControls.prototype.createControls = function createControlsStub() {
    this.overlay = { style: {}, querySelectorAll() { return []; } };
    this.controlBox = {
      style: {},
      querySelector() {
        return null;
      },
      querySelectorAll() {
        return [];
      },
      addEventListener() {}
    };
    this.rotateHandle = { addEventListener() {} };
    this.flipHorizontalHandle = { addEventListener() {}, classList: { toggle() {} } };
    this.flipVerticalHandle = { addEventListener() {}, classList: { toggle() {} } };
    this.toolbar = {
      querySelectorAll() {
        return [];
      },
      style: {}
    };
  };
  ImageControls.prototype.setupEventListeners = function setupEventListenersStub() {};
  ImageControls.prototype.hideControls = function hideControlsStub() {};

  const controls = new ImageControls({ bgCanvas: {} });

  assert.equal(
    controls.isConfirmed,
    false,
    'image controls should default to unconfirmed when storage is unavailable'
  );
  assert.doesNotThrow(() => controls.confirmImage());
  assert.doesNotThrow(() => controls.resetConfirmation());
  assert.ok(
    warnings.some((entry) => entry.includes('image controls') && entry.includes('localStorage')),
    'image control storage failures should emit warnings'
  );
}

function testScoreboardSurvivesBlockedStorage() {
  const warnings = [];
  const localStorage = createThrowingStorageRecorder();
  const ScoreboardInstance = loadScoreboardHarness({ localStorage, warnings });

  ScoreboardInstance.prototype.createElement = function createElementStub() {
    this.element = null;
  };

  const scoreboard = new ScoreboardInstance(1, {});

  assert.deepEqual(
    JSON.parse(JSON.stringify(scoreboard.config.teams)),
    [
      { name: 'Team A', score: 0 },
      { name: 'Team B', score: 0 }
    ],
    'scoreboard should fall back to localized defaults when storage is unavailable'
  );
  assert.doesNotThrow(() => scoreboard.saveState());
  assert.ok(
    warnings.some((entry) => entry.includes('scoreboard') && entry.includes('localStorage')),
    'scoreboard storage failures should emit warnings'
  );
}

(function main() {
  testI18nSurvivesBlockedStorage();
  testPwaManagerSurvivesBlockedStorage();
  testImageControlsSurviveBlockedStorage();
  testScoreboardSurvivesBlockedStorage();
  console.log('storage-fallback-resilience.test: all assertions passed');
})();
