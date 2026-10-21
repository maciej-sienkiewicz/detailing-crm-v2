// src/modules/settings/api/companySettingsQuery.ts
import { queryOptions } from '@tanstack/react-query';
import { STALE_TIME } from '@/core/queryStaleTime';
import { companyApi } from './companyApi';

/**
 * Jedyny klucz danych firmy. Wydanie pojazdu trzymało je osobno pod `['company', 'settings']`,
 * więc pytało serwer drugi raz, a NIP uzupełniony przy wydaniu nie trafiał do Ustawień.
 */
export const COMPANY_SETTINGS_KEY = ['settings', 'company'] as const;

export const companySettingsQuery = () => queryOptions({
    queryKey: COMPANY_SETTINGS_KEY,
    queryFn: companyApi.getCompanySettings,
    // Zapis podmienia cache (setQueryData); bez tego każde wejście na kartę wizyty
    // i każde przemontowanie Sidebara pytało o dane firmy od nowa.
    staleTime: STALE_TIME.config,
});
