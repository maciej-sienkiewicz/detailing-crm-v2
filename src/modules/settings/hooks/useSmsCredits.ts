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

// Pakiety i historia są na backendzie @RequiresOwner - poza właścicielem zapytanie
// kończyłoby się 403, więc sekcja w ogóle go nie wysyła.
export function useSmsCreditPackages(options?: { enabled?: boolean }) {
    return useQuery({
        queryKey: KEYS.packages,
        queryFn:  smsCreditApi.getPackages,
        enabled:  options?.enabled ?? true,
    });
}

export function useSmsCreditTransactions(page: number, size: number, options?: { enabled?: boolean }) {
    return useQuery({
        queryKey: KEYS.transactions(page, size),
        queryFn:  () => smsCreditApi.getTransactions(page, size),
        enabled:  options?.enabled ?? true,
        placeholderData: previous => previous,
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
