// src/modules/employees/components/leave/DecisionParts.tsx
//
// Decyzja rozpatrującego: wybór (zatwierdź / odrzuć) z uzasadnieniem i podpis.
// Wspólne dla okna decyzji z kolejki i ostatniego kroku urlopu dodawanego przez
// administratora.
//
// „Zatwierdź" i „Odrzuć" to dwie karty wyboru, a nie dwa przyciski: odcień niesie
// znaczenie, a jedyne wypełnienie w oknie zostaje przy kroku następnym w stopce
// (CLAUDE.md §2). Odmowa wymaga uzasadnienia - trafia na dokument i do pracownika.

import { useState, type RefObject } from 'react';
import { useQuery } from '@tanstack/react-query';
import styled from 'styled-components';
import { Check, Eye, X } from 'lucide-react';
import { Button, ChoiceCard, ChoiceList, Notice, ui } from '@/common/components/ui';
import { SignaturePad, type SignaturePadHandle } from '@/common/components/SignaturePad';
import { leaveRequestsApi } from '../../api/leaveRequestsApi';
import { LEAVE_REQUESTS_KEY } from '../../hooks/useLeaveRequests';
import type { DecisionSigning, LeaveDecision } from '../../hooks/useDecisionSigning';
import { LEAVE_NOTE_MAX } from '../../utils/leaveRequestFormat';
import { LeavePdf } from './LeavePdf';
import { CharCounter, Check as CheckLabel, Field, FieldError, Hint, Label, LabelRow, Textarea } from './leaveForm.styles';

// ─── Wybór ───────────────────────────────────────────────────────────────────

interface ChoiceProps {
    decision: LeaveDecision | null;
    onDecisionChange: (decision: LeaveDecision) => void;
    note: string;
    onNoteChange: (note: string) => void;
    noteError: string | null;
    approveDetail: string;
    rejectDetail: string;
}

export function DecisionChoice({ decision, onDecisionChange, note, onNoteChange, noteError, approveDetail, rejectDetail }: ChoiceProps) {
    const isReject = decision === 'reject';
    return (
        <>
            <ChoiceList role="radiogroup" aria-label="Decyzja">
                <ChoiceCard
                    type="radio"
                    name="leave-decision"
                    checked={decision === 'approve'}
                    onChange={() => onDecisionChange('approve')}
                    title="Zatwierdź"
                    detail={approveDetail}
                    icon={<Check />}
                />
                <ChoiceCard
                    type="radio"
                    name="leave-decision"
                    checked={isReject}
                    onChange={() => onDecisionChange('reject')}
                    title="Odrzuć"
                    detail={rejectDetail}
                    icon={<X />}
                />
            </ChoiceList>

            {decision && (
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
                        placeholder={isReject ? 'np. szczyt sezonu, w tym tygodniu brakuje rąk do pracy' : ''}
                        onChange={e => onNoteChange(e.target.value)}
                    />
                    {noteError && <FieldError role="alert">{noteError}</FieldError>}
                    {isReject && !noteError && <Hint>Uzasadnienie trafi na dokument i do pracownika.</Hint>}
                </Field>
            )}
        </>
    );
}

// ─── Podpis decyzji ──────────────────────────────────────────────────────────

interface SignatureProps {
    requestId: string;
    signing: DecisionSigning;
    padRef: RefObject<SignaturePadHandle | null>;
}

export function DecisionSignature({ requestId, signing, padRef }: SignatureProps) {
    const [docOpen, setDocOpen] = useState(false);
    const documentQuery = useQuery({
        queryKey: [...LEAVE_REQUESTS_KEY, 'document', requestId, signing.session?.challenge ?? ''],
        queryFn: () => leaveRequestsApi.document(requestId),
        enabled: docOpen && !!signing.session,
        retry: false,
        staleTime: Infinity,
        gcTime: 0,
    });

    return (
        <>
            {signing.notice && (
                <Notice
                    tone="warn"
                    role="alert"
                    action={signing.sessionFailed
                        ? <Button variant="outline" size="sm" onClick={signing.retrySession}>Spróbuj ponownie</Button>
                        : undefined}
                >
                    {signing.notice}
                </Notice>
            )}

            <DocRow>
                <Hint>Podpisujesz wersję wniosku z podpisem pracownika.</Hint>
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setDocOpen(o => !o)}
                    disabled={!signing.session}
                    aria-expanded={docOpen}
                >
                    <Eye aria-hidden="true" />{docOpen ? 'Ukryj dokument' : 'Pokaż dokument'}
                </Button>
            </DocRow>
            {docOpen && (
                <LeavePdf
                    bytes={documentQuery.data?.bytes}
                    isLoading={documentQuery.isLoading}
                    isError={documentQuery.isError}
                    onRetry={() => { void documentQuery.refetch(); }}
                    maxHeight="30vh"
                />
            )}

            {signing.hasSaved && (
                <CheckLabel>
                    <input type="checkbox" checked={signing.useSaved} onChange={e => signing.setUseSaved(e.target.checked)} />
                    Użyj mojego zapisanego podpisu
                </CheckLabel>
            )}
            {!signing.useSaved && (
                <SignaturePad
                    ref={padRef}
                    onInkChange={signing.setHasInk}
                    height="clamp(140px, 24vh, 200px)"
                    clearable
                    placeholder="Twój podpis"
                />
            )}
        </>
    );
}

const DocRow = styled.div`
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    flex-wrap: wrap;
    padding: 8px 12px;
    border-radius: ${ui.radiusStrip};
    background: ${ui.surfaceSoft};
    border: 1px solid ${ui.lineSoft};
`;
