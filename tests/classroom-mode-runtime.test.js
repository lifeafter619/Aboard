const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

function createElementStub(id) {
  const listeners = new Map();
  const classes = new Set();
  const attributes = new Map();

  return {
    id,
    textContent: '',
    title: '',
    disabled: false,
    dataset: {},
    classList: {
      add(className) {
        classes.add(className);
      },
      remove(className) {
        classes.delete(className);
      },
      toggle(className, force) {
        if (force === true) {
          classes.add(className);
          return true;
        }
        if (force === false) {
          classes.delete(className);
          return false;
        }
        if (classes.has(className)) {
          classes.delete(className);
          return false;
        }
        classes.add(className);
        return true;
      },
      contains(className) {
        return classes.has(className);
      }
    },
    addEventListener(eventName, handler) {
      listeners.set(eventName, handler);
    },
    click() {
      listeners.get('click')?.({ preventDefault() {} });
    },
    setAttribute(name, value) {
      attributes.set(name, String(value));
      if (name === 'aria-label') {
        this.ariaLabel = String(value);
      }
    },
    getAttribute(name) {
      return attributes.get(name) || null;
    },
    removeAttribute(name) {
      attributes.delete(name);
    },
    focus() {}
  };
}

function createContext() {
  const ids = [
    'classroom-mode-bar',
    'classroom-mode-status',
    'classroom-prev-page-btn',
    'classroom-page-status',
    'classroom-next-page-btn',
    'classroom-timer-display',
    'classroom-timer-toggle-btn',
    'classroom-timer-reset-btn',
    'classroom-exit-btn',
    'config-area',
    'feature-area',
    'time-display-area',
    'timer-settings-modal'
  ];
  const elements = Object.fromEntries(ids.map((id) => [id, createElementStub(id)]));
  const bodyClasses = new Set();

  const document = {
    body: {
      classList: {
        add(className) {
          bodyClasses.add(className);
        },
        remove(className) {
          bodyClasses.delete(className);
        },
        contains(className) {
          return bodyClasses.has(className);
        }
      }
    },
    getElementById(id) {
      return elements[id] || null;
    },
    addEventListener() {}
  };

  const window = {
    document,
    addEventListener() {},
    i18n: {
      t(key) {
        return {
          'classroom.prevPage': 'Previous page',
          'classroom.modeActive': 'Classroom mode',
          'classroom.nextPage': 'Next page',
          'classroom.startTimer': 'Start timer',
          'classroom.pauseTimer': 'Pause timer',
          'classroom.resetTimer': 'Reset timer',
          'classroom.exit': 'Exit classroom mode'
        }[key] || key;
      }
    }
  };

  // Controllable clock + interval so tests can simulate background throttling,
  // where setInterval fires far fewer times than wall-clock seconds elapsed.
  let now = 0;
  const intervals = [];
  const clock = {
    set(value) {
      now = value;
    },
    advance(ms) {
      now += ms;
    },
    flushIntervals() {
      intervals.forEach((entry) => {
        if (entry.handler) {
          entry.handler();
        }
      });
    }
  };

  const context = {
    window,
    document,
    console,
    setInterval(handler) {
      const entry = { handler };
      intervals.push(entry);
      return entry;
    },
    clearInterval(token) {
      if (token) {
        token.handler = null;
      }
    },
    Date: {
      now() {
        return now;
      }
    },
    Math,
    Number,
    String
  };
  context.globalThis = context;

  return { context, elements, bodyClasses, clock };
}

function loadClassroomMode(context) {
  const source = fs.readFileSync(path.join(__dirname, '..', 'js', 'modules', 'classroom-mode.js'), 'utf8');
  vm.runInContext(source, context, { filename: 'js/modules/classroom-mode.js' });
}

