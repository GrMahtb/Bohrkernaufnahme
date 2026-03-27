const CACHE_NAME = 'bohrkern-shell-v6';

const SHELL = [
  './',
  './index.html',
  './css/style.css',
  './js/app.js',
  './assets/icon.svg',
  './manifest.webmanifest'
];

// Install: cache was erreichbar ist (ohne Install-Fail bei fehlenden Dateien)
self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    await Promise.allSettled(
      SHELL.map(async (url) => {
        try {
          const res = await fetch(url, { cache: 'no-store' });
          if (res.ok) await cache.put(url, res.clone());
        } catch (_) {}
      })
    );
    self.skipWaiting();
  })());
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.map(k => (k !== CACHE_NAME ? caches.delete(k) : null)));
    self.clients.claim();
  })());
});

// Network-first für CSS/JS, damit Styles nie „stale/kaputt“ bleiben
function isAssetRequest(req) {
  const url = new URL(req.url);
  return url.pathname.endsWith('.css') || url.pathname.endsWith('.js');
}

self.addEventListener('fetch', (event) => {
  const req = event.request;

  // Navigation: network-first, fallback auf cached index
  if (req.mode === 'navigate') {
    event.respondWith((async () => {
      try {
        const fresh = await fetch(req);
        if (fresh && fresh.ok) return fresh;
      } catch (_) {}
      const cache = await caches.open(CACHE_NAME);
      return (await cache.match('./index.html')) || Response.error();
    })());
    return;
  }

  // CSS/JS: network-first
  if (isAssetRequest(req)) {
    event.respondWith((async () => {
      const cache = await caches.open(CACHE_NAME);
      try {
        const fresh = await fetch(req, { cache: 'no-store' });
        if (fresh && fresh.ok) {
          await cache.put(req, fresh.clone());
          return fresh;
        }
      } catch (_) {}
      return (await cache.match(req)) || fetch(req);
    })());
    return;
  }

  // Sonst: cache-first
  event.respondWith((async () => {
    const cache = await caches.open(CACHE_NAME);
    const cached = await cache.match(req);
    if (cached) return cached;

    const fresh = await fetch(req);
    if (fresh && fresh.ok) await cache.put(req, fresh.clone());
    return fresh;
  })());
});
