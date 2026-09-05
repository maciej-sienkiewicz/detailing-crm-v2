// src/modules/comms/components/SimilarVisitsSection.tsx
//
// „Podobne zlecenia” w oknie leada: co już robiliśmy dla takiego auta i takiej roboty.
//
// Odpowiedź na „ile za oklejenie Panamery?” leży w bazie od lat, tylko dotąd nie dało
// się do niej dojść z poziomu leada — trzeba było pytać kogoś z pamięcią albo
// przeklikiwać historię wizyt ręcznie.
//
// Dobór jest policzony w tle przy tworzeniu leada i ZAPISANY, więc sekcja ładuje
// się razem z leadem — otwarcie zastaje wynik gotowy. „Sprawdź ponownie" przelicza
// na wyraźne życzenie: gdy historia urosła albo do cennika doszła brakująca usługa.

import styled, { keyframes } from 'styled-components';
import type { DefaultTheme } from 'styled-components';
import { Link } from 'react-router-dom';
import { ExternalLink, RefreshCw, X } from 'lucide-react';
import { useDismissSimilarVisit, useRefreshSimilarVisits, useSimilarVisits } from '../hooks/useLeads';
import type { SimilarVisit } from '../types';
import { IconButton, formatGrosze } from './shared';

const spin = keyframes`from { transform: rotate(0deg); } to { transform: rotate(360deg); }`;

const Spinner = styled.div`
    width: 16px;
    height: 16px;
    border: 2px solid ${p => p.theme.colors.border};
    border-top-color: ${p => p.theme.colors.primary};
    border-radius: 50%;
    animation: ${spin} 700ms linear infinite;
    margin: 12px auto;
`;

const Hint = styled.div`
    font-size: 12px;
    line-height: 1.5;
    color: ${p => p.theme.colors.textMuted};
`;

const Stack = styled.div`
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 8px;

    .spin { animation: ${spin} 900ms linear infinite; }
`;

const List = styled.ul`
    align-self: stretch;
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 8px;
`;

/**
 * Wiersz zlecenia: treść po lewej, kwota po prawej. DWIE kolumny, nie trzy.
 *
 * Oceny nie dostają własnej kolumny ani własnego wiersza — jedno i drugie rezerwuje
 * pas pustki widoczny przez cały czas, a kciuki pokazują się na ułamek sekundy przy
 * najechaniu. Siedzą więc poza siatką, w prawym dolnym rogu, czyli w miejscu, które
 * i tak jest puste: kolumna kwoty ma dwie linie, kolumna treści trzy.
 */
const Row = styled.li`
    position: relative;
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto;
    align-items: start;
    gap: 4px 12px;
    /* Trzy linie treści plus oddech — gwarantuje, że kciuki mają gdzie wylądować
       także przy zleceniu bez wykazanych usług. */
    min-height: 66px;
    padding: 9px 10px;
    border: 1px solid ${p => p.theme.colors.border};
    border-radius: ${p => p.theme.radii.md};
    background: ${p => p.theme.colors.surface};
    transition: border-color ${p => p.theme.transitions.fast};

    &:hover { border-color: ${p => p.theme.colors.textMuted}; }
`;

const Vehicle = styled.div`
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 12.5px;
    font-weight: ${p => p.theme.fontWeights.semibold};
    color: ${p => p.theme.colors.text};

    a {
        display: inline-flex;
        color: ${p => p.theme.colors.textMuted};
        &:hover { color: ${p => p.theme.colors.primary}; }
        svg { width: 12px; height: 12px; }
    }
`;

const Services = styled.div`
    margin-top: 2px;
    font-size: 12px;
    line-height: 1.45;
    color: ${p => p.theme.colors.textSecondary};
    overflow-wrap: anywhere;
`;

/**
 * Data plus etykiety. Etykiety są plakietkami, a nie dopiskiem po separatorze:
 * „ta sama marka” to klasyfikacja wiersza, nie ciąg dalszy zdania o dacie.
 */
