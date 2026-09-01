// Bumping SW_VERSION busts both caches atomically. Previously CORE and
// RUNTIME tracked separate version numbers (v37 vs v32), so runtime-cached
// resources from older releases could survive a core-cache rotation and
// serve stale JS/CSS alongside new code. Keeping a single SW_VERSION
// guarantees activate() clears both via the existing whitelist check.
const SW_VERSION = '2.5.3';
const CORE_CACHE_NAME = `aboard-core-${SW_VERSION}`;
const RUNTIME_CACHE_NAME = `aboard-runtime-${SW_VERSION}`;
const MEDIA_CACHE_NAME = `aboard-media-${SW_VERSION}`;
const RUNTIME_CACHE_MAX_ENTRIES = 24;
const OPTIONAL_PRECACHE_CONCURRENCY = 6;
const NAVIGATION_NETWORK_TIMEOUT_MS = 2000;
const RUNTIME_CACHEABLE_DESTINATIONS = new Set(['script', 'style', 'worker', 'image', 'font', 'manifest', 'audio']);
const RUNTIME_CACHEABLE_EXTENSIONS = /\.(?:css|gif|ico|jpe?g|js|json|mp3|png|svg|wav|webp|woff2?)$/i;
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
  './img/icon-192.png?v=2.5.3',
  './img/icon-512.png?v=2.5.3',
  './css/style.css?v=20260727-compact-panel',
  './css/modules/time-display.css',
  './css/modules/feature-area.css',
  './css/modules/pagination.css',
  './css/modules/classroom-mode.css',
  './css/modules/coordinate-tools.css',
  './css/modules/selection-controls.css',
  './css/modules/dialogs.css',
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
  './css/modules/font-management.css',
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
  './js/modules/alignment-guides.js',
  './js/selection.js',
  './js/collapsible.js',
  './js/time-display.js',
  './js/modules/time-display-controls.js',
  './js/modules/time-display-settings.js',
  './js/modules/browser-check.js',
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
  './js/modules/classroom-mode.js',
  './js/modules/tool-runtime.js',
  './js/modules/project-manager.js',
  './js/modules/timer.js',
  './js/modules/insert-text-manager.js',
  './js/modules/libgif.js',
  './js/modules/random-picker.js',
  './js/modules/scoreboard.js',
  './js/modules/project-legacy-compat.js',
  './js/modules/settings-manager.js',
  './js/modules/i18n.js',
  './js/modules/file-validation.js',
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

function isAppShellNavigation(request) {
  // Only the scope root (and its explicit index.html) may refresh the cached
  // shell. Without this, any same-scope 200 text/html navigation (e.g. Jekyll
  // rendering committed markdown on GitHub Pages) would overwrite the offline
  // app shell. Redirected responses are also rejected: browsers refuse to
  // replay them for navigations served from cache.
  const scopePath = new URL(self.registration.scope).pathname;
  const requestPath = new URL(request.url).pathname;
  return requestPath === scopePath || requestPath === `${scopePath}index.html`;
}

async function navigationNetworkFirst(
  request,
  { timeoutMs = NAVIGATION_NETWORK_TIMEOUT_MS, event = null } = {}
) {
  const cache = await caches.open(CORE_CACHE_NAME);
  const networkPromise = fetch(request).then(async (response) => {
    if (canStoreResponse(response)
      && !response.redirected
      && isAppShellNavigation(request)
      && /^text\/html(?:;|$)/i.test(response.headers.get('content-type') || '')) {
      try {
        await cache.put('./index.html', response.clone());
      } catch (error) {
        console.warn('Failed to refresh the cached app shell:', error);
      }
    }
    return response;
  });
  const backgroundRefresh = networkPromise.then(() => undefined, (error) => {
    console.warn('Background app-shell refresh failed:', error);
  });

  let timeoutId = null;
  const timeoutPromise = new Promise((resolve) => {
    timeoutId = setTimeout(() => resolve({ timedOut: true }), timeoutMs);
  });

  try {
    const result = await Promise.race([
      networkPromise.then((response) => ({ timedOut: false, response })),
      timeoutPromise
    ]);
    if (!result.timedOut) {
      if (result.response?.ok) {
        return result.response;
      }
      const cached = await cache.match('./index.html');
      return cached || result.response;
    }

    const cached = await cache.match('./index.html');
    if (cached) {
      event?.waitUntil?.(backgroundRefresh);
      return cached;
    }

    return await networkPromise;
  } catch (error) {
    const cached = await cache.match('./index.html');
    if (cached) {
      return cached;
    }
    throw error;
  } finally {
    if (timeoutId !== null) {
      clearTimeout(timeoutId);
    }
  }
}

