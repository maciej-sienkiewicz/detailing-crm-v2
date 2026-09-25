// src/modules/batch-orders/components/ContractorList.tsx
//
// Lista kontrahentów z tym, co każdy ma do rozliczenia w wybranym okresie.
// Odpowiada na pytanie, z którym wchodzi się na ten ekran raz w miesiącu:
// „komu ile jeszcze nie rozliczyłem". Dawniej trzeba było przewinąć stos kart,
// każdą z własnym filtrem, i zsumować w głowie.

import { useMemo, useState } from 'react';
import styled from 'styled-components';
import { Check, Plus, Search } from 'lucide-react';
import type { ContractorOverview } from '../types';
import { carsLabel, contractorsLabel, formatMoney } from '../utils/format';
import { formatInstantDay } from '../utils/period';

/**
 * Lista stoi na własnej, płaskiej powierzchni (biel + obwódka, bez cienia). Leżąca
 * wprost na tle aplikacji przepuszczała teksturę heksagonów pod tekst kwot i nazw.
 * Płaska, bo wyniesiona jest karta kontrahenta obok (CLAUDE.md §2).
 */
const Wrap = styled.div<{ $framed: boolean }>`
    display: flex;
    flex-direction: column;
    gap: 14px;
    min-height: 0;
    ${p => p.$framed && `
        padding: 16px 12px 12px;
        background: ${p.theme.colors.surface};
        border: 1px solid ${p.theme.colors.border};
        border-radius: 16px;
    `}
`;

const Totals = styled.div`
    display: flex;
    flex-direction: column;
    gap: 2px;
    padding: 0 6px 12px;
    border-bottom: 1px solid ${p => p.theme.colors.surfaceAlt};
`;

const TotalsLabel = styled.span`
    font-size: 13px;
    font-weight: 600;
    color: ${p => p.theme.colors.textSecondary};
`;

const TotalsValue = styled.span`
    font-size: 28px;
    line-height: 1.2;
    font-weight: 800;
    letter-spacing: -0.02em;
    color: ${p => p.theme.colors.text};
    font-variant-numeric: tabular-nums;
`;

const TotalsMeta = styled.span`
    font-size: 13px;
    color: #64748b;
`;

const SearchBox = styled.label`
    display: flex;
    align-items: center;
    gap: 10px;
    height: 42px;
    padding: 0 14px;
    background: ${p => p.theme.colors.surface};
    border: 1px solid ${p => p.theme.colors.border};
    border-radius: ${p => p.theme.radii.lg};
    color: #64748b;

    &:focus-within { border-color: #38bdf8; box-shadow: 0 0 0 3px rgba(14, 165, 233, 0.15); }
    svg { width: 16px; height: 16px; flex-shrink: 0; }

    input {
        flex: 1;
        min-width: 0;
        border: none;
        outline: none;
        background: transparent;
        font-family: inherit;
        /* 16px: mniejszy font każe iOS-owi przybliżać stronę przy wejściu w pole. */
        font-size: 16px;
        color: ${p => p.theme.colors.text};
        @media (min-width: 768px) { font-size: 14px; }
    }
`;

const Items = styled.div`
    display: flex;
    flex-direction: column;
    gap: 6px;
    overflow-y: auto;
    min-height: 0;
    /* Miejsce na cień zaznaczonej pozycji - inaczej obcina go przewijany kontener. */
    padding: 2px;
    margin: -2px;
`;

/**
 * Zaznaczona pozycja stoi na własnej powierzchni (biel + ramka marki), reszta leży
 * płasko na tle. Kwota po prawej, bo po nią się tu przychodzi - skanuje się ją
 * w pionie bez czytania nazw.
 */
const Item = styled.button<{ $selected: boolean }>`
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    width: 100%;
    box-sizing: border-box;
    padding: 12px 14px;
    text-align: left;
    font-family: inherit;
    border-radius: 14px;
    border: ${p => p.$selected ? '1.5px solid #7dd3fc' : '1.5px solid transparent'};
    background: ${p => p.$selected ? '#f0f9ff' : 'transparent'};
    cursor: pointer;
    transition: background ${p => p.theme.transitions.fast};
    -webkit-tap-highlight-color: transparent;

    &:hover { background: ${p => p.$selected ? '#f0f9ff' : p.theme.colors.surfaceHover}; }
`;

const ItemText = styled.span`
    display: flex;
    flex-direction: column;
    gap: 3px;
    min-width: 0;
`;

const ItemName = styled.span`
    font-size: 14px;
    font-weight: 600;
    color: ${p => p.theme.colors.text};
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
`;

const ItemMeta = styled.span`
    font-size: 12.5px;
    color: #64748b;
`;

