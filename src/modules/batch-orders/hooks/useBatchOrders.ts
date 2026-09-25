import { useQuery, useMutation, useQueryClient, type QueryClient } from '@tanstack/react-query';
import { batchOrderApi } from '../api/batchOrderApi';
import type {
    BatchServiceRequest,
    ContractorRequest,
    EntryRequest,
    EntryStatusFilter,
    SettlementRequest,
} from '../types';

export const CONTRACTORS_KEY = ['batch-orders', 'contractors'] as const;
export const OVERVIEW_KEY = ['batch-orders', 'overview'] as const;
export const ENTRIES_KEY = (contractorId: string) => ['batch-orders', 'entries', contractorId] as const;
export const ENTRY_PHOTOS_KEY = (entryId: string) => ['batch-orders', 'entry-photos', entryId] as const;
export const SETTLEMENT_HISTORY_KEY = (contractorId: string) => ['batch-orders', 'settlement-history', contractorId] as const;
export const BATCH_SERVICES_KEY = ['batch-orders', 'services'] as const;

/**
 * Każda zmiana wpisu przesuwa kwotę „do rozliczenia" w DWÓCH miejscach: w nagłówku
 * kontrahenta i przy jego nazwie na liście. Unieważnianie tylko listy wpisów
 * zostawiało na liście kontrahentów starą kwotę obok nowej - dwie różne sumy za
 * ten sam okres na jednym ekranie.
 */
function invalidateContractorMoney(qc: QueryClient, contractorId: string) {
    qc.invalidateQueries({ queryKey: ENTRIES_KEY(contractorId) });
    qc.invalidateQueries({ queryKey: OVERVIEW_KEY });
}

export function useContractors() {
    return useQuery({
        queryKey: CONTRACTORS_KEY,
        queryFn: batchOrderApi.listContractors,
    });
}

export function useContractorsOverview(from?: string, to?: string) {
    return useQuery({
        queryKey: [...OVERVIEW_KEY, from, to],
        queryFn: () => batchOrderApi.getOverview(from, to),
        // Zmiana miesiąca to nowy klucz; bez tego lista kontrahentów znikała na
        // moment przy każdym kliknięciu strzałki, co czyta się jak utrata danych.
        placeholderData: previous => previous,
    });
}

export function useContractorEntries(
    contractorId: string,
    from?: string,
    to?: string,
    status: EntryStatusFilter = 'OPEN',
) {
    return useQuery({
        queryKey: [...ENTRIES_KEY(contractorId), from, to, status],
        queryFn: () => batchOrderApi.getContractorEntries(contractorId, from, to, status),
        enabled: !!contractorId,
        // Przełączenie statusu albo okresu to nowy klucz - lista nie ma mrugać pustką.
        placeholderData: previous => previous,
    });
}

function invalidateContractorLists(qc: QueryClient) {
    qc.invalidateQueries({ queryKey: CONTRACTORS_KEY });
    qc.invalidateQueries({ queryKey: OVERVIEW_KEY });
}

export function useCreateContractor() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (data: ContractorRequest) => batchOrderApi.createContractor(data),
        onSuccess: () => invalidateContractorLists(qc),
    });
}

export function useUpdateContractor() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: ({ contractorId, data }: { contractorId: string; data: ContractorRequest }) =>
            batchOrderApi.updateContractor(contractorId, data),
        onSuccess: (_, { contractorId }) => {
            invalidateContractorLists(qc);
            // Nazwa i NIP kontrahenta jadą też w odpowiedzi listy wpisów.
            qc.invalidateQueries({ queryKey: ENTRIES_KEY(contractorId) });
        },
    });
}

export function useDeleteContractor() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (contractorId: string) => batchOrderApi.deleteContractor(contractorId),
        onSuccess: () => invalidateContractorLists(qc),
    });
}

export function useCreateEntry(contractorId: string) {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (data: EntryRequest) => batchOrderApi.createEntry(contractorId, data),
        onSuccess: () => invalidateContractorMoney(qc, contractorId),
    });
}

export function useUpdateEntry(contractorId: string) {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: ({ entryId, data }: { entryId: string; data: EntryRequest }) =>
            batchOrderApi.updateEntry(entryId, data),
        onSuccess: () => invalidateContractorMoney(qc, contractorId),
    });
}

export function useDeleteEntry(contractorId: string) {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (entryId: string) => batchOrderApi.deleteEntry(entryId),
        onSuccess: () => invalidateContractorMoney(qc, contractorId),
    });
}

export function useReopenEntry(contractorId: string) {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (entryId: string) => batchOrderApi.reopenEntry(entryId),
        onSuccess: () => invalidateContractorMoney(qc, contractorId),
    });
}

export function useEntryPhotos(entryId: string) {
    return useQuery({
        queryKey: ENTRY_PHOTOS_KEY(entryId),
        queryFn: () => batchOrderApi.listEntryPhotos(entryId),
        enabled: !!entryId,
    });
}

export function useDeleteEntryPhoto(entryId: string, contractorId: string) {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (photoId: string) => batchOrderApi.deleteEntryPhoto(entryId, photoId),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ENTRY_PHOTOS_KEY(entryId) });
            // Liczba zdjęć stoi w wierszu tabeli.
            qc.invalidateQueries({ queryKey: ENTRIES_KEY(contractorId) });
        },
    });
}

export function useSettle(contractorId: string) {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (request: SettlementRequest) => batchOrderApi.settle(contractorId, request),
        onSuccess: () => {
            invalidateContractorMoney(qc, contractorId);
            qc.invalidateQueries({ queryKey: SETTLEMENT_HISTORY_KEY(contractorId) });
            // Adres podany przy wysyłce trafia do karty kontrahenta, jeśli jej brakowało.
            invalidateContractorLists(qc);
        },
    });
}

/**
 * Jeden klucz dla historii w całym module. Wcześniej okno rozliczenia czytało ją pod
 * własnym kluczem, którego rozliczenie nie unieważniało - ostrzeżenie „to zestawienie
 * poszło już e-mailem" opierało się na nieświeżych danych.
 */
export function useSettlementHistory(contractorId: string, enabled = true) {
    return useQuery({
        queryKey: SETTLEMENT_HISTORY_KEY(contractorId),
        queryFn: () => batchOrderApi.getSettlementHistory(contractorId),
        enabled: !!contractorId && enabled,
    });
}

// ─── Service catalog ──────────────────────────────────────────────────────────

export function useBatchServices(search?: string) {
    return useQuery({
        queryKey: [...BATCH_SERVICES_KEY, search ?? ''],
        queryFn: () => batchOrderApi.listServices(search),
    });
}

export function useCreateBatchService() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (data: BatchServiceRequest) => batchOrderApi.createService(data),
        onSuccess: () => qc.invalidateQueries({ queryKey: BATCH_SERVICES_KEY }),
    });
}

export function useUpdateBatchService() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: ({ serviceId, data }: { serviceId: string; data: BatchServiceRequest }) =>
            batchOrderApi.updateService(serviceId, data),
        onSuccess: () => qc.invalidateQueries({ queryKey: BATCH_SERVICES_KEY }),
    });
}

export function useDeleteBatchService() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (serviceId: string) => batchOrderApi.deleteService(serviceId),
        onSuccess: () => qc.invalidateQueries({ queryKey: BATCH_SERVICES_KEY }),
    });
}
