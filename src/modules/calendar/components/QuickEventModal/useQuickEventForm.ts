import { useState, useEffect, useRef, useImperativeHandle } from 'react';
import type React from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/common/components/Toast';
import { useCapability } from '@/modules/subscription';
import { useCustomerVehicles, useCustomerSearch as useAppointmentCustomerSearch } from '@/modules/appointments/hooks/useAppointmentForm';
import type { SelectedCustomer, SelectedVehicle, RecurrenceRuleRequest } from '@/modules/appointments/types';
import { DEFAULT_VEHICLE_KIND, normalizeVehicleKind, type VehicleKind } from '@/modules/vehicles/vehicleKind';
import { pickInitialColorId } from '@/modules/appointment-colors';
import { APPOINTMENT_COLORS_KEY, appointmentColorsQuery } from '@/modules/appointment-colors/api/appointmentColorsQuery';
import { appointmentColorApi } from '@/modules/appointment-colors/api/appointmentColorApi';
import { useDebounce } from '@/common/hooks';
import { useDefaultChoice, useMessageDefaults } from '@/modules/message-templates/hooks/useMessageDefaults';
import { useMessageAutomationAccess } from '@/modules/message-templates/hooks/useMessageAutomationAccess';
import { smsAutomationQuery } from '@/modules/sms-settings/api/smsAutomationQuery';
import { STALE_TIME } from '@/core/queryStaleTime';
import { fetchWholeCatalog } from '@/modules/services/api/fetchWholeCatalog';
import { formatDateTimeLocal, formatDate } from './helpers';
import { catalogLinePrices, manualLinePrices } from './linePrices';
import { grossToNet } from '@/common/utils/priceAdjustment';
import type { DoorToDoorInfo } from '@/modules/visits/types';
import type { ManualPriceInput } from '../PriceInputModal';

const EMPTY_DOOR_TO_DOOR: DoorToDoorInfo = {
    enabled: false,
    pickupAddress: { city: '', street: '' },
    deliveryAddress: { city: '', street: '' },
    notes: '',
};

const capitalizeWords = (value: string): string =>
    value.replace(/\S+/g, word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase());

const formatMainPhone = (value: string): string => {
    const digits = value.replace(/\D/g, '').slice(0, 12);
    return digits.replace(/(\d{3})(?=\d)/g, '$1 ');
};

const parsePhone = (full: string): { prefix: string; main: string } => {
    const trimmed = full.trim();
    if (!trimmed) return { prefix: '+48', main: '' };
    if (trimmed.startsWith('+')) {
        const spaceIdx = trimmed.indexOf(' ');
        if (spaceIdx > 0) {
            return { prefix: trimmed.slice(0, spaceIdx), main: formatMainPhone(trimmed.slice(spaceIdx + 1)) };
        }
        // No space, assume 3-char country code (+48, +44, ...) if long enough
        if (trimmed.length > 3) {
            return { prefix: trimmed.slice(0, 3), main: formatMainPhone(trimmed.slice(3)) };
        }
        return { prefix: trimmed, main: '' };
    }
    return { prefix: '+48', main: formatMainPhone(trimmed) };
};

/**
 * Ten sam numer niezależnie od spacji. Kartoteka trzyma „+48123456789", pola formularza
 * „+48 123 456 789" - porównanie znak po znaku widziało zmianę tam, gdzie nikt niczego
 * nie ruszał, i pytało „Zmienić dane klienta?" o nic.
 */
const samePhone = (a: string | undefined, b: string | undefined): boolean =>
    (a ?? '').replace(/\s/g, '') === (b ?? '').replace(/\s/g, '');
import type {
    Service,
    AppointmentColor,
    QuickEventFormData,
    QuickEventModalRef,
    EventCreationData,
    QuickEventInitialData,
    ServiceAdjustment,
} from './types';
import { firstSubmitErrorKey, submitErrorMessage } from './submitErrors';
import { recurrenceError } from './recurrence';
import { draftSummary, hasDraftContent, type QuickEventDraft } from './draft';

/**
 * Pytanie „Zmienić dane klienta/pojazdu?" - jak w edycji rezerwacji (VerificationStep).
 * `resubmit`: pytanie padło przy zapisie, więc po odpowiedzi zapis idzie dalej.
 */
type RecordDecision = 'edit' | 'new';

export interface PendingRecordChoice {
    kind: 'customer' | 'vehicle';
    resubmit: boolean;
    /** Odpowiedzi już udzielone w tym zapisie (klient pytany przed pojazdem). */
    decided?: { customer?: RecordDecision; vehicle?: RecordDecision };
}

interface UseQuickEventFormOptions {
    isOpen: boolean;
    eventData: EventCreationData | null;
    onClose: () => void;
    onSave: (data: QuickEventFormData) => Promise<void> | void;
    ref: React.ForwardedRef<QuickEventModalRef>;
    initialData?: QuickEventInitialData;
}

