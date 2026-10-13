// src/modules/comms/components/LeadArchive.tsx
// „Zamknięte sprawy" - tryb kolumny listy w zakładce „Sprawy".
//
// Zadanie jest tu inne niż w kolejce: nie wykonuje się pracy, tylko szuka jednej
// konkretnej sprawy albo sprawdza, jak się skończyła. Dlatego bez przycisków akcji -
// wiersz prowadzi do odczytu - a status wraca jako odpowiedź „jak się skończyło",
// razem z powodem przegranej.
//
// Dawniej była to pięciokolumnowa tabela projektowana na całą szerokość strony. Odkąd
// archiwum stoi w wąskiej kolumnie listy (obok rozmowy), kolumny ściskały się w ~400 px,
// a progi układu patrzyły na szerokość OKNA, nie kolumny - na komputerze tabela się
// nie składała. Do tego miała własną wyszukiwarkę pod tą z nagłówka listy. Teraz wiersz
// ma ten sam kształt co otwarta sprawa (CaseList) i działa w każdej szerokości.
import styled from 'styled-components';
import { formatMoney } from './shared';
import { caseTitle } from '../inbox/caseModel';
import { ix } from '../inbox/tokens';
import { LEAD_STATUS_COLORS, LEAD_STATUS_LABELS, type Lead, type LeadStatus } from '../types';
import type { LeadBundle } from '../hooks/useLeads';

const Scroll = styled.div<{ $phone: boolean }>`
    flex: 1;
    min-height: 0;
    overflow-y: auto;
    overscroll-behavior: contain;
    padding: ${p => (p.$phone ? '0 0 16px' : '0 6px 12px')};
`;

/* Przełącznik segmentowy na całą szerokość - ten sam kształt co „Sprawy / Poczta / Wysłane"
   nad nim. Pigułki obok siebie nie mieściły się w wąskiej kolumnie: czwarta uciekała
   za krawędź albo zawijała się do drugiego rzędu. */
const Filters = styled.div<{ $phone: boolean }>`
    display: flex;
    gap: 2px;
    margin: ${p => (p.$phone ? '12px 20px 4px' : '10px 8px 4px')};
    padding: 3px;
    border-radius: 10px;
    background: ${ix.surfaceAlt};
`;

const Filter = styled.button<{ $active: boolean }>`
    /* Szerokość według napisu: „Nie przyszli" jest dłuższe niż „Wygrane", a w kolumnie
       ~300 px równe pola ucinały dłuższe etykiety. */
    flex: 1 1 auto;
    min-width: 0;
    padding: 6px 4px;
    border: none;
    border-radius: 8px;
    background: ${p => (p.$active ? '#fff' : 'transparent')};
    box-shadow: ${p => (p.$active ? '0 1px 2px rgba(15, 23, 42, 0.1)' : 'none')};
    color: ${p => (p.$active ? ix.ink : ix.text2)};
    font-family: inherit;
    font-size: 12px;
    font-weight: 600;
    cursor: pointer;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;

    &:hover { color: ${ix.ink}; }
    &:focus-visible { outline: 2px solid ${ix.accent}; outline-offset: -2px; }
`;

const Totals = styled.p<{ $phone: boolean }>`
    display: flex;
    flex-wrap: wrap;
    gap: 2px 14px;
    margin: 0;
    padding: ${p => (p.$phone ? '6px 20px 8px' : '6px 14px 8px')};
    font-size: 12.5px;
    color: ${ix.muted};
    font-variant-numeric: tabular-nums;

    strong { font-weight: 600; color: ${ix.inkSoft}; }
`;

const Row = styled.button<{ $phone: boolean; $active: boolean }>`
    display: flex;
    flex-direction: column;
    gap: ${p => (p.$phone ? 2 : 1)}px;
    width: 100%;
    padding: ${p => (p.$phone ? '14px 20px' : '9px 14px')};
    border: none;
    border-radius: ${p => (p.$phone ? 0 : 10)}px;
    background: ${p => (p.$active ? ix.surfaceAlt : 'transparent')};
    color: ${ix.ink};
    font-family: inherit;
    text-align: left;
    cursor: pointer;

    &:hover { background: ${p => (p.$active ? ix.surfaceAlt : ix.surfaceSoft)}; }
    &:focus-visible { outline: 2px solid ${ix.accent}; outline-offset: -2px; }

    .top { display: flex; align-items: center; gap: 10px; min-width: 0; }
    .name {
        flex: 1;
        min-width: 0;
        font-size: ${p => (p.$phone ? 16 : 14)}px;
        line-height: ${p => (p.$phone ? 22 : 20)}px;
        font-weight: 700;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
    }
    .value {
        flex: none;
        font-size: ${p => (p.$phone ? 14 : 13)}px;
        font-weight: 600;
        color: ${ix.inkSoft};
        font-variant-numeric: tabular-nums;
    }
    .sub {
        display: flex;
        gap: 10px;
        min-width: 0;
        padding-left: 18px;
        font-size: ${p => (p.$phone ? 14 : 13)}px;
        line-height: ${p => (p.$phone ? 20 : 18)}px;
        color: ${ix.text2};
    }
    .outcome {
        flex: 1;
        min-width: 0;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
    }
    .when { flex: none; color: ${ix.muted}; font-variant-numeric: tabular-nums; }
`;

