// src/modules/comms/components/LeadArchive.tsx
// Sprawy rozstrzygnięte - osobny tryb, nie trzeci filtr kolejki.
//
// Zadanie jest tu inne niż w kolejce: nie wykonuje się pracy, tylko szuka jednej
// konkretnej sprawy albo porównuje wyniki. Stąd trzy odwrócenia względem kolejki:
//
//  1. Wraca TABELA. W kolejce była nie do przeczytania na telefonie, ale tutaj
//     porównuje się rekordy między sobą, a do tego tabela jest właściwą formą.
//  2. Znikają przyciski akcji. Z leadem sprzed miesiąca nie ma co zrobić jednym
//     tapnięciem; wiersz prowadzi do odczytu.
//  3. Status WRACA jako kolumna „Wynik". To nie zaprzecza decyzji „status znika
//     z listy": w kolejce był zadaniem do wyklikania, tutaj jest odpowiedzią na
//     pytanie, jak się skończyło - razem z powodem przegranej, który jest osią
//     raportu strat.
import styled from 'styled-components';
import { Search } from 'lucide-react';
import { formatVehicle } from '../utils/leadFormat';
import { LEAD_STATUS_COLORS, LEAD_STATUS_LABELS, type Lead, type LeadStatus } from '../types';
import type { LeadBundle } from '../hooks/useLeads';
import { EmptyHint, FilterChip, formatGrosze } from './shared';

const Toolbar = styled.div`
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 8px;
`;

const SearchBox = styled.div`
    display: flex;
    align-items: center;
    gap: 8px;
    height: 48px;
    border: 1px solid ${p => p.theme.colors.border};
    border-radius: ${p => p.theme.radii.full};
    padding: 0 18px;
    color: ${p => p.theme.colors.textMuted};
    background: ${p => p.theme.colors.surface};
    flex: 1 1 260px;
    min-width: 0;
    transition: border-color ${p => p.theme.transitions.fast};

    &:focus-within { border-color: ${p => p.theme.colors.primary}; }

    svg { width: 17px; height: 17px; flex-shrink: 0; }

    input {
        border: none;
        outline: none;
        flex: 1;
        min-width: 0;
        font-size: 14px;
        background: transparent;
        color: ${p => p.theme.colors.text};
        font-family: inherit;
    }
`;

const Chips = styled.div`
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 8px;
`;

const Totals = styled.div`
    font-size: 13px;
    color: ${p => p.theme.colors.textSecondary};
    margin-left: auto;
    white-space: nowrap;

    strong {
        color: ${p => p.theme.colors.text};
        font-weight: ${p => p.theme.fontWeights.semibold};
        font-variant-numeric: tabular-nums;
    }

    @media (max-width: ${p => p.theme.breakpoints.md}) {
        margin-left: 0;
        white-space: normal;
    }
`;

const GRID = '1.6fr 1.5fr 0.8fr 1.5fr 0.9fr';

const HeadRow = styled.div`
    display: grid;
    grid-template-columns: ${GRID};
    gap: 14px;
    padding: 13px 24px;
    font-size: 11px;
    font-weight: ${p => p.theme.fontWeights.semibold};
    letter-spacing: 0.05em;
    text-transform: uppercase;
    color: ${p => p.theme.colors.textMuted};
    background: ${p => p.theme.colors.surfaceAlt};
    border-bottom: 1px solid ${p => p.theme.colors.border};

    /* Poniżej tabletu nagłówek kolumn nie ma czego opisywać - wiersz się składa. */
    @media (max-width: ${p => p.theme.breakpoints.lg}) {
        display: none;
    }
`;

const Row = styled.button`
    display: grid;
    grid-template-columns: ${GRID};
    gap: 14px;
    align-items: center;
    width: 100%;
    text-align: left;
    padding: 14px 24px;
    border: none;
    border-bottom: 1px solid ${p => p.theme.colors.surfaceAlt};
    background: ${p => p.theme.colors.surface};
    font-family: inherit;
    font-size: 13.5px;
    color: ${p => p.theme.colors.textSecondary};
    cursor: pointer;
    transition: background ${p => p.theme.transitions.fast};

    &:last-child { border-bottom: none; }
    &:hover { background: ${p => p.theme.colors.surfaceHover}; }

    /*
     * Na telefonie ten sam komplet faktów układa się w dwie linijki zamiast
     * pięciu kolumn. Tabela zostaje tabelą tam, gdzie jest na nią miejsce -
     * poziomy scroll nie wraca do modułu żadnymi drzwiami.
     */
    @media (max-width: ${p => p.theme.breakpoints.lg}) {
        grid-template-columns: 1fr auto;
        gap: 4px 12px;
        padding: 14px 16px;
    }
`;

const Cell = styled.span`
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
`;

const WhoCell = styled(Cell)`
    strong {
        display: block;
        color: ${p => p.theme.colors.text};
        font-weight: ${p => p.theme.fontWeights.semibold};
        overflow: hidden;
        text-overflow: ellipsis;
    }
    small {
        font-size: 12.5px;
        color: ${p => p.theme.colors.textMuted};
    }
`;

const MoneyCell = styled(Cell)`
    font-weight: ${p => p.theme.fontWeights.semibold};
    color: ${p => p.theme.colors.text};
    font-variant-numeric: tabular-nums;

    @media (max-width: ${p => p.theme.breakpoints.lg}) {
        text-align: right;
    }
`;

