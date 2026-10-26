import { useQuery } from '@tanstack/react-query';
import { leadsSettingsApi } from './leadsSettingsApi';

/**
 * „Twórz zapytania z poczty” - jeden klucz dla ustawień i Tablicy: przełączenie w ustawieniach
 * od razu zmienia kafel zapytań na Tablicy (zachęta znika, wraca licznik).
 */
export const AUTO_LEAD_CONFIG_QUERY_KEY = ['settings', 'auto-lead-config'] as const;

export const useAutoLeadConfig = ({ enabled = true }: { enabled?: boolean } = {}) =>
    useQuery({
        queryKey: AUTO_LEAD_CONFIG_QUERY_KEY,
        queryFn: leadsSettingsApi.getAutoLeadConfig,
        enabled,
    });
