import { useState } from 'styled-components';
import styled from 'styled-components';
import {
    ModalShell, ModalHeader, ModalTitleGroup, ModalTitle,
    ModalContent, ModalFooter, CloseBtn,
} from '@/common/components/ModalKit';
import { NipInputWithGus, type CompanyInfoResponse } from '@/common/components/NipInputWithGus';
import type { BatchContractor, ContractorRequest } from '../types';

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

function formatGusAddress(addr: CompanyInfoResponse['address']): string {
    const parts: string[] = [];
    if (addr.street) {
        let line = addr.street;
        if (addr.buildingNumber) line += ' ' + addr.buildingNumber;
        if (addr.apartmentNumber) line += '/' + addr.apartmentNumber;
        parts.push(line);
    }
    const cityLine = [addr.postalCode, addr.city].filter(Boolean).join(' ');
    if (cityLine) parts.push(cityLine);
    return parts.join(', ');
}

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

    function handleGusData(data: CompanyInfoResponse) {
        if (data.name) setName(data.name);
        if (data.email) setEmail(data.email);
        if (data.phone) setPhone(data.phone);
        const formatted = formatGusAddress(data.address);
        if (formatted) setAddress(formatted);
    }

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
        <ModalShell isOpen onClose={onClose} size="md">
            <ModalHeader>
                <ModalTitleGroup>
                    <ModalTitle>{initial ? 'Edytuj kontrahenta' : 'Nowy kontrahent'}</ModalTitle>
                </ModalTitleGroup>
                <CloseBtn onClick={onClose} />
            </ModalHeader>

            <ModalContent>
                <Field>
                    <Label>Nazwa kontrahenta *</Label>
                    <Input value={name} onChange={e => setName(e.target.value)} placeholder="np. Salon AUDI Warszawa" />
                    {error && !name.trim() && <ErrorMsg>{error}</ErrorMsg>}
                </Field>

                <Field>
                    <Label>NIP</Label>
                    <NipInputWithGus
                        value={taxId}
                        onChange={setTaxId}
                        onFetch={handleGusData}
                        placeholder="000-000-00-00"
                    />
                </Field>

                <Row>
                    <Field>
                        <Label>Email</Label>
                        <Input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="kontakt@firma.pl" />
                    </Field>
                    <Field>
                        <Label>Telefon</Label>
                        <Input value={phone} onChange={e => setPhone(e.target.value)} placeholder="+48 000 000 000" />
                    </Field>
                </Row>

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
            </ModalContent>

            <ModalFooter>
                <CancelBtn onClick={onClose}>Anuluj</CancelBtn>
                <SaveBtn onClick={handleSave} disabled={saving}>
                    {saving ? 'Zapisywanie...' : 'Zapisz'}
                </SaveBtn>
            </ModalFooter>
        </ModalShell>
    );
}
