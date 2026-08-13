const assert = require('node:assert/strict');

async function main() {
  const { GifManager } = await import('../js/features/media/gif-manager.js');

  const toasts = [];
  const stub = {
    saveFailureNotified: false,
    win: {
      toastManager: { show(message, level) { toasts.push({ message, level }); } },
      i18n: { t: (key) => key }
    },
    getText: GifManager.prototype.getText
  };

  const quotaError = Object.assign(new Error('quota'), { name: 'QuotaExceededError' });
  GifManager.prototype.notifySaveFailure.call(stub, quotaError);
  assert.equal(toasts.length, 1, 'first failure must surface a toast');
  assert.equal(toasts[0].level, 'error');
  assert.match(toasts[0].message, /quota/i, 'quota failures must use the quota message');

  // Repeated failures (every drag re-saves) must not spam.
  GifManager.prototype.notifySaveFailure.call(stub, quotaError);
  assert.equal(toasts.length, 1, 'repeat failures must not stack toasts');

  // After a successful save resets the flag, new failures notify again.
  stub.saveFailureNotified = false;
  GifManager.prototype.notifySaveFailure.call(stub, new Error('other'));
  assert.equal(toasts.length, 2, 'a fresh failure after recovery must notify again');
  assert.doesNotMatch(toasts[1].message, /quota/i, 'non-quota failures must use the generic message');

  console.log('gif-save-quota-notice.test: all assertions passed');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
