const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

function createManagerStub() {
  const calls = [];
  const record = (name) => (...args) => calls.push({ name, args });
  return {
    calls,
    showTime: false,
    showDate: false,
    color: '#000000',
    bgColor: '#FFFFFF',
    fontSize: 16,
    opacity: 100,
    fullscreenFontSize: 80,
    fullscreenOpacity: 95,
    isFullscreen: false,
    setShowDate(value) { this.showDate = value; calls.push({ name: 'setShowDate', args: [value] }); },
    setShowTime(value) { this.showTime = value; calls.push({ name: 'setShowTime', args: [value] }); },
    setTimezone: record('setTimezone'),
    setTimeFormat: record('setTimeFormat'),
    setDateFormat: record('setDateFormat'),
    setColor: record('setColor'),
    setBgColor: record('setBgColor'),
    setFontSize: record('setFontSize'),
    setOpacity: record('setOpacity'),
    setFullscreenMode: record('setFullscreenMode'),
    setFullscreenFontSize: record('setFullscreenFontSize'),
    setFullscreenColor: record('setFullscreenColor'),
    setFullscreenBgColor: record('setFullscreenBgColor'),
    setFullscreenOpacity: record('setFullscreenOpacity'),
    applySettings: record('applySettings'),
    updateDisplay: record('updateDisplay'),
    updateFullscreenDisplay: record('updateFullscreenDisplay')
  };
}

function loadSettingsModalClass({ activeDisplayType = null } = {}) {
  const makeButton = (type) => ({
    dataset: { tdDisplayType: type },
    active: false,
    classList: {
      toggle(_name, force) { this.ownerActive = force; },
      contains() { return false; }
    }
  });
  const displayButtons = ['both', 'date-only', 'time-only'].map(makeButton);
  const context = {
    window: {},
    document: {
      querySelector(selector) {
        if (selector === '.display-option-btn[data-td-display-type].active') {
          return activeDisplayType
            ? { dataset: { tdDisplayType: activeDisplayType } }
            : null;
        }
        return null;
      },
      querySelectorAll(selector) {
        if (selector === '.display-option-btn[data-td-display-type]') {
          return displayButtons;
        }
        return [];
      },
      getElementById() { return null; }
    },
    console,
    Math,
    Number,
    String,
    Boolean,
    Array,
    Object
  };
  context.globalThis = context;
  vm.createContext(context);
  vm.runInContext(
    fs.readFileSync(path.join(__dirname, '..', 'js', 'modules', 'time-display-settings.js'), 'utf8'),
    context,
    { filename: 'time-display-settings.js' }
  );
  return { SettingsModal: context.window.TimeDisplaySettingsModal, displayButtons };
}

function testApplySettingsLeavesBothOffStateAlone() {
  const { SettingsModal } = loadSettingsModalClass({ activeDisplayType: null });
  const manager = createManagerStub();
  const modal = Object.create(SettingsModal.prototype);
  modal.timeDisplayManager = manager;

  modal.applySettings();

  const displayCalls = manager.calls.filter(
    (call) => call.name === 'setShowDate' || call.name === 'setShowTime'
  );
  assert.deepEqual(
    displayCalls,
    [],
    'with no active display-type button (both hidden), applySettings must not force a display back on'
  );
  assert.equal(manager.showTime, false);
  assert.equal(manager.showDate, false);
}

function testApplySettingsStillAppliesExplicitChoice() {
  const { SettingsModal } = loadSettingsModalClass({ activeDisplayType: 'date-only' });
  const manager = createManagerStub();
  const modal = Object.create(SettingsModal.prototype);
  modal.timeDisplayManager = manager;

  modal.applySettings();

  assert.equal(manager.showDate, true, 'date-only must enable the date');
  assert.equal(manager.showTime, false, 'date-only must disable the time');
}

function testSyncSettingsHighlightsNothingWhenBothHidden() {
  const { SettingsModal, displayButtons } = loadSettingsModalClass();
  const manager = createManagerStub();
  manager.showTime = false;
  manager.showDate = false;
  const modal = Object.create(SettingsModal.prototype);
  modal.timeDisplayManager = manager;
  modal.getNumberOrDefault = (value, fallback) => (Number.isFinite(value) ? value : fallback);
  modal.updateColorControlAccessibility = () => {};

  modal.syncSettings();

  for (const button of displayButtons) {
    assert.equal(
      button.classList.ownerActive,
      false,
      `"${button.dataset.tdDisplayType}" must not be highlighted when both date and time are hidden`
    );
  }
}

function testManagerSettersMirrorAreaCheckboxes() {
  const source = fs.readFileSync(path.join(__dirname, '..', 'js', 'time-display.js'), 'utf8');
  assert.match(
    source,
    /setShowDate\(show\)\s*\{[\s\S]{0,600}?show-date-checkbox-area/,
    'setShowDate must sync the area panel checkbox'
  );
  assert.match(
    source,
    /setShowTime\(show\)\s*\{[\s\S]{0,600}?show-time-checkbox-area/,
    'setShowTime must sync the area panel checkbox'
  );
}

testApplySettingsLeavesBothOffStateAlone();
testApplySettingsStillAppliesExplicitChoice();
testSyncSettingsHighlightsNothingWhenBothHidden();
testManagerSettersMirrorAreaCheckboxes();
console.log('time-display-state-sync.test: all assertions passed');
