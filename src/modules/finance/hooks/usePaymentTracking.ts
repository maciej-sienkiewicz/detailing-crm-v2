import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { financeApi } from '../api/financeApi';
import { FINANCE_REPORT_KEY, FINANCE_SUMMARY_KEY } from './useFinance';
import type { FinanceConfig } from '../types';

export const FINANCE_CONFIG_KEY = ['finance', 'config'] as const;

/**
 * Czy studio obsługuje statusy płatności. Wyłączone: każdy dokument od razu jest
 * przychodem albo kosztem, więc status płatności, należności, filtr „Opłacone"
 * i akcje „Oznacz jako opłacone" nie mają czego pokazywać - chowają się.
 *
 * Do czasu odpowiedzi (i przy błędzie) zakładamy stan domyślny backendu: włączone.
 * Tak wyglądała aplikacja przed tym ustawieniem, więc migotnięcie niczego nie sugeruje.
 */
export const usePaymentTracking = () => {
  const { data, isLoading } = useQuery({
    queryKey: FINANCE_CONFIG_KEY,
    queryFn: financeApi.getFinanceConfig,
    // Zmienia się raz na jakiś czas, w ustawieniach - a czyta je każdy widok płatności.
    staleTime: 5 * 60_000,
  });

  return {
    enabled: data?.paymentTrackingEnabled ?? true,
    /** `undefined` = stan jeszcze nieznany (wczytywanie / błąd). */
    known: data?.paymentTrackingEnabled,
    isLoading,
  };
};

export const useUpdatePaymentTracking = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: FinanceConfig) => financeApi.updateFinanceConfig(data),
    onSuccess: updated => {
      queryClient.setQueryData(FINANCE_CONFIG_KEY, updated);
      // Kafle i raport form płatności liczą od tej chwili inny zbiór dokumentów.
      queryClient.invalidateQueries({ queryKey: FINANCE_SUMMARY_KEY });
      queryClient.invalidateQueries({ queryKey: FINANCE_REPORT_KEY });
    },
    onError: () => {
      queryClient.invalidateQueries({ queryKey: FINANCE_CONFIG_KEY });
    },
  });
};
