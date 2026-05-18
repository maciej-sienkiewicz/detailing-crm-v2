// src/modules/checkin/views/CheckInWizardView.tsx

import { useState } from 'react';
import styled, { keyframes } from 'styled-components';
import { useSidebar } from '@/widgets/Sidebar/context/SidebarContext';
import { useToast } from '@/common/components/Toast';
import { useCheckInWizard } from '../hooks/useCheckInWizard';
import { useCheckInValidation } from '../hooks/useCheckInValidation';
import { VerificationStep } from '../components/VerificationStep';
import { PhotoDocumentationStep } from '../components/PhotoDocumentationStep';
import { SigningRequirementModal } from '../components/SigningRequirementModal';
import { st } from '@/modules/statistics/components/StatisticsTheme';
import { t } from '@/common/i18n';
import type { CheckInFormData, ProtocolResponse } from '../types';
import type { AppointmentColor } from '@/modules/appointments/types';

// ─── Animations ───────────────────────────────────────────────────────────────

const fadeSlide = keyframes`
    from { opacity: 0; }
    to   { opacity: 1; }
`;

// ─── Layout ───────────────────────────────────────────────────────────────────

const PageWrap = styled.div`
    min-height: 100vh;
    background: ${st.bg};
    display: flex;
    flex-direction: column;
`;

const PageHeader = styled.header`
    background: ${st.bgCard};
    border-bottom: 1px solid ${st.border};
    padding: 20px 24px;
    position: sticky;
    top: 0;
    z-index: 50;
    box-shadow: ${st.shadowXs};

    @media (min-width: 768px) {
        padding: 20px 40px;
    }
`;

const HeaderInner = styled.div`
    max-width: 1100px;
    margin: 0 auto;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
    flex-wrap: wrap;
`;

const TitleBlock = styled.div``;

const PageTitle = styled.h1`
    margin: 0;
    font-size: ${st.fontLg};
    font-weight: 700;
    color: ${st.text};
    letter-spacing: -0.3px;
    line-height: 1.2;
`;

const PageSubtitle = styled.p`
    margin: 3px 0 0;
    font-size: ${st.fontSm};
    color: ${st.textMuted};
`;

const StepPills = styled.div`
    display: flex;
    align-items: center;
    gap: 6px;
`;

const StepPill = styled.div<{ $state: 'done' | 'active' | 'pending' }>`
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 5px 14px;
    border-radius: ${st.radiusFull};
    font-size: 12px;
    font-weight: 600;
    transition: all ${st.transition};

    ${props => {
        switch (props.$state) {
            case 'done':
                return `
                    background: rgba(5, 150, 105, 0.10);
                    color: #059669;
                    border: 1.5px solid rgba(5, 150, 105, 0.30);
                `;
            case 'active':
                return `
                    background: ${st.accentBlueDim};
                    color: ${st.accentBlue};
                    border: 1.5px solid ${st.accentBlue};
                `;
            case 'pending':
            default:
                return `
                    background: transparent;
                    color: ${st.textMuted};
                    border: 1.5px solid ${st.border};
                `;
        }
    }}
`;

const StepDot = styled.span<{ $state: 'done' | 'active' | 'pending' }>`
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: currentColor;
    flex-shrink: 0;
`;

const StepArrow = styled.span`
    font-size: 12px;
    color: ${st.textMuted};
    flex-shrink: 0;
`;

// ─── Scrollable content ───────────────────────────────────────────────────────

const ScrollArea = styled.main`
    flex: 1;
    padding: 28px 24px 120px;

    @media (min-width: 768px) {
        padding: 32px 40px 120px;
    }
`;

const ContentWrap = styled.div`
    max-width: 1100px;
    margin: 0 auto;
    animation: ${fadeSlide} 220ms ease both;
`;

// ─── Sticky footer ────────────────────────────────────────────────────────────

