// frontend/sw.js
const CACHE_NAME = 'konvo-static-v1';
const STATIC_RESOURCES = [
  '/',
  '/auth',
  '/login',
  '/onboarding',
  '/discover',
  '/chat',
  '/grid',
  '/profile',
  '/settings',
  '/agents',
  '/compatibility',
  '/communities',
  '/graph',
  '/virtual-dates',
  '/diagnostics',
  '/ai-diagnostics',
  '/notifications'
];

// Install Event
self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_RESOURCES);
    })
  );
  self.skipWaiting();
});

// Activate Event
self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Fetch Event
self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);

  // Avoid intercepting API calls, WebSockets, or non-GET requests
  if (e.request.method !== 'GET' || url.pathname.startsWith('/api') || url.pathname.startsWith('/ws')) {
    return;
  }

  // 1. Cache-First Strategy for Images
  if (
    e.request.destination === 'image' ||
    url.pathname.endsWith('.png') ||
    url.pathname.endsWith('.jpg') ||
    url.pathname.endsWith('.jpeg') ||
    url.pathname.endsWith('.gif') ||
    url.pathname.endsWith('.svg') ||
    url.pathname.endsWith('.webp')
  ) {
    e.respondWith(
      caches.open(CACHE_NAME).then((cache) => {
        return cache.match(e.request).then((cachedResponse) => {
          if (cachedResponse) {
            return cachedResponse;
          }
          return fetch(e.request).then((networkResponse) => {
            cache.put(e.request, networkResponse.clone());
            return networkResponse;
          });
        });
      })
    );
    return;
  }

  // 2. Stale-While-Revalidate Strategy for HTML, JS, CSS
  e.respondWith(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.match(e.request).then((cachedResponse) => {
        const fetchPromise = fetch(e.request).then((networkResponse) => {
          cache.put(e.request, networkResponse.clone());
          return networkResponse;
        }).catch(() => {
          // Offline fallback
          return cachedResponse;
        });
        return cachedResponse || fetchPromise;
      });
    })
  );
});