const Meta = styled.div`
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 6px;
    margin-top: 5px;
    font-size: 11.5px;
    color: ${p => p.theme.colors.textMuted};
    font-variant-numeric: tabular-nums;
`;

const CHIP_TONES = {
    neutral: (t: DefaultTheme) => ({ bg: t.colors.surfaceAlt, fg: t.colors.textSecondary }),
    warning: (t: DefaultTheme) => ({ bg: t.colors.warningLight, fg: t.colors.warning }),
} as const;

const Chip = styled.span<{ $tone?: keyof typeof CHIP_TONES }>`
    padding: 1px 7px;
    border-radius: ${p => p.theme.radii.full};
    font-size: 10.5px;
    font-weight: ${p => p.theme.fontWeights.medium};
    line-height: 1.6;
    white-space: nowrap;
    background: ${p => CHIP_TONES[p.$tone ?? 'neutral'](p.theme).bg};
    color: ${p => CHIP_TONES[p.$tone ?? 'neutral'](p.theme).fg};
`;

const Amount = styled.div`
    text-align: right;
    font-size: 13px;
    font-weight: ${p => p.theme.fontWeights.semibold};
    color: ${p => p.theme.colors.text};
    font-variant-numeric: tabular-nums;
    white-space: nowrap;

    /* „brutto” szeptem: handlowiec czyta liczbę, a przypis ma tylko rozstrzygać
       wątpliwość, gdyby ją miał — nie konkurować z kwotą o uwagę. */
    small {
        display: block;
        margin-top: 1px;
        font-size: 10px;
        font-weight: ${p => p.theme.fontWeights.normal};
        letter-spacing: 0.02em;
        color: ${p => p.theme.colors.textMuted};
    }
`;

/**
 * „X" w rogu, który i tak jest pusty — kolumna kwoty ma dwie linie, kolumna treści
 * trzy. Poza siatką, więc ukryty przycisk nie zostawia po sobie białej dziury obok
 * kwoty, a pokazanie go nie przesuwa ani jednego piksela treści.
 *
 * Prawy GÓRNY róg byłby wygodniejszy do trafienia, ale tam stoi kwota — czyli
 * dokładnie to, po co handlowiec tu przyszedł. Przycisk usuwania nie ma prawa
 * zasłaniać liczby, na której ktoś oprze wycenę.
 */
const Dismiss = styled.button`
    position: absolute;
    right: 6px;
    bottom: 5px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 24px;
    height: 24px;
    padding: 0;
    border: none;
    border-radius: ${p => p.theme.radii.sm};
    background: transparent;
    color: ${p => p.theme.colors.textMuted};
    cursor: pointer;
    opacity: 0;
    transition: opacity ${p => p.theme.transitions.fast}, color ${p => p.theme.transitions.fast};

    li:hover &,
    &:focus-visible { opacity: 1; }

    &:hover {
        background: ${p => p.theme.colors.errorLight};
        color: ${p => p.theme.colors.error};
    }

    &:disabled { cursor: default; }

    /* Bez kursora nie ma najechania — na dotyku przycisk musi być dostępny od razu. */
    @media (hover: none) { opacity: 1; }

    svg { width: 14px; height: 14px; }
`;

/**
 * Ranga dopasowania: auto × usługa. Podpis jest krótki, bo to przypis do wiersza —
 * ale bez niego „podobne” nic nie znaczy: co innego ta sama robota na dokładnie
 * tym modelu, co innego inna robota, którą łączy tylko auto.
 */
const TIER_LABELS: Record<SimilarVisit['matchTier'], string> = {
    SAME_MODEL_SAME_SERVICE: 'ten sam model, ta sama usługa',
    SAME_SEGMENT_SAME_SERVICE: 'ta sama klasa auta, ta sama usługa',
    SAME_MODEL_SIMILAR_SERVICE: 'ten sam model, podobna usługa',
    SAME_SEGMENT_SIMILAR_SERVICE: 'ta sama klasa auta, podobna usługa',
    SAME_MODEL_OTHER_SERVICE: 'ten sam model, inna robota',
    MODEL_HISTORY: 'historia tego modelu',
};

