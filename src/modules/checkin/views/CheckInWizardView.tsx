// src/modules/checkin/views/CheckInWizardView.tsx

import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import styled, { keyframes } from 'styled-components';
import { useToast } from '@/common/components/Toast';
import { StickyFormFooter, FooterPrimaryButton, FooterSecondaryButton } from '@/common/components/StickyFormFooter';
import { LeaveGuard } from '@/common/components/LeaveGuard';
import { checkinApi } from '../api/checkinApi';
import { useCheckInWizard } from '../hooks/useCheckInWizard';
import { useCheckInValidation } from '../hooks/useCheckInValidation';
import { usePhotoSessionScope } from '../hooks/usePhotoUpload';
import { VerificationStep } from '../components/VerificationStep';
import { PhotoDocumentationStep } from '../components/PhotoDocumentationStep';
import { SigningRequirementModal } from '../components/SigningRequirementModal';
import { ResumeCheckInModal } from '../components/ResumeCheckInModal';
import { ArrivalDateModal } from '../components/ArrivalDateModal';
import { arrivalStartUpdates, needsArrivalDateDecision } from '../utils/arrivalDate';
import { visitApi } from '@/modules/visits/api/visitApi';
import type { OpenDraftVisit } from '@/modules/visits/types';
import { st } from '@/modules/statistics/components/StatisticsTheme';
import { t } from '@/common/i18n';
import { Notice } from '@/common/components/ui';
import type { CheckInFormData, CheckInInitialData, CheckInStep, ProtocolResponse } from '../types';
import type { AppointmentColor } from '@/modules/appointments/types';
import { problemDetail, isProblem, problemStatus } from '@/core/problem';

// ─── Animations ───────────────────────────────────────────────────────────────

const fadeSlide = keyframes`
    from { opacity: 0; }
    to   { opacity: 1; }
`;

// ─── Layout ───────────────────────────────────────────────────────────────────

const PageWrap = styled.div`
    min-height: 100vh;
    background: ${p => p.theme.colors.background};
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

const RevisingNotice = styled.div`
    margin-bottom: 16px;
