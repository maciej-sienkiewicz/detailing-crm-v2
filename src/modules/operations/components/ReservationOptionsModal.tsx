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

const OptionButton = styled.button<{ $variant?: 'default' | 'danger' }>`
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
        background-color: ${props => props.$variant === 'danger' ? '#fee2e2' : '#f8fafc'};
    }

    &:active {
        transform: scale(0.98);
    }
`;

const IconWrapper = styled.div<{ $variant?: 'default' | 'danger' }>`
    width: 40px;
    height: 40px;
    border-radius: 8px;
    display: flex;
    align-items: center;
    justify-content: center;
    background-color: ${props => props.$variant === 'danger' ? '#fee2e2' : '#f1f5f9'};
    color: ${props => props.$variant === 'danger' ? '#dc2626' : '#0f172a'};
    flex-shrink: 0;

    svg {
        width: 20px;
        height: 20px;
    }
`;

const OptionContent = styled.div`
    flex: 1;
`;

const OptionTitle = styled.div<{ $variant?: 'default' | 'danger' }>`
    font-size: 15px;
    font-weight: 600;
    color: ${props => props.$variant === 'danger' ? '#dc2626' : '#0f172a'};
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
    onChangeDateClick: () => void;
    onEditServicesClick: () => void;
    onEditDetailsClick: () => void;
    onCancelReservationClick: () => void;
}

export const ReservationOptionsModal = ({
    isOpen,
    onClose,
    reservation,
    onChangeDateClick,
    onEditServicesClick,
    onEditDetailsClick,
    onCancelReservationClick,
}: ReservationOptionsModalProps) => {
    if (!isOpen || !reservation) return null;

    return (
        <Overlay onClick={onClose}>
            <ModalContainer onClick={e => e.stopPropagation()}>
                <ModalHeader>
                    <ModalTitle>Opcje rezerwacji</ModalTitle>
                    <ModalSubtitle>
                        {reservation.customerFirstName} {reservation.customerLastName} • {reservation.vehicle.brand} {reservation.vehicle.model}
                    </ModalSubtitle>
                </ModalHeader>

                <OptionsList>
                    <OptionButton onClick={onChangeDateClick}>
                        <IconWrapper>
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                                <line x1="16" y1="2" x2="16" y2="6" />
                                <line x1="8" y1="2" x2="8" y2="6" />
                                <line x1="3" y1="10" x2="21" y2="10" />
                            </svg>
                        </IconWrapper>
                        <OptionContent>
                            <OptionTitle>Zmień datę rezerwacji</OptionTitle>
                            <OptionDescription>Zaktualizuj termin przyjazdu i wyjazdu</OptionDescription>
                        </OptionContent>
                    </OptionButton>

                    <OptionButton onClick={onEditServicesClick}>
                        <IconWrapper>
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                                <path d="M9 12h6m-6 4h6" />
                            </svg>
                        </IconWrapper>
                        <OptionContent>
                            <OptionTitle>Edytuj pozycje rezerwacji</OptionTitle>
                            <OptionDescription>Dodaj, usuń lub zmień usługi</OptionDescription>
                        </OptionContent>
                    </OptionButton>

                    <OptionButton onClick={onEditDetailsClick}>
                        <IconWrapper>
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                        </IconWrapper>
                        <OptionContent>
                            <OptionTitle>Edytuj inne informacje</OptionTitle>
                            <OptionDescription>Zmień dane klienta lub pojazdu</OptionDescription>
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
