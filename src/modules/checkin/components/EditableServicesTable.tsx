// src/modules/checkin/components/EditableServicesTable.tsx

import { useState, useRef, useEffect } from 'react';
import styled from 'styled-components';
import { useQueryClient } from '@tanstack/react-query';
import { formatCurrency } from '@/common/utils';
import { Select, Input } from '@/common/components/Form';
import { ServiceAutocomplete } from './ServiceAutocomplete';
import { QuickServiceModal } from '@/modules/calendar/components/QuickServiceModal';
import type { ServiceLineItem, AdjustmentType } from '../types';
import type { Service } from '@/modules/services/types';

const TableContainer = styled.div`
    background-color: ${props => props.theme.colors.surface};
    border-radius: ${props => props.theme.radii.lg};
    overflow: hidden;
    border: 1px solid ${props => props.theme.colors.border};

    @media (max-width: ${props => props.theme.breakpoints.md}) {
        border: none;
        background: transparent;
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
    background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
    color: white;

    @media (max-width: ${props => props.theme.breakpoints.md}) {
        display: none;
    }
`;

const Th = styled.th`
    padding: ${props => props.theme.spacing.md};
    text-align: left;
    font-size: ${props => props.theme.fontSizes.sm};
    font-weight: ${props => props.theme.fontWeights.semibold};
    text-transform: uppercase;
    letter-spacing: 0.5px;
    white-space: nowrap;

    @media (min-width: ${props => props.theme.breakpoints.md}) {
        padding: ${props => props.theme.spacing.lg};
        font-size: ${props => props.theme.fontSizes.xs};

        &:nth-child(1) { width: auto; }
        &:nth-child(2) { width: 160px; }
        &:nth-child(3) { width: 220px; }
        &:nth-child(4) { width: 180px; }
        &:nth-child(5) { width: 80px; text-align: center; }
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
    padding: ${props => props.theme.spacing.md};
    font-size: ${props => props.theme.fontSizes.sm};

    @media (min-width: ${props => props.theme.breakpoints.md}) {
        padding: ${props => props.theme.spacing.lg};
    }

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
    letter-spacing: 1px;
    padding: ${props => props.theme.spacing.sm} ${props => props.theme.spacing.lg};

    @media (max-width: ${props => props.theme.breakpoints.md}) {
        display: block;
        padding: 0 0 ${props => props.theme.spacing.xs} 0;
    }
`;

const TotalValue = styled(Td)`
    padding: ${props => props.theme.spacing.sm} ${props => props.theme.spacing.lg};

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
    gap: 6px;

    span:first-child {
        font-size: ${props => props.theme.fontSizes.xs};
        color: ${props => props.theme.colors.textMuted};
        text-transform: uppercase;
    }

    span:last-child {
        font-size: ${props => props.theme.fontSizes.md};
        color: ${props => props.theme.colors.text};
        font-weight: 700;
        font-feature-settings: 'tnum';
    }

    &.primary span:last-child {
        color: ${props => props.theme.colors.primary};
        font-size: ${props => props.theme.fontSizes.lg};
    }
`;

const DiscountButton = styled.button`
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 6px 14px;
    background: #f59e0b; /* Zachowany kolor bazowy */
    color: white;
    border: none;
    border-radius: ${props => props.theme.radii.md};
    font-size: ${props => props.theme.fontSizes.xs};
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    cursor: pointer;
    transition: all 0.2s ease;

    svg {
        width: 14px;
        height: 14px;
    }

    &:hover:not(:disabled) {
        background: #d97706;
        transform: translateY(-1px);
        box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
    }

    &:active:not(:disabled) {
        transform: translateY(0);
    }

    &:disabled {
        opacity: 0.5;
        cursor: not-allowed;
    }

    @media (max-width: ${props => props.theme.breakpoints.md}) {
        width: 100%;
        justify-content: center;
        padding: ${props => props.theme.spacing.sm};
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
    gap: 4px;
`;

