/**
 * Application Service Worker
 *
 * Registered at scope '/' from src/main.tsx (replaces the former logo-sw.js
 * and sw.js registrations - a scope can hold exactly ONE registration, so the
 * logo cache and Web Push live in the same worker).
 *
 * Responsibilities:
 *   1. Car-logo CacheFirst cache (unchanged behaviour of the old logo-sw.js).
 *   2. Web Push notifications, of two shapes:
 *
 *      a) CLICK_TO_CALL - the desktop asked this phone to ring a number.
 *      b) Informational (NEW_LEAD, RESERVATION_CREATED, VEHICLE_CHECKED_IN,
 *         VISIT_COMPLETED, AREA_CAMPAIGN, TEST) - the backend supplies the
 *         finished title, body and target path; this worker only renders them
 *         and maps the icon key to a file. Copy stays server-side because a
 *         worker reaches phones slowly, while wording changes often.
 *
 *      Click-to-Call in detail:
 *      - 'push'              → decrypted payload from the backend
 *                              (pl.detailing.crm.push.call.ClickToCallPayload)
 *                              → system notification with a "Zadzwoń" action.
 *      - 'notificationclick' → opens /call.html?number=... (a static page,
 *                              not an SPA route - it must paint and fire the
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
 *
 * UPDATES. A phone runs whichever copy of this file it last installed, so how a
 * new copy gets there matters as much as what is in it. Three links, all needed:
 *   1. nginx serves this file with `no-store` (deploy/ngnix/ngnix.conf) - the
 *      browser's update check always reaches the server;
 *   2. the page asks for that check when the app returns to the screen
 *      (src/modules/push/utils/serviceWorkerRegistration.ts) - on its own the
 *      browser checks only on navigation, which an installed PWA resumed from
 *      the background never does;
 *   3. install → skipWaiting(), activate → clients.claim() below - the new copy
 *      takes over at once instead of waiting until every tab is closed, which
 *      on a phone with the app parked in memory means "never".
 */

// Bump on every change to this file. Browsers compare bytes, so the bump is not
// what triggers an update - it is what Settings → Urządzenia mobilne →
// Powiadomienia shows, so "does this phone have the fix yet?" has an answer.
const SW_VERSION = '2026-09-25.2';

const CACHE_VERSION = 'v1';
const CACHE_NAME    = `car-logos-${CACHE_VERSION}`;

const LOGO_URL_PATTERN = /cdn\.jsdelivr\.net\/gh\/filippofilip95\/car-logos-dataset/;

// ─── Lifecycle ────────────────────────────────────────────────────────────────

