// src/modules/finance/components/AddExpenseModal.tsx
//
// „Dodaj dokument kosztowy" w zakładce „Dokumenty kosztowe": faktura spoza KSeF,
// paragon, rachunek albo inny koszt (opłata bankowa, mandat, abonament).
//
// Wcześniej dało się dodać tylko fakturę, a i ona nie trafiała do statystyk: serwer
// zapisywał sam nagłówek, a „Pozycje kosztowe" liczą się z pozycji. Teraz każdy dokument
// dostaje pozycję o nazwie z pola „Czego dotyczy" - po niej koszt grupuje się
// i kategoryzuje w statystykach.
//
// Kwoty idą w groszach razem ze stawką i stroną wpisaną przez człowieka - wpisane
// brutto zostaje brutto (CLAUDE.md §1).

import React, { useState, useEffect, useRef, useId } from 'react';
import { createPortal } from 'react-dom';
import styled from 'styled-components';
import { ChevronDown } from 'lucide-react';
import { useCreateExpense } from '../hooks/useKsef';
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
import { Segmented } from '@/common/components/ui';
import type { CostDocumentKind } from '../types';
import {
    COST_DESCRIPTION_PLACEHOLDER,
    COST_DOCUMENT_KINDS,
    COST_DOCUMENT_KIND_LABEL,
} from '../utils/costDocumentKinds';
import { handleZeroAwareKeyDown } from '@/common/utils/moneyInput';
import { priceInputsForVatRate, type PriceSide } from '@/common/utils/priceInputs';
import {
    EXPENSE_AMOUNT_INPUT,
    expenseAmountsPayload,
    expenseGrossForNet,
    expenseNetForGross,
    expenseVatRate,
} from '../utils/amountInputs';
import {
    FormGrid,
    FormField,
    FieldLabel,
    InputShell,
    BareInput,
    FormAlertBanner,
    FormTabBar,
    FormTabBtn,
    FormTabPanel,
} from '@/common/components/Form';

// ─── Info box ─────────────────────────────────────────────────────────────────

const InfoBox = styled.div`
    padding: 10px 14px;
    background: #eff6ff;
    border: 1px solid #bfdbfe;
    border-radius: 10px;
    font-size: 12px;
    color: #1e40af;
    line-height: 1.5;
    margin-bottom: 4px;
`;

const HelpText = styled.p`
    font-size: 11px;
    color: ${p => p.theme.colors.textMuted};
    margin: 2px 0 0;
`;

const OptionalTag = styled.span`
    font-size: 11px;
    font-weight: 400;
    color: ${p => p.theme.colors.textMuted};
    margin-left: 6px;
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
    z-index: 2100;
`;

const SelectPanel = styled.div`
    position: fixed;
    background: #ffffff;
    border-radius: 16px;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.16);
    z-index: 2200;
    border: 1px solid rgba(0, 0, 0, 0.08);
    overflow: hidden;
`;

const SelectBody = styled.div`
    padding: 8px;
    overflow-y: auto;
`;

const SelectOption = styled.button<{ $active: boolean }>`
    display: flex;
    align-items: center;
    width: 100%;
    padding: 10px 12px;
    text-align: left;
    font-size: 14px;
    font-weight: ${p => p.$active ? 600 : 400};
    border: 1px solid ${p => p.$active ? 'rgba(99,102,241,0.2)' : 'transparent'};
    border-radius: 10px;
    background: ${p => p.$active ? 'rgba(99,102,241,0.06)' : 'transparent'};
    color: ${p => p.$active ? '#0f172a' : '#64748b'};
    cursor: pointer;
    transition: all 0.15s ease;

    &:hover {
        background: ${p => p.$active ? 'rgba(99,102,241,0.08)' : 'rgba(0,0,0,0.02)'};
        color: #0f172a;
    }
`;

interface ModalSelectProps {
    value: string;
    onChange: (value: string) => void;
    options: { value: string; label: string }[];
    placeholder?: string;
}

const ITEM_HEIGHT = 42;
const PANEL_PADDING = 16;

