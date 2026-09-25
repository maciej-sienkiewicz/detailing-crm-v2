// src/modules/push/utils/pushPlatform.ts
//
// Na jakiej drodze do powiadomień stoi to urządzenie - jedna odpowiedź zamiast
// rozsianych po komponentach `isIosDevice() && !isStandaloneDisplay()`.
//
// Dlaczego to w ogóle ma tyle wariantów: „włącz powiadomienia" znaczy co innego
// na każdej platformie, a użytkownik gubił się właśnie wtedy, gdy dostawał
// instrukcję nie dla swojego telefonu.
//
//   - Android (Chrome, Samsung, Firefox): push działa od razu w karcie
//     przeglądarki. Jeden krok: zgoda.
//   - iPhone/iPad w Safari: w karcie NIE MA API push w ogóle. Najpierw „Dodaj do
//     ekranu początkowego", dopiero aplikacja otwarta z ikony może zapytać o zgodę
//     (iOS 16.4+). To jest ta ścieżka, na której ludzie odpadali.
//   - iOS starszy niż 16.4: nie da się wcale - trzeba zaktualizować system.
//   - Przeglądarki wbudowane (Facebook, Instagram, Gmail, WebView na Androidzie):
//     nie potrafią ani instalować, ani pushować. Jedyna rada: otwórz w Safari/Chrome.
//
// Rozpoznanie po User-Agent bywa mylne (iPadOS udaje Maca, tryb „wersja na
// komputer" ukrywa system), dlatego ostatnie słowo ma zawsze obecność API:
// jeśli przeglądarka ma Notification + PushManager + serviceWorker, pokazujemy
// ścieżkę „zezwól", niezależnie od tego, co twierdzi User-Agent.

export type IosBrowser = 'safari' | 'chrome' | 'edge';

export type PushPlatform =
    /** iPhone/iPad w karcie przeglądarki - najpierw dodanie do ekranu początkowego. */
    | { kind: 'ios-install'; device: 'iphone' | 'ipad'; browser: IosBrowser }
    /** Aplikacja na iOS otwarta z ekranu początkowego, z API push. */
    | { kind: 'ios-app' }
    /** iOS bez Web Push (starszy niż 16.4). */
    | { kind: 'ios-update' }
    /** Przeglądarka wbudowana albo taka, która nie umie ani instalować, ani pushować. */
    | { kind: 'open-in-browser'; os: 'ios' | 'android' }
    | { kind: 'android'; installed: boolean }
    | { kind: 'desktop' }
    | { kind: 'unsupported' };

export interface PlatformEnv {
    userAgent: string;
    maxTouchPoints: number;
    /** Uruchomiona z ekranu głównego (display-mode: standalone lub navigator.standalone). */
    standalone: boolean;
    /** serviceWorker + PushManager + Notification. */
    hasPushApis: boolean;
}

/** Web Push dla aplikacji z ekranu początkowego pojawił się w iOS 16.4. */
const IOS_PUSH_MIN = [16, 4] as const;

// Wbudowane przeglądarki aplikacji. Mają własny silnik bez instalacji PWA i bez push,
// a ich menu „Otwórz w przeglądarce" jest jedyną drogą dalej.
const IN_APP_BROWSER = /FBAN|FBAV|FB_IAB|Instagram|LinkedInApp|Line\/|GSA\/|MicroMessenger|Snapchat|TikTok|musical_ly|Twitter/i;

export const readPlatformEnv = (): PlatformEnv => ({
    userAgent: navigator.userAgent,
    maxTouchPoints: navigator.maxTouchPoints ?? 0,
    standalone:
        window.matchMedia?.('(display-mode: standalone)').matches ||
        window.matchMedia?.('(display-mode: fullscreen)').matches ||
        window.matchMedia?.('(display-mode: minimal-ui)').matches ||
        (navigator as Navigator & { standalone?: boolean }).standalone === true,
    hasPushApis: 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window,
});

