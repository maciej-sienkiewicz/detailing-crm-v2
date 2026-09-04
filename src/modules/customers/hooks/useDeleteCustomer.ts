import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/common/components/Toast';
import { customerApi } from '../api/customerApi';
import { customersQueryKey } from './useCustomers';
import { customerDetailQueryKey } from './useCustomerDetail';

/**
 * Usunięcie klienta - po stronie backendu anonimizacja RODO: dane osobowe znikają,
 * historia wizyt, statystyki i podpisane dokumenty zostają, pojazdy tracą
 * powiązanie (osierocone idą do archiwum).
 *
 * Toasty mieszkają w opcjach useMutation, nie przy wywołaniu mutate: widok
 * szczegółów nawiguję do listy zaraz po kliknięciu, a callbacki przekazane do
 * mutate nie odpalają się po odmontowaniu komponentu - komunikat by przepadał.
 */
export const useDeleteCustomer = () => {
    const queryClient = useQueryClient();
    const { showSuccess, showError } = useToast();

    return useMutation({
        mutationFn: (customerId: string) => customerApi.deleteCustomer(customerId),
        onSuccess: (_result, customerId) => {
            queryClient.invalidateQueries({ queryKey: [customersQueryKey] });
            queryClient.removeQueries({ queryKey: [customerDetailQueryKey, customerId] });
            showSuccess(
                'Klient usunięty',
                'Dane osobowe zostały wymazane. Historia wizyt i podpisane dokumenty zostały zachowane.'
            );
        },
        onError: (error) => {
            const message =
                (error as { response?: { data?: { message?: string } } })?.response?.data?.message;
            showError('Nie udało się usunąć klienta', message ?? 'Spróbuj ponownie');
        },
    });
};
