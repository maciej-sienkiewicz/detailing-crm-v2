import { useQuery, type QueryClient } from '@tanstack/react-query';
import { subscriptionApi } from '../api/subscriptionApi';

export const SUBSCRIPTION_QUERY_KEY = ['subscription', 'status'] as const;

/**
 * Ile wynik uchodzi za świeży. Krótko, bo od statusu zależy, czy studio w ogóle widzi
 * aplikację - ale dość długo, żeby strażnik subskrypcji nie pobierał ponownie statusu,
 * który `prefetchSubscriptionStatus` przyniósł chwilę wcześniej przy starcie.
 */
const STATUS_STALE_MS = 10_000;

export const useSubscriptionStatus = () => {
    const { data, isLoading, isError, refetch } = useQuery({
        queryKey: SUBSCRIPTION_QUERY_KEY,
        queryFn: () => subscriptionApi.getStatus(),
        staleTime: STATUS_STALE_MS,
    });

    return { status: data, isLoading, isError, refetch };
};

/**
 * Pobranie statusu RÓWNOLEGLE z /auth/me przy starcie aplikacji (core/context/AuthContext).
 * Wcześniej szły jedno po drugim: SubscriptionGate montuje się dopiero po odpowiedzi
 * /auth/me, więc ekran startowy czekał na dwie podróże do serwera zamiast jednej.
 *
 * `skipAuthRedirect`: w tej chwili nie wiadomo jeszcze, czy jest sesja. 401 to tutaj
 * odpowiedź, nie powód do wyrzucenia na /login - o tym decyduje ProtectedRoute
 * na podstawie /auth/me. Po zalogowaniu strażnik pobierze status sam, bo zapytanie
 * zakończone błędem nie ma danych.
 */
export const prefetchSubscriptionStatus = (queryClient: QueryClient) =>
    queryClient.prefetchQuery({
        queryKey: SUBSCRIPTION_QUERY_KEY,
        queryFn: () => subscriptionApi.getStatus({ skipAuthRedirect: true }),
        staleTime: STATUS_STALE_MS,
    });
