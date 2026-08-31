import { useState, useEffect, useRef, useCallback, type ReactNode } from 'react';
import { capitalizeFirst } from '@/common/utils/capitalizeFirst';
import { createPortal } from 'react-dom';
import styled from 'styled-components';
import { useQueryClient, useQuery } from '@tanstack/react-query';
import { FormGrid, FieldGroup, Label, Input, TextArea, ErrorMessage } from '@/common/components/Form';
import { Toggle } from '@/common/components/Toggle';
import { EditableServicesTable } from './EditableServicesTable';
import { CustomerModal } from '@/modules/appointments/components/CustomerModal';
import { CustomerDetailsModal } from './CustomerDetailsModal';
import { VehicleSearchModal, type SelectedVehicle } from './VehicleSearchModal';
import { VehicleDetailsModal } from './VehicleDetailsModal';
import type { SelectedCustomer, AppointmentColor } from '@/modules/appointments/types';
import { ColorDropdown } from '@/common/components/ColorDropdown';
import { t } from '@/common/i18n';
import { fromDateToLocalInput } from '@/common/dateTime';
import { DateTimePicker } from '@/modules/calendar/components/DateTimePicker';
import type { CheckInFormData, ServiceLineItem } from '../types';
import {
    ModalShell,
    ModalHeader,
    ModalTitleGroup,
    ModalTitle,
    ModalSubtitle,
    ModalContent,
    ModalFooter,
    CloseBtn,
} from '@/common/components/ModalKit';
import { SharedButton } from '@/common/styles';
import { PhoneInput } from '@/common/components/PhoneInput';
import { BrandSelect, ModelSelect } from '@/modules/vehicles/components/BrandModelSelectors';
import { customerDetailApi } from '@/modules/customers/api/customerDetailApi';
import { gusApi } from '@/modules/gus/api/gusApi';
import { st } from '@/modules/statistics/components/StatisticsTheme';
import { QuickColorModal } from '@/modules/calendar/components/QuickColorModal';
import { appointmentColorApi } from '@/modules/appointment-colors/api/appointmentColorApi';
import { appointmentApi } from '@/modules/appointments/api/appointmentApi';
import { useDebounce } from '@/common/hooks';

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

const SectionTitleRow = styled.div<{ $keepInline?: boolean }>`
    display: flex;
    align-items: center;
    gap: 8px;
    min-width: 0;
    flex: 1;

    @media (max-width: 639px) {
        flex-basis: ${p => p.$keepInline ? 'auto' : '100%'};
    }
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
    overflow: hidden;
    text-overflow: ellipsis;
    max-width: 200px;

    @media (max-width: 479px) {
        max-width: 140px;
    }
`;

const SectionActions = styled.div`
    display: flex;
    align-items: center;
    gap: 6px;
    flex-shrink: 0;
    flex-wrap: wrap;

    @media (max-width: 639px) {
        width: 100%;
    }
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

    @media (max-width: 639px) {
        flex: 1;
        justify-content: center;
        padding: 8px 13px;
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

// ─── Customer autocomplete dropdown ──────────────────────────────────────────

const CustomerAutocompleteDropdown = styled.div`
    position: fixed;
    background: ${st.bgCard};
    border: 1px solid ${st.border};
    border-radius: ${st.radiusSm};
    box-shadow: ${st.shadowLg};
    z-index: 9999;
    overflow: hidden;
    overflow-y: auto;
`;

const CustomerDropdownItemBtn = styled.button`
    display: flex;
    flex-direction: column;
    width: 100%;
    padding: 10px 14px;
    border: none;
    background: none;
    text-align: left;
    cursor: pointer;
    transition: background ${st.transition};
    gap: 2px;

    & + & {
        border-top: 1px solid ${st.border};
    }

    &:hover {
        background: ${st.bgCardAlt};
    }
`;

const CustomerDropdownItemName = styled.span`
    font-size: 13px;
    font-weight: 600;
    color: ${st.text};
`;

const CustomerDropdownItemSub = styled.span`
    font-size: 11px;
    color: ${st.textMuted};
`;

// ─── Vehicle suggestions panel ────────────────────────────────────────────────

const VehicleSuggestionsWrap = styled.div`
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 8px;
    margin-bottom: 14px;
    padding: 10px 12px;
    background: ${st.accentBlueDim};
    border: 1px solid rgba(59, 130, 246, 0.2);
    border-radius: ${st.radiusSm};
`;

const VehicleSuggestionLabel = styled.span`
    font-size: 12px;
    font-weight: 600;
    color: ${st.textMuted};
    width: 100%;
    margin-bottom: 2px;
`;

const VehicleSuggestionChip = styled.button`
    display: inline-flex;
    align-items: center;
    gap: 5px;
    padding: 5px 12px;
    border: 1.5px solid ${st.accentBlue};
    border-radius: ${st.radiusFull};
    background: ${st.bgCard};
    color: ${st.accentBlue};
    font-size: 12px;
    font-weight: 600;
    cursor: pointer;
    transition: all ${st.transition};

    &:hover {
        background: ${st.accentBlueDim};
    }