const StickyFooter = styled.footer<{ $sidebarWidth: number }>`
    position: fixed;
    bottom: 0;
    left: ${p => p.$sidebarWidth}px;
    right: 0;
    background: ${st.bgCard};
    border-top: 1px solid ${st.border};
    box-shadow: 0 -4px 24px rgba(15, 23, 42, 0.08);
    z-index: 50;
    transition: left 0.2s ease;

    @media (max-width: 768px) {
        left: 0;
    }
`;

const FooterInner = styled.div`
    max-width: 1100px;
    margin: 0 auto;
    padding: 16px 24px;
    display: flex;
    flex-direction: column;
    gap: 10px;

    @media (min-width: 768px) {
        padding: 16px 40px;
        flex-direction: row;
        align-items: center;
        gap: 16px;
    }
`;

const FooterStepHint = styled.div`
    display: none;

    @media (min-width: 768px) {
        display: flex;
        align-items: center;
        gap: 8px;
        font-size: 13px;
        color: ${st.textMuted};
        flex: 1;
        min-width: 0;
    }
`;

const FooterStepDot = styled.span`
    width: 7px;
    height: 7px;
    border-radius: 50%;
    background: ${st.accentBlue};
    flex-shrink: 0;
`;

const ValidationAlert = styled.div`
    display: flex;
    align-items: flex-start;
    gap: 10px;
    padding: 10px 14px;
    background: rgba(217, 119, 6, 0.08);
    border: 1px solid rgba(217, 119, 6, 0.30);
    border-radius: ${st.radiusSm};
    font-size: 13px;
    color: #92400E;
    flex: 1;
    min-width: 0;
`;

const ValidationIcon = styled.span`
    flex-shrink: 0;
    font-size: 15px;
    line-height: 1.4;
`;

const ValidationErrors = styled.ul`
    margin: 0;
    padding: 0 0 0 16px;
    list-style: disc;

    li {
        line-height: 1.5;
    }
`;

const ValidationTitle = styled.div`
    font-weight: 600;
    margin-bottom: 4px;
`;

const ErrorAlert = styled.div`
    padding: 10px 14px;
    background: rgba(220, 38, 38, 0.08);
    border: 1px solid rgba(220, 38, 38, 0.30);
    border-radius: ${st.radiusSm};
    font-size: 13px;
    color: #991B1B;
    flex: 1;
`;

const FooterActions = styled.div`
    display: flex;
    gap: 8px;
    align-items: center;
    flex-shrink: 0;
    margin-left: auto;
`;

const BackBtn = styled.button`
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 10px 18px;
    background: ${st.bgCard};
    color: ${st.textSecondary};
    border: 1.5px solid ${st.border};
    border-radius: ${st.radiusSm};
    font-size: ${st.fontSm};
    font-weight: 600;
    cursor: pointer;
    transition: all ${st.transition};
    white-space: nowrap;

    &:hover {
        border-color: ${st.borderHover};
        color: ${st.text};
        background: ${st.bgCardAlt};
    }

    svg {
        width: 14px;
        height: 14px;
    }
`;

const NextBtn = styled.button<{ $disabled?: boolean }>`
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 10px 22px;
    background: ${props => props.$disabled ? '#94A3B8' : st.accentBlue};
    color: #fff;
    border: none;
    border-radius: ${st.radiusSm};
    font-size: ${st.fontSm};
    font-weight: 600;
    cursor: ${props => props.$disabled ? 'not-allowed' : 'pointer'};
    transition: all ${st.transition};
    white-space: nowrap;
    box-shadow: ${props => props.$disabled ? 'none' : '0 1px 4px rgba(37, 99, 235, 0.25)'};

    &:hover:not(:disabled) {
        background: #1D4ED8;
        transform: translateY(-1px);
        box-shadow: 0 4px 14px rgba(37, 99, 235, 0.35);
    }

    &:disabled {
        cursor: not-allowed;
    }

    svg {
        width: 14px;
        height: 14px;
    }
`;

