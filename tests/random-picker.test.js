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
    listeners: {},
    _innerHTML: '',
    _textContent: '',
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
      return element._textContent;
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

function loadRandomPickerInstance(document) {
  const source = `${fs.readFileSync(path.join(__dirname, '..', 'js', 'modules', 'random-picker.js'), 'utf8')}\nwindow.__RandomPickerInstance = RandomPickerInstance;`;
  const sandbox = {
    window: {
      innerWidth: 1024,
      innerHeight: 768,
      addEventListener() {},
      removeEventListener() {},
      i18n: {
        t(key) {
          const values = {
            'common.help': 'Help',
            'common.start': 'Start',
            'randomPicker.namePicker': 'Name Picker',
            'randomPicker.numberPicker': 'Number Picker'
          };
          return values[key] || key;
        }
      }
    },
    document,
    setTimeout() {},
    setInterval() {
      return 1;
    },
    clearInterval() {},
    Math: Object.assign(Object.create(Math), {
      random() {
        return 0.75;
      }
    }),
    JSON,
    parseInt
  };
  sandbox.globalThis = sandbox;
  vm.createContext(sandbox);
  vm.runInContext(source, sandbox, { filename: 'random-picker.js' });
  return sandbox.window.__RandomPickerInstance;
}

function testInitialTitleIsInsertedAsText() {
  const document = createDocumentStub();
  const RandomPickerInstance = loadRandomPickerInstance(document);

  new RandomPickerInstance(1, { showSettings() {}, remove() {} }, {
    title: '<img src=x onerror=alert(1)>'
  });

  const widget = document.body.children[0];
  const title = document.getElementForSelector('.random-picker-title');
  assert.equal(widget.innerHTML.includes('<img'), false);
  assert.equal(title.textContent, '<img src=x onerror=alert(1)>');
}

function testLargeNoRepeatNumberRangeStillPicksRandomResult() {
  const document = createDocumentStub();
  const RandomPickerInstance = loadRandomPickerInstance(document);
  const instance = new RandomPickerInstance(1, { showSettings() {}, remove() {} }, {
    mode: 'number',
    min: 1,
    max: 20000,
    allowRepeats: false
  });

  instance.startPick();
  instance.stopAnimation();
  const firstResult = instance.resultElement.textContent;

  assert.equal(
    firstResult,
    '15001',
    'large no-repeat number ranges should fall back to random selection instead of always returning the minimum'
  );

  instance.startPick();
  instance.stopAnimation();

  assert.notEqual(
    instance.resultElement.textContent,
    firstResult,
    'large no-repeat number ranges should still avoid picking the same number twice'
  );
}

function testTitleOnlyUpdatePreservesNoRepeatProgress() {
  const document = createDocumentStub();
  const RandomPickerInstance = loadRandomPickerInstance(document);
  const instance = new RandomPickerInstance(1, { showSettings() {}, remove() {} }, {
    mode: 'number',
    min: 1,
    max: 10,
    allowRepeats: false
  });
  instance.remainingNumbers = [2, 4, 6];
  instance.remainingNumberCount = 3;

  instance.updateConfig({ title: 'Updated title' });

  assert.deepEqual(instance.remainingNumbers, [2, 4, 6],
    'changing unrelated settings must preserve no-repeat number progress');
  assert.equal(instance.remainingNumberCount, 3);
}

function testUnsafeNumberRangeFallsBackToFiniteDefaults() {
  const document = createDocumentStub();
  const RandomPickerInstance = loadRandomPickerInstance(document);
  const instance = new RandomPickerInstance(1, { showSettings() {}, remove() {} }, {
    mode: 'number',
    min: Number.MIN_SAFE_INTEGER,
    max: Number.MAX_SAFE_INTEGER,
    allowRepeats: false
  });

  assert.equal(instance.config.min, 1);
  assert.equal(instance.config.max, 50);
  assert.equal(instance.remainingNumberCount, 50);
  assert.equal(Number.isFinite(instance.remainingNumberCount), true);
}

function main() {
  testInitialTitleIsInsertedAsText();
  testLargeNoRepeatNumberRangeStillPicksRandomResult();
  testTitleOnlyUpdatePreservesNoRepeatProgress();
  testUnsafeNumberRangeFallsBackToFiniteDefaults();
  console.log('random-picker.test: all assertions passed');
}

main();
