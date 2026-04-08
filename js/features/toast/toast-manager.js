export class ToastManager {
  constructor(win = window, doc = document) {
    this.win = win;
    this.doc = doc;
    this.container = null;
    this.init();
  }

  init() {
    if (!this.doc.querySelector('.toast-container')) {
      this.container = this.doc.createElement('div');
      this.container.className = 'toast-container';
      this.doc.body.appendChild(this.container);
    } else {
      this.container = this.doc.querySelector('.toast-container');
    }
  }

  show(message, type = 'info', duration = 3000) {
    const toast = this.doc.createElement('div');
    toast.className = `toast ${type}`;

    let iconSvg = '';
    switch (type) {
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
    messageSpan.textContent = message;
    toast.appendChild(messageSpan);
    this.container.appendChild(toast);

    const scheduleFrame = this.win.requestAnimationFrame || requestAnimationFrame;
    scheduleFrame(() => {
      toast.classList.add('show');
    });

    const scheduleTimeout = this.win.setTimeout || setTimeout;
    scheduleTimeout(() => {
      toast.classList.remove('show');
      toast.addEventListener('transitionend', () => {
        if (toast.parentElement) {
          toast.remove();
        }
      });
    }, duration);
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
