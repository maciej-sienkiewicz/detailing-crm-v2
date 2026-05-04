import type { EmailAutomationConfig } from '../types';
import { apiClient } from '@/core';

let mockConfig: EmailAutomationConfig = {
  visitWelcome: {
    enabled: false,
    subjectTemplate: 'Witaj {{imie}} w {{studio}}!',
    bodyTemplate:
      'Drogi/a {{imie}},\n\nDziękujemy za umówienie wizyty w {{studio}} na {{data}} o godz. {{godzina}}.\n\nCzekamy na Ciebie!\n\nZespół {{studio}}',
  },
  visitReadyForPickup: {
    enabled: false,
    subjectTemplate: 'Twój pojazd jest gotowy do odbioru – {{studio}}',
    bodyTemplate:
      'Drogi/a {{imie}},\n\nInformujemy, że Twój pojazd jest już gotowy do odbioru w {{studio}}.\n\nDo zobaczenia!\n\nZespół {{studio}}',
  },
};

const USE_MOCKS = false;

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function fetchEmailAutomationConfig(): Promise<EmailAutomationConfig> {
  if (USE_MOCKS) {
    await delay(300);
    return { ...mockConfig };
  }
  const { data } = await apiClient.get<EmailAutomationConfig>(
    '/api/v1/email-campaigns/automation'
  );
  return data;
}

export async function updateEmailAutomationConfig(
  config: EmailAutomationConfig
): Promise<EmailAutomationConfig> {
  if (USE_MOCKS) {
    await delay(400);
    mockConfig = { ...config };
    return { ...mockConfig };
  }
  const { data } = await apiClient.put<EmailAutomationConfig>(
    '/api/v1/email-campaigns/automation',
    config
  );
  return data;
}
