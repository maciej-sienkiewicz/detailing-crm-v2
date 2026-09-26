// src/modules/settings/components/LeadsSettingsSection.tsx
//
// Ustawienia → Komunikacja → Leady.
//
// Jeden przełącznik studia: „Automatyczne tworzenie leadów". Po włączeniu każda nowa
// wiadomość przychodząca jest czytana przez model i — jeśli okaże się zapytaniem
// klienta — sama zakłada leada.
//
// Ekran mówi jednym zdaniem, co robi przełącznik. Wcześniej stały tu dwa akapity
// i cztery punkty „Warto wiedzieć" - nikt ich nie czytał, a przytłaczały sam
// przełącznik. Szczegóły (czego automat nie rusza, co przy wątpliwościach) są
// teraz trzema krótkimi punktami pod zwiniętym „Jak to działa".

import { useRef, useState } from 'react';
import styled from 'styled-components';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/common/components/Toast';
import { Button, Card, Notice, Panel, SectionTitle, ui } from '@/common/components/ui';
import { leadsSettingsApi } from '../api/leadsSettingsApi';
import type { AutoLeadConfig, LeadAlertConfig } from '../types';
import { UnsavedChangesBanner } from './shared/SettingsLayout';
import { SettingSwitchRow } from './SettingSwitchRow';
import { serverMessage, toastedGlobally } from './errorToast';
import { MAX_HOURS, MIN_HOURS, hoursInDays, normalizeHours, parseHours, sanitizeHours } from './leads/hoursField';

const AUTO_LEAD_CONFIG_QUERY_KEY = ['settings', 'auto-lead-config'] as const;
const LEAD_ALERT_CONFIG_QUERY_KEY = ['settings', 'lead-alert-config'] as const;

// ─── Styled ───────────────────────────────────────────────────────────────────

const Stack = styled.div`
    display: flex;
    flex-direction: column;
    gap: 20px;
`;

/* Automat to temat sekcji - jedyna wyniesiona powierzchnia (CLAUDE.md §2).
   Progi leżą pod nim płasko. */
const AutoCard = styled(Card)`
    padding: 20px 24px;

    @media (max-width: 767px) { padding: 16px; }
`;

const FlatPanel = styled(Panel)`
    padding: 18px 24px 6px;

    @media (max-width: 767px) { padding: 16px 16px 4px; }
`;

const Details = styled.details`
    border-top: 1px solid ${ui.lineFaint};
    padding-top: 12px;

    summary {
        width: fit-content;
        font-size: 13.5px;
        font-weight: 600;
        color: ${ui.brandInk};
        cursor: pointer;
    }
    &[open] summary { margin-bottom: 8px; }
`;

const DetailsList = styled.ul`
    margin: 0;
    padding-left: 18px;
    max-width: 68ch;

    li {
        font-size: 13px;
        line-height: 1.6;
        color: ${ui.textSecondary};

        & + li { margin-top: 6px; }
    }
`;

const ActiveSince = styled.p`
    margin: 0 0 12px;
    font-size: 13px;
    color: ${ui.textSecondary};
`;

const Loading = styled.p`
    margin: 0;
    padding: 18px 0;
    font-size: 13px;
    color: ${ui.textMuted};
`;

const ThresholdRow = styled.div`
    display: flex;
    align-items: center;
    gap: 16px;
    padding: 16px 0;
    border-top: 1px solid ${ui.lineFaint};

    @media (max-width: 767px) { flex-wrap: wrap; gap: 10px; }
`;

const ThresholdTexts = styled.div`
    flex: 1;
    min-width: 220px;
    display: flex;
    flex-direction: column;
    gap: 3px;

    label { font-size: 14px; font-weight: 600; color: ${ui.ink}; }
    p { margin: 0; font-size: 13px; line-height: 1.5; color: ${ui.textSecondary}; max-width: 68ch; }
`;

/** Pole liczbowe z jednostką obok - „24 godz." czyta się jak zdanie, nie jak formularz. */
const HoursField = styled.div<{ $invalid: boolean }>`
    display: flex;
    align-items: center;
    gap: 6px;
    flex-shrink: 0;

    input {
        width: 76px;
        height: 40px;
        padding: 0 10px;
        border: 1px solid ${p => (p.$invalid ? ui.dangerInk : ui.line)};
        border-radius: 10px;
        font-family: inherit;
        font-size: 16px;
        text-align: right;
        color: ${ui.ink};
        background: ${ui.surface};
        font-variant-numeric: tabular-nums;

        &:focus { outline: none; border-color: ${ui.focusRing}; box-shadow: 0 0 0 3px rgba(14, 165, 233, 0.12); }
        &:disabled { opacity: 0.6; }
        @media (min-width: 768px) { font-size: 14px; }
    }

    span { font-size: 13px; color: ${ui.textSecondary}; }
`;

