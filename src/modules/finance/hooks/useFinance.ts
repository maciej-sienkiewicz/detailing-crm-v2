import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { financeApi } from '../api/financeApi';
import { INCOME_DOCUMENTS_KEY } from './useIncomeDocuments';
import type {
  CreateDocumentRequest,
  UpdateDocumentRequest,
  PaymentMethodReportParams,
  CashAdjustRequest,
} from '../types';

export const FINANCE_DOCS_KEY     = ['finance', 'documents'] as const;
export const FINANCE_CASH_KEY     = ['finance', 'cash']      as const;
export const FINANCE_SUMMARY_KEY  = ['finance', 'summary']   as const;
export const FINANCE_REPORT_KEY   = ['finance', 'payment-method-report'] as const;

/**
 * Unieważnia wszystko, co pokazuje dokumenty przychodowe albo liczy z nich kwoty.
 *
 * Lista dokumentów jest zunifikowana (moduł finansowy + ledger KSeF), a kafle
 * podsumowania sumują obie strony naraz — zmiana po dowolnej z nich musi odświeżyć
 * jedno i drugie. Rozjazd tych kluczy sprawiał, że po wystawieniu korekty kafel
 * „Przychody" pokazywał kwotę sprzed korekty aż do przeładowania strony.
 */
export const useInvalidateFinance = () => {
  const queryClient = useQueryClient();
  return () => {
    queryClient.invalidateQueries({ queryKey: FINANCE_DOCS_KEY });
    queryClient.invalidateQueries({ queryKey: INCOME_DOCUMENTS_KEY });
    queryClient.invalidateQueries({ queryKey: FINANCE_SUMMARY_KEY });
    queryClient.invalidateQueries({ queryKey: FINANCE_REPORT_KEY });
    queryClient.invalidateQueries({ queryKey: FINANCE_CASH_KEY });
  };
};

// ── Documents ─────────────────────────────────────────────────────────────────

export const useFinanceDocument = (id: string | undefined) => {
  const { data, isLoading, isError } = useQuery({
    queryKey: [...FINANCE_DOCS_KEY, 'detail', id],
    queryFn:  () => financeApi.getDocument(id!),
    enabled:  !!id,
  });

  return { document: data, isLoading, isError };
};

export const useCreateDocument = () => {
  const invalidate = useInvalidateFinance();

  return useMutation({
    mutationFn: (data: CreateDocumentRequest) => financeApi.createDocument(data),
    onSuccess: invalidate,
  });
};

export const useUpdateDocument = () => {
  const invalidate = useInvalidateFinance();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateDocumentRequest }) =>
      financeApi.updateDocument(id, data),
    onSuccess: invalidate,
  });
};

export const useUpdateDocumentStatus = () => {
  const invalidate = useInvalidateFinance();

  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      financeApi.updateStatus(id, status),
    onSuccess: invalidate,
  });
};

export const useUpdateDocumentNumber = () => {
  const invalidate = useInvalidateFinance();

  return useMutation({
    mutationFn: ({ id, documentNumber }: { id: string; documentNumber: string }) =>
      financeApi.updateDocumentNumber(id, documentNumber),
    onSuccess: invalidate,
  });
};

export const useDeleteDocument = () => {
  const invalidate = useInvalidateFinance();

  return useMutation({
    mutationFn: (id: string) => financeApi.deleteDocument(id),
    onSuccess: invalidate,
  });
};

export const useRestoreDocument = () => {
  const invalidate = useInvalidateFinance();

  return useMutation({
    mutationFn: (id: string) => financeApi.restoreDocument(id),
    onSuccess: invalidate,
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
