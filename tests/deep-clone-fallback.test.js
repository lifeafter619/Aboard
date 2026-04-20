const assert = require('node:assert/strict');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

async function loadSafeDeepClone() {
  const moduleUrl = pathToFileURL(path.join(__dirname, '..', 'js', 'infra', 'deep-clone.js')).href;
  const mod = await import(moduleUrl);
  return mod.safeDeepClone;
}

async function testFallbackPreservesRichStateWithoutStructuredClone() {
  const safeDeepClone = await loadSafeDeepClone();
  const originalStructuredClone = globalThis.structuredClone;

  try {
    globalThis.structuredClone = undefined;

    const shared = { label: 'shared' };
    const original = {
      createdAt: new Date('2026-01-02T03:04:05.000Z'),
      missing: undefined,
      score: NaN,
      infinity: Infinity,
      nested: { shared },
      list: [1, undefined, shared],
      map: new Map([['key', shared]]),
      set: new Set([shared]),
      regex: /aboard/gi
    };
    original.self = original;

    const clone = safeDeepClone(original);

    assert.notEqual(clone, original, 'fallback clone should never alias the original object');
    assert.notEqual(clone.nested, original.nested, 'nested objects should be cloned');
    assert.ok(clone.createdAt instanceof Date, 'Date values should survive fallback cloning');
    assert.equal(clone.createdAt.toISOString(), original.createdAt.toISOString());
    assert.ok(Object.prototype.hasOwnProperty.call(clone, 'missing'), 'undefined properties should be preserved');
    assert.equal(clone.missing, undefined);
    assert.ok(Number.isNaN(clone.score), 'NaN should survive fallback cloning');
    assert.equal(clone.infinity, Infinity, 'Infinity should survive fallback cloning');
    assert.notEqual(clone.list, original.list, 'arrays should be cloned');
    assert.equal(clone.list[1], undefined);
    assert.notEqual(clone.map, original.map, 'Map instances should be cloned');
    assert.notEqual(clone.set, original.set, 'Set instances should be cloned');
    assert.notEqual(clone.map.get('key'), shared, 'Map entry payloads should be cloned');
    assert.notEqual([...clone.set][0], shared, 'Set entry payloads should be cloned');
    assert.equal(clone.regex.source, original.regex.source);
    assert.equal(clone.regex.flags, original.regex.flags);
    assert.equal(clone.self, clone, 'circular references should point to the cloned graph');
  } finally {
    globalThis.structuredClone = originalStructuredClone;
  }
}

(async function main() {
  await testFallbackPreservesRichStateWithoutStructuredClone();
  console.log('deep-clone-fallback.test: all assertions passed');
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
