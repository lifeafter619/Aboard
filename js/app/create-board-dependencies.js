import { resolveLegacyConstructor } from './resolve-legacy-constructor.js';

function resolvePreferredConstructor(win, preferredNames) {
  for (const name of preferredNames) {
    const ctor = resolveLegacyConstructor(win, name);
    if (typeof ctor === 'function') {
      return ctor;
    }
  }

  return undefined;
}

function createNoopStorageManager() {
  return {
    initPromise: Promise.resolve(null),
    async saveSession() {
      return false;
    },
    async loadSession() {
      return null;
    },
    async hasSession() {
      return false;
    },
    async clearSession() {},
    closeDB() {},
    getSessionSizeEstimate() {
      return 0;
    },
    setSessionSizeEstimate() {},
    clearSessionSizeEstimate() {}
  };
}

function createNoopCollapsibleManager() {
  return {
    collapsedState: { default: true },
    loadCollapsedState() {
      return { default: true };
    },
    saveCollapsedState() {},
    initializeCollapsibles() {},
    setup() {},
    makeCollapsible() {}
  };
}

function createNoopAnnouncementManager() {
  return {
    setupEventListeners() {},
    checkAndShowAnnouncement() {},
    showModal() {},
    closeModal() {},
    updateSettingsContent() {},
    showFromSettings() {}
  };
}

function createNoopHelpSystem() {
  return {
    init() {},
    bindDataHelpButtons() {},
    refreshHelpButtonLabels() {},
    showHelp() {}
  };
}

function instantiateWithFallback(label, ctor, args = [], fallbackFactory) {
  if (typeof ctor !== 'function') {
    return typeof fallbackFactory === 'function' ? fallbackFactory() : undefined;
  }

  try {
    return Reflect.construct(ctor, args);
  } catch (error) {
    console.warn(`Aboard ${label} failed to initialize, continuing with degraded behavior:`, error);
    return typeof fallbackFactory === 'function' ? fallbackFactory() : undefined;
  }
}

export function createBoardDependencies(win = window) {
  const SettingsManager = resolvePreferredConstructor(win, ['AboardSettingsManager', 'SettingsManager']);
  const StorageManager = resolvePreferredConstructor(win, ['AboardStorageManager', 'StorageManager']);
  const CollapsibleManager = resolvePreferredConstructor(win, ['AboardCollapsibleManager', 'CollapsibleManager']);
  const AnnouncementManager = resolvePreferredConstructor(win, ['AnnouncementManager']);
  const HelpSystem = resolvePreferredConstructor(win, ['AboardHelpSystem', 'HelpSystem']);
  const TimeDisplayManager = resolvePreferredConstructor(win, ['AboardTimeDisplayManager', 'TimeDisplayManager']);
  const TimeDisplayControls = resolvePreferredConstructor(win, ['AboardTimeDisplayControls', 'TimeDisplayControls']);
  const TimeDisplaySettingsModal = resolvePreferredConstructor(win, ['AboardTimeDisplaySettingsModal', 'TimeDisplaySettingsModal']);

  const settingsManager = typeof SettingsManager === 'function' ? new SettingsManager() : undefined;
  const timeDisplayManager = typeof TimeDisplayManager === 'function' && settingsManager
    ? instantiateWithFallback('TimeDisplayManager', TimeDisplayManager, [settingsManager], () => null)
    : undefined;

  return {
    settingsManager,
    storageManager: instantiateWithFallback('StorageManager', StorageManager, [], createNoopStorageManager),
    collapsibleManager: instantiateWithFallback('CollapsibleManager', CollapsibleManager, [], createNoopCollapsibleManager),
    announcementManager: instantiateWithFallback('AnnouncementManager', AnnouncementManager, [], createNoopAnnouncementManager),
    helpSystem: instantiateWithFallback('HelpSystem', HelpSystem, [], createNoopHelpSystem),
    timeDisplayManager,
    timeDisplayControls: typeof TimeDisplayControls === 'function' && timeDisplayManager
      ? instantiateWithFallback('TimeDisplayControls', TimeDisplayControls, [timeDisplayManager])
      : undefined,
    timeDisplaySettingsModal: typeof TimeDisplaySettingsModal === 'function' && timeDisplayManager
      ? instantiateWithFallback('TimeDisplaySettingsModal', TimeDisplaySettingsModal, [timeDisplayManager])
      : undefined
  };
}
