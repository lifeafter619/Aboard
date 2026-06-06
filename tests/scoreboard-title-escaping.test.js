const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

function createScoreboardElementStub() {
  const appendedScoreColumns = [];
  const content = {
    innerHTML: '',
    appendedScoreColumns,
    appendChild(child) {
      appendedScoreColumns.push(child);
    }
  };
  const nodes = {
    '.scoreboard-title': { textContent: '' },
    '.scoreboard-content': content,
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

function createScoreColumnStub() {
  const nodes = {
    '.score-team-name': {
      textContent: '',
      addEventListener() {}
    },
    '.score-btn.minus': {
      addEventListener() {}
    },
    '.score-btn.plus': {
      addEventListener() {}
    },
    '.score-remove-btn': {
      addEventListener() {}
    }
  };

  return {
    className: '',
    dataset: {},
    innerHTML: '',
    appendChild() {},
    addEventListener() {},
    querySelector(selector) {
      return nodes[selector] || null;
    },
    querySelectorAll() {
      return [];
    }
  };
}

function loadScoreboardInstanceClass({ rootFirst = true } = {}) {
  let lastCreatedElement = null;
  let shouldCreateRoot = rootFirst;
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
        if (shouldCreateRoot) {
          shouldCreateRoot = false;
          lastCreatedElement = createScoreboardElementStub();
          return lastCreatedElement;
        }
        return createScoreColumnStub();
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

function testRenderTeamsDoesNotInjectScoreHtmlFromSavedState() {
  const { ScoreboardInstance } = loadScoreboardInstanceClass({ rootFirst: false });
  const maliciousScore = '<img src=x onerror="window.__scoreboardScoreXss=1">';
  const root = createScoreboardElementStub();
  const scoreboard = {
    element: root,
    config: {
      teams: [
        {
          name: 'Team A',
          score: maliciousScore
        }
      ]
    },
    refreshLocalizedUI() {}
  };

  ScoreboardInstance.prototype.renderTeams.call(scoreboard);

  const appended = root.querySelector('.scoreboard-content').appendedScoreColumns;
  assert.equal(appended.length, 1, 'scoreboard should render one score column');
  assert.ok(
    !appended[0].innerHTML.includes(maliciousScore),
    'scoreboard should not inject raw score HTML from persisted state'
  );
}

(function main() {
  testCreateElementEscapesCustomTitleHtml();
  testRenderTeamsDoesNotInjectScoreHtmlFromSavedState();
  console.log('scoreboard-title-escaping.test: all assertions passed');
})();
