// src/modules/employees/components/leave/CancelLeaveModal.tsx
//
// Odwołanie zatwierdzonego urlopu (przed jego początkiem). Powód jest wymagany, bo
// trafia do pracownika w powiadomieniu i do historii wniosku - jak przy każdej
// decyzji pracodawcy, która cofa wcześniejszą zgodę. Okno stoi nad szufladą wniosku.

import { useState } from 'react';
import {
    ModalShell, ModalHeader, ModalTitleGroup, ModalTitle, ModalSubtitle, ModalContent, ModalFooter, CloseBtn,
} from '@/common/components/ModalKit';
import { SUBMODAL_Z_INDEX } from '@/common/styles';
import { Button, Notice } from '@/common/components/ui';
import { leaveApiError } from '../../api/leaveRequestsApi';
import { useCancelLeaveRequest } from '../../hooks/useLeaveRequests';
import type { LeaveRequestDetail } from '../../types';
import { LEAVE_CANCEL_REASON_MAX, formatLeaveRange } from '../../utils/leaveRequestFormat';
import { CharCounter, Field, FieldError, Label, LabelRow, Textarea } from './leaveForm.styles';

interface Props {
    request: LeaveRequestDetail;
    onClose: () => void;
    onCancelled: () => void;
}

export function CancelLeaveModal({ request, onClose, onCancelled }: Props) {
    const cancel = useCancelLeaveRequest();
    const [reason, setReason] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [notice, setNotice] = useState<string | null>(null);

    const submit = () => {
        const trimmed = reason.trim();
        if (!trimmed) { setError('Podaj powód odwołania - pracownik dostanie go w powiadomieniu.'); return; }
        cancel.mutate({ id: request.id, reason: trimmed }, {
            onSuccess: onCancelled,
            onError: err => {
                const { field, message } = leaveApiError(err);
                if (field === 'reason' && message) setError(message);
                else setNotice(message ?? 'Nie udało się odwołać urlopu. Spróbuj ponownie.');
            },
        });
    };

    return (
        <ModalShell isOpen onClose={onClose} size="sm" zIndex={SUBMODAL_Z_INDEX}>
            <ModalHeader>
                <ModalTitleGroup>
                    <ModalTitle>Odwołać urlop?</ModalTitle>
                    <ModalSubtitle>
                        {request.employeeName}, {formatLeaveRange(request.startDate, request.endDate)}. Wpis zniknie z kalendarza.
                    </ModalSubtitle>
                </ModalTitleGroup>
                <CloseBtn onClick={onClose} />
            </ModalHeader>
            <ModalContent>
                {notice && <Notice tone="danger" role="alert">{notice}</Notice>}
                <Field>
                    <LabelRow>
                        <Label htmlFor="leave-cancel-reason">Powód odwołania</Label>
                        <CharCounter $near={reason.length > LEAVE_CANCEL_REASON_MAX - 50}>
                            {reason.length}/{LEAVE_CANCEL_REASON_MAX}
                        </CharCounter>
                    </LabelRow>
                    <Textarea
                        id="leave-cancel-reason"
                        value={reason}
                        maxLength={LEAVE_CANCEL_REASON_MAX}
                        required
                        $invalid={!!error}
                        aria-invalid={!!error || undefined}
                        onChange={e => { setReason(e.target.value); setError(null); }}
                    />
                    {error && <FieldError role="alert">{error}</FieldError>}
                </Field>
            </ModalContent>
            <ModalFooter>
                <Button variant="ghost" onClick={onClose} disabled={cancel.isPending}>Zostaw urlop</Button>
                <Button variant="primary" onClick={submit} disabled={cancel.isPending || !reason.trim()}>
                    {cancel.isPending ? 'Odwołuję…' : 'Odwołaj urlop'}
                </Button>
            </ModalFooter>
        </ModalShell>
    );
}
