// src/modules/appointments/hooks/useAppointmentForm.ts
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery } from '@tanstack/react-query';
import { appointmentSchema } from '../utils/appointmentSchema';
import { appointmentApi } from '../api/appointmentApi';
import type { AppointmentCreateRequest } from '../types';

export const useAppointmentForm = () => {
    const form = useForm<AppointmentCreateRequest>({
        resolver: zodResolver(appointmentSchema),
        defaultValues: {
            customer: {
                mode: 'EXISTING',
            },
            vehicle: {
                mode: 'EXISTING',
            },
            services: [],
            schedule: {
                isAllDay: false,
                startDateTime: '',
                endDateTime: '',
            },
            appointmentTitle: '',
            appointmentColorId: '',
        },
    });

    const createMutation = useMutation({
        mutationFn: appointmentApi.createAppointment,
        onSuccess: () => {
            form.reset();
        },
    });

    return {
        form,
        createMutation,
    };
};

export const useAppointmentServices = () => {
    return useQuery({
        queryKey: ['appointments', 'services'],
        queryFn: appointmentApi.getServices,
        staleTime: 300_000,
    });
};

export const useCustomerSearch = (query: string) => {
    return useQuery({
        queryKey: ['appointments', 'customers', 'search', query],
        queryFn: () => appointmentApi.searchCustomers(query),
        enabled: query.length >= 0,
        staleTime: 60_000,
    });
};

export const useCustomerVehicles = (customerId: string | undefined) => {
    return useQuery({
        queryKey: ['appointments', 'customers', customerId, 'vehicles'],
        queryFn: () => appointmentApi.getCustomerVehicles(customerId!),
        enabled: !!customerId,
        staleTime: 120_000,
    });
};

export const useAppointmentColors = () => {
    return useQuery({
        queryKey: ['appointments', 'colors'],
        queryFn: appointmentApi.getAppointmentColors,
        staleTime: 600_000,
    });
};