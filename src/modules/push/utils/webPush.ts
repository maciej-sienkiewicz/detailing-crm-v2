import type { PushSupportState } from '../types';

/**
 * pushManager.subscribe() wants the VAPID key as a Uint8Array, but the
 * backend serves it in the interchange format (base64url). Standard decode.
 */
export const urlBase64ToUint8Array = (base64String: string): Uint8Array => {
    const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    for (let i = 0; i < rawData.length; i += 1) {
        outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
};

export const getPushSupportState = (): PushSupportState => {
    const hasApis =
        'serviceWorker' in navigator &&
        'PushManager' in window &&
        'Notification' in window;
    if (!hasApis) return 'unsupported';
    if (Notification.permission === 'denied') return 'denied';
    return 'supported';
};

/** Aplikacja uruchomiona z ekranu głównego (PWA), a nie z karty przeglądarki. */
export const isStandaloneDisplay = (): boolean =>
    window.matchMedia('(display-mode: standalone)').matches ||
    window.matchMedia('(display-mode: fullscreen)').matches ||
    window.matchMedia('(display-mode: minimal-ui)').matches ||
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (navigator as any).standalone === true;

export const isIosDevice = (): boolean =>
    /iphone|ipad|ipod/i.test(navigator.userAgent) ||
    // iPadOS podaje się za Maca; rozpoznajemy go po ekranie dotykowym.
    (/macintosh/i.test(navigator.userAgent) && navigator.maxTouchPoints > 1);

/** iOS allows Web Push ONLY inside a Home-Screen-installed PWA. */
export const isIosOutsidePwa = (): boolean => isIosDevice() && !isStandaloneDisplay();

/**
 * Czy to urządzenie wygląda na telefon/tablet.
 *
 * Służy WYŁĄCZNIE do ustawienia kolejności i akcentów w panelu (na telefonie nie
 * ma sensu pokazywać kodu QR do zeskanowania własnego ekranu). Nigdy nie decyduje
 * o tym, czy da się tu sparować urządzenie: rozpoznawanie po User-Agent bywa
 * mylne - iPadOS przedstawia się jako Mac, a przeglądarki w trybie desktopowym
 * ukrywają system - a wtedy jedyny działający przycisk zniknąłby z ekranu.
 */
export const isMobileDevice = (): boolean =>
    /android|iphone|ipad|ipod|windows phone/i.test(navigator.userAgent) ||
    isIosDevice() ||
    (navigator.maxTouchPoints > 1 && window.matchMedia('(pointer: coarse)').matches);

/**
 * Rejestracja Service Workera gotowa do subskrypcji.
 *
 * `navigator.serviceWorker.ready` nigdy się nie rozstrzyga, jeśli w tym zakresie
 * nie ma zarejestrowanego workera - a wtedy parowanie wisiało w nieskończoność na
 * „Paruję…", bez żadnego komunikatu. Dlatego najpierw sami próbujemy rejestracji
 * (samonaprawa, gdy ta ze startu aplikacji się nie powiodła), a potem czekamy
 * z limitem czasu i jawnym błędem.
 */
export const waitForServiceWorker = async (timeoutMs = 15_000): Promise<ServiceWorkerRegistration> => {
    if (!('serviceWorker' in navigator)) throw new Error('sw-unavailable');

    try {
        await navigator.serviceWorker.register('/service-worker.js', { scope: '/' });
    } catch {
        // Rejestracja mogła już istnieć albo być zablokowana - rozstrzygnie to `ready`.
    }

    let timer: number | undefined;
    try {
        return await Promise.race([
            navigator.serviceWorker.ready,
            new Promise<never>((_, reject) => {
                timer = window.setTimeout(() => reject(new Error('sw-unavailable')), timeoutMs);
            }),
        ]);
    } finally {
        if (timer !== undefined) window.clearTimeout(timer);
    }
};

/** Best-effort human label for the devices list, e.g. "Android · Chrome". */
export const describeThisDevice = (): string => {
    const ua = navigator.userAgent;
    const os = /android/i.test(ua)
        ? 'Android'
        : /iphone|ipad|ipod/i.test(ua)
            ? 'iPhone'
            : /windows/i.test(ua)
                ? 'Windows'
                : /mac/i.test(ua)
                    ? 'Mac'
                    : 'Urządzenie';
    const browser = /edg\//i.test(ua)
        ? 'Edge'
        : /chrome/i.test(ua)
            ? 'Chrome'
            : /firefox/i.test(ua)
                ? 'Firefox'
                : /safari/i.test(ua)
                    ? 'Safari'
                    : 'przeglądarka';
    return `${os} · ${browser}`;
};
