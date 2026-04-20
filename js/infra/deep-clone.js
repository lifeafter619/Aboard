// Deep clone helper used across the app.
// Prefers the native `structuredClone`, which preserves Date, Map, Set, ArrayBuffer,
// typed arrays, etc. For legacy runtimes we use a cycle-aware structural clone instead
// of JSON serialization, because JSON drops `undefined`, Date, Map/Set, NaN/Infinity
// and returns the original reference when circular state is encountered.

function getNativeStructuredClone() {
  return typeof globalThis !== 'undefined'
    && typeof globalThis.structuredClone === 'function'
    ? globalThis.structuredClone.bind(globalThis)
    : null;
}

function cloneArrayBuffer(buffer) {
  return buffer.slice(0);
}

function cloneRegExp(pattern) {
  const clone = new RegExp(pattern.source, pattern.flags);
  clone.lastIndex = pattern.lastIndex;
  return clone;
}

function cloneObjectProperties(source, target, seen) {
  Reflect.ownKeys(source).forEach((key) => {
    const descriptor = Object.getOwnPropertyDescriptor(source, key);
    if (!descriptor) {
      return;
    }

    if ('value' in descriptor) {
      descriptor.value = cloneLegacyValue(descriptor.value, seen);
    }

    Object.defineProperty(target, key, descriptor);
  });

  return target;
}

function cloneLegacyValue(value, seen = new WeakMap()) {
  if (value === null || typeof value !== 'object') {
    return value;
  }

  if (seen.has(value)) {
    return seen.get(value);
  }

  if (value instanceof Date) {
    return new Date(value.getTime());
  }

  if (value instanceof RegExp) {
    return cloneRegExp(value);
  }

  if (typeof Buffer !== 'undefined' && Buffer.isBuffer(value)) {
    return Buffer.from(value);
  }

  if (typeof File !== 'undefined' && value instanceof File) {
    return new File([value], value.name, {
      type: value.type,
      lastModified: value.lastModified
    });
  }

  if (typeof Blob !== 'undefined' && value instanceof Blob) {
    return value.slice(0, value.size, value.type);
  }

  if (typeof Node !== 'undefined' && value instanceof Node) {
    return value.cloneNode(true);
  }

  if (typeof ArrayBuffer !== 'undefined' && value instanceof ArrayBuffer) {
    return cloneArrayBuffer(value);
  }

  if (typeof ArrayBuffer !== 'undefined' && ArrayBuffer.isView?.(value)) {
    const clonedBuffer = cloneLegacyValue(value.buffer, seen);
    if (value instanceof DataView) {
      const clone = new DataView(clonedBuffer, value.byteOffset, value.byteLength);
      seen.set(value, clone);
      return clone;
    }
    const clone = new value.constructor(clonedBuffer, value.byteOffset, value.length);
    seen.set(value, clone);
    return clone;
  }

  if (value instanceof Map) {
    const clone = new Map();
    seen.set(value, clone);
    value.forEach((entryValue, entryKey) => {
      clone.set(
        cloneLegacyValue(entryKey, seen),
        cloneLegacyValue(entryValue, seen)
      );
    });
    return clone;
  }

  if (value instanceof Set) {
    const clone = new Set();
    seen.set(value, clone);
    value.forEach((entryValue) => {
      clone.add(cloneLegacyValue(entryValue, seen));
    });
    return clone;
  }

  if (Array.isArray(value)) {
    const clone = new Array(value.length);
    seen.set(value, clone);
    value.forEach((entryValue, index) => {
      clone[index] = cloneLegacyValue(entryValue, seen);
    });
    return clone;
  }

  const clone = Object.create(Object.getPrototypeOf(value));
  seen.set(value, clone);
  return cloneObjectProperties(value, clone, seen);
}

export function safeDeepClone(value) {
  if (value === null || typeof value !== 'object') {
    return value;
  }

  const nativeStructuredClone = getNativeStructuredClone();
  if (nativeStructuredClone) {
    try {
      return nativeStructuredClone(value);
    } catch (error) {
      // structuredClone refuses functions, some DOM state, etc. Fall through to the
      // legacy structural clone instead of returning lossy JSON or the same reference.
    }
  }

  try {
    return cloneLegacyValue(value);
  } catch (error) {
    return value;
  }
}

export function registerDeepCloneGlobal(win = window) {
  win.safeDeepClone = safeDeepClone;
  return safeDeepClone;
}
