export const VISIBLE_CORE_SERVICE_SCRIPTS = [
  'js/modules/i18n.js',
  'js/modules/file-validation.js'
];

export const POST_VISIBLE_SERVICE_SCRIPTS = [
  'js/modules/pwa-manager.js'
];

export const VISIBLE_CORE_BOARD_DEPENDENCY_SCRIPTS = [
  'js/collapsible.js',
  'js/modules/settings-manager.js',
  'js/modules/storage-manager.js'
];

export const POST_VISIBLE_BOARD_DEPENDENCY_SCRIPTS = [
  'js/modules/help-system.js',
  'js/time-display.js',
  'js/modules/time-display-controls.js',
  'js/modules/time-display-settings.js'
];

export const VISIBLE_CORE_STARTUP_SCRIPTS = [
  'js/drawing.js',
  'js/history.js',
  'js/background.js',
  'js/image-controls.js',
  'js/stroke-controls.js',
  'js/selection.js',
  'js/modules/edge-drawing.js',
  'js/modules/teaching-tools.js',
  'js/modules/shape-drawing.js',
  'js/modules/line-style-modal.js',
  'js/modules/board-construction.js',
  'js/modules/layout-runtime.js',
  'js/modules/panel-runtime.js',
  'js/modules/modal-runtime.js',
  'js/modules/lazy-manager-runtime.js',
  'js/modules/display-runtime.js',
  'js/modules/page-scene-runtime.js',
  'js/modules/pagination-runtime.js',
  'js/modules/interaction-runtime.js',
  'js/modules/zoom-runtime.js',
  'js/modules/session-runtime.js',
  'js/modules/session-persistence-runtime.js',
  'js/modules/event-setup-runtime.js',
  'js/modules/canvas-view-runtime.js',
  'js/modules/overlay-lock-runtime.js',
  'js/modules/drawing-actions-runtime.js',
  'js/modules/view-controls-runtime.js',
  'js/modules/render-quality-runtime.js',
  'js/modules/board-helpers-runtime.js',
  'js/modules/deferred-init-runtime.js',
  'js/modules/classroom-mode.js',
  'js/modules/tool-runtime.js',
  'js/modules/ui-listeners-core-runtime.js',
  'js/main.js'
];

export const POST_VISIBLE_STARTUP_SCRIPTS = [
  'js/modules/coordinate-panel-runtime.js',
  'js/modules/overlay-ui-runtime.js',
  'js/modules/ui-listeners-runtime.js',
  'js/modules/font-management-runtime.js',
  'js/modules/config-import-runtime.js',
  'js/modules/background-ui-runtime.js',
  'js/modules/cache-runtime.js',
  'js/modules/customization-runtime.js',
  'js/modules/uploaded-images-runtime.js',
  'js/modules/coordinate-origin-runtime.js',
  'js/modules/coordinate-tools-runtime.js'
];

export const APP_OWNED_SERVICE_SCRIPTS = [
  ...VISIBLE_CORE_SERVICE_SCRIPTS,
  ...POST_VISIBLE_SERVICE_SCRIPTS
];

export const APP_OWNED_BOARD_DEPENDENCY_SCRIPTS = [
  ...VISIBLE_CORE_BOARD_DEPENDENCY_SCRIPTS,
  ...POST_VISIBLE_BOARD_DEPENDENCY_SCRIPTS
];

export const LEGACY_STARTUP_SCRIPTS = [
  ...VISIBLE_CORE_STARTUP_SCRIPTS,
  ...POST_VISIBLE_STARTUP_SCRIPTS
];
