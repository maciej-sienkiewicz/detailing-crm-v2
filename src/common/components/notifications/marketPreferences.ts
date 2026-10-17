// src/common/components/notifications/marketPreferences.ts
// Ustawienia powiadomień o rynku reklam: kontrakt API i słownik etykiet.
//
// Osobno od komponentu, bo te same kategorie zna serwer (NotificationCategory) i ich
// kolejność, nazwy i podpowiedzi muszą wyglądać tak samo w Ustawieniach i w module
// Instagrama, gdzie komponent też stoi.
import { apiClient } from '@/core/apiClient';

export type MarketNotificationCategory = 'MARKET_DIGEST' | 'NEW_LOCAL_ADVERTISER' | 'WATCHED_COMPETITOR_CAMPAIGN';

export interface NotificationPreference {
    category: string;
    value: string;
    options: string[];
    defaultValue: string;
}

export const NOTIFICATION_PREFERENCES_KEY = ['me', 'notification-preferences'];

export const notificationPreferencesApi = {
    list: async (): Promise<NotificationPreference[]> => {
        const response = await apiClient.get<NotificationPreference[]>('/v1/me/notification-preferences');
        return response.data;
    },
    update: async (category: string, value: string): Promise<NotificationPreference> => {
        const response = await apiClient.put<NotificationPreference>(
            `/v1/me/notification-preferences/${encodeURIComponent(category)}`,
            { value },
            // Błąd pokazuje komponent - wraca też poprzednia wartość przełącznika.
            { skipErrorToast: true }
        );
        return response.data;
    },
};

interface CategoryCopy {
    title: string;
    labels: Record<string, string>;
    /** Podpowiedź pod przełącznikiem, zależna od wybranej wartości. */
    hint: (value: string) => string | null;
}

/**
 * Kolejność = kolejność na ekranie: od tego, co przychodzi zawsze (podsumowanie),
 * do tego, co jest rzadkim, pilnym alertem.
 */
export const MARKET_CATEGORIES: { category: MarketNotificationCategory; copy: CategoryCopy }[] = [
    {
        category: 'MARKET_DIGEST',
        copy: {
            title: 'Podsumowanie reklam w okolicy',
            labels: { OFF: 'Wyłączone', WEEKLY: 'Raz w tygodniu', DAILY: 'Codziennie' },
            hint: (value) =>
                value === 'WEEKLY' ? 'W poniedziałek około 8:00, za cały poprzedni tydzień.'
                    : value === 'DAILY' ? 'Codziennie około 8:00, za poprzedni dzień.'
                        : null,
        },
    },
    {
        category: 'NEW_LOCAL_ADVERTISER',
        copy: {
            title: 'Nowa firma w moim rejonie',
            labels: { ON: 'Włączone', OFF: 'Wyłączone' },
            hint: (value) => (value === 'ON' ? 'Od razu, gdy firma z Twoich miejscowości zacznie się reklamować pierwszy raz.' : null),
        },
    },
    {
        category: 'WATCHED_COMPETITOR_CAMPAIGN',
        copy: {
            title: 'Obserwowany konkurent rusza z kampanią',
            labels: { ON: 'Włączone', OFF: 'Wyłączone' },
            hint: (value) => (value === 'ON' ? 'Tylko profile z listy Lokalni, sprawdzamy raz dziennie.' : 'Tylko profile z listy Lokalni.'),
        },
    },
];

/** Wartość kategorii z odpowiedzi serwera; brak wiersza = domyślna serwera, a bez niej pierwsza opcja. */
export function preferenceValue(list: NotificationPreference[] | undefined, category: string): string | null {
    const found = list?.find((item) => item.category === category);
    if (!found) return null;
    return found.options.includes(found.value) ? found.value : found.defaultValue;
}

/** Lista po zmianie jednej kategorii - do natychmiastowego pokazania wyboru (optymistycznie). */
export function withPreference(list: NotificationPreference[] | undefined, category: string, value: string): NotificationPreference[] | undefined {
    return list?.map((item) => (item.category === category ? { ...item, value } : item));
}
