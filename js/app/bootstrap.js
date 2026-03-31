import { createApp } from './create-app.js';

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
