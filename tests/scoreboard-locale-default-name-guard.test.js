const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

function loadScoreboardInstanceClass(teamDefault = 'Equipe') {
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
      i18n: {
        t(key) {
          if (key === 'scoreboard.teamDefault') {
            return teamDefault;
          }
          return key;
        }
      },
      addEventListener() {},
      removeEventListener() {}
    },
    document: {
      body: {},
      activeElement: null,
      createElement() {
        return {
          style: {},
          dataset: {},
          classList: { add() {}, remove() {} },
          appendChild() {},
          addEventListener() {},
          querySelector() { return null; },
          querySelectorAll() { return []; },
          setAttribute() {}
        };
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
  return sandbox.window.__ScoreboardInstance;
}

function testLocaleChangeKeepsCustomNamesAndRenamesOnlyDefaults() {
  const ScoreboardInstance = loadScoreboardInstanceClass('Equipe');
  const teams = [
    { name: 'Class A', score: 0 },
    { name: 'Team B', score: 1 },
    { name: '队伍 C', score: 2 },
    { name: 'Red Dragons', score: 3 }
  ];

  let renderCount = 0;
  let saveCount = 0;
  let refreshCount = 0;

  const scoreboard = {
    config: { teams },
    renderTeams() {
      renderCount += 1;
    },
    saveState() {
      saveCount += 1;
    },
    refreshLocalizedUI() {
      refreshCount += 1;
    }
  };

  ScoreboardInstance.prototype.handleLocaleChange.call(scoreboard, 'fr-FR', 'en-US');

  assert.equal(teams[0].name, 'Class A', 'custom names that happen to end with " A" must stay unchanged');
  assert.equal(teams[1].name, 'Equipe B', 'default English team names should be localized');
  assert.equal(teams[2].name, 'Equipe C', 'default Chinese team names should be localized');
  assert.equal(teams[3].name, 'Red Dragons', 'non-default custom names must stay unchanged');
  assert.equal(renderCount, 1, 'renaming default names should re-render the scoreboard');
  assert.equal(saveCount, 1, 'renaming default names should persist the updated labels');
  assert.equal(refreshCount, 1, 'locale refresh should still run after name normalization');
}

(function main() {
  testLocaleChangeKeepsCustomNamesAndRenamesOnlyDefaults();
  console.log('scoreboard-locale-default-name-guard.test: all assertions passed');
})();
