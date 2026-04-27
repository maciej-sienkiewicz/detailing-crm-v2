// src/modules/visits/components/ServiceInlineRow.tsx
//
// A single "new service" row rendered inline inside the ServicesTable.
// Handles name autocomplete (catalog lookup) + bidirectional netto/brutto entry.

import { useState, useRef, useEffect } from 'react';
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

const VatCell = styled.span`
    font-size: 13px;
    font-variant-numeric: tabular-nums;
    color: ${st.textMuted};
`;

const PriceInput = styled.input`
    width: 90px;
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
    &:read-only {
        opacity: 0.55;
        cursor: default;
        background: ${st.bg};
    }
`;

const RemoveBtn = styled.button`
    display: inline-flex;
    align-items: center;
    gap: 4px;
    padding: 4px 10px;
    border: 1px solid ${st.border};
    border-radius: 9999px;
    background: transparent;
    color: ${st.textMuted};
    font-size: 11px;
    font-weight: 600;
    cursor: pointer;
    transition: background 150ms, border-color 150ms, color 150ms;
    white-space: nowrap;

    &:hover {
        background: ${st.bg};
        border-color: ${st.borderHover};
        color: ${st.textSecondary};
    }
    svg { width: 12px; height: 12px; }
`;

/* ─── Helpers ─────────────────────────────────────────────────────────────── */

function pln(cents: number): number { return cents / 100; }
function cents(pln: number): number { return Math.round(pln * 100); }
function grossFromNet(netPln: number, vatRate: number): number { return netPln * (1 + vatRate / 100); }
function netFromGross(grossPln: number, vatRate: number): number { return grossPln / (1 + vatRate / 100); }
function fmtPrice(val: number): string { return val.toFixed(2); }
function parsePln(raw: string): number | null {
    const v = parseFloat(raw.replace(',', '.'));
    return isNaN(v) || v < 0 ? null : v;
}

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

    // Local display strings — typed freely, never re-derived from parent on
    // every keystroke. Parent basePriceNet is updated immediately on each valid
    // change so "Zaakceptuj" always sees the current value.
    const [netStr, setNetStr] = useState(() =>
        row.basePriceNet > 0 ? fmtPrice(pln(row.basePriceNet)) : ''
    );
    const [grossStr, setGrossStr] = useState(() =>
        row.basePriceNet > 0 ? fmtPrice(grossFromNet(pln(row.basePriceNet), row.vatRate)) : ''
    );

    // Sync display when basePriceNet is updated externally (catalog selection,
    // QuickServiceModal result coming in via parent→prop change).
    // selfUpdateRef prevents the effect from overwriting the field while the
    // user is actively typing (which would reset the cursor to the end).
    const lastSyncedPrice = useRef(row.basePriceNet);
    const selfUpdateRef = useRef(false);
    useEffect(() => {
        if (selfUpdateRef.current) {
            selfUpdateRef.current = false;
            lastSyncedPrice.current = row.basePriceNet;
            return;
        }
        if (lastSyncedPrice.current === row.basePriceNet) return;
        lastSyncedPrice.current = row.basePriceNet;
        if (row.basePriceNet > 0) {
            setNetStr(fmtPrice(pln(row.basePriceNet)));
            setGrossStr(fmtPrice(grossFromNet(pln(row.basePriceNet), row.vatRate)));
        } else {
            setNetStr('');
            setGrossStr('');
        }
    }, [row.basePriceNet, row.vatRate]);

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
        if (!svc.requireManualPrice) {
            const net = pln(svc.basePriceNet);
            setNetStr(fmtPrice(net));
            setGrossStr(fmtPrice(grossFromNet(net, Number(svc.vatRate))));
        } else {
            // Requires manual price — clear so the user must fill it in
            setNetStr('');
            setGrossStr('');
        }
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

    // ── Net input handlers ──────────────────────────────────────────────────

    const handleNetChange = (str: string) => {
        if (str && !/^[0-9]*[,.]?[0-9]{0,2}$/.test(str)) return;
        setNetStr(str);
        if (!str.trim()) {
            setGrossStr('');
            onUpdate({ basePriceNet: 0 });
            return;
        }
        const val = parsePln(str);
        if (val !== null) {
            setGrossStr(fmtPrice(grossFromNet(val, row.vatRate)));
            selfUpdateRef.current = true;
            onUpdate({ basePriceNet: cents(val) });
        }
    };

    const formatNet = () => {
        const val = parsePln(netStr);
        if (val !== null) setNetStr(fmtPrice(val));
    };

    // ── Gross input handlers ────────────────────────────────────────────────

    const handleGrossChange = (str: string) => {
        if (str && !/^[0-9]*[,.]?[0-9]{0,2}$/.test(str)) return;
        setGrossStr(str);
        if (!str.trim()) {
            setNetStr('');
            onUpdate({ basePriceNet: 0 });
            return;
        }
        const val = parsePln(str);
        if (val !== null) {
            const netVal = netFromGross(val, row.vatRate);
            setNetStr(fmtPrice(netVal));
            selfUpdateRef.current = true;
            onUpdate({ basePriceNet: cents(netVal) });
        }
    };

    const formatGross = () => {
        const val = parsePln(grossStr);
        if (val !== null) setGrossStr(fmtPrice(val));
    };

    // Price fields are editable unless it's a catalog service with a fixed price
    const priceReadOnly = row.serviceId !== null && !row.requireManualPrice;

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
                <PriceInput
                    type="text"
                    inputMode="decimal"
                    value={netStr}
                    readOnly={priceReadOnly}
                    placeholder="0.00"
                    onChange={e => handleNetChange(e.target.value)}
                    onBlur={formatNet}
                    onKeyDown={e => { if (e.key === 'Enter') e.currentTarget.blur(); }}
                />
            </Cell>

            {/* VAT */}
            <Cell>
                <VatCell>{row.vatRate}%</VatCell>
            </Cell>

            {/* Cena brutto */}
            <Cell>
                <PriceInput
                    type="text"
                    inputMode="decimal"
                    value={grossStr}
                    readOnly={priceReadOnly}
                    placeholder="0.00"
                    onChange={e => handleGrossChange(e.target.value)}
                    onBlur={formatGross}
                    onKeyDown={e => { if (e.key === 'Enter') e.currentTarget.blur(); }}
                />
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
