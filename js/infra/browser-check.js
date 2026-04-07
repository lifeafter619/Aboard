export class BrowserCheck {
  static getText(win, key, fallback) {
    const translated = win.i18n?.t?.(key);
    return translated && translated !== key ? translated : fallback;
  }

  static getFeatureLabel(feature, win) {
    if (feature?.key === 'canvas') {
      return this.getText(win, 'browserCheck.features.canvas', 'Canvas API');
    }

    if (feature?.key === 'es6') {
      return this.getText(win, 'browserCheck.features.es6', 'Modern JavaScript (ES6)');
    }

    return String(feature?.label || feature || '');
  }

  static init(win = window, doc = document) {
    const warnings = [];

    if (!win.HTMLCanvasElement) {
      warnings.push({ key: 'canvas' });
    }

    try {
      win.eval('class Test {}');
      win.eval('const test = () => {}');
    } catch (error) {
      warnings.push({ key: 'es6' });
    }

    if (warnings.length > 0) {
      this.showWarning(warnings, win, doc);
    }
  }

  static showWarning(missingFeatures, win = window, doc = document) {
    if (doc.getElementById('browser-check-overlay')) {
      return;
    }

    const overlay = doc.createElement('div');
    overlay.id = 'browser-check-overlay';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.setAttribute('aria-labelledby', 'browser-check-title');
    overlay.setAttribute('aria-describedby', 'browser-check-message browser-check-update');
    overlay.tabIndex = -1;
    overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.8);z-index:99999;display:flex;align-items:center;justify-content:center;padding:24px;box-sizing:border-box;color:white;text-align:center;font-family:sans-serif;';

    const panel = doc.createElement('div');
    panel.style.cssText = 'background:#333;padding:20px;border-radius:10px;max-width:420px;width:min(100%,420px);color:white;box-sizing:border-box;';

    const title = doc.createElement('h2');
    title.id = 'browser-check-title';
    title.style.cssText = 'margin:0 0 10px;color:#ff5555;';
    title.textContent = this.getText(win, 'browserCheck.title', 'Browser support issue');

    const message = doc.createElement('p');
    message.id = 'browser-check-message';
    message.style.cssText = 'margin:0;';
    message.textContent = this.getText(
      win,
      'browserCheck.message',
      'Your browser is missing the following required features:'
    );

    const list = doc.createElement('ul');
    list.style.cssText = 'text-align:left;margin:15px auto;display:inline-block;color:#ccc;padding-left:20px;';
    missingFeatures
      .map(feature => this.getFeatureLabel(feature, win))
      .filter(Boolean)
      .forEach((featureLabel) => {
        const item = doc.createElement('li');
        item.textContent = featureLabel;
        list.appendChild(item);
      });

    const updateHint = doc.createElement('p');
    updateHint.id = 'browser-check-update';
    updateHint.style.cssText = 'margin:0 0 20px;';
    updateHint.textContent = this.getText(
      win,
      'browserCheck.updateHint',
      'Please update to the latest version of Chrome, Edge, Firefox, or Safari for the best experience.'
    );

    const dismissButton = doc.createElement('button');
    dismissButton.type = 'button';
    dismissButton.dataset.browserCheckDismiss = 'true';
    dismissButton.style.cssText = 'padding:10px 20px;cursor:pointer;background:#007AFF;border:none;border-radius:5px;color:white;font-weight:bold;';
    dismissButton.textContent = this.getText(win, 'browserCheck.continueAnyway', 'Continue anyway');

    const close = () => {
      overlay.remove();
    };

    dismissButton.addEventListener('click', close);
    overlay.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        close();
      }
    });

    panel.appendChild(title);
    panel.appendChild(message);
    panel.appendChild(list);
    panel.appendChild(updateHint);
    panel.appendChild(dismissButton);
    overlay.appendChild(panel);
    doc.body.appendChild(overlay);
    win.requestAnimationFrame?.(() => {
      dismissButton.focus();
    });
  }
}