/**
 * Wersja iOS z User-Agenta albo null, gdy jej tam nie ma (iPadOS w trybie
 * „komputer" przedstawia się jako Mac i wersji nie podaje).
 *
 * Wzorzec celowo zaczyna się od „CPU": User-Agent Maca zawiera „Mac OS X 10_15_7",
 * które naiwne `/OS (\d+)_(\d+)/` przeczytałoby jako iOS 10.15 - i odesłało
 * użytkownika iPada do aktualizacji systemu, który ma najnowszy.
 */
export const iosVersion = (userAgent: string): [number, number] | null => {
    const match = /CPU (?:iPhone )?OS (\d+)_(\d+)/.exec(userAgent);
    return match ? [Number(match[1]), Number(match[2])] : null;
};

const isIos = (env: PlatformEnv): boolean =>
    /iphone|ipad|ipod/i.test(env.userAgent) ||
    // iPadOS podaje się za Maca; rozpoznajemy go po ekranie dotykowym.
    (/macintosh/i.test(env.userAgent) && env.maxTouchPoints > 1);

const iosBrowser = (userAgent: string): IosBrowser | 'other' => {
    if (/CriOS/i.test(userAgent)) return 'chrome';
    if (/EdgiOS/i.test(userAgent)) return 'edge';
    // Firefox, Opera, DuckDuckGo i reszta: menu „Dodaj do ekranu" bywa, bywa go brak,
    // a instrukcji dla każdej nie utrzymamy. Safari ma je zawsze.
    if (/FxiOS|OPiOS|OPT\/|DuckDuckGo|YaBrowser/i.test(userAgent)) return 'other';
    return /Safari/i.test(userAgent) ? 'safari' : 'other';
};

export const detectPushPlatform = (env: PlatformEnv): PushPlatform => {
    if (isIos(env)) {
        if (IN_APP_BROWSER.test(env.userAgent)) return { kind: 'open-in-browser', os: 'ios' };

        // API jest - droga „zezwól" jest otwarta, bez względu na tryb wyświetlania
        // i na to, co o wersji systemu twierdzi User-Agent (Safari 26 zamroził w nim
        // numer iOS, więc to już tylko wskazówka).
        if (env.hasPushApis) return { kind: 'ios-app' };

        const version = iosVersion(env.userAgent);
        const tooOld = version !== null &&
            (version[0] < IOS_PUSH_MIN[0] || (version[0] === IOS_PUSH_MIN[0] && version[1] < IOS_PUSH_MIN[1]));
        // Stary system albo aplikacja z ekranu początkowego bez API: iOS bez Web Push
        // (albo z wyłączonym w ustawieniach Safari).
        if (tooOld || env.standalone) return { kind: 'ios-update' };

        const browser = iosBrowser(env.userAgent);
        if (browser === 'other') return { kind: 'open-in-browser', os: 'ios' };
        const device = /ipad/i.test(env.userAgent) || /macintosh/i.test(env.userAgent) ? 'ipad' : 'iphone';
        return { kind: 'ios-install', device, browser };
    }

    if (/android/i.test(env.userAgent)) {
        // WebView (`; wv)`) i przeglądarki wbudowane nie mają push, choć User-Agent mówi „Chrome".
        if (!env.hasPushApis && (/; wv\)/.test(env.userAgent) || IN_APP_BROWSER.test(env.userAgent))) {
            return { kind: 'open-in-browser', os: 'android' };
        }
        return env.hasPushApis ? { kind: 'android', installed: env.standalone } : { kind: 'unsupported' };
    }

    return env.hasPushApis ? { kind: 'desktop' } : { kind: 'unsupported' };
};

/** Platforma, na której kreator może od razu poprosić o zgodę. */
export const canAskForPermission = (platform: PushPlatform): boolean =>
    platform.kind === 'ios-app' || platform.kind === 'android' || platform.kind === 'desktop';
