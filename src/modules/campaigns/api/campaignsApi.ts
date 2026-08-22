import { apiClient } from '@/core';
import type {
  AudienceEstimate,
  AudienceEstimateParams,
  Campaign,
  CampaignRecipient,
  CampaignRequest,
  CampaignSettings,
  CampaignStats,
  RecipientStatus,
  TestSendRequest,
} from '../types';

const BASE = '/v1/campaigns';

export async function fetchCampaigns(params?: {
  status?: string[];
  kind?: string;
}): Promise<Campaign[]> {
  const search = new URLSearchParams();
  params?.status?.forEach((s) => search.append('status', s));
  if (params?.kind) search.append('kind', params.kind);
  const qs = search.toString();
  const { data } = await apiClient.get<Campaign[]>(qs ? `${BASE}?${qs}` : BASE);
  return data;
}

export async function fetchCampaignStats(): Promise<CampaignStats> {
  const { data } = await apiClient.get<CampaignStats>(`${BASE}/stats`);
  return data;
}

export async function fetchCampaign(id: string): Promise<Campaign> {
  const { data } = await apiClient.get<Campaign>(`${BASE}/${id}`);
  return data;
}

export async function createCampaign(payload: CampaignRequest): Promise<Campaign> {
  const { data } = await apiClient.post<Campaign>(BASE, payload);
  return data;
}

export async function updateCampaign(id: string, payload: CampaignRequest): Promise<Campaign> {
  const { data } = await apiClient.put<Campaign>(`${BASE}/${id}`, payload);
  return data;
}

export async function deleteCampaign(id: string): Promise<void> {
  await apiClient.delete(`${BASE}/${id}`);
}

export async function scheduleCampaign(id: string, scheduledAt: string | null): Promise<Campaign> {
  const { data } = await apiClient.post<Campaign>(`${BASE}/${id}/schedule`, { scheduledAt });
  return data;
}

async function lifecycle(id: string, action: string): Promise<Campaign> {
  const { data } = await apiClient.post<Campaign>(`${BASE}/${id}/${action}`);
  return data;
}

export const cancelCampaign = (id: string) => lifecycle(id, 'cancel');
export const stopCampaign = (id: string) => lifecycle(id, 'stop');
export const activateCampaign = (id: string) => lifecycle(id, 'activate');
export const pauseCampaign = (id: string) => lifecycle(id, 'pause');
export const archiveCampaign = (id: string) => lifecycle(id, 'archive');
export const duplicateCampaign = (id: string) => lifecycle(id, 'duplicate');

export async function fetchRecipients(
  id: string,
  status?: RecipientStatus
): Promise<CampaignRecipient[]> {
  const qs = status ? `?status=${status}` : '';
  const { data } = await apiClient.get<CampaignRecipient[]>(`${BASE}/${id}/recipients${qs}`);
  return data;
}

export async function estimateAudience(params: AudienceEstimateParams): Promise<AudienceEstimate> {
  const { data } = await apiClient.post<AudienceEstimate>(`${BASE}/audience/estimate`, params);
  return data;
}

export async function testSend(payload: TestSendRequest): Promise<{ success: boolean; errorMessage: string | null }> {
  const { data } = await apiClient.post<{ success: boolean; errorMessage: string | null }>(
    `${BASE}/test-send`,
    payload
  );
  return data;
}

export async function retryRecipient(campaignId: string, recipientId: string): Promise<CampaignRecipient> {
  const { data } = await apiClient.post<CampaignRecipient>(
    `${BASE}/${campaignId}/recipients/${recipientId}/retry`
  );
  return data;
}

export async function retryAllFailed(campaignId: string): Promise<{ retried: number }> {
  const { data } = await apiClient.post<{ retried: number }>(`${BASE}/${campaignId}/retry-failed`);
  return data;
}

export async function fetchSettings(): Promise<CampaignSettings> {
  const { data } = await apiClient.get<CampaignSettings>(`${BASE}/settings`);
  return data;
}

export async function updateSettings(settings: CampaignSettings): Promise<CampaignSettings> {
  const { data } = await apiClient.put<CampaignSettings>(`${BASE}/settings`, settings);
  return data;
}
