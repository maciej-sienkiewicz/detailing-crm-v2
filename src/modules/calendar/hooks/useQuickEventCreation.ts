// src/modules/calendar/hooks/useQuickEventCreation.ts

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/core';
import type { QuickEventFormData } from '../components/QuickEventModal';

export const useQuickEventCreation = () => {
    const queryClient = useQueryClient();

    const createQuickEvent = useMutation({
        mutationFn: async (data: QuickEventFormData) => {
            // Format end datetime
            let endDateTime = data.endDateTime;
            if (data.isAllDay && !endDateTime.includes('T')) {
                endDateTime = `${endDateTime}T23:59:59`;
            } else if (!data.isAllDay && !endDateTime.includes('T')) {
                endDateTime = `${endDateTime}T23:59:59`;
            }

            // Build customer payload
            if (!data.customer) {
                throw new Error('Klient jest wymagany');
            }

            let customerPayload;
            if (data.customer.isNew) {
                // New customer
                customerPayload = {
                    mode: 'NEW' as const,
                    newData: {
                        firstName: data.customer.firstName || '',
                        lastName: data.customer.lastName || '',
                        phone: data.customer.phone || '',
                        email: data.customer.email || '',
                    },
                };
            } else {
                // Existing customer
                if (!data.customer.id) {
                    throw new Error('ID klienta jest wymagane dla istniejącego klienta');
                }
                customerPayload = {
                    mode: 'EXISTING' as const,
                    id: data.customer.id,
                };
            }

            // Build vehicle payload
            let vehiclePayload;
            if (data.vehicle) {
                if (data.vehicle.isNew) {
                    vehiclePayload = {
                        mode: 'NEW' as const,
                        newData: {
                            brand: data.vehicle.brand,
                            model: data.vehicle.model,
                        },
                    };
                } else if (data.vehicle.id) {
                    vehiclePayload = {
                        mode: 'EXISTING' as const,
                        id: data.vehicle.id,
                    };
                } else {
                    vehiclePayload = {
                        mode: 'NONE' as const,
                    };
                }
            } else {
                vehiclePayload = {
                    mode: 'NONE' as const,
                };
            }

            // Fetch service details to build proper ServiceLineItem objects
            const servicesResponse = await apiClient.get('/v1/services');
            const allServices = servicesResponse.data.services || [];

            // Build services payload with all required fields
            const servicesPayload = data.serviceIds.map((serviceId, index) => {
                const service = allServices.find((s: any) => s.id === serviceId);
                if (!service) {
                    throw new Error(`Service with id ${serviceId} not found`);
                }

                // Calculate adjustment if custom price provided
                const customPriceGross = data.servicePrices?.[serviceId];
                let adjustment;

                if (customPriceGross !== undefined) {
                    // User entered a new gross price (in PLN)
                    // Convert custom price from PLN to cents
                    const customPriceInCents = Math.round(customPriceGross * 100);

                    adjustment = {
                        type: 'SET_GROSS' as const,
                        value: customPriceInCents,
                    };
                } else {
                    adjustment = {
                        type: 'FIXED_GROSS' as const,
                        value: 0,
                    };
                }

                return {
                    id: `${Date.now()}-${index}`, // Generate unique line item ID
                    serviceId: serviceId,
                    serviceName: service.name,
                    basePriceNet: service.basePriceNet, // Keep original base price
                    vatRate: service.vatRate,
                    adjustment: adjustment,
                    note: data.serviceNotes?.[serviceId] || '',
                };
            });

            const payload = {
                customer: customerPayload,
                vehicle: vehiclePayload,
                services: servicesPayload,
                schedule: {
                    isAllDay: data.isAllDay,
                    startDateTime: data.isAllDay ? data.startDateTime : data.startDateTime,
                    endDateTime,
                },
                appointmentTitle: data.title || undefined,
                appointmentColorId: data.colorId,
            };

            const response = await apiClient.post('/v1/appointments', payload);
            return response.data;
        },
        onSuccess: () => {
            // Invalidate calendar events to refetch
            queryClient.invalidateQueries({ queryKey: ['calendar-events'] });
        },
    });

    return {
        createQuickEvent: createQuickEvent.mutate,
        isCreating: createQuickEvent.isPending,
        isError: createQuickEvent.isError,
        error: createQuickEvent.error,
    };
};
