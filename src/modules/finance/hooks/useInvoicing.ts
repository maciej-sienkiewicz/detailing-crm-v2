import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { invoicingApi } from '../api/invoicingApi';
import { financeApi } from '../api/financeApi';
import type { SaveCredentialsRequest } from '../types';
import { FINANCE_DOCS_KEY, FINANCE_INVOICES_KEY } from './useFinance';

export const INVOICING_CREDENTIALS_KEY = ['invoicing', 'credentials'];
export const INVOICING_PROVIDERS_KEY = ['invoicing', 'providers'];

export const useInvoicingProviders = () => {
  const { data, isLoading, isError } = useQuery({
    queryKey: INVOICING_PROVIDERS_KEY,
    queryFn: () => invoicingApi.listProviders(),
    staleTime: 5 * 60_000,
  });
  return { providers: data ?? [], isLoading, isError };
};

export const useInvoicingCredentials = () => {
  const { data, isLoading, isError } = useQuery({
    queryKey: INVOICING_CREDENTIALS_KEY,
    queryFn: () => invoicingApi.getCredentials(),
    staleTime: 60_000,
  });
  return { credentials: data ?? null, isLoading, isError };
};

export const useSaveCredentials = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: SaveCredentialsRequest) => invoicingApi.saveCredentials(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: INVOICING_CREDENTIALS_KEY });
    },
  });
};

export const useDeleteCredentials = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => invoicingApi.deleteCredentials(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: INVOICING_CREDENTIALS_KEY });
      queryClient.invalidateQueries({ queryKey: FINANCE_INVOICES_KEY });
    },
  });
};

export const useSyncAllInvoices = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => financeApi.syncAllInvoices(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: FINANCE_INVOICES_KEY });
      queryClient.invalidateQueries({ queryKey: FINANCE_DOCS_KEY });
    },
  });
};

export const useSyncSingleInvoice = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => financeApi.syncSingleInvoice(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: FINANCE_INVOICES_KEY });
      queryClient.invalidateQueries({ queryKey: FINANCE_DOCS_KEY });
    },
  });
};
