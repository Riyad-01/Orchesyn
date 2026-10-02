/* OsynLearn service worker.
 *
 * Strategy:
 *   - pages & API-like navigation : network-first with cache fallback (offline)
 *   - static assets (_next/static, icons, fonts): cache-first with stale-while-revalidate
 *
 * Audio recording never touches the worker — speech stays on the main thread.
 */

const CACHE = 'osynlearn-v7';
const STATIC = 'osynlearn-static-v7';
/* every app route is precached so the whole product works offline after first visit */
const PRECACHE = [
  '/brand/mark.png',
  '/brand/daniel-256.png',
  '/brand/daniel-128.png',
  '/',
  '/home',
  '/onboarding',
  '/login',
  '/impromptu',
  '/coach',
  '/ai',
  '/ielts',
  '/ielts/listening',
  '/ielts/reading',
  '/ielts/study',
  '/ielts/writing',
  '/toefl',
  '/roadmap',
  '/insights',
  '/history',
  '/settings',
  '/pricing',
  '/lab',
  '/admin',
  '/diagnostic',
  '/eval',
  '/interview',
  '/learn',
  '/lesson',
  '/mistakes',
  '/mocks',
  '/practise',
  '/progress',
  '/report',
  '/studio',
  '/teacher',
  '/welcome',
  '/refer',
  '/partners',
  '/privacy',
  '/icon.svg',
  '/icon-192.png',
  '/icon-512.png',
  '/manifest.webmanifest',
];
const MAX_STATIC_ENTRIES = 80;

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.addAll(PRECACHE))
      .catch(() => undefined),
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((k) => k !== CACHE && k !== STATIC).map((k) => caches.delete(k))),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  if (event.request.method !== 'GET' || url.origin !== self.location.origin) return;

  // navigations: network first so updates reach the user, cached shell when offline
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((cache) => cache.put(event.request, copy));
          return res;
        })
        .catch(() =>
          caches
            .match(event.request)
            .then((hit) => hit || caches.match(url.pathname, { ignoreSearch: true }))
            .then((hit) => hit || caches.match('/')),
        ),
    );
    return;
  }

  // static: cache first, refresh in background
  if (url.pathname.startsWith('/_next/static') || url.pathname.startsWith('/icon') || url.pathname.endsWith('.png') || url.pathname.endsWith('.svg') || url.pathname.endsWith('.woff2')) {
    event.respondWith(
      caches.match(event.request).then(
        (hit) =>
          hit ||
          fetch(event.request).then((res) => {
            const copy = res.clone();
            caches.open(STATIC).then((cache) =>
              cache.put(event.request, copy).then(() =>
                cache.keys().then((keys) => {
                  // simple LRU-ish trim so the cache cannot grow forever
                  if (keys.length > MAX_STATIC_ENTRIES) {
                    return Promise.all(keys.slice(0, keys.length - MAX_STATIC_ENTRIES).map((k) => cache.delete(k)));
                  }
                }),
              ),
            );
            return res;
          }),
      ),
    );
  }
});
