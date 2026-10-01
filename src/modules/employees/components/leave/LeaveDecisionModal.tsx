// src/modules/employees/components/leave/LeaveDecisionModal.tsx
//
// Wniosek u rozpatrującego (/employees/leave-requests?request={id}) - okno krok po
// kroku: 1 Wniosek, 2 Decyzja, 3 Podpis. Zastąpiło boczną szufladę, w której treść,
// dwa przyciski decyzji i edytor podpisu w stopce stały naraz.
//
// Kolejność czytania: ile dni (liczba jest nagłówkiem), kiedy i jaki urlop, powód,
// kto jeszcze jest wtedy nieobecny, dowód podpisu pracownika. Decyzja to osobny krok
// z dwiema kartami wyboru, a podpis - ostatni, z przyciskiem nazwanym tym, co się
// stanie („Podpisz zatwierdzenie" / „Podpisz odmowę").
//
// Kto nie może rozpatrzyć (własny wniosek, odebrane uprawnienie), widzi treść wniosku
// i powód - bez kroków decyzji. Rozpatrzony wniosek: treść, decyzja, PDF do pobrania
// i - dopóki urlop się nie zaczął - „Odwołaj urlop".

import { useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import styled from 'styled-components';
import { ArrowRight, Check, Download, Eye, X } from 'lucide-react';
import { Button, FieldList, FieldRow, Notice, StatusPill, ui } from '@/common/components/ui';
import { useToast } from '@/common/components/Toast';
import type { SignaturePadHandle } from '@/common/components/SignaturePad';
import { formatDateTime } from '@/common/utils';
import { readBlobErrorMessage, saveBlobAsFile } from '@/common/utils/blobFile';
import { leaveApiError, leaveRequestsApi } from '../../api/leaveRequestsApi';
import { LEAVE_REQUESTS_KEY, useLeaveRequestDetail } from '../../hooks/useLeaveRequests';
import { useDecisionSigning, type LeaveDecision } from '../../hooks/useDecisionSigning';
import type { LeaveRequestDetail, LeaveSignatureMethod } from '../../types';
import {
    LEAVE_REQUEST_STATUS, collisionCount, formatLeaveRange, formatLeaveRangeLong, leaveRequestFileName,
    leaveRequestTypeLabel, workingDaysLabel,
} from '../../utils/leaveRequestFormat';
import { PrimaryAction } from './PrimaryAction';
import { LeavePdf } from './LeavePdf';
import { CancelLeaveModal } from './CancelLeaveModal';
import { FooterPrimary, LeaveStepModal, type LeaveStep } from './LeaveStepModal';
import { DecisionChoice, DecisionSignature } from './DecisionParts';
import { Stack, StepHeading } from './LeaveFormSteps';

const STEPS: LeaveStep[] = [
    { key: 'request', label: 'Wniosek' },
    { key: 'decision', label: 'Decyzja' },
    { key: 'sign', label: 'Podpis' },
];
const REQUEST = 0;
const DECISION = 1;
const SIGN = 2;

const SIGNATURE_METHOD: Record<LeaveSignatureMethod, string> = {
    DEVICE_DRAWN: 'odręcznie na swoim urządzeniu',
    SAVED_SIGNATURE: 'zapisanym podpisem',
    IN_PERSON: 'osobiście na urządzeniu studia',
};

const NO_PERMISSION = 'Nie masz już uprawnienia do akceptacji wniosków.';
const NOTE_REQUIRED = 'Przy odmowie podaj uzasadnienie - trafi na dokument.';

interface Props {
    requestId: string;
    onClose: () => void;
}

/**
 * Wywołujący daje oknu `key={requestId}`: głęboki link z kolejnego pusha otwiera
 * inny wniosek, a kroki, decyzja i podpis mają wtedy startować od zera.
 */
export function LeaveDecisionModal({ requestId, onClose }: Props) {
    const { showSuccess, showError } = useToast();
    const detail = useLeaveRequestDetail(requestId);
    const request = detail.data;

    const [step, setStep] = useState(REQUEST);
    const [decision, setDecision] = useState<LeaveDecision | null>(null);
    const [note, setNote] = useState('');
    const [noteError, setNoteError] = useState<string | null>(null);
    const [blocked, setBlocked] = useState<string | null>(null);
    const [cancelOpen, setCancelOpen] = useState(false);
    const [downloading, setDownloading] = useState(false);

    const pending = request?.status === 'PENDING';
    const canDecide = !!request && pending && request.canDecide && !blocked;
    const blockedReason = blocked ?? (request && pending && !request.canDecide ? request.decisionBlockedReason : null);

    const decisionPadRef = useRef<SignaturePadHandle>(null);
    const signing = useDecisionSigning({
        padRef: decisionPadRef,
        requestId,
        active: canDecide && step === SIGN,
        onDone: chosen => {
            showSuccess(
                chosen === 'approve' ? 'Wniosek zatwierdzony' : 'Wniosek odrzucony',
                chosen === 'approve'
                    ? `Urlop ${request?.employeeName ?? ''} jest już w kalendarzu.`
                    : `${request?.employeeName ?? 'Pracownik'} dostanie powiadomienie z uzasadnieniem.`,
            );
            onClose();
        },
        onAlreadyDecided: message => {
            showError('Wniosek został już rozpatrzony', message ?? undefined);
            setStep(REQUEST);
        },
        onForbidden: message => {
            setBlocked(message ?? NO_PERMISSION);
            setStep(REQUEST);
        },
        refetchDetail: async () => (await detail.refetch()).data,
    });

    const handleDownload = async () => {
        if (!request) return;
        setDownloading(true);
        try {
            saveBlobAsFile(await leaveRequestsApi.file(request.id), leaveRequestFileName(request.number));
        } catch (err) {
            showError('Nie udało się pobrać wniosku', (await readBlobErrorMessage(err)) ?? 'Spróbuj ponownie za chwilę.');
        } finally {
            setDownloading(false);
        }
    };

    const goToSign = () => {
        if (decision === 'reject' && !note.trim()) { setNoteError(NOTE_REQUIRED); return; }
        setStep(SIGN);
    };

    const status = request ? LEAVE_REQUEST_STATUS[request.status] : null;
    const collisions = request ? collisionCount(request.overlappingAbsences) : 0;
    const isReject = decision === 'reject';

    let footer = null;
    if (request && canDecide && step === REQUEST) {
        footer = (
            <>
                <Button variant="ghost" onClick={onClose}>Zamknij</Button>
                <FooterPrimary>
                    <PrimaryAction icon={<ArrowRight />} title="Przejdź do decyzji" sub="zatwierdź albo odrzuć" onClick={() => setStep(DECISION)} />
                </FooterPrimary>
            </>
        );
    } else if (request && canDecide && step === DECISION) {
        footer = (
            <>
                <Button variant="outline" onClick={() => setStep(REQUEST)}>Wstecz</Button>
                <FooterPrimary>
                    <PrimaryAction icon={<ArrowRight />} title="Dalej" sub="podpis decyzji" disabled={!decision} onClick={goToSign} />
                </FooterPrimary>
            </>
        );
    } else if (request && canDecide && step === SIGN && decision) {
        footer = (
            <>
                <Button variant="outline" onClick={() => setStep(DECISION)} disabled={signing.isPending}>Wstecz</Button>
                <FooterPrimary>
                    <PrimaryAction
                        icon={isReject ? <X /> : <Check />}
                        title={signing.isPending ? 'Zapisuję…' : isReject ? 'Podpisz odmowę' : 'Podpisz zatwierdzenie'}
                        sub={isReject ? 'pracownik dostanie uzasadnienie' : 'urlop trafi do kalendarza'}
                        disabled={!signing.ready}
                        onClick={() => signing.confirm(decision, note, message => { setNoteError(message); setStep(DECISION); })}
                    />
                </FooterPrimary>
            </>
        );
    } else if (request && !pending) {
        footer = (
            <>
                <Button variant="outline" onClick={() => { void handleDownload(); }} disabled={downloading}>
                    <Download aria-hidden="true" />{downloading ? 'Pobieram…' : 'Pobierz PDF'}
                </Button>
                {request.canCancel && (
                    <FooterPrimary>
                        <Button variant="tintedDanger" onClick={() => setCancelOpen(true)}>Odwołaj urlop</Button>
                    </FooterPrimary>
                )}
            </>
        );
    } else {
        footer = <Button variant="outline" onClick={onClose}>Zamknij</Button>;
    }

    const notFound = detail.isError && leaveApiError(detail.error).status === 404;

    return (
        <LeaveStepModal
            titleId="leave-decision-title"
            title={request?.employeeName ?? 'Wniosek urlopowy'}
            subtitle={request && `Wniosek ${request.number}, złożony ${formatDateTime(request.employeeSignedAt ?? request.createdAt)}`}
            status={request && status && (
                <>
                    <StatusPill $tone={status.tone}>{status.label}</StatusPill>
                    {collisions > 0 && pending && <StatusPill $tone="warn">kolizja: {collisions} os.</StatusPill>}
                </>
            )}
            steps={canDecide ? STEPS : undefined}
            current={step}
            stepsLabel="Kroki decyzji"
            footer={footer}
            onClose={onClose}
            closeOnEscape={!cancelOpen}
            overlays={request && cancelOpen && (
                <CancelLeaveModal
                    request={request}
                    onClose={() => setCancelOpen(false)}
                    onCancelled={() => {
                        setCancelOpen(false);
                        showSuccess('Urlop odwołany', `${request.employeeName} dostanie powiadomienie.`);
                    }}
                />
            )}
        >
            {detail.isLoading && <Muted>Wczytuję wniosek…</Muted>}
            {detail.isError && (
                <Notice tone="danger" role="alert" title={notFound ? 'Nie ma takiego wniosku' : 'Nie udało się wczytać wniosku'}>
                    {notFound
                        ? 'Mógł zostać wycofany albo link jest nieaktualny.'
                        : leaveApiError(detail.error).message ?? 'Spróbuj ponownie za chwilę.'}
                </Notice>
            )}

            {request && (!canDecide || step === REQUEST) && (
                <>
                    {blockedReason && <Notice tone="info">{blockedReason}</Notice>}
                    <LeaveFacts request={request} />
                </>
            )}

            {request && canDecide && step === DECISION && (
                <Stack>
                    <StepHeading>Twoja decyzja</StepHeading>
                    <Recap request={request} />
                    <DecisionChoice
                        decision={decision}
                        onDecisionChange={d => { setDecision(d); setNoteError(null); }}
                        note={note}
                        onNoteChange={v => { setNote(v); setNoteError(null); }}
                        noteError={noteError}
                        approveDetail="Urlop trafi do kalendarza, pracownik dostanie powiadomienie"
                        rejectDetail="Pracownik dostanie powiadomienie z uzasadnieniem"
                    />
                </Stack>
            )}

            {request && canDecide && step === SIGN && decision && (
                <Stack>
                    <StepHeading>{isReject ? 'Podpisz odmowę' : 'Podpisz zatwierdzenie'}</StepHeading>
                    <Recap request={request} />
                    <DecisionSignature requestId={request.id} signing={signing} padRef={decisionPadRef} />
                </Stack>
            )}
        </LeaveStepModal>
    );
}

// ─── Treść wniosku ───────────────────────────────────────────────────────────

/** Jedno zdanie przypomnienia nad decyzją i podpisem: kto, ile, kiedy. */
function Recap({ request }: { request: LeaveRequestDetail }) {
    return (
        <RecapLine>
            {request.employeeName}, {workingDaysLabel(request.workingDays)} ({formatLeaveRange(request.startDate, request.endDate)})
        </RecapLine>
    );
}

function LeaveFacts({ request }: { request: LeaveRequestDetail }) {
    const [previewOpen, setPreviewOpen] = useState(false);
    const fileQuery = useQuery({
        queryKey: [...LEAVE_REQUESTS_KEY, 'file', request.id, request.status],
        queryFn: async () => (await leaveRequestsApi.file(request.id)).arrayBuffer(),
        enabled: previewOpen,
        retry: false,
        staleTime: 60_000,
    });
    const status = LEAVE_REQUEST_STATUS[request.status];
    const signedHow = request.employeeSignatureMethod ? SIGNATURE_METHOD[request.employeeSignatureMethod] : null;

    return (
        <Stack>
            <Headline>
                <h3>{workingDaysLabel(request.workingDays)}</h3>
                <p>{leaveRequestTypeLabel(request.leaveType, request.onDemand)}, {formatLeaveRangeLong(request.startDate, request.endDate)}</p>
            </Headline>

            <FieldList>
                <FieldRow label="Powód">{request.reason ?? 'nie podano'}</FieldRow>
            </FieldList>

            <Section>
                <SectionTitle>Kto jeszcze jest wtedy nieobecny</SectionTitle>
                {request.overlappingAbsences.length === 0 ? (
                    <Muted>W tym terminie nikt inny nie jest nieobecny.</Muted>
                ) : (
                    <AbsenceList>
                        {request.overlappingAbsences.map(a => (
                            <li key={`${a.employeeId}-${a.startDate}-${a.kind}`}>
                                <Swatch $pending={a.kind === 'PENDING_REQUEST'} aria-hidden="true" />
                                <strong>{a.employeeName}</strong>
                                <span>{formatLeaveRange(a.startDate, a.endDate)}</span>
                                <em>{a.kind === 'PENDING_REQUEST' ? 'wniosek oczekuje' : 'nieobecność'}</em>
                            </li>
                        ))}
                    </AbsenceList>
                )}
            </Section>

            <Section>
                <SectionTitle>Podpis pracownika</SectionTitle>
                <FieldList>
                    <FieldRow label="Podpisano">
                        {request.employeeSignedAt
                            ? `${formatDateTime(request.employeeSignedAt)}${signedHow ? `, ${signedHow}` : ''}`
                            : 'brak podpisu'}
                    </FieldRow>
                    {request.origin === 'ON_BEHALF' && request.createdByName && (
                        <FieldRow label="Wprowadził(a)">{request.createdByName}</FieldRow>
                    )}
                    <FieldRow label="Dokument">
                        <Button variant="ghost" size="sm" onClick={() => setPreviewOpen(o => !o)} aria-expanded={previewOpen}>
                            <Eye aria-hidden="true" />{previewOpen ? 'Ukryj podgląd' : 'Podgląd dokumentu'}
                        </Button>
                    </FieldRow>
                </FieldList>
                {previewOpen && (
                    <LeavePdf
                        bytes={fileQuery.data}
                        isLoading={fileQuery.isLoading}
                        isError={fileQuery.isError}
                        onRetry={() => { void fileQuery.refetch(); }}
                        maxHeight="40vh"
                    />
                )}
            </Section>

            {request.status !== 'PENDING' && (request.decidedAt || request.cancelReason) && (
                <Section>
                    <SectionTitle>Decyzja</SectionTitle>
                    <FieldList>
                        {request.decidedAt && (
                            <FieldRow label={status.label}>
                                {request.decidedByName ? `${request.decidedByName}, ${formatDateTime(request.decidedAt)}` : formatDateTime(request.decidedAt)}
                            </FieldRow>
                        )}
                        {request.decisionNote && <FieldRow label="Uzasadnienie">{request.decisionNote}</FieldRow>}
                        {request.cancelReason && <FieldRow label="Powód odwołania">{request.cancelReason}</FieldRow>}
                    </FieldList>
                </Section>
            )}
        </Stack>
    );
}

// ─── Styled ─────────────────────────────────────────────────────────────────────

const Muted = styled.p`
    margin: 0;
    font-size: 13.5px;
    color: ${ui.textMuted};
`;

const Headline = styled.div`
    display: flex;
    flex-direction: column;
    gap: 2px;

    h3 { margin: 0; font-size: 28px; font-weight: 700; letter-spacing: -0.015em; color: ${ui.ink}; }
    p { margin: 0; font-size: 14px; line-height: 1.45; color: ${ui.textSecondary}; }
`;

const RecapLine = styled.p`
    margin: -6px 0 0;
    font-size: 14px;
    color: ${ui.textSecondary};
`;

const Section = styled.section`
    display: flex;
    flex-direction: column;
    gap: 8px;
`;

const SectionTitle = styled.h4`
    margin: 0;
    font-size: 15px;
    font-weight: 700;
    color: ${ui.ink};
`;

const AbsenceList = styled.ul`
    margin: 0;
    padding: 0;
    list-style: none;
    display: flex;
    flex-direction: column;
    gap: 6px;

    li {
        display: flex;
        align-items: center;
        flex-wrap: wrap;
        gap: 4px 10px;
        font-size: 13.5px;
        color: ${ui.inkSoft};
    }
    strong { font-weight: 600; color: ${ui.ink}; }
    em { font-style: normal; font-size: 12.5px; color: ${ui.warnInk}; }
`;

/** Pełny bursztyn = nieobecność pewna; kreskowanie = wniosek jeszcze nierozpatrzony. */
const Swatch = styled.span<{ $pending: boolean }>`
    width: 12px;
    height: 12px;
    flex-shrink: 0;
    border-radius: 3px;
    border: 1px solid ${ui.warnLine};
    background: ${p => p.$pending
        ? `repeating-linear-gradient(135deg, #fef3c7 0 2px, #ffffff 2px 4px)`
        : '#fef3c7'};
`;
