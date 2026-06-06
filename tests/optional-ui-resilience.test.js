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
    toggle(value, force) {
      if (force === true) {
        tokens.add(value);
        return true;
      }
      if (force === false) {
        tokens.delete(value);
        return false;
      }
      if (tokens.has(value)) {
        tokens.delete(value);
        return false;
      }
      tokens.add(value);
      return true;
    },
    contains(value) {
      return tokens.has(value);
    }
  };
}

function createElementStub() {
  const listeners = new Map();
  return {
    style: {},
    dataset: {},
    innerHTML: '',
    textContent: '',
    value: '',
    checked: false,
    classList: createClassList(),
    setAttribute() {},
    appendChild() {},
    removeChild() {},
    focus() {},
    addEventListener(type, handler) {
      listeners.set(type, handler);
    },
    trigger(type, event = {}) {
      const handler = listeners.get(type);
      if (handler) {
        handler({ target: this, preventDefault() {}, ...event });
      }
    },
    querySelector() {
      return null;
    },
    querySelectorAll() {
      return [];
    }
  };
}

function createDocumentStub(elements) {
  return {
    body: createElementStub(),
    activeElement: null,
    getElementById(id) {
      return elements[id] || null;
    },
    createElement() {
      return createElementStub();
    },
    createTextNode(text) {
      return { textContent: text };
    },
    addEventListener() {}
  };
}

function createIntlStub(localTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone) {
  function DateTimeFormat(locale, options) {
    const formatter = new Intl.DateTimeFormat(locale, options);
    const originalResolvedOptions = formatter.resolvedOptions.bind(formatter);
    formatter.resolvedOptions = () => ({
      ...originalResolvedOptions(),
      timeZone: localTimeZone
    });
    return formatter;
  }

  return {
    DateTimeFormat
  };
}

function loadTimeDisplayManager({
  localStorage,
  warnings = [],
  localTimeZone,
  translate = (key) => key
} = {}) {
  const source = fs.readFileSync(
    path.join(__dirname, '..', 'js', 'time-display.js'),
    'utf8'
  ) + '\n;globalThis.__optionalUiResilienceExports = { TimeDisplayManager: window.AboardTimeDisplayManager || window.TimeDisplayManager };';

  const elements = {
    'time-display': createElementStub(),
    'time-fullscreen-modal': createElementStub(),
    'time-fullscreen-content': createElementStub(),
    'time-fullscreen-close-btn': createElementStub(),
    'time-fullscreen-settings-btn': createElementStub(),
    'time-fullscreen-settings-panel': createElementStub(),
    'time-fullscreen-font-slider': createElementStub(),
    'time-fullscreen-title-font-slider': createElementStub()
  };
  const document = createDocumentStub(elements);
  const timers = [];

  const sandbox = {
    console: {
      warn(...args) {
        warnings.push(args.map(String).join(' '));
      },
      log() {},
      error() {}
    },
    window: {
      i18n: {
        t(key) {
          return translate(key);
        },
        getCurrentLocale() {
          return 'zh-CN';
        }
      },
      innerWidth: 1280,
      innerHeight: 720,
      requestAnimationFrame(callback) {
        callback();
      }
    },
    document,
    localStorage,
    setInterval(handler) {
      timers.push(handler);
      return timers.length;
    },
    clearInterval() {},
    Intl: createIntlStub(localTimeZone),
    Date,
    Math,
    Number,
    String,
    Boolean,
    Array,
    Object,
    Set,
    Map,
    parseInt,
    parseFloat
  };

  sandbox.globalThis = sandbox;
  sandbox.window.document = document;
  vm.createContext(sandbox);
  vm.runInContext(source, sandbox, { filename: 'time-display.js' });

  return {
    TimeDisplayManager: sandbox.__optionalUiResilienceExports.TimeDisplayManager,
    elements
  };
}

