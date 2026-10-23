// src/modules/settings/components/VisitCardSection.tsx
//
// „Karta wizyty" w Ustawienia → Klienci → Wiadomości do klientów.
//
// Przełącznik „Karta wizyty dla klientów". Stan początkowy pola „wyślij link"
// przy rezerwacji i przyjęciu ustawia „Domyślnie zaznacz" przy „Linku do Karty
// Rezerwacji" i „Linku do Karty Wizyty" na osi wiadomości tuż obok - dawny przełącznik
// „Czy domyślnie wysyłać Kartę Wizyty?" zniknął, żeby nie było dwóch miejsc na to samo.
//
// Dawniej osobna sekcja z wyniesioną kartą dla jednego przełącznika. Karta żyje
// wyłącznie z linków, które wysyłają wiadomości, więc stoi przy nich jako płaski panel
// obok nadawcy SMS; wymóg modułu SMS pilnuje już blokada całej sekcji wiadomości.
//
// Błąd wczytania to komunikat z „Spróbuj ponownie", a nie kręcące się kółko bez końca;
// do tego czasu przełącznika nie ma, bo „wyłączone" przed odpowiedzią serwera wyglądało
// jak prawdziwy stan.
import styled from 'styled-components';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/common/components/Toast';
import { Button, Notice, Panel, SectionTitle, ui } from '@/common/components/ui';
import { visitCardApi } from '@/modules/visit-card/api/visitCardApi';
import type { UpdateVisitCardSettingsPayload } from '@/modules/visit-card/types';
import { VISIT_CARD_SETTINGS_QUERY_KEY } from '@/modules/visit-card/hooks/useVisitCardSettings';
import { SettingSwitchRow } from './SettingSwitchRow';
import { serverMessage, toastedGlobally } from './errorToast';

const Body = styled(Panel)`
    padding: 18px 20px 4px;

    @media (max-width: 767px) { padding: 16px 16px 2px; }
`;

const Loading = styled.p`
    margin: 0;
    padding: 20px 0;
    font-size: 13px;
    color: ${ui.textMuted};
`;

export const VisitCardSection = () => {
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

    return isError && !known ? (
        <Notice
            tone="danger"
            role="alert"
            title="Nie udało się wczytać ustawień karty wizyty"
            action={<Button variant="ghost" size="sm" onClick={() => void refetch()}>Spróbuj ponownie</Button>}
        >
            Nie wiemy, czy karta jest teraz włączona, więc przełącznik pojawi się po wczytaniu.
        </Notice>
    ) : (
        <Body aria-labelledby="visit-card-title">
            <SectionTitle as="h3" id="visit-card-title">Karta wizyty</SectionTitle>
            {isPending && !known ? (
                <Loading role="status">Wczytywanie ustawień…</Loading>
            ) : (
                <SettingSwitchRow
                    label="Karta wizyty dla klientów"
                    hint="Strona z rezerwacją, usługami i wyceną, a w trakcie wizyty także ze zdjęciami. Link wysyłają wiadomości „Link do Karty”."
                    checked={enabled}
                    disabled={saving}
                    onChange={next => updateMutation.mutate({ enabled: next })}
                />
            )}
        </Body>
    );
};
