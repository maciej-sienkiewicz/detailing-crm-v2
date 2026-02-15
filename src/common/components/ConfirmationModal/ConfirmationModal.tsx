import React from 'react';
import * as S from './ConfirmationModalStyles';

const IconX = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="18" y1="6" x2="6" y2="18"/>
        <line x1="6" y1="6" x2="18" y2="18"/>
    </svg>
);

const IconAlertTriangle = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
        <line x1="12" y1="9" x2="12" y2="13"/>
        <line x1="12" y1="17" x2="12.01" y2="17"/>
    </svg>
);

const IconTrash = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="3 6 5 6 21 6"/>
        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
        <line x1="10" y1="11" x2="10" y2="17"/>
        <line x1="14" y1="11" x2="14" y2="17"/>
    </svg>
);

export type ConfirmationVariant = 'danger' | 'warning' | 'info';

interface ConfirmationModalProps {
    isOpen: boolean;
    title: string;
    message: string;
    variant?: ConfirmationVariant;
    confirmText?: string;
    cancelText?: string;
    onConfirm: () => void;
    onCancel: () => void;
}

export const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
    isOpen,
    title,
    message,
    variant = 'warning',
    confirmText = 'Potwierdź',
    cancelText = 'Anuluj',
    onConfirm,
    onCancel,
}) => {
    const handleConfirm = () => {
        onConfirm();
        onCancel(); // Close modal after confirm
    };

    if (!isOpen) return null;

    const getIcon = () => {
        switch (variant) {
            case 'danger':
                return <IconTrash />;
            case 'warning':
                return <IconAlertTriangle />;
            case 'info':
                return null;
            default:
                return <IconAlertTriangle />;
        }
    };

    return (
        <S.Overlay $isOpen={isOpen} onMouseDown={(e) => e.target === e.currentTarget && onCancel()}>
            <S.ModalContainer $isOpen={isOpen}>
                <S.Header>
                    <S.DragHandle>
                        <div />
                    </S.DragHandle>

                    <S.CloseButton type="button" onClick={onCancel}>
                        <IconX />
                    </S.CloseButton>

                    <S.IconContainer $variant={variant}>
                        {getIcon()}
                    </S.IconContainer>

                    <S.Title>{title}</S.Title>
                    <S.Message>{message}</S.Message>
                </S.Header>

                <S.Footer>
                    <S.CancelButton type="button" onClick={onCancel}>
                        {cancelText}
                    </S.CancelButton>
                    <S.ConfirmButton type="button" onClick={handleConfirm} $variant={variant}>
                        {confirmText}
                    </S.ConfirmButton>
                </S.Footer>
            </S.ModalContainer>
        </S.Overlay>
    );
};
