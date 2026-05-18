// src/modules/checkin/components/EditableServicesTable.tsx

import { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import styled from 'styled-components';
import { useQueryClient } from '@tanstack/react-query';
import { formatCurrency } from '@/common/utils';
import { Select, Input } from '@/common/components/Form';
import { ModalShell, ModalHeader, ModalTitleGroup, ModalTitle, ModalContent, ModalFooter, ModalCloseButton } from '@/common/components/ModalKit';
import { SharedButton } from '@/common/styles';
import { ServiceAutocomplete } from './ServiceAutocomplete';
import { QuickServiceModal } from '@/modules/calendar/components/QuickServiceModal';
import { applyAdjustment, distributeAdjustment } from '@/common/utils/priceAdjustment';
import type { ServiceLineItem, AdjustmentType } from '../types';
import type { Service } from '@/modules/services/types';

const TableContainer = styled.div`
    margin-top: 12px;
    background-color: ${props => props.theme.colors.surface};
    border-radius: ${props => props.theme.radii.lg};
    overflow: hidden;
    border: 1px solid ${props => props.theme.colors.border};

    @media (max-width: ${props => props.theme.breakpoints.md}) {
        border: none;
        background: transparent;
        margin-top: 8px;
    }
`;

const Table = styled.table`
    width: 100%;
    border-collapse: collapse;

    @media (max-width: ${props => props.theme.breakpoints.md}) {
        display: block;
    }
`;

const Thead = styled.thead`
    background: #f8fafc;
    border-bottom: 1.5px solid ${props => props.theme.colors.border};

    @media (max-width: ${props => props.theme.breakpoints.md}) {
        display: none;
    }
`;

const Th = styled.th`
    padding: 8px 14px;
    text-align: left;
    font-size: 11px;
    font-weight: 600;
    color: #64748b;
    text-transform: uppercase;
    letter-spacing: 0.6px;
    white-space: nowrap;

    @media (min-width: ${props => props.theme.breakpoints.md}) {
        &:nth-child(1) { width: auto; }
        &:nth-child(2) { width: 140px; }
        &:nth-child(3) { width: 200px; }
        &:nth-child(4) { width: 160px; }
        &:nth-child(5) { width: 48px; text-align: center; }
    }
`;

const Tbody = styled.tbody`
    @media (max-width: ${props => props.theme.breakpoints.md}) {
        display: block;
    }
`;

const Tr = styled.tr`
    border-bottom: 1px solid ${props => props.theme.colors.border};
    transition: background-color ${props => props.theme.transitions.fast};

    &:hover {
        background-color: ${props => props.theme.colors.surfaceHover};
    }

    &:last-child {
        border-bottom: none;
    }

    @media (max-width: ${props => props.theme.breakpoints.md}) {
        display: block;
        margin-bottom: ${props => props.theme.spacing.md};
        background: ${props => props.theme.colors.surface};
        border: 1px solid ${props => props.theme.colors.border};
        border-radius: ${props => props.theme.radii.lg};
        padding: ${props => props.theme.spacing.md};
    }
`;

const Td = styled.td<{ 'data-label'?: string }>`
    padding: 10px 14px;
    font-size: ${props => props.theme.fontSizes.sm};
    vertical-align: top;

    @media (max-width: ${props => props.theme.breakpoints.md}) {
        display: block;
        padding: ${props => props.theme.spacing.sm} 0;
        text-align: left !important;

        &:before {
            content: attr(data-label);
            font-weight: ${props => props.theme.fontWeights.semibold};
            text-transform: uppercase;
            font-size: ${props => props.theme.fontSizes.xs};
            color: ${props => props.theme.colors.textMuted};
            display: block;
            margin-bottom: ${props => props.theme.spacing.xs};
        }
    }
`;

// --- POPRAWIONE STYLE PODSUMOWANIA (Slim Row) ---

const TotalRow = styled.tr`
    background-color: ${props => props.theme.colors.surfaceAlt};
    border-top: 1px solid ${props => props.theme.colors.border};
    font-weight: ${props => props.theme.fontWeights.semibold};

    @media (max-width: ${props => props.theme.breakpoints.md}) {
        display: block;
        margin-top: ${props => props.theme.spacing.md};
        background: ${props => props.theme.colors.surface};
        border: 1px solid ${props => props.theme.colors.border};
        border-radius: ${props => props.theme.radii.lg};
        padding: ${props => props.theme.spacing.sm};
    }
`;

const TotalLabel = styled(Td)`
    font-size: ${props => props.theme.fontSizes.xs};
    color: ${props => props.theme.colors.textSecondary};
    text-transform: uppercase;
    letter-spacing: 0.6px;
    padding: 8px 14px;
    vertical-align: middle;

    @media (max-width: ${props => props.theme.breakpoints.md}) {
        display: block;
        padding: 0 0 ${props => props.theme.spacing.xs} 0;
    }
`;

const TotalValue = styled(Td)`
    padding: 8px 14px;
    vertical-align: middle;

    @media (max-width: ${props => props.theme.breakpoints.md}) {
        display: block;
        padding: 0;
    }
`;

const TotalsContent = styled.div`
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: ${props => props.theme.spacing.lg};
    width: 100%;

    @media (max-width: ${props => props.theme.breakpoints.md}) {
        flex-direction: column;
        align-items: stretch;
        gap: ${props => props.theme.spacing.sm};
    }
`;

const PriceGroup = styled.div`
    display: flex;
    align-items: baseline;
    gap: ${props => props.theme.spacing.lg};

    @media (max-width: ${props => props.theme.breakpoints.md}) {
        justify-content: space-between;
    }
`;

const TotalItem = styled.div`
    display: flex;
    align-items: baseline;
    gap: 5px;

    span:first-child {
        font-size: 11px;
        color: ${props => props.theme.colors.textMuted};
        text-transform: uppercase;
        letter-spacing: 0.4px;
    }

    span:last-child {
        font-size: ${props => props.theme.fontSizes.sm};
        color: ${props => props.theme.colors.text};
        font-weight: 700;
        font-feature-settings: 'tnum';
    }

    &.primary span:last-child {
        color: ${props => props.theme.colors.primary};
        font-size: ${props => props.theme.fontSizes.md};
    }
`;

const DiscountButton = styled.button`
    display: flex;
    align-items: center;
    gap: 5px;
    padding: 5px 12px;
    background: #fffbeb;
    color: #b45309;
    border: 1px solid #fcd34d;
    border-radius: ${props => props.theme.radii.md};
    font-size: 11px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    cursor: pointer;
    transition: all 0.15s ease;
    white-space: nowrap;

    svg {
        width: 12px;
        height: 12px;
        flex-shrink: 0;
    }

    &:hover:not(:disabled) {
        background: #fef3c7;
        border-color: #f59e0b;
    }

    &:disabled {
        opacity: 0.5;
        cursor: not-allowed;
    }

    @media (max-width: ${props => props.theme.breakpoints.md}) {
        width: 100%;
        justify-content: center;
    }
`;

// --- RESZTA STYLI BEZ ZMIAN ---

const ServiceName = styled.div`
    font-weight: ${props => props.theme.fontWeights.medium};
    color: ${props => props.theme.colors.text};
`;

const PriceCell = styled.div`
    display: flex;
    flex-direction: column;
    gap: 2px;
`;

const PriceLabel = styled.span`
    font-size: ${props => props.theme.fontSizes.xs};
    color: ${props => props.theme.colors.textMuted};
    text-transform: uppercase;
`;

const PriceValue = styled.div<{ $highlight?: boolean }>`
    font-size: ${props => props.theme.fontSizes.sm};
    font-weight: ${props => props.theme.fontWeights.semibold};
    color: ${props => props.$highlight ? props.theme.colors.primary : props.theme.colors.text};
    font-feature-settings: 'tnum';
`;

const PriceInput = styled(Input)`
    width: 100%;
    max-width: 150px;
    text-align: right;
`;

const DiscountCell = styled.div`
    display: flex;
    flex-direction: column;
    gap: 4px;
`;

const DiscountInputWrapper = styled.div`
    display: flex;
    align-items: center;
    background: white;
    border: 1px solid ${props => props.theme.colors.border};
    border-radius: ${props => props.theme.radii.md};
    width: 100%;
`;

const DiscountInput = styled.input`
    width: 100%;
    padding: 5px 6px;
    border: none;
    font-size: 13px;
    text-align: right;
    font-feature-settings: 'tnum';
    background: transparent;
    &:focus { outline: none; }
`;

const DiscountSuffix = styled.span`
    padding-right: 8px;
    font-size: 12px;
    color: ${props => props.theme.colors.textMuted};
`;

const DiscountTypeDropdownContainer = styled.div` position: relative; width: 100%; `;
const DiscountTypeTrigger = styled.button`
    width: 100%; display: flex; align-items: center; gap: 6px; padding: 5px 8px;
    border: 1px solid ${props => props.theme.colors.border}; border-radius: ${props => props.theme.radii.md};
    background: #f8fafc; cursor: pointer; font-size: 12px; color: #374151;
    &:hover { background: white; border-color: #cbd5e1; }
`;
const DiscountTypeMenu = styled.div<{ $top: number; $left: number; $width: number }>`
    position: fixed; top: ${p => p.$top}px; left: ${p => p.$left}px; width: ${p => p.$width}px;
    background: white; border: 1px solid ${props => props.theme.colors.border};
    border-radius: ${props => props.theme.radii.md}; z-index: 9999;
    box-shadow: 0 4px 12px rgba(0,0,0,0.12);
`;
const DiscountTypeMenuItem = styled.button<{ $selected?: boolean }>`
    width: 100%;
    padding: 6px 8px;
    border: none;
    text-align: left;
    cursor: pointer;
    font-size: 12px;
    color: #374151;
    background: ${props => props.$selected ? '#eff6ff' : 'transparent'};
    font-weight: ${props => props.$selected ? 600 : 400};
    &:hover { background: #f8fafc; }
`;

const NoteEditRow = styled.div`
    display: flex;
    align-items: center;
    gap: 4px;
    margin-top: 4px;
`;
const NoteInput = styled(Input)`
    flex: 1;
    min-width: 0;
    box-sizing: border-box;
    font-size: ${props => props.theme.fontSizes.sm};
`;
const NoteConfirmBtn = styled.button`
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    width: 26px;
    height: 26px;
    padding: 0;
    border: none;
    border-radius: 6px;
    background: #dcfce7;
    color: #16a34a;
    cursor: pointer;
    transition: background 150ms ease;
    &:hover { background: #bbf7d0; }
    svg { width: 14px; height: 14px; }
`;
const NoteDisplay = styled.div`
    margin-top: 4px; padding: 3px 6px; background: ${props => props.theme.colors.surfaceAlt};
    font-size: ${props => props.theme.fontSizes.sm}; cursor: pointer; border-radius: 4px;
    color: ${props => props.theme.colors.textMuted};
`;

const ActionButton = styled.button`
    display: flex;
    align-items: center;
    justify-content: center;
    margin: 0 auto;
    width: 28px;
    height: 28px;
    padding: 0;
    background: transparent;
    border: none;
    cursor: pointer;
    border-radius: 6px;
    color: ${props => props.theme.colors.textSecondary};
    transition: color 150ms ease, background 150ms ease;
    &:hover { color: ${props => props.theme.colors.error}; background: #fef2f2; }
    svg { width: 15px; height: 15px; flex-shrink: 0; }
`;

const CustomPriceLabel = styled.div`
    font-size: ${props => props.theme.fontSizes.xs}; font-weight: bold; padding: 4px 8px;
    background: #fef3c7; color: #f59e0b; border-radius: 4px;
`;

const ModalFieldLabel = styled.p`
    margin: 0 0 6px;
    font-size: 12px;
    font-weight: 600;
    color: #64748b;
    text-transform: uppercase;
    letter-spacing: 0.4px;
`;

const ModalTotalInfo = styled.p`
    margin: 10px 0 0;
    font-size: 13px;
    color: #64748b;
`;

const DISCOUNT_TYPE_OPTIONS = [
    { value: 'PERCENT', label: 'Procent (%)' },
    { value: 'FIXED_NET', label: 'Rabat netto' },
    { value: 'FIXED_GROSS', label: 'Rabat brutto' },
    { value: 'SET_NET', label: 'Ustaw netto' },
    { value: 'SET_GROSS', label: 'Ustaw brutto' },
] as const;

const DiscountTypeDropdown = ({ value, onChange }: { value: AdjustmentType, onChange: (v: AdjustmentType) => void }) => {
    const [open, setOpen] = useState(false);
    const [menuPos, setMenuPos] = useState({ top: 0, left: 0, width: 0 });
    const containerRef = useRef<HTMLDivElement>(null);
    const triggerRef = useRef<HTMLButtonElement>(null);
    const menuRef = useRef<HTMLDivElement>(null);

    const calcPos = useCallback(() => {
        if (!triggerRef.current) return;
        const r = triggerRef.current.getBoundingClientRect();
        setMenuPos({ top: r.bottom + 4, left: r.left, width: r.width });
    }, []);

    const handleOpen = () => { calcPos(); setOpen(o => !o); };

    useEffect(() => {
        if (!open) return;
        const onDocClick = (e: MouseEvent) => {
            const inContainer = containerRef.current?.contains(e.target as Node);
            const inMenu = menuRef.current?.contains(e.target as Node);
            if (!inContainer && !inMenu) setOpen(false);
        };
        const onScroll = () => calcPos();
        document.addEventListener('mousedown', onDocClick);
        window.addEventListener('scroll', onScroll, true);
        return () => {
            document.removeEventListener('mousedown', onDocClick);
            window.removeEventListener('scroll', onScroll, true);
        };
    }, [open, calcPos]);

    const selected = DISCOUNT_TYPE_OPTIONS.find(opt => opt.value === value);
    return (
        <DiscountTypeDropdownContainer ref={containerRef}>
            <DiscountTypeTrigger ref={triggerRef} type="button" onClick={handleOpen}>
                <span>{selected?.label || 'Wybierz typ'}</span>
                <span style={{ marginLeft: 'auto' }}>▼</span>
            </DiscountTypeTrigger>
            {open && createPortal(
                <DiscountTypeMenu ref={menuRef} $top={menuPos.top} $left={menuPos.left} $width={menuPos.width}>
                    {DISCOUNT_TYPE_OPTIONS.map(opt => (
                        <DiscountTypeMenuItem key={opt.value} $selected={opt.value === value} onClick={() => { onChange(opt.value); setOpen(false); }}>
                            {opt.label}
                        </DiscountTypeMenuItem>
                    ))}
                </DiscountTypeMenu>,
                document.body
            )}
        </DiscountTypeDropdownContainer>
    );
};

// --- KOMPONENT GŁÓWNY ---

export const EditableServicesTable = ({ services, onChange }: { services: ServiceLineItem[], onChange: (s: ServiceLineItem[]) => void }) => {
    const [editingPrices, setEditingPrices] = useState<Record<string, boolean>>({});
    const [editingNotes, setEditingNotes] = useState<Record<string, boolean>>({});
    const [isQuickServiceModalOpen, setIsQuickServiceModalOpen] = useState(false);
    const [quickServiceInitialName, setQuickServiceInitialName] = useState('');
    const [isDiscountModalOpen, setIsDiscountModalOpen] = useState(false);
    const [discountType, setDiscountType] = useState<AdjustmentType>('PERCENT');
    const [targetPrice, setTargetPrice] = useState('');
    const [discountInputValues, setDiscountInputValues] = useState<Record<string, string>>({});
    const [focusedDiscountFields, setFocusedDiscountFields] = useState<Record<string, boolean>>({});
    const queryClient = useQueryClient();

    const calculateServicePrice = (service: ServiceLineItem) => {
        const { basePriceNet, vatRate, adjustment } = service;
        const result = applyAdjustment(basePriceNet, vatRate, adjustment);
        return { finalPriceNet: result.finalNetCents, finalPriceGross: result.finalGrossCents, hasDiscount: result.hasDiscount };
    };

    const getLiveAdjustment = (service: ServiceLineItem) => {
        const raw = discountInputValues[service.id];
        if (raw === undefined) return service.adjustment;
        const val = parseFloat(raw);
        const storeVal = isNaN(val) ? 0 :
            service.adjustment.type !== 'PERCENT' ? Math.round(val * 100) : -Math.abs(val);
        return { ...service.adjustment, value: storeVal };
    };

    const calculateTotals = () => services.reduce((acc, s) => {
        const p = calculateServicePrice({ ...s, adjustment: getLiveAdjustment(s) });
        return { totalNet: acc.totalNet + p.finalPriceNet, totalGross: acc.totalGross + p.finalPriceGross };
    }, { totalNet: 0, totalGross: 0 });

    const openDiscountModal = () => { setIsDiscountModalOpen(true); setTargetPrice(''); };
    const closeDiscountModal = () => { setIsDiscountModalOpen(false); setTargetPrice(''); };

    const handleApplyDiscount = () => {
        const value = parseFloat(targetPrice);
        if (isNaN(value)) return;

        const valueInCents = discountType === 'PERCENT' ? value : Math.round(value * 100);
        const basePrices = services.map(s => ({ basePriceNetCents: s.basePriceNet, vatRate: s.vatRate }));
        const adjustments = distributeAdjustment(basePrices, discountType, valueInCents);
        onChange(services.map((s, i) => ({ ...s, adjustment: adjustments[i] })));
        closeDiscountModal();
    };

    const totals = calculateTotals();

    return (
        <>
            <ServiceAutocomplete onSelect={(s) => onChange([...services, {
                id: `${s.id}_${Date.now()}`, serviceId: s.id, serviceName: s.name, basePriceNet: s.basePriceNet, vatRate: s.vatRate,
                adjustment: { type: 'PERCENT', value: 0 }, note: '', requireManualPrice: s.requireManualPrice
            }])} onAddNew={(q) => { setQuickServiceInitialName(q); setIsQuickServiceModalOpen(true); }} />

            <TableContainer>
                <Table>
                    <Thead>
                        <tr>
                            <Th>Nazwa usługi</Th><Th>Cena bazowa</Th><Th>Rabat</Th><Th>Cena końcowa</Th><Th>Akcje</Th>
                        </tr>
                    </Thead>
                    <Tbody>
                        {services.map(service => {
                            const pricing = calculateServicePrice({ ...service, adjustment: getLiveAdjustment(service) });
                            return (
                                <Tr key={service.id}>
                                    <Td data-label="Nazwa usługi">
                                        <ServiceName>{service.serviceName}</ServiceName>
                                        {editingNotes[service.id] ? (
                                            <NoteEditRow>
                                                <NoteInput
                                                    autoFocus
                                                    value={service.note}
                                                    onChange={(e) => onChange(services.map(s => s.id === service.id ? { ...s, note: e.target.value } : s))}
                                                    onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); setEditingNotes({ ...editingNotes, [service.id]: false }); } }}
                                                    onBlur={() => setEditingNotes({ ...editingNotes, [service.id]: false })}
                                                />
                                                <NoteConfirmBtn
                                                    type="button"
                                                    aria-label="Zatwierdź notatkę"
                                                    onMouseDown={(e) => e.preventDefault()}
                                                    onClick={() => setEditingNotes({ ...editingNotes, [service.id]: false })}
                                                >
                                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                                        <polyline points="20 6 9 17 4 12" />
                                                    </svg>
                                                </NoteConfirmBtn>
                                            </NoteEditRow>
                                        ) : (
                                            <NoteDisplay onClick={() => setEditingNotes({ ...editingNotes, [service.id]: true })}>
                                                {service.note || 'Dodaj notatkę...'}
                                            </NoteDisplay>
                                        )}
                                    </Td>
                                    <Td data-label="Cena bazowa">
                                        {service.requireManualPrice ? <CustomPriceLabel>Cena niestandardowa</CustomPriceLabel> : (
                                            <PriceCell>
                                                <div><PriceLabel>Netto</PriceLabel> <PriceValue>{formatCurrency(service.basePriceNet / 100)}</PriceValue></div>
                                                <div><PriceLabel>Brutto</PriceLabel> <PriceValue>{formatCurrency((service.basePriceNet + Math.round(service.basePriceNet * service.vatRate / 100)) / 100)}</PriceValue></div>
                                            </PriceCell>
                                        )}
                                    </Td>
                                    <Td data-label="Rabat">
                                        <DiscountCell>
                                            <DiscountTypeDropdown value={service.adjustment.type} onChange={(t) => onChange(services.map(s => s.id === service.id ? { ...s, adjustment: { ...s.adjustment, type: t } } : s))} />
                                            <DiscountInputWrapper>
                                                <DiscountInput
                                                    value={
                                                        discountInputValues[service.id] !== undefined
                                                            ? discountInputValues[service.id]
                                                            : (service.adjustment.value === 0 ? '' :
                                                                service.adjustment.type !== 'PERCENT'
                                                                    ? service.adjustment.value / 100
                                                                    : Math.abs(service.adjustment.value))
                                                    }
                                                    onChange={(e) => setDiscountInputValues({ ...discountInputValues, [service.id]: e.target.value })}
                                                    onBlur={() => {
                                                        const rawStr = discountInputValues[service.id];
                                                        if (rawStr !== undefined) {
                                                            const val = parseFloat(rawStr);
                                                            const storeVal = isNaN(val) ? 0 :
                                                                service.adjustment.type !== 'PERCENT' ? Math.round(val * 100) : -Math.abs(val);
                                                            onChange(services.map(s => s.id === service.id ? { ...s, adjustment: { ...s.adjustment, value: storeVal } } : s));
                                                        }
                                                        setDiscountInputValues(prev => { const next = { ...prev }; delete next[service.id]; return next; });
                                                    }}
                                                />
                                                <DiscountSuffix>{service.adjustment.type === 'PERCENT' ? '%' : 'PLN'}</DiscountSuffix>
                                            </DiscountInputWrapper>
                                        </DiscountCell>
                                    </Td>
                                    <Td data-label="Cena końcowa">
                                        <PriceCell>
                                            <div><PriceLabel>Netto</PriceLabel> <PriceValue $highlight={pricing.hasDiscount}>{formatCurrency(pricing.finalPriceNet / 100)}</PriceValue></div>
                                            <div><PriceLabel>Brutto</PriceLabel> <PriceValue $highlight={pricing.hasDiscount}>{formatCurrency(pricing.finalPriceGross / 100)}</PriceValue></div>
                                        </PriceCell>
                                    </Td>
                                    <Td>
                                        <ActionButton onClick={() => onChange(services.filter(s => s.id !== service.id))}>
                                            <svg fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                        </ActionButton>
                                    </Td>
                                </Tr>
                            );
                        })}

                        <TotalRow>
                            <TotalLabel colSpan={2}>Podsumowanie</TotalLabel>
                            <TotalValue colSpan={2}>
                                <TotalsContent>
                                    <PriceGroup>
                                        <TotalItem>
                                            <span>Netto</span>
                                            <span>{formatCurrency(totals.totalNet / 100)}</span>
                                        </TotalItem>
                                        <TotalItem className="primary">
                                            <span>Brutto</span>
                                            <span>{formatCurrency(totals.totalGross / 100)}</span>
                                        </TotalItem>
                                    </PriceGroup>
                                    {services.length > 0 && (
                                        <DiscountButton onClick={openDiscountModal}>
                                            <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                                            </svg>
                                            Rabatuj
                                        </DiscountButton>
                                    )}
                                </TotalsContent>
                            </TotalValue>
                            <Td />
                        </TotalRow>
                    </Tbody>
                </Table>
            </TableContainer>

            <QuickServiceModal isOpen={isQuickServiceModalOpen} onClose={() => setIsQuickServiceModalOpen(false)} initialServiceName={quickServiceInitialName} onServiceCreate={(s) => {
                if (s.id) queryClient.invalidateQueries({ queryKey: ['services'] });
                onChange([...services, { id: `temp_${Date.now()}`, serviceId: s.id || null, serviceName: s.name, basePriceNet: s.basePriceNet, vatRate: s.vatRate, adjustment: { type: 'PERCENT', value: 0 }, note: '' }]);
            }} />

            <ModalShell isOpen={isDiscountModalOpen} onClose={closeDiscountModal} size="sm">
                <ModalHeader>
                    <ModalTitleGroup>
                        <ModalTitle>Rabat zbiorczy</ModalTitle>
                    </ModalTitleGroup>
                    <ModalCloseButton type="button" onClick={closeDiscountModal} aria-label="Zamknij">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                            <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                        </svg>
                    </ModalCloseButton>
                </ModalHeader>
                <ModalContent>
                    <div>
                        <ModalFieldLabel>Typ rabatu</ModalFieldLabel>
                        <DiscountTypeDropdown value={discountType} onChange={setDiscountType} />
                    </div>
                    <div>
                        <ModalFieldLabel>Wartość</ModalFieldLabel>
                        <Input
                            type="number"
                            value={targetPrice}
                            onChange={e => setTargetPrice(e.target.value)}
                            placeholder="0.00"
                            autoFocus
                            style={{ width: '100%', boxSizing: 'border-box' }}
                        />
                        <ModalTotalInfo>
                            Suma brutto: <strong>{formatCurrency(totals.totalGross / 100)}</strong>
                        </ModalTotalInfo>
                    </div>
                </ModalContent>
                <ModalFooter>
                    <SharedButton $variant="secondary" $size="sm" type="button" onClick={closeDiscountModal}>
                        Anuluj
                    </SharedButton>
                    <SharedButton $variant="primary" $size="sm" type="button" onClick={handleApplyDiscount}>
                        Zastosuj rabat
                    </SharedButton>
                </ModalFooter>
            </ModalShell>
        </>
    );
};