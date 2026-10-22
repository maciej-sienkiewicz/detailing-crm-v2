// src/modules/checkin/hooks/usePhoneSessionStatus.ts
//
// Strona komputera słucha, co robi telefon z kodu QR: czy człowiek przy aucie kliknął
// już „Gotowe". Bez tego okno na komputerze czekało w nieskończoność, a „Gotowe" na
// telefonie nie zmieniało nic po drugiej stronie.

import { useEffect, useState } from 'react';
import { checkinApi } from '../api/checkinApi';

const POLL_MS = 4_000;

/**
 * @returns true od chwili, gdy telefon kliknął „Gotowe" (do „Cofnij i edytuj" na telefonie).
 */
export const usePhoneSessionDone = (token: string | null, enabled = true): boolean => {
    // Wynik pamięta, dla którego tokenu został odczytany - nowy kod zaczyna od „nie".
    const [state, setState] = useState<{ token: string; done: boolean } | null>(null);

    useEffect(() => {
        if (!token || !enabled) return;
        let cancelled = false;
        const poll = async () => {
            try {
                const status = await checkinApi.getMobileStatus(token);
                if (!cancelled) setState({ token, done: status.userDone && status.sessionActive });
            } catch {
                // chwilowy brak sieci - spróbujemy przy następnym cyklu
            }
        };
        void poll();
        const id = setInterval(poll, POLL_MS);
        return () => { cancelled = true; clearInterval(id); };
    }, [token, enabled]);

    return !!token && state?.token === token && state.done;
};
