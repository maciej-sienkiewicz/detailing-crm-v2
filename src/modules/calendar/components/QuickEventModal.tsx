// src/modules/calendar/components/QuickEventModal.tsx

import React, { useState, useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/core';
import type { EventCreationData } from '../types';
import { CustomerModal } from '@/modules/appointments/components/CustomerModal';
import { VehicleModal } from '@/modules/appointments/components/VehicleModal';
import type { SelectedCustomer, SelectedVehicle } from '@/modules/appointments/types';

// --- ICONS (Inline SVG) ---
const IconClock = ({ className = "w-5 h-5" }: { className?: string }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10"/>
        <polyline points="12 6 12 12 16 14"/>
    </svg>
);

const IconUser = ({ className = "w-5 h-5" }: { className?: string }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
        <circle cx="12" cy="7" r="4"/>
    </svg>
);

const IconCar = ({ className = "w-5 h-5" }: { className?: string }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 16H9m10 0h3v-3.15a1 1 0 0 0-.84-.99L16 11l-2.7-3.6a1 1 0 0 0-.8-.4H5.24a2 2 0 0 0-1.8 1.1l-.8 1.63A6 6 0 0 0 2 12.42V16h2"/>
        <circle cx="6.5" cy="16.5" r="2.5"/>
        <circle cx="16.5" cy="16.5" r="2.5"/>
    </svg>
);

const IconSettings = ({ className = "w-5 h-5" }: { className?: string }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.38a2 2 0 0 0-.73-2.73l-.15-.1a2 2 0 0 1-1-1.72v-.51a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/>
        <circle cx="12" cy="12" r="3"/>
    </svg>
);

const IconNote = ({ className = "w-5 h-5" }: { className?: string }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
    </svg>
);

const IconTrash = ({ className = "w-4 h-4" }: { className?: string }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="3 6 5 6 21 6"/>
        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
    </svg>
);

const IconX = ({ className = "w-6 h-6" }: { className?: string }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="18" y1="6" x2="6" y2="18"/>
        <line x1="6" y1="6" x2="18" y2="18"/>
    </svg>
);

const IconPalette = ({ className = "w-5 h-5" }: { className?: string }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="13.5" cy="6.5" r=".5"/>
        <circle cx="17.5" cy="10.5" r=".5"/>
        <circle cx="8.5" cy="7.5" r=".5"/>
        <circle cx="6.5" cy="12.5" r=".5"/>
        <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.554C21.965 6.012 17.461 2 12 2z"/>
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
    customerId?: string;
    customerName: string;
    vehicle: SelectedVehicle | null;
    startDateTime: string;
    endDateTime: string;
    isAllDay: boolean;
    serviceIds: string[];
    servicePrices?: { [key: string]: number };
    colorId: string;
    notes?: string;
}

// --- COMPONENT ---
export const QuickEventModal: React.FC<QuickEventModalProps> = ({
    isOpen,
    eventData,
    onClose,
    onSave,
}) => {
    // State initialization
    const [title, setTitle] = useState('');
    const [selectedCustomerId, setSelectedCustomerId] = useState<string>();
    const [selectedCustomerName, setSelectedCustomerName] = useState('');
    const [selectedCustomer, setSelectedCustomer] = useState<SelectedCustomer | null>(null);
    const [selectedVehicleId, setSelectedVehicleId] = useState<string>();
    const [selectedVehicleName, setSelectedVehicleName] = useState('');
    const [selectedVehicle, setSelectedVehicle] = useState<SelectedVehicle | null>(null);
    const [startDateTime, setStartDateTime] = useState('');
    const [endDateTime, setEndDateTime] = useState('');
    const [isAllDay, setIsAllDay] = useState(false);
    const [selectedServiceIds, setSelectedServiceIds] = useState<string[]>([]);
    const [servicePrices, setServicePrices] = useState<{ [key: string]: number }>({});
    const [serviceSearch, setServiceSearch] = useState('');
    const [showServiceDropdown, setShowServiceDropdown] = useState(false);
    const [selectedColorId, setSelectedColorId] = useState('');
    const [notes, setNotes] = useState('');

    // Modal states
    const [isCustomerModalOpen, setIsCustomerModalOpen] = useState(false);
    const [isVehicleModalOpen, setIsVehicleModalOpen] = useState(false);

    // Focus states
    const [focusedField, setFocusedField] = useState<string | null>(null);
    const titleInputRef = useRef<HTMLInputElement>(null);

    // Queries
    const { data: vehicles = [] } = useQuery({
        queryKey: ['customer-vehicles', selectedCustomerId],
        queryFn: async () => {
            if (!selectedCustomerId) return [];
            const response = await apiClient.get(`/api/v1/customers/${selectedCustomerId}/vehicles`);
            return response.data.vehicles || [];
        },
        enabled: !!selectedCustomerId,
    });

    const { data: services = [] } = useQuery({
        queryKey: ['services'],
        queryFn: async () => {
            const response = await apiClient.get('/api/v1/services');
            return response.data.services || [];
        },
    });

    const { data: appointmentColors = [] } = useQuery({
        queryKey: ['appointment-colors'],
        queryFn: async () => {
            const response = await apiClient.get('/api/v1/appointment-colors');
            return response.data.colors || [];
        },
    });

    // Get selected color hex
    const selectedColor = appointmentColors.find((c: any) => c.id === selectedColorId);
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

            setIsAllDay(shouldBeAllDay);

            if (shouldBeAllDay) {
                setStartDateTime(formatDate(eventData.start));
                setEndDateTime(formatDate(eventData.start));
            } else if (daysDiff > 1) {
                const startDate = new Date(eventData.start);
                startDate.setHours(9, 0, 0, 0);
                setStartDateTime(formatDateTimeLocal(startDate));

                const endDate = new Date(eventData.end);
                endDate.setDate(endDate.getDate() - 1);
                setEndDateTime(formatDateTimeLocal(endDate));
            } else {
                setStartDateTime(formatDateTimeLocal(eventData.start));
                setEndDateTime(formatDateTimeLocal(eventData.end));
            }
        }
        if (appointmentColors.length > 0 && !selectedColorId) {
            setSelectedColorId(appointmentColors[0].id);
        }
    }, [eventData, appointmentColors, selectedColorId]);

    // Focus title input on open
    useEffect(() => {
        if (isOpen && titleInputRef.current) {
            setTimeout(() => titleInputRef.current?.focus(), 100);
        }
    }, [isOpen]);

    // Handlers
    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSave({
            title,
            customerId: selectedCustomerId,
            customerName: selectedCustomerName,
            vehicle: selectedVehicle,
            startDateTime,
            endDateTime,
            isAllDay,
            serviceIds: selectedServiceIds,
            servicePrices,
            colorId: selectedColorId,
            notes,
        });
    };

    const handleCustomerSelect = (customer: SelectedCustomer) => {
        setSelectedCustomer(customer);
        if (customer.isAlias) {
            setSelectedCustomerName(customer.alias || '');
        } else {
            setSelectedCustomerId(customer.id);
            setSelectedCustomerName(`${customer.firstName} ${customer.lastName}`);
        }
        // Reset vehicle on customer change
        setSelectedVehicleId(undefined);
        setSelectedVehicleName('');
        setSelectedVehicle(null);
    };

    const handleVehicleSelect = (vehicle: SelectedVehicle) => {
        setSelectedVehicle(vehicle);
        if (!vehicle.isNew && vehicle.id) {
            setSelectedVehicleId(vehicle.id);
        }
        setSelectedVehicleName(`${vehicle.brand} ${vehicle.model}`);
    };

    const handleRemoveCustomer = (e: React.MouseEvent) => {
        e.stopPropagation();
        setSelectedCustomer(null);
        setSelectedCustomerId(undefined);
        setSelectedCustomerName('');
        // Also reset vehicle
        setSelectedVehicleId(undefined);
        setSelectedVehicleName('');
        setSelectedVehicle(null);
    };

    const handleRemoveVehicle = (e: React.MouseEvent) => {
        e.stopPropagation();
        setSelectedVehicle(null);
        setSelectedVehicleId(undefined);
        setSelectedVehicleName('');
    };

    const addService = (service: any) => {
        if (!selectedServiceIds.includes(service.id)) {
            setSelectedServiceIds(prev => [...prev, service.id]);
            setServicePrices(prev => ({ ...prev, [service.id]: service.basePriceNet / 100 }));
        }
        setServiceSearch('');
        setShowServiceDropdown(false);
    };

    if (!eventData) return null;

    return (
        <>
            {/* Overlay */}
            <div
                className={`fixed inset-0 z-50 flex items-center justify-center p-4 transition-all duration-300 ${
                    isOpen ? 'opacity-100 backdrop-blur-sm' : 'opacity-0 pointer-events-none'
                }`}
                style={{
                    backgroundColor: isOpen ? 'rgba(15, 23, 42, 0.4)' : 'rgba(15, 23, 42, 0)'
                }}
                onMouseDown={(e) => e.target === e.currentTarget && onClose()}
            >
                {/* Modal Container */}
                <div
                    className={`bg-white rounded-3xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden transform transition-all duration-300 ${
                        isOpen ? 'scale-100 opacity-100' : 'scale-95 opacity-0'
                    }`}
                >
                    <form onSubmit={handleSubmit} className="flex flex-col h-full">
                        {/* Header - Minimalist with close button */}
                        <div className="relative px-8 pt-6 pb-2">
                            {/* Drag handle visual indicator */}
                            <div className="flex justify-center mb-4">
                                <div className="w-12 h-1.5 bg-gray-200 rounded-full"></div>
                            </div>

                            {/* Close button */}
                            <button
                                type="button"
                                onClick={onClose}
                                className="absolute top-6 right-6 p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-all"
                            >
                                <IconX />
                            </button>

                            {/* Title Input - The Hero */}
                            <div className="mt-2">
                                <input
                                    ref={titleInputRef}
                                    type="text"
                                    placeholder="Dodaj tytuł rezerwacji"
                                    value={title}
                                    onChange={(e) => setTitle(e.target.value)}
                                    className="w-full text-3xl font-semibold text-gray-900 placeholder-gray-300 border-0 border-b-2 border-transparent focus:border-gray-300 focus:outline-none transition-colors pb-3 bg-transparent"
                                    style={{
                                        borderBottomColor: focusedField === 'title' ? accentColor : undefined
                                    }}
                                    onFocus={() => setFocusedField('title')}
                                    onBlur={() => setFocusedField(null)}
                                />
                            </div>
                        </div>

                        {/* Content - Row-based with icons */}
                        <div className="flex-1 overflow-y-auto px-8 py-6 space-y-6">
                            {/* TIME ROW */}
                            <div className="flex items-start gap-4">
                                <div
                                    className="flex-shrink-0 mt-3 transition-colors"
                                    style={{ color: focusedField?.startsWith('time') ? accentColor : '#64748b' }}
                                >
                                    <IconClock />
                                </div>
                                <div className="flex-1 space-y-3">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-xs font-medium text-gray-500 mb-1.5">Początek</label>
                                            <input
                                                type={isAllDay ? 'date' : 'datetime-local'}
                                                value={startDateTime}
                                                onChange={(e) => setStartDateTime(e.target.value)}
                                                required
                                                className="w-full px-4 py-2.5 bg-gray-50 border border-transparent rounded-xl text-sm text-gray-900 focus:outline-none focus:border-blue-500 focus:bg-white transition-all"
                                                style={{
                                                    borderColor: focusedField === 'time-start' ? accentColor : undefined
                                                }}
                                                onFocus={() => setFocusedField('time-start')}
                                                onBlur={() => setFocusedField(null)}
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium text-gray-500 mb-1.5">Koniec</label>
                                            <input
                                                type={isAllDay ? 'date' : 'datetime-local'}
                                                value={endDateTime}
                                                onChange={(e) => setEndDateTime(e.target.value)}
                                                required
                                                className="w-full px-4 py-2.5 bg-gray-50 border border-transparent rounded-xl text-sm text-gray-900 focus:outline-none focus:border-blue-500 focus:bg-white transition-all"
                                                style={{
                                                    borderColor: focusedField === 'time-end' ? accentColor : undefined
                                                }}
                                                onFocus={() => setFocusedField('time-end')}
                                                onBlur={() => setFocusedField(null)}
                                            />
                                        </div>
                                    </div>
                                    <label className="flex items-center gap-2 cursor-pointer w-fit">
                                        <input
                                            type="checkbox"
                                            checked={isAllDay}
                                            onChange={(e) => setIsAllDay(e.target.checked)}
                                            className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-2 focus:ring-blue-500 focus:ring-offset-0"
                                            style={{ accentColor }}
                                        />
                                        <span className="text-sm text-gray-700">Cały dzień</span>
                                    </label>
                                </div>
                            </div>

                            {/* DIVIDER */}
                            <div className="border-t border-gray-100"></div>

                            {/* CUSTOMER ROW */}
                            <div className="flex items-start gap-4">
                                <div
                                    className="flex-shrink-0 mt-3 transition-colors"
                                    style={{ color: focusedField === 'customer' ? accentColor : '#64748b' }}
                                >
                                    <IconUser />
                                </div>
                                <div className="flex-1">
                                    <button
                                        type="button"
                                        onClick={() => setIsCustomerModalOpen(true)}
                                        className="w-full flex items-center gap-3 px-4 py-3 bg-gray-50 hover:bg-gray-100 border border-transparent rounded-xl transition-all text-left group"
                                        style={{
                                            borderColor: focusedField === 'customer' ? accentColor : undefined
                                        }}
                                        onFocus={() => setFocusedField('customer')}
                                        onBlur={() => setFocusedField(null)}
                                    >
                                        <span className={`flex-1 text-sm ${selectedCustomer ? 'text-gray-900 font-medium' : 'text-gray-400'}`}>
                                            {selectedCustomer
                                                ? (selectedCustomer.isAlias
                                                    ? selectedCustomer.alias
                                                    : `${selectedCustomer.firstName} ${selectedCustomer.lastName}`)
                                                : 'Dodaj klienta'}
                                        </span>
                                        {selectedCustomer && (
                                            <button
                                                type="button"
                                                onClick={handleRemoveCustomer}
                                                className="p-1 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-all"
                                            >
                                                <IconX className="w-4 h-4" />
                                            </button>
                                        )}
                                    </button>
                                </div>
                            </div>

                            {/* VEHICLE ROW */}
                            <div className="flex items-start gap-4">
                                <div
                                    className="flex-shrink-0 mt-3 transition-colors"
                                    style={{ color: focusedField === 'vehicle' ? accentColor : '#64748b' }}
                                >
                                    <IconCar />
                                </div>
                                <div className="flex-1">
                                    <button
                                        type="button"
                                        onClick={() => selectedCustomerId && setIsVehicleModalOpen(true)}
                                        disabled={!selectedCustomerId}
                                        className="w-full flex items-center gap-3 px-4 py-3 bg-gray-50 hover:bg-gray-100 border border-transparent rounded-xl transition-all text-left group disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-gray-50"
                                        style={{
                                            borderColor: focusedField === 'vehicle' ? accentColor : undefined
                                        }}
                                        onFocus={() => setFocusedField('vehicle')}
                                        onBlur={() => setFocusedField(null)}
                                    >
                                        <span className={`flex-1 text-sm ${selectedVehicle ? 'text-gray-900 font-medium' : 'text-gray-400'}`}>
                                            {selectedVehicle
                                                ? `${selectedVehicle.brand} ${selectedVehicle.model}`
                                                : (selectedCustomerId ? 'Dodaj pojazd' : 'Najpierw wybierz klienta')}
                                        </span>
                                        {selectedVehicle && (
                                            <button
                                                type="button"
                                                onClick={handleRemoveVehicle}
                                                className="p-1 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-all"
                                            >
                                                <IconX className="w-4 h-4" />
                                            </button>
                                        )}
                                    </button>
                                </div>
                            </div>

                            {/* DIVIDER */}
                            <div className="border-t border-gray-100"></div>

                            {/* SERVICES ROW */}
                            <div className="flex items-start gap-4">
                                <div
                                    className="flex-shrink-0 mt-3 transition-colors"
                                    style={{ color: focusedField === 'services' ? accentColor : '#64748b' }}
                                >
                                    <IconSettings />
                                </div>
                                <div className="flex-1 space-y-3">
                                    {/* Service Search */}
                                    <div className="relative">
                                        <input
                                            type="text"
                                            placeholder="Dodaj usługę..."
                                            value={serviceSearch}
                                            onChange={(e) => {
                                                setServiceSearch(e.target.value);
                                                setShowServiceDropdown(true);
                                            }}
                                            className="w-full px-4 py-2.5 bg-gray-50 border border-transparent rounded-xl text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-blue-500 focus:bg-white transition-all"
                                            style={{
                                                borderColor: focusedField === 'services' ? accentColor : undefined
                                            }}
                                            onFocus={() => setFocusedField('services')}
                                            onBlur={() => {
                                                setFocusedField(null);
                                                setTimeout(() => setShowServiceDropdown(false), 200);
                                            }}
                                        />
                                        {/* Services Dropdown */}
                                        {showServiceDropdown && serviceSearch.length > 0 && (
                                            <div className="absolute z-10 w-full mt-2 bg-white border border-gray-100 rounded-xl shadow-xl max-h-60 overflow-y-auto">
                                                {services
                                                    .filter((s: any) => s.name.toLowerCase().includes(serviceSearch.toLowerCase()))
                                                    .map((service: any) => (
                                                        <button
                                                            key={service.id}
                                                            type="button"
                                                            onClick={() => addService(service)}
                                                            className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50 transition-colors text-left border-b border-gray-50 last:border-0"
                                                        >
                                                            <span className="text-sm text-gray-900">{service.name}</span>
                                                            <span className="text-sm font-semibold" style={{ color: accentColor }}>
                                                                {(service.basePriceNet / 100).toFixed(2)} zł
                                                            </span>
                                                        </button>
                                                    ))}
                                            </div>
                                        )}
                                    </div>

                                    {/* Selected Services */}
                                    {selectedServiceIds.length > 0 && (
                                        <div className="space-y-2">
                                            {selectedServiceIds.map(id => {
                                                const service = services.find((s: any) => s.id === id);
                                                if (!service) return null;
                                                return (
                                                    <div key={id} className="flex items-center gap-3 p-3 bg-white border border-gray-100 rounded-xl">
                                                        <span className="flex-1 text-sm font-medium text-gray-900">{service.name}</span>
                                                        <input
                                                            type="number"
                                                            value={servicePrices[id] || 0}
                                                            onChange={(e) => setServicePrices(prev => ({ ...prev, [id]: parseFloat(e.target.value) || 0 }))}
                                                            className="w-24 px-3 py-1.5 text-sm text-right border border-gray-200 rounded-lg focus:outline-none focus:border-blue-500"
                                                        />
                                                        <span className="text-xs text-gray-500">zł</span>
                                                        <button
                                                            type="button"
                                                            onClick={() => {
                                                                setSelectedServiceIds(prev => prev.filter(i => i !== id));
                                                                const newPrices = {...servicePrices};
                                                                delete newPrices[id];
                                                                setServicePrices(newPrices);
                                                            }}
                                                            className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                                                        >
                                                            <IconTrash />
                                                        </button>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* DIVIDER */}
                            <div className="border-t border-gray-100"></div>

                            {/* NOTES ROW */}
                            <div className="flex items-start gap-4">
                                <div
                                    className="flex-shrink-0 mt-3 transition-colors"
                                    style={{ color: focusedField === 'notes' ? accentColor : '#64748b' }}
                                >
                                    <IconNote />
                                </div>
                                <div className="flex-1">
                                    <textarea
                                        placeholder="Dodaj notatki..."
                                        value={notes}
                                        onChange={(e) => setNotes(e.target.value)}
                                        rows={3}
                                        className="w-full px-4 py-3 bg-gray-50 border border-transparent rounded-xl text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-blue-500 focus:bg-white transition-all resize-none"
                                        style={{
                                            borderColor: focusedField === 'notes' ? accentColor : undefined
                                        }}
                                        onFocus={() => setFocusedField('notes')}
                                        onBlur={() => setFocusedField(null)}
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="px-8 py-6 border-t border-gray-100 bg-white flex items-center justify-between gap-4">
                            {/* Color Picker */}
                            <div className="flex items-center gap-3">
                                <IconPalette className="text-gray-400" />
                                <div className="flex items-center gap-2">
                                    {appointmentColors.map((color: any) => (
                                        <button
                                            key={color.id}
                                            type="button"
                                            onClick={() => setSelectedColorId(color.id)}
                                            className="w-7 h-7 rounded-full transition-all hover:scale-110 border-2 border-white shadow-md"
                                            style={{
                                                backgroundColor: color.hexColor,
                                                boxShadow: color.id === selectedColorId
                                                    ? `0 0 0 2px ${color.hexColor}40`
                                                    : '0 1px 3px rgba(0,0,0,0.1)'
                                            }}
                                            title={color.name}
                                        />
                                    ))}
                                </div>
                            </div>

                            {/* Action Buttons */}
                            <div className="flex items-center gap-3">
                                <button
                                    type="button"
                                    onClick={onClose}
                                    className="px-6 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-full transition-all"
                                >
                                    Anuluj
                                </button>
                                <button
                                    type="submit"
                                    className="px-6 py-2.5 text-sm font-medium text-white rounded-full shadow-lg hover:shadow-xl transition-all hover:-translate-y-0.5"
                                    style={{ backgroundColor: accentColor }}
                                >
                                    Zapisz wizytę
                                </button>
                            </div>
                        </div>
                    </form>
                </div>
            </div>

            {/* Customer Modal */}
            <CustomerModal
                isOpen={isCustomerModalOpen}
                onClose={() => setIsCustomerModalOpen(false)}
                onSelect={handleCustomerSelect}
            />

            {/* Vehicle Modal */}
            <VehicleModal
                isOpen={isVehicleModalOpen}
                vehicles={vehicles}
                onClose={() => setIsVehicleModalOpen(false)}
                onSelect={handleVehicleSelect}
                allowSkip={true}
            />
        </>
    );
};
