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
    border-radius: 8px;
    box-shadow: 0 24px 38px rgba(0, 0, 0, 0.14), 0 9px 46px rgba(0, 0, 0, 0.12), 0 11px 15px rgba(0, 0, 0, 0.2);
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
    padding: 10px 12px;
    border: 1px solid #dadce0;
    border-radius: 4px;
    font-size: 14px;
    color: #3c4043;
    transition: border-color 0.2s;

    &:focus {
        outline: none;
        border-color: #1a73e8;
        box-shadow: 0 0 0 1px #1a73e8;
    }
`;

const Select = styled.select`
    padding: 10px 12px;
    border: 1px solid #dadce0;
    border-radius: 4px;
    font-size: 14px;
    color: #3c4043;
    background: white;
    cursor: pointer;
    transition: border-color 0.2s;

    &:focus {
        outline: none;
        border-color: #1a73e8;
        box-shadow: 0 0 0 1px #1a73e8;
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

const ServicesList = styled.div`
    display: flex;
    flex-direction: column;
    gap: 8px;
    margin-top: 8px;
`;

const ServiceItem = styled.div`
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 8px 12px;
    background: #f8f9fa;
    border-radius: 4px;
    border: 1px solid #e8eaed;
`;

const ServiceCheckbox = styled.input`
    width: 18px;
    height: 18px;
    cursor: pointer;
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

const Footer = styled.div`
    padding: 16px 24px;
    border-top: 1px solid #e8eaed;
    display: flex;
    justify-content: space-between;
    align-items: center;
    background: #f8f9fa;
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
    padding: ${props => props.$variant === 'text' ? '8px 16px' : '10px 24px'};
    border-radius: 4px;
    font-size: 14px;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s;
    border: none;

    ${props => {
        if (props.$variant === 'primary') {
            return `
                background: #1a73e8;
                color: #ffffff;
                &:hover {
                    background: #1557b0;
                    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);
                }
            `;
        } else if (props.$variant === 'text') {
            return `
                background: transparent;
                color: #1a73e8;
                &:hover {
                    background: #f1f3f4;
                }
            `;
        } else {
            return `
                background: transparent;
                color: #5f6368;
                border: 1px solid #dadce0;
                &:hover {
                    background: #f8f9fa;
                    border-color: #bdc1c6;
                }
            `;
        }
    }}
`;

const SearchInput = styled(Input)`
    margin-bottom: 8px;
`;

const CustomerList = styled.div`
    max-height: 150px;
    overflow-y: auto;
    border: 1px solid #dadce0;
    border-radius: 4px;
    background: white;
`;

const CustomerItem = styled.div<{ $selected: boolean }>`
    padding: 10px 12px;
    cursor: pointer;
    font-size: 14px;
    background: ${props => props.$selected ? '#e8f0fe' : 'transparent'};
    color: #3c4043;
    transition: background-color 0.2s;

    &:hover {
        background: #f1f3f4;
    }

    &:not(:last-child) {
        border-bottom: 1px solid #f1f3f4;
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
    const [startDateTime, setStartDateTime] = useState('');
    const [endDateTime, setEndDateTime] = useState('');
    const [isAllDay, setIsAllDay] = useState(false);
    const [selectedServiceIds, setSelectedServiceIds] = useState<string[]>([]);
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
            colorId: selectedColorId,
            notes,
        });
    };

    const handleOverlayClick = (e: React.MouseEvent) => {
        if (e.target === e.currentTarget) {
            onClose();
        }
    };

    const toggleService = (serviceId: string) => {
        setSelectedServiceIds(prev =>
            prev.includes(serviceId)
                ? prev.filter(id => id !== serviceId)
                : [...prev, serviceId]
        );
    };

    const handleCustomerSelect = (customer: any) => {
        setSelectedCustomerId(customer.id);
        setSelectedCustomerName(`${customer.firstName} ${customer.lastName}`);
        setCustomerSearch(`${customer.firstName} ${customer.lastName}`);
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
                        {selectedCustomerId && vehicles.length > 0 && (
                            <FormSection>
                                <IconContainer>🚗</IconContainer>
                                <FieldContainer>
                                    <Label>Pojazd</Label>
                                    <Select
                                        value={selectedVehicleId || ''}
                                        onChange={(e) => {
                                            setSelectedVehicleId(e.target.value);
                                            const vehicle = vehicles.find((v: any) => v.id === e.target.value);
                                            if (vehicle) {
                                                setSelectedVehicleName(`${vehicle.brand} ${vehicle.model}`);
                                            }
                                        }}
                                    >
                                        <option value="">Wybierz pojazd...</option>
                                        {vehicles.map((vehicle: any) => (
                                            <option key={vehicle.id} value={vehicle.id}>
                                                {vehicle.brand} {vehicle.model} ({vehicle.licensePlate})
                                            </option>
                                        ))}
                                    </Select>
                                </FieldContainer>
                            </FormSection>
                        )}

                        {/* Services */}
                        <FormSection>
                            <IconContainer>⚙️</IconContainer>
                            <FieldContainer>
                                <Label>Usługi</Label>
                                <ServicesList>
                                    {services.slice(0, 5).map((service: any) => (
                                        <ServiceItem key={service.id}>
                                            <ServiceCheckbox
                                                type="checkbox"
                                                checked={selectedServiceIds.includes(service.id)}
                                                onChange={() => toggleService(service.id)}
                                            />
                                            <ServiceName>{service.name}</ServiceName>
                                            <ServicePrice>
                                                {(service.basePriceNet / 100).toFixed(2)} zł
                                            </ServicePrice>
                                        </ServiceItem>
                                    ))}
                                </ServicesList>
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
