const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

function createDocumentStub() {
  return {
    documentElement: {
      lang: 'zh-CN'
    },
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
}

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

function loadI18n({ localStorageSeed = {}, navigatorLanguage = 'zh-CN', dispatchedEvents = [] } = {}) {
  const source = fs.readFileSync(
    path.join(__dirname, '..', 'js', 'modules', 'i18n.js'),
    'utf8'
  );

  const document = createDocumentStub();
  const localStorage = createLocalStorageStub(localStorageSeed);
  const navigator = {
    language: navigatorLanguage,
    userLanguage: navigatorLanguage,
    languages: [navigatorLanguage]
  };

  class CustomEventStub {
    constructor(type, init = {}) {
      this.type = type;
      this.detail = init.detail;
    }
  }

  const window = {
    appDialog: null,
    dispatchEvent(event) {
      dispatchedEvents.push(event);
    }
  };

  const context = {
    window,
    document,
    localStorage,
    navigator,
    console,
    fetch: async () => ({ ok: false }),
    Intl,
    CustomEvent: CustomEventStub,
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

  return {
    I18n: context.window.I18n,
    document,
    localStorage,
    dispatchedEvents
  };
}

function testResolveInitialLocaleNormalizesSavedManualLocale() {
  const { I18n } = loadI18n({
    localStorageSeed: {
      locale: ' en-us ',
      aboardLocalePreferenceMode: 'manual'
    }
  });
  const i18n = new I18n();
  i18n.detectBrowserLocale = () => 'zh-CN';

  assert.equal(i18n.resolveInitialLocale(), 'en-US');
}

function testDownloadedLocalesNormalizeImportedLocaleCodes() {
  const { I18n } = loadI18n({
    localStorageSeed: {
      aboardDownloadedLocales: JSON.stringify([' zh-tw ', 'en-us', 'invalid'])
    }
  });
  const i18n = new I18n();

  assert.deepEqual(i18n.getDownloadedLocales(), ['zh-TW']);
}

async function testChangeLocaleAcceptsTrimmedCaseInsensitiveCodes() {
  const dispatchedEvents = [];
  const { I18n, document, localStorage } = loadI18n({ dispatchedEvents });
  const i18n = new I18n();
  i18n.currentLocale = 'zh-CN';
  i18n.loadTranslations = async () => {};
  i18n.applyTranslations = () => {};

  const changed = await i18n.changeLocale(' zh-tw ', {
    skipDownloadPrompt: true,
    preferenceMode: 'manual'
  });

  assert.equal(changed, true);
  assert.equal(i18n.getCurrentLocale(), 'zh-TW');
  assert.equal(localStorage.getItem('locale'), 'zh-TW');
  assert.equal(document.documentElement.lang, 'zh-TW');
  assert.equal(dispatchedEvents.at(-1)?.type, 'localeChanged');
  assert.equal(dispatchedEvents.at(-1)?.detail?.locale, 'zh-TW');
  assert.equal(dispatchedEvents.at(-1)?.detail?.oldLocale, 'zh-CN');
}

async function run() {
  testResolveInitialLocaleNormalizesSavedManualLocale();
  testDownloadedLocalesNormalizeImportedLocaleCodes();
  await testChangeLocaleAcceptsTrimmedCaseInsensitiveCodes();
  console.log('i18n-locale-normalization.test: all assertions passed');
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
