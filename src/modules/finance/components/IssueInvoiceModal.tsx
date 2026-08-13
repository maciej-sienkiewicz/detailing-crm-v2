import React, { useMemo, useState } from 'react';
import styled from 'styled-components';
import { Plus, Trash2 } from 'lucide-react';
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
  Select,
} from '@/common/components/Form';
import { useIssueRevenueInvoice } from '../hooks/useKsefRevenue';
import { formatMoney, inputValueToGrosze } from '../utils/formatters';
import type { RevenueVatRate } from '../types';

// ─── Styles ───────────────────────────────────────────────────────────────────

const SectionLabel = styled.div`
  font-size: 11px;
  font-weight: 700;
  color: ${(p) => p.theme.colors.textMuted};
  text-transform: uppercase;
  letter-spacing: 0.06em;
  margin: 6px 0 -6px;
`;

const BuyerTypeBar = styled.div`
  display: flex;
  gap: 6px;
`;

const BuyerTypeBtn = styled.button<{ $active: boolean }>`
  padding: 7px 14px;
  font-size: 13px;
  font-weight: ${(p) => (p.$active ? 600 : 400)};
  color: ${(p) => (p.$active ? '#1d4ed8' : p.theme.colors.textSecondary)};
  background: ${(p) => (p.$active ? '#eff6ff' : p.theme.colors.surface)};
  border: 1.5px solid ${(p) => (p.$active ? '#93c5fd' : p.theme.colors.border)};
  border-radius: 9999px;
  cursor: pointer;
  transition: all 0.15s ease;
`;

const ItemsTable = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
`;

const ItemRow = styled.div`
  display: grid;
  grid-template-columns: minmax(160px, 2.2fr) 70px 90px 110px 90px 32px;
  gap: 8px;
  align-items: center;

  @media (max-width: 639px) {
    grid-template-columns: 1fr 1fr;
  }
`;

const ItemHeaderRow = styled(ItemRow)`
  font-size: 11px;
  font-weight: 600;
  color: ${(p) => p.theme.colors.textMuted};
  text-transform: uppercase;
  letter-spacing: 0.04em;

  @media (max-width: 639px) {
    display: none;
  }
`;

const RemoveBtn = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 30px;
  height: 30px;
  border: none;
  background: transparent;
  color: ${(p) => p.theme.colors.textMuted};
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.15s ease;
  &:hover { background: #fef2f2; color: #dc2626; }
  &:disabled { opacity: 0.3; cursor: not-allowed; }
`;

