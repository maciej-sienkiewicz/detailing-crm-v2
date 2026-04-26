/**
 * Car-logo Service Worker  –  CacheFirst strategy
 *
 * Scope: requests whose URL matches the jsDelivr path for the car-logos dataset.
 *
 * Flow:
 *   1. On first request for a logo → fetch from CDN, clone response into CacheStorage, return it.
 *   2. On subsequent requests → return from CacheStorage immediately (zero network round-trip).
 *   3. Cache is keyed by full URL, so new slugs are cached independently.
 *   4. Increment CACHE_VERSION to evict stale entries (e.g. after a dataset update).
 */

const CACHE_VERSION = 'v1';
const CACHE_NAME    = `car-logos-${CACHE_VERSION}`;

const LOGO_URL_PATTERN = /cdn\.jsdelivr\.net\/gh\/filippofilip95\/car-logos-dataset/;

// ─── Lifecycle ────────────────────────────────────────────────────────────────

self.addEventListener('install', () => {
    // Take control immediately without waiting for existing clients to close.
    self.skipWaiting();
});

self.addEventListener('activate', event => {
    // Delete all caches from previous versions.
    event.waitUntil(
        caches.keys().then(keys =>
            Promise.all(
                keys
                    .filter(key => key.startsWith('car-logos-') && key !== CACHE_NAME)
                    .map(key => caches.delete(key))
            )
        ).then(() => self.clients.claim())
    );
});

// ─── Fetch interception ───────────────────────────────────────────────────────

self.addEventListener('fetch', event => {
    if (!LOGO_URL_PATTERN.test(event.request.url)) return;

    event.respondWith(cacheFirst(event.request));
});

async function cacheFirst(request) {
    const cache    = await caches.open(CACHE_NAME);
    const cached   = await cache.match(request);

    if (cached) return cached;

    const response = await fetch(request);

    // Only cache successful, opaque-safe responses.
    if (response.ok || response.type === 'opaque') {
        cache.put(request, response.clone());
    }

    return response;
}
