const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

function createStorage() {
  const data = Object.create(null);
  return {
    data,
    getItem(key) {
      return Object.prototype.hasOwnProperty.call(data, key) ? data[key] : null;
    },
    setItem(key, value) {
      data[key] = String(value);
    }
  };
}

function createClassList(initialValue = '') {
  const tokens = new Set(String(initialValue).split(/\s+/).filter(Boolean));
  return {
    add(...values) {
      values.forEach((value) => tokens.add(value));
    },
    remove(...values) {
      values.forEach((value) => tokens.delete(value));
    },
    contains(value) {
      return tokens.has(value);
    },
    toString() {
      return Array.from(tokens).join(' ');
    }
  };
}

function unique(elements) {
  return Array.from(new Set(elements));
}

function collectDescendants(root) {
  const results = [];
  const visit = (node) => {
    node.children.forEach((child) => {
      results.push(child);
      visit(child);
    });
  };
  visit(root);
  return results;
}

function matchesSimpleSelector(element, selector) {
  if (selector === '.settings-group') {
    return element.classList.contains('settings-group');
  }
  if (selector === '.settings-group.collapsible:not(.collapsed)') {
    return element.classList.contains('settings-group')
      && element.classList.contains('collapsible')
      && !element.classList.contains('collapsed');
  }
  if (selector === '.settings-group-header') {
    return element.classList.contains('settings-group-header');
  }
  if (selector === '.settings-group-content') {
    return element.classList.contains('settings-group-content');
  }
  if (selector === '.settings-hint') {
    return element.classList.contains('settings-hint');
  }
  if (selector === 'label') {
    return element.tagName === 'LABEL';
  }
  if (selector === 'button') {
    return element.tagName === 'BUTTON';
  }
  if (selector === 'select') {
    return element.tagName === 'SELECT';
  }
  if (selector === 'textarea') {
    return element.tagName === 'TEXTAREA';
  }
  if (selector === 'input[type="checkbox"]') {
    return element.tagName === 'INPUT' && element.type === 'checkbox';
  }
  if (selector === 'input:not([type="checkbox"])') {
    return element.tagName === 'INPUT' && element.type !== 'checkbox';
  }
  if (/^\.[a-z0-9_-]+(?:\.[a-z0-9_-]+)*$/i.test(selector)) {
    return selector.slice(1).split('.').every((token) => element.classList.contains(token));
  }
  return false;
}

function querySelectorAllWithin(root, selector) {
  if (selector.startsWith(':scope > ')) {
    const childSelector = selector.slice(':scope > '.length).trim();
    return root.children.filter((child) => matchesSimpleSelector(child, childSelector));
  }

  const selectors = selector.split(',').map((part) => part.trim()).filter(Boolean);
  const descendants = collectDescendants(root);
  return unique(
    selectors.flatMap((part) => descendants.filter((node) => matchesSimpleSelector(node, part)))
  );
}

class FakeElement {
  constructor(tagName, {
    id = '',
    className = '',
    type = '',
    textContent = '',
    scrollHeight = 200
  } = {}) {
    this.tagName = String(tagName).toUpperCase();
    this.id = id;
    this.type = type;
    this.textContent = textContent;
    this.style = {};
    this.children = [];
    this.parentNode = null;
    this.innerHTML = '';
    this.tabIndex = undefined;
    this.attributes = Object.create(null);
    this.listeners = new Map();
    this.classList = createClassList(className);
    this._scrollHeight = scrollHeight;

    if (id) {
      this.attributes.id = id;
    }
    if (type) {
      this.attributes.type = type;
    }
  }

  get className() {
    return this.classList.toString();
  }

  set className(value) {
    this.classList = createClassList(value);
  }

  get firstChild() {
    return this.children[0] || null;
  }

  get scrollHeight() {
    return this._scrollHeight;
  }

  get offsetHeight() {
    return 0;
  }

  appendChild(child) {
    if (child.parentNode) {
      child.parentNode.removeChild(child);
    }
    this.children.push(child);
    child.parentNode = this;
    return child;
  }

  removeChild(child) {
    const index = this.children.indexOf(child);
    if (index >= 0) {
      this.children.splice(index, 1);
      child.parentNode = null;
    }
    return child;
  }

  contains(target) {
    if (this === target) {
      return true;
    }
    return this.children.some((child) => child.contains(target));
  }

  addEventListener(type, handler) {
    const existing = this.listeners.get(type) || [];
    existing.push(handler);
    this.listeners.set(type, existing);
  }

