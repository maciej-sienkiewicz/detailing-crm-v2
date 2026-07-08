import React, { useEffect } from 'react';
import { WizardLayout } from './WizardLayout';
import { QualityCheckStep } from './QualityCheckStep';
import { NotificationStep } from './NotificationStep';
import { ClientBriefingStep } from './ClientBriefingStep';
import { SignatureStep } from './SignatureStep';
import { PaymentStep } from './PaymentStep';
import { useStateTransitionWizard } from '../../hooks/useStateTransition';
import { useVisitComments } from '../../hooks';
import { useServicePricing } from '@/modules/appointments/hooks/useServicePricing';
import type { Visit } from '../../types';

interface InProgressToReadyWizardProps {
    visit: Visit;
    isOpen: boolean;
    onClose: () => void;
    /** Called only after a successful API transition, not on manual close */
    onTransitionSuccess?: () => void;
}

export const InProgressToReadyWizard = ({
                                            visit,
                                            isOpen,
                                            onClose,
                                            onTransitionSuccess,
                                        }: InProgressToReadyWizardProps) => {
    const {
        currentStep,
        totalSteps,
        isProcessing,
        handleClose,
        handleNext,
        handleBack,
        updateWizardData,
        handleFinish,
    } = useStateTransitionWizard(visit.id, 'in_progress_to_ready', onTransitionSuccess);

    const [notificationChannels, setNotificationChannels] = React.useState({ sms: true, email: !!visit.customer.email });
    const [qualityAllChecked, setQualityAllChecked] = React.useState(true);

    const handleQualityReject = () => { handleClose(); onClose(); };
    const handleNotificationSkip = () => {
        updateWizardData({ notifications: { sms: false, email: false } });
        handleFinish();
    };
    const handleNotificationSend = () => {
        updateWizardData({ notifications: notificationChannels });
        handleFinish();
    };

    const stepFooterProps = currentStep === 1 ? {
        onBack:      handleQualityReject,
        backLabel:   'Wymaga poprawek',
        onNext:      handleNext,
        nextLabel:   'Zatwierdź jakość',
        onFinish:    undefined,
        onSkip:      undefined,
        disableNext: !qualityAllChecked,
    } : {
        onBack:      handleBack,
        backLabel:   'Wstecz',
        onNext:      undefined,
        nextLabel:   undefined,
        onFinish:    handleNotificationSend,
        finishLabel: 'Wyślij i kontynuuj',
        onSkip:      handleNotificationSkip,
        skipLabel:   'Pomiń',
        disableNext: !(notificationChannels.sms || notificationChannels.email),
    };

    const getStepContent = () => {
        switch (currentStep) {
            case 1:
                return <QualityCheckStep onAllCheckedChange={setQualityAllChecked} />;
            case 2:
                return <NotificationStep customer={visit.customer} onChannelsChange={setNotificationChannels} />;
            default:
                return null;
        }
    };

    return (
        <WizardLayout
            isOpen={isOpen}
            onClose={() => { handleClose(); onClose(); }}
            title={currentStep === 1 ? 'Weryfikacja jakości' : 'Powiadomienie klienta'}
            subtitle={currentStep === 2 ? 'Poinformuj klienta o gotowości pojazdu' : undefined}
            icon={
                currentStep === 1 ? (
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M9 11l3 3L22 4"/>
                        <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>
                    </svg>
                ) : (
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
                        <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
                    </svg>
                )
            }
            currentStep={currentStep}
            totalSteps={totalSteps}
            isProcessing={isProcessing}
            {...stepFooterProps}
        >
            {getStepContent()}
        </WizardLayout>
    );
};

interface ReadyToCompletedWizardProps {
    visit: Visit;
    isOpen: boolean;
    onClose: () => void;
}