const formatDate = (iso: string): string => {
    const date = new Date(iso);
    return Number.isNaN(date.getTime()) ? '' : date.toLocaleDateString('pl-PL');
};

interface SimilarVisitsSectionProps {
    leadId: string;
}

export function SimilarVisitsSection({ leadId }: SimilarVisitsSectionProps) {
    const { data, isLoading, isError } = useSimilarVisits(leadId);
    const dismiss = useDismissSimilarVisit(leadId);
    const refresh = useRefreshSimilarVisits(leadId);

    if (isLoading) return <Spinner />;

    if (isError) {
        return <Hint>Nie udało się wczytać podobnych zleceń. Spróbuj ponownie za chwilę.</Hint>;
    }

    const items = data?.items ?? [];

    // „Sprawdź ponownie" stoi POD wynikiem i przy komunikatach pustki: to wyjście
    // awaryjne na świat, który się zmienił (nowe zlecenia, poprawiony cennik,
    // uzupełnione auto), a nie główna akcja sekcji.
    const refreshAction = (
        <IconButton
            type="button"
            style={{ alignSelf: 'flex-start' }}
            disabled={refresh.isPending}
            onClick={() => refresh.mutate()}
        >
            <RefreshCw size={13} className={refresh.isPending ? 'spin' : undefined} />
            {refresh.isPending ? 'Przeliczam…' : 'Sprawdź ponownie'}
        </IconButton>
    );

    if (items.length === 0) {
        // Każda pustka mówi co innego — i każda musi powiedzieć to wprost. Zwłaszcza
        // robota spoza cennika: tu pustka jest DECYZJĄ (nie podpowiadamy cen innych
        // usług), a bez wyjaśnienia wyglądałaby jak niedziałająca funkcja.
        const hint =
            data?.emptyReason === 'SERVICE_NOT_IN_CATALOG'
                ? 'Klient pyta o usługę spoza Waszego cennika — nie podpowiadamy cen na podstawie innych zleceń.'
                : data?.emptyReason === 'VEHICLE_UNKNOWN'
                    ? 'Nie znamy auta z tego leada — uzupełnij markę i model, a dobierzemy zlecenia z historii.'
                    : (data?.indexedVisits ?? 0) === 0
                        ? 'Historia zleceń jest jeszcze pusta — nie ma czego porównać.'
                        : 'Nie znaleźliśmy w historii zlecenia porównywalnego z tym zapytaniem.';
        return (
            <Stack>
                <Hint>{hint}</Hint>
                {refreshAction}
            </Stack>
        );
    }

    return (
        <Stack>
        <List>
            {items.map((item) => (
                <Row key={item.visitId}>
                    <div>
                        <Vehicle>
                            {item.vehicle}
                            <Link
                                to={`/visits/${item.visitId}`}
                                title={`Otwórz zlecenie ${item.visitNumber}`}
                                aria-label={`Otwórz zlecenie ${item.visitNumber}`}
                            >
                                <ExternalLink />
                            </Link>
                        </Vehicle>
                        <Services>{item.services.join(', ') || 'Bez wykazanych usług'}</Services>
                        <Meta>
                            {formatDate(item.date)}
                            <Chip>{TIER_LABELS[item.matchTier]}</Chip>
                            {/* Zlecenie w toku wciąż dobiera usługi do wydania auta —
                                bez tego znaku kwota obok udawałaby fakt. */}
                            {item.priceProvisional && <Chip $tone="warning">w trakcie</Chip>}
                        </Meta>
                    </div>
                    <Amount>
                        {formatGrosze(item.totalGross)}
                        <small>brutto</small>
                    </Amount>
                    <Dismiss
                        type="button"
                        title="Usuń tę podpowiedź z tego leada"
                        aria-label={`Usuń podpowiedź: ${item.vehicle}`}
                        disabled={dismiss.isPending}
                        onClick={() => dismiss.mutate(item.visitId)}
                    >
                        <X />
                    </Dismiss>
                </Row>
            ))}
        </List>
        {refreshAction}
        </Stack>
    );
}