`;

// ─── Customer-swap decision (what happens to the car) ─────────────────────────

const DecisionIntro = styled.p`
    margin: 0;
    font-size: 13.5px;
    color: ${st.textSecondary};
    line-height: 1.55;
`;

const DecisionOptions = styled.div`
    display: flex;
    flex-direction: column;
    gap: 10px;
`;

const DecisionOption = styled.button`
    display: flex;
    align-items: flex-start;
    gap: 12px;
    width: 100%;
    padding: 14px 16px;
    text-align: left;
    font-family: inherit;
    background: ${st.bgCard};
    border: 1.5px solid ${st.border};
    border-radius: 12px;
    cursor: pointer;
    transition: background 150ms ease, border-color 150ms ease;

    &:hover {
        background: #F8FAFC;
        border-color: ${st.accentBlue};
    }

    &:focus-visible {
        outline: none;
        border-color: ${st.accentBlue};
        box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.18);
    }
`;

const DecisionOptionIcon = styled.span`
    flex-shrink: 0;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 32px;
    height: 32px;
    border-radius: 10px;
    background: ${st.accentBlueDim};
    color: ${st.accentBlue};

    svg { width: 16px; height: 16px; }
`;

const DecisionOptionBody = styled.span`
    display: flex;
    flex-direction: column;
    gap: 3px;
    min-width: 0;
`;

const DecisionOptionTitle = styled.span`
    font-size: 14px;
    font-weight: 600;
    color: ${st.text};
    line-height: 1.35;
`;

const DecisionOptionDesc = styled.span`
    font-size: 12.5px;
    color: ${st.textMuted};
    line-height: 1.45;
`;

/** Amber reminder shown in the vehicle section while the swap decision is unanswered. */
const DecisionBanner = styled.div`
    display: flex;
    align-items: center;
    gap: 10px;
    flex-wrap: wrap;
    margin-bottom: 14px;
    padding: 10px 12px;
    background: ${st.accentAmberDim};
    border: 1px solid rgba(245, 158, 11, 0.35);
    border-radius: ${st.radiusSm};
    font-size: 12.5px;
    color: ${st.textSecondary};
    line-height: 1.45;
`;

/** Blue confirmation of the "keep the car, add the customer as an owner" decision. */
const DecisionResolvedNote = styled(DecisionBanner)`
    background: ${st.accentBlueDim};
    border-color: rgba(59, 130, 246, 0.28);
`;

const DecisionBannerBtn = styled.button`
    margin-left: auto;
    padding: 5px 12px;
    border: 1.5px solid ${st.accentBlue};
    border-radius: ${st.radiusFull};
    background: ${st.bgCard};
    color: ${st.accentBlue};
    font-family: inherit;
    font-size: 12px;
    font-weight: 600;
    cursor: pointer;
    transition: background ${st.transition};

    &:hover { background: ${st.accentBlueDim}; }
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


// ─── Props ────────────────────────────────────────────────────────────────────

/**
 * Komunikat błędu pod polem, oznaczony kotwicą `data-error-anchor`.
 * Kreator po nieudanej walidacji przewija do pierwszej takiej kotwiki w
 * kolejności DOM — czyli w kolejności pól na formularzu, a nie w kolejności
 * komunikatów na liście w stopce.
 */
