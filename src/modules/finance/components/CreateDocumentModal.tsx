import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { DocumentType, DocumentDirection, PaymentMethod } from '../types';
import { useCreateDocument } from '../hooks/useFinance';
import { inputValueToGrosze } from '../utils/formatters';

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
  max-width: 560px;
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

const inputStyle = (p: { theme: Record<string, unknown> }) => `
  padding: 10px 12px;
  font-size: 14px;
  border: 1px solid ${(p as unknown as { theme: { colors: { border: string } } }).theme.colors.border};
  border-radius: 8px;
  background: ${(p as unknown as { theme: { colors: { surface: string } } }).theme.colors.surface};
  color: ${(p as unknown as { theme: { colors: { text: string } } }).theme.colors.text};
  outline: none;
  width: 100%;
  box-sizing: border-box;
  transition: border-color 0.15s ease, box-shadow 0.15s ease;

  &:focus {
    border-color: var(--brand-primary);
    box-shadow: 0 0 0 3px rgba(14, 165, 233, 0.12);
  }
`;

const Input = styled.input`${inputStyle}`;
const Select = styled.select`${inputStyle}`;
const Textarea = styled.textarea`
  ${inputStyle}
  resize: vertical;
  min-height: 72px;
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
  transition: background 0.15s ease;

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

const SectionTitle = styled.div`
  font-size: ${(p) => p.theme.fontSizes.xs};
  font-weight: ${(p) => p.theme.fontWeights.semibold};
  color: ${(p) => p.theme.colors.textMuted};
  text-transform: uppercase;
  letter-spacing: 0.05em;
  padding-bottom: ${(p) => p.theme.spacing.xs};
  border-bottom: 1px solid ${(p) => p.theme.colors.border};
`;

const ErrorMsg = styled.p`
  font-size: ${(p) => p.theme.fontSizes.sm};
  color: ${(p) => p.theme.colors.error};
  margin: 0;
  padding: ${(p) => p.theme.spacing.sm} ${(p) => p.theme.spacing.md};
  background: ${(p) => p.theme.colors.errorLight};
  border-radius: ${(p) => p.theme.radii.md};
`;

interface Props {
  isOpen: boolean;
  onClose: () => void;
  defaultDirection?: DocumentDirection;
}

interface FormState {
  documentType: string;
  direction: string;
  paymentMethod: string;
  totalNetDisplay: string;
  totalVatDisplay: string;
  currency: string;
  issueDate: string;
  dueDate: string;
  description: string;
  counterpartyName: string;
  counterpartyNip: string;
}

const today = new Date().toISOString().split('T')[0];

const vatRate = 0.23;

export const CreateDocumentModal: React.FC<Props> = ({ isOpen, onClose, defaultDirection }) => {
  const createDoc = useCreateDocument();
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState<FormState>({
    documentType: DocumentType.INVOICE,
    direction: defaultDirection ?? DocumentDirection.INCOME,
    paymentMethod: PaymentMethod.TRANSFER,
    totalNetDisplay: '',
    totalVatDisplay: '',
    currency: 'PLN',
    issueDate: today,
    dueDate: '',
    description: '',
    counterpartyName: '',
    counterpartyNip: '',
  });

  useEffect(() => {
    if (!isOpen) {
      setForm({
        documentType: DocumentType.INVOICE,
        direction: defaultDirection ?? DocumentDirection.INCOME,
        paymentMethod: PaymentMethod.TRANSFER,
        totalNetDisplay: '',
        totalVatDisplay: '',
        currency: 'PLN',
        issueDate: today,
        dueDate: '',
        description: '',
        counterpartyName: '',
        counterpartyNip: '',
      });
      setError(null);
    }
  }, [isOpen, defaultDirection]);

  const handleNetChange = (value: string) => {
    const net = parseFloat(value.replace(',', '.'));
    setForm((prev) => ({
      ...prev,
      totalNetDisplay: value,
      totalVatDisplay: isNaN(net) ? '' : (net * vatRate).toFixed(2),
    }));
  };

  const set = (key: keyof FormState) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm((prev) => ({ ...prev, [key]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const totalNet = inputValueToGrosze(form.totalNetDisplay);
    const totalVat = inputValueToGrosze(form.totalVatDisplay);
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
        documentType: form.documentType,
        direction: form.direction,
        paymentMethod: form.paymentMethod,
        totalNet,
        totalVat,
        totalGross,
        currency: form.currency || 'PLN',
        issueDate: form.issueDate,
        dueDate: form.dueDate || null,
        description: form.description || null,
        counterpartyName: form.counterpartyName || null,
        counterpartyNip: form.counterpartyNip || null,
      });
      onClose();
    } catch {
      setError('Nie udało się zapisać dokumentu. Spróbuj ponownie.');
    }
  };

  return (
    <Overlay $open={isOpen} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <Modal>
        <ModalHeader>
          <ModalTitle>Nowy dokument finansowy</ModalTitle>
          <CloseBtn onClick={onClose}>✕</CloseBtn>
        </ModalHeader>

        <Form onSubmit={handleSubmit}>
          <SectionTitle>Rodzaj dokumentu</SectionTitle>

          <FieldRow>
            <Field>
              <Label>Typ dokumentu</Label>
              <Select value={form.documentType} onChange={set('documentType')}>
                <option value={DocumentType.INVOICE}>Faktura</option>
                <option value={DocumentType.RECEIPT}>Paragon</option>
                <option value={DocumentType.OTHER}>Inny</option>
              </Select>
            </Field>
            <Field>
              <Label>Kierunek</Label>
              <Select value={form.direction} onChange={set('direction')}>
                <option value={DocumentDirection.INCOME}>Przychód</option>
                <option value={DocumentDirection.EXPENSE}>Koszt</option>
              </Select>
            </Field>
          </FieldRow>

          <FieldRow>
            <Field>
              <Label>Metoda płatności</Label>
              <Select value={form.paymentMethod} onChange={set('paymentMethod')}>
                <option value={PaymentMethod.CASH}>Gotówka</option>
                <option value={PaymentMethod.CARD}>Karta</option>
                <option value={PaymentMethod.TRANSFER}>Przelew</option>
              </Select>
            </Field>
            <Field>
              <Label>Waluta</Label>
              <Select value={form.currency} onChange={set('currency')}>
                <option value="PLN">PLN</option>
                <option value="EUR">EUR</option>
                <option value="USD">USD</option>
              </Select>
            </Field>
          </FieldRow>

          <SectionTitle>Kwoty</SectionTitle>

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

          <SectionTitle>Daty</SectionTitle>

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

          <SectionTitle>Kontrahent</SectionTitle>

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

          <SectionTitle>Opis</SectionTitle>

          <Field>
            <Label>Opis / tytuł</Label>
            <Textarea
              placeholder="Np. Detailing kompletny + powłoka ceramiczna"
              value={form.description}
              onChange={set('description')}
            />
          </Field>

          {error && <ErrorMsg>{error}</ErrorMsg>}

          <Footer>
            <CancelBtn type="button" onClick={onClose}>
              Anuluj
            </CancelBtn>
            <SubmitBtn type="submit" $loading={createDoc.isPending} disabled={createDoc.isPending}>
              {createDoc.isPending ? 'Zapisywanie…' : 'Zapisz dokument'}
            </SubmitBtn>
          </Footer>
        </Form>
      </Modal>
    </Overlay>
  );
};