const Dot = styled.span<{ $color: string }>`
    flex: none;
    width: 8px;
    height: 8px;
    border-radius: 999px;
    background: ${p => p.$color};
`;

const Note = styled.p<{ $phone: boolean }>`
    margin: ${p => (p.$phone ? '16px 20px' : '14px')};
    font-size: 13px;
    line-height: 1.5;
    color: ${ix.muted};
`;

const ARCHIVE_FILTERS: { value: LeadStatus | undefined; label: string }[] = [
    { value: undefined, label: 'Wszystkie' },
    { value: 'COMPLETED', label: 'Wygrane' },
    { value: 'LOST', label: 'Przegrane' },
    { value: 'NO_SHOW', label: 'Nie przyszli' },
];

/** „12 paź" - rok tylko wtedy, gdy sprawa jest z innego. */
function formatClosedAt(lead: Lead): string {
    const date = new Date(lead.closedAt ?? lead.createdAt);
    const sameYear = date.getFullYear() === new Date().getFullYear();
    return date.toLocaleDateString('pl-PL', {
        day: 'numeric',
        month: 'short',
        ...(sameYear ? {} : { year: 'numeric' }),
    });
}

/** „Przegrany: Za drogo" - wynik i powód jednym zdaniem. */
function outcome(lead: Lead): string {
    const label = LEAD_STATUS_LABELS[lead.status];
    return lead.lostReasonLabel ? `${label}: ${lead.lostReasonLabel}` : label;
}

interface LeadArchiveProps {
    bundle: LeadBundle;
    /** Fraza z wyszukiwarki w nagłówku listy - tylko do komunikatu „nic nie pasuje". */
    query: string;
    status: LeadStatus | undefined;
    onStatusChange: (status: LeadStatus | undefined) => void;
    onOpen: (leadId: string) => void;
    activeId?: string | null;
    phone: boolean;
}

export function LeadArchive({ bundle, query, status, onStatusChange, onOpen, activeId, phone }: LeadArchiveProps) {
    const won = bundle.items
        .filter((lead) => lead.status === 'COMPLETED')
        .reduce((sum, lead) => sum + lead.estimatedValue, 0);
    const lost = bundle.items
        .filter((lead) => lead.status === 'LOST' || lead.status === 'NO_SHOW')
        .reduce((sum, lead) => sum + lead.estimatedValue, 0);

    return (
        <Scroll $phone={phone}>
            <Filters $phone={phone} role="group" aria-label="Wynik sprawy">
                {ARCHIVE_FILTERS.map((filter) => (
                    <Filter
                        key={filter.label}
                        type="button"
                        $active={status === filter.value}
                        aria-pressed={status === filter.value}
                        onClick={() => onStatusChange(filter.value)}
                    >
                        {filter.label}
                    </Filter>
                ))}
            </Filters>

            {bundle.items.length > 0 && (
                <Totals $phone={phone}>
                    <span>Wygrane <strong>{formatMoney(won)}</strong></span>
                    <span>Przegrane <strong>{formatMoney(lost)}</strong></span>
                </Totals>
            )}

            {!bundle.isLoading && bundle.items.length === 0 && (
                <Note $phone={phone}>
                    {query ? 'Nic nie pasuje do tego wyszukiwania.' : 'Nie ma jeszcze zamkniętych spraw.'}
                </Note>
            )}

            {bundle.items.map((lead) => (
                <Row
                    key={lead.id}
                    type="button"
                    $phone={phone}
                    $active={lead.id === activeId}
                    aria-current={lead.id === activeId ? 'true' : undefined}
                    onClick={() => onOpen(lead.id)}
                >
                    <span className="top">
                        <Dot $color={LEAD_STATUS_COLORS[lead.status].fg} aria-hidden="true" />
                        <span className="name">{caseTitle(lead)}</span>
                        {lead.estimatedValue > 0 && <span className="value">{formatMoney(lead.estimatedValue)}</span>}
                    </span>
                    <span className="sub">
                        <span className="outcome">{outcome(lead)}</span>
                        <span className="when">{formatClosedAt(lead)}</span>
                    </span>
                </Row>
            ))}

            {bundle.truncated && (
                <Note $phone={phone}>
                    Widać 100 najnowszych spraw z każdej kategorii. Starsze znajdziesz wyszukiwarką
                    albo filtrem.
                </Note>
            )}
        </Scroll>
    );
}
