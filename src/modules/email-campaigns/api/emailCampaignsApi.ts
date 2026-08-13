import type { EmailAutomationConfig } from '../types';
import { apiClient } from '@/core';

export async function fetchEmailAutomationConfig(): Promise<EmailAutomationConfig> {
  const { data } = await apiClient.get<EmailAutomationConfig>(
    '/v1/email-campaigns/automation'
  );
  return data;
}

export async function updateEmailAutomationConfig(
  config: EmailAutomationConfig
): Promise<EmailAutomationConfig> {
  const { data } = await apiClient.put<EmailAutomationConfig>(
    '/v1/email-campaigns/automation',
    config
  );
  return data;
}
