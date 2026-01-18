import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { stateTransitionApi } from '../api/stateTransitionApi';
import { visitDetailQueryKey } from './index';
import type {
    TransitionType,
    QualityCheckItem,
    NotificationChannels,
    PaymentDetails,
    PaymentMethod,
    InvoiceType,
    TransitionToReadyPayload,
    TransitionToCompletedPayload,
    SendNotificationPayload,
    SendNotificationResponse,
} from '../types/stateTransitions';

export type {
    TransitionType,
    QualityCheckItem,
    NotificationChannels,
    PaymentDetails,
    PaymentMethod,
    InvoiceType,
    TransitionToReadyPayload,
    TransitionToCompletedPayload,
    SendNotificationPayload,
    SendNotificationResponse,
};

export interface WizardStep {
    step: number;
    totalSteps: number;
}

export const useStateTransitionWizard = (
    visitId: string,
    transitionType: TransitionType,
    onTransitionSuccess?: () => void
) => {
    const queryClient = useQueryClient();
    const [isOpen, setIsOpen] = useState(false);
    const [currentStep, setCurrentStep] = useState(1);
    const [wizardData, setWizardData] = useState<{
        notifications?: NotificationChannels;
        payment?: PaymentDetails;
    }>({});

    const [_qualityChecks, _setQualityChecks] = useState<QualityCheckItem[]>([
        { id: '1', label: 'Wszystkie usługi wykonane', checked: false },
        { id: '2', label: 'Pojazd czysty wewnątrz', checked: false },
        { id: '3', label: 'Pojazd czysty na zewnątrz', checked: false },
    ]);

    const totalSteps = transitionType === 'in_progress_to_ready' ? 2 : 3;

    const { mutate: markReadyForPickup, isPending: isMarkingReady } = useMutation({
        mutationFn: () => stateTransitionApi.markReadyForPickup(visitId, {
            sms: wizardData.notifications?.sms || false,
            email: wizardData.notifications?.email || false,
        }),
        onSuccess: () => {
            queryClient.invalidateQueries({
                queryKey: visitDetailQueryKey(visitId),
            });
            handleClose();
            onTransitionSuccess?.();
        },
    });

    const { mutate: complete, isPending: isCompleting } = useMutation({
        mutationFn: () => stateTransitionApi.complete(visitId, {
            signatureObtained: true,
            payment: wizardData.payment!,
        }),
        onSuccess: () => {
            queryClient.invalidateQueries({
                queryKey: visitDetailQueryKey(visitId),
            });
            handleClose();
            onTransitionSuccess?.();
        },
    });


    const handleOpen = () => {
        setIsOpen(true);
        setCurrentStep(1);
        setWizardData({});
    };

    const handleClose = () => {
        setIsOpen(false);
        setCurrentStep(1);
        setWizardData({});
    };

    const handleNext = () => {
        if (currentStep < totalSteps) {
            setCurrentStep(prev => prev + 1);
        }
    };

    const handleBack = () => {
        if (currentStep > 1) {
            setCurrentStep(prev => prev - 1);
        }
    };

    const updateWizardData = (data: Partial<typeof wizardData>) => {
        setWizardData(prev => ({ ...prev, ...data }));
    };

    const handleFinish = () => {
        if (transitionType === 'in_progress_to_ready') {
            markReadyForPickup();
        } else {
            complete();
        }
    };

    return {
        isOpen,
        currentStep,
        totalSteps,
        wizardData,
        isProcessing: isMarkingReady || isCompleting,
        handleOpen,
        handleClose,
        handleNext,
        handleBack,
        updateWizardData,
        handleFinish,
    };
};
