// src/modules/calendar/components/PriceInputModal.tsx

import React, { useState, useEffect } from 'react';
import * as S from './PriceInputModalStyles';

// --- ICONS (Inline SVG) ---
const IconX = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="18" y1="6" x2="6" y2="18"/>
        <line x1="6" y1="6" x2="18" y2="18"/>
    </svg>
);

// --- TYPES ---
interface PriceInputModalProps {
    isOpen: boolean;
    serviceName: string;
    onClose: () => void;
    onConfirm: (price: number) => void;
}

// --- COMPONENT ---
export const PriceInputModal: React.FC<PriceInputModalProps> = ({
    isOpen,
    serviceName,
    onClose,
    onConfirm,
}) => {
    const [price, setPrice] = useState('');
    const [error, setError] = useState('');

    // Reset form when modal opens/closes
    useEffect(() => {
        if (isOpen) {
            setPrice("0.00");
            setError('');
        }
    }, [isOpen]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        const numPrice = parseFloat(price);

        if (price === '' || isNaN(numPrice) || numPrice < 0) {
            setError('Podaj prawidłową cenę (wartość nie może być ujemna)');
            return;
        }

        onConfirm(numPrice);
        onClose();
    };

    const handleCancel = () => {
        onClose();
    };

    if (!isOpen) return null;

    return (
        <S.Overlay $isOpen={isOpen} onMouseDown={(e) => e.target === e.currentTarget && handleCancel()}>
            <S.ModalContainer $isOpen={isOpen}>
                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column' }}>
                    <S.Header>
                        <S.DragHandle>
                            <div />
                        </S.DragHandle>

                        <S.CloseButton type="button" onClick={handleCancel}>
                            <IconX />
                        </S.CloseButton>

                        <S.Title>Wprowadź cenę</S.Title>
                        <S.Subtitle>Ta usługa wymaga ręcznego wprowadzenia ceny</S.Subtitle>
                    </S.Header>

                    <S.Content>
                        <S.ServiceInfoBox>
                            <S.ServiceInfoLabel>Usługa:</S.ServiceInfoLabel>
                            <S.ServiceInfoName>{serviceName}</S.ServiceInfoName>
                        </S.ServiceInfoBox>

                        <S.InputGroup>
                            <S.Label>Cena brutto (w zł)</S.Label>
                            <S.PriceInputWrapper>
                                <S.PriceInput
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    value={price}
                                    onChange={(e) => setPrice(e.target.value)}
                                    placeholder="0.00"
                                    autoFocus
                                />
                                <S.PriceCurrency>zł</S.PriceCurrency>
                            </S.PriceInputWrapper>
                            {error && <S.ErrorMessage>{error}</S.ErrorMessage>}
                        </S.InputGroup>
                    </S.Content>

                    <S.Footer>
                        <S.Button type="button" onClick={handleCancel} $variant="secondary">
                            Anuluj
                        </S.Button>
                        <S.Button type="submit" $variant="primary">
                            Potwierdź cenę
                        </S.Button>
                    </S.Footer>
                </form>
            </S.ModalContainer>
        </S.Overlay>
    );
};
