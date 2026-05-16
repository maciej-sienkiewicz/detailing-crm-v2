import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import styled from 'styled-components';
import { ChevronDown } from 'lucide-react';
import { DocumentType, PaymentMethod, DocumentDirection } from '../types';
import { useCreateDocument } from '../hooks/useFinance';
import { inputValueToGrosze } from '../utils/formatters';
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
import {
    FormGrid,
    FormField,
    FieldLabel,
    InputShell,
    InputShellTextArea,
    BareInput,
    BareTextArea,
    FormAlertBanner,
    FormTabBar,
    FormTabBtn,
    FormTabPanel,
} from '@/common/components/Form';

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

    &:hover {
        border-color: #cbd5e1;
    }

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

const SelectBody = styled.div`
    padding: 8px;
`;

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

type TabId = 'document' | 'amounts' | 'counterparty';

interface Props {
    isOpen: boolean;
    onClose: () => void;
}

interface FormState {
    documentType:     string;
    paymentMethod:    string;
    totalNetDisplay:  string;
    totalVatDisplay:  string;
    currency:         string;
    issueDate:        string;
    dueDate:          string;
    description:      string;
    counterpartyName: string;
    counterpartyNip:  string;
}

const today = new Date().toISOString().split('T')[0];
const VAT_RATE = 0.23;

const EMPTY_FORM: FormState = {
    documentType:     DocumentType.INVOICE,
    paymentMethod:    PaymentMethod.TRANSFER,
    totalNetDisplay:  '',
    totalVatDisplay:  '',
    currency:         'PLN',
    issueDate:        today,
    dueDate:          '',
    description:      '',
    counterpartyName: '',
    counterpartyNip:  '',
};

