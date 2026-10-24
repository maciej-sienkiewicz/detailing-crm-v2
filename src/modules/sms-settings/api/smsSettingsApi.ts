import type { SmsAutomationConfig, SmsSenderNameConfig } from '../types';
import { apiClient } from '@/core';

// Ścieżki zostają pod /v1/sms-campaigns/…, bo tak wystawia je backend (pakiet
// smscampaigns) i wołają je już wydane aplikacje mobilne. Nazwa w adresie to relikt
// dawnego ekranu kampanii SMS - sam ekran usunięto, kampanie prowadzi moduł `campaigns`.

// ─── Wiadomości automatyczne ──────────────────────────────────────────────────

export async function fetchAutomationConfig(): Promise<SmsAutomationConfig> {
  const { data } = await apiClient.get<SmsAutomationConfig>('/v1/sms-campaigns/automation');
  return data;
}

// Odmowę zapisu (np. nieznana zmienna w treści) pokazuje wywołujący: ustawienia w pasku
// zapisu, kreator przy wizycie toastem. Globalny toast powtarzał ten sam tekst drugi raz.
export async function updateAutomationConfig(config: SmsAutomationConfig): Promise<SmsAutomationConfig> {
  const { data } = await apiClient.put<SmsAutomationConfig>('/v1/sms-campaigns/automation', config, {
    skipErrorToast: true,
  });
  return data;
}

// ─── Nazwa nadawcy ────────────────────────────────────────────────────────────

export async function fetchSenderNameConfig(): Promise<SmsSenderNameConfig> {
  const { data } = await apiClient.get<SmsSenderNameConfig>('/v1/sms-campaigns/sender-name');
  return data;
}

export async function updateSenderName(senderName: string): Promise<SmsSenderNameConfig> {
  const { data } = await apiClient.put<SmsSenderNameConfig>('/v1/sms-campaigns/sender-name', { senderName });
  return data;
}

/**
 * Podpis narysowany na ekranie - serwer składa z niego gotowe upoważnienie
 * (dane firmy z ustawień, pole nadawcy z konfiguracji SMS, data bieżąca).
 */
export async function signSenderNameAuthDoc(signatureImageBase64: string): Promise<SmsSenderNameConfig> {
  const { data } = await apiClient.post<SmsSenderNameConfig>(
    '/v1/sms-campaigns/sender-name/document/sign',
    { signatureImageBase64 }
  );
  return data;
}

export async function uploadSenderNameAuthDoc(file: File): Promise<SmsSenderNameConfig> {
  const formData = new FormData();
  formData.append('file', file);
  const { data } = await apiClient.post<SmsSenderNameConfig>(
    '/v1/sms-campaigns/sender-name/document',
    formData,
  );
  return data;
}

export async function fetchSenderNameDocumentUrl(): Promise<string> {
  const { data } = await apiClient.get<{ url: string }>('/v1/sms-campaigns/sender-name/document/download-url');
  return data.url;
}
