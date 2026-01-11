import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { stateTransitionApi } from '../api/stateTransitionApi';
import { visitDetailQueryKey } from './index';
import type {
    TransitionType,
    QualityCheckItem,
    NotificationChannels,
    PaymentDetails,
} from '../types/stateTransitions';

interface WizardStep {
    step: number;
    totalSteps: number;
}

export const useStateTransitionWizard = (
    visitId: string,
    transitionType: TransitionType
) => {
    const queryClient = useQueryClient();
    const [isOpen, setIsOpen] = useState(false);
    const [currentStep, setCurrentStep] = useState(1);
    const [wizardData, setWizardData] = useState<{
        qualityChecks?: QualityCheckItem[];
        notifications?: NotificationChannels;
        payment?: PaymentDetails;
    }>({});

    const totalSteps = transitionType === 'in_progress_to_ready' ? 2 : 3;

    const { mutate: transitionToReady, isPending: isTransitioningToReady } = useMutation({
        mutationFn: () => stateTransitionApi.transitionToReady(visitId, {
            qualityApproved: true,
            qualityChecks: wizardData.qualityChecks || [],
            notifications: wizardData.notifications,
        }),
        onSuccess: () => {
            queryClient.invalidateQueries({
                queryKey: visitDetailQueryKey(visitId),
            });
            handleClose();
        },
    });

    const { mutate: transitionToCompleted, isPending: isTransitioningToCompleted } = useMutation({
        mutationFn: () => stateTransitionApi.transitionToCompleted(visitId, {
            signatureObtained: true,
            payment: wizardData.payment!,
        }),
        onSuccess: () => {
            queryClient.invalidateQueries({
                queryKey: visitDetailQueryKey(visitId),
            });
            handleClose();
        },
    });

    const { mutate: sendNotifications, isPending: isSendingNotifications } = useMutation({
        mutationFn: () => stateTransitionApi.sendNotifications({
            visitId,
            channels: wizardData.notifications!,
        }),
        onSuccess: () => {
            transitionToReady();
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
            if (wizardData.notifications?.sms || wizardData.notifications?.email) {
                sendNotifications();
            } else {
                transitionToReady();
            }
        } else {
            transitionToCompleted();
        }
    };

    return {
        isOpen,
        currentStep,
        totalSteps,
        wizardData,
        isProcessing: isTransitioningToReady || isTransitioningToCompleted || isSendingNotifications,
        handleOpen,
        handleClose,
        handleNext,
        handleBack,
        updateWizardData,
        handleFinish,
    };
};