function isMediaAssetUrl(url) {
  return /\/sounds\/[^/]+\.(?:mp3|wav)$/i.test(url.pathname);
}

function createFullMediaRequest(request) {
  const headers = new Headers(request.headers);
  headers.delete('range');
  return new Request(request, { headers });
}

async function getFullMediaResponse(request) {
  const cache = await caches.open(MEDIA_CACHE_NAME);
  const fullRequest = createFullMediaRequest(request);
  const cached = await cache.match(fullRequest);
  if (cached) {
    return cached;
  }

  const response = await fetch(fullRequest);
  if (canStoreResponse(response)) {
    try {
      await cache.put(fullRequest, response.clone());
    } catch (error) {
      console.warn('Failed to cache complete media response:', request.url, error);
    }
  }
  return response;
}

function parseByteRange(rangeHeader, size) {
  const match = /^bytes=(\d*)-(\d*)$/i.exec(String(rangeHeader || '').trim());
  if (!match || (!match[1] && !match[2]) || size <= 0) {
    return null;
  }

  let start;
  let end;
  if (!match[1]) {
    const suffixLength = Number(match[2]);
    if (!Number.isSafeInteger(suffixLength) || suffixLength <= 0) {
      return null;
    }
    start = Math.max(size - suffixLength, 0);
    end = size - 1;
  } else {
    start = Number(match[1]);
    end = match[2] ? Number(match[2]) : size - 1;
    if (!Number.isSafeInteger(start) || !Number.isSafeInteger(end)) {
      return null;
    }
    end = Math.min(end, size - 1);
  }

  if (start < 0 || start >= size || end < start) {
    return null;
  }
  return { start, end };
}

async function handleMediaRequest(request) {
  const fullResponse = await getFullMediaResponse(request);
  const rangeHeader = request.headers.get('range');
  if (!rangeHeader || fullResponse.status !== 200) {
    return fullResponse;
  }

  const body = await fullResponse.arrayBuffer();
  const range = parseByteRange(rangeHeader, body.byteLength);
  if (!range) {
    return new Response(null, {
      status: 416,
      headers: {
        'Accept-Ranges': 'bytes',
        'Content-Range': `bytes */${body.byteLength}`
      }
    });
  }

  const headers = new Headers(fullResponse.headers);
  headers.delete('content-encoding');
  headers.set('accept-ranges', 'bytes');
  headers.set('content-range', `bytes ${range.start}-${range.end}/${body.byteLength}`);
  headers.set('content-length', String(range.end - range.start + 1));
  return new Response(body.slice(range.start, range.end + 1), {
    status: 206,
    statusText: 'Partial Content',
    headers
  });
}

