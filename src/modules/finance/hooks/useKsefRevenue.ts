import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ksefRevenueApi } from '../api/ksefRevenueApi';
import type { IssueCorrectionRequest, IssueInvoiceRequest } from '../types';

export const KSEF_REVENUE_KEY            = ['ksef', 'revenue']               as const;
export const KSEF_REVENUE_STATISTICS_KEY = ['ksef', 'revenue', 'statistics'] as const;

const useInvalidateRevenue = () => {
  const queryClient = useQueryClient();
  return () => {
    queryClient.invalidateQueries({ queryKey: KSEF_REVENUE_KEY });
    queryClient.invalidateQueries({ queryKey: KSEF_REVENUE_STATISTICS_KEY });
  };
};

// ── Listowanie / szczegóły ────────────────────────────────────────────────────

/** Szczegóły faktury z pozycjami. Pobiera dopiero gdy id jest ustawione. */
export const useKsefRevenueInvoiceDetail = (id: string | null) => {
  const { data, isLoading, isError } = useQuery({
    queryKey: [...KSEF_REVENUE_KEY, 'detail', id],
    queryFn:  () => ksefRevenueApi.getInvoiceDetail(id!),
    enabled:  id !== null,
  });

  return { invoice: data ?? null, isLoading, isError };
};

// ── Wystawianie / retry / korekty ─────────────────────────────────────────────

export const useIssueRevenueInvoice = () => {
  const invalidate = useInvalidateRevenue();
  return useMutation({
    mutationFn: (data: IssueInvoiceRequest) => ksefRevenueApi.issueInvoice(data),
    onSuccess:  invalidate,
  });
};

export const useIssueCorrection = () => {
  const invalidate = useInvalidateRevenue();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: IssueCorrectionRequest }) =>
      ksefRevenueApi.issueCorrection(id, data),
    onSuccess: invalidate,
  });
};

export const useRetryRevenueInvoice = () => {
  const invalidate = useInvalidateRevenue();
  return useMutation({
    mutationFn: (id: string) => ksefRevenueApi.retryInvoice(id),
    onSuccess:  invalidate,
  });
};

export const useDeleteRejectedInvoice = () => {
  const invalidate = useInvalidateRevenue();
  return useMutation({
    mutationFn: (id: string) => ksefRevenueApi.deleteRejected(id),
    onSuccess:  invalidate,
  });
};

// ── Duplikaty / płatność / notatka ────────────────────────────────────────────

export const useResolveDuplicate = () => {
  const invalidate = useInvalidateRevenue();
  return useMutation({
    mutationFn: ({ id, resolution }: { id: string; resolution: 'CONFIRMED_DUPLICATE' | 'DISMISSED' }) =>
      ksefRevenueApi.resolveDuplicate(id, resolution),
    onSuccess: invalidate,
  });
};

export const useUpdateRevenuePaymentStatus = () => {
  const invalidate = useInvalidateRevenue();
  return useMutation({
    mutationFn: ({ id, paymentStatus }: { id: string; paymentStatus: 'PAID' | 'PENDING' }) =>
      ksefRevenueApi.updatePaymentStatus(id, paymentStatus),
    onSuccess: invalidate,
  });
};

export const useUpdateRevenueNote = () => {
  const invalidate = useInvalidateRevenue();
  return useMutation({
    mutationFn: ({ id, note }: { id: string; note: string | null }) =>
      ksefRevenueApi.updateNote(id, note),
    onSuccess: invalidate,
  });
};

// ── Statystyki ────────────────────────────────────────────────────────────────

export const useKsefRevenueStatistics = (year: number) => {
  const { data, isLoading, isError } = useQuery({
    queryKey: [...KSEF_REVENUE_STATISTICS_KEY, year],
    queryFn:  () => ksefRevenueApi.getStatistics(year),
  });

  return { statistics: data, isLoading, isError };
};
