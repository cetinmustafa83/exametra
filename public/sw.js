// CompetenceTrack — Service Worker for PWA Offline Support
const CACHE_NAME = 'competencetrack-v3';
const STATIC_CACHE = 'competencetrack-static-v3';
const DATA_CACHE = 'competencetrack-data-v3';
const OFFLINE_CACHE = 'competencetrack-offline-v3';

// Static assets to cache on install
const STATIC_ASSETS = [
  '/',
  '/manifest.json',
  '/logo.svg',
  '/robots.txt',
];

// Install event — cache static assets and offline fallback
self.addEventListener('install', (event) => {
  event.waitUntil(
    Promise.all([
      caches.open(STATIC_CACHE).then((cache) => {
        return cache.addAll(STATIC_ASSETS).catch((err) => {
          console.warn('[SW] Some static assets failed to cache:', err);
        });
      }),
      caches.open(OFFLINE_CACHE).then((cache) => {
        return cache.add('/').catch(() => {
          // Fallback: just create the cache
        });
      }),
    ]).then(() => {
      console.log('[SW] Installed and caches populated');
      return self.skipWaiting();
    })
  );
});

// Activate event — clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME && key !== STATIC_CACHE && key !== DATA_CACHE && key !== OFFLINE_CACHE)
          .map((key) => caches.delete(key))
      );
    }).then(() => {
      console.log('[SW] Activated and old caches cleaned');
      return self.clients.claim();
    })
  );
});

// Fetch event — routing strategy
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests (POST, PUT, DELETE) — handle with background sync
  if (request.method !== 'GET') {
    // Queue write operations for background sync
    if (navigator.onLine === false) {
      event.respondWith(
        new Response(JSON.stringify({ queued: true, offline: true }), {
          status: 202,
          headers: { 'Content-Type': 'application/json' },
        })
      );
      // Store the request for later sync
      storeRequestForSync(request);
      return;
    }
    return; // Let non-GET requests go through normally when online
  }

  // Skip chrome-extension and other non-http requests
  if (!url.protocol.startsWith('http')) return;

  // API data requests — NetworkFirst strategy
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(networkFirstStrategy(request, DATA_CACHE));
    return;
  }

  // Never cache /_next/ paths — Turbopack recompiles frequently and cached chunks
  // cause "module factory is not available" errors. Always fetch from network.
  if (url.pathname.startsWith('/_next/')) {
    event.respondWith(
      fetch(request).catch(() => new Response('Offline', { status: 503 }))
    );
    return;
  }

  // Static assets (CSS, JS, images) from other origins — CacheFirst strategy
  if (
    url.pathname.endsWith('.css') ||
    url.pathname.endsWith('.js')
  ) {
    event.respondWith(networkFirstStrategy(request, STATIC_CACHE));
    return;
  }
  if (
    url.pathname.endsWith('.png') ||
    url.pathname.endsWith('.jpg') ||
    url.pathname.endsWith('.svg') ||
    url.pathname.endsWith('.ico') ||
    url.pathname.endsWith('.woff2') ||
    url.pathname.endsWith('.woff')
  ) {
    event.respondWith(cacheFirstStrategy(request, STATIC_CACHE));
    return;
  }

  // Navigation requests — NetworkFirst with offline fallback
  if (request.mode === 'navigate') {
    event.respondWith(networkFirstWithOfflineFallback(request));
    return;
  }

  // Default: NetworkFirst
  event.respondWith(networkFirstStrategy(request, CACHE_NAME));
});

// NetworkFirst strategy — try network, fall back to cache
async function networkFirstStrategy(request, cacheName) {
  try {
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch (error) {
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    // Return offline response for API calls
    if (new URL(request.url).pathname.startsWith('/api/')) {
      return new Response(JSON.stringify({ error: 'offline', message: 'No cached data available' }), {
        status: 503,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    return new Response('Offline', { status: 503 });
  }
}

// CacheFirst strategy — try cache, fall back to network
async function cacheFirstStrategy(request, cacheName) {
  const cachedResponse = await caches.match(request);
  if (cachedResponse) {
    return cachedResponse;
  }
  try {
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch (error) {
    // No cache and no network
    return new Response('Offline', { status: 503 });
  }
}

// NetworkFirst with offline fallback page
async function networkFirstWithOfflineFallback(request) {
  try {
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch (error) {
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    // Fall back to cached root page
    const fallbackResponse = await caches.match('/');
    if (fallbackResponse) {
      return fallbackResponse;
    }
    return new Response('Offline — Please check your connection', {
      status: 503,
      headers: { 'Content-Type': 'text/html' },
    });
  }
}

// Store failed requests for background sync
async function storeRequestForSync(request) {
  const db = await openIndexedDB();
  const tx = db.transaction('pending-requests', 'readwrite');
  const store = tx.objectStore('pending-requests');
  const requestData = {
    url: request.url,
    method: request.method,
    headers: Object.fromEntries(request.headers.entries()),
    body: await request.text().catch(() => ''),
    timestamp: Date.now(),
  };
  store.add(requestData);
  await tx.done;

  // Register for background sync
  self.registration.sync.register('competencetrack-sync');
}

// Open IndexedDB for storing pending requests
function openIndexedDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('competencetrack-sync-db', 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains('pending-requests')) {
        db.createObjectStore('pending-requests', { keyPath: 'timestamp' });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

// Background sync event — replay queued requests when back online
self.addEventListener('sync', (event) => {
  if (event.tag === 'competencetrack-sync') {
    event.waitUntil(replayPendingRequests());
  }
});

async function replayPendingRequests() {
  const db = await openIndexedDB();
  const tx = db.transaction('pending-requests', 'readwrite');
  const store = tx.objectStore('pending-requests');
  const allRequests = await store.getAll();

  for (const reqData of allRequests) {
    try {
      const headers = new Headers(reqData.headers);
      const response = await fetch(reqData.url, {
        method: reqData.method,
        headers,
        body: reqData.method !== 'GET' ? reqData.body : undefined,
      });
      if (response.ok) {
        store.delete(reqData.timestamp);
      }
    } catch (error) {
      console.warn('[SW] Failed to replay request:', error);
      // Keep the request in the store for next sync attempt
    }
  }
  await tx.done;
}

// Push event — show notification (if push notifications are configured)
self.addEventListener('push', (event) => {
  if (!event.data) return;
  const data = event.data.json();
  const options = {
    body: data.message || '',
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    vibrate: [100, 50, 100],
    data: {
      url: data.url || '/',
    },
  };
  event.waitUntil(
    self.registration.showNotification(data.title || 'CompetenceTrack', options)
  );
});

// Notification click — open the app
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = event.notification.data?.url || '/';
  event.waitUntil(
    self.clients.matchAll({ type: 'window' }).then((clients) => {
      // Focus existing window if available
      for (const client of clients) {
        if (client.url.includes(url) && 'focus' in client) {
          return client.focus();
        }
      }
      // Open new window
      return self.clients.openWindow(url);
    })
  );
});

// Message event — handle messages from the app
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  if (event.data && event.data.type === 'CLEAR_CACHES') {
    caches.keys().then((keys) => {
      Promise.all(keys.map((key) => caches.delete(key))).then(() => {
        console.log('[SW] All caches cleared');
      });
    });
  }
  if (event.data && event.data.type === 'CACHE_URLS') {
    const urls = event.data.urls || [];
    caches.open(STATIC_CACHE).then((cache) => {
      cache.addAll(urls).catch((err) => {
        console.warn('[SW] Failed to cache URLs:', err);
      });
    });
  }
});
