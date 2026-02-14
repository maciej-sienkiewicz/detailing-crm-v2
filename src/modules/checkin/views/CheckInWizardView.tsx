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
import type { CheckInFormData, ProtocolResponse } from '../types';
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
        isCreating: boolean;
        visitId: string | null;
        visitNumber: string | null;
        protocols: ProtocolResponse[];
    }>({
        isOpen: false,
        isCreating: false,
        visitId: null,
        visitNumber: null,
        protocols: [],
    });

    const handleNext = () => {
        if (isStepValid) {
            nextStep();
        }
    };

    const handleSubmit = async () => {
        if (!isStepValid) return;

        // Step 1: Open modal immediately with loading state
        setSigningModalState({
            isOpen: true,
            isCreating: true,
            visitId: null,
            visitNumber: null,
            protocols: [],
        });

        try {
            // Step 2: Create the DRAFT visit with protocols in background
            const result = await submitCheckIn();

            // Step 3: Update modal with visit data
            setSigningModalState({
                isOpen: true,
                isCreating: false,
                visitId: result.visitId,
                visitNumber: `VIS-${result.visitId.slice(0, 8)}`,
                protocols: result.protocols || [],
            });
        } catch (error) {
            console.error('Check-in failed:', error);
            // Close modal on error
            setSigningModalState({
                isOpen: false,
                isCreating: false,
                visitId: null,
                visitNumber: null,
                protocols: [],
            });
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
                isCreating: false,
                visitId: null,
                visitNumber: null,
                protocols: [],
            });
            onComplete(signingModalState.visitId);
        }
    };

    const handleSigningModalCancel = () => {
        // Visit was cancelled (deleted), reset state
        setSigningModalState({
            isOpen: false,
            isCreating: false,
            visitId: null,
            visitNumber: null,
            protocols: [],
        });
    };

    const handleSigningModalClose = () => {
        // Allow closing without completing (user can handle documents later)
        setSigningModalState({
            isOpen: false,
            isCreating: false,
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
            {signingModalState.isOpen && (
                <SigningRequirementModal
                    isOpen={signingModalState.isOpen}
                    isCreating={signingModalState.isCreating}
                    onClose={handleSigningModalClose}
                    onCancel={handleSigningModalCancel}
                    visitId={signingModalState.visitId}
                    visitNumber={signingModalState.visitNumber || ''}
                    customerName={`${formData.customerData.firstName} ${formData.customerData.lastName}`}
                    protocols={signingModalState.protocols}
                    onConfirm={handleSigningModalConfirm}
                />
            )}
        </>
    );
};
