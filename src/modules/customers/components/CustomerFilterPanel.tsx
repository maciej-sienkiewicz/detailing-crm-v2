import { useState, useEffect } from 'react';
import styled, { keyframes, css } from 'styled-components';
import type { CustomerAdvancedFilters, CustomerTypeFilter } from '../types';
import { st } from '@/modules/statistics/components/StatisticsTheme';

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
    width: 380px;
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

    svg {
        width: 18px;
        height: 18px;
    }
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

// ─── Customer type tabs ───────────────────────────────────────────────────────

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
    padding: 7px 16px;
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

    &:hover {
        color: ${p => p.$active ? '#0f172a' : '#475569'};
    }
`;

// ─── Service chips ────────────────────────────────────────────────────────────

const ChipGrid = styled.div`
    display: flex;
    flex-wrap: wrap;
    gap: 7px;
`;

const ServiceChip = styled.button<{ $active: boolean }>`
    border: 1.5px solid ${p => p.$active ? '#0ea5e9' : '#e2e8f0'};
    background: ${p => p.$active ? 'rgba(14,165,233,0.08)' : 'transparent'};
    color: ${p => p.$active ? '#0ea5e9' : '#64748b'};
    padding: 5px 12px;
    border-radius: 9999px;
    font-family: inherit;
    font-size: 12px;
    font-weight: 600;
    cursor: pointer;
    transition: all 150ms ease;

    &:hover {
        border-color: ${p => p.$active ? '#0ea5e9' : '#cbd5e1'};
        color: ${p => p.$active ? '#0ea5e9' : '#475569'};
    }
`;

// ─── Activity inputs ──────────────────────────────────────────────────────────

const ActivityRow = styled.div`
    display: flex;
    flex-direction: column;
    gap: 10px;
`;

const InputRow = styled.label`
    display: flex;
    align-items: center;
    gap: 10px;
    font-size: 13px;
    color: ${st.text};
    cursor: pointer;
`;

const InputLabel = styled.span`
    flex: 1;
    min-width: 0;
`;

const NumberInput = styled.input`
    width: 72px;
    padding: 6px 10px;
    border: 1.5px solid #e2e8f0;
    border-radius: 8px;
    font-size: 13px;
    font-family: inherit;
    color: ${st.text};
    background: ${st.bgCard};
    text-align: center;
    transition: border-color 150ms ease;
    flex-shrink: 0;

    &:focus {
        outline: none;
        border-color: #0ea5e9;
        box-shadow: 0 0 0 3px rgba(14, 165, 233, 0.12);
    }

    &::placeholder {
        color: #94a3b8;
    }

    /* hide spin arrows */
    &::-webkit-inner-spin-button,
    &::-webkit-outer-spin-button {
        -webkit-appearance: none;
    }
    -moz-appearance: textfield;
`;

const DaysSuffix = styled.span`
    font-size: 12px;
    color: ${st.textMuted};
    flex-shrink: 0;
`;

// ─── Vehicle inputs ───────────────────────────────────────────────────────────

const VehicleRow = styled.div`
    display: flex;
    flex-direction: column;
    gap: 8px;
`;

const TextInput = styled.input`
    width: 100%;
    padding: 9px 12px;
    border: 1.5px solid #e2e8f0;
    border-radius: 9px;
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

    &::placeholder {
        color: #94a3b8;
    }
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

const CUSTOMER_TYPE_OPTIONS: { id: CustomerTypeFilter; label: string }[] = [
    { id: 'all',        label: 'Wszyscy'      },
    { id: 'individual', label: 'Indywidualni' },
    { id: 'business',   label: 'Firmowi'      },
];

const AVAILABLE_SERVICES = [
    'Detailing zewnętrzny',
    'Detailing wewnętrzny',
    'Korekta lakieru',
    'Powłoka ceramiczna',
    'Folia ochronna',
    'Pranie tapicerki',
    'Mycie silnika',
    'Polerowanie reflektorów',
    'Ozonowanie',
    'Renowacja skóry',
];

// ─── Props ────────────────────────────────────────────────────────────────────

