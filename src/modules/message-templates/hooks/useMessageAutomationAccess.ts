// src/modules/message-templates/hooks/useMessageAutomationAccess.ts
import { usePermissions } from '@/core/permissions';
import { useCapability } from '@/modules/subscription';

/**
 * Czy wolno czytać ustawienia automatyzacji SMS i e-mail
 * (`GET /v1/sms-campaigns/automation`, `GET /v1/email-campaigns/automation`).
 *
 * Te same warunki co na serwerze: moduł z wiadomościami do klientów
 * (`COMM_SEND_TRANSACTIONAL`) i uprawnienie `COMMUNICATION_SEND`. Bez tej bramki
 * zapytanie wychodziło przy każdym otwarciu kalendarza i okien przyjęcia - studio bez
 * modułu dostawało 402, pracownik bez uprawnienia 403, a każdy 403 odświeżał jeszcze
 * /auth/me. Okna mają bezpieczny stan zapasowy, gdy ustawień nie ma.
 */
export const useMessageAutomationAccess = (): boolean => {
    const { can } = usePermissions();
    const comms = useCapability('COMM_SEND_TRANSACTIONAL');
    return comms.enabled && can('COMMUNICATION_SEND');
};