const ModalSelect: React.FC<ModalSelectProps> = ({ value, onChange, options, placeholder }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [panelStyle, setPanelStyle] = useState<React.CSSProperties>({});
    const triggerRef = useRef<HTMLButtonElement>(null);
    const selectedLabel = options.find(o => o.value === value)?.label ?? placeholder ?? '';

    const handleToggle = () => {
        if (!isOpen && triggerRef.current) {
            const rect = triggerRef.current.getBoundingClientRect();
            const itemCount = (placeholder ? 1 : 0) + options.length;
            const estimatedHeight = itemCount * ITEM_HEIGHT + PANEL_PADDING;
            const spaceBelow = window.innerHeight - rect.bottom - 8;
            const spaceAbove = rect.top - 8;
            const maxH = Math.min(estimatedHeight, 320);

            const style: React.CSSProperties = {
                left: rect.left,
                minWidth: rect.width,
            };

            if (spaceBelow >= maxH || spaceBelow >= spaceAbove) {
                style.top = rect.bottom + 4;
                style.maxHeight = Math.min(maxH, spaceBelow - 4);
            } else {
                style.bottom = window.innerHeight - rect.top + 4;
                style.maxHeight = Math.min(maxH, spaceAbove - 4);
            }

            setPanelStyle(style);
        }
        setIsOpen(prev => !prev);
    };

    const handleSelect = (val: string) => { onChange(val); setIsOpen(false); };

    return (
        <>
            {isOpen && <SelectBackdrop onClick={() => setIsOpen(false)} />}
            <SelectTrigger
                ref={triggerRef}
                type="button"
                onClick={handleToggle}
                style={{ color: !value && placeholder ? '#94a3b8' : undefined }}
            >
                <span>{selectedLabel}</span>
                <ChevronDown size={14} strokeWidth={2.5} style={{ flexShrink: 0 }} />
            </SelectTrigger>
            {isOpen && createPortal(
                <SelectPanel style={panelStyle}>
                    <SelectBody style={{ maxHeight: panelStyle.maxHeight }}>
                        {placeholder && (
                            <SelectOption $active={value === ''} onClick={() => handleSelect('')}>
                                <span style={{ color: '#94a3b8' }}>{placeholder}</span>
                            </SelectOption>
                        )}
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

// ─── KSeF payment method codes ────────────────────────────────────────────────

const PAYMENT_METHODS = [
    { value: 'GOTOWKA', label: 'Gotówka' },
    { value: 'KARTA',   label: 'Karta' },
    { value: 'PRZELEW', label: 'Przelew' },
    { value: 'CZEK',    label: 'Czek' },
    { value: 'BON',     label: 'Bon / voucher' },
    { value: 'KREDYT',  label: 'Kredyt' },
    { value: 'MOBILNA', label: 'Mobilna' },
];

const VAT_RATES = [
    { value: '23', label: '23%' },
    { value: '8',  label: '8%' },
    { value: '5',  label: '5%' },
    { value: '0',  label: '0%' },
    { value: 'zw', label: 'zw.' },
];

// ─── Amount helpers ───────────────────────────────────────────────────────────

const MAX_2_DECIMALS = /^\d*\.?\d{0,2}$/;

const FieldError = styled.p`
    margin: 4px 0 0;
    font-size: 12px;
    font-weight: 600;
    color: #b91c1c;
`;

const KindRow = styled.div`
    margin-bottom: 14px;
`;

type FieldErrors = Partial<Record<'saleDate' | 'documentNumber' | 'description' | 'amount', string>>;

/** Dzień dokumentu jako chwila w południe czasu lokalnego - bez przesunięcia daty o strefę i zmianę czasu. */
const dayToInstant = (day: string): string => new Date(`${day}T12:00:00`).toISOString();

// ─── Component ────────────────────────────────────────────────────────────────

type TabId = 'document' | 'seller';

interface Props {
    isOpen: boolean;
    onClose: () => void;
}

interface FormState {
    documentKind:   CostDocumentKind;
    description:    string;
    saleDate:       string;
    documentNumber: string;
    sellerName:     string;
    sellerNip:      string;
    netAmount:      string;
    grossAmount:    string;
    vatRate:        string;
    paymentMethod:  string;
    /** Kwota wpisana ostatnio - przechodzi przez zmianę stawki VAT bez zmian. */
    priceSide:      PriceSide;
}

const today = new Date().toISOString().split('T')[0];

const EMPTY_FORM: FormState = {
    documentKind:   'INVOICE',
    description:    '',
    saleDate:       today,
    documentNumber: '',
    sellerName:     '',
    sellerNip:      '',
    netAmount:      '',
    grossAmount:    '',
    vatRate:        '23',
    paymentMethod:  '',
    priceSide:      'net',
};

export const AddExpenseModal: React.FC<Props> = ({ isOpen, onClose }) => {
    const createExpense = useCreateExpense();
    const titleId = useId();
    const [activeTab, setActiveTab] = useState<TabId>('document');
    const [error, setError] = useState<string | null>(null);
    const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
    const [form, setForm] = useState<FormState>(EMPTY_FORM);

    useEffect(() => {
        if (!isOpen) {
            setForm({ ...EMPTY_FORM, saleDate: new Date().toISOString().split('T')[0] });
            setError(null);
            setFieldErrors({});
            setActiveTab('document');
        }
    }, [isOpen]);

    const set = (key: keyof FormState) => (e: React.ChangeEvent<HTMLInputElement>) =>
        setForm(prev => ({ ...prev, [key]: e.target.value }));

    const setField = (key: keyof FormState) => (value: string) =>
        setForm(prev => ({ ...prev, [key]: value }));

    // Przeliczenie netto ↔ brutto w groszach, wspólnymi helperami - nie na złotówkach
    // zmiennoprzecinkowo, które przy połówce grosza zaokrąglały w złą stronę.
    const handleNetChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const raw = e.target.value;
        if (!MAX_2_DECIMALS.test(raw)) return;
        const gross = expenseGrossForNet(raw, expenseVatRate(form.vatRate));
        setForm(prev => ({ ...prev, netAmount: raw, grossAmount: gross, priceSide: 'net' }));
    };

    const handleGrossChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const raw = e.target.value;
        if (!MAX_2_DECIMALS.test(raw)) return;
        const net = expenseNetForGross(raw, expenseVatRate(form.vatRate));
        setForm(prev => ({ ...prev, grossAmount: raw, netAmount: net, priceSide: 'gross' }));
    };

    // Zmiana stawki zostawia kwotę wpisaną przez człowieka, a drugą liczy od nowa
    // (CLAUDE.md §1). Brutto liczone zawsze z netta zamieniało wpisane 1900.00
    // w 1900.01 po 23% → 8% → 23% - wystarczył nawet ponowny wybór tej samej stawki.
    const handleVatChange = (vatRate: string) => {
        setForm(prev => {
            const { net, gross } = priceInputsForVatRate(
                { net: prev.netAmount, gross: prev.grossAmount },
                expenseVatRate(prev.vatRate), expenseVatRate(vatRate), prev.priceSide, EXPENSE_AMOUNT_INPUT,
            );
            return { ...prev, vatRate, netAmount: net, grossAmount: gross };
        });
    };

    const isInvoice = form.documentKind === 'INVOICE';

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        const amounts = expenseAmountsPayload(form.netAmount, form.grossAmount, form.vatRate, form.priceSide);
        const errors: FieldErrors = {};
        if (!form.saleDate) errors.saleDate = 'Podaj datę dokumentu.';
        if (isInvoice && !form.documentNumber.trim()) errors.documentNumber = 'Podaj numer faktury.';
        if (!isInvoice && !form.description.trim()) errors.description = 'Napisz, czego dotyczy koszt.';
        if (!amounts) errors.amount = 'Podaj kwotę netto albo brutto.';
        setFieldErrors(errors);
        if (Object.keys(errors).length > 0 || !amounts) {
            // Błędy są na pierwszej karcie - pokaż ją, gdy ktoś kliknął „Zapisz" na „Sprzedawcy".
            setActiveTab('document');
            return;
        }

        try {
            await createExpense.mutateAsync({
                documentKind:   form.documentKind,
                saleDate:       dayToInstant(form.saleDate),
                documentNumber: form.documentNumber.trim() || undefined,
                description:    form.description.trim() || undefined,
                sellerName:     form.sellerName.trim()  || undefined,
                sellerNip:      form.sellerNip.trim()   || undefined,
                ...amounts,
                paymentMethod:  form.paymentMethod      || undefined,
            });
            onClose();
        } catch (err: unknown) {
            const message = (err as { response?: { data?: { message?: unknown } } })?.response?.data?.message;
            setError(typeof message === 'string' && message.trim()
                ? message
                : 'Nie udało się zapisać dokumentu. Spróbuj ponownie.');
        }
    };

    return (
        <ModalShell isOpen={isOpen} onClose={onClose} size="md" labelledBy={titleId}>
            <ModalHeader>
                <ModalTitleGroup>
                    <ModalTitle id={titleId}>Dodaj dokument kosztowy</ModalTitle>
                    <ModalSubtitle>Faktura spoza KSeF, paragon, rachunek albo inny koszt</ModalSubtitle>
                </ModalTitleGroup>
                <CloseBtn onClick={onClose} />
            </ModalHeader>

            <ModalContent style={{ paddingTop: '8px' }}>
                <InfoBox>
                    Każdy dokument trafia do statystyk w <strong>Pozycjach kosztowych</strong>, gdzie przypiszesz mu
                    kategorię. Faktury z KSeF pobierają się same - tu dodajesz resztę kosztów.
                </InfoBox>

                {error && <FormAlertBanner>{error}</FormAlertBanner>}

                <form id="expense-form" onSubmit={handleSubmit} autoComplete="off" noValidate>
                    <KindRow>
                        <Segmented<CostDocumentKind>
                            label="Rodzaj dokumentu"
                            block
                            options={COST_DOCUMENT_KINDS.map(k => ({ value: k, label: COST_DOCUMENT_KIND_LABEL[k] }))}
                            value={form.documentKind}
                            onChange={documentKind => {
                                setForm(prev => ({ ...prev, documentKind }));
                                setFieldErrors({});
                            }}
                        />
                    </KindRow>

                    <FormTabBar>
                        <FormTabBtn type="button" $active={activeTab === 'document'} onClick={() => setActiveTab('document')}>
                            {COST_DOCUMENT_KIND_LABEL[form.documentKind]}
                        </FormTabBtn>
                        <FormTabBtn type="button" $active={activeTab === 'seller'} onClick={() => setActiveTab('seller')}>
                            Sprzedawca
                        </FormTabBtn>
                    </FormTabBar>

                    {/* ── Dokument ── */}
                    <FormTabPanel $active={activeTab === 'document'}>
                        <FormGrid>
                            <FormField $fullWidth>
                                <FieldLabel htmlFor="ae-description">
                                    Czego dotyczy{isInvoice && <OptionalTag>opcjonalne</OptionalTag>}
                                </FieldLabel>
                                <InputShell>
                                    <BareInput
                                        id="ae-description"
                                        type="text"
                                        placeholder={COST_DESCRIPTION_PLACEHOLDER[form.documentKind]}
                                        value={form.description}
                                        onChange={set('description')}
                                        maxLength={1000}
                                        aria-invalid={!!fieldErrors.description}
                                        autoComplete="new-password"
                                    />
                                </InputShell>
                                {fieldErrors.description
                                    ? <FieldError role="alert">{fieldErrors.description}</FieldError>
                                    : <HelpText>Pod tą nazwą koszt pojawi się w statystykach i dostanie kategorię.</HelpText>}
                            </FormField>

                            <FormField>
                                <FieldLabel htmlFor="ae-saleDate">Data dokumentu</FieldLabel>
                                <InputShell>
                                    <BareInput
                                        id="ae-saleDate"
                                        type="date"
                                        value={form.saleDate}
                                        onChange={set('saleDate')}
                                        aria-invalid={!!fieldErrors.saleDate}
                                        autoComplete="new-password"
                                    />
                                </InputShell>
                                {fieldErrors.saleDate && <FieldError role="alert">{fieldErrors.saleDate}</FieldError>}
                            </FormField>

                            <FormField>
                                <FieldLabel htmlFor="ae-docNumber">
                                    {isInvoice ? 'Numer faktury' : 'Numer dokumentu'}
                                    {!isInvoice && <OptionalTag>opcjonalne</OptionalTag>}
                                </FieldLabel>
                                <InputShell>
                                    <BareInput
                                        id="ae-docNumber"
                                        type="text"
                                        placeholder={isInvoice ? 'FV/2026/0001' : ''}
                                        value={form.documentNumber}
                                        onChange={set('documentNumber')}
                                        aria-invalid={!!fieldErrors.documentNumber}
                                        autoComplete="new-password"
                                    />
                                </InputShell>
                                {fieldErrors.documentNumber && <FieldError role="alert">{fieldErrors.documentNumber}</FieldError>}
                            </FormField>

                            <FormField>
                                <FieldLabel>Stawka VAT</FieldLabel>
                                <ModalSelect
                                    value={form.vatRate}
                                    onChange={handleVatChange}
                                    options={VAT_RATES}
                                />
                            </FormField>

                            <FormField>
                                <FieldLabel>
                                    Forma płatności<OptionalTag>opcjonalne</OptionalTag>
                                </FieldLabel>
                                <ModalSelect
                                    value={form.paymentMethod}
                                    onChange={setField('paymentMethod')}
                                    options={PAYMENT_METHODS}
                                    placeholder="- Wybierz -"
                                />
                            </FormField>

                            <FormField>
                                <FieldLabel htmlFor="ae-netAmount">Kwota netto</FieldLabel>
                                <InputShell>
                                    <BareInput
                                        id="ae-netAmount"
                                        type="text"
                                        inputMode="decimal"
                                        placeholder="0.00"
                                        value={form.netAmount}
                                        onChange={handleNetChange}
                                        onKeyDown={handleZeroAwareKeyDown(form.netAmount, v =>
                                            handleNetChange({ target: { value: v } } as React.ChangeEvent<HTMLInputElement>)
                                        )}
                                        autoComplete="new-password"
                                    />
                                </InputShell>
                                {fieldErrors.amount
                                    ? <FieldError role="alert">{fieldErrors.amount}</FieldError>
                                    : <HelpText>Zmiana przelicza brutto automatycznie.</HelpText>}
                            </FormField>

                            <FormField>
                                <FieldLabel htmlFor="ae-grossAmount">Kwota brutto</FieldLabel>
                                <InputShell>
                                    <BareInput
                                        id="ae-grossAmount"
                                        type="text"
                                        inputMode="decimal"
                                        placeholder="0.00"
                                        value={form.grossAmount}
                                        onChange={handleGrossChange}
                                        onKeyDown={handleZeroAwareKeyDown(form.grossAmount, v =>
                                            handleGrossChange({ target: { value: v } } as React.ChangeEvent<HTMLInputElement>)
                                        )}
                                        autoComplete="new-password"
                                    />
                                </InputShell>
                                <HelpText>
                                    {form.documentKind === 'RECEIPT'
                                        ? 'Z paragonu wpisz kwotę do zapłaty. Bez VAT do odliczenia wybierz stawkę „zw.".'
                                        : 'Zmiana przelicza netto automatycznie.'}
                                </HelpText>
                            </FormField>
                        </FormGrid>
                    </FormTabPanel>

                    {/* ── Sprzedawca ── */}
                    <FormTabPanel $active={activeTab === 'seller'}>
                        <FormGrid>
                            <FormField $fullWidth>
                                <FieldLabel htmlFor="ae-sellerName">
                                    Nazwa sprzedawcy<OptionalTag>opcjonalne</OptionalTag>
                                </FieldLabel>
                                <InputShell>
                                    <BareInput
                                        id="ae-sellerName"
                                        type="text"
                                        placeholder="Firma Sp. z o.o."
                                        value={form.sellerName}
                                        onChange={set('sellerName')}
                                        autoComplete="new-password"
                                    />
                                </InputShell>
                            </FormField>

                            <FormField>
                                <FieldLabel htmlFor="ae-sellerNip">
                                    NIP sprzedawcy<OptionalTag>opcjonalne</OptionalTag>
                                </FieldLabel>
                                <InputShell>
                                    <BareInput
                                        id="ae-sellerNip"
                                        type="text"
                                        placeholder="1234567890"
                                        value={form.sellerNip}
                                        onChange={set('sellerNip')}
                                        maxLength={10}
                                        autoComplete="new-password"
                                    />
                                </InputShell>
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
                    form="expense-form"
                    disabled={createExpense.isPending}
                >
                    {createExpense.isPending ? 'Zapisywanie...' : 'Zapisz dokument'}
                </SharedButton>
            </ModalFooter>
        </ModalShell>
    );
};
