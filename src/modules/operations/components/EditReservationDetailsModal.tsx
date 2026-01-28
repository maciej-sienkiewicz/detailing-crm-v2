// src/modules/operations/components/EditReservationDetailsModal.tsx

import { useEffect, useState } from 'react';
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
  z-index: 1001;
  padding: 16px;
`;

const ModalContainer = styled.div`
  background-color: white;
  border-radius: 12px;
  box-shadow: 0 20px 25px -5px rgb(0 0 0 / 0.1);
  width: 100%;
  max-width: 640px;
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

const ModalBody = styled.div`
  padding: 24px;
`;

const Grid = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;

  @media (max-width: ${props => props.theme.breakpoints.md}) {
    grid-template-columns: 1fr;
  }
`;

const FormGroup = styled.div`
  display: flex;
  flex-direction: column;
`;

const Label = styled.label`
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
`;

const Textarea = styled.textarea`
  width: 100%;
  min-height: 96px;
  padding: 12px 16px;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  font-size: 14px;
  color: #0f172a;
  transition: all 0.15s ease;
  resize: vertical;

  &:focus {
    outline: none;
    border-color: #0ea5e9;
    box-shadow: 0 0 0 3px rgba(14, 165, 233, 0.1);
  }
`;

const ModalFooter = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding: 16px 24px 24px 24px;
`;

const Button = styled.button<{ $variant?: 'primary' | 'secondary' }>`
  padding: 10px 16px;
  border-radius: 8px;
  border: 1px solid transparent;
  background: ${p => (p.$variant === 'primary' ? '#0ea5e9' : 'white')};
  color: ${p => (p.$variant === 'primary' ? 'white' : '#0f172a')};
  border-color: ${p => (p.$variant === 'primary' ? 'transparent' : '#e2e8f0')};
  font-weight: 600;
  cursor: pointer;

  &:hover {
    filter: brightness(0.98);
    background: ${p => (p.$variant === 'primary' ? '#0284c7' : '#f8fafc')};
  }
`;

export interface EditReservationDetailsPayload {
  customerFirstName: string;
  customerLastName: string;
  customerPhone: string;
  vehicle: {
    brand: string;
    model: string;
    licensePlate: string;
  } | null;
  notes?: string;
}

interface EditReservationDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  reservation: Operation | null;
  onConfirm: (payload: EditReservationDetailsPayload) => void;
  isSaving?: boolean;
}

export const EditReservationDetailsModal = ({
  isOpen,
  onClose,
  reservation,
  onConfirm,
  isSaving,
}: EditReservationDetailsModalProps) => {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [brand, setBrand] = useState('');
  const [model, setModel] = useState('');
  const [licensePlate, setLicensePlate] = useState('');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (!reservation) return;
    setFirstName(reservation.customerFirstName || '');
    setLastName(reservation.customerLastName || '');
    setPhone(reservation.customerPhone || '');
    setBrand(reservation.vehicle?.brand || '');
    setModel(reservation.vehicle?.model || '');
    setLicensePlate(reservation.vehicle?.licensePlate || '');
  }, [reservation]);

  if (!isOpen || !reservation) return null;

  const handleSubmit = () => {
    onConfirm({
      customerFirstName: firstName,
      customerLastName: lastName,
      customerPhone: phone,
      vehicle:
        brand || model || licensePlate
          ? { brand, model, licensePlate }
          : null,
      notes: notes || undefined,
    });
  };

  return (
    <Overlay onClick={onClose}>
      <ModalContainer onClick={e => e.stopPropagation()}>
        <ModalHeader>
          <ModalTitle>Edytuj inne informacje</ModalTitle>
          <ModalSubtitle>
            {reservation.customerFirstName} {reservation.customerLastName}
            {reservation.vehicle && ` • ${reservation.vehicle.brand} ${reservation.vehicle.model}`}
          </ModalSubtitle>
        </ModalHeader>
        <ModalBody>
          <Grid>
            <FormGroup>
              <Label>Imię</Label>
              <Input value={firstName} onChange={e => setFirstName(e.target.value)} />
            </FormGroup>
            <FormGroup>
              <Label>Nazwisko</Label>
              <Input value={lastName} onChange={e => setLastName(e.target.value)} />
            </FormGroup>
            <FormGroup>
              <Label>Telefon</Label>
              <Input value={phone} onChange={e => setPhone(e.target.value)} />
            </FormGroup>
            <FormGroup>
              <Label>Nr rejestracyjny</Label>
              <Input value={licensePlate} onChange={e => setLicensePlate(e.target.value)} />
            </FormGroup>
            <FormGroup>
              <Label>Marka pojazdu</Label>
              <Input value={brand} onChange={e => setBrand(e.target.value)} />
            </FormGroup>
            <FormGroup>
              <Label>Model pojazdu</Label>
              <Input value={model} onChange={e => setModel(e.target.value)} />
            </FormGroup>
            <FormGroup style={{ gridColumn: '1 / -1' }}>
              <Label>Notatki</Label>
              <Textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Opcjonalne" />
            </FormGroup>
          </Grid>
        </ModalBody>
        <ModalFooter>
          <Button onClick={onClose}>Anuluj</Button>
          <Button $variant="primary" onClick={handleSubmit} disabled={!!isSaving}>
            {isSaving ? 'Zapisywanie...' : 'Zapisz zmiany'}
          </Button>
        </ModalFooter>
      </ModalContainer>
    </Overlay>
  );
};
