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
import { invoiceDraftTotals, type InvoicePriceMode } from '../utils/invoiceDraftTotals';
import { handleZeroAwareKeyDown } from '@/common/utils/moneyInput';
import { validatePolishNip } from '@/common/utils/validators';
import { localIsoDate } from '@/common/utils/localDate';
import { Segmented } from '@/common/components/ui';
import { apiErrorMessage } from '@/modules/visits/api/apiError';
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
  color: ${(p) => (p.$active ? '#0369a1' : p.theme.colors.textSecondary)};
  background: ${(p) => (p.$active ? '#f0f6f9' : p.theme.colors.surface)};
  border: 1.5px solid ${(p) => (p.$active ? '#a7cadd' : p.theme.colors.border)};
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
  grid-template-columns: minmax(160px, 2.2fr) 70px 80px 110px 90px 32px;
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

/**
 * Podpis pola widoczny tylko na telefonie: nagłówek tabeli znika poniżej 640 px, a dwie
 * kwoty bez podpisu (testy na telefonie) nie mówiły, która jest netto, a która brutto.
 */
const CellLabel = styled.span`
  display: none;
  font-size: 11.5px;
  font-weight: 600;
  color: ${(p) => p.theme.colors.textSecondary};

  @media (max-width: 639px) { display: block; margin-bottom: 3px; }
`;

const Cell = styled.div`
  display: flex;
  flex-direction: column;
  min-width: 0;
`;

