// src/modules/settings/components/VisitCardSection.tsx
//
// Ustawienia → Komunikacja z klientem → Karta wizyty.
//
// Przełącznik „Karta wizyty dla klientów". Stan początkowy pola „wyślij link"
// przy rezerwacji i przyjęciu ustawia się teraz tak jak przy każdej innej wiadomości:
// „Domyślnie zaznacz" przy „Linku do Karty Rezerwacji" i „Linku do Karty Wizyty"
// w Wiadomościach do klientów. Dawny przełącznik „Czy domyślnie wysyłać Kartę
// Wizyty?" zniknął stąd, żeby nie było dwóch miejsc na to samo; jego wartość
// migracja przepisała do obu wiadomości.
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
            showSuccess(
                payload.enabled ? 'Karta wizyty włączona' : 'Karta wizyty wyłączona',
                payload.enabled
                    ? 'Opcja wysyłki linku wraca do rezerwacji i przyjęcia pojazdu.'
                    : 'Linki do karty nie będą wysyłane.',
            );
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

    return (
        <LockedSection
            locked={!smsFeature.enabled}
            message="Karta wizyty wymaga modułu SMS."
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
                        wizyty także zdjęciami i dokumentami. Link wysyłamy SMS-em lub e-mailem.
                    </Intro>

                    {isPending && !known ? (
                        <Loading role="status">Wczytywanie ustawień…</Loading>
                    ) : (
                        <>
                            <SettingSwitchRow
                                label="Karta wizyty dla klientów"
                                hint="Po wyłączeniu opcja wysyłki karty zniknie z tworzenia rezerwacji i przyjęcia pojazdu, a linki nie będą wysyłane."
                                checked={enabled}
                                disabled={saving}
                                onChange={next => updateMutation.mutate({ enabled: next })}
                            />
                            <Intro>
                                Czy link ma być domyślnie zaznaczony, ustawisz w Ustawienia → Wiadomości
                                automatyczne (przełącznik „Domyślnie zaznacz”).
                            </Intro>
                        </>
                    )}
                </Body>
            )}
        </LockedSection>
    );
};
