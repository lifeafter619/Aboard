// Deep clone helper used across the app.
// Prefers the native `structuredClone`, which preserves Date, Map, Set, ArrayBuffer,
// typed arrays, etc., and falls back to a JSON-based clone for legacy runtimes.
// The fallback is loss-prone (drops `undefined`, functions, Date → string, Map/Set → {},
// NaN/Infinity → null), so callers holding such values should migrate to structuredClone.

const hasStructuredClone = typeof globalThis !== 'undefined'
  && typeof globalThis.structuredClone === 'function';

export function safeDeepClone(value) {
  if (value === null || typeof value !== 'object') {
    return value;
  }
  if (hasStructuredClone) {
    try {
      return globalThis.structuredClone(value);
    } catch (error) {
      // structuredClone refuses functions, DOM nodes, etc. Fall through to JSON clone
      // and then — finally — to returning the original reference.
    }
  }
  try {
    return JSON.parse(JSON.stringify(value));
  } catch (error) {
    return value;
  }
}

export function registerDeepCloneGlobal(win = window) {
  win.safeDeepClone = safeDeepClone;
  return safeDeepClone;
}
