export class ToastManager {
  constructor(win = window, doc = document) {
    this.win = win;
    this.doc = doc;
    this.container = null;
    this.activeToasts = new Map();
    this.maxVisibleToasts = 4;
    this.exitDurationMs = 350;
    this.init();
  }

  init() {
    if (!this.doc.querySelector('.toast-container')) {
      this.container = this.doc.createElement('div');
      this.container.className = 'toast-container';
      this.container.setAttribute('aria-live', 'polite');
      this.container.setAttribute('aria-relevant', 'additions text');
      this.doc.body.appendChild(this.container);
    } else {
      this.container = this.doc.querySelector('.toast-container');
    }
  }

  getToastKey(message, type) {
    return `${type}::${message}`;
  }

  getScheduleFrame() {
    if (typeof this.win.requestAnimationFrame === 'function') {
      return this.win.requestAnimationFrame.bind(this.win);
    }
    return (callback) => this.getScheduleTimeout()(callback, 0);
  }

  getScheduleTimeout() {
    if (typeof this.win.setTimeout === 'function') {
      return this.win.setTimeout.bind(this.win);
    }
    return setTimeout;
  }

  getClearTimeout() {
    if (typeof this.win.clearTimeout === 'function') {
      return this.win.clearTimeout.bind(this.win);
    }
    return clearTimeout;
  }

  syncRepeatBadge(record) {
    if (!record?.repeatBadge) {
      return;
    }
    const visible = record.repeatCount > 1;
    record.repeatBadge.hidden = !visible;
    record.repeatBadge.textContent = visible ? String(record.repeatCount) : '';
  }

  clearToastTimers(record) {
    const clearTimeoutRef = this.getClearTimeout();
    if (record.dismissTimer != null) {
      clearTimeoutRef(record.dismissTimer);
      record.dismissTimer = null;
    }
    if (record.cleanupTimer != null) {
      clearTimeoutRef(record.cleanupTimer);
      record.cleanupTimer = null;
    }
    if (record.transitionHandler) {
      record.toast.removeEventListener('transitionend', record.transitionHandler);
      record.transitionHandler = null;
    }
  }

  removeToast(record) {
    if (!record) {
      return;
    }
    this.clearToastTimers(record);
    if (this.activeToasts.get(record.key) === record) {
      this.activeToasts.delete(record.key);
    }
    if (record.toast?.parentElement) {
      record.toast.remove();
    }
  }

  beginToastDismiss(record) {
    if (!record?.toast) {
      return;
    }
    record.toast.classList.remove('show');
    const finishDismiss = () => {
      this.removeToast(record);
    };
    record.transitionHandler = finishDismiss;
    record.toast.addEventListener('transitionend', finishDismiss, { once: true });
    record.cleanupTimer = this.getScheduleTimeout()(finishDismiss, this.exitDurationMs + 50);
  }

  scheduleToastDismiss(record, duration) {
    this.clearToastTimers(record);
    record.toast.classList.add('show');
    record.dismissTimer = this.getScheduleTimeout()(
      () => this.beginToastDismiss(record),
      duration
    );
  }

  trimToastStack() {
    if (!this.container) {
      return;
    }
    while (this.container.children.length >= this.maxVisibleToasts) {
      const oldestToast = this.container.children[0];
      const oldestRecord = Array.from(this.activeToasts.values()).find(
        (entry) => entry.toast === oldestToast
      );
      if (oldestRecord) {
        this.removeToast(oldestRecord);
      } else {
        oldestToast.remove();
      }
    }
  }

  show(message, type = 'info', duration = 3000) {
    const normalizedMessage = String(message ?? '');
    const normalizedType = String(type || 'info');
    const normalizedDuration = Number.isFinite(duration) && duration >= 0 ? duration : 3000;
    const toastKey = this.getToastKey(normalizedMessage, normalizedType);
    const existingRecord = this.activeToasts.get(toastKey);
    if (existingRecord?.toast?.parentElement) {
      existingRecord.repeatCount += 1;
      this.syncRepeatBadge(existingRecord);
      this.scheduleToastDismiss(existingRecord, normalizedDuration);
      return existingRecord.toast;
    }

    this.trimToastStack();

    const toast = this.doc.createElement('div');
    toast.className = `toast ${normalizedType}`;
    toast.setAttribute('role', normalizedType === 'error' ? 'alert' : 'status');
    toast.setAttribute('aria-live', normalizedType === 'error' ? 'assertive' : 'polite');
    toast.setAttribute('aria-atomic', 'true');

    let iconSvg = '';
    switch (normalizedType) {
      case 'success':
        iconSvg = `<svg class="toast-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 6L9 17l-5-5"/></svg>`;
        break;
      case 'error':
        iconSvg = `<svg class="toast-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>`;
        break;
      case 'warning':
        iconSvg = `<svg class="toast-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>`;
        break;
      default:
        iconSvg = `<svg class="toast-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>`;
        break;
    }

    toast.innerHTML = iconSvg;

    const messageSpan = this.doc.createElement('span');
    messageSpan.className = 'toast-message';
    messageSpan.textContent = normalizedMessage;
    toast.appendChild(messageSpan);

    const repeatBadge = this.doc.createElement('span');
    repeatBadge.className = 'toast-repeat-count';
    repeatBadge.hidden = true;
    repeatBadge.setAttribute('aria-hidden', 'true');
    toast.appendChild(repeatBadge);

    const record = {
      key: toastKey,
      toast,
      repeatBadge,
      repeatCount: 1,
      dismissTimer: null,
      cleanupTimer: null,
      transitionHandler: null
    };
    this.syncRepeatBadge(record);
    this.activeToasts.set(toastKey, record);
    this.container.appendChild(toast);

    this.getScheduleFrame()(() => {
      toast.classList.add('show');
    });

    this.scheduleToastDismiss(record, normalizedDuration);
    return toast;
  }
}

export function registerToastManagerGlobal(win = window, doc = document) {
  class BoundToastManager extends ToastManager {
    constructor(...args) {
      super(win, doc, ...args);
    }
  }

  win.ToastManager = BoundToastManager;
  if (!win.toastManager) {
    win.toastManager = new BoundToastManager();
  }
  return BoundToastManager;
}
