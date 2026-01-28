// src/modules/operations/components/ReservationOptionsModal.tsx

import styled from 'styled-components';
import type { Operation } from '../types';

const Overlay = styled.div`
    position: fixed;
    inset: 0;
    background-color: rgba(0, 0, 0, 0.5);
    backdrop-filter: blur(4px);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
    padding: 16px;
`;

const ModalContainer = styled.div`
    background-color: white;
    border-radius: 12px;
    box-shadow: 0 20px 25px -5px rgb(0 0 0 / 0.1);
    width: 100%;
    max-width: 480px;
    overflow: hidden;
`;

const ModalHeader = styled.div`
    padding: 24px;
    border-bottom: 1px solid #e2e8f0;
`;

const ModalTitle = styled.h2`
    margin: 0 0 4px;
    font-size: 20px;
    font-weight: 700;
    color: #0f172a;
`;

const ModalSubtitle = styled.p`
    margin: 0;
    font-size: 14px;
    color: #64748b;
`;

const OptionsList = styled.div`
    padding: 8px;
`;

const OptionButton = styled.button<{ $variant?: 'default' | 'danger' | 'primary' }>`
    width: 100%;
    padding: 16px 20px;
    background: white;
    border: none;
    border-radius: 8px;
    display: flex;
    align-items: center;
    gap: 16px;
    cursor: pointer;
    transition: all 0.15s ease;
    text-align: left;

    &:hover {
        background-color: ${props => {
            if (props.$variant === 'danger') return '#fee2e2';
            if (props.$variant === 'primary') return '#dbeafe';
            return '#f8fafc';
        }};
    }

    &:active {
        transform: scale(0.98);
    }
`;

const IconWrapper = styled.div<{ $variant?: 'default' | 'danger' | 'primary' }>`
    width: 40px;
    height: 40px;
    border-radius: 8px;
    display: flex;
    align-items: center;
    justify-content: center;
    background-color: ${props => {
        if (props.$variant === 'danger') return '#fee2e2';
        if (props.$variant === 'primary') return '#dbeafe';
        return '#f1f5f9';
    }};
    color: ${props => {
        if (props.$variant === 'danger') return '#dc2626';
        if (props.$variant === 'primary') return '#0ea5e9';
        return '#0f172a';
    }};
    flex-shrink: 0;

    svg {
        width: 20px;
        height: 20px;
    }
`;

const OptionContent = styled.div`
    flex: 1;
`;

const OptionTitle = styled.div<{ $variant?: 'default' | 'danger' | 'primary' }>`
    font-size: 15px;
    font-weight: 600;
    color: ${props => {
        if (props.$variant === 'danger') return '#dc2626';
        if (props.$variant === 'primary') return '#0ea5e9';
        return '#0f172a';
    }};
    margin-bottom: 2px;
`;

const OptionDescription = styled.div`
    font-size: 13px;
    color: #64748b;
`;

const Divider = styled.div`
    height: 1px;
    background-color: #e2e8f0;
    margin: 8px 0;
`;

interface ReservationOptionsModalProps {
    isOpen: boolean;
    onClose: () => void;
    reservation: Operation | null;
    onEditReservationClick: () => void;
    onCancelReservationClick: () => void;
    onStartVisitClick: () => void;
}

export const ReservationOptionsModal = ({
    isOpen,
    onClose,
    reservation,
    onEditReservationClick,
    onCancelReservationClick,
    onStartVisitClick,
}: ReservationOptionsModalProps) => {
    if (!isOpen || !reservation) return null;

    return (
        <Overlay onClick={onClose}>
            <ModalContainer onClick={e => e.stopPropagation()}>
                <ModalHeader>
                    <ModalTitle>Opcje rezerwacji</ModalTitle>
                    <ModalSubtitle>
                        {reservation.customerFirstName} {reservation.customerLastName}
                        {reservation.vehicle && ` • ${reservation.vehicle.brand} ${reservation.vehicle.model}`}
                    </ModalSubtitle>
                </ModalHeader>

                <OptionsList>
                    <OptionButton onClick={onEditReservationClick}>
                        <IconWrapper>
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M12 20h9" />
                                <path d="M16.5 3.5a2.121 2.121 0 1 1 3 3L7 19l-4 1 1-4 12.5-12.5z" />
                            </svg>
                        </IconWrapper>
                        <OptionContent>
                            <OptionTitle>Edytuj rezerwację</OptionTitle>
                            <OptionDescription>Otwórz pełny widok edycji rezerwacji</OptionDescription>
                        </OptionContent>
                    </OptionButton>

                    <Divider />

                    <OptionButton onClick={onStartVisitClick} $variant="primary">
                        <IconWrapper $variant="primary">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                                <path d="M9 12l2 2 4-4" />
                            </svg>
                        </IconWrapper>
                        <OptionContent>
                            <OptionTitle $variant="primary">Rozpocznij wizytę</OptionTitle>
                            <OptionDescription>Przyjmij pojazd i rozpocznij obsługę</OptionDescription>
                        </OptionContent>
                    </OptionButton>

                    <Divider />

                    <OptionButton onClick={onCancelReservationClick} $variant="danger">
                        <IconWrapper $variant="danger">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <circle cx="12" cy="12" r="10" />
                                <line x1="15" y1="9" x2="9" y2="15" />
                                <line x1="9" y1="9" x2="15" y2="15" />
                            </svg>
                        </IconWrapper>
                        <OptionContent>
                            <OptionTitle $variant="danger">Anuluj rezerwację</OptionTitle>
                            <OptionDescription>Usuń rezerwację z kalendarza</OptionDescription>
                        </OptionContent>
                    </OptionButton>
                </OptionsList>
            </ModalContainer>
        </Overlay>
    );
};
