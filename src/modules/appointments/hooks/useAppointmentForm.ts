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
            service: {
                id: '',
                basePriceNet: 0,
                vatRate: 23,
                adjustment: {
                    type: 'PERCENT',
                    value: 0,
                },
            },
            schedule: {
                isAllDay: false,
                startDateTime: '',
                endDateTime: '',
            },
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

export const useServices = () => {
    return useQuery({
        queryKey: ['services'],
        queryFn: appointmentApi.getServices,
    });
};

export const useCustomerSearch = (query: string) => {
    return useQuery({
        queryKey: ['customers', 'search', query],
        queryFn: () => appointmentApi.searchCustomers(query),
        enabled: query.length >= 0,
    });
};

export const useCustomerVehicles = (customerId: string | undefined) => {
    return useQuery({
        queryKey: ['customers', customerId, 'vehicles'],
        queryFn: () => appointmentApi.getCustomerVehicles(customerId!),
        enabled: !!customerId,
    });
};

export const useAppointmentColors = () => {
    return useQuery({
        queryKey: ['appointment-colors'],
        queryFn: appointmentApi.getAppointmentColors,
    });
};