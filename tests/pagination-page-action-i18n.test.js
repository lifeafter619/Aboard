const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

function createElementStub(initial = {}) {
  const attributes = new Map();
  const element = {
    id: initial.id || '',
    value: initial.value || '',
    textContent: initial.textContent || '',
    innerHTML: initial.innerHTML || '',
    title: initial.title || '',
    disabled: Boolean(initial.disabled),
    classList: {
      add() {},
      remove() {},
      toggle() {},
      contains() {
        return false;
      }
    },
    setAttribute(name, value) {
      attributes.set(name, String(value));
      if (name === 'aria-label') {
        this.ariaLabel = String(value);
      }
      if (name === 'title') {
        this.title = String(value);
      }
    },
    getAttribute(name) {
      if (name === 'aria-label') {
        return this.ariaLabel || null;
      }
      if (name === 'title') {
        return this.title || null;
      }
      return attributes.has(name) ? attributes.get(name) : null;
    },
    querySelectorAll() {
      return [];
    }
  };

  if (initial.ariaLabel) {
    element.ariaLabel = initial.ariaLabel;
    attributes.set('aria-label', initial.ariaLabel);
  }
  if (initial.dataI18nTitle) {
    attributes.set('data-i18n-title', initial.dataI18nTitle);
  }

  return element;
}

function createContext() {
  const elements = {
    'prev-page-btn': createElementStub({
      id: 'prev-page-btn',
      title: '上一页',
      ariaLabel: '上一页',
      dataI18nTitle: 'page.previous'
    }),
    'next-or-add-page-btn': createElementStub({
      id: 'next-or-add-page-btn',
      title: '下一页',
      ariaLabel: '下一页',
      dataI18nTitle: 'page.next'
    }),
    'page-input': createElementStub({
      id: 'page-input',
      value: '1',
      title: '输入页码跳转',
      ariaLabel: '输入页码跳转'
    }),
    'page-total': createElementStub({
      id: 'page-total',
      textContent: '/ 1'
    })
  };

  const document = {
    documentElement: {
      lang: 'zh-CN',
      getAttribute() {
        return null;
      }
    },
    body: {
      appendChild() {}
    },
    getElementById(id) {
      return elements[id] || null;
    },
    querySelectorAll() {
      return [];
    },
    querySelector() {
      return null;
    },
    addEventListener() {},
    createElement() {
      return createElementStub();
    }
  };

  const localStorage = {
    getItem() {
      return null;
    },
    setItem() {},
    removeItem() {}
  };

  const window = {
    document,
    localStorage,
    navigator: { language: 'zh-CN' },
    addEventListener() {},
    removeEventListener() {},
    dispatchEvent() {}
  };

  const context = {
    window,
    document,
    localStorage,
    navigator: window.navigator,
    console,
    CustomEvent: function CustomEvent(type, detail) {
      this.type = type;
      this.detail = detail;
    },
    setTimeout,
    clearTimeout,
    Set,
    Map,
    WeakMap,
    WeakSet,
    URL,
    Promise,
    Object,
    String,
    Number,
    Array,
    Math
  };

  context.globalThis = context;
  context.self = context;
  window.window = window;

  return { context, elements };
}

function loadRuntime(context, relativePath) {
  const source = fs.readFileSync(path.join(__dirname, '..', relativePath), 'utf8');
  vm.runInContext(source, context, { filename: relativePath });
}

function testSinglePageKeepsNewPageLabelAfterI18nRefresh() {
  const { context, elements } = createContext();
  vm.createContext(context);
  loadRuntime(context, 'js/modules/pagination-runtime.js');
  loadRuntime(context, 'js/modules/i18n.js');

  const i18n = new context.window.I18n();
  i18n.t = (key) => ({
    'page.previous': '上一页',
    'page.next': '下一页',
    'page.newPage': '新建页面',
    'page.jumpPlaceholder': '输入页码跳转'
  }[key] || key);
  context.window.i18n = i18n;

  const board = {
    currentPage: 1,
    pages: [{}]
  };

  context.window.AboardPaginationRuntime.updatePaginationUI(board);
  assert.equal(elements['next-or-add-page-btn'].title, '新建页面', 'pagination runtime should expose add-page label on a single page');

  i18n.translatePageControls();

  assert.equal(
    elements['next-or-add-page-btn'].title,
    '新建页面',
    'i18n refresh should not overwrite the single-page add button label with next-page text'
  );
  assert.equal(elements['next-or-add-page-btn'].ariaLabel, '新建页面');
}

function run() {
  testSinglePageKeepsNewPageLabelAfterI18nRefresh();
  console.log('pagination-page-action-i18n.test: all assertions passed');
}

run();
