import { useState } from 'react';
import styled from 'styled-components';
import {
    ModalShell, ModalHeader, ModalTitleGroup, ModalTitle,
    ModalContent, ModalFooter, CloseBtn,
} from '@/common/components/ModalKit';
import {
    FormField, FormGrid, FieldLabel,
    InputShell, BareInput, InputShellTextArea, BareTextArea,
    FormErrorMsg, FormAlertBanner,
} from '@/common/components/Form';
import { SharedButton } from '@/common/styles';
import { NipInputWithGus, type CompanyInfoResponse } from '@/common/components/NipInputWithGus';
import type { BatchContractor, ContractorRequest } from '../types';

const NipWrapper = styled(InputShell)``;

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
    const [nameError, setNameError] = useState('');
    const [apiError, setApiError] = useState('');

    function handleGusData(data: CompanyInfoResponse) {
        if (data.name) setName(data.name);
        if (data.email) setEmail(data.email);
        if (data.phone) setPhone(data.phone);
        const formatted = formatGusAddress(data.address);
        if (formatted) setAddress(formatted);
    }

    async function handleSave() {
        if (!name.trim()) { setNameError('Nazwa kontrahenta jest wymagana'); return; }
        setNameError('');
        setApiError('');
        setSaving(true);
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
            setApiError('Nie udało się zapisać kontrahenta. Spróbuj ponownie.');
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
                {apiError && <FormAlertBanner>{apiError}</FormAlertBanner>}

                <FormField>
                    <FieldLabel htmlFor="co-name">Nazwa kontrahenta *</FieldLabel>
                    <InputShell $hasError={!!nameError}>
                        <BareInput
                            id="co-name"
                            value={name}
                            onChange={e => { setName(e.target.value); setNameError(''); }}
                            placeholder="np. Salon AUDI Warszawa"
                        />
                    </InputShell>
                    {nameError && <FormErrorMsg>{nameError}</FormErrorMsg>}
                </FormField>

                <FormField>
                    <FieldLabel>NIP</FieldLabel>
                    <NipInputWithGus
                        value={taxId}
                        onChange={setTaxId}
                        onFetch={handleGusData}
                        placeholder="000-000-00-00"
                    />
                </FormField>

                <FormGrid $columns={2}>
                    <FormField>
                        <FieldLabel htmlFor="co-email">Email</FieldLabel>
                        <InputShell>
                            <BareInput
                                id="co-email"
                                type="email"
                                value={email}
                                onChange={e => setEmail(e.target.value)}
                                placeholder="kontakt@firma.pl"
                            />
                        </InputShell>
                    </FormField>
                    <FormField>
                        <FieldLabel htmlFor="co-phone">Telefon</FieldLabel>
                        <InputShell>
                            <BareInput
                                id="co-phone"
                                value={phone}
                                onChange={e => setPhone(e.target.value)}
                                placeholder="+48 000 000 000"
                            />
                        </InputShell>
                    </FormField>
                </FormGrid>

                <FormField>
                    <FieldLabel htmlFor="co-contact">Osoba kontaktowa</FieldLabel>
                    <InputShell>
                        <BareInput
                            id="co-contact"
                            value={contactPerson}
                            onChange={e => setContactPerson(e.target.value)}
                            placeholder="Jan Kowalski"
                        />
                    </InputShell>
                </FormField>

                <FormField>
                    <FieldLabel htmlFor="co-address">Adres</FieldLabel>
                    <InputShell>
                        <BareInput
                            id="co-address"
                            value={address}
                            onChange={e => setAddress(e.target.value)}
                            placeholder="ul. Przykładowa 1, 00-000 Warszawa"
                        />
                    </InputShell>
                </FormField>

                <FormField>
                    <FieldLabel htmlFor="co-notes">Uwagi</FieldLabel>
                    <InputShellTextArea>
                        <BareTextArea
                            id="co-notes"
                            value={notes}
                            onChange={e => setNotes(e.target.value)}
                            placeholder="Dodatkowe informacje..."
                            style={{ minHeight: 72 }}
                        />
                    </InputShellTextArea>
                </FormField>
            </ModalContent>

            <ModalFooter>
                <SharedButton $variant="secondary" type="button" onClick={onClose}>Anuluj</SharedButton>
                <SharedButton $variant="primary" type="button" onClick={handleSave} disabled={saving}>
                    {saving ? 'Zapisywanie...' : 'Zapisz'}
                </SharedButton>
            </ModalFooter>
        </ModalShell>
    );
}
