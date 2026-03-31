export function resolveLegacyConstructor(win = window, name) {
  try {
    const resolvedFromEval = win.eval?.(name);
    if (typeof resolvedFromEval === 'function') {
      return resolvedFromEval;
    }
  } catch (error) {
    // Ignore lookup failures and fall back to window properties.
  }

  if (typeof win[name] === 'function') {
    return win[name];
  }

  return undefined;
}
