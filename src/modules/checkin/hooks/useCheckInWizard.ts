import { useState, useEffect } from 'react';
import { useMutation } from '@tanstack/react-query';
import { checkinApi } from '../api/checkinApi';
import type { CheckInFormData, CheckInStep, ReservationToVisitPayload } from '../types';

const DRAFT_STORAGE_KEY = 'checkin_draft';

export const useCheckInWizard = (reservationId: string, initialData: Partial<CheckInFormData>) => {
    const [currentStep, setCurrentStep] = useState<CheckInStep>('verification');
    const [completedSteps, setCompletedSteps] = useState<CheckInStep[]>([]);
    const [formData, setFormData] = useState<CheckInFormData>({
        customerData: {
            id: '',
            firstName: '',
            lastName: '',
            phone: '',
            email: '',
            ...initialData.customerData,
        },
        hasFullCustomerData: initialData.hasFullCustomerData ?? true,
        isNewCustomer: initialData.isNewCustomer ?? false,
        vehicleData: initialData.vehicleData || null,
        isNewVehicle: initialData.isNewVehicle ?? false,
        vehicleHandoff: initialData.vehicleHandoff || {
            isHandedOffByOtherPerson: false,
            contactPerson: {
                firstName: '',
                lastName: '',
                phone: '',
                email: '',
            },
        },
        homeAddress: initialData.homeAddress || null,
        company: initialData.company || null,
        technicalState: {
            mileage: 0,
            deposit: {
                keys: true,
                registrationDocument: false,
                other: false,
            },
            inspectionNotes: '',
            ...initialData.technicalState,
        },
        visitStartAt: initialData.visitStartAt,
        visitEndAt: initialData.visitEndAt,
        photos: [],
        damagePoints: initialData.damagePoints || [],
        services: initialData.services || [],
        appointmentColorId: initialData.appointmentColorId || '',
    });

    const steps: Array<{ id: CheckInStep; label: string }> = [
        { id: 'verification', label: 'Weryfikacja i stan pojazdu' },
        { id: 'photos', label: 'Dokumentacja fotograficzna' },
    ];

    useEffect(() => {
        const savedDraft = localStorage.getItem(`${DRAFT_STORAGE_KEY}_${reservationId}`);
        if (savedDraft) {
            try {
                const draft = JSON.parse(savedDraft);
                setFormData(draft.formData);
                setCurrentStep(draft.currentStep);
                setCompletedSteps(draft.completedSteps);
            } catch (error) {
                console.error('Failed to load draft:', error);
            }
        }
    }, [reservationId]);

    const saveDraft = () => {
        const draft = {
            formData,
            currentStep,
            completedSteps,
            savedAt: new Date().toISOString(),
        };
        localStorage.setItem(`${DRAFT_STORAGE_KEY}_${reservationId}`, JSON.stringify(draft));
    };

    const clearDraft = () => {
        localStorage.removeItem(`${DRAFT_STORAGE_KEY}_${reservationId}`);
    };

    const createVisitMutation = useMutation({
        mutationFn: (payload: ReservationToVisitPayload) =>
            checkinApi.createVisitFromReservation(payload),
        onSuccess: () => {
            clearDraft();
        },
    });

    const updateFormData = (updates: Partial<CheckInFormData>) => {
        console.log('[DEBUG useCheckInWizard] updateFormData called with:', updates);
        console.log('[DEBUG useCheckInWizard] Previous formData:', formData);
        setFormData(prev => {
            const newData = { ...prev, ...updates };
            console.log('[DEBUG useCheckInWizard] New formData after merge:', newData);
            return newData;
        });
    };

    const nextStep = () => {
        const currentIndex = steps.findIndex(s => s.id === currentStep);
        if (currentIndex < steps.length - 1) {
            if (!completedSteps.includes(currentStep)) {
                setCompletedSteps(prev => [...prev, currentStep]);
            }
            setCurrentStep(steps[currentIndex + 1].id);
        }
    };

    const previousStep = () => {
        const currentIndex = steps.findIndex(s => s.id === currentStep);
        if (currentIndex > 0) {
            setCurrentStep(steps[currentIndex - 1].id);
        }
    };

    const goToStep = (stepId: CheckInStep) => {
        setCurrentStep(stepId);
    };

    const submitCheckIn = async () => {
        // Walidacja - musi być pojazd
        if (!formData.vehicleData) {
            throw new Error('Pojazd jest wymagany do utworzenia wizyty');
        }

        // Konwersja lokalnych wartości wejściowych na Instant dla backendu
        let startInstant: string | undefined;
        let endInstant: string | undefined;
        try {
            if (formData.visitStartAt) {
                const { toInstant } = await import('@/common/dateTime');
                startInstant = toInstant(formData.visitStartAt);
            }
            if (formData.visitEndAt) {
                const { toInstant } = await import('@/common/dateTime');
                endInstant = toInstant(formData.visitEndAt);
            }
        } catch (e) {
            console.error('Błąd konwersji daty do Instant:', e);
        }

        // Build unified Customer/Vehicle Identity (EXISTING/NEW/UPDATE)
        const customerIdentity = (() => {
            const hasId = !!formData.customerData.id;
            if (formData.isNewCustomer || !hasId) {
                return {
                    mode: 'NEW' as const,
                    newData: {
                        firstName: formData.customerData.firstName,
                        lastName: formData.customerData.lastName,
                        phone: formData.customerData.phone,
                        email: formData.customerData.email,
                        homeAddress: formData.homeAddress || undefined,
                        company: formData.company || undefined,
                    },
                };
            }
            // Existing customer – send UPDATE so server can recognize changes
            return {
                mode: 'UPDATE' as const,
                id: formData.customerData.id,
                updateData: {
                    firstName: formData.customerData.firstName,
                    lastName: formData.customerData.lastName,
                    phone: formData.customerData.phone,
                    email: formData.customerData.email,
                    homeAddress: formData.homeAddress || undefined,
                    company: formData.company || undefined,
                },
            };
        })();

        const vehicleIdentity = (() => {
            const hasId = !!formData.vehicleData?.id;
            if (formData.isNewVehicle || !hasId) {
                return {
                    mode: 'NEW' as const,
                    newData: {
                        brand: formData.vehicleData!.brand,
                        model: formData.vehicleData!.model,
                        yearOfProduction: formData.vehicleData!.yearOfProduction,
                        licensePlate: formData.vehicleData!.licensePlate || undefined,
                        vin: formData.vehicleData!.vin,
                        color: formData.vehicleData!.color,
                        paintType: formData.vehicleData!.paintType,
                    },
                };
            }
            return {
                mode: 'UPDATE' as const,
                id: formData.vehicleData!.id,
                updateData: {
                    brand: formData.vehicleData!.brand,
                    model: formData.vehicleData!.model,
                    yearOfProduction: formData.vehicleData!.yearOfProduction,
                    licensePlate: formData.vehicleData!.licensePlate || undefined,
                    vin: formData.vehicleData!.vin,
                    color: formData.vehicleData!.color,
                    paintType: formData.vehicleData!.paintType,
                },
            };
        })();

        // Transform services: convert temporary serviceIds to null
        const transformedServices = formData.services.map(service => {
            // If serviceId is null, starts with "temp_", or is "null" string, convert to null
            const isTemporary = !service.serviceId ||
                                service.serviceId.startsWith('temp_') ||
                                service.serviceId === 'null';
            return {
                ...service,
                serviceId: isTemporary ? null : service.serviceId,
            };
        });

        const payload: ReservationToVisitPayload = {
            reservationId,
            startDateTime: startInstant,
            endDateTime: endInstant,
            customer: customerIdentity,
            vehicle: vehicleIdentity,
            vehicleHandoff: formData.vehicleHandoff.isHandedOffByOtherPerson ? {
                contactPerson: {
                    firstName: formData.vehicleHandoff.contactPerson.firstName,
                    lastName: formData.vehicleHandoff.contactPerson.lastName,
                    phone: formData.vehicleHandoff.contactPerson.phone,
                    email: formData.vehicleHandoff.contactPerson.email,
                },
            } : undefined,
            technicalState: formData.technicalState,
            photoIds: formData.photos.map(p => p.fileId!).filter(Boolean),
            damagePoints: formData.damagePoints || [],
            services: transformedServices,
            appointmentColorId: formData.appointmentColorId,
        };

        return createVisitMutation.mutateAsync(payload);
    };

    return {
        currentStep,
        completedSteps,
        formData,
        steps,
        updateFormData,
        nextStep,
        previousStep,
        goToStep,
        submitCheckIn,
        saveDraft,
        isSubmitting: createVisitMutation.isPending,
        submitError: createVisitMutation.error,
    };
};