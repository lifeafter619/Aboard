export function createAppContext(bridge, services = {}) {
  return {
    bridge,
    services,
    get i18n() {
      return services.i18n || bridge.i18n;
    },
    get dialog() {
      return bridge.dialog;
    },
    get pwaManager() {
      return services.pwaManager || bridge.pwaManager;
    },
    get drawingBoard() {
      return bridge.drawingBoard;
    }
  };
}