// Assets that must be available for the shell to boot at all. If any of these
// fails to cache during install, the new Service Worker is genuinely broken and
// must not activate.
const ESSENTIAL_CORE_ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './css/style.css?v=20260727-compact-panel',
  './js/modules/i18n.js',
  './js/modules/file-validation.js',
  './js/collapsible.js',
  './js/modules/settings-manager.js',
  './js/modules/storage-manager.js',
  './js/drawing.js',
  './js/history.js',
  './js/background.js',
  './js/image-controls.js',
  './js/modules/alignment-guides.js',
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
  './js/modules/classroom-mode.js',
  './js/modules/tool-runtime.js',
  './js/modules/ui-listeners-core-runtime.js',
  './js/main.js',
  './js/modules/pwa-manager.js',
  './js/modules/help-system.js',
  './js/time-display.js',
  './js/modules/time-display-controls.js',
  './js/modules/time-display-settings.js',
  './js/modules/coordinate-panel-runtime.js',
  './js/modules/overlay-ui-runtime.js',
  './js/modules/ui-listeners-runtime.js',
  './js/modules/font-management-runtime.js',
  './js/modules/config-import-runtime.js',
  './js/modules/background-ui-runtime.js',
  './js/modules/cache-runtime.js',
  './js/modules/customization-runtime.js',
  './js/modules/uploaded-images-runtime.js',
  './js/modules/coordinate-origin-runtime.js',
  './js/modules/coordinate-tools-runtime.js',
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

async function precacheOptionalAsset(cache, asset) {
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
}

async function precacheOptionalAssets(cache, optionalAssets) {
  if (!optionalAssets.length) {
    return;
  }

  let nextAssetIndex = 0;
  const workerCount = Math.min(OPTIONAL_PRECACHE_CONCURRENCY, optionalAssets.length);
  const workers = Array.from({ length: workerCount }, async () => {
    while (nextAssetIndex < optionalAssets.length) {
      const asset = optionalAssets[nextAssetIndex];
      nextAssetIndex += 1;
      await precacheOptionalAsset(cache, asset);
    }
  });

  await Promise.all(workers);
}

async function precacheCoreAssets(cache) {
  // Atomic: essentials must all succeed or the install fails cleanly.
  // cache: 'reload' bypasses the HTTP cache — with max-age still fresh, the
  // default mode would seed the new version's cache with stale files and the
  // app would then run mixed old/new code until the next version bump.
  const essentialRequests = typeof Request === 'function'
    ? ESSENTIAL_CORE_ASSETS.map((asset) => new Request(asset, { cache: 'reload' }))
    : ESSENTIAL_CORE_ASSETS;
  await cache.addAll(essentialRequests);

  // Best-effort: individual failures (renamed file, temporary 404) warn and move
  // on instead of poisoning the whole install. First-use traffic will still
  // populate the runtime cache via the fetch handler.
  const optionalAssets = CORE_ASSETS.filter((asset) => !ESSENTIAL_CORE_ASSETS.includes(asset));
  await precacheOptionalAssets(cache, optionalAssets);
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
  // The page's "clear cache" action deletes our versioned caches, but install
  // (the only precache trigger) never re-fires for the same SW version — so
  // the page asks us to rebuild the core cache explicitly.
  if (event.data && event.data.type === 'REBUILD_PRECACHE') {
    event.waitUntil(
      caches.open(CORE_CACHE_NAME)
        .then((cache) => precacheCoreAssets(cache))
        .catch((error) => {
          console.warn('Failed to rebuild core precache:', error);
        })
    );
  }
});

self.addEventListener('activate', event => {
  const cacheWhitelist = [CORE_CACHE_NAME, RUNTIME_CACHE_NAME, MEDIA_CACHE_NAME];
  event.waitUntil(
    caches.keys().then(cacheNames => Promise.all(
      cacheNames.map(cacheName => {
        // Only clean up our own versioned caches. caches.keys() is
        // origin-wide, so deleting every unknown name would wipe the caches
        // of other apps deployed on the same origin (e.g. GitHub Pages
        // project sites).
        if (cacheName.startsWith('aboard-') && !cacheWhitelist.includes(cacheName)) {
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

  if (isMediaAssetUrl(url)) {
    event.respondWith(handleMediaRequest(request));
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
    event.respondWith(navigationNetworkFirst(request, { event }));
    return;
  }

  if (!isRuntimeCacheableRequest(request, url)) {
    return;
  }

  event.respondWith(cacheFirst(request));
});
