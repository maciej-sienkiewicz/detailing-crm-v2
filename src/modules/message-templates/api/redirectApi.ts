import { apiClient } from '@/core';
import type { CommunicationRedirectSettings, RehearsalReport } from '../types';

/**
 * „Przekieruj każdą wiadomość mailową i SMS na moje dane" — jedno ustawienie na studio.
 * Gdy włączone, backend podmienia odbiorcę każdej wiadomości do klienta na te dane,
 * w bramce wysyłkowej, tuż przed dostawcą. Klienci nie dostają nic.
 */
export async function fetchCommunicationRedirect(): Promise<CommunicationRedirectSettings> {
  const { data } = await apiClient.get<CommunicationRedirectSettings>('/v1/communication/redirect');
  return data;
}

export async function updateCommunicationRedirect(
  body: { enabled: boolean; phone: string; email: string }
): Promise<CommunicationRedirectSettings> {
  const { data } = await apiClient.put<CommunicationRedirectSettings>('/v1/communication/redirect', body);
  return data;
}

/** Renderuje i sprawdza każdy szablon z przykładowymi danymi; nic nie wysyła. */
export async function planRehearsal(): Promise<RehearsalReport> {
  const { data } = await apiClient.post<RehearsalReport>('/v1/communication/rehearsal/plan');
  return data;
}

/** Wysyła wszystkie szablony na dane z przekierowania — tylko gdy plan jest bez błędów. */
export async function runRehearsal(): Promise<RehearsalReport> {
  const { data } = await apiClient.post<RehearsalReport>('/v1/communication/rehearsal/run');
  return data;
}
