const CACHE_NAME = 'aboard-v1';
const urlsToCache = [
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
  './css/modules/project.css',
  './css/modules/toast.css',
  './css/modules/diff.css',
  './js/drawing.js',
  './js/history.js',
  './js/background.js',
  './js/image-controls.js',
  './js/insert-image.js',
  './js/stroke-controls.js',
  './js/collapsible.js',
  './js/time-display.js',
  './js/modules/time-display-controls.js',
  './js/modules/time-display-settings.js',
  './js/modules/timer.js',
  './js/modules/edge-drawing.js',
  './js/modules/teaching-tools.js',
  './js/modules/shape-drawing.js',
  './js/modules/line-style-modal.js',
  './js/modules/random-picker.js',
  './js/modules/scoreboard.js',
  './js/modules/settings-manager.js',
  './js/announcement.js',
  './js/export.js',
  './js/modules/i18n.js',
  './js/modules/rich-text-parser.js',
  './js/modules/script-loader.js',
  './js/modules/gif-manager.js',
  './js/modules/browser-check.js',
  './js/modules/help-system.js',
  './js/modules/storage-manager.js',
  './js/modules/project-manager.js',
  './js/modules/toast-manager.js',
  './js/main.js',
  './js/modules/pwa-manager.js'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Opened cache');
        return cache.addAll(urlsToCache);
      })
  );
});

self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

self.addEventListener('activate', event => {
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        if (response) {
          return response;
        }
        return fetch(event.request);
      })
  );
});
