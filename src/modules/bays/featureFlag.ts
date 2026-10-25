// src/modules/bays/featureFlag.ts
//
// Dwa poziomy włączenia i oba są potrzebne:
//
//   1. DOSTĘPNOŚĆ w tej wersji aplikacji (`isBaysAvailable`). Wyłączona: stanowisk nie
//      ma nigdzie, także w Ustawieniach, i aplikacja nie pyta o nie serwera. Wycofanie
//      funkcji zaczyna się tutaj.
//   2. DECYZJA STUDIA (`useBaysEnabled`) - Ustawienia → Stanowiska → „Korzystaj ze
//      stanowisk", zapisana na serwerze (bay_settings). Studio, które nie dzieli hali
//      na stanowiska, nie widzi pozycji w menu ani paska w wizycie. Domyślnie wyłączona.
//
// Każde wpięcie poza tym folderem pyta tylko te funkcje - wycofanie to `grep bays`.
// Dostępność włącza VITE_FEATURE_BAYS=true albo `localStorage["feature:bays"] = "1"`.

import { useQuery } from '@tanstack/react-query';
import { usePermissions } from '@/core/permissions';
import { baysApi } from './api/baysApi';

export const BAYS_SETTINGS_KEY = ['bays', 'settings'] as const;

export const isBaysAvailable = (): boolean => {
    if (import.meta.env.VITE_FEATURE_BAYS === 'true') return true;
    try {
        return localStorage.getItem('feature:bays') === '1';
    } catch {
        return false;
    }
};

/**
 * Ustawienia stanowisk studia. Bez dostępności w wersji albo bez prawa do wizyt nie
 * pytamy serwera wcale - menu pyta o to przy każdym koncie, także recepcji bez wizyt.
 */
export const useBaysSettings = () => {
    const { can } = usePermissions();
    return useQuery({
        queryKey: BAYS_SETTINGS_KEY,
        queryFn: baysApi.settings,
        enabled: isBaysAvailable() && can('VISITS_VIEW'),
        staleTime: 60_000,
        retry: false,
    });
};

/** Czy studio korzysta ze stanowisk (i czy funkcja w ogóle jest w tej wersji). */
export const useBaysEnabled = (): boolean => {
    const { data } = useBaysSettings();
    return isBaysAvailable() && data?.enabled === true;
};
