// src/common/components/ConfirmationModal/ChoiceModal.tsx
// Pytanie z dwiema pełnoprawnymi odpowiedziami - „tak" i „nie" to dwie różne
// decyzje, a nie decyzja i jej brak.
//
// ConfirmationModal tego nie udźwignie: jego „Anuluj" jest zszyte z zamknięciem
// okna (Escape, tło i przycisk wołają ten sam onCancel), więc odpowiedź „nie"
// odpalałaby się także wtedy, gdy użytkownik chciał tylko uciec od pytania.
// Tutaj zamknięcie (X, Escape, kliknięcie w tło) jest trzecim wyjściem - rezygnacją,
// po której nie dzieje się nic.
import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import * as S from './ConfirmationModalStyles';
import type { ConfirmationVariant } from './ConfirmationModal';

const IconX = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="18" y1="6" x2="6" y2="18" />
        <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
);

const IconQuestion = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
        <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
);

interface ChoiceModalProps {
    isOpen: boolean;
    title: string;
    message: string;
    variant?: ConfirmationVariant;
    /** Odpowiedź twierdząca - przycisk w kolorze wariantu. */
    primaryText: string;
    onPrimary: () => void;
    /** Odpowiedź przecząca - pełnoprawna decyzja, nie zamknięcie. */
    secondaryText: string;
    onSecondary: () => void;
    /** Rezygnacja: X, Escape, kliknięcie w tło. Nie dzieje się nic. */
    onDismiss: () => void;
}

export const ChoiceModal: React.FC<ChoiceModalProps> = ({
    isOpen,
    title,
    message,
    variant = 'warning',
    primaryText,
    onPrimary,
    secondaryText,
    onSecondary,
    onDismiss,
}) => {
    useEffect(() => {
        if (!isOpen) return;
        const handleKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onDismiss(); };
        document.addEventListener('keydown', handleKey);
        return () => document.removeEventListener('keydown', handleKey);
    }, [isOpen, onDismiss]);

    if (!isOpen) return null;

    return createPortal(
        <S.Overlay $isOpen={isOpen} onMouseDown={(e) => e.target === e.currentTarget && onDismiss()}>
            <S.ModalContainer $isOpen={isOpen} $maxWidth="420px">
                <S.Header>
                    <S.CloseButton type="button" onClick={onDismiss}>
                        <IconX />
                    </S.CloseButton>

                    <S.IconContainer $variant={variant}>
                        <IconQuestion />
                    </S.IconContainer>

                    <S.Title>{title}</S.Title>
                    <S.Message>{message}</S.Message>
                </S.Header>

                <S.Footer>
                    <S.CancelButton type="button" onClick={onSecondary}>
                        {secondaryText}
                    </S.CancelButton>
                    <S.ConfirmButton type="button" onClick={onPrimary} $variant={variant}>
                        {primaryText}
                    </S.ConfirmButton>
                </S.Footer>
            </S.ModalContainer>
        </S.Overlay>,
        document.body
    );
};
