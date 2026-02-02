// src/modules/calendar/hooks/useQuickEventCreation.ts

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/core';
import type { QuickEventFormData } from '../components/QuickEventModal';
import { toInstant } from '@/common/dateTime';

export const useQuickEventCreation = () => {
    const queryClient = useQueryClient();

    const createQuickEvent = useMutation({
        mutationFn: async (data: QuickEventFormData) => {
            // Normalize end datetime text for all-day vs timed
            let endDateTimeText = data.endDateTime;
            if (data.isAllDay && !endDateTimeText.includes('T')) {
                endDateTimeText = `${endDateTimeText}T23:59:59`;
            } else if (!data.isAllDay && !endDateTimeText.includes('T')) {
                endDateTimeText = `${endDateTimeText}T23:59:59`;
            }

            // Convert local values to Instant (UTC ISO with 'Z')
            const startInstant = toInstant(
                data.isAllDay && !data.startDateTime.includes('T')
                    ? `${data.startDateTime}T00:00:00`
                    : data.startDateTime
            );
            const endInstant = toInstant(endDateTimeText);

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
                // Try to find existing service by ID
                let service = allServices.find((s: any) => s.id === serviceId);
                let isTempService = false;

                // If not found, try to use temp service provided by the form (allow creating visit without saving service in DB)
                if (!service) {
                    const temp = data.tempServices?.[serviceId];
                    if (temp) {
                        isTempService = true;
                        service = {
                            id: serviceId,
                            name: temp.name,
                            basePriceNet: temp.basePriceNet,
                            vatRate: temp.vatRate,
                            requireManualPrice: false,
                        } as any;
                    }
                }

                if (!service) {
                    // As a last resort, inform user clearly
                    throw new Error(`Nie znaleziono usługi (${serviceId}). Usuń ją z listy lub wprowadź ponownie.`);
                }

                // Calculate adjustment if custom price provided
                const customPriceGross = data.servicePrices?.[serviceId];
                let adjustment;

                if (customPriceGross !== undefined) {
                    // User entered a price (in PLN)
                    // Convert custom price from PLN to cents
                    const customPriceInCents = Math.round(customPriceGross * 100);

                    // Calculate base price gross from net price and VAT
                    const basePriceGross = Math.round(service.basePriceNet * (1 + service.vatRate / 100));

                    // Check if custom price differs from base price
                    if (customPriceInCents === basePriceGross) {
                        // Price unchanged - use FIXED_GROSS with 0 adjustment
                        adjustment = {
                            type: 'FIXED_GROSS' as const,
                            value: 0,
                        };
                    } else {
                        // Price was changed - use SET_GROSS
                        adjustment = {
                            type: 'SET_GROSS' as const,
                            value: customPriceInCents,
                        };
                    }
                } else {
                    adjustment = {
                        type: 'FIXED_GROSS' as const,
                        value: 0,
                    };
                }

                return {
                    id: `${Date.now()}-${index}`, // Generate unique line item ID
                    // IMPORTANT: when service is newly created locally (not saved to DB), send serviceId as null
                    serviceId: isTempService ? null : service.id,
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
                    startDateTime: startInstant,
                    endDateTime: endInstant,
                },
                appointmentTitle: data.title || undefined,
                note: data.notes || undefined,
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
        createQuickEventAsync: createQuickEvent.mutateAsync,
        isCreating: createQuickEvent.isPending,
        isError: createQuickEvent.isError,
        error: createQuickEvent.error,
    };
};
