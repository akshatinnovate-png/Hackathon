/* Service worker: caches the app shell so FocusList works offline.
 * Strategy: cache-first for same-origin GET requests, refreshed in the background. */
const CACHE = 'focuslist-v2';
const SHELL = [
  './',
  'index.html',
  'manifest.webmanifest',
  'favicon.svg',
  'icon-192.png',
  'icon-512.png',
  'tokens.css',
  'base.css',
  'layout.css',
  'components.css',
  'main.js',
  'config.js',
  'utils.js',
  'taskModel.js',
  'filters.js',
  'storage.js',
  'store.js',
  'timer.js',
  'cosmos-starfield.js',
  'cosmos-constellation.js',
  'ui-announcer.js',
  'ui-dataMenu.js',
  'ui-dialogs.js',
  'ui-filters.js',
  'ui-forms.js',
  'ui-shortcuts.js',
  'ui-summary.js',
  'ui-taskList.js',
  'ui-timerPanel.js',
  'ui-toast.js',
];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET' || new URL(request.url).origin !== self.location.origin) return;
  event.respondWith(
    caches.match(request).then((cached) => {
      const refresh = fetch(request)
        .then((response) => {
          if (response.ok) caches.open(CACHE).then((cache) => cache.put(request, response.clone()));
          return response;
        })
        .catch(() => cached);
      return cached || refresh;
    }),
  );
});
