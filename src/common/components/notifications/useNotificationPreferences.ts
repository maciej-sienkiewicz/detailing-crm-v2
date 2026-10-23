// src/common/components/notifications/useNotificationPreferences.ts
//
// Własne ustawienia powiadomień osoby (serwer: NotificationCategory) - wspólne dla
// podsumowań reklam i przypomnień o rezerwacjach. Jedna lista i jeden klucz cache:
// zapis jednego wiersza nie może nadpisać drugiego starą kopią listy.
//
// Wybór widać od razu po kliknięciu. Gdy zapis się nie uda, wraca poprzednia wartość
// z komunikatem - przełącznik nie udaje, że coś zapisał.

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/common/components/Toast';
import {
    NOTIFICATION_PREFERENCES_KEY,
    notificationPreferencesApi,
    withPreference,
    type NotificationPreference,
} from './marketPreferences';

export function useNotificationPreferences() {
    const queryClient = useQueryClient();
    const { showError } = useToast();
    const preferences = useQuery({
        queryKey: NOTIFICATION_PREFERENCES_KEY,
        queryFn: notificationPreferencesApi.list,
        staleTime: 5 * 60_000,
    });

    const mutation = useMutation({
        mutationFn: ({ category, value }: { category: string; value: string }) =>
            notificationPreferencesApi.update(category, value),
        onMutate: async ({ category, value }) => {
            await queryClient.cancelQueries({ queryKey: NOTIFICATION_PREFERENCES_KEY });
            const previous = queryClient.getQueryData<NotificationPreference[]>(NOTIFICATION_PREFERENCES_KEY);
            queryClient.setQueryData(NOTIFICATION_PREFERENCES_KEY, withPreference(previous, category, value));
            return { previous };
        },
        onError: (_error, _variables, context) => {
            queryClient.setQueryData(NOTIFICATION_PREFERENCES_KEY, context?.previous);
            showError('Nie udało się zapisać ustawienia', 'Wróciło poprzednie. Spróbuj ponownie.');
        },
        onSuccess: (saved) => {
            queryClient.setQueryData<NotificationPreference[] | undefined>(NOTIFICATION_PREFERENCES_KEY, (list) =>
                withPreference(list, saved.category, saved.value)
            );
        },
    });

    const update = (category: string, value: string) => mutation.mutate({ category, value });

    return { preferences, update };
}
