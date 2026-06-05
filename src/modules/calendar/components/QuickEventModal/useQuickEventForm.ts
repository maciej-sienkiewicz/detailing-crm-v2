import { useState, useEffect, useRef, useImperativeHandle } from 'react';
import type React from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/core';
import { useToast } from '@/common/components/Toast';
import { useCustomerVehicles, useCustomerSearch as useAppointmentCustomerSearch } from '@/modules/appointments/hooks/useAppointmentForm';
import type { SelectedCustomer, SelectedVehicle, RecurrenceRuleRequest } from '@/modules/appointments/types';
import { appointmentColorApi } from '@/modules/appointment-colors/api/appointmentColorApi';
import { useDebounce } from '@/common/hooks';
import { formatDateTimeLocal, formatDate, roundTo2, calculateFinalPrice } from './helpers';

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
        // No space — assume 3-char country code (+48, +44, …) if long enough
        if (trimmed.length > 3) {
            return { prefix: trimmed.slice(0, 3), main: formatMainPhone(trimmed.slice(3)) };
        }
        return { prefix: trimmed, main: '' };
    }
    return { prefix: '+48', main: formatMainPhone(trimmed) };
};
import type {
    Service,
    AppointmentColor,
    QuickEventFormData,
    QuickEventModalRef,
    EventCreationData,
    QuickEventInitialData,
    ServiceAdjustment,
} from './types';

interface UseQuickEventFormOptions {
    isOpen: boolean;
    eventData: EventCreationData | null;
    onClose: () => void;
    onSave: (data: QuickEventFormData) => Promise<void> | void;
    ref: React.ForwardedRef<QuickEventModalRef>;
    initialData?: QuickEventInitialData;
}

