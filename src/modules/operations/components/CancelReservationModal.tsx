// src/modules/operations/components/CancelReservationModal.tsx

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
import type { Operation } from '../types';

const ModalDescription = styled.p`
    margin: 0 0 24px;
    font-size: 14px;
    color: #64748b;
    line-height: 1.5;
`;

const WarningBox = styled.div`
    background-color: #fef2f2;
    border: 1px solid #fecaca;
    border-radius: 8px;
    padding: 12px 16px;
    display: flex;
    gap: 12px;
`;

const WarningIcon = styled.div`
    color: #dc2626;
    flex-shrink: 0;

    svg {
        width: 20px;
        height: 20px;
    }
`;

const WarningText = styled.div`
    font-size: 13px;
    color: #991b1b;
    line-height: 1.5;
`;

interface CancelReservationModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    isCancelling: boolean;
    reservation: Operation | null;
}

export const CancelReservationModal = ({
    isOpen,
    onClose,
    onConfirm,
    isCancelling,
    reservation,
}: CancelReservationModalProps) => {
    if (!isOpen || !reservation) return null;

    return (
        <ModalShell isOpen={isOpen} onClose={onClose} maxWidth="480px">
            <ModalHeader>
                <ModalTitleGroup>
                    <ModalTitle>Anuluj rezerwację</ModalTitle>
                </ModalTitleGroup>
                <CloseBtn onClick={onClose} />
            </ModalHeader>

            <ModalContent>
                <ModalDescription>
                    Czy na pewno chcesz anulować rezerwację dla klienta{' '}
                    <strong>
                        {reservation.customerFirstName} {reservation.customerLastName}
                    </strong>
                    ?
                </ModalDescription>

                <WarningBox>
                    <WarningIcon>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                            <line x1="12" y1="9" x2="12" y2="13" />
                            <line x1="12" y1="17" x2="12.01" y2="17" />
                        </svg>
                    </WarningIcon>
                    <WarningText>
                        Anulowana rezerwacja zostanie oznaczona jako anulowana i nie będzie już aktywna.
                        Nadal będzie widoczna w historii.
                    </WarningText>
                </WarningBox>
            </ModalContent>

            <ModalFooter>
                <SharedButton $variant="secondary" type="button" onClick={onClose} disabled={isCancelling}>
                    Wróć
                </SharedButton>
                <SharedButton $variant="danger" type="button" onClick={onConfirm} disabled={isCancelling}>
                    {isCancelling ? 'Anulowanie...' : 'Anuluj rezerwację'}
                </SharedButton>
            </ModalFooter>
        </ModalShell>
    );
};
