import { useState, useEffect, useMemo, useRef } from 'react';
import styled, { keyframes } from 'styled-components';
import { createPortal } from 'react-dom';
import type { OperationAdvancedFilters } from '../types';
import { st } from '@/modules/statistics/components/StatisticsTheme';
import { BrandSelect, ModelSelect } from '@/modules/vehicles/components/BrandModelSelectors';
import { useServices } from '@/modules/services/hooks/useServices';

// ─── Animations ───────────────────────────────────────────────────────────────

const slideIn = keyframes`
    from { transform: translateX(100%); opacity: 0; }
    to   { transform: translateX(0);    opacity: 1; }
`;

const fadeInOverlay = keyframes`
    from { opacity: 0; }
    to   { opacity: 1; }
`;

// ─── Overlay & Drawer ─────────────────────────────────────────────────────────

const Overlay = styled.div`
    position: fixed;
    inset: 0;
    background: rgba(15, 23, 42, 0.45);
    z-index: 200;
    animation: ${fadeInOverlay} 180ms ease both;
`;

const Drawer = styled.aside`
    position: fixed;
    top: 0;
    right: 0;
    bottom: 0;
    width: 400px;
    max-width: 100vw;
    background: ${st.bgCard};
    border-left: 1px solid ${st.border};
    box-shadow: -8px 0 32px rgba(0, 0, 0, 0.12);
    z-index: 201;
    display: flex;
    flex-direction: column;
    animation: ${slideIn} 220ms cubic-bezier(0.25, 0.46, 0.45, 0.94) both;
`;

// ─── Header ───────────────────────────────────────────────────────────────────

const DrawerHeader = styled.div`
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 20px 24px 18px;
    border-bottom: 1px solid ${st.border};
    flex-shrink: 0;
`;

const DrawerTitle = styled.h2`
    margin: 0;
    font-size: 16px;
    font-weight: 700;
    color: ${st.text};
    letter-spacing: -0.2px;
`;

const CloseBtn = styled.button`
    display: flex;
    align-items: center;
    justify-content: center;
    width: 32px;
    height: 32px;
    border: none;
    background: transparent;
    color: ${st.textMuted};
    cursor: pointer;
    border-radius: 8px;
    transition: all ${st.transition};

    &:hover { background: #f1f5f9; color: ${st.text}; }

    svg { width: 18px; height: 18px; }
`;

// ─── Body ─────────────────────────────────────────────────────────────────────

const DrawerBody = styled.div`
    flex: 1;
    overflow-y: auto;
    padding: 20px 24px;
    display: flex;
    flex-direction: column;
    gap: 28px;
`;

// ─── Section ──────────────────────────────────────────────────────────────────

const FilterSection = styled.div`
    display: flex;
    flex-direction: column;
    gap: 10px;
`;

const SectionLabel = styled.div`
    font-size: 11px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.07em;
    color: ${st.textMuted};
`;

// ─── Range row ────────────────────────────────────────────────────────────────

const RangeRow = styled.div`
    display: flex;
    align-items: center;
    gap: 8px;
`;

const RangeInput = styled.input`
    flex: 1;
    min-width: 0;
    padding: 6px 10px;
    border: 1.5px solid #e2e8f0;
    border-radius: 8px;
    font-size: 13px;
    font-family: inherit;
    color: ${st.text};
    background: ${st.bgCard};
    transition: border-color 150ms ease;

    &:focus {
        outline: none;
        border-color: #0ea5e9;
        box-shadow: 0 0 0 3px rgba(14, 165, 233, 0.12);
    }

    &::-webkit-inner-spin-button,
    &::-webkit-outer-spin-button { -webkit-appearance: none; }
    -moz-appearance: textfield;

    &::placeholder { color: #94a3b8; }
`;

const RangeInputDate = styled(RangeInput).attrs({ type: 'date' })``;

const RangeSep = styled.span`
    font-size: 12px;
    color: ${st.textMuted};
    flex-shrink: 0;
`;

// ─── Vehicle row ──────────────────────────────────────────────────────────────

const VehicleRow = styled.div`
    display: flex;
    flex-direction: column;
    gap: 8px;
`;

// ─── Service multiselect ──────────────────────────────────────────────────────

