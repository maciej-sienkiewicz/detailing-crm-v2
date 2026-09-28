import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { externalInvoicesApi } from '../api/externalInvoicesApi';
import type { ExternalInvoiceFilter } from '../types';

export const EXTERNAL_INVOICES_KEY = ['finance', 'external-invoices'] as const;

export const useExternalInvoices = (status: ExternalInvoiceFilter, page: number, pageSize = 20) =>
  useQuery({
    queryKey: [...EXTERNAL_INVOICES_KEY, 'list', status, page, pageSize],
    queryFn: () => externalInvoicesApi.list(status, page, pageSize),
    placeholderData: keepPreviousData,
  });

/** Ile sprzedaży czeka na fakturę księgowości - licznik przy zakładce. */
export const useExternalInvoicesPendingCount = (enabled = true) =>
  useQuery({
    queryKey: [...EXTERNAL_INVOICES_KEY, 'pending-count'],
    queryFn: () => externalInvoicesApi.pendingCount(),
    enabled,
    staleTime: 30_000,
  });

export const useMarkExternalInvoiceIssued = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, invoiceNumber }: { id: string; invoiceNumber: string | null }) =>
      externalInvoicesApi.markIssued(id, invoiceNumber),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: EXTERNAL_INVOICES_KEY }),
  });
};

export const useUnmarkExternalInvoiceIssued = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => externalInvoicesApi.unmarkIssued(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: EXTERNAL_INVOICES_KEY }),
  });
};
