// src/modules/scheduled-sms/components/CancelScheduledSmsModal.tsx
//
// Potwierdzenie anulowania wysyłki - to samo okno co „Anuluj rezerwację" na liście wizyt.
// Notka jest neutralna, nie czerwona: anulowanie da się cofnąć („Wznów wysyłkę").

import styled from 'styled-components';
import {
    ModalShell,
    ModalHeader,
    ModalTitleGroup,
    ModalTitle,
    ModalContent,
    ModalFooter,
    CloseBtn,
} from '@/common/components/ModalKit';
import { SharedButton } from '@/common/styles';
import type { ScheduledSmsItem } from '../types';
import { formatWhen, recipientLabel } from '../utils/scheduledSmsFormat';

const ModalDescription = styled.p`
    margin: 0 0 24px;
    font-size: 14px;
    color: #64748b;
    line-height: 1.5;
`;

const NoteBox = styled.div`
    background-color: #f8fafc;
    border: 1px solid #e2e8f0;
    border-radius: 8px;
    padding: 12px 16px;
    display: flex;
    gap: 12px;
`;

const NoteIcon = styled.div`
    color: #94a3b8;
    flex-shrink: 0;

    svg {
        width: 20px;
        height: 20px;
    }
`;

const NoteText = styled.div`
    font-size: 13px;
    color: #475569;
    line-height: 1.5;
`;

interface Props {
    item: ScheduledSmsItem | null;
    isCancelling: boolean;
    onConfirm: () => void;
    onClose: () => void;
}

export const CancelScheduledSmsModal = ({ item, isCancelling, onConfirm, onClose }: Props) => {
    if (!item) return null;

    return (
        <ModalShell isOpen onClose={onClose} size="sm">
            <ModalHeader>
                <ModalTitleGroup>
                    <ModalTitle>Anuluj wysyłkę SMS-a</ModalTitle>
                </ModalTitleGroup>
                <CloseBtn onClick={onClose} />
            </ModalHeader>

            <ModalContent>
                <ModalDescription>
                    Czy na pewno anulować wysyłkę SMS-a do{' '}
                    <strong>{recipientLabel(item)}</strong>
                    {item.scheduledFor && <> zaplanowaną na {formatWhen(item.scheduledFor)}</>}?
                </ModalDescription>

                <NoteBox>
                    <NoteIcon>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <circle cx="12" cy="12" r="10" />
                            <line x1="12" y1="8" x2="12" y2="12" />
                            <line x1="12" y1="16" x2="12.01" y2="16" />
                        </svg>
                    </NoteIcon>
                    <NoteText>
                        SMS nie wyjdzie, ale zostanie na liście jako anulowany. W każdej chwili możesz wznowić wysyłkę.
                    </NoteText>
                </NoteBox>
            </ModalContent>

            <ModalFooter>
                <SharedButton $variant="secondary" type="button" onClick={onClose} disabled={isCancelling}>
                    Wróć
                </SharedButton>
                <SharedButton $variant="danger" type="button" onClick={onConfirm} disabled={isCancelling}>
                    {isCancelling ? 'Anulowanie…' : 'Anuluj wysyłkę'}
                </SharedButton>
            </ModalFooter>
        </ModalShell>
    );
};