const ServiceTrigger = styled.button<{ $open: boolean }>`
    width: 100%;
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 9px 12px;
    border: 1.5px solid ${p => p.$open ? '#0ea5e9' : '#e2e8f0'};
    border-radius: 9px;
    background: ${st.bgCard};
    color: ${st.text};
    font-size: 13px;
    font-family: inherit;
    cursor: pointer;
    text-align: left;
    transition: border-color 150ms ease, box-shadow 150ms ease;
    box-shadow: ${p => p.$open ? '0 0 0 3px rgba(14,165,233,0.12)' : 'none'};

    &:hover { border-color: #cbd5e1; }
`;

const ServiceTriggerText = styled.span`
    flex: 1;
    min-width: 0;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
`;

const ServiceTriggerPlaceholder = styled.span`
    flex: 1;
    color: #94a3b8;
`;

const ServiceCaret = styled.span<{ $open: boolean }>`
    display: inline-block;
    width: 0;
    height: 0;
    border-left: 4px solid transparent;
    border-right: 4px solid transparent;
    border-top: 5px solid ${st.textMuted};
    flex-shrink: 0;
    transition: transform 180ms ease;
    transform: ${p => p.$open ? 'rotate(180deg)' : 'rotate(0deg)'};
`;

const ServicePortalMenu = styled.div`
    position: fixed;
    background: #fff;
    border: 1.5px solid #e2e8f0;
    border-radius: 12px;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.12);
    z-index: 500;
    overflow: hidden;
    display: flex;
    flex-direction: column;
`;

const ServiceMenuDoneBar = styled.div`
    border-top: 1px solid #f1f5f9;
    padding: 8px 10px;
    flex-shrink: 0;
`;

const ServiceMenuDoneBtn = styled.button`
    width: 100%;
    padding: 8px;
    border: 1.5px solid #e2e8f0;
    border-radius: 8px;
    background: transparent;
    font-family: inherit;
    font-size: 13px;
    font-weight: 600;
    color: #475569;
    cursor: pointer;
    transition: all 150ms ease;

    &:hover {
        border-color: #0ea5e9;
        color: #0ea5e9;
        background: rgba(14, 165, 233, 0.06);
    }
`;

const ServiceMenuSearch = styled.div`
    position: sticky;
    top: 0;
    background: #fff;
    padding: 8px 10px;
    border-bottom: 1px solid #f1f5f9;
    flex-shrink: 0;
`;

const ServiceMenuSearchInput = styled.input`
    width: 100%;
    padding: 7px 10px;
    border: 1.5px solid #e2e8f0;
    border-radius: 8px;
    font-size: 13px;
    font-family: inherit;
    color: ${st.text};
    background: #f8fafc;
    transition: border-color 150ms ease;
    box-sizing: border-box;

    &:focus { outline: none; border-color: #0ea5e9; background: #fff; }
    &::placeholder { color: #94a3b8; }
`;

const ServiceMenuList = styled.div`
    overflow-y: auto;
    flex: 1;
    min-height: 0;
    padding: 4px 0;
`;

const ServiceMenuItem = styled.label<{ $checked: boolean }>`
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 8px 12px;
    cursor: pointer;
    background: ${p => p.$checked ? 'rgba(14,165,233,0.06)' : 'transparent'};
    transition: background 100ms ease;

    &:hover { background: ${p => p.$checked ? 'rgba(14,165,233,0.10)' : '#f8fafc'}; }
`;

const ServiceMenuCheckbox = styled.input`
    width: 15px;
    height: 15px;
    accent-color: #0ea5e9;
    cursor: pointer;
    flex-shrink: 0;
`;

const ServiceMenuName = styled.span`
    font-size: 13px;
    color: ${st.text};
    font-weight: 500;
    line-height: 1.3;
`;

const ServiceMenuEmpty = styled.div`
    padding: 14px 12px;
    text-align: center;
    font-size: 13px;
    color: ${st.textMuted};
`;

// ─── Footer ───────────────────────────────────────────────────────────────────

const DrawerFooter = styled.div`
    display: flex;
    gap: 10px;
    padding: 18px 24px;
    border-top: 1px solid ${st.border};
    flex-shrink: 0;
`;

