/**
 * Browser Compatibility Checker
 */
(function () {
    function getDefaultWindow() {
        return typeof window !== 'undefined' ? window : null;
    }

    function getDefaultDocument() {
        return typeof document !== 'undefined' ? document : null;
    }

    function getText(key, fallback, win) {
        var targetWindow = win || getDefaultWindow();
        var i18n = targetWindow && targetWindow.i18n;
        var translated = i18n && typeof i18n.t === 'function' ? i18n.t(key) : null;
        return translated && translated !== key ? translated : fallback;
    }

    function getFeatureLabel(feature, win) {
        var key = feature && feature.key;
        if (key === 'canvas') {
            return getText('browserCheck.features.canvas', 'Canvas API', win);
        }

        if (key === 'es6') {
            return getText('browserCheck.features.es6', 'Modern JavaScript (ES6)', win);
        }

        if (key === 'modernSyntax') {
            return getText('browserCheck.features.modernSyntax', 'Modern JavaScript syntax', win);
        }

        return String((feature && feature.label) || feature || '');
    }

    function getMajorVersion(userAgent, pattern) {
        var match = pattern.exec(userAgent || '');
        return match ? parseInt(match[1], 10) : null;
    }

    function getSafariVersion(userAgent) {
        var match = /Version\/(\d+)(?:\.(\d+))?/.exec(userAgent || '');
        if (!match || !/Safari\//.test(userAgent || '') || /Chrome\/|Chromium\/|Edg\//.test(userAgent || '')) {
            return null;
        }

        return {
            major: parseInt(match[1], 10),
            minor: match[2] ? parseInt(match[2], 10) : 0
        };
    }

    function hasRequiredModuleSyntaxSupport(win) {
        var navigatorRef = win && win.navigator;
        var userAgent = navigatorRef && navigatorRef.userAgent ? String(navigatorRef.userAgent) : '';
        var edge = getMajorVersion(userAgent, /Edg\/(\d+)/);
        var chrome = getMajorVersion(userAgent, /(?:Chrome|Chromium)\/(\d+)/);
        var firefox = getMajorVersion(userAgent, /Firefox\/(\d+)/);
        var safari = getSafariVersion(userAgent);

        if (edge !== null) {
            return edge >= 80;
        }

        if (chrome !== null) {
            return chrome >= 80;
        }

        if (firefox !== null) {
            return firefox >= 74;
        }

        if (safari !== null) {
            return safari.major > 13 || (safari.major === 13 && safari.minor >= 1);
        }

        return true;
    }

    function hasModernJavaScriptSupport(win) {
        var targetWindow = win || getDefaultWindow();
        var arrayRef = targetWindow && targetWindow.Array;
        var objectRef = targetWindow && targetWindow.Object;
        var requiredChecks = [
            targetWindow && typeof targetWindow.Promise === 'function',
            targetWindow && typeof targetWindow.Map === 'function',
            targetWindow && typeof targetWindow.Set === 'function',
            targetWindow && typeof targetWindow.WeakMap === 'function',
            targetWindow && typeof targetWindow.WeakSet === 'function',
            targetWindow && typeof targetWindow.Symbol === 'function',
            arrayRef && typeof arrayRef.from === 'function',
            objectRef && typeof objectRef.assign === 'function'
        ];
        var index;

        for (index = 0; index < requiredChecks.length; index += 1) {
            if (!requiredChecks[index]) {
                return false;
            }
        }

        return true;
    }

    function addEvent(element, type, handler) {
        if (!element) {
            return;
        }

        if (typeof element.addEventListener === 'function') {
            element.addEventListener(type, handler, false);
            return;
        }

        if (typeof element.attachEvent === 'function') {
            element.attachEvent('on' + type, handler);
        }
    }

    function removeElement(element) {
        if (element && element.parentNode) {
            element.parentNode.removeChild(element);
        }
    }

    function setText(element, value) {
        if ('textContent' in element) {
            element.textContent = value;
        } else {
            element.innerText = value;
        }
    }

    function scheduleFrame(win, callback) {
        if (win && typeof win.requestAnimationFrame === 'function') {
            win.requestAnimationFrame(callback);
        } else if (win && typeof win.setTimeout === 'function') {
            win.setTimeout(callback, 16);
        } else {
            callback();
        }
    }

    function getViewportWidth(win, doc) {
        var documentElement = doc && doc.documentElement;
        return (win && win.innerWidth) || (documentElement && documentElement.clientWidth) || 420;
    }

    function createWarningPanel(doc, win) {
        var panel = doc.createElement('div');
        var panelWidth = Math.max(260, Math.min(420, getViewportWidth(win, doc) - 48));
        panel.style.cssText = 'background:#333;padding:20px;border-radius:10px;color:white;box-sizing:border-box;margin:10vh auto 0;text-align:center;';
        panel.style.width = panelWidth + 'px';
        return panel;
    }

    var BrowserCheck = {
        getText: function (key, fallback) {
            return getText(key, fallback, getDefaultWindow());
        },

        getFeatureLabel: function (feature) {
            return getFeatureLabel(feature, getDefaultWindow());
        },

        hasRequiredModuleSyntaxSupport: function (win) {
            return hasRequiredModuleSyntaxSupport(win || getDefaultWindow());
        },

        hasModernJavaScriptSupport: function (win) {
            return hasModernJavaScriptSupport(win || getDefaultWindow());
        },

        init: function () {
            var win = getDefaultWindow();
            var doc = getDefaultDocument();
            var warnings = [];

            if (!win || !doc) {
                return;
            }

            if (!win.HTMLCanvasElement) {
                warnings.push({ key: 'canvas' });
            }

            if (!hasModernJavaScriptSupport(win)) {
                warnings.push({ key: 'es6' });
            } else if (!hasRequiredModuleSyntaxSupport(win)) {
                warnings.push({ key: 'modernSyntax' });
            }

            if (warnings.length > 0) {
                this.showWarning(warnings);
            }
        },

        showWarning: function (missingFeatures) {
            var win = getDefaultWindow();
            var doc = getDefaultDocument();
            var overlay;
            var panel;
            var title;
            var message;
            var list;
            var updateHint;
            var dismissButton;
            var index;
            var close;

            if (!win || !doc || !doc.body || doc.getElementById('browser-check-overlay')) {
                return;
            }

            overlay = doc.createElement('div');
            overlay.id = 'browser-check-overlay';
            overlay.setAttribute('role', 'dialog');
            overlay.setAttribute('aria-modal', 'true');
            overlay.setAttribute('aria-labelledby', 'browser-check-title');
            overlay.setAttribute('aria-describedby', 'browser-check-message browser-check-update');
            overlay.tabIndex = -1;
            overlay.style.cssText = 'position:fixed;top:0;right:0;bottom:0;left:0;background:rgba(0,0,0,0.8);z-index:99999;padding:24px;box-sizing:border-box;color:white;text-align:center;font-family:sans-serif;overflow:auto;';

            panel = createWarningPanel(doc, win);

            title = doc.createElement('h2');
            title.id = 'browser-check-title';
            title.style.cssText = 'margin:0 0 10px;color:#ff5555;';
            setText(title, getText('browserCheck.title', 'Browser support issue', win));

            message = doc.createElement('p');
            message.id = 'browser-check-message';
            message.style.cssText = 'margin:0;';
            setText(message, getText(
                'browserCheck.message',
                'Your browser is missing the following required features:',
                win
            ));

            list = doc.createElement('ul');
            list.style.cssText = 'text-align:left;margin:15px auto;display:inline-block;color:#ccc;padding-left:20px;';

            for (index = 0; index < missingFeatures.length; index += 1) {
                var featureLabel = getFeatureLabel(missingFeatures[index], win);
                var item;
                if (featureLabel) {
                    item = doc.createElement('li');
                    setText(item, featureLabel);
                    list.appendChild(item);
                }
            }

            updateHint = doc.createElement('p');
            updateHint.id = 'browser-check-update';
            updateHint.style.cssText = 'margin:0 0 20px;';
            setText(updateHint, getText(
                'browserCheck.updateHint',
                'Please update to the latest version of Chrome, Edge, Firefox, or Safari for the best experience.',
                win
            ));

            dismissButton = doc.createElement('button');
            dismissButton.type = 'button';
            dismissButton.style.cssText = 'padding:10px 20px;cursor:pointer;background:#007AFF;border:none;border-radius:5px;color:white;font-weight:bold;';
            setText(dismissButton, getText('browserCheck.continueAnyway', 'Continue anyway', win));

            close = function () {
                removeElement(overlay);
            };

            addEvent(dismissButton, 'click', close);
            addEvent(overlay, 'keydown', function (event) {
                var key = event && (event.key || event.keyCode);
                if (key === 'Escape' || key === 27) {
                    if (event && typeof event.preventDefault === 'function') {
                        event.preventDefault();
                    }
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
            scheduleFrame(win, function () {
                if (typeof dismissButton.focus === 'function') {
                    dismissButton.focus();
                }
            });
        }
    };

    if (typeof window !== 'undefined') {
        window.BrowserCheck = BrowserCheck;
    }
}());
