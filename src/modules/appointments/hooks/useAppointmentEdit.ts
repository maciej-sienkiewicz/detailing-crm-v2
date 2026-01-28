// src/modules/appointments/hooks/useAppointmentEdit.ts
import { useEffect, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { appointmentApi } from '../api/appointmentApi';
import type { SelectedCustomer, SelectedVehicle, ServiceLineItem } from '../types';
import { useAppointmentServices, useAppointmentColors, useCustomerVehicles } from './useAppointmentForm';

export const useAppointmentEdit = (appointmentId: string) => {
    const navigate = useNavigate();

    const { data: appointment, isLoading: isLoadingAppointment, isError } = useQuery({
        queryKey: ['appointments', appointmentId],
        queryFn: () => appointmentApi.getAppointment(appointmentId),
        enabled: !!appointmentId,
    });

    const { data: availableServices, isLoading: servicesLoading } = useAppointmentServices();
    const { data: appointmentColors, isLoading: colorsLoading } = useAppointmentColors();

    // Local editable state mirroring create view
    const [selectedCustomer, setSelectedCustomer] = useState<SelectedCustomer | null>(null);
    const [selectedVehicle, setSelectedVehicle] = useState<SelectedVehicle | null>(null);
    const [serviceItems, setServiceItems] = useState<ServiceLineItem[]>([]);
    const [isAllDay, setIsAllDay] = useState(false);
    const [startDateTime, setStartDateTime] = useState('');
    const [endDateTime, setEndDateTime] = useState('');
    const [appointmentTitle, setAppointmentTitle] = useState('');
    const [selectedColorId, setSelectedColorId] = useState('');

    // Vehicles for selected customer
    const { data: customerVehicles } = useCustomerVehicles(
        selectedCustomer?.id && !selectedCustomer.isNew ? selectedCustomer.id : undefined
    );

    // Initialize state from fetched appointment
    useEffect(() => {
        if (!appointment) return;

        const mappedCustomer: SelectedCustomer | null = appointment.customer
            ? {
                id: appointment.customerId,
                firstName: appointment.customer.firstName,
                lastName: appointment.customer.lastName,
                phone: appointment.customer.phone,
                email: appointment.customer.email,
                isNew: false,
            }
            : null;

        const mappedVehicle: SelectedVehicle | null = appointment.vehicle
            ? {
                id: appointment.vehicleId,
                brand: appointment.vehicle.brand,
                model: appointment.vehicle.model,
                isNew: false,
            }
            : null;

        const mappedServices: ServiceLineItem[] = (appointment.services || []).map((s: any) => ({
            id: s.id,
            serviceId: s.serviceId,
            serviceName: s.serviceName || s.name,
            basePriceNet: s.basePriceNet ?? s.priceNet ?? 0,
            vatRate: s.vatRate ?? 23,
            requireManualPrice: !!s.requireManualPrice,
            adjustment: s.adjustment || { type: 'PERCENT', value: 0 },
            note: s.note,
        }));

        setSelectedCustomer(mappedCustomer);
        setSelectedVehicle(mappedVehicle);
        setServiceItems(mappedServices);
        setIsAllDay(appointment.schedule?.isAllDay ?? false);
        setStartDateTime(appointment.schedule?.startDateTime ?? appointment.startDateTime ?? '');
        setEndDateTime(appointment.schedule?.endDateTime ?? appointment.endDateTime ?? '');
        setAppointmentTitle(appointment.appointmentTitle ?? '');
        setSelectedColorId(appointment.appointmentColor?.id ?? '');
    }, [appointment]);

    const updateMutation = useMutation({
        mutationFn: (payload: any) => appointmentApi.updateAppointment(appointmentId, payload),
        onSuccess: () => navigate('/appointments'),
    });

    const handleSubmit = () => {
        if (!selectedCustomer || !selectedColorId || serviceItems.length === 0 || !startDateTime || !endDateTime) {
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
                startDateTime,
                endDateTime,
            },
            appointmentTitle: appointmentTitle || undefined,
            appointmentColorId: selectedColorId,
        };

        updateMutation.mutate(data);
    };

    const canSubmit = !!(selectedCustomer && selectedColorId && serviceItems.length > 0 && startDateTime && endDateTime);

    return {
        isLoading: isLoadingAppointment || servicesLoading || colorsLoading,
        isError,
        selectedCustomer,
        setSelectedCustomer,
        selectedVehicle,
        setSelectedVehicle,
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
        customerVehicles: customerVehicles || [],
        availableServices: availableServices || [],
        appointmentColors: appointmentColors || [],
        handleSubmit,
        canSubmit,
        isSubmitting: updateMutation.isPending,
        submitError: updateMutation.isError,
    };
};