function loadAnnouncementManager({ localStorage, warnings = [] }) {
  const source = fs.readFileSync(
    path.join(__dirname, '..', 'js', 'features', 'announcement', 'announcement-manager.js'),
    'utf8'
  );

  const sanitizedSource = source
    .replace('export class AnnouncementManager', 'class AnnouncementManager')
    .replace('export function registerAnnouncementManagerGlobal', 'function registerAnnouncementManagerGlobal')
    + '\n;globalThis.__optionalUiResilienceExports = { AnnouncementManager };';

  const elements = {
    'announcement-modal': createElementStub(),
    'announcement-title': createElementStub(),
    'announcement-content': createElementStub(),
    'announcement-ok-btn': createElementStub(),
    'announcement-no-show-btn': createElementStub(),
    'settings-announcement-content': createElementStub()
  };
  const document = createDocumentStub(elements);

  const sandbox = {
    console: {
      warn(...args) {
        warnings.push(args.map(String).join(' '));
      },
      log() {},
      error() {}
    },
    window: {
      i18n: {
        t(key) {
          if (key === 'settings.announcement.title') {
            return '公告';
          }
          if (key === 'settings.announcement.content') {
            return ['第一行', 'https://example.com'];
          }
          return key;
        }
      },
      requestAnimationFrame(callback) {
        callback();
      },
      setTimeout(callback) {
        callback();
      },
      addEventListener() {}
    },
    document,
    localStorage,
    Object,
    String,
    Number,
    Boolean,
    Array,
    Set,
    Map
  };

  sandbox.globalThis = sandbox;
  vm.createContext(sandbox);
  vm.runInContext(sanitizedSource, sandbox, { filename: 'announcement-manager.js' });

  return {
    AnnouncementManager: sandbox.__optionalUiResilienceExports.AnnouncementManager,
    elements
  };
}

function testTimeDisplayManagerSurvivesBlockedLocalStorage() {
  const warnings = [];
  const throwingStorage = {
    getItem() {
      throw new Error('storage blocked');
    },
    setItem() {
      throw new Error('storage blocked');
    },
    removeItem() {
      throw new Error('storage blocked');
    }
  };
  const { TimeDisplayManager, elements } = loadTimeDisplayManager({
    localStorage: throwingStorage,
    warnings
  });

  const manager = new TimeDisplayManager({ controlPosition: 'top-right' });

  assert.equal(manager.enabled, true, 'time display should default to enabled when storage is unavailable');
  assert.equal(manager.dateFormat, 'auto', 'time display should fall back to the default date format');
  assert.equal(manager.color, '#000000', 'time display should fall back to the default text color');
  assert.equal(
    elements['time-display'].classList.contains('show'),
    true,
    'time display should still be shown when enabled by default'
  );
  assert.doesNotThrow(() => manager.toggle(), 'toggling time display should degrade instead of throwing when storage writes fail');
  assert.doesNotThrow(() => manager.setFontSize(24), 'font size changes should degrade instead of throwing when storage writes fail');
  assert.doesNotThrow(() => manager.setShowTime(false), 'visibility changes should degrade instead of throwing when storage writes fail');
  assert.ok(
    warnings.some((entry) => entry.includes('time display') && entry.includes('localStorage')),
    'time display degradation should emit warnings when storage is blocked'
  );
}

function testTimeDisplayDateUsesTargetTimezoneWeekday() {
  const storage = {
    getItem() {
      return null;
    },
    setItem() {},
    removeItem() {}
  };
  const { TimeDisplayManager } = loadTimeDisplayManager({
    localStorage: storage,
    localTimeZone: 'UTC'
  });

  const manager = new TimeDisplayManager({ controlPosition: 'top-right' });
  manager.dateFormat = 'yyyy-mm-dd';
  manager.timezone = 'Pacific/Honolulu';

  const formatted = manager.formatDate(new Date('2024-01-02T01:30:00Z'));

  assert.equal(
    formatted,
    '2024-01-01 days.monday',
    'weekday should be calculated in the selected timezone when the date crosses a day boundary'
  );
}

function testTimeDisplaySettersClampRuntimeNumericSettings() {
  const savedValues = new Map();
  const storage = {
    getItem() {
      return null;
    },
    setItem(key, value) {
      savedValues.set(key, String(value));
    },
    removeItem() {}
  };
  const { TimeDisplayManager, elements } = loadTimeDisplayManager({
    localStorage: storage
  });

  const manager = new TimeDisplayManager({ controlPosition: 'top-right' });

  manager.setFontSize(200);
  manager.setOpacity(-20);
  manager.setFullscreenOpacity(150);

  assert.equal(manager.fontSize, 48, 'runtime font size changes should respect the configured maximum');
  assert.equal(savedValues.get('timeDisplayFontSize'), '48');
  assert.match(
    elements['time-display'].innerHTML,
    /font-size: 57\.599999999999994px|font-size: 57\.6px/,
    'rendered time display should use the clamped font size'
  );
  assert.equal(manager.opacity, 0, 'runtime opacity changes should respect the configured minimum');
  assert.equal(savedValues.get('timeDisplayOpacity'), '0');
  assert.equal(elements['time-display'].style.opacity, 0);
  assert.equal(manager.fullscreenOpacity, 100, 'runtime fullscreen opacity changes should respect the configured maximum');
  assert.equal(savedValues.get('timeDisplayFullscreenOpacity'), '100');
}

