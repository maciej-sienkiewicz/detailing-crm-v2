// src/modules/comms/components/SimilarVisitsSection.tsx
//
// „Podobne zlecenia" w oknie leada: co już robiliśmy dla takiego auta i takiej roboty.
//
// Odpowiedź na „ile za oklejenie Panamery?" leży w bazie od lat, tylko dotąd nie dało
// się do niej dojść z poziomu leada — trzeba było pytać kogoś z pamięcią albo
// przeklikiwać historię wizyt ręcznie.
//
// Sekcja jest ZWINIĘTA, dopóki ktoś jej nie otworzy. Policzenie dopasowania kosztuje
// osadzenie zapytania i przesiew kandydatów przez model, a większość leadów nikt nigdy
// pod tym kątem nie otworzy. Stąd przycisk, a nie ładowanie razem z leadem.

import { useState } from 'react';
import styled, { keyframes } from 'styled-components';
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
 * Wiersz zlecenia jako SIATKA ze stałą kolumną akcji — ta sama zasada co na osi czasu
 * leada: akcje doklejane do tekstu lądują w każdym wierszu gdzie indziej.
 */
const Row = styled.li`
    display: grid;
    /* Treść | kwota | oceny. Oceny mają WŁASNĄ kolumnę, nie własny wiersz: pełny
       wiersz siatki rezerwowałby pas pustki pod każdą pozycją także wtedy, gdy
       kciuki są niewidoczne — a lista trzech zleceń urosłaby o trzy takie pasy. */
    grid-template-columns: minmax(0, 1fr) auto auto;
    align-items: start;
    gap: 8px;
    padding: 9px 10px;
    border: 1px solid ${p => p.theme.colors.border};
    border-radius: ${p => p.theme.radii.md};
    background: ${p => p.theme.colors.surface};
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

const Meta = styled.div`
    margin-top: 3px;
    font-size: 11.5px;
    color: ${p => p.theme.colors.textMuted};
    font-variant-numeric: tabular-nums;
`;

const Amount = styled.div<{ $provisional: boolean }>`
    text-align: right;
    font-size: 13px;
    font-weight: ${p => p.theme.fontWeights.semibold};
    color: ${p => p.theme.colors.text};
    font-variant-numeric: tabular-nums;
    white-space: nowrap;

    /* Kwota zlecenia w toku jest wciąż ruchoma — bez tego znaku liczba udawałaby fakt. */
    span {
        display: block;
        margin-top: 1px;
        font-size: 10.5px;
        font-weight: ${p => p.theme.fontWeights.medium};
        color: ${p => (p.$provisional ? p.theme.colors.warning : 'transparent')};
    }
`;

const Rate = styled.div`
    display: flex;
    gap: 2px;
    opacity: 0;
    transition: opacity 120ms ease;

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

    &:hover { color: ${p => p.theme.colors.primary}; }
    svg { width: 13px; height: 13px; }
`;

/**
 * Jak blisko trafiliśmy w pojazd. Podpis jest krótki, bo to przypis do wiersza,
 * a nie jego treść — ale bez niego „podobne" nic nie znaczy: co innego zlecenie
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
        // Dwie różne prawdy, dwa różne komunikaty: „nie mamy czego szukać" znaczy co
        // innego dla kogoś, kto właśnie zaczął używać CRM-a, niż „szukaliśmy i nie ma".
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
                        <Services>{item.services.join(' · ') || 'Bez wykazanych usług'}</Services>
                        <Meta>{formatDate(item.date)} · {TIER_LABELS[item.matchTier]}</Meta>
                    </div>
                    <Amount $provisional={item.priceProvisional}>
                        {formatGrosze(item.totalGross)}
                        <span>w trakcie</span>
                    </Amount>
                    <Rate>
                        <RateButton
                            type="button"
                            $active={item.feedback === 'RELEVANT'}
                            title="Trafne dopasowanie"
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
