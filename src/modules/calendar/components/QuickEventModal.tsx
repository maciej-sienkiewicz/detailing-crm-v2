// src/modules/calendar/components/QuickEventModal.tsx

import React, { useState, useEffect, useRef, forwardRef, useImperativeHandle } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/core';
import type { EventCreationData } from '../types';
import { CustomerModal } from '@/modules/appointments/components/CustomerModal';
import { VehicleModal } from '@/modules/appointments/components/VehicleModal';
import { QuickServiceModal } from './QuickServiceModal';
import { useCustomerVehicles } from '@/modules/appointments/hooks/useAppointmentForm';
import type { SelectedCustomer, SelectedVehicle } from '@/modules/appointments/types';
import * as S from './QuickEventModalStyles';

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
    const [isCustomerModalOpen, setIsCustomerModalOpen] = useState(false);
    const [isVehicleModalOpen, setIsVehicleModalOpen] = useState(false);
    const [isQuickServiceModalOpen, setIsQuickServiceModalOpen] = useState(false);

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
                newEndDateTime = formatDate(eventData.start);
            } else if (daysDiff > 1) {
                const startDate = new Date(eventData.start);
                startDate.setHours(9, 0, 0, 0);
                newStartDateTime = formatDateTimeLocal(startDate);

                const endDate = new Date(eventData.end);
                endDate.setDate(endDate.getDate() - 1);
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
        setNotes('');
        setTempServices({});
    };

    useImperativeHandle(ref, () => ({
        clearForm
    }));

    // Handlers
    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
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

    const addService = (service: Service) => {
        if (!selectedServiceIds.includes(service.id)) {
            setSelectedServiceIds(prev => [...prev, service.id]);
            // Dla usług z requireManualPrice, ustaw cenę na 0 (wymaga ręcznego wprowadzenia)
            const grossPrice = service.requireManualPrice
                ? 0
                : (service.basePriceNet / 100) * (100 + service.vatRate) / 100;
            setServicePrices(prev => ({ ...prev, [service.id]: grossPrice }));
        }
        setServiceSearch('');
        setShowServiceDropdown(false);
    };

    const handleQuickServiceCreate = (service: { id?: string; name: string; basePriceNet: number; vatRate: 23 }) => {
        if (service.id) {
            queryClient.invalidateQueries({ queryKey: ['services'] });
        }

        const serviceId = service.id || `temp-${Date.now()}`;
        setSelectedServiceIds(prev => [...prev, serviceId]);

        const grossPrice = (service.basePriceNet / 100) * (100 + service.vatRate) / 100;
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
                                    <S.InputGrid>
                                        <S.InputGroup>
                                            <S.Label>Początek</S.Label>
                                            <S.Input
                                                type={isAllDay ? 'date' : 'datetime-local'}
                                                value={startDateTime}
                                                onChange={(e) => setStartDateTime(e.target.value)}
                                                required
                                                $accentColor={focusedField === 'time-start' ? accentColor : undefined}
                                                onFocus={() => setFocusedField('time-start')}
                                                onBlur={() => setFocusedField(null)}
                                            />
                                        </S.InputGroup>
                                        <S.InputGroup>
                                            <S.Label>Koniec</S.Label>
                                            <S.Input
                                                type={isAllDay ? 'date' : 'datetime-local'}
                                                value={endDateTime}
                                                onChange={(e) => setEndDateTime(e.target.value)}
                                                required
                                                $accentColor={focusedField === 'time-end' ? accentColor : undefined}
                                                onFocus={() => setFocusedField('time-end')}
                                                onBlur={() => setFocusedField(null)}
                                            />
                                        </S.InputGroup>
                                    </S.InputGrid>
                                    <S.CheckboxLabel>
                                        <S.Checkbox
                                            checked={isAllDay}
                                            onChange={(e) => setIsAllDay(e.target.checked)}
                                            $accentColor={accentColor}
                                        />
                                        <span>Cały dzień</span>
                                    </S.CheckboxLabel>
                                </S.RowContent>
                            </S.Row>

                            <S.Divider />

                            {/* CUSTOMER ROW */}
                            <S.Row>
                                <S.IconWrapper $color={focusedField === 'customer' ? accentColor : undefined}>
                                    <IconUser />
                                </S.IconWrapper>
                                <S.RowContent>
                                    <S.SelectButton
                                        type="button"
                                        onClick={() => setIsCustomerModalOpen(true)}
                                        $accentColor={focusedField === 'customer' ? accentColor : undefined}
                                        $hasValue={!!selectedCustomer}
                                        onFocus={() => setFocusedField('customer')}
                                        onBlur={() => setFocusedField(null)}
                                    >
                                        <span>
                                            {selectedCustomer
                                                ? `${selectedCustomer.firstName} ${selectedCustomer.lastName}`
                                                : 'Dodaj klienta'}
                                        </span>
                                        {selectedCustomer && (
                                            <S.RemoveButton onClick={handleRemoveCustomer}>
                                                <IconX />
                                            </S.RemoveButton>
                                        )}
                                    </S.SelectButton>
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
                                                                value={servicePrices[id] || 0}
                                                                onChange={(e) => setServicePrices(prev => ({ ...prev, [id]: parseFloat(e.target.value) || 0 }))}
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
                            <S.ColorPickerSection>
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
                                </S.ColorPickerList>
                            </S.ColorPickerSection>

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

            <CustomerModal
                isOpen={isCustomerModalOpen}
                onClose={() => setIsCustomerModalOpen(false)}
                onSelect={handleCustomerSelect}
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
        </>
    );
});

QuickEventModal.displayName = 'QuickEventModal';
