// src/modules/calendar/components/QuickEventModal.tsx

import React, { useState, useEffect, useRef, forwardRef, useImperativeHandle } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/core';
import type { EventCreationData } from '../types';
// import { CustomerModal } from '@/modules/appointments/components/CustomerModal';
import { VehicleModal } from '@/modules/appointments/components/VehicleModal';
import { QuickServiceModal } from './QuickServiceModal';
import { PriceInputModal } from './PriceInputModal';
import { QuickColorModal } from './QuickColorModal';
import { useCustomerVehicles, useCustomerSearch as useAppointmentCustomerSearch } from '@/modules/appointments/hooks/useAppointmentForm';
import type { SelectedCustomer, SelectedVehicle } from '@/modules/appointments/types';
import { appointmentColorApi } from '@/modules/appointment-colors/api/appointmentColorApi';
import { AddCustomerModal } from '@/modules/customers';
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
    onSave: (data: QuickEventFormData) => void;
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
    const [tempServices, setTempServices] = useState<{ [key: string]: { name: string; basePriceNet: number; vatRate: 23 } }>({});

    // Modal states
    // const [isCustomerModalOpen, setIsCustomerModalOpen] = useState(false);
    const [isAddCustomerModalOpen, setIsAddCustomerModalOpen] = useState(false);
    const [isVehicleModalOpen, setIsVehicleModalOpen] = useState(false);
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

    // Validation state
    const [errors, setErrors] = useState<{ [key: string]: string }>({});

    // Focus states
    const [focusedField, setFocusedField] = useState<string | null>(null);
    const titleInputRef = useRef<HTMLInputElement>(null);

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
        if (selectedCustomer && !selectedCustomer.isNew && customerVehicles && customerVehicles.length > 0 && !selectedVehicle) {
            setIsVehicleModalOpen(true);
        }
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
        setNotes('');
        setTempServices({});
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
    const validateForm = (): boolean => {
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
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        // Wyczyść poprzednie błędy
        setErrors({});

        // Waliduj formularz
        if (!validateForm()) {
            return;
        }

        // Jeśli walidacja przeszła, zapisz
        onSave({
            title,
            customer: selectedCustomer,
            vehicle: selectedVehicle,
            startDateTime,
            endDateTime,
            isAllDay,
            serviceIds: selectedServiceIds,
            servicePrices,
            serviceNotes,
            colorId: selectedColorId,
            notes,
        });
    };

    const handleCustomerSelect = (customer: SelectedCustomer) => {
        setSelectedCustomer(customer);
        setSelectedCustomerId(customer.id);
        setSelectedVehicle(null);
    };

    const handleVehicleSelect = (vehicle: SelectedVehicle) => {
        setSelectedVehicle(vehicle);
    };

    const handleRemoveCustomer = (e: React.MouseEvent) => {
        e.stopPropagation();
        setSelectedCustomer(null);
        setSelectedCustomerId(undefined);
        setSelectedVehicle(null);
    };

    const handleRemoveVehicle = (e: React.MouseEvent) => {
        e.stopPropagation();
        setSelectedVehicle(null);
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
        } catch (error) {
            console.error('Failed to create color:', error);
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
                                                    type="datetime-local"
                                                    value={endDateTime}
                                                    onChange={(e) => setEndDateTime(e.target.value)}
                                                    required
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
                                            type="text"
                                            placeholder={selectedCustomer ? `${selectedCustomer.firstName} ${selectedCustomer.lastName}` : 'Dodaj klienta...'}
                                            value={customerSearch}
                                            onChange={(e) => {
                                                setCustomerSearch(e.target.value);
                                                setShowCustomerDropdown(true);
                                            }}
                                            $accentColor={focusedField === 'customer' ? accentColor : undefined}
                                            $hasError={!!errors.customer}
                                            onFocus={() => {
                                                setFocusedField('customer');
                                                setShowCustomerDropdown(true);
                                            }}
                                            onBlur={() => {
                                                setFocusedField(null);
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
                                </S.RowContent>
                            </S.Row>

                            {/* VEHICLE ROW */}
                            <S.Row>
                                <S.IconWrapper $color={focusedField === 'vehicle' ? accentColor : undefined}>
                                    <IconCar />
                                </S.IconWrapper>
                                <S.RowContent>
                                    <S.SelectButton
                                        type="button"
                                        onClick={() => selectedCustomer && setIsVehicleModalOpen(true)}
                                        disabled={!selectedCustomer}
                                        $accentColor={focusedField === 'vehicle' ? accentColor : undefined}
                                        $hasValue={!!selectedVehicle}
                                        onFocus={() => setFocusedField('vehicle')}
                                        onBlur={() => setFocusedField(null)}
                                    >
                                        <span>
                                            {selectedVehicle
                                                ? `${selectedVehicle.brand} ${selectedVehicle.model}`
                                                : (selectedCustomer ? 'Dodaj pojazd' : 'Najpierw wybierz klienta')}
                                        </span>
                                        {selectedVehicle && (
                                            <S.RemoveButton onClick={handleRemoveVehicle}>
                                                <IconX />
                                            </S.RemoveButton>
                                        )}
                                    </S.SelectButton>
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
                                            type="text"
                                            placeholder="Dodaj usługę..."
                                            value={serviceSearch}
                                            onChange={(e) => {
                                                setServiceSearch(e.target.value);
                                                setShowServiceDropdown(true);
                                            }}
                                            $accentColor={focusedField === 'services' ? accentColor : undefined}
                                            onFocus={() => {
                                                setFocusedField('services');
                                                setShowServiceDropdown(true);
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
                                        <S.ServicesList>
                                            {selectedServiceIds.map(id => {
                                                let service = services.find((s: Service) => s.id === id);
                                                if (!service && tempServices[id]) {
                                                    service = { id, ...tempServices[id] };
                                                }
                                                if (!service) return null;
                                                const isNoteExpanded = expandedServiceNote === id;
                                                const hasNote = !!(serviceNotes[id] && serviceNotes[id].length > 0);
                                                return (
                                                    <S.ServiceItem key={id}>
                                                        <S.ServiceItemHeader>
                                                            <S.ServiceName>{service.name}</S.ServiceName>
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
                                <S.ColorPickerSection $hasError={!!errors.color}>
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
                                    style={{ '--button-bg': accentColor } as React.CSSProperties}
                                >
                                    Zapisz wizytę
                                </S.Button>
                            </S.FooterActions>
                        </S.Footer>
                    </form>
                </S.ModalContainer>
            </S.Overlay>

            <AddCustomerModal
                isOpen={isAddCustomerModalOpen}
                onClose={() => setIsAddCustomerModalOpen(false)}
                onSuccess={(customer) => {
                    // Ustaw nowo utworzonego klienta jako wybranego w formularzu
                    const mapped = {
                        id: customer.id,
                        firstName: customer.firstName,
                        lastName: customer.lastName,
                        phone: customer.contact?.phone,
                        email: customer.contact?.email,
                        isNew: false,
                    } as SelectedCustomer;
                    handleCustomerSelect(mapped);
                    setCustomerSearch(`${customer.firstName ?? ''} ${customer.lastName ?? ''}`.trim());
                    setShowCustomerDropdown(false);
                    // Odśwież listę wyników wyszukiwania klientów
                    queryClient.invalidateQueries({ queryKey: ['appointments', 'customers', 'search'] });
                }}
            />

            <VehicleModal
                isOpen={isVehicleModalOpen}
                vehicles={vehicles}
                onClose={() => setIsVehicleModalOpen(false)}
                onSelect={handleVehicleSelect}
                allowSkip={true}
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
