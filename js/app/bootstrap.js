import { createApp } from './create-app.js';

const embeddedBuildVersion = '__ABOARD_BUILD_VERSION_PLACEHOLDER__';
if (typeof window !== 'undefined' && typeof window.__ABOARD_BUILD_VERSION__ === 'undefined') {
  window.__ABOARD_BUILD_VERSION__ = embeddedBuildVersion === '__ABOARD_BUILD_VERSION_PLACEHOLDER__' ? null : embeddedBuildVersion;
}

const BOOTSTRAP_FAILURE_MESSAGES = {
  'zh-CN': 'Aboard 启动失败，请刷新页面后重试。',
  'zh-TW': 'Aboard 啟動失敗，請重新整理頁面後再試。',
  'en-US': 'Aboard failed to start. Please refresh the page and try again.',
  'ja-JP': 'Aboard の起動に失敗しました。ページを再読み込みしてからもう一度お試しください。',
  'ko-KR': 'Aboard를 시작하지 못했습니다. 페이지를 새로고침한 뒤 다시 시도해 주세요.',
  'de-DE': 'Aboard konnte nicht gestartet werden. Bitte laden Sie die Seite neu und versuchen Sie es erneut.',
  'fr-FR': 'Le démarrage d’Aboard a échoué. Actualisez la page puis réessayez.',
  'es-ES': 'Aboard no pudo iniciarse. Actualiza la página e inténtalo de nuevo.'
};

function normalizeLocale(locale) {
  const normalizedLocale = String(locale || '').toLowerCase();
  const parts = normalizedLocale.split('-');
  const family = parts.length > 0 ? parts[0] : '';
  switch (family) {
    case 'zh':
      return normalizedLocale.includes('tw') || normalizedLocale.includes('hk') || normalizedLocale.includes('hant')
        ? 'zh-TW'
        : 'zh-CN';
    case 'en':
      return 'en-US';
    case 'ja':
      return 'ja-JP';
    case 'ko':
      return 'ko-KR';
    case 'de':
      return 'de-DE';
    case 'fr':
      return 'fr-FR';
    case 'es':
      return 'es-ES';
    default:
      return null;
  }
}

function resolveBootstrapFailureMessage() {
  const localeSignals = [
    window.i18n?.currentLocale,
    document?.documentElement?.lang,
    ...(Array.isArray(navigator?.languages) ? navigator.languages : [navigator?.language, navigator?.userLanguage])
  ].filter(Boolean);

  for (const locale of localeSignals) {
    const normalizedLocale = normalizeLocale(locale);
    if (normalizedLocale && BOOTSTRAP_FAILURE_MESSAGES[normalizedLocale]) {
      return BOOTSTRAP_FAILURE_MESSAGES[normalizedLocale];
    }
  }

  return BOOTSTRAP_FAILURE_MESSAGES['en-US'];
}

function showBootstrapFailure(message) {
  if (window.appDialog?.showAlert) {
    window.appDialog.showAlert(message, 'error');
    return;
  }

  const existingBanner = document.getElementById('app-bootstrap-error');
  if (existingBanner) {
    existingBanner.textContent = message;
    return;
  }

  const banner = document.createElement('div');
  banner.id = 'app-bootstrap-error';
  banner.setAttribute('role', 'alert');
  banner.style.position = 'fixed';
  banner.style.inset = '24px';
  banner.style.display = 'flex';
  banner.style.alignItems = 'center';
  banner.style.justifyContent = 'center';
  banner.style.padding = '20px';
  banner.style.borderRadius = '16px';
  banner.style.background = 'rgba(24, 24, 28, 0.92)';
  banner.style.color = '#fff';
  banner.style.font = '600 16px/1.5 system-ui, sans-serif';
  banner.style.textAlign = 'center';
  banner.style.zIndex = '99999';
  banner.style.backdropFilter = 'blur(6px)';
  banner.textContent = message;
  document.body.appendChild(banner);

  console.error(message);
}

