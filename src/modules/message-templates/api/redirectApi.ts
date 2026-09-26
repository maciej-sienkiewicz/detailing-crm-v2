import { apiClient } from '@/core';
import type { CommunicationRedirectSettings, RehearsalReport } from '../types';

/*
 * Każdy błąd tych wywołań karta przekierowania pokazuje sama, w zdaniu przy polach
 * (komunikat serwera słowo w słowo). Bez `skipErrorToast` globalny interceptor
 * dokładał ten sam tekst drugi raz w dymku w rogu ekranu.
 */
const HANDLED_INLINE = { skipErrorToast: true } as const;

/**
 * „Przekieruj każdą wiadomość mailową i SMS na moje dane" - jedno ustawienie na studio.
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
  const { data } = await apiClient.put<CommunicationRedirectSettings>('/v1/communication/redirect', body, HANDLED_INLINE);
  return data;
}

/** Renderuje i sprawdza każdy szablon z przykładowymi danymi; nic nie wysyła. */
export async function planRehearsal(): Promise<RehearsalReport> {
  const { data } = await apiClient.post<RehearsalReport>('/v1/communication/rehearsal/plan', undefined, HANDLED_INLINE);
  return data;
}

/** Wysyła wszystkie szablony na dane z przekierowania - tylko gdy plan jest bez błędów. */
export async function runRehearsal(): Promise<RehearsalReport> {
  const { data } = await apiClient.post<RehearsalReport>('/v1/communication/rehearsal/run', undefined, HANDLED_INLINE);
  return data;
}
