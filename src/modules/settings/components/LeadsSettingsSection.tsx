// src/modules/settings/components/LeadsSettingsSection.tsx
//
// Ustawienia → Komunikacja → Leady.
//
// Jeden przełącznik studia: „Automatyczne tworzenie leadów". Po włączeniu każda nowa
// wiadomość przychodząca jest czytana przez model i — jeśli okaże się zapytaniem
// klienta — sama zakłada leada.
//
// Ekran musi powiedzieć trzy rzeczy, bo bez nich przełącznik jest aktem wiary:
// co dokładnie automat robi, czego NIE ruszy (poczta sprzed włączenia) i że jego
// decyzja jest odwracalna jednym kliknięciem w skrzynce.

import { useState } from 'react';
import styled, { keyframes } from 'styled-components';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/common/components/Toast';
import { leadsSettingsApi } from '../api/leadsSettingsApi';
import type { AutoLeadConfig, LeadAlertConfig } from '../types';

const AUTO_LEAD_CONFIG_QUERY_KEY = ['settings', 'auto-lead-config'] as const;
const LEAD_ALERT_CONFIG_QUERY_KEY = ['settings', 'lead-alert-config'] as const;

// ─── Styled ───────────────────────────────────────────────────────────────────

const spin = keyframes`from { transform: rotate(0deg); } to { transform: rotate(360deg); }`;

const Spinner = styled.div`
    width: 20px;
    height: 20px;
    border: 2px solid #e2e8f0;
    border-top-color: #0ea5e9;
    border-radius: 50%;
    animation: ${spin} 700ms linear infinite;
    margin: 60px auto;
`;

/** Dwie karty jedna pod drugą - ten sam odstęp, co między sekcjami ustawień. */
const Stack = styled.div`
    display: flex;
    flex-direction: column;
    gap: 20px;
`;

const Card = styled.div`
    background: white;
    border: 1px solid ${p => p.theme.colors.border};
    border-radius: ${p => p.theme.radii.lg};
    padding: 24px 28px;
`;

const CardTitle = styled.h3`
    font-size: 15px;
    font-weight: 700;
    color: ${p => p.theme.colors.text};
    margin: 0 0 6px;
`;

const CardDescription = styled.p`
    font-size: 13px;
    color: ${p => p.theme.colors.textSecondary};
    margin: 0 0 20px;
    line-height: 1.5;
    max-width: 640px;
`;

const OptionRow = styled.div`
    display: flex;
    align-items: center;
    gap: 16px;
    padding: 16px 0;
    border-top: 1px solid ${p => p.theme.colors.border};
`;

const OptionTexts = styled.div`
    flex: 1;
    min-width: 0;
`;

const OptionLabel = styled.div`
    font-size: 14px;
    font-weight: 600;
    color: ${p => p.theme.colors.text};
`;

const OptionHint = styled.div`
    font-size: 12.5px;
    color: ${p => p.theme.colors.textSecondary};
    margin-top: 2px;
    line-height: 1.45;
`;

const ToggleTrack = styled.button<{ $on: boolean }>`
    position: relative;
    width: 42px;
    height: 24px;
    flex-shrink: 0;
    border: none;
    border-radius: 9999px;
    background: ${p => (p.$on ? '#0ea5e9' : '#cbd5e1')};
    cursor: pointer;
    transition: background 180ms ease;

    &::after {
        content: '';
        position: absolute;
        top: 3px;
        left: ${p => (p.$on ? '21px' : '3px')};
        width: 18px;
        height: 18px;
        border-radius: 50%;
        background: white;
        box-shadow: 0 1px 3px rgba(15, 23, 42, 0.25);
        transition: left 180ms ease;
    }

    &:disabled {
        cursor: not-allowed;
    }
`;

const Details = styled.div`
    border-top: 1px solid ${p => p.theme.colors.border};
    padding-top: 18px;
    margin-top: 4px;
`;

const DetailsTitle = styled.div`
    font-size: 12px;
    font-weight: 700;
    letter-spacing: 0.04em;
    text-transform: uppercase;
    color: ${p => p.theme.colors.textSecondary};
    margin-bottom: 10px;
`;

const DetailsList = styled.ul`
    margin: 0;
    padding-left: 18px;
    max-width: 640px;

    li {
        font-size: 12.5px;
        line-height: 1.6;
        color: ${p => p.theme.colors.textSecondary};

        & + li {
            margin-top: 6px;
        }
    }
`;

/** Pole liczbowe z jednostką w środku - „24 godz." czyta się jak zdanie, nie jak formularz. */
const HoursField = styled.label`
    display: flex;
    align-items: center;
    gap: 6px;
    flex-shrink: 0;

    input {
        width: 68px;
        padding: 7px 10px;
        border: 1px solid ${p => p.theme.colors.border};
        border-radius: ${p => p.theme.radii.md};
        font-family: inherit;
        font-size: 14px;
        text-align: right;
        color: ${p => p.theme.colors.text};
        background: ${p => p.theme.colors.surface};
        font-variant-numeric: tabular-nums;

        &:focus { outline: none; border-color: ${p => p.theme.colors.primary}; }
        &:disabled { opacity: 0.6; }
    }

    span {
        font-size: 13px;
        color: ${p => p.theme.colors.textSecondary};
    }
`;