// ─── Props ────────────────────────────────────────────────────────────────────

interface CheckInWizardViewProps {
    reservationId?: string;
    initialData: Partial<CheckInFormData>;
    colors: AppointmentColor[];
    onComplete: (visitId: string) => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

export const CheckInWizardView = ({ reservationId, initialData, colors, onComplete }: CheckInWizardViewProps) => {
    const { isCollapsed } = useSidebar();
    const sidebarWidth = isCollapsed ? 64 : 240;

    const {
        currentStep,
        completedSteps,
        formData,
        steps,
        updateFormData,
        nextStep,
        previousStep,
        submitCheckIn,
        isSubmitting,
        submitError,
    } = useCheckInWizard(reservationId, initialData);

    const { errors, isStepValid } = useCheckInValidation(formData, currentStep);
    const { showSuccess } = useToast();

    const [showValidationErrors, setShowValidationErrors] = useState(false);

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
        if (!isStepValid) {
            setShowValidationErrors(true);
            return;
        }
        setShowValidationErrors(false);
        nextStep();
    };

    const handleSubmit = async () => {
        if (!isStepValid) {
            setShowValidationErrors(true);
            return;
        }

        setSigningModalState({ isOpen: true, isCreating: true, visitId: null, visitNumber: null, protocols: [] });

        try {
            const result = await submitCheckIn();
            setSigningModalState({
                isOpen: true,
                isCreating: false,
                visitId: result.visitId,
                visitNumber: `VIS-${result.visitId.slice(0, 8)}`,
                protocols: result.protocols || [],
            });
        } catch {
            setSigningModalState({ isOpen: false, isCreating: false, visitId: null, visitNumber: null, protocols: [] });
        }
    };

    const handleSigningModalConfirm = () => {
        if (signingModalState.visitId) {
            const visitNumber = signingModalState.visitNumber || signingModalState.visitId.slice(0, 8);
            showSuccess(`Wizyta ${visitNumber} rozpoczęta pomyślnie!`, 'Możesz teraz przejść do obsługi klienta.');
            setSigningModalState({ isOpen: false, isCreating: false, visitId: null, visitNumber: null, protocols: [] });
            onComplete(signingModalState.visitId);
        }
    };

    const handleSigningModalCancel = () => {
        setSigningModalState({ isOpen: false, isCreating: false, visitId: null, visitNumber: null, protocols: [] });
    };

    const handleSigningModalClose = () => {
        setSigningModalState(s => ({ ...s, isOpen: false }));
    };

    const handleServicesChange = (services: CheckInFormData['services']) => {
        updateFormData({ services });
    };

    const isFirstStep = currentStep === 'verification';
    const isLastStep = currentStep === 'photos';
    const visibleErrors = showValidationErrors ? errors : {};
    const hasErrors = showValidationErrors && Object.keys(errors).length > 0;

    const getStepState = (stepId: string): 'done' | 'active' | 'pending' => {
        if (completedSteps.includes(stepId)) return 'done';
        if (stepId === currentStep) return 'active';
        return 'pending';
    };

