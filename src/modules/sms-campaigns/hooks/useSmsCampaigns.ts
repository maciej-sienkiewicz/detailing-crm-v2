import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  fetchCampaigns,
  createCampaign,
  deleteCampaign,
  sendCampaign,
  previewAudience,
  fetchAutomationConfig,
  updateAutomationConfig,
  fetchVehicleBrands,
} from '../api/smsCampaignsApi';
import type {
  CreateCampaignRequest,
  SmsAutomationConfig,
  CampaignFilters,
} from '../types';

const KEYS = {
  campaigns: ['sms-campaigns'] as const,
  automation: ['sms-automation'] as const,
  brands: ['vehicle-brands'] as const,
  audience: (filters: CampaignFilters) => ['sms-audience', filters] as const,
};

// ─── Campaigns list ───────────────────────────────────────────────────────────

export function useCampaigns() {
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: KEYS.campaigns,
    queryFn: fetchCampaigns,
  });
  return { campaigns: data ?? [], isLoading, isError, refetch };
}

// ─── Create campaign ──────────────────────────────────────────────────────────

export function useCreateCampaign() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateCampaignRequest) => createCampaign(payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEYS.campaigns }),
  });
}

// ─── Delete campaign ──────────────────────────────────────────────────────────

export function useDeleteCampaign() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteCampaign(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEYS.campaigns }),
  });
}

// ─── Send campaign ────────────────────────────────────────────────────────────

export function useSendCampaign() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => sendCampaign(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEYS.campaigns }),
  });
}

// ─── Audience preview (manual fetch) ─────────────────────────────────────────

export function usePreviewAudience() {
  const qc = useQueryClient();

  const preview = async (filters: CampaignFilters) => {
    return qc.fetchQuery({
      queryKey: KEYS.audience(filters),
      queryFn: () => previewAudience(filters),
    });
  };

  return { preview };
}

// ─── Automation config ────────────────────────────────────────────────────────

export function useAutomationConfig() {
  const { data, isLoading, isError } = useQuery({
    queryKey: KEYS.automation,
    queryFn: fetchAutomationConfig,
  });
  return { config: data ?? null, isLoading, isError };
}

export function useUpdateAutomationConfig() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (config: SmsAutomationConfig) => updateAutomationConfig(config),
    onSuccess: (updated) => {
      qc.setQueryData(KEYS.automation, updated);
    },
  });
}

// ─── Vehicle brands ───────────────────────────────────────────────────────────

export function useVehicleBrands() {
  const { data, isLoading } = useQuery({
    queryKey: KEYS.brands,
    queryFn: fetchVehicleBrands,
  });
  return { brands: data ?? [], isLoading };
}
