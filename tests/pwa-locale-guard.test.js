const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

function createDocumentStub() {
  return {
    readyState: 'loading',
    visibilityState: 'visible',
    activeElement: null,
    body: {
      appendChild() {}
    },
    documentElement: {
      lang: 'en-US'
    },
    addEventListener() {},
    getElementById() {
      return null;
    },
    querySelector() {
      return null;
    },
    createElement() {
      return {
        id: '',
        type: '',
        className: '',
        tabIndex: -1,
        textContent: '',
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
}

function createServiceWorkerStub() {
  return {
    controller: null,
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
  };
}

function createLocalStorageStub() {
  const store = new Map();
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

function loadPWAManager({ locale, navigatorLanguage } = {}) {
  const source = fs.readFileSync(
    path.join(__dirname, '..', 'js', 'modules', 'pwa-manager.js'),
    'utf8'
  );

  const document = createDocumentStub();
  const navigator = {
    language: navigatorLanguage,
    onLine: true,
    serviceWorker: createServiceWorkerStub()
  };
  const localStorage = createLocalStorageStub();

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

  if (locale !== undefined) {
    window.i18n = {
      getCurrentLocale() {
        return locale;
      }
    };
  }

  const context = {
    window,
    document,
    navigator,
    localStorage,
    console,
    fetch: async () => ({ ok: false }),
    setTimeout,
    clearTimeout,
    setInterval,
    clearInterval,
    Promise,
    WeakSet,
    Object,
    String
  };

  vm.createContext(context);
  new vm.Script(source, { filename: 'pwa-manager.js' }).runInContext(context);
  return context.window.PWAManager;
}

function testFallsBackToDefaultLocaleWhenLocaleIsMissing() {
  const PWAManager = loadPWAManager({
    navigatorLanguage: undefined
  });
  const manager = new PWAManager();

  assert.equal(manager.getTranslation('install'), 'Install App');
}

function testFallsBackToChineseWhenLocaleFamilyIsChinese() {
  const PWAManager = loadPWAManager({
    locale: 'zh-HK',
    navigatorLanguage: undefined
  });
  const manager = new PWAManager();

  assert.equal(manager.getTranslation('install'), '安装应用');
}

function run() {
  testFallsBackToDefaultLocaleWhenLocaleIsMissing();
  testFallsBackToChineseWhenLocaleFamilyIsChinese();
  console.log('pwa-locale-guard.test: all assertions passed');
}

run();