const SaveRow = styled.div`
    display: flex;
    align-items: center;
    justify-content: flex-end;
    gap: 12px;
    padding-top: 16px;
    border-top: 1px solid ${p => p.theme.colors.border};
`;

const SaveButton = styled.button`
    padding: 9px 18px;
    border: none;
    border-radius: ${p => p.theme.radii.md};
    background: ${p => p.theme.colors.primary};
    color: #ffffff;
    font-family: inherit;
    font-size: 13.5px;
    font-weight: ${p => p.theme.fontWeights.semibold};
    cursor: pointer;

    &:disabled { opacity: 0.5; cursor: default; }
`;

const ActiveSince = styled.div`
    margin-top: 14px;
    font-size: 12.5px;
    color: ${p => p.theme.colors.textSecondary};
`;

// ─── Component ────────────────────────────────────────────────────────────────

const formatMoment = (iso: string | null): string | null => {
    if (!iso) return null;
    const date = new Date(iso);
    return Number.isNaN(date.getTime())
        ? null
        : date.toLocaleString('pl-PL', { dateStyle: 'long', timeStyle: 'short' });
};

/**
 * Progi stygnięcia sprawy.
 *
 * Do tej pory te dwie liczby istniały wyłącznie w bazie i nikt nie miał jak ich
 * zmienić, więc interfejs podstawiał własne 24/120 i musiał zgadywać, czy 48/72
 * z serwera to wybór właściciela, czy brak wyboru. Odkąd kolejka dzieli się na
 * sekcje według tych progów, to nie jest już detal plakietki: od nich zależy, co
 * trafia do „Czeka na Ciebie", a co do „Ucichło".
 *
 * Jednostką są godziny, także przy ciszy klienta - przeliczanie dni na godziny
 * przy zapisie i z powrotem przy odczycie dawałoby pole, które po zapisaniu „5 dni"
 * pokazuje „4,96". Podpowiedź pod polem tłumaczy liczbę na dni.
 */
const StagnationCard = () => {
    const { showSuccess, showError } = useToast();
    const queryClient = useQueryClient();

    const { data, isPending } = useQuery({
        queryKey: LEAD_ALERT_CONFIG_QUERY_KEY,
        queryFn: leadsSettingsApi.getAlertConfig,
    });

    const [draft, setDraft] = useState<LeadAlertConfig | null>(null);
    const current = draft ?? data ?? null;

    const save = useMutation({
        mutationFn: (config: LeadAlertConfig) => leadsSettingsApi.updateAlertConfig(config),
        onSuccess: (saved) => {
            queryClient.setQueryData(LEAD_ALERT_CONFIG_QUERY_KEY, saved);
            setDraft(null);
            showSuccess('Progi zapisane');
        },
        onError: () => showError('Nie udało się zapisać progów'),
    });

    /** Zakres pilnuje backend (1–720 h); tu tylko nie wypuszczamy wartości, których nie przyjmie. */
    const clamp = (value: number) => Math.min(720, Math.max(1, Math.round(value) || 1));
    const dirty = Boolean(draft && data &&
        (draft.leadStagnantOurThresholdHours !== data.leadStagnantOurThresholdHours ||
         draft.leadStagnantClientThresholdHours !== data.leadStagnantClientThresholdHours));

    const inDays = (hours: number) => {
        const days = hours / 24;
        if (days < 1) return `${hours} godz.`;
        return Number.isInteger(days) ? `${days} dni` : `${days.toFixed(1)} dnia`;
    };

    return (
        <Card>
            <CardTitle>Progi czasu w kolejce</CardTitle>
            <CardDescription>
                Te dwie liczby dzielą kolejkę zapytań na sekcje i decydują o tym, kiedy wiek
                sprawy zapala się na czerwono. Jednej dobrej wartości nie ma — inaczej wygląda
                to przy myciu, inaczej przy powłoce ceramicznej.
            </CardDescription>

            {isPending || !current ? (
                <Spinner />
            ) : (
                <>
                    <OptionRow>
                        <OptionTexts>
                            <OptionLabel>Po ilu godzinach brak odpowiedzi jest zaległością</OptionLabel>
                            <OptionHint>
                                Po tym czasie wiek sprawy w sekcji „Czeka na nas” zapala się na
                                czerwono. Teraz: {inDays(current.leadStagnantOurThresholdHours)}.
                            </OptionHint>
                        </OptionTexts>
                        <HoursField>
                            <input
                                type="number"
                                min={1}
                                max={720}
                                value={current.leadStagnantOurThresholdHours}
                                disabled={save.isPending}
                                onChange={(event) =>
                                    setDraft({
                                        ...current,
                                        leadStagnantOurThresholdHours: clamp(Number(event.target.value)),
                                    })
                                }
                            />
                            <span>godz.</span>
                        </HoursField>
                    </OptionRow>

                    <OptionRow>
                        <OptionTexts>
                            <OptionLabel>Po ilu godzinach cisza klienta to rozmowa bez odzewu</OptionLabel>
                            <OptionHint>
                                Po tym czasie sprawa przechodzi z „U klienta” do sekcji „Ucichło”.
                                Teraz: {inDays(current.leadStagnantClientThresholdHours)}.
                            </OptionHint>
                        </OptionTexts>
                        <HoursField>
                            <input
                                type="number"
                                min={1}
                                max={720}
                                value={current.leadStagnantClientThresholdHours}
                                disabled={save.isPending}
                                onChange={(event) =>
                                    setDraft({
                                        ...current,
                                        leadStagnantClientThresholdHours: clamp(Number(event.target.value)),
                                    })
                                }
                            />
                            <span>godz.</span>
                        </HoursField>
                    </OptionRow>

                    <SaveRow>
                        <SaveButton
                            type="button"
                            disabled={!dirty || save.isPending}
                            onClick={() => draft && save.mutate(draft)}
                        >
                            {save.isPending ? 'Zapisywanie…' : 'Zapisz progi'}
                        </SaveButton>
                    </SaveRow>
                </>
            )}
        </Card>
    );
};

