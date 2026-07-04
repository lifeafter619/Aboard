const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

function createElement(tagName, documentRef) {
  const element = {
    tagName: tagName.toUpperCase(),
    id: '',
    className: '',
    children: [],
    style: {},
    dataset: {},
    listeners: {},
    _innerHTML: '',
    classList: {
      add() {},
      remove() {}
    },
    appendChild(child) {
      element.children.push(child);
      return child;
    },
    addEventListener(type, handler) {
      element.listeners[type] = handler;
    },
    setAttribute(name, value) {
      element[name] = String(value);
    },
    querySelector(selector) {
      return documentRef.getElementForSelector(selector);
    },
    querySelectorAll() {
      return [];
    },
    set innerHTML(value) {
      element._innerHTML = String(value);
    },
    get innerHTML() {
      return element._innerHTML;
    },
    set textContent(value) {
      element._textContent = String(value);
    },
    get textContent() {
      return element._textContent || '';
    }
  };
  return element;
}

function createDocumentStub() {
  const documentRef = {
    selectorElements: new Map(),
    body: null,
    createElement(tagName) {
      return createElement(tagName, this);
    },
    addEventListener() {},
    getElementById() {
      return null;
    },
    getElementForSelector(selector) {
      if (!this.selectorElements.has(selector)) {
        this.selectorElements.set(selector, createElement('div', this));
      }
      return this.selectorElements.get(selector);
    }
  };
  documentRef.body = createElement('body', documentRef);
  return documentRef;
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
    },
    store
  };
}

function loadScoreboardInstance(document, localStorage = createLocalStorageStub()) {
  const source = `${fs.readFileSync(path.join(__dirname, '..', 'js', 'modules', 'scoreboard.js'), 'utf8')}\nwindow.__ScoreboardInstance = ScoreboardInstance;`;
  const sandbox = {
    window: {
      innerWidth: 1024,
      innerHeight: 768,
      addEventListener() {},
      i18n: {
        t(key) {
          const values = {
            'common.close': 'Close',
            'common.help': 'Help',
            'scoreboard.addTeam': 'Add team',
            'scoreboard.removeTeam': 'Remove team',
            'scoreboard.reset': 'Reset',
            'scoreboard.teamDefault': 'Team',
            'scoreboard.title': 'Scoreboard'
          };
          return values[key] || key;
        }
      }
    },
    document,
    localStorage,
    setTimeout() {},
    Math,
    JSON,
    String,
    parseInt
  };
  sandbox.globalThis = sandbox;
  vm.createContext(sandbox);
  vm.runInContext(source, sandbox, { filename: 'scoreboard.js' });
  return sandbox.window.__ScoreboardInstance;
}

function testInitialTitleAndTeamNameAreSafeBeforeRender() {
  const document = createDocumentStub();
  const ScoreboardInstance = loadScoreboardInstance(document);

  new ScoreboardInstance(1, { remove() {} }, {
    title: '<img src=x onerror=alert(1)>',
    teams: [{ name: '<svg onload=alert(1)>', score: 7 }]
  });

  const widget = document.body.children[0];
  const teamColumn = document.getElementForSelector('.scoreboard-content').children[0];
  const teamName = document.getElementForSelector('.score-team-name');

  assert.equal(widget.innerHTML.includes('<img'), false);
  assert.equal(widget.innerHTML.includes('&lt;img src=x onerror=alert(1)&gt;'), true);
  assert.equal(teamColumn.innerHTML.includes('<svg onload=alert(1)>'), false);
  assert.equal(teamName.textContent, '<svg onload=alert(1)>');
}

function testMultipleScoreboardsDoNotShareSavedTeams() {
  const document = createDocumentStub();
  const localStorage = createLocalStorageStub();
  const ScoreboardInstance = loadScoreboardInstance(document, localStorage);

  const first = new ScoreboardInstance(1, { remove() {} }, {
    teams: [{ name: 'Alpha', score: 3 }]
  });
  first.saveState();

  const second = new ScoreboardInstance(2, { remove() {} });

  assert.notDeepEqual(
    second.config.teams,
    first.config.teams,
    'new scoreboard instances should not inherit another widget instance saved state'
  );
  assert.equal(second.config.teams[0].name, 'Team A');
}

function main() {
  testInitialTitleAndTeamNameAreSafeBeforeRender();
  testMultipleScoreboardsDoNotShareSavedTeams();
  console.log('scoreboard.test: all assertions passed');
}

main();
