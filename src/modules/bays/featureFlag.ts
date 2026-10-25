// src/modules/bays/featureFlag.ts
//
// Czy studio korzysta ze stanowisk - Ustawienia → Stanowiska → „Korzystaj ze stanowisk",
// zapisane na serwerze (bay_settings). Studio, które nie dzieli hali na stanowiska, nie
// widzi pozycji w menu ani paska w wizycie. Domyślnie wyłączone: to nowa praca dla
// zespołu, więc włącza ją świadomie właściciel.
//
// Każde wpięcie poza tym folderem pyta tylko tę funkcję - wycofanie to `grep bays`.

import { useQuery } from '@tanstack/react-query';
import { usePermissions } from '@/core/permissions';
import { baysApi } from './api/baysApi';

export const BAYS_SETTINGS_KEY = ['bays', 'settings'] as const;

/**
 * Ustawienia stanowisk studia. Bez prawa do wizyt nie pytamy serwera wcale - menu
 * pyta o to przy każdym koncie, także recepcji bez wizyt.
 */
export const useBaysSettings = () => {
    const { can } = usePermissions();
    return useQuery({
        queryKey: BAYS_SETTINGS_KEY,
        queryFn: baysApi.settings,
        enabled: can('VISITS_VIEW'),
        staleTime: 60_000,
        retry: false,
    });
};

/** Czy studio korzysta ze stanowisk. */
export const useBaysEnabled = (): boolean => useBaysSettings().data?.enabled === true;
