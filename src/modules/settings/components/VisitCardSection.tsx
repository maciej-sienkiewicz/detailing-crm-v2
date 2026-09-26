// src/modules/settings/components/VisitCardSection.tsx
//
// Ustawienia → Komunikacja z klientem → Karta wizyty.
//
// Dwa przełączniki studia:
//  - „Czy korzystać z Karty Wizyty?"       (główny)
//  - „Czy domyślnie wysyłać Kartę Wizyty?" (domyślne zaznaczenie wysyłki przy
//    rezerwacji i przyjęciu; ma sens tylko przy włączonej karcie)
//
// Karta wymaga modułu SMS: bez niego sekcja jest zablokowana z propozycją zakupu.
//
// Tytuł i jedno zdanie o sekcji stoją w nagłówku ramy ustawień - sekcja nie
// powtarza „Karta Wizyty" drugi raz. Błąd wczytania to komunikat z „Spróbuj
// ponownie", a nie kręcące się kółko bez końca; do tego czasu przełączników nie
// ma, bo „wyłączone" przed odpowiedzią serwera wyglądało jak prawdziwy stan.

import styled from 'styled-components';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { LockedSection } from '@/common/components/LockedSection';
import { useToast } from '@/common/components/Toast';
import { Button, Card, Notice, ui } from '@/common/components/ui';
import { useFeature } from '@/modules/subscription';
import { visitCardApi } from '@/modules/visit-card/api/visitCardApi';
import type { UpdateVisitCardSettingsPayload } from '@/modules/visit-card/types';
import { VISIT_CARD_SETTINGS_QUERY_KEY } from '@/modules/visit-card/hooks/useVisitCardSettings';
import { SettingSwitchRow } from './SettingSwitchRow';
import { serverMessage, toastedGlobally } from './errorToast';

const Body = styled(Card)`
    padding: 20px 24px 8px;

    @media (max-width: 767px) { padding: 16px 16px 4px; }
`;

const Intro = styled.p`
    margin: 0 0 4px;
    max-width: 68ch;
    font-size: 13.5px;
    line-height: 1.55;
    color: ${ui.textSecondary};
`;

const Loading = styled.p`
    margin: 0;
    padding: 20px 0;
    font-size: 13px;
    color: ${ui.textMuted};
`;

export const VisitCardSection = () => {
    const smsFeature = useFeature('SMS_EMAIL');
    const { showSuccess, showError } = useToast();
    const queryClient = useQueryClient();

    // Ten sam klucz i funkcja co useVisitCardSettings (rezerwacja, przyjęcie) - wspólna
    // pamięć podręczna; tutaj potrzebny jest dodatkowo stan błędu i ponowienie.
    const { data: settings, isPending, isError, refetch } = useQuery({
        queryKey: VISIT_CARD_SETTINGS_QUERY_KEY,
        queryFn: visitCardApi.getSettings,
        staleTime: 60_000,
    });

    const updateMutation = useMutation({
        mutationFn: (payload: UpdateVisitCardSettingsPayload) => visitCardApi.updateSettings(payload),
        onSuccess: (data, payload) => {
            queryClient.setQueryData(VISIT_CARD_SETTINGS_QUERY_KEY, data);
            if (payload.enabled !== undefined) {
                showSuccess(
                    payload.enabled ? 'Karta wizyty włączona' : 'Karta wizyty wyłączona',
                    payload.enabled
                        ? 'Opcja wysyłki linku wraca do rezerwacji i przyjęcia pojazdu.'
                        : 'Linki do karty nie będą wysyłane.',
                );
            } else {
                showSuccess('Zapisano', payload.sendByDefault
                    ? 'Wysyłka karty będzie domyślnie zaznaczona.'
                    : 'Wysyłka karty będzie domyślnie odznaczona.');
            }
        },
        onError: (error) => {
            if (!toastedGlobally(error)) {
                showError('Nie udało się zapisać ustawień karty wizyty', serverMessage(error) ?? 'Spróbuj ponownie.');
            }
            queryClient.invalidateQueries({ queryKey: VISIT_CARD_SETTINGS_QUERY_KEY });
        },
    });

    const saving = updateMutation.isPending;
    const known = settings !== undefined;
    const enabled = settings?.enabled ?? true;
    const sendByDefault = settings?.sendByDefault ?? false;

    return (
        <LockedSection
            locked={!smsFeature.enabled}
            message="Karta Wizyty wymaga wykupionego modułu SMS."
        >
            {isError && !known ? (
                <Notice
                    tone="danger"
                    role="alert"
                    title="Nie udało się wczytać ustawień karty wizyty"
                    action={<Button variant="ghost" size="sm" onClick={() => void refetch()}>Spróbuj ponownie</Button>}
                >
                    Nie wiemy, czy karta jest teraz włączona, więc przełączniki pojawią się po wczytaniu.
                </Notice>
            ) : (
                <Body>
                    <Intro>
                        Strona dla klienta z podsumowaniem rezerwacji, zakresem usług i wyceną, a w trakcie
                        wizyty także dokumentacją zdjęciową i dokumentami. Link wysyłamy SMS-em lub e-mailem.
                    </Intro>

                    {isPending && !known ? (
                        <Loading role="status">Wczytywanie ustawień…</Loading>
                    ) : (
                        <>
                            <SettingSwitchRow
                                label="Czy korzystać z Karty Wizyty?"
                                hint="Po wyłączeniu opcja wysyłki karty zniknie z tworzenia rezerwacji i przyjęcia pojazdu, a linki nie będą wysyłane."
                                checked={enabled}
                                disabled={saving}
                                onChange={next => updateMutation.mutate({ enabled: next })}
                            />
                            <SettingSwitchRow
                                label="Czy domyślnie wysyłać Kartę Wizyty?"
                                hint="Steruje domyślnym zaznaczeniem opcji „Wyślij SMS z linkiem do Karty Wizyty” przy tworzeniu rezerwacji i przyjęciu pojazdu."
                                checked={enabled && sendByDefault}
                                disabled={saving || !enabled}
                                inactive={!enabled}
                                onChange={next => updateMutation.mutate({ sendByDefault: next })}
                            />
                        </>
                    )}
                </Body>
            )}
        </LockedSection>
    );
};