function testEnterExitAndPaginationBehavior() {
  const { context, elements, bodyClasses } = createContext();
  vm.createContext(context);
  loadClassroomMode(context);

  const calls = [];
  const board = {
    currentPage: 1,
    pages: [{}, {}, {}],
    exitShapeMode() {
      calls.push('exitShapeMode');
    },
    setTool(tool, showConfig) {
      calls.push(['setTool', tool, showConfig]);
    },
    prevPage() {
      this.currentPage -= 1;
      calls.push('prevPage');
    },
    goToPage(pageNumber) {
      this.currentPage = pageNumber;
      calls.push(['goToPage', pageNumber]);
    },
    updatePaginationUI() {
      calls.push('updatePaginationUI');
    },
    toggleCoordinateSettingsPanel() {},
    toggleCoordinatePointPanel() {}
  };

  const manager = new context.window.AboardClassroomModeManager(board);
  manager.enter();

  assert.equal(bodyClasses.has('classroom-mode-active'), true, 'enter should add body active class');
  assert.deepEqual(calls[1], ['setTool', 'pen', false], 'enter should return to pen without opening config');
  assert.equal(elements['classroom-page-status'].textContent, '1 / 3');
  assert.equal(elements['classroom-mode-status'].textContent, 'Classroom mode');
  assert.equal(elements['classroom-prev-page-btn'].disabled, true);
  assert.equal(elements['classroom-next-page-btn'].disabled, false);

  manager.goToNextPage();
  manager.goToNextPage();
  manager.goToNextPage();

  assert.deepEqual(calls.filter((call) => Array.isArray(call) && call[0] === 'goToPage'), [
    ['goToPage', 2],
    ['goToPage', 3]
  ], 'next page should stop at existing last page');
  assert.equal(board.pages.length, 3, 'next page should not add a blank page');
  assert.equal(elements['classroom-next-page-btn'].disabled, true);

  manager.goToPreviousPage();
  assert.equal(calls.includes('prevPage'), true, 'previous page should call board.prevPage');
  assert.equal(elements['classroom-page-status'].textContent, '2 / 3');

  manager.startTimer();
  assert.equal(manager.isTimerRunning, true);
  assert.equal(elements['classroom-timer-toggle-btn'].classList.contains('timer-running'), true);
  assert.equal(elements['classroom-timer-toggle-btn'].ariaLabel, 'Pause timer');

  manager.exit();
  assert.equal(bodyClasses.has('classroom-mode-active'), false, 'exit should remove body active class');
  assert.equal(manager.isTimerRunning, false, 'exit should pause timer');
  assert.equal(calls.includes('updatePaginationUI'), true, 'exit should refresh regular pagination UI');
}

function testTimerTracksWallClockNotTicks() {
  const { context, elements, clock } = createContext();
  vm.createContext(context);
  loadClassroomMode(context);

  const board = {
    currentPage: 1,
    pages: [{}],
    exitShapeMode() {},
    setTool() {},
    updatePaginationUI() {},
    toggleCoordinateSettingsPanel() {},
    toggleCoordinatePointPanel() {}
  };

  const manager = new context.window.AboardClassroomModeManager(board);

  clock.set(1000);
  manager.startTimer();

  // Simulate a backgrounded tab: 5 wall-clock seconds pass but the throttled
  // interval only fires once. A tick-counting timer would show 00:01 here.
  clock.advance(5000);
  clock.flushIntervals();
  assert.equal(elements['classroom-timer-display'].textContent, '00:05',
    'timer should reflect real elapsed time, not the number of interval ticks');

  // Pause folds the current run into the accumulated total; further wall-clock
  // time while paused must not advance the display.
  manager.pauseTimer();
  assert.equal(elements['classroom-timer-display'].textContent, '00:05',
    'pausing should freeze the elapsed time');
  clock.advance(10000);
  manager.syncElapsedFromClock();
  manager.updateTimerDisplay();
  assert.equal(elements['classroom-timer-display'].textContent, '00:05',
    'paused timer must not accrue time');

  // Resuming continues from the accumulated total rather than restarting at 0.
  manager.startTimer();
  clock.advance(3000);
  clock.flushIntervals();
  assert.equal(elements['classroom-timer-display'].textContent, '00:08',
    'resuming should continue from the accumulated elapsed time');

  // Reset clears everything even while running.
  manager.resetTimer();
  assert.equal(elements['classroom-timer-display'].textContent, '00:00',
    'reset should zero the elapsed time');
  clock.advance(2000);
  clock.flushIntervals();
  assert.equal(elements['classroom-timer-display'].textContent, '00:02',
    'timer should keep running after reset and track time from the reset point');
}

(function main() {
  testEnterExitAndPaginationBehavior();
  testTimerTracksWallClockNotTicks();
  console.log('classroom-mode-runtime.test: all assertions passed');
})();
