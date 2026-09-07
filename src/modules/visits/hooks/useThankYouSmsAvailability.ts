import { useQuery } from '@tanstack/react-query';
import { useCapability } from '@/modules/subscription';
import { fetchAutomationConfig } from '@/modules/sms-campaigns/api/smsCampaignsApi';

const SMS_AUTOMATION_KEY = ['sms-automation'] as const;

interface UseThankYouSmsAvailabilityArgs {
    /** Pomija zapytania, gdy okno wydania jest zamknięte. */
    enabled: boolean;
    customerPhone?: string | null;
}

export interface ThankYouSmsAvailability {
    /** Czy w ogóle pokazywać wybór. */
    available: boolean;
    /** Dopóki trwa, nie pokazujemy nic: mignięcie pola i jego zniknięcie jest gorsze niż chwila ciszy. */
    isLoading: boolean;
}

/**
 * Czy przy wydaniu pojazdu jest o czym decydować.
 *
 * Pole „Wyślij SMS-a z podziękowaniem" nie jest samodzielną funkcją, tylko momentem
 * wysyłki wiadomości skonfigurowanej w Ustawieniach → Szablony. Studio, które szablon
 * „Podziękowanie po wizycie" ma wyłączony, nie wysyła takich SMS-ów w ogóle - pytanie
 * o godzinę byłoby wtedy obietnicą bez pokrycia, więc pole znika, a nie blokuje się.
 *
 * Tak samo czyta się szablon włączony, ale pusty: to stan, w którym reguła wygląda na
 * aktywną, a nic nie wychodzi (backend pilnuje tego przez `sendable`).
 */
export function useThankYouSmsAvailability({
    enabled,
    customerPhone,
}: UseThankYouSmsAvailabilityArgs): ThankYouSmsAvailability {
    const comms = useCapability('COMM_SEND_TRANSACTIONAL');
    const moduleEnabled = comms.enabled;

    const templatesQuery = useQuery({
        queryKey: SMS_AUTOMATION_KEY,
        queryFn: fetchAutomationConfig,
        enabled: enabled && moduleEnabled,
    });

    const rule = templatesQuery.data?.postVisit;
    const templateSendable = !!rule?.enabled && (rule?.messageTemplate ?? '').trim().length > 0;

    // Zamaskowany numer (brak uprawnienia do danych osobowych) nadal jest numerem:
    // wysyła backend, a pracownik nie musi go widzieć, żeby wybrać godzinę.
    const hasPhone = (customerPhone?.trim().length ?? 0) > 0;

    const isLoading = comms.isLoading || (enabled && moduleEnabled && templatesQuery.isLoading);

    return {
        available: !isLoading && moduleEnabled && templateSendable && hasPhone,
        isLoading,
    };
}
