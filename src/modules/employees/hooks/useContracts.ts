import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { employeeApi } from '../api/employeeApi';
import type { CreateContractPayload, EndContractPayload } from '../types';

const contractsKey = (employeeId: string) => ['employees', 'contracts', employeeId];

export const useContracts = (employeeId: string) => {
    const { data, isLoading, isError, refetch } = useQuery({
        queryKey: contractsKey(employeeId),
        queryFn: () => employeeApi.listContracts(employeeId),
        enabled: !!employeeId,
        staleTime: 60_000,
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
