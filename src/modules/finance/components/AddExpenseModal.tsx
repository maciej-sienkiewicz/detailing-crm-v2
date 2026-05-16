import React, { useState, useEffect, useRef } from 'react';
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

const roundTo2 = (n: number): string => {
    if (!isFinite(n) || isNaN(n)) return '';
    return (Math.round(n * 100) / 100).toFixed(2);
};

const parseAmount = (s: string): number | null => {
    const n = parseFloat(s.replace(',', '.'));
    return isFinite(n) ? n : null;
};

// ─── Component ────────────────────────────────────────────────────────────────

type TabId = 'invoice' | 'seller';

interface Props {
    isOpen: boolean;
    onClose: () => void;
}

interface FormState {
    saleDate:       string;
    documentNumber: string;
    sellerName:     string;
    sellerNip:      string;
    netAmount:      string;
    grossAmount:    string;
    vatRate:        string;
    paymentMethod:  string;
}

const today = new Date().toISOString().split('T')[0];

const EMPTY_FORM: FormState = {
    saleDate:       today,
    documentNumber: '',
    sellerName:     '',
    sellerNip:      '',
    netAmount:      '',
    grossAmount:    '',
    vatRate:        '23',
    paymentMethod:  '',
};

export const AddExpenseModal: React.FC<Props> = ({ isOpen, onClose }) => {
    const createExpense = useCreateExpense();
    const [activeTab, setActiveTab] = useState<TabId>('invoice');
    const [error, setError] = useState<string | null>(null);
    const [form, setForm] = useState<FormState>(EMPTY_FORM);

    useEffect(() => {
        if (!isOpen) {
            setForm({ ...EMPTY_FORM, saleDate: new Date().toISOString().split('T')[0] });
            setError(null);
            setActiveTab('invoice');
        }
    }, [isOpen]);

    const set = (key: keyof FormState) => (e: React.ChangeEvent<HTMLInputElement>) =>
        setForm(prev => ({ ...prev, [key]: e.target.value }));

    const setField = (key: keyof FormState) => (value: string) =>
        setForm(prev => ({ ...prev, [key]: value }));

    const getMultiplier = (vatRate: string): number | null => {
        if (vatRate === 'zw') return 1;
        const r = parseFloat(vatRate);
        return isFinite(r) ? 1 + r / 100 : null;
    };

    const handleNetChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const raw = e.target.value;
        if (!MAX_2_DECIMALS.test(raw)) return;
        const net = parseAmount(raw);
        const multiplier = getMultiplier(form.vatRate);
        const gross = net !== null && multiplier !== null ? roundTo2(net * multiplier) : '';
        setForm(prev => ({ ...prev, netAmount: raw, grossAmount: gross }));
    };

    const handleGrossChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const raw = e.target.value;
        if (!MAX_2_DECIMALS.test(raw)) return;
        const gross = parseAmount(raw);
        const multiplier = getMultiplier(form.vatRate);
        const net = gross !== null && multiplier !== null ? roundTo2(gross / multiplier) : '';
        setForm(prev => ({ ...prev, grossAmount: raw, netAmount: net }));
    };

    const handleVatChange = (vatRate: string) => {
        const multiplier = getMultiplier(vatRate);
        const net = parseAmount(form.netAmount);
        const gross = net !== null && multiplier !== null ? roundTo2(net * multiplier) : form.grossAmount;
        setForm(prev => ({ ...prev, vatRate, grossAmount: gross }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        const grossAmount = form.grossAmount ? parseAmount(form.grossAmount) ?? undefined : undefined;
        const netAmount   = form.netAmount   ? parseAmount(form.netAmount)   ?? undefined : undefined;

        if (grossAmount !== undefined && grossAmount < 0) {
            setError('Kwota brutto nie może być ujemna.');
            return;
        }

        try {
            await createExpense.mutateAsync({
                saleDate:       form.saleDate ? `${form.saleDate}T00:00:00+01:00` : undefined,
                documentNumber: form.documentNumber || undefined,
                sellerName:     form.sellerName     || undefined,
                sellerNip:      form.sellerNip      || undefined,
                netAmount,
                grossAmount,
                paymentMethod:  form.paymentMethod  || undefined,
            });
            onClose();
        } catch {
            setError('Nie udało się zapisać faktury. Spróbuj ponownie.');
        }
    };

    return (
        <ModalShell isOpen={isOpen} onClose={onClose} size="md">
            <ModalHeader>
                <ModalTitleGroup>
                    <ModalTitle>Dodaj fakturę kosztową ręcznie</ModalTitle>
                    <ModalSubtitle>Dla dostawców spoza systemu KSeF</ModalSubtitle>
                </ModalTitleGroup>
                <CloseBtn onClick={onClose} />
            </ModalHeader>

            <ModalContent style={{ paddingTop: '8px' }}>
                <InfoBox>
                    Użyj tego formularza dla dostawców, którzy <strong>nie wystawiają faktur w KSeF</strong> (np. małe firmy,
                    zagraniczne usługi, faktury gotówkowe). Faktury z KSeF są pobierane automatycznie.
                </InfoBox>

                {error && <FormAlertBanner>{error}</FormAlertBanner>}

                <form id="expense-form" onSubmit={handleSubmit} autoComplete="off">
                    <FormTabBar>
                        <FormTabBtn type="button" $active={activeTab === 'invoice'} onClick={() => setActiveTab('invoice')}>
                            Faktura
                        </FormTabBtn>
                        <FormTabBtn type="button" $active={activeTab === 'seller'} onClick={() => setActiveTab('seller')}>
                            Sprzedawca
                        </FormTabBtn>
                    </FormTabBar>

                    {/* ── Faktura ── */}
                    <FormTabPanel $active={activeTab === 'invoice'}>
                        <FormGrid>
                            <FormField>
                                <FieldLabel htmlFor="ae-saleDate">
                                    Data sprzedaży<OptionalTag>opcjonalne</OptionalTag>
                                </FieldLabel>
                                <InputShell>
                                    <BareInput
                                        id="ae-saleDate"
                                        type="date"
                                        value={form.saleDate}
                                        onChange={set('saleDate')}
                                        autoComplete="new-password"
                                    />
                                </InputShell>
                            </FormField>

                            <FormField>
                                <FieldLabel htmlFor="ae-docNumber">
                                    Numer dokumentu<OptionalTag>opcjonalne</OptionalTag>
                                </FieldLabel>
                                <InputShell>
                                    <BareInput
                                        id="ae-docNumber"
                                        type="text"
                                        placeholder="FV/2024/0001"
                                        value={form.documentNumber}
                                        onChange={set('documentNumber')}
                                        autoComplete="new-password"
                                    />
                                </InputShell>
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
                                    placeholder="— Wybierz —"
                                />
                            </FormField>

                            <FormField>
                                <FieldLabel htmlFor="ae-netAmount">
                                    Kwota netto<OptionalTag>opcjonalne</OptionalTag>
                                </FieldLabel>
                                <InputShell>
                                    <BareInput
                                        id="ae-netAmount"
                                        type="text"
                                        inputMode="decimal"
                                        placeholder="0.00"
                                        value={form.netAmount}
                                        onChange={handleNetChange}
                                        autoComplete="new-password"
                                    />
                                </InputShell>
                                <HelpText>Zmiana przelicza brutto automatycznie.</HelpText>
                            </FormField>

                            <FormField>
                                <FieldLabel htmlFor="ae-grossAmount">
                                    Kwota brutto<OptionalTag>opcjonalne</OptionalTag>
                                </FieldLabel>
                                <InputShell>
                                    <BareInput
                                        id="ae-grossAmount"
                                        type="text"
                                        inputMode="decimal"
                                        placeholder="0.00"
                                        value={form.grossAmount}
                                        onChange={handleGrossChange}
                                        autoComplete="new-password"
                                    />
                                </InputShell>
                                <HelpText>Zmiana przelicza netto automatycznie.</HelpText>
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
                    {createExpense.isPending ? 'Zapisywanie…' : 'Zapisz fakturę'}
                </SharedButton>
            </ModalFooter>
        </ModalShell>
    );
};
