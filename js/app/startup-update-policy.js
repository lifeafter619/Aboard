export const UPDATE_PREFERENCES = Object.freeze({
  PROMPT: 'prompt',
  AUTO: 'auto'
});

export const STARTUP_UPDATE_ACTIONS = Object.freeze({
  CONTINUE: 'continue',
  APPLY_PREFERENCE: 'apply-preference',
  PROMPT: 'prompt'
});

export const STARTUP_UPDATE_USER_CHOICES = Object.freeze({
  IDLE: 'idle',
  IMMEDIATE: 'immediate'
});

const SEMVER_PATTERN = /^\d+\.\d+\.\d+(?:[-+][0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*)?$/;

export function normalizeUpdatePreference(value) {
  return value === UPDATE_PREFERENCES.AUTO
    ? UPDATE_PREFERENCES.AUTO
    : UPDATE_PREFERENCES.PROMPT;
}

function parseVersion(version) {
  const normalized = String(version || '').trim();
  if (!SEMVER_PATTERN.test(normalized)) {
    return null;
  }

  const [base, preRelease = ''] = normalized.split('-', 2);
  return {
    numbers: base.split('.').slice(0, 3).map((segment) => parseInt(segment, 10) || 0),
    preRelease
  };
}

export function compareSemanticVersions(versionA, versionB) {
  const a = parseVersion(versionA);
  const b = parseVersion(versionB);

  if (!a && !b) return 0;
  if (!a) return -1;
  if (!b) return 1;

  for (let index = 0; index < 3; index += 1) {
    if (a.numbers[index] > b.numbers[index]) return 1;
    if (a.numbers[index] < b.numbers[index]) return -1;
  }

  if (!a.preRelease && b.preRelease) return 1;
  if (a.preRelease && !b.preRelease) return -1;
  if (a.preRelease && b.preRelease) {
    return a.preRelease.localeCompare(b.preRelease);
  }

  return 0;
}

export function resolveStartupUpdateAction({
  currentVersion,
  latestVersion,
  updatePreference,
  hasWaitingWorker = false
} = {}) {
  if (hasWaitingWorker) {
    return STARTUP_UPDATE_ACTIONS.APPLY_PREFERENCE;
  }

  if (!currentVersion || !latestVersion) {
    return STARTUP_UPDATE_ACTIONS.CONTINUE;
  }

  if (compareSemanticVersions(latestVersion, currentVersion) <= 0) {
    return STARTUP_UPDATE_ACTIONS.CONTINUE;
  }

  return STARTUP_UPDATE_ACTIONS.APPLY_PREFERENCE;
}

export function shouldContinuePostVisibleStartup({ action, userChoice } = {}) {
  if (action === STARTUP_UPDATE_ACTIONS.CONTINUE) {
    return true;
  }

  return userChoice === STARTUP_UPDATE_USER_CHOICES.IDLE;
}
