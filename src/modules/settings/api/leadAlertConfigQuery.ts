// src/modules/settings/api/leadAlertConfigQuery.ts
import { queryOptions } from '@tanstack/react-query';
import { leadsSettingsApi } from './leadsSettingsApi';

/**
 * Progi stygnięcia leadów pod jednym kluczem dla Ustawień i kolejki zapytań. Dawniej
 * kolejka trzymała własną kopię przez 30 minut, więc po zapisie w Ustawieniach (toast:
 * „Lista zapytań pokaże sprawy według nowych ustawień") pokazywała stare progi.
 */
export const LEAD_ALERT_CONFIG_KEY = ['settings', 'lead-alert-config'] as const;

export const leadAlertConfigQuery = () => queryOptions({
    queryKey: LEAD_ALERT_CONFIG_KEY,
    queryFn: leadsSettingsApi.getAlertConfig,
    // Ustawienie zmieniane raz na kwartał; zapis w Ustawieniach podmienia cache.
    staleTime: 30 * 60_000,
    retry: false,
});
