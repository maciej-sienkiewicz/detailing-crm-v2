// src/modules/visits/components/ServiceInlineRow.tsx
//
// A single "new service" row rendered inline inside the ServicesTable.
// Handles name autocomplete (catalog lookup) + bidirectional netto/brutto entry.

import { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { capitalizeFirst } from '@/common/utils/capitalizeFirst';
import { useQuery } from '@tanstack/react-query';
import styled from 'styled-components';
import { useDebounce } from '@/common/hooks';
import { formatCurrency } from '@/common/utils';
import { netPlnToGrossPln, grossPlnToNetPln } from '@/common/utils/priceAdjustment';
import type { AdjustmentType } from '@/common/utils/priceAdjustment';
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
    adjustment: { type: AdjustmentType; value: number };
}

/* ─── Styled components ───────────────────────────────────────────────────── */

const InlineRow = styled.tr`
    background: rgba(14, 165, 233, 0.04);
    border-bottom: 1px solid ${st.border};

    @media (max-width: 767px) {
        display: flex;
        flex-wrap: wrap;
        align-items: flex-start;
        gap: 0;
        padding: 14px 16px;

        td:nth-child(1) {
            flex: 0 0 100%;
            padding: 0 0 12px;
            border-bottom: 1px dashed ${st.border};
            margin-bottom: 12px;
        }

        td:nth-child(2) {
            flex: 0 0 100%;
            padding: 0 0 10px;
        }

        td:nth-child(3) {
            flex: 0 0 100%;
            padding: 0;
        }
    }
`;

const Cell = styled.td`
    padding: 8px 10px;
    vertical-align: middle;

    @media (max-width: 767px) { padding: 0; vertical-align: top; }
`;

const NameWrap = styled.div`
    position: relative;
`;

const NameInput = styled.input`
    width: 100%;
    min-width: 180px;
    box-sizing: border-box;

    @media (max-width: 767px) { min-width: 0; }
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
    position: fixed;
    min-width: min(240px, calc(100vw - 24px));
    max-width: calc(100vw - 24px);
    margin: 0;
    padding: 0;
    list-style: none;
    background: ${st.bgCard};
    border: 1px solid ${st.border};
    border-radius: 10px;
    box-shadow: ${st.shadowLg};
    z-index: 9999;
    overflow: hidden;
    max-height: min(220px, 40dvh);
    overflow-y: auto;
    overscroll-behavior: contain;
`;

const DropItem = styled.li<{ $custom?: boolean }>`
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 8px;
    padding: 9px 12px;
    font-size: 13px;
    cursor: pointer;
    border-bottom: 1px solid ${st.border};
    color: ${p => p.$custom ? BRAND_DARK : st.text};
    font-weight: ${p => p.$custom ? 600 : 400};
    background: transparent;
    transition: background 150ms;
    overflow-wrap: anywhere;

    &:last-child { border-bottom: none; }
    &:hover { background: ${st.bg}; }

    @media (hover: none) and (pointer: coarse) {
        /* Comfortable tap target — these are picked with a thumb. */
        padding: 12px;
        min-height: 46px;
    }
`;

const PriceHint = styled.span`
    font-size: 11px;
    color: ${st.textMuted};
    font-variant-numeric: tabular-nums;
    margin-left: 8px;
    flex-shrink: 0;
`;

const PriceGroup = styled.div`
    display: flex;
    align-items: flex-end;
    justify-content: flex-end;
    gap: 8px;
    flex-wrap: wrap;

    @media (max-width: 767px) {
        justify-content: flex-start;
        flex-wrap: nowrap;
    }
`;

const PriceField = styled.div`
    display: flex;
    flex-direction: column;
    gap: 3px;

    @media (max-width: 767px) {
        flex: 1;
        min-width: 0;
    }
`;

const PriceFieldLabel = styled.span`
    font-size: 9px;
    font-weight: 700;
    color: ${st.textMuted};
    text-transform: uppercase;
    letter-spacing: 0.06em;
`;

const VatCell = styled.span`
    font-size: 12px;
    font-variant-numeric: tabular-nums;
    color: ${st.textMuted};
    padding-bottom: 8px;
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

    @media (max-width: 767px) { width: 100%; }
`;

const ActionBtnBase = styled.button`
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

    svg { width: 12px; height: 12px; }

    @media (max-width: 767px) {
        flex: 1;
        justify-content: center;
        padding: 10px 14px;
        font-size: 13px;
        min-height: 40px;
    }
`;

const RemoveBtn = styled(ActionBtnBase)`
    &:hover {
        background: ${st.bg};
        border-color: ${st.borderHover};
        color: ${st.textSecondary};
    }
`;

const EditBtn = styled(ActionBtnBase)`
    &:hover {
        background: rgba(14,165,233,0.07);
        border-color: rgba(14,165,233,0.35);
        color: #0284c7;
    }
`;

const DiscountBtn = styled(ActionBtnBase)`
    &:hover {
        background: rgba(16,185,129,0.07);
        border-color: rgba(16,185,129,0.35);
        color: #059669;
    }
`;

const ActionBtns = styled.div`
    display: flex;
    gap: 6px;
    justify-content: flex-end;

    @media (max-width: 767px) {
        flex-direction: column;
        gap: 6px;
    }
`;