function testTimeDisplayEscapesTranslatedDateText() {
  const maliciousWeekday = '<img src=x onerror="window.__timeDisplayXss=1">';
  const storage = {
    getItem() {
      return null;
    },
    setItem() {},
    removeItem() {}
  };
  const { TimeDisplayManager, elements } = loadTimeDisplayManager({
    localStorage: storage,
    translate(key) {
      return key === 'days.monday' ? maliciousWeekday : key;
    }
  });

  const manager = new TimeDisplayManager({ controlPosition: 'top-right' });
  manager.showTime = false;
  manager.showDate = true;
  manager.dateFormat = 'yyyy-mm-dd';
  manager.getCurrentTime = () => new Date('2024-01-01T12:00:00Z');
  manager.updateDisplay();
  manager.updateFullscreenDisplay();

  assert.doesNotMatch(
    elements['time-display'].innerHTML,
    /<img/i,
    'time display should not inject translated weekday HTML'
  );
  assert.match(
    elements['time-display'].innerHTML,
    /&lt;img/,
    'time display should render translated weekday markup as text'
  );
  assert.doesNotMatch(
    elements['time-fullscreen-content'].innerHTML,
    /<img/i,
    'fullscreen time display should not inject translated weekday HTML'
  );
}

function testAnnouncementManagerDoesNotBlockStartupWhenStorageIsAvailable() {
  const storage = {
    getItem() {
      return null;
    },
    setItem() {},
    removeItem() {}
  };
  const { AnnouncementManager, elements } = loadAnnouncementManager({
    localStorage: storage
  });

  const manager = new AnnouncementManager();

  assert.equal(
    elements['announcement-modal'].classList.contains('show'),
    false,
    'announcement modal should not block first paint/startup by default'
  );
  assert.doesNotThrow(
    () => manager.showFromSettings(),
    'manual announcement display from settings should still work'
  );
  assert.equal(
    elements['announcement-modal'].classList.contains('show'),
    true,
    'manual announcement display should reveal the modal'
  );
}

function testAnnouncementManagerSurvivesBlockedLocalStorage() {
  const warnings = [];
  const throwingStorage = {
    getItem() {
      throw new Error('storage blocked');
    },
    setItem() {
      throw new Error('storage blocked');
    },
    removeItem() {
      throw new Error('storage blocked');
    }
  };
  const { AnnouncementManager, elements } = loadAnnouncementManager({
    localStorage: throwingStorage,
    warnings
  });

  const manager = new AnnouncementManager();

  assert.equal(
    elements['announcement-modal'].classList.contains('show'),
    false,
    'announcement modal should not block startup even when storage cannot be read'
  );
  assert.doesNotThrow(
    () => elements['announcement-no-show-btn'].trigger('click'),
    'the no-show action should degrade instead of throwing when storage writes fail'
  );
  assert.equal(
    elements['announcement-modal'].classList.contains('show'),
    false,
    'the no-show action should still close the modal even when persistence fails'
  );
  assert.doesNotThrow(
    () => manager.showFromSettings(),
    'manual announcement display should still work after a degraded no-show action'
  );
  assert.ok(
    warnings.some((entry) => entry.includes('announcement') && entry.includes('localStorage')),
    'announcement degradation should emit warnings when storage is blocked'
  );
}

(function main() {
  testTimeDisplayManagerSurvivesBlockedLocalStorage();
  testTimeDisplayDateUsesTargetTimezoneWeekday();
  testTimeDisplaySettersClampRuntimeNumericSettings();
  testTimeDisplayEscapesTranslatedDateText();
  testAnnouncementManagerDoesNotBlockStartupWhenStorageIsAvailable();
  testAnnouncementManagerSurvivesBlockedLocalStorage();
  console.log('optional-ui-resilience.test: all assertions passed');
})()
