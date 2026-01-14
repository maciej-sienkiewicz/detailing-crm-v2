// src/modules/operations/components/CancelReservationModal.tsx

import styled from 'styled-components';
import { Button, ButtonGroup } from '@/common/components/Button';
import type { Operation } from '../types';

const Overlay = styled.div`
    position: fixed;
    inset: 0;
    background-color: rgba(0, 0, 0, 0.5);
    backdrop-filter: blur(4px);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1001;
    padding: 16px;
`;

const ModalContainer = styled.div`
    background-color: white;
    border-radius: 12px;
    box-shadow: 0 20px 25px -5px rgb(0 0 0 / 0.1);
    width: 100%;
    max-width: 480px;
    padding: 24px;
`;

const ModalTitle = styled.h2`
    margin: 0 0 8px;
    font-size: 20px;
    font-weight: 700;
    color: #0f172a;
`;

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
    margin-bottom: 24px;
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
        <Overlay onClick={onClose}>
            <ModalContainer onClick={e => e.stopPropagation()}>
                <ModalTitle>Anuluj rezerwację</ModalTitle>
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

                <ButtonGroup>
                    <Button
                        $variant="secondary"
                        onClick={onClose}
                        disabled={isCancelling}
                        $fullWidth
                    >
                        Wróć
                    </Button>
                    <Button
                        $variant="danger"
                        onClick={onConfirm}
                        disabled={isCancelling}
                        $fullWidth
                    >
                        {isCancelling ? 'Anulowanie...' : 'Anuluj rezerwację'}
                    </Button>
                </ButtonGroup>
            </ModalContainer>
        </Overlay>
    );
};
