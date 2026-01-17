// src/modules/calendar/components/QuickEventModal.tsx

import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/core';
import type { EventCreationData } from '../types';

const Overlay = styled.div<{ $isOpen: boolean }>`
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.5);
    display: ${props => props.$isOpen ? 'flex' : 'none'};
    align-items: center;
    justify-content: center;
    z-index: 1000;
    padding: 20px;
`;

const ModalContainer = styled.div`
    background: #ffffff;
    border-radius: 16px;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.08), 0 4px 16px rgba(0, 0, 0, 0.04);
    width: 100%;
    max-width: 720px;
    max-height: 90vh;
    overflow: hidden;
    display: flex;
    flex-direction: column;
`;

const Header = styled.div`
    padding: 24px 24px 0 24px;
    border-bottom: none;
`;

const CloseButton = styled.button`
    position: absolute;
    top: 16px;
    right: 16px;
    background: none;
    border: none;
    font-size: 24px;
    color: #5f6368;
    cursor: pointer;
    padding: 8px;
    line-height: 1;
    border-radius: 50%;
    width: 40px;
    height: 40px;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: background-color 0.2s;

    &:hover {
        background-color: #f1f3f4;
    }
`;

const Content = styled.div`
    padding: 0 24px 24px 24px;
    overflow-y: auto;
    flex: 1;
`;

const TitleInput = styled.input`
    width: 100%;
    padding: 12px 0;
    border: none;
    border-bottom: 1px solid transparent;
    font-size: 22px;
    font-weight: 400;
    color: #3c4043;
    outline: none;
    margin-bottom: 24px;

    &::placeholder {
        color: #80868b;
    }

    &:focus {
        border-bottom-color: #1a73e8;
    }
`;

const FormSection = styled.div`
    display: flex;
    gap: 16px;
    margin-bottom: 16px;
    align-items: flex-start;
`;

const IconContainer = styled.div`
    width: 24px;
    height: 24px;
    margin-top: 12px;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #5f6368;
    flex-shrink: 0;
`;

const FieldContainer = styled.div`
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 8px;
`;

const Label = styled.label`
    font-size: 12px;
    font-weight: 500;
    color: #5f6368;
    text-transform: uppercase;
    letter-spacing: 0.3px;
`;

const Input = styled.input`
    padding: 12px 16px;
    border: 1px solid #e0e0e0;
    border-radius: 12px;
    font-size: 14px;
    color: #3c4043;
    transition: all 0.2s ease;
    background: #fafafa;

    &:focus {
        outline: none;
        border-color: #1a73e8;
        box-shadow: 0 0 0 3px rgba(26, 115, 232, 0.1);
        background: #ffffff;
    }

    &:hover:not(:focus) {
        border-color: #bdbdbd;
    }
`;

const DateTimeRow = styled.div`
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 12px;
`;

const Checkbox = styled.label`
    display: flex;
    align-items: center;
    gap: 8px;
    cursor: pointer;
    font-size: 14px;
    color: #3c4043;
    padding: 8px 0;

    input {
        cursor: pointer;
        width: 18px;
        height: 18px;
    }
`;

const ServiceItem = styled.div`
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 12px 16px;
    background: #fafafa;
    border-radius: 12px;
    border: 1px solid #e8eaed;
    transition: all 0.2s ease;

    &:hover {
        background: #f5f5f5;
        border-color: #d0d0d0;
    }
`;

const ServiceName = styled.span`
    flex: 1;
    font-size: 14px;
    color: #3c4043;
`;

const ServicePrice = styled.span`
    font-size: 14px;
    color: #5f6368;
    font-weight: 500;
`;

const PriceInput = styled.input`
    width: 100px;
    padding: 6px 10px;
    border: 1px solid #e0e0e0;
    border-radius: 8px;
    font-size: 13px;
    color: #3c4043;
    text-align: right;
    background: #ffffff;
    transition: all 0.2s ease;

    &:focus {
        outline: none;
        border-color: #1a73e8;
        box-shadow: 0 0 0 2px rgba(26, 115, 232, 0.1);
    }

    &:hover:not(:focus) {
        border-color: #bdbdbd;
    }
`;

const ServiceSearchContainer = styled.div`
    position: relative;
    margin-bottom: 12px;
`;

