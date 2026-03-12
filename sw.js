const CORE_CACHE_NAME = 'aboard-core-v2';
const RUNTIME_CACHE_NAME = 'aboard-runtime-v2';
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
  './js/drawing.js',
  './js/history.js',
  './js/background.js',
  './js/image-controls.js',
  './js/insert-image.js',
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
  './js/modules/dialog-manager.js',
  './js/modules/settings-manager.js',
  './js/announcement.js',
  './js/modules/i18n.js',
  './js/modules/rich-text-parser.js',
  './js/modules/script-loader.js',
  './js/modules/gif-manager.js',
  './js/modules/browser-check.js',
  './js/modules/help-system.js',
  './js/modules/storage-manager.js',
  './js/modules/toast-manager.js',
  './js/modules/pwa-manager.js',
  './js/main.js'
];

function isSameOrigin(requestUrl) {
  return requestUrl.origin === self.location.origin;
}

async function networkFirst(request) {
  const cache = await caches.open(RUNTIME_CACHE_NAME);
  try {
    const response = await fetch(request);
    if (response && response.ok) {
      cache.put(request, response.clone());
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
    cache.put(request, response.clone());
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
    ))
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

  event.respondWith(cacheFirst(request));
});
