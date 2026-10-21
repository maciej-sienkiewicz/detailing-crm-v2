import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { usePermissions } from '@/core/permissions';
import { useCapability } from '@/modules/subscription';
import { smsCreditApi } from '../api/smsCreditApi';

const KEYS = {
    balance:      ['sms-credits', 'balance'] as const,
    packages:     ['sms-credits', 'packages'] as const,
    transactions: (page: number, size: number) => ['sms-credits', 'transactions', page, size] as const,
};

// Saldo jest na backendzie za modułem z kredytami SMS i uprawnieniem COMMUNICATION_SEND.
// Bez nich zapytanie kończyło się 402/403 - np. licznik w menu Ustawień przy każdym wejściu.
export function useSmsCreditBalance(options?: { enabled?: boolean }) {
    const { can } = usePermissions();
    const credits = useCapability('COMM_SMS_CREDITS');
    return useQuery({
        queryKey: KEYS.balance,
        queryFn:  smsCreditApi.getBalance,
        enabled:  (options?.enabled ?? true) && credits.enabled && can('COMMUNICATION_SEND'),
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
