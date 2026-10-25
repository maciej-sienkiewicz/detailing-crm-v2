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
import { hoursKey, setStudioHours } from './utils/slots';

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

/**
 * Godziny hali ze studia jako domyślne dla osi planu i licznika czasu pracy
 * (`setStudioHours` w utils/slots.ts). Ustawiane w renderze, bo dzieci liczą oś w tym
 * samym renderze - efekt spóźniłby się o jedną klatkę z godzinami domyślnymi.
 * Zwraca klucz godzin: widok podaje go jako `key`, żeby po zmianie godzin przeliczyć
 * zapamiętane osie od zera.
 */
export const useStudioHours = (): string => {
    const settings = useBaysSettings().data;
    // Serwer sprzed V222 nie przysyła godzin - zostają domyślne.
    if (settings && typeof settings.dayOpens === 'number') setStudioHours(settings);
    return hoursKey();
};
