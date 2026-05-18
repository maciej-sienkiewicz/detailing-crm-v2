import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { financeApi } from '../api/financeApi';
import type {
  DocumentListFilters,
  CreateDocumentRequest,
  PaymentMethodReportParams,
  CashAdjustRequest,
} from '../types';

export const FINANCE_DOCS_KEY     = ['finance', 'documents'] as const;
export const FINANCE_CASH_KEY     = ['finance', 'cash']      as const;
export const FINANCE_SUMMARY_KEY  = ['finance', 'summary']   as const;
export const FINANCE_REPORT_KEY   = ['finance', 'payment-method-report'] as const;

// ── Documents ─────────────────────────────────────────────────────────────────

export const useFinanceDocuments = (filters: DocumentListFilters) => {
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: [...FINANCE_DOCS_KEY, filters],
    queryFn:  () => financeApi.getDocuments(filters),
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

export const useFinanceDocument = (id: string | undefined) => {
  const { data, isLoading, isError } = useQuery({
    queryKey: [...FINANCE_DOCS_KEY, 'detail', id],
    queryFn:  () => financeApi.getDocument(id!),
    enabled:  !!id,
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

export const useRestoreDocument = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => financeApi.restoreDocument(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: FINANCE_DOCS_KEY });
      queryClient.invalidateQueries({ queryKey: FINANCE_SUMMARY_KEY });
    },
  });
};

// ── Cash register ─────────────────────────────────────────────────────────────

export const useCashRegister = () => {
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: FINANCE_CASH_KEY,
    queryFn:  () => financeApi.getCashRegister(),
  });

  return { cashRegister: data, isLoading, isError, refetch };
};

export const useCashHistory = (page: number, pageSize: number) => {
  const { data, isLoading, isError } = useQuery({
    queryKey: [...FINANCE_CASH_KEY, 'history', page, pageSize],
    queryFn:  () => financeApi.getCashHistory(page, pageSize),
  });

  return {
    operations: data?.operations ?? [],
    total:      data?.total      ?? 0,
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

// ── Summary & reports ─────────────────────────────────────────────────────────

export const useFinanceSummary = (dateFrom?: string, dateTo?: string) => {
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: [...FINANCE_SUMMARY_KEY, dateFrom, dateTo],
    queryFn:  () => financeApi.getSummary(dateFrom, dateTo),
  });

  return { summary: data, isLoading, isError, refetch };
};

export const usePaymentMethodReport = (params: PaymentMethodReportParams) => {
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: [...FINANCE_REPORT_KEY, params],
    queryFn:  () => financeApi.getPaymentMethodReport(params),
  });

  return { report: data, isLoading, isError, refetch };
};
