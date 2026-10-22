// src/common/components/notifications/MarketNotificationPreferences.tsx
//
// „Powiadomienia o rynku reklam" - trzy przełączniki, które ustawia SAMA osoba
// (push trafia na jej telefon). Biznes zgłosił lawinę powiadomień o reklamach
// konkurencji; jedyną drogą do ciszy było wyciszenie całej aplikacji w telefonie,
// czyli utrata także pushy o nowych zapytaniach. Teraz cisza jest tu, osobno.
//
// Zmiana zapisuje się od razu po kliknięciu - wybór pokazujemy natychmiast, a przy
// błędzie przełącznik wraca do poprzedniej wartości z komunikatem.

import styled from 'styled-components';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Panel, SectionTitle, Segmented, ui } from '@/common/components/ui';
import { useToast } from '@/common/components/Toast';
import {
    MARKET_CATEGORIES,
    NOTIFICATION_PREFERENCES_KEY,
    notificationPreferencesApi,
    preferenceValue,
    withPreference,
    type NotificationPreference,
} from './marketPreferences';

interface Props {
    /** Nagłówek sekcji; w module Instagrama może stać inny niż w Ustawieniach. */
    title?: string;
    className?: string;
    /**
     * Same wiersze, bez własnej ramy i nagłówka - w Ustawieniach → Telefon stoją
     * w jednej sekcji z raportem, bo jedno i drugie odpowiada na „jak często".
     */
    embedded?: boolean;
}

export function MarketNotificationPreferences({ title = 'Powiadomienia o reklamach konkurencji', className, embedded = false }: Props) {
    const queryClient = useQueryClient();
    const { showError } = useToast();
    const preferences = useQuery({
        queryKey: NOTIFICATION_PREFERENCES_KEY,
        queryFn: notificationPreferencesApi.list,
        staleTime: 5 * 60_000,
    });

    const update = useMutation({
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

    if (preferences.isError) return null;

    const rows = MARKET_CATEGORIES.map(({ category, copy }) => {
        const entry = preferences.data?.find((item) => item.category === category);
        const value = preferenceValue(preferences.data, category);
        // Serwer jeszcze nie zna kategorii (starsza wersja) - nie pokazujemy przełącznika bez skutku.
        if (preferences.data && !entry) return null;
        const options = (entry?.options ?? Object.keys(copy.labels)).map((option) => ({
            value: option,
            label: copy.labels[option] ?? option,
        }));
        const hint = value ? copy.hint(value) : null;
        return (
            <Setting key={category}>
                <span className="title">{copy.title}</span>
                <Segmented
                    label={copy.title}
                    size="sm"
                    options={options}
                    value={value ?? ''}
                    onChange={(next) => {
                        if (next !== value) update.mutate({ category, value: next });
                    }}
                />
                {hint && <Hint>{hint}</Hint>}
            </Setting>
        );
    });

    if (embedded) {
        return <Rows className={className} aria-busy={preferences.isLoading}>{rows}</Rows>;
    }

    return (
        <Box className={className} aria-busy={preferences.isLoading}>
            <SectionTitle as="h3">{title}</SectionTitle>
            {rows}
        </Box>
    );
}

const Rows = styled.div`
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 16px;
`;

const Box = styled(Panel)`
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 16px;
    padding: 16px 20px;

    @media (max-width: 767px) { padding: 16px; }
`;

const Setting = styled.div`
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 8px;
    max-width: 100%;

    .title { font-size: 14px; font-weight: 600; color: ${ui.ink}; }
`;

const Hint = styled.p`
    margin: 0;
    font-size: 13px;
    color: ${ui.textMuted};
`;
