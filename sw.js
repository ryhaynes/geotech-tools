// Geotech Tools — Service Worker
// ─────────────────────────────────────────────────────────────────
// IMPORTANT: Bump CACHE version string on every deployment.
// This is what forces users' browsers to evict stale files and
// re-download everything fresh. If you update any pre-cached file
// and forget to bump this, field devices keep running the old version.
//
//   Format: 'geotools-v<major>.<minor>'
//   Rule of thumb: "Did I edit ANY html tool, font, vendor lib, or
//   the manifest? Bump the version."
// ─────────────────────────────────────────────────────────────────
const CACHE = 'geotools-v2.4';

// ── PRE-CACHED ASSETS ─────────────────────────────────────────────
// P1-3: the FULL suite is now pre-cached (review finding: only 4
// files were cached, and most tools never registered the SW at all).
// Everything is local-origin — no CDN URLs (P1-4): fonts and JS
// libraries are vendored under ./fonts/ and ./vendor/.
const ASSETS = [
  './index.html',
  // Field tools
  './fieldlog-v2.html',
  './daily-log.html',
  './infiltration-test-log.html',
  './pebble-count-tool.html',
  // Engineering calculators
  './shear-strength-correlation-calculator.html',
  './es-correlation-calculator.html',
  './earth-pressure-calculator.html',
  './hs-model-calculator.html',
  './pile-corrosion-calculator.html',
  './drilled-shaft-capacity-calculator.html',
  './micropile-capacity-calculator.html',
  // Label wizards
  './box-label-wizard.html',
  './jar-label-wizard.html',
  // PWA metadata + icons
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
  // Vendored libraries (P1-4 — formerly cdnjs / Google CDN)
  // Note: SheetJS (xlsx) is loaded from cdnjs at runtime — see fieldlog-v2.html.
  //       It is intentionally excluded from the precache because the file is not
  //       tracked in the git repo. Export/import require an internet connection.
  './vendor/chart.umd.js',
  // Self-hosted IBM Plex fonts (P1-4 — formerly Google Fonts)
  './fonts/fonts.css',
  './fonts/IBMPlexMono-latin-0bc96cd0.woff2',
  './fonts/IBMPlexMono-latin-1b581b15.woff2',
  './fonts/IBMPlexMono-latin-e2661bcc.woff2',
  './fonts/IBMPlexMono-latin-ext-1969f6ff.woff2',
  './fonts/IBMPlexMono-latin-ext-93cfae71.woff2',
  './fonts/IBMPlexMono-latin-ext-a7353317.woff2',
  './fonts/IBMPlexSans-latin-868a235a.woff2',
  './fonts/IBMPlexSans-latin-ext-632855d1.woff2',
  './fonts/IBMPlexSansCondensed-latin-7f54abf0.woff2',
  './fonts/IBMPlexSansCondensed-latin-922c4bf8.woff2',
  './fonts/IBMPlexSansCondensed-latin-ext-12ce4ea7.woff2',
  './fonts/IBMPlexSansCondensed-latin-ext-c21fb667.woff2'
];

// ── INSTALL ───────────────────────────────────────────────────────
// Pre-caches all listed assets so every tool is available offline.
// If any asset fails to fetch, the entire install fails — the user
// is never left with a broken or partial cache.
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE)
      .then(cache => cache.addAll(ASSETS))
      .then(() => self.skipWaiting()) // activate immediately
  );
});

// ── ACTIVATE ──────────────────────────────────────────────────────
// Deletes all caches from prior versions so stale files don't
// linger on field devices after a version bump.
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys =>
        Promise.all(
          keys
            .filter(key => key !== CACHE)
            .map(key => caches.delete(key))
        )
      )
      .then(() => self.clients.claim())
  );
});

// ── FETCH ─────────────────────────────────────────────────────────
// Strategy: Cache First for same-origin app assets.
//
// P1-1: anything under /.auth/ is Azure Static Web Apps' built-in
// auth endpoint (login, logout, /.auth/me token introspection).
// Those responses must NEVER be cached or answered from cache —
// they are network-only, full stop.
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // Auth endpoints: network-only, never cached (P1-1)
  if (url.pathname.startsWith('/.auth/')) {
    return; // let the browser handle it normally
  }

  // Only handle same-origin GETs; everything else goes to the network untouched.
  if (event.request.method !== 'GET' || url.origin !== self.location.origin) {
    return;
  }

  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached;

      return fetch(event.request).then(response => {
        // Only cache clean, successful responses.
        if (!response || response.status !== 200 || response.type === 'error') {
          return response;
        }
        const toCache = response.clone();
        caches.open(CACHE).then(cache => cache.put(event.request, toCache));
        return response;
      }).catch(() => {
        // Network failed and nothing in cache.
        if (event.request.destination === 'document') {
          return caches.match('./index.html');
        }
      });
    })
  );
});
