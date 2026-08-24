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

/** iOS allows Web Push ONLY inside a Home-Screen-installed PWA. */
export const isIosOutsidePwa = (): boolean => {
    const isIos = /iphone|ipad|ipod/i.test(navigator.userAgent);
    const isStandalone =
        window.matchMedia('(display-mode: standalone)').matches ||
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (navigator as any).standalone === true;
    return isIos && !isStandalone;
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