const AddItemBtn = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  align-self: flex-start;
  padding: 7px 12px;
  font-size: 13px;
  font-weight: 600;
  color: #1d4ed8;
  background: #eff6ff;
  border: 1px dashed #93c5fd;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.15s ease;
  &:hover { background: #dbeafe; }
`;

const SummaryBox = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: 24px;
  padding: 12px 16px;
  background: ${(p) => p.theme.colors.surfaceAlt};
  border: 1px solid ${(p) => p.theme.colors.border};
  border-radius: 10px;
  font-size: 13px;

  strong { font-size: 15px; }
`;

const PaidToggleRow = styled.label`
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  color: ${(p) => p.theme.colors.text};
  cursor: pointer;
  user-select: none;
`;

// ─── Model ────────────────────────────────────────────────────────────────────

interface ItemDraft {
  name:     string;
  quantity: string;
  price:    string;   // netto w PLN (input)
  vatRate:  RevenueVatRate;
}

const emptyItem = (): ItemDraft => ({ name: '', quantity: '1', price: '', vatRate: '23' });

const VAT_MULTIPLIER: Record<RevenueVatRate, number> = { '23': 0.23, '8': 0.08, '5': 0.05, '0': 0, zw: 0 };

const PAYMENT_FORMS = [
  { value: 'GOTOWKA', label: 'Gotówka' },
  { value: 'KARTA',   label: 'Karta' },
  { value: 'PRZELEW', label: 'Przelew' },
  { value: 'MOBILNA', label: 'Mobilna (BLIK)' },
];

interface IssueInvoiceModalProps {
  isOpen:  boolean;
  onClose: () => void;
}

/**
 * Wystawianie faktury przychodowej — dokument trafia bezpośrednio do KSeF.
 * B2B (NIP) lub B2C (konsument, bez NIP — poza obowiązkiem KSeF, ale wysyłana
 * dobrowolnie, żeby ledger był kompletny).
 */
export const IssueInvoiceModal: React.FC<IssueInvoiceModalProps> = ({ isOpen, onClose }) => {
  const issueMutation = useIssueRevenueInvoice();

  const [buyerType, setBuyerType]   = useState<'B2B' | 'B2C'>('B2B');
  const [nip, setNip]               = useState('');
  const [buyerName, setBuyerName]   = useState('');
  const [address1, setAddress1]     = useState('');
  const [address2, setAddress2]     = useState('');
  const [email, setEmail]           = useState('');
  const [items, setItems]           = useState<ItemDraft[]>([emptyItem()]);
  const [paymentForm, setPaymentForm] = useState('GOTOWKA');
  const [isPaid, setIsPaid]           = useState(true);
  const [dueDate, setDueDate]         = useState('');
  const [saleDate, setSaleDate]       = useState('');
  const [exemptionBasis, setExemptionBasis] = useState('');
  const [error, setError]             = useState<string | null>(null);

  const totals = useMemo(() => {
    let net = 0;
    let vat = 0;
    for (const item of items) {
      const qty = parseFloat(item.quantity.replace(',', '.')) || 0;
      const priceGrosz = inputValueToGrosze(item.price);
      const lineNet = Math.round(priceGrosz * qty);
      net += lineNet;
      vat += Math.round(lineNet * VAT_MULTIPLIER[item.vatRate]);
    }
    return { net, vat, gross: net + vat };
  }, [items]);

  const hasExempt = items.some((i) => i.vatRate === 'zw');

  const updateItem = (index: number, patch: Partial<ItemDraft>) =>
    setItems((prev) => prev.map((item, i) => (i === index ? { ...item, ...patch } : item)));

  const reset = () => {
    setBuyerType('B2B'); setNip(''); setBuyerName(''); setAddress1(''); setAddress2('');
    setEmail(''); setItems([emptyItem()]); setPaymentForm('GOTOWKA'); setIsPaid(true);
    setDueDate(''); setSaleDate(''); setExemptionBasis(''); setError(null);
  };

  const handleClose = () => { reset(); onClose(); };

  const validate = (): string | null => {
    if (buyerType === 'B2B' && !/^\d{10}$/.test(nip.replace(/[^0-9]/g, '')))
      return 'NIP nabywcy musi mieć 10 cyfr';
    if (buyerType === 'B2C' && !buyerName.trim())
      return 'Faktura dla konsumenta wymaga imienia i nazwiska nabywcy';
    if (items.length === 0) return 'Dodaj co najmniej jedną pozycję';
    for (const [i, item] of items.entries()) {
      if (!item.name.trim()) return `Pozycja ${i + 1}: podaj nazwę usługi`;
      if (inputValueToGrosze(item.price) <= 0) return `Pozycja ${i + 1}: podaj cenę netto`;
      if ((parseFloat(item.quantity.replace(',', '.')) || 0) <= 0) return `Pozycja ${i + 1}: nieprawidłowa ilość`;
    }
    if (hasExempt && !exemptionBasis.trim())
      return 'Stawka „zw" wymaga podania podstawy prawnej zwolnienia';
    if (!isPaid && paymentForm === 'PRZELEW' && !dueDate)
      return 'Płatność przelewem wymaga terminu płatności';
    return null;
  };

  const handleSubmit = async () => {
    const validationError = validate();
    if (validationError) { setError(validationError); return; }
    setError(null);

    try {
      await issueMutation.mutateAsync({
        buyer: {
          nip:          buyerType === 'B2B' ? nip.replace(/[^0-9]/g, '') : undefined,
          name:         buyerName.trim() || undefined,
          addressLine1: address1.trim() || undefined,
          addressLine2: address2.trim() || undefined,
          email:        email.trim() || undefined,
        },
        items: items.map((item) => ({
          name:         item.name.trim(),
          quantity:     parseFloat(item.quantity.replace(',', '.')) || 1,
          unitPriceNet: inputValueToGrosze(item.price),
          vatRate:      item.vatRate,
        })),
        saleDate:            saleDate || undefined,
        paymentForm,
        isPaid,
        paymentDueDate:      !isPaid && dueDate ? dueDate : undefined,
        exemptionLegalBasis: hasExempt ? exemptionBasis.trim() : undefined,
      });
      handleClose();
    } catch (e: any) {
      setError(e?.response?.data?.message ?? 'Nie udało się wystawić faktury. Spróbuj ponownie.');
    }
  };

  if (!isOpen) return null;

  return (
    <ModalShell isOpen={isOpen} onClose={handleClose} size="xl">
      <ModalHeader>
        <ModalTitleGroup>
          <ModalTitle>Wystaw fakturę</ModalTitle>
          <ModalSubtitle>
            Faktura zostanie automatycznie wysłana do KSeF jako e-Faktura FA(3)
          </ModalSubtitle>
        </ModalTitleGroup>
        <CloseBtn onClick={handleClose} />
      </ModalHeader>

      <ModalContent>
        {error && <FormAlertBanner>{error}</FormAlertBanner>}

        <SectionLabel>Nabywca</SectionLabel>
        <BuyerTypeBar>
          <BuyerTypeBtn $active={buyerType === 'B2B'} onClick={() => setBuyerType('B2B')}>
            Firma (NIP)
          </BuyerTypeBtn>
          <BuyerTypeBtn $active={buyerType === 'B2C'} onClick={() => setBuyerType('B2C')}>
            Konsument
          </BuyerTypeBtn>
        </BuyerTypeBar>

        <FormGrid $columns={2}>
          {buyerType === 'B2B' && (
            <FormField>
              <FieldLabel>NIP *</FieldLabel>
              <InputShell>
                <BareInput
                  value={nip}
                  onChange={(e) => setNip(e.target.value)}
                  placeholder="np. 5213017228"
                  inputMode="numeric"
                />
              </InputShell>
            </FormField>
          )}
          <FormField>
            <FieldLabel>{buyerType === 'B2B' ? 'Nazwa firmy' : 'Imię i nazwisko *'}</FieldLabel>
            <InputShell>
              <BareInput
                value={buyerName}
                onChange={(e) => setBuyerName(e.target.value)}
                placeholder={buyerType === 'B2B' ? 'np. Flota Sp. z o.o.' : 'np. Jan Kowalski'}
              />
            </InputShell>
          </FormField>
          <FormField>
            <FieldLabel>Ulica i numer</FieldLabel>
            <InputShell>
              <BareInput value={address1} onChange={(e) => setAddress1(e.target.value)} placeholder="np. ul. Warsztatowa 5" />
            </InputShell>
          </FormField>
          <FormField>
            <FieldLabel>Kod pocztowy i miejscowość</FieldLabel>
            <InputShell>
              <BareInput value={address2} onChange={(e) => setAddress2(e.target.value)} placeholder="np. 00-001 Warszawa" />
            </InputShell>
          </FormField>
          <FormField>
            <FieldLabel>E-mail</FieldLabel>
            <InputShell>
              <BareInput value={email} onChange={(e) => setEmail(e.target.value)} placeholder="opcjonalnie" type="email" />
            </InputShell>
          </FormField>
          <FormField>
            <FieldLabel>Data sprzedaży</FieldLabel>
            <InputShell>
              <BareInput value={saleDate} onChange={(e) => setSaleDate(e.target.value)} type="date" />
            </InputShell>
          </FormField>
        </FormGrid>

        <SectionLabel>Pozycje faktury</SectionLabel>
        <ItemsTable>
          <ItemHeaderRow>
            <span>Nazwa usługi / towaru</span>
            <span>Ilość</span>
            <span>J.m.</span>
            <span>Cena netto</span>
            <span>VAT</span>
            <span />
          </ItemHeaderRow>
          {items.map((item, index) => (
            <ItemRow key={index}>
              <InputShell>
                <BareInput
                  value={item.name}
                  onChange={(e) => updateItem(index, { name: e.target.value })}
                  placeholder="np. Korekta lakieru + powłoka ceramiczna"
                />
              </InputShell>
              <InputShell>
                <BareInput
                  value={item.quantity}
                  onChange={(e) => updateItem(index, { quantity: e.target.value })}
                  inputMode="decimal"
                />
              </InputShell>
              <InputShell>
                <BareInput value="szt." disabled readOnly />
              </InputShell>
              <InputShell>
                <BareInput
                  value={item.price}
                  onChange={(e) => updateItem(index, { price: e.target.value })}
                  placeholder="0,00"
                  inputMode="decimal"
                />
              </InputShell>
              <Select
                value={item.vatRate}
                onChange={(e) => updateItem(index, { vatRate: e.target.value as RevenueVatRate })}
              >
                <option value="23">23%</option>
                <option value="8">8%</option>
                <option value="5">5%</option>
                <option value="0">0%</option>
                <option value="zw">zw.</option>
              </Select>
              <RemoveBtn
                onClick={() => setItems((prev) => prev.filter((_, i) => i !== index))}
                disabled={items.length === 1}
                title="Usuń pozycję"
              >
                <Trash2 size={15} />
              </RemoveBtn>
            </ItemRow>
          ))}
          <AddItemBtn onClick={() => setItems((prev) => [...prev, emptyItem()])}>
            <Plus size={14} /> Dodaj pozycję
          </AddItemBtn>
        </ItemsTable>

        {hasExempt && (
          <FormField>
            <FieldLabel>Podstawa prawna zwolnienia z VAT *</FieldLabel>
            <InputShell>
              <BareInput
                value={exemptionBasis}
                onChange={(e) => setExemptionBasis(e.target.value)}
                placeholder="np. art. 113 ust. 1 ustawy o VAT"
              />
            </InputShell>
          </FormField>
        )}

        <SectionLabel>Płatność</SectionLabel>
        <FormGrid $columns={2}>
          <FormField>
            <FieldLabel>Forma płatności</FieldLabel>
            <Select value={paymentForm} onChange={(e) => setPaymentForm(e.target.value)}>
              {PAYMENT_FORMS.map((f) => (
                <option key={f.value} value={f.value}>{f.label}</option>
              ))}
            </Select>
          </FormField>
          {!isPaid && (
            <FormField>
              <FieldLabel>Termin płatności {paymentForm === 'PRZELEW' ? '*' : ''}</FieldLabel>
              <InputShell>
                <BareInput value={dueDate} onChange={(e) => setDueDate(e.target.value)} type="date" />
              </InputShell>
            </FormField>
          )}
        </FormGrid>
        <PaidToggleRow>
          <input type="checkbox" checked={isPaid} onChange={(e) => setIsPaid(e.target.checked)} />
          Zapłacono przy wystawieniu
        </PaidToggleRow>

        <SummaryBox>
          <span>Netto: <strong>{formatMoney(totals.net)}</strong></span>
          <span>VAT: <strong>{formatMoney(totals.vat)}</strong></span>
          <span>Brutto: <strong>{formatMoney(totals.gross)}</strong></span>
        </SummaryBox>
      </ModalContent>

      <ModalFooter>
        <SharedButton $variant="secondary" onClick={handleClose} disabled={issueMutation.isPending}>
          Anuluj
        </SharedButton>
        <SharedButton $variant="primary" onClick={handleSubmit} disabled={issueMutation.isPending}>
          {issueMutation.isPending ? 'Wysyłanie do KSeF…' : 'Wystaw i wyślij do KSeF'}
        </SharedButton>
      </ModalFooter>
    </ModalShell>
  );
};