const ServiceDropdown = styled.div`
    position: absolute;
    top: 100%;
    left: 0;
    right: 0;
    max-height: 200px;
    overflow-y: auto;
    background: white;
    border: 1px solid #e0e0e0;
    border-radius: 12px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
    z-index: 10;
    margin-top: 4px;
`;

const ServiceDropdownItem = styled.div`
    padding: 12px 16px;
    cursor: pointer;
    font-size: 14px;
    color: #3c4043;
    transition: all 0.2s ease;
    display: flex;
    justify-content: space-between;
    align-items: center;

    &:hover {
        background: #f5f5f5;
    }

    &:not(:last-child) {
        border-bottom: 1px solid #f1f3f4;
    }

    &:first-child {
        border-top-left-radius: 12px;
        border-top-right-radius: 12px;
    }

    &:last-child {
        border-bottom-left-radius: 12px;
        border-bottom-right-radius: 12px;
    }
`;

const SelectedServicesList = styled.div`
    display: flex;
    flex-direction: column;
    gap: 8px;
    margin-top: 12px;
`;

const RemoveButton = styled.button`
    background: none;
    border: none;
    color: #5f6368;
    cursor: pointer;
    padding: 4px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 50%;
    transition: all 0.2s ease;
    width: 24px;
    height: 24px;

    &:hover {
        background: #f1f3f4;
        color: #d93025;
    }
`;

const VehicleSearchContainer = styled.div`
    position: relative;
`;

const VehicleDropdown = styled.div`
    position: absolute;
    top: 100%;
    left: 0;
    right: 0;
    max-height: 200px;
    overflow-y: auto;
    background: white;
    border: 1px solid #e0e0e0;
    border-radius: 12px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
    z-index: 10;
    margin-top: 4px;
`;

const VehicleDropdownItem = styled.div`
    padding: 12px 16px;
    cursor: pointer;
    font-size: 14px;
    color: #3c4043;
    transition: all 0.2s ease;

    &:hover {
        background: #f5f5f5;
    }

    &:not(:last-child) {
        border-bottom: 1px solid #f1f3f4;
    }

    &:first-child {
        border-top-left-radius: 12px;
        border-top-right-radius: 12px;
    }

    &:last-child {
        border-bottom-left-radius: 12px;
        border-bottom-right-radius: 12px;
    }
`;

const AddNewButton = styled.button`
    width: 100%;
    padding: 12px 16px;
    background: #f5f5f5;
    border: 1px dashed #bdbdbd;
    border-radius: 12px;
    color: #1a73e8;
    font-size: 14px;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s ease;
    margin-top: 8px;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;

    &:hover {
        background: #eeeeee;
        border-color: #1a73e8;
    }
`;

const VehicleInputGrid = styled.div`
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 8px;
    margin-top: 8px;
`;

const Footer = styled.div`
    padding: 20px 24px;
    border-top: 1px solid #f0f0f0;
    display: flex;
    justify-content: space-between;
    align-items: center;
    background: linear-gradient(to bottom, #fafafa 0%, #f5f5f5 100%);
`;

const ColorPicker = styled.div`
    display: flex;
    gap: 8px;
`;

const ColorDot = styled.button<{ $color: string; $selected: boolean }>`
    width: 32px;
    height: 32px;
    border-radius: 50%;
    background-color: ${props => props.$color};
    border: ${props => props.$selected ? '2px solid #1a73e8' : '2px solid transparent'};
    cursor: pointer;
    transition: transform 0.2s;
    box-shadow: ${props => props.$selected ? '0 0 0 1px #1a73e8' : 'none'};

    &:hover {
        transform: scale(1.1);
    }
`;

const ButtonRow = styled.div`
    display: flex;
    gap: 12px;
`;

