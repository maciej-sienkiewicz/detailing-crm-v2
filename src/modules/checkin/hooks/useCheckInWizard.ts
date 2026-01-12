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
        vehicleData: {
            id: '',
            brand: '',
            model: '',
            licensePlate: '',
            vin: '',
            ...initialData.vehicleData,
        },
        technicalState: {
            mileage: 0,
            fuelLevel: 50,
            deposit: {
                keys: false,
                registrationDocument: false,
                other: false,
            },
            inspectionNotes: '',
            isVeryDirty: false,
            ...initialData.technicalState,
        },
        photos: [],
        services: initialData.services || [],
    });

    const steps: Array<{ id: CheckInStep; label: string }> = [
        { id: 'verification', label: 'Weryfikacja' },
        { id: 'technical', label: 'Stan techniczny' },
        { id: 'photos', label: 'Dokumentacja' },
        { id: 'summary', label: 'Podsumowanie' },
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
        setFormData(prev => ({ ...prev, ...updates }));
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
        const payload: ReservationToVisitPayload = {
            reservationId,
            customer: {
                id: formData.customerData.id,
                firstName: formData.customerData.firstName,
                lastName: formData.customerData.lastName,
                phone: formData.customerData.phone,
                email: formData.customerData.email,
            },
            vehicle: {
                id: formData.vehicleData.id,
                vin: formData.vehicleData.vin,
            },
            technicalState: formData.technicalState,
            photoIds: formData.photos.map(p => p.fileId!),
            services: formData.services,
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