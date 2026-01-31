// src/modules/checkin/views/CheckInWizardViewV2.tsx

import { useState } from 'react';
import styled from 'styled-components';
import { Stepper } from '@/common/components/Stepper/Stepper';
import { Button, ButtonGroup } from '@/common/components/Button';
import { Card } from '@/common/components/Card';
import { t } from '@/common/i18n';
import { useToast } from '@/common/components/Toast';
import { useCheckInWizard } from '../hooks/useCheckInWizard';
import { useCheckInValidation } from '../hooks/useCheckInValidation';
import { VerificationStep } from '../components/VerificationStep';
import { PhotoDocumentationStep } from '../components/PhotoDocumentationStep';
import { SigningRequirementModal } from '../components/SigningRequirementModal';
import type { CheckInFormData } from '../types';
import type { AppointmentColor } from '@/modules/appointments/types';

const Container = styled.div`
    min-height: 100vh;
    background-color: ${props => props.theme.colors.background};
    padding: ${props => props.theme.spacing.lg};

    @media (min-width: ${props => props.theme.breakpoints.md}) {
        padding: ${props => props.theme.spacing.xl};
    }

    @media (min-width: ${props => props.theme.breakpoints.lg}) {
        padding: ${props => props.theme.spacing.xxl};
    }
`;

const ContentWrapper = styled.div`
    max-width: 1400px;
    margin: 0 auto;
`;

const Header = styled.div`
    margin-bottom: ${props => props.theme.spacing.xl};
`;

const Title = styled.h1`
    font-size: ${props => props.theme.fontSizes.xxl};
    font-weight: ${props => props.theme.fontWeights.bold};
    color: ${props => props.theme.colors.text};
    margin: 0 0 ${props => props.theme.spacing.xs} 0;

    @media (min-width: ${props => props.theme.breakpoints.md}) {
        font-size: ${props => props.theme.fontSizes.xxxl};
    }
`;

const Subtitle = styled.p`
    font-size: ${props => props.theme.fontSizes.md};
    color: ${props => props.theme.colors.textSecondary};
    margin: 0;

    @media (min-width: ${props => props.theme.breakpoints.md}) {
        font-size: ${props => props.theme.fontSizes.lg};
    }
`;

const StepContent = styled.div`
    margin-bottom: ${props => props.theme.spacing.xl};
`;

const ActionsCard = styled(Card)`
    margin-top: ${props => props.theme.spacing.xl};
    background-color: ${props => props.theme.colors.surface};
    box-shadow: ${props => props.theme.shadows.lg};
    border-top: 3px solid ${props => props.theme.colors.primary};
`;

const ActionsContent = styled.div`
    display: flex;
    flex-direction: column;
    gap: ${props => props.theme.spacing.md};

    @media (min-width: ${props => props.theme.breakpoints.md}) {
        flex-direction: row;
        justify-content: space-between;
        align-items: center;
    }
`;

const NavigationButtons = styled(ButtonGroup)`
    @media (max-width: ${props => props.theme.breakpoints.sm}) {
        flex-direction: column;
    }
`;

const DraftButton = styled(Button)`
    @media (max-width: ${props => props.theme.breakpoints.md}) {
        width: 100%;
    }
`;

interface CheckInWizardViewProps {
    reservationId: string;
    initialData: Partial<CheckInFormData>;
    colors: AppointmentColor[];
    onComplete: (visitId: string) => void;
}

