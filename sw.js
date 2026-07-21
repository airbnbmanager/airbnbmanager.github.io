const CACHE = 'uh-haven-v26';
const STATIC_FILES = [
  '/',
  '/admin.html',
  '/config.js',
  '/style.css',
  '/assets/logo.png',
  '/js/core.js',
  '/js/dashboard.js',
  '/js/calendar.js',
  '/js/bookings.js',
  '/js/properties.js',
  '/js/employees.js',
  '/js/expenses.js',
  '/js/store.js',
  '/js/maintenance.js',
  '/js/investors.js',
  '/js/sop.js',
  '/js/whatsapp.js'
];

self.addEventListener('install', event => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE).then(cache => cache.addAll(STATIC_FILES))
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  const req = event.request;
  const url = new URL(req.url);
  if (url.origin !== location.origin) return;

  if (req.destination === 'document' || req.destination === 'script' || req.destination === 'style') {
    event.respondWith(
      fetch(req).then(res => {
        const copy = res.clone();
        caches.open(CACHE).then(cache => cache.put(req, copy));
        return res;
      }).catch(() => caches.match(req))
    );
    return;
  }

  event.respondWith(
    caches.match(req).then(cached => {
      if (cached) return cached;
      return fetch(req).then(res => {
        const copy = res.clone();
        caches.open(CACHE).then(cache => cache.put(req, copy));
        return res;
      });
    })
  );
});
