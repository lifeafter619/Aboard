// Bumping SW_VERSION busts both caches atomically. Previously CORE and
// RUNTIME tracked separate version numbers (v37 vs v32), so runtime-cached
// resources from older releases could survive a core-cache rotation and
// serve stale JS/CSS alongside new code. Keeping a single SW_VERSION
// guarantees activate() clears both via the existing whitelist check.
const SW_VERSION = 'v38';
const CORE_CACHE_NAME = `aboard-core-${SW_VERSION}`;
const RUNTIME_CACHE_NAME = `aboard-runtime-${SW_VERSION}`;
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
  './img/ruler_1.png',
  './img/ruler_2.png',
  './img/set_square_1.png',
  './img/set_square_2.png',
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
  './js/infra/deep-clone.js',
  './js/infra/label-button-keyboard.js',
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
  './js/export.js',
  './js/insert-image.js',
  './js/modules/ui-listeners-core-runtime.js',
  './js/modules/ui-listeners-runtime.js',
  './js/modules/session-runtime.js',
  './js/modules/font-management-runtime.js',
  './js/modules/config-import-runtime.js',
  './js/modules/background-ui-runtime.js',
  './js/modules/cache-runtime.js',
  './js/modules/customization-runtime.js',
  './js/modules/display-runtime.js',
  './js/modules/page-scene-runtime.js',
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
  './js/modules/project-manager.js',
  './js/modules/timer.js',
  './js/modules/insert-text-manager.js',
  './js/modules/random-picker.js',
  './js/modules/scoreboard.js',
  './js/modules/project-legacy-compat.js',
  './js/modules/libgif.js',
  './js/modules/settings-manager.js',
  './js/modules/i18n.js',
  './js/modules/help-system.js',
  './js/modules/storage-manager.js',
  './js/modules/pwa-manager.js',
  './js/libs/fflate.min.js',
  './js/libs/xlsx.full.min.js',
  './sounds/class-bell.MP3',
  './sounds/exam-end.MP3',
  './sounds/gentle-alarm.MP3',
  './sounds/digital-beep.MP3',
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
  const runtimeCache = await caches.open(RUNTIME_CACHE_NAME);
  const runtimeCached = await runtimeCache.match(request);
  if (runtimeCached) {
    return runtimeCached;
  }

  const coreCache = await caches.open(CORE_CACHE_NAME);
  const coreCached = await coreCache.match(request);
  if (coreCached) {
    return coreCached;
  }

  const response = await fetch(request);
  if (response && response.ok) {
    await storeRuntimeResponse(runtimeCache, request, response);
    return response;
  }

  return response;
}

// Assets that must be available for the shell to boot at all. If any of these
// fails to cache during install, the new Service Worker is genuinely broken and
// must not activate.
const ESSENTIAL_CORE_ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './css/style.css',
  './js/modules/i18n.js',
  './js/collapsible.js',
  './js/modules/settings-manager.js',
  './js/modules/storage-manager.js',
  './js/drawing.js',
  './js/history.js',
  './js/background.js',
  './js/image-controls.js',
  './js/stroke-controls.js',
  './js/selection.js',
  './js/modules/edge-drawing.js',
  './js/modules/teaching-tools.js',
  './js/modules/shape-drawing.js',
  './js/modules/line-style-modal.js',
  './js/modules/board-construction.js',
  './js/modules/layout-runtime.js',
  './js/modules/panel-runtime.js',
  './js/modules/modal-runtime.js',
  './js/modules/lazy-manager-runtime.js',
  './js/modules/display-runtime.js',
  './js/modules/page-scene-runtime.js',
  './js/modules/pagination-runtime.js',
  './js/modules/interaction-runtime.js',
  './js/modules/zoom-runtime.js',
  './js/modules/session-runtime.js',
  './js/modules/session-persistence-runtime.js',
  './js/modules/event-setup-runtime.js',
  './js/modules/canvas-view-runtime.js',
  './js/modules/overlay-lock-runtime.js',
  './js/modules/drawing-actions-runtime.js',
  './js/modules/view-controls-runtime.js',
  './js/modules/render-quality-runtime.js',
  './js/modules/board-helpers-runtime.js',
  './js/modules/deferred-init-runtime.js',
  './js/modules/tool-runtime.js',
  './js/modules/ui-listeners-core-runtime.js',
  './js/main.js',
  './js/app/bootstrap.js',
  './js/app/create-app.js',
  './js/app/create-app-context.js',
  './js/app/create-app-services.js',
  './js/app/create-board-dependencies.js',
  './js/app/create-board-runtime-dependencies.js',
  './js/app/legacy-manifest.js',
  './js/app/legacy-script-loader.js',
  './js/app/resolve-legacy-constructor.js',
  './js/app/startup-update-policy.js',
  './js/infra/browser-check.js',
  './js/infra/deep-clone.js',
  './js/infra/dialog-manager.js',
  './js/infra/label-button-keyboard.js',
  './js/infra/rich-text-parser.js',
  './js/infra/script-loader.js',
  './js/features/toast/toast-manager.js',
  './js/features/announcement/announcement-manager.js',
  './js/features/media/gif-manager.js',
  './js/legacy/runtime-bridge.js'
];

async function precacheCoreAssets(cache) {
  // Atomic: essentials must all succeed or the install fails cleanly.
  await cache.addAll(ESSENTIAL_CORE_ASSETS);

  // Best-effort: individual failures (renamed file, temporary 404) warn and move
  // on instead of poisoning the whole install. First-use traffic will still
  // populate the runtime cache via the fetch handler.
  const optionalAssets = CORE_ASSETS.filter((asset) => !ESSENTIAL_CORE_ASSETS.includes(asset));
  await Promise.allSettled(
    optionalAssets.map(async (asset) => {
      try {
        const response = await fetch(asset, { cache: 'reload' });
        if (!response || !response.ok) {
          console.warn('Skipping optional asset during install:', asset, response && response.status);
          return;
        }
        await cache.put(asset, response);
      } catch (error) {
        console.warn('Failed to precache optional asset:', asset, error);
      }
    })
  );
}

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CORE_CACHE_NAME).then((cache) => precacheCoreAssets(cache))
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