const ClearBtn = styled.button`
    flex: 1;
    padding: 10px;
    border: 1.5px solid #e2e8f0;
    border-radius: 9999px;
    background: transparent;
    font-family: inherit;
    font-size: 13px;
    font-weight: 600;
    color: #64748b;
    cursor: pointer;
    transition: all 150ms ease;

    &:hover { border-color: #cbd5e1; background: #f8fafc; color: #475569; }
`;

const ApplyBtn = styled.button`
    flex: 2;
    padding: 10px;
    border: none;
    border-radius: 9999px;
    background: #0ea5e9;
    font-family: inherit;
    font-size: 13px;
    font-weight: 600;
    color: #fff;
    cursor: pointer;
    transition: all 150ms ease;
    box-shadow: 0 2px 8px rgba(14, 165, 233, 0.28);

    &:hover { background: #0284c7; box-shadow: 0 4px 12px rgba(14, 165, 233, 0.36); }
`;

// ─── ServiceMultiSelect ───────────────────────────────────────────────────────

type MenuPos = { top?: number; bottom?: number; left: number; width: number; maxHeight: number };

interface ServiceMultiSelectProps {
    selectedIds: string[];
    onChange: (ids: string[]) => void;
}

const ServiceMultiSelect = ({ selectedIds, onChange }: ServiceMultiSelectProps) => {
    const { services, isLoading } = useServices({ search: '', page: 1, limit: 200, showInactive: false });

    const [open, setOpen]       = useState(false);
    const [menuPos, setMenuPos] = useState<MenuPos | null>(null);
    const [query, setQuery]     = useState('');
    const triggerRef  = useRef<HTMLButtonElement>(null);
    const menuRef     = useRef<HTMLDivElement>(null);
    const searchRef   = useRef<HTMLInputElement>(null);
    const didFocusRef = useRef(false);

    const filtered = useMemo(() => {
        if (!query.trim()) return services;
        const q = query.toLowerCase();
        return services.filter(s => s.name.toLowerCase().includes(q));
    }, [services, query]);

    const selectedNames = useMemo(
        () => services.filter(s => selectedIds.includes(s.id)).map(s => s.name),
        [services, selectedIds]
    );

    const MENU_MIN_HEIGHT = 180;
    const MENU_MAX_HEIGHT = 280;
    const GAP = 6;

    const updatePos = () => {
        const el = triggerRef.current;
        if (!el) return;
        const rect = el.getBoundingClientRect();
        const spaceBelow = window.innerHeight - rect.bottom - GAP;
        const spaceAbove = rect.top - GAP;
        if (spaceBelow >= MENU_MIN_HEIGHT || spaceBelow >= spaceAbove) {
            setMenuPos({ top: rect.bottom + GAP, left: rect.left, width: rect.width, maxHeight: Math.min(spaceBelow, MENU_MAX_HEIGHT) });
        } else {
            setMenuPos({ bottom: window.innerHeight - rect.top + GAP, left: rect.left, width: rect.width, maxHeight: Math.min(spaceAbove, MENU_MAX_HEIGHT) });
        }
    };

    useEffect(() => {
        if (!open) { didFocusRef.current = false; return; }
        updatePos();
        const onScroll = () => updatePos();
        const onResize = () => updatePos();
        const onKey    = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
        window.addEventListener('scroll', onScroll, true);
        window.addEventListener('resize', onResize);
        window.addEventListener('keydown', onKey);
        return () => {
            window.removeEventListener('scroll', onScroll, true);
            window.removeEventListener('resize', onResize);
            window.removeEventListener('keydown', onKey);
        };
    }, [open]);

    useEffect(() => {
        if (!open || !menuPos || didFocusRef.current) return;
        didFocusRef.current = true;
        const t = setTimeout(() => searchRef.current?.focus(), 0);
        return () => clearTimeout(t);
    }, [open, menuPos]);

    useEffect(() => { if (open) setQuery(''); }, [open]);

    useEffect(() => {
        if (!open) return;
        const handler = (e: MouseEvent) => {
            const t = e.target as Node;
            if (!triggerRef.current?.contains(t) && !menuRef.current?.contains(t)) setOpen(false);
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, [open]);

    const toggle = (id: string) => {
        onChange(selectedIds.includes(id) ? selectedIds.filter(s => s !== id) : [...selectedIds, id]);
    };

    const label = selectedIds.length === 0
        ? null
        : selectedIds.length === 1
            ? selectedNames[0] ?? '1 wybrana'
            : `${selectedIds.length} wybranych`;

    return (
        <div style={{ position: 'relative' }}>
            <ServiceTrigger
                ref={triggerRef}
                type="button"
                $open={open}
                onClick={() => !isLoading && setOpen(v => !v)}
                aria-haspopup="listbox"
                aria-expanded={open}
            >
                {label
                    ? <ServiceTriggerText>{label}</ServiceTriggerText>
                    : <ServiceTriggerPlaceholder>{isLoading ? 'Ładowanie...' : 'Wybierz usługi'}</ServiceTriggerPlaceholder>
                }
                <ServiceCaret $open={open} />
            </ServiceTrigger>

            {open && menuPos && createPortal(
                <ServicePortalMenu
                    ref={menuRef}
                    role="listbox"
                    aria-multiselectable="true"
                    style={{ top: menuPos.top, bottom: menuPos.bottom, left: menuPos.left, width: menuPos.width, maxHeight: menuPos.maxHeight }}
                >
                    <ServiceMenuSearch>
                        <ServiceMenuSearchInput
                            ref={searchRef}
                            type="text"
                            placeholder="Szukaj usługi..."
                            value={query}
                            onChange={e => setQuery(e.target.value)}
                        />
                    </ServiceMenuSearch>
                    <ServiceMenuList>
                        {filtered.length === 0
                            ? <ServiceMenuEmpty>Brak wyników</ServiceMenuEmpty>
                            : filtered.map(service => (
                                <ServiceMenuItem key={service.id} $checked={selectedIds.includes(service.id)}>
                                    <ServiceMenuCheckbox
                                        type="checkbox"
                                        checked={selectedIds.includes(service.id)}
                                        onChange={() => toggle(service.id)}
                                    />
                                    <ServiceMenuName>{service.name}</ServiceMenuName>
                                </ServiceMenuItem>
                            ))
                        }
                    </ServiceMenuList>
                    <ServiceMenuDoneBar>
                        <ServiceMenuDoneBtn type="button" onClick={() => setOpen(false)}>
                            Gotowe
                        </ServiceMenuDoneBtn>
                    </ServiceMenuDoneBar>
                </ServicePortalMenu>,
                document.body
            )}
        </div>
    );
};

// ─── Props & Component ────────────────────────────────────────────────────────

interface OperationFilterPanelProps {
    isOpen: boolean;
    initialFilters: OperationAdvancedFilters;
    onApply: (filters: OperationAdvancedFilters) => void;
    onClose: () => void;
}

export const OperationFilterPanel = ({
    isOpen,
    initialFilters,
    onApply,
    onClose,
}: OperationFilterPanelProps) => {
    const [serviceCountMin, setServiceCountMin] = useState(initialFilters.serviceCountMin?.toString() ?? '');
    const [serviceCountMax, setServiceCountMax] = useState(initialFilters.serviceCountMax?.toString() ?? '');
    const [minAmount, setMinAmount]             = useState(initialFilters.minAmount?.toString() ?? '');
    const [maxAmount, setMaxAmount]             = useState(initialFilters.maxAmount?.toString() ?? '');
    const [dateFrom, setDateFrom]               = useState(initialFilters.dateFrom ?? '');
    const [dateTo, setDateTo]                   = useState(initialFilters.dateTo ?? '');
    const [selectedServiceIds, setSelectedServiceIds] = useState<string[]>(initialFilters.serviceIds ?? []);
    const [brand, setBrand]                     = useState(initialFilters.vehicleBrand ?? '');
    const [model, setModel]                     = useState(initialFilters.vehicleModel ?? '');

    useEffect(() => {
        if (!isOpen) return;
        setServiceCountMin(initialFilters.serviceCountMin?.toString() ?? '');
        setServiceCountMax(initialFilters.serviceCountMax?.toString() ?? '');
        setMinAmount(initialFilters.minAmount?.toString() ?? '');
        setMaxAmount(initialFilters.maxAmount?.toString() ?? '');
        setDateFrom(initialFilters.dateFrom ?? '');
        setDateTo(initialFilters.dateTo ?? '');
        setSelectedServiceIds(initialFilters.serviceIds ?? []);
        setBrand(initialFilters.vehicleBrand ?? '');
        setModel(initialFilters.vehicleModel ?? '');
    }, [isOpen, initialFilters]);

    const handleBrandChange = (b: string) => { setBrand(b); setModel(''); };

    const handleClear = () => {
        setServiceCountMin(''); setServiceCountMax('');
        setMinAmount(''); setMaxAmount('');
        setDateFrom(''); setDateTo('');
        setSelectedServiceIds([]);
        setBrand(''); setModel('');
    };

    const handleApply = () => {
        onApply({
            serviceCountMin: serviceCountMin ? parseInt(serviceCountMin, 10) : null,
            serviceCountMax: serviceCountMax ? parseInt(serviceCountMax, 10) : null,
            minAmount: minAmount ? parseFloat(minAmount) : null,
            maxAmount: maxAmount ? parseFloat(maxAmount) : null,
            dateFrom:  dateFrom  || undefined,
            dateTo:    dateTo    || undefined,
            serviceIds: selectedServiceIds.length > 0 ? selectedServiceIds : undefined,
            vehicleBrand: brand.trim() || undefined,
            vehicleModel: model.trim() || undefined,
        });
        onClose();
    };

    if (!isOpen) return null;

    return (
        <>
            <Overlay onClick={onClose} />
            <Drawer>
                <DrawerHeader>
                    <DrawerTitle>Filtry zaawansowane</DrawerTitle>
                    <CloseBtn onClick={onClose} aria-label="Zamknij">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <line x1="18" y1="6" x2="6" y2="18" />
                            <line x1="6" y1="6" x2="18" y2="18" />
                        </svg>
                    </CloseBtn>
                </DrawerHeader>

                <DrawerBody>
                    {/* Liczba usług */}
                    <FilterSection>
                        <SectionLabel>Liczba usług</SectionLabel>
                        <RangeRow>
                            <RangeInput
                                type="number" min={0} placeholder="Od"
                                value={serviceCountMin}
                                onChange={e => setServiceCountMin(e.target.value)}
                            />
                            <RangeSep>–</RangeSep>
                            <RangeInput
                                type="number" min={0} placeholder="Do"
                                value={serviceCountMax}
                                onChange={e => setServiceCountMax(e.target.value)}
                            />
                        </RangeRow>
                    </FilterSection>

                    {/* Wartość wizyty */}
                    <FilterSection>
                        <SectionLabel>Wartość wizyty brutto (PLN)</SectionLabel>
                        <RangeRow>
                            <RangeInput
                                type="number" min={0} placeholder="Od"
                                value={minAmount}
                                onChange={e => setMinAmount(e.target.value)}
                            />
                            <RangeSep>–</RangeSep>
                            <RangeInput
                                type="number" min={0} placeholder="Do"
                                value={maxAmount}
                                onChange={e => setMaxAmount(e.target.value)}
                            />
                        </RangeRow>
                    </FilterSection>

                    {/* Zakres dat */}
                    <FilterSection>
                        <SectionLabel>Data wizyty</SectionLabel>
                        <RangeRow>
                            <RangeInputDate
                                value={dateFrom}
                                onChange={e => setDateFrom(e.target.value)}
                            />
                            <RangeSep>–</RangeSep>
                            <RangeInputDate
                                value={dateTo}
                                onChange={e => setDateTo(e.target.value)}
                            />
                        </RangeRow>
                    </FilterSection>

                    {/* Usługi */}
                    <FilterSection>
                        <SectionLabel>Wykonana usługa</SectionLabel>
                        <ServiceMultiSelect
                            selectedIds={selectedServiceIds}
                            onChange={setSelectedServiceIds}
                        />
                    </FilterSection>

                    {/* Marka i model */}
                    <FilterSection>
                        <SectionLabel>Marka i model pojazdu</SectionLabel>
                        <VehicleRow>
                            <BrandSelect value={brand} onChange={handleBrandChange} placeholder="Wybierz markę" onDone={() => {}} />
                            <ModelSelect brand={brand} value={model} onChange={setModel} placeholder="Wybierz model" onDone={() => {}} />
                        </VehicleRow>
                    </FilterSection>
                </DrawerBody>

                <DrawerFooter>
                    <ClearBtn type="button" onClick={handleClear}>Wyczyść</ClearBtn>
                    <ApplyBtn type="button" onClick={handleApply}>Zastosuj filtry</ApplyBtn>
                </DrawerFooter>
            </Drawer>
        </>
    );
};
