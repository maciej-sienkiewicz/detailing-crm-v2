// src/modules/message-templates/hooks/useMessageDefaults.ts
//
// „Domyślnie zaznacz": każde okno, w którym pracownik decyduje, czy wiadomość wyjdzie
// do klienta (rezerwacja, przyjęcie pojazdu, wydanie, propozycja usług, zestawienie
// miesiąca), startuje z polem zaznaczonym albo pustym według ustawienia tej wiadomości
// w Ustawieniach → Wiadomości do klientów. Wcześniej stany początkowe były wpisane
// w kod każdego okna osobno i studio co rezerwację klikało to samo.
import { useCallback, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchAutomationConfig } from '@/modules/sms-campaigns/api/smsCampaignsApi';
import { fetchEmailAutomationConfig } from '@/modules/email-campaigns/api/emailCampaignsApi';
import type { SmsRuleKey } from '@/modules/sms-campaigns/types';
import type { EmailRuleKey } from '@/modules/email-campaigns/types';

/*
 * Te same klucze, co ekran szablonów (useMessageTemplates): zapis ustawień od razu
 * podmienia dane w cache, więc następne otwarte okno widzi nowy stan bez przeładowania.
 */
const SMS_KEY = ['sms-automation'] as const;
const EMAIL_KEY = ['email-automation'] as const;

export interface MessageDefaults {
    /** undefined = ustawienia jeszcze się wczytują albo są niedostępne (brak uprawnień, modułu). */
    sms: (key: SmsRuleKey) => boolean | undefined;
    email: (key: EmailRuleKey) => boolean | undefined;
}

export function useMessageDefaults(): MessageDefaults {
    // Bez ponawiania: 403 (pracownik bez uprawnień do komunikacji) nie zmieni się po
    // trzech próbach, a okno i tak ma bezpieczny stan zapasowy.
    const { data: sms } = useQuery({ queryKey: SMS_KEY, queryFn: fetchAutomationConfig, retry: false, staleTime: 60_000 });
    const { data: email } = useQuery({ queryKey: EMAIL_KEY, queryFn: fetchEmailAutomationConfig, retry: false, staleTime: 60_000 });

    const smsDefault = useCallback(
        (key: SmsRuleKey) => (sms ? sms[key]?.checkedByDefault ?? false : undefined),
        [sms]
    );
    const emailDefault = useCallback(
        (key: EmailRuleKey) => (email ? email[key]?.checkedByDefault ?? false : undefined),
        [email]
    );
    return { sms: smsDefault, email: emailDefault };
}

/**
 * Pole „wyślij", które startuje ze stanu domyślnego i trzyma go, dopóki pracownik sam
 * go nie zmieni. Domyślny stan dociera z sieci - zwykle już po otwarciu okna - więc
 * nie wolno go wpisać raz do useState; a gdy pracownik już kliknął, późniejsze
 * wczytanie ustawień nie może mu tego przestawić.
 *
 * @param fallback stan, gdy ustawienia są niedostępne - dotychczasowe zachowanie okna.
 * @returns [wartość, ustaw, wróć do domyślnego] - „wróć" dla okien czyszczonych do zera.
 */
export function useDefaultChoice(defaultValue: boolean | undefined, fallback: boolean) {
    const [choice, setChoice] = useState<boolean | null>(null);
    const value = choice ?? defaultValue ?? fallback;
    const set = useCallback((next: boolean) => setChoice(next), []);
    const reset = useCallback(() => setChoice(null), []);
    return [value, set, reset] as const;
}
