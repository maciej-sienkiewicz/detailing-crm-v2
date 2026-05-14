import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import styled from 'styled-components';
import { useCreateExpense } from '../hooks/useKsef';

// ─── Overlay / Modal ──────────────────────────────────────────────────────────

const Overlay = styled.div<{ $open: boolean }>`
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.45);
  z-index: 1100;
  display: ${(p) => (p.$open ? 'flex' : 'none')};
  align-items: center;
  justify-content: center;
  padding: ${(p) => p.theme.spacing.md};
`;

const Modal = styled.div`
  background: ${(p) => p.theme.colors.surface};
  border-radius: ${(p) => p.theme.radii.xl};
  padding: ${(p) => p.theme.spacing.xl};
  width: 100%;
  max-width: 540px;
  max-height: 90vh;
  overflow-y: auto;
  box-shadow: ${(p) => p.theme.shadows.xl};
`;

const ModalHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: ${(p) => p.theme.spacing.lg};
`;

const ModalTitle = styled.h2`
  font-size: ${(p) => p.theme.fontSizes.lg};
  font-weight: ${(p) => p.theme.fontWeights.bold};
  color: ${(p) => p.theme.colors.text};
  margin: 0;
`;

const CloseBtn = styled.button`
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  background: ${(p) => p.theme.colors.surfaceAlt};
  color: ${(p) => p.theme.colors.textMuted};
  border-radius: ${(p) => p.theme.radii.md};
  cursor: pointer;
  font-size: 16px;
  &:hover { background: ${(p) => p.theme.colors.surfaceHover}; }
`;

// ─── Form ─────────────────────────────────────────────────────────────────────

const Form = styled.form`
  display: flex;
  flex-direction: column;
  gap: ${(p) => p.theme.spacing.md};
`;

const FieldRow = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: ${(p) => p.theme.spacing.md};
`;

const Field = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${(p) => p.theme.spacing.xs};
`;

const Label = styled.label`
  font-size: ${(p) => p.theme.fontSizes.sm};
  font-weight: ${(p) => p.theme.fontWeights.medium};
  color: ${(p) => p.theme.colors.text};
`;

const OptionalTag = styled.span`
  font-size: 11px;
  font-weight: 400;
  color: ${(p) => p.theme.colors.textMuted};
  margin-left: 6px;
`;

const Input = styled.input`
  padding: 10px 12px;
  font-size: 14px;
  border: 1px solid ${(p) => p.theme.colors.border};
  border-radius: 8px;
  background: ${(p) => p.theme.colors.surface};
  color: ${(p) => p.theme.colors.text};
  outline: none;
  width: 100%;
  box-sizing: border-box;
  transition: border-color 0.15s ease, box-shadow 0.15s ease;
  &:focus {
    border-color: var(--brand-primary);
    box-shadow: 0 0 0 3px rgba(14, 165, 233, 0.12);
  }
  &::placeholder { color: ${(p) => p.theme.colors.textMuted}; }
`;

const HelpText = styled.p`
  font-size: 11px;
  color: ${(p) => p.theme.colors.textMuted};
  margin: 0;
