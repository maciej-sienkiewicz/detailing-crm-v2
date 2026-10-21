// src/modules/email-campaigns/api/emailAutomationQuery.ts
import { queryOptions } from '@tanstack/react-query';
import { STALE_TIME } from '@/core/queryStaleTime';
import { fetchEmailAutomationConfig } from './emailCampaignsApi';

/**
 * Jedyny klucz ustawień automatyzacji e-mail. Dawniej okno podpisu przy przyjęciu
 * trzymało je też pod `['email-automation-config']` i pytało serwer drugi raz.
 */
export const EMAIL_AUTOMATION_KEY = ['email-automation'] as const;

export const emailAutomationQuery = () => queryOptions({
    queryKey: EMAIL_AUTOMATION_KEY,
    queryFn: fetchEmailAutomationConfig,
    // Zapis podmienia cache przez setQueryData (szablony wiadomości, ustawienia e-mail).
    staleTime: STALE_TIME.config,
});
