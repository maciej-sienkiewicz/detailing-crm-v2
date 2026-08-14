import { useQuery } from '@tanstack/react-query';
import { incomeDocumentsApi } from '../api/incomeDocumentsApi';
import type { IncomeDocumentFilters } from '../types';

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
