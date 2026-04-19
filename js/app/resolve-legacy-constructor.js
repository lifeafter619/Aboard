export function resolveLegacyConstructor(win = window, name) {
  if (typeof win[name] === 'function') {
    return win[name];
  }

  return undefined;
}
