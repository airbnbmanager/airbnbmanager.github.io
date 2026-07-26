const CACHE_NAME = 'uhhs-live-v46';

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
  '/js/reconciliation.js',
  '/js/notifications.js'
];

self.addEventListener('install', event => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(CORE_ASSETS).catch(()=>{}))
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
  const req = event.request;

  // Only cache GET requests (not PATCH, DELETE, POST)
  if (req.method !== 'GET') {
    event.respondWith(fetch(req));
    return;
  }

  // Don't cache Supabase API or realtime
  const url = new URL(req.url);
  if (url.hostname.includes('supabase.co') || url.hostname.includes('supabase.in')) {
    event.respondWith(fetch(req));
    return;
  }

  event.respondWith(
    fetch(req)
      .then(res => {
        // Only cache successful GET responses
        if (res && res.status === 200 && req.method === 'GET') {
          const clone = res.clone();
          caches.open(CACHE_NAME).then(cache => {
            try { cache.put(req, clone); } catch(e) {}
          });
        }
        return res;
      })
      .catch(() => caches.match(req))
  );
});
