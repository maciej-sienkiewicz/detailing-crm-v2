/**
 * Application Service Worker
 *
 * Registered at scope '/' from src/main.tsx (replaces the former logo-sw.js —
 * a scope can hold exactly ONE registration, so the logo cache and Web Push
 * live in the same worker).
 *
 * Responsibilities:
 *   1. Car-logo CacheFirst cache (unchanged behaviour of the old logo-sw.js).
 *   2. Click-to-Call over Web Push:
 *      - 'push'              → decrypted payload from the backend
 *                              (pl.detailing.crm.push.call.ClickToCallPayload)
 *                              → system notification with a "Zadzwoń" action.
 *      - 'notificationclick' → clients.openWindow('tel:+48...') — the tap on
 *                              the notification IS the user gesture browsers
 *                              require before handing off to the OS dialer.
 *                              Nothing here auto-dials: openWindow('tel:')
 *                              opens the dialer with the number pre-filled and
 *                              the human presses the green button.
 *      - 'pushsubscriptionchange' → the browser rotated the subscription;
 *                              re-subscribe with the same VAPID key and
 *                              re-register server-side (cookie-authenticated).
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

// ─── Fetch interception (car-logo CacheFirst) ─────────────────────────────────

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

// ─── Web Push: Click-to-Call ──────────────────────────────────────────────────

self.addEventListener('push', event => {
    let payload = null;
    try {
        payload = event.data ? event.data.json() : null;
    } catch {
        payload = null;
    }
    if (!payload || payload.type !== 'CLICK_TO_CALL' || !payload.phoneNumber) return;

    const title = payload.displayName
        ? `Zadzwoń: ${payload.displayName}`
        : `Zadzwoń: ${payload.phoneNumber}`;

    // waitUntil keeps the worker alive until the notification is on screen —
    // without it the browser may kill the worker mid-flight. On Chrome a push
    // that shows NO notification gets penalised (future pushes throttled), so
    // we always show one for a valid payload.
    event.waitUntil(
        self.registration.showNotification(title, {
            body: `${payload.phoneNumber} · zlecono z komputera`,
            tag: 'click-to-call',       // a newer call replaces a stale one instead of stacking
            renotify: true,
            requireInteraction: true,    // stays on screen until acted upon — it's a call to action
            vibrate: [200, 100, 200],
            actions: [
                { action: 'call', title: '📞 Zadzwoń' },
                { action: 'dismiss', title: 'Odrzuć' },
            ],
            data: { phoneNumber: payload.phoneNumber },
        })
    );
});

self.addEventListener('notificationclick', event => {
    event.notification.close();
    if (event.action === 'dismiss') return;

    const phoneNumber = event.notification.data && event.notification.data.phoneNumber;
    if (!phoneNumber) return;

    // Strip everything but digits and the leading '+' — a tel: URL must not
    // contain spaces. This click is a user gesture, so the browser allows the
    // scheme handoff to the system dialer.
    const telUrl = 'tel:' + String(phoneNumber).replace(/[^+\d]/g, '');

    event.waitUntil(clients.openWindow(telUrl));
});

self.addEventListener('pushsubscriptionchange', event => {
    // The old subscription carries the VAPID key it was created with, so the
    // worker can re-subscribe without asking the page for anything.
    const applicationServerKey =
        event.oldSubscription && event.oldSubscription.options
            ? event.oldSubscription.options.applicationServerKey
            : null;
    if (!applicationServerKey) return;

    event.waitUntil(
        self.registration.pushManager
            .subscribe({ userVisibleOnly: true, applicationServerKey })
            .then(subscription => {
                const json = subscription.toJSON();
                return fetch('/api/v1/push/devices', {
                    method: 'POST',
                    credentials: 'include',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        endpoint: json.endpoint,
                        p256dh: json.keys && json.keys.p256dh,
                        auth: json.keys && json.keys.auth,
                        deviceName: 'Telefon (odświeżona subskrypcja)',
                        userAgent: self.navigator.userAgent,
                    }),
                });
            })
            .catch(() => {/* best effort — the user can re-pair from the UI */})
    );
});
