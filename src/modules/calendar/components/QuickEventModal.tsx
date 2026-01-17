// src/modules/calendar/components/QuickEventModal.tsx

import React, { useState, useEffect } from 'react';
import styled, { keyframes, css } from 'styled-components';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/core';
import type { EventCreationData } from '../types';
import { CustomerModal } from '@/modules/appointments/components/CustomerModal';
import { VehicleModal } from '@/modules/appointments/components/VehicleModal';
import type { SelectedCustomer, SelectedVehicle } from '@/modules/appointments/types';

// --- ICONS (Inline SVG for professional look without external deps) ---
const IconClock = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
);
const IconUser = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
);
const IconCar = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 16H9m10 0h3v-3.15a1 1 0 0 0-.84-.99L16 11l-2.7-3.6a1 1 0 0 0-.8-.4H5.24a2 2 0 0 0-1.8 1.1l-.8 1.63A6 6 0 0 0 2 12.42V16h2"/><circle cx="6.5" cy="16.5" r="2.5"/><circle cx="16.5" cy="16.5" r="2.5"/></svg>
);
const IconSettings = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.38a2 2 0 0 0-.73-2.73l-.15-.1a2 2 0 0 1-1-1.72v-.51a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/></svg>
);
const IconNote = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
);
const IconTrash = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
);
const IconX = () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
);

// --- STYLES ---

const fadeIn = keyframes`
    from { opacity: 0; }
    to { opacity: 1; }
`;

const slideUp = keyframes`
    from { transform: translateY(20px); opacity: 0; }
    to { transform: translateY(0); opacity: 1; }
`;

const Overlay = styled.div<{ $isOpen: boolean }>`
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(15, 23, 42, 0.6); // Darker, more premium backdrop
    backdrop-filter: blur(4px);
    display: ${props => props.$isOpen ? 'flex' : 'none'};
    align-items: center;
    justify-content: center;
    z-index: 1000;
    padding: 20px;
    animation: ${fadeIn} 0.2s ease-out;
`;

const ModalContainer = styled.div`
    background: #ffffff;
    border-radius: 12px;
    box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
    width: 100%;
    max-width: 800px; // Slightly wider for better grid layout
    max-height: 90vh;
    overflow: hidden;
    display: flex;
    flex-direction: column;
    animation: ${slideUp} 0.3s ease-out;
    border: 1px solid #e2e8f0;
`;

const Header = styled.div`
    padding: 24px 32px 16px 32px;
    border-bottom: 1px solid #f1f5f9;
    background: #ffffff;
    display: flex;
    justify-content: space-between;
    align-items: center;
`;

const CloseButton = styled.button`
    background: transparent;
    border: none;
    color: #64748b;
    cursor: pointer;
    padding: 8px;
    border-radius: 8px;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.2s;

    &:hover {
        background-color: #f1f5f9;
        color: #0f172a;
    }
`;

const Content = styled.div`
    padding: 32px;
    overflow-y: auto;
    flex: 1;
    background-color: #f8fafc; // Very light gray background for form area

    /* Custom Scrollbar */
    &::-webkit-scrollbar {
        width: 8px;
    }
    &::-webkit-scrollbar-track {
        background: #f1f5f9;
    }
    &::-webkit-scrollbar-thumb {
        background: #cbd5e1;
        border-radius: 4px;
    }
    &::-webkit-scrollbar-thumb:hover {
        background: #94a3b8;
    }
`;

const TitleInput = styled.input`
    width: 100%;
    padding: 8px 0;
    border: none;
    font-size: 20px;
    font-weight: 600;
    color: #0f172a;
    background: transparent;
    outline: none;
    font-family: inherit;

    &::placeholder {
        color: #94a3b8;
    }
`;

const SectionTitle = styled.h3`
    font-size: 14px;
    font-weight: 600;
    color: #475569;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    margin-bottom: 16px;
    display: flex;
    align-items: center;
    gap: 8px;

    svg {
        color: #64748b;
    }
`;

const Grid = styled.div<{ $cols?: number }>`
    display: grid;
    grid-template-columns: repeat(${props => props.$cols || 1}, 1fr);
    gap: 20px;
    margin-bottom: 32px;
`;

const FormGroup = styled.div`
    display: flex;
    flex-direction: column;
    gap: 8px;
    position: relative;
`;

