import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { employeeApi } from '../api/employeeApi';
import type { CreateContractPayload, EndContractPayload, CreateAmendmentPayload } from '../types';

const contractsKey = (employeeId: string) => ['employees', 'contracts', employeeId];
const amendmentsKey = (employeeId: string, contractId: string) => [
    'employees', 'contracts', employeeId, contractId, 'amendments',
];

export const useContracts = (employeeId: string) => {
    const { data, isLoading, isError, refetch } = useQuery({
        queryKey: contractsKey(employeeId),
        queryFn: () => employeeApi.listContracts(employeeId),
        enabled: !!employeeId,
    });
    return { contracts: data ?? [], isLoading, isError, refetch };
};

export const useCreateContract = (employeeId: string) => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (payload: CreateContractPayload) => employeeApi.createContract(employeeId, payload),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: contractsKey(employeeId) }),
    });
};

export const useEndContract = (employeeId: string) => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ contractId, payload }: { contractId: string; payload: EndContractPayload }) =>
            employeeApi.endContract(employeeId, contractId, payload),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: contractsKey(employeeId) }),
    });
};

export const useAmendments = (employeeId: string, contractId: string) => {
    const { data, isLoading, isError } = useQuery({
        queryKey: amendmentsKey(employeeId, contractId),
        queryFn: () => employeeApi.listAmendments(employeeId, contractId),
        enabled: !!employeeId && !!contractId,
    });
    return { amendments: data ?? [], isLoading, isError };
};

export const useCreateAmendment = (employeeId: string, contractId: string) => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (payload: CreateAmendmentPayload) =>
            employeeApi.createAmendment(employeeId, contractId, payload),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: amendmentsKey(employeeId, contractId) });
            // Compensation tab reads from this key — refresh it too
            queryClient.invalidateQueries({ queryKey: ['employees', 'compensation', employeeId] });
        },
    });
};
