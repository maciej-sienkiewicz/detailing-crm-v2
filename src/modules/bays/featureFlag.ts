// src/modules/bays/featureFlag.ts
//
// Dwa poziomy włączenia i oba są potrzebne:
//
//   1. DOSTĘPNOŚĆ w tej wersji aplikacji (`isBaysAvailable`) - przełącznik prototypu.
//      Wyłączony: stanowisk nie ma nigdzie, także w Ustawieniach. Wycofanie funkcji
//      zaczyna się tutaj.
//   2. DECYZJA STUDIA (`useBaysEnabled`) - Ustawienia → Stanowiska → „Korzystaj ze
//      stanowisk". Studio, które nie dzieli hali na stanowiska, nie widzi pozycji
//      w menu ani paska w wizycie. Domyślnie wyłączone: to nowa praca dla zespołu,
//      więc włącza ją świadomie właściciel.
//
// Każde wpięcie poza tym folderem pyta tylko te funkcje - wycofanie to `grep bays`.
//
// Prototyp: dostępność włącza VITE_FEATURE_BAYS=true albo `localStorage["feature:bays"] = "1"`,
// a decyzja studia leży w przeglądarce. Docelowo to ustawienie firmy zapisane na serwerze
// i sprawdzane także przez API stanowisk.

import { useSyncExternalStore } from 'react';

const STUDIO_KEY = 'bays:studio-enabled';

export const isBaysAvailable = (): boolean => {
    if (import.meta.env.VITE_FEATURE_BAYS === 'true') return true;
    try {
        return localStorage.getItem('feature:bays') === '1';
    } catch {
        return false;
    }
};

const listeners = new Set<() => void>();

const readStudio = (): boolean => {
    try {
        return localStorage.getItem(STUDIO_KEY) === '1';
    } catch {
        return false;
    }
};

export const setBaysEnabled = (on: boolean): void => {
    try {
        localStorage.setItem(STUDIO_KEY, on ? '1' : '0');
    } catch {
        // Prywatne okno: przełącznik działa do przeładowania strony.
    }
    listeners.forEach(l => l());
};

const subscribe = (l: () => void) => {
    listeners.add(l);
    // Druga karta przeglądarki zmieniła ustawienie - ta też ma to zobaczyć.
    const onStorage = (e: StorageEvent) => { if (e.key === STUDIO_KEY) l(); };
    window.addEventListener('storage', onStorage);
    return () => { listeners.delete(l); window.removeEventListener('storage', onStorage); };
};

/** Czy studio korzysta ze stanowisk (i czy funkcja w ogóle jest w tej wersji). */
export const useBaysEnabled = (): boolean => {
    const studio = useSyncExternalStore(subscribe, readStudio, () => false);
    return isBaysAvailable() && studio;
};
