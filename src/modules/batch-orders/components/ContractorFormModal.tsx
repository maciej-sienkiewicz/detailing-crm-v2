// src/modules/batch-orders/components/ContractorFormModal.tsx
//
// Karta kontrahenta. Adres e-mail i NIP są sprawdzane przed zapisem: zestawienie idzie
// na ten adres i z tym NIP-em, a dawniej zapisywało się wszystko - „ksiegowosc@flota"
// blokował potem „Utwórz zestawienie" bez słowa wyjaśnienia.
import { useState } from 'react';
import { capitalizeFirst } from '@/common/utils/capitalizeFirst';
import { isValidEmail, validatePolishNip } from '@/common/utils/validators';
import { ConfirmationModal } from '@/common/components/ConfirmationModal';
import { problemDetail } from '@/core/problem';
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

/**
 * Błąd NIP-u albo null. Sprawdzamy tylko polski NIP (10 cyfr, z myślnikami albo bez);
 * numer VAT z prefiksem kraju (np. DE123456789) przechodzi bez sumy kontrolnej.
 */
function nipProblem(value: string): string | null {
    const clean = value.replace(/[\s-]/g, '');
    if (!clean || /^[A-Za-z]{2}/.test(clean)) return null;
    if (!/^\d{10}$/.test(clean)) return 'NIP ma 10 cyfr.';
    return validatePolishNip(clean) ? null : 'Ten NIP ma błędną cyfrę kontrolną. Sprawdź, czy nie ma literówki.';
}

interface Props {
    initial?: BatchContractor | null;
    /**
     * Dane podpowiedziane NOWEMU kontrahentowi - przy wydaniu wizyty z karty klienta,
     * żeby nie przepisywać nazwy i NIP-u ręcznie. Przy edycji ([initial]) pomijane.
     */
    prefill?: ContractorRequest;
    onSave: (data: ContractorRequest) => Promise<void>;
    onClose: () => void;
}

export function ContractorFormModal({ initial, prefill, onSave, onClose }: Props) {
    const start = initial ?? prefill;
    const [name, setName] = useState(start?.name ?? '');
    const [taxId, setTaxId] = useState(start?.taxId ?? '');
    const [address, setAddress] = useState(start?.address ?? '');
    const [contactPerson, setContactPerson] = useState(start?.contactPersonName ?? '');
    const [email, setEmail] = useState(start?.email ?? '');
    const [phone, setPhone] = useState(start?.phone ?? '');
    const [notes, setNotes] = useState(start?.notes ?? '');
    const [saving, setSaving] = useState(false);
    const [nameError, setNameError] = useState('');
    const [emailError, setEmailError] = useState('');
    const [nipError, setNipError] = useState('');
    const [apiError, setApiError] = useState('');
    const [confirmDiscard, setConfirmDiscard] = useState(false);

    const snapshot = () => JSON.stringify([name, taxId, address, contactPerson, email, phone, notes].map(v => v.trim()));
    const [initialSnapshot] = useState(snapshot);
    const dirty = snapshot() !== initialSnapshot;

    function requestClose() {
        if (saving) return;
        if (dirty) setConfirmDiscard(true);
        else onClose();
    }

    // Przy nowym kontrahencie GUS wypełnia kartę. Przy edycji tylko puste pola: dawniej
    // nadpisywał bez pytania adres i telefon, które ktoś właśnie poprawił ręcznie.
    function handleGusData(data: CompanyInfoResponse) {
        const fill = (current: string, next: string | null | undefined, set: (v: string) => void) => {
            if (next && (!initial || !current.trim())) set(next);
        };
        fill(name, data.name, setName);
        fill(email, data.email, setEmail);
        fill(phone, data.phone, setPhone);
        fill(address, formatGusAddress(data.address), setAddress);
    }

    async function handleSave() {
        const nameProblem = name.trim() ? '' : 'Wpisz nazwę kontrahenta.';
        const emailProblem = email.trim() && !isValidEmail(email.trim()) ? 'Ten adres e-mail jest niepoprawny. Popraw go, bo na niego wysyłamy zestawienia.' : '';
        const taxProblem = nipProblem(taxId) ?? '';
        setNameError(nameProblem);
        setEmailError(emailProblem);
        setNipError(taxProblem);
        if (nameProblem || emailProblem || taxProblem) return;
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
        } catch (e) {
            setApiError(problemDetail(e, 'Nie udało się zapisać kontrahenta. Spróbuj ponownie.'));
        } finally {
            setSaving(false);
        }
    }

    return (
        <>
        <ModalShell isOpen onClose={requestClose} size="md">
            <ModalHeader>
                <ModalTitleGroup>
                    <ModalTitle>{initial ? 'Edytuj kontrahenta' : 'Nowy kontrahent'}</ModalTitle>
                </ModalTitleGroup>
                <CloseBtn onClick={requestClose} />
            </ModalHeader>

            <ModalContent>
                {apiError && <FormAlertBanner>{apiError}</FormAlertBanner>}

                <FormField>
                    <FieldLabel htmlFor="co-name">Nazwa kontrahenta *</FieldLabel>
                    <InputShell $hasError={!!nameError}>
                        <BareInput
                            id="co-name"
                            value={name}
                            onChange={e => { setName(capitalizeFirst(e.target.value)); setNameError(''); }}
                            placeholder="np. Salon AUDI Warszawa"
                        />
                    </InputShell>
                    {nameError && <FormErrorMsg>{nameError}</FormErrorMsg>}
                </FormField>

                <FormField>
                    <FieldLabel>NIP</FieldLabel>
                    <NipInputWithGus
                        value={taxId}
                        onChange={v => { setTaxId(v); setNipError(''); }}
                        onFetch={handleGusData}
                        placeholder="000-000-00-00"
                    />
                    {nipError && <FormErrorMsg>{nipError}</FormErrorMsg>}
                </FormField>

                <FormGrid $columns={2}>
                    <FormField>
                        <FieldLabel htmlFor="co-email">E-mail</FieldLabel>
                        <InputShell $hasError={!!emailError}>
                            <BareInput
                                id="co-email"
                                type="email"
                                value={email}
                                onChange={e => { setEmail(e.target.value); setEmailError(''); }}
                                placeholder="kontakt@firma.pl"
                            />
                        </InputShell>
                        {emailError && <FormErrorMsg>{emailError}</FormErrorMsg>}
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
                            onChange={e => setNotes(capitalizeFirst(e.target.value))}
                            placeholder="Dodatkowe informacje…"
                            style={{ minHeight: 72 }}
                        />
                    </InputShellTextArea>
                </FormField>
            </ModalContent>

            <ModalFooter>
                <SharedButton $variant="secondary" type="button" onClick={requestClose}>Anuluj</SharedButton>
                <SharedButton $variant="primary" type="button" onClick={handleSave} disabled={saving}>
                    {saving ? 'Zapisywanie…' : 'Zapisz'}
                </SharedButton>
            </ModalFooter>
        </ModalShell>
        <ConfirmationModal
            isOpen={confirmDiscard}
            title="Porzucić zmiany?"
            message="Zmiany w karcie kontrahenta nie zostały zapisane."
            variant="warning"
            confirmText="Porzuć"
            cancelText="Wróć do edycji"
            onConfirm={() => { setConfirmDiscard(false); onClose(); }}
            onCancel={() => setConfirmDiscard(false)}
        />
        </>
    );
}
