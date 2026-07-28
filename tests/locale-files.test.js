const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const localesDir = path.join(__dirname, '..', 'js', 'locales');

function loadLocaleFile(fileName) {
  const source = fs.readFileSync(path.join(localesDir, fileName), 'utf8');
  const context = {
    window: {},
    console
  };

  vm.createContext(context);
  new vm.Script(source, { filename: fileName }).runInContext(context);

  return context.window.translations;
}

function loadLocaleOverrides() {
  const source = fs.readFileSync(path.join(localesDir, 'overrides.js'), 'utf8');
  const context = { window: {}, console };
  vm.createContext(context);
  new vm.Script(source, { filename: 'overrides.js' }).runInContext(context);
  return context.window.locale_translation_overrides || {};
}

function deepMerge(target, source) {
  for (const [key, value] of Object.entries(source || {})) {
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      target[key] = deepMerge(
        target[key] && typeof target[key] === 'object' ? target[key] : {},
        value
      );
    } else {
      target[key] = value;
    }
  }
  return target;
}

function loadEffectiveLocale(fileName, overrides) {
  const localeId = fileName.replace(/\.js$/, '');
  return deepMerge(loadLocaleFile(fileName), overrides[localeId]);
}

function testLocaleFilesAreValidScripts() {
  const localeFiles = fs
    .readdirSync(localesDir)
    .filter((fileName) => fileName.endsWith('.js') && fileName !== 'overrides.js');

  assert.ok(localeFiles.length > 0, 'expected at least one locale file');

  for (const fileName of localeFiles) {
    const translations = loadLocaleFile(fileName);

    assert.equal(typeof translations, 'object', `${fileName} should define translations`);
    assert.equal(
      typeof translations.common?.keepCentered,
      'string',
      `${fileName} should define common.keepCentered`
    );
    assert.equal(
      typeof translations.gestures?.pinchZoom,
      'string',
      `${fileName} should define gestures.pinchZoom`
    );
  }
}

function flattenKeys(obj, prefix = '') {
  const keys = [];
  for (const [key, value] of Object.entries(obj)) {
    if (value && typeof value === 'object') {
      keys.push(...flattenKeys(value, `${prefix}${key}.`));
    } else {
      keys.push(`${prefix}${key}`);
    }
  }
  return keys;
}

function flattenValues(obj, prefix = '', values = new Map()) {
  for (const [key, value] of Object.entries(obj || {})) {
    const pathKey = `${prefix}${key}`;
    if (value && typeof value === 'object') {
      flattenValues(value, `${pathKey}.`, values);
    } else {
      values.set(pathKey, value);
    }
  }
  return values;
}

function extractPlaceholders(value) {
  return [...String(value || '').matchAll(/\{([A-Za-z][A-Za-z0-9_]*)\}/g)]
    .map((match) => match[1])
    .sort();
}

// Duplicate keys inside the same object literal silently shadow the earlier
// value (later keys win), so any duplicate is a latent translation loss. Parse
// the real AST so nested duplicates are caught at any depth — the previous
// regex only saw top-level 4-space-indented sections and missed cases like
// timer.seconds being defined twice (audit-2026-07-26 M3).
function collectDuplicateObjectKeys(source, fileName) {
  const acorn = require('acorn');
  const ast = acorn.parse(source, { ecmaVersion: 'latest' });
  const duplicates = [];

  const propertyKeyName = (property) => {
    if (property.computed) return null;
    if (property.key.type === 'Identifier') return property.key.name;
    if (property.key.type === 'Literal') return String(property.key.value);
    return null;
  };

  const walk = (node, objectPath) => {
    if (!node || typeof node.type !== 'string') return;
    if (node.type === 'ObjectExpression') {
      const seen = new Map();
      for (const property of node.properties) {
        if (property.type !== 'Property') continue;
        const name = propertyKeyName(property);
        if (name !== null) {
          if (seen.has(name)) {
            duplicates.push(`${fileName}: "${objectPath}${name}" (lines ${seen.get(name)} and ${sourceLine(source, property.start)})`);
          } else {
            seen.set(name, sourceLine(source, property.start));
          }
        }
        walk(property.value, name !== null ? `${objectPath}${name}.` : objectPath);
      }
      return;
    }
    for (const key of Object.keys(node)) {
      const child = node[key];
      if (Array.isArray(child)) {
        child.forEach((item) => {
          if (item && typeof item.type === 'string') walk(item, objectPath);
        });
      } else if (child && typeof child.type === 'string') {
        walk(child, objectPath);
      }
    }
  };

  walk(ast, '');
  return duplicates;
}

