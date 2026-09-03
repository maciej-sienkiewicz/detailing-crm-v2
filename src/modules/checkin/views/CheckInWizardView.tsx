// src/modules/checkin/views/CheckInWizardView.tsx

import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import styled, { keyframes } from 'styled-components';
import { hexBackdrop } from '@/common/styles/hexBackdrop';
import { useToast } from '@/common/components/Toast';
import { StickyFormFooter, FooterPrimaryButton, FooterSecondaryButton } from '@/common/components/StickyFormFooter';
import { useCheckInWizard } from '../hooks/useCheckInWizard';
import { useCheckInValidation } from '../hooks/useCheckInValidation';
import { VerificationStep } from '../components/VerificationStep';
import { PhotoDocumentationStep } from '../components/PhotoDocumentationStep';
import { SigningRequirementModal } from '../components/SigningRequirementModal';
import { ResumeCheckInModal } from '../components/ResumeCheckInModal';
import { visitApi } from '@/modules/visits/api/visitApi';
import type { OpenDraftVisit } from '@/modules/visits/types';
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
    ${hexBackdrop}
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
    font-size: ${st.fontMd};
    font-weight: 700;
    color: ${st.text};
    letter-spacing: -0.3px;
    line-height: 1.2;

    @media (min-width: 768px) {
        font-size: ${st.fontLg};
    }
`;

const PageSubtitle = styled.p`
    margin: 3px 0 0;
    font-size: ${st.fontSm};
    color: ${st.textMuted};

    @media (max-width: 479px) {
        display: none;
    }
`;

const StepPills = styled.div`
    display: none;
    align-items: center;
    gap: 6px;

    @media (min-width: 600px) {
        display: flex;
    }
`;

const StepPill = styled.div<{ $state: 'done' | 'active' | 'pending' }>`
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 4px 10px;
    border-radius: ${st.radiusFull};
    font-size: 11px;
    font-weight: 600;
    transition: all ${st.transition};
    white-space: nowrap;

    @media (min-width: 768px) {
        padding: 5px 14px;
        font-size: 12px;
    }

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
    padding: 20px 16px 160px;

    @media (min-width: 640px) {
        padding: 28px 24px 140px;
    }

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
// Sama stopka i przyciski akcji żyją w @/common/components/StickyFormFooter —
// ten sam komponent obsługuje stopkę edycji rezerwacji, żeby te same akcje
// wyglądały identycznie na obu ekranach.