`;

// ─── Custom Select ─────────────────────────────────────────────────────────────

const SelectTrigger = styled.button`
  padding: 10px 12px;
  font-size: 14px;
  border: 1px solid ${(p) => p.theme.colors.border};
  border-radius: 8px;
  background: ${(p) => p.theme.colors.surface};
  color: ${(p) => p.theme.colors.text};
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
  &:hover, &:focus {
    border-color: var(--brand-primary);
    box-shadow: 0 0 0 3px rgba(14, 165, 233, 0.12);
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
  font-weight: ${(p) => (p.$active ? 600 : 400)};
  border: 1px solid ${(p) => (p.$active ? 'rgba(99,102,241,0.2)' : 'transparent')};
  border-radius: 10px;
  background: ${(p) => (p.$active ? 'rgba(99,102,241,0.06)' : 'transparent')};
  color: ${(p) => (p.$active ? '#0f172a' : '#64748b')};
  cursor: pointer;
  transition: all 0.15s ease;
  &:hover {
    background: ${(p) => (p.$active ? 'rgba(99,102,241,0.08)' : 'rgba(0,0,0,0.02)')};
    color: #0f172a;
  }
`;

const ChevronIcon = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ flexShrink: 0 }}>
    <polyline points="6 9 12 15 18 9" />
  </svg>
);

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
  const selectedLabel = options.find((o) => o.value === value)?.label ?? placeholder ?? '';

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
    setIsOpen((prev) => !prev);
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
        <ChevronIcon />
      </SelectTrigger>
      {isOpen && createPortal(
        <SelectPanel style={panelStyle}>
          <SelectBody style={{ maxHeight: panelStyle.maxHeight }}>
            {placeholder && (
              <SelectOption $active={value === ''} onClick={() => handleSelect('')}>
                <span style={{ color: '#94a3b8' }}>{placeholder}</span>
              </SelectOption>
            )}
            {options.map((opt) => (
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

// ─── Section title / Footer / Buttons ─────────────────────────────────────────

const SectionTitle = styled.div`
  font-size: ${(p) => p.theme.fontSizes.xs};
  font-weight: ${(p) => p.theme.fontWeights.semibold};
  color: ${(p) => p.theme.colors.textMuted};
  text-transform: uppercase;
  letter-spacing: 0.05em;
  padding-bottom: ${(p) => p.theme.spacing.xs};
  border-bottom: 1px solid ${(p) => p.theme.colors.border};
`;

const InfoBox = styled.div`
  padding: 10px 14px;
  background: #eff6ff;
  border: 1px solid #bfdbfe;
  border-radius: 8px;
  font-size: 12px;
  color: #1e40af;
  line-height: 1.5;
`;

const Footer = styled.div`
  display: flex;
  gap: ${(p) => p.theme.spacing.sm};
  margin-top: ${(p) => p.theme.spacing.sm};
  justify-content: flex-end;
`;

const CancelBtn = styled.button`
  padding: ${(p) => p.theme.spacing.sm} ${(p) => p.theme.spacing.lg};
  font-size: ${(p) => p.theme.fontSizes.sm};
  font-weight: ${(p) => p.theme.fontWeights.medium};
  border: 1px solid ${(p) => p.theme.colors.border};
  background: ${(p) => p.theme.colors.surface};
  color: ${(p) => p.theme.colors.text};
  border-radius: ${(p) => p.theme.radii.md};
  cursor: pointer;
  &:hover { background: ${(p) => p.theme.colors.surfaceHover}; }
`;

const SubmitBtn = styled.button<{ $loading?: boolean }>`
  padding: ${(p) => p.theme.spacing.sm} ${(p) => p.theme.spacing.lg};
  font-size: ${(p) => p.theme.fontSizes.sm};
  font-weight: ${(p) => p.theme.fontWeights.semibold};
  border: none;
  background: linear-gradient(135deg, var(--brand-primary) 0%, #0284c7 100%);
  color: white;
  border-radius: ${(p) => p.theme.radii.md};
  cursor: ${(p) => (p.$loading ? 'not-allowed' : 'pointer')};
  opacity: ${(p) => (p.$loading ? 0.7 : 1)};
  transition: all 0.15s ease;
  &:hover:not(:disabled) { filter: brightness(1.08); }
`;

const ErrorMsg = styled.p`
  font-size: ${(p) => p.theme.fontSizes.sm};
  color: ${(p) => p.theme.colors.error};
  margin: 0;
  padding: ${(p) => p.theme.spacing.sm} ${(p) => p.theme.spacing.md};
  background: ${(p) => p.theme.colors.errorLight};
  border-radius: ${(p) => p.theme.radii.md};
`;

// ─── KSeF payment method codes ────────────────────────────────────────────────

const PAYMENT_METHODS = [
  { value: 'GOTOWKA',  label: 'Gotówka' },
  { value: 'KARTA',    label: 'Karta' },
  { value: 'PRZELEW',  label: 'Przelew' },
  { value: 'CZEK',     label: 'Czek' },
  { value: 'BON',      label: 'Bon / voucher' },
  { value: 'KREDYT',   label: 'Kredyt' },
  { value: 'MOBILNA',  label: 'Mobilna' },
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

interface Props {
  isOpen:  boolean;
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
  const [error, setError] = useState<string | null>(null);
  const [form, setForm]   = useState<FormState>(EMPTY_FORM);

  useEffect(() => {
    if (!isOpen) {
      setForm({ ...EMPTY_FORM, saleDate: new Date().toISOString().split('T')[0] });
      setError(null);
    }
  }, [isOpen]);

  const set = (key: keyof FormState) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((prev) => ({ ...prev, [key]: e.target.value }));

  const setField = (key: keyof FormState) => (value: string) =>
    setForm((prev) => ({ ...prev, [key]: value }));

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
    setForm((prev) => ({ ...prev, netAmount: raw, grossAmount: gross }));
  };

  const handleGrossChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    if (!MAX_2_DECIMALS.test(raw)) return;
    const gross = parseAmount(raw);
    const multiplier = getMultiplier(form.vatRate);
    const net = gross !== null && multiplier !== null ? roundTo2(gross / multiplier) : '';
    setForm((prev) => ({ ...prev, grossAmount: raw, netAmount: net }));
  };

  const handleVatChange = (vatRate: string) => {
    const multiplier = getMultiplier(vatRate);
    const net = parseAmount(form.netAmount);
    const gross = net !== null && multiplier !== null ? roundTo2(net * multiplier) : form.grossAmount;
    setForm((prev) => ({ ...prev, vatRate, grossAmount: gross }));
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

  return createPortal(
    <Overlay $open={isOpen} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <Modal>
        <ModalHeader>
          <ModalTitle>Dodaj fakturę kosztową ręcznie</ModalTitle>
          <CloseBtn onClick={onClose}>✕</CloseBtn>
        </ModalHeader>

        <Form onSubmit={handleSubmit}>
          <InfoBox>
            Użyj tego formularza dla dostawców, którzy <strong>nie wystawiają faktur w KSeF</strong> (np. małe firmy,
            zagraniczne usługi, faktury gotówkowe). Faktury z KSeF są pobierane automatycznie.
          </InfoBox>

          <SectionTitle>Faktura</SectionTitle>

          <FieldRow>
            <Field>
              <Label>Data sprzedaży<OptionalTag>opcjonalne</OptionalTag></Label>
              <Input type="date" value={form.saleDate} onChange={set('saleDate')} />
            </Field>
            <Field>
              <Label>Numer dokumentu<OptionalTag>opcjonalne</OptionalTag></Label>
              <Input
                type="text"
                placeholder="FV/2024/0001"
                value={form.documentNumber}
                onChange={set('documentNumber')}
              />
            </Field>
          </FieldRow>

          <SectionTitle>Sprzedawca</SectionTitle>

          <Field>
            <Label>Nazwa sprzedawcy<OptionalTag>opcjonalne</OptionalTag></Label>
            <Input
              type="text"
              placeholder="Firma Sp. z o.o."
              value={form.sellerName}
              onChange={set('sellerName')}
            />
          </Field>

          <FieldRow>
            <Field>
              <Label>NIP sprzedawcy<OptionalTag>opcjonalne</OptionalTag></Label>
              <Input
                type="text"
                placeholder="1234567890"
                value={form.sellerNip}
                onChange={set('sellerNip')}
                maxLength={10}
              />
            </Field>
            <div />
          </FieldRow>

          <SectionTitle>Kwoty (PLN)</SectionTitle>

          <FieldRow>
            <Field>
              <Label>Stawka VAT</Label>
              <ModalSelect
                value={form.vatRate}
                onChange={handleVatChange}
                options={VAT_RATES}
              />
            </Field>
            <div />
          </FieldRow>

          <FieldRow>
            <Field>
              <Label>Kwota netto<OptionalTag>opcjonalne</OptionalTag></Label>
              <Input
                type="text"
                inputMode="decimal"
                placeholder="0.00"
                value={form.netAmount}
                onChange={handleNetChange}
              />
              <HelpText>Zmiana przelicza brutto automatycznie.</HelpText>
            </Field>
            <Field>
              <Label>Kwota brutto<OptionalTag>opcjonalne</OptionalTag></Label>
              <Input
                type="text"
                inputMode="decimal"
                placeholder="0.00"
                value={form.grossAmount}
                onChange={handleGrossChange}
              />
              <HelpText>Zmiana przelicza netto automatycznie.</HelpText>
            </Field>
          </FieldRow>

          <SectionTitle>Płatność</SectionTitle>

          <Field>
            <Label>Forma płatności<OptionalTag>opcjonalne</OptionalTag></Label>
            <ModalSelect
              value={form.paymentMethod}
              onChange={setField('paymentMethod')}
              options={PAYMENT_METHODS}
              placeholder="— Wybierz formę płatności —"
            />
          </Field>

          {error && <ErrorMsg>{error}</ErrorMsg>}

          <Footer>
            <CancelBtn type="button" onClick={onClose}>Anuluj</CancelBtn>
            <SubmitBtn type="submit" $loading={createExpense.isPending} disabled={createExpense.isPending}>
              {createExpense.isPending ? 'Zapisywanie…' : 'Zapisz fakturę'}
            </SubmitBtn>
          </Footer>
        </Form>
      </Modal>
    </Overlay>,
    document.body
  );
};
