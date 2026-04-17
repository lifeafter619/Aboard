/**
 * Browser Compatibility Checker
 */
class BrowserCheck {
    static getText(key, fallback) {
        const translated = window.i18n?.t?.(key);
        return translated && translated !== key ? translated : fallback;
    }

    static getFeatureLabel(feature) {
        if (feature?.key === 'canvas') {
            return this.getText('browserCheck.features.canvas', 'Canvas API');
        }

        if (feature?.key === 'es6') {
            return this.getText('browserCheck.features.es6', 'Modern JavaScript (ES6)');
        }

        return String(feature?.label || feature || '');
    }

    static hasModernJavaScriptSupport() {
        const requiredChecks = [
            typeof window.Promise === 'function',
            typeof window.Map === 'function',
            typeof window.Set === 'function',
            typeof window.WeakMap === 'function',
            typeof window.WeakSet === 'function',
            typeof window.Symbol === 'function',
            typeof window.Array?.from === 'function',
            typeof window.Object?.assign === 'function'
        ];

        return requiredChecks.every(Boolean);
    }

    static init() {
        const warnings = [];

        // Check for Canvas support
        if (!window.HTMLCanvasElement) {
            warnings.push({ key: 'canvas' });
        }

        // Avoid eval-based probing so CSP can stay strict and older browsers still get a warning.
        if (!this.hasModernJavaScriptSupport()) {
            warnings.push({ key: 'es6' });
        }

        if (warnings.length > 0) {
            this.showWarning(warnings);
        }
    }

    static showWarning(missingFeatures) {
        if (document.getElementById('browser-check-overlay')) {
            return;
        }

        const overlay = document.createElement('div');
        overlay.id = 'browser-check-overlay';
        overlay.setAttribute('role', 'dialog');
        overlay.setAttribute('aria-modal', 'true');
        overlay.setAttribute('aria-labelledby', 'browser-check-title');
        overlay.setAttribute('aria-describedby', 'browser-check-message browser-check-update');
        overlay.tabIndex = -1;
        overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.8);z-index:99999;display:flex;align-items:center;justify-content:center;padding:24px;box-sizing:border-box;color:white;text-align:center;font-family:sans-serif;';

        const panel = document.createElement('div');
        panel.style.cssText = 'background:#333;padding:20px;border-radius:10px;max-width:420px;width:min(100%,420px);color:white;box-sizing:border-box;';

        const title = document.createElement('h2');
        title.id = 'browser-check-title';
        title.style.cssText = 'margin:0 0 10px;color:#ff5555;';
        title.textContent = this.getText('browserCheck.title', 'Browser support issue');

        const message = document.createElement('p');
        message.id = 'browser-check-message';
        message.style.cssText = 'margin:0;';
        message.textContent = this.getText(
            'browserCheck.message',
            'Your browser is missing the following required features:'
        );

        const list = document.createElement('ul');
        list.style.cssText = 'text-align:left;margin:15px auto;display:inline-block;color:#ccc;padding-left:20px;';
        missingFeatures
            .map(feature => this.getFeatureLabel(feature))
            .filter(Boolean)
            .forEach((featureLabel) => {
                const item = document.createElement('li');
                item.textContent = featureLabel;
                list.appendChild(item);
            });

        const updateHint = document.createElement('p');
        updateHint.id = 'browser-check-update';
        updateHint.style.cssText = 'margin:0 0 20px;';
        updateHint.textContent = this.getText(
            'browserCheck.updateHint',
            'Please update to the latest version of Chrome, Edge, Firefox, or Safari for the best experience.'
        );

        const dismissButton = document.createElement('button');
        dismissButton.type = 'button';
        dismissButton.style.cssText = 'padding:10px 20px;cursor:pointer;background:#007AFF;border:none;border-radius:5px;color:white;font-weight:bold;';
        dismissButton.textContent = this.getText('browserCheck.continueAnyway', 'Continue anyway');

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
        document.body.appendChild(overlay);
        window.requestAnimationFrame?.(() => dismissButton.focus());
    }
}

window.BrowserCheck = BrowserCheck;
