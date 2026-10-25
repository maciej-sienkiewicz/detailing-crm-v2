// src/modules/bays/hooks/useBays.ts

import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { baysApi } from '../api/baysApi';
import { addDays, mondayOf } from '../utils/slots';

/** Wspólny początek kluczy - każda zmiana odświeża i odczyt hali, i ustawienia. */
export const BAYS_KEY = ['bays'] as const;

/**
 * Odczyt hali w zakresie osi. Bez zakresu - tydzień bieżący: tyle potrzebuje tablica
 * „Teraz" (auta w warsztacie i ich najbliższy plan serwer dołącza zawsze).
 */
export const useBaysSnapshot = (range?: { from: Date; to: Date }, enabled = true) => {
    const from = range?.from ?? mondayOf(new Date());
    const to = range?.to ?? addDays(from, 7);
    return useQuery({
        queryKey: [...BAYS_KEY, 'board', from.toISOString(), to.toISOString()],
        queryFn: () => baysApi.snapshot(from, to),
        enabled,
        // Hala zmienia się z każdym wjazdem - odczyt odświeżany co pół minuty i po powrocie do karty.
        refetchInterval: 30_000,
        placeholderData: previous => previous,
    });
};

/** Mutacja stanowisk: po każdej zmianie odświeża odczyt hali, z którego liczona jest cała tablica. */
export function useBaysMutation<A extends unknown[], R>(fn: (...args: A) => Promise<R>) {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (args: A) => fn(...args),
        onSettled: () => queryClient.invalidateQueries({ queryKey: BAYS_KEY }),
    });
}

/** „Teraz" odświeżane co pół minuty - liczniki „od 7:55, 3 h 10 min" idą same. */
export const useBaysNow = (): Date => {
    const [now, setNow] = useState(() => new Date());
    useEffect(() => {
        const id = window.setInterval(() => setNow(new Date()), 30_000);
        return () => window.clearInterval(id);
    }, []);
    return now;
};
