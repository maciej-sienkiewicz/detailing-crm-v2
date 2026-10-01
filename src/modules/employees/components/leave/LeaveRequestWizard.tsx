// src/modules/employees/components/leave/LeaveRequestWizard.tsx
//
// Wniosek o urlop pracownika - okno krok po kroku: 1 Rodzaj, 2 Termin, 3 Sprawdź,
// 4 Podpis. Projektowane najpierw na telefon, bo z telefonu składa się wniosek.
//
// „Dalej" z kroku terminu tworzy SZKIC na serwerze (DRAFT z gotowym PDF), bo krok
// „Sprawdź" pokazuje dokładnie ten dokument, który zostanie podpisany - podpis dotyczy
// bajtów, których skrót dał backend (WYSIWYS). Okno nie zostawia po sobie więcej niż
// jednego szkicu (useLeaveDraft): zmiana danych i zamknięcie bez podpisu go wycofują.
//
// Interfejs nie ma ścieżki z jednym podpisem: „Podpisz i wyślij wniosek" budzi się
// dopiero po narysowaniu podpisu i zaznaczeniu oświadczenia.

import { useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ArrowRight, PenLine } from 'lucide-react';
import { Button, Notice } from '@/common/components/ui';
import { useToast } from '@/common/components/Toast';
import type { SignaturePadHandle } from '@/common/components/SignaturePad';
import { useAuth } from '@/core/context/AuthContext';
import { usePermissions, ANY_EMPLOYEES } from '@/core/permissions';
import { leaveApiError, myLeaveRequestsApi } from '../../api/leaveRequestsApi';
import {
    MY_LEAVE_REQUESTS_KEY, useAbsentColleagues, useLeaveRequestPreview, useSubmitLeaveRequest,
} from '../../hooks/useLeaveRequests';
import { useLeaveDraft, type LeaveDraftEndpoints } from '../../hooks/useLeaveDraft';
import type { CreateLeaveRequestPayload } from '../../types';
import { LEAVE_REASON_MAX, addDaysIso, todayIso } from '../../utils/leaveRequestFormat';
import { PrimaryAction } from './PrimaryAction';
import { LeavePdf } from './LeavePdf';
import { FooterPrimary, LeaveStepModal, type LeaveStep } from './LeaveStepModal';
import {
    LeaveKindStep, LeaveSummary, LeaveTermStep, SignatureBlock, Stack, StepHeading, type FieldErrors,
} from './LeaveFormSteps';
import { LEAVE_KINDS, TERM_FIELDS, type LeaveKindKey } from './leaveKinds';

const STEPS: LeaveStep[] = [
    { key: 'kind', label: 'Rodzaj' },
    { key: 'term', label: 'Termin' },
    { key: 'review', label: 'Sprawdź' },
    { key: 'sign', label: 'Podpis' },
];
const KIND = 0;
const TERM = 1;
const REVIEW = 2;
const SIGN = 3;

const REFRESHED_MESSAGE = 'Dokument został odświeżony. Sprawdź go i podpisz ponownie.';

const SELF_DRAFT: LeaveDraftEndpoints<CreateLeaveRequestPayload> = {
    create: myLeaveRequestsApi.create,
    discard: myLeaveRequestsApi.withdraw,
    newSession: myLeaveRequestsApi.signingSession,
};

interface Props {
    onClose: () => void;
}