const ItemAmount = styled.span`
    font-size: 14px;
    font-weight: 700;
    color: ${p => p.theme.colors.text};
    font-variant-numeric: tabular-nums;
    white-space: nowrap;
`;

const DonePill = styled.span`
    display: inline-flex;
    align-items: center;
    gap: 4px;
    padding: 3px 9px;
    border-radius: ${p => p.theme.radii.full};
    border: 1px solid #86efac;
    background: ${p => p.theme.colors.successLight};
    color: #15803d;
    font-size: 12px;
    font-weight: 600;
    white-space: nowrap;

    svg { width: 12px; height: 12px; }
`;

const NewBtn = styled.button`
    flex-shrink: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    height: 46px;
    border: 1.5px dashed #cbd5e1;
    border-radius: 14px;
    background: transparent;
    font-family: inherit;
    font-size: 14px;
    font-weight: 600;
    color: ${p => p.theme.colors.textSecondary};
    cursor: pointer;

    svg { width: 16px; height: 16px; }
    &:hover { border-color: #38bdf8; color: #075985; background: #f0f9ff; }
`;

const Empty = styled.p`
    margin: 0;
    padding: 16px 8px;
    text-align: center;
    font-size: 13px;
    color: #64748b;
`;

function itemMeta(o: ContractorOverview): string {
    if (o.openCount > 0) return `${carsLabel(o.openCount)} czeka na zestawienie`;
    if (o.settledCount > 0) {
        return o.lastSettledAt
            ? `${carsLabel(o.settledCount)} w zestawieniu z ${formatInstantDay(o.lastSettledAt).slice(0, 5)}`
            : `${carsLabel(o.settledCount)} w zestawieniu`;
    }
    return 'Brak aut w tym okresie';
}

interface Props {
    items: ContractorOverview[];
    selectedId: string | null;
    onSelect: (contractorId: string) => void;
    onCreate: () => void;
    /** Np. „we wrześniu 2026" - do podpisu sumy. */
    periodIn: string;
    /** Własna powierzchnia pod listą - w bocznej kolumnie tak, w oknie wyboru nie. */
    framed?: boolean;
}

export function ContractorList({ items, selectedId, onSelect, onCreate, periodIn, framed = false }: Props) {
    const [query, setQuery] = useState('');

    const visible = useMemo(() => {
        const q = query.trim().toLowerCase();
        if (!q) return items;
        // NIP bywa wpisany z kreskami albo bez - porównujemy same cyfry.
        const digits = q.replace(/\D/g, '');
        return items.filter(o =>
            o.contractor.name.toLowerCase().includes(q)
            || (digits.length > 0 && (o.contractor.taxId ?? '').replace(/\D/g, '').includes(digits)),
        );
    }, [items, query]);

    const totalOpenGross = items.reduce((sum, o) => sum + o.openGrossCents, 0);
    const withOpen = items.filter(o => o.openCount > 0).length;

    return (
        <Wrap $framed={framed}>
            <Totals>
                <TotalsLabel>Czeka na zestawienie {periodIn}</TotalsLabel>
                <TotalsValue>{formatMoney(totalOpenGross)}</TotalsValue>
                <TotalsMeta>
                    {withOpen > 0
                        ? `Brutto, u ${withOpen} z ${contractorsLabel(items.length)}`
                        : 'Wszystkie auta są już w zestawieniach'}
                </TotalsMeta>
            </Totals>

            {items.length > 5 && (
                <SearchBox>
                    <Search />
                    <input
                        aria-label="Szukaj kontrahenta"
                        placeholder="Szukaj kontrahenta lub NIP"
                        value={query}
                        onChange={e => setQuery(e.target.value)}
                    />
                </SearchBox>
            )}

            <Items>
                {visible.map(o => (
                    <Item
                        key={o.contractor.id}
                        type="button"
                        $selected={o.contractor.id === selectedId}
                        aria-current={o.contractor.id === selectedId ? 'true' : undefined}
                        onClick={() => onSelect(o.contractor.id)}
                    >
                        <ItemText>
                            <ItemName>{o.contractor.name}</ItemName>
                            <ItemMeta>{itemMeta(o)}</ItemMeta>
                        </ItemText>
                        {o.openCount > 0 ? (
                            <ItemAmount>{formatMoney(o.openGrossCents)}</ItemAmount>
                        ) : o.settledCount > 0 ? (
                            <DonePill><Check />Gotowe</DonePill>
                        ) : null}
                    </Item>
                ))}
                {visible.length === 0 && <Empty>Żaden kontrahent nie pasuje do „{query.trim()}".</Empty>}
            </Items>

            <NewBtn type="button" onClick={onCreate}>
                <Plus />Nowy kontrahent
            </NewBtn>
        </Wrap>
    );
}
