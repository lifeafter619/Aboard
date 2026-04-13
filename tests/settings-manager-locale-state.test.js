const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

function createLocalStorageStub(seed = {}) {
  const store = new Map(
    Object.entries(seed).map(([key, value]) => [key, String(value)])
  );

  return {
    getItem(key) {
      return store.has(key) ? store.get(key) : null;
    },
    setItem(key, value) {
      store.set(key, String(value));
    },
    removeItem(key) {
      store.delete(key);
    }
  };
}

function loadSettingsManager({ localStorageSeed = {}, i18n = null } = {}) {
  const source = fs.readFileSync(
    path.join(__dirname, '..', 'js', 'modules', 'settings-manager.js'),
    'utf8'
  );

  const localStorage = createLocalStorageStub(localStorageSeed);
  const window = { i18n };
  const context = {
    window,
    localStorage,
    console,
    JSON,
    Math,
    parseInt,
    parseFloat,
    Set,
    Map,
    Object,
    Array,
    String,
    Number,
    Promise
  };

  vm.createContext(context);
  new vm.Script(source, { filename: 'settings-manager.js' }).runInContext(context);

  return {
    SettingsManager: context.window.SettingsManager,
    localStorage
  };
}

function createI18nStub() {
  return {
    getCurrentLocale() {
      return 'en-US';
    },
    getLocalePreferenceMode() {
      return 'manual';
    },
    getDownloadedLocales() {
      return ['zh-TW'];
    },
    getDismissedPreferredLocaleSuggestion() {
      return 'zh-TW';
    },
    normalizeSupportedLocale(locale) {
      if (locale == null) {
        return null;
      }

      const normalized = String(locale).trim().toLowerCase();
      if (!normalized) {
        return null;
      }

      switch (normalized) {
        case 'en-us':
        case 'en':
          return 'en-US';
        case 'zh-tw':
        case 'zh-hk':
          return 'zh-TW';
        case 'zh-cn':
        case 'zh':
          return 'zh-CN';
        default:
          return null;
      }
    }
  };
}

function testGetLocaleSettingsStateUsesNormalizedI18nValues() {
  const { SettingsManager } = loadSettingsManager({
    localStorageSeed: {
      locale: ' en-us ',
      aboardLocalePreferenceMode: 'manual',
      aboardDownloadedLocales: JSON.stringify([' zh-tw ', 'invalid']),
      aboardDeferredLocaleSuggestionDismissed: ' zh-tw '
    },
    i18n: createI18nStub()
  });
  const manager = Object.create(SettingsManager.prototype);

  const state = JSON.parse(JSON.stringify(manager.getLocaleSettingsState()));

  assert.deepEqual(state, {
    locale: 'en-US',
    preferenceMode: 'manual',
    downloadedLocales: ['zh-TW'],
    dismissedPreferredLocaleSuggestion: 'zh-TW'
  });
}

async function testApplyLocaleSettingsNormalizesFallbackStoredValues() {
  const i18n = createI18nStub();
  const { SettingsManager, localStorage } = loadSettingsManager({ i18n });
  const manager = Object.create(SettingsManager.prototype);

  await manager.applyLocaleSettings({
    locale: ' zh-tw ',
    preferenceMode: 'manual',
    dismissedPreferredLocaleSuggestion: ' zh-tw '
  });

  assert.equal(localStorage.getItem('locale'), 'zh-TW');
  assert.equal(localStorage.getItem('aboardLocalePreferenceMode'), 'manual');
  assert.equal(localStorage.getItem('aboardDeferredLocaleSuggestionDismissed'), 'zh-TW');
}

async function run() {
  testGetLocaleSettingsStateUsesNormalizedI18nValues();
  await testApplyLocaleSettingsNormalizesFallbackStoredValues();
  console.log('settings-manager-locale-state.test: all assertions passed');
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