function sourceLine(source, offset) {
  let line = 1;
  for (let i = 0; i < offset; i++) {
    if (source.charCodeAt(i) === 10) line += 1;
  }
  return line;
}

function testNoDuplicateKeysAtAnyDepth() {
  const localeFiles = fs
    .readdirSync(localesDir)
    .filter((fileName) => fileName.endsWith('.js'));

  const duplicates = [];
  for (const fileName of localeFiles) {
    const source = fs.readFileSync(path.join(localesDir, fileName), 'utf8');
    duplicates.push(...collectDuplicateObjectKeys(source, fileName));
  }

  assert.deepEqual(
    duplicates,
    [],
    `duplicate keys inside one object literal shadow the earlier value:\n${duplicates.join('\n')}`
  );
}

// Effective dictionaries include the locale-specific override layer used by
// the browser runtime. Every supported locale must match the baseline exactly.
const MISSING_KEY_ALLOWANCE = {
  'de-DE.js': 0,
  'es-ES.js': 0,
  'fr-FR.js': 0,
  'ja-JP.js': 0,
  'ko-KR.js': 0
};

function testKeyParityAgainstBaseline() {
  const overrides = loadLocaleOverrides();
  const baseline = new Set(flattenKeys(loadEffectiveLocale('zh-CN.js', overrides)));
  const localeFiles = fs
    .readdirSync(localesDir)
    .filter(
      (fileName) => fileName.endsWith('.js') && fileName !== 'overrides.js' && fileName !== 'zh-CN.js'
    );

  for (const fileName of localeFiles) {
    const keys = new Set(flattenKeys(loadEffectiveLocale(fileName, overrides)));
    const missing = [...baseline].filter((key) => !keys.has(key));
    const allowance = MISSING_KEY_ALLOWANCE[fileName] ?? 0;
    assert.ok(
      missing.length <= allowance,
      `${fileName} is missing ${missing.length} keys vs zh-CN (allowed ${allowance}). ` +
        `New/regressed keys: ${missing.slice(0, 10).join(', ')}${missing.length > 10 ? ', …' : ''}`
    );
  }
}

function testPlaceholderParityAgainstBaseline() {
  const overrides = loadLocaleOverrides();
  const baseline = flattenValues(loadEffectiveLocale('zh-CN.js', overrides));
  const localeFiles = fs
    .readdirSync(localesDir)
    .filter(
      (fileName) => fileName.endsWith('.js') && fileName !== 'overrides.js' && fileName !== 'zh-CN.js'
    );

  for (const fileName of localeFiles) {
    const values = flattenValues(loadEffectiveLocale(fileName, overrides));
    for (const [key, baselineValue] of baseline) {
      assert.deepEqual(
        extractPlaceholders(values.get(key)),
        extractPlaceholders(baselineValue),
        `${fileName} should preserve interpolation placeholders for ${key}`
      );
    }
  }
}

function run() {
  testLocaleFilesAreValidScripts();
  testNoDuplicateKeysAtAnyDepth();
  testKeyParityAgainstBaseline();
  testPlaceholderParityAgainstBaseline();
  console.log('locale-files.test: all assertions passed');
}

run();
