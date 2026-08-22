import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import * as api from '../api/campaignsApi';
import type {
  AudienceEstimate,
  AudienceEstimateParams,
  CampaignRequest,
  CampaignSettings,
  RecipientStatus,
} from '../types';

const KEYS = {
  list: ['campaigns'] as const,
  stats: ['campaigns', 'stats'] as const,
  one: (id: string) => ['campaigns', id] as const,
  recipients: (id: string, status?: RecipientStatus) => ['campaigns', id, 'recipients', status ?? 'all'] as const,
  settings: ['campaigns', 'settings'] as const,
};

export function useCampaignsList() {
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: KEYS.list,
    queryFn: () => api.fetchCampaigns(),
  });
  return { campaigns: data ?? [], isLoading, isError, refetch };
}

export function useCampaignStats() {
  const { data, isLoading } = useQuery({
    queryKey: KEYS.stats,
    queryFn: api.fetchCampaignStats,
  });
  return { stats: data, isLoading };
}

export function useCampaign(id: string | undefined) {
  const { data, isLoading, isError } = useQuery({
    queryKey: KEYS.one(id ?? ''),
    queryFn: () => api.fetchCampaign(id!),
    enabled: !!id,
    // Kampania w trakcie wysyłki: odświeżaj licznik na żywo
    refetchInterval: (query) => (query.state.data?.status === 'SENDING' ? 5000 : false),
  });
  return { campaign: data, isLoading, isError };
}

export function useCampaignRecipients(id: string | undefined, status?: RecipientStatus) {
  const { data, isLoading } = useQuery({
    queryKey: KEYS.recipients(id ?? '', status),
    queryFn: () => api.fetchRecipients(id!, status),
    enabled: !!id,
  });
  return { recipients: data ?? [], isLoading };
}

function useInvalidatingMutation<TArgs>(fn: (args: TArgs) => Promise<unknown>) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSuccess: () => qc.invalidateQueries({ queryKey: KEYS.list }),
  });
}

export const useCreateCampaign = () =>
  useInvalidatingMutation((payload: CampaignRequest) => api.createCampaign(payload));

export const useUpdateCampaign = () =>
  useInvalidatingMutation(({ id, payload }: { id: string; payload: CampaignRequest }) =>
    api.updateCampaign(id, payload)
  );

export const useDeleteCampaign = () => useInvalidatingMutation((id: string) => api.deleteCampaign(id));

export const useScheduleCampaign = () =>
  useInvalidatingMutation(({ id, scheduledAt }: { id: string; scheduledAt: string | null }) =>
    api.scheduleCampaign(id, scheduledAt)
  );

export const useCancelCampaign = () => useInvalidatingMutation(api.cancelCampaign);
export const useStopCampaign = () => useInvalidatingMutation(api.stopCampaign);
export const useActivateCampaign = () => useInvalidatingMutation(api.activateCampaign);
export const usePauseCampaign = () => useInvalidatingMutation(api.pauseCampaign);
export const useArchiveCampaign = () => useInvalidatingMutation(api.archiveCampaign);
export const useDuplicateCampaign = () => useInvalidatingMutation(api.duplicateCampaign);

/**
 * Estymacja odbiorców z debounce 500 ms: licznik i tabela w kreatorze przeliczają
 * się podczas edycji filtrów, poprzednia wartość zostaje na czas przeliczania
 * (placeholderData), więc liczba nie znika ani nie skacze.
 *
 * Zwracane `appliedKey` to podpis parametrów, na których policzono aktualny wynik.
 * Kreator poznaje po nim moment, w którym lista naprawdę się odświeżyła, i dopiero
 * wtedy pyta, co zrobić z ręcznymi odznaczeniami — bez tego pytanie wyskakiwałoby
 * po każdym naciśnięciu klawisza w polu filtra.
 *
 * Stronicowanie i wyszukiwarka celowo NIE są opóźniane tutaj: przewracanie strony
 * to gest, nie pisanie, a frazę z wyszukiwarki opóźnia już samo pole nad tabelą —
 * dwa opóźnienia jedno na drugim dałyby prawie sekundę zwłoki na literę.
 */
export function useAudienceEstimate(params: AudienceEstimateParams) {
  const { sampleOffset, sampleSearch, ...slow } = params;
  // Sygnaturą jest treść parametrów, nie tożsamość obiektu: kreator odtwarza obiekt
  // kryteriów przy każdym renderze, a to nie jest zmiana filtra.
  const slowKey = JSON.stringify(slow);
  const [debouncedKey, setDebouncedKey] = useState(slowKey);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedKey(slowKey), 500);
    return () => clearTimeout(timer);
  }, [slowKey]);

  const applied: AudienceEstimateParams = {
    ...(JSON.parse(debouncedKey) as Omit<AudienceEstimateParams, 'sampleOffset' | 'sampleSearch'>),
    sampleOffset,
    sampleSearch,
  };

  const { data, isFetching } = useQuery<AudienceEstimate>({
    queryKey: ['campaigns', 'estimate', debouncedKey, sampleOffset ?? 0, sampleSearch ?? ''],
    queryFn: () => api.estimateAudience(applied),
    placeholderData: (prev) => prev,
  });

  return { estimate: data, isEstimating: isFetching, appliedKey: debouncedKey };
}

export function useCampaignSettings() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: KEYS.settings,
    queryFn: api.fetchSettings,
  });
  const mutation = useMutation({
    mutationFn: (settings: CampaignSettings) => api.updateSettings(settings),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEYS.settings }),
  });
  return { settings: data, isLoading, save: mutation.mutateAsync, isSaving: mutation.isPending };
}

export function useRetryRecipient(campaignId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (recipientId: string) => api.retryRecipient(campaignId, recipientId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.recipients(campaignId) });
      qc.invalidateQueries({ queryKey: KEYS.one(campaignId) });
      qc.invalidateQueries({ queryKey: KEYS.list });
    },
  });
}

export function useRetryAllFailed(campaignId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api.retryAllFailed(campaignId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.recipients(campaignId) });
      qc.invalidateQueries({ queryKey: KEYS.one(campaignId) });
      qc.invalidateQueries({ queryKey: KEYS.list });
    },
  });
}

export function useTestSend() {
  return useMutation({ mutationFn: api.testSend });
}
