import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import styled from 'styled-components';
import { DocumentType, PaymentMethod, DocumentDirection } from '../types';
import { useCreateDocument } from '../hooks/useFinance';
import { inputValueToGrosze } from '../utils/formatters';
import {
  ModalShell,
  ModalHeader,
  ModalTitleGroup,
  ModalTitle,
  ModalContent,
  ModalFooter,
  ModalSectionTitle,
  CloseBtn,
} from '@/common/components/ModalKit';
import { SharedButton } from '@/common/styles';

// ─── Form field styled-components ────────────────────────────────────────────

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
`;

const Textarea = styled.textarea`
  padding: 10px 12px;
  font-size: 14px;
  border: 1px solid ${(p) => p.theme.colors.border};
  border-radius: 8px;
  background: ${(p) => p.theme.colors.surface};
  color: ${(p) => p.theme.colors.text};
  outline: none;
  width: 100%;
  box-sizing: border-box;
  resize: vertical;
  min-height: 72px;
  transition: border-color 0.15s ease, box-shadow 0.15s ease;

  &:focus {
    border-color: var(--brand-primary);
    box-shadow: 0 0 0 3px rgba(14, 165, 233, 0.12);
  }
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
  font-weight: ${(p) => (p.$active ? 600 : 400)};
  border: 1px solid ${(p) => (p.$active ? 'rgba(99, 102, 241, 0.2)' : 'transparent')};
  border-radius: 10px;
  background: ${(p) => (p.$active ? 'rgba(99, 102, 241, 0.06)' : 'transparent')};
  color: ${(p) => (p.$active ? '#0f172a' : '#64748b')};
  cursor: pointer;
  transition: all 0.15s ease;
  &:hover {
    background: ${(p) => (p.$active ? 'rgba(99, 102, 241, 0.08)' : 'rgba(0, 0, 0, 0.02)')};
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
}

