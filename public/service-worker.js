/**
 * Application Service Worker
 *
 * Registered at scope '/' from src/main.tsx (replaces the former logo-sw.js
 * and sw.js registrations — a scope can hold exactly ONE registration, so the
 * logo cache and Web Push live in the same worker).
 *
 * Responsibilities:
 *   1. Car-logo CacheFirst cache (unchanged behaviour of the old logo-sw.js).
 *   2. Click-to-Call over Web Push:
 *      - 'push'              → decrypted payload from the backend
 *                              (pl.detailing.crm.push.call.ClickToCallPayload)
 *                              → system notification with a "Zadzwoń" action.
 *      - 'notificationclick' → opens /call.html?number=... (a static page,
 *                              not an SPA route — it must paint and fire the
 *                              dialer instantly, with no bundle in the way).
 *                              A Service Worker CANNOT open the dialer itself:
 *                              Clients.openWindow() and WindowClient.navigate()
 *                              reject any URL whose scheme is not HTTP(S), so
 *                              openWindow('tel:...') silently rejects and the
 *                              tap appears to do nothing. The handoff page is
 *                              the only route to the dialer: it carries the
 *                              notification's user activation into a normal
 *                              document, which may navigate to tel:.
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
            // Large icon in the notification shade. Without it Android falls
            // back to the PWA's app icon, so the alert reads as "the CRM said
            // something" rather than "there is a call to place".
            icon: '/icons/notification-call.png',
            // Status-bar badge. Android keeps ONLY the alpha channel and paints
            // the shape white, so this file is a solid glyph on transparency —
            // a coloured or boxed image would come out as a grey blob.
            // Ignored on desktop and on iOS, which uses the home-screen icon.
            badge: '/icons/badge-call.png',
            tag: 'click-to-call',       // a newer call replaces a stale one instead of stacking
            renotify: true,
            requireInteraction: true,    // stays on screen until acted upon — it's a call to action
            vibrate: [200, 100, 200],
            actions: [
                { action: 'call', title: '📞 Zadzwoń' },
                { action: 'dismiss', title: 'Odrzuć' },
            ],
            data: { phoneNumber: payload.phoneNumber, displayName: payload.displayName },
        })
    );
});

self.addEventListener('notificationclick', event => {
    event.notification.close();
    if (event.action === 'dismiss') return;

    const data = event.notification.data || {};
    if (!data.phoneNumber) return;

    // A tel: URL must not carry spaces or formatting.
    const number = String(data.phoneNumber).replace(/[^+\d]/g, '');

    // NOT clients.openWindow('tel:' + number): the spec restricts both
    // openWindow() and WindowClient.navigate() to HTTP(S) schemes, so a tel:
    // URL rejects the promise and the tap does nothing at all. We open an
    // ordinary page in the app instead and let IT reach the dialer.
    const target = new URL('/call.html', self.location.origin);
    target.searchParams.set('number', number);
    if (data.displayName) target.searchParams.set('name', data.displayName);

    event.waitUntil((async () => {
        // A fresh window keeps whatever the user had open intact.
        const opened = await clients.openWindow(target.href).catch(() => null);
        if (opened) return;

        // Blocked (some browsers refuse a second window in standalone PWAs):
        // fall back to steering a window that already exists.
        const existing = await clients.matchAll({ type: 'window', includeUncontrolled: true });
        for (const client of existing) {
            if ('navigate' in client) {
                const navigated = await client.navigate(target.href).catch(() => null);
                if (navigated) {
                    if ('focus' in navigated) await navigated.focus().catch(() => {});
                    return;
                }
            }
        }
    })());
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
