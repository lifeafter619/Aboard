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
    ? new TimeDisplayManager(settingsManager)
    : undefined;

  return {
    settingsManager,
    storageManager: typeof StorageManager === 'function' ? new StorageManager() : undefined,
    collapsibleManager: typeof CollapsibleManager === 'function' ? new CollapsibleManager() : undefined,
    announcementManager: typeof AnnouncementManager === 'function' ? new AnnouncementManager() : undefined,
    helpSystem: typeof HelpSystem === 'function' ? new HelpSystem() : undefined,
    timeDisplayManager,
    timeDisplayControls: typeof TimeDisplayControls === 'function' && timeDisplayManager
      ? new TimeDisplayControls(timeDisplayManager)
      : undefined,
    timeDisplaySettingsModal: typeof TimeDisplaySettingsModal === 'function' && timeDisplayManager
      ? new TimeDisplaySettingsModal(timeDisplayManager)
      : undefined
  };
}
