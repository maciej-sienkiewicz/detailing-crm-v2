import { useState, useEffect } from 'react';
import styled, { keyframes } from 'styled-components';
import type { VehicleAdvancedFilters, VehicleStatus } from '../types';
import { st } from '@/modules/statistics/components/StatisticsTheme';
import { BrandSelect, ModelSelect } from './BrandModelSelectors';

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

    &:hover {
        background: #f1f5f9;
        color: ${st.text};
    }

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

// ─── Status tabs ──────────────────────────────────────────────────────────────

const TypeGroup = styled.div`
    display: inline-flex;
    background: #f1f5f9;
    border-radius: 10px;
    padding: 3px;
    gap: 2px;
`;

const TypeBtn = styled.button<{ $active: boolean }>`
    border: none;
    background: ${p => p.$active ? '#fff' : 'transparent'};
    padding: 7px 14px;
    border-radius: 8px;
    font-family: inherit;
    font-size: 13px;
    font-weight: 600;
    color: ${p => p.$active ? '#0f172a' : '#64748b'};
    cursor: pointer;
    transition: all 180ms ease;
    white-space: nowrap;
    box-shadow: ${p => p.$active ? '0 1px 3px rgba(0,0,0,0.08)' : 'none'};
    flex: 1;

    &:hover { color: ${p => p.$active ? '#0f172a' : '#475569'}; }
`;

// ─── Vehicle selectors ────────────────────────────────────────────────────────

const VehicleRow = styled.div`
    display: flex;
    flex-direction: column;
    gap: 8px;
`;

// ─── Year range ───────────────────────────────────────────────────────────────

const YearRow = styled.div`
    display: flex;
    align-items: center;
    gap: 8px;
`;

const YearInput = styled.input`
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

const YearSeparator = styled.span`
    font-size: 12px;
    color: ${st.textMuted};
    flex-shrink: 0;
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

    &:hover {
        border-color: #cbd5e1;
        background: #f8fafc;
        color: #475569;
    }
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

    &:hover {
        background: #0284c7;
        box-shadow: 0 4px 12px rgba(14, 165, 233, 0.36);
    }
`;

// ─── Constants ────────────────────────────────────────────────────────────────

const STATUS_OPTIONS: { id: VehicleStatus | 'all'; label: string }[] = [
    { id: 'all',      label: 'Wszystkie' },
    { id: 'active',   label: 'Aktywne'   },
    { id: 'sold',     label: 'Sprzedane' },
    { id: 'archived', label: 'Archiwum'  },
];

// ─── Props ────────────────────────────────────────────────────────────────────

interface VehicleFilterPanelProps {
    isOpen: boolean;
    initialFilters: VehicleAdvancedFilters;
    onApply: (filters: VehicleAdvancedFilters) => void;
    onClose: () => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

export const VehicleFilterPanel = ({
    isOpen,
    initialFilters,
    onApply,
    onClose,
}: VehicleFilterPanelProps) => {
    const [status, setStatus]       = useState<VehicleStatus | 'all'>(initialFilters.status ?? 'all');
    const [brand, setBrand]         = useState<string>(initialFilters.brand ?? '');
    const [model, setModel]         = useState<string>(initialFilters.model ?? '');
    const [yearFrom, setYearFrom]   = useState<string>(initialFilters.yearFrom?.toString() ?? '');
    const [yearTo, setYearTo]       = useState<string>(initialFilters.yearTo?.toString() ?? '');

    useEffect(() => {
        if (isOpen) {
            setStatus(initialFilters.status ?? 'all');
            setBrand(initialFilters.brand ?? '');
            setModel(initialFilters.model ?? '');
            setYearFrom(initialFilters.yearFrom?.toString() ?? '');
            setYearTo(initialFilters.yearTo?.toString() ?? '');
        }
    }, [isOpen, initialFilters]);

    const handleBrandChange = (b: string) => {
        setBrand(b);
        setModel('');
    };

    const handleClear = () => {
        setStatus('all');
        setBrand('');
        setModel('');
        setYearFrom('');
        setYearTo('');
    };

    const handleApply = () => {
        onApply({
            status:   status !== 'all' ? status : undefined,
            brand:    brand.trim()  || undefined,
            model:    model.trim()  || undefined,
            yearFrom: yearFrom ? parseInt(yearFrom, 10) : null,
            yearTo:   yearTo   ? parseInt(yearTo,   10) : null,
        });
        onClose();
    };

    if (!isOpen) return null;

    return (
        <>
            <Overlay onClick={onClose} />
            <Drawer>
                <DrawerHeader>
                    <DrawerTitle>Filtry</DrawerTitle>
                    <CloseBtn onClick={onClose} aria-label="Zamknij">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <line x1="18" y1="6" x2="6" y2="18" />
                            <line x1="6" y1="6" x2="18" y2="18" />
                        </svg>
                    </CloseBtn>
                </DrawerHeader>

                <DrawerBody>
                    {/* Status */}
                    <FilterSection>
                        <SectionLabel>Status pojazdu</SectionLabel>
                        <TypeGroup>
                            {STATUS_OPTIONS.map(opt => (
                                <TypeBtn
                                    key={opt.id}
                                    $active={status === opt.id}
                                    onClick={() => setStatus(opt.id)}
                                >
                                    {opt.label}
                                </TypeBtn>
                            ))}
                        </TypeGroup>
                    </FilterSection>

                    {/* Marka i model */}
                    <FilterSection>
                        <SectionLabel>Marka i model</SectionLabel>
                        <VehicleRow>
                            <BrandSelect
                                value={brand}
                                onChange={handleBrandChange}
                                placeholder="Wybierz markę"
                            />
                            <ModelSelect
                                brand={brand}
                                value={model}
                                onChange={setModel}
                                placeholder="Wybierz model"
                            />
                        </VehicleRow>
                    </FilterSection>

                    {/* Rok produkcji */}
                    <FilterSection>
                        <SectionLabel>Rok produkcji</SectionLabel>
                        <YearRow>
                            <YearInput
                                type="number"
                                min={1900}
                                max={new Date().getFullYear()}
                                placeholder="Od"
                                value={yearFrom}
                                onChange={e => setYearFrom(e.target.value)}
                            />
                            <YearSeparator>–</YearSeparator>
                            <YearInput
                                type="number"
                                min={1900}
                                max={new Date().getFullYear()}
                                placeholder="Do"
                                value={yearTo}
                                onChange={e => setYearTo(e.target.value)}
                            />
                        </YearRow>
                    </FilterSection>
                </DrawerBody>

                <DrawerFooter>
                    <ClearBtn onClick={handleClear}>Wyczyść</ClearBtn>
                    <ApplyBtn onClick={handleApply}>Zastosuj filtry</ApplyBtn>
                </DrawerFooter>
            </Drawer>
        </>
    );
};
