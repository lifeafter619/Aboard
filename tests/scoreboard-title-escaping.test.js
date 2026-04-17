const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

function createScoreboardElementStub() {
  const nodes = {
    '.scoreboard-title': { textContent: '' },
    '.scoreboard-content': { innerHTML: '', appendChild() {} },
    '.scoreboard-add-team-btn': { title: '', setAttribute() {} },
    '.scoreboard-reset-btn': { title: '', setAttribute() {} },
    '.scoreboard-help-btn': { title: '', setAttribute() {} },
    '.scoreboard-close-btn': { title: '', setAttribute() {} }
  };

  return {
    style: {},
    dataset: {},
    innerHTML: '',
    classList: { add() {}, remove() {} },
    appendChild() {},
    addEventListener() {},
    querySelector(selector) {
      return nodes[selector] || null;
    },
    querySelectorAll() {
      return [];
    },
    setAttribute() {}
  };
}

function loadScoreboardInstanceClass() {
  let lastCreatedElement = null;
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
    JSON,
    parseInt,
    parseFloat,
    isNaN,
    window: {
      innerWidth: 1280,
      innerHeight: 720,
      i18n: {
        t(key) {
          return key;
        }
      },
      addEventListener() {},
      removeEventListener() {}
    },
    document: {
      body: {
        appendChild() {}
      },
      activeElement: null,
      createElement() {
        lastCreatedElement = createScoreboardElementStub();
        return lastCreatedElement;
      },
      getElementById() {
        return null;
      }
    },
    localStorage: {
      getItem() { return null; },
      setItem() {},
      removeItem() {}
    }
  };

  sandbox.globalThis = sandbox;
  sandbox.self = sandbox;
  sandbox.window.document = sandbox.document;

  const source = `${fs.readFileSync(path.join(__dirname, '..', 'js', 'modules', 'scoreboard.js'), 'utf8')}\nwindow.__ScoreboardInstance = ScoreboardInstance;`;
  vm.createContext(sandbox);
  vm.runInContext(source, sandbox, { filename: 'scoreboard.js' });

  return {
    ScoreboardInstance: sandbox.window.__ScoreboardInstance,
    getLastCreatedElement() {
      return lastCreatedElement;
    }
  };
}

function testCreateElementEscapesCustomTitleHtml() {
  const { ScoreboardInstance, getLastCreatedElement } = loadScoreboardInstanceClass();
  const maliciousTitle = '<img src=x onerror="window.__scoreboardXss=1">';
  const scoreboard = {
    id: 1,
    config: {
      title: maliciousTitle,
      teams: []
    },
    renderTeams() {},
    setupEvents() {}
  };

  ScoreboardInstance.prototype.createElement.call(scoreboard);

  const element = getLastCreatedElement();
  assert.ok(element, 'scoreboard element should be created');
  assert.ok(
    !element.innerHTML.includes(maliciousTitle),
    'scoreboard widget should not inject raw custom title HTML'
  );
}

(function main() {
  testCreateElementEscapesCustomTitleHtml();
  console.log('scoreboard-title-escaping.test: all assertions passed');
})();
