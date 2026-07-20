import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { batchOrderApi } from '../api/batchOrderApi';
import type { ContractorRequest, EntryRequest } from '../types';

export const CONTRACTORS_KEY = ['batch-orders', 'contractors'] as const;
export const ENTRIES_KEY = (contractorId: string) => ['batch-orders', 'entries', contractorId] as const;

export function useContractors() {
    return useQuery({
        queryKey: CONTRACTORS_KEY,
        queryFn: batchOrderApi.listContractors,
    });
}

export function useContractorEntries(contractorId: string, from?: string, to?: string) {
    return useQuery({
        queryKey: [...ENTRIES_KEY(contractorId), from, to],
        queryFn: () => batchOrderApi.getContractorEntries(contractorId, from, to),
        enabled: !!contractorId,
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
