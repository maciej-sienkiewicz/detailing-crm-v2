// src/modules/comms/components/SimilarVisitsSection.tsx
//
// „Podobne zlecenia” w oknie leada: co już robiliśmy dla takiego auta i takiej roboty.
//
// Odpowiedź na „ile za oklejenie Panamery?” leży w bazie od lat, tylko dotąd nie dało
// się do niej dojść z poziomu leada — trzeba było pytać kogoś z pamięcią albo
// przeklikiwać historię wizyt ręcznie.
//
// Sekcja jest ZWINIĘTA, dopóki ktoś jej nie otworzy. Policzenie dopasowania kosztuje
// osadzenie zapytania i przesiew kandydatów przez model, a większość leadów nikt nigdy
// pod tym kątem nie otworzy. Stąd przycisk, a nie ładowanie razem z leadem.

import { useState } from 'react';
import styled, { keyframes } from 'styled-components';
import type { DefaultTheme } from 'styled-components';
import { Link } from 'react-router-dom';
import { ExternalLink, History, ThumbsDown, ThumbsUp } from 'lucide-react';
import { useRateSimilarVisit, useSimilarVisits } from '../hooks/useLeads';
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

const List = styled.ul`
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
    success: (t: DefaultTheme) => ({ bg: t.colors.successLight, fg: t.colors.success }),
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
 * Poza siatką, w rogu, który i tak jest pusty — dzięki temu ukryte kciuki nie
 * zostawiają po sobie białej dziury obok kwoty, a pokazanie ich nie przesuwa
 * ani jednego piksela treści.
 */
const Rate = styled.div`
    position: absolute;
    right: 8px;
    bottom: 6px;
    display: flex;
    gap: 2px;
    opacity: 0;
    transition: opacity ${p => p.theme.transitions.fast};

    li:hover &,
    &:focus-within { opacity: 1; }

    /* Bez kursora nie ma najechania — na dotyku ocena musi być dostępna od razu. */
    @media (hover: none) { opacity: 1; }
`;

const RateButton = styled.button<{ $active: boolean }>`
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 24px;
    height: 24px;
    padding: 0;
    border: none;
    border-radius: ${p => p.theme.radii.sm};
    background: ${({ $active }) => ($active ? 'rgba(14, 165, 233, 0.1)' : 'transparent')};
    color: ${({ $active, theme }) => ($active ? theme.colors.primary : theme.colors.textMuted)};
    cursor: pointer;

    &:hover { background: ${p => p.theme.colors.surfaceAlt}; color: ${p => p.theme.colors.primary}; }
    svg { width: 13px; height: 13px; }
`;

/**
 * Jak blisko trafiliśmy w pojazd. Podpis jest krótki, bo to przypis do wiersza,
 * a nie jego treść — ale bez niego „podobne” nic nie znaczy: co innego zlecenie
 * na dokładnie tym modelu, co innego na czymkolwiek z tej samej półki.
 */
const TIER_LABELS: Record<SimilarVisit['matchTier'], string> = {
    SAME_MODEL: 'ten sam model',
    SAME_BRAND: 'ta sama marka',
    SAME_CLASS: 'ta sama klasa auta',
    ANY: 'zbliżona robota',
};

const formatDate = (iso: string): string => {
    const date = new Date(iso);
    return Number.isNaN(date.getTime()) ? '' : date.toLocaleDateString('pl-PL');
};

interface SimilarVisitsSectionProps {
    leadId: string;
}

export function SimilarVisitsSection({ leadId }: SimilarVisitsSectionProps) {
    const [requested, setRequested] = useState(false);
    const { data, isFetching, isError } = useSimilarVisits(leadId, { enabled: requested });
    const rate = useRateSimilarVisit(leadId);

    if (!requested) {
        return (
            <IconButton type="button" style={{ alignSelf: 'flex-start' }} onClick={() => setRequested(true)}>
                <History size={14} /> Pokaż podobne zlecenia
            </IconButton>
        );
    }

    if (isFetching) return <Spinner />;

    if (isError) {
        return <Hint>Nie udało się dobrać podobnych zleceń. Spróbuj ponownie za chwilę.</Hint>;
    }

    const items = data?.items ?? [];

    if (items.length === 0) {
        // Dwie różne prawdy, dwa różne komunikaty: „nie mamy czego szukać” znaczy co
        // innego dla kogoś, kto właśnie zaczął używać CRM-a, niż „szukaliśmy i nie ma”.
        return (
            <Hint>
                {(data?.indexedVisits ?? 0) === 0
                    ? 'Historia zleceń jest jeszcze pusta — nie ma czego porównać.'
                    : 'Nie znaleźliśmy w historii zlecenia porównywalnego z tym zapytaniem.'}
            </Hint>
        );
    }

    return (
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
                            {/* Kciuk chowa się razem z resztą akcji, więc bez tej plakietki
                                potwierdzenie znikałoby z oczu i nie tłumaczyło, dlaczego
                                to zlecenie stoi na górze listy. */}
                            {item.feedback === 'RELEVANT' && <Chip $tone="success">potwierdzone</Chip>}
                        </Meta>
                    </div>
                    <Amount>
                        {formatGrosze(item.totalGross)}
                        <small>brutto</small>
                    </Amount>
                    <Rate>
                        <RateButton
                            type="button"
                            $active={item.feedback === 'RELEVANT'}
                            title="Trafne — trzymaj to zlecenie na górze listy"
                            aria-label="Trafne dopasowanie"
                            disabled={rate.isPending}
                            onClick={() => rate.mutate({ visitId: item.visitId, verdict: 'RELEVANT' })}
                        >
                            <ThumbsUp />
                        </RateButton>
                        <RateButton
                            type="button"
                            $active={false}
                            title="Nietrafne — nie pokazuj tego zlecenia przy tym leadzie"
                            aria-label="Nietrafne dopasowanie"
                            disabled={rate.isPending}
                            onClick={() => rate.mutate({ visitId: item.visitId, verdict: 'IRRELEVANT' })}
                        >
                            <ThumbsDown />
                        </RateButton>
                    </Rate>
                </Row>
            ))}
        </List>
    );
}
