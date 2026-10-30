// src/modules/finance/hooks/useVisitDocumentCorrection.ts
//
// Stan zmiany kwoty dokumentu z wydania pojazdu w oknie „Edytuj dokument”: rozliczenie
// wizyty, ceny usług tego dokumentu, podgląd skutków z serwera i zapis poprawki.
// Reguły, dlaczego to poprawka rozliczenia, a nie edycja dokumentu - visitDocumentCorrection.ts.

import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { settlementApi } from '@/modules/visits/api/settlementApi';
import { visitKeys } from '@/modules/visits/api/visitKeys';
import {
    changedServiceLines, lineFromService, priceOfLine, totalGrossCents, totalNetCents, withPriceChange,
    type SettlementLineDraft,
} from '@/modules/visits/utils/settlementLines';
import type { HandoverPrice } from '@/modules/visits/types/handover';
import type { FinancialDocument } from '../types';
import {
    visitDocumentCorrectionRequest,
    visitDocumentScope,
} from '../utils/visitDocumentCorrection';
import type { PaymentMethod } from '@/modules/visits/types/stateTransitions';
import { useInvalidateFinance } from './useFinance';

/** Pytanie serwera o skutki dopiero po chwili ciszy - jak w „Popraw rozliczenie”. */
const PREVIEW_DEBOUNCE_MS = 350;

/**
 * Forma płatności i termin idą jako dwie wartości, nie obiekt: nowy obiekt przy każdym
 * renderze to nowe żądanie, a wtedy podgląd nigdy nie byłby „aktualny”.
 */
export const useVisitDocumentCorrection = (
    document: FinancialDocument,
    paymentMethod: PaymentMethod,
    dueDate: string,
    /** Okno edytuje dokument z wydania pojazdu; dla reszty dokumentów hook nic nie pobiera. */
    enabled: boolean,
) => {
    const visitId = document.visitId ?? '';
    const queryClient = useQueryClient();
    const invalidateFinance = useInvalidateFinance();

    // Ten sam klucz co okno poprawki w wizycie: po zapisie w jednym drugie nie pokaże starego stanu.
    const settlement = useQuery({
        queryKey: ['settlement', visitId],
        queryFn: () => settlementApi.get(visitId),
        enabled: enabled && visitId !== '',
    });
    const view = settlement.data;
    const scope = useMemo(() => (view ? visitDocumentScope(view, document.id) : null), [view, document.id]);

    // Pozycje rodzą się z rozliczenia, gdy przyjdzie; do tego czasu lista jest pusta.
    const [lines, setLines] = useState<SettlementLineDraft[] | null>(null);
    const currentLines = useMemo(
        () => lines ?? scope?.services.map(lineFromService) ?? [],
        [lines, scope],
    );
    const pricesChanged = changedServiceLines(currentLines).length > 0;

    const savedDueDate = document.dueDate ?? '';
    const documentNumber = document.documentNumber;
    const request = useMemo(
        () => (view && scope && !scope.lock
            ? visitDocumentCorrectionRequest(view, scope, currentLines, {
                paymentMethod,
                dueDate,
                dueDateCarried: dueDate === savedDueDate,
            }, documentNumber)
            : null),
        [view, scope, currentLines, paymentMethod, dueDate, savedDueDate, documentNumber],
    );

    const [debounced, setDebounced] = useState(request);
    useEffect(() => {
        const timer = window.setTimeout(() => setDebounced(request), PREVIEW_DEBOUNCE_MS);
        return () => window.clearTimeout(timer);
    }, [request]);

    const preview = useQuery({
        queryKey: ['settlement-preview', visitId, debounced],
        queryFn: () => settlementApi.preview(visitId, debounced!),
        placeholderData: previous => previous,
        enabled: enabled && pricesChanged && debounced !== null && debounced.services.length > 0,
    });
    const upToDate = debounced === request && !preview.isFetching;

    const correct = useMutation({
        mutationFn: () => settlementApi.correct(visitId, request!),
        onSuccess: () => {
            // Poprawka zmienia ceny w wizycie, dokumenty, kasę i może fakturę - odświeżamy
            // wszystko, co je pokazuje, jak po „Popraw rozliczenie”.
            queryClient.invalidateQueries({ queryKey: visitKeys.scope(visitId) });
            queryClient.invalidateQueries({ queryKey: ['settlement', visitId] });
            queryClient.invalidateQueries({ queryKey: ['ksef', 'revenue'] });
            invalidateFinance();
        },
    });

    const blockReason = preview.data?.blockReason ?? null;
    const effects = pricesChanged && upToDate && preview.data && !blockReason ? preview.data : null;

    const changePrice = (serviceId: string, changes: Partial<Pick<HandoverPrice, 'net' | 'gross' | 'vatRate'>>) =>
        setLines(prev => (prev ?? currentLines).map(line => (line.id === serviceId ? withPriceChange(line, changes) : line)));
    const reset = () => setLines(null);

    const originalGross = scope?.services.reduce((sum, s) => sum + s.grossCents, 0) ?? 0;
    const newGross = totalGrossCents(currentLines);
    const newNet = totalNetCents(currentLines);

    return {
        isLoading: settlement.isLoading,
        isError: settlement.isError,
        retry: settlement.refetch,
        view,
        scope,
        prices: currentLines.map(priceOfLine),
        changePrice,
        reset,
        pricesChanged,
        originalGross,
        newGross,
        newNet,
        preview: {
            isChecking: pricesChanged && !upToDate,
            isError: preview.isError,
            error: preview.error,
            blockReason: pricesChanged ? blockReason : null,
            effects,
        },
        canSave: pricesChanged && !!effects && !correct.isPending,
        save: correct.mutateAsync,
        isSaving: correct.isPending,
    };
};
