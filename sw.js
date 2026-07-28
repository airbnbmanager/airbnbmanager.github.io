const CACHE_NAME = 'uhhs-live-v153';
const RUNTIME_CACHE = 'uhhs-runtime-v49';

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
  '/js/notifications.js',
  '/js/chat.js'
];

self.addEventListener('install', event => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(CORE_ASSETS).catch(() => {}))
  );
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(
      keys.filter(k => k !== CACHE_NAME && k !== RUNTIME_CACHE).map(k => caches.delete(k))
    );
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', event => {
  const req = event.request;

  // Only GET
  if (req.method !== 'GET') {
    event.respondWith(fetch(req));
    return;
  }

  const url = new URL(req.url);

  // Supabase REST: Network first, cache last-good response for offline
  if (url.hostname.includes('supabase.co') || url.hostname.includes('supabase.in')) {
    // Realtime WebSocket - always network
    if (url.pathname.includes('realtime')) {
      event.respondWith(fetch(req));
      return;
    }
    // REST API: network first, fallback to cache
    event.respondWith(
      fetch(req)
        .then(res => {
          if (res && res.status === 200 && req.method === 'GET') {
            const clone = res.clone();
            caches.open(RUNTIME_CACHE).then(cache => {
              try { cache.put(req, clone); } catch(e) {}
            });
          }
          return res;
        })
        .catch(() => {
          return caches.match(req).then(cached => {
            if (cached) {
              console.log('📴 Serving from cache:', url.pathname);
              return cached;
            }
            return new Response(JSON.stringify({ offline: true, data: [] }), {
              headers: { 'Content-Type': 'application/json' }
            });
          });
        })
    );
    return;
  }

  // Static assets: cache first
  event.respondWith(
    caches.match(req).then(cached => {
      const fetchPromise = fetch(req)
        .then(res => {
          if (res && res.status === 200) {
            const clone = res.clone();
            caches.open(CACHE_NAME).then(cache => {
              try { cache.put(req, clone); } catch(e) {}
            });
          }
          return res;
        })
        .catch(() => cached || new Response('Offline', { status: 503 }));
      return cached || fetchPromise;
    })
  );
});