const Button = styled.button<{ $variant?: 'primary' | 'secondary' | 'text' }>`
    padding: ${props => props.$variant === 'text' ? '10px 20px' : '12px 28px'};
    border-radius: 12px;
    font-size: 14px;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s ease;
    border: none;

    ${props => {
        if (props.$variant === 'primary') {
            return `
                background: linear-gradient(135deg, #1a73e8 0%, #1557b0 100%);
                color: #ffffff;
                box-shadow: 0 2px 8px rgba(26, 115, 232, 0.25);
                &:hover {
                    transform: translateY(-1px);
                    box-shadow: 0 4px 12px rgba(26, 115, 232, 0.35);
                }
                &:active {
                    transform: translateY(0);
                }
            `;
        } else if (props.$variant === 'text') {
            return `
                background: transparent;
                color: #1a73e8;
                &:hover {
                    background: rgba(26, 115, 232, 0.08);
                }
            `;
        } else {
            return `
                background: #f5f5f5;
                color: #5f6368;
                border: 1px solid #e0e0e0;
                &:hover {
                    background: #eeeeee;
                    border-color: #bdbdbd;
                }
            `;
        }
    }}
`;

const SearchInput = styled(Input)`
    margin-bottom: 8px;
`;

const CustomerList = styled.div`
    max-height: 200px;
    overflow-y: auto;
    border: 1px solid #e0e0e0;
    border-radius: 12px;
    background: white;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
`;

const CustomerItem = styled.div<{ $selected: boolean }>`
    padding: 12px 16px;
    cursor: pointer;
    font-size: 14px;
    background: ${props => props.$selected ? '#e8f0fe' : 'transparent'};
    color: #3c4043;
    transition: all 0.2s ease;

    &:hover {
        background: ${props => props.$selected ? '#d2e3fc' : '#f5f5f5'};
    }

    &:not(:last-child) {
        border-bottom: 1px solid #f1f3f4;
    }

    &:first-child {
        border-top-left-radius: 12px;
        border-top-right-radius: 12px;
    }

    &:last-child {
        border-bottom-left-radius: 12px;
        border-bottom-right-radius: 12px;
    }
`;

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

export const QuickEventModal: React.FC<QuickEventModalProps> = ({
    isOpen,
    eventData,
    onClose,
    onSave,
}) => {
    const [title, setTitle] = useState('');
    const [customerSearch, setCustomerSearch] = useState('');
    const [selectedCustomerId, setSelectedCustomerId] = useState<string>();
    const [selectedCustomerName, setSelectedCustomerName] = useState('');
    const [selectedVehicleId, setSelectedVehicleId] = useState<string>();
    const [selectedVehicleName, setSelectedVehicleName] = useState('');
    const [vehicleSearch, setVehicleSearch] = useState('');
    const [showVehicleDropdown, setShowVehicleDropdown] = useState(false);
    const [showAddVehicle, setShowAddVehicle] = useState(false);
    const [newVehicleBrand, setNewVehicleBrand] = useState('');
    const [newVehicleModel, setNewVehicleModel] = useState('');
    const [newVehiclePlate, setNewVehiclePlate] = useState('');
    const [startDateTime, setStartDateTime] = useState('');
    const [endDateTime, setEndDateTime] = useState('');
    const [isAllDay, setIsAllDay] = useState(false);
    const [selectedServiceIds, setSelectedServiceIds] = useState<string[]>([]);
    const [servicePrices, setServicePrices] = useState<{ [key: string]: number }>({});
    const [serviceSearch, setServiceSearch] = useState('');
    const [showServiceDropdown, setShowServiceDropdown] = useState(false);
    const [selectedColorId, setSelectedColorId] = useState('');
    const [notes, setNotes] = useState('');

    // Fetch customers
    const { data: customers = [] } = useQuery({
        queryKey: ['customers-search', customerSearch],
        queryFn: async () => {
            if (!customerSearch || customerSearch.length < 2) return [];
            const response = await apiClient.get(`/api/v1/customers/search`, {
                params: { query: customerSearch },
            });
            return response.data.customers || [];
        },
        enabled: customerSearch.length >= 2,
    });

    // Fetch vehicles for selected customer
    const { data: vehicles = [] } = useQuery({
        queryKey: ['customer-vehicles', selectedCustomerId],
        queryFn: async () => {
            if (!selectedCustomerId) return [];
            const response = await apiClient.get(`/api/v1/customers/${selectedCustomerId}/vehicles`);
            return response.data.vehicles || [];
        },
        enabled: !!selectedCustomerId,
    });

    // Fetch services
    const { data: services = [] } = useQuery({
        queryKey: ['services'],
        queryFn: async () => {
            const response = await apiClient.get('/api/v1/services');
            return response.data.services || [];
        },
    });

    // Fetch appointment colors
    const { data: appointmentColors = [] } = useQuery({
        queryKey: ['appointment-colors'],
        queryFn: async () => {
            const response = await apiClient.get('/api/v1/appointment-colors');
            return response.data.colors || [];
        },
    });

    // Format helpers
    const formatDateTimeLocal = (date: Date): string => {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');
        return `${year}-${month}-${day}T${hours}:${minutes}`;
    };

    const formatDate = (date: Date): string => {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    };

    // Initialize form when eventData changes
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

        // Set default color if available
        if (appointmentColors.length > 0 && !selectedColorId) {
            setSelectedColorId(appointmentColors[0].id);
        }
    }, [eventData, appointmentColors, selectedColorId]);

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

    const handleOverlayClick = (e: React.MouseEvent) => {
        if (e.target === e.currentTarget) {
            onClose();
        }
    };

    const addService = (service: any) => {
        if (!selectedServiceIds.includes(service.id)) {
            setSelectedServiceIds(prev => [...prev, service.id]);
            setServicePrices(prev => ({
                ...prev,
                [service.id]: service.basePriceNet / 100
            }));
        }
        setServiceSearch('');
        setShowServiceDropdown(false);
    };

    const removeService = (serviceId: string) => {
        setSelectedServiceIds(prev => prev.filter(id => id !== serviceId));
        setServicePrices(prev => {
            const newPrices = { ...prev };
            delete newPrices[serviceId];
            return newPrices;
        });
    };

    const updateServicePrice = (serviceId: string, price: number) => {
        setServicePrices(prev => ({
            ...prev,
            [serviceId]: price
        }));
    };

    const handleCustomerSelect = (customer: any) => {
        setSelectedCustomerId(customer.id);
        setSelectedCustomerName(`${customer.firstName} ${customer.lastName}`);
        setCustomerSearch(`${customer.firstName} ${customer.lastName}`);
    };

    const handleVehicleSelect = (vehicle: any) => {
        setSelectedVehicleId(vehicle.id);
        setSelectedVehicleName(`${vehicle.brand} ${vehicle.model}`);
        setVehicleSearch(`${vehicle.brand} ${vehicle.model} (${vehicle.licensePlate})`);
        setShowVehicleDropdown(false);
    };

    const handleAddNewVehicle = () => {
        if (!selectedCustomerId) {
            alert('Wybierz najpierw klienta');
            return;
        }
        if (!newVehicleBrand || !newVehicleModel || !newVehiclePlate) {
            alert('Wypełnij wszystkie pola pojazdu');
            return;
        }
        // Symulacja dodania pojazdu - w rzeczywistości to powinno być API call
        const tempVehicleId = `temp-${Date.now()}`;
        setSelectedVehicleId(tempVehicleId);
        setSelectedVehicleName(`${newVehicleBrand} ${newVehicleModel}`);
        setVehicleSearch(`${newVehicleBrand} ${newVehicleModel} (${newVehiclePlate})`);
        setShowAddVehicle(false);
        setNewVehicleBrand('');
        setNewVehicleModel('');
        setNewVehiclePlate('');
    };

    if (!eventData) return null;

    return (
        <Overlay $isOpen={isOpen} onClick={handleOverlayClick}>
            <ModalContainer>
                <CloseButton onClick={onClose}>✕</CloseButton>

                <form onSubmit={handleSubmit}>
                    <Header>
                        <TitleInput
                            type="text"
                            placeholder="Dodaj tytuł"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            autoFocus
                        />
                    </Header>

                    <Content>
                        {/* Date and Time */}
                        <FormSection>
                            <IconContainer>🕐</IconContainer>
                            <FieldContainer>
                                <Checkbox>
                                    <input
                                        type="checkbox"
                                        checked={isAllDay}
                                        onChange={(e) => setIsAllDay(e.target.checked)}
                                    />
                                    Wizyta całodniowa
                                </Checkbox>
                                <DateTimeRow>
                                    <div>
                                        <Label>Początek</Label>
                                        <Input
                                            type={isAllDay ? 'date' : 'datetime-local'}
                                            value={startDateTime}
                                            onChange={(e) => setStartDateTime(e.target.value)}
                                            required
                                        />
                                    </div>
                                    <div>
                                        <Label>Koniec</Label>
                                        <Input
                                            type={isAllDay ? 'date' : 'datetime-local'}
                                            value={endDateTime}
                                            onChange={(e) => setEndDateTime(e.target.value)}
                                            required
                                        />
                                    </div>
                                </DateTimeRow>
                            </FieldContainer>
                        </FormSection>

                        {/* Customer */}
                        <FormSection>
                            <IconContainer>👤</IconContainer>
                            <FieldContainer>
                                <Label>Klient</Label>
                                <SearchInput
                                    type="text"
                                    placeholder="Wyszukaj klienta..."
                                    value={customerSearch}
                                    onChange={(e) => setCustomerSearch(e.target.value)}
                                />
                                {customers.length > 0 && (
                                    <CustomerList>
                                        {customers.map((customer: any) => (
                                            <CustomerItem
                                                key={customer.id}
                                                $selected={customer.id === selectedCustomerId}
                                                onClick={() => handleCustomerSelect(customer)}
                                            >
                                                {customer.firstName} {customer.lastName} - {customer.phone}
                                            </CustomerItem>
                                        ))}
                                    </CustomerList>
                                )}
                            </FieldContainer>
                        </FormSection>

                        {/* Vehicle */}
                        <FormSection>
                            <IconContainer>🚗</IconContainer>
                            <FieldContainer>
                                <Label>Pojazd</Label>
                                <VehicleSearchContainer>
                                    <SearchInput
                                        type="text"
                                        placeholder="Wyszukaj pojazd..."
                                        value={vehicleSearch}
                                        onChange={(e) => {
                                            setVehicleSearch(e.target.value);
                                            setShowVehicleDropdown(e.target.value.length > 0 && selectedCustomerId !== undefined);
                                        }}
                                        onFocus={() => vehicleSearch.length > 0 && selectedCustomerId && setShowVehicleDropdown(true)}
                                        disabled={!selectedCustomerId}
                                    />
                                    {showVehicleDropdown && selectedCustomerId && (
                                        <VehicleDropdown>
                                            {vehicles
                                                .filter((vehicle: any) =>
                                                    `${vehicle.brand} ${vehicle.model} ${vehicle.licensePlate}`
                                                        .toLowerCase()
                                                        .includes(vehicleSearch.toLowerCase())
                                                )
                                                .map((vehicle: any) => (
                                                    <VehicleDropdownItem
                                                        key={vehicle.id}
                                                        onClick={() => handleVehicleSelect(vehicle)}
                                                    >
                                                        {vehicle.brand} {vehicle.model} ({vehicle.licensePlate})
                                                    </VehicleDropdownItem>
                                                ))}
                                            {vehicles.filter((vehicle: any) =>
                                                `${vehicle.brand} ${vehicle.model} ${vehicle.licensePlate}`
                                                    .toLowerCase()
                                                    .includes(vehicleSearch.toLowerCase())
                                            ).length === 0 && (
                                                <VehicleDropdownItem style={{ cursor: 'default', color: '#9e9e9e' }}>
                                                    Nie znaleziono pojazdów
                                                </VehicleDropdownItem>
                                            )}
                                        </VehicleDropdown>
                                    )}
                                </VehicleSearchContainer>
                                {selectedCustomerId && !showAddVehicle && (
                                    <AddNewButton
                                        type="button"
                                        onClick={() => setShowAddVehicle(true)}
                                    >
                                        + Dodaj nowy pojazd
                                    </AddNewButton>
                                )}
                                {showAddVehicle && (
                                    <>
                                        <VehicleInputGrid>
                                            <Input
                                                type="text"
                                                placeholder="Marka"
                                                value={newVehicleBrand}
                                                onChange={(e) => setNewVehicleBrand(e.target.value)}
                                            />
                                            <Input
                                                type="text"
                                                placeholder="Model"
                                                value={newVehicleModel}
                                                onChange={(e) => setNewVehicleModel(e.target.value)}
                                            />
                                        </VehicleInputGrid>
                                        <Input
                                            type="text"
                                            placeholder="Numer rejestracyjny"
                                            value={newVehiclePlate}
                                            onChange={(e) => setNewVehiclePlate(e.target.value)}
                                            style={{ marginTop: '8px' }}
                                        />
                                        <ButtonRow style={{ marginTop: '8px' }}>
                                            <Button
                                                type="button"
                                                onClick={() => {
                                                    setShowAddVehicle(false);
                                                    setNewVehicleBrand('');
                                                    setNewVehicleModel('');
                                                    setNewVehiclePlate('');
                                                }}
                                            >
                                                Anuluj
                                            </Button>
                                            <Button
                                                type="button"
                                                $variant="primary"
                                                onClick={handleAddNewVehicle}
                                            >
                                                Dodaj pojazd
                                            </Button>
                                        </ButtonRow>
                                    </>
                                )}
                            </FieldContainer>
                        </FormSection>

                        {/* Services */}
                        <FormSection>
                            <IconContainer>⚙️</IconContainer>
                            <FieldContainer>
                                <Label>Usługi</Label>
                                <ServiceSearchContainer>
                                    <SearchInput
                                        type="text"
                                        placeholder="Wyszukaj i dodaj usługę..."
                                        value={serviceSearch}
                                        onChange={(e) => {
                                            setServiceSearch(e.target.value);
                                            setShowServiceDropdown(e.target.value.length > 0);
                                        }}
                                        onFocus={() => serviceSearch.length > 0 && setShowServiceDropdown(true)}
                                    />
                                    {showServiceDropdown && serviceSearch.length > 0 && (
                                        <ServiceDropdown>
                                            {services
                                                .filter((service: any) =>
                                                    service.name.toLowerCase().includes(serviceSearch.toLowerCase())
                                                )
                                                .map((service: any) => (
                                                    <ServiceDropdownItem
                                                        key={service.id}
                                                        onClick={() => addService(service)}
                                                    >
                                                        <ServiceName>{service.name}</ServiceName>
                                                        <ServicePrice>
                                                            {(service.basePriceNet / 100).toFixed(2)} zł
                                                        </ServicePrice>
                                                    </ServiceDropdownItem>
                                                ))}
                                            {services.filter((service: any) =>
                                                service.name.toLowerCase().includes(serviceSearch.toLowerCase())
                                            ).length === 0 && (
                                                <ServiceDropdownItem style={{ cursor: 'default', color: '#9e9e9e' }}>
                                                    Nie znaleziono usług
                                                </ServiceDropdownItem>
                                            )}
                                        </ServiceDropdown>
                                    )}
                                </ServiceSearchContainer>
                                {selectedServiceIds.length > 0 && (
                                    <SelectedServicesList>
                                        {selectedServiceIds.map((serviceId) => {
                                            const service = services.find((s: any) => s.id === serviceId);
                                            if (!service) return null;
                                            return (
                                                <ServiceItem key={serviceId}>
                                                    <ServiceName>{service.name}</ServiceName>
                                                    <PriceInput
                                                        type="number"
                                                        step="0.01"
                                                        min="0"
                                                        value={servicePrices[serviceId] || (service.basePriceNet / 100)}
                                                        onChange={(e) => updateServicePrice(serviceId, parseFloat(e.target.value) || 0)}
                                                        placeholder="Cena"
                                                    />
                                                    <span style={{ fontSize: '13px', color: '#5f6368' }}>zł</span>
                                                    <RemoveButton
                                                        type="button"
                                                        onClick={() => removeService(serviceId)}
                                                        title="Usuń usługę"
                                                    >
                                                        ✕
                                                    </RemoveButton>
                                                </ServiceItem>
                                            );
                                        })}
                                    </SelectedServicesList>
                                )}
                            </FieldContainer>
                        </FormSection>

                        {/* Notes */}
                        <FormSection>
                            <IconContainer>📝</IconContainer>
                            <FieldContainer>
                                <Label>Notatki</Label>
                                <Input
                                    as="textarea"
                                    rows={3}
                                    placeholder="Dodaj notatki..."
                                    value={notes}
                                    onChange={(e) => setNotes(e.target.value)}
                                    style={{ resize: 'vertical', fontFamily: 'inherit' }}
                                />
                            </FieldContainer>
                        </FormSection>
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
                            <Button type="button" onClick={onClose}>
                                Anuluj
                            </Button>
                            <Button type="submit" $variant="primary">
                                Zapisz
                            </Button>
                        </ButtonRow>
                    </Footer>
                </form>
            </ModalContainer>
        </Overlay>
    );
};