const FooterStepHint = styled.div`
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 12px;
    color: ${st.textMuted};
    flex: 1;
    min-width: 0;

    @media (min-width: 768px) {
        font-size: 13px;
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

// ─── Props ────────────────────────────────────────────────────────────────────

interface CheckInWizardViewProps {
    reservationId?: string;
    qrSessionId?: string;
    initialData: Partial<CheckInFormData>;
    colors: AppointmentColor[];
    onComplete: (visitId: string) => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

export const CheckInWizardView = ({ reservationId, qrSessionId, initialData, colors, onComplete }: CheckInWizardViewProps) => {
    // Effective QR checkin ID: reservation ID for booked check-ins, generated UUID for walk-ins
    const qrCheckinId = reservationId ?? qrSessionId;

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
    } = useCheckInWizard(reservationId, initialData, qrCheckinId);

    const { errors, isStepValid } = useCheckInValidation(formData, currentStep);
    const { showSuccess } = useToast();
    const navigate = useNavigate();

    const [showValidationErrors, setShowValidationErrors] = useState(false);
    // Licznik nieudanych prób, nie flaga: użytkownik może poprawić jedno pole i
    // kliknąć dalej ponownie — wtedy trzeba przewinąć do kolejnego błędu.
    const [validationAttempt, setValidationAttempt] = useState(0);
    const contentRef = useRef<HTMLDivElement>(null);

    // Lista w stopce mówi CO poprawić, ale nie GDZIE — przy dłuższym formularzu
    // błędne pole bywa poza ekranem. Przewijamy do pierwszej kotwicy błędu w
    // kolejności DOM, czyli w kolejności pól na formularzu, nie komunikatów.
    useEffect(() => {
        if (validationAttempt === 0) return;

        const frame = requestAnimationFrame(() => {
            const firstError = contentRef.current?.querySelector<HTMLElement>('[data-error-anchor]');
            if (!firstError) return;

            const prefersReducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
            firstError.scrollIntoView({
                behavior: prefersReducedMotion ? 'auto' : 'smooth',
                // środek kadru: nagłówek i stopka są przyklejone i zasłaniają krawędzie
                block: 'center',
            });

            const field = firstError.parentElement?.querySelector<HTMLElement>(
                'input:not([type="hidden"]):not([disabled]), textarea:not([disabled]), select:not([disabled])'
            );
            field?.focus({ preventScroll: true });
        });

        return () => cancelAnimationFrame(frame);
    }, [validationAttempt]);

    // „Czy wysłać Kartę Wizyty do klienta?" mieszka w oknie „Dokumentacja i Podpisy".
    // Kartę wysyła backend w żądaniu potwierdzenia wizyty (flaga sendVisitCard) — tu nic
    // nie dosyłamy, bo drugie wywołanie /card-link/send dublowało SMS do klienta.
    const [signingModalState, setSigningModalState] = useState<{
        isOpen: boolean;
        isCreating: boolean;
        visitId: string | null;
        visitNumber: string | null;
        protocols: ProtocolResponse[];
        hasPhotos: boolean;
        hasDamageMap: boolean;
    }>({
        isOpen: false,
        isCreating: false,
        visitId: null,
        visitNumber: null,
        protocols: [],
        hasPhotos: false,
        hasDamageMap: false,
    });

    /** Wznawiane przyjęcie z bramki 409 — patrz [handleSubmit]. */
    const [resumeDraft, setResumeDraft] = useState<OpenDraftVisit | null>(null);

    const handleNext = () => {
        if (!isStepValid) {
            setShowValidationErrors(true);
            setValidationAttempt(attempt => attempt + 1);
            return;
        }
        setShowValidationErrors(false);
        nextStep();
    };

    const handleSubmit = async () => {
        if (!isStepValid) {
            setShowValidationErrors(true);
            setValidationAttempt(attempt => attempt + 1);
            return;
        }

        setSigningModalState({ isOpen: true, isCreating: true, visitId: null, visitNumber: null, protocols: [], hasPhotos: false, hasDamageMap: false });

        try {
            const result = await submitCheckIn();
            setSigningModalState({
                isOpen: true,
                isCreating: false,
                visitId: result.visitId,
                visitNumber: `VIS-${result.visitId.slice(0, 8)}`,
                protocols: result.protocols || [],
                hasPhotos: (formData.photos?.length ?? 0) > 0,
                hasDamageMap: (formData.damagePoints?.length ?? 0) > 0,
            });
        } catch (error) {
            setSigningModalState({ isOpen: false, isCreating: false, visitId: null, visitNumber: null, protocols: [], hasPhotos: false, hasDamageMap: false });

            /*
             * 409: dla tej rezerwacji trwa już nieukończone przyjęcie — najczęściej to
             * samo, przerwane wcześniej przy dokumentach. Nie zakładamy drugiej wizyty:
             * wracamy do tamtej, dokładnie w miejscu, w którym została porzucona.
             */
            if (isDraftConflict(error) && reservationId) {
                const draft = await visitApi
                    .getOpenDraftForAppointment(reservationId)
                    .catch(() => null);
                if (draft) {
                    setResumeDraft(draft);
                    return;
                }
            }
        }
    };

    const handleSigningModalConfirm = () => {
        if (signingModalState.visitId) {
            const visitNumber = signingModalState.visitNumber || signingModalState.visitId.slice(0, 8);
            showSuccess(`Wizyta ${visitNumber} rozpoczęta pomyślnie!`, 'Możesz teraz przejść do obsługi klienta.');
            setSigningModalState({ isOpen: false, isCreating: false, visitId: null, visitNumber: null, protocols: [], hasPhotos: false, hasDamageMap: false });
            onComplete(signingModalState.visitId);
        }
    };

    /**
     * Wizyta anulowana — szkicu nie ma, rezerwacja wróciła na kalendarz.
     *
     * Odsyłamy właśnie tam, a nie z powrotem do formularza. Anulowanie znaczy „to
     * przyjęcie się nie odbyło": jedyne, co po nim zostaje, to wolny termin
     * w kalendarzu, i tam użytkownik ma teraz coś do zrobienia. Zostawienie go
     * w wypełnionym kreatorze sugerowałoby, że przyjęcie trwa dalej.
     */
    const handleSigningModalCancel = () => {
        setSigningModalState({ isOpen: false, isCreating: false, visitId: null, visitNumber: null, protocols: [], hasPhotos: false, hasDamageMap: false });
        navigate('/calendar');
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
                    <ContentWrap key={currentStep} ref={contentRef}>
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
                                qrCheckinId={qrCheckinId}
                                onChange={updateFormData}
                            />
                        )}
                    </ContentWrap>
                </ScrollArea>

                {/* ── Sticky footer ──────────────────────────────────────── */}
                <StickyFormFooter
                    actions={
                        <>
                            {!isFirstStep && (
                                <FooterSecondaryButton onClick={previousStep} disabled={isSubmitting}>
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                        <polyline points="15 18 9 12 15 6" />
                                    </svg>
                                    {t.checkin.actions.previousStep}
                                </FooterSecondaryButton>
                            )}

                            {!isLastStep ? (
                                <FooterPrimaryButton onClick={handleNext} disabled={false} $disabled={false}>
                                    {t.checkin.actions.nextStep}
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                        <polyline points="9 18 15 12 9 6" />
                                    </svg>
                                </FooterPrimaryButton>
                            ) : (
                                <FooterPrimaryButton
                                    onClick={handleSubmit}
                                    disabled={isSubmitting}
                                    $disabled={isSubmitting}
                                >
                                    {isSubmitting ? (
                                        <>{t.checkin.summary.creating}...</>
                                    ) : (
                                        <>{t.checkin.summary.createVisit}</>
                                    )}
                                    {!isSubmitting && (
                                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                            <polyline points="9 18 15 12 9 6" />
                                        </svg>
                                    )}
                                </FooterPrimaryButton>
                            )}
                        </>
                    }
                >
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

                </StickyFormFooter>
            </PageWrap>

            {signingModalState.isOpen && (
                <SigningRequirementModal
                    isOpen={signingModalState.isOpen}
                    isCreating={signingModalState.isCreating}
                    onCancel={handleSigningModalCancel}
                    visitId={signingModalState.visitId}
                    visitNumber={signingModalState.visitNumber || ''}
                    customerName={`${formData.customerData.firstName} ${formData.customerData.lastName}`}
                    customerPhone={formData.customerData.phone || null}
                    customerEmail={formData.customerData.email || null}
                    onCustomerEmailSaved={email => updateFormData({
                        customerData: { ...formData.customerData, email },
                    })}
                    protocols={signingModalState.protocols}
                    onConfirm={handleSigningModalConfirm}
                    hasPhotos={signingModalState.hasPhotos}
                    hasDamageMap={signingModalState.hasDamageMap}
                />
            )}

            {resumeDraft && (
                <ResumeCheckInModal
                    draft={resumeDraft}
                    onConfirmed={visitId => {
                        setResumeDraft(null);
                        showSuccess(`Wizyta ${resumeDraft.visitNumber} rozpoczęta pomyślnie!`);
                        onComplete(visitId);
                    }}
                    onCancelled={() => {
                        setResumeDraft(null);
                        navigate('/calendar');
                    }}
                />
            )}
        </>
    );
};

/**
 * Czy błąd to bramka „ta rezerwacja ma już nieukończone przyjęcie" (HTTP 409 z kodem),
 * a nie dowolny inny konflikt.
 */
const isDraftConflict = (error: unknown): boolean => {
    const response = (error as { response?: { status?: number; data?: { code?: string } } })?.response;
    return response?.status === 409 && response?.data?.code === 'DRAFT_VISIT_ALREADY_EXISTS';
};