export const ReadyToCompletedWizard = ({
                                           visit,
                                           isOpen,
                                           onClose,
                                       }: ReadyToCompletedWizardProps) => {
    const {
        currentStep,
        totalSteps,
        wizardData,
        isProcessing,
        handleClose,
        handleNext,
        handleBack,
        updateWizardData,
        handleFinish,
    } = useStateTransitionWizard(visit.id, 'ready_to_completed', onClose);

    const { comments } = useVisitComments(visit.id);
    const customerComments = comments.filter(c => c.type === 'FOR_CUSTOMER' && !c.isDeleted);
    const skipBriefing = customerComments.length === 0;

    // Skip step 1 (ClientBriefingStep) when there are no FOR_CUSTOMER comments
    useEffect(() => {
        if (isOpen && currentStep === 1 && skipBriefing) {
            handleNext();
        }
    }, [isOpen, skipBriefing, currentStep]);

    // Adjust progress display: when step 1 is skipped, show 2 steps instead of 3
    const displayStep = skipBriefing ? currentStep - 1 : currentStep;
    const displayTotalSteps = skipBriefing ? totalSteps - 1 : totalSteps;

    const { calculateServicePrice } = useServicePricing();

    const calculatedTotals = (() => {
        let totalFinalNet = 0;
        let totalFinalGross = 0;
        visit.services.forEach(service => {
            const isPending = (service.hasPendingChange ?? (service.status === 'PENDING'));
            const isEditPending = isPending && service.pendingOperation === 'EDIT' && (service.previousPriceNet ?? null) !== null && (service.previousPriceGross ?? null) !== null;
            if (isEditPending) {
                totalFinalNet += service.previousPriceNet as number;
                totalFinalGross += service.previousPriceGross as number;
            } else {
                const pricing = calculateServicePrice(service);
                totalFinalNet += pricing.finalPriceNet;
                totalFinalGross += pricing.finalPriceGross;
            }
        });
        return { netAmount: totalFinalNet, grossAmount: totalFinalGross };
    })();

    const handlePaymentComplete = (payment: any) => {
        // Only update wizard data with payment details
        // Don't call handleFinish here - it will be called when user clicks the final button
        updateWizardData({ payment });
    };

    const getStepTitle = () => {
        switch (currentStep) {
            case 1:
                return 'Odprawa klienta';
            case 2:
                return 'Podpis protokołu';
            case 3:
                return 'Finalizacja płatności';
            default:
                return '';
        }
    };

    const getStepSubtitle = () => {
        switch (currentStep) {
            case 1:
                return 'Zapoznaj się z notatkami dla klienta';
            case 2:
                return 'Potwierdź odbiór pojazdu';
            case 3:
                return 'Zarejestruj płatność i wydaj pojazd';
            default:
                return '';
        }
    };

    const getStepIcon = () => {
        switch (currentStep) {
            case 1:
                return (
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M9 11l3 3L22 4"/>
                        <path d="M21 12v7a2 2 0 0 1-2  2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>
                    </svg>
                );
            case 2:
                return (
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M3 15v4c0 1.1.9 2 2 2h14a2 2 0 0 0 2-2v-4M17 8l-5-5-5 5M12 3v12"/>
                    </svg>
                );
            case 3:
                return (
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <circle cx="12" cy="12" r="10"/>
                        <path d="M16 8h-6a2 2 0 1 0 0 4h4a2 2 0 1 1 0 4H8"/>
                        <path d="M12 18V6"/>
                    </svg>
                );
            default:
                return null;
        }
    };

    const getStepContent = () => {
        switch (currentStep) {
            case 1:
                return (
                    <ClientBriefingStep
                        comments={comments.filter(c => c.type === 'FOR_CUSTOMER' && !c.isDeleted)}
                        onContinue={handleNext}
                    />
                );
            case 2:
                return <SignatureStep onConfirm={handleNext} />;
            case 3:
                return (
                    <PaymentStep
                        netAmount={calculatedTotals.netAmount}
                        grossAmount={calculatedTotals.grossAmount}
                        currency={visit.totalCost?.currency ?? 'PLN'}
                        onComplete={handlePaymentComplete}
                    />
                );
            default:
                return null;
        }
    };

    return (
        <WizardLayout
            isOpen={isOpen}
            onClose={() => {
                handleClose();
                onClose();
            }}
            title={getStepTitle()}
            subtitle={getStepSubtitle()}
            icon={getStepIcon()}
            currentStep={displayStep}
            totalSteps={displayTotalSteps}
            onBack={currentStep > (skipBriefing ? 2 : 1) ? handleBack : undefined}
            onNext={currentStep < totalSteps ? handleNext : undefined}
            onFinish={currentStep === totalSteps ? handleFinish : undefined}
            nextLabel={currentStep === 2 ? 'Podpisano' : 'Kontynuuj'}
            finishLabel="Zatwierdź i wydaj pojazd"
            isProcessing={isProcessing}
            disableNext={false}
        >
            {getStepContent()}
        </WizardLayout>
    );
};
