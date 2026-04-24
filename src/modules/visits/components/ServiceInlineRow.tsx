// src/modules/visits/components/ServiceInlineRow.tsx
//
// A single "new service" row rendered inline inside the ServicesTable.
// Handles name autocomplete (catalog lookup) + price display.

import { useState, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import styled from 'styled-components';
import { useDebounce } from '@/common/hooks';
import { formatCurrency } from '@/common/utils';
import { servicesApi } from '@/modules/services/api/servicesApi';
import type { Service } from '@/modules/services/types';
import { st } from '@/modules/statistics/components/StatisticsTheme';

const BRAND = '#0ea5e9';
const BRAND_DARK = '#0284c7';
const BRAND_RING = '0 0 0 3px rgba(14, 165, 233, 0.14)';

/* ─── Types ───────────────────────────────────────────────────────────────── */

export interface NewRow {
    draftId: string;
    serviceId: string | null;
    serviceName: string;
    basePriceNet: number;   // in cents (grosz)
    vatRate: number;
    requireManualPrice: boolean;
}

/* ─── Styled components ───────────────────────────────────────────────────── */

const Cell = styled.td`
    padding: 8px 10px;
    vertical-align: middle;
`;

const NameWrap = styled.div`
    position: relative;
`;

const NameInput = styled.input`
    width: 100%;
    min-width: 180px;
    box-sizing: border-box;
    padding: 7px 10px;
    border: 1.5px solid ${st.border};
    border-radius: 9px;
    font-size: 13px;
    font-family: inherit;
    color: ${st.text};
    background: ${st.bgCard};
    outline: none;
    transition: border-color 180ms, box-shadow 180ms;

    &:focus {
        border-color: ${BRAND};
        box-shadow: ${BRAND_RING};
    }
    &::placeholder { color: ${st.textMuted}; }
`;

const Dropdown = styled.ul`
    position: absolute;
    top: calc(100% + 4px);
    left: 0;
    right: 0;
    min-width: 240px;
    margin: 0;
    padding: 0;
    list-style: none;
    background: ${st.bgCard};
    border: 1px solid ${st.border};
    border-radius: 10px;
    box-shadow: ${st.shadowLg};
    z-index: 300;
    overflow: hidden;
    max-height: 220px;
    overflow-y: auto;
`;

const DropItem = styled.li<{ $custom?: boolean }>`
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 9px 12px;
    font-size: 13px;
    cursor: pointer;
    border-bottom: 1px solid ${st.border};
    color: ${p => p.$custom ? BRAND_DARK : st.text};
    font-weight: ${p => p.$custom ? 600 : 400};
    background: transparent;
    transition: background 150ms;

    &:last-child { border-bottom: none; }
    &:hover { background: ${st.bg}; }
`;

const PriceHint = styled.span`
    font-size: 11px;
    color: ${st.textMuted};
    font-variant-numeric: tabular-nums;
    margin-left: 8px;
    flex-shrink: 0;
`;

const PriceCell = styled.span`
    font-size: 13px;
    font-variant-numeric: tabular-nums;
    color: ${st.text};
`;

const NetInput = styled.input`
    width: 80px;
    padding: 7px 8px;
    border: 1.5px solid ${st.border};
    border-radius: 9px;
    font-size: 13px;
    font-family: inherit;
    color: ${st.text};
    background: ${st.bgCard};
    outline: none;
    text-align: right;
    font-variant-numeric: tabular-nums;
    transition: border-color 180ms, box-shadow 180ms;

    &:focus {
        border-color: ${BRAND};
        box-shadow: ${BRAND_RING};
    }
    &:read-only { opacity: 0.55; cursor: default; }
`;

const RemoveBtn = styled.button`
    display: inline-flex;
    align-items: center;
    gap: 4px;
    padding: 4px 10px;
    border: 1px solid rgba(239, 68, 68, 0.28);
    border-radius: 9999px;
    background: rgba(239, 68, 68, 0.06);
    color: #ef4444;
    font-size: 11px;
    font-weight: 600;
    cursor: pointer;
    transition: background 150ms, border-color 150ms;
    white-space: nowrap;

    &:hover {
        background: rgba(239, 68, 68, 0.13);
        border-color: rgba(239, 68, 68, 0.5);
    }
    svg { width: 12px; height: 12px; }
`;

/* ─── Component ───────────────────────────────────────────────────────────── */

interface Props {
    row: NewRow;
    onUpdate: (partial: Partial<NewRow>) => void;
    onRemove: () => void;
    onAddCustom: (name: string) => void;
}

export const ServiceInlineRow = ({ row, onUpdate, onRemove, onAddCustom }: Props) => {
    const [query, setQuery] = useState(row.serviceName);
    const [open, setOpen] = useState(false);
    const debouncedQuery = useDebounce(query, 250);
    const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

    const { data } = useQuery({
        queryKey: ['svc-inline-search', debouncedQuery],
        queryFn: () => servicesApi.getServices({ search: debouncedQuery, page: 1, limit: 8, showInactive: false }),
        enabled: debouncedQuery.trim().length >= 1,
        staleTime: 30_000,
    });

    const suggestions: Service[] = data?.services ?? [];

    const handleQueryChange = (value: string) => {
        setQuery(value);
        onUpdate({ serviceName: value, serviceId: null, requireManualPrice: true });
        setOpen(true);
    };

    const handleSelect = (svc: Service) => {
        setQuery(svc.name);
        setOpen(false);
        onUpdate({
            serviceId: svc.id,
            serviceName: svc.name,
            basePriceNet: svc.basePriceNet,
            vatRate: Number(svc.vatRate),
            requireManualPrice: svc.requireManualPrice,
        });
    };

    const handleBlur = () => {
        closeTimer.current = setTimeout(() => setOpen(false), 160);
    };

    const handleMouseDown = () => {
        if (closeTimer.current) clearTimeout(closeTimer.current);
    };

    const grossPln = (row.basePriceNet / 100) * (1 + row.vatRate / 100);

    const handleNetChange = (raw: string) => {
        const val = parseFloat(raw.replace(',', '.'));
        if (!isNaN(val) && val >= 0) {
            onUpdate({ basePriceNet: Math.round(val * 100) });
        }
    };

    return (
        <tr style={{ background: 'rgba(14, 165, 233, 0.04)', borderBottom: `1px solid ${st.border}` }}>
            {/* Usługa */}
            <Cell>
                <NameWrap>
                    <NameInput
                        value={query}
                        onChange={e => handleQueryChange(e.target.value)}
                        onFocus={() => query.trim().length > 0 && setOpen(true)}
                        onBlur={handleBlur}
                        placeholder="Wyszukaj lub wpisz nazwę usługi…"
                        autoFocus
                    />
                    {open && (suggestions.length > 0 || query.trim()) && (
                        <Dropdown onMouseDown={handleMouseDown}>
                            {suggestions.map(svc => (
                                <DropItem key={svc.id} onClick={() => handleSelect(svc)}>
                                    <span>{svc.name}</span>
                                    {svc.basePriceNet > 0 && (
                                        <PriceHint>{formatCurrency(svc.basePriceNet / 100)}</PriceHint>
                                    )}
                                </DropItem>
                            ))}
                            {query.trim() && (
                                <DropItem
                                    $custom
                                    onClick={() => { setOpen(false); onAddCustom(query.trim()); }}
                                >
                                    + Dodaj „{query.trim()}" jako niestandardową
                                </DropItem>
                            )}
                        </Dropdown>
                    )}
                </NameWrap>
            </Cell>

            {/* Cena netto */}
            <Cell>
                <NetInput
                    type="text"
                    inputMode="decimal"
                    value={row.requireManualPrice && row.serviceId !== null ? '' : (row.basePriceNet / 100).toFixed(2)}
                    readOnly={!row.requireManualPrice && row.serviceId !== null}
                    placeholder="0.00"
                    onChange={e => handleNetChange(e.target.value)}
                />
            </Cell>

            {/* VAT */}
            <Cell>
                <PriceCell>{row.vatRate}%</PriceCell>
            </Cell>

            {/* Cena brutto */}
            <Cell>
                <PriceCell>{formatCurrency(grossPln)}</PriceCell>
            </Cell>

            {/* Akcje */}
            <Cell style={{ textAlign: 'right' }}>
                <RemoveBtn onClick={onRemove}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <line x1="18" y1="6" x2="6" y2="18" />
                        <line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                    Usuń
                </RemoveBtn>
            </Cell>
        </tr>
    );
};
