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
    CompleteInvoicePayload,
    TransitionToReadyPayload,
    TransitionToCompletedPayload,
    SendNotificationPayload,
    SendNotificationResponse,
} from '../types/stateTransitions';
import {useToast} from "@/common/components/Toast";

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
        invoice?: CompleteInvoicePayload;
    }>({});

    const [_qualityChecks, _setQualityChecks] = useState<QualityCheckItem[]>([
        { id: '1', label: 'Wszystkie usługi wykonane', checked: true },
        { id: '2', label: 'Pojazd czysty wewnątrz', checked: true },
        { id: '3', label: 'Pojazd czysty na zewnątrz', checked: true },
    ]);

    const totalSteps = transitionType === 'in_progress_to_ready' ? 2 : 3;

    const { showError, showSuccess } = useToast();

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
        onError: (error: any) => {
            if (error?.response?.status === 402) {
                showError(
                    'Brak kredytów SMS',
                    error.response.data?.message ?? 'Doładuj konto w panelu zarządzania.'
                );
            } else {
                showError('Błąd', 'Nie udało się zmienić statusu wizyty.');
            }
        },
    });

    const { mutate: complete, isPending: isCompleting } = useMutation({
        mutationFn: () => stateTransitionApi.complete(visitId, {
            signatureObtained: true,
            payment: wizardData.payment ?? { method: 'OTHER' as PaymentMethod, invoiceType: 'other' as InvoiceType, amount: 0 },
            // Konfiguracja faktury KSeF — tylko gdy wybrano dokument typu Faktura VAT
            invoice: wizardData.payment?.invoiceType === 'INVOICE' ? wizardData.invoice : undefined,
        }),
        onSuccess: (result) => {
            queryClient.invalidateQueries({
                queryKey: visitDetailQueryKey(visitId),
            });
            if (result.ksefInvoiceNumber) {
                const suffix = result.remainderDocumentNumber
                    ? ` Reszta kwoty udokumentowana paragonem ${result.remainderDocumentNumber}.`
                    : '';
                if (result.ksefStatus === 'ACCEPTED') {
                    showSuccess('Faktura w KSeF', `Faktura ${result.ksefInvoiceNumber} została przyjęta przez KSeF.${suffix}`);
                } else if (result.ksefStatus === 'QUEUED_RETRY') {
                    showSuccess(
                        'Faktura wystawiona (offline24)',
                        `KSeF jest chwilowo niedostępny — faktura ${result.ksefInvoiceNumber} zostanie dosłana automatycznie.${suffix}`
                    );
                } else {
                    showSuccess('Faktura wystawiona', `Faktura ${result.ksefInvoiceNumber} została wysłana do KSeF.${suffix}`);
                }
            }
            handleClose();
            onTransitionSuccess?.();
        },
        onError: (error: any) => {
            showError(
                'Nie udało się zakończyć wizyty',
                error?.response?.data?.message ?? 'Spróbuj ponownie.'
            );
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