self.addEventListener('install', event => {
    // Take control immediately without waiting for existing clients to close.
    // Inside waitUntil, so installation does not finish before the skip is granted.
    event.waitUntil(self.skipWaiting());
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

// The page asks which version serves it (diagnostics in the notifications panel).
self.addEventListener('message', event => {
    if (!event.data || event.data.type !== 'GET_VERSION') return;
    const reply = { version: SW_VERSION };
    if (event.ports && event.ports[0]) event.ports[0].postMessage(reply);
    else if (event.source) event.source.postMessage(reply);
});

// ─── Fetch interception (car-logo CacheFirst) ─────────────────────────────────

self.addEventListener('fetch', event => {
    if (!LOGO_URL_PATTERN.test(event.request.url)) return;
    // Żądanie CORS pochodzi z przycinania logo (vehicles/services/logoTrim.ts), które czyta
    // piksele. Z tego cache'u poszłaby mu nieprzezroczysta (opaque) odpowiedź zapisana dla
    // <img>, a z niej przeglądarka pikseli nie odda - takie żądanie obsługuje zwykły cache HTTP.
    if (event.request.mode === 'cors') return;

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

// ─── Web Push: icons, sound, vibration ────────────────────────────────────────
//
// ICON (`icon`) - the picture beside the text. 192×192 PNG: Android draws it at
// 40-64 dp, which is 192 px on the densest screens; anything bigger is only
// downloaded, not seen. Keep the subject inside the central ~80% (Android may
// crop it into a circle) and fill the square edge-to-edge with the background
// colour - transparency comes out as a white or grey square on some skins.
// iOS IGNORES `icon` entirely: a notification there always carries the
// home-screen icon (apple-touch-icon / manifest icon captured at install).
//
// BADGE (`badge`) - the small glyph in the Android status bar and on the
// notification's header. 96×96 PNG, a WHITE glyph on transparency, ~12 px
// margin (safe area 72×72). Android keeps ONLY the alpha channel and paints it
// white, so a coloured or boxed image comes out as a solid blob. Desktop and
// iOS ignore it.
//
// SOUND - there is no way to ship a custom sound in Web Push, on any mobile OS.
// The `sound` option was dropped from the Notifications spec without a single
// browser having implemented it. What rings is decided by the operating system:
//   - Android: the notification channel's sound. Chrome creates channels per
//     site (per app, once installed as a WebAPK); the USER can pick any tone,
//     including their own file, in the system settings for that channel. We
//     cannot set it from here - the wizard tells them where.
//   - iOS: always the system notification sound; no API, no setting per web app
//     beyond on/off.
//   - `silent: true` works (no sound, no vibration) - the only control we have.
//
// VIBRATION (`vibrate`) - honoured by Chrome on Android only. Even there, since
// Android 8 the channel's vibration setting can override it, so treat a pattern
// as a hint, not a guarantee. iOS ignores it. The patterns below are short on
// purpose: a distinct rhythm for "act now" (call) vs "for your information".

// Bump when an icon FILE changes under the same name. Android caches notification
// images by URL, and the files are not content-hashed, so without a new query
// string a phone keeps showing the old picture long after the new one shipped.
const ICON_VERSION = '2';
const art = (icon, badge) => ({
    icon: `${icon}?v=${ICON_VERSION}`,
    badge: `${badge}?v=${ICON_VERSION}`,
});

// Icon keys (PushIcon on the backend) resolved to files here, so the backend
// never has to know the frontend's asset paths.
const ICONS = {
    EARNINGS: art('/icons/notification-earnings.png', '/icons/badge-earnings.png'),
    LEAD:     art('/icons/notification-lead.png',     '/icons/badge-lead.png'),
    CALL:     art('/icons/notification-call.png',     '/icons/badge-call.png'),
    RESERVATION: art('/icons/notification-reservation.png', '/icons/badge-reservation.png'),
    CHECKIN:  art('/icons/notification-checkin.png',  '/icons/badge-checkin.png'),
    CAMPAIGN: art('/icons/notification-campaign.png', '/icons/badge-campaign.png'),
    APP:      art('/icons/icon-192.png',              '/icons/badge-app.png'),
};

const VIBRATE = {
    // Two firm pulses: "someone is waiting for you to act".
    CALL: [200, 100, 200],
    // One short pulse - noticeable in a pocket, not an alarm.
    INFO: [120],
};

// ─── Web Push: dispatch ───────────────────────────────────────────────────────

self.addEventListener('push', event => {
    let payload = null;
    try {
        payload = event.data ? event.data.json() : null;
    } catch {
        payload = null;
    }
    if (!payload) return;

    // waitUntil keeps the worker alive until the notification is on screen -
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
        body: payload.displayName
            ? `Numer ${payload.phoneNumber}, zlecono z komputera.`
            : 'Zlecono z komputera.',
        icon: ICONS.CALL.icon,
        badge: ICONS.CALL.badge,
        tag: 'click-to-call',       // a newer call replaces a stale one instead of stacking
        renotify: true,
        requireInteraction: true,    // stays on screen until acted upon - it's a call to action
        vibrate: VIBRATE.CALL,
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
        vibrate: VIBRATE.INFO,
        data: { url: payload.url },
    });
}

self.addEventListener('notificationclick', event => {
    event.notification.close();
    if (event.action === 'dismiss') return;

    const data = event.notification.data || {};

    // Click-to-Call: a tel: URL cannot be opened from here at all - the spec
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
            .catch(() => {/* best effort - the user can re-pair from the UI */})
    );
});