`;

// ─── Sticky footer ────────────────────────────────────────────────────────────
// Sama stopka i przyciski akcji żyją w @/common/components/StickyFormFooter -
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
    initialData: CheckInInitialData;
    colors: AppointmentColor[];
    onComplete: (visitId: string) => void;
    /**
     * Początek rezerwacji (Instant). Gdy wypada w minionym dniu, przed formularzem
     * staje pytanie o prawdziwą datę przyjęcia auta - patrz utils/arrivalDate.
     */
    plannedStartAt?: string;
}

// ─── Component ────────────────────────────────────────────────────────────────

export const CheckInWizardView = ({ reservationId, qrSessionId, initialData, colors, onComplete, plannedStartAt }: CheckInWizardViewProps) => {
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
        goToStep,
        submitCheckIn,
        reviseDraft,
        isSubmitting,
        submitError,
    } = useCheckInWizard(reservationId, initialData, qrCheckinId);
    // Jedna sesja zdjęć na cały kreator, nie na każde wejście w krok zdjęć.
    const photoSessionScope = usePhotoSessionScope(reservationId);

    const { errors, isStepValid } = useCheckInValidation(formData, currentStep);
    const { showSuccess } = useToast();
    const navigate = useNavigate();

    const [showValidationErrors, setShowValidationErrors] = useState(false);
    // Licznik nieudanych prób, nie flaga: użytkownik może poprawić jedno pole i
    // kliknąć dalej ponownie - wtedy trzeba przewinąć do kolejnego błędu.
    const [validationAttempt, setValidationAttempt] = useState(0);
    const contentRef = useRef<HTMLDivElement>(null);

    // Lista w stopce mówi CO poprawić, ale nie GDZIE - przy dłuższym formularzu
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

    // „Czy wysłać Kartę Wizyty do klienta?" mieszka w oknie „Dokumenty do podpisu".
    // Kartę wysyła backend w żądaniu potwierdzenia wizyty (flaga sendVisitCard) - tu nic
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

    /**
     * „Wróć do formularza" z okna dokumentów: szkic wizyty już istnieje (z numerem
     * i zdjęciami), a klient przy podpisie zauważył błąd w danych albo dorzuca usługę.
     * Ponowny zapis nie zakłada drugiej wizyty, tylko zapisuje do szkicu cały poprawiony
     * formularz i generuje dokumenty od nowa (PUT /checkin/drafts/{id}).
     */
    const [revisingVisit, setRevisingVisit] = useState<{ visitId: string; visitNumber: string } | null>(null);

    /*
     * Telefon z kodu QR ma wiedzieć, że przyjęcie się nie odbędzie: przerwanie w oknie
     * dokumentów i porzucenie kreatora kończą jego sesję („Przyjęcie przerwane").
     * Udane przyjęcie kończy ją samo - serwer zamyka sesję przy zapisie wizyty.
     */
    const finishedRef = useRef(false);
    const [finished, setFinished] = useState(false);
    const markFinished = useCallback(() => {
        finishedRef.current = true;
        setFinished(true);
    }, []);
    const visitExists = !!signingModalState.visitId || !!revisingVisit;
    const visitExistsRef = useRef(visitExists);
    const qrCheckinIdRef = useRef(qrCheckinId);
    useEffect(() => {
        visitExistsRef.current = visitExists;
        qrCheckinIdRef.current = qrCheckinId;
    });

    const endPhoneSession = useCallback(() => {
        const id = qrCheckinIdRef.current;
        if (id) void checkinApi.endCheckinMobileSession(id).catch(() => {});
    }, []);

    useEffect(() => () => {
        // Odmontowanie bez zakończenia = porzucone przyjęcie. Wizyta, która już powstała
        // (szkic do dokończenia), nie jest porzuceniem - jej telefon i tak jest zamknięty.
        if (!finishedRef.current && !visitExistsRef.current) endPhoneSession();
    }, [endPhoneSession]);

    /** Pytanie o datę przyjęcia rezerwacji z minionego dnia - raz, przy wejściu w kreator. */
    const [askArrivalDate, setAskArrivalDate] = useState(
        () => !!reservationId && needsArrivalDateDecision(plannedStartAt, new Date()),
    );

    /** Wznawiane przyjęcie z bramki 409 - patrz [handleSubmit]. */
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

        if (revisingVisit) {
            try {
                const result = await reviseDraft(revisingVisit.visitId);
                setSigningModalState({
                    isOpen: true,
                    isCreating: false,
                    visitId: result.visitId,
                    visitNumber: revisingVisit.visitNumber,
                    protocols: result.protocols || [],
                    hasPhotos: (formData.photos?.length ?? 0) > 0,
                    hasDamageMap: (formData.damagePoints?.length ?? 0) > 0,
                });
                setRevisingVisit(null);
            } catch {
                // Komunikat serwera pokazuje stopka (submitError); szkic zostaje do poprawy.
                setSigningModalState({ isOpen: false, isCreating: false, visitId: null, visitNumber: null, protocols: [], hasPhotos: false, hasDamageMap: false });
            }
            return;
        }

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
             * 409: dla tej rezerwacji trwa już nieukończone przyjęcie - najczęściej to
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
            markFinished();
            showSuccess('Wizyta rozpoczęta');
            setSigningModalState({ isOpen: false, isCreating: false, visitId: null, visitNumber: null, protocols: [], hasPhotos: false, hasDamageMap: false });
            onComplete(signingModalState.visitId);
        }
    };

    /**
     * Wizyta anulowana - szkicu nie ma, rezerwacja wróciła na kalendarz.
     *
     * Odsyłamy właśnie tam, a nie z powrotem do formularza. Anulowanie znaczy „to
     * przyjęcie się nie odbyło": jedyne, co po nim zostaje, to wolny termin
     * w kalendarzu, i tam użytkownik ma teraz coś do zrobienia. Zostawienie go
     * w wypełnionym kreatorze sugerowałoby, że przyjęcie trwa dalej.
     */
    const handleSigningModalCancel = () => {
        markFinished();
        endPhoneSession();
        setSigningModalState({ isOpen: false, isCreating: false, visitId: null, visitNumber: null, protocols: [], hasPhotos: false, hasDamageMap: false });
        navigate('/calendar');
    };

    /** Okno dokumentów zamknięte, szkic zostaje - formularz z usługami na wierzchu. */
    const handleBackToForm = () => {
        const { visitId, visitNumber } = signingModalState;
        if (!visitId) return;
        setRevisingVisit({ visitId, visitNumber: visitNumber ?? '' });
        setSigningModalState({ isOpen: false, isCreating: false, visitId: null, visitNumber: null, protocols: [], hasPhotos: false, hasDamageMap: false });
        setShowValidationErrors(false);
        goToStep('verification');
    };

    const handleServicesChange = (services: CheckInFormData['services']) => {
        updateFormData({ services });
    };

    const isFirstStep = currentStep === 'verification';
    // Rezerwacja przychodzi z wypełnionym klientem i autem, więc liczy się dopiero
    // przejście dalej; przyjęcie bez rezerwacji - już pierwsze wpisane dane.
    const hasProgress = !isFirstStep || completedSteps.length > 0 || (!reservationId && (
        formData.services.length > 0 || !!formData.vehicleData || !!formData.customerData.lastName.trim()
    ));
    const isLastStep = currentStep === 'photos';
    // Przy poprawianiu szkicu zdjęcia już są w wizycie - zapis idzie od razu z formularza,
    // a krok zdjęć i uszkodzeń zostaje pod osobnym przyciskiem.
    const showSubmit = isLastStep || !!revisingVisit;
    const showPhotosStepLink = !!revisingVisit && !isLastStep;
    const visibleErrors = showValidationErrors ? errors : {};
    const hasErrors = showValidationErrors && Object.keys(errors).length > 0;

    const getStepState = (stepId: CheckInStep): 'done' | 'active' | 'pending' => {
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
                                    {formData.vehicleData && `, ${formData.vehicleData.brand} ${formData.vehicleData.model}`}
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
                        {revisingVisit && (
                            <RevisingNotice>
                                <Notice tone="info" title="Poprawiasz założone przyjęcie" role="status">
                                    Popraw dane i zapisz. Dokumenty utworzą się od nowa z poprawionymi danymi
                                    i trzeba je podpisać jeszcze raz.
                                </Notice>
                            </RevisingNotice>
                        )}
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
                                photoSessionScope={photoSessionScope}
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

                            {showPhotosStepLink && (
                                <FooterSecondaryButton onClick={handleNext} disabled={isSubmitting}>
                                    {steps[1].label}
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                        <polyline points="9 18 15 12 9 6" />
                                    </svg>
                                </FooterSecondaryButton>
                            )}

                            {!showSubmit ? (
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
                                        <>{t.checkin.summary.creating}</>
                                    ) : revisingVisit ? (
                                        <>Zapisz zmiany i wróć do dokumentów</>
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
                                    const backendMsg = problemDetail(anyErr);
                                    return (typeof backendMsg === 'string' && backendMsg.trim().length > 0)
                                        ? backendMsg
                                        : (anyErr?.message ?? t.checkin.errors.createFailed);
                                })()}
                            </ErrorAlert>
                        ) : (
                            <FooterStepHint>
                                <FooterStepDot />
                                Krok {steps.findIndex(s => s.id === currentStep) + 1} z {steps.length}:{' '}
                                {steps.find(s => s.id === currentStep)?.label}
                            </FooterStepHint>
                        )}

                </StickyFormFooter>
            </PageWrap>

            {/* Wyjście menu albo „wstecz" z rozpoczętego przyjęcia: bez szkicu dane by
                przepadły po cichu, a telefon dalej przyjmowałby zdjęcia. */}
            <LeaveGuard
                when={!finished && !visitExists && hasProgress}
                title="Przerwać przyjęcie pojazdu?"
                message="Wpisane dane nie zostaną zapisane, a telefon, który zeskanował kod QR, przestanie przyjmować zdjęcia."
                confirmText="Przerwij przyjęcie"
                cancelText="Wróć do przyjęcia"
                onLeave={() => { markFinished(); endPhoneSession(); }}
            />

            {signingModalState.isOpen && (
                <SigningRequirementModal
                    isOpen={signingModalState.isOpen}
                    isCreating={signingModalState.isCreating}
                    onCancel={handleSigningModalCancel}
                    onBackToForm={handleBackToForm}
                    fromReservation={!!reservationId}
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

            {askArrivalDate && plannedStartAt && (
                <ArrivalDateModal
                    plannedStart={plannedStartAt}
                    vehicleLabel={[
                        [formData.vehicleData?.brand, formData.vehicleData?.model].filter(Boolean).join(' '),
                        formData.vehicleData?.licensePlate,
                    ].filter(Boolean).join(', ') || undefined}
                    onConfirm={visitStartAt => {
                        updateFormData(arrivalStartUpdates(visitStartAt, formData.visitEndAt));
                        setAskArrivalDate(false);
                    }}
                    onBack={() => navigate(-1)}
                />
            )}

            {resumeDraft && (
                <ResumeCheckInModal
                    draft={resumeDraft}
                    onConfirmed={visitId => {
                        markFinished();
                        setResumeDraft(null);
                        showSuccess('Wizyta rozpoczęta');
                        onComplete(visitId);
                    }}
                    onCancelled={() => {
                        markFinished();
                        endPhoneSession();
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
const isDraftConflict = (error: unknown): boolean =>
    problemStatus(error) === 409 && isProblem(error, 'DRAFT_VISIT_ALREADY_EXISTS');