  dispatch(type, extra = {}) {
    const event = {
      type,
      target: this,
      currentTarget: this,
      defaultPrevented: false,
      preventDefault() {
        this.defaultPrevented = true;
      },
      ...extra
    };
    (this.listeners.get(type) || []).forEach((handler) => handler(event));
    return event;
  }

  setAttribute(name, value) {
    const stringValue = String(value);
    this.attributes[name] = stringValue;
    if (name === 'id') {
      this.id = stringValue;
    }
    if (name === 'type') {
      this.type = stringValue;
    }
    if (name === 'tabindex') {
      this.tabIndex = Number(value);
    }
  }

  getAttribute(name) {
    return Object.prototype.hasOwnProperty.call(this.attributes, name)
      ? this.attributes[name]
      : null;
  }

  querySelector(selector) {
    return this.querySelectorAll(selector)[0] || null;
  }

  querySelectorAll(selector) {
    return querySelectorAllWithin(this, selector);
  }
}

function createSettingsGroup({
  id = '',
  labelText,
  hints = 1,
  controls = [],
  checkboxOnly = false
} = {}) {
  const group = new FakeElement('div', {
    id,
    className: 'settings-group',
    scrollHeight: 260
  });

  const label = new FakeElement('label', {
    className: checkboxOnly ? 'checkbox-label' : '',
    textContent: labelText
  });

  if (checkboxOnly) {
    label.appendChild(new FakeElement('input', { type: 'checkbox' }));
    label.appendChild(new FakeElement('span', { textContent: labelText }));
  }

  group.appendChild(label);

  for (let index = 0; index < hints; index += 1) {
    group.appendChild(new FakeElement('p', {
      className: 'settings-hint',
      textContent: `${labelText} hint ${index + 1}`
    }));
  }

  controls.forEach((control) => {
    group.appendChild(control);
  });

  return group;
}

function createDocument(groups) {
  const allNodes = () => groups.flatMap((group) => [group, ...collectDescendants(group)]);
  return {
    readyState: 'complete',
    addEventListener() {},
    createElement(tagName) {
      return new FakeElement(tagName);
    },
    querySelectorAll(selector) {
      if (selector === '.settings-group') {
        return groups;
      }
      if (selector === '.settings-group.collapsible:not(.collapsed)') {
        return groups.filter((group) => matchesSimpleSelector(group, selector));
      }
      return [];
    },
    getElementById(id) {
      return allNodes().find((node) => node.id === id) || null;
    }
  };
}

function loadCollapsibleManager({ document, localStorage }) {
  const source = fs.readFileSync(
    path.join(__dirname, '..', 'js', 'collapsible.js'),
    'utf8'
  ) + '\n;globalThis.__settingsCollapsibleTestExports = { CollapsibleManager: window.AboardCollapsibleManager || window.CollapsibleManager };';

  const sandbox = {
    console,
    document,
    window: {},
    localStorage,
    JSON,
    Math,
    Number,
    String,
    Boolean,
    Array,
    Object,
    Set,
    Map
  };

  sandbox.globalThis = sandbox;
  vm.createContext(sandbox);
  vm.runInContext(source, sandbox, { filename: 'collapsible.js' });
  return sandbox.__settingsCollapsibleTestExports.CollapsibleManager;
}

function findOpeningDivStart(html, groupId) {
  const marker = `id="${groupId}"`;
  const markerIndex = html.indexOf(marker);
  assert.notEqual(markerIndex, -1, `${groupId} should exist in index.html`);
  const divStart = html.lastIndexOf('<div', markerIndex);
  assert.notEqual(divStart, -1, `${groupId} should belong to a div element`);
  return divStart;
}

function extractDivBlock(html, startIndex) {
  let depth = 0;
  let cursor = startIndex;

  while (cursor < html.length) {
    const nextOpen = html.indexOf('<div', cursor);
    const nextClose = html.indexOf('</div>', cursor);

    if (nextOpen === -1 && nextClose === -1) {
      break;
    }

    if (nextOpen !== -1 && nextOpen < nextClose) {
      depth += 1;
      cursor = nextOpen + 4;
      continue;
    }

    depth -= 1;
    cursor = nextClose + 6;
    if (depth === 0) {
      return html.slice(startIndex, cursor);
    }
  }

  assert.fail(`Unable to extract complete div block starting at index ${startIndex}`);
}

function assertStableSettingsGroup({ html, groupId, containedId, labelText }) {
  const divStart = findOpeningDivStart(html, groupId);
  const block = extractDivBlock(html, divStart);

  assert.match(
    block,
    new RegExp(`class="[^"]*settings-group[^"]*"`, 'i'),
    `${groupId} should be a settings group`
  );
  assert.match(
    block,
    new RegExp(`id="${containedId}"`, 'i'),
    `${groupId} should directly wrap ${containedId}`
  );
  assert.match(
    block,
    new RegExp(`>${labelText}<`, 'i'),
    `${groupId} should preserve the expected section label`
  );
}