const OutcomeCell = styled.span`
    display: flex;
    align-items: center;
    gap: 7px;
    min-width: 0;

    span.reason {
        color: ${p => p.theme.colors.textMuted};
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
    }
`;

const Dot = styled.span<{ $color: string }>`
    width: 7px;
    height: 7px;
    border-radius: 50%;
    flex-shrink: 0;
    background: ${p => p.$color};
`;

const WhenCell = styled(Cell)`
    color: ${p => p.theme.colors.textMuted};

    @media (max-width: ${p => p.theme.breakpoints.lg}) {
        text-align: right;
        font-size: 12.5px;
    }
`;

const Truncated = styled.div`
    padding: 12px 24px;
    font-size: 12.5px;
    color: ${p => p.theme.colors.warning};
    background: ${p => p.theme.colors.warningLight};
    border-top: 1px solid ${p => p.theme.colors.border};
`;

const ARCHIVE_FILTERS: { value: LeadStatus | undefined; label: string }[] = [
    { value: undefined, label: 'Wszystkie' },
    { value: 'COMPLETED', label: 'Zrealizowane' },
    { value: 'LOST', label: 'Przegrane' },
    { value: 'NO_SHOW', label: 'Nie pojawili się' },
];

/** „4 września" - rok tylko wtedy, gdy sprawa jest z innego. */
function formatClosedAt(lead: Lead): string {
    const iso = lead.closedAt ?? lead.createdAt;
    const date = new Date(iso);
    const sameYear = date.getFullYear() === new Date().getFullYear();
    return date.toLocaleDateString('pl-PL', {
        day: 'numeric',
        month: 'long',
        ...(sameYear ? {} : { year: 'numeric' }),
    });
}

interface LeadArchiveProps {
    bundle: LeadBundle;
    query: string;
    onQueryChange: (query: string) => void;
    status: LeadStatus | undefined;
    onStatusChange: (status: LeadStatus | undefined) => void;
    onOpen: (leadId: string) => void;
}

export function LeadArchive({
    bundle,
    query,
    onQueryChange,
    status,
    onStatusChange,
    onOpen,
}: LeadArchiveProps) {
    const won = bundle.items
        .filter((lead) => lead.status === 'COMPLETED')
        .reduce((sum, lead) => sum + lead.estimatedValue, 0);
    const lost = bundle.items
        .filter((lead) => lead.status === 'LOST' || lead.status === 'NO_SHOW')
        .reduce((sum, lead) => sum + lead.estimatedValue, 0);

    return (
        <>
            <Toolbar>
                {/* Wyszukiwarka jest tu pierwszorzędna: archiwum się przeszukuje,
                    nie przegląda. Nikt nie przewija osiemdziesięciu pozycji. */}
                <SearchBox>
                    <Search />
                    <input
                        placeholder="Szukaj po nazwisku, adresie, telefonie…"
                        value={query}
                        onChange={(event) => onQueryChange(event.target.value)}
                    />
                </SearchBox>
            </Toolbar>

            <Chips>
                {ARCHIVE_FILTERS.map((filter) => (
                    <FilterChip
                        key={filter.label}
                        $active={status === filter.value}
                        onClick={() => onStatusChange(filter.value)}
                    >
                        {filter.label}
                    </FilterChip>
                ))}
                <Totals>
                    wygrane <strong>{formatGrosze(won)}</strong> · przegrane <strong>{formatGrosze(lost)}</strong>
                </Totals>
            </Chips>

            <div>
                <HeadRow>
                    <span>Pojazd i klient</span>
                    <span>Usługi</span>
                    <span>Wartość</span>
                    <span>Wynik</span>
                    <span>Zamknięte</span>
                </HeadRow>

                {!bundle.isLoading && bundle.items.length === 0 && (
                    <EmptyHint>
                        {query
                            ? 'Nic nie pasuje do tego wyszukiwania.'
                            : 'Nie ma jeszcze zamkniętych spraw.'}
                    </EmptyHint>
                )}

                {bundle.items.map((lead) => (
                    <Row key={lead.id} type="button" onClick={() => onOpen(lead.id)}>
                        <WhoCell>
                            <strong>{formatVehicle(lead) ?? lead.customerName ?? lead.contactIdentifier}</strong>
                            <small>{lead.customerName ?? lead.contactIdentifier}</small>
                        </WhoCell>
                        <Cell>{lead.tagLabels.length > 0 ? lead.tagLabels.join(', ') : '-'}</Cell>
                        <MoneyCell>
                            {lead.estimatedValue > 0 ? formatGrosze(lead.estimatedValue) : '-'}
                        </MoneyCell>
                        <OutcomeCell>
                            <Dot $color={LEAD_STATUS_COLORS[lead.status].fg} />
                            {LEAD_STATUS_LABELS[lead.status]}
                            {lead.lostReasonLabel && <span className="reason">· {lead.lostReasonLabel}</span>}
                        </OutcomeCell>
                        <WhenCell>{formatClosedAt(lead)}</WhenCell>
                    </Row>
                ))}

                {bundle.truncated && (
                    <Truncated>
                        Pokazujemy pierwsze 100 spraw w każdej kategorii. Zawęź wyszukiwaniem albo
                        filtrem wyniku, żeby zobaczyć starsze.
                    </Truncated>
                )}
            </div>
        </>
    );
}
