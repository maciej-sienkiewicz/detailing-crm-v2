// src/modules/appointments/hooks/useAppointmentCreation.ts
import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAppointmentForm, useAppointmentServices, useAppointmentColors, useCustomerVehicles } from './useAppointmentForm';
import type { SelectedCustomer, SelectedVehicle, ServiceLineItem } from '../types';
import { toInstant, fromInstantToLocalInput } from '@/common/dateTime';

export const useAppointmentCreation = () => {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const { createMutation } = useAppointmentForm();
    const { data: availableServices, isLoading: servicesLoading } = useAppointmentServices();
    const { data: appointmentColors, isLoading: colorsLoading } = useAppointmentColors();

    // Get URL params for pre-filling
    const startDateTimeParam = searchParams.get('startDateTime');
    const endDateTimeParam = searchParams.get('endDateTime');
    const isAllDayParam = searchParams.get('isAllDay') === 'true';

    const [selectedCustomer, setSelectedCustomer] = useState<SelectedCustomer | null>(null);
    const [selectedVehicle, setSelectedVehicle] = useState<SelectedVehicle | null>(null);
    const [serviceItems, setServiceItems] = useState<ServiceLineItem[]>([]);
    const [isAllDay, setIsAllDay] = useState(isAllDayParam);
    const [startDateTime, setStartDateTime] = useState(fromInstantToLocalInput(startDateTimeParam || ''));
    const [endDateTime, setEndDateTime] = useState(fromInstantToLocalInput(endDateTimeParam || ''));
    const [appointmentTitle, setAppointmentTitle] = useState('');
    const [selectedColorId, setSelectedColorId] = useState('');

    const [isCustomerModalOpen, setIsCustomerModalOpen] = useState(false);
    const [isVehicleModalOpen, setIsVehicleModalOpen] = useState(false);

    const { data: customerVehicles } = useCustomerVehicles(
        selectedCustomer?.id && !selectedCustomer.isNew ? selectedCustomer.id : undefined
    );

    useEffect(() => {
        if (appointmentColors && appointmentColors.length > 0 && !selectedColorId) {
            const timer = setTimeout(() => {
                setSelectedColorId(appointmentColors[0].id);
            }, 0);
            return () => clearTimeout(timer);
        }
    }, [appointmentColors, selectedColorId]);

    useEffect(() => {
        if (selectedCustomer && !selectedCustomer.isNew && customerVehicles && customerVehicles.length > 0 && !selectedVehicle) {
            setIsVehicleModalOpen(true);
        }
    }, [selectedCustomer, customerVehicles, selectedVehicle]);

    const handleCustomerSelect = (customer: SelectedCustomer) => {
        setSelectedCustomer(customer);
        setSelectedVehicle(null);
    };

    const handleVehicleSelect = (vehicle: SelectedVehicle) => {
        if (vehicle.brand && vehicle.model) {
            setSelectedVehicle(vehicle);
        }
    };

    const handleSubmit = () => {
        if (!selectedCustomer || !selectedColorId || serviceItems.length === 0 || !startDateTime || !endDateTime) {
            return;
        }

        // Convert local input values to Instant (UTC ISO with 'Z') before sending to backend
        let startInstant = '';
        let endInstant = '';
        try {
            startInstant = toInstant(startDateTime);
            endInstant = toInstant(endDateTime);
        } catch (e) {
            console.error('Błąd konwersji daty do Instant:', e);
            return;
        }

        const data = {
            customer: selectedCustomer.isNew
                ? {
                    mode: 'NEW' as const,
                    newData: {
                        firstName: selectedCustomer.firstName!,
                        lastName: selectedCustomer.lastName!,
                        phone: selectedCustomer.phone!,
                        email: selectedCustomer.email!,
                    },
                }
                : {
                    mode: 'EXISTING' as const,
                    id: selectedCustomer.id!,
                },
            vehicle: !selectedVehicle
                ? { mode: 'NONE' as const }
                : selectedVehicle.isNew
                    ? {
                        mode: 'NEW' as const,
                        newData: {
                            brand: selectedVehicle.brand,
                            model: selectedVehicle.model,
                        },
                    }
                    : {
                        mode: 'EXISTING' as const,
                        id: selectedVehicle.id!,
                    },
            services: serviceItems,
            schedule: {
                isAllDay,
                startDateTime: startInstant,
                endDateTime: endInstant,
            },
            appointmentTitle: appointmentTitle || undefined,
            appointmentColorId: selectedColorId,
        };

        createMutation.mutate(data, {
            onSuccess: () => {
                navigate('/appointments');
            },
        });
    };

    const canSubmit = selectedCustomer && selectedColorId && serviceItems.length > 0 && startDateTime && endDateTime;

    return {
        selectedCustomer,
        setSelectedCustomer: handleCustomerSelect,
        selectedVehicle,
        setSelectedVehicle: handleVehicleSelect,
        serviceItems,
        setServiceItems,
        isAllDay,
        setIsAllDay,
        startDateTime,
        setStartDateTime,
        endDateTime,
        setEndDateTime,
        appointmentTitle,
        setAppointmentTitle,
        selectedColorId,
        setSelectedColorId,
        isCustomerModalOpen,
        setIsCustomerModalOpen,
        isVehicleModalOpen,
        setIsVehicleModalOpen,
        customerVehicles,
        availableServices: availableServices || [],
        appointmentColors: appointmentColors || [],
        isLoading: servicesLoading || colorsLoading,
        handleSubmit,
        canSubmit,
        isSubmitting: createMutation.isPending,
        submitError: createMutation.isError,
    };
};