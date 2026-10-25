// src/modules/bays/hooks/useBays.ts

import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { baysApi } from '../api/baysApi';
import { baysNow } from '../api/clock';

export const BAYS_KEY = ['bays', 'snapshot'] as const;

export const useBaysSnapshot = () => useQuery({ queryKey: BAYS_KEY, queryFn: baysApi.snapshot });

/** Mutacja stanowisk: po każdej zmianie odświeża jeden odczyt, z którego liczona jest cała hala. */
export function useBaysMutation<A extends unknown[], R>(fn: (...args: A) => Promise<R>) {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (args: A) => fn(...args),
        onSettled: () => queryClient.invalidateQueries({ queryKey: BAYS_KEY }),
    });
}

/** „Teraz" odświeżane co pół minuty - liczniki „od 7:55, 3 h 10 min" idą same. */
export const useBaysNow = (): Date => {
    const [now, setNow] = useState(baysNow);
    useEffect(() => {
        const id = window.setInterval(() => setNow(baysNow()), 30_000);
        return () => window.clearInterval(id);
    }, []);
    return now;
};
