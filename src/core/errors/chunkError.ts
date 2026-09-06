// src/core/errors/chunkError.ts
//
// Wykrywanie i naprawa błędów ładowania chunków (code-splitting).
//
// PRZYCZYNA PROBLEMU
// ------------------
// Vite buduje `assets/MailView-<hash>.js`, gdzie <hash> liczony jest z treści
// pliku. Przy deployu (deploy/Dockerfile) cały katalog `dist` jest podmieniany,
// więc PLIKI ZE STARYMI HASHAMI PRZESTAJĄ ISTNIEĆ. Przeglądarka użytkownika,
// która trzyma otwartą kartę sprzed deployu, ma w pamięci STARY `index.html`
// (a razem z nim stare `main-<hash>.js` z zapisanymi na sztywno nazwami
// chunków). Dopóki użytkownik chodzi po już wczytanych widokach - wszystko
// działa. W momencie wejścia w route z `lazy()` przeglądarka próbuje pobrać
// `assets/MailView-CRm-D0lQ.js`, nginx zwraca 404 (reguła `location ~* \.(js|css)$`
// serwuje wyłącznie istniejące pliki), a `import()` odrzuca się z
// `TypeError: Failed to fetch dynamically imported module`.
//
// Cache przeglądarki tego nie ratuje - wręcz przeciwnie: `Cache-Control: public,
// immutable` na plikach z hashem sprawia, że stare zasoby są trzymane długo,
// a `index.html` jest `no-store`, więc wystarczy jedno pełne przeładowanie,
// żeby dostać nowy manifest z nowymi hashami. I dokładnie to robi ten moduł.

/** Fragmenty komunikatów, którymi przeglądarki sygnalizują nieudany `import()`. */
const CHUNK_ERROR_PATTERNS = [
    // Chrome / Edge
    'failed to fetch dynamically imported module',
    // Firefox
    'error loading dynamically imported module',
    // Safari
    'importing a module script failed',
    'module source is unavailable',
    // Vite: nieudany <link rel=modulepreload> albo CSS chunku
    'unable to preload css for',
    // Serwer oddał index.html (SPA fallback) zamiast pliku .js
    'expected a javascript module script',
    // Webpack (gdyby bundler się kiedyś zmienił)
    'chunkloaderror',
    'loading chunk',
    'loading css chunk',
];

/**
 * Czy błąd to nieudane pobranie chunku aplikacji, a nie zwykły błąd runtime?
 *
 * Celowo dopasowujemy WYŁĄCZNIE komunikaty specyficzne dla ładowania modułów.
 * Ogólne "Network Error" z axiosa (padnięte API) nie może tu wpaść - inaczej
 * błąd backendu przeładowywałby użytkownikowi stronę w kółko.
 */
export function isChunkLoadError(error: unknown): boolean {
    if (!error) return false;

    if (error instanceof Error && error.name === 'ChunkLoadError') return true;

    const message =
        error instanceof Error ? `${error.name}: ${error.message}`
            : typeof error === 'string' ? error
                : typeof (error as { message?: unknown }).message === 'string'
                    ? (error as { message: string }).message
                    : '';

    if (!message) return false;

    const normalized = message.toLowerCase();
    return CHUNK_ERROR_PATTERNS.some(pattern => normalized.includes(pattern));
}

// ─── Zabezpieczenie przed pętlą przeładowań ──────────────────────────────────

const STORAGE_KEY = 'detailboost:chunk-reload';
/** Okno, w którym zliczamy próby. Po nim licznik startuje od zera. */
const RELOAD_WINDOW_MS = 30_000;
/** Ile przeładowań wolno wykonać w oknie, zanim uznamy naprawę za nieskuteczną. */
const MAX_RELOADS_PER_WINDOW = 2;

interface ReloadGuardState {
    count: number;
    firstAt: number;
}

/**
 * sessionStorage, a nie localStorage: licznik ma żyć tylko w tej karcie i
 * zniknąć po jej zamknięciu. Zwraca null, gdy storage jest niedostępny
 * (tryb prywatny Safari, zablokowane ciasteczka) - wtedy świadomie NIE
 * przeładowujemy, bo bez licznika nie da się wykryć pętli.
 */
function getSessionStorage(): Storage | null {
    try {
        const storage = window.sessionStorage;
        const probe = '__db_probe__';
        storage.setItem(probe, '1');
        storage.removeItem(probe);
        return storage;
    } catch {
        return null;
    }
}

function readGuardState(storage: Storage): ReloadGuardState | null {
    try {
        const raw = storage.getItem(STORAGE_KEY);
        if (!raw) return null;
        const parsed = JSON.parse(raw) as Partial<ReloadGuardState>;
        if (typeof parsed?.count !== 'number' || typeof parsed?.firstAt !== 'number') return null;
        return { count: parsed.count, firstAt: parsed.firstAt };
    } catch {
        return null;
    }
}

/** Ile prób licznik dopuszcza po uwzględnieniu okna czasowego. */
function nextGuardState(storage: Storage, now: number): ReloadGuardState {
    const previous = readGuardState(storage);
    const withinWindow = previous !== null && now - previous.firstAt < RELOAD_WINDOW_MS;

    return withinWindow
        ? { count: previous.count + 1, firstAt: previous.firstAt }
        : { count: 1, firstAt: now };
}

/**
 * Czy kolejne przeładowanie jest jeszcze dozwolone? Czysty odczyt - NIC nie
 * zapisuje, więc wolno go wołać w trakcie renderowania Reacta, żeby zdecydować,
 * co pokazać: ekran "Aktualizuję…" czy ekran błędu.
 */
export function canAttemptChunkReload(now: number = Date.now()): boolean {
    const storage = getSessionStorage();
    if (!storage) return false;

    return nextGuardState(storage, now).count <= MAX_RELOADS_PER_WINDOW;
}

/**
 * Zgłasza chęć przeładowania i mówi, czy wolno je wykonać.
 *
 * Wywołanie ZAPISUJE próbę, więc po przeładowaniu kolejne wywołanie widzi
 * poprzednie. Dzięki temu scenariusz "deploy w trakcie sesji" kosztuje jedno
 * przeładowanie, a scenariusz "plik trwale nie istnieje" kończy się ekranem
 * błędu zamiast migającej w nieskończoność strony.
 */
export function beginChunkRecoveryReload(now: number = Date.now()): boolean {
    const storage = getSessionStorage();
    if (!storage) return false;

    const next = nextGuardState(storage, now);
    if (next.count > MAX_RELOADS_PER_WINDOW) return false;

    try {
        storage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
        return false;
    }

    return true;
}

/** Czyści licznik - wołane, gdy aplikacja wstała i działa poprawnie. */
export function resetChunkReloadGuard(): void {
    try {
        getSessionStorage()?.removeItem(STORAGE_KEY);
    } catch {
        /* brak storage: nie ma czego czyścić */
    }
}

/**
 * Twarde przeładowanie po nieudanym chunku.
 *
 * `location.reload()` pobiera `index.html` na nowo, a ten jest serwowany z
 * `no-cache, no-store` (deploy/ngnix/ngnix.conf), więc wraca świeży manifest z
 * aktualnymi hashami. Adres URL zostaje nietknięty, użytkownik ląduje w tym
 * samym miejscu aplikacji.
 *
 * @returns true, jeśli przeładowanie zostało zlecone; false, gdy limit prób
 *          został wyczerpany i trzeba pokazać ekran błędu.
 */
export function recoverFromChunkError(): boolean {
    if (!beginChunkRecoveryReload()) return false;
    window.location.reload();
    return true;
}