const ModalSelect: React.FC<ModalSelectProps> = ({ value, onChange, options }) => {
  const [isOpen, setIsOpen]   = useState(false);
  const [panelPos, setPanelPos] = useState<{ top: number; left: number; width: number } | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  const selectedLabel = options.find((o) => o.value === value)?.label ?? '';

  const handleToggle = () => {
    if (!isOpen && triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      setPanelPos({ top: rect.bottom + 4, left: rect.left, width: rect.width });
    }
    setIsOpen((prev) => !prev);
  };

  const handleSelect = (val: string) => { onChange(val); setIsOpen(false); };

  return (
    <>
      {isOpen && <SelectBackdrop onClick={() => setIsOpen(false)} />}
      <SelectTrigger ref={triggerRef} type="button" onClick={handleToggle}>
        <span>{selectedLabel}</span>
        <ChevronIcon />
      </SelectTrigger>
      {isOpen && panelPos && createPortal(
        <SelectPanel style={{ top: panelPos.top, left: panelPos.left, minWidth: panelPos.width }}>
          <SelectBody>
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

// ─── Error ────────────────────────────────────────────────────────────────────

const ErrorMsg = styled.p`
  font-size: ${(p) => p.theme.fontSizes.sm};
  color: ${(p) => p.theme.colors.error};
  margin: 0;
  padding: ${(p) => p.theme.spacing.sm} ${(p) => p.theme.spacing.md};
  background: ${(p) => p.theme.colors.errorLight};
  border-radius: ${(p) => p.theme.radii.md};
`;

// ─── Component ────────────────────────────────────────────────────────────────

interface Props {
  isOpen:   boolean;
  onClose:  () => void;
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

const today    = new Date().toISOString().split('T')[0];
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
  const [error, setError] = useState<string | null>(null);
  const [form, setForm]   = useState<FormState>(EMPTY_FORM);

  useEffect(() => {
    if (!isOpen) {
      setForm({ ...EMPTY_FORM, issueDate: new Date().toISOString().split('T')[0] });
      setError(null);
    }
  }, [isOpen]);

  const handleNetChange = (value: string) => {
    const net = parseFloat(value.replace(',', '.'));
    setForm((prev) => ({
      ...prev,
      totalNetDisplay: value,
      totalVatDisplay: isNaN(net) ? '' : (net * VAT_RATE).toFixed(2),
    }));
  };

  const set = (key: keyof FormState) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((prev) => ({ ...prev, [key]: e.target.value }));

  const setField = (key: keyof FormState) => (value: string) =>
    setForm((prev) => ({ ...prev, [key]: value }));

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
        documentType:    form.documentType,
        direction:       DocumentDirection.INCOME,
        paymentMethod:   form.paymentMethod,
        totalNet,
        totalVat,
        totalGross,
        currency:        form.currency || 'PLN',
        issueDate:       form.issueDate,
        dueDate:         form.dueDate || null,
        description:     form.description || null,
        counterpartyName: form.counterpartyName || null,
        counterpartyNip:  form.counterpartyNip  || null,
      });
      onClose();
    } catch {
      setError('Nie udało się zapisać dokumentu. Spróbuj ponownie.');
    }
  };

  return (
    <ModalShell isOpen={isOpen} onClose={onClose} maxWidth="560px">
      <ModalHeader>
        <ModalTitleGroup>
          <ModalTitle>Nowy dokument przychodowy</ModalTitle>
        </ModalTitleGroup>
        <CloseBtn onClick={onClose} />
      </ModalHeader>

      <ModalContent>
        <form id="create-document-form" onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 'inherit' }}>
          <ModalSectionTitle>Rodzaj dokumentu</ModalSectionTitle>

          <FieldRow>
            <Field>
              <Label>Typ dokumentu</Label>
              <ModalSelect
                value={form.documentType}
                onChange={setField('documentType')}
                options={[
                  { value: DocumentType.INVOICE, label: 'Faktura' },
                  { value: DocumentType.RECEIPT, label: 'Paragon' },
                  { value: DocumentType.OTHER,   label: 'Inny' },
                ]}
              />
            </Field>
            <Field>
              <Label>Metoda płatności</Label>
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
            </Field>
          </FieldRow>

          <ModalSectionTitle>Kwoty</ModalSectionTitle>

          <FieldRow>
            <Field>
              <Label>Kwota netto (PLN)</Label>
              <Input
                type="number"
                step="0.01"
                min="0"
                placeholder="0.00"
                value={form.totalNetDisplay}
                onChange={(e) => handleNetChange(e.target.value)}
                required
              />
            </Field>
            <Field>
              <Label>VAT (23%)</Label>
              <Input
                type="number"
                step="0.01"
                min="0"
                placeholder="0.00"
                value={form.totalVatDisplay}
                onChange={set('totalVatDisplay')}
              />
            </Field>
          </FieldRow>

          <ModalSectionTitle>Daty</ModalSectionTitle>

          <FieldRow>
            <Field>
              <Label>Data wystawienia</Label>
              <Input type="date" value={form.issueDate} onChange={set('issueDate')} required />
            </Field>
            <Field>
              <Label>
                Termin płatności
                {form.paymentMethod === PaymentMethod.TRANSFER && (
                  <span style={{ color: '#ef4444', marginLeft: 4 }}>*</span>
                )}
              </Label>
              <Input
                type="date"
                value={form.dueDate}
                onChange={set('dueDate')}
                required={form.paymentMethod === PaymentMethod.TRANSFER}
              />
            </Field>
          </FieldRow>

          <ModalSectionTitle>Kontrahent</ModalSectionTitle>

          <Field>
            <Label>Nazwa kontrahenta</Label>
            <Input
              type="text"
              placeholder="Jan Kowalski / Firma Sp. z o.o."
              value={form.counterpartyName}
              onChange={set('counterpartyName')}
            />
          </Field>

          <FieldRow>
            <Field>
              <Label>NIP</Label>
              <Input type="text" placeholder="1234567890" value={form.counterpartyNip} onChange={set('counterpartyNip')} />
            </Field>
            <div />
          </FieldRow>

          <ModalSectionTitle>Opis</ModalSectionTitle>

          <Field>
            <Label>Opis / tytuł</Label>
            <Textarea
              placeholder="Np. Detailing kompletny + powłoka ceramiczna"
              value={form.description}
              onChange={set('description')}
            />
          </Field>

          {error && <ErrorMsg>{error}</ErrorMsg>}
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
