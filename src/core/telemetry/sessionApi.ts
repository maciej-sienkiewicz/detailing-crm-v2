import { apiClient } from '@/core/apiClient';
import { SESSION_TELEMETRY } from './config';
import type { HeartbeatPayload } from './activityTracker';

const BASE_PATH = '/v1/metrics/session';

export interface SessionSnapshot {
    sessionId: string;
    activeSeconds: number;
    idleSeconds: number;
    interactionCount: number;
    meaningful: boolean;
    /** Interwał podany przez serwer — pozwala zmienić częstotliwość bez wdrożenia frontu. */
    nextHeartbeatInSeconds: number;
}

interface StartPayload {
    device?: string;
    route?: string;
}

/**
 * Telemetria nie ma prawa przeszkodzić użytkownikowi w pracy.
 *
 * Każde wywołanie jest opakowane, a błąd kończy się `null` zamiast wyjątku. Trzy flagi
 * konfiguracji axiosa są tu równie istotne jak samo opakowanie:
 *
 * - `skipErrorToast` — bez niej globalny interceptor pokazałby toast „Wystąpił
 *   nieoczekiwany błąd" za każdym razem, gdy backend metryk zakrztusi się w tle;
 *   użytkownik zobaczyłby awarię funkcji, z której istnienia nie zdaje sobie sprawy.
 * - `skipAuthRedirect` — bez niej heartbeat trafiający na wygasłą sesję wyrzuciłby
 *   użytkownika na `/login` w środku wypełniania formularza. Wylogowanie ma być skutkiem
 *   akcji użytkownika, nie tykania licznika w tle.
 * - `timeout` — zawieszone żądanie telemetryczne nie może trzymać połączenia w puli
 *   przeglądarki (limit 6 na origin) i blokować odczytów, na które ktoś faktycznie czeka.
 */
const TELEMETRY_REQUEST = {
    skipErrorToast: true,
    skipAuthRedirect: true,
    timeout: 10_000,
} as const;

export const sessionTelemetryApi = {
    start: async (payload: StartPayload): Promise<SessionSnapshot | null> => {
        try {
            const response = await apiClient.post<SessionSnapshot>(
                `${BASE_PATH}/start`,
                payload,
                TELEMETRY_REQUEST,
            );
            return response.data;
        } catch {
            return null;
        }
    },

    heartbeat: async (payload: HeartbeatPayload): Promise<SessionSnapshot | null> => {
        try {
            const response = await apiClient.post<SessionSnapshot>(
                `${BASE_PATH}/heartbeat`,
                payload,
                TELEMETRY_REQUEST,
            );
            // 204 znaczy „serwer nie ma otwartej sesji dla tego ciasteczka" — nie błąd,
            // po prostu nie ma czego aktualizować.
            return response.status === 204 ? null : response.data;
        } catch {
            return null;
        }
    },

    /**
     * Zamknięcie sesji przy opuszczaniu strony.
     *
     * `sendBeacon`, nie `fetch`: przeglądarka anuluje żądania w locie podczas rozbierania
     * strony, więc `fetch` gubiłby dokładnie te zdarzenia zamknięcia, które trzymają
     * pomiar w ryzach. Beacon jest kolejkowany przez przeglądarkę i wysyłany niezależnie
     * od losu karty.
     *
     * Zwraca `boolean`, ale wynik nie ma znaczenia dla poprawności: jeśli beacon nie
     * dojdzie, sweeper po stronie serwera zamknie sesję wstecznie na ostatnim heartbeacie.
     * Klient jest tu optymalizacją dokładności, nie warunkiem koniecznym.
     */
    end: (): boolean => {
        try {
            if (typeof navigator === 'undefined' || !navigator.sendBeacon) return false;
            // Bez ciała: endpoint identyfikuje sesję po ciasteczku, a `sendBeacon` wysyła
            // ciasteczka same z siebie w obrębie tego samego origin.
            return navigator.sendBeacon(SESSION_TELEMETRY.endBeaconUrl);
        } catch {
            return false;
        }
    },
};
