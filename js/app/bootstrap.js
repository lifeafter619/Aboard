import { createApp } from './create-app.js';

const embeddedBuildVersion = '__ABOARD_BUILD_VERSION_PLACEHOLDER__';
if (typeof window !== 'undefined' && typeof window.__ABOARD_BUILD_VERSION__ === 'undefined') {
  window.__ABOARD_BUILD_VERSION__ = embeddedBuildVersion === '__ABOARD_BUILD_VERSION_PLACEHOLDER__' ? null : embeddedBuildVersion;
}

async function startAboard() {
  try {
    await createApp();
  } catch (error) {
    console.error('Aboard bootstrap failed:', error);
    window.alert?.('Aboard failed to start. Please refresh the page and try again.');
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    startAboard();
  }, { once: true });
} else {
  startAboard();
}
