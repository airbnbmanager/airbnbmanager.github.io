const CACHE_NAME = 'tuhh-live-v242';
const RUNTIME_CACHE = 'tuhh-runtime-v118';

const CORE_ASSETS = [
  '/admin.html',
  '/review.html',
  '/guest.html',
  '/book.html',
  '/book.css',
  '/book.js',
  '/calendar.html',
  '/style.css',
  '/config.js',
  '/manifest.json',
  '/assets/logo.png',
  '/assets/signature-stamp.svg',
  '/assets/icon-192.png',
  '/assets/icon-512.png',
  '/js/core.js',
  '/js/dashboard.js',
  '/js/calendar.js',
  '/js/bookings.js',
  '/js/smart-bookings.js',
  '/js/booking-receipt.js',
  '/js/gst-invoice.js',
  '/js/ca-audit-pack.js',
  '/js/properties.js',
  '/js/employees.js',
  '/js/expenses.js',
  '/js/store.js',
  '/js/maintenance.js',
  '/js/investors.js',
  '/js/sop.js',
  '/js/whatsapp.js',
  '/js/whatsapp-hub.js',
  '/js/reconciliation.js',
  '/js/notifications.js',
  '/js/claims.js',
  '/js/uhhs-od-manager.js',
  '/js/cashbook.js',
  '/js/company-advances.js',
  '/js/analytics.js',
  '/js/showcase-data.js'
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

  // JS Scripts & Versioned assets: Network-first to always run latest logic
  if (url.pathname.endsWith('.js') || url.search.includes('v=')) {
    event.respondWith(
      fetch(req)
        .then(res => {
          if (res && res.status === 200) {
            const clone = res.clone();
            caches.open(CACHE_NAME).then(cache => {
              try { cache.put(req, clone); } catch(e) {}
            });
          }
          return res;
        })
        .catch(() => caches.match(req).then(cached => cached || new Response('Offline', { status: 503 })))
    );
    return;
  }

  // Other static assets (images, css): cache first
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

// ═══════════════════════════════════════════════════════════
// 🔔 PWA NATIVE PUSH & NOTIFICATION HANDLING
// ═══════════════════════════════════════════════════════════

self.addEventListener('push', event => {
  let data = {};
  if (event.data) {
    try {
      data = event.data.json();
    } catch(e) {
      data = { title: 'UHHS Alert', body: event.data.text() };
    }
  }

  const title = data.title || 'The Unique Haven Homes';
  const options = {
    body: data.body || data.message || 'New update from UHHS CRM',
    icon: data.icon || '/assets/icon-192.png',
    badge: '/assets/logo.png',
    tag: data.tag || ('uhhs-notif-' + Date.now()),
    data: data,
    vibrate: [100, 50, 100],
    requireInteraction: true,
    actions: [
      { action: 'open', title: 'Open UHHS' },
      { action: 'dismiss', title: 'Dismiss' }
    ]
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  const d = event.notification.data || {};
  let targetUrl = '/admin.html';
  if (d.page === 'bookings' || d.entityType === 'booking') {
    targetUrl = '/admin.html#bookings';
  } else if (d.page === 'store') {
    targetUrl = '/admin.html#store';
  } else if (d.page === 'expenses') {
    targetUrl = '/admin.html#expenses';
  }

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clientList => {
      for (const client of clientList) {
        if (client.url.includes('admin.html') && 'focus' in client) {
          if (d.entityId) {
            client.postMessage({ type: 'OPEN_NOTIFICATION_TARGET', data: d });
          }
          return client.focus();
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }
    })
  );
});

self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SHOW_NATIVE_NOTIF') {
    const n = event.data.payload || {};
    self.registration.showNotification(n.title || 'The Unique Haven Homes', {
      body: n.body || n.message || '',
      icon: n.icon || '/assets/icon-192.png',
      badge: '/assets/logo.png',
      tag: n.tag || ('uhhs-' + Date.now()),
      data: n,
      vibrate: [100, 50, 100],
      requireInteraction: false
    });
  }
});

