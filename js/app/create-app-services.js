import { resolveLegacyConstructor } from './resolve-legacy-constructor.js';

function createGlobalService(win, instanceName, classNames) {
  if (win[instanceName]) {
    return win[instanceName];
  }

  const resolvedClassNames = Array.isArray(classNames) ? classNames : [classNames];
  const ServiceCtor = resolvedClassNames
    .map(className => resolveLegacyConstructor(win, className))
    .find(candidate => typeof candidate === 'function');
  if (typeof ServiceCtor !== 'function') {
    return null;
  }

  const instance = new ServiceCtor();
  win[instanceName] = instance;
  return instance;
}

export async function createAppServices(win = window) {
  const i18n = createGlobalService(win, 'i18n', ['AboardI18n', 'I18n']);
  if (i18n?.init) {
    await i18n.init();
  }

  const pwaManager = createGlobalService(win, 'pwaManager', ['AboardPWAManager', 'PWAManager']);

  return {
    i18n,
    pwaManager
  };
}