    return (
        <>
            <PageWrap>
                {/* ── Sticky header ─────────────────────────────────────── */}
                <PageHeader>
                    <HeaderInner>
                        <TitleBlock>
                            <PageTitle>{t.checkin.title}</PageTitle>
                            {formData.customerData.firstName && (
                                <PageSubtitle>
                                    {formData.customerData.firstName} {formData.customerData.lastName}
                                    {formData.vehicleData && ` · ${formData.vehicleData.brand} ${formData.vehicleData.model}`}
                                </PageSubtitle>
                            )}
                        </TitleBlock>

                        <StepPills>
                            {steps.map((step, i) => (
                                <>
                                    {i > 0 && <StepArrow key={`arrow-${step.id}`}>›</StepArrow>}
                                    <StepPill key={step.id} $state={getStepState(step.id)}>
                                        <StepDot $state={getStepState(step.id)} />
                                        {step.label}
                                    </StepPill>
                                </>
                            ))}
                        </StepPills>
                    </HeaderInner>
                </PageHeader>

                {/* ── Main content ───────────────────────────────────────── */}
                <ScrollArea>
                    <ContentWrap key={currentStep}>
                        {currentStep === 'verification' && (
                            <VerificationStep
                                formData={formData}
                                errors={visibleErrors}
                                onChange={updateFormData}
                                onServicesChange={handleServicesChange}
                                colors={colors}
                                initialCustomerData={initialData.customerData}
                                initialHasFullCustomerData={initialData.hasFullCustomerData}
                                initialIsNewCustomer={initialData.isNewCustomer}
                                initialHomeAddress={initialData.homeAddress}
                                initialCompany={initialData.company}
                                initialVehicleData={initialData.vehicleData === undefined ? undefined : (initialData.vehicleData ?? null)}
                                initialIsNewVehicle={initialData.isNewVehicle}
                            />
                        )}
                        {currentStep === 'photos' && (
                            <PhotoDocumentationStep
                                formData={formData}
                                reservationId={reservationId}
                                onChange={updateFormData}
                            />
                        )}
                    </ContentWrap>
                </ScrollArea>

                {/* ── Sticky footer ──────────────────────────────────────── */}
                <StickyFooter $sidebarWidth={sidebarWidth}>
                    <FooterInner>
                        {/* Left side: validation errors / step hint */}
                        {hasErrors ? (
                            <ValidationAlert>
                                <ValidationIcon>⚠</ValidationIcon>
                                <div>
                                    <ValidationTitle>Uzupełnij wymagane pola:</ValidationTitle>
                                    <ValidationErrors>
                                        {Object.values(errors).map((msg, i) => (
                                            <li key={i}>{msg}</li>
                                        ))}
                                    </ValidationErrors>
                                </div>
                            </ValidationAlert>
                        ) : submitError ? (
                            <ErrorAlert>
                                {(() => {
                                    const anyErr: any = submitError as any;
                                    const backendMsg = anyErr?.response?.data?.message;
                                    return (typeof backendMsg === 'string' && backendMsg.trim().length > 0)
                                        ? backendMsg
                                        : (anyErr?.message ?? t.checkin.errors.createFailed);
                                })()}
                            </ErrorAlert>
                        ) : (
                            <FooterStepHint>
                                <FooterStepDot />
                                Krok {steps.findIndex(s => s.id === currentStep) + 1} z {steps.length}
                                {' · '}
                                {steps.find(s => s.id === currentStep)?.label}
                            </FooterStepHint>
                        )}

                        {/* Navigation */}
                        <FooterActions>
                            {!isFirstStep && (
                                <BackBtn onClick={previousStep} disabled={isSubmitting}>
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                        <polyline points="15 18 9 12 15 6" />
                                    </svg>
                                    {t.checkin.actions.previousStep}
                                </BackBtn>
                            )}

                            {!isLastStep ? (
                                <NextBtn onClick={handleNext} disabled={false} $disabled={false}>
                                    {t.checkin.actions.nextStep}
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                        <polyline points="9 18 15 12 9 6" />
                                    </svg>
                                </NextBtn>
                            ) : (
                                <NextBtn
                                    onClick={handleSubmit}
                                    disabled={isSubmitting}
                                    $disabled={isSubmitting}
                                >
                                    {isSubmitting ? (
                                        <>{t.checkin.summary.creating}…</>
                                    ) : (
                                        <>{t.checkin.summary.createVisit}</>
                                    )}
                                    {!isSubmitting && (
                                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                            <polyline points="9 18 15 12 9 6" />
                                        </svg>
                                    )}
                                </NextBtn>
                            )}
                        </FooterActions>
                    </FooterInner>
                </StickyFooter>
            </PageWrap>

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
