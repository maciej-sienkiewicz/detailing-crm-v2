import { useEntitlements } from '../api/subscriptionQueries';

/**
 * True, gdy uprawnienia są wyłączone przez NIEAKTYWNY ABONAMENT, a nie przez brak
 * modułu (`subscriptionActive: false` w /me/entitlements).
 *
 * Funkcje (`features`) nie niosą własnego `lockedBy`, więc bramki modułów pytają
 * tutaj. Bez tego wygasłe studio z pełnym planem widziało „Odblokuj moduł" przy
 * module, który ma - i mogło próbować go kupić drugi raz.
 */
export const useSubscriptionLocked = (): boolean => {
    const { data } = useEntitlements();
    return data?.subscriptionActive === false;
};