const PriceLabel = styled.span`
    font-size: ${props => props.theme.fontSizes.xs};
    color: ${props => props.theme.colors.textMuted};
    text-transform: uppercase;
`;

const PriceValue = styled.div<{ $highlight?: boolean }>`
    font-size: ${props => props.theme.fontSizes.md};
    font-weight: ${props => props.theme.fontWeights.semibold};
    color: ${props => props.$highlight ? props.theme.colors.primary : props.theme.colors.text};
`;

const PriceInput = styled(Input)`
    width: 100%;
    max-width: 150px;
    text-align: right;
`;

const DiscountCell = styled.div`
    display: flex;
    flex-direction: column;
    gap: ${props => props.theme.spacing.sm};
`;

const DiscountInputWrapper = styled.div`
    display: flex;
    align-items: center;
    background: white;
    border: 2px solid ${props => props.theme.colors.border};
    border-radius: ${props => props.theme.radii.md};
    width: 100%;
`;

const DiscountInput = styled.input`
    width: 100%;
    padding: ${props => props.theme.spacing.sm};
    border: none;
    text-align: right;
    font-feature-settings: 'tnum';
    &:focus { outline: none; }
`;

const DiscountSuffix = styled.span`
    padding-right: ${props => props.theme.spacing.md};
    font-size: ${props => props.theme.fontSizes.sm};
    color: ${props => props.theme.colors.textMuted};
`;

const DiscountTypeDropdownContainer = styled.div` position: relative; width: 100%; `;
const DiscountTypeTrigger = styled.button`
    width: 100%; display: flex; align-items: center; gap: 8px; padding: 8px;
    border: 2px solid ${props => props.theme.colors.border}; border-radius: ${props => props.theme.radii.md};
    background: white; cursor: pointer; font-size: ${props => props.theme.fontSizes.sm};
`;
const DiscountTypeMenu = styled.div`
    position: absolute; top: 100%; left: 0; right: 0; background: white;
    border: 1px solid ${props => props.theme.colors.border}; z-index: 2001;
`;
const DiscountTypeMenuItem = styled.button<{ $selected?: boolean }>`
    width: 100%; padding: 10px; border: none; text-align: left; cursor: pointer;
    background: ${props => props.$selected ? props.theme.colors.surfaceAlt : 'transparent'};
`;

const NoteInput = styled(Input)` font-size: ${props => props.theme.fontSizes.sm}; `;
const NoteDisplay = styled.div`
    margin-top: 4px; padding: 4px 8px; background: ${props => props.theme.colors.surfaceAlt};
    font-size: ${props => props.theme.fontSizes.sm}; cursor: pointer; border-radius: 4px;
`;

const ActionButton = styled.button`
    padding: 8px; background: transparent; border: none; cursor: pointer;
    color: ${props => props.theme.colors.textSecondary}; &:hover { color: ${props => props.theme.colors.error}; }
    svg { width: 20px; height: 20px; }
`;

const CustomPriceLabel = styled.div`
    font-size: ${props => props.theme.fontSizes.xs}; font-weight: bold; padding: 4px 8px;
    background: #fef3c7; color: #f59e0b; border-radius: 4px;
`;

// --- MODAL STYLES (ZGODNIE Z PROŚBĄ BEZ ZMIAN) ---

