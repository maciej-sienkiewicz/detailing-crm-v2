// src/modules/calendar/components/QuickEventModal.tsx

import React, { useState, useEffect, useRef, forwardRef, useImperativeHandle } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/core';
import type { EventCreationData } from '../types';
import { useToast } from '@/common/components/Toast';
// import { CustomerModal } from '@/modules/appointments/components/CustomerModal';
import { VehicleModal } from '@/modules/appointments/components/VehicleModal';
import { QuickServiceModal } from './QuickServiceModal';
import { PriceInputModal } from './PriceInputModal';
import { QuickColorModal } from './QuickColorModal';
import { useCustomerVehicles, useCustomerSearch as useAppointmentCustomerSearch } from '@/modules/appointments/hooks/useAppointmentForm';
import type { SelectedCustomer, SelectedVehicle } from '@/modules/appointments/types';
import { appointmentColorApi } from '@/modules/appointment-colors/api/appointmentColorApi';
import { QuickCustomerModal } from './QuickCustomerModal';
import { useDebounce } from '@/common/hooks';
import * as S from './QuickEventModalStyles';
import { Toggle } from '@/common/components/Toggle';

// --- TYPES FOR API RESPONSES ---
interface Service {
    id: string;
    name: string;
    basePriceNet: number;
    vatRate: number;
    requireManualPrice: boolean;
}

interface AppointmentColor {
    id: string;
    name: string;
    hexColor: string;
}

// --- HELPER FUNCTIONS ---
/**
 * Kapitalizuje pierwszą literę i zamienia resztę na małe litery
 */
const capitalize = (str: string): string => {
    if (!str) return '';
    return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
};

/**
 * Parsuje wprowadzony tekst z pola wyszukiwania klienta
 * @param input - tekst wprowadzony przez użytkownika
 * @returns obiekt z sparsowanymi wartościami dla firstName, lastName, email, phone
 */
const parseCustomerInput = (input: string): {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
} => {
    const trimmed = input.trim();

    // Sprawdź czy zawiera @, wtedy to email
    if (trimmed.includes('@')) {
        return {
            firstName: '',
            lastName: '',
            email: trimmed,
            phone: '',
        };
    }

    // Sprawdź czy to same cyfry (z ewentualnymi spacjami, myślnikami, plusami)
    const digitsOnly = trimmed.replace(/[\s\-+()]/g, '');
    if (/^\d+$/.test(digitsOnly) && digitsOnly.length > 0) {
        return {
            firstName: '',
            lastName: '',
            email: '',
            phone: trimmed,
        };
    }

    // Podziel na wyrazy
    const words = trimmed.split(/\s+/).filter(w => w.length > 0);

    if (words.length === 1) {
        // Jeden wyraz - to imię
        return {
            firstName: capitalize(words[0]),
            lastName: '',
            email: '',
            phone: '',
        };
    } else if (words.length >= 2) {
        // Dwa lub więcej wyrazów - pierwszy to imię, drugi to nazwisko
        return {
            firstName: capitalize(words[0]),
            lastName: capitalize(words[1]),
            email: '',
            phone: '',
        };
    }

    // Pusty string lub brak dopasowania
    return {
        firstName: '',
        lastName: '',
        email: '',
        phone: '',
    };
};

// --- ICONS (Inline SVG) ---
const IconClock = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10"/>
        <polyline points="12 6 12 12 16 14"/>
    </svg>
);

const IconUser = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
        <circle cx="12" cy="7" r="4"/>
    </svg>
);

const IconCar = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 16H9m10 0h3v-3.15a1 1 0 0 0-.84-.99L16 11l-2.7-3.6a1 1 0 0 0-.8-.4H5.24a2 2 0 0 0-1.8 1.1l-.8 1.63A6 6 0 0 0 2 12.42V16h2"/>
        <circle cx="6.5" cy="16.5" r="2.5"/>
        <circle cx="16.5" cy="16.5" r="2.5"/>
    </svg>
);

const IconSettings = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.38a2 2 0 0 0-.73-2.73l-.15-.1a2 2 0 0 1-1-1.72v-.51a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/>
        <circle cx="12" cy="12" r="3"/>
    </svg>
);

const IconNote = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
    </svg>
);

const IconTrash = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="3 6 5 6 21 6"/>
        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
    </svg>
);

const IconX = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="18" y1="6" x2="6" y2="18"/>
        <line x1="6" y1="6" x2="18" y2="18"/>
    </svg>
);

const IconPalette = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="13.5" cy="6.5" r=".5"/>
        <circle cx="17.5" cy="10.5" r=".5"/>
        <circle cx="8.5" cy="7.5" r=".5"/>
        <circle cx="6.5" cy="12.5" r=".5"/>
        <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.554C21.965 6.012 17.461 2 12 2z"/>
    </svg>
);

const IconMessageSquare = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
    </svg>
);

const IconPlus = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="12" cy="12" r="10"/>
        <line x1="12" y1="8" x2="12" y2="16"/>
        <line x1="8" y1="12" x2="16" y2="12"/>
    </svg>
);

// --- TYPES ---
interface QuickEventModalProps {
    isOpen: boolean;
    eventData: EventCreationData | null;
    onClose: () => void;
    onSave: (data: QuickEventFormData) => Promise<void> | void;
}