const FieldError = ({ children }: { children: ReactNode }) => (
    <ErrorMessage data-error-anchor="">{children}</ErrorMessage>
);

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
            // creation failure is silent; user can retry by opening the modal again
        }
    };

    const startInputRef = useRef<HTMLDivElement | null>(null);
    const endInputRef = useRef<HTMLDivElement | null>(null);

    const [isHomeAddressOpen, setIsHomeAddressOpen] = useState(false);
    const [isCompanyOpen, setIsCompanyOpen] = useState(false);
    const [isGusLoading, setIsGusLoading] = useState(false);
    const [gusError, setGusError] = useState<string | null>(null);

    // ─── Customer autocomplete ─────────────────────────────────────────────────
    const firstNameFieldRef = useRef<HTMLDivElement>(null);
    const lastNameFieldRef = useRef<HTMLDivElement>(null);
    const phoneFieldRef = useRef<HTMLDivElement>(null);
    const activeCustomerFieldRef = useRef<HTMLDivElement | null>(null);
    const customerJustSelectedRef = useRef(false);
    const customerBlurTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const vehicleAutoSelectedRef = useRef(false);

    const [customerAutocompleteOpen, setCustomerAutocompleteOpen] = useState(false);
    /*
     * Po czym szukamy klienta zależy od tego, w którym polu stoi kursor. Telefonu nie
     * da się dokleić do imienia i nazwiska w jedno zapytanie: backend porównuje `search`
     * jednym `contains`, więc „Jan Kowalski 123456789" nie pasowałoby do niczego.
     */
    const [customerSearchField, setCustomerSearchField] = useState<'name' | 'phone'>('name');
    // Deklarowane tutaj, a nie niżej razem z resztą stanu wyboru klienta, bo
    // zapytanie po telefonie (poniżej) czyta wpisywany numer właśnie stąd.
    const [pendingCustomerUpdates, setPendingCustomerUpdates] = useState<Partial<CheckInFormData['customerData']> | null>(null);
    const [customerDropdownPos, setCustomerDropdownPos] = useState<{ top?: number; bottom?: number; left: number; width: number; maxHeight: number } | null>(null);
    const [selectedCustomerIdForVehicles, setSelectedCustomerIdForVehicles] = useState<string | undefined>(undefined);

    // Swapping the customer on a visit that already has a car leaves one open question the
    // form cannot answer on its own: is it a different car too, or the same car with a new
    // owner? Ask it once, right after the swap, and keep asking until it is answered.
    const [showCustomerSwapDecision, setShowCustomerSwapDecision] = useState(false);
    const [customerSwapDecisionPending, setCustomerSwapDecisionPending] = useState(false);
    // Walk-ins start with no "initial" record, so a swap there can only be recognised by
    // remembering that the operator already had someone/something else picked.
    const [customerSwappedInSession, setCustomerSwappedInSession] = useState(false);
    const [vehicleSwappedInSession, setVehicleSwappedInSession] = useState(false);

    const customerNameQuery = [formData.customerData.firstName, formData.customerData.lastName]
        .filter(s => s.trim().length > 0).join(' ').trim();

    /*
     * Numer trzymamy w formie „+48 123 456 789", a w bazie ten sam klient może być
     * zapisany i z prefiksem, i bez. Szukamy więc po samych cyfrach części krajowej —
     * to jedyny fragment wspólny dla obu zapisów (backend przed porównaniem i tak
     * usuwa spacje).
     */
    const customerPhoneQuery = ((pendingCustomerUpdates?.phone ?? formData.customerData.phone) || '')
        .replace(/^\+\d{1,3}/, '')
        .replace(/\D/g, '');

    const customerSearchQuery = customerSearchField === 'phone' ? customerPhoneQuery : customerNameQuery;
    // Trzy cyfry to minimum, przy którym podpowiedzi zawężają cokolwiek; przy dwóch
    // dostawalibyśmy pół bazy.
    const customerSearchMinLength = customerSearchField === 'phone' ? 3 : 2;
    const debouncedCustomerSearch = useDebounce(customerSearchQuery, 300);

    const { data: foundCustomers = [] } = useQuery({
        queryKey: ['appointments', 'customers', 'search', debouncedCustomerSearch],
        queryFn: () => appointmentApi.searchCustomers(debouncedCustomerSearch),
        enabled: debouncedCustomerSearch.length >= customerSearchMinLength,
        staleTime: 30_000,
    });

    const { data: customerVehicles = [] } = useQuery({
        queryKey: ['appointments', 'customers', selectedCustomerIdForVehicles, 'vehicles'],
        queryFn: () => appointmentApi.getCustomerVehicles(selectedCustomerIdForVehicles!),
        enabled: !!selectedCustomerIdForVehicles,
    });

    const showCustomerAutocomplete = customerAutocompleteOpen && !customerJustSelectedRef.current
        && debouncedCustomerSearch.length >= customerSearchMinLength && foundCustomers.length > 0;

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
    }, [formData.homeAddress, formData.company]);

    // Position the customer autocomplete dropdown below (or above) the focused input field
    useEffect(() => {
        if (!showCustomerAutocomplete) {
            setCustomerDropdownPos(null);
            return;
        }
        const el = activeCustomerFieldRef.current;
        if (!el) return;
        const update = () => {
            const r = el.getBoundingClientRect();
            const vvHeight = window.visualViewport?.height ?? window.innerHeight;
            const spaceBelow = vvHeight - r.bottom - 4;
            const spaceAbove = r.top - 4;
            const maxH = 280;
            if (spaceBelow < 120 && spaceAbove > spaceBelow) {
                setCustomerDropdownPos({ bottom: vvHeight - r.top + 4, left: r.left, width: r.width, maxHeight: Math.min(maxH, spaceAbove) });
            } else {
                setCustomerDropdownPos({ top: r.bottom + 4, left: r.left, width: r.width, maxHeight: Math.min(maxH, spaceBelow) });
            }
        };
        update();
        window.addEventListener('scroll', update, true);
        window.addEventListener('resize', update);
        window.visualViewport?.addEventListener('resize', update);
        window.visualViewport?.addEventListener('scroll', update);
        return () => {
            window.removeEventListener('scroll', update, true);
            window.removeEventListener('resize', update);
            window.visualViewport?.removeEventListener('resize', update);
            window.visualViewport?.removeEventListener('scroll', update);
        };
    }, [showCustomerAutocomplete]);

    // Auto-select vehicle when customer has exactly one vehicle
    useEffect(() => {
        if (!selectedCustomerIdForVehicles || vehicleAutoSelectedRef.current) return;
        if (customerVehicles.length !== 1) return;
        // While the swap question is open the car is the operator's call, not a default.
        if (customerSwapDecisionPending) return;
        vehicleAutoSelectedRef.current = true;
        const v = customerVehicles[0];
        onChange({
            vehicleData: {
                id: v.id,
                brand: v.brand,
                model: v.model,
                yearOfProduction: v.year,
                licensePlate: v.licensePlate || undefined,
            },
            isNewVehicle: false,
        });
        setVehicleChoiceMade(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [customerVehicles, selectedCustomerIdForVehicles]);

    const [showCustomerChoice, setShowCustomerChoice] = useState(false);
    const [customerChoiceMade, setCustomerChoiceMade] = useState(false);
    const [customerPromptScheduled, setCustomerPromptScheduled] = useState(false);

    const [showVehicleChoice, setShowVehicleChoice] = useState(false);
    const [vehicleChoiceMade, setVehicleChoiceMade] = useState(false);
    const [pendingVehicleUpdates, setPendingVehicleUpdates] = useState<Partial<NonNullable<CheckInFormData['vehicleData']>> | null>(null);
    const [vehiclePromptScheduled, setVehiclePromptScheduled] = useState(false);
    // Track whether the vehicle was already pre-selected on mount to skip the
    // "edit existing vs. add new" prompt, without touching vehicleChoiceMade,
    // so the badge is not shown until the user explicitly interacts.
    const vehicleWasPreSelected = useRef(!!formData.vehicleData?.id && !formData.isNewVehicle);

    // "Aktualizujesz dane" is only true while the record is the one we started from. Once a
    // different customer or car is picked, saying that is plainly wrong — the operator swapped
    // the record, they did not edit the old one.
    const customerReplaced = customerSwappedInSession || (!!initialCustomerData?.id
        && (formData.isNewCustomer || formData.customerData.id !== initialCustomerData.id));

    const vehicleReplaced = vehicleSwappedInSession || (!!initialVehicleData?.id
        && (formData.isNewVehicle || formData.vehicleData?.id !== initialVehicleData.id));

    const customerBadge = formData.isNewCustomer
        ? (customerReplaced ? 'Zmieniono klienta na nowego' : 'Dodasz nowego klienta')
        : customerReplaced
            ? 'Wybrano innego klienta'
            : (formData.customerData.id ? 'Aktualizujesz dane istniejącego klienta' : undefined);

    const vehicleBadge = (formData.vehicleData === null)
        ? undefined
        : (formData.isNewVehicle || !formData.vehicleData?.id)
            ? (vehicleReplaced ? 'Zmieniono pojazd na nowy' : 'Dodasz nowy pojazd')
            : vehicleReplaced
                ? 'Wybrano inny pojazd'
                : 'Aktualizujesz dane istniejącego pojazdu';

    const hasCustomer = !!formData.customerData.id
        || !!(formData.customerData.firstName || formData.customerData.lastName);
    const hasVehicle = !!formData.vehicleData
        && !!(formData.vehicleData.id || formData.vehicleData.brand || formData.vehicleData.model);

    const newCustomerLabel = [formData.customerData.firstName, formData.customerData.lastName]
        .filter(Boolean).join(' ').trim() || 'nowo wybrany klient';

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
            vehicleOwnershipAction: null,
        });
        setCustomerChoiceMade(false);
        setPendingCustomerUpdates(null);
        setShowCustomerChoice(false);
        setCustomerPromptScheduled(false);
        setCustomerSwappedInSession(false);
        setCustomerSwapDecisionPending(false);
        setShowCustomerSwapDecision(false);
    };

    const handleResetVehicle = () => {
        onChange({
            vehicleData: (initialVehicleData === undefined) ? formData.vehicleData : (initialVehicleData ?? null),
            isNewVehicle: initialIsNewVehicle ?? false,
            vehicleOwnershipAction: null,
        });
        setVehicleChoiceMade(false);
        setPendingVehicleUpdates(null);
        setShowVehicleChoice(false);
        setVehiclePromptScheduled(false);
        setVehicleSwappedInSession(false);
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

    const handleCustomerInputFocus = (
        fieldRef: React.RefObject<HTMLDivElement | null>,
        field: 'name' | 'phone' = 'name',
    ) => {
        if (customerJustSelectedRef.current) return;
        activeCustomerFieldRef.current = fieldRef.current;
        setCustomerSearchField(field);
        setCustomerAutocompleteOpen(true);
    };

    const handleCustomerInputBlur = () => {
        if (customerBlurTimerRef.current) clearTimeout(customerBlurTimerRef.current);
        customerBlurTimerRef.current = setTimeout(() => {
            setCustomerAutocompleteOpen(false);
        }, 200);
    };

    const handleCustomerSelectFromAutocomplete = async (customer: { id: string; firstName: string | null; lastName: string | null; phone: string | null; email: string | null }) => {
        customerJustSelectedRef.current = true;
        setCustomerAutocompleteOpen(false);
        setCustomerDropdownPos(null);
        if (customerBlurTimerRef.current) {
            clearTimeout(customerBlurTimerRef.current);
            customerBlurTimerRef.current = null;
        }
        vehicleAutoSelectedRef.current = false;
        setSelectedCustomerIdForVehicles(undefined);
        await handleCustomerSelect({
            id: customer.id,
            firstName: customer.firstName || '',
            lastName: customer.lastName || '',
            phone: customer.phone || '',
            email: customer.email || '',
            isNew: false,
        });
        setSelectedCustomerIdForVehicles(customer.id || undefined);
        setTimeout(() => { customerJustSelectedRef.current = false; }, 500);
    };

    const handleCustomerSelect = async (customer: SelectedCustomer) => {
        // Read before onChange: this is who the visit belonged to a moment ago.
        const previousCustomerId = formData.customerData.id;
        const swappedToDifferentCustomer = !!previousCustomerId
            && (customer.isNew || !customer.id || customer.id !== previousCustomerId);
        const keepsExistingVehicle = !!formData.vehicleData?.id
            && !formData.isNewVehicle
            && !formData.vehicleData.id.startsWith('temp-');
        const needsVehicleDecision = swappedToDifferentCustomer && keepsExistingVehicle;

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
            } catch {
                onChange(baseCustomerData);
            }
        } else {
            onChange(baseCustomerData);
        }
        setCustomerChoiceMade(true);
        setIsCustomerModalOpen(false);

        if (swappedToDifferentCustomer) {
            setCustomerSwappedInSession(true);
        }

        if (needsVehicleDecision) {
            // A decision made for the previous customer says nothing about this one.
            onChange({ vehicleOwnershipAction: null });
            setCustomerSwapDecisionPending(true);
            setShowCustomerSwapDecision(true);
        }
    };

    const handleVehicleSelect = (vehicle: SelectedVehicle) => {
        const previousVehicleId = formData.vehicleData?.id;
        if (previousVehicleId && (vehicle.isNew || vehicle.id !== previousVehicleId)) {
            setVehicleSwappedInSession(true);
        }
        // Picking an existing car that the visit's customer does not own yet would otherwise
        // leave the two records unlinked. Write the customer on as an extra owner and say so
        // in the section, rather than doing it silently or not at all.
        const customerId = formData.customerData.id;
        const needsOwnerLink = !vehicle.isNew
            && !!vehicle.id
            && !!customerId
            && !formData.isNewCustomer
            && !!vehicle.ownerCustomerIds
            && !vehicle.ownerCustomerIds.includes(customerId);

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
            vehicleOwnershipAction: needsOwnerLink ? 'ADD_CO_OWNER' : null,
        });
        setVehicleChoiceMade(true);
        setIsVehicleModalOpen(false);
        setCustomerSwapDecisionPending(false);
    };

    /** "Podmieniamy pojazd" — send the operator straight to the new customer's cars. */
    const chooseDifferentVehicle = () => {
        onChange({ vehicleOwnershipAction: null });
        setShowCustomerSwapDecision(false);
        setIsVehicleModalOpen(true);
    };

    /** "Zostawiamy pojazd" — the new customer is written onto the car as an extra owner. */
    const keepVehicleAndAddOwner = () => {
        onChange({ vehicleOwnershipAction: 'ADD_CO_OWNER' });
        setShowCustomerSwapDecision(false);
        setCustomerSwapDecisionPending(false);
        setVehicleChoiceMade(true);
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
                                    const updates: Partial<CheckInFormData> = { visitStartAt: start };
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
                            {errors.color && <FieldError>{errors.color}</FieldError>}
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
                            {(customerChoiceMade || customerReplaced) && customerBadge && (
                                <StatusPill>{customerBadge}</StatusPill>
                            )}
                        </SectionLabel>
                    </SectionTitleRow>
                    <SectionActions>
                        <ActionBtn onClick={handleResetCustomer} disabled={!hasCustomerChanges}>
                            Wycofaj zmiany
                        </ActionBtn>
                        <ActionBtn $primary onClick={() => setIsCustomerModalOpen(true)}>
                            {hasCustomer ? 'Zmień klienta' : 'Wybierz klienta'}
                        </ActionBtn>
                    </SectionActions>
                </SectionHead>
                <SectionBody>
                    {errors.customer && <FieldError>{errors.customer}</FieldError>}

                    <FormGrid>
                        <div ref={firstNameFieldRef}>
                        <FieldGroup>
                            <Label>{t.checkin.verification.firstName}</Label>
                            <Input
                                value={(pendingCustomerUpdates?.firstName ?? formData.customerData.firstName) || ''}
                                onChange={(e) => handleCustomerFieldChange({ firstName: capitalizeFirst(e.target.value) })}
                                onBlur={() => { handleCustomerFieldBlur(); handleCustomerInputBlur(); }}
                                onFocus={() => handleCustomerInputFocus(firstNameFieldRef)}
                                autoComplete="new-password"
                            />
                            {errors.firstName && <FieldError>{errors.firstName}</FieldError>}
                        </FieldGroup>
                        </div>

                        <div ref={lastNameFieldRef}>
                        <FieldGroup>
                            <Label>{t.checkin.verification.lastName}</Label>
                            <Input
                                value={(pendingCustomerUpdates?.lastName ?? formData.customerData.lastName) || ''}
                                onChange={(e) => handleCustomerFieldChange({ lastName: capitalizeFirst(e.target.value) })}
                                onBlur={() => { handleCustomerFieldBlur(); handleCustomerInputBlur(); }}
                                onFocus={() => handleCustomerInputFocus(lastNameFieldRef)}
                                autoComplete="new-password"
                            />
                            {errors.lastName && <FieldError>{errors.lastName}</FieldError>}
                        </FieldGroup>
                        </div>

                        <div ref={phoneFieldRef}>
                        <FieldGroup>
                            <Label>{t.checkin.verification.phone}</Label>
                            <PhoneInput
                                variant="legacy"
                                onFocus={() => handleCustomerInputFocus(phoneFieldRef, 'phone')}
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
                                onBlur={() => { handleCustomerFieldBlur(); handleCustomerInputBlur(); }}
                                hasError={!!errors.phone}
                            />
                            {errors.phone && <FieldError>{errors.phone}</FieldError>}
                        </FieldGroup>
                        </div>

                        <FieldGroup>
                            <Label>{t.checkin.verification.email}</Label>
                            <Input
                                type="email"
                                value={(pendingCustomerUpdates?.email ?? formData.customerData.email) || ''}
                                onChange={(e) => handleCustomerFieldChange({ email: e.target.value })}
                                onBlur={handleCustomerFieldBlur}
                            />
                            {errors.email && <FieldError>{errors.email}</FieldError>}
                        </FieldGroup>
                    </FormGrid>

                    {errors.contact && <FieldError>{errors.contact}</FieldError>}

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
                                                    Pobieranie...
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
                                        {errors.handoffFirstName && <FieldError>{errors.handoffFirstName}</FieldError>}
                                    </FieldGroup>
                                    <FieldGroup>
                                        <Label>Nazwisko osoby przekazującej *</Label>
                                        <Input
                                            value={formData.vehicleHandoff.contactPerson.lastName}
                                            onChange={(e) => onChange({ vehicleHandoff: { ...formData.vehicleHandoff, contactPerson: { ...formData.vehicleHandoff.contactPerson, lastName: e.target.value } } })}
                                        />
                                        {errors.handoffLastName && <FieldError>{errors.handoffLastName}</FieldError>}
                                    </FieldGroup>
                                    <FieldGroup>
                                        <Label>Telefon</Label>
                                        <PhoneInput
                                            variant="legacy"
                                            hasError={!!errors.handoffPhone}
                                            value={formData.vehicleHandoff.contactPerson.phone}
                                            onChange={(value) => onChange({ vehicleHandoff: { ...formData.vehicleHandoff, contactPerson: { ...formData.vehicleHandoff.contactPerson, phone: value || '' } } })}
                                        />
                                        {errors.handoffPhone && <FieldError>{errors.handoffPhone}</FieldError>}
                                    </FieldGroup>
                                    <FieldGroup>
                                        <Label>E-mail</Label>
                                        <Input
                                            type="email"
                                            value={formData.vehicleHandoff.contactPerson.email}
                                            onChange={(e) => onChange({ vehicleHandoff: { ...formData.vehicleHandoff, contactPerson: { ...formData.vehicleHandoff.contactPerson, email: e.target.value } } })}
                                        />
                                        {errors.handoffEmail && <FieldError>{errors.handoffEmail}</FieldError>}
                                    </FieldGroup>
                                </FormGrid>
                            )}
                            {formData.vehicleHandoff.isHandedOffByOtherPerson && errors.handoffContact && (
                                <FieldError>{errors.handoffContact}</FieldError>
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
                            {(vehicleChoiceMade || formData.isNewVehicle || vehicleReplaced) && vehicleBadge && (
                                <StatusPill>{vehicleBadge}</StatusPill>
                            )}
                        </SectionLabel>
                    </SectionTitleRow>
                    <SectionActions>
                        <ActionBtn onClick={handleResetVehicle} disabled={!hasVehicleChanges}>
                            Wycofaj zmiany
                        </ActionBtn>
                        <ActionBtn $primary onClick={() => setIsVehicleModalOpen(true)}>
                            {hasVehicle ? 'Zmień pojazd' : 'Wybierz pojazd'}
                        </ActionBtn>
                    </SectionActions>
                </SectionHead>
                <SectionBody>
                    {errors.vehicle && <FieldError>{errors.vehicle}</FieldError>}

                    {customerSwapDecisionPending && (
                        <DecisionBanner>
                            Zmieniono klienta wizyty — zdecyduj, co dzieje się z pojazdem.
                            <DecisionBannerBtn type="button" onClick={() => setShowCustomerSwapDecision(true)}>
                                Wybierz
                            </DecisionBannerBtn>
                        </DecisionBanner>
                    )}

                    {!customerSwapDecisionPending && formData.vehicleOwnershipAction === 'ADD_CO_OWNER' && (
                        <DecisionResolvedNote>
                            {newCustomerLabel} zostanie dopisany jako właściciel tego pojazdu.
                            <DecisionBannerBtn
                                type="button"
                                onClick={() => onChange({ vehicleOwnershipAction: null })}
                            >
                                Nie dopisuj
                            </DecisionBannerBtn>
                        </DecisionResolvedNote>
                    )}

                    {selectedCustomerIdForVehicles && customerVehicles.length > 1 && !vehicleChoiceMade && (
                        <VehicleSuggestionsWrap>
                            <VehicleSuggestionLabel>Pojazdy klienta, kliknij aby wybrać:</VehicleSuggestionLabel>
                            {customerVehicles.map((v) => (
                                <VehicleSuggestionChip
                                    key={v.id}
                                    type="button"
                                    onClick={() => handleVehicleSelect({
                                        id: v.id,
                                        brand: v.brand,
                                        model: v.model,
                                        yearOfProduction: v.year,
                                        licensePlate: v.licensePlate || undefined,
                                        isNew: false,
                                    })}
                                >
                                    {v.brand} {v.model}
                                    {v.licensePlate && <span style={{ opacity: 0.65 }}>({v.licensePlate})</span>}
                                </VehicleSuggestionChip>
                            ))}
                        </VehicleSuggestionsWrap>
                    )}

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
                                {errors.mileage && <FieldError>{errors.mileage}</FieldError>}
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
                    {errors.services && <FieldError>{errors.services}</FieldError>}
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
                            onChange={(e) => onChange({ technicalState: { ...formData.technicalState, inspectionNotes: capitalizeFirst(e.target.value) } })}
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
                            onChange={(e) => onChange({ technicalState: { ...formData.technicalState, protocolNotes: capitalizeFirst(e.target.value) } })}
                            placeholder={t.checkin.technical.protocolNotesPlaceholder}
                            style={{ width: '100%', boxSizing: 'border-box', minHeight: '100px' }}
                        />
                    </div>
                </SectionBody>
            </SectionCard>

            {/* ── 7. Door to Door ───────────────────────────────────────── */}
            <SectionCard>
                <SectionHead>
                    <SectionTitleRow $keepInline>
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

            {/* ── Customer autocomplete dropdown ───────────────────────── */}
            {showCustomerAutocomplete && customerDropdownPos && createPortal(
                <CustomerAutocompleteDropdown
                    style={{ top: customerDropdownPos.top, bottom: customerDropdownPos.bottom, left: customerDropdownPos.left, width: customerDropdownPos.width, maxHeight: customerDropdownPos.maxHeight }}
                    onMouseDown={(e) => e.preventDefault()}
                >
                    {foundCustomers.map((c) => (
                        <CustomerDropdownItemBtn
                            key={c.id}
                            type="button"
                            onClick={() => handleCustomerSelectFromAutocomplete(c)}
                        >
                            <CustomerDropdownItemName>
                                {[c.firstName, c.lastName].filter(Boolean).join(' ') || '(Brak danych)'}
                            </CustomerDropdownItemName>
                            {(c.phone || c.email) && (
                                <CustomerDropdownItemSub>{c.phone || c.email}</CustomerDropdownItemSub>
                            )}
                        </CustomerDropdownItemBtn>
                    ))}
                </CustomerAutocompleteDropdown>,
                document.body
            )}

            {/* ── Modals ────────────────────────────────────────────────── */}
            <ModalShell
                isOpen={showCustomerChoice}
                onClose={() => setShowCustomerChoice(false)}
                size="md"
            >
                <ModalHeader>
                    <ModalTitleGroup>
                        <ModalTitle>Aktualizacja danych klienta</ModalTitle>
                        <ModalSubtitle>
                            Zmieniasz dane klienta, który jest już w bazie. Zapisać zmianę u niego,
                            czy założyć osobną kartotekę?
                        </ModalSubtitle>
                    </ModalTitleGroup>
                    <CloseBtn onClick={() => setShowCustomerChoice(false)} />
                </ModalHeader>
                <ModalFooter>
                    <SharedButton $variant="secondary" onClick={confirmCustomerAddNew}>
                        Dodaj jako nowego
                    </SharedButton>
                    <SharedButton $variant="primary" onClick={confirmCustomerEditExisting}>
                        Edytuj istniejącego
                    </SharedButton>
                </ModalFooter>
            </ModalShell>

            <ModalShell
                isOpen={showVehicleChoice}
                onClose={() => setShowVehicleChoice(false)}
                size="md"
            >
                <ModalHeader>
                    <ModalTitleGroup>
                        <ModalTitle>Aktualizacja pojazdu</ModalTitle>
                        <ModalSubtitle>
                            Zmieniasz dane pojazdu, który jest już w bazie. Zapisać zmianę w nim,
                            czy dodać osobny pojazd?
                        </ModalSubtitle>
                    </ModalTitleGroup>
                    <CloseBtn onClick={() => setShowVehicleChoice(false)} />
                </ModalHeader>
                <ModalFooter>
                    <SharedButton $variant="secondary" onClick={confirmVehicleAddNew}>
                        Dodaj jako nowy
                    </SharedButton>
                    <SharedButton $variant="primary" onClick={confirmVehicleEditExisting}>
                        Edytuj istniejący
                    </SharedButton>
                </ModalFooter>
            </ModalShell>

            {/*
              * Raised right after the visit's customer is swapped while a car is still attached.
              * Both answers are real operations, so neither is styled as the confirm button —
              * they are two equal choices, and closing the window leaves the question open
              * (a banner in the vehicle section brings it back).
              */}
            <ModalShell
                isOpen={showCustomerSwapDecision}
                onClose={() => setShowCustomerSwapDecision(false)}
                size="lg"
            >
                <ModalHeader>
                    <ModalTitleGroup>
                        <ModalTitle>Zmieniono klienta — co z pojazdem?</ModalTitle>
                        <ModalSubtitle>
                            Do wizyty przypisany jest{' '}
                            {[formData.vehicleData?.brand, formData.vehicleData?.model].filter(Boolean).join(' ') || 'pojazd'}
                            {formData.vehicleData?.licensePlate ? ` (${formData.vehicleData.licensePlate})` : ''}.
                        </ModalSubtitle>
                    </ModalTitleGroup>
                    <CloseBtn onClick={() => setShowCustomerSwapDecision(false)} />
                </ModalHeader>
                <ModalContent>
                    <DecisionIntro>
                        Wybierz, co ma się stać z pojazdem po zmianie klienta na {newCustomerLabel}.
                    </DecisionIntro>
                    <DecisionOptions>
                        <DecisionOption type="button" onClick={chooseDifferentVehicle}>
                            <DecisionOptionIcon>
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M4 8h13l-2.5-2.5M20 16H7l2.5 2.5" />
                                </svg>
                            </DecisionOptionIcon>
                            <DecisionOptionBody>
                                <DecisionOptionTitle>Podmień pojazd na inny</DecisionOptionTitle>
                                <DecisionOptionDesc>
                                    Wybierzesz pojazd z listy pojazdów nowego klienta albo dodasz nowy.
                                    Obecny pojazd zostanie odpięty od tej wizyty.
                                </DecisionOptionDesc>
                            </DecisionOptionBody>
                        </DecisionOption>

                        <DecisionOption type="button" onClick={keepVehicleAndAddOwner}>
                            <DecisionOptionIcon>
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                                    <circle cx="9" cy="7" r="4" />
                                    <path d="M19 8v6M22 11h-6" />
                                </svg>
                            </DecisionOptionIcon>
                            <DecisionOptionBody>
                                <DecisionOptionTitle>Zostaw pojazd i dopisz właściciela</DecisionOptionTitle>
                                <DecisionOptionDesc>
                                    Wizyta zostaje przy tym samym pojeździe, a {newCustomerLabel} zostanie
                                    dopisany do niego jako kolejny właściciel. Dotychczasowi właściciele
                                    zostają bez zmian.
                                </DecisionOptionDesc>
                            </DecisionOptionBody>
                        </DecisionOption>
                    </DecisionOptions>
                </ModalContent>
                <ModalFooter>
                    <SharedButton $variant="ghost" onClick={() => setShowCustomerSwapDecision(false)}>
                        Zdecyduję później
                    </SharedButton>
                </ModalFooter>
            </ModalShell>

            <CustomerModal
                isOpen={isCustomerModalOpen}
                onClose={() => setIsCustomerModalOpen(false)}
                onSelect={handleCustomerSelect}
                currentCustomerId={formData.customerData.id || undefined}
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
                customerId={formData.customerData.id || undefined}
                currentVehicleId={formData.vehicleData?.id || undefined}
                isReplacing={hasVehicle}
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
