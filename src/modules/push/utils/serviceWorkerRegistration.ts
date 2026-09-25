// src/modules/push/utils/serviceWorkerRegistration.ts
//
// Jedno miejsce, które rejestruje Service Workera aplikacji i pilnuje, żeby
// telefony dostawały jego nowe wersje od razu, a nie „kiedyś".
//
// Dlaczego „skipWaiting + clients.claim + nginx no-store" nie wystarczało:
// te trzy rzeczy decydują o tym, co się dzieje, GDY przeglądarka już sprawdzi,
// czy worker się zmienił. Sprawdza zaś sama wyłącznie przy NAWIGACJI do strony
// w zakresie (i przy zdarzeniu push, ale nie częściej niż raz na 24 h). A nasza
// aplikacja prawie nigdy nie nawiguje:
//   - to SPA - przejście między widokami to pushState, nie nawigacja;
//   - PWA na telefonie wraca z tła bez przeładowania - iOS i Android trzymają ją
//     w pamięci całymi dniami, a „otwarcie z ikony" jest wtedy tylko wznowieniem.
// Telefon, który nie przeładował aplikacji od tygodnia, trzymał tygodniowy
// worker - i stąd „zmiany nie wchodzą od razu". Dlatego sprawdzamy sami:
// przy każdym powrocie aplikacji na ekran i raz na godzinę, gdy jest widoczna.
// Sprawdzenie to jedno warunkowe żądanie o mały plik - tańsze niż jedno
// zapytanie do API.

import { isRolePreviewShellPath } from '@/modules/role-preview/entryCode';

export const SERVICE_WORKER_URL = '/service-worker.js';

/**
 * Czy w tym oknie wolno mieć workera. Nie w podglądzie roli: ani jego okno
 * (/podglad), ani aplikacja w jego ramce. Podgląd to jednorazowa piaskownica pod
 * własnym adresem - worker by ją przeżył, trzymałby jej dane i mógłby zapisać się
 * na push. Sprawdzają to WSZYSTKIE drogi do rejestracji, nie tylko start aplikacji:
 * kreator powiadomień rejestruje workera sam, gdy start się nie powiódł.
 */
export const isServiceWorkerAllowedHere = (): boolean =>
    'serviceWorker' in navigator &&
    !isRolePreviewShellPath(window.location.pathname) &&
    window.self === window.top;

/**
 * `updateViaCache: 'none'` - przy sprawdzaniu aktualizacji przeglądarka omija cache
 * HTTP także dla skryptów z importScripts(). Sam plik workera i tak jest wydawany
 * z `no-store` (deploy/ngnix/ngnix.conf), ale to jest druga, niezależna gwarancja:
 * przetrwa pośrednika (CDN, proxy), który nagłówek zgubi albo nadpisze.
 *
 * Opcje muszą być wszędzie te same - rejestracja z innymi opcjami nadpisuje
 * poprzednią, więc dwa miejsca z różnymi ustawieniami przełączałyby je nawzajem.
 */
const REGISTRATION_OPTIONS: RegistrationOptions = { scope: '/', updateViaCache: 'none' };

export const registerAppServiceWorker = (): Promise<ServiceWorkerRegistration> =>
    navigator.serviceWorker.register(SERVICE_WORKER_URL, REGISTRATION_OPTIONS);

/** Nie częściej - powrót na ekran co kilkanaście sekund nie musi za każdym razem pytać serwera. */
export const UPDATE_CHECK_MIN_INTERVAL_MS = 5 * 60_000;
/** Aplikacja otwarta cały dzień na tablecie w recepcji też ma dostać nowego workera. */
export const UPDATE_CHECK_PERIOD_MS = 60 * 60_000;

interface FreshnessDeps {
    now?: () => number;
    isVisible?: () => boolean;
    target?: Pick<Document, 'addEventListener' | 'removeEventListener'>;
    windowTarget?: Pick<Window, 'addEventListener' | 'removeEventListener' | 'setInterval' | 'clearInterval'>;
}

/**
 * Sprawdza nową wersję workera przy powrocie aplikacji na ekran, po odzyskaniu
 * sieci i co godzinę. Zwraca funkcję sprzątającą.
 *
 * Nowy worker instaluje się i przejmuje stronę sam (skipWaiting + clients.claim
 * w public/service-worker.js), więc nic więcej nie trzeba - następne powiadomienie
 * obsłuży już nowa wersja.
 */
export const keepServiceWorkerFresh = (
    registration: Pick<ServiceWorkerRegistration, 'update'>,
    {
        now = Date.now,
        isVisible = () => document.visibilityState === 'visible',
        target = document,
        windowTarget = window,
    }: FreshnessDeps = {},
): (() => void) => {
    // Rejestracja właśnie sprawdziła wersję - liczymy od teraz.
    let lastCheck = now();

    const check = (force = false) => {
        if (!force && now() - lastCheck < UPDATE_CHECK_MIN_INTERVAL_MS) return;
        lastCheck = now();
        // Bez sieci update() odrzuca - następna okazja przyjdzie sama.
        registration.update().catch(() => {});
    };

    const onVisibility = () => { if (isVisible()) check(); };
    const onOnline = () => check(true);

    target.addEventListener('visibilitychange', onVisibility);
    windowTarget.addEventListener('online', onOnline);
    const timer = windowTarget.setInterval(() => { if (isVisible()) check(); }, UPDATE_CHECK_PERIOD_MS);

    return () => {
        target.removeEventListener('visibilitychange', onVisibility);
        windowTarget.removeEventListener('online', onOnline);
        windowTarget.clearInterval(timer);
    };
};

/**
 * Wersja workera, który TERAZ obsługuje tę stronę (stała SW_VERSION w
 * public/service-worker.js), albo null, gdy nie odpowiedział.
 *
 * Do diagnostyki: na pytanie „czy ten telefon ma już nową wersję?" odpowiada
 * napis w ustawieniach, a nie zgadywanie i czyszczenie danych witryny.
 */
export const getServiceWorkerVersion = async (timeoutMs = 2_000): Promise<string | null> => {
    if (!('serviceWorker' in navigator)) return null;
    const worker = navigator.serviceWorker.controller
        ?? (await navigator.serviceWorker.getRegistration())?.active
        ?? null;
    if (!worker) return null;

    return new Promise(resolve => {
        const channel = new MessageChannel();
        const timer = window.setTimeout(() => resolve(null), timeoutMs);
        channel.port1.onmessage = event => {
            window.clearTimeout(timer);
            const version = (event.data as { version?: unknown } | null)?.version;
            resolve(typeof version === 'string' ? version : null);
        };
        worker.postMessage({ type: 'GET_VERSION' }, [channel.port2]);
    });
};
