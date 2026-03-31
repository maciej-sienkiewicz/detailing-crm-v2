import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { financeApi } from '../api/financeApi';
import type {
  DocumentListFilters,
  CreateDocumentRequest,
  CashAdjustRequest,
} from '../types';

export const FINANCE_DOCS_KEY = ['finance', 'documents'];
export const FINANCE_CASH_KEY = ['finance', 'cash'];
export const FINANCE_SUMMARY_KEY = ['finance', 'summary'];
export const FINANCE_INVOICES_KEY = ['finance', 'invoices'];

export const useFinanceDocuments = (filters: DocumentListFilters) => {
  const queryKey = [...FINANCE_DOCS_KEY, filters];

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey,
    queryFn: () => financeApi.getDocuments(filters),
    staleTime: 30_000,
  });

  return {
    documents: data?.documents ?? [],
    total: data?.total ?? 0,
    page: data?.page ?? 1,
    pageSize: data?.pageSize ?? 20,
    isLoading,
    isError,
    refetch,
  };
};

export const useFinanceDocument = (id: string | undefined) => {
  const { data, isLoading, isError } = useQuery({
    queryKey: [...FINANCE_DOCS_KEY, 'detail', id],
    queryFn: () => financeApi.getDocument(id!),
    enabled: !!id,
    staleTime: 60_000,
  });

  return { document: data, isLoading, isError };
};

export const useCreateDocument = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateDocumentRequest) => financeApi.createDocument(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: FINANCE_DOCS_KEY });
      queryClient.invalidateQueries({ queryKey: FINANCE_SUMMARY_KEY });
      queryClient.invalidateQueries({ queryKey: FINANCE_CASH_KEY });
    },
  });
};

export const useUpdateDocumentStatus = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      financeApi.updateStatus(id, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: FINANCE_DOCS_KEY });
      queryClient.invalidateQueries({ queryKey: FINANCE_SUMMARY_KEY });
    },
  });
};

export const useUpdateDocumentNumber = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, documentNumber }: { id: string; documentNumber: string }) =>
      financeApi.updateDocumentNumber(id, documentNumber),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: FINANCE_DOCS_KEY });
    },
  });
};

export const useDeleteDocument = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => financeApi.deleteDocument(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: FINANCE_DOCS_KEY });
      queryClient.invalidateQueries({ queryKey: FINANCE_SUMMARY_KEY });
    },
  });
};

export const useCashRegister = () => {
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: FINANCE_CASH_KEY,
    queryFn: () => financeApi.getCashRegister(),
    staleTime: 15_000,
  });

  return { cashRegister: data, isLoading, isError, refetch };
};

export const useCashHistory = (page: number, pageSize: number) => {
  const { data, isLoading, isError } = useQuery({
    queryKey: [...FINANCE_CASH_KEY, 'history', page, pageSize],
    queryFn: () => financeApi.getCashHistory(page, pageSize),
    staleTime: 15_000,
  });

  return {
    operations: data?.operations ?? [],
    total: data?.total ?? 0,
    isLoading,
    isError,
  };
};

export const useAdjustCash = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CashAdjustRequest) => financeApi.adjustCash(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: FINANCE_CASH_KEY });
    },
  });
};

export const useFinanceInvoices = (page: number, pageSize: number) => {
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: [...FINANCE_INVOICES_KEY, page, pageSize],
    queryFn: () => financeApi.getDocuments({ page, pageSize, documentType: 'INVOICE' }),
    staleTime: 30_000,
  });

  return {
    invoices: data?.documents ?? [],
    total: data?.total ?? 0,
    isLoading,
    isError,
    refetch,
  };
};

export const useFinanceSummary = (dateFrom?: string, dateTo?: string) => {
  const queryKey = [...FINANCE_SUMMARY_KEY, dateFrom, dateTo];

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey,
    queryFn: () => financeApi.getSummary(dateFrom, dateTo),
    staleTime: 60_000,
  });

  return { summary: data, isLoading, isError, refetch };
};
