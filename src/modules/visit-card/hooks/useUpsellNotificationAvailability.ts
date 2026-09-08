import { useQuery } from '@tanstack/react-query';
import { useCapability } from '@/modules/subscription';
import { fetchAutomationConfig } from '@/modules/sms-campaigns/api/smsCampaignsApi';

const SMS_AUTOMATION_KEY = ['sms-automation'] as const;

export interface UpsellNotificationAvailability {
    /** Dopóki trwa, nie pokazujemy nic: mignięcie pola i jego zniknięcie jest gorsze niż chwila ciszy. */
    isLoading: boolean;
    /** Moduł komunikacji kupiony przez studio. */
    moduleEnabled: boolean;
    /** Szablon „Propozycja dodatkowych usług" włączony i z treścią. */
    templateReady: boolean;
}

/**
 * Czy jest o czym decydować przy „powiadom klienta o dodanych usługach".
 *
 * Checkbox nie jest samodzielną funkcją, tylko momentem wysyłki wiadomości
 * skonfigurowanej w Ustawieniach → Szablony. Studio z wyłączonym szablonem
 * „Propozycja dodatkowych usług" nie wyśle nic — zaznaczony checkbox byłby wtedy
 * obietnicą bez pokrycia, a jedyną odpowiedzią, jaką pracownik dostawał, było
 * „Szablon (…) jest wyłączony" JUŻ PO zapisaniu sugestii. Lepiej powiedzieć to
 * zawczasu, zamiast pozwolić kliknąć i wytłumaczyć się potem.
 *
 * Szablon włączony, ale pusty, czyta się tak samo: reguła wygląda na aktywną,
 * a nic z niej nie wychodzi (backend pilnuje tego przez `sendable`).
 */
export const useUpsellNotificationAvailability = (enabled: boolean): UpsellNotificationAvailability => {
    const comms = useCapability('COMM_SEND_TRANSACTIONAL');
    const moduleEnabled = comms.enabled;

    const templatesQuery = useQuery({
        queryKey: SMS_AUTOMATION_KEY,
        queryFn: fetchAutomationConfig,
        enabled: enabled && moduleEnabled,
        staleTime: 60_000,
    });

    const rule = templatesQuery.data?.upsellSuggestion;

    return {
        isLoading: comms.isLoading || (enabled && moduleEnabled && templatesQuery.isLoading),
        moduleEnabled,
        templateReady: !!rule?.enabled && (rule?.messageTemplate ?? '').trim().length > 0,
    };
};
