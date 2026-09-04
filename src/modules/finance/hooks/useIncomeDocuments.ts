import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { incomeDocumentsApi } from '../api/incomeDocumentsApi';
import { KSEF_REVENUE_KEY } from './useKsefRevenue';
import { useInvalidateFinance } from './useFinance';
import type { IncomeDocumentFilters, IncomeSourceKind } from '../types';

export const INCOME_DOCUMENTS_KEY = ['finance', 'income-documents'] as const;

/** Zunifikowana lista dokumentów przychodowych (KSeF + moduł finansowy). */
export const useIncomeDocuments = (filters: IncomeDocumentFilters) => {
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: [...INCOME_DOCUMENTS_KEY, filters],
    queryFn:  () => incomeDocumentsApi.getDocuments(filters),
  });

  return {
    documents: data?.documents ?? [],
    total:     data?.total     ?? 0,
    page:      data?.page      ?? 1,
    pageSize:  data?.pageSize  ?? 20,
    isLoading,
    isError,
    refetch,
  };
};

/**
 * Ukrycie dokumentu przestawia listę, kafle podsumowania i statystyki KSeF -
 * wszystkie liczą z tych samych rekordów, więc muszą lecieć razem.
 */
const useInvalidateIncomeDocuments = () => {
  const queryClient = useQueryClient();
  const invalidateFinance = useInvalidateFinance();
  return () => {
    queryClient.invalidateQueries({ queryKey: KSEF_REVENUE_KEY });
    invalidateFinance();
  };
};

/** Ukrywa dokument przychodowy ze statystyk (zostaje w bazie, wraca po przywróceniu). */
export const useExcludeIncomeDocument = () => {
  const invalidate = useInvalidateIncomeDocuments();
  return useMutation({
    mutationFn: ({ sourceKind, id }: { sourceKind: IncomeSourceKind; id: string }) =>
      incomeDocumentsApi.exclude(sourceKind, id),
    onSuccess: invalidate,
  });
};

/** Przywraca ukryty dokument przychodowy do statystyk. */
export const useRestoreIncomeDocument = () => {
  const invalidate = useInvalidateIncomeDocuments();
  return useMutation({
    mutationFn: ({ sourceKind, id }: { sourceKind: IncomeSourceKind; id: string }) =>
      incomeDocumentsApi.restore(sourceKind, id),
    onSuccess: invalidate,
  });
};
