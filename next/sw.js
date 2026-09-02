/**
 * Service worker for the web build — plan task 4.10, and the parity item
 * "installable PWA, service worker, cached app shell".
 *
 * **Deliberately not v1.11.0's.** The old worker pre-caches a fixed list — one
 * `index.html` and three icons — because the old app *is* one HTML file. This
 * build is a static export whose filenames carry content hashes
 * (`entry-1e0083….js`), so a hardcoded list would be stale on every deploy and
 * would cache a bundle that no longer exists.
 *
 * ── What this caches, and what it deliberately does not ──────────────
 * **The app shell only**: the HTML documents and the hashed JS and asset files,
 * cached the first time they are fetched. That makes the app open when the
 * network is slow or gone.
 *
 * **Never Supabase.** Every request to the API is passed straight to the
 * network. That is decision Q7 — cached reads come from TanStack Query's own
 * persisted cache, which knows what a workspace is and can be cleared on sign
 * out. A service worker caching API responses would serve one person's business
 * data to the next person to sign in on the same device, and would keep serving
 * a stale tax figure with no way to tell it was stale.
 *
 * ── Stale-while-revalidate, not cache-first ──────────────────────────
 * A cache-first worker on a hashed bundle is safe but leaves the *HTML*
 * pointing at an old bundle until the cache is cleared, which is how a PWA gets
 * stuck a version behind. This serves the cache immediately and refreshes it in
 * the background, so a reload after a deploy gets the new build.
 */

const CACHE = 'printflow-shell-v2';

self.addEventListener('install', (event) => {
  // Nothing to pre-cache: the filenames are content-hashed and only the build
  // knows them. The first visit populates the cache as it loads.
  event.waitUntil(self.skipWaiting());
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const request = event.request;

  // Only GETs, and only this origin. A POST is never idempotent and another
  // origin is Supabase or Google — see the header.
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  event.respondWith(
    caches.open(CACHE).then(async (cache) => {
      const cached = await cache.match(request);

      const network = fetch(request)
        .then((response) => {
          // Only cache a real success. Caching a 404 or an opaque redirect is
          // how a PWA starts serving an error page it cannot forget.
          if (response.ok && response.type === 'basic') {
            void cache.put(request, response.clone());
          }
          return response;
        })
        .catch(() => cached);

      // Cache first for speed, network in the background to stay current.
      return cached ?? network;
    }),
  );
});
