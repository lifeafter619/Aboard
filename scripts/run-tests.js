const { spawnSync } = require('node:child_process');

const CORE_TESTS = [
  'tests/project-quality-guards.test.js',
  'tests/version-source-of-truth.test.js',
  'tests/pwa-locale-guard.test.js',
  'tests/i18n-locale-normalization.test.js',
  'tests/settings-manager-locale-state.test.js',
  'tests/locale-files.test.js',
  'tests/lazy-manager-runtime.test.js',
  'tests/event-setup-touchcancel.test.js',
  'tests/canvas-pointer-target.test.js',
  'tests/canvas-context-options.test.js',
  'tests/server-static-paths.test.js',
  'tests/safe-plot-evaluator.test.js',
  'tests/file-validation-utility.test.js',
  'tests/file-import-validation.test.js',
  'tests/browser-check-no-eval.test.js',
  'tests/create-app-browser-check-order.test.js',
  'tests/legacy-constructor-no-eval.test.js',
  'tests/text-escaping-guards.test.js',
  'tests/timer-title-escaping.test.js',
  'tests/timer-audio-fallback.test.js',
  'tests/sw-essential-assets.test.js',
  'tests/script-loader-existing-script.test.mjs',
  'tests/deep-clone-fallback.test.js',
  'tests/storage-fallback-resilience.test.js',
  'tests/startup-storage-resilience.test.js',
  'tests/background-pattern-panel-layout.test.js',
  'tests/main-startup-storage-resilience.test.js'
];

const FULL_TESTS = [
  'tests/project-quality-guards.test.js',
  'tests/version-source-of-truth.test.js',
  'tests/drawing-smoke-runner-resilience.test.js',
  'tests/pwa-locale-guard.test.js',
  'tests/i18n-locale-normalization.test.js',
  'tests/settings-manager-locale-state.test.js',
  'tests/locale-files.test.js',
  'tests/lazy-manager-runtime.test.js',
  'tests/event-setup-touchcancel.test.js',
  'tests/canvas-pointer-target.test.js',
  'tests/file-picker-dom-attachment.test.js',
  'tests/canvas-context-options.test.js',
  'tests/server-static-paths.test.js',
  'tests/safe-plot-evaluator.test.js',
  'tests/pagination-page-action-i18n.test.js',
  'tests/scoreboard-locale-default-name-guard.test.js',
  'tests/scoreboard-title-escaping.test.js',
  'tests/random-picker-escaping.test.js',
  'tests/file-validation-utility.test.js',
  'tests/file-import-validation.test.js',
  'tests/browser-check-no-eval.test.js',
  'tests/create-app-browser-check-order.test.js',
  'tests/legacy-constructor-no-eval.test.js',
  'tests/selection-coordinate-position-escaping.test.js',
  'tests/selection-coordinate-position-modal-ux.test.js',
  'tests/selection-layer-menu-ux.test.js',
  'tests/selection-color-popover-ux.test.js',
  'tests/background-pattern-panel-layout.test.js',
  'tests/background-ui-plot-color-escaping.test.js',
  'tests/background-ui-empty-state-escaping.test.js',
  'tests/background-coordinate-overlay-color-escaping.test.js',
  'tests/coordinate-tools-range-options.test.js',
  'tests/coordinate-settings-modal-ux.test.js',
  'tests/text-escaping-guards.test.js',
  'tests/timer-title-escaping.test.js',
  'tests/timer-audio-fallback.test.js',
  'tests/timer-modal-ux.test.js',
  'tests/timer-custom-sound-list-ux.test.js',
  'tests/time-display-settings-modal-ux.test.js',
  'tests/export-modal-ux.test.js',
  'tests/export-page-readiness.test.js',
  'tests/sw-essential-assets.test.js',
  'tests/script-loader-existing-script.test.mjs',
  'tests/label-button-keyboard-ux.test.mjs',
  'tests/session-planned-update-recovery.test.js',
  'tests/pwa-activation-guard.test.js',
  'tests/update-activity-modal-guard.test.js',
  'tests/pwa-recovery-update-guard.test.js',
  'tests/startup-update-recovery-gate.test.js',
  'tests/pwa-update-prompt-recovery-guard.test.js',
  'tests/recovery-modal-pending-escape-guard.test.js',
  'tests/deep-clone-fallback.test.js',
  'tests/project-import-background-reset.test.js',
  'tests/cache-runtime-clear-selected-canvas.test.js',
  'tests/session-clear-data-canvas-state.test.js',
  'tests/pagination-background-state.test.js',
  'tests/runtime-resilience.test.js',
  'tests/optional-ui-resilience.test.js',
  'tests/view-state-persistence.test.js',
  'tests/background-customization-resilience.test.js',
  'tests/background-persistence-batching.test.js',
  'tests/storage-fallback-resilience.test.js',
  'tests/startup-storage-resilience.test.js',
  'tests/ui-settings-storage-resilience.test.js',
  'tests/settings-collapsible-sections.test.js',
  'tests/toast-manager-ux.test.js',
  'tests/dialog-manager-keyboard-ux.test.js',
  'tests/insert-text-modal-ux.test.js',
  'tests/line-style-modal-ux.test.js',
  'tests/teaching-tools-modal-ux.test.js',
  'tests/shape-drawing-lazy-preview.test.js',
  'tests/drawing-live-preview-lazy.test.js',
  'tests/main-startup-storage-resilience.test.js'
];

const SMOKE_TESTS = [
  'tests/drawing-smoke-cdp.mjs',
  'tests/responsive-layout-smoke.mjs'
];

const SUITES = {
  core: CORE_TESTS,
  full: [...FULL_TESTS, ...SMOKE_TESTS],
  smoke: SMOKE_TESTS
};

function runTest(testPath) {
  console.log(`\n> node ${testPath}`);
  const result = spawnSync(process.execPath, [testPath], {
    cwd: process.cwd(),
    stdio: 'inherit'
  });

  if (result.error) {
    console.error(result.error);
    return 1;
  }

  return result.status ?? 1;
}

function main() {
  const suiteName = process.argv[2] || 'core';
  const tests = SUITES[suiteName];

  if (!tests) {
    console.error(`Unknown test suite "${suiteName}". Expected one of: ${Object.keys(SUITES).join(', ')}`);
    process.exit(1);
  }

  for (const testPath of tests) {
    const status = runTest(testPath);
    if (status !== 0) {
      process.exit(status);
    }
  }

  console.log(`\n${suiteName} test suite passed (${tests.length} tests).`);
}

main();
