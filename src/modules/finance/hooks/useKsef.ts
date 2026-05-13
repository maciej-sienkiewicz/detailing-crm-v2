import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ksefApi } from '../api/ksefApi';
import type {
  KsefExpenseListFilters,
  CreateExpenseRequest,
  UpdateExpensePaymentStatusRequest,
  SaveKsefCredentialsRequest,
  KsefSyncRangeRequest,
} from '../types';

export const KSEF_CREDENTIALS_KEY = ['ksef', 'credentials'] as const;
export const KSEF_SYNC_STATUS_KEY = ['ksef', 'sync', 'status'] as const;
export const KSEF_EXPENSES_KEY    = ['ksef', 'expenses']       as const;
export const KSEF_STATISTICS_KEY  = ['ksef', 'statistics']     as const;

// ── Credentials ───────────────────────────────────────────────────────────────

export const useKsefCredentials = () => {
  const { data, isLoading, isError } = useQuery({
    queryKey: KSEF_CREDENTIALS_KEY,
    queryFn:  () => ksefApi.getCredentials(),
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
      queryClient.invalidateQueries({ queryKey: KSEF_EXPENSES_KEY });
    },
  });
};

// ── Sync ──────────────────────────────────────────────────────────────────────

export const useKsefSyncStatus = () => {
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: KSEF_SYNC_STATUS_KEY,
    queryFn:  () => ksefApi.getSyncStatus(),
    staleTime: 30_000,
  });

  return { syncStatus: data, isLoading, isError, refetch };
};

export const useTriggerKsefSync = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => ksefApi.triggerSync(),
    onSuccess: (data) => {
      queryClient.setQueryData(KSEF_SYNC_STATUS_KEY, data);
      queryClient.invalidateQueries({ queryKey: KSEF_EXPENSES_KEY });
      queryClient.invalidateQueries({ queryKey: KSEF_STATISTICS_KEY });
    },
  });
};

export const useSyncKsefByRange = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: KsefSyncRangeRequest) => ksefApi.syncExpensesByRange(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: KSEF_EXPENSES_KEY });
      queryClient.invalidateQueries({ queryKey: KSEF_SYNC_STATUS_KEY });
      queryClient.invalidateQueries({ queryKey: KSEF_STATISTICS_KEY });
    },
  });
};

// ── Expenses ──────────────────────────────────────────────────────────────────

export const useKsefExpenses = (filters: KsefExpenseListFilters) => {
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: [...KSEF_EXPENSES_KEY, filters],
    queryFn:  () => ksefApi.getExpenses(filters),
    staleTime: 30_000,
  });

  return {
    expenses: data?.expenses ?? [],
    total:    data?.total    ?? 0,
    page:     data?.page     ?? 1,
    pageSize: data?.pageSize ?? 20,
    isLoading,
    isError,
    refetch,
  };
};

export const useCreateExpense = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateExpenseRequest) => ksefApi.createExpense(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: KSEF_EXPENSES_KEY });
      queryClient.invalidateQueries({ queryKey: KSEF_STATISTICS_KEY });
    },
  });
};

export const useExcludeExpense = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => ksefApi.excludeExpense(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: KSEF_EXPENSES_KEY });
      queryClient.invalidateQueries({ queryKey: KSEF_STATISTICS_KEY });
    },
  });
};

export const useRestoreExpense = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => ksefApi.restoreExpense(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: KSEF_EXPENSES_KEY });
      queryClient.invalidateQueries({ queryKey: KSEF_STATISTICS_KEY });
    },
  });
};

export const useUpdateExpensePaymentStatus = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateExpensePaymentStatusRequest }) =>
      ksefApi.updateExpensePaymentStatus(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: KSEF_EXPENSES_KEY });
    },
  });
};

export const useDeleteExpense = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => ksefApi.deleteExpense(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: KSEF_EXPENSES_KEY });
      queryClient.invalidateQueries({ queryKey: KSEF_STATISTICS_KEY });
    },
  });
};

// ── Statistics ────────────────────────────────────────────────────────────────

export const useKsefStatistics = (year: number) => {
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: [...KSEF_STATISTICS_KEY, year],
    queryFn:  () => ksefApi.getStatistics(year),
    staleTime: 5 * 60_000,
  });

  return { statistics: data, isLoading, isError, refetch };
};
