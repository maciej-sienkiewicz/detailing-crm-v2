// src/modules/operations/components/ChangeDateModal.tsx

import { useState, useEffect } from 'react';
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
    max-width: 500px;
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

const ModalBody = styled.div`
    padding: 24px;
`;

const FormGroup = styled.div`
    margin-bottom: 20px;

    &:last-child {
        margin-bottom: 0;
    }
`;

const Label = styled.label`
    display: block;
    font-size: 14px;
    font-weight: 600;
    color: #0f172a;
    margin-bottom: 8px;
`;

const Input = styled.input`
    width: 100%;
    padding: 12px 16px;
    border: 1px solid #e2e8f0;
    border-radius: 8px;
    font-size: 14px;
    color: #0f172a;
    transition: all 0.15s ease;

    &:focus {
        outline: none;
        border-color: #0ea5e9;
        box-shadow: 0 0 0 3px rgba(14, 165, 233, 0.1);
    }

    &:disabled {
        background-color: #f8fafc;
        cursor: not-allowed;
    }
`;

const ErrorMessage = styled.div`
    color: #dc2626;
    font-size: 13px;
    margin-top: 8px;
`;

interface ChangeDateModalProps {
    isOpen: boolean;
    onClose: () => void;
    reservation: Operation | null;
    onConfirm: (startDateTime: string, endDateTime: string) => void;
    isUpdating: boolean;
}

export const ChangeDateModal = ({
    isOpen,
    onClose,
    reservation,
    onConfirm,
    isUpdating,
}: ChangeDateModalProps) => {
    const [startDateTime, setStartDateTime] = useState('');
    const [endDateTime, setEndDateTime] = useState('');
    const [error, setError] = useState('');

    useEffect(() => {
        if (reservation && isOpen) {
            // Konwertuj ISO string na format datetime-local (YYYY-MM-DDTHH:mm)
            const formatToDatetimeLocal = (isoString: string) => {
                const date = new Date(isoString);
                const year = date.getFullYear();
                const month = String(date.getMonth() + 1).padStart(2, '0');
                const day = String(date.getDate()).padStart(2, '0');
                const hours = String(date.getHours()).padStart(2, '0');
                const minutes = String(date.getMinutes()).padStart(2, '0');
                return `${year}-${month}-${day}T${hours}:${minutes}`;
            };

            setStartDateTime(formatToDatetimeLocal(reservation.startDateTime));
            setEndDateTime(formatToDatetimeLocal(reservation.endDateTime));
            setError('');
        }
    }, [reservation, isOpen]);

    const handleConfirm = () => {
        setError('');

        if (!startDateTime || !endDateTime) {
            setError('Wszystkie pola są wymagane');
            return;
        }

        const start = new Date(startDateTime);
        const end = new Date(endDateTime);

        if (end <= start) {
            setError('Data zakończenia musi być późniejsza niż data rozpoczęcia');
            return;
        }

        // Konwertuj z powrotem na ISO string
        onConfirm(start.toISOString(), end.toISOString());
    };

    if (!isOpen || !reservation) return null;

    return (
        <Overlay onClick={onClose}>
            <ModalContainer onClick={e => e.stopPropagation()}>
                <ModalHeader>
                    <ModalTitle>Zmień datę rezerwacji</ModalTitle>
                    <ModalSubtitle>
                        {reservation.customerFirstName} {reservation.customerLastName}
                    </ModalSubtitle>
                </ModalHeader>

                <ModalBody>
                    <FormGroup>
                        <Label htmlFor="startDateTime">Data i godzina przyjazdu</Label>
                        <Input
                            id="startDateTime"
                            type="datetime-local"
                            value={startDateTime}
                            onChange={(e) => setStartDateTime(e.target.value)}
                            disabled={isUpdating}
                        />
                    </FormGroup>

                    <FormGroup>
                        <Label htmlFor="endDateTime">Data i godzina zakończenia</Label>
                        <Input
                            id="endDateTime"
                            type="datetime-local"
                            value={endDateTime}
                            onChange={(e) => setEndDateTime(e.target.value)}
                            disabled={isUpdating}
                        />
                    </FormGroup>

                    {error && <ErrorMessage>{error}</ErrorMessage>}

                    <ButtonGroup>
                        <Button
                            $variant="secondary"
                            onClick={onClose}
                            disabled={isUpdating}
                        >
                            Anuluj
                        </Button>
                        <Button
                            $variant="primary"
                            onClick={handleConfirm}
                            disabled={isUpdating}
                        >
                            {isUpdating ? 'Zapisywanie...' : 'Zapisz zmiany'}
                        </Button>
                    </ButtonGroup>
                </ModalBody>
            </ModalContainer>
        </Overlay>
    );
};