interface CustomerFilterPanelProps {
    isOpen: boolean;
    initialFilters: CustomerAdvancedFilters;
    onApply: (filters: CustomerAdvancedFilters) => void;
    onClose: () => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

export const CustomerFilterPanel = ({
    isOpen,
    initialFilters,
    onApply,
    onClose,
}: CustomerFilterPanelProps) => {
    const [customerType, setCustomerType] = useState<CustomerTypeFilter>(
        initialFilters.customerType ?? 'all'
    );
    const [services, setServices] = useState<string[]>(initialFilters.services ?? []);
    const [lastVisitWithinDays, setLastVisitWithinDays] = useState<string>(
        initialFilters.lastVisitWithinDays?.toString() ?? ''
    );
    const [notVisitedSinceDays, setNotVisitedSinceDays] = useState<string>(
        initialFilters.notVisitedSinceDays?.toString() ?? ''
    );
    const [vehicleBrand, setVehicleBrand] = useState<string>(initialFilters.vehicleBrand ?? '');
    const [vehicleModel, setVehicleModel] = useState<string>(initialFilters.vehicleModel ?? '');

    useEffect(() => {
        if (isOpen) {
            setCustomerType(initialFilters.customerType ?? 'all');
            setServices(initialFilters.services ?? []);
            setLastVisitWithinDays(initialFilters.lastVisitWithinDays?.toString() ?? '');
            setNotVisitedSinceDays(initialFilters.notVisitedSinceDays?.toString() ?? '');
            setVehicleBrand(initialFilters.vehicleBrand ?? '');
            setVehicleModel(initialFilters.vehicleModel ?? '');
        }
    }, [isOpen, initialFilters]);

    const toggleService = (service: string) => {
        setServices(prev =>
            prev.includes(service) ? prev.filter(s => s !== service) : [...prev, service]
        );
    };

    const handleClear = () => {
        setCustomerType('all');
        setServices([]);
        setLastVisitWithinDays('');
        setNotVisitedSinceDays('');
        setVehicleBrand('');
        setVehicleModel('');
    };

    const handleApply = () => {
        onApply({
            customerType: customerType !== 'all' ? customerType : undefined,
            services: services.length > 0 ? services : undefined,
            lastVisitWithinDays: lastVisitWithinDays ? parseInt(lastVisitWithinDays, 10) : null,
            notVisitedSinceDays: notVisitedSinceDays ? parseInt(notVisitedSinceDays, 10) : null,
            vehicleBrand: vehicleBrand.trim() || null,
            vehicleModel: vehicleModel.trim() || null,
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
                    {/* Typ klienta */}
                    <FilterSection>
                        <SectionLabel>Typ klienta</SectionLabel>
                        <TypeGroup>
                            {CUSTOMER_TYPE_OPTIONS.map(opt => (
                                <TypeBtn
                                    key={opt.id}
                                    $active={customerType === opt.id}
                                    onClick={() => setCustomerType(opt.id)}
                                >
                                    {opt.label}
                                </TypeBtn>
                            ))}
                        </TypeGroup>
                    </FilterSection>

                    {/* Usługi */}
                    <FilterSection>
                        <SectionLabel>Wykonana usługa</SectionLabel>
                        <ChipGrid>
                            {AVAILABLE_SERVICES.map(service => (
                                <ServiceChip
                                    key={service}
                                    $active={services.includes(service)}
                                    onClick={() => toggleService(service)}
                                >
                                    {service}
                                </ServiceChip>
                            ))}
                        </ChipGrid>
                    </FilterSection>

                    {/* Aktywność */}
                    <FilterSection>
                        <SectionLabel>Aktywność</SectionLabel>
                        <ActivityRow>
                            <InputRow>
                                <InputLabel>Odwiedził w przeciągu</InputLabel>
                                <NumberInput
                                    type="number"
                                    min={1}
                                    placeholder="—"
                                    value={lastVisitWithinDays}
                                    onChange={e => {
                                        setLastVisitWithinDays(e.target.value);
                                        if (e.target.value) setNotVisitedSinceDays('');
                                    }}
                                />
                                <DaysSuffix>dni</DaysSuffix>
                            </InputRow>
                            <InputRow>
                                <InputLabel>Nie był od ponad</InputLabel>
                                <NumberInput
                                    type="number"
                                    min={1}
                                    placeholder="—"
                                    value={notVisitedSinceDays}
                                    onChange={e => {
                                        setNotVisitedSinceDays(e.target.value);
                                        if (e.target.value) setLastVisitWithinDays('');
                                    }}
                                />
                                <DaysSuffix>dni</DaysSuffix>
                            </InputRow>
                        </ActivityRow>
                    </FilterSection>

                    {/* Pojazd */}
                    <FilterSection>
                        <SectionLabel>Pojazd</SectionLabel>
                        <VehicleRow>
                            <TextInput
                                type="text"
                                placeholder="Marka (np. BMW, Toyota)"
                                value={vehicleBrand}
                                onChange={e => setVehicleBrand(e.target.value)}
                            />
                            <TextInput
                                type="text"
                                placeholder="Model (np. 3 Series, Corolla)"
                                value={vehicleModel}
                                onChange={e => setVehicleModel(e.target.value)}
                            />
                        </VehicleRow>
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
