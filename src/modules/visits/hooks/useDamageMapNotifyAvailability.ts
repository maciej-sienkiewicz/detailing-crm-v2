// src/modules/visits/hooks/useDamageMapNotifyAvailability.ts
//
// Czy „Poinformuj klienta o zmianach" ma w tym studiu jakikolwiek sens.
//
// Okno oferowało tę opcję zawsze, a backend odmawiał dopiero przy zapisie. Odmowa
// była poprawna i trafiała do historii komunikacji, ale przychodziła po fakcie:
// operator klikał „Tak, powiadom", zapisywał mapę i dopiero wtedy dowiadywał się,
// że klient nic nie dostał. To ten sam błąd, który opisuje `useSmsReadiness`:
// wymagania ujawniane po jednej odmowie na raz.
//
// Kluczowe i nieoczywiste: `COMM_SEND_TRANSACTIONAL` blokuje w bramce wysyłkowej
// OBA kanały, nie tylko SMS (`sendEmail` i `sendTransactionalSms` pytają o tę samą
// zdolność). Bez modułu komunikacji nie pójdzie ani mail, ani SMS, więc opcji nie
// ma czym obsłużyć i nie wolno jej pokazywać jako dostępnej.

import { useMemo } from 'react';
import { useCapability } from '@/modules/subscription';
import { useSmsCreditBalance } from '@/modules/settings/hooks/useSmsCredits';

export interface DamageMapNotifyAvailability {
    /** Render nic, nie blokadę: odpowiedź jest jeszcze w drodze. */
    isLoading: boolean;
    /** True, gdy istnieje kanał, którym wiadomość faktycznie wyjdzie. */
    canNotify: boolean;
    /** Krótkie „dlaczego nie", gotowe do pokazania operatorowi. Null, gdy można. */
    blockedReason: string | null;
    /**
     * Kanał, którym to pójdzie. Mail wygrywa, bo mapa uszkodzeń jest załącznikiem,
     * a SMS potrafi jedynie powiedzieć, ŻE dokument się zmienił — tak samo
     * rozstrzyga to backend.
     */
    channel: 'EMAIL' | 'SMS' | null;
}

interface Options {
    enabled?: boolean;
    customerEmail?: string | null;
    customerPhone?: string | null;
}

const hasText = (value: string | null | undefined): boolean =>
    !!value && value.trim().length > 0;

export const useDamageMapNotifyAvailability = ({
    enabled = true,
    customerEmail,
    customerPhone,
}: Options): DamageMapNotifyAvailability => {
    const comms = useCapability('COMM_SEND_TRANSACTIONAL');
    const moduleEnabled = comms.enabled;

    const email = hasText(customerEmail);
    const phone = hasText(customerPhone);

    /*
     * Kredyty pytamy tylko wtedy, gdy realnie rozstrzygają: przy mailu nie mają nic
     * do rzeczy, a endpoint salda sam jest za modułem. Bez tego warunku okno
     * wizyty bez adresu e-mail dobijałoby się o saldo przy każdym otwarciu.
     */
    const creditsMatter = enabled && moduleEnabled && !email && phone;
    const balanceQuery = useSmsCreditBalance({ enabled: creditsMatter });

    return useMemo<DamageMapNotifyAvailability>(() => {
        const isLoading = comms.isLoading || (creditsMatter && balanceQuery.isLoading);
        if (isLoading) {
            return { isLoading: true, canNotify: false, blockedReason: null, channel: null };
        }

        if (!moduleEnabled) {
            const moduleName = comms.missingFeatures.map(f => f.displayName).join(', ');
            return {
                isLoading: false,
                canNotify: false,
                blockedReason: moduleName
                    ? `moduł ${moduleName} nie jest aktywny w tym studiu`
                    : 'moduł wysyłki wiadomości nie jest aktywny w tym studiu',
                channel: null,
            };
        }

        if (email) {
            return { isLoading: false, canNotify: true, blockedReason: null, channel: 'EMAIL' };
        }

        if (!phone) {
            return {
                isLoading: false,
                canNotify: false,
                blockedReason: 'klient nie ma w kartotece ani adresu e-mail, ani numeru telefonu',
                channel: null,
            };
        }

        // Zostaje SMS, a ten kosztuje. Saldo `null` traktujemy jak dostępne: to
        // nieudany odczyt salda, nie potwierdzone zero, a blokowanie opcji na
        // podstawie nieodczytanej liczby byłoby zgadywaniem.
        const credits = balanceQuery.data?.availableCredits ?? null;
        if (credits !== null && credits <= 0) {
            return {
                isLoading: false,
                canNotify: false,
                blockedReason: 'brak kredytów SMS, a klient nie ma adresu e-mail',
                channel: null,
            };
        }

        return { isLoading: false, canNotify: true, blockedReason: null, channel: 'SMS' };
    }, [
        comms.isLoading, comms.missingFeatures, moduleEnabled,
        creditsMatter, balanceQuery.isLoading, balanceQuery.data,
        email, phone,
    ]);
};
