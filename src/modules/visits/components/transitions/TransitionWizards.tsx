import { WizardLayout } from './WizardLayout';
import { QualityCheckStep } from './QualityCheckStep';
import { NotificationStep } from './NotificationStep';
import { ClientBriefingStep } from './ClientBriefingStep';
import { SignatureStep } from './SignatureStep';
import { PaymentStep } from './PaymentStep';
import { useStateTransitionWizard } from '../../hooks/useStateTransition';
import { useVisitComments } from '../../hooks';
import type { Visit } from '../../types';

interface InProgressToReadyWizardProps {
    visit: Visit;
    isOpen: boolean;
    onClose: () => void;
}

export const InProgressToReadyWizard = ({
                                            visit,
                                            isOpen,
                                            onClose,
                                        }: InProgressToReadyWizardProps) => {
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
    } = useStateTransitionWizard(visit.id, 'in_progress_to_ready');

    const handleQualityApprove = () => {
        handleNext();
    };

    const handleQualityReject = () => {
        handleClose();
        onClose();
    };

    const handleNotificationSkip = () => {
        updateWizardData({ notifications: { sms: false, email: false } });
        handleFinish();
    };

    const handleNotificationSend = (channels: any) => {
        updateWizardData({ notifications: channels });
        handleFinish();
    };

    const getStepContent = () => {
        switch (currentStep) {
            case 1:
                return (
                    <QualityCheckStep
                        onApprove={handleQualityApprove}
                        onReject={handleQualityReject}
                    />
                );
            case 2:
                return (
                    <NotificationStep
                        customer={visit.customer}
                        onSkip={handleNotificationSkip}
                        onSend={handleNotificationSend}
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
            title={currentStep === 1 ? 'Weryfikacja jakości' : 'Powiadomienie klienta'}
            subtitle={
                currentStep === 1
                    ? 'Sprawdź wykonane usługi przed przekazaniem do odbioru'
                    : 'Poinformuj klienta o gotowości pojazdu'
            }
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
            onBack={currentStep > 1 ? handleBack : undefined}
            isProcessing={isProcessing}
            disableNext={false}
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
    } = useStateTransitionWizard(visit.id, 'ready_to_completed');

    const { comments } = useVisitComments(visit.id);

    const handlePaymentComplete = (payment: any) => {
        updateWizardData({ payment });
        handleFinish();
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
                        <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>
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
                        totalAmount={visit.totalCost.grossAmount}
                        currency={visit.totalCost.currency}
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
            currentStep={currentStep}
            totalSteps={totalSteps}
            onBack={currentStep > 1 ? handleBack : undefined}
            onNext={currentStep < totalSteps ? handleNext : undefined}
            onFinish={currentStep === totalSteps ? () => handlePaymentComplete(wizardData.payment!) : undefined}
            nextLabel={currentStep === 2 ? 'Podpisano' : 'Kontynuuj'}
            finishLabel="Zatwierdź i wydaj pojazd"
            isProcessing={isProcessing}
            disableNext={false}
        >
            {getStepContent()}
        </WizardLayout>
    );
};