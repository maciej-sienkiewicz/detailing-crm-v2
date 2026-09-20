// ─── Personal-data (PII) access state ───────────────────────────────────────
//
// The backend masks personal data irreversibly at serialization time: the real
// values NEVER reach the browser without the CUSTOMERS_VIEW_PERSONAL_DATA
// permission. Everything in this module is therefore purely presentational:
// it detects that data is masked and lets the UI render a blur state instead
// of a bare "***". Nothing here protects anything (there is nothing to protect
// client-side), so tampering with it reveals nothing.

import { useSyncExternalStore } from 'react';

/** Sentinel the backend serializer writes in place of masked personal data. */
export const PII_MASK = '***';

/** True when the given API value is the backend's irreversible mask. */
export const isPiiMasked = (value: string | null | undefined): value is string =>
    value === PII_MASK;

/**
 * Joins name parts that may each be masked; if any part is masked the whole
 * expression is treated as masked (rendering "*** ***" reads terribly).
 */
export const joinPiiName = (
    ...parts: Array<string | null | undefined>
): string | null => {
    const present = parts.filter((p): p is string => !!p);
    if (present.length === 0) return null;
    if (present.some(isPiiMasked)) return PII_MASK;
    return present.join(' ');
};

/**
 * Scala rekord z transmisji ROZGŁOSZENIOWEJ z tym, co już leży w pamięci podręcznej.
 *
 * ── Po co to w ogóle istnieje ───────────────────────────────────────────────
 *
 * Topic WebSocketu jest wspólny dla całego studia, a uprawnienia subskrybentów są
 * w chwili nadania nieznane, więc backend nadaje wszystkie rozgłoszenia z danymi
 * osobowymi ZAMASKOWANYMI (PiiAccessContext.withMasked w WebSocketEventBridge).
 * To jest poprawne i nie wolno tego zmieniać: inaczej nazwisko klienta trafiałoby
 * do każdego zalogowanego pracownika niezależnie od tego, czy wolno mu je widzieć.
 *
 * Skutek uboczny jest jednak taki, że odbiorca, KTÓRY MA prawo do danych, dostaje
 * rekord uboższy niż ten, który już ma z REST-a. Wpisanie takiego rekordu wprost do
 * pamięci podręcznej zamienia nazwisko klienta na „***" po każdej operacji, która
 * wywołuje rozgłoszenie. Dane nie są utracone - po prostu nie przyjechały.
 *
 * Dlatego: maska w polu przychodzącym znaczy „nic o tym nie powiedziano", a nie
 * „zmieniło się na gwiazdki". Zostaje wartość, którą już znamy.
 *
 * ⚠️ Nie ma tu żadnej ochrony do obejścia: jeżeli w pamięci podręcznej leży prawdziwe
 * nazwisko, to znaczy, że serwer już je wcześniej wydał temu użytkownikowi przez REST.
 * Ta funkcja niczego nie odsłania, tylko przestaje zasłaniać to, co było widoczne.
 */
export function mergeMaskedPii<T extends object>(
    previous: T | undefined,
    incoming: T,
    piiFields: ReadonlyArray<keyof T>
): T {
    if (!previous) return incoming;
    let merged: T | null = null;
    for (const field of piiFields) {
        if (!isPiiMasked(incoming[field] as unknown as string | null | undefined)) continue;
        const known = previous[field];
        if (known === undefined || known === null) continue;
        if (isPiiMasked(known as unknown as string | null | undefined)) continue;
        merged = merged ?? { ...incoming };
        merged[field] = known;
    }
    return merged ?? incoming;
}

/** Czy w rekordzie z rozgłoszenia którekolwiek z pól osobowych przyjechało zamaskowane. */
export function hasMaskedPii<T extends object>(
    record: T,
    piiFields: ReadonlyArray<keyof T>
): boolean {
    return piiFields.some((field) =>
        isPiiMasked(record[field] as unknown as string | null | undefined)
    );
}

type Listener = () => void;

let piiGranted = true; // optimistic until the first response says otherwise
const listeners = new Set<Listener>();

/** Called by the apiClient interceptor with the X-Pii-Access response header. */
export const setPiiAccessFromHeader = (headerValue: unknown): void => {
    if (headerValue !== 'granted' && headerValue !== 'masked') return;
    const granted = headerValue === 'granted';
    if (granted === piiGranted) return;
    piiGranted = granted;
    listeners.forEach(l => l());
};

const subscribe = (listener: Listener): (() => void) => {
    listeners.add(listener);
    return () => listeners.delete(listener);
};

const getSnapshot = () => piiGranted;

/**
 * Whether the current user's responses carry real personal data (`true`) or
 * masked placeholders (`false`). Driven by the `X-Pii-Access` header the
 * backend attaches to every response.
 */
export const usePiiAccess = (): boolean =>
    useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
