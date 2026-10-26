// src/modules/appointments/hooks/useRescheduleSms.ts
//
// Stan pola „Wyślij klientowi SMS o zmianie terminu" (RescheduleSmsChoice).

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { smsAutomationQuery } from '@/modules/sms-settings/api/smsAutomationQuery';
import { useMessageAutomationAccess } from '@/modules/message-templates/hooks/useMessageAutomationAccess';

/**
 * @param startChanged czy zapis przesuwa początek rezerwacji - tylko wtedy serwer wysyła SMS.
 * @returns `notifyCustomer` do zapisu: wybór, gdy pole jest widoczne; undefined, gdy nie ma
 *   czego pytać (serwer zostaje przy swoim - bez włączonej wiadomości i tak nic nie wyśle).
 */
export function useRescheduleSms(startChanged: boolean) {
    const access = useMessageAutomationAccess();
    const { data } = useQuery({ ...smsAutomationQuery(), enabled: access, retry: false });
    const ruleOn = data?.rescheduleConfirmation?.enabled === true;
    const [send, setSend] = useState(true);
    const visible = startChanged && ruleOn;
    return { visible, send, setSend, notifyCustomer: visible ? send : undefined };
}