const PriceModeRow = styled.div`
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px 12px;
  font-size: 13px;
  color: ${(p) => p.theme.colors.textSecondary};
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
  color: #0369a1;
  background: #f0f6f9;
  border: 1px dashed #a7cadd;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.15s ease;
  &:hover { background: #e6f0f6; }
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
  unit:     string;
  price:    string;   // PLN (input) - netto albo brutto, wg wyboru „Ceny wpisuję"
  vatRate:  RevenueVatRate;
}

const emptyItem = (): ItemDraft => ({ name: '', quantity: '1', unit: 'szt.', price: '', vatRate: '23' });

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
 * Wystawianie faktury przychodowej: dokument trafia bezpośrednio do KSeF.
 * B2B (NIP) lub B2C (konsument, bez NIP, poza obowiązkiem KSeF, ale wysyłana
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
  const [issueDate, setIssueDate]     = useState(localIsoDate());
  // Którą cenę wpisuje użytkownik. Dopóki nie wybierze sam, idzie za nabywcą: firmie
  // zwykle podaje się netto, konsumentowi brutto. Wpisane brutto zostaje co do grosza
  // (CLAUDE.md §1) - wcześniej okno znało tylko netto i 1900,00 zł było nieosiągalne.
  const [priceModeChoice, setPriceModeChoice] = useState<InvoicePriceMode | null>(null);
  const priceMode: InvoicePriceMode = priceModeChoice ?? (buyerType === 'B2B' ? 'NET' : 'GROSS');
  const [exemptionBasis, setExemptionBasis] = useState('');
  const [error, setError]             = useState<string | null>(null);

  // Sumy liczone tym samym wzorem co na serwerze (utils/invoiceDraftTotals).
  const totals = useMemo(
    () => invoiceDraftTotals(items.map((item) => ({ ...item, mode: priceMode }))),
    [items, priceMode]
  );

  const hasExempt = items.some((i) => i.vatRate === 'zw');

  const updateItem = (index: number, patch: Partial<ItemDraft>) =>
    setItems((prev) => prev.map((item, i) => (i === index ? { ...item, ...patch } : item)));

  const reset = () => {
    setBuyerType('B2B'); setNip(''); setBuyerName(''); setAddress1(''); setAddress2('');
    setEmail(''); setItems([emptyItem()]); setPaymentForm('GOTOWKA'); setIsPaid(true);
    setDueDate(''); setSaleDate(''); setIssueDate(localIsoDate()); setPriceModeChoice(null);
    setExemptionBasis(''); setError(null);
  };

  const handleClose = () => { reset(); onClose(); };

  const validate = (): string | null => {
    if (buyerType === 'B2B' && !/^\d{10}$/.test(nip.replace(/[^0-9]/g, '')))
      return 'NIP nabywcy musi mieć 10 cyfr';
    // Faktura trafia do KSeF na konto podatnika o tym NIP-ie: literówka wysłałaby ją do obcej firmy.
    if (buyerType === 'B2B' && !validatePolishNip(nip))
      return 'NIP nabywcy ma błędną sumę kontrolną - sprawdź cyfry';
    if (!issueDate) return 'Podaj datę wystawienia';
    if (buyerType === 'B2C' && !buyerName.trim())
      return 'Podaj imię i nazwisko nabywcy';
    if (items.length === 0) return 'Dodaj co najmniej jedną pozycję';
    for (const [i, item] of items.entries()) {
      if (!item.name.trim()) return `Pozycja ${i + 1}: podaj nazwę usługi`;
      if (inputValueToGrosze(item.price) <= 0) return `Pozycja ${i + 1}: podaj cenę ${priceMode === 'GROSS' ? 'brutto' : 'netto'}`;
      if ((parseFloat(item.quantity.replace(',', '.')) || 0) <= 0) return `Pozycja ${i + 1}: podaj ilość`;
    }
    if (hasExempt && !exemptionBasis.trim())
      return 'Przy stawce „zw” podaj podstawę zwolnienia z VAT';
    if (!isPaid && paymentForm === 'PRZELEW' && !dueDate)
      return 'Przy przelewie podaj termin płatności';
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
          name:     item.name.trim(),
          unit:     item.unit.trim() || 'szt.',
          quantity: parseFloat(item.quantity.replace(',', '.')) || 1,
          // Wpisana cena idzie w swoim trybie - serwer liczy drugą stronę tym samym wzorem.
          ...(priceMode === 'GROSS'
            ? { unitPriceGross: inputValueToGrosze(item.price) }
            : { unitPriceNet: inputValueToGrosze(item.price) }),
          vatRate:  item.vatRate,
        })),
        issueDate,
        saleDate:            saleDate || undefined,
        paymentForm,
        isPaid,
        paymentDueDate:      !isPaid && dueDate ? dueDate : undefined,
        exemptionLegalBasis: hasExempt ? exemptionBasis.trim() : undefined,
      });
      handleClose();
    } catch (e: unknown) {
      setError(apiErrorMessage(e, 'Nie udało się wystawić faktury. Spróbuj ponownie.'));
    }
  };

  if (!isOpen) return null;

  return (
    <ModalShell isOpen={isOpen} onClose={handleClose} size="xl">
      <ModalHeader>
        <ModalTitleGroup>
          <ModalTitle>Wystaw fakturę</ModalTitle>
          <ModalSubtitle>
            Faktura od razu trafi do KSeF
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
            <FieldLabel>Data wystawienia *</FieldLabel>
            <InputShell>
              <BareInput value={issueDate} onChange={(e) => setIssueDate(e.target.value)} type="date" />
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
        <PriceModeRow>
          <span>Ceny wpisuję</span>
          <Segmented
            label="Ceny wpisuję"
            size="sm"
            options={[{ value: 'GROSS', label: 'Brutto' }, { value: 'NET', label: 'Netto' }]}
            value={priceMode}
            onChange={(mode) => setPriceModeChoice(mode as InvoicePriceMode)}
          />
          <span>
            {priceMode === 'GROSS'
              ? 'Kwota brutto zostanie na fakturze co do grosza.'
              : 'Brutto policzymy z netto.'}
          </span>
        </PriceModeRow>
        <ItemsTable>
          <ItemHeaderRow>
            <span>Nazwa usługi / towaru</span>
            <span>Ilość</span>
            <span>J.m.</span>
            <span>{priceMode === 'GROSS' ? 'Cena brutto' : 'Cena netto'}</span>
            <span>VAT</span>
            <span />
          </ItemHeaderRow>
          {items.map((item, index) => (
            <ItemRow key={index}>
              <Cell>
                <CellLabel>Nazwa</CellLabel>
                <InputShell>
                  <BareInput
                    value={item.name}
                    onChange={(e) => updateItem(index, { name: e.target.value })}
                    placeholder="np. Korekta lakieru + powłoka ceramiczna"
                    aria-label={`Nazwa pozycji ${index + 1}`}
                  />
                </InputShell>
              </Cell>
              <Cell>
                <CellLabel>Ilość</CellLabel>
                <InputShell>
                  <BareInput
                    value={item.quantity}
                    onChange={(e) => updateItem(index, { quantity: e.target.value })}
                    inputMode="decimal"
                    aria-label={`Ilość pozycji ${index + 1}`}
                  />
                </InputShell>
              </Cell>
              <Cell>
                <CellLabel>J.m.</CellLabel>
                <InputShell>
                  <BareInput
                    value={item.unit}
                    maxLength={20}
                    onChange={(e) => updateItem(index, { unit: e.target.value })}
                    aria-label={`Jednostka pozycji ${index + 1}`}
                  />
                </InputShell>
              </Cell>
              <Cell>
                <CellLabel>{priceMode === 'GROSS' ? 'Cena brutto' : 'Cena netto'}</CellLabel>
                <InputShell>
                  <BareInput
                    value={item.price}
                    onChange={(e) => updateItem(index, { price: e.target.value })}
                    onKeyDown={handleZeroAwareKeyDown(item.price, v => updateItem(index, { price: v }))}
                    placeholder="0,00"
                    inputMode="decimal"
                    aria-label={`${priceMode === 'GROSS' ? 'Cena brutto' : 'Cena netto'} pozycji ${index + 1}`}
                  />
                </InputShell>
              </Cell>
              <Cell>
                <CellLabel>VAT</CellLabel>
                <Select
                  value={item.vatRate}
                  aria-label={`Stawka VAT pozycji ${index + 1}`}
                  onChange={(e) => updateItem(index, { vatRate: e.target.value as RevenueVatRate })}
                >
                  <option value="23">23%</option>
                  <option value="8">8%</option>
                  <option value="5">5%</option>
                  <option value="0">0%</option>
                  <option value="zw">zw.</option>
                </Select>
              </Cell>
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
