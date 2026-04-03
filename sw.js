const CORE_CACHE_NAME = 'aboard-core-v32';
const RUNTIME_CACHE_NAME = 'aboard-runtime-v32';
const RUNTIME_CACHE_MAX_ENTRIES = 24;
const RUNTIME_CACHEABLE_DESTINATIONS = new Set(['script', 'style', 'worker', 'image', 'font', 'manifest']);
const RUNTIME_CACHEABLE_EXTENSIONS = /\.(?:css|gif|ico|jpe?g|js|json|png|svg|webp|woff2?)$/i;
const LOCALE_ASSETS = [
  './js/locales/zh-CN.js',
  './js/locales/zh-TW.js',
  './js/locales/en-US.js',
  './js/locales/ja-JP.js',
  './js/locales/ko-KR.js',
  './js/locales/fr-FR.js',
  './js/locales/de-DE.js',
  './js/locales/es-ES.js',
  './js/locales/overrides.js',
  './js/locales/help/zh-CN.js',
  './js/locales/help/zh-TW.js',
  './js/locales/help/en-US.js',
  './js/locales/help/ja-JP.js',
  './js/locales/help/ko-KR.js',
  './js/locales/help/fr-FR.js',
  './js/locales/help/de-DE.js',
  './js/locales/help/es-ES.js'
];

const CORE_ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './img/icon.svg',
  './css/style.css',
  './css/modules/time-display.css',
  './css/modules/feature-area.css',
  './css/modules/export.css',
  './css/modules/timer.css',
  './css/modules/teaching-tools.css',
  './css/modules/shape.css',
  './css/modules/line-style-modal.css',
  './css/modules/random-picker.css',
  './css/modules/scoreboard.css',
  './css/modules/insert-image.css',
  './css/modules/insert-text.css',
  './css/modules/project.css',
  './css/modules/toast.css',
  './css/modules/diff.css',
  './js/app/bootstrap.js',
  './js/app/create-app.js',
  './js/app/create-app-context.js',
  './js/app/create-app-services.js',
  './js/app/create-board-dependencies.js',
  './js/app/create-board-runtime-dependencies.js',
  './js/app/legacy-manifest.js',
  './js/app/startup-update-policy.js',
  './js/app/legacy-script-loader.js',
  './js/app/resolve-legacy-constructor.js',
  './js/legacy/runtime-bridge.js',
  './js/infra/browser-check.js',
  './js/infra/dialog-manager.js',
  './js/infra/rich-text-parser.js',
  './js/infra/script-loader.js',
  './js/features/toast/toast-manager.js',
  './js/features/announcement/announcement-manager.js',
  './js/features/media/gif-manager.js',
  './js/drawing.js',
  './js/history.js',
  './js/background.js',
  './js/image-controls.js',
  './js/stroke-controls.js',
  './js/selection.js',
  './js/collapsible.js',
  './js/time-display.js',
  './js/modules/time-display-controls.js',
  './js/modules/time-display-settings.js',
  './js/modules/edge-drawing.js',
  './js/modules/teaching-tools.js',
  './js/modules/shape-drawing.js',
  './js/modules/line-style-modal.js',
  './js/modules/board-construction.js',
  './js/modules/layout-runtime.js',
  './js/modules/coordinate-panel-runtime.js',
  './js/modules/overlay-ui-runtime.js',
  './js/modules/panel-runtime.js',
  './js/modules/modal-runtime.js',
  './js/modules/lazy-manager-runtime.js',
  './js/modules/ui-listeners-core-runtime.js',
  './js/modules/ui-listeners-runtime.js',
  './js/modules/session-runtime.js',
  './js/modules/font-management-runtime.js',
  './js/modules/config-import-runtime.js',
  './js/modules/background-ui-runtime.js',
  './js/modules/cache-runtime.js',
  './js/modules/customization-runtime.js',
  './js/modules/display-runtime.js',
  './js/modules/pagination-runtime.js',
  './js/modules/interaction-runtime.js',
  './js/modules/uploaded-images-runtime.js',
  './js/modules/zoom-runtime.js',
  './js/modules/session-persistence-runtime.js',
  './js/modules/coordinate-origin-runtime.js',
  './js/modules/coordinate-tools-runtime.js',
  './js/modules/event-setup-runtime.js',
  './js/modules/canvas-view-runtime.js',
  './js/modules/overlay-lock-runtime.js',
  './js/modules/drawing-actions-runtime.js',
  './js/modules/view-controls-runtime.js',
  './js/modules/render-quality-runtime.js',
  './js/modules/board-helpers-runtime.js',
  './js/modules/deferred-init-runtime.js',
  './js/modules/tool-runtime.js',
  './js/modules/settings-manager.js',
  './js/modules/i18n.js',
  './js/modules/help-system.js',
  './js/modules/storage-manager.js',
  './js/modules/pwa-manager.js',
  './js/main.js',
  ...LOCALE_ASSETS
];

