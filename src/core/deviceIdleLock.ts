// src/core/deviceIdleLock.ts
//
// „Blokada po bezczynności" - ustawienie URZĄDZENIA, nie studia.
//
// Dawniej była jedna wartość na całe studio (studio_settings.idle_timeout_seconds):
// komputer w recepcji, który stoi na widoku klientów, i laptop właściciela w biurze
// blokowały się po tym samym czasie. Biznes chce ustawiać to per stanowisko, więc
// wartość mieszka w pamięci przeglądarki tego urządzenia i obowiązuje każde konto,
// które na nim pracuje (blokada chroni ekran, a nie osobę).
//
// Dopóki na urządzeniu nic nie ustawiono, obowiązuje dotychczasowa wartość studia
// (`user.idleTimeoutSeconds` z /auth/me) - po wdrożeniu żadne stanowisko nie traci
// blokady, którą miało.
//
// Sama blokada dalej żyje na serwerze (sessionLock.ts) - tu jest tylko „po ilu
// sekundach bez ruchu ją założyć".

import { useSyncExternalStore } from 'react';

const KEY = 'crm_device_idle_timeout_seconds';
/** Ta sama karta nie dostaje zdarzenia `storage` od własnego zapisu - stąd własne zdarzenie. */
const CHANGE_EVENT = 'crm:device-idle-timeout';

// localStorage potrafi rzucić (tryb prywatny, zablokowane dane witryny) - wtedy
// urządzenie po prostu nie ma własnego ustawienia i obowiązuje wartość studia.
const read = (): string | null => {
    try { return localStorage.getItem(KEY); } catch { return null; }
};

/** Sekundy bezczynności ustawione na tym urządzeniu; null - nie ustawiono (wartość studia). */
export function getDeviceIdleTimeout(): number | null {
    const raw = read();
    if (raw === null) return null;
    const seconds = Number(raw);
    return Number.isInteger(seconds) && seconds >= 0 ? seconds : null;
}

/** Zapis na tym urządzeniu; 0 - blokada wyłączona na tym urządzeniu. */
export function setDeviceIdleTimeout(seconds: number): boolean {
    try {
        localStorage.setItem(KEY, String(seconds));
    } catch {
        return false;
    }
    window.dispatchEvent(new Event(CHANGE_EVENT));
    return true;
}

function subscribe(onChange: () => void): () => void {
    const onStorage = (e: StorageEvent) => { if (e.key === KEY) onChange(); };
    window.addEventListener('storage', onStorage);
    window.addEventListener(CHANGE_EVENT, onChange);
    return () => {
        window.removeEventListener('storage', onStorage);
        window.removeEventListener(CHANGE_EVENT, onChange);
    };
}

/** Ustawienie tego urządzenia, aktualne także po zmianie w innej karcie. */
export const useDeviceIdleTimeout = (): number | null =>
    useSyncExternalStore(subscribe, getDeviceIdleTimeout, () => null);