// ─── Component ────────────────────────────────────────────────────────────────

const formatMoment = (iso: string | null): string | null => {
    if (!iso) return null;
    const date = new Date(iso);
    return Number.isNaN(date.getTime())
        ? null
        : date.toLocaleString('pl-PL', { dateStyle: 'long', timeStyle: 'short' });
};

type ThresholdKey = keyof LeadAlertConfig;

const THRESHOLDS: Array<{ key: ThresholdKey; label: string }> = [
    { key: 'leadStagnantOurThresholdHours', label: 'Nasza odpowiedź jest spóźniona po' },
    { key: 'leadStagnantClientThresholdHours', label: 'Klient ucichł po' },
];

type HoursDraft = Record<ThresholdKey, string>;

/** Brak wartości z serwera to puste pole, a nie napis „undefined" w polu. */
const asText = (n: number | null | undefined) => (typeof n === 'number' ? String(n) : '');

const toDraft = (config: LeadAlertConfig): HoursDraft => ({
    leadStagnantOurThresholdHours: asText(config.leadStagnantOurThresholdHours),
    leadStagnantClientThresholdHours: asText(config.leadStagnantClientThresholdHours),
});

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
 *
 * Zapis idzie przez wspólny pasek niezapisanych zmian (jak w każdej sekcji z jawnym
 * zapisem): własny wypełniony „Zapisz progi" był drugim wypełnionym przyciskiem
 * na ekranie, a przejście do innej sekcji po cichu gubiło wpisane liczby.
 */
const StagnationPanel = () => {
    const { showSuccess, showError } = useToast();
    const queryClient = useQueryClient();
    const inputs = useRef<Partial<Record<ThresholdKey, HTMLInputElement | null>>>({});

    const { data, isPending, isError, refetch } = useQuery({
        queryKey: LEAD_ALERT_CONFIG_QUERY_KEY,
        queryFn: leadsSettingsApi.getAlertConfig,
    });

    const [draft, setDraft] = useState<HoursDraft | null>(null);

    const save = useMutation({
        mutationFn: (config: LeadAlertConfig) => leadsSettingsApi.updateAlertConfig(config),
        onSuccess: (saved) => {
            queryClient.setQueryData(LEAD_ALERT_CONFIG_QUERY_KEY, saved);
            setDraft(null);
            showSuccess('Progi zapisane', 'Kolejka zapytań dzieli się już według nowych progów.');
        },
        onError: (error) => {
            if (toastedGlobally(error)) return;
            showError('Nie udało się zapisać progów', serverMessage(error) ?? 'Spróbuj ponownie. Wpisane liczby czekają w pasku zapisu.');
        },
    });

    const current: HoursDraft | null = draft ?? (data ? toDraft(data) : null);
    const invalid = current ? THRESHOLDS.filter(t => parseHours(current[t.key]) === null) : [];
    const changed = current && data
        ? THRESHOLDS.filter(t => current[t.key] !== asText(data[t.key])).length
        : 0;
    const dirty = changed > 0;

    const setField = (key: ThresholdKey, text: string) => {
        if (!current) return;
        setDraft({ ...current, [key]: sanitizeHours(text) });
    };

    const blurField = (key: ThresholdKey) => {
        if (!current || !data) return;
        const normalized = normalizeHours(current[key], data[key]);
        if (normalized !== current[key]) setDraft({ ...current, [key]: normalized });
    };

    const submit = () => {
        if (!current || invalid.length > 0) return;
        save.mutate({
            leadStagnantOurThresholdHours: parseHours(current.leadStagnantOurThresholdHours)!,
            leadStagnantClientThresholdHours: parseHours(current.leadStagnantClientThresholdHours)!,
        });
    };

    const showProblem = () => {
        const first = invalid[0];
        const el = first ? inputs.current[first.key] : null;
        el?.scrollIntoView({ block: 'center', behavior: 'smooth' });
        el?.focus();
    };

    return (
        <FlatPanel>
            <SectionTitle as="h3">Kiedy sprawa stygnie</SectionTitle>

            {isError && !data ? (
                <ThresholdRow>
                    <Notice
                        tone="danger"
                        role="alert"
                        title="Nie udało się wczytać progów"
                        action={<Button variant="ghost" size="sm" onClick={() => void refetch()}>Spróbuj ponownie</Button>}
                    />
                </ThresholdRow>
            ) : isPending || !current || !data ? (
                <Loading role="status">Wczytywanie progów…</Loading>
            ) : (
                THRESHOLDS.map(t => {
                    const id = `lead-threshold-${t.key}`;
                    const parsed = parseHours(current[t.key]);
                    const isInvalid = parsed === null;
                    return (
                        <ThresholdRow key={t.key}>
                            <ThresholdTexts>
                                <label htmlFor={id}>{t.label}</label>
                                <p id={`${id}-hint`}>
                                    {isInvalid
                                        ? `Od ${MIN_HOURS} do ${MAX_HOURS} godz.`
                                        : `czyli ${hoursInDays(parsed)}`}
                                </p>
                            </ThresholdTexts>
                            <HoursField $invalid={isInvalid}>
                                <input
                                    ref={el => { inputs.current[t.key] = el; }}
                                    id={id}
                                    type="text"
                                    inputMode="numeric"
                                    autoComplete="off"
                                    value={current[t.key]}
                                    disabled={save.isPending}
                                    aria-invalid={isInvalid || undefined}
                                    aria-describedby={`${id}-hint`}
                                    onChange={e => setField(t.key, e.target.value)}
                                    onBlur={() => blurField(t.key)}
                                />
                                <span>godz.</span>
                            </HoursField>
                        </ThresholdRow>
                    );
                })
            )}

            <UnsavedChangesBanner
                visible={dirty}
                changedCount={changed}
                problem={invalid.length > 0 ? 'Próg wymaga poprawy' : undefined}
                onShowProblem={showProblem}
                onSave={submit}
                onDiscard={() => setDraft(null)}
                isSaving={save.isPending}
            />
        </FlatPanel>
    );
};