export const LeadsSettingsSection = () => {
    const { showError } = useToast();
    const queryClient = useQueryClient();

    const { data: config, isPending } = useQuery({
        queryKey: AUTO_LEAD_CONFIG_QUERY_KEY,
        queryFn: leadsSettingsApi.getAutoLeadConfig,
    });

    const updateMutation = useMutation({
        mutationFn: (enabled: boolean) => leadsSettingsApi.updateAutoLeadConfig(enabled),
        onSuccess: (data: AutoLeadConfig) => {
            queryClient.setQueryData(AUTO_LEAD_CONFIG_QUERY_KEY, data);
        },
        onError: () => {
            showError('Nie udało się zapisać ustawienia automatycznych leadów');
            queryClient.invalidateQueries({ queryKey: AUTO_LEAD_CONFIG_QUERY_KEY });
        },
    });

    const enabled = config?.enabled ?? false;
    const saving = updateMutation.isPending;
    const activeSince = formatMoment(config?.enabledAt ?? null);

    return (
        <Stack>
        <Card>
            <CardTitle>Automatyczne tworzenie leadów</CardTitle>
            <CardDescription>
                Każda nowa wiadomość w skrzynce jest czytana i oceniana: czy to zapytanie
                potencjalnego klienta o wycenę, termin albo zakres usługi. Jeśli tak — w module
                Leady od razu pojawia się nowe zapytanie z kontaktem i treścią. Reszta poczty
                (oferty od dostawców, faktury, newslettery, powiadomienia) zostaje nietknięta.
            </CardDescription>

            {isPending ? (
                <Spinner />
            ) : (
                <>
                    <OptionRow>
                        <OptionTexts>
                            <OptionLabel>Czy tworzyć leady automatycznie?</OptionLabel>
                            <OptionHint>
                                Po wyłączeniu skrzynka działa jak dotąd — leady powstają tylko wtedy,
                                gdy ktoś oznaczy wiadomość ręcznie.
                            </OptionHint>
                        </OptionTexts>
                        <ToggleTrack
                            $on={enabled}
                            disabled={saving}
                            aria-label="Czy tworzyć leady automatycznie?"
                            aria-pressed={enabled}
                            onClick={() => updateMutation.mutate(!enabled)}
                        />
                    </OptionRow>

                    <Details>
                        <DetailsTitle>Warto wiedzieć</DetailsTitle>
                        <DetailsList>
                            <li>
                                Automat obejmuje wyłącznie pocztę, która przyjdzie PO włączeniu.
                                Wiadomości, które już leżą w skrzynce, zostają nietknięte — od nich
                                jesteś Ty i przycisk „Oznacz jako lead".
                            </li>
                            <li>
                                Lead powstaje z pierwszej wiadomości rozmowy. Dalsza korespondencja
                                dokleja się do tego samego zapytania i nie tworzy kolejnych.
                            </li>
                            <li>
                                Przy niejednoznacznej wiadomości automat nie robi nic — wolimy
                                zostawić decyzję Tobie, niż zaśmiecić listę zapytań. Taka wiadomość
                                czeka w skrzynce i możesz oznaczyć ją jednym kliknięciem.
                            </li>
                            <li>
                                Newslettery, autorespondery i powiadomienia systemowe są odsiewane
                                po nagłówkach, zanim w ogóle dojdzie do oceny treści.
                            </li>
                        </DetailsList>

                        {enabled && activeSince && (
                            <ActiveSince>Automat działa od: {activeSince}</ActiveSince>
                        )}
                    </Details>
                </>
            )}
        </Card>

        {/* Progi stygnięcia stoją pod automatem, bo dotyczą tych samych leadów,
            tyle że po ich powstaniu: pierwszy ustawia, CO wpada do kolejki,
            drugi - kiedy kolejka zaczyna się dopominać. */}
        <StagnationCard />
        </Stack>
    );
};
