import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { invoicingApi } from '../api/invoicingApi';
import type { SaveCredentialsRequest } from '../types';

export const INVOICING_CREDENTIALS_KEY = ['invoicing', 'credentials'];
export const INVOICING_PROVIDERS_KEY = ['invoicing', 'providers'];
export const INVOICING_INVOICES_KEY = ['invoicing', 'invoices'];

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
      queryClient.invalidateQueries({ queryKey: INVOICING_INVOICES_KEY });
    },
  });
};

export const useExternalInvoices = (page: number, pageSize: number) => {
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: [...INVOICING_INVOICES_KEY, page, pageSize],
    queryFn: () => invoicingApi.listInvoices(page, pageSize),
    staleTime: 30_000,
  });
  return {
    invoices: data?.invoices ?? [],
    total: data?.total ?? 0,
    isLoading,
    isError,
    refetch,
  };
};

export const useSyncAllInvoices = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => invoicingApi.syncAll(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: INVOICING_INVOICES_KEY });
    },
  });
};

export const useSyncSingleInvoice = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => invoicingApi.syncSingle(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: INVOICING_INVOICES_KEY });
    },
  });
};