const ModalOverlay = styled.div`
    position: fixed; inset: 0; background: rgba(0,0,0,0.4);
    display: flex; align-items: center; justify-content: center; z-index: 1000;
`;
const ModalCard = styled.div`
    width: 100%; max-width: 440px; background: #fff; border-radius: ${props => props.theme.radii.lg}; overflow: hidden;
`;
const ModalHeader = styled.div` padding: 24px; border-bottom: 1px solid ${props => props.theme.colors.border}; `;
const ModalTitle = styled.h4` margin: 0; font-size: ${props => props.theme.fontSizes.md}; `;
const ModalBody = styled.div` padding: 24px; `;
const ModalFooter = styled.div` padding: 16px; display: flex; justify-content: flex-end; gap: 8px; background: ${props => props.theme.colors.surfaceAlt}; `;
const SecondaryBtn = styled.button` padding: 8px 16px; border: 1px solid ${props => props.theme.colors.border}; background: transparent; cursor: pointer; border-radius: 6px; `;
const PrimaryBtn = styled.button` padding: 8px 16px; background: #0ea5e9; color: white; border: none; cursor: pointer; border-radius: 6px; font-weight: 600; `;
const ModalInput = styled(Input)` width: 100%; margin-top: 8px; `;

const DISCOUNT_TYPE_OPTIONS = [
    { value: 'PERCENT', label: 'Procent (%)' },
    { value: 'FIXED_NET', label: 'Rabat netto' },
    { value: 'FIXED_GROSS', label: 'Rabat brutto' },
    { value: 'SET_NET', label: 'Ustaw netto' },
    { value: 'SET_GROSS', label: 'Ustaw brutto' },
] as const;

