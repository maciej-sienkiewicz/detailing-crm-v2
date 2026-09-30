// src/modules/employees/components/leave/LeaveRequestDrawer.tsx
//
// Szuflada wniosku u rozpatrującego (/employees/leave-requests?request={id}).
//
// Kolejność czytania: kto i na ile (liczba dni jest nagłówkiem sekcji), kto jeszcze
// jest wtedy nieobecny, zastępstwo i powód, dowód podpisu pracownika. W stopce jedno
// wypełnienie - „Zatwierdź i podpisz"; „Odrzuć" ma czerwień jako odcień i obwódkę
// (CLAUDE.md §2). Kliknięcie którejkolwiek zamienia stopkę w edytor podpisu decyzji -
// stan przejściowy, więc jego „Podpisz…" jest na ten moment krokiem następnym.
//
// Odmowa też jest decyzją pracodawcy na dokumencie, więc też jest podpisana. Uprawnienie
// sprawdza backend ponownie w chwili decyzji: 403 chowa stopkę, 409 znaczy, że ktoś
// rozpatrzył wniosek pierwszy albo dokument się zmienił.

import { useEffect, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import styled from 'styled-components';
import { Check, Download, Eye, X } from 'lucide-react';
import {
    Button, DrawerBody, DrawerFooterSpacer, FieldList, FieldRow, Notice, SideDrawer, StatusPill, ui,
} from '@/common/components/ui';
import { useToast } from '@/common/components/Toast';
import { SignaturePad, type SignaturePadHandle } from '@/common/components/SignaturePad';
import { formatDateTime } from '@/common/utils';
import { readBlobErrorMessage, saveBlobAsFile } from '@/common/utils/blobFile';
import { profileApi } from '@/modules/profile/api/profileApi';
import { leaveApiError, leaveRequestsApi } from '../../api/leaveRequestsApi';
import {
    LEAVE_REQUESTS_KEY, useDecideLeaveRequest, useDecisionSession, useLeaveRequestDetail,
} from '../../hooks/useLeaveRequests';
import type { LeaveRequestDetail, LeaveSignatureMethod, SigningSession } from '../../types';
import {
    LEAVE_NOTE_MAX, LEAVE_REQUEST_STATUS, collisionCount, formatLeaveRange, leaveRequestFileName,
    leaveRequestTypeLabel, workingDaysLabel,
} from '../../utils/leaveRequestFormat';
import { PrimaryAction } from './PrimaryAction';
import { LeavePdf } from './LeavePdf';
import { CancelLeaveModal } from './CancelLeaveModal';
import { CharCounter, Check as CheckLabel, Field, FieldError, Label, LabelRow, Textarea } from './leaveForm.styles';

type Decision = 'approve' | 'reject';

const SIGNATURE_METHOD: Record<LeaveSignatureMethod, string> = {
    DEVICE_DRAWN: 'odręcznie na urządzeniu',
    SAVED_SIGNATURE: 'zapisanym podpisem',
};

const NO_PERMISSION = 'Nie masz już uprawnienia do akceptacji wniosków.';

interface Props {
    requestId: string;
    onClose: () => void;
}

/**
 * Wywołujący daje szufladzie `key={requestId}`: głęboki link z kolejnego pusha otwiera
 * inny wniosek, a edytor podpisu i podgląd mają wtedy startować od zera.
 */
export function LeaveRequestDrawer({ requestId, onClose }: Props) {
    const { showSuccess, showError } = useToast();
    const detail = useLeaveRequestDetail(requestId);
    const request = detail.data;

    const [mode, setMode] = useState<Decision | null>(null);
    const [blocked, setBlocked] = useState<string | null>(null);
    const [previewOpen, setPreviewOpen] = useState(false);
    const [cancelOpen, setCancelOpen] = useState(false);
    const [downloading, setDownloading] = useState(false);

    const fileQuery = useQuery({
        queryKey: [...LEAVE_REQUESTS_KEY, 'file', requestId, request?.status ?? ''],
        queryFn: async () => (await leaveRequestsApi.file(requestId)).arrayBuffer(),
        enabled: previewOpen && !!request,
        retry: false,
        staleTime: 60_000,
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

    const status = request ? LEAVE_REQUEST_STATUS[request.status] : null;
    const collisions = request ? collisionCount(request.overlappingAbsences) : 0;
    const blockedReason = blocked
        ?? (request && request.status === 'PENDING' && !request.canDecide ? request.decisionBlockedReason : null);
    const canDecide = !!request && request.status === 'PENDING' && request.canDecide && !blocked;

    let footer = null;
    if (request && mode && canDecide) {
        footer = (
            <DecisionEditor
                key={mode}
                request={request}
                decision={mode}
                onCancel={() => setMode(null)}
                onDone={decision => {
                    showSuccess(
                        decision === 'approve' ? 'Wniosek zatwierdzony' : 'Wniosek odrzucony',
                        decision === 'approve'
                            ? `Urlop ${request.employeeName} jest już w kalendarzu.`
                            : `${request.employeeName} dostanie powiadomienie z uzasadnieniem.`,
                    );
                    setMode(null);
                }}
                onAlreadyDecided={message => {
                    showError('Wniosek został już rozpatrzony', message ?? undefined);
                    setMode(null);
                }}
                onForbidden={message => {
                    setBlocked(message ?? NO_PERMISSION);
                    setMode(null);
                }}
                refetchDetail={async () => (await detail.refetch()).data}
            />
        );
    } else if (request && canDecide) {
        footer = (
            <>
                <Button variant="tintedDanger" size="lg" onClick={() => setMode('reject')}>
                    <X aria-hidden="true" />Odrzuć
                </Button>
                <DrawerFooterSpacer />
                <PrimaryAction
                    icon={<Check />}
                    title="Zatwierdź i podpisz"
                    sub="utworzy urlop w kalendarzu"
                    onClick={() => setMode('approve')}
                />
            </>
        );
    } else if (request && request.status !== 'PENDING') {
        footer = (
            <>
                <Button variant="outline" onClick={() => { void handleDownload(); }} disabled={downloading}>
                    <Download aria-hidden="true" />{downloading ? 'Pobieram…' : 'Pobierz PDF'}
                </Button>
                <DrawerFooterSpacer />
                {request.canCancel && (
                    <Button variant="tintedDanger" onClick={() => setCancelOpen(true)}>Odwołaj urlop</Button>
                )}
            </>
        );
    }

    const notFound = detail.isError && leaveApiError(detail.error).status === 404;

    return (
        <SideDrawer
            onClose={onClose}
            escapeEnabled={!cancelOpen}
            title={request?.employeeName ?? 'Wniosek urlopowy'}
            titleId="leave-request-drawer-title"
            status={request && status && (
                <>
                    <StatusPill $tone={status.tone}>{status.label}</StatusPill>
                    {collisions > 0 && request.status === 'PENDING' && (
                        <StatusPill $tone="warn">kolizja: {collisions} os.</StatusPill>
                    )}
                </>
            )}
            subtitle={request && (
                <span>wniosek {request.number}, złożony {formatDateTime(request.employeeSignedAt ?? request.createdAt)}</span>
            )}
            footer={footer}
            width={560}
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
            <DrawerBody>
                {detail.isLoading && <Muted>Wczytuję wniosek…</Muted>}
                {detail.isError && (
                    <Notice tone="danger" role="alert" title={notFound ? 'Nie ma takiego wniosku' : 'Nie udało się wczytać wniosku'}>
                        {notFound
                            ? 'Mógł zostać wycofany albo link jest nieaktualny.'
                            : leaveApiError(detail.error).message ?? 'Spróbuj ponownie za chwilę.'}
                    </Notice>
                )}

                {request && (
                    <>
                        {blockedReason && <Notice tone="info">{blockedReason}</Notice>}

                        <Headline>
                            <h3>{workingDaysLabel(request.workingDays)}</h3>
                            <p>
                                {formatLeaveRange(request.startDate, request.endDate)},{' '}
                                {leaveRequestTypeLabel(request.leaveType, request.onDemand).toLowerCase()}
                            </p>
                        </Headline>

                        <Section>
                            <SectionTitle>Obsada w tych dniach</SectionTitle>
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
                            <SectionTitle>Zastępstwo i powód</SectionTitle>
                            <FieldList>
                                <FieldRow label="Osoba zastępująca">{request.substituteName ?? 'bez zastępstwa'}</FieldRow>
                                <FieldRow label="Powód">{request.reason ?? 'nie podano'}</FieldRow>
                            </FieldList>
                        </Section>

                        <Section>
                            <SectionTitle>Podpis pracownika</SectionTitle>
                            <FieldList>
                                <FieldRow label="Podpisano">
                                    {request.employeeSignedAt
                                        ? `${formatDateTime(request.employeeSignedAt)}${request.employeeSignatureMethod ? `, ${SIGNATURE_METHOD[request.employeeSignatureMethod]}` : ''}`
                                        : 'brak podpisu'}
                                </FieldRow>
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
                                />
                            )}
                        </Section>

                        {request.status !== 'PENDING' && (request.decidedAt || request.cancelReason) && (
                            <Section>
                                <SectionTitle>Decyzja</SectionTitle>
                                <FieldList>
                                    {request.decidedAt && (
                                        <FieldRow label={status?.label ?? 'Rozpatrzono'}>
                                            {[request.decidedByName, formatDateTime(request.decidedAt)].filter(Boolean).join(', ')}
                                        </FieldRow>
                                    )}
                                    {request.decidedByBasis && (
                                        <FieldRow label="Podstawa">
                                            {request.decidedByBasis === 'OWNER'
                                                ? 'Właściciel studia'
                                                : `Uprawnienie${request.decidedByRoleName ? `, rola: ${request.decidedByRoleName}` : ''}`}
                                        </FieldRow>
                                    )}
                                    {request.decisionNote && <FieldRow label="Uzasadnienie">{request.decisionNote}</FieldRow>}
                                    {request.cancelReason && <FieldRow label="Powód odwołania">{request.cancelReason}</FieldRow>}
                                </FieldList>
                            </Section>
                        )}
                    </>
                )}
            </DrawerBody>
        </SideDrawer>
    );
}

// ─── Edytor podpisu decyzji ──────────────────────────────────────────────────

interface EditorProps {
    request: LeaveRequestDetail;
    decision: Decision;
    onCancel: () => void;
    onDone: (decision: Decision) => void;
    onAlreadyDecided: (message: string | null) => void;
    onForbidden: (message: string | null) => void;
    refetchDetail: () => Promise<LeaveRequestDetail | undefined>;
}

function DecisionEditor({ request, decision, onCancel, onDone, onAlreadyDecided, onForbidden, refetchDetail }: EditorProps) {
    const sessionMutation = useDecisionSession();
    const decide = useDecideLeaveRequest();
    const padRef = useRef<SignaturePadHandle>(null);

    const [session, setSession] = useState<SigningSession | null>(null);
    const [hasInk, setHasInk] = useState(false);
    const [useSaved, setUseSaved] = useState(false);
    const [note, setNote] = useState('');
    const [noteError, setNoteError] = useState<string | null>(null);
    const [notice, setNotice] = useState<string | null>(null);
    const [docOpen, setDocOpen] = useState(false);

    const savedSignature = useQuery({
        queryKey: ['profile', 'signature'],
        queryFn: profileApi.getSignature,
        staleTime: 60_000,
    });
    const hasSaved = !!savedSignature.data?.hasSignature;

    const documentQuery = useQuery({
        queryKey: [...LEAVE_REQUESTS_KEY, 'document', request.id, session?.challenge ?? ''],
        queryFn: () => leaveRequestsApi.document(request.id),
        enabled: docOpen && !!session,
        retry: false,
        staleTime: Infinity,
        gcTime: 0,
    });

    const handleSessionError = (error: unknown) => {
        const { status, message } = leaveApiError(error);
        if (status === 409) { onAlreadyDecided(message); void refetchDetail(); return; }
        if (status === 403) { onForbidden(message); void refetchDetail(); return; }
        setNotice(message ?? 'Nie udało się przygotować podpisu. Spróbuj ponownie.');
    };

    const openSession = () => {
        sessionMutation.mutate(request.id, { onSuccess: setSession, onError: handleSessionError });
    };

    // Sesja podpisu jest jednorazowa - bierzemy ją w chwili otwarcia edytora.
    useEffect(() => {
        openSession();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [request.id]);

    const isReject = decision === 'reject';
    const trimmedNote = note.trim();
    const canConfirm = !!session && (useSaved ? hasSaved : hasInk)
        && (!isReject || trimmedNote.length > 0) && !decide.isPending && !sessionMutation.isPending;

    const confirm = () => {
        if (!session) return;
        if (isReject && !trimmedNote) { setNoteError('Przy odmowie podaj uzasadnienie - trafi na dokument.'); return; }
        const signatureImageBase64 = useSaved ? undefined : padRef.current?.toPngBase64() ?? undefined;
        if (!useSaved && !signatureImageBase64) return;
        setNotice(null);
        decide.mutate(
            {
                id: request.id,
                decision,
                payload: {
                    ...(signatureImageBase64 ? { signatureImageBase64 } : {}),
                    useSavedSignature: useSaved,
                    documentSha256: session.documentSha256,
                    challenge: session.challenge,
                    ...(trimmedNote ? { note: trimmedNote } : {}),
                },
            },
            {
                onSuccess: () => onDone(decision),
                onError: async error => {
                    const { status, field, message } = leaveApiError(error);
                    if (status === 409) {
                        // Wygrała czyjaś decyzja - albo wniosek dalej czeka, a zmienił się dokument,
                        // zużył się challenge lub w tym terminie stanął już wpis (np. L4).
                        const fresh = await refetchDetail();
                        if (!fresh || fresh.status !== 'PENDING') { onAlreadyDecided(message); return; }
                        padRef.current?.clear();
                        setSession(null);
                        openSession();
                        setNotice(message ?? 'Dokument został odświeżony. Sprawdź go i podpisz ponownie.');
                        return;
                    }
                    if (status === 403) { onForbidden(message); void refetchDetail(); return; }
                    if (field === 'note' && message) { setNoteError(message); return; }
                    setNotice(message ?? 'Nie udało się zapisać decyzji. Spróbuj ponownie.');
                },
            },
        );
    };

    return (
        <Editor aria-label={isReject ? 'Podpis odmowy' : 'Podpis zatwierdzenia'}>
            <EditorHead>
                <strong>{isReject ? 'Odmowa wniosku' : 'Zatwierdzenie wniosku'}</strong>
                <Button variant="ghost" size="sm" onClick={() => setDocOpen(o => !o)} disabled={!session} aria-expanded={docOpen}>
                    <Eye aria-hidden="true" />{docOpen ? 'Ukryj dokument' : 'Podgląd dokumentu do podpisu'}
                </Button>
            </EditorHead>

            {docOpen && (
                <LeavePdf
                    bytes={documentQuery.data?.bytes}
                    isLoading={documentQuery.isLoading}
                    isError={documentQuery.isError}
                    onRetry={() => { void documentQuery.refetch(); }}
                    maxHeight="30vh"
                />
            )}

            {notice && <Notice tone="warn" role="alert">{notice}</Notice>}

            <Field>
                <LabelRow>
                    <Label htmlFor="leave-decision-note">{isReject ? 'Uzasadnienie odmowy' : 'Notatka (opcjonalnie)'}</Label>
                    <CharCounter $near={note.length > LEAVE_NOTE_MAX - 20}>{note.length}/{LEAVE_NOTE_MAX}</CharCounter>
                </LabelRow>
                <Textarea
                    id="leave-decision-note"
                    value={note}
                    maxLength={LEAVE_NOTE_MAX}
                    required={isReject}
                    $invalid={!!noteError}
                    aria-invalid={!!noteError || undefined}
                    onChange={e => { setNote(e.target.value); setNoteError(null); }}
                />
                {noteError && <FieldError role="alert">{noteError}</FieldError>}
            </Field>

            {hasSaved && (
                <CheckLabel>
                    <input type="checkbox" checked={useSaved} onChange={e => setUseSaved(e.target.checked)} />
                    Użyj mojego zapisanego podpisu
                </CheckLabel>
            )}
            {!useSaved && (
                <SignaturePad ref={padRef} onInkChange={setHasInk} height={130} clearable placeholder="Podpisz w tym polu" />
            )}

            <EditorActions>
                <Button variant="ghost" onClick={onCancel} disabled={decide.isPending}>Anuluj</Button>
                <Button variant="primary" size="lg" onClick={confirm} disabled={!canConfirm}>
                    {decide.isPending ? 'Zapisuję…' : isReject ? 'Podpisz odmowę' : 'Podpisz zatwierdzenie'}
                </Button>
            </EditorActions>
        </Editor>
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
    p { margin: 0; font-size: 14px; color: ${ui.textSecondary}; }
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

const Editor = styled.div`
    width: 100%;
    display: flex;
    flex-direction: column;
    gap: 10px;
    /* Stopka nie przewija się razem z treścią - na niskim ekranie edytor przewija się sam. */
    max-height: 62vh;
    overflow-y: auto;
    overscroll-behavior: contain;
`;

const EditorHead = styled.div`
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    flex-wrap: wrap;

    strong { font-size: 15px; font-weight: 700; color: ${ui.ink}; }
`;

const EditorActions = styled.div`
    display: flex;
    justify-content: flex-end;
    gap: 8px;
`;
