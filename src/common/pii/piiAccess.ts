// ─── Personal-data (PII) access state ───────────────────────────────────────
//
// The backend masks personal data irreversibly at serialization time — the real
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