function bindPortraitOrientationContinue() {
  const overlay = document.getElementById('portrait-orientation-overlay');
  const continueButton = document.getElementById('portrait-orientation-continue-btn');
  if (!overlay || !continueButton || continueButton.dataset.bound === 'true') {
    return;
  }

  const portraitQuery = '(orientation: portrait) and (max-width: 1024px)';
  let restoreFocusTarget = null;
  let overlayWasVisible = false;
  let redirectingFocus = false;

  const scheduleFrame = (callback) => {
    if (typeof window.requestAnimationFrame === 'function') {
      window.requestAnimationFrame(callback);
      return;
    }
    window.setTimeout(callback, 0);
  };

  const focusElement = (element) => {
    if (!element || typeof element.focus !== 'function') {
      return;
    }
    try {
      element.focus({ preventScroll: true });
    } catch (error) {
      element.focus();
    }
  };

  const isOverlayVisible = () => {
    if (document.body?.classList.contains('portrait-orientation-dismissed')) {
      return false;
    }
    const style = window.getComputedStyle?.(overlay);
    return style ? style.display !== 'none' && style.visibility !== 'hidden' : false;
  };

  const focusContinueButton = () => {
    if (document.activeElement === continueButton) {
      return;
    }
    redirectingFocus = true;
    focusElement(continueButton);
    redirectingFocus = false;
  };

  const restoreFocus = () => {
    const target = restoreFocusTarget || document.getElementById('pen-btn');
    restoreFocusTarget = null;
    scheduleFrame(() => {
      if (target && target.isConnected !== false) {
        focusElement(target);
      }
    });
  };

  const syncOverlayFocus = () => {
    const visible = isOverlayVisible();
    overlay.setAttribute('aria-hidden', visible ? 'false' : 'true');

    if (visible) {
      if (!overlayWasVisible) {
        const activeElement = document.activeElement;
        if (activeElement && activeElement !== document.body && !overlay.contains(activeElement)) {
          restoreFocusTarget = activeElement;
        }
      }
      overlayWasVisible = true;
      focusContinueButton();
      return;
    }

    if (overlayWasVisible) {
      overlayWasVisible = false;
      restoreFocus();
    }
  };

  const dismissOverlay = () => {
    document.body?.classList.add('portrait-orientation-dismissed');
    syncOverlayFocus();
  };

  continueButton.dataset.bound = 'true';
  continueButton.addEventListener('click', dismissOverlay);

  document.addEventListener('keydown', (event) => {
    if (!isOverlayVisible()) {
      return;
    }
    if (event.key === 'Tab') {
      event.preventDefault();
      focusContinueButton();
    } else if (event.key === 'Escape') {
      event.preventDefault();
      dismissOverlay();
    }
  }, true);

  document.addEventListener('focusin', (event) => {
    if (redirectingFocus || !isOverlayVisible() || overlay.contains(event.target)) {
      return;
    }
    if (event.target && event.target !== document.body && typeof event.target.focus === 'function') {
      restoreFocusTarget = event.target;
    }
    focusContinueButton();
  }, true);

  const mediaQuery = window.matchMedia?.(portraitQuery);
  if (typeof mediaQuery?.addEventListener === 'function') {
    mediaQuery.addEventListener('change', syncOverlayFocus);
  } else if (typeof mediaQuery?.addListener === 'function') {
    mediaQuery.addListener(syncOverlayFocus);
  }
  window.addEventListener('resize', () => {
    scheduleFrame(syncOverlayFocus);
  });

  scheduleFrame(syncOverlayFocus);
}

async function startAboard() {
  try {
    bindPortraitOrientationContinue();
    await createApp();
  } catch (error) {
    console.error('Aboard bootstrap failed:', error);
    showBootstrapFailure(resolveBootstrapFailureMessage());
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    startAboard();
  }, { once: true });
} else {
  startAboard();
}
