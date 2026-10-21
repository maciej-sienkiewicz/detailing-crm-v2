// src/modules/message-templates/hooks/useMessageDefaults.ts
//
// „Domyślnie zaznacz": każde okno, w którym pracownik decyduje, czy wiadomość wyjdzie
// do klienta (rezerwacja, przyjęcie pojazdu, wydanie, propozycja usług, zestawienie
// miesiąca), startuje z polem zaznaczonym albo pustym według ustawienia tej wiadomości
// w Ustawieniach → Wiadomości do klientów. Wcześniej stany początkowe były wpisane
// w kod każdego okna osobno i studio co rezerwację klikało to samo.
import { useCallback, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { smsAutomationQuery } from '@/modules/sms-settings/api/smsAutomationQuery';
import { emailAutomationQuery } from '@/modules/email-campaigns/api/emailAutomationQuery';
import type { SmsRuleKey } from '@/modules/sms-settings/types';
import type { EmailRuleKey } from '@/modules/email-campaigns/types';
import { useMessageAutomationAccess } from './useMessageAutomationAccess';

export interface MessageDefaults {
    /** undefined = ustawienia jeszcze się wczytują albo są niedostępne (brak uprawnień, modułu, starszy backend). */
    sms: (key: SmsRuleKey) => boolean | undefined;
    email: (key: EmailRuleKey) => boolean | undefined;
}

/** `enabled: false` - okno jest zamknięte i jeszcze nie potrzebuje ustawień. */
export function useMessageDefaults(options?: { enabled?: boolean }): MessageDefaults {
    // Bez modułu albo uprawnienia nie pytamy wcale (402/403) - okno ma bezpieczny stan zapasowy.
    const enabled = useMessageAutomationAccess() && (options?.enabled ?? true);
    // Te same klucze, co ekran szablonów (useMessageTemplates): zapis ustawień od razu
    // podmienia dane w cache, więc następne otwarte okno widzi nowy stan bez przeładowania.
    const { data: sms } = useQuery({ ...smsAutomationQuery(), enabled, retry: false });
    const { data: email } = useQuery({ ...emailAutomationQuery(), enabled, retry: false });

    // Brak pola (backend sprzed tej zmiany) to „nie wiadomo", nie „odznaczone" - okno
    // wraca wtedy do swojego dotychczasowego stanu, zamiast po cichu go zmienić.
    const smsDefault = useCallback((key: SmsRuleKey) => sms?.[key]?.checkedByDefault, [sms]);
    const emailDefault = useCallback((key: EmailRuleKey) => email?.[key]?.checkedByDefault, [email]);
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
