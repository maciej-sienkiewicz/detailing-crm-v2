// src/modules/employees/components/leave/AddLeaveModal.tsx
//
// „Dodaj urlop" w zakładce Wnioski urlopowe: urlop wprowadzany przez administratora
// za pracownika (kontrakt v2, `origin: ON_BEHALF`). Pracownik nie musi mieć konta.
//
// Dwa podpisy zostają, jak na każdym wniosku: najpierw pracownik podpisuje osobiście
// na tym urządzeniu (metoda IN_PERSON - dlatego krok 4 każe przekazać mu urządzenie
// i mówi jego głosem), potem administrator rozpatruje go zwykłą decyzją z podpisem.
// Wnioskodawcą jest pracownik, więc to nie jest samozatwierdzenie.
//
// Zamknięcie przed podpisem pracownika porzuca szkic (POST /discard). Po podpisie
// pracownika wniosek jest już zwykłym PENDING - zamknięcie przed decyzją zostawia go
// w kolejce i okno mówi to wprost, zanim się zamknie.

import { useMemo, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import styled from 'styled-components';
import { ArrowRight, Check, PenLine, UserRound, X } from 'lucide-react';
import { Button, ChoiceCard, ChoiceList, Notice, ui } from '@/common/components/ui';
import { ConfirmationModal } from '@/common/components/ConfirmationModal';
import { useToast } from '@/common/components/Toast';
import type { SignaturePadHandle } from '@/common/components/SignaturePad';
import { useAuth } from '@/core/context/AuthContext';
import { leaveApiError, leaveRequestsApi } from '../../api/leaveRequestsApi';
import { useEmployees } from '../../hooks/useEmployees';
import {
    LEAVE_REQUESTS_KEY, useAbsentColleagues, useEmployeeSignature, useLeaveRequestPreview,
} from '../../hooks/useLeaveRequests';
import { useLeaveDraft, type LeaveDraftEndpoints } from '../../hooks/useLeaveDraft';
import { useDecisionSigning, type LeaveDecision } from '../../hooks/useDecisionSigning';
import type { CreateOnBehalfLeaveRequestPayload, EmployeeListItem, LeaveRequestDetail } from '../../types';
import { LEAVE_REASON_MAX, addDaysIso, formatLeaveRange, todayIso, workingDaysLabel } from '../../utils/leaveRequestFormat';
import { PrimaryAction } from './PrimaryAction';
import { LeavePdf } from './LeavePdf';
import { FooterPrimary, LeaveStepModal, type LeaveStep } from './LeaveStepModal';
import {
    LeaveKindStep, LeaveSummary, LeaveTermStep, Lead, SignatureBlock, Stack, StepHeading, type FieldErrors,
} from './LeaveFormSteps';
import { DecisionChoice, DecisionSignature } from './DecisionParts';
import { LEAVE_KINDS, TERM_FIELDS, type LeaveKindKey } from './leaveKinds';
import { FieldError, Hint } from './leaveForm.styles';

const STEPS: LeaveStep[] = [
    { key: 'employee', label: 'Pracownik' },
    { key: 'kind', label: 'Rodzaj' },
    { key: 'term', label: 'Termin' },
    { key: 'employee-sign', label: 'Podpis pracownika' },
    { key: 'decision', label: 'Twoja decyzja' },
];
const EMPLOYEE = 0;
const KIND = 1;
const TERM = 2;
const EMPLOYEE_SIGN = 3;
const DECIDE = 4;

const REFRESHED_MESSAGE = 'Dokument został odświeżony. Sprawdź go i podpisz ponownie.';
const NOTE_REQUIRED = 'Przy odmowie podaj uzasadnienie - trafi na dokument.';

const ON_BEHALF_DRAFT: LeaveDraftEndpoints<CreateOnBehalfLeaveRequestPayload> = {
    create: leaveRequestsApi.create,
    discard: leaveRequestsApi.discard,
    newSession: leaveRequestsApi.employeeSigningSession,
};

interface Props {
    onClose: () => void;
}

export function AddLeaveModal({ onClose }: Props) {
    const { user } = useAuth();
    const { showSuccess, showError } = useToast();
    const selfEmployeeId = user?.employeeId ?? null;

    const [step, setStep] = useState(EMPLOYEE);
    const [employeeId, setEmployeeId] = useState<string | null>(null);
    const [kind, setKind] = useState<LeaveKindKey | null>(null);
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [reason, setReason] = useState('');
    const [errors, setErrors] = useState<FieldErrors>({});
    const [termNotice, setTermNotice] = useState<string | null>(null);
    const [pickerOpen, setPickerOpen] = useState(false);
    const [confirmClose, setConfirmClose] = useState(false);

    // ── Krok 1: pracownik - bez siebie (własny wniosek składa się w zakładce Urlop) ──
    const { employees: all, isLoading: employeesLoading, isError: employeesFailed, refetch: refetchEmployees } =
        useEmployees({ search: '', page: 1, limit: 100 });
    const employees = useMemo(() => all.filter(e => e.id !== selfEmployeeId), [all, selfEmployeeId]);
    const employee: EmployeeListItem | null = employees.find(e => e.id === employeeId) ?? null;
    const name = employee?.fullName ?? 'Pracownik';

    // ── Krok 2-3: rodzaj i termin ──
    const kindDef = LEAVE_KINDS.find(k => k.key === kind) ?? null;
    const today = todayIso();
    const minStart = kindDef?.onDemand ? today : addDaysIso(today, 1);
    const preview = useLeaveRequestPreview(startDate, endDate, employeeId);
    const previewError = preview.isError ? leaveApiError(preview.error) : null;
    const absentNames = useAbsentColleagues(startDate, endDate, employeeId, true);

    // ── Krok 4: podpis pracownika na tym urządzeniu ──
    const drafts = useLeaveDraft(ON_BEHALF_DRAFT);
    const draft = drafts.draft;
    const [signed, setSigned] = useState<LeaveRequestDetail | null>(null);
    const employeeSignature = useEmployeeSignature();
    const documentQuery = useQuery({
        queryKey: [...LEAVE_REQUESTS_KEY, 'draft-document', draft?.request.id ?? '', draft?.session.challenge ?? ''],
        queryFn: () => leaveRequestsApi.document(draft!.request.id),
        enabled: step === EMPLOYEE_SIGN && !!draft && !signed,
        retry: false,
        staleTime: Infinity,
        gcTime: 0,
    });
    const padRef = useRef<SignaturePadHandle>(null);
    const [hasInk, setHasInk] = useState(false);
    const [declared, setDeclared] = useState(false);
    const [signNotice, setSignNotice] = useState<string | null>(null);

    // ── Krok 5: decyzja administratora ──
    const [decision, setDecision] = useState<LeaveDecision>('approve');
    const [note, setNote] = useState('');
    const [noteError, setNoteError] = useState<string | null>(null);
    const [blocked, setBlocked] = useState<string | null>(null);

    const finish = (title: string, message: string) => {
        showSuccess(title, message);
        onClose();
    };

    const decisionPadRef = useRef<SignaturePadHandle>(null);
    const signing = useDecisionSigning({
        padRef: decisionPadRef,
        requestId: signed?.id ?? null,
        active: step === DECIDE && !!signed && !blocked,
        onDone: chosen => finish(
            chosen === 'approve' ? 'Urlop dodany' : 'Wniosek odrzucony',
            chosen === 'approve'
                ? `${name}, ${formatLeaveRange(signed!.startDate, signed!.endDate)}. Urlop jest już w kalendarzu.`
                : `${name} dostanie powiadomienie z uzasadnieniem.`,
        ),
        onAlreadyDecided: message => finish('Wniosek został już rozpatrzony', message ?? 'Ktoś zdążył przed Tobą.'),
        onForbidden: message => setBlocked(message ?? 'Nie masz już uprawnienia do akceptacji wniosków.'),
        refetchDetail: async () => {
            if (!signed) return undefined;
            try { return await leaveRequestsApi.get(signed.id); } catch { return undefined; }
        },
    });

    const payload = (): CreateOnBehalfLeaveRequestPayload | null => {
        if (!kindDef || !employeeId) return null;
        const trimmedReason = reason.trim();
        return {
            employeeId,
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

    const goToEmployeeSign = () => {
        const body = payload();
        if (!body) return;
        const local = validateTerm();
        if (Object.keys(local).length > 0) { setErrors(local); return; }
        setTermNotice(null);
        drafts.prepare(body, {
            onReady: (_draft, fresh) => {
                setErrors({});
                if (fresh) { setSignNotice(null); setDeclared(false); }
                setStep(EMPLOYEE_SIGN);
            },
            onError: error => {
                const { status, field, message } = leaveApiError(error);
                if (field && message) {
                    setErrors({ [field]: message });
                    if (field === 'employeeId') setStep(EMPLOYEE);
                    else if (!TERM_FIELDS.has(field)) setStep(KIND);
                    return;
                }
                // 403 „Własny wniosek złóż w zakładce Urlop", 404 „Nie znaleziono pracownika" -
                // zdanie z serwera mówi wszystko, więc stoi w oknie, a nie w dymku bez kontekstu.
                if ((status === 403 || status === 404) && message) { setTermNotice(message); return; }
                showError('Nie udało się przygotować wniosku', message ?? 'Spróbuj ponownie za chwilę.');
            },
        });
    };

    /** 409 przy podpisie pracownika: nowa sesja, nowy dokument, czysty pad, oświadczenie od nowa. */
    const refreshEmployeeSigning = async () => {
        padRef.current?.clear();
        setDeclared(false);
        const ok = await drafts.refreshSession();
        setSignNotice(ok ? REFRESHED_MESSAGE : 'Nie udało się odświeżyć dokumentu. Zamknij okno i zacznij od nowa.');
    };

    const handleEmployeeSign = () => {
        if (!draft) return;
        const signatureImageBase64 = padRef.current?.toPngBase64();
        if (!signatureImageBase64 || !declared) return;
        employeeSignature.mutate(
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
                onSuccess: request => {
                    // Od tej chwili to wniosek w kolejce, a nie szkic do porzucenia.
                    drafts.settle();
                    setSigned(request);
                    setStep(DECIDE);
                },
                onError: error => {
                    const { status, message } = leaveApiError(error);
                    if (status === 409) { void refreshEmployeeSigning(); return; }
                    setSignNotice(message ?? 'Nie udało się zapisać podpisu. Spróbuj ponownie.');
                },
            },
        );
    };

    const handleDecide = () => {
        if (decision === 'reject' && !note.trim()) { setNoteError(NOTE_REQUIRED); return; }
        signing.confirm(decision, note, setNoteError);
    };

    // Po podpisie pracownika wniosek już istnieje - zamknięcie nie może udawać, że go nie ma.
    const requestClose = () => {
        if (signed && !blocked) { setConfirmClose(true); return; }
        drafts.abandon();
        onClose();
    };

    const clearError = (field: string) => {
        if (errors[field]) setErrors(prev => ({ ...prev, [field]: undefined }));
    };

    const canEmployeeSign = !!draft && hasInk && declared && !employeeSignature.isPending && !drafts.refreshing
        && !!documentQuery.data;
    const isReject = decision === 'reject';

    let footer;
    if (step === EMPLOYEE) {
        footer = (
            <>
                <Button variant="ghost" onClick={requestClose}>Anuluj</Button>
                <FooterPrimary>
                    <PrimaryAction icon={<ArrowRight />} title="Dalej" sub="rodzaj urlopu" disabled={!employee} onClick={() => setStep(KIND)} />
                </FooterPrimary>
            </>
        );
    } else if (step === KIND) {
        footer = (
            <>
                <Button variant="outline" onClick={() => setStep(EMPLOYEE)}>Wstecz</Button>
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
                        sub="podpis pracownika"
                        disabled={drafts.isPreparing}
                        onClick={goToEmployeeSign}
                    />
                </FooterPrimary>
            </>
        );
    } else if (step === EMPLOYEE_SIGN) {
        footer = (
            <>
                <Button variant="outline" onClick={() => setStep(TERM)} disabled={employeeSignature.isPending}>Wstecz</Button>
                <FooterPrimary>
                    <PrimaryAction
                        icon={<PenLine />}
                        title={employeeSignature.isPending ? 'Zapisuję podpis…' : 'Podpisuję wniosek'}
                        sub="potem decyzja przełożonego"
                        disabled={!canEmployeeSign}
                        onClick={handleEmployeeSign}
                    />
                </FooterPrimary>
            </>
        );
    } else if (blocked) {
        footer = <Button variant="outline" onClick={onClose}>Zamknij</Button>;
    } else {
        footer = (
            <>
                <Button variant="ghost" onClick={requestClose} disabled={signing.isPending}>Rozpatrzę później</Button>
                <FooterPrimary>
                    <PrimaryAction
                        icon={isReject ? <X /> : <Check />}
                        title={signing.isPending ? 'Zapisuję…' : isReject ? 'Podpisz odmowę' : 'Podpisz zatwierdzenie'}
                        sub={isReject ? 'pracownik dostanie uzasadnienie' : 'urlop trafi do kalendarza'}
                        disabled={!signing.ready || (isReject && !note.trim())}
                        onClick={handleDecide}
                    />
                </FooterPrimary>
            </>
        );
    }

    return (
        <LeaveStepModal
            titleId="add-leave-title"
            title="Dodaj urlop"
            subtitle={employee && step > EMPLOYEE ? `${employee.fullName}${kindDef && step > KIND ? `, ${kindDef.title.toLowerCase()}` : ''}` : 'Za pracownika, z jego podpisem i Twoją decyzją'}
            steps={STEPS}
            current={step}
            stepsLabel="Kroki dodawania urlopu"
            footer={footer}
            onClose={requestClose}
            closeOnEscape={!pickerOpen && !confirmClose}
            overlays={(
                <ConfirmationModal
                    isOpen={confirmClose}
                    variant="info"
                    title="Zamknąć bez decyzji?"
                    message={`${name} już podpisał(a) wniosek. Zostanie w kolejce „Oczekujące" i rozpatrzysz go później.`}
                    confirmText="Zamknij, rozpatrzę później"
                    cancelText="Wróć do decyzji"
                    onConfirm={() => {
                        showSuccess('Wniosek czeka w kolejce', `${name}, ${signed ? formatLeaveRange(signed.startDate, signed.endDate) : ''}.`);
                        onClose();
                    }}
                    onCancel={() => setConfirmClose(false)}
                />
            )}
        >
            {step === EMPLOYEE && (
                <Stack>
                    <StepHeading>Czyj to urlop?</StepHeading>
                    <Lead>Pracownik nie musi mieć konta w systemie - podpisze wniosek na tym urządzeniu.</Lead>
                    {errors.employeeId && <FieldError role="alert">{errors.employeeId}</FieldError>}
                    {employeesFailed ? (
                        <Notice
                            tone="danger"
                            role="alert"
                            title="Nie udało się wczytać pracowników"
                            action={<Button variant="outline" size="sm" onClick={() => refetchEmployees()}>Spróbuj ponownie</Button>}
                        />
                    ) : employeesLoading ? (
                        <Hint>Wczytuję pracowników…</Hint>
                    ) : employees.length === 0 ? (
                        <Hint>Nie ma jeszcze innych pracowników. Dodaj ich w zakładce Zespół.</Hint>
                    ) : (
                        <ChoiceList role="radiogroup" aria-label="Pracownik">
                            {employees.map(e => (
                                <ChoiceCard
                                    key={e.id}
                                    type="radio"
                                    name="leave-employee"
                                    checked={employeeId === e.id}
                                    onChange={() => { setEmployeeId(e.id); setErrors({}); }}
                                    title={e.fullName}
                                    detail={e.hasAccount ? (e.role?.name ?? 'ma konto w systemie') : 'bez konta w systemie'}
                                    icon={<UserRound />}
                                />
                            ))}
                        </ChoiceList>
                    )}
                </Stack>
            )}

            {step === KIND && (
                <LeaveKindStep
                    value={kind}
                    errors={errors}
                    lead={employee ? `Urlop dla: ${employee.fullName}` : undefined}
                    onChange={key => { setKind(key); setErrors({}); }}
                />
            )}

            {step === TERM && kindDef && (
                <>
                    {termNotice && <Notice tone="danger" role="alert">{termNotice}</Notice>}
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
                        absentNote="To tylko informacja - urlop możesz dodać."
                        onPickerOpenChange={setPickerOpen}
                    />
                </>
            )}

            {step === EMPLOYEE_SIGN && draft && kindDef && (
                <Stack>
                    <HandOver>
                        <strong>Przekaż urządzenie pracownikowi</strong>
                        <span>{name} czyta wniosek i podpisuje go palcem. Potem urządzenie wraca do Ciebie.</span>
                    </HandOver>
                    {signNotice && <Notice tone="warn" role="alert">{signNotice}</Notice>}
                    <LeaveSummary
                        who={`${name} prosi o`}
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
                        maxHeight="30vh"
                    />
                    <SignatureBlock
                        declaration={`Ja, ${name}, znam treść wniosku i podpisuję go osobiście.`}
                        declared={declared}
                        onDeclaredChange={setDeclared}
                        padRef={padRef}
                        onInkChange={setHasInk}
                        placeholder="Podpis pracownika"
                    />
                </Stack>
            )}

            {step === DECIDE && signed && (
                <Stack>
                    <StepHeading>Twoja decyzja</StepHeading>
                    <Notice tone="ok" title={`${name} podpisał(a) wniosek`}>
                        {workingDaysLabel(signed.workingDays)}, {formatLeaveRange(signed.startDate, signed.endDate)}. Urządzenie wraca do Ciebie.
                    </Notice>
                    {blocked ? (
                        <Notice tone="info">{blocked} Wniosek czeka w kolejce „Oczekujące".</Notice>
                    ) : (
                        <>
                            <DecisionChoice
                                decision={decision}
                                onDecisionChange={d => { setDecision(d); setNoteError(null); }}
                                note={note}
                                onNoteChange={v => { setNote(v); setNoteError(null); }}
                                noteError={noteError}
                                approveDetail="Urlop trafi do kalendarza"
                                rejectDetail="Wymaga uzasadnienia, trafi do pracownika"
                            />
                            <DecisionSignature requestId={signed.id} signing={signing} padRef={decisionPadRef} />
                        </>
                    )}
                </Stack>
            )}
        </LeaveStepModal>
    );
}

// ─── Styled ─────────────────────────────────────────────────────────────────────

/** Zmiana osoby przy urządzeniu - pierwsze, co widać w tym kroku. */
const HandOver = styled.div`
    display: flex;
    flex-direction: column;
    gap: 4px;
    padding: 14px 16px;
    border-radius: ${ui.radiusPanel};
    border: 1px solid ${ui.brandLineSoft};
    background: ${ui.brandTint};

    strong { font-size: 17px; font-weight: 700; letter-spacing: -0.01em; color: ${ui.brandDeep}; }
    span { font-size: 14px; line-height: 1.45; color: ${ui.inkSoft}; }
`;
