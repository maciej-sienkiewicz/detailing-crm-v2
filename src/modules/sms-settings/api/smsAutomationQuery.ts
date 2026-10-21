// src/modules/sms-settings/api/smsAutomationQuery.ts
import { queryOptions } from '@tanstack/react-query';
import { STALE_TIME } from '@/core/queryStaleTime';
import { fetchAutomationConfig } from './smsSettingsApi';

/**
 * Jedyny klucz ustawień automatyzacji SMS. Dawniej te same dane leżały też pod
 * `['sms-automation-config']`: zapis w Ustawieniach podmieniał tylko jedną kopię,
 * a okna montujące obie pytały serwer dwa razy.
 */
export const SMS_AUTOMATION_KEY = ['sms-automation'] as const;

export const smsAutomationQuery = () => queryOptions({
    queryKey: SMS_AUTOMATION_KEY,
    queryFn: fetchAutomationConfig,
    // Zapis podmienia cache przez setQueryData (szablony wiadomości, kreator SMS).
    staleTime: STALE_TIME.config,
});
