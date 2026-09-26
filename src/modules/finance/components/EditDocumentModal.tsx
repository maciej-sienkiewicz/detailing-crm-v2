import React, { useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import styled from 'styled-components';
import { ChevronDown } from 'lucide-react';
import { PaymentMethod, DocumentDirection, type FinancialDocument } from '../types';
import { useUpdateDocument } from '../hooks/useFinance';
import { documentAmountsFrom, documentAmountsToCents, type DocumentAmounts } from '../utils/amountInputs';
import { apiErrorMessage } from '@/modules/visits/api/apiError';
import { Notice } from '@/common/components/ui';
import { DocumentAmountFields } from './DocumentAmountFields';
import {
    ModalShell,
    ModalHeader,
    ModalTitleGroup,
    ModalTitle,
    ModalSubtitle,
    ModalContent,
    ModalFooter,
    ModalSectionTitle,
    CloseBtn,
} from '@/common/components/ModalKit';
import { SharedButton } from '@/common/styles';
import {
    FormGrid,
    FormField,
    FieldLabel,
    InputShell,
    InputShellTextArea,
    BareInput,
    BareTextArea,
    FormAlertBanner,
} from '@/common/components/Form';
import { NipInputWithGus, type CompanyInfoResponse } from '@/common/components/NipInputWithGus';

// ─── Direction badge ──────────────────────────────────────────────────────────

const DirectionBadge = styled.span<{ $income: boolean }>`
    display: inline-flex;
    align-items: center;
    padding: 3px 10px;
    border-radius: 6px;
    font-size: 12px;
    font-weight: 600;
    background: ${p => p.$income ? '#dcfce7' : '#fee2e2'};
    color:       ${p => p.$income ? '#166534' : '#991b1b'};
    border:      1px solid ${p => p.$income ? '#86efac' : '#fca5a5'};
`;

const DirectionRow = styled.div`
    display: flex;
    align-items: center;
    gap: 10px;
    margin-bottom: 4px;
`;

const ReadOnlyValue = styled.span`
    display: block;
    padding: 12px 0;
    font-size: 14px;
    font-weight: 600;
    color: #0f172a;
`;

const LockNote = styled.div`
    margin-bottom: 20px;
`;

const DirectionHint = styled.p`
    font-size: 11px;
    color: ${p => p.theme.colors.textMuted};
    margin: 0 0 16px;
`;

// ─── Custom Select (portal-based) ────────────────────────────────────────────

const SelectTrigger = styled.button`
    padding: 12px 14px;
    font-size: 14px;
    border: 1.5px solid #e2e8f0;
    border-radius: 10px;
    background: white;
    color: #0f172a;
    outline: none;
    width: 100%;
    box-sizing: border-box;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    text-align: left;
    transition: border-color 0.15s ease, box-shadow 0.15s ease;

    &:hover { border-color: #cbd5e1; }
    &:focus {
        border-color: var(--brand-primary);
        box-shadow: 0 0 0 3px rgba(14, 165, 233, 0.1);
    }
`;

const SelectBackdrop = styled.div`
    position: fixed;
    inset: 0;
    z-index: 1199;
`;

const SelectPanel = styled.div`
    position: fixed;
    min-width: 200px;
    background: #ffffff;
    border-radius: 16px;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.16);
    z-index: 1200;
    overflow: hidden;
    border: 1px solid rgba(0, 0, 0, 0.08);
`;

const SelectBody = styled.div`padding: 8px;`;

const SelectOption = styled.button<{ $active: boolean }>`
    display: flex;
    align-items: center;
    width: 100%;
    padding: 10px 12px;
    text-align: left;
    font-size: 14px;
    font-weight: ${p => p.$active ? 600 : 400};
    border: 1px solid ${p => p.$active ? 'rgba(99, 102, 241, 0.2)' : 'transparent'};
    border-radius: 10px;
    background: ${p => p.$active ? 'rgba(99, 102, 241, 0.06)' : 'transparent'};
    color: ${p => p.$active ? '#0f172a' : '#64748b'};
    cursor: pointer;
    transition: all 0.15s ease;
    &:hover {
        background: ${p => p.$active ? 'rgba(99, 102, 241, 0.08)' : 'rgba(0, 0, 0, 0.02)'};
        color: #0f172a;
    }
`;

interface ModalSelectProps {
    value: string;
    onChange: (value: string) => void;
    options: { value: string; label: string }[];
}

const ModalSelect: React.FC<ModalSelectProps> = ({ value, onChange, options }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [panelPos, setPanelPos] = useState<{ top: number; left: number; width: number } | null>(null);
    const triggerRef = useRef<HTMLButtonElement>(null);
    const selectedLabel = options.find(o => o.value === value)?.label ?? '';

    const handleToggle = () => {
        if (!isOpen && triggerRef.current) {
            const rect = triggerRef.current.getBoundingClientRect();
            setPanelPos({ top: rect.bottom + 4, left: rect.left, width: rect.width });
        }
        setIsOpen(prev => !prev);
    };

    const handleSelect = (val: string) => { onChange(val); setIsOpen(false); };

    return (
        <>
            {isOpen && <SelectBackdrop onClick={() => setIsOpen(false)} />}
            <SelectTrigger ref={triggerRef} type="button" onClick={handleToggle}>
                <span>{selectedLabel}</span>
                <ChevronDown size={14} strokeWidth={2.5} style={{ flexShrink: 0 }} />
            </SelectTrigger>
            {isOpen && panelPos && createPortal(
                <SelectPanel style={{ top: panelPos.top, left: panelPos.left, minWidth: panelPos.width }}>
                    <SelectBody>
                        {options.map(opt => (
                            <SelectOption key={opt.value} $active={value === opt.value} onClick={() => handleSelect(opt.value)}>
                                {opt.label}
                            </SelectOption>
                        ))}
                    </SelectBody>
                </SelectPanel>,
                document.body
            )}
        </>
    );
};

// ─── Component ────────────────────────────────────────────────────────────────

interface Props {
    document: FinancialDocument | null;
    onClose: () => void;
}

interface FormState {
    paymentMethod:    string;
    amounts:          DocumentAmounts;
    issueDate:        string;
    dueDate:          string;
    description:      string;
    counterpartyName: string;
    counterpartyNip:  string;
}

function docToForm(doc: FinancialDocument): FormState {
    return {
        paymentMethod:    doc.paymentMethod,
        amounts:          documentAmountsFrom(doc.totalNet, doc.totalGross),
        issueDate:        doc.issueDate,
        dueDate:          doc.dueDate ?? '',
        description:      doc.description  ?? '',
        counterpartyName: doc.counterpartyName ?? '',
        counterpartyNip:  doc.counterpartyNip  ?? '',
    };
}

/*
 * Formularz dostaje `key` dokumentu i stan początkowy z niego, zamiast przepisywać
 * dokument do stanu w efekcie: inny dokument = nowy formularz, bez kaskady renderów.
 */
export const EditDocumentModal: React.FC<Props> = ({ document, onClose }) =>
    document ? <EditDocumentForm key={document.id} document={document} onClose={onClose} /> : null;

const EditDocumentForm: React.FC<{ document: FinancialDocument; onClose: () => void }> = ({ document, onClose }) => {
    const updateDoc = useUpdateDocument();
    const [error, setError] = useState<string | null>(null);
    const [form, setForm] = useState<FormState>(() => docToForm(document));

    const isIncome = document.direction === DocumentDirection.INCOME;
    // Te same reguły pilnuje backend (UpdateFinancialDocumentHandler) - tu tylko po to,
    // żeby nie dało się wpisać zmiany, którą serwer i tak odrzuci.
    const isKsefInvoice = !!document.ksefInvoiceId;
    const isFromVisit = document.source === 'VISIT';
    const amountsLocked = isKsefInvoice || isFromVisit;

    const set = (key: keyof FormState) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
        setForm(prev => prev && ({ ...prev, [key]: e.target.value }));

    const setField = (key: keyof FormState) => (value: string) =>
        setForm(prev => prev && ({ ...prev, [key]: value }));

    const handleGUSFetch = (data: CompanyInfoResponse) => {
        setForm(prev => prev && ({
            ...prev,
            counterpartyName: data.name,
            counterpartyNip:  data.nip,
        }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        const cents = documentAmountsToCents(form.amounts);
        if (!cents || cents.totalGross <= 0) {
            setError('Kwota brutto musi być większa od zera.');
            return;
        }
        if (form.paymentMethod === PaymentMethod.TRANSFER && !form.dueDate) {
            setError('Termin płatności jest wymagany dla przelewów.');
            return;
        }

        try {
            await updateDoc.mutateAsync({
                id: document.id,
                data: {
                    // Typ się nie zmienia (numer należy do serii) - idzie, żeby serwer
                    // odrzucił zapis, gdyby okno pokazywało nieaktualny dokument.
                    documentType:     document.documentType,
                    paymentMethod:    form.paymentMethod,
                    ...cents,
                    issueDate:        form.issueDate,
                    dueDate:          form.dueDate || null,
                    description:      form.description      || null,
                    counterpartyName: form.counterpartyName || null,
                    counterpartyNip:  form.counterpartyNip  || null,
                },
            });
            onClose();
        } catch (e) {
            setError(apiErrorMessage(e, 'Nie udało się zapisać zmian. Spróbuj ponownie.'));
        }
    };

    return (
        <ModalShell isOpen onClose={onClose} size="md">
            <ModalHeader>
                <ModalTitleGroup>
                    <ModalTitle>Edytuj dokument</ModalTitle>
                    <ModalSubtitle>{document.documentNumber}</ModalSubtitle>
                </ModalTitleGroup>
                <CloseBtn onClick={onClose} />
            </ModalHeader>

            <ModalContent>
                {error && <FormAlertBanner>{error}</FormAlertBanner>}

                <DirectionRow>
                    <DirectionBadge $income={isIncome}>
                        {isIncome ? 'Przychód' : 'Koszt'}
                    </DirectionBadge>
                </DirectionRow>
                <DirectionHint>Kierunek dokumentu jest stały. Aby go zmienić, usuń i utwórz nowy.</DirectionHint>

                <form id="edit-document-form" onSubmit={handleSubmit} autoComplete="off">
                    {isKsefInvoice && (
                        <LockNote>
                            <Notice tone="info" title="Dokument faktury KSeF">
                                Kwoty, płatność, daty i nabywcę faktury przyjętej w KSeF zmienia się fakturą
                                korygującą. Tutaj możesz zmienić opis.
                            </Notice>
                        </LockNote>
                    )}
                    {!isKsefInvoice && isFromVisit && (
                        <LockNote>
                            <Notice tone="info" title="Dokument z wydania pojazdu">
                                Kwota musi zgadzać się z kwotą wizyty. Możesz poprawić formę płatności, daty i opis.
                            </Notice>
                        </LockNote>
                    )}

                    <ModalSectionTitle>Rodzaj dokumentu</ModalSectionTitle>
                    <FormGrid>
                        <FormField>
                            <FieldLabel as="span">Typ dokumentu</FieldLabel>
                            {/* Bez wyboru: numer {document.documentNumber} należy do serii tego typu. */}
                            <ReadOnlyValue>{document.documentTypeLabel}</ReadOnlyValue>
                        </FormField>

                        <FormField>
                            <FieldLabel>Metoda płatności</FieldLabel>
                            {isKsefInvoice ? (
                                <ReadOnlyValue>{document.paymentMethodLabel}</ReadOnlyValue>
                            ) : (
                                <ModalSelect
                                    value={form.paymentMethod}
                                    onChange={setField('paymentMethod')}
                                    options={[
                                        { value: PaymentMethod.CASH,          label: 'Gotówka' },
                                        { value: PaymentMethod.CARD,          label: 'Karta' },
                                        { value: PaymentMethod.TRANSFER,      label: 'Przelew' },
                                        { value: PaymentMethod.BLIK_NA_NUMER, label: 'BLIK na numer' },
                                        { value: PaymentMethod.BLIK_TERMINAL, label: 'BLIK terminal' },
                                        { value: PaymentMethod.OTHER,         label: 'Inne' },
                                    ]}
                                />
                            )}
                        </FormField>
                    </FormGrid>
                    {!isKsefInvoice && (form.paymentMethod === PaymentMethod.CASH) !== (document.paymentMethod === PaymentMethod.CASH) && (
                        <DirectionHint>
                            {form.paymentMethod === PaymentMethod.CASH
                                ? 'Po zapisie kwota wpłynie do kasy jako korekta dokumentu.'
                                : 'Po zapisie kwota wyjdzie z kasy jako korekta dokumentu.'}
                        </DirectionHint>
                    )}

                    <ModalSectionTitle>Kwoty</ModalSectionTitle>
                    <DocumentAmountFields
                        idPrefix="ed"
                        value={form.amounts}
                        onChange={amounts => setForm(prev => prev && ({ ...prev, amounts }))}
                        disabled={amountsLocked}
                    />

                    <ModalSectionTitle>Daty</ModalSectionTitle>
                    <FormGrid>
                        <FormField>
                            <FieldLabel htmlFor="ed-issueDate">Data wystawienia</FieldLabel>
                            <InputShell>
                                <BareInput
                                    id="ed-issueDate"
                                    disabled={isKsefInvoice}
                                    type="date"
                                    value={form.issueDate}
                                    onChange={set('issueDate')}
                                    required
                                    autoComplete="new-password"
                                />
                            </InputShell>
                        </FormField>

                        <FormField>
                            <FieldLabel htmlFor="ed-dueDate">
                                Termin płatności
                                {form.paymentMethod === PaymentMethod.TRANSFER && (
                                    <span style={{ color: '#ef4444', marginLeft: 4 }}>*</span>
                                )}
                            </FieldLabel>
                            <InputShell>
                                <BareInput
                                    id="ed-dueDate"
                                    disabled={isKsefInvoice}
                                    type="date"
                                    value={form.dueDate}
                                    onChange={set('dueDate')}
                                    required={form.paymentMethod === PaymentMethod.TRANSFER}
                                    autoComplete="new-password"
                                />
                            </InputShell>
                        </FormField>
                    </FormGrid>

                    <ModalSectionTitle>Kontrahent</ModalSectionTitle>
                    <FormGrid>
                        <FormField $fullWidth>
                            <FieldLabel htmlFor="ed-counterpartyName">Nazwa kontrahenta</FieldLabel>
                            <InputShell>
                                <BareInput
                                    id="ed-counterpartyName"
                                    disabled={isKsefInvoice}
                                    type="text"
                                    placeholder="Jan Kowalski / Firma Sp. z o.o."
                                    value={form.counterpartyName}
                                    onChange={set('counterpartyName')}
                                    autoComplete="new-password"
                                />
                            </InputShell>
                        </FormField>

                        <FormField $fullWidth>
                            <FieldLabel htmlFor="ed-counterpartyNip">NIP</FieldLabel>
                            {isKsefInvoice ? (
                                <ReadOnlyValue id="ed-counterpartyNip">{form.counterpartyNip || 'Brak'}</ReadOnlyValue>
                            ) : (
                                <NipInputWithGus
                                    id="ed-counterpartyNip"
                                    value={form.counterpartyNip}
                                    onChange={setField('counterpartyNip')}
                                    onFetch={handleGUSFetch}
                                    placeholder="1234567890"
                                />
                            )}
                        </FormField>
                    </FormGrid>

                    <ModalSectionTitle>Opis</ModalSectionTitle>
                    <FormGrid>
                        <FormField $fullWidth>
                            <FieldLabel htmlFor="ed-description">Opis / tytuł</FieldLabel>
                            <InputShellTextArea>
                                <BareTextArea
                                    id="ed-description"
                                    placeholder="Np. Detailing kompletny + powłoka ceramiczna"
                                    value={form.description}
                                    onChange={set('description')}
                                    autoComplete="new-password"
                                />
                            </InputShellTextArea>
                        </FormField>
                    </FormGrid>
                </form>
            </ModalContent>

            <ModalFooter>
                <SharedButton $variant="secondary" type="button" onClick={onClose}>Anuluj</SharedButton>
                <SharedButton
                    $variant="primary"
                    type="submit"
                    form="edit-document-form"
                    disabled={updateDoc.isPending}
                >
                    {updateDoc.isPending ? 'Zapisywanie...' : 'Zapisz zmiany'}
                </SharedButton>
            </ModalFooter>
        </ModalShell>
    );
};