export interface QuickEventFormData {
    title: string;
    customer: SelectedCustomer | null;
    vehicle: SelectedVehicle | null;
    startDateTime: string;
    endDateTime: string;
    isAllDay: boolean;
    serviceIds: string[];
    servicePrices?: { [key: string]: number };
    serviceNotes?: { [key: string]: string };
    // Map tymczasowych usług utworzonych w modalu: key = temp-id, value = dane usługi
    tempServices?: { [key: string]: { name: string; basePriceNet: number; vatRate: number } };
    colorId: string;
    notes?: string;
}

export interface QuickEventModalRef {
    clearForm: () => void;
}

// --- COMPONENT ---
export const QuickEventModal = forwardRef<QuickEventModalRef, QuickEventModalProps>(({ 
    isOpen,
    eventData,
    onClose,
    onSave,
}, ref) => {
    // State initialization
    const [title, setTitle] = useState('');
    const [selectedCustomerId, setSelectedCustomerId] = useState<string>();
    const [selectedCustomer, setSelectedCustomer] = useState<SelectedCustomer | null>(null);
    const [selectedVehicle, setSelectedVehicle] = useState<SelectedVehicle | null>(null);
    const [startDateTime, setStartDateTime] = useState('');
    const [endDateTime, setEndDateTime] = useState('');
    const [isAllDay, setIsAllDay] = useState(false);
    const [selectedServiceIds, setSelectedServiceIds] = useState<string[]>([]);
    const [servicePrices, setServicePrices] = useState<{ [key: string]: number }>({});
    const [serviceNotes, setServiceNotes] = useState<{ [key: string]: string }>({});
    const [expandedServiceNote, setExpandedServiceNote] = useState<string | null>(null);
    const [serviceSearch, setServiceSearch] = useState('');
    const [showServiceDropdown, setShowServiceDropdown] = useState(false);
    const [selectedColorId, setSelectedColorId] = useState('');
    const [notes, setNotes] = useState('');
    const [tempServices, setTempServices] = useState<{ [key: string]: { name: string; basePriceNet: number; vatRate: number } }>({});

    // Modal states
    // const [isCustomerModalOpen, setIsCustomerModalOpen] = useState(false);
    const [isAddCustomerModalOpen, setIsAddCustomerModalOpen] = useState(false);
    const [isVehicleModalOpen, setIsVehicleModalOpen] = useState(false);
    const [vehicleModalInitialMode, setVehicleModalInitialMode] = useState<'select' | 'new'>('select');
    const [isQuickServiceModalOpen, setIsQuickServiceModalOpen] = useState(false);
    const [isPriceInputModalOpen, setIsPriceInputModalOpen] = useState(false);
    const [isQuickColorModalOpen, setIsQuickColorModalOpen] = useState(false);
    const [pendingService, setPendingService] = useState<Service | null>(null);

    // Customer search state
    const [customerSearch, setCustomerSearch] = useState('');
    const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);
    const debouncedCustomerSearch = useDebounce(customerSearch, 300);
    const { data: foundCustomers = [] } = useAppointmentCustomerSearch(debouncedCustomerSearch);
    const customerResults = foundCustomers;
    const hasCustomerSearchQuery = customerSearch.trim().length > 0;

    // Parsed customer data for new customer modal
    const [parsedCustomerData, setParsedCustomerData] = useState({
        firstName: '',
        lastName: '',
        email: '',
        phone: '',
    });

    // Vehicle search state
    const [vehicleSearch, setVehicleSearch] = useState('');
    const [showVehicleDropdown, setShowVehicleDropdown] = useState(false);

    // Validation state
    const [errors, setErrors] = useState<{ [key: string]: string }>({});

    // Submit state
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Focus states
    const [focusedField, setFocusedField] = useState<string | null>(null);
    const titleInputRef = useRef<HTMLInputElement>(null);
    const startInputRef = useRef<HTMLInputElement>(null);
    const endInputRef = useRef<HTMLInputElement>(null);
    const customerInputRef = useRef<HTMLInputElement>(null);
    const vehicleInputRef = useRef<HTMLInputElement>(null);
    const serviceInputRef = useRef<HTMLInputElement>(null);
    const colorSectionRef = useRef<HTMLDivElement>(null);

    // Toast
    const { showError } = useToast();

    // Query client for cache invalidation
    const queryClient = useQueryClient();

    // Queries
    const { data: customerVehicles } = useCustomerVehicles(
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

    // Get selected color hex
    const selectedColor = appointmentColors.find((c: AppointmentColor) => c.id === selectedColorId);
    const accentColor = selectedColor?.hexColor || '#3b82f6';

    // Helpers
    const formatDateTimeLocal = (date: Date) => {
        const d = new Date(date);
        const pad = (n: number) => n.toString().padStart(2, '0');
        return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
    };

    const formatDate = (date: Date) => {
        const d = new Date(date);
        const pad = (n: number) => n.toString().padStart(2, '0');
        return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
    };

    // Effects
    useEffect(() => {
        if (eventData) {
            const timeDiff = eventData.end.getTime() - eventData.start.getTime();
            const daysDiff = Math.ceil(timeDiff / (1000 * 60 * 60 * 24));
            const shouldBeAllDay = daysDiff === 1 && eventData.allDay;

            const newIsAllDay = shouldBeAllDay;
            let newStartDateTime = '';
            let newEndDateTime = '';

            if (shouldBeAllDay) {
                newStartDateTime = formatDate(eventData.start);
                newEndDateTime = `${formatDate(eventData.start)}T23:59:59`;
            } else if (daysDiff > 1) {
                const startDate = new Date(eventData.start);
                startDate.setHours(9, 0, 0, 0);
                newStartDateTime = formatDateTimeLocal(startDate);

                const endDate = new Date(eventData.end);
                // For multi-day selection, set the end to the last selected day at 20:00 instead of 00:00
                endDate.setDate(endDate.getDate() - 1);
                endDate.setHours(20, 0, 0, 0);
                newEndDateTime = formatDateTimeLocal(endDate);
            } else {
                newStartDateTime = formatDateTimeLocal(eventData.start);
                newEndDateTime = formatDateTimeLocal(eventData.end);
            }

            setIsAllDay(newIsAllDay);
            setStartDateTime(newStartDateTime);
            setEndDateTime(newEndDateTime);
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
        // Previously this auto-opened the VehicleModal. With new UX (inline vehicle dropdown),
        // we no longer auto-open any modal here.
    }, [selectedCustomer, customerVehicles, selectedVehicle]);

    // Clear form function
    const clearForm = () => {
        setTitle('');
        setSelectedCustomerId(undefined);
        setSelectedCustomer(null);
        setSelectedVehicle(null);
        setSelectedServiceIds([]);
        setServicePrices({});
        setServiceNotes({});
        setExpandedServiceNote(null);
        setServiceSearch('');
        setCustomerSearch('');
        setShowCustomerDropdown(false);
        setVehicleSearch('');
        setShowVehicleDropdown(false);
        setNotes('');
        setTempServices({});
        setParsedCustomerData({ firstName: '', lastName: '', email: '', phone: '' });
    };

    useImperativeHandle(ref, () => ({
        clearForm
    }));

    // Handlers
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
            const startWithTime = `${date}T09:00`;
            const endWithTime = `${date}T10:00`;
            setStartDateTime(startDateTime.includes('T') ? startDateTime : startWithTime);
            setEndDateTime(endDateTime ? (endDateTime.includes('T') ? endDateTime : endWithTime) : endWithTime);
        }
    };
    const validateForm = (): { [key: string]: string } => {
        const newErrors: { [key: string]: string } = {};

        // Walidacja klienta
        if (!selectedCustomer) {
            newErrors.customer = 'Wybór klienta jest wymagany';
        } else if (selectedCustomer.isNew) {
            // Dodatkowa walidacja dla nowego klienta
            if (!selectedCustomer.firstName || selectedCustomer.firstName.trim().length < 2) {
                newErrors.customer = 'Imię klienta jest wymagane (minimum 2 znaki)';
            } else if (!selectedCustomer.lastName || selectedCustomer.lastName.trim().length < 2) {
                newErrors.customer = 'Nazwisko klienta jest wymagane (minimum 2 znaki)';
            } else {
                // Sprawdź czy podano co najmniej jeden sposób kontaktu
                const hasPhone = selectedCustomer.phone && selectedCustomer.phone.trim().length > 0;
                const hasEmail = selectedCustomer.email && selectedCustomer.email.trim().length > 0;

                if (!hasPhone && !hasEmail) {
                    newErrors.customer = 'Podaj co najmniej numer telefonu lub adres email klienta';
                }
            }
        }

        // Walidacja dat
        if (!startDateTime) {
            newErrors.startDateTime = 'Data rozpoczęcia jest wymagana';
        }
        if (!endDateTime) {
            newErrors.endDateTime = 'Data zakończenia jest wymagana';
        }

        // Walidacja czy data końca jest po dacie rozpoczęcia
        if (startDateTime && endDateTime) {
            const start = new Date(startDateTime);
            const end = new Date(endDateTime);
            if (end < start) {
                newErrors.endDateTime = 'Data zakończenia musi być późniejsza niż data rozpoczęcia';
            }
        }

        // Walidacja koloru
        if (!selectedColorId) {
            newErrors.color = 'Wybierz kolor wizyty lub dodaj nowy';
        }

        // Walidacja usług
        if (selectedServiceIds.length === 0) {
            newErrors.services = 'Dodaj przynajmniej jedną usługę';
        } else {
            // Walidacja cen dla każdej usługi
            const servicePriceErrors: string[] = [];
            selectedServiceIds.forEach((serviceId) => {
                const price = servicePrices[serviceId];
                if (!price || price <= 0) {
                    const service = services.find((s: Service) => s.id === serviceId) ||
                                  tempServices[serviceId];
                    const serviceName = service?.name || 'Nieznana usługa';
                    servicePriceErrors.push(serviceName);
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
        const ref = map[firstKey];
        if (ref && ref.current) {
            ref.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
            // Try to focus if focusable
            // @ts-ignore
            ref.current.focus?.();
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (isSubmitting) return;

        // Wyczyść poprzednie błędy
        setErrors({});

        // Waliduj formularz
        const errs = validateForm();
        if (Object.keys(errs).length > 0) {
            showError('Nie można zapisać wizyty', 'Sprawdź zaznaczone pola formularza.');
            focusFirstError(errs);
            return;
        }

        setIsSubmitting(true);
        try {
            await Promise.resolve(onSave({
                title,
                customer: selectedCustomer,
                vehicle: selectedVehicle,
                startDateTime,
                endDateTime,
                isAllDay,
                serviceIds: selectedServiceIds,
                servicePrices,
                serviceNotes,
                tempServices,
                colorId: selectedColorId,
                notes,
            }));
        } catch (err: any) {
            let message = 'Wystąpił nieoczekiwany błąd podczas zapisu.';
            // Extract common API error shapes
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

    const handleCustomerSelect = (customer: SelectedCustomer) => {
        setSelectedCustomer(customer);
        setSelectedCustomerId(customer.id);
        setSelectedVehicle(null);
        setVehicleSearch('');
    };

    const handleVehicleSelect = (vehicle: SelectedVehicle) => {
        setSelectedVehicle(vehicle);
        setVehicleSearch(`${vehicle.brand ?? ''} ${vehicle.model ?? ''}`.trim());
        setShowVehicleDropdown(false);
    };


    const roundTo2 = (v: number) => Math.round((v + Number.EPSILON) * 100) / 100;

    const addService = (service: Service) => {
        if (selectedServiceIds.includes(service.id)) {
            return; // Usługa już dodana
        }

        // Dla usług z requireManualPrice, otwórz modal do wprowadzenia ceny
        if (service.requireManualPrice) {
            setPendingService(service);
            setIsPriceInputModalOpen(true);
            setServiceSearch('');
            setShowServiceDropdown(false);
            return;
        }

        // Dla zwykłych usług, dodaj od razu z domyślną ceną
        setSelectedServiceIds(prev => [...prev, service.id]);
        const grossPrice = roundTo2((service.basePriceNet / 100) * (100 + service.vatRate) / 100);
        setServicePrices(prev => ({ ...prev, [service.id]: grossPrice }));
        setServiceSearch('');
        setShowServiceDropdown(false);
    };

    const handlePriceConfirm = (price: number) => {
        if (!pendingService) return;

        // Dodaj usługę z wprowadzoną ceną
        setSelectedServiceIds(prev => [...prev, pendingService.id]);
        setServicePrices(prev => ({ ...prev, [pendingService.id]: roundTo2(price) }));

        // Wyczyść pending service
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

        if (!service.id) {
            setTempServices(prev => ({
                ...prev,
                [serviceId]: { name: service.name, basePriceNet: service.basePriceNet, vatRate: 23 }
            }));
        }

        setServiceSearch('');
        setShowServiceDropdown(false);
    };

    const handleQuickColorCreate = async (color: { name: string; hexColor: string }) => {
        try {
            // Zapisz kolor w bazie danych
            const newColor = await appointmentColorApi.createColor(color);

            // Odśwież listę kolorów
            queryClient.invalidateQueries({ queryKey: ['appointment-colors'] });

            // Ustaw nowo utworzony kolor jako wybrany
            setSelectedColorId(newColor.id);
        } catch (error: any) {
            console.error('Failed to create color:', error);
            const msg = error?.message || 'Nie udało się utworzyć koloru. Spróbuj ponownie.';
            showError('Błąd tworzenia koloru', msg);
        }
    };

    if (!eventData) return null;

    const filteredServices = services.filter((s: Service) =>
        serviceSearch.length === 0 ||
        s.name.toLowerCase().includes(serviceSearch.toLowerCase())
    );
    const hasSearchQuery = serviceSearch.trim().length > 0;

    return (
        <>
            <S.Overlay $isOpen={isOpen} onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
                <S.ModalContainer $isOpen={isOpen}>
                    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
                        <S.Header>
                            <S.DragHandle>
                                <div />
                            </S.DragHandle>

                            <S.CloseButton type="button" onClick={onClose}>
                                <IconX />
                            </S.CloseButton>

                            <div style={{ marginTop: '8px' }}>
                                <S.TitleInput
                                    ref={titleInputRef}
                                    type="text"
                                    placeholder="Dodaj tytuł rezerwacji"
                                    value={title}
                                    onChange={(e) => setTitle(e.target.value)}
                                    $accentColor={focusedField === 'title' ? accentColor : undefined}
                                    onFocus={() => setFocusedField('title')}
                                    onBlur={() => setFocusedField(null)}
                                />
                            </div>
                        </S.Header>

                        <S.ScrollableContent>
                            {/* TIME ROW */}
                            <S.Row>
                                <S.IconWrapper $color={focusedField?.startsWith('time') ? accentColor : undefined}>
                                    <IconClock />
                                </S.IconWrapper>
                                <S.RowContent>
                                    <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                                        <Toggle
                                            checked={isAllDay}
                                            onChange={handleAllDayToggle}
                                            label="Wizyta całodniowa"
                                            size="sm"
                                        />
                                    </div>
                                    <S.InputGrid>
                                        <S.InputGroup>
                                            <S.Label>{isAllDay ? 'Data' : 'Początek'}</S.Label>
                                            <S.Input
                                                ref={startInputRef}
                                                type={isAllDay ? 'date' : 'datetime-local'}
                                                value={startDateTime}
                                                onChange={(e) => {
                                                    const value = e.target.value;
                                                    setStartDateTime(value);
                                                    if (isAllDay) {
                                                        const date = value.split('T')[0];
                                                        setEndDateTime(`${date}T23:59:59`);
                                                    }
                                                }}
                                                required
                                                aria-invalid={!!errors.startDateTime}
                                                $accentColor={focusedField === 'time-start' ? accentColor : undefined}
                                                $hasError={!!errors.startDateTime}
                                                onFocus={() => setFocusedField('time-start')}
                                                onBlur={() => setFocusedField(null)}
                                            />
                                            {errors.startDateTime && <S.ErrorMessage>{errors.startDateTime}</S.ErrorMessage>}
                                        </S.InputGroup>
                                        {!isAllDay && (
                                            <S.InputGroup>
                                                <S.Label>Koniec</S.Label>
                                                <S.Input
                                                ref={endInputRef}
                                                type="datetime-local"
                                                value={endDateTime}
                                                onChange={(e) => setEndDateTime(e.target.value)}
                                                required
                                                aria-invalid={!!errors.endDateTime}
                                                $accentColor={focusedField === 'time-end' ? accentColor : undefined}
                                                $hasError={!!errors.endDateTime}
                                                onFocus={() => setFocusedField('time-end')}
                                                onBlur={() => setFocusedField(null)}
                                            />
                                                {errors.endDateTime && <S.ErrorMessage>{errors.endDateTime}</S.ErrorMessage>}
                                            </S.InputGroup>
                                        )}
                                    </S.InputGrid>
                                </S.RowContent>
                            </S.Row>

                            <S.Divider />

                            {/* CUSTOMER ROW */}
                            <S.Row>
                                <S.IconWrapper $color={focusedField === 'customer' ? accentColor : undefined}>
                                    <IconUser />
                                </S.IconWrapper>
                                <S.RowContent>
                                    <S.DropdownContainer>
                                        <S.Input
                                            ref={customerInputRef}
                                            type="text"
                                            placeholder={selectedCustomer ? `${selectedCustomer.firstName} ${selectedCustomer.lastName}` : 'Dodaj klienta...'}
                                            value={customerSearch}
                                            onChange={(e) => {
                                                setCustomerSearch(e.target.value);
                                                setShowCustomerDropdown(true);
                                            }}
                                            onKeyDown={(e) => {
                                                // Obsługa Enter - automatyczne otwieranie modalu dodawania klienta
                                                if (e.key === 'Enter') {
                                                    e.preventDefault();

                                                    // Jeśli użytkownik już coś wybrał, nie rób nic
                                                    if (selectedCustomer) return;

                                                    const trimmed = customerSearch.trim();
                                                    if (!trimmed) return;

                                                    // Parsuj wprowadzone dane
                                                    const parsed = parseCustomerInput(trimmed);
                                                    const hasFirstAndLastName = parsed.firstName && parsed.lastName;

                                                    // Jeśli mamy imię i nazwisko i brak wyników, otwórz modal natychmiast
                                                    if (hasFirstAndLastName && customerResults.length === 0) {
                                                        setParsedCustomerData(parsed);
                                                        setIsAddCustomerModalOpen(true);
                                                        setShowCustomerDropdown(false);
                                                    }
                                                }
                                            }}
                                            aria-invalid={!!errors.customer}
                                            $accentColor={focusedField === 'customer' ? accentColor : undefined}
                                            $hasError={!!errors.customer}
                                            onFocus={() => {
                                                setFocusedField('customer');
                                                setShowCustomerDropdown(true);
                                            }}
                                            onBlur={() => {
                                                setFocusedField(null);
                                                // Dłuższy timeout tylko po to aby dać czas na kliknięcie w dropdown
                                                setTimeout(() => setShowCustomerDropdown(false), 200);
                                            }}
                                        />
                                        {showCustomerDropdown && (
                                            <S.Dropdown>
                                                {customerResults.map((c) => (
                                                    <S.DropdownItem
                                                        key={c.id}
                                                        type="button"
                                                        onClick={() => {
                                                            handleCustomerSelect({
                                                                id: c.id,
                                                                firstName: c.firstName,
                                                                lastName: c.lastName,
                                                                phone: c.phone,
                                                                email: c.email,
                                                                isNew: false,
                                                            });
                                                            setCustomerSearch(`${c.firstName ?? ''} ${c.lastName ?? ''}`.trim());
                                                            setShowCustomerDropdown(false);
                                                        }}
                                                        $accentColor={accentColor}
                                                    >
                                                        <span>{c.firstName} {c.lastName}</span>
                                                        <span>{c.phone || c.email}</span>
                                                    </S.DropdownItem>
                                                ))}
                                                {hasCustomerSearchQuery && (
                                                    <S.DropdownAddButton
                                                        type="button"
                                                        onClick={() => {
                                                            // Parsuj wprowadzone dane przed otwarciem modalu
                                                            setParsedCustomerData(parseCustomerInput(customerSearch));
                                                            setIsAddCustomerModalOpen(true);
                                                            setShowCustomerDropdown(false);
                                                            setFocusedField(null);
                                                        }}
                                                    >
                                                        <IconPlus />
                                                        <span>Dodaj nowego klienta</span>
                                                    </S.DropdownAddButton>
                                                )}
                                            </S.Dropdown>
                                        )}
                                    </S.DropdownContainer>
                                    {errors.customer && <S.ErrorMessage>{errors.customer}</S.ErrorMessage>}
                                    {selectedCustomer && (selectedCustomer.phone || selectedCustomer.email) && (
                                        <div style={{
                                            marginTop: '8px',
                                            padding: '8px 12px',
                                            background: 'rgba(99, 102, 241, 0.05)',
                                            borderRadius: '8px',
                                            fontSize: '13px',
                                            color: '#64748b',
                                            display: 'flex',
                                            flexDirection: 'column',
                                            gap: '4px'
                                        }}>
                                            {selectedCustomer.phone && (
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: '14px', height: '14px', flexShrink: 0 }}>
                                                        <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72 12.84 12.84 0 00.7 2.81 2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45 12.84 12.84 0 002.81.7A2 2 0 0122 16.92z" />
                                                    </svg>
                                                    <span>{selectedCustomer.phone}</span>
                                                </div>
                                            )}
                                            {selectedCustomer.email && (
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: '14px', height: '14px', flexShrink: 0 }}>
                                                        <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                                                        <polyline points="22,6 12,13 2,6" />
                                                    </svg>
                                                    <span>{selectedCustomer.email}</span>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </S.RowContent>
                            </S.Row>

                            {/* VEHICLE ROW */}
                            <S.Row>
                                <S.IconWrapper $color={focusedField === 'vehicle' ? accentColor : undefined}>
                                    <IconCar />
                                </S.IconWrapper>
                                <S.RowContent>
                                    <S.DropdownContainer>
                                        <S.Input
                                            ref={vehicleInputRef}
                                            type="text"
                                            placeholder={selectedCustomer ? (selectedVehicle ? `${selectedVehicle.brand} ${selectedVehicle.model}` : 'Wybierz pojazd...') : 'Najpierw wybierz klienta'}
                                            value={selectedCustomer ? vehicleSearch : ''}
                                            onChange={(e) => {
                                                const val = e.target.value;
                                                setVehicleSearch(val);
                                                setShowVehicleDropdown(true);
                                            }}
                                            disabled={!selectedCustomer}
                                            $accentColor={focusedField === 'vehicle' ? accentColor : undefined}
                                            onFocus={() => {
                                                if (!selectedCustomer) return;
                                                setFocusedField('vehicle');

                                                // If customer has no vehicles, open vehicle creation modal directly
                                                if (vehicles.length === 0) {
                                                    setVehicleModalInitialMode('new');
                                                    setIsVehicleModalOpen(true);
                                                } else {
                                                    setShowVehicleDropdown(true);
                                                }
                                            }}
                                            onBlur={() => {
                                                setFocusedField(null);
                                                setTimeout(() => setShowVehicleDropdown(false), 200);
                                            }}
                                        />
                                        {showVehicleDropdown && selectedCustomer && (
                                            <S.Dropdown>
                                                {vehicles
                                                    .filter(v => {
                                                        if (!vehicleSearch.trim()) return true;
                                                        const q = vehicleSearch.toLowerCase();
                                                        const brand = (v.brand || '').toLowerCase();
                                                        const model = (v.model || '').toLowerCase();
                                                        const plate = (v.licensePlate || '').toLowerCase();
                                                        return brand.includes(q) || model.includes(q) || plate.includes(q);
                                                    })
                                                    .map(v => (
                                                        <S.DropdownItem
                                                            key={v.id}
                                                            type="button"
                                                            onClick={() => {
                                                                handleVehicleSelect({ id: v.id, brand: v.brand, model: v.model, isNew: false });
                                                                setVehicleSearch(`${v.brand} ${v.model}`.trim());
                                                                setShowVehicleDropdown(false);
                                                            }}
                                                            $accentColor={accentColor}
                                                        >
                                                            <span>{v.brand} {v.model}</span>
                                                            <span>{v.licensePlate}</span>
                                                        </S.DropdownItem>
                                                    ))}
                                                <S.DropdownAddButton
                                                    type="button"
                                                    onClick={() => {
                                                        setVehicleModalInitialMode('new');
                                                        setIsVehicleModalOpen(true);
                                                        setShowVehicleDropdown(false);
                                                        setFocusedField(null);
                                                    }}
                                                >
                                                    <IconPlus />
                                                    <span>Dodaj nowy pojazd</span>
                                                </S.DropdownAddButton>
                                            </S.Dropdown>
                                        )}
                                    </S.DropdownContainer>
                                </S.RowContent>
                            </S.Row>

                            <S.Divider />

                            {/* SERVICES ROW */}
                            <S.Row>
                                <S.IconWrapper $color={focusedField === 'services' ? accentColor : undefined}>
                                    <IconSettings />
                                </S.IconWrapper>
                                <S.RowContent>
                                    <S.DropdownContainer>
                                        <S.Input
                                            ref={serviceInputRef}
                                            type="text"
                                            placeholder="Dodaj usługę..."
                                            value={serviceSearch}
                                            onChange={(e) => {
                                                setServiceSearch(e.target.value);
                                                setShowServiceDropdown(true);
                                            }}
                                            aria-invalid={!!errors.services || !!errors.servicePrices}
                                            $accentColor={focusedField === 'services' ? accentColor : undefined}
                                            onFocus={() => {
                                                setFocusedField('services');

                                                // If no services available, open service creation modal directly
                                                if (services.length === 0) {
                                                    setIsQuickServiceModalOpen(true);
                                                } else {
                                                    setShowServiceDropdown(true);
                                                }
                                            }}
                                            onBlur={() => {
                                                setFocusedField(null);
                                                setTimeout(() => setShowServiceDropdown(false), 200);
                                            }}
                                        />
                                        {showServiceDropdown && (
                                            <S.Dropdown>
                                                {filteredServices.map((service: Service) => (
                                                    <S.DropdownItem
                                                        key={service.id}
                                                        type="button"
                                                        onClick={() => addService(service)}
                                                        $accentColor={accentColor}
                                                    >
                                                        <span>{service.name}</span>
                                                        <span>
                                                            {service.requireManualPrice
                                                                ? 'NIESTANDARDOWA'
                                                                : `${((service.basePriceNet / 100) * (100 + service.vatRate) / 100).toFixed(2)} zł brutto`
                                                            }
                                                        </span>
                                                    </S.DropdownItem>
                                                ))}
                                                {hasSearchQuery && (
                                                    <S.DropdownAddButton
                                                        type="button"
                                                        onClick={() => {
                                                            setIsQuickServiceModalOpen(true);
                                                            setShowServiceDropdown(false);
                                                            setFocusedField(null);
                                                        }}
                                                    >
                                                        <IconPlus />
                                                        <span>Wprowadź nową usługę</span>
                                                    </S.DropdownAddButton>
                                                )}
                                            </S.Dropdown>
                                        )}
                                    </S.DropdownContainer>

                                    {errors.services && <S.ErrorMessage>{errors.services}</S.ErrorMessage>}
                                    {errors.servicePrices && <S.ErrorMessage>{errors.servicePrices}</S.ErrorMessage>}

                                    {selectedServiceIds.length > 0 && (
                                        <>
                                            <S.ServicesList>
                                                {selectedServiceIds.map(id => {
                                                    let service = services.find((s: Service) => s.id === id);
                                                    if (!service && tempServices[id]) {
                                                        service = { id, ...tempServices[id] };
                                                    }
                                                    if (!service) return null;
                                                    const isNoteExpanded = expandedServiceNote === id;
                                                    const hasNote = !!(serviceNotes[id] && serviceNotes[id].length > 0);

                                                    // Calculate net price from gross
                                                    const grossPrice = servicePrices[id] ?? 0;
                                                    const vatRate = service.vatRate || 23;
                                                    const netPrice = roundTo2(grossPrice / (1 + vatRate / 100));

                                                    return (
                                                        <S.ServiceItem key={id}>
                                                            <S.ServiceItemHeader>
                                                                <S.ServiceName>{service.name}</S.ServiceName>
                                                                <S.ServicePriceWrapper>
                                                                    <S.ServicePriceInput
                                                                        type="number"
                                                                        step="0.01"
                                                                        value={(servicePrices[id] ?? 0).toFixed(2)}
                                                                        onChange={(e) => {
                                                                            const val = e.target.value;
                                                                            const num = parseFloat(val.replace(',', '.'));
                                                                            setServicePrices(prev => ({ ...prev, [id]: isNaN(num) ? 0 : roundTo2(num) }));
                                                                        }}
                                                                    />
                                                                    <S.ServicePriceLabel>zł</S.ServicePriceLabel>
                                                                    <S.ServicePriceBadge>brutto</S.ServicePriceBadge>
                                                                </S.ServicePriceWrapper>
                                                                <S.IconButton
                                                                    type="button"
                                                                    onClick={() => setExpandedServiceNote(isNoteExpanded ? null : id)}
                                                                    $active={hasNote}
                                                                    title="Dodaj notatkę do usługi"
                                                                >
                                                                    <IconMessageSquare />
                                                                </S.IconButton>
                                                                <S.DeleteButton
                                                                    type="button"
                                                                    onClick={() => {
                                                                        setSelectedServiceIds(prev => prev.filter(i => i !== id));
                                                                        const newPrices = {...servicePrices};
                                                                        delete newPrices[id];
                                                                        setServicePrices(newPrices);
                                                                        const newNotes = {...serviceNotes};
                                                                        delete newNotes[id];
                                                                        setServiceNotes(newNotes);
                                                                        if (expandedServiceNote === id) {
                                                                            setExpandedServiceNote(null);
                                                                        }
                                                                    }}
                                                                >
                                                                    <IconTrash />
                                                                </S.DeleteButton>
                                                            </S.ServiceItemHeader>
                                                            {isNoteExpanded && (
                                                                <S.ServiceNoteContainer>
                                                                    <S.ServiceNoteTextarea
                                                                        placeholder="Dodaj notatkę do tej usługi..."
                                                                        value={serviceNotes[id] || ''}
                                                                        onChange={(e) => setServiceNotes(prev => ({ ...prev, [id]: e.target.value }))}
                                                                        rows={2}
                                                                    />
                                                                </S.ServiceNoteContainer>
                                                            )}
                                                        </S.ServiceItem>
                                                    );
                                                })}
                                            </S.ServicesList>

                                            {/* Summary Section */}
                                            <S.SummarySection>
                                                {(() => {
                                                    let totalNet = 0;
                                                    let totalGross = 0;

                                                    selectedServiceIds.forEach(id => {
                                                        const service = services.find((s: Service) => s.id === id) || tempServices[id];
                                                        if (!service) return;

                                                        const grossPrice = servicePrices[id] ?? 0;
                                                        const vatRate = service.vatRate || 23;
                                                        const netPrice = roundTo2(grossPrice / (1 + vatRate / 100));

                                                        totalNet += netPrice;
                                                        totalGross += grossPrice;
                                                    });

                                                    totalNet = roundTo2(totalNet);
                                                    totalGross = roundTo2(totalGross);
                                                    const totalVat = roundTo2(totalGross - totalNet);

                                                    return (
                                                        <>
                                                            <S.SummaryRow>
                                                                <S.SummaryLabel>Wartość netto:</S.SummaryLabel>
                                                                <S.SummaryValue>{totalNet.toFixed(2)} zł</S.SummaryValue>
                                                            </S.SummaryRow>
                                                            <S.SummaryRow>
                                                                <S.SummaryLabel>VAT:</S.SummaryLabel>
                                                                <S.SummaryValue>{totalVat.toFixed(2)} zł</S.SummaryValue>
                                                            </S.SummaryRow>
                                                            <S.SummaryRow $isTotal>
                                                                <S.SummaryLabel $isTotal>Wartość brutto:</S.SummaryLabel>
                                                                <S.SummaryValue $isTotal>{totalGross.toFixed(2)} zł</S.SummaryValue>
                                                            </S.SummaryRow>
                                                        </>
                                                    );
                                                })()}
                                            </S.SummarySection>
                                        </>
                                    )}
                                </S.RowContent>
                            </S.Row>

                            <S.Divider />

                            {/* NOTES ROW */}
                            <S.Row>
                                <S.IconWrapper $color={focusedField === 'notes' ? accentColor : undefined}>
                                    <IconNote />
                                </S.IconWrapper>
                                <S.RowContent>
                                    <S.Textarea
                                        placeholder="Dodaj notatki..."
                                        value={notes}
                                        onChange={(e) => setNotes(e.target.value)}
                                        rows={3}
                                        $accentColor={focusedField === 'notes' ? accentColor : undefined}
                                        onFocus={() => setFocusedField('notes')}
                                        onBlur={() => setFocusedField(null)}
                                    />
                                </S.RowContent>
                            </S.Row>
                        </S.ScrollableContent>

                        <S.Footer>
                            <S.ColorPickerWrapper>
                                <S.ColorPickerSection ref={colorSectionRef} $hasError={!!errors.color}>
                                    <IconPalette />
                                    <S.ColorPickerList>
                                        {appointmentColors.map((color: AppointmentColor) => (
                                            <S.ColorButton
                                                key={color.id}
                                                type="button"
                                                onClick={() => setSelectedColorId(color.id)}
                                                $color={color.hexColor}
                                                $isSelected={color.id === selectedColorId}
                                                title={color.name}
                                            />
                                        ))}
                                        <S.AddColorButton
                                            type="button"
                                            onClick={() => setIsQuickColorModalOpen(true)}
                                            title="Dodaj nowy kolor"
                                        >
                                            <IconPlus />
                                        </S.AddColorButton>
                                    </S.ColorPickerList>
                                </S.ColorPickerSection>
                                {errors.color && <S.ColorErrorMessage>{errors.color}</S.ColorErrorMessage>}
                            </S.ColorPickerWrapper>

                            <S.FooterActions>
                                <S.Button
                                    type="button"
                                    onClick={clearForm}
                                    $variant="ghost"
                                    title="Wyczyść wszystkie pola"
                                >
                                    Wyczyść wszystko
                                </S.Button>
                                <S.Button
                                    type="button"
                                    onClick={onClose}
                                    $variant="secondary"
                                >
                                    Anuluj
                                </S.Button>
                                <S.Button
                                    type="submit"
                                    $variant="primary"
                                    disabled={isSubmitting}
                                    style={{ '--button-bg': accentColor, opacity: isSubmitting ? 0.7 : 1 } as React.CSSProperties}
                                >
                                    {isSubmitting ? 'Zapisywanie…' : 'Zapisz wizytę'}
                                </S.Button>
                            </S.FooterActions>
                        </S.Footer>
                    </form>
                </S.ModalContainer>
            </S.Overlay>

            <QuickCustomerModal
                isOpen={isAddCustomerModalOpen}
                onClose={() => setIsAddCustomerModalOpen(false)}
                onSuccess={(customer) => {
                    // API może zwracać phone/email bezpośrednio lub w contact
                    const phone = (customer as any).phone || customer.contact?.phone || undefined;
                    const email = (customer as any).email || customer.contact?.email || undefined;

                    const mapped = {
                        id: customer.id,
                        firstName: customer.firstName,
                        lastName: customer.lastName,
                        phone,
                        email,
                        isNew: false,
                    } as SelectedCustomer;

                    handleCustomerSelect(mapped);
                    setCustomerSearch(`${customer.firstName ?? ''} ${customer.lastName ?? ''}`.trim());
                    setShowCustomerDropdown(false);
                    queryClient.invalidateQueries({ queryKey: ['appointments', 'customers', 'search'] });
                }}
                initialFirstName={parsedCustomerData.firstName}
                initialLastName={parsedCustomerData.lastName}
                initialPhone={parsedCustomerData.phone}
                initialEmail={parsedCustomerData.email}
            />

            <VehicleModal
                isOpen={isVehicleModalOpen}
                vehicles={vehicles}
                onClose={() => { setIsVehicleModalOpen(false); setVehicleModalInitialMode('select'); }}
                onSelect={handleVehicleSelect}
                allowSkip={true}
                initialMode={vehicleModalInitialMode}
            />

            <QuickServiceModal
                isOpen={isQuickServiceModalOpen}
                onClose={() => setIsQuickServiceModalOpen(false)}
                onServiceCreate={handleQuickServiceCreate}
                initialServiceName={serviceSearch}
            />

            <PriceInputModal
                isOpen={isPriceInputModalOpen}
                serviceName={pendingService?.name || ''}
                onClose={handlePriceInputModalClose}
                onConfirm={handlePriceConfirm}
            />

            <QuickColorModal
                isOpen={isQuickColorModalOpen}
                onClose={() => setIsQuickColorModalOpen(false)}
                onColorCreate={handleQuickColorCreate}
            />
        </>
    );
});

QuickEventModal.displayName = 'QuickEventModal';