/* ─── Helpers ─────────────────────────────────────────────────────────────── */

function pln(cents: number): number { return cents / 100; }
function cents(pln: number): number { return Math.round(pln * 100); }
const grossFromNet = netPlnToGrossPln;
const netFromGross = grossPlnToNetPln;
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
    onEdit?: () => void;
    onDiscount?: () => void;
}

export const ServiceInlineRow = ({ row, onUpdate, onRemove, onAddCustom, onEdit, onDiscount }: Props) => {
    const [query, setQuery] = useState(row.serviceName);
    const [open, setOpen] = useState(false);
    const debouncedQuery = useDebounce(query, 250);
    const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
    const nameWrapRef = useRef<HTMLDivElement>(null);
    const nameInputRef = useRef<HTMLInputElement>(null);
    const [dropPos, setDropPos] = useState<{ top: number; left: number; width: number } | null>(null);

    // The draft row is appended at the bottom of a long table; on a phone the
    // autofocused field would otherwise open behind the keyboard.
    useEffect(() => {
        nameInputRef.current?.scrollIntoView({ block: 'center', behavior: 'smooth' });
    }, []);

    const updateDropPos = useCallback(() => {
        if (!nameWrapRef.current) return;
        const r = nameWrapRef.current.getBoundingClientRect();
        // Keep the panel inside the viewport even when the field sits near the
        // right edge (narrow phones, landscape with safe-area insets).
        const viewportWidth = window.visualViewport?.width ?? window.innerWidth;
        const width = Math.min(r.width, viewportWidth - 24);
        const left = Math.max(12, Math.min(r.left, viewportWidth - width - 12));
        setDropPos({ top: r.bottom + 4, left, width });
    }, []);

    useEffect(() => {
        if (!open) return;
        updateDropPos();
        window.addEventListener('scroll', updateDropPos, true);
        window.addEventListener('resize', updateDropPos);
        // The on-screen keyboard moves the visual viewport without ever firing a
        // window resize on iOS — without this the panel detaches from the field.
        window.visualViewport?.addEventListener('resize', updateDropPos);
        window.visualViewport?.addEventListener('scroll', updateDropPos);
        return () => {
            window.removeEventListener('scroll', updateDropPos, true);
            window.removeEventListener('resize', updateDropPos);
            window.visualViewport?.removeEventListener('resize', updateDropPos);
            window.visualViewport?.removeEventListener('scroll', updateDropPos);
        };
    }, [open, updateDropPos]);

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

    const hasDiscount = row.adjustment.value !== 0;

    return (
        <InlineRow>
            {/* Usługa */}
            <Cell>
                <NameWrap ref={nameWrapRef}>
                    <NameInput
                        ref={nameInputRef}
                        value={query}
                        onChange={e => handleQueryChange(capitalizeFirst(e.target.value))}
                        onFocus={() => query.trim().length > 0 && setOpen(true)}
                        onBlur={handleBlur}
                        placeholder="Wyszukaj lub wpisz nazwę usługi…"
                        autoFocus
                    />
                    {open && (suggestions.length > 0 || query.trim()) && dropPos && createPortal(
                        <Dropdown
                            style={{ top: dropPos.top, left: dropPos.left, width: dropPos.width }}
                            onMouseDown={handleMouseDown}
                        >
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
                        </Dropdown>,
                        document.body
                    )}
                </NameWrap>
            </Cell>

            {/* Cena — netto + brutto + VAT in one right-aligned group */}
            <Cell style={{ textAlign: 'right' }}>
                <PriceGroup>
                    <PriceField>
                        <PriceFieldLabel>Netto</PriceFieldLabel>
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
                    </PriceField>
                    <PriceField>
                        <PriceFieldLabel>Brutto</PriceFieldLabel>
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
                    </PriceField>
                    <VatCell>VAT {row.vatRate}%</VatCell>
                </PriceGroup>
            </Cell>

            {/* Akcje */}
            <Cell style={{ textAlign: 'right', verticalAlign: 'middle' }}>
                <ActionBtns>
                    {onEdit && (
                        <EditBtn onClick={onEdit} title="Edytuj pozycję">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                            </svg>
                            Edytuj
                        </EditBtn>
                    )}
                    {onDiscount && (
                        <DiscountBtn
                            onClick={onDiscount}
                            title={hasDiscount ? 'Edytuj rabat' : 'Dodaj rabat'}
                            style={hasDiscount ? { borderColor: 'rgba(16,185,129,0.4)', color: '#059669', background: 'rgba(16,185,129,0.07)' } : undefined}
                        >
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                                <circle cx="9" cy="9" r="2" />
                                <circle cx="15" cy="15" r="2" />
                                <line x1="6" y1="18" x2="18" y2="6" />
                            </svg>
                            {hasDiscount ? 'Rabat ✓' : 'Rabatuj'}
                        </DiscountBtn>
                    )}
                    <RemoveBtn onClick={onRemove} title="Usuń wiersz">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                            <line x1="18" y1="6" x2="6" y2="18" />
                            <line x1="6" y1="6" x2="18" y2="18" />
                        </svg>
                        Usuń
                    </RemoveBtn>
                </ActionBtns>
            </Cell>
        </InlineRow>
    );
};
