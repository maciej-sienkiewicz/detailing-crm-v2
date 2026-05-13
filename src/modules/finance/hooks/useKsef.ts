import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ksefApi } from '../api/ksefApi';
import type { SaveKsefCredentialsRequest, FetchKsefInvoicesRequest } from '../types';

export const KSEF_CREDENTIALS_KEY = ['ksef', 'credentials'];
export const KSEF_SYNC_STATUS_KEY = ['ksef', 'sync-status'];
export const KSEF_INVOICES_KEY = ['ksef', 'invoices'];
export const KSEF_STATISTICS_KEY = ['ksef', 'statistics'];

export const useKsefCredentials = () => {
  const { data, isLoading, isError } = useQuery({
    queryKey: KSEF_CREDENTIALS_KEY,
    queryFn: () => ksefApi.getCredentials(),
    staleTime: 60_000,
  });
  return { credentials: data ?? null, isLoading, isError };
};

export const useSaveKsefCredentials = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: SaveKsefCredentialsRequest) => ksefApi.saveCredentials(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: KSEF_CREDENTIALS_KEY });
      queryClient.invalidateQueries({ queryKey: KSEF_SYNC_STATUS_KEY });
    },
  });
};

export const useDeleteKsefCredentials = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => ksefApi.deleteCredentials(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: KSEF_CREDENTIALS_KEY });
      queryClient.invalidateQueries({ queryKey: KSEF_SYNC_STATUS_KEY });
      queryClient.invalidateQueries({ queryKey: KSEF_INVOICES_KEY });
    },
  });
};

export const useOpenKsefSession = () => {
  return useMutation({
    mutationFn: () => ksefApi.openSession(),
  });
};

export const useKsefSyncStatus = (enabled: boolean = true, pollingInterval?: number) => {
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: KSEF_SYNC_STATUS_KEY,
    queryFn: () => ksefApi.getSyncStatus(),
    staleTime: 5_000,
    refetchInterval: pollingInterval,
    enabled,
  });
  return { syncStatus: data ?? null, isLoading, isError, refetch };
};

export const useKsefInvoices = (page: number, pageSize: number) => {
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: [...KSEF_INVOICES_KEY, page, pageSize],
    queryFn: () => ksefApi.listInvoices(page, pageSize),
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

export const useFetchKsefInvoices = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: FetchKsefInvoicesRequest) => ksefApi.fetchInvoices(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: KSEF_INVOICES_KEY });
      queryClient.invalidateQueries({ queryKey: KSEF_SYNC_STATUS_KEY });
      queryClient.invalidateQueries({ queryKey: KSEF_STATISTICS_KEY });
    },
  });
};

export const useExcludeKsefInvoice = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (ksefNumber: string) => ksefApi.excludeInvoice(ksefNumber),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: KSEF_INVOICES_KEY });
      queryClient.invalidateQueries({ queryKey: KSEF_STATISTICS_KEY });
    },
  });
};

export const useRestoreKsefInvoice = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (ksefNumber: string) => ksefApi.restoreInvoice(ksefNumber),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: KSEF_INVOICES_KEY });
      queryClient.invalidateQueries({ queryKey: KSEF_STATISTICS_KEY });
    },
  });
};

export const useKsefStatistics = (year: number) => {
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: [...KSEF_STATISTICS_KEY, year],
    queryFn: () => ksefApi.getStatistics(year),
    staleTime: 2 * 60_000,
  });
  return { statistics: data ?? null, isLoading, isError, refetch };
};
