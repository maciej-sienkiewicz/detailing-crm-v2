import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { smsCreditApi } from '../api/smsCreditApi';

const KEYS = {
    balance:      ['sms-credits', 'balance'] as const,
    packages:     ['sms-credits', 'packages'] as const,
    transactions: (page: number, size: number) => ['sms-credits', 'transactions', page, size] as const,
};

export function useSmsCreditBalance(options?: { enabled?: boolean }) {
    return useQuery({
        queryKey: KEYS.balance,
        queryFn:  smsCreditApi.getBalance,
        enabled:  options?.enabled ?? true,
    });
}

export function useSmsCreditPackages() {
    return useQuery({
        queryKey: KEYS.packages,
        queryFn:  smsCreditApi.getPackages,
    });
}

export function useSmsCreditTransactions(page: number, size: number) {
    return useQuery({
        queryKey: KEYS.transactions(page, size),
        queryFn:  () => smsCreditApi.getTransactions(page, size),
    });
}

export function usePurchaseCredits() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (packageId: string) => smsCreditApi.purchaseCredits(packageId),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: KEYS.balance });
            qc.invalidateQueries({ queryKey: ['sms-credits', 'transactions'] });
        },
    });
}