export const CreateDocumentModal: React.FC<Props> = ({ isOpen, onClose }) => {
    const createDoc = useCreateDocument();
    const [activeTab, setActiveTab] = useState<TabId>('document');
    const [error, setError] = useState<string | null>(null);
    const [form, setForm] = useState<FormState>(EMPTY_FORM);

    useEffect(() => {
        if (!isOpen) {
            setForm({ ...EMPTY_FORM, issueDate: new Date().toISOString().split('T')[0] });
            setError(null);
            setActiveTab('document');
        }
    }, [isOpen]);

    const handleNetChange = (value: string) => {
        const net = parseFloat(value.replace(',', '.'));
        setForm(prev => ({
            ...prev,
            totalNetDisplay: value,
            totalVatDisplay: isNaN(net) ? '' : (net * VAT_RATE).toFixed(2),
        }));
    };

    const set = (key: keyof FormState) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
        setForm(prev => ({ ...prev, [key]: e.target.value }));

    const setField = (key: keyof FormState) => (value: string) =>
        setForm(prev => ({ ...prev, [key]: value }));

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        const totalNet   = inputValueToGrosze(form.totalNetDisplay);
        const totalVat   = inputValueToGrosze(form.totalVatDisplay);
        const totalGross = totalNet + totalVat;

        if (totalNet <= 0) {
            setError('Kwota netto musi być większa od zera.');
            return;
        }
        if (form.paymentMethod === PaymentMethod.TRANSFER && !form.dueDate) {
            setError('Termin płatności jest wymagany dla przelewów.');
            return;
        }

        try {
            await createDoc.mutateAsync({
                documentType:     form.documentType,
                direction:        DocumentDirection.INCOME,
                paymentMethod:    form.paymentMethod,
                totalNet,
                totalVat,
                totalGross,
                currency:         form.currency || 'PLN',
                issueDate:        form.issueDate,
                dueDate:          form.dueDate || null,
                description:      form.description || null,
                counterpartyName: form.counterpartyName || null,
                counterpartyNip:  form.counterpartyNip  || null,
            });
            onClose();
        } catch {
            setError('Nie udało się zapisać dokumentu. Spróbuj ponownie.');
        }
    };

    return (
        <ModalShell isOpen={isOpen} onClose={onClose} size="md">
            <ModalHeader>
                <ModalTitleGroup>
                    <ModalTitle>Nowy dokument przychodowy</ModalTitle>
                    <ModalSubtitle>Wprowadź dane dokumentu finansowego</ModalSubtitle>
                </ModalTitleGroup>
                <CloseBtn onClick={onClose} />
            </ModalHeader>

            <ModalContent style={{ paddingTop: '8px' }}>
                {error && <FormAlertBanner>{error}</FormAlertBanner>}

                <form id="create-document-form" onSubmit={handleSubmit} autoComplete="off">
                    <FormTabBar>
                        <FormTabBtn type="button" $active={activeTab === 'document'} onClick={() => setActiveTab('document')}>
                            Dokument
                        </FormTabBtn>
                        <FormTabBtn type="button" $active={activeTab === 'amounts'} onClick={() => setActiveTab('amounts')}>
                            Kwoty
                        </FormTabBtn>
                        <FormTabBtn type="button" $active={activeTab === 'counterparty'} onClick={() => setActiveTab('counterparty')}>
                            Kontrahent
                        </FormTabBtn>
                    </FormTabBar>

                    {/* ── Dokument ── */}
                    <FormTabPanel $active={activeTab === 'document'}>
                        <FormGrid>
                            <FormField>
                                <FieldLabel>Typ dokumentu</FieldLabel>
                                <ModalSelect
                                    value={form.documentType}
                                    onChange={setField('documentType')}
                                    options={[
                                        { value: DocumentType.INVOICE, label: 'Faktura' },
                                        { value: DocumentType.RECEIPT, label: 'Paragon' },
                                        { value: DocumentType.OTHER,   label: 'Inny' },
                                    ]}
                                />
                            </FormField>

                            <FormField>
                                <FieldLabel>Metoda płatności</FieldLabel>
                                <ModalSelect
                                    value={form.paymentMethod}
                                    onChange={setField('paymentMethod')}
                                    options={[
                                        { value: PaymentMethod.CASH,     label: 'Gotówka' },
                                        { value: PaymentMethod.CARD,     label: 'Karta' },
                                        { value: PaymentMethod.TRANSFER, label: 'Przelew' },
                                        { value: PaymentMethod.OTHER,    label: 'Inne' },
                                    ]}
                                />
                            </FormField>

                            <FormField>
                                <FieldLabel htmlFor="cd-issueDate">Data wystawienia</FieldLabel>
                                <InputShell>
                                    <BareInput
                                        id="cd-issueDate"
                                        type="date"
                                        value={form.issueDate}
                                        onChange={set('issueDate')}
                                        required
                                        autoComplete="new-password"
                                    />
                                </InputShell>
                            </FormField>

                            <FormField>
                                <FieldLabel htmlFor="cd-dueDate">
                                    Termin płatności
                                    {form.paymentMethod === PaymentMethod.TRANSFER && (
                                        <span style={{ color: '#ef4444', marginLeft: 4 }}>*</span>
                                    )}
                                </FieldLabel>
                                <InputShell>
                                    <BareInput
                                        id="cd-dueDate"
                                        type="date"
                                        value={form.dueDate}
                                        onChange={set('dueDate')}
                                        required={form.paymentMethod === PaymentMethod.TRANSFER}
                                        autoComplete="new-password"
                                    />
                                </InputShell>
                            </FormField>
                        </FormGrid>
                    </FormTabPanel>

                    {/* ── Kwoty ── */}
                    <FormTabPanel $active={activeTab === 'amounts'}>
                        <FormGrid>
                            <FormField>
                                <FieldLabel htmlFor="cd-netAmount">Kwota netto (PLN)</FieldLabel>
                                <InputShell>
                                    <BareInput
                                        id="cd-netAmount"
                                        type="number"
                                        step="0.01"
                                        min="0"
                                        placeholder="0.00"
                                        value={form.totalNetDisplay}
                                        onChange={e => handleNetChange(e.target.value)}
                                        required
                                        autoComplete="new-password"
                                    />
                                </InputShell>
                            </FormField>

                            <FormField>
                                <FieldLabel htmlFor="cd-vatAmount">VAT (23%)</FieldLabel>
                                <InputShell>
                                    <BareInput
                                        id="cd-vatAmount"
                                        type="number"
                                        step="0.01"
                                        min="0"
                                        placeholder="0.00"
                                        value={form.totalVatDisplay}
                                        onChange={set('totalVatDisplay')}
                                        autoComplete="new-password"
                                    />
                                </InputShell>
                            </FormField>
                        </FormGrid>
                    </FormTabPanel>

                    {/* ── Kontrahent ── */}
                    <FormTabPanel $active={activeTab === 'counterparty'}>
                        <FormGrid>
                            <FormField $fullWidth>
                                <FieldLabel htmlFor="cd-counterpartyName">Nazwa kontrahenta</FieldLabel>
                                <InputShell>
                                    <BareInput
                                        id="cd-counterpartyName"
                                        type="text"
                                        placeholder="Jan Kowalski / Firma Sp. z o.o."
                                        value={form.counterpartyName}
                                        onChange={set('counterpartyName')}
                                        autoComplete="new-password"
                                    />
                                </InputShell>
                            </FormField>

                            <FormField>
                                <FieldLabel htmlFor="cd-counterpartyNip">NIP</FieldLabel>
                                <InputShell>
                                    <BareInput
                                        id="cd-counterpartyNip"
                                        type="text"
                                        placeholder="1234567890"
                                        value={form.counterpartyNip}
                                        onChange={set('counterpartyNip')}
                                        autoComplete="new-password"
                                    />
                                </InputShell>
                            </FormField>

                            <FormField $fullWidth>
                                <FieldLabel htmlFor="cd-description">Opis / tytuł</FieldLabel>
                                <InputShellTextArea>
                                    <BareTextArea
                                        id="cd-description"
                                        placeholder="Np. Detailing kompletny + powłoka ceramiczna"
                                        value={form.description}
                                        onChange={set('description')}
                                        autoComplete="new-password"
                                    />
                                </InputShellTextArea>
                            </FormField>
                        </FormGrid>
                    </FormTabPanel>
                </form>
            </ModalContent>

            <ModalFooter>
                <SharedButton $variant="secondary" type="button" onClick={onClose}>Anuluj</SharedButton>
                <SharedButton
                    $variant="primary"
                    type="submit"
                    form="create-document-form"
                    disabled={createDoc.isPending}
                >
                    {createDoc.isPending ? 'Zapisywanie…' : 'Zapisz dokument'}
                </SharedButton>
            </ModalFooter>
        </ModalShell>
    );
};
