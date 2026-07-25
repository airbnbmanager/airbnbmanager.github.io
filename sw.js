const CACHE_NAME = 'uhhs-live-v29';

const CORE_ASSETS = [
  '/admin.html',
  '/style.css',
  '/config.js',
  '/manifest.json',
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
  '/js/whatsapp.js',
  '/js/reconciliation.js'
];

self.addEventListener('install', event => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(CORE_ASSETS))
  );
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(
      keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
    );
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', event => {
  event.respondWith(
    fetch(event.request)
      .then(res => {
        const clone = res.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        return res;
      })
      .catch(() => caches.match(event.request))
  );
});
