// src/core/backgroundRequest.ts
import type { QueryFunctionContext } from '@tanstack/react-query';

/** To, co odświeżenie w tle przekazuje wywołaniu API. */
export interface BackgroundRequestConfig {
    signal: AbortSignal;
    skipAuthRedirect: boolean;
}

/**
 * Konfiguracja zapytania odpytywanego cyklicznie (`refetchInterval`).
 *
 * Po wygaśnięciu sesji timer dostawał 401, a interceptor przenosił na /login - w połowie
 * wypełnianego formularza, bez żadnego ruchu użytkownika. Odświeżenie zapytania, którego
 * dane już są na ekranie, idzie więc ze `skipAuthRedirect`: o wygaśnięciu sesji powie
 * następna akcja użytkownika. Pierwsze wczytanie widoku przekierowuje jak zawsze.
 */
export const backgroundRequest = ({ client, queryKey, signal }: QueryFunctionContext): BackgroundRequestConfig => ({
    signal,
    skipAuthRedirect: (client.getQueryState(queryKey)?.dataUpdatedAt ?? 0) > 0,
});