export function LeaveRequestWizard({ onClose }: Props) {
    const { user } = useAuth();
    const { can } = usePermissions();
    const { showSuccess, showError } = useToast();
    const selfEmployeeId = user?.employeeId ?? null;

    const [step, setStep] = useState(KIND);
    const [kind, setKind] = useState<LeaveKindKey | null>(null);
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [reason, setReason] = useState('');
    const [errors, setErrors] = useState<FieldErrors>({});
    const [pickerOpen, setPickerOpen] = useState(false);

    const kindDef = LEAVE_KINDS.find(k => k.key === kind) ?? null;
    const today = todayIso();
    // Zwykły wniosek najwcześniej od jutra; „na żądanie" - także na dziś (kontrakt).
    const minStart = kindDef?.onDemand ? today : addDaysIso(today, 1);

    const preview = useLeaveRequestPreview(startDate, endDate);
    const previewError = preview.isError ? leaveApiError(preview.error) : null;
    // Kalendarz urlopów to widok kadrowy/warsztatowy - kto go nie ma, nie dostaje
    // bursztynowej informacji, zamiast pytać API o 403.
    const canSeeTeam = can('VISITS_VIEW') || can(ANY_EMPLOYEES);
    const absentNames = useAbsentColleagues(startDate, endDate, selfEmployeeId, canSeeTeam);

    const drafts = useLeaveDraft(SELF_DRAFT);
    const draft = drafts.draft;
    const submit = useSubmitLeaveRequest();

    // Dokument: ten sam od kroku „Sprawdź" do podpisu; nowy challenge = nowe bajty.
    const documentQuery = useQuery({
        queryKey: [...MY_LEAVE_REQUESTS_KEY, 'document', draft?.request.id ?? '', draft?.session.challenge ?? ''],
        queryFn: () => myLeaveRequestsApi.document(draft!.request.id),
        enabled: step >= REVIEW && !!draft,
        retry: false,
        staleTime: Infinity,
        gcTime: 0,
    });

    const padRef = useRef<SignaturePadHandle>(null);
    const [hasInk, setHasInk] = useState(false);
    const [declared, setDeclared] = useState(false);
    const [signNotice, setSignNotice] = useState<string | null>(null);

    const payload = (): CreateLeaveRequestPayload | null => {
        if (!kindDef) return null;
        const trimmedReason = reason.trim();
        return {
            leaveType: kindDef.leaveType,
            onDemand: kindDef.onDemand,
            startDate,
            endDate,
            ...(trimmedReason ? { reason: trimmedReason } : {}),
        };
    };

    const validateTerm = (): FieldErrors => {
        const next: FieldErrors = {};
        if (!startDate) next.startDate = 'Wybierz pierwszy dzień urlopu.';
        if (!endDate) next.endDate = 'Wybierz ostatni dzień urlopu.';
        if (startDate && endDate && endDate < startDate) next.endDate = 'Koniec nie może być przed początkiem.';
        if (kindDef?.leaveType === 'SPECIAL' && !reason.trim()) next.reason = 'Przy urlopie okolicznościowym podaj powód.';
        if (reason.trim().length > LEAVE_REASON_MAX) next.reason = `Najwyżej ${LEAVE_REASON_MAX} znaków.`;
        return next;
    };

    const goToReview = () => {
        const body = payload();
        if (!body) return;
        const local = validateTerm();
        if (Object.keys(local).length > 0) { setErrors(local); return; }
        drafts.prepare(body, {
            onReady: (_draft, fresh) => {
                setErrors({});
                if (fresh) { setSignNotice(null); setDeclared(false); }
                setStep(REVIEW);
            },
            onError: error => {
                const { field, message } = leaveApiError(error);
                if (field && message) {
                    setErrors({ [field]: message });
                    if (!TERM_FIELDS.has(field)) setStep(KIND);
                    return;
                }
                showError('Nie udało się przygotować wniosku', message ?? 'Spróbuj ponownie za chwilę.');
            },
        });
    };

    /** 409: dokument albo jednorazowy challenge się zmienił - nowa sesja, nowy dokument, czysty pad. */
    const refreshSigning = async () => {
        padRef.current?.clear();
        setDeclared(false);
        const ok = await drafts.refreshSession();
        if (!ok) {
            showError('Nie udało się odświeżyć dokumentu', 'Zamknij okno i zacznij wniosek od nowa.');
            return;
        }
        // Nowe bajty trzeba najpierw obejrzeć - dlatego powrót do „Sprawdź", a nie podpis w ciemno.
        setSignNotice(REFRESHED_MESSAGE);
        setStep(REVIEW);
    };

    const handleSubmit = () => {
        if (!draft) return;
        const signatureImageBase64 = padRef.current?.toPngBase64();
        if (!signatureImageBase64 || !declared) return;
        submit.mutate(
            {
                id: draft.request.id,
                payload: {
                    signatureImageBase64,
                    documentSha256: draft.session.documentSha256,
                    challenge: draft.session.challenge,
                    declarationAccepted: true,
                },
            },
            {
                onSuccess: () => {
                    drafts.settle();
                    showSuccess('Wniosek wysłany', 'Czeka na akceptację. Dostaniesz powiadomienie.');
                    onClose();
                },
                onError: error => {
                    const { status, message } = leaveApiError(error);
                    if (status === 409) { void refreshSigning(); return; }
                    setSignNotice(message ?? 'Nie udało się wysłać wniosku. Spróbuj ponownie.');
                },
            },
        );
    };

    const close = () => {
        drafts.abandon();
        onClose();
    };

    const clearError = (field: string) => {
        if (errors[field]) setErrors(prev => ({ ...prev, [field]: undefined }));
    };

    const canSubmit = !!draft && hasInk && declared && !submit.isPending && !drafts.refreshing && !!documentQuery.data;

    // ── Stopka: jedno wypełnienie - krok następny ──
    let footer;
    if (step === KIND) {
        footer = (
            <>
                <Button variant="ghost" onClick={close}>Anuluj</Button>
                <FooterPrimary>
                    <PrimaryAction icon={<ArrowRight />} title="Dalej" sub="wybór terminu" disabled={!kind} onClick={() => setStep(TERM)} />
                </FooterPrimary>
            </>
        );
    } else if (step === TERM) {
        footer = (
            <>
                <Button variant="outline" onClick={() => setStep(KIND)}>Wstecz</Button>
                <FooterPrimary>
                    <PrimaryAction
                        icon={<ArrowRight />}
                        title={drafts.isPreparing ? 'Przygotowuję wniosek…' : 'Dalej'}
                        sub="sprawdzenie wniosku"
                        disabled={drafts.isPreparing}
                        onClick={goToReview}
                    />
                </FooterPrimary>
            </>
        );
    } else if (step === REVIEW) {
        footer = (
            <>
                <Button variant="outline" onClick={() => setStep(TERM)} disabled={drafts.refreshing}>Wstecz</Button>
                <FooterPrimary>
                    <PrimaryAction
                        icon={<ArrowRight />}
                        title="Wszystko się zgadza"
                        sub="przejdź do podpisu"
                        disabled={!documentQuery.data || drafts.refreshing}
                        onClick={() => setStep(SIGN)}
                    />
                </FooterPrimary>
            </>
        );
    } else {
        footer = (
            <>
                <Button variant="outline" onClick={() => setStep(REVIEW)} disabled={submit.isPending}>Wstecz</Button>
                <FooterPrimary>
                    <PrimaryAction
                        icon={<PenLine />}
                        title={submit.isPending ? 'Wysyłam…' : 'Podpisz i wyślij wniosek'}
                        sub="kierownik dostanie powiadomienie"
                        disabled={!canSubmit}
                        onClick={handleSubmit}
                    />
                </FooterPrimary>
            </>
        );
    }

    return (
        <LeaveStepModal
            titleId="leave-request-wizard-title"
            title="Wniosek o urlop"
            steps={STEPS}
            current={step}
            stepsLabel="Kroki wniosku"
            footer={footer}
            onClose={close}
            closeOnEscape={!pickerOpen}
        >
            {step === KIND && (
                <LeaveKindStep
                    value={kind}
                    errors={errors}
                    onChange={key => { setKind(key); setErrors({}); }}
                />
            )}

            {step === TERM && kindDef && (
                <LeaveTermStep
                    kind={kindDef}
                    startDate={startDate}
                    endDate={endDate}
                    onStartChange={v => { setStartDate(v); clearError('startDate'); }}
                    onEndChange={v => { setEndDate(v); clearError('endDate'); }}
                    minStart={minStart}
                    reason={reason}
                    onReasonChange={v => { setReason(v); clearError('reason'); }}
                    errors={errors}
                    preview={{ data: preview.data, isFetching: preview.isFetching, error: previewError }}
                    absentNames={absentNames}
                    absentNote="Wniosek możesz złożyć, decyzję podejmie kierownik."
                    onPickerOpenChange={setPickerOpen}
                />
            )}

            {step === REVIEW && draft && kindDef && (
                <Stack>
                    <StepHeading>Sprawdź wniosek</StepHeading>
                    {signNotice && <Notice tone="warn" role="alert">{signNotice}</Notice>}
                    <LeaveSummary
                        who="Prosisz o"
                        kind={kindDef}
                        startDate={draft.request.startDate}
                        endDate={draft.request.endDate}
                        workingDays={draft.request.workingDays}
                        reason={draft.request.reason}
                        holidays={preview.data?.holidays}
                    />
                    <LeavePdf
                        bytes={documentQuery.data?.bytes}
                        isLoading={documentQuery.isLoading || drafts.refreshing}
                        isError={documentQuery.isError}
                        onRetry={() => { void documentQuery.refetch(); }}
                        maxHeight="38vh"
                    />
                </Stack>
            )}

            {step === SIGN && draft && (
                <Stack>
                    <StepHeading>Podpisz wniosek</StepHeading>
                    {signNotice && <Notice tone="warn" role="alert">{signNotice}</Notice>}
                    <SignatureBlock
                        declaration="Znam treść wniosku i podpisuję go."
                        declared={declared}
                        onDeclaredChange={setDeclared}
                        padRef={padRef}
                        onInkChange={setHasInk}
                        hint="Podpis trafi tylko na ten wniosek."
                    />
                </Stack>
            )}
        </LeaveStepModal>
    );
}
