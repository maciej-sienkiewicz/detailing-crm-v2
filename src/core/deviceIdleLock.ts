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
// blokady, którą miało. Wyjątkiem jest telefon (zgłoszenie z 27.10): wartość studia
// dobierano pod komputery na wspólnych stanowiskach, a telefon jest osobisty i ma
// własną blokadę ekranu - dziedziczona blokada wylogowywała właściciela co chwilę.
// Na telefonie blokada jest więc domyślnie wyłączona; włącza ją tylko własne
// ustawienie tego urządzenia.
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

/**
 * Telefon, nie tablet: dotyk i krótszy bok FIZYCZNEGO ekranu poniżej 600 px.
 *
 * Nie `isMobileDevice()` z webPush - ono obejmuje tablety i iPady, a tablet w recepcji
 * albo przy podpisywaniu protokołów stoi na widoku klientów i ma się blokować dalej.
 * Ekran, a nie okno: zwężone okno na komputerze nie może wyłączać blokady.
 */
export function isPhone(): boolean {
    if (typeof window === 'undefined' || !window.matchMedia || !window.screen) return false;
    const touch = navigator.maxTouchPoints > 0 && window.matchMedia('(pointer: coarse)').matches;
    return touch && Math.min(window.screen.width, window.screen.height) < 600;
}

/**
 * Sekundy, po których to urządzenie naprawdę się blokuje; 0 - nie blokuje się.
 * Ustawienie urządzenia wygrywa; bez niego telefon się nie blokuje, a reszta bierze
 * wartość studia.
 */
export function effectiveIdleTimeoutSeconds(
    deviceSeconds: number | null,
    studioSeconds: number | null | undefined,
): number {
    if (deviceSeconds !== null) return deviceSeconds;
    if (isPhone()) return 0;
    return studioSeconds ?? 0;
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
