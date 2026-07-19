import { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import styled from 'styled-components';
import { useQueryClient } from '@tanstack/react-query';
import { FormGrid, FieldGroup, Label, Input, TextArea, ErrorMessage } from '@/common/components/Form';
import { Button } from '@/common/components/Button';
import { Toggle } from '@/common/components/Toggle';
import { EditableServicesTable } from './EditableServicesTable';
import { CustomerModal } from '@/modules/appointments/components/CustomerModal';
import { CustomerDetailsModal } from './CustomerDetailsModal';
import { VehicleSearchModal, type SelectedVehicle } from './VehicleSearchModal';
import { VehicleDetailsModal } from './VehicleDetailsModal';
import type { SelectedCustomer, AppointmentColor } from '@/modules/appointments/types';
import { t } from '@/common/i18n';
import { fromDateToLocalInput } from '@/common/dateTime';
import { DateTimePicker } from '@/modules/calendar/components/DateTimePicker';
import type { CheckInFormData, ServiceLineItem } from '../types';
import { Modal } from '@/common/components/Modal';
import { PhoneInput } from '@/common/components/PhoneInput';
import { BrandSelect, ModelSelect } from '@/modules/vehicles/components/BrandModelSelectors';
import { customerDetailApi } from '@/modules/customers/api/customerDetailApi';
import { gusApi } from '@/modules/gus/api/gusApi';
import { st } from '@/modules/statistics/components/StatisticsTheme';
import { QuickColorModal } from '@/modules/calendar/components/QuickColorModal';
import { appointmentColorApi } from '@/modules/appointment-colors/api/appointmentColorApi';

// ─── Section Card ─────────────────────────────────────────────────────────────

const StepContainer = styled.div`
    display: flex;
    flex-direction: column;
    gap: 16px;
`;

const SectionCard = styled.div`
    background: ${st.bgCard};
    border: 1px solid ${st.border};
    border-radius: ${st.radius};
    box-shadow: ${st.shadowSm};
    overflow: hidden;
`;

const SectionHead = styled.div`
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
    padding: 12px 16px;
    border-bottom: 1px solid ${st.border};
    background: ${st.bg};
    flex-wrap: wrap;

    @media (min-width: 640px) {
        padding: 14px 20px;
        gap: 12px;
    }
`;

const SectionTitleRow = styled.div`
    display: flex;
    align-items: center;
    gap: 8px;
    min-width: 0;
    flex: 1;
`;

const SectionNum = styled.span`
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 22px;
    height: 22px;
    border-radius: 50%;
    background: ${st.accentBlue};
    color: #fff;
    font-size: 11px;
    font-weight: 700;
    flex-shrink: 0;
`;

const SectionLabel = styled.h3`
    margin: 0;
    font-size: 14px;
    font-weight: 600;
    color: ${st.text};
    display: flex;
    align-items: center;
    gap: 7px;
    flex-wrap: wrap;

    svg {
        width: 17px;
        height: 17px;
        color: ${st.accentBlue};
        flex-shrink: 0;
    }
`;

const StatusPill = styled.span`
    display: inline-flex;
    align-items: center;
    padding: 2px 9px;
    background: ${st.accentBlueDim};
    color: ${st.accentBlue};
    border-radius: ${st.radiusFull};
    font-size: 11px;
    font-weight: 600;
    white-space: nowrap;
`;

const SectionActions = styled.div`
    display: flex;
    align-items: center;
    gap: 6px;
    flex-shrink: 0;
    flex-wrap: wrap;
`;

const ActionBtn = styled.button<{ $primary?: boolean }>`
    display: inline-flex;
    align-items: center;
    gap: 5px;
    padding: 6px 13px;
    border: 1.5px solid ${props => props.$primary ? st.accentBlue : st.border};
    border-radius: ${st.radiusSm};
    background: ${props => props.$primary ? st.accentBlueDim : st.bgCard};
    color: ${props => props.$primary ? st.accentBlue : st.textSecondary};
    font-size: 12px;
    font-weight: 600;
    cursor: pointer;
    transition: all ${st.transition};
    white-space: nowrap;

    &:hover:not(:disabled) {
        border-color: ${st.accentBlue};
        color: ${st.accentBlue};
        background: ${st.accentBlueDim};
    }

    &:disabled {
        opacity: 0.38;
        cursor: not-allowed;
    }
`;

const SectionBody = styled.div`
    padding: 14px 16px 16px;

    @media (min-width: 640px) {
        padding: 16px 20px 20px;
    }
`;

// ─── Collapsible panel ────────────────────────────────────────────────────────

const CollapsibleWrap = styled.div`
    border: 1px solid ${st.border};
    border-radius: ${st.radiusSm};
    margin-top: 12px;
    overflow: hidden;
    background: ${st.bgCard};
`;

const CollapsibleBtn = styled.button<{ $open: boolean }>`
    width: 100%;
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 11px 16px;
    background: ${props => props.$open ? st.bgCardAlt : 'transparent'};
    border: none;
    cursor: pointer;
    transition: background ${st.transition};
    font-size: 13px;
    font-weight: 600;
    color: ${st.text};
    gap: 10px;

    &:hover {
        background: ${st.bgCardAlt};
    }
`;

const CollapsibleBtnLeft = styled.div`
    display: flex;
    align-items: center;
    gap: 8px;

    svg {
        width: 16px;
        height: 16px;
        color: ${st.textMuted};
        flex-shrink: 0;
    }
`;

const ChevronSvg = styled.svg<{ $open: boolean }>`
    width: 16px;
    height: 16px;
    color: ${st.textMuted};
    transition: transform ${st.transition};
    transform: ${props => props.$open ? 'rotate(180deg)' : 'rotate(0)'};
    flex-shrink: 0;
`;

const CollapsibleContent = styled.div<{ $open: boolean }>`
    max-height: ${props => props.$open ? '2000px' : '0'};
    overflow: hidden;
    transition: max-height 250ms ease;
    padding: ${props => props.$open ? '16px' : '0 16px'};
    border-top: ${props => props.$open ? `1px solid ${st.border}` : 'none'};
`;

const NipInputWrap = styled.div`
    display: flex;
    align-items: stretch;
    border: 1.5px solid ${st.border};
    border-radius: ${st.radiusSm};
    background: ${st.bgCard};
    overflow: hidden;
    box-shadow: ${st.shadowXs};
    transition: border-color ${st.transition}, box-shadow ${st.transition};

    &:focus-within {
        border-color: ${st.borderFocus};
        box-shadow: ${st.shadowBlue};
    }
`;

const NipBareInput = styled.input`
    flex: 1;
    min-width: 0;
    padding: 10px 13px;
    border: none;
    background: transparent;
    font-size: ${st.fontSm};
    color: ${st.text};
    outline: none;
    letter-spacing: 0.02em;

    &::placeholder {
        color: ${st.textMuted};
    }
`;

const GusBtnSpinner = styled.svg`
    @keyframes gus-spin { to { transform: rotate(360deg); } }
    animation: gus-spin 0.7s linear infinite;
    flex-shrink: 0;
`;

const GusBtn = styled.button`
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    padding: 0 14px;
    align-self: stretch;
    border: none;
    border-left: 1.5px solid ${st.border};
    background: ${st.accentBlueDim};
    color: ${st.accentBlue};
    font-size: 12px;
    font-weight: 600;
    letter-spacing: 0.02em;
    cursor: pointer;
    white-space: nowrap;
    flex-shrink: 0;
    transition: background ${st.transition}, color ${st.transition};

    &:hover:not(:disabled) {
        background: rgba(59, 130, 246, 0.2);
    }

    &:active:not(:disabled) {
        background: rgba(59, 130, 246, 0.28);
    }

    &:disabled {
        opacity: 0.5;
        cursor: not-allowed;
    }
`;

const GusErrorMsg = styled.p`
    display: flex;
    align-items: center;
    gap: 5px;
    margin: 5px 0 0;
    font-size: 11.5px;
    font-weight: 500;
    color: ${st.accentRed};
`;

const FilledBadge = styled.span`
    display: inline-flex;
    align-items: center;
    padding: 1px 8px;
    background: rgba(5, 150, 105, 0.10);
    color: #059669;
    border-radius: ${st.radiusFull};
    font-size: 11px;
    font-weight: 600;
`;

// ─── Deposit toggle items ─────────────────────────────────────────────────────

const DepositSection = styled.div`
    display: flex;
    flex-direction: column;
    gap: 10px;

    @media (min-width: 560px) {
        flex-direction: row;
        gap: 12px;
    }
`;

const DepositItem = styled.div`
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
    padding: 10px 12px;
    background: #F8FAFC;
    border: 1px solid ${st.border};
    border-radius: 8px;
    transition: all 150ms ease;

    &:hover {
        background: #FFFFFF;
        border-color: ${st.accentBlue};
    }
`;

const DepositLabel = styled.span`
    font-size: 14px;
    color: ${st.text};
    user-select: none;
`;

// ─── Checkbox / handoff ───────────────────────────────────────────────────────

const CheckRow = styled.label`
    display: flex;
    align-items: center;
    gap: 10px;
    cursor: pointer;
    font-size: 13px;
    color: ${st.textSecondary};
    margin: 12px 0 6px;
    user-select: none;

    input[type="checkbox"] {
        width: 16px;
        height: 16px;
        cursor: pointer;
        accent-color: ${st.accentBlue};
    }
`;

// ─── Color dropdown ───────────────────────────────────────────────────────────

const ColorDropdownContainer = styled.div`
    position: relative;
`;

const ColorTrigger = styled.button`
    width: 100%;
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 11px 16px;
    border: 1.5px solid ${st.border};
    border-radius: 12px;
    background: #ffffff;
    cursor: pointer;
    transition: all ${st.transition};
    font-size: 14px;
    font-weight: 400;
    color: ${st.text};

    &:hover {
        border-color: ${st.borderHover};
        background: #FAFBFC;
    }

    &:focus {
        outline: none;
        border-color: ${st.accentBlue};
        box-shadow: ${st.shadowBlue};
        background: #ffffff;
    }
`;

const ColorSwatch = styled.span<{ $color: string }>`
    width: 16px;
    height: 16px;
    border-radius: 4px;
    background-color: ${props => props.$color};
    border: 1px solid rgba(0, 0, 0, 0.10);
    flex-shrink: 0;
`;

const ColorCaret = styled.span`
    margin-left: auto;
    border: solid ${st.textMuted};
    border-width: 0 2px 2px 0;
    display: inline-block;
    padding: 3px;
    transform: rotate(45deg);
`;

const ColorMenu = styled.div<{ $top: number; $left: number; $width: number }>`
    position: fixed;
    top: ${p => p.$top}px;
    left: ${p => p.$left}px;
    width: ${p => p.$width}px;
    background: ${st.bgCard};
    border: 1px solid ${st.border};
    border-radius: ${st.radiusSm};
    box-shadow: ${st.shadowLg};
    padding: 4px 0;
    z-index: 9999;
    max-height: 300px;
    overflow: auto;
`;

const ColorMenuItem = styled.button<{ $selected?: boolean }>`
    width: 100%;
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 9px 14px;
    background: ${props => props.$selected ? st.bgCardAlt : 'transparent'};
    border: none;
    text-align: left;
    cursor: pointer;
    font-size: 13px;
    font-weight: ${props => props.$selected ? 600 : 400};
    color: ${st.text};
    transition: background ${st.transition};

    &:hover {
        background: ${st.bgCardAlt};
    }
`;

const ColorMenuSeparator = styled.div`
    height: 1px;
    background: ${st.border};
    margin: 4px 0;
`;

const ColorMenuAddBtn = styled.button`
    width: 100%;
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 9px 14px;
    background: transparent;
    border: none;
    text-align: left;
    cursor: pointer;
    font-size: 13px;
    font-weight: 500;
    color: ${st.accentBlue};
    transition: background ${st.transition};

    &:hover {
        background: ${st.bgCardAlt};
    }

    svg {
        width: 15px;
        height: 15px;
        flex-shrink: 0;
    }
`;

interface ColorDropdownProps {
    colors: AppointmentColor[];
    value: string;
    onChange: (value: string) => void;
    onAddColor?: () => void;
}

const ColorDropdown = ({ colors, value, onChange, onAddColor }: ColorDropdownProps) => {
    const [open, setOpen] = useState(false);
    const [menuPos, setMenuPos] = useState({ top: 0, left: 0, width: 0 });
    const containerRef = useRef<HTMLDivElement | null>(null);
    const triggerRef = useRef<HTMLButtonElement | null>(null);
    const menuRef = useRef<HTMLDivElement | null>(null);

    const calcPos = useCallback(() => {
        if (!triggerRef.current) return;
        const r = triggerRef.current.getBoundingClientRect();
        setMenuPos({ top: r.bottom + 4, left: r.left, width: r.width });
    }, []);

    const handleOpen = () => {
        calcPos();
        setOpen(o => !o);
    };

    useEffect(() => {
        if (!open) return;
        const onDocClick = (e: MouseEvent) => {
            const inContainer = containerRef.current?.contains(e.target as Node);
            const inMenu = menuRef.current?.contains(e.target as Node);
            if (!inContainer && !inMenu) setOpen(false);
        };
        const onEsc = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
        const onScroll = () => { calcPos(); };
        document.addEventListener('mousedown', onDocClick);
        document.addEventListener('keydown', onEsc);
        window.addEventListener('scroll', onScroll, true);
        return () => {
            document.removeEventListener('mousedown', onDocClick);
            document.removeEventListener('keydown', onEsc);
            window.removeEventListener('scroll', onScroll, true);
        };
    }, [open, calcPos]);

    const selected = colors.find(c => c.id === value);

    return (
        <ColorDropdownContainer ref={containerRef}>
            <ColorTrigger ref={triggerRef} type="button" onClick={handleOpen} aria-haspopup="listbox" aria-expanded={open}>
                <ColorSwatch $color={selected?.hexColor || '#cccccc'} />
                <span>{selected?.name || 'Wybierz kolor'}</span>
                <ColorCaret />
            </ColorTrigger>
            {open && createPortal(
                <ColorMenu ref={menuRef} role="listbox" $top={menuPos.top} $left={menuPos.left} $width={menuPos.width}>
                    {colors.map(c => (
                        <ColorMenuItem
                            key={c.id}
                            role="option"
                            aria-selected={c.id === value}
                            $selected={c.id === value}
                            onClick={() => { onChange(c.id); setOpen(false); }}
                        >
                            <ColorSwatch $color={c.hexColor} />
                            <span>{c.name}</span>
                        </ColorMenuItem>
                    ))}
                    {onAddColor && (
                        <>
                            <ColorMenuSeparator />
                            <ColorMenuAddBtn
                                type="button"
                                onClick={() => { setOpen(false); onAddColor(); }}
                            >
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                    <line x1="12" y1="5" x2="12" y2="19"/>
                                    <line x1="5" y1="12" x2="19" y2="12"/>
                                </svg>
                                Dodaj nowy kolor
                            </ColorMenuAddBtn>
                        </>
                    )}
                </ColorMenu>,
                document.body
            )}
        </ColorDropdownContainer>
    );
};

// ─── Props ────────────────────────────────────────────────────────────────────

interface VerificationStepProps {
    formData: CheckInFormData;
    errors: Record<string, string>;
    onChange: (updates: Partial<CheckInFormData>) => void;
    onServicesChange: (services: ServiceLineItem[]) => void;
    colors: AppointmentColor[];
    showTechnicalSection?: boolean;
    hideVehicleColorAndPaint?: boolean;
    hideLicensePlate?: boolean;
    hideVehicleHandoff?: boolean;
    hideMileage?: boolean;
    initialCustomerData?: CheckInFormData['customerData'];
    initialHasFullCustomerData?: boolean;
    initialIsNewCustomer?: boolean;
    initialHomeAddress?: CheckInFormData['homeAddress'];
    initialCompany?: CheckInFormData['company'];
    initialVehicleData?: CheckInFormData['vehicleData'];
    initialIsNewVehicle?: boolean;
}

// ─── Component ────────────────────────────────────────────────────────────────

export const VerificationStep = ({
    formData,
    errors,
    onChange,
    onServicesChange,
    colors,
    showTechnicalSection = true,
    hideVehicleColorAndPaint = false,
    hideLicensePlate = false,
    hideVehicleHandoff = false,
    hideMileage = false,
    initialCustomerData,
    initialHasFullCustomerData,
    initialIsNewCustomer,
    initialHomeAddress,
    initialCompany,
    initialVehicleData,
    initialIsNewVehicle,
}: VerificationStepProps) => {
    const queryClient = useQueryClient();
    const [isCustomerModalOpen, setIsCustomerModalOpen] = useState(false);
    const [isCustomerDetailsModalOpen, setIsCustomerDetailsModalOpen] = useState(false);
    const [isVehicleModalOpen, setIsVehicleModalOpen] = useState(false);
    const [isVehicleDetailsModalOpen, setIsVehicleDetailsModalOpen] = useState(false);
    const [isColorModalOpen, setIsColorModalOpen] = useState(false);

    const handleColorCreate = async (color: { name: string; hexColor: string }) => {
        try {
            const newColor = await appointmentColorApi.createColor(color);
            queryClient.invalidateQueries({ queryKey: ['appointmentColors'] });
            onChange({ appointmentColorId: newColor.id });
        } catch {
            // creation failure is silent — user can retry by opening the modal again
        }
    };

    const startInputRef = useRef<HTMLDivElement | null>(null);
    const endInputRef = useRef<HTMLDivElement | null>(null);

    const [isHomeAddressOpen, setIsHomeAddressOpen] = useState(false);
    const [isCompanyOpen, setIsCompanyOpen] = useState(false);
    const [isGusLoading, setIsGusLoading] = useState(false);
    const [gusError, setGusError] = useState<string | null>(null);

    const handleFetchGusData = useCallback(async () => {
        const nip = formData.company?.nip?.replace(/[^0-9]/g, '') || '';
        if (nip.length !== 10) {
            setGusError('Wprowadź poprawny NIP (10 cyfr)');
            return;
        }
        setIsGusLoading(true);
        setGusError(null);
        try {
            const data = await gusApi.getCompanyByNip(nip);
            const streetParts = [data.address.street, data.address.buildingNumber, data.address.apartmentNumber]
                .filter(Boolean)
                .join(' ');
            onChange({
                company: {
                    name: data.name || formData.company?.name || '',
                    nip: data.nip || formData.company?.nip || '',
                    regon: data.regon || formData.company?.regon || '',
                    address: {
                        street: streetParts || formData.company?.address.street || '',
                        city: data.address.city || formData.company?.address.city || '',
                        postalCode: data.address.postalCode || formData.company?.address.postalCode || '',
                        country: data.address.country || formData.company?.address.country || 'Polska',
                    },
                },
            });
        } catch {
            setGusError('Nie znaleziono firmy o podanym NIP lub wystąpił błąd połączenia z GUS.');
        } finally {
            setIsGusLoading(false);
        }
    }, [formData.company, onChange]);

    useEffect(() => {
        console.log('[DEBUG VerificationStep] formData.homeAddress changed:', formData.homeAddress);
        console.log('[DEBUG VerificationStep] formData.company changed:', formData.company);
    }, [formData.homeAddress, formData.company]);

    const [showCustomerChoice, setShowCustomerChoice] = useState(false);
    const [customerChoiceMade, setCustomerChoiceMade] = useState(false);
    const [pendingCustomerUpdates, setPendingCustomerUpdates] = useState<Partial<CheckInFormData['customerData']> | null>(null);
    const [customerPromptScheduled, setCustomerPromptScheduled] = useState(false);

    const [showVehicleChoice, setShowVehicleChoice] = useState(false);
    const [vehicleChoiceMade, setVehicleChoiceMade] = useState(false);
    const [pendingVehicleUpdates, setPendingVehicleUpdates] = useState<Partial<NonNullable<CheckInFormData['vehicleData']>> | null>(null);
    const [vehiclePromptScheduled, setVehiclePromptScheduled] = useState(false);
    // Track whether the vehicle was already pre-selected on mount to skip the
    // "edit existing vs. add new" prompt — without touching vehicleChoiceMade,
    // so the badge is not shown until the user explicitly interacts.
    const vehicleWasPreSelected = useRef(!!formData.vehicleData?.id && !formData.isNewVehicle);

    const customerBadge = formData.isNewCustomer
        ? 'Dodasz nowego klienta'
        : (formData.customerData.id ? 'Aktualizujesz dane istniejącego klienta' : undefined);

    const vehicleBadge = (formData.vehicleData === null)
        ? undefined
        : ((formData.isNewVehicle || !formData.vehicleData?.id) ? 'Dodasz nowy pojazd' : 'Aktualizujesz dane istniejącego pojazdu');

    const homeAddressHasData = formData.homeAddress && (
        formData.homeAddress.street ||
        formData.homeAddress.city ||
        formData.homeAddress.postalCode
    );

    const companyHasData = formData.company && (
        formData.company.name ||
        formData.company.nip ||
        formData.company.regon ||
        formData.company.address.street ||
        formData.company.address.city ||
        formData.company.address.postalCode
    );

    const canResetCustomer = !(initialCustomerData === undefined && initialHasFullCustomerData === undefined && initialIsNewCustomer === undefined && initialHomeAddress === undefined && initialCompany === undefined);
    const customerDataEqual = initialCustomerData === undefined ? true : (
        initialCustomerData.id === formData.customerData.id &&
        initialCustomerData.firstName === formData.customerData.firstName &&
        initialCustomerData.lastName === formData.customerData.lastName &&
        initialCustomerData.phone === formData.customerData.phone &&
        initialCustomerData.email === formData.customerData.email
    );
    const customerHasFullEqual = initialHasFullCustomerData === undefined ? true : (initialHasFullCustomerData === formData.hasFullCustomerData);
    const customerIsNewEqual = initialIsNewCustomer === undefined ? true : (initialIsNewCustomer === formData.isNewCustomer);

    const homeAddressEqual = initialHomeAddress === undefined ? true : (
        (initialHomeAddress === null && formData.homeAddress === null) ||
        (initialHomeAddress !== null && formData.homeAddress !== null &&
            initialHomeAddress.street === formData.homeAddress.street &&
            initialHomeAddress.city === formData.homeAddress.city &&
            initialHomeAddress.postalCode === formData.homeAddress.postalCode &&
            initialHomeAddress.country === formData.homeAddress.country
        )
    );

    const companyEqual = initialCompany === undefined ? true : (
        (initialCompany === null && formData.company === null) ||
        (initialCompany !== null && formData.company !== null &&
            initialCompany.name === formData.company.name &&
            initialCompany.nip === formData.company.nip &&
            initialCompany.regon === formData.company.regon &&
            initialCompany.address.street === formData.company.address.street &&
            initialCompany.address.city === formData.company.address.city &&
            initialCompany.address.postalCode === formData.company.address.postalCode &&
            initialCompany.address.country === formData.company.address.country
        )
    );

    const hasCustomerChanges = canResetCustomer && !(customerDataEqual && customerHasFullEqual && customerIsNewEqual && homeAddressEqual && companyEqual);

    const canResetVehicle = !(initialVehicleData === undefined && initialIsNewVehicle === undefined);
    const vehicleDataEqual = initialVehicleData === undefined ? true : (
        (initialVehicleData === null && formData.vehicleData === null) ||
        (initialVehicleData !== null && formData.vehicleData !== null &&
            initialVehicleData.id === formData.vehicleData.id &&
            initialVehicleData.brand === formData.vehicleData.brand &&
            initialVehicleData.model === formData.vehicleData.model &&
            initialVehicleData.yearOfProduction === formData.vehicleData.yearOfProduction &&
            (initialVehicleData.licensePlate || '') === (formData.vehicleData.licensePlate || '') &&
            (initialVehicleData.color || '') === (formData.vehicleData.color || '')
        )
    );
    const vehicleIsNewEqual = initialIsNewVehicle === undefined ? true : (initialIsNewVehicle === formData.isNewVehicle);
    const hasVehicleChanges = canResetVehicle && !(vehicleDataEqual && vehicleIsNewEqual);

    const handleResetCustomer = () => {
        if (!initialCustomerData && initialCustomerData !== null && initialHasFullCustomerData === undefined && initialIsNewCustomer === undefined) return;
        onChange({
            customerData: initialCustomerData ? { ...initialCustomerData } : { id: '', firstName: '', lastName: '', phone: '', email: '' },
            hasFullCustomerData: initialHasFullCustomerData ?? false,
            isNewCustomer: initialIsNewCustomer ?? false,
            homeAddress: initialHomeAddress !== undefined ? initialHomeAddress : formData.homeAddress,
            company: initialCompany !== undefined ? initialCompany : formData.company,
        });
        setCustomerChoiceMade(false);
        setPendingCustomerUpdates(null);
        setShowCustomerChoice(false);
        setCustomerPromptScheduled(false);
    };

    const handleResetVehicle = () => {
        onChange({
            vehicleData: (initialVehicleData === undefined) ? formData.vehicleData : (initialVehicleData ?? null),
            isNewVehicle: initialIsNewVehicle ?? false,
        });
        setVehicleChoiceMade(false);
        setPendingVehicleUpdates(null);
        setShowVehicleChoice(false);
        setVehiclePromptScheduled(false);
    };

    const applyCustomerUpdates = (updates: Partial<CheckInFormData['customerData']>) => {
        onChange({
            customerData: {
                ...formData.customerData,
                ...updates,
            },
        });
        setCustomerChoiceMade(true);
    };

    const handleCustomerFieldBlur = () => {
        if (!customerChoiceMade && formData.customerData.id && customerPromptScheduled && pendingCustomerUpdates) {
            setShowCustomerChoice(true);
            setCustomerPromptScheduled(false);
            return;
        }
        if (pendingCustomerUpdates) {
            applyCustomerUpdates(pendingCustomerUpdates);
            setPendingCustomerUpdates(null);
            setCustomerPromptScheduled(false);
        }
    };

    const handleCustomerFieldChange = (updates: Partial<CheckInFormData['customerData']>) => {
        if (!customerChoiceMade && formData.customerData.id) {
            const hasExistingValue = Object.keys(updates).some(key => {
                const fieldKey = key as keyof CheckInFormData['customerData'];
                const currentValue = formData.customerData[fieldKey];
                return currentValue && String(currentValue).trim().length > 0;
            });
            if (hasExistingValue) {
                setPendingCustomerUpdates(prev => ({ ...(prev || {}), ...updates }));
                setCustomerPromptScheduled(true);
                return;
            }
        }
        applyCustomerUpdates(updates);
    };

    const confirmCustomerEditExisting = () => {
        onChange({ isNewCustomer: false, hasFullCustomerData: true });
        setCustomerChoiceMade(true);
        setShowCustomerChoice(false);
        setCustomerPromptScheduled(false);
        if (pendingCustomerUpdates) {
            applyCustomerUpdates(pendingCustomerUpdates);
            setPendingCustomerUpdates(null);
        }
    };

    const confirmCustomerAddNew = () => {
        onChange({
            isNewCustomer: true,
            hasFullCustomerData: true,
            customerData: { ...formData.customerData, id: '' },
        });
        setCustomerChoiceMade(true);
        setShowCustomerChoice(false);
        if (pendingCustomerUpdates) {
            applyCustomerUpdates(pendingCustomerUpdates);
            setPendingCustomerUpdates(null);
        }
    };

    const applyVehicleUpdates = (updates: Partial<NonNullable<CheckInFormData['vehicleData']>>) => {
        if (!formData.vehicleData) {
            onChange({
                isNewVehicle: true,
                vehicleData: { id: '', brand: '', model: '', ...updates },
            });
        } else {
            onChange({ vehicleData: { ...formData.vehicleData, ...updates } });
        }
    };

    const handleVehicleFieldChange = (updates: Partial<NonNullable<CheckInFormData['vehicleData']>>) => {
        if (!vehicleChoiceMade && !vehicleWasPreSelected.current && formData.vehicleData?.id) {
            const hasExistingValue = Object.keys(updates).some(key => {
                const fieldKey = key as keyof NonNullable<CheckInFormData['vehicleData']>;
                const currentValue = formData.vehicleData?.[fieldKey];
                return currentValue && String(currentValue).trim().length > 0;
            });
            if (hasExistingValue) {
                setPendingVehicleUpdates(prev => ({ ...(prev || {}), ...updates }));
                setVehiclePromptScheduled(true);
                return;
            }
        }
        applyVehicleUpdates(updates);
        if (!vehicleChoiceMade) setVehicleChoiceMade(true);
    };

    const handleVehicleFieldBlur = () => {
        if (!vehicleChoiceMade && formData.vehicleData?.id && vehiclePromptScheduled && pendingVehicleUpdates) {
            setShowVehicleChoice(true);
            setVehiclePromptScheduled(false);
            return;
        }
        if (pendingVehicleUpdates) {
            applyVehicleUpdates(pendingVehicleUpdates);
            setPendingVehicleUpdates(null);
            setVehiclePromptScheduled(false);
            if (!vehicleChoiceMade) setVehicleChoiceMade(true);
        }
    };

    const confirmVehicleEditExisting = () => {
        onChange({ isNewVehicle: false });
        setVehicleChoiceMade(true);
        setShowVehicleChoice(false);
        if (pendingVehicleUpdates) {
            applyVehicleUpdates(pendingVehicleUpdates);
            setPendingVehicleUpdates(null);
        }
    };

    const confirmVehicleAddNew = () => {
        const current = formData.vehicleData || { id: '', brand: '', model: '' };
        onChange({ isNewVehicle: true, vehicleData: { ...current, id: '' } });
        setVehicleChoiceMade(true);
        setShowVehicleChoice(false);
        if (pendingVehicleUpdates) {
            applyVehicleUpdates(pendingVehicleUpdates);
            setPendingVehicleUpdates(null);
        }
    };

    const handleCustomerDetailsSave = (data: {
        customerData: { firstName: string; lastName: string; email: string; phone: string };
        homeAddress: CheckInFormData['homeAddress'];
        company: CheckInFormData['company'];
    }) => {
        onChange({
            customerData: { ...formData.customerData, ...data.customerData },
            homeAddress: data.homeAddress,
            company: data.company,
        });
        setCustomerChoiceMade(true);
    };

    const handleCustomerSelect = async (customer: SelectedCustomer) => {
        console.log('[DEBUG VerificationStep] handleCustomerSelect called with:', customer);
        const baseCustomerData = {
            customerData: {
                id: customer.id || '',
                firstName: customer.firstName || '',
                lastName: customer.lastName || '',
                phone: customer.phone || '',
                email: customer.email || '',
            },
            hasFullCustomerData: true,
            isNewCustomer: customer.isNew || false,
        };
        if (!customer.isNew && customer.id) {
            try {
                const customerDetail = await customerDetailApi.getCustomerDetail(customer.id);
                const updateData = {
                    ...baseCustomerData,
                    homeAddress: customerDetail.customer.homeAddress || null,
                    company: customerDetail.customer.company ? {
                        name: customerDetail.customer.company.name || '',
                        nip: customerDetail.customer.company.nip || '',
                        regon: customerDetail.customer.company.regon || '',
                        address: {
                            street: customerDetail.customer.company.address?.street || '',
                            city: customerDetail.customer.company.address?.city || '',
                            postalCode: customerDetail.customer.company.address?.postalCode || '',
                            country: customerDetail.customer.company.address?.country || 'Polska',
                        },
                    } : null,
                };
                onChange(updateData);
            } catch (error) {
                console.error('Failed to fetch customer details:', error);
                onChange(baseCustomerData);
            }
        } else {
            onChange(baseCustomerData);
        }
        setCustomerChoiceMade(true);
        setIsCustomerModalOpen(false);
    };

    const handleVehicleSelect = (vehicle: SelectedVehicle) => {
        onChange({
            vehicleData: {
                id: vehicle.id || `temp-${Date.now()}`,
                brand: vehicle.brand,
                model: vehicle.model,
                yearOfProduction: vehicle.yearOfProduction ?? undefined,
                licensePlate: vehicle.licensePlate ?? undefined,
                color: vehicle.color ?? undefined,
            },
            isNewVehicle: vehicle.isNew || false,
        });
        setVehicleChoiceMade(true);
        setIsVehicleModalOpen(false);
    };

    const handleVehicleDetailsSave = (data: {
        vehicleData: {
            brand: string; model: string; yearOfProduction?: number;
            licensePlate: string; color?: string;
        };
    }) => {
        onChange({
            vehicleData: {
                id: formData.vehicleData?.id || `temp-${Date.now()}`,
                brand: data.vehicleData.brand,
                model: data.vehicleData.model,
                yearOfProduction: data.vehicleData.yearOfProduction,
                licensePlate: data.vehicleData.licensePlate,
                color: data.vehicleData.color,
            },
        });
        setVehicleChoiceMade(true);
        setIsVehicleDetailsModalOpen(false);
    };

    // ─── Render ───────────────────────────────────────────────────────────────

    return (
        <StepContainer>

            {/* ── 0. Tytuł ─────────────────────────────────────────────── */}
            <SectionCard>
                <SectionHead>
                    <SectionTitleRow>
                        <SectionLabel>
                            <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                            Tytuł wizyty / rezerwacji
                        </SectionLabel>
                    </SectionTitleRow>
                </SectionHead>
                <SectionBody>
                    <FieldGroup>
                        <Input
                            type="text"
                            value={formData.title ?? ''}
                            onChange={(e) => onChange({ title: e.target.value })}
                            placeholder="np. Korekta lakieru + powłoka ceramiczna"
                        />
                    </FieldGroup>
                </SectionBody>
            </SectionCard>

            {/* ── 1. Termin wizyty ─────────────────────────────────────── */}
            <SectionCard>
                <SectionHead>
                    <SectionTitleRow>
                        <SectionNum>1</SectionNum>
                        <SectionLabel>
                            Termin wizyty
                        </SectionLabel>
                    </SectionTitleRow>
                </SectionHead>
                <SectionBody>
                    <FormGrid $columns={3}>
                        <FieldGroup>
                            <Label>Data rozpoczęcia</Label>
                            <DateTimePicker
                                value={formData.visitStartAt ?? ''}
                                onChange={(start) => {
                                    let updates: Partial<CheckInFormData> = { visitStartAt: start };
                                    if (!formData.visitEndAt) {
                                        const d = new Date(start);
                                        if (!isNaN(d.getTime())) {
                                            d.setHours(d.getHours() + 1);
                                            updates.visitEndAt = fromDateToLocalInput(d);
                                        }
                                    } else {
                                        const s = new Date(start);
                                        const eDate = new Date(formData.visitEndAt);
                                        if (!isNaN(s.getTime()) && !isNaN(eDate.getTime()) && eDate < s) {
                                            const d2 = new Date(s.getTime());
                                            d2.setHours(d2.getHours() + 1);
                                            updates.visitEndAt = fromDateToLocalInput(d2);
                                        }
                                    }
                                    onChange(updates);
                                }}
                                showTime
                                placeholder="Wybierz datę i godzinę"
                                containerRef={startInputRef}
                            />
                        </FieldGroup>
                        <FieldGroup>
                            <Label>Data zakończenia</Label>
                            <DateTimePicker
                                value={formData.visitEndAt ?? ''}
                                onChange={(newEnd) => {
                                    let nextEnd = newEnd;
                                    if (formData.visitStartAt) {
                                        const s = new Date(formData.visitStartAt);
                                        const eDate = new Date(newEnd);
                                        if (!isNaN(s.getTime()) && !isNaN(eDate.getTime()) && eDate < s) {
                                            const d = new Date(s.getTime());
                                            d.setHours(d.getHours() + 1);
                                            nextEnd = fromDateToLocalInput(d);
                                        }
                                    }
                                    onChange({ visitEndAt: nextEnd });
                                }}
                                showTime
                                placeholder="Wybierz datę i godzinę"
                                containerRef={endInputRef}
                            />
                        </FieldGroup>
                        <FieldGroup>
                            <Label>Kolor w kalendarzu *</Label>
                            <ColorDropdown
                                colors={colors}
                                value={formData.appointmentColorId}
                                onChange={(val) => onChange({ appointmentColorId: val })}
                                onAddColor={() => setIsColorModalOpen(true)}
                            />
                            {errors.color && <ErrorMessage>{errors.color}</ErrorMessage>}
                        </FieldGroup>
                    </FormGrid>
                </SectionBody>
            </SectionCard>

            {/* ── 2. Dane klienta ───────────────────────────────────────── */}
            <SectionCard>
                <SectionHead>
                    <SectionTitleRow>
                        <SectionNum>2</SectionNum>
                        <SectionLabel>
                            {t.checkin.verification.customerSection}
                            {customerChoiceMade && customerBadge && (
                                <StatusPill>{customerBadge}</StatusPill>
                            )}
                        </SectionLabel>
                    </SectionTitleRow>
                    <SectionActions>
                        <ActionBtn onClick={handleResetCustomer} disabled={!hasCustomerChanges}>
                            Wycofaj zmiany
                        </ActionBtn>
                        <ActionBtn $primary onClick={() => setIsCustomerModalOpen(true)}>
                            Wyszukaj klienta
                        </ActionBtn>
                    </SectionActions>
                </SectionHead>
                <SectionBody>
                    {errors.customer && <ErrorMessage>{errors.customer}</ErrorMessage>}

                    <FormGrid>
                        <FieldGroup>
                            <Label>{t.checkin.verification.firstName}</Label>
                            <Input
                                value={(pendingCustomerUpdates?.firstName ?? formData.customerData.firstName) || ''}
                                onChange={(e) => handleCustomerFieldChange({ firstName: e.target.value })}
                                onBlur={handleCustomerFieldBlur}
                            />
                            {errors.firstName && <ErrorMessage>{errors.firstName}</ErrorMessage>}
                        </FieldGroup>

                        <FieldGroup>
                            <Label>{t.checkin.verification.lastName}</Label>
                            <Input
                                value={(pendingCustomerUpdates?.lastName ?? formData.customerData.lastName) || ''}
                                onChange={(e) => handleCustomerFieldChange({ lastName: e.target.value })}
                                onBlur={handleCustomerFieldBlur}
                            />
                            {errors.lastName && <ErrorMessage>{errors.lastName}</ErrorMessage>}
                        </FieldGroup>

                        <FieldGroup>
                            <Label>{t.checkin.verification.phone}</Label>
                            <PhoneInput
                                value={(pendingCustomerUpdates?.phone ?? formData.customerData.phone) || ''}
                                onChange={(value) => {
                                    const getCountryCode = (v?: string) => {
                                        if (!v) return '';
                                        const m = v.match(/^\+\d+/);
                                        return m ? m[0] : '';
                                    };
                                    const prevPhone = (pendingCustomerUpdates?.phone ?? formData.customerData.phone) || '';
                                    const prevCode = getCountryCode(prevPhone);
                                    const newCode = getCountryCode(value || '');
                                    if (!customerChoiceMade && formData.customerData.id && prevPhone.trim().length > 0 && newCode && newCode !== prevCode) {
                                        setPendingCustomerUpdates(prev => ({ ...(prev || {}), phone: value || '' }));
                                        setShowCustomerChoice(true);
                                        setCustomerPromptScheduled(false);
                                        return;
                                    }
                                    handleCustomerFieldChange({ phone: value });
                                }}
                                onBlur={handleCustomerFieldBlur}
                            />
                            {errors.phone && <ErrorMessage>{errors.phone}</ErrorMessage>}
                        </FieldGroup>

                        <FieldGroup>
                            <Label>{t.checkin.verification.email}</Label>
                            <Input
                                type="email"
                                value={(pendingCustomerUpdates?.email ?? formData.customerData.email) || ''}
                                onChange={(e) => handleCustomerFieldChange({ email: e.target.value })}
                                onBlur={handleCustomerFieldBlur}
                            />
                            {errors.email && <ErrorMessage>{errors.email}</ErrorMessage>}
                        </FieldGroup>
                    </FormGrid>

                    {errors.contact && <ErrorMessage>{errors.contact}</ErrorMessage>}

                    {/* Adres domowy */}
                    <CollapsibleWrap>
                        <CollapsibleBtn
                            type="button"
                            $open={isHomeAddressOpen}
                            onClick={() => setIsHomeAddressOpen(!isHomeAddressOpen)}
                        >
                            <CollapsibleBtnLeft>
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                                </svg>
                                Adres domowy
                                {homeAddressHasData && <FilledBadge>Uzupełniony</FilledBadge>}
                            </CollapsibleBtnLeft>
                            <ChevronSvg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" $open={isHomeAddressOpen}>
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </ChevronSvg>
                        </CollapsibleBtn>
                        <CollapsibleContent $open={isHomeAddressOpen}>
                            <FormGrid>
                                <FieldGroup style={{ gridColumn: '1 / -1' }}>
                                    <Label>Ulica</Label>
                                    <Input
                                        value={formData.homeAddress?.street || ''}
                                        onChange={(e) => onChange({ homeAddress: { street: e.target.value, city: formData.homeAddress?.city || '', postalCode: formData.homeAddress?.postalCode || '', country: formData.homeAddress?.country || 'Polska' } })}
                                        placeholder="np. ul. Główna 123"
                                    />
                                </FieldGroup>
                                <FieldGroup>
                                    <Label>Miasto</Label>
                                    <Input
                                        value={formData.homeAddress?.city || ''}
                                        onChange={(e) => onChange({ homeAddress: { street: formData.homeAddress?.street || '', city: e.target.value, postalCode: formData.homeAddress?.postalCode || '', country: formData.homeAddress?.country || 'Polska' } })}
                                        placeholder="np. Warszawa"
                                    />
                                </FieldGroup>
                                <FieldGroup>
                                    <Label>Kod pocztowy</Label>
                                    <Input
                                        value={formData.homeAddress?.postalCode || ''}
                                        onChange={(e) => onChange({ homeAddress: { street: formData.homeAddress?.street || '', city: formData.homeAddress?.city || '', postalCode: e.target.value, country: formData.homeAddress?.country || 'Polska' } })}
                                        placeholder="np. 00-001"
                                    />
                                </FieldGroup>
                                <FieldGroup>
                                    <Label>Kraj</Label>
                                    <Input
                                        value={formData.homeAddress?.country || 'Polska'}
                                        onChange={(e) => onChange({ homeAddress: { street: formData.homeAddress?.street || '', city: formData.homeAddress?.city || '', postalCode: formData.homeAddress?.postalCode || '', country: e.target.value } })}
                                        placeholder="np. Polska"
                                    />
                                </FieldGroup>
                            </FormGrid>
                        </CollapsibleContent>
                    </CollapsibleWrap>

                    {/* Dane firmowe */}
                    <CollapsibleWrap>
                        <CollapsibleBtn
                            type="button"
                            $open={isCompanyOpen}
                            onClick={() => setIsCompanyOpen(!isCompanyOpen)}
                        >
                            <CollapsibleBtnLeft>
                                Dane firmowe
                                {companyHasData && <FilledBadge>Uzupełniony</FilledBadge>}
                            </CollapsibleBtnLeft>
                            <ChevronSvg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" $open={isCompanyOpen}>
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </ChevronSvg>
                        </CollapsibleBtn>
                        <CollapsibleContent $open={isCompanyOpen}>
                            <FormGrid>
                                <FieldGroup style={{ gridColumn: '1 / -1' }}>
                                    <Label>Nazwa firmy</Label>
                                    <Input value={formData.company?.name || ''} onChange={(e) => onChange({ company: { name: e.target.value, nip: formData.company?.nip || '', regon: formData.company?.regon || '', address: { street: formData.company?.address.street || '', city: formData.company?.address.city || '', postalCode: formData.company?.address.postalCode || '', country: formData.company?.address.country || 'Polska' } } })} placeholder="np. ABC Sp. z o.o." />
                                </FieldGroup>
                                <FieldGroup>
                                    <Label>NIP</Label>
                                    <NipInputWrap>
                                        <NipBareInput
                                            value={formData.company?.nip || ''}
                                            onChange={(e) => {
                                                setGusError(null);
                                                onChange({ company: { name: formData.company?.name || '', nip: e.target.value, regon: formData.company?.regon || '', address: { street: formData.company?.address.street || '', city: formData.company?.address.city || '', postalCode: formData.company?.address.postalCode || '', country: formData.company?.address.country || 'Polska' } } });
                                            }}
                                            placeholder="np. 1234567890"
                                        />
                                        <GusBtn
                                            type="button"
                                            disabled={isGusLoading}
                                            onClick={handleFetchGusData}
                                        >
                                            {isGusLoading ? (
                                                <>
                                                    <GusBtnSpinner xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                                                        <path d="M12 2a10 10 0 0 1 10 10" />
                                                    </GusBtnSpinner>
                                                    Pobieranie…
                                                </>
                                            ) : (
                                                <>
                                                    <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                                        <path d="M12 5v14M5 12l7 7 7-7" />
                                                    </svg>
                                                    Pobierz z GUS
                                                </>
                                            )}
                                        </GusBtn>
                                    </NipInputWrap>
                                    {gusError && <GusErrorMsg>{gusError}</GusErrorMsg>}
                                </FieldGroup>
                                <FieldGroup>
                                    <Label>REGON</Label>
                                    <Input value={formData.company?.regon || ''} onChange={(e) => onChange({ company: { name: formData.company?.name || '', nip: formData.company?.nip || '', regon: e.target.value, address: { street: formData.company?.address.street || '', city: formData.company?.address.city || '', postalCode: formData.company?.address.postalCode || '', country: formData.company?.address.country || 'Polska' } } })} placeholder="np. 123456789" />
                                </FieldGroup>
                                <FieldGroup style={{ gridColumn: '1 / -1' }}>
                                    <Label>Ulica (firma)</Label>
                                    <Input value={formData.company?.address.street || ''} onChange={(e) => onChange({ company: { name: formData.company?.name || '', nip: formData.company?.nip || '', regon: formData.company?.regon || '', address: { street: e.target.value, city: formData.company?.address.city || '', postalCode: formData.company?.address.postalCode || '', country: formData.company?.address.country || 'Polska' } } })} placeholder="np. ul. Biznesowa 456" />
                                </FieldGroup>
                                <FieldGroup>
                                    <Label>Miasto</Label>
                                    <Input value={formData.company?.address.city || ''} onChange={(e) => onChange({ company: { name: formData.company?.name || '', nip: formData.company?.nip || '', regon: formData.company?.regon || '', address: { street: formData.company?.address.street || '', city: e.target.value, postalCode: formData.company?.address.postalCode || '', country: formData.company?.address.country || 'Polska' } } })} placeholder="np. Warszawa" />
                                </FieldGroup>
                                <FieldGroup>
                                    <Label>Kod pocztowy</Label>
                                    <Input value={formData.company?.address.postalCode || ''} onChange={(e) => onChange({ company: { name: formData.company?.name || '', nip: formData.company?.nip || '', regon: formData.company?.regon || '', address: { street: formData.company?.address.street || '', city: formData.company?.address.city || '', postalCode: e.target.value, country: formData.company?.address.country || 'Polska' } } })} placeholder="np. 00-001" />
                                </FieldGroup>
                                <FieldGroup>
                                    <Label>Kraj</Label>
                                    <Input value={formData.company?.address.country || 'Polska'} onChange={(e) => onChange({ company: { name: formData.company?.name || '', nip: formData.company?.nip || '', regon: formData.company?.regon || '', address: { street: formData.company?.address.street || '', city: formData.company?.address.city || '', postalCode: formData.company?.address.postalCode || '', country: e.target.value } } })} placeholder="np. Polska" />
                                </FieldGroup>
                            </FormGrid>
                        </CollapsibleContent>
                    </CollapsibleWrap>

                    {/* Vehicle handoff */}
                    {!hideVehicleHandoff && formData.vehicleHandoff && (
                        <>
                            <CheckRow>
                                <input
                                    type="checkbox"
                                    checked={formData.vehicleHandoff.isHandedOffByOtherPerson}
                                    onChange={(e) => onChange({ vehicleHandoff: { ...formData.vehicleHandoff, isHandedOffByOtherPerson: e.target.checked } })}
                                />
                                <span>Pojazd oddaje inna osoba</span>
                            </CheckRow>

                            {formData.vehicleHandoff.isHandedOffByOtherPerson && (
                                <FormGrid $columns={2}>
                                    <FieldGroup>
                                        <Label>Imię osoby przekazującej *</Label>
                                        <Input
                                            value={formData.vehicleHandoff.contactPerson.firstName}
                                            onChange={(e) => onChange({ vehicleHandoff: { ...formData.vehicleHandoff, contactPerson: { ...formData.vehicleHandoff.contactPerson, firstName: e.target.value } } })}
                                        />
                                        {errors.handoffFirstName && <ErrorMessage>{errors.handoffFirstName}</ErrorMessage>}
                                    </FieldGroup>
                                    <FieldGroup>
                                        <Label>Nazwisko osoby przekazującej *</Label>
                                        <Input
                                            value={formData.vehicleHandoff.contactPerson.lastName}
                                            onChange={(e) => onChange({ vehicleHandoff: { ...formData.vehicleHandoff, contactPerson: { ...formData.vehicleHandoff.contactPerson, lastName: e.target.value } } })}
                                        />
                                        {errors.handoffLastName && <ErrorMessage>{errors.handoffLastName}</ErrorMessage>}
                                    </FieldGroup>
                                    <FieldGroup>
                                        <Label>Telefon</Label>
                                        <PhoneInput
                                            value={formData.vehicleHandoff.contactPerson.phone}
                                            onChange={(value) => onChange({ vehicleHandoff: { ...formData.vehicleHandoff, contactPerson: { ...formData.vehicleHandoff.contactPerson, phone: value || '' } } })}
                                        />
                                        {errors.handoffPhone && <ErrorMessage>{errors.handoffPhone}</ErrorMessage>}
                                    </FieldGroup>
                                    <FieldGroup>
                                        <Label>E-mail</Label>
                                        <Input
                                            type="email"
                                            value={formData.vehicleHandoff.contactPerson.email}
                                            onChange={(e) => onChange({ vehicleHandoff: { ...formData.vehicleHandoff, contactPerson: { ...formData.vehicleHandoff.contactPerson, email: e.target.value } } })}
                                        />
                                        {errors.handoffEmail && <ErrorMessage>{errors.handoffEmail}</ErrorMessage>}
                                    </FieldGroup>
                                </FormGrid>
                            )}
                            {formData.vehicleHandoff.isHandedOffByOtherPerson && errors.handoffContact && (
                                <ErrorMessage>{errors.handoffContact}</ErrorMessage>
                            )}
                        </>
                    )}
                </SectionBody>
            </SectionCard>

            {/* ── 3. Pojazd ─────────────────────────────────────────────── */}
            <SectionCard>
                <SectionHead>
                    <SectionTitleRow>
                        <SectionNum>3</SectionNum>
                        <SectionLabel>
                            {t.checkin.verification.vehicleSection}
                            {(vehicleChoiceMade || formData.isNewVehicle) && vehicleBadge && (
                                <StatusPill>{vehicleBadge}</StatusPill>
                            )}
                        </SectionLabel>
                    </SectionTitleRow>
                    <SectionActions>
                        <ActionBtn onClick={handleResetVehicle} disabled={!hasVehicleChanges}>
                            Wycofaj zmiany
                        </ActionBtn>
                        <ActionBtn $primary onClick={() => setIsVehicleModalOpen(true)}>
                            Wyszukaj pojazd
                        </ActionBtn>
                    </SectionActions>
                </SectionHead>
                <SectionBody>
                    {errors.vehicle && <ErrorMessage>{errors.vehicle}</ErrorMessage>}

                    <FormGrid $columns={3}>
                        <FieldGroup>
                            <Label>{t.checkin.verification.brand}</Label>
                            <BrandSelect
                                value={(pendingVehicleUpdates?.brand ?? formData.vehicleData?.brand) || ''}
                                onChange={(val) => handleVehicleFieldChange({ brand: val, model: '' })}
                                onBlur={handleVehicleFieldBlur}
                            />
                        </FieldGroup>
                        <FieldGroup>
                            <Label>{t.checkin.verification.model}</Label>
                            <ModelSelect
                                brand={(pendingVehicleUpdates?.brand ?? formData.vehicleData?.brand) || ''}
                                value={(pendingVehicleUpdates?.model ?? formData.vehicleData?.model) || ''}
                                onChange={(val) => handleVehicleFieldChange({ model: val })}
                                onBlur={handleVehicleFieldBlur}
                            />
                        </FieldGroup>
                        <FieldGroup>
                            <Label>Rok produkcji</Label>
                            <Input
                                type="number"
                                value={(pendingVehicleUpdates?.yearOfProduction ?? formData.vehicleData?.yearOfProduction) ?? ''}
                                onChange={(e) => handleVehicleFieldChange({ yearOfProduction: parseInt(e.target.value) || undefined })}
                                onBlur={handleVehicleFieldBlur}
                            />
                        </FieldGroup>

                        {!hideLicensePlate && (
                            <FieldGroup>
                                <Label>{t.checkin.verification.licensePlate}</Label>
                                <Input
                                    value={(pendingVehicleUpdates?.licensePlate ?? formData.vehicleData?.licensePlate) || ''}
                                    onChange={(e) => handleVehicleFieldChange({ licensePlate: e.target.value })}
                                    onBlur={handleVehicleFieldBlur}
                                />
                            </FieldGroup>
                        )}

                        {!hideMileage && (
                            <FieldGroup>
                                <Label>{t.checkin.technical.mileage}</Label>
                                <Input
                                    type="number"
                                    value={formData.technicalState.mileage || ''}
                                    onChange={(e) => onChange({ technicalState: { ...formData.technicalState, mileage: parseInt(e.target.value) || 0 } })}
                                    placeholder={t.checkin.technical.mileagePlaceholder}
                                />
                                {errors.mileage && <ErrorMessage>{errors.mileage}</ErrorMessage>}
                            </FieldGroup>
                        )}

                        {!hideVehicleColorAndPaint && (
                            <FieldGroup>
                                <Label>Kolor</Label>
                                <Input
                                    value={(pendingVehicleUpdates?.color ?? formData.vehicleData?.color) || ''}
                                    onChange={(e) => handleVehicleFieldChange({ color: e.target.value })}
                                    onBlur={handleVehicleFieldBlur}
                                />
                            </FieldGroup>
                        )}
                    </FormGrid>
                </SectionBody>
            </SectionCard>

            {/* ── 4. Stan techniczny (conditional) ─────────────────────── */}
            {showTechnicalSection && (
                <SectionCard>
                    <SectionHead>
                        <SectionTitleRow>
                            <SectionNum>4</SectionNum>
                            <SectionLabel>
                                Depozyt
                            </SectionLabel>
                        </SectionTitleRow>
                    </SectionHead>
                    <SectionBody>
                        <DepositSection>
                            <DepositItem>
                                <DepositLabel>{t.checkin.technical.depositItems.keys}</DepositLabel>
                                <Toggle
                                    checked={formData.technicalState.deposit.keys}
                                    onChange={(checked) => onChange({ technicalState: { ...formData.technicalState, deposit: { ...formData.technicalState.deposit, keys: checked } } })}
                                />
                            </DepositItem>
                            <DepositItem>
                                <DepositLabel>{t.checkin.technical.depositItems.registrationDocument}</DepositLabel>
                                <Toggle
                                    checked={formData.technicalState.deposit.registrationDocument}
                                    onChange={(checked) => onChange({ technicalState: { ...formData.technicalState, deposit: { ...formData.technicalState.deposit, registrationDocument: checked } } })}
                                />
                            </DepositItem>
                        </DepositSection>
                    </SectionBody>
                </SectionCard>
            )}

            {/* ── 5. Usługi ─────────────────────────────────────────────── */}
            <SectionCard>
                <SectionHead>
                    <SectionTitleRow>
                        <SectionNum>{showTechnicalSection ? 5 : 4}</SectionNum>
                        <SectionLabel>
                            Usługi
                        </SectionLabel>
                    </SectionTitleRow>
                </SectionHead>
                <SectionBody>
                    <EditableServicesTable
                        services={formData.services}
                        onChange={onServicesChange}
                    />
                    {errors.services && <ErrorMessage>{errors.services}</ErrorMessage>}
                </SectionBody>
            </SectionCard>

            {/* ── 6. Notatki ───────────────────────────────────────────── */}
            <SectionCard>
                <SectionHead>
                    <SectionTitleRow>
                        <SectionNum>{showTechnicalSection ? 6 : 5}</SectionNum>
                        <SectionLabel>Notatki</SectionLabel>
                    </SectionTitleRow>
                </SectionHead>
                <SectionBody style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <div>
                        <Label style={{ display: 'block', marginBottom: '6px' }}>
                            {t.checkin.technical.inspectionNotes}
                        </Label>
                        <TextArea
                            value={formData.technicalState.inspectionNotes}
                            onChange={(e) => onChange({ technicalState: { ...formData.technicalState, inspectionNotes: e.target.value } })}
                            placeholder={t.checkin.technical.inspectionNotesPlaceholder}
                            style={{ width: '100%', boxSizing: 'border-box', minHeight: '100px' }}
                        />
                    </div>
                    <div>
                        <Label style={{ display: 'block', marginBottom: '6px' }}>
                            {t.checkin.technical.protocolNotes}
                        </Label>
                        <TextArea
                            value={formData.technicalState.protocolNotes}
                            onChange={(e) => onChange({ technicalState: { ...formData.technicalState, protocolNotes: e.target.value } })}
                            placeholder={t.checkin.technical.protocolNotesPlaceholder}
                            style={{ width: '100%', boxSizing: 'border-box', minHeight: '100px' }}
                        />
                    </div>
                </SectionBody>
            </SectionCard>

            {/* ── 7. Door to Door ───────────────────────────────────────── */}
            <SectionCard>
                <SectionHead>
                    <SectionTitleRow>
                        <SectionNum>{showTechnicalSection ? 7 : 6}</SectionNum>
                        <SectionLabel>
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
                                <polyline points="9 22 9 12 15 12 15 22" />
                            </svg>
                            Door to Door
                            {formData.doorToDoor?.enabled && (
                                <StatusPill>Aktywna</StatusPill>
                            )}
                        </SectionLabel>
                    </SectionTitleRow>
                    <Toggle
                        checked={formData.doorToDoor?.enabled ?? false}
                        onChange={(checked) => onChange({
                            doorToDoor: {
                                enabled: checked,
                                pickupAddress: formData.doorToDoor?.pickupAddress ?? { city: '', street: '' },
                                deliveryAddress: formData.doorToDoor?.deliveryAddress ?? { city: '', street: '' },
                                notes: formData.doorToDoor?.notes ?? '',
                            },
                        })}
                    />
                </SectionHead>
                {formData.doorToDoor?.enabled && (
                    <SectionBody>
                        <FormGrid>
                            <FieldGroup>
                                <Label>Miasto odbioru</Label>
                                <Input
                                    value={formData.doorToDoor.pickupAddress.city}
                                    onChange={(e) => onChange({
                                        doorToDoor: {
                                            ...formData.doorToDoor!,
                                            pickupAddress: { ...formData.doorToDoor!.pickupAddress, city: e.target.value },
                                        },
                                    })}
                                    placeholder="np. Warszawa"
                                />
                            </FieldGroup>
                            <FieldGroup>
                                <Label>Ulica i numer (odbiór)</Label>
                                <Input
                                    value={formData.doorToDoor.pickupAddress.street}
                                    onChange={(e) => onChange({
                                        doorToDoor: {
                                            ...formData.doorToDoor!,
                                            pickupAddress: { ...formData.doorToDoor!.pickupAddress, street: e.target.value },
                                        },
                                    })}
                                    placeholder="np. ul. Kowalska 12"
                                />
                            </FieldGroup>
                            <FieldGroup>
                                <Label>Miasto dostarczenia</Label>
                                <Input
                                    value={formData.doorToDoor.deliveryAddress.city}
                                    onChange={(e) => onChange({
                                        doorToDoor: {
                                            ...formData.doorToDoor!,
                                            deliveryAddress: { ...formData.doorToDoor!.deliveryAddress, city: e.target.value },
                                        },
                                    })}
                                    placeholder="np. Warszawa"
                                />
                            </FieldGroup>
                            <FieldGroup>
                                <Label>Ulica i numer (dostarczenie)</Label>
                                <Input
                                    value={formData.doorToDoor.deliveryAddress.street}
                                    onChange={(e) => onChange({
                                        doorToDoor: {
                                            ...formData.doorToDoor!,
                                            deliveryAddress: { ...formData.doorToDoor!.deliveryAddress, street: e.target.value },
                                        },
                                    })}
                                    placeholder="np. ul. Kowalska 12"
                                />
                            </FieldGroup>
                        </FormGrid>
                        <FieldGroup style={{ marginTop: 12 }}>
                            <Label>Uwagi do usługi door to door</Label>
                            <TextArea
                                value={formData.doorToDoor.notes}
                                onChange={(e) => onChange({
                                    doorToDoor: { ...formData.doorToDoor!, notes: e.target.value },
                                })}
                                placeholder="Dodatkowe informacje dotyczące odbioru lub dostarczenia pojazdu..."
                                style={{ width: '100%', boxSizing: 'border-box', minHeight: '80px' }}
                            />
                        </FieldGroup>
                    </SectionBody>
                )}
            </SectionCard>

            {/* ── Modals ────────────────────────────────────────────────── */}
            <Modal
                isOpen={showCustomerChoice}
                onClose={() => setShowCustomerChoice(false)}
                title="Aktualizacja danych klienta"
            >
                <p>Czy chcesz edytować dane istniejącego klienta czy dodać nowego?</p>
                <div style={{ display: 'flex', gap: 12, marginTop: 16, justifyContent: 'flex-end' }}>
                    <Button $variant="secondary" onClick={confirmCustomerEditExisting}>Edytuj istniejącego</Button>
                    <Button $variant="primary" onClick={confirmCustomerAddNew}>Dodaj jako nowego</Button>
                </div>
            </Modal>

            <Modal
                isOpen={showVehicleChoice}
                onClose={() => setShowVehicleChoice(false)}
                title="Aktualizacja pojazdu"
            >
                <p>Czy chcesz edytować dane istniejącego pojazdu czy dodać nowy?</p>
                <div style={{ display: 'flex', gap: 12, marginTop: 16, justifyContent: 'flex-end' }}>
                    <Button $variant="secondary" onClick={confirmVehicleEditExisting}>Edytuj istniejący</Button>
                    <Button $variant="primary" onClick={confirmVehicleAddNew}>Dodaj jako nowy</Button>
                </div>
            </Modal>

            <CustomerModal
                isOpen={isCustomerModalOpen}
                onClose={() => setIsCustomerModalOpen(false)}
                onSelect={handleCustomerSelect}
            />

            <CustomerDetailsModal
                isOpen={isCustomerDetailsModalOpen}
                onClose={() => setIsCustomerDetailsModalOpen(false)}
                customerId={formData.customerData.id || null}
                fallbackData={{
                    firstName: formData.customerData.firstName,
                    lastName: formData.customerData.lastName,
                    email: formData.customerData.email,
                    phone: formData.customerData.phone,
                    homeAddress: formData.homeAddress,
                    company: formData.company,
                }}
                onSave={handleCustomerDetailsSave}
            />

            <VehicleSearchModal
                isOpen={isVehicleModalOpen}
                onClose={() => setIsVehicleModalOpen(false)}
                onSelect={handleVehicleSelect}
                customerId={formData.customerData.id}
            />

            <VehicleDetailsModal
                isOpen={isVehicleDetailsModalOpen}
                onClose={() => setIsVehicleDetailsModalOpen(false)}
                vehicleId={formData.vehicleData?.id || null}
                fallbackData={{
                    brand: formData.vehicleData?.brand || '',
                    model: formData.vehicleData?.model || '',
                    yearOfProduction: formData.vehicleData?.yearOfProduction,
                    licensePlate: formData.vehicleData?.licensePlate || '',
                    color: formData.vehicleData?.color,
                }}
                onSave={handleVehicleDetailsSave}
            />

            <QuickColorModal
                isOpen={isColorModalOpen}
                onClose={() => setIsColorModalOpen(false)}
                onColorCreate={handleColorCreate}
            />
        </StepContainer>
    );
};