export const CheckInWizardView = ({ reservationId, initialData, colors, onComplete }: CheckInWizardViewProps) => {
    const {
        currentStep,
        completedSteps,
        formData,
        steps,
        updateFormData,
        nextStep,
        previousStep,
        submitCheckIn,
        saveDraft,
        isSubmitting,
        submitError,
    } = useCheckInWizard(reservationId, initialData);

    const { errors, isStepValid } = useCheckInValidation(formData, currentStep);
    const { showSuccess } = useToast();

    // State for Signing Requirement Modal
    const [signingModalState, setSigningModalState] = useState<{
        isOpen: boolean;
        visitId: string | null;
        visitNumber: string | null;
    }>({
        isOpen: false,
        visitId: null,
        visitNumber: null,
    });

    const handleNext = () => {
        if (isStepValid) {
            nextStep();
        }
    };

    const handleSubmit = async () => {
        if (!isStepValid) return;

        try {
            // Step 1: Create the visit
            const result = await submitCheckIn();

            // Step 2: Open the Signing Requirement Modal
            setSigningModalState({
                isOpen: true,
                visitId: result.visitId,
                visitNumber: `VIS-${result.visitId.slice(0, 8)}`,
            });
        } catch (error) {
            console.error('Check-in failed:', error);
        }
    };

    const handleSigningModalConfirm = () => {
        // Close modal and complete the check-in flow
        if (signingModalState.visitId) {
            const visitNumber = signingModalState.visitNumber || signingModalState.visitId.slice(0, 8);

            // Show success toast
            showSuccess(
                `Wizyta ${visitNumber} rozpoczęta pomyślnie!`,
                'Możesz teraz przejść do obsługi klienta.'
            );

            setSigningModalState({
                isOpen: false,
                visitId: null,
                visitNumber: null,
            });
            onComplete(signingModalState.visitId);
        }
    };

    const handleSigningModalClose = () => {
        // Allow closing without completing (user can handle documents later)
        setSigningModalState({
            isOpen: false,
            visitId: null,
            visitNumber: null,
        });
    };

    const handleServicesChange = (services: CheckInFormData['services']) => {
        updateFormData({ services });
    };

    const renderStepContent = () => {
        switch (currentStep) {
            case 'verification':
                return (
                    <VerificationStep
                        formData={formData}
                        errors={errors}
                        onChange={updateFormData}
                        onServicesChange={handleServicesChange}
                        colors={colors}
                        initialCustomerData={initialData.customerData}
                        initialHasFullCustomerData={initialData.hasFullCustomerData}
                        initialIsNewCustomer={initialData.isNewCustomer}
                        initialVehicleData={initialData.vehicleData === undefined ? undefined : (initialData.vehicleData ?? null)}
                        initialIsNewVehicle={initialData.isNewVehicle}
                    />
                );
            case 'photos':
                return (
                    <PhotoDocumentationStep
                        formData={formData}
                        reservationId={reservationId}
                        onChange={updateFormData}
                    />
                );
            default:
                return null;
        }
    };

    const isFirstStep = currentStep === 'verification';
    const isLastStep = currentStep === 'photos';
    const canProceed = isStepValid;

    return (
        <>
            <Container>
                <ContentWrapper>
                    <Header>
                        <Title>{t.checkin.title}</Title>
                    </Header>

                    <Stepper
                        steps={steps}
                        currentStepId={currentStep}
                        completedSteps={completedSteps}
                    />

                    <StepContent>{renderStepContent()}</StepContent>

                    <ActionsCard>
                        <ActionsContent>
                            <DraftButton
                                $variant="secondary"
                                onClick={saveDraft}
                            >
                                {t.checkin.actions.saveAsDraft}
                            </DraftButton>

                            <NavigationButtons>
                                {!isFirstStep && (
                                    <Button
                                        $variant="secondary"
                                        onClick={previousStep}
                                        disabled={isSubmitting}
                                    >
                                        {t.checkin.actions.previousStep}
                                    </Button>
                                )}

                                {!isLastStep ? (
                                    <Button
                                        $variant="primary"
                                        onClick={handleNext}
                                        disabled={!canProceed}
                                    >
                                        {t.checkin.actions.nextStep}
                                    </Button>
                                ) : (
                                    <Button
                                        $variant="primary"
                                        onClick={handleSubmit}
                                        disabled={!canProceed || isSubmitting}
                                    >
                                        {isSubmitting
                                            ? t.checkin.summary.creating
                                            : t.checkin.summary.createVisit}
                                    </Button>
                                )}
                            </NavigationButtons>
                        </ActionsContent>

                        {submitError && (
                            <div
                                style={{
                                    marginTop: '16px',
                                    padding: '12px',
                                    backgroundColor: '#fef2f2',
                                    border: '1px solid #fca5a5',
                                    borderRadius: '8px',
                                    fontSize: '14px',
                                    color: '#dc2626',
                                }}
                            >
                                {(() => {
                                    const anyErr: any = submitError as any;
                                    const backendMsg = anyErr?.response?.data?.message;
                                    const msg = typeof backendMsg === 'string' && backendMsg.trim().length > 0
                                        ? backendMsg
                                        : (anyErr?.message ?? t.checkin.errors.createFailed);
                                    return msg;
                                })()}
                            </div>
                        )}
                    </ActionsCard>
                </ContentWrapper>
            </Container>

            {/* Signing Requirement Modal */}
            {signingModalState.visitId && (
                <SigningRequirementModal
                    isOpen={signingModalState.isOpen}
                    onClose={handleSigningModalClose}
                    visitId={signingModalState.visitId}
                    visitNumber={signingModalState.visitNumber || ''}
                    customerName={`${formData.customerData.firstName} ${formData.customerData.lastName}`}
                    onConfirm={handleSigningModalConfirm}
                />
            )}
        </>
    );
};
