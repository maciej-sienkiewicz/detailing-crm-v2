import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { batchOrderApi } from '../api/batchOrderApi';
import type { BatchServiceRequest, ContractorRequest, EntryRequest, SettlementRequest } from '../types';

export const CONTRACTORS_KEY = ['batch-orders', 'contractors'] as const;
export const ENTRIES_KEY = (contractorId: string) => ['batch-orders', 'entries', contractorId] as const;
export const ENTRY_PHOTOS_KEY = (entryId: string) => ['batch-orders', 'entry-photos', entryId] as const;
export const SETTLEMENT_HISTORY_KEY = (contractorId: string) => ['batch-orders', 'settlement-history', contractorId] as const;
export const BATCH_SERVICES_KEY = ['batch-orders', 'services'] as const;

export function useContractors() {
    return useQuery({
        queryKey: CONTRACTORS_KEY,
        queryFn: batchOrderApi.listContractors,
    });
}

export function useContractorEntries(
    contractorId: string,
    from?: string,
    to?: string,
    includeSettled = false,
) {
    return useQuery({
        queryKey: [...ENTRIES_KEY(contractorId), from, to, includeSettled],
        queryFn: () => batchOrderApi.getContractorEntries(contractorId, from, to, includeSettled),
        enabled: !!contractorId,
        // Toggling "Pokaż rozliczone" re-queries under a new key; without this the list
        // blanks out for a moment on every toggle, which reads as data being lost.
        placeholderData: previous => previous,
    });
}

export function useCreateContractor() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (data: ContractorRequest) => batchOrderApi.createContractor(data),
        onSuccess: () => qc.invalidateQueries({ queryKey: CONTRACTORS_KEY }),
    });
}

export function useUpdateContractor() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: ({ contractorId, data }: { contractorId: string; data: ContractorRequest }) =>
            batchOrderApi.updateContractor(contractorId, data),
        onSuccess: () => qc.invalidateQueries({ queryKey: CONTRACTORS_KEY }),
    });
}

export function useDeleteContractor() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (contractorId: string) => batchOrderApi.deleteContractor(contractorId),
        onSuccess: () => qc.invalidateQueries({ queryKey: CONTRACTORS_KEY }),
    });
}

export function useCreateEntry(contractorId: string) {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (data: EntryRequest) => batchOrderApi.createEntry(contractorId, data),
        onSuccess: () => qc.invalidateQueries({ queryKey: ENTRIES_KEY(contractorId) }),
    });
}

export function useUpdateEntry(contractorId: string) {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: ({ entryId, data }: { entryId: string; data: EntryRequest }) =>
            batchOrderApi.updateEntry(entryId, data),
        onSuccess: () => qc.invalidateQueries({ queryKey: ENTRIES_KEY(contractorId) }),
    });
}

export function useDeleteEntry(contractorId: string) {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (entryId: string) => batchOrderApi.deleteEntry(entryId),
        onSuccess: () => qc.invalidateQueries({ queryKey: ENTRIES_KEY(contractorId) }),
    });
}

export function useEntryPhotos(entryId: string) {
    return useQuery({
        queryKey: ENTRY_PHOTOS_KEY(entryId),
        queryFn: () => batchOrderApi.listEntryPhotos(entryId),
        enabled: !!entryId,
    });
}

export function useDeleteEntryPhoto(entryId: string) {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (photoId: string) => batchOrderApi.deleteEntryPhoto(entryId, photoId),
        onSuccess: () => qc.invalidateQueries({ queryKey: ENTRY_PHOTOS_KEY(entryId) }),
    });
}

export function useSettle(contractorId: string) {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (request: SettlementRequest) => batchOrderApi.settle(contractorId, request),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ENTRIES_KEY(contractorId) });
            qc.invalidateQueries({ queryKey: SETTLEMENT_HISTORY_KEY(contractorId) });
        },
    });
}

export function useSettlementHistory(contractorId: string) {
    return useQuery({
        queryKey: SETTLEMENT_HISTORY_KEY(contractorId),
        queryFn: () => batchOrderApi.getSettlementHistory(contractorId),
        enabled: !!contractorId,
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
