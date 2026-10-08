// src/core/sessionLock.ts
//
// „Sesja zablokowana" - jak karty przeglądarki dowiadują się o blokadzie.
//
// Zgłoszenie biznesu z 07.10: blokadę omijało otwarcie aplikacji w nowej karcie.
// Była flagą w `sessionStorage` jednej karty, a serwer dalej wydawał dane. Teraz
// blokada siedzi w sesji na serwerze (POST /v1/auth/session-lock): każde zapytanie
// zablokowanej sesji kończy się 423 SESSION_LOCKED, a /auth/me mówi `sessionLocked`.
// Ten moduł tylko przenosi tę wiadomość między kartami, żeby nie czekały na pierwsze
// odrzucone zapytanie:
//
//  - sygnał blokady i odblokowania idzie przez `localStorage` (zdarzenie `storage`
//    dostają wszystkie INNE karty tej samej przeglądarki);
//  - aktywność jest wspólna: kto pracuje w jednej karcie, ten nie zostanie
//    zablokowany przez kartę leżącą w tle, która od dawna nie widziała myszy.

const SIGNAL_KEY = 'crm_session_lock_signal';
const ACTIVITY_KEY = 'crm_last_activity';
/** Zapis aktywności co najwyżej raz na tyle ms - mousemove strzela setki razy na sekundę. */
const ACTIVITY_WRITE_EVERY_MS = 5_000;

/** Zdarzenie okna: serwer odpowiedział 423 SESSION_LOCKED (wysyła je apiClient). */
export const SESSION_LOCKED_EVENT = 'auth:session-locked';

export const HTTP_LOCKED = 423;

export const isSessionLockedResponse = (status: number | undefined, data: unknown): boolean =>
    status === HTTP_LOCKED && (data as { code?: unknown } | undefined)?.code === 'SESSION_LOCKED';

// localStorage potrafi rzucić (tryb prywatny, zablokowane dane witryny) - blokada
// na serwerze działa i bez tego, traci się tylko natychmiastowość w innych kartach.
const write = (key: string, value: string) => {
    try { localStorage.setItem(key, value); } catch { /* patrz wyżej */ }
};
const read = (key: string): string | null => {
    try { return localStorage.getItem(key); } catch { return null; }
};

/** Znacznik czasu w wartości: ten sam stan zapisany dwa razy też musi wywołać `storage`. */
export const announceLock = () => write(SIGNAL_KEY, `locked:${Date.now()}`);
export const announceUnlock = () => write(SIGNAL_KEY, `unlocked:${Date.now()}`);

/** Sygnały z INNYCH kart. Zwraca funkcję wypisania. */
export function onLockSignal(handler: (locked: boolean) => void): () => void {
    const listener = (e: StorageEvent) => {
        if (e.key !== SIGNAL_KEY || !e.newValue) return;
        handler(e.newValue.startsWith('locked:'));
    };
    window.addEventListener('storage', listener);
    return () => window.removeEventListener('storage', listener);
}

let lastWrite = 0;

/** Aktywność w tej karcie, widoczna dla pozostałych. `force` - po odblokowaniu. */
export function recordActivity(now = Date.now(), force = false) {
    if (!force && now - lastWrite < ACTIVITY_WRITE_EVERY_MS) return;
    lastWrite = now;
    write(ACTIVITY_KEY, String(now));
}

/** Ostatnia aktywność w którejkolwiek karcie (0, gdy nie wiadomo). */
export function lastSharedActivity(): number {
    const value = Number(read(ACTIVITY_KEY));
    return Number.isFinite(value) ? value : 0;
}

/** Tylko dla testów: throttling zapisu jest stanem modułu. */
export function resetActivityThrottleForTests() {
    lastWrite = 0;
}
