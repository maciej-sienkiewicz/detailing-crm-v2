/**
 * Application Service Worker
 *
 * Registered at scope '/' from src/main.tsx (replaces the former logo-sw.js
 * and sw.js registrations — a scope can hold exactly ONE registration, so the
 * logo cache and Web Push live in the same worker).
 *
 * Responsibilities:
 *   1. Car-logo CacheFirst cache (unchanged behaviour of the old logo-sw.js).
 *   2. Web Push notifications, of two shapes:
 *
 *      a) CLICK_TO_CALL — the desktop asked this phone to ring a number.
 *      b) Informational (VISIT_COMPLETED, NEW_LEAD) — the backend supplies the
 *         finished title, body and target path; this worker only renders them
 *         and maps the icon key to a file. Copy stays server-side because a
 *         worker reaches phones slowly, while wording changes often.
 *
 *      Click-to-Call in detail:
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

// Icon keys (PushIcon on the backend) resolved to files here, so the backend
// never has to know the frontend's asset paths.
const ICONS = {
    EARNINGS: { icon: '/icons/notification-earnings.png', badge: '/icons/badge-earnings.png' },
    LEAD:     { icon: '/icons/notification-lead.png',     badge: '/icons/badge-lead.png' },
    CALL:     { icon: '/icons/notification-call.png',     badge: '/icons/badge-call.png' },
};

self.addEventListener('push', event => {
    let payload = null;
    try {
        payload = event.data ? event.data.json() : null;
    } catch {
        payload = null;
    }
    if (!payload) return;

    // waitUntil keeps the worker alive until the notification is on screen —
    // without it the browser may kill the worker mid-flight. On Chrome a push
    // that shows NO notification gets penalised (future pushes throttled), so
    // every branch below must end in showNotification().
    if (payload.type === 'CLICK_TO_CALL') {
        if (!payload.phoneNumber) return;
        event.waitUntil(showCallNotification(payload));
        return;
    }

    if (payload.title && payload.body) {
        event.waitUntil(showInfoNotification(payload));
    }
});

function showCallNotification(payload) {
    const title = payload.displayName
        ? `Zadzwoń: ${payload.displayName}`
        : `Zadzwoń: ${payload.phoneNumber}`;

    return self.registration.showNotification(title, {
        body: `${payload.phoneNumber} · zlecono z komputera`,
        icon: ICONS.CALL.icon,
        // Status-bar badge. Android keeps ONLY the alpha channel and paints the
        // shape white, so these files are solid glyphs on transparency — a
        // coloured or boxed image would come out as a grey blob. Ignored on
        // desktop and on iOS, which uses the home-screen icon.
        badge: ICONS.CALL.badge,
        tag: 'click-to-call',       // a newer call replaces a stale one instead of stacking
        renotify: true,
        requireInteraction: true,    // stays on screen until acted upon — it's a call to action
        vibrate: [200, 100, 200],
        actions: [
            { action: 'call', title: '📞 Zadzwoń' },
            { action: 'dismiss', title: 'Odrzuć' },
        ],
        data: { phoneNumber: payload.phoneNumber, displayName: payload.displayName },
    });
}

function showInfoNotification(payload) {
    const art = ICONS[payload.icon] || ICONS.LEAD;

    return self.registration.showNotification(payload.title, {
        body: payload.body,
        icon: art.icon,
        badge: art.badge,
        // Tagged per subject by the backend, so a second visit or lead never
        // silently replaces the first one.
        tag: payload.tag || payload.type,
        // NOT requireInteraction: these report something that already happened.
        // A notification that has to be dismissed by hand is a chore, and money
        // stated once does not need to be acknowledged.
        requireInteraction: false,
        // A short, single pulse — noticeable in a pocket, not an alarm.
        vibrate: [120],
        data: { url: payload.url },
    });
}

self.addEventListener('notificationclick', event => {
    event.notification.close();
    if (event.action === 'dismiss') return;

    const data = event.notification.data || {};

    // Click-to-Call: a tel: URL cannot be opened from here at all — the spec
    // restricts openWindow() and WindowClient.navigate() to HTTP(S) schemes, so
    // openWindow('tel:...') rejects silently and the tap looks dead. The handoff
    // page carries the number into an ordinary document, which may reach the dialer.
    if (data.phoneNumber) {
        const number = String(data.phoneNumber).replace(/[^+\d]/g, '');
        const target = new URL('/call.html', self.location.origin);
        target.searchParams.set('number', number);
        if (data.displayName) target.searchParams.set('name', data.displayName);
        event.waitUntil(openApp(target.href));
        return;
    }

    // Informational notification: open whatever the backend pointed at.
    if (data.url) {
        event.waitUntil(openApp(new URL(data.url, self.location.origin).href));
    }
});

/**
 * Opens `href` in the app. Prefers a fresh window so whatever the user had open
 * stays intact; falls back to steering an existing one when the browser refuses
 * a second window (some standalone PWAs do).
 */
async function openApp(href) {
    const opened = await clients.openWindow(href).catch(() => null);
    if (opened) return;

    const existing = await clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (const client of existing) {
        if ('navigate' in client) {
            const navigated = await client.navigate(href).catch(() => null);
            if (navigated) {
                if ('focus' in navigated) await navigated.focus().catch(() => {});
                return;
            }
        }
    }
}

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
