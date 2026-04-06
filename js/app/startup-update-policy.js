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

const SEMVER_PATTERN = /^\d+\.\d+\.\d+(?:-[0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*)?(?:\+[0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*)?$/;

function splitVersionParts(version) {
  const normalized = String(version || '').trim();
  if (!SEMVER_PATTERN.test(normalized)) {
    return null;
  }

  const [withoutBuildMetadata] = normalized.split('+', 1);
  const separatorIndex = withoutBuildMetadata.indexOf('-');
  const base = separatorIndex === -1
    ? withoutBuildMetadata
    : withoutBuildMetadata.slice(0, separatorIndex);
  const preRelease = separatorIndex === -1
    ? ''
    : withoutBuildMetadata.slice(separatorIndex + 1);

  return {
    numbers: base.split('.').slice(0, 3).map((segment) => parseInt(segment, 10) || 0),
    preReleaseSegments: preRelease ? preRelease.split('.') : []
  };
}

function comparePreReleaseSegments(segmentsA = [], segmentsB = []) {
  if (segmentsA.length === 0 && segmentsB.length === 0) return 0;
  if (segmentsA.length === 0) return 1;
  if (segmentsB.length === 0) return -1;

  const numericPattern = /^\d+$/;
  const maxLength = Math.max(segmentsA.length, segmentsB.length);
  for (let index = 0; index < maxLength; index += 1) {
    const segmentA = segmentsA[index];
    const segmentB = segmentsB[index];
    if (segmentA == null) return -1;
    if (segmentB == null) return 1;

    const isNumericA = numericPattern.test(segmentA);
    const isNumericB = numericPattern.test(segmentB);
    if (isNumericA && isNumericB) {
      const numberA = Number(segmentA);
      const numberB = Number(segmentB);
      if (numberA > numberB) return 1;
      if (numberA < numberB) return -1;
      continue;
    }

    if (isNumericA !== isNumericB) {
      return isNumericA ? -1 : 1;
    }

    if (segmentA > segmentB) return 1;
    if (segmentA < segmentB) return -1;
  }

  return 0;
}

export function normalizeUpdatePreference(value) {
  return value === UPDATE_PREFERENCES.AUTO
    ? UPDATE_PREFERENCES.AUTO
    : UPDATE_PREFERENCES.PROMPT;
}

function parseVersion(version) {
  return splitVersionParts(version);
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

  return comparePreReleaseSegments(a.preReleaseSegments, b.preReleaseSegments);
}

export function resolveStartupUpdateAction({
  currentVersion,
  latestVersion,
  updatePreference,
  hasWaitingWorker = false
} = {}) {
  const normalizedPreference = normalizeUpdatePreference(updatePreference);

  if (hasWaitingWorker) {
    return normalizedPreference === UPDATE_PREFERENCES.AUTO
      ? STARTUP_UPDATE_ACTIONS.APPLY_PREFERENCE
      : STARTUP_UPDATE_ACTIONS.PROMPT;
  }

  if (!currentVersion || !latestVersion) {
    return STARTUP_UPDATE_ACTIONS.CONTINUE;
  }

  if (compareSemanticVersions(latestVersion, currentVersion) <= 0) {
    return STARTUP_UPDATE_ACTIONS.CONTINUE;
  }

  return normalizedPreference === UPDATE_PREFERENCES.AUTO
    ? STARTUP_UPDATE_ACTIONS.APPLY_PREFERENCE
    : STARTUP_UPDATE_ACTIONS.PROMPT;
}

export function shouldContinuePostVisibleStartup({ action, userChoice } = {}) {
  if (action === STARTUP_UPDATE_ACTIONS.CONTINUE) {
    return true;
  }

  return userChoice === STARTUP_UPDATE_USER_CHOICES.IDLE;
}
