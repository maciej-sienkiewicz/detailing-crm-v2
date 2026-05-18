import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchEmailAutomationConfig, updateEmailAutomationConfig } from '../api/emailCampaignsApi';
import type { EmailAutomationConfig } from '../types';

const KEYS = {
  automation: ['email-automation'] as const,
};

export function useEmailAutomationConfig() {
  const { data, isLoading, isError } = useQuery({
    queryKey: KEYS.automation,
    queryFn: fetchEmailAutomationConfig,
  });
  return { config: data ?? null, isLoading, isError };
}

export function useUpdateEmailAutomationConfig() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (config: EmailAutomationConfig) => updateEmailAutomationConfig(config),
    onSuccess: (updated) => {
      qc.setQueryData(KEYS.automation, updated);
    },
  });
}