function isSameOrigin(requestUrl) {
  return requestUrl.origin === self.location.origin;
}

function isRangeRequest(request) {
  return request.headers.has('range');
}

function isRuntimeCacheableRequest(request, url) {
  if (request.mode === 'navigate' || isRangeRequest(request)) {
    return false;
  }

  if (request.destination) {
    return RUNTIME_CACHEABLE_DESTINATIONS.has(request.destination);
  }

  return RUNTIME_CACHEABLE_EXTENSIONS.test(url.pathname);
}

function canStoreResponse(response) {
  return response && response.status === 200 && response.type !== 'error';
}

async function trimRuntimeCache(cache) {
  const keys = await cache.keys();
  const overflow = keys.length - RUNTIME_CACHE_MAX_ENTRIES;
  if (overflow <= 0) {
    return;
  }

  await Promise.all(keys.slice(0, overflow).map(request => cache.delete(request)));
}

async function storeRuntimeResponse(cache, request, response) {
  if (!canStoreResponse(response)) {
    return;
  }

  try {
    await cache.put(request, response.clone());
    await trimRuntimeCache(cache);
  } catch (error) {
    console.warn('Skipping Cache Storage write for request:', request.url, error);
  }
}

async function networkFirst(request) {
  const cache = await caches.open(RUNTIME_CACHE_NAME);
  try {
    const response = await fetch(request);
    if (response && response.ok) {
      await storeRuntimeResponse(cache, request, response);
    }
    return response;
  } catch (error) {
    const cached = await cache.match(request);
    if (cached) {
      return cached;
    }
    throw error;
  }
}

async function cacheFirst(request) {
  const cache = await caches.open(RUNTIME_CACHE_NAME);
  const cached = await cache.match(request);
  if (cached) {
    return cached;
  }

  const response = await fetch(request);
  if (response && response.ok) {
    await storeRuntimeResponse(cache, request, response);
  }
  return response;
}

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CORE_CACHE_NAME).then(cache => cache.addAll(CORE_ASSETS))
  );
});

self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

self.addEventListener('activate', event => {
  const cacheWhitelist = [CORE_CACHE_NAME, RUNTIME_CACHE_NAME];
  event.waitUntil(
    caches.keys().then(cacheNames => Promise.all(
      cacheNames.map(cacheName => {
        if (!cacheWhitelist.includes(cacheName)) {
          return caches.delete(cacheName);
        }
        return Promise.resolve();
      })
    )).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  const { request } = event;
  if (request.method !== 'GET') {
    return;
  }

  const url = new URL(request.url);
  if (!isSameOrigin(url)) {
    return;
  }

  if (isRangeRequest(request)) {
    return;
  }

  if (url.pathname === '/api/version' || url.pathname.endsWith('/version.txt')) {
    event.respondWith(networkFirst(request));
    return;
  }

  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).catch(async () => {
        const cache = await caches.open(CORE_CACHE_NAME);
        return cache.match('./index.html');
      })
    );
    return;
  }

  if (!isRuntimeCacheableRequest(request, url)) {
    return;
  }

  event.respondWith(cacheFirst(request));
});
