/* ═══════════════════════════════════════════════════
   SERVICE WORKER – Bohrkernansprache ISO 14688
   Repo: GrMahtb/Bohrkernaufnahme
   GitHub Pages: grmahtb.github.io/Bohrkernaufnahme/
   ═══════════════════════════════════════════════════ */

// ── WICHTIG: Version hochzählen um alten Cache zu löschen! ──
const CACHE_NAME = 'bohrkern-v10';

// ── Alle Dateien die offline verfügbar sein sollen ──
const ASSETS = [
  '/Bohrkernaufnahme/',
  '/Bohrkernaufnahme/index.html',
  '/Bohrkernaufnahme/css/style.css',
  '/Bohrkernaufnahme/js/app.js',
  '/Bohrkernaufnahme/assets/icon.svg',
  '/Bohrkernaufnahme/manifest.webmanifest'
];

// ── Installation: Dateien in Cache legen ──
self.addEventListener('install', (event) => {
  console.log('[SW] Install – Cache wird befüllt');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(ASSETS))
      .then(() => self.skipWaiting())
  );
});

// ── Aktivierung: Alte Caches löschen ──
self.addEventListener('activate', (event) => {
  console.log('[SW] Aktiviert – alte Caches werden gelöscht');
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => {
            console.log('[SW] Lösche alten Cache:', key);
            return caches.delete(key);
          })
      )
    ).then(() => self.clients.claim())
  );
});

// ── Fetch: Cache-first Strategie ──
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request)
      .then((cached) => {
        if (cached) {
          return cached;
        }
        return fetch(event.request)
          .then((response) => {
            // Nur gültige Antworten cachen
            if (!response || response.status !== 200 || response.type !== 'basic') {
              return response;
            }
            const responseClone = response.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, responseClone);
            });
            return response;
          })
          .catch(() => {
            // Offline-Fallback: index.html ausliefern
            if (event.request.mode === 'navigate') {
              return caches.match('/Bohrkernaufnahme/index.html');
            }
          });
      })
  );
});
