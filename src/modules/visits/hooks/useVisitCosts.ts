// src/modules/visits/hooks/useVisitCosts.ts
//
// Koszty i zysk wizyty. Przypięcie i odpięcie zwracają cały rachunek wizyty, więc
// odpowiedź serwera od razu zastępuje dane w pamięci - zysk zmienia się bez drugiego
// zapytania i bez liczenia czegokolwiek po stronie przeglądarki (sumy liczy serwer,
// tą samą regułą co finanse).

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { KSEF_EXPENSES_KEY } from '@/modules/finance/hooks/useKsef';
import { visitCostsApi, type VisitCosts } from '../api/visitCostsApi';

/** Korzeń kluczy - finanse unieważniają go, gdy ukrycie albo usunięcie dokumentu zmienia czyjś zysk. */
export const VISIT_COSTS_KEY = ['visit-costs'] as const;
export const visitCostsKey = (visitId: string) => [...VISIT_COSTS_KEY, visitId] as const;
export const visitCostCandidatesKey = (visitId: string, search: string) =>
    [...VISIT_COSTS_KEY, visitId, 'candidates', search] as const;

export function useVisitCosts(visitId: string | undefined, enabled: boolean) {
    const queryClient = useQueryClient();
    const active = enabled && !!visitId;

    const { data, isLoading, isError, refetch } = useQuery({
        queryKey: visitCostsKey(visitId ?? ''),
        queryFn: () => visitCostsApi.get(visitId as string),
        enabled: active,
    });

    const applySummary = (summary: VisitCosts) => {
        queryClient.setQueryData(visitCostsKey(summary.visitId), summary);
        // Okno przypinania pokazuje, który dokument jest już czyj - po zmianie ma to wiedzieć.
        queryClient.invalidateQueries({ queryKey: [...VISIT_COSTS_KEY, summary.visitId, 'candidates'] });
        // Przeniesienie zmienia rachunek wizyty, z której dokument zabrano.
        queryClient.invalidateQueries({
            queryKey: VISIT_COSTS_KEY,
            predicate: q => q.queryKey[1] !== summary.visitId,
        });
        // Lista dokumentów kosztowych w finansach pokazuje wizytę przy dokumencie.
        queryClient.invalidateQueries({ queryKey: KSEF_EXPENSES_KEY });
        // Przypięcie i odpięcie lądują w historii wizyty.
        queryClient.invalidateQueries({ queryKey: ['activity', 'entity-feed'] });
    };

    const link = useMutation({
        mutationFn: ({ costDocumentId, reassign }: { costDocumentId: string; reassign?: boolean }) =>
            visitCostsApi.link(visitId as string, costDocumentId, reassign),
        onSuccess: applySummary,
    });

    const unlink = useMutation({
        mutationFn: (costDocumentId: string) => visitCostsApi.unlink(visitId as string, costDocumentId),
        onSuccess: applySummary,
    });

    return { costs: data, isLoading: active && isLoading, isError, refetch, link, unlink };
}
