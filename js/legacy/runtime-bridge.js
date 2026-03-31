function requireGlobal(win, name) {
  const value = win[name];
  if (!value) {
    throw new Error(`Missing required legacy global: ${name}`);
  }
  return value;
}

export function createLegacyRuntimeBridge(win = window) {
  return {
    window: win,
    get i18n() {
      return win.i18n || null;
    },
    get dialog() {
      return win.appDialog || null;
    },
    get pwaManager() {
      return win.pwaManager || null;
    },
    get drawingBoard() {
      return win.drawingBoard || null;
    },
    getDrawingBoardClass() {
      return requireGlobal(win, 'DrawingBoard');
    },
    setI18n(instance) {
      win.i18n = instance;
      return instance;
    },
    setPwaManager(instance) {
      win.pwaManager = instance;
      return instance;
    },
    setDrawingBoard(instance) {
      win.drawingBoard = instance;
      return instance;
    }
  };
}