const Label = styled.label`
    font-size: 13px;
    font-weight: 500;
    color: #334155;
`;

const InputStyles = css`
    padding: 10px 14px;
    border: 1px solid #cbd5e1;
    border-radius: 6px;
    font-size: 14px;
    color: #0f172a;
    background: #ffffff;
    transition: all 0.2s ease;
    width: 100%;
    height: 42px;

    &:focus {
        outline: none;
        border-color: #3b82f6; // Professional Blue
        box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
    }

    &:hover:not(:focus) {
        border-color: #94a3b8;
    }

    &::placeholder {
        color: #94a3b8;
    }
`;

const Input = styled.input`
    ${InputStyles}
`;

const TextArea = styled.textarea`
    ${InputStyles}
    height: auto;
    min-height: 80px;
    padding: 12px;
`;

const CheckboxContainer = styled.label`
    display: flex;
    align-items: center;
    gap: 8px;
    cursor: pointer;
    font-size: 13px;
    color: #334155;
    user-select: none;

    input {
        width: 16px;
        height: 16px;
        accent-color: #3b82f6;
        cursor: pointer;
    }
`;

const CardStyle = styled.div`
    background: white;
    border: 1px solid #e2e8f0;
    border-radius: 8px;
    overflow: hidden;
`;

const ServiceItem = styled(CardStyle)`
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 12px 16px;
    margin-bottom: 8px;
    transition: border-color 0.2s;

    &:hover {
        border-color: #cbd5e1;
    }
`;

const ServiceName = styled.span`
    flex: 1;
    font-size: 14px;
    font-weight: 500;
    color: #0f172a;
`;

const PriceInput = styled.input`
    width: 100px;
    padding: 6px 10px;
    border: 1px solid #e2e8f0;
    border-radius: 4px;
    font-size: 13px;
    text-align: right;
    color: #0f172a;
    font-weight: 500;

    &:focus {
        outline: none;
        border-color: #3b82f6;
    }
`;

const IconButton = styled.button`
    background: transparent;
    border: none;
    color: #94a3b8;
    cursor: pointer;
    padding: 6px;
    border-radius: 4px;
    display: flex;
    align-items: center;
    transition: all 0.2s;

    &:hover {
        background: #fee2e2;
        color: #ef4444;
    }
`;

const Dropdown = styled.div`
    position: absolute;
    top: calc(100% + 4px);
    left: 0;
    right: 0;
    max-height: 240px;
    overflow-y: auto;
    background: white;
    border: 1px solid #e2e8f0;
    border-radius: 8px;
    box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
    z-index: 50;
`;

const DropdownItem = styled.div<{ $highlighted?: boolean }>`
    padding: 10px 14px;
    cursor: pointer;
    font-size: 14px;
    color: #334155;
    transition: background 0.1s;
    background: ${props => props.$highlighted ? '#f1f5f9' : 'transparent'};
    border-bottom: 1px solid #f8fafc;

    &:last-child {
        border-bottom: none;
    }

    &:hover {
        background: #f1f5f9;
        color: #0f172a;
    }
`;

const Footer = styled.div`
    padding: 20px 32px;
    border-top: 1px solid #e2e8f0;
    display: flex;
    justify-content: space-between;
    align-items: center;
    background: #ffffff;
`;

const ColorPicker = styled.div`
    display: flex;
    gap: 8px;
`;

const ColorDot = styled.button<{ $color: string; $selected: boolean }>`
    width: 24px;
    height: 24px;
    border-radius: 50%;
    background-color: ${props => props.$color};
    border: 2px solid white;
    box-shadow: 0 0 0 ${props => props.$selected ? '2px' : '1px'} ${props => props.$selected ? '#3b82f6' : '#cbd5e1'};
    cursor: pointer;
    transition: all 0.2s;

    &:hover {
        transform: scale(1.1);
    }
`;

const ButtonRow = styled.div`
    display: flex;
    gap: 12px;
`;

const Button = styled.button<{ $variant?: 'primary' | 'secondary' }>`
    padding: 10px 24px;
    border-radius: 6px;
    font-size: 14px;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s ease;

    ${props => props.$variant === 'primary' ? `
        background: #0f172a; // Enterprise Dark
        color: white;
        border: 1px solid #0f172a;
        box-shadow: 0 2px 4px rgba(15, 23, 42, 0.1);

        &:hover {
            background: #1e293b;
            transform: translateY(-1px);
        }
    ` : `
        background: white;
        color: #64748b;
        border: 1px solid #cbd5e1;

        &:hover {
            background: #f8fafc;
            color: #334155;
            border-color: #94a3b8;
        }
    `}
`;

