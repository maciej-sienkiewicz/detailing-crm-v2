import { useState, useEffect } from 'react';
import styled from 'styled-components';
import type { BatchContractor, ContractorRequest } from '../types';

const Overlay = styled.div`
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.5);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
    padding: 16px;
`;

const Modal = styled.div`
    background: ${p => p.theme.colors.surface};
    border-radius: 12px;
    padding: 24px;
    width: 100%;
    max-width: 520px;
    max-height: 90vh;
    overflow-y: auto;
    box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
`;

const ModalTitle = styled.h2`
    margin: 0 0 20px;
    font-size: ${p => p.theme.fontSizes.lg};
    font-weight: 700;
    color: ${p => p.theme.colors.text};
`;

const Field = styled.div`
    margin-bottom: 16px;
`;

const Label = styled.label`
    display: block;
    font-size: ${p => p.theme.fontSizes.sm};
    font-weight: 600;
    color: ${p => p.theme.colors.textMuted};
    margin-bottom: 6px;
`;

const Input = styled.input`
    width: 100%;
    padding: 10px 12px;
    border: 1px solid ${p => p.theme.colors.border};
    border-radius: 8px;
    font-size: ${p => p.theme.fontSizes.sm};
    color: ${p => p.theme.colors.text};
    background: ${p => p.theme.colors.background};
    box-sizing: border-box;

    &:focus {
        outline: none;
        border-color: ${p => p.theme.colors.primary};
        box-shadow: 0 0 0 3px ${p => p.theme.colors.primary}22;
    }
`;

const Textarea = styled.textarea`
    width: 100%;
    padding: 10px 12px;
    border: 1px solid ${p => p.theme.colors.border};
    border-radius: 8px;
    font-size: ${p => p.theme.fontSizes.sm};
    color: ${p => p.theme.colors.text};
    background: ${p => p.theme.colors.background};
    resize: vertical;
    min-height: 80px;
    box-sizing: border-box;
    font-family: inherit;

    &:focus {
        outline: none;
        border-color: ${p => p.theme.colors.primary};
        box-shadow: 0 0 0 3px ${p => p.theme.colors.primary}22;
    }
`;

const Row = styled.div`
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 12px;
`;

const Actions = styled.div`
    display: flex;
    gap: 12px;
    justify-content: flex-end;
    margin-top: 24px;
`;

const CancelBtn = styled.button`
    padding: 10px 20px;
    border: 1px solid ${p => p.theme.colors.border};
    border-radius: 8px;
    background: transparent;
    color: ${p => p.theme.colors.textMuted};
    font-size: ${p => p.theme.fontSizes.sm};
    cursor: pointer;

    &:hover { background: ${p => p.theme.colors.background}; }
`;

const SaveBtn = styled.button`
    padding: 10px 24px;
    border: none;
    border-radius: 8px;
    background: ${p => p.theme.colors.primary};
    color: #fff;
    font-size: ${p => p.theme.fontSizes.sm};
    font-weight: 600;
    cursor: pointer;

    &:hover { opacity: 0.9; }
    &:disabled { opacity: 0.5; cursor: not-allowed; }
`;

const ErrorMsg = styled.p`
    color: ${p => p.theme.colors.error || '#e53e3e'};
    font-size: ${p => p.theme.fontSizes.xs};
    margin: 4px 0 0;
`;

interface Props {
    initial?: BatchContractor | null;
    onSave: (data: ContractorRequest) => Promise<void>;
    onClose: () => void;
}

export function ContractorFormModal({ initial, onSave, onClose }: Props) {
    const [name, setName] = useState(initial?.name ?? '');
    const [taxId, setTaxId] = useState(initial?.taxId ?? '');
    const [address, setAddress] = useState(initial?.address ?? '');
    const [contactPerson, setContactPerson] = useState(initial?.contactPersonName ?? '');
    const [email, setEmail] = useState(initial?.email ?? '');
    const [phone, setPhone] = useState(initial?.phone ?? '');
    const [notes, setNotes] = useState(initial?.notes ?? '');
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');

    async function handleSave() {
        if (!name.trim()) { setError('Nazwa kontrahenta jest wymagana'); return; }
        setSaving(true);
        setError('');
        try {
            await onSave({
                name: name.trim(),
                taxId: taxId.trim() || undefined,
                address: address.trim() || undefined,
                contactPersonName: contactPerson.trim() || undefined,
                email: email.trim() || undefined,
                phone: phone.trim() || undefined,
                notes: notes.trim() || undefined,
            });
            onClose();
        } catch {
            setError('Nie udało się zapisać kontrahenta. Spróbuj ponownie.');
        } finally {
            setSaving(false);
        }
    }

    return (
        <Overlay onClick={onClose}>
            <Modal onClick={e => e.stopPropagation()}>
                <ModalTitle>{initial ? 'Edytuj kontrahenta' : 'Nowy kontrahent'}</ModalTitle>

                <Field>
                    <Label>Nazwa kontrahenta *</Label>
                    <Input value={name} onChange={e => setName(e.target.value)} placeholder="np. Salon AUDI Warszawa" />
                    {error && !name.trim() && <ErrorMsg>{error}</ErrorMsg>}
                </Field>

                <Row>
                    <Field>
                        <Label>NIP</Label>
                        <Input value={taxId} onChange={e => setTaxId(e.target.value)} placeholder="000-000-00-00" />
                    </Field>
                    <Field>
                        <Label>Telefon</Label>
                        <Input value={phone} onChange={e => setPhone(e.target.value)} placeholder="+48 000 000 000" />
                    </Field>
                </Row>

                <Field>
                    <Label>Email</Label>
                    <Input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="kontakt@firma.pl" />
                </Field>

                <Field>
                    <Label>Osoba kontaktowa</Label>
                    <Input value={contactPerson} onChange={e => setContactPerson(e.target.value)} placeholder="Jan Kowalski" />
                </Field>

                <Field>
                    <Label>Adres</Label>
                    <Input value={address} onChange={e => setAddress(e.target.value)} placeholder="ul. Przykładowa 1, 00-000 Warszawa" />
                </Field>

                <Field>
                    <Label>Uwagi</Label>
                    <Textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Dodatkowe informacje..." />
                </Field>

                {error && name.trim() && <ErrorMsg>{error}</ErrorMsg>}

                <Actions>
                    <CancelBtn onClick={onClose}>Anuluj</CancelBtn>
                    <SaveBtn onClick={handleSave} disabled={saving}>
                        {saving ? 'Zapisywanie...' : 'Zapisz'}
                    </SaveBtn>
                </Actions>
            </Modal>
        </Overlay>
    );
}
