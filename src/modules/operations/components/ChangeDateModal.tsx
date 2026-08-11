// src/modules/operations/components/ChangeDateModal.tsx

import { useState, useEffect } from 'react';
import styled from 'styled-components';
import {
    ModalShell,
    ModalHeader,
    ModalTitleGroup,
    ModalTitle,
    ModalSubtitle,
    ModalContent,
    ModalFooter,
    CloseBtn,
} from '@/common/components/ModalKit';
import { SharedButton } from '@/common/styles';
import { DateTimePicker } from '@/common/components/DateTimePicker';
import type { Operation } from '../types';

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
            const formatToLocal = (isoString: string) => {
                const date = new Date(isoString);
                const year = date.getFullYear();
                const month = String(date.getMonth() + 1).padStart(2, '0');
                const day = String(date.getDate()).padStart(2, '0');
                const hours = String(date.getHours()).padStart(2, '0');
                const minutes = String(date.getMinutes()).padStart(2, '0');
                return `${year}-${month}-${day}T${hours}:${minutes}`;
            };

            setStartDateTime(formatToLocal(reservation.startDateTime));
            setEndDateTime(formatToLocal(reservation.endDateTime));
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

        if (end < start) {
            setError('Data zakończenia musi być późniejsza niż data rozpoczęcia');
            return;
        }

        onConfirm(start.toISOString(), end.toISOString());
    };

    if (!isOpen || !reservation) return null;

    return (
        <ModalShell isOpen={isOpen} onClose={onClose} maxWidth="500px">
            <ModalHeader>
                <ModalTitleGroup>
                    <ModalTitle>Zmień datę rezerwacji</ModalTitle>
                    <ModalSubtitle>
                        {reservation.customerFirstName} {reservation.customerLastName}
                    </ModalSubtitle>
                </ModalTitleGroup>
                <CloseBtn onClick={onClose} />
            </ModalHeader>

            <ModalContent>
                <FormGroup>
                    <Label>Data i godzina przyjazdu</Label>
                    <DateTimePicker
                        value={startDateTime}
                        onChange={setStartDateTime}
                        showTime
                        placeholder="Wybierz datę i godzinę"
                    />
                </FormGroup>

                <FormGroup>
                    <Label>Data i godzina zakończenia</Label>
                    <DateTimePicker
                        value={endDateTime}
                        onChange={setEndDateTime}
                        showTime
                        placeholder="Wybierz datę i godzinę"
                    />
                </FormGroup>

                {error && <ErrorMessage>{error}</ErrorMessage>}
            </ModalContent>

            <ModalFooter>
                <SharedButton $variant="secondary" type="button" onClick={onClose} disabled={isUpdating}>
                    Anuluj
                </SharedButton>
                <SharedButton $variant="primary" type="button" onClick={handleConfirm} disabled={isUpdating}>
                    {isUpdating ? 'Zapisywanie...' : 'Zapisz zmiany'}
                </SharedButton>
            </ModalFooter>
        </ModalShell>
    );
};