export function useQuickEventForm({ isOpen, eventData, onClose, onSave, ref, initialData }: UseQuickEventFormOptions) {
    // ─── Form state ────────────────────────────────────────────────────────────
    const [title, setTitle] = useState('');
    const [startDateTime, setStartDateTime] = useState('');
    const [endDateTime, setEndDateTime] = useState('');
    const [isAllDay, setIsAllDay] = useState(false);
    const [notes, setNotes] = useState('');
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
    const { data: foundCustomers = [] } = useAppointmentCustomerSearch(debouncedCustomerSearch);
    const hasCustomerSearchQuery = customerSearchQuery.length > 0;

    // ─── Vehicle state ─────────────────────────────────────────────────────────
    const [selectedVehicle, setSelectedVehicle] = useState<SelectedVehicle | null>(null);
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
    const [servicePrices, setServicePrices] = useState<{ [key: string]: number }>({});
    const [servicePriceInputs, setServicePriceInputs] = useState<{ [id: string]: { net: string; gross: string } }>({});
    const [serviceAdjustments, setServiceAdjustments] = useState<{ [key: string]: ServiceAdjustment }>({});
    const [serviceNotes, setServiceNotes] = useState<{ [key: string]: string }>({});
    const [expandedServiceNote, setExpandedServiceNote] = useState<string | null>(null);
    const [serviceSearch, setServiceSearch] = useState('');
    const [showServiceDropdown, setShowServiceDropdown] = useState(false);
    const [tempServices, setTempServices] = useState<{ [key: string]: { name: string; basePriceNet: number; vatRate: number } }>({});

    // ─── Customer edit mode ────────────────────────────────────────────────────
    const [customerEditMode, setCustomerEditMode] = useState(false);

    // ─── Vehicle edit mode ─────────────────────────────────────────────────────
    const [vehicleEditMode, setVehicleEditMode] = useState(false);

    // ─── SMS state ─────────────────────────────────────────────────────────────
    const [sendConfirmationSms, setSendConfirmationSms] = useState(false);
    const [sendReminderSms, setSendReminderSms] = useState(false);

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

    const { data: services = [] } = useQuery({
        queryKey: ['services'],
        queryFn: async () => {
            const response = await apiClient.get('/v1/services');
            return response.data.services || [];
        },
    });

    const { data: appointmentColors = [] } = useQuery({
        queryKey: ['appointment-colors'],
        queryFn: async () => {
            const response = await apiClient.get('/v1/appointment-colors');
            return response.data.colors || [];
        },
    });

    const { data: automationConfig } = useQuery({
        queryKey: ['sms-automation-config'],
        queryFn: () => import('@/modules/sms-campaigns/api/smsCampaignsApi').then(m => m.fetchAutomationConfig()),
    });
    const preVisitEnabled = automationConfig?.preVisit?.enabled ?? true;
    const bookingConfirmationEnabled = automationConfig?.bookingConfirmation?.enabled ?? true;

    // ─── Computed values ───────────────────────────────────────────────────────
    const selectedColor = appointmentColors.find((c: AppointmentColor) => c.id === selectedColorId);
    const accentColor = selectedColor?.hexColor || '#3b82f6';

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
            const shouldBeAllDay = daysDiff === 1 && eventData.allDay;

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

    useEffect(() => {
        if (appointmentColors.length > 0) {
            setSelectedColorId(prev => prev || appointmentColors[0].id);
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
            setSelectedVehicle({ id: v.id, brand: v.brand ?? '', model: v.model ?? '', year: v.year, isNew: false });
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
        setServicePrices({});
        setServiceAdjustments({});
        setServiceNotes({});
        setExpandedServiceNote(null);
        setServiceSearch('');
        setCustomerFirstName('');
        setCustomerLastName('');
        setCustomerPhonePrefix('+48');
        setCustomerPhone('');
        setCustomerEmail('');
        setCustomerEditMode(false);
        setShowCustomerDropdown(false);
        setVehicleBrand('');
        setVehicleModel('');
        setVehicleYear('');
        setVehicleEditMode(false);
        setShowVehicleDropdown(false);
        setIsAddingNewVehicle(false);
        vehicleAutoSelectedRef.current = false;
        vehicleAutoOpenRef.current = false;
        setNotes('');
        setTempServices({});
        setSendConfirmationSms(false);
        setSendReminderSms(false);
        setIsRecurring(false);
        setRecurrenceRule({ type: 'WEEKLY', intervalWeeks: 1, daysOfWeek: ['MONDAY'], endType: 'COUNT', maxOccurrences: 12 });
    };

    useImperativeHandle(ref, () => ({ clearForm }));

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
        }
        if (initialData.vehicle) {
            const v = initialData.vehicle;
            setSelectedVehicle(v);
            setVehicleBrand(v.brand || '');
            setVehicleModel(v.model || '');
            setVehicleYear(v.year ? String(v.year) : '');
        }
        if (initialData.serviceIds?.length) {
            setSelectedServiceIds(initialData.serviceIds);
        }
        if (initialData.servicePrices) {
            setServicePrices(initialData.servicePrices);
        }
        if (initialData.tempServices) {
            setTempServices(initialData.tempServices);
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isOpen]);

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
            setStartDateTime(startDateTime.includes('T') ? startDateTime : `${date}T09:00`);
            setEndDateTime(endDateTime ? (endDateTime.includes('T') ? endDateTime : `${date}T10:00`) : `${date}T10:00`);
        }
    };

    const validateForm = (): { [key: string]: string } => {
        const newErrors: { [key: string]: string } = {};

        if (!selectedCustomer) {
            newErrors.customer = 'Wybór klienta jest wymagany';
        } else if (selectedCustomer.isNew) {
            const hasPhone = selectedCustomer.phone && selectedCustomer.phone.trim().length > 0;
            const hasEmail = selectedCustomer.email && selectedCustomer.email.trim().length > 0;
            if (!hasPhone && !hasEmail) {
                newErrors.customer = 'Podaj co najmniej numer telefonu lub adres email klienta';
            }
        }

        if (!startDateTime) newErrors.startDateTime = 'Data rozpoczęcia jest wymagana';
        if (!endDateTime) newErrors.endDateTime = 'Data zakończenia jest wymagana';

        if (startDateTime && endDateTime && new Date(endDateTime) < new Date(startDateTime)) {
            newErrors.endDateTime = 'Data zakończenia musi być późniejsza niż data rozpoczęcia';
        }

        if (!selectedColorId) newErrors.color = 'Wybierz kolor wizyty lub dodaj nowy';

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
                newErrors.servicePrices = `Wprowadź cenę dla usług: ${servicePriceErrors.join(', ')}`;
            }
        }

        setErrors(newErrors);
        return newErrors;
    };

    const focusFirstError = (errs: { [key: string]: string }) => {
        const order = ['startDateTime', 'endDateTime', 'customer', 'services', 'servicePrices', 'color'];
        const firstKey = order.find(k => errs[k]);
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
            // @ts-ignore
            fieldRef.current.focus?.();
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (isSubmitting) return;
        setErrors({});
        const errs = validateForm();
        if (Object.keys(errs).length > 0) {
            showError('Nie można zapisać wizyty', 'Sprawdź zaznaczone pola formularza.');
            focusFirstError(errs);
            return;
        }
        setIsSubmitting(true);
        const vehicleToSubmit = selectedVehicle ?? (
            (isAddingNewVehicle || vehicles.length === 0) && (vehicleBrand.trim() || vehicleModel.trim())
                ? { id: '', brand: vehicleBrand.trim(), model: vehicleModel.trim(), year: vehicleYear.trim() ? parseInt(vehicleYear.trim()) : undefined, isNew: true as const }
                : null
        );
        try {
            const finalServicePrices: { [key: string]: number } = {};
            selectedServiceIds.forEach(id => {
                const svc = services.find((s: Service) => s.id === id) || tempServices[id];
                const baseGross = servicePrices[id] ?? 0;
                const vatRate = (svc as Service)?.vatRate ?? (tempServices[id]?.vatRate ?? 23);
                const adj = serviceAdjustments[id] ?? { type: 'PERCENT', value: 0 };
                finalServicePrices[id] = calculateFinalPrice(baseGross, vatRate, adj).finalGross;
            });
            await Promise.resolve(onSave({
                title,
                customer: selectedCustomer,
                vehicle: vehicleToSubmit,
                startDateTime,
                endDateTime,
                isAllDay,
                serviceIds: selectedServiceIds,
                servicePrices: finalServicePrices,
                serviceAdjustments,
                serviceNotes,
                tempServices,
                colorId: selectedColorId,
                notes,
                sendConfirmationSms: bookingConfirmationEnabled && sendConfirmationSms,
                sendReminderSms: preVisitEnabled && sendReminderSms,
                recurrence: isRecurring ? recurrenceRule : null,
            }));
        } catch (err: any) {
            let message = 'Wystąpił nieoczekiwany błąd podczas zapisu.';
            if (err?.response?.data) {
                const data = err.response.data;
                message = data.message || data.error || JSON.stringify(data);
            } else if (err?.message) {
                message = err.message;
            }
            showError('Błąd zapisu wizyty', message);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleCustomerFieldFocus = () => {
        if (customerBlurTimerRef.current) {
            clearTimeout(customerBlurTimerRef.current);
            customerBlurTimerRef.current = null;
        }
        setFocusedField('customer');
        setShowCustomerDropdown(true);
    };

    const handleCustomerFieldBlur = () => {
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
            } else if (customerEditMode) {
                handleConfirmEdit({ silent: true });
            }
        }, 300);
    };

    const getCustomerFieldErrors = (_fn: string, _ln: string, ph: string, em: string): Record<string, string> => {
        const errs: Record<string, string> = {};
        if (!ph && !em) {
            errs.customerPhone = 'Podaj telefon lub email';
            errs.customerEmail = 'Podaj telefon lub email';
        }
        return errs;
    };

    const handleAddNewCustomerDirectly = (options?: { silent?: boolean }): boolean => {
        const fn = customerFirstName.trim();
        const ln = customerLastName.trim();
        const ph = customerFullPhone;
        const em = customerEmail.trim();
        if (!fn && !ln && !ph && !em) return false;
        const fieldErrors = getCustomerFieldErrors(fn, ln, ph, em);
        if (Object.keys(fieldErrors).length > 0) {
            setErrors(prev => ({ ...prev, ...fieldErrors }));
            if (!options?.silent) {
                showError('Dane klienta', Object.values(fieldErrors)[0]);
                if (fieldErrors.customerFirstName) customerInputRef.current?.focus();
                else if (fieldErrors.customerLastName) customerLastNameInputRef.current?.focus();
                else customerPhoneInputRef.current?.focus();
            }
            return false;
        }
        setErrors(prev => {
            const { customer: _, customerFirstName: __, customerLastName: ___, customerPhone: ____, customerEmail: _____, ...rest } = prev;
            return rest;
        });
        setSelectedCustomer({ id: '', firstName: fn, lastName: ln, phone: ph, email: em, isNew: true });
        setSelectedCustomerId(undefined);
        setSelectedVehicle(null);
        setVehicleBrand('');
        setVehicleModel('');
        setVehicleYear('');
        setShowCustomerDropdown(false);
        setCustomerEditMode(false);
        vehicleAutoOpenRef.current = true;
        return true;
    };

    const handleEnterEditMode = () => {
        setCustomerEditMode(true);
        setShowCustomerDropdown(false);
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
                    showError('Dane klienta', Object.values(fieldErrors)[0]);
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
            || ph !== (selectedCustomer.phone ?? '')
            || em !== (selectedCustomer.email ?? '');
        setSelectedCustomer({
            ...selectedCustomer,
            firstName: fn,
            lastName: ln,
            phone: ph,
            email: em,
            hasUpdates: !selectedCustomer.isNew && changed,
        });
        setCustomerEditMode(false);
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
        setSelectedVehicle({ id: '', brand: br, model: mo, year: yr ? parseInt(yr) : undefined, isNew: true });
        setShowVehicleDropdown(false);
        setIsAddingNewVehicle(false);
    };

    const handleEnterVehicleEditMode = () => {
        setVehicleEditMode(true);
        setShowVehicleDropdown(false);
    };

    const handleConfirmVehicleEdit = () => {
        if (!selectedVehicle) return;
        setSelectedVehicle({
            ...selectedVehicle,
            brand: vehicleBrand.trim(),
            model: vehicleModel.trim(),
            year: vehicleYear.trim() ? parseInt(vehicleYear.trim()) : undefined,
        });
        setVehicleEditMode(false);
    };

    const handleCancelVehicleEdit = () => {
        if (selectedVehicle) {
            setVehicleBrand(selectedVehicle.brand ?? '');
            setVehicleModel(selectedVehicle.model ?? '');
            setVehicleYear(selectedVehicle.year ? String(selectedVehicle.year) : '');
        }
        setVehicleEditMode(false);
    };

    const handleCustomerSelect = (customer: SelectedCustomer) => {
        setSelectedCustomer(customer);
        setSelectedCustomerId(customer.id);
        setSelectedVehicle(null);
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
        setSelectedVehicle(vehicle);
        setVehicleBrand(vehicle.brand ?? '');
        setVehicleModel(vehicle.model ?? '');
        setVehicleYear(vehicle.year ? String(vehicle.year) : '');
        setShowVehicleDropdown(false);
    };

    const initPriceInputs = (id: string, grossPrice: number, vatRate: number) => {
        const net = roundTo2(grossPrice / (1 + vatRate / 100));
        setServicePriceInputs(prev => ({
            ...prev,
            [id]: { gross: grossPrice.toFixed(2), net: net.toFixed(2) },
        }));
    };

    const addService = (service: Service) => {
        if (selectedServiceIds.includes(service.id)) return;
        if (service.requireManualPrice) {
            setPendingService(service);
            setIsPriceInputModalOpen(true);
            setServiceSearch('');
            setShowServiceDropdown(false);
            return;
        }
        setSelectedServiceIds(prev => [...prev, service.id]);
        const grossPrice = roundTo2((service.basePriceNet / 100) * (100 + service.vatRate) / 100);
        setServicePrices(prev => ({ ...prev, [service.id]: grossPrice }));
        initPriceInputs(service.id, grossPrice, service.vatRate);
        setServiceSearch('');
        setShowServiceDropdown(false);
    };

    const handlePriceConfirm = (priceNet: number) => {
        if (!pendingService) return;
        const vatRate = pendingService.vatRate || 23;
        const gross = roundTo2((priceNet / 100) * (100 + vatRate) / 100);
        setSelectedServiceIds(prev => [...prev, pendingService.id]);
        setServicePrices(prev => ({ ...prev, [pendingService.id]: gross }));
        initPriceInputs(pendingService.id, gross, vatRate);
        setPendingService(null);
    };

    const handlePriceInputModalClose = () => {
        setIsPriceInputModalOpen(false);
        setPendingService(null);
    };

    const handleQuickServiceCreate = (service: { id?: string; name: string; basePriceNet: number; vatRate: 23 }) => {
        if (service.id) {
            queryClient.invalidateQueries({ queryKey: ['services'] });
        }
        const serviceId = service.id || `temp-${Date.now()}`;
        setSelectedServiceIds(prev => [...prev, serviceId]);
        const grossPrice = roundTo2((service.basePriceNet / 100) * (100 + service.vatRate) / 100);
        setServicePrices(prev => ({ ...prev, [serviceId]: grossPrice }));
        initPriceInputs(serviceId, grossPrice, service.vatRate);
        if (!service.id) {
            setTempServices(prev => ({
                ...prev,
                [serviceId]: { name: service.name, basePriceNet: service.basePriceNet, vatRate: 23 },
            }));
        }
        setServiceSearch('');
        setShowServiceDropdown(false);
    };

    const handleQuickColorCreate = async (color: { name: string; hexColor: string }) => {
        try {
            const newColor = await appointmentColorApi.createColor(color);
            queryClient.invalidateQueries({ queryKey: ['appointment-colors'] });
            setSelectedColorId(newColor.id);
        } catch (error: any) {
            console.error('Failed to create color:', error);
            showError('Błąd tworzenia koloru', error?.message || 'Nie udało się utworzyć koloru. Spróbuj ponownie.');
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
        servicePrices, setServicePrices,
        servicePriceInputs, setServicePriceInputs,
        serviceAdjustments, setServiceAdjustments,
        serviceNotes, setServiceNotes,
        expandedServiceNote, setExpandedServiceNote,
        serviceSearch, setServiceSearch,
        showServiceDropdown, setShowServiceDropdown,
        services,
        filteredServices,
        hasSearchQuery,
        tempServices,

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
        vehicleBrandInputRef,
        vehicleModelInputRef,
        vehicleYearInputRef,
        vehicleSectionRef,
        serviceInputRef,
        colorSectionRef,

        // SMS
        sendConfirmationSms, setSendConfirmationSms,
        sendReminderSms, setSendReminderSms,
        preVisitEnabled,
        bookingConfirmationEnabled,

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
    };
}
