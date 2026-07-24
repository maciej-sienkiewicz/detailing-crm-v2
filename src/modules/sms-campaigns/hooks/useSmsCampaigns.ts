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
  fetchSenderNameConfig,
  updateSenderName,
  uploadSenderNameAuthDoc,
  fetchSenderNameDocumentUrl,
} from '../api/smsCampaignsApi';
import type {
  CreateCampaignRequest,
  SmsAutomationConfig,
  SmsSenderNameConfig,
  CampaignFilters,
} from '../types';

const KEYS = {
  campaigns: ['sms-campaigns'] as const,
  automation: ['sms-automation'] as const,
  brands: ['vehicle-brands'] as const,
  audience: (filters: CampaignFilters) => ['sms-audience', filters] as const,
  senderName: ['sms-sender-name'] as const,
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

// ─── Sender name ──────────────────────────────────────────────────────────────

export function useSenderNameConfig() {
  const { data, isLoading } = useQuery({
    queryKey: KEYS.senderName,
    queryFn: fetchSenderNameConfig,
  });
  return { config: data ?? null, isLoading };
}

export function useUpdateSenderName() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (name: string) => updateSenderName(name),
    onSuccess: (updated) => qc.setQueryData(KEYS.senderName, updated),
  });
}

export function useUploadSenderNameAuthDoc() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (file: File) => uploadSenderNameAuthDoc(file),
    onSuccess: (updated) => qc.setQueryData(KEYS.senderName, updated),
  });
}

export function useSenderNameDocumentUrl() {
  return useMutation({
    mutationFn: () => fetchSenderNameDocumentUrl(),
  });
}