// Placeholder button similar to Google Calendar's "Add guests"
const PlaceholderButton = styled.button<{ $hasValue?: boolean }>`
    width: 100%;
    padding: 10px 14px;
    border: 1px solid #cbd5e1;
    border-radius: 6px;
    font-size: 14px;
    background: #ffffff;
    text-align: left;
    cursor: pointer;
    transition: all 0.2s ease;
    display: flex;
    align-items: center;
    gap: 8px;
    min-height: 42px;

    color: ${props => props.$hasValue ? '#0f172a' : '#94a3b8'};
    font-weight: ${props => props.$hasValue ? '500' : '400'};

    &:hover {
        border-color: #94a3b8;
        background: #f8fafc;
    }

    &:focus {
        outline: none;
        border-color: #3b82f6;
        box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
    }

    &:disabled {
        opacity: 0.5;
        cursor: not-allowed;

        &:hover {
            border-color: #cbd5e1;
            background: #ffffff;
        }
    }
`;

const PlaceholderIcon = styled.span`
    display: flex;
    align-items: center;
    color: #64748b;
    flex-shrink: 0;
`;

const PlaceholderText = styled.span`
    flex: 1;
`;

const RemoveButton = styled.button`
    background: transparent;
    border: none;
    color: #94a3b8;
    cursor: pointer;
    padding: 4px;
    border-radius: 4px;
    display: flex;
    align-items: center;
    transition: all 0.2s;
    flex-shrink: 0;

    &:hover {
        background: #fee2e2;
        color: #ef4444;
    }
`;

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
    vehicleId?: string;
    vehicleName: string;
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

    // Handlers
    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSave({
            title,
            customerId: selectedCustomerId,
            customerName: selectedCustomerName,
            vehicleId: selectedVehicleId,
            vehicleName: selectedVehicleName,
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
        <Overlay $isOpen={isOpen} onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
            <ModalContainer>
                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                    <Header>
                        <TitleInput
                            type="text"
                            placeholder="Wpisz tytuł wizyty..."
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            autoFocus
                        />
                        <CloseButton type="button" onClick={onClose}><IconX /></CloseButton>
                    </Header>

                    <Content>
                        {/* --- TIME SECTION --- */}
                        <SectionTitle><IconClock /> Termin Wizyty</SectionTitle>
                        <Grid $cols={2}>
                            <FormGroup>
                                <Label>Początek</Label>
                                <Input
                                    type={isAllDay ? 'date' : 'datetime-local'}
                                    value={startDateTime}
                                    onChange={(e) => setStartDateTime(e.target.value)}
                                    required
                                />
                            </FormGroup>
                            <FormGroup>
                                <Label>Koniec</Label>
                                <Input
                                    type={isAllDay ? 'date' : 'datetime-local'}
                                    value={endDateTime}
                                    onChange={(e) => setEndDateTime(e.target.value)}
                                    required
                                />
                            </FormGroup>
                        </Grid>
                        <div style={{ marginTop: '-20px', marginBottom: '32px' }}>
                            <CheckboxContainer>
                                <input
                                    type="checkbox"
                                    checked={isAllDay}
                                    onChange={(e) => setIsAllDay(e.target.checked)}
                                />
                                Cały dzień
                            </CheckboxContainer>
                        </div>

                        {/* --- CUSTOMER & VEHICLE SECTION --- */}
                        <Grid $cols={2}>
                            <div>
                                <SectionTitle><IconUser /> Klient</SectionTitle>
                                <PlaceholderButton
                                    type="button"
                                    $hasValue={!!selectedCustomer}
                                    onClick={() => setIsCustomerModalOpen(true)}
                                >
                                    <PlaceholderIcon>
                                        <IconUser />
                                    </PlaceholderIcon>
                                    <PlaceholderText>
                                        {selectedCustomer
                                            ? (selectedCustomer.isAlias
                                                ? selectedCustomer.alias
                                                : `${selectedCustomer.firstName} ${selectedCustomer.lastName}`)
                                            : 'Dodaj klienta'}
                                    </PlaceholderText>
                                    {selectedCustomer && (
                                        <RemoveButton onClick={handleRemoveCustomer}>
                                            <IconX />
                                        </RemoveButton>
                                    )}
                                </PlaceholderButton>
                            </div>

                            <div>
                                <SectionTitle><IconCar /> Pojazd</SectionTitle>
                                <PlaceholderButton
                                    type="button"
                                    $hasValue={!!selectedVehicle}
                                    onClick={() => selectedCustomerId && setIsVehicleModalOpen(true)}
                                    disabled={!selectedCustomerId}
                                >
                                    <PlaceholderIcon>
                                        <IconCar />
                                    </PlaceholderIcon>
                                    <PlaceholderText>
                                        {selectedVehicle
                                            ? `${selectedVehicle.brand} ${selectedVehicle.model}`
                                            : (selectedCustomerId ? 'Dodaj pojazd' : 'Najpierw wybierz klienta')}
                                    </PlaceholderText>
                                    {selectedVehicle && (
                                        <RemoveButton onClick={handleRemoveVehicle}>
                                            <IconX />
                                        </RemoveButton>
                                    )}
                                </PlaceholderButton>
                            </div>
                        </Grid>


                        {/* --- SERVICES SECTION --- */}
                        <SectionTitle><IconSettings /> Usługi</SectionTitle>
                        <FormGroup style={{ marginBottom: '16px' }}>
                            <Input
                                type="text"
                                placeholder="Dodaj usługę (wpisz nazwę)..."
                                value={serviceSearch}
                                onChange={(e) => {
                                    setServiceSearch(e.target.value);
                                    setShowServiceDropdown(true);
                                }}
                            />
                            {showServiceDropdown && serviceSearch.length > 0 && (
                                <Dropdown>
                                    {services
                                        .filter((s: any) => s.name.toLowerCase().includes(serviceSearch.toLowerCase()))
                                        .map((service: any) => (
                                            <DropdownItem key={service.id} onClick={() => addService(service)}>
                                                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                                    <span>{service.name}</span>
                                                    <span style={{ fontWeight: 600, color: '#3b82f6' }}>{(service.basePriceNet / 100).toFixed(2)} zł</span>
                                                </div>
                                            </DropdownItem>
                                        ))}
                                </Dropdown>
                            )}
                        </FormGroup>

                        {selectedServiceIds.length > 0 && (
                            <div style={{ marginBottom: '32px' }}>
                                {selectedServiceIds.map(id => {
                                    const service = services.find((s: any) => s.id === id);
                                    if (!service) return null;
                                    return (
                                        <ServiceItem key={id}>
                                            <ServiceName>{service.name}</ServiceName>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                <PriceInput
                                                    type="number"
                                                    value={servicePrices[id] || 0}
                                                    onChange={(e) => setServicePrices(prev => ({ ...prev, [id]: parseFloat(e.target.value) || 0 }))}
                                                />
                                                <span style={{ fontSize: '13px', color: '#64748b' }}>zł</span>
                                                <IconButton
                                                    type="button"
                                                    onClick={() => {
                                                        setSelectedServiceIds(prev => prev.filter(i => i !== id));
                                                        const newPrices = {...servicePrices};
                                                        delete newPrices[id];
                                                        setServicePrices(newPrices);
                                                    }}
                                                >
                                                    <IconTrash />
                                                </IconButton>
                                            </div>
                                        </ServiceItem>
                                    );
                                })}
                            </div>
                        )}

                        {/* --- NOTES SECTION --- */}
                        <SectionTitle><IconNote /> Notatki</SectionTitle>
                        <TextArea
                            placeholder="Wpisz dodatkowe uwagi..."
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                        />
                    </Content>

                    <Footer>
                        <ColorPicker>
                            {appointmentColors.map((color: any) => (
                                <ColorDot
                                    key={color.id}
                                    type="button"
                                    $color={color.hexColor}
                                    $selected={color.id === selectedColorId}
                                    onClick={() => setSelectedColorId(color.id)}
                                    title={color.name}
                                />
                            ))}
                        </ColorPicker>

                        <ButtonRow>
                            <Button type="button" $variant="secondary" onClick={onClose}>
                                Anuluj
                            </Button>
                            <Button type="submit" $variant="primary">
                                Zapisz Wizytę
                            </Button>
                        </ButtonRow>
                    </Footer>
                </form>
            </ModalContainer>

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
        </Overlay>
    );
};