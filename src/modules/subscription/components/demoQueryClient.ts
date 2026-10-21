import {
    QueryClient,
    type DefaultError,
    type DefaultedQueryObserverOptions,
    type QueryKey,
    type QueryObserverOptions,
} from '@tanstack/react-query';

/**
 * Klient zapytań warstwy demo w ModuleGate: żadne zapytanie nie wychodzi do serwera.
 *
 * Zablokowany moduł renderuje prawdziwy widok pod rozmyciem. Dawniej każde jego
 * zapytanie kończyło się 402 - czerwone wiersze w Network przy każdym wejściu,
 * a widok zaplanowanej komunikacji dokładał dwa kolejne co minutę. Wyłączenie
 * w `defaultQueryOptions` wygrywa także z `enabled: true` wpisanym w hooku, bo
 * React Query liczy opcje obserwatora właśnie tą metodą.
 */
export class DemoQueryClient extends QueryClient {
    override defaultQueryOptions<
        TQueryFnData = unknown,
        TError = DefaultError,
        TData = TQueryFnData,
        TQueryData = TQueryFnData,
        TQueryKey extends QueryKey = QueryKey,
        TPageParam = never,
    >(
        options:
            | QueryObserverOptions<TQueryFnData, TError, TData, TQueryData, TQueryKey, TPageParam>
            | DefaultedQueryObserverOptions<TQueryFnData, TError, TData, TQueryData, TQueryKey>,
    ): DefaultedQueryObserverOptions<TQueryFnData, TError, TData, TQueryData, TQueryKey> {
        return { ...super.defaultQueryOptions(options), enabled: false };
    }
}