function testHeavySettingsGroupsHaveStableIds() {
  const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');

  assertStableSettingsGroup({
    html,
    groupId: 'settings-global-font-group',
    containedId: 'font-management-list',
    labelText: '全局字体'
  });
  assertStableSettingsGroup({
    html,
    groupId: 'settings-toolbar-customization-group',
    containedId: 'toolbar-customization-list',
    labelText: '工具栏自定义'
  });
  assertStableSettingsGroup({
    html,
    groupId: 'settings-control-buttons-group',
    containedId: 'control-button-list',
    labelText: '控制按钮设置'
  });
  assertStableSettingsGroup({
    html,
    groupId: 'settings-control-position-group',
    containedId: 'control-position-buttons',
    labelText: '控制按钮位置'
  });
}

function testCollapsibleManagerAddsAccessibleHeadersAndStableState() {
  const storage = createStorage();
  const heavyGroup = createSettingsGroup({
    id: 'settings-global-font-group',
    labelText: 'Global Font',
    hints: 2,
    controls: [
      new FakeElement('select'),
      new FakeElement('button', { type: 'button' }),
      new FakeElement('div', {
        id: 'font-management-list',
        className: 'font-management-list'
      })
    ]
  });
  const simpleGroup = createSettingsGroup({
    id: 'settings-touch-zoom-group',
    labelText: 'Touch Zoom',
    hints: 1,
    checkboxOnly: true
  });

  const document = createDocument([heavyGroup, simpleGroup]);
  const CollapsibleManager = loadCollapsibleManager({ document, localStorage: storage });
  const manager = new CollapsibleManager();

  assert.equal(
    heavyGroup.id,
    'settings-global-font-group',
    'heavy settings groups should preserve explicit stable ids'
  );
  assert.ok(heavyGroup.classList.contains('collapsible'), 'heavy settings groups should become collapsible');
  assert.ok(heavyGroup.classList.contains('collapsed'), 'heavy settings groups should start collapsed by default');

  const header = heavyGroup.querySelector(':scope > .settings-group-header');
  const content = heavyGroup.querySelector(':scope > .settings-group-content');
  assert.ok(header, 'collapsible groups should receive a dedicated header element');
  assert.ok(content, 'collapsible groups should wrap the remaining content');
  assert.equal(header.getAttribute('role'), 'button', 'collapsible headers should expose button semantics');
  assert.equal(header.tabIndex, 0, 'collapsible headers should be keyboard focusable');
  assert.equal(header.getAttribute('aria-expanded'), 'false', 'collapsed groups should report aria-expanded=false');
  assert.equal(
    header.getAttribute('aria-controls'),
    content.id,
    'collapsible headers should point at the controlled content region'
  );

  header.dispatch('keydown', { key: 'Enter' });
  assert.ok(!heavyGroup.classList.contains('collapsed'), 'pressing Enter on the header should expand the group');
  assert.equal(header.getAttribute('aria-expanded'), 'true', 'expanded groups should report aria-expanded=true');
  assert.equal(content.style.maxHeight, `${content.scrollHeight}px`, 'expanded groups should animate to their scroll height');
  assert.deepEqual(
    JSON.parse(storage.data.collapsedSections),
    { default: true, 'settings-global-font-group': false },
    'expanding should persist the stable group id in localStorage'
  );

  header.dispatch('click');
  assert.ok(heavyGroup.classList.contains('collapsed'), 'clicking the header should collapse the group again');
  assert.equal(header.getAttribute('aria-expanded'), 'false', 'collapsing should restore aria-expanded=false');
  assert.deepEqual(
    JSON.parse(storage.data.collapsedSections),
    { default: true, 'settings-global-font-group': true },
    'collapsing should persist the stable group id in localStorage'
  );

  assert.ok(
    !simpleGroup.classList.contains('collapsible'),
    'simple single-checkbox settings should remain directly visible'
  );
  assert.equal(
    simpleGroup.querySelector(':scope > .settings-group-header'),
    null,
    'simple single-checkbox settings should not gain extra collapsible chrome'
  );

  assert.equal(typeof manager.refreshAll, 'function', 'collapsible manager should expose refresh helpers');
}

function main() {
  testHeavySettingsGroupsHaveStableIds();
  testCollapsibleManagerAddsAccessibleHeadersAndStableState();
  console.log('settings-collapsible-sections.test: all assertions passed');
}

try {
  main();
} catch (error) {
  console.error(error);
  process.exit(1);
}
