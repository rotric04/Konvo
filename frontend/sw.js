// frontend/sw.js - Konvo Service Worker v3
// Strategy: Network-first for HTML/API, Cache-first for static assets

const CACHE_VERSION = 'konvo-v3';
const STATIC_CACHE = `${CACHE_VERSION}-static`;
const DYNAMIC_CACHE = `${CACHE_VERSION}-dynamic`;

// Core shell assets to precache on install
const PRECACHE_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/favicon.svg',
  '/favicon.png',
  '/logo_dark.svg',
  '/logo_light.svg',
  '/src/styles/tokens.css',
  '/src/styles/animations.css',
  '/src/styles/components.css',
  '/src/styles/layout.css',
  '/src/styles/landing.css',
  '/style.css',
  '/theme.css',
  '/offline.html'
];

// App shell routes (served from cache-first when offline)
const APP_SHELL_ROUTES = [
  '/discover',
  '/chat',
  '/grid',
  '/profile',
  '/settings',
  '/agents',
  '/compatibility',
  '/communities',
  '/graph',
  '/virtual-dates'
];

// ─── Install ──────────────────────────────────────────────────────────────────
self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => {
      // Precache assets individually so one failure doesn't block the whole install
      return Promise.allSettled(
        PRECACHE_ASSETS.map(url =>
          cache.add(url).catch(err => console.warn(`[SW] Precache failed for ${url}:`, err))
        )
      );
    }).then(() => self.skipWaiting())
  );
});

// ─── Activate ─────────────────────────────────────────────────────────────────
self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.map((key) => {
          // Delete caches from previous versions
          if (key !== STATIC_CACHE && key !== DYNAMIC_CACHE) {
            console.log('[SW] Deleting old cache:', key);
            return caches.delete(key);
          }
        })
      )
    ).then(() => self.clients.claim())
  );
});

// ─── Fetch Strategy ───────────────────────────────────────────────────────────
self.addEventListener('fetch', (e) => {
  const { request } = e;
  const url = new URL(request.url);

  // 1. Skip non-GET requests entirely
  if (request.method !== 'GET') return;

  // 2. Skip cross-origin requests (CDNs, Cloudflare, analytics)
  if (url.origin !== self.location.origin) return;

  // 3. Skip API and WebSocket routes - always go to network
  if (url.pathname.startsWith('/api/') || url.pathname.startsWith('/ws/')) return;

  // 4. Skip Vercel internal routes
  if (url.pathname.startsWith('/_vercel/')) return;

  // 5. Security verification page - never cache (to avoid loop)
  if (url.pathname === '/security-verification.html') return;

  // 6. Cache-First for static assets (images, fonts, CSS, JS)
  const isStaticAsset = (
    request.destination === 'image' ||
    request.destination === 'font' ||
    request.destination === 'style' ||
    /\.(png|jpg|jpeg|gif|svg|webp|ico|woff2?|ttf|eot)$/.test(url.pathname)
  );

  if (isStaticAsset) {
    e.respondWith(
      caches.match(request).then((cached) => {
        if (cached) return cached;
        return fetch(request).then((res) => {
          if (res && res.status === 200) {
            const clone = res.clone();
            caches.open(STATIC_CACHE).then(c => c.put(request, clone));
          }
          return res;
        }).catch(() => cached);
      })
    );
    return;
  }

  // 7. Network-First with offline fallback for HTML pages
  e.respondWith(
    fetch(request)
      .then((res) => {
        // Cache successful HTML responses dynamically
        if (res && res.status === 200 && res.type !== 'opaque') {
          const clone = res.clone();
          caches.open(DYNAMIC_CACHE).then(c => c.put(request, clone));
        }
        return res;
      })
      .catch(async () => {
        // Offline: try cache, then offline page
        const cached = await caches.match(request);
        if (cached) return cached;

        // For app shell routes, serve /pages/app.html from cache
        const isAppRoute = APP_SHELL_ROUTES.some(r => url.pathname.startsWith(r));
        if (isAppRoute) {
          const appShell = await caches.match('/pages/app.html');
          if (appShell) return appShell;
        }

        // Last resort: offline fallback page
        const offline = await caches.match('/offline.html');
        if (offline) return offline;

        // Bare minimum response
        return new Response(
          '<html><body style="font-family:sans-serif;background:#050508;color:#fff;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;flex-direction:column;gap:1rem"><h1>You\'re offline</h1><p style="color:#8b8ba0">Check your connection and try again.</p></body></html>',
          { headers: { 'Content-Type': 'text/html' } }
        );
      })
  );
});

// ─── Push Notifications (future-ready) ───────────────────────────────────────
self.addEventListener('push', (e) => {
  if (!e.data) return;
  try {
    const data = e.data.json();
    e.waitUntil(
      self.registration.showNotification(data.title || 'Konvo', {
        body: data.body || 'You have a new notification.',
        icon: '/favicon.png',
        badge: '/favicon.png',
        tag: data.tag || 'konvo-notification',
        data: { url: data.url || '/' }
      })
    );
  } catch (_) { }
});

self.addEventListener('notificationclick', (e) => {
  e.notification.close();
  const url = e.notification.data?.url || '/';
  e.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((cs) => {
      const existing = cs.find(c => c.url.includes(self.location.origin) && 'focus' in c);
      if (existing) return existing.focus().then(c => c.navigate(url));
      return clients.openWindow(url);
    })
  );
});
