// src/modules/bays/hooks/useBays.ts

import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { baysApi } from '../api/baysApi';
import type { BaysSnapshot } from '../types';
import { addDays, mondayOf } from '../utils/slots';

/** Wspólny początek kluczy - każda zmiana odświeża i odczyt hali, i ustawienia. */
export const BAYS_KEY = ['bays'] as const;

/**
 * Odczyt hali w zakresie osi. Bez zakresu - tydzień bieżący: tyle potrzebuje pasek
 * „Na hali" w wizycie (auta w warsztacie i ich najbliższy plan serwer dołącza zawsze).
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

/** Bieżąca chwila odświeżana co pół minuty - linia „teraz" i liczniki idą same. */
export const useBaysNow = (): Date => {
    const [now, setNow] = useState(() => new Date());
    useEffect(() => {
        const id = window.setInterval(() => setNow(new Date()), 30_000);
        return () => window.clearInterval(id);
    }, []);
    return now;
};

/**
 * Zmiana widoczna od razu, zanim serwer odpowie. Bez tego pasek po upuszczeniu wracał
 * na stare miejsce na czas zapisu i dopiero potem przeskakiwał - przeciąganie wyglądało
 * na zepsute. Odpowiedź serwera i tak nadpisze odczyt (`useBaysMutation` go odświeża),
 * a przy błędzie wróci stan z bazy.
 */
export const usePatchBoard = () => {
    const queryClient = useQueryClient();
    return async (patch: (snap: BaysSnapshot) => BaysSnapshot) => {
        const key = [...BAYS_KEY, 'board'];
        // Odświeżenie w locie przyniosłoby stary stan i cofnęło pasek.
        await queryClient.cancelQueries({ queryKey: key });
        queryClient.setQueriesData<BaysSnapshot>({ queryKey: key }, old => (old ? patch(old) : old));
    };
};
