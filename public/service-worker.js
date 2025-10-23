// public/service-worker.js
const VERSION = 'v5'; // bei Änderungen hochzählen, um alten Cache zu invalidieren
const STATIC_CACHE = `static-${VERSION}`;
const RUNTIME_CACHE = `runtime-${VERSION}`;

// Kern-Dateien, die immer gebraucht werden
const CORE_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  // Deine Icons anpassen:
  'icons/192x192.png',
  'icons/512x512.png',
];

// Hilfsfunktion: gleich-origin?
const isSameOrigin = (url) => {
  try {
    const u = new URL(url, self.location.origin);
    return u.origin === self.location.origin;
  } catch (_) {
    return false;
  }
};

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => cache.addAll(CORE_ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((k) => k !== STATIC_CACHE && k !== RUNTIME_CACHE)
          .map((k) => caches.delete(k))
      )
    )
  );
  self.clients.claim();
});

// Strategien:
// - Navigationsanfragen: Network-first, Fallback auf gecachtes index.html (SPA)
// - Statische Assets (/assets/*.js|css, Bilder, Fonts): Stale-While-Revalidate
// - Andere same-origin Requests: Cache-first mit Netz-Fallback
self.addEventListener('fetch', (event) => {
  const { request } = event;

  // Nur http/https
  if (!request.url.startsWith('http')) return;

  const url = new URL(request.url);

  // 1) Navigationsanfragen (SPA)
  if (request.mode === 'navigate') {
    event.respondWith(
      (async () => {
        try {
          const net = await fetch(request);
          // Erfolgreiche Antwort -> optional in Runtime-Cache legen
          const cache = await caches.open(RUNTIME_CACHE);
          cache.put('/index.html', net.clone());
          return net;
        } catch {
          const cache = await caches.open(STATIC_CACHE);
          const cached = await cache.match('/index.html');
          return cached || new Response('Offline', { status: 503 });
        }
      })()
    );
    return;
  }

  // 2) Vite-Bundles & Assets (z. B. /assets/xxx.[hash].js, .css, Bilder)
  if (isSameOrigin(url.href) && url.pathname.startsWith('/assets/')) {
    event.respondWith(
      (async () => {
        const cache = await caches.open(RUNTIME_CACHE);
        const cached = await cache.match(request);
        if (cached) {
          // parallel aktualisieren
          fetch(request).then((res) => {
            if (res && res.ok) cache.put(request, res.clone());
          }).catch(()=>{});
          return cached;
        }
        try {
          const res = await fetch(request);
          if (res && res.ok) await cache.put(request, res.clone());
          return res;
        } catch (e) {
          return new Response('Asset unreachable offline', { status: 504 });
        }
      })()
    );
    return;
  }

  // 3) Sonstige Same-Origin-Requests: Cache-first, dann Netz
  if (isSameOrigin(url.href)) {
    event.respondWith(
      (async () => {
        const cache = await caches.open(RUNTIME_CACHE);
        const cached = await cache.match(request);
        if (cached) return cached;
        try {
          const res = await fetch(request);
          if (res && res.ok) await cache.put(request, res.clone());
          return res;
        } catch {
          return new Response('', { status: 504 });
        }
      })()
    );
  }
});