const DiscountTypeDropdown = ({ value, onChange }: { value: AdjustmentType, onChange: (v: AdjustmentType) => void }) => {
    const [open, setOpen] = useState(false);
    const ref = useRef<HTMLDivElement>(null);
    useEffect(() => {
        const onDocClick = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
        document.addEventListener('mousedown', onDocClick);
        return () => document.removeEventListener('mousedown', onDocClick);
    }, []);
    const selected = DISCOUNT_TYPE_OPTIONS.find(opt => opt.value === value);
    return (
        <DiscountTypeDropdownContainer ref={ref}>
            <DiscountTypeTrigger type="button" onClick={() => setOpen(!open)}>
                <span>{selected?.label || 'Wybierz typ'}</span>
                <span style={{ marginLeft: 'auto' }}>▼</span>
            </DiscountTypeTrigger>
            {open && (
                <DiscountTypeMenu>
                    {DISCOUNT_TYPE_OPTIONS.map(opt => (
                        <DiscountTypeMenuItem key={opt.value} $selected={opt.value === value} onClick={() => { onChange(opt.value); setOpen(false); }}>
                            {opt.label}
                        </DiscountTypeMenuItem>
                    ))}
                </DiscountTypeMenu>
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
        let finalPriceNet = basePriceNet;
        switch (adjustment.type) {
            case 'PERCENT': finalPriceNet = adjustment.value <= 100 ? Math.round(basePriceNet * (1 - adjustment.value / 100)) : Math.round(basePriceNet * adjustment.value / 100); break;
            case 'FIXED_NET': finalPriceNet = basePriceNet - adjustment.value; break;
            case 'FIXED_GROSS': finalPriceNet = Math.round((((basePriceNet * (100 + vatRate)) / 100 - adjustment.value) * 100) / (100 + vatRate)); break;
            case 'SET_NET': finalPriceNet = adjustment.value; break;
            case 'SET_GROSS': finalPriceNet = Math.round((adjustment.value * 100) / (100 + vatRate)); break;
        }
        if (finalPriceNet < 0) finalPriceNet = 0;
        const finalPriceGross = adjustment.type === 'SET_GROSS' ? adjustment.value : finalPriceNet + Math.round((finalPriceNet * vatRate) / 100);
        return { finalPriceNet, finalPriceGross, hasDiscount: finalPriceNet !== basePriceNet };
    };

    const calculateTotals = () => services.reduce((acc, s) => {
        const p = calculateServicePrice(s);
        return { totalNet: acc.totalNet + p.finalPriceNet, totalGross: acc.totalGross + p.finalPriceGross };
    }, { totalNet: 0, totalGross: 0 });

    const openDiscountModal = () => { setIsDiscountModalOpen(true); setTargetPrice(''); };
    const closeDiscountModal = () => { setIsDiscountModalOpen(false); setTargetPrice(''); };

    const handleApplyDiscount = () => {
        const value = parseFloat(targetPrice);
        if (isNaN(value)) return;
        const updated = services.map(s => ({
            ...s,
            adjustment: { type: discountType, value: ['PERCENT'].includes(discountType) ? value : Math.round(value * 100) }
        }));
        onChange(updated);
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
                            const pricing = calculateServicePrice(service);
                            return (
                                <Tr key={service.id}>
                                    <Td data-label="Nazwa usługi">
                                        <ServiceName>{service.serviceName}</ServiceName>
                                        <NoteDisplay onClick={() => setEditingNotes({ ...editingNotes, [service.id]: true })}>
                                            {editingNotes[service.id] ? <NoteInput autoFocus value={service.note} onChange={(e) => onChange(services.map(s => s.id === service.id ? { ...s, note: e.target.value } : s))} onBlur={() => setEditingNotes({ ...editingNotes, [service.id]: false })} /> : service.note || 'Dodaj notatkę...'}
                                        </NoteDisplay>
                                    </Td>
                                    <Td data-label="Cena bazowa">
                                        {service.requireManualPrice ? <CustomPriceLabel>Cena niestandardowa</CustomPriceLabel> : <PriceValue>{formatCurrency(service.basePriceNet / 100)}</PriceValue>}
                                    </Td>
                                    <Td data-label="Rabat">
                                        <DiscountCell>
                                            <DiscountTypeDropdown value={service.adjustment.type} onChange={(t) => onChange(services.map(s => s.id === service.id ? { ...s, adjustment: { ...s.adjustment, type: t } } : s))} />
                                            <DiscountInputWrapper>
                                                <DiscountInput value={discountInputValues[service.id] ?? (service.adjustment.value || '')} onChange={(e) => setDiscountInputValues({ ...discountInputValues, [service.id]: e.target.value })} onBlur={() => {
                                                    const val = parseFloat(discountInputValues[service.id]);
                                                    onChange(services.map(s => s.id === service.id ? { ...s, adjustment: { ...s.adjustment, value: isNaN(val) ? 0 : val } } : s));
                                                    setDiscountInputValues({ ...discountInputValues, [service.id]: '' });
                                                }} />
                                                <DiscountSuffix>{service.adjustment.type === 'PERCENT' ? '%' : 'PLN'}</DiscountSuffix>
                                            </DiscountInputWrapper>
                                        </DiscountCell>
                                    </Td>
                                    <Td data-label="Cena końcowa">
                                        <PriceValue $highlight={pricing.hasDiscount}>{formatCurrency(pricing.finalPriceGross / 100)}</PriceValue>
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
                                            Rabatuj całość
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

            {isDiscountModalOpen && (
                <ModalOverlay onClick={closeDiscountModal}>
                    <ModalCard onClick={e => e.stopPropagation()}>
                        <ModalHeader><ModalTitle>Rabatuj całość</ModalTitle></ModalHeader>
                        <ModalBody>
                            <p style={{ marginBottom: '16px', fontSize: '14px' }}>Wybierz typ rabatu i podaj wartość dla wszystkich usług.</p>
                            <DiscountTypeDropdown value={discountType} onChange={setDiscountType} />
                            <ModalInput type="number" value={targetPrice} onChange={e => setTargetPrice(e.target.value)} placeholder="0.00" autoFocus />
                            <div style={{ marginTop: '12px', fontSize: '12px', color: '#6b7280' }}>
                                Suma brutto: <strong>{formatCurrency(totals.totalGross / 100)}</strong>
                            </div>
                        </ModalBody>
                        <ModalFooter>
                            <SecondaryBtn onClick={closeDiscountModal}>Anuluj</SecondaryBtn>
                            <PrimaryBtn onClick={handleApplyDiscount}>Zastosuj rabat</PrimaryBtn>
                        </ModalFooter>
                    </ModalCard>
                </ModalOverlay>
            )}
        </>
    );
};