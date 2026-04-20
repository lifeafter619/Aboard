import { resolveLegacyConstructor } from './resolve-legacy-constructor.js';

function createGlobalService(win, instanceName, classNames, options = {}) {
  const { required = false } = options;
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

  try {
    const instance = new ServiceCtor();
    win[instanceName] = instance;
    return instance;
  } catch (error) {
    console.warn(`Aboard optional service "${instanceName}" failed to initialize:`, error);
    if (required) {
      throw error;
    }
    return null;
  }
}

export async function createAppServices(win = window) {
  const hadI18nInstance = Boolean(win.i18n);
  const i18n = createGlobalService(win, 'i18n', ['AboardI18n', 'I18n'], { required: true });
  if (i18n?.init && !hadI18nInstance) {
    await i18n.init();
  }

  const pwaManager = createGlobalService(win, 'pwaManager', ['AboardPWAManager', 'PWAManager']);

  return {
    i18n,
    pwaManager
  };
}