export function useQuickEventForm({ isOpen, eventData, onSave, ref, initialData }: UseQuickEventFormOptions) {
    // ─── Form state ────────────────────────────────────────────────────────────
    const [title, setTitle] = useState('');
    const [startDateTime, setStartDateTime] = useState('');
    const [endDateTime, setEndDateTime] = useState('');
    const [isAllDay, setIsAllDay] = useState(false);
    const [notes, setNotes] = useState('');
    const [doorToDoor, setDoorToDoor] = useState<DoorToDoorInfo>({ ...EMPTY_DOOR_TO_DOOR });
    const [selectedColorId, setSelectedColorId] = useState('');

    // ─── Customer state ────────────────────────────────────────────────────────
    const [selectedCustomerId, setSelectedCustomerId] = useState<string>();
    const [selectedCustomer, setSelectedCustomer] = useState<SelectedCustomer | null>(null);
    const [customerFirstName, setCustomerFirstName] = useState('');
    const [customerLastName, setCustomerLastName] = useState('');
    const [customerPhonePrefix, setCustomerPhonePrefix] = useState('+48');
    const [customerPhone, setCustomerPhone] = useState('');
    const [customerEmail, setCustomerEmail] = useState('');
    const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);
    const customerJustSelectedRef = useRef(false);
    const customerBlurTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const customerFullPhone = customerPhone.trim()
        ? `${customerPhonePrefix.trim()} ${customerPhone.trim()}`
        : '';
    const customerSearchQuery = [customerFirstName, customerLastName, customerFullPhone, customerEmail]
        .filter(s => s.trim().length > 0).join(' ').trim();
    const debouncedCustomerSearch = useDebounce(customerSearchQuery, 300);
    // Podpowiedzi klientów tylko przy otwartym oknie i wpisanym tekście. Okno jest stale
    // zamontowane w kalendarzu (trzyma szkic), więc bez tego każde wejście do kalendarza
    // pobierało 50 klientów z danymi osobowymi.
    const { data: foundCustomers = [] } = useAppointmentCustomerSearch(debouncedCustomerSearch, {
        enabled: isOpen && debouncedCustomerSearch.length > 0,
    });
    const hasCustomerSearchQuery = customerSearchQuery.length > 0;

    // ─── Vehicle state ─────────────────────────────────────────────────────────
    const [selectedVehicle, setSelectedVehicle] = useState<SelectedVehicle | null>(null);
    // Rodzaj pól marki i modelu: z niego BrandSelect/ModelSelect biorą katalog. Nowy
    // pojazd startuje jako samochód, wybrany z listy przynosi swój rodzaj.
    const [vehicleKind, setVehicleKind] = useState<VehicleKind>(DEFAULT_VEHICLE_KIND);
    const [vehicleBrand, setVehicleBrand] = useState('');
    const [vehicleModel, setVehicleModel] = useState('');
    const [vehicleYear, setVehicleYear] = useState('');
    const [showVehicleDropdown, setShowVehicleDropdown] = useState(false);
    const [isAddingNewVehicle, setIsAddingNewVehicle] = useState(false);
    const vehicleBlurTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const vehicleAutoSelectedRef = useRef(false);
    const vehicleAutoOpenRef = useRef(false);

    // ─── Service state ─────────────────────────────────────────────────────────
    const [selectedServiceIds, setSelectedServiceIds] = useState<string[]>([]);
    // Line-item instance id -> catalog/temp service id. The same service can be added
    // more than once; each addition gets its own instance id so price/adjustment/notes
    // stay independent per line instead of colliding on a shared catalog id.
    const [serviceRefs, setServiceRefs] = useState<{ [lineId: string]: string }>({});
    const lineIdSeqRef = useRef(0);
    const nextLineId = (catalogId: string) => {
        lineIdSeqRef.current += 1;
        return `${catalogId}::${lineIdSeqRef.current}`;
    };
    const [servicePrices, setServicePrices] = useState<{ [key: string]: number }>({});
    const [servicePriceInputs, setServicePriceInputs] = useState<{ [id: string]: { net: string; gross: string } }>({});
    const [serviceAdjustments, setServiceAdjustments] = useState<{ [key: string]: ServiceAdjustment }>({});
    const [serviceNotes, setServiceNotes] = useState<{ [key: string]: string }>({});
    const [serviceVatRates, setServiceVatRates] = useState<{ [key: string]: number }>({});
    const [serviceBasePrices, setServiceBasePrices] = useState<{ [key: string]: number }>({});
    const [expandedServiceNote, setExpandedServiceNote] = useState<string | null>(null);
    const [serviceSearch, setServiceSearch] = useState('');
    const [showServiceDropdown, setShowServiceDropdown] = useState(false);
    const [tempServices, setTempServices] = useState<{ [key: string]: { name: string; basePriceNet: number; vatRate: number } }>({});

    // ─── Customer edit mode ────────────────────────────────────────────────────
    const [customerEditMode, setCustomerEditMode] = useState(false);
    // When a customer is prefilled but not yet confirmed by the user, keep the
    // edit form open and suppress the auto-confirm-on-blur until they act.
    const prefillAwaitingConfirmRef = useRef(false);
    // Set to true before programmatically blurring customer inputs (e.g. when
    // transitioning to the mobile search bottom sheet) so the blur handler
    // doesn't schedule a dropdown close.
    const skipNextCustomerBlurRef = useRef(false);

    // ─── Vehicle edit mode ─────────────────────────────────────────────────────
    const [vehicleEditMode, setVehicleEditMode] = useState(false);

    const [isRecurring, setIsRecurring] = useState(false);
    const [recurrenceRule, setRecurrenceRule] = useState<RecurrenceRuleRequest>({
        type: 'WEEKLY',
        intervalWeeks: 1,
        daysOfWeek: ['MONDAY'],
        endType: 'COUNT',
        maxOccurrences: 12,
    });

    const getDayOfWeekFromDate = (dateStr: string): string => {
        const date = new Date(dateStr);
        return (['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'] as const)[date.getDay()];
    };

    useEffect(() => {
        if (isRecurring && startDateTime) {
            const day = getDayOfWeekFromDate(startDateTime);
            setRecurrenceRule(prev => ({ ...prev, daysOfWeek: [day as any] }));
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isRecurring]);

    // ─── Sub-modal state ───────────────────────────────────────────────────────
    const [isQuickServiceModalOpen, setIsQuickServiceModalOpen] = useState(false);
    const [isPriceInputModalOpen, setIsPriceInputModalOpen] = useState(false);
    const [isQuickColorModalOpen, setIsQuickColorModalOpen] = useState(false);
    const [pendingService, setPendingService] = useState<Service | null>(null);
    const [pendingChoice, setPendingChoice] = useState<PendingRecordChoice | null>(null);
    // Odpowiedź „Edytuj istniejącego" udzielona przy „Zatwierdź zmiany" - zapis nie pyta
    // o to samo drugi raz. Kasowana, gdy ktoś znów otworzy edycję albo wybierze kogoś innego.
    const customerUpdateConfirmedRef = useRef(false);
    const vehicleUpdateConfirmedRef = useRef(false);

    // ─── Draft ─────────────────────────────────────────────────────────────────
    // Tylko w kalendarzu: okno z leada (initialData) zawsze startuje z danych leada.
    const draftsEnabled = !initialData;
    const [draft, setDraft] = useState<QuickEventDraft | null>(null);

    // ─── UI state ──────────────────────────────────────────────────────────────
    const [errors, setErrors] = useState<{ [key: string]: string }>({});
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [focusedField, setFocusedField] = useState<string | null>(null);

    // ─── Refs ──────────────────────────────────────────────────────────────────
    const titleInputRef = useRef<HTMLInputElement>(null);
    const startInputRef = useRef<HTMLDivElement>(null);
    const endInputRef = useRef<HTMLDivElement>(null);
    const customerInputRef = useRef<HTMLInputElement>(null);
    const customerLastNameInputRef = useRef<HTMLInputElement>(null);
    const customerPhonePrefixRef = useRef<HTMLInputElement>(null);
    const customerPhoneInputRef = useRef<HTMLInputElement>(null);
    const customerEmailInputRef = useRef<HTMLInputElement>(null);
    const vehicleBrandInputRef = useRef<HTMLInputElement>(null);
    const vehicleModelInputRef = useRef<HTMLInputElement>(null);
    const vehicleYearInputRef = useRef<HTMLInputElement>(null);
    const vehicleSectionRef = useRef<HTMLDivElement>(null);
    const serviceInputRef = useRef<HTMLInputElement>(null);
    const colorSectionRef = useRef<HTMLDivElement>(null);

    // ─── External services ─────────────────────────────────────────────────────
    const { showError } = useToast();
    const queryClient = useQueryClient();

    // ─── Queries ───────────────────────────────────────────────────────────────
    const { data: customerVehicles, isLoading: vehiclesLoading } = useCustomerVehicles(
        selectedCustomerId && !selectedCustomer?.isNew ? selectedCustomerId : undefined
    );
    const vehicles = customerVehicles || [];

    // Całość, nie pierwsza strona: lista niżej filtruje cennik w przeglądarce.
    // Zapytania okna dopiero po jego otwarciu - zamknięte wysyłało ich osiem.
    const { data: services = [] } = useQuery({
        queryKey: ['services'],
        queryFn: () => fetchWholeCatalog<Service>(),
        enabled: isOpen,
        staleTime: STALE_TIME.catalog,
    });

    const { data: appointmentColors = [] } = useQuery({ ...appointmentColorsQuery(), enabled: isOpen });

    const canReadAutomation = useMessageAutomationAccess();
    const { data: automationConfig } = useQuery({
        ...smsAutomationQuery(),
        // Bez modułu albo uprawnienia serwer odpowiada 402/403 - nie pytamy.
        enabled: isOpen && canReadAutomation,
    });
    const preVisitEnabled = automationConfig?.preVisit?.enabled ?? true;
    const bookingConfirmationEnabled = automationConfig?.bookingConfirmation?.enabled ?? true;
    // Reguła SMS-a z linkiem do Karty Wizyty dla REZERWACJI (nie mylić z tą dla wizyty)
    // ma własny szablon i własny przełącznik w Ustawieniach → Szablony SMS, domyślnie
    // wyłączony i z pustym szablonem - dokładnie jak świeże/wyczyszczone konto. Bez tego
    // pola checkbox wyglądał na aktywny, mimo że backend i tak nic by nie wysłał.
    const reservationCardLinkSmsEnabled = automationConfig?.reservationCardLink?.enabled ?? true;

    const { data: visitCardSettings } = useQuery({
        queryKey: ['visit-card-settings'],
        queryFn: () => import('@/modules/visit-card/api/visitCardApi').then(m => m.visitCardApi.getSettings()),
        enabled: isOpen,
        staleTime: 60_000,
    });
    // Checkbox visible only when the studio uses the Visit Card AND has the
    // communication module: module possession comes from the entitlements
    // source of truth, not the legacy smsModuleActive flag.
    const smsCapability = useCapability('COMM_SEND_TRANSACTIONAL');
    const visitCardEnabled = (visitCardSettings?.enabled ?? false) && smsCapability.enabled;
    const visitCardSendByDefault = visitCardSettings?.sendByDefault ?? false;

    // ─── SMS state ─────────────────────────────────────────────────────────────
    // Stan początkowy każdego pola z „Domyślnie zaznacz" przy tej wiadomości
    // (Ustawienia → Wiadomości do klientów). Gdy ustawień nie da się wczytać, okno
    // zachowuje się jak dotąd: potwierdzenie i przypomnienie puste, karta według
    // ustawienia Karty Wizyty.
    const messageDefaults = useMessageDefaults({ enabled: isOpen });
    const [sendConfirmationSms, setSendConfirmationSms, resetConfirmationSms] =
        useDefaultChoice(messageDefaults.sms('bookingConfirmation'), false);
    const [sendReminderSms, setSendReminderSms, resetReminderSms] =
        useDefaultChoice(messageDefaults.sms('preVisit'), false);
    const [sendVisitCard, setSendVisitCard, resetVisitCard] =
        useDefaultChoice(messageDefaults.sms('reservationCardLink'), visitCardSendByDefault);

    // ─── Computed values ───────────────────────────────────────────────────────
    const selectedColor = appointmentColors.find((c: AppointmentColor) => c.id === selectedColorId);
    const accentColor = selectedColor?.hexColor || '#0369a1';

    const filteredServices = services.filter((s: Service) =>
        serviceSearch.length === 0 ||
        s.name.toLowerCase().includes(serviceSearch.toLowerCase())
    );
    const hasSearchQuery = serviceSearch.trim().length > 0;

    // ─── Effects ───────────────────────────────────────────────────────────────
    useEffect(() => {
        if (eventData) {
            const timeDiff = eventData.end.getTime() - eventData.start.getTime();
            const daysDiff = Math.ceil(timeDiff / (1000 * 60 * 60 * 24));
            const shouldBeAllDay = daysDiff <= 1 && eventData.allDay;

            if (shouldBeAllDay) {
                setIsAllDay(true);
                setStartDateTime(formatDate(eventData.start));
                setEndDateTime(`${formatDate(eventData.start)}T23:59:59`);
            } else if (daysDiff > 1) {
                setIsAllDay(false);
                const startDate = new Date(eventData.start);
                startDate.setHours(9, 0, 0, 0);
                const endDate = new Date(eventData.end);
                endDate.setDate(endDate.getDate() - 1);
                endDate.setHours(20, 0, 0, 0);
                setStartDateTime(formatDateTimeLocal(startDate));
                setEndDateTime(formatDateTimeLocal(endDate));
            } else {
                setIsAllDay(false);
                setStartDateTime(formatDateTimeLocal(eventData.start));
                setEndDateTime(formatDateTimeLocal(eventData.end));
            }
        }
    }, [eventData]);

    // Kolor domyślny studia, a nie pierwszy z listy: kolejność listy potrafiła się
    // zmienić po dodaniu koloru i podpowiedź zmieniała się razem z nią.
    useEffect(() => {
        if (appointmentColors.length > 0) {
            setSelectedColorId(prev => pickInitialColorId(appointmentColors, prev));
        }
    }, [appointmentColors]);

    useEffect(() => {
        if (isOpen && titleInputRef.current) {
            setTimeout(() => titleInputRef.current?.focus(), 100);
        }
    }, [isOpen]);


    useEffect(() => {
        if (selectedServiceIds.length > 0 && errors.services) {
            setErrors(prev => {
                const { services: _, ...rest } = prev;
                return rest;
            });
        }
    }, [selectedServiceIds.length, errors.services]);

    useEffect(() => {
        if (errors.customer || errors.customerFirstName || errors.customerLastName || errors.customerPhone || errors.customerEmail) {
            setErrors(prev => {
                const { customer: _, customerFirstName: __, customerLastName: ___, customerPhone: ____, customerEmail: _____, ...rest } = prev;
                return rest;
            });
        }
    }, [customerFirstName, customerLastName, customerPhone, customerEmail]);

    // Auto-select the only vehicle when customer has exactly one
    useEffect(() => {
        if (
            vehicles.length === 1 &&
            !vehicleAutoSelectedRef.current &&
            !selectedVehicle &&
            selectedCustomer &&
            !selectedCustomer.isNew
        ) {
            vehicleAutoSelectedRef.current = true;
            const v = vehicles[0];
            const kind = normalizeVehicleKind(v.kind);
            setSelectedVehicle({ id: v.id, kind, brand: v.brand ?? '', model: v.model ?? '', year: v.year, licensePlate: v.licensePlate ?? null, isNew: false });
            setVehicleKind(kind);
            setVehicleBrand(v.brand ?? '');
            setVehicleModel(v.model ?? '');
            setVehicleYear(v.year ? String(v.year) : '');
        }
    }, [vehicles]);

    // Auto-open vehicle section after customer is confirmed / selected
    useEffect(() => {
        if (!vehicleAutoOpenRef.current) return;
        if (vehiclesLoading) return;
        if (!selectedCustomer || selectedVehicle) { vehicleAutoOpenRef.current = false; return; }

        vehicleAutoOpenRef.current = false;

        if (vehicles.length > 1) {
            setShowVehicleDropdown(true);
            setFocusedField('vehicle');
        } else if (vehicles.length === 0) {
            setTimeout(() => {
                const btn = vehicleSectionRef.current?.querySelector('button') as HTMLElement | null;
                btn?.focus();
            }, 50);
        }
        // vehicles.length === 1 is already handled by vehicleAutoSelectedRef effect
    }, [vehicles, vehiclesLoading, selectedCustomer, selectedVehicle]);

    // ─── Clear form ────────────────────────────────────────────────────────────
    const clearForm = () => {
        setTitle('');
        setSelectedCustomerId(undefined);
        setSelectedCustomer(null);
        setSelectedVehicle(null);
        setSelectedServiceIds([]);
        setServiceRefs({});
        lineIdSeqRef.current = 0;
        setServicePrices({});
        setServiceAdjustments({});
        setServiceNotes({});
        setServiceVatRates({});
        setServiceBasePrices({});
        setExpandedServiceNote(null);
        setServiceSearch('');
        setCustomerFirstName('');
        setCustomerLastName('');
        setCustomerPhonePrefix('+48');
        setCustomerPhone('');
        setCustomerEmail('');
        setCustomerEditMode(false);
        prefillAwaitingConfirmRef.current = false;
        setShowCustomerDropdown(false);
        setVehicleKind(DEFAULT_VEHICLE_KIND);
        setVehicleBrand('');
        setVehicleModel('');
        setVehicleYear('');
        setVehicleEditMode(false);
        setShowVehicleDropdown(false);
        setIsAddingNewVehicle(false);
        vehicleAutoSelectedRef.current = false;
        vehicleAutoOpenRef.current = false;
        setNotes('');
        setDoorToDoor({ ...EMPTY_DOOR_TO_DOOR });
        setTempServices({});
        resetConfirmationSms();
        resetReminderSms();
        resetVisitCard();
        setIsRecurring(false);
        setRecurrenceRule({ type: 'WEEKLY', intervalWeeks: 1, daysOfWeek: ['MONDAY'], endType: 'COUNT', maxOccurrences: 12 });
        setServicePriceInputs({});
        setErrors({});
        setPendingChoice(null);
        customerUpdateConfirmedRef.current = false;
        vehicleUpdateConfirmedRef.current = false;
    };

    useImperativeHandle(ref, () => ({ clearForm }));

    // ─── Draft ─────────────────────────────────────────────────────────────────
    const captureDraft = (): QuickEventDraft => ({
        title, notes, doorToDoor, selectedColorId,
        selectedCustomer, selectedCustomerId,
        customerFirstName, customerLastName, customerPhonePrefix, customerPhone, customerEmail,
        customerEditMode,
        selectedVehicle, vehicleKind, vehicleBrand, vehicleModel, vehicleYear,
        isAddingNewVehicle, vehicleEditMode,
        selectedServiceIds, serviceRefs, servicePrices, servicePriceInputs, serviceAdjustments,
        serviceNotes, serviceVatRates, serviceBasePrices, tempServices,
        lineIdSeq: lineIdSeqRef.current,
        sendConfirmationSms, sendReminderSms, sendVisitCard,
        isRecurring, recurrenceRule,
    });

    /** Wszystko poza terminem: termin to ten, który użytkownik właśnie wskazał. */
    const applyDraft = (d: QuickEventDraft) => {
        clearForm();
        setTitle(d.title);
        setNotes(d.notes);
        setDoorToDoor(d.doorToDoor);
        if (d.selectedColorId) setSelectedColorId(d.selectedColorId);
        setSelectedCustomer(d.selectedCustomer);
        setSelectedCustomerId(d.selectedCustomerId);
        setCustomerFirstName(d.customerFirstName);
        setCustomerLastName(d.customerLastName);
        setCustomerPhonePrefix(d.customerPhonePrefix);
        setCustomerPhone(d.customerPhone);
        setCustomerEmail(d.customerEmail);
        setCustomerEditMode(d.customerEditMode);
        setSelectedVehicle(d.selectedVehicle);
        setVehicleKind(d.vehicleKind);
        setVehicleBrand(d.vehicleBrand);
        setVehicleModel(d.vehicleModel);
        setVehicleYear(d.vehicleYear);
        setIsAddingNewVehicle(d.isAddingNewVehicle);
        setVehicleEditMode(d.vehicleEditMode);
        // Szkic wie, jakie auto wybrano (albo że żadnego) - auto-wybór jedynego pojazdu
        // klienta nie może tego nadpisać.
        vehicleAutoSelectedRef.current = true;
        vehicleAutoOpenRef.current = false;
        setSelectedServiceIds(d.selectedServiceIds);
        setServiceRefs(d.serviceRefs);
        setServicePrices(d.servicePrices);
        setServicePriceInputs(d.servicePriceInputs);
        setServiceAdjustments(d.serviceAdjustments);
        setServiceNotes(d.serviceNotes);
        setServiceVatRates(d.serviceVatRates);
        setServiceBasePrices(d.serviceBasePrices);
        setTempServices(d.tempServices);
        lineIdSeqRef.current = d.lineIdSeq;
        setSendConfirmationSms(d.sendConfirmationSms);
        setSendReminderSms(d.sendReminderSms);
        setSendVisitCard(d.sendVisitCard);
        setIsRecurring(d.isRecurring);
        setRecurrenceRule(d.recurrenceRule);
    };

    /** Odkłada bieżący stan do szkicu (jeśli jest co odkładać) i czyści formularz. */
    const stashToDraft = () => {
        const current = captureDraft();
        if (hasDraftContent(current)) setDraft(current);
        clearForm();
    };

    /** „Wróć do szkicu". Bieżąca treść, jeśli jakaś jest, zamienia się ze szkicem miejscami. */
    const restoreDraft = () => {
        if (!draft) return;
        const current = captureDraft();
        applyDraft(draft);
        setDraft(hasDraftContent(current) ? current : null);
    };

    const dismissDraft = () => setDraft(null);

    /** „Wyczyść wszystko": nieodwracalne tylko pozornie - pasek szkicu pozwala to cofnąć. */
    const clearAllWithUndo = () => {
        if (draftsEnabled) stashToDraft();
        else clearForm();
    };

    // Zamknięcie okna bez zapisu odkłada formularz do szkicu. Po udanym zapisie kalendarz
    // czyści formularz przed zamknięciem, więc nie ma czego odkładać.
    const wasOpenRef = useRef(isOpen);
    useEffect(() => {
        const justClosed = wasOpenRef.current && !isOpen;
        wasOpenRef.current = isOpen;
        if (justClosed && draftsEnabled) stashToDraft();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isOpen]);

    // ─── Apply initialData when the modal first opens ──────────────────────────
    const prevIsOpenRef = useRef(false);
    useEffect(() => {
        const justOpened = isOpen && !prevIsOpenRef.current;
        prevIsOpenRef.current = isOpen;

        if (!justOpened || !initialData) return;

        // Reset first so we start with a clean slate
        clearForm();

        if (initialData.title) setTitle(initialData.title);

        if (initialData.customer) {
            const c = initialData.customer;
            setSelectedCustomer(c);
            setSelectedCustomerId(c.id);
            setCustomerFirstName(c.firstName || '');
            setCustomerLastName(c.lastName || '');
            const parsedInitial = parsePhone(c.phone || '');
            setCustomerPhonePrefix(parsedInitial.prefix);
            setCustomerPhone(parsedInitial.main);
            setCustomerEmail(c.email || '');
            // Prefilled-but-unconfirmed customer → open the section in edit mode
            // so the user explicitly confirms (Zatwierdź zmiany / Anuluj), and
            // suppress the auto-confirm-on-blur until they do.
            if (initialData.customerEditing) {
                setCustomerEditMode(true);
                prefillAwaitingConfirmRef.current = true;
            }
        }
        if (initialData.vehicle) {
            const v = initialData.vehicle;
            setSelectedVehicle(v);
            setVehicleKind(normalizeVehicleKind(v.kind));
            setVehicleBrand(v.brand || '');
            setVehicleModel(v.model || '');
            setVehicleYear(v.year ? String(v.year) : '');
        }
        if (initialData.serviceIds?.length) {
            setSelectedServiceIds(initialData.serviceIds);
        }
        // Odwzorowanie pozycji na katalog musi wejść razem z listą: bez niego wiersz
        // nie znajdzie swojej usługi i zniknie z tabeli, mimo że jest na liście.
        if (initialData.serviceRefs) {
            setServiceRefs(initialData.serviceRefs);
        }
        if (initialData.servicePrices) {
            setServicePrices(initialData.servicePrices);
        }
        if (initialData.serviceBasePrices) {
            setServiceBasePrices(initialData.serviceBasePrices);
        }
        if (initialData.serviceVatRates) {
            setServiceVatRates(initialData.serviceVatRates);
        }
        if (initialData.serviceNotes) {
            setServiceNotes(initialData.serviceNotes);
        }
        if (initialData.tempServices) {
            setTempServices(initialData.tempServices);
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isOpen]);

    // ─── Helpers ───────────────────────────────────────────────────────────────
    const getNextTimeSlot = (): { start: string; end: string } => {
        const now = new Date();
        const h = now.getHours();
        const m = now.getMinutes();
        const steps = [0, 15, 30, 45];
        const nextStep = steps.find(s => s >= m);
        const [sh, sm] = nextStep !== undefined
            ? [h, nextStep]
            : [(h + 1) % 24, 0];
        const eh = Math.min(sh + 1, 23);
        const pad = (n: number) => String(n).padStart(2, '0');
        return { start: `${pad(sh)}:${pad(sm)}`, end: `${pad(eh)}:${pad(sm)}` };
    };

    // ─── Auto-adjust endDateTime when startDateTime moves past it ──────────────
    useEffect(() => {
        if (!startDateTime || !endDateTime || isAllDay) return;
        if (!startDateTime.includes('T') || !endDateTime.includes('T')) return;
        const [sd, st] = startDateTime.split('T');
        const [ed, et] = endDateTime.split('T');
        if (sd > ed) {
            setEndDateTime(`${sd}T${et}`);
        } else if (sd === ed && st >= et) {
            const [h, m] = st.split(':').map(Number);
            const totalMin = h * 60 + m + 60;
            const newH = Math.min(Math.floor(totalMin / 60), 23);
            const rawM = totalMin % 60;
            const snapped = [0, 15, 30, 45].reduce((p, c) =>
                Math.abs(c - rawM) < Math.abs(p - rawM) ? c : p
            );
            setEndDateTime(`${sd}T${String(newH).padStart(2, '0')}:${String(snapped).padStart(2, '0')}`);
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [startDateTime]);

    // ─── Handlers ──────────────────────────────────────────────────────────────
    const handleAllDayToggle = (checked: boolean) => {
        setIsAllDay(checked);
        const nowIso = new Date().toISOString();
        if (checked) {
            const date = (startDateTime || nowIso).split('T')[0];
            setStartDateTime(date);
            setEndDateTime(`${date}T23:59:59`);
        } else {
            const base = startDateTime || nowIso;
            const date = base.split('T')[0];
            const slot = getNextTimeSlot();
            setStartDateTime(startDateTime.includes('T') ? startDateTime : `${date}T${slot.start}`);
            setEndDateTime(endDateTime ? (endDateTime.includes('T') ? endDateTime : `${date}T${slot.end}`) : `${date}T${slot.end}`);
        }
    };

    /**
     * Klient, z którym wychodzimy z formularza.
     *
     * Wpisane pola LICZĄ SIĘ jako klient, nawet jeśli nikt nie zatwierdził ich osobnym
     * gestem. Wcześniej klient nowy powstawał tylko przez Enter w polu e-mail albo przez
     * pozycję z listy podpowiedzi — na telefonie nie ma ani jednego, ani drugiego, więc
     * wypełnienie imienia, nazwiska i telefonu kończyło się komunikatem „Wybór klienta
     * jest wymagany" nad polami, w których ten klient był już wpisany.
     *
     * Ta sama zasada domyka edycję: poprawki w danych wybranego klienta wchodzą do zapisu
     * także wtedy, gdy nikt nie kliknął „gotowe". To jest ten sam wzorzec, którym niżej
     * rozwiązuje się pojazd (`vehicleToSubmit`) — formularz czyta pola, a nie ceremonię.
     */
    const resolveCustomerForSubmit = (): SelectedCustomer | null => {
        const fn = customerFirstName.trim();
        const ln = customerLastName.trim();
        const ph = customerFullPhone;
        const em = customerEmail.trim();

        if (!selectedCustomer) {
            if (!fn && !ln && !ph && !em) return null;
            return { id: '', firstName: fn, lastName: ln, phone: ph, email: em, isNew: true };
        }
        if (!customerEditMode) return selectedCustomer;

        const changed = fn !== (selectedCustomer.firstName ?? '')
            || ln !== (selectedCustomer.lastName ?? '')
            || !samePhone(ph, selectedCustomer.phone)
            || em !== (selectedCustomer.email ?? '');
        return {
            ...selectedCustomer,
            firstName: fn,
            lastName: ln,
            phone: ph,
            email: em,
            hasUpdates: !selectedCustomer.isNew && changed,
        };
    };

    /** Pojazd, z którym wychodzimy z formularza - ta sama zasada co przy kliencie. */
    const resolveVehicleForSubmit = (): SelectedVehicle | null => {
        if (selectedVehicle) return vehicleEditMode ? applyVehicleEdits(selectedVehicle) : selectedVehicle;
        if ((isAddingNewVehicle || vehicles.length === 0) && (vehicleBrand.trim() || vehicleModel.trim())) {
            return {
                id: '', kind: vehicleKind, brand: vehicleBrand.trim(), model: vehicleModel.trim(),
                year: vehicleYear.trim() ? parseInt(vehicleYear.trim()) : undefined, isNew: true,
            };
        }
        return null;
    };

    /**
     * Numer, na który pójdą SMS-y - z pól formularza, nie tylko z wybranego klienta.
     * Wcześniej nowy klient wpisany w pola na telefonie był „bez numeru": arkusz SMS
     * mówił „nie wyślemy żadnej wiadomości" i blokował przełączniki, a zapis i tak
     * wysyłał wiadomości zaznaczone domyślnie.
     */
    const smsPhone = (resolveCustomerForSubmit()?.phone ?? '').trim() || null;

    const validateForm = (customer: SelectedCustomer | null): { [key: string]: string } => {
        const newErrors: { [key: string]: string } = {};

        if (!customer) {
            newErrors.customer = 'Wybierz klienta';
        } else if (customer.isNew) {
            const hasPhone = customer.phone && customer.phone.trim().length > 0;
            const hasEmail = customer.email && customer.email.trim().length > 0;
            if (!hasPhone && !hasEmail) {
                newErrors.customer = 'Podaj telefon albo e-mail klienta';
            }
        }

        if (!startDateTime) newErrors.startDateTime = 'Podaj datę rozpoczęcia';
        if (!endDateTime) newErrors.endDateTime = 'Podaj datę zakończenia';

        if (startDateTime && endDateTime && new Date(endDateTime) < new Date(startDateTime)) {
            newErrors.endDateTime = 'Data zakończenia musi być późniejsza niż data rozpoczęcia';
        }

        if (isRecurring) {
            const recurrenceProblem = recurrenceError(recurrenceRule, startDateTime);
            if (recurrenceProblem) newErrors.recurrence = recurrenceProblem;
        }

        if (!selectedColorId) newErrors.color = 'Wybierz kolor rezerwacji albo dodaj nowy';

        if (selectedServiceIds.length === 0) {
            newErrors.services = 'Dodaj przynajmniej jedną usługę';
        } else {
            const servicePriceErrors: string[] = [];
            selectedServiceIds.forEach((serviceId) => {
                const price = servicePrices[serviceId];
                if (price == null || price < 0) {
                    const service = services.find((s: Service) => s.id === serviceId) || tempServices[serviceId];
                    servicePriceErrors.push(service?.name || 'Nieznana usługa');
                }
            });
            if (servicePriceErrors.length > 0) {
                newErrors.servicePrices = `Podaj cenę: ${servicePriceErrors.join(', ')}`;
            }
        }

        setErrors(newErrors);
        return newErrors;
    };

    const focusFirstError = (errs: { [key: string]: string }) => {
        const firstKey = firstSubmitErrorKey(errs);
        if (!firstKey) return;
        const map: Record<string, React.RefObject<HTMLElement>> = {
            startDateTime: startInputRef as React.RefObject<HTMLElement>,
            endDateTime: endInputRef as React.RefObject<HTMLElement>,
            customer: customerInputRef as React.RefObject<HTMLElement>,
            services: serviceInputRef as React.RefObject<HTMLElement>,
            servicePrices: serviceInputRef as React.RefObject<HTMLElement>,
            color: colorSectionRef as React.RefObject<HTMLElement>,
        };
        const fieldRef = map[firstKey];
        if (fieldRef?.current) {
            fieldRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
            fieldRef.current.focus?.();
        }
    };

    /** Klient z kartoteki jako NOWY klient z poprawionymi danymi („Dodaj jako nowego"). */
    const asNewCustomer = (c: SelectedCustomer): SelectedCustomer => ({
        id: '', firstName: c.firstName, lastName: c.lastName, phone: c.phone, email: c.email, isNew: true,
    });

    /** Pojazd z kartoteki jako NOWY pojazd z poprawionymi danymi („Dodaj jako nowy"). */
    const asNewVehicle = (v: SelectedVehicle): SelectedVehicle => ({
        id: '', kind: v.kind, brand: v.brand, model: v.model, year: v.year, isNew: true,
    });

    const runSubmit = async (decisions: { customer?: RecordDecision; vehicle?: RecordDecision } = {}) => {
        if (isSubmitting) return;
        setErrors({});
        let customerToSubmit = resolveCustomerForSubmit();
        const errs = validateForm(customerToSubmit);
        if (Object.keys(errs).length > 0) {
            showError('Nie można zapisać rezerwacji', submitErrorMessage(errs));
            focusFirstError(errs);
            return;
        }
        let vehicleToSubmit = resolveVehicleForSubmit();
        decisions = {
            customer: decisions.customer ?? (customerUpdateConfirmedRef.current ? 'edit' : undefined),
            vehicle: decisions.vehicle ?? (vehicleUpdateConfirmedRef.current ? 'edit' : undefined),
        };

        // Zmiana danych klienta albo pojazdu z kartoteki pyta, co z nią zrobić - tak jak
        // edycja rezerwacji (decyzja biznesu z 21.10.2026). Bez odpowiedzi nic nie idzie.
        if (customerToSubmit?.hasUpdates && !decisions.customer) {
            setPendingChoice({ kind: 'customer', resubmit: true, decided: decisions });
            return;
        }
        if (customerToSubmit && decisions.customer === 'new') {
            customerToSubmit = asNewCustomer(customerToSubmit);
            // Auto z kartoteki należy do dotychczasowego klienta, a nowy klient nie ma
            // jeszcze pojazdów. Rezerwacja zostaje z autem, które widać w formularzu -
            // jako nowym pojazdem nowego klienta, a nie po cichu bez auta.
            if (vehicleToSubmit && !vehicleToSubmit.isNew) vehicleToSubmit = asNewVehicle(vehicleToSubmit);
        }
        if (vehicleToSubmit?.hasUpdates && !decisions.vehicle) {
            setPendingChoice({ kind: 'vehicle', resubmit: true, decided: decisions });
            return;
        }
        if (vehicleToSubmit && decisions.vehicle === 'new') vehicleToSubmit = asNewVehicle(vehicleToSubmit);

        // Stan podnosimy DOPIERO po udanej walidacji. Wcześniej sekcja klienta zamieniłaby
        // się w podsumowanie i schowała pola, w których trzeba poprawić błąd.
        if (customerToSubmit && customerToSubmit !== selectedCustomer) {
            setSelectedCustomer(customerToSubmit);
            if (customerToSubmit.isNew) setSelectedCustomerId(undefined);
            setCustomerEditMode(false);
        }
        if (vehicleToSubmit !== selectedVehicle) {
            setSelectedVehicle(vehicleToSubmit);
            setVehicleEditMode(false);
        }
        // Bez numeru nie ma SMS-a: to samo, co mówi formularz, idzie do serwera.
        const canSms = !!(customerToSubmit?.phone ?? '').trim();
        setIsSubmitting(true);
        try {
            await Promise.resolve(onSave({
                title,
                customer: customerToSubmit,
                vehicle: vehicleToSubmit,
                startDateTime,
                endDateTime,
                isAllDay,
                serviceIds: selectedServiceIds,
                serviceRefs,
                servicePrices,
                serviceAdjustments,
                serviceNotes,
                serviceVatRates,
                serviceBasePrices,
                tempServices,
                colorId: selectedColorId,
                notes,
                doorToDoor: doorToDoor.enabled ? doorToDoor : undefined,
                sendConfirmationSms: canSms && bookingConfirmationEnabled && sendConfirmationSms,
                sendReminderSms: canSms && preVisitEnabled && sendReminderSms,
                sendVisitCard: canSms && visitCardEnabled && reservationCardLinkSmsEnabled && sendVisitCard,
                recurrence: isRecurring ? recurrenceRule : null,
            }));
        } catch (err: any) {
            let message = 'Spróbuj ponownie za chwilę.';
            if (err?.response?.data) {
                const data = err.response.data;
                // Surowy JSON z serwera nie jest komunikatem dla człowieka - bez `message`
                // ani `error` zostaje zdanie domyślne.
                message = data.message || data.error || message;
            } else if (err?.message) {
                message = err.message;
            }
            showError('Nie udało się zapisać rezerwacji', message);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        await runSubmit();
    };

    /**
     * Odpowiedź na „Zmienić dane klienta/pojazdu?". „Edytuj istniejącego" zapisuje zmianę
     * w kartotece, „Dodaj jako nowego" zakłada nową kartę z poprawionymi danymi. Gdy pytanie
     * padło przy zapisie, zapis idzie dalej z tą odpowiedzią.
     */
    const answerPendingChoice = (decision: RecordDecision) => {
        const choice = pendingChoice;
        if (!choice) return;
        setPendingChoice(null);
        if (choice.resubmit) {
            void runSubmit({ ...choice.decided, [choice.kind]: decision });
            return;
        }
        if (choice.kind === 'customer') applyCustomerEdit(decision);
        else applyVehicleEdit(decision);
    };

    const cancelPendingChoice = () => setPendingChoice(null);

    const handleCustomerFieldFocus = () => {
        if (customerBlurTimerRef.current) {
            clearTimeout(customerBlurTimerRef.current);
            customerBlurTimerRef.current = null;
        }
        setFocusedField('customer');
        setShowCustomerDropdown(true);
    };

    const handleCustomerFieldBlur = () => {
        if (skipNextCustomerBlurRef.current) {
            skipNextCustomerBlurRef.current = false;
            return;
        }
        setCustomerFirstName(v => capitalizeWords(v));
        setCustomerLastName(v => capitalizeWords(v));
        // prefix cleanup on blur: ensure it starts with +
        setCustomerPhonePrefix(v => {
            const t = v.trim();
            return t ? (t.startsWith('+') ? t : `+${t}`) : '+48';
        });
        customerBlurTimerRef.current = setTimeout(() => {
            customerBlurTimerRef.current = null;
            if (customerJustSelectedRef.current) {
                customerJustSelectedRef.current = false;
                return;
            }
            setFocusedField(null);
            setShowCustomerDropdown(false);
            if (!selectedCustomer) {
                handleAddNewCustomerDirectly({ silent: true });
            } else if (customerEditMode && !prefillAwaitingConfirmRef.current) {
                handleConfirmEdit({ silent: true });
            }
        }, 300);
    };

    const getCustomerFieldErrors = (_fn: string, _ln: string, ph: string, em: string): Record<string, string> => {
        const errs: Record<string, string> = {};
        if (!ph && !em) {
            errs.customerPhone = 'Podaj telefon albo e-mail';
            errs.customerEmail = 'Podaj telefon albo e-mail';
        }
        return errs;
    };

    const handleAddNewCustomerDirectly = (options?: {
        silent?: boolean;
        skipContactValidation?: boolean;
        /**
         * Dane wprost od wywołującego. Arkusz „Nowy klient" na telefonie ustawia
         * pola formularza i od razu zapisuje klienta - stan Reacta nie zdążyłby
         * się jeszcze przerysować, więc pracujemy na przekazanych wartościach.
         */
        values?: { firstName: string; lastName: string; phone: string; email: string };
    }): boolean => {
        const fn = (options?.values?.firstName ?? customerFirstName).trim();
        const ln = (options?.values?.lastName ?? customerLastName).trim();
        const ph = options?.values ? options.values.phone.trim() : customerFullPhone;
        const em = (options?.values?.email ?? customerEmail).trim();
        if (!fn && !ln && !ph && !em) return false;
        if (!options?.skipContactValidation) {
            const fieldErrors = getCustomerFieldErrors(fn, ln, ph, em);
            if (Object.keys(fieldErrors).length > 0) {
                setErrors(prev => ({ ...prev, ...fieldErrors }));
                if (!options?.silent) {
                    showError('Popraw dane klienta', Object.values(fieldErrors)[0]);
                    if (fieldErrors.customerFirstName) customerInputRef.current?.focus();
                    else if (fieldErrors.customerLastName) customerLastNameInputRef.current?.focus();
                    else customerPhoneInputRef.current?.focus();
                }
                return false;
            }
        }
        setErrors(prev => {
            const { customer: _, customerFirstName: __, customerLastName: ___, customerPhone: ____, customerEmail: _____, ...rest } = prev;
            return rest;
        });
        setSelectedCustomer({ id: '', firstName: fn, lastName: ln, phone: ph, email: em, isNew: true });
        setSelectedCustomerId(undefined);
        setSelectedVehicle(null);
        setVehicleKind(DEFAULT_VEHICLE_KIND);
        setVehicleBrand('');
        setVehicleModel('');
        setVehicleYear('');
        setShowCustomerDropdown(false);
        setCustomerEditMode(false);
        vehicleAutoOpenRef.current = true;
        return true;
    };

    const handleEnterEditMode = () => {
        customerUpdateConfirmedRef.current = false;
        setCustomerEditMode(true);
        setShowCustomerDropdown(false);
        prefillAwaitingConfirmRef.current = false;
    };

    const handleConfirmEdit = (options?: { silent?: boolean }) => {
        if (!selectedCustomer) return;
        const fn = customerFirstName.trim();
        const ln = customerLastName.trim();
        const ph = customerFullPhone;
        const em = customerEmail.trim();
        if (selectedCustomer.isNew) {
            const fieldErrors = getCustomerFieldErrors(fn, ln, ph, em);
            if (Object.keys(fieldErrors).length > 0) {
                setErrors(prev => ({ ...prev, ...fieldErrors }));
                if (!options?.silent) {
                    showError('Popraw dane klienta', Object.values(fieldErrors)[0]);
                    if (fieldErrors.customerFirstName) customerInputRef.current?.focus();
                    else if (fieldErrors.customerLastName) customerLastNameInputRef.current?.focus();
                    else customerPhoneInputRef.current?.focus();
                }
                return;
            }
            setErrors(prev => {
                const { customer: _, customerFirstName: __, customerLastName: ___, customerPhone: ____, customerEmail: _____, ...rest } = prev;
                return rest;
            });
        }
        const changed = fn !== (selectedCustomer.firstName ?? '')
            || ln !== (selectedCustomer.lastName ?? '')
            || !samePhone(ph, selectedCustomer.phone)
            || em !== (selectedCustomer.email ?? '');
        if (!selectedCustomer.isNew && changed) {
            // Zmiana karty klienta z kartoteki pyta „Zmienić dane klienta?". Po cichu
            // (wyjście z pola) nie pytamy - edycja zostaje otwarta, a pytanie padnie
            // przy „Zatwierdź zmiany" albo przy zapisie rezerwacji.
            if (!options?.silent) setPendingChoice({ kind: 'customer', resubmit: false });
            return;
        }
        setSelectedCustomer({ ...selectedCustomer, firstName: fn, lastName: ln, phone: ph, email: em });
        setCustomerEditMode(false);
        prefillAwaitingConfirmRef.current = false;
    };

    /** Odpowiedź na „Zmienić dane klienta?" zadane przy „Zatwierdź zmiany". */
    const applyCustomerEdit = (decision: RecordDecision) => {
        if (!selectedCustomer) return;
        const edited: SelectedCustomer = {
            ...selectedCustomer,
            firstName: customerFirstName.trim(),
            lastName: customerLastName.trim(),
            phone: customerFullPhone,
            email: customerEmail.trim(),
            hasUpdates: true,
        };
        if (decision === 'edit') {
            setSelectedCustomer(edited);
            customerUpdateConfirmedRef.current = true;
        } else {
            setSelectedCustomer(asNewCustomer(edited));
            setSelectedCustomerId(undefined);
            customerUpdateConfirmedRef.current = false;
            // Auto z kartoteki zostaje w rezerwacji jako nowy pojazd nowego klienta.
            if (selectedVehicle && !selectedVehicle.isNew) setSelectedVehicle(asNewVehicle(selectedVehicle));
        }
        setCustomerEditMode(false);
        prefillAwaitingConfirmRef.current = false;
    };

    const handleCancelEdit = () => {
        if (selectedCustomer) {
            setCustomerFirstName(selectedCustomer.firstName ?? '');
            setCustomerLastName(selectedCustomer.lastName ?? '');
            const parsedCancel = parsePhone(selectedCustomer.phone ?? '');
            setCustomerPhonePrefix(parsedCancel.prefix);
            setCustomerPhone(parsedCancel.main);
            setCustomerEmail(selectedCustomer.email ?? '');
        }
        setCustomerEditMode(false);
        prefillAwaitingConfirmRef.current = false;
    };

    const handleVehicleSelectTriggerClick = () => {
        if (!selectedCustomer) return;
        if (vehicleBlurTimerRef.current) {
            clearTimeout(vehicleBlurTimerRef.current);
            vehicleBlurTimerRef.current = null;
        }
        setShowVehicleDropdown(prev => !prev);
        setFocusedField('vehicle');
    };

    const handleVehicleFieldFocus = () => {
        if (!selectedCustomer) return;
        if (vehicleBlurTimerRef.current) {
            clearTimeout(vehicleBlurTimerRef.current);
            vehicleBlurTimerRef.current = null;
        }
        setFocusedField('vehicle');
        setShowVehicleDropdown(true);
    };

    const handleVehicleFieldBlur = () => {
        vehicleBlurTimerRef.current = setTimeout(() => {
            vehicleBlurTimerRef.current = null;
            setFocusedField(null);
            setShowVehicleDropdown(false);
        }, 300);
    };

    const handleAddNewVehicleDirectly = () => {
        const br = vehicleBrand.trim();
        const mo = vehicleModel.trim();
        const yr = vehicleYear.trim();
        if (!br && !mo) return;
        setSelectedVehicle({ id: '', kind: vehicleKind, brand: br, model: mo, year: yr ? parseInt(yr) : undefined, isNew: true });
        setShowVehicleDropdown(false);
        setIsAddingNewVehicle(false);
    };

    /**
     * Przełącznik „Samochód / Motocykl". Zmiana rodzaju czyści markę i model, tak jak
     * zmiana marki czyści model: obie wartości pochodzą z katalogu poprzedniego rodzaju
     * i w nowym mogą nie istnieć (BMW samochodu i BMW motocykla mają inne modele).
     */
    const changeVehicleKind = (kind: VehicleKind) => {
        if (kind === vehicleKind) return;
        setVehicleKind(kind);
        setVehicleBrand('');
        setVehicleModel('');
    };

    const handleEnterVehicleEditMode = () => {
        vehicleUpdateConfirmedRef.current = false;
        setVehicleEditMode(true);
        setShowVehicleDropdown(false);
    };

    // Zmiana auta z kartoteki musi dojść do serwera jako UPDATE. Wcześniej pojazd
    // zostawał „istniejący bez zmian" i zapis wysyłał samo id - poprawiona marka,
    // model czy rok znikały, choć formularz je pokazywał.
    const applyVehicleEdits = (vehicle: SelectedVehicle): SelectedVehicle => {
        const brand = vehicleBrand.trim();
        const model = vehicleModel.trim();
        const year = vehicleYear.trim() ? parseInt(vehicleYear.trim()) : undefined;
        const changed = vehicleKind !== normalizeVehicleKind(vehicle.kind)
            || brand !== vehicle.brand || model !== vehicle.model || year !== vehicle.year;
        return {
            ...vehicle,
            kind: vehicleKind,
            brand,
            model,
            year,
            hasUpdates: !vehicle.isNew && (!!vehicle.hasUpdates || changed),
        };
    };

    const vehicleFieldsChanged = (vehicle: SelectedVehicle): boolean => {
        const year = vehicleYear.trim() ? parseInt(vehicleYear.trim()) : undefined;
        return vehicleKind !== normalizeVehicleKind(vehicle.kind)
            || vehicleBrand.trim() !== vehicle.brand || vehicleModel.trim() !== vehicle.model || year !== vehicle.year;
    };

    const handleConfirmVehicleEdit = () => {
        if (!selectedVehicle) return;
        if (!selectedVehicle.isNew && vehicleFieldsChanged(selectedVehicle)) {
            setPendingChoice({ kind: 'vehicle', resubmit: false });
            return;
        }
        setSelectedVehicle(applyVehicleEdits(selectedVehicle));
        setVehicleEditMode(false);
    };

    /** Odpowiedź na „Zmienić dane pojazdu?" zadane przy „Zatwierdź zmiany". */
    const applyVehicleEdit = (decision: RecordDecision) => {
        if (!selectedVehicle) return;
        const edited = applyVehicleEdits(selectedVehicle);
        if (decision === 'edit') {
            setSelectedVehicle(edited);
            vehicleUpdateConfirmedRef.current = true;
        } else {
            setSelectedVehicle(asNewVehicle(edited));
            vehicleUpdateConfirmedRef.current = false;
        }
        setVehicleEditMode(false);
    };

    const handleCancelVehicleEdit = () => {
        if (selectedVehicle) {
            setVehicleKind(normalizeVehicleKind(selectedVehicle.kind));
            setVehicleBrand(selectedVehicle.brand ?? '');
            setVehicleModel(selectedVehicle.model ?? '');
            setVehicleYear(selectedVehicle.year ? String(selectedVehicle.year) : '');
        }
        setVehicleEditMode(false);
    };

    const handleCustomerSelect = (customer: SelectedCustomer) => {
        customerUpdateConfirmedRef.current = false;
        vehicleUpdateConfirmedRef.current = false;
        setSelectedCustomer(customer);
        setSelectedCustomerId(customer.id);
        setSelectedVehicle(null);
        setVehicleKind(DEFAULT_VEHICLE_KIND);
        setVehicleBrand('');
        setVehicleModel('');
        setVehicleYear('');
        setIsAddingNewVehicle(false);
        vehicleAutoSelectedRef.current = false;
        vehicleAutoOpenRef.current = true;
        setCustomerFirstName(customer.firstName ?? '');
        setCustomerLastName(customer.lastName ?? '');
        const parsedPicked = parsePhone(customer.phone ?? '');
        setCustomerPhonePrefix(parsedPicked.prefix);
        setCustomerPhone(parsedPicked.main);
        setCustomerEmail(customer.email ?? '');
    };

    const handleVehicleSelect = (vehicle: SelectedVehicle) => {
        vehicleUpdateConfirmedRef.current = false;
        // Wybrany pojazd przynosi swój rodzaj - pola marki i modelu (tryb edycji, telefon)
        // podpowiadają wtedy z jego katalogu, a nie z katalogu aut.
        const kind = normalizeVehicleKind(vehicle.kind);
        setSelectedVehicle({ ...vehicle, kind });
        setVehicleKind(kind);
        setVehicleBrand(vehicle.brand ?? '');
        setVehicleModel(vehicle.model ?? '');
        setVehicleYear(vehicle.year ? String(vehicle.year) : '');
        setShowVehicleDropdown(false);
    };

    /**
     * Pola netto/brutto pokazywane przy pozycji w tabeli.
     *
     * [exactNetPln] jest tam, gdzie netto JEST znane dokładnie - z cennika albo
     * z okna ceny. Odtwarzanie go z brutta dzieleniem przez stawkę potrafi minąć
     * się o grosz z kwotą, którą za chwilę wyśle payload, więc na ekranie stałaby
     * inna liczba niż w żądaniu (CLAUDE.md §1).
     */
    const initPriceInputs = (id: string, grossPrice: number, vatRate: number, exactNetPln?: number) => {
        const net = exactNetPln ?? grossToNet(Math.round(grossPrice * 100), vatRate) / 100;
        setServicePriceInputs(prev => ({
            ...prev,
            [id]: { gross: grossPrice.toFixed(2), net: net.toFixed(2) },
        }));
    };

    const addService = (service: Service) => {
        // Adding the same service more than once is allowed, each addition is its
        // own line item with its own price/adjustment/notes (see `serviceRefs`).
        if (service.requireManualPrice) {
            setPendingService(service);
            setIsPriceInputModalOpen(true);
            setServiceSearch('');
            setShowServiceDropdown(false);
            return;
        }
        const lineId = nextLineId(service.id);
        setSelectedServiceIds(prev => [...prev, lineId]);
        setServiceRefs(prev => ({ ...prev, [lineId]: service.id }));
        // Brutto z cennika wygrywa z przeliczeniem: odtworzone z netta dryfuje o grosz
        // dla cen wpisanych od brutta.
        const prices = catalogLinePrices(service);
        setServicePrices(prev => ({ ...prev, [lineId]: prices.grossPln }));
        // Netto zapisujemy TERAZ, wprost z katalogu - nie po pierwszej interakcji z tabelą.
        // servicesAsLineItems czyta tę wartość bez przeliczania: odtwarzanie netta ze
        // wzoru VAT z brutta nie jest odwrotnością tego, jak katalog policzył
        // brutto z netta (1900,00 zł brutto -> 1544,72 zł netto -> z powrotem
        // odtworzone 1900,01 zł), więc cena wpisana jako netto zaczęłaby "pływać".
        setServiceBasePrices(prev => ({ ...prev, [lineId]: prices.netCents }));
        // Stawka z cennika też TERAZ: bez niej payload wysyłał pozycję katalogową z 23%.
        setServiceVatRates(prev => ({ ...prev, [lineId]: prices.vatRate }));
        initPriceInputs(lineId, prices.grossPln, prices.vatRate, prices.netCents / 100);
        setServiceSearch('');
        setShowServiceDropdown(false);
    };

    /**
     * Potwierdzenie ceny usługi rozliczanej indywidualnie.
     *
     * Okno oddaje PARĘ kwot i obie są tu dokładne: [PriceInput] wie, w którym polu
     * człowiek pisał, i drugą liczbę przeliczył raz, w chwili wpisywania. Wcześniej
     * to okno oddawało samo netto, a brutto powstawało tutaj z mnożenia przez
     * stawkę - i cena wpisana jako 1900,00 zł brutto wracała jako 1900,01 zł,
     * bo przejście brutto → netto → brutto nie jest tożsamością (CLAUDE.md §1).
     *
     * Zapasowe przeliczenie zostaje wyłącznie dla kwoty podanej w netcie: wtedy
     * brutto jest z definicji pochodne i nie ma czego chronić.
     */
    const handlePriceConfirm = (price: ManualPriceInput) => {
        if (!pendingService) return;
        // `??`, nie `||`: 0% to prawdziwa stawka - `||` robiło z niej 23%. Ta sama
        // stawka idzie do okna ceny (index.tsx), więc para liczy się przy jednej stawce.
        const prices = manualLinePrices(price, pendingService.vatRate ?? 23);
        const lineId = nextLineId(pendingService.id);
        setSelectedServiceIds(prev => [...prev, lineId]);
        setServiceRefs(prev => ({ ...prev, [lineId]: pendingService.id }));
        setServicePrices(prev => ({ ...prev, [lineId]: prices.grossPln }));
        setServiceBasePrices(prev => ({ ...prev, [lineId]: prices.netCents }));
        setServiceVatRates(prev => ({ ...prev, [lineId]: prices.vatRate }));
        initPriceInputs(lineId, prices.grossPln, prices.vatRate, prices.netCents / 100);
        setPendingService(null);
    };

    const handlePriceInputModalClose = () => {
        setIsPriceInputModalOpen(false);
        setPendingService(null);
    };

    const handleQuickServiceCreate = (service: { id?: string; name: string; basePriceNet: number; basePriceGross?: number; vatRate: number }) => {
        if (service.id) {
            queryClient.invalidateQueries({ queryKey: ['services'] });
        }
        const serviceId = service.id || `temp-${Date.now()}`;
        setSelectedServiceIds(prev => [...prev, serviceId]);
        const prices = catalogLinePrices(service);
        setServicePrices(prev => ({ ...prev, [serviceId]: prices.grossPln }));
        // Ta sama zasada co w addService: netto ustalone TERAZ, w chwili utworzenia
        // usługi (w QuickServiceModal, gdzie PriceInput wiąże netto i brutto atomowo),
        // przeżywa bez przeliczania - niezależnie od tego, czy w oknie wpisano netto
        // czy brutto.
        setServiceBasePrices(prev => ({ ...prev, [serviceId]: prices.netCents }));
        // Usługa zapisana od razu do cennika nie trafia do tempServices, więc bez tego
        // wpisu payload wysłałby ją z domyślnymi 23% zamiast stawki wybranej w oknie.
        setServiceVatRates(prev => ({ ...prev, [serviceId]: prices.vatRate }));
        initPriceInputs(serviceId, prices.grossPln, prices.vatRate, prices.netCents / 100);
        if (!service.id) {
            // Stawka wybrana w oknie tworzenia usługi - nie zawsze 23%. Ta wartość zasila
            // `servicesAsLineItems`/`buildAppointmentPayload` jako domyślna, gdy nikt
            // później ręcznie nie zmieni VAT-u dla tej pozycji (serviceVatRates[id] wtedy
            // pozostaje puste), więc twardy „23" cichcem podmieniał realną stawkę.
            setTempServices(prev => ({
                ...prev,
                [serviceId]: { name: service.name, basePriceNet: service.basePriceNet, vatRate: service.vatRate },
            }));
        }
        setServiceSearch('');
        setShowServiceDropdown(false);
    };

    const handleQuickColorCreate = async (color: { name: string; hexColor: string }) => {
        try {
            const newColor = await appointmentColorApi.createColor(color);
            queryClient.invalidateQueries({ queryKey: APPOINTMENT_COLORS_KEY });
            setSelectedColorId(newColor.id);
        } catch (error: any) {
            showError('Nie udało się dodać koloru', error?.response?.data?.message || 'Spróbuj ponownie.');
        }
    };

    // ─── Return ────────────────────────────────────────────────────────────────
    return {
        // Form state
        title, setTitle,
        startDateTime, setStartDateTime,
        endDateTime, setEndDateTime,
        isAllDay,
        notes, setNotes,
        doorToDoor, setDoorToDoor,
        selectedColorId, setSelectedColorId,

        // Customer
        selectedCustomer, setSelectedCustomer,
        selectedCustomerId, setSelectedCustomerId,
        customerFirstName, setCustomerFirstName,
        customerLastName, setCustomerLastName,
        customerPhonePrefix, setCustomerPhonePrefix,
        customerPhone, setCustomerPhone,
        customerEmail, setCustomerEmail,
        showCustomerDropdown, setShowCustomerDropdown,
        customerResults: foundCustomers,
        hasCustomerSearchQuery,
        customerJustSelectedRef,
        customerEditMode,
        handleCustomerFieldFocus,
        handleCustomerFieldBlur,
        formatPhone: formatMainPhone,
        handleAddNewCustomerDirectly,
        handleEnterEditMode,
        handleConfirmEdit,
        handleCancelEdit,

        // Vehicle
        selectedVehicle, setSelectedVehicle,
        vehicleKind, setVehicleKind, changeVehicleKind,
        vehicleBrand, setVehicleBrand,
        vehicleModel, setVehicleModel,
        vehicleYear, setVehicleYear,
        showVehicleDropdown, setShowVehicleDropdown,
        isAddingNewVehicle, setIsAddingNewVehicle,
        vehicles,
        vehicleEditMode,
        handleVehicleSelectTriggerClick,
        handleVehicleFieldFocus,
        handleVehicleFieldBlur,
        handleAddNewVehicleDirectly,
        handleEnterVehicleEditMode,
        handleConfirmVehicleEdit,
        handleCancelVehicleEdit,

        // Services
        selectedServiceIds, setSelectedServiceIds,
        serviceRefs, setServiceRefs,
        servicePrices, setServicePrices,
        servicePriceInputs, setServicePriceInputs,
        serviceAdjustments, setServiceAdjustments,
        serviceNotes, setServiceNotes,
        serviceVatRates, setServiceVatRates,
        serviceBasePrices, setServiceBasePrices,
        expandedServiceNote, setExpandedServiceNote,
        serviceSearch, setServiceSearch,
        showServiceDropdown, setShowServiceDropdown,
        services,
        filteredServices,
        hasSearchQuery,
        tempServices, setTempServices,

        // Colors
        appointmentColors,
        selectedColor,
        accentColor,

        // Sub-modal state
        isQuickServiceModalOpen, setIsQuickServiceModalOpen,
        isPriceInputModalOpen,
        isQuickColorModalOpen, setIsQuickColorModalOpen,
        pendingService,

        // UI state
        errors,
        isSubmitting,
        focusedField, setFocusedField,

        // Refs
        titleInputRef,
        startInputRef,
        endInputRef,
        customerInputRef,
        customerLastNameInputRef,
        customerPhonePrefixRef,
        customerPhoneInputRef,
        customerEmailInputRef,
        skipNextCustomerBlurRef,
        vehicleBrandInputRef,
        vehicleModelInputRef,
        vehicleYearInputRef,
        vehicleSectionRef,
        serviceInputRef,
        colorSectionRef,

        // SMS
        sendConfirmationSms, setSendConfirmationSms,
        sendReminderSms, setSendReminderSms,
        sendVisitCard, setSendVisitCard,
        preVisitEnabled,
        bookingConfirmationEnabled,
        visitCardEnabled,
        reservationCardLinkSmsEnabled,

        // Recurrence
        isRecurring, setIsRecurring,
        recurrenceRule, setRecurrenceRule,

        // Handlers
        handleAllDayToggle,
        handleSubmit,
        handleCustomerSelect,
        handleVehicleSelect,
        addService,
        handlePriceConfirm,
        handlePriceInputModalClose,
        handleQuickServiceCreate,
        handleQuickColorCreate,
        clearForm,

        // Szkic
        draft: draftsEnabled ? draft : null,
        draftSummary: draft ? draftSummary(draft) : '',
        restoreDraft,
        dismissDraft,
        clearAllWithUndo,

        // „Zmienić dane klienta/pojazdu?"
        pendingChoice,
        answerPendingChoice,
        cancelPendingChoice,

        smsPhone,
    };
}
