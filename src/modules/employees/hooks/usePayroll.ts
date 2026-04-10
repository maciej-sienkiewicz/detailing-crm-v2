import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { employeeApi } from '../api/employeeApi';
import type { GeneratePayrollPayload, ConfirmPayrollPayload } from '../types';

const payrollKey = (employeeId: string) => ['employees', 'payroll', employeeId];

export const usePayroll = (employeeId: string) => {
    const { data, isLoading, isError, refetch } = useQuery({
        queryKey: payrollKey(employeeId),
        queryFn: () => employeeApi.listPayroll(employeeId),
        enabled: !!employeeId,
        staleTime: 60_000,
    });
    return { entries: data ?? [], isLoading, isError, refetch };
};

export const usePayrollForPeriod = (period: string) => {
    const { data, isLoading, isError } = useQuery({
        queryKey: ['employees', 'payroll', 'period', period],
        queryFn: () => employeeApi.listPayrollForPeriod(period),
        enabled: !!period,
        staleTime: 60_000,
    });
    return { entries: data ?? [], isLoading, isError };
};

export const useGeneratePayroll = (employeeId: string) => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (payload: GeneratePayrollPayload) => employeeApi.generatePayroll(employeeId, payload),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: payrollKey(employeeId) }),
    });
};

export const useConfirmPayroll = (employeeId: string) => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ payrollId, payload }: { payrollId: string; payload: ConfirmPayrollPayload }) =>
            employeeApi.confirmPayroll(payrollId, payload),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: payrollKey(employeeId) }),
    });
};
