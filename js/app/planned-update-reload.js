export const PLANNED_UPDATE_RELOAD_KEY = 'aboardPlannedUpdateReload';

export const PLANNED_UPDATE_MODES = Object.freeze({
  IDLE: 'idle',
  IMMEDIATE: 'immediate'
});

const BUSY_ACTIVITY_KEYS = [
  'isDrawing',
  'isPinching',
  'isDraggingPanel',
  'isModalBusy',
  'isSelectionBusy',
  'isTextInputBusy',
  'isMediaTransformBusy',
  'isTeachingToolBusy'
];

export function normalizePlannedUpdateMode(value) {
  return value === PLANNED_UPDATE_MODES.IMMEDIATE
    ? PLANNED_UPDATE_MODES.IMMEDIATE
    : PLANNED_UPDATE_MODES.IDLE;
}

export function createPlannedUpdateIntent({
  mode,
  latestVersion = null,
  currentVersion = null,
  createdAt = Date.now(),
  reason = 'update'
} = {}) {
  return {
    reason: reason === 'update' ? 'update' : 'update',
    mode: normalizePlannedUpdateMode(mode),
    latestVersion: latestVersion || null,
    currentVersion: currentVersion || null,
    createdAt: Number.isFinite(createdAt) ? createdAt : Date.now()
  };
}

export function parsePlannedUpdateIntent(rawValue) {
  if (!rawValue) {
    return null;
  }

  try {
    const parsedValue = typeof rawValue === 'string'
      ? JSON.parse(rawValue)
      : rawValue;
    if (!parsedValue || parsedValue.reason !== 'update') {
      return null;
    }

    const mode = normalizePlannedUpdateMode(parsedValue.mode);
    if (mode !== parsedValue.mode) {
      return null;
    }

    return createPlannedUpdateIntent({
      ...parsedValue,
      mode
    });
  } catch {
    return null;
  }
}

export function shouldApplyIdleUpdate({
  now = Date.now(),
  idleMs = 15_000,
  activity = {}
} = {}) {
  if (!activity || BUSY_ACTIVITY_KEYS.some((key) => activity[key])) {
    return false;
  }

  const lastActivityAt = Number(activity.lastActivityAt || 0);
  return Number.isFinite(lastActivityAt) && (now - lastActivityAt) >= idleMs;
}