export const LeadsSettingsSection = () => {
    const { showSuccess, showError } = useToast();
    const queryClient = useQueryClient();

    const { data: config, isPending, isError, refetch } = useQuery({
        queryKey: AUTO_LEAD_CONFIG_QUERY_KEY,
        queryFn: leadsSettingsApi.getAutoLeadConfig,
    });

    const updateMutation = useMutation({
        mutationFn: (enabled: boolean) => leadsSettingsApi.updateAutoLeadConfig(enabled),
        onSuccess: (data: AutoLeadConfig) => {
            queryClient.setQueryData(AUTO_LEAD_CONFIG_QUERY_KEY, data);
            showSuccess(
                data.enabled ? 'Automat włączony' : 'Automat wyłączony',
                data.enabled
                    ? 'Nowe zapytania z poczty same staną się leadami.'
                    : 'Leady powstają tylko po ręcznym oznaczeniu wiadomości.',
            );
        },
        onError: (error) => {
            if (!toastedGlobally(error)) {
                showError('Nie udało się zapisać ustawienia automatycznych leadów', serverMessage(error) ?? 'Spróbuj ponownie.');
            }
            queryClient.invalidateQueries({ queryKey: AUTO_LEAD_CONFIG_QUERY_KEY });
        },
    });

    const saving = updateMutation.isPending;
    const activeSince = formatMoment(config?.enabledAt ?? null);

    return (
        <Stack>
            <AutoCard>
                <SectionTitle as="h3">Automatyczne tworzenie leadów</SectionTitle>

                {isError && !config ? (
                    <Notice
                        tone="danger"
                        role="alert"
                        title="Nie udało się wczytać ustawienia automatu"
                        action={<Button variant="ghost" size="sm" onClick={() => void refetch()}>Spróbuj ponownie</Button>}
                    >
                        Przełącznik pojawi się po wczytaniu.
                    </Notice>
                ) : isPending && !config ? (
                    <Loading role="status">Wczytywanie ustawienia…</Loading>
                ) : (
                    <>
                        <SettingSwitchRow
                            label="Twórz leady z poczty"
                            hint="Zapytania o wycenę same trafią do Leadów. Reszta poczty zostaje nietknięta."
                            checked={config?.enabled}
                            disabled={saving}
                            onChange={next => updateMutation.mutate(next)}
                        />

                        {config?.enabled && activeSince && (
                            <ActiveSince>Działa od {activeSince}.</ActiveSince>
                        )}
                        <Details>
                            <summary>Jak to działa</summary>
                            <DetailsList>
                                <li>Czyta tylko pocztę, która przyjdzie po włączeniu.</li>
                                <li>Kolejne wiadomości z rozmowy trafiają do tego samego leada.</li>
                                <li>Gdy nie ma pewności, nic nie robi. Wiadomość oznaczysz ręcznie.</li>
                            </DetailsList>
                        </Details>
                    </>
                )}
            </AutoCard>

            {/* Progi stygnięcia stoją pod automatem, bo dotyczą tych samych leadów,
                tyle że po ich powstaniu: pierwszy ustawia, CO wpada do kolejki,
                drugi - kiedy kolejka zaczyna się dopominać. */}
            <StagnationPanel />
        </Stack>
    );
};
