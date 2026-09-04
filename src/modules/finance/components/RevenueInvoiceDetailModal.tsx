import React, { useState } from 'react';
import styled from 'styled-components';
import { QRCodeSVG } from 'qrcode.react';
import { Download, Eye, EyeOff, FileCheck2, RefreshCw, Trash2 } from 'lucide-react';
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
import { FormAlertBanner, FieldLabel, InputShell, BareInput } from '@/common/components/Form';
import { ksefRevenueApi } from '../api/ksefRevenueApi';
import {
  useKsefRevenueInvoiceDetail,
  useRetryRevenueInvoice,
  useDeleteRejectedInvoice,
  useResolveDuplicate,
  useIssueCorrection,
  useUpdateRevenuePaymentStatus,
} from '../hooks/useKsefRevenue';
import { useExcludeIncomeDocument, useRestoreIncomeDocument } from '../hooks/useIncomeDocuments';
import { formatMoney, formatMoneyCompact, formatDate } from '../utils/formatters';
import { RevenueStatusBadge } from './RevenueStatusBadge';
import type { RevenueInvoice, RevenueParty } from '../types';

// ─── Wizualizacja dokumentu ──────────────────────────────────────────────────
// Układ celowo bliźniaczy do podglądu faktury kosztowej: ta sama „kartka",
// te same proporcje. Faktura to dokument, a nie lista pól - dlatego dane stron,
// płatności i kwot mają własne wiersze, nigdy sklejenie separatorem.

/**
 * ModalContent jest kolumną flex ze scrollem, więc każdy bezpośredni element musi
 * mieć flex-shrink: 0. Bez tego przeglądarka ściska kartkę do wysokości okna
 * zamiast pozwolić jej wystawać - a że kartka ma overflow: hidden, dół faktury
 * znikał bez możliwości doscrollowania.
 */
const Paper = styled.div`
  border: 1px solid ${(p) => p.theme.colors.border};
  border-radius: 14px;
  background: #fff;
  overflow: hidden;
  flex-shrink: 0;
`;

const PaperHead = styled.div`
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  padding: 20px 24px;
  background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);

  @media (max-width: 560px) {
    flex-direction: column;
    padding: 16px 18px;
  }
`;

const DocType = styled.div`
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: rgba(255, 255, 255, 0.55);
`;

const DocNumber = styled.div`
  margin-top: 4px;
  font-size: 20px;
  font-weight: 800;
  letter-spacing: -0.5px;
  color: #fff;
  word-break: break-all;
`;

const DocKsefRef = styled.div`
  margin-top: 6px;
  font-size: 11px;
  color: rgba(255, 255, 255, 0.45);
  word-break: break-all;
`;

const HeadDates = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
  text-align: right;
  flex-shrink: 0;

  @media (max-width: 560px) {
    flex-direction: row;
    gap: 20px;
    text-align: left;
  }
`;

const HeadDateLabel = styled.span`
  display: block;
  font-size: 10px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: rgba(255, 255, 255, 0.45);
`;

const HeadDateValue = styled.span`
  display: block;
  margin-top: 2px;
  font-size: 13px;
  font-weight: 600;
  color: #fff;
  font-feature-settings: 'tnum';
`;

const PaperBody = styled.div`
  padding: 24px;

  @media (max-width: 560px) {
    padding: 18px;
  }
`;

const BadgeRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
  margin-bottom: 16px;
`;

// ─── Strony ──────────────────────────────────────────────────────────────────

const PartiesGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;

  @media (max-width: 560px) {
    grid-template-columns: 1fr;
  }
`;

const PartyCard = styled.div`
  padding: 16px;
  border: 1px solid ${(p) => p.theme.colors.border};
  border-radius: 12px;
  background: #f8fafc;
`;

const Eyebrow = styled.div`
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: ${(p) => p.theme.colors.textMuted};
`;

const PartyName = styled.div`
  margin-top: 8px;
  font-size: 14px;
  font-weight: 600;
  color: ${(p) => p.theme.colors.text};
`;

const PartyLine = styled.div`
  margin-top: 3px;
  font-size: 13px;
  color: ${(p) => p.theme.colors.textMuted};
`;

// ─── Pozycje ─────────────────────────────────────────────────────────────────

const ItemsSection = styled.div`
  margin-top: 24px;
`;

const ItemsScroll = styled.div`
  margin-top: 10px;
  border: 1px solid ${(p) => p.theme.colors.border};
  border-radius: 12px;
  overflow-x: auto;
`;

const ItemsTable = styled.table`
  width: 100%;
  min-width: 560px;
  border-collapse: collapse;
`;

const ItemTh = styled.th<{ $align?: 'left' | 'right' }>`
  padding: 10px 12px;
  text-align: ${(p) => p.$align || 'left'};
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: ${(p) => p.theme.colors.textMuted};
  background: #f8fafc;
  border-bottom: 1px solid ${(p) => p.theme.colors.border};
  white-space: nowrap;
  &:first-child { padding-left: 16px; }
  &:last-child  { padding-right: 16px; }
`;

const ItemTd = styled.td<{ $align?: 'left' | 'right' }>`
  padding: 10px 12px;
  text-align: ${(p) => p.$align || 'left'};
  font-size: 13px;
  color: ${(p) => p.theme.colors.text};
  border-bottom: 1px solid ${(p) => p.theme.colors.border};
  vertical-align: top;
  &:first-child { padding-left: 16px; }
  &:last-child  { padding-right: 16px; }

  tr:last-child & { border-bottom: none; }
`;

const ItemNum = styled.span`
  font-size: 12px;
  color: ${(p) => p.theme.colors.textMuted};
  font-feature-settings: 'tnum';
`;

const Mono = styled.span`
  font-family: 'JetBrains Mono', 'SF Mono', 'Fira Code', monospace;
  font-feature-settings: 'tnum';
  font-size: 12.5px;
  white-space: nowrap;
`;

const ItemsEmpty = styled.div`
  margin-top: 10px;
  padding: 20px;
  border: 1px dashed ${(p) => p.theme.colors.border};
  border-radius: 12px;
  text-align: center;
  font-size: 13px;
  color: ${(p) => p.theme.colors.textMuted};
`;

// ─── Podsumowanie kwot ───────────────────────────────────────────────────────

const TotalsRow = styled.div`
  margin-top: 16px;
  display: flex;
  justify-content: flex-end;
`;

const TotalsBox = styled.div`
  min-width: min(260px, 100%);
  padding: 14px 16px;
  border: 1px solid ${(p) => p.theme.colors.border};
  border-radius: 12px;
  background: #f8fafc;
`;

const TotalsLine = styled.div<{ $emphasis?: boolean }>`
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 24px;
  padding: 3px 0;

  span:first-child {
    font-size: ${(p) => (p.$emphasis ? '13px' : '12px')};
    font-weight: ${(p) => (p.$emphasis ? 700 : 500)};
    color: ${(p) => (p.$emphasis ? p.theme.colors.text : p.theme.colors.textMuted)};
  }

  span:last-child {
    font-family: 'JetBrains Mono', 'SF Mono', 'Fira Code', monospace;
    font-feature-settings: 'tnum';
    font-size: ${(p) => (p.$emphasis ? '16px' : '13px')};
    font-weight: ${(p) => (p.$emphasis ? 800 : 500)};
    letter-spacing: ${(p) => (p.$emphasis ? '-0.5px' : '0')};
    color: ${(p) => p.theme.colors.text};
    white-space: nowrap;
  }
`;

// ─── Metadane ────────────────────────────────────────────────────────────────

const MetaGrid = styled.div`
  margin-top: 24px;
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
  gap: 16px 20px;
`;

const MetaValue = styled.div`
  margin-top: 6px;
  font-size: 13px;
  font-weight: 500;
  color: ${(p) => p.theme.colors.text};
  word-break: break-word;
`;

const NoteBox = styled.div`
  margin-top: 20px;
  padding: 12px 16px;
  border: 1px solid #fde68a;
  border-radius: 12px;
  background: #fffbeb;
  font-size: 13px;
  color: #92400e;
  white-space: pre-wrap;
`;

// ─── Kod QR KSeF ─────────────────────────────────────────────────────────────

const QrPanel = styled.div`
  margin-top: 24px;
  display: flex;
  align-items: flex-start;
  gap: 20px;
  padding: 18px 20px;
  border: 1px solid ${(p) => p.theme.colors.border};
  border-radius: 12px;
  background: #f8fafc;

  @media (max-width: 560px) {
    flex-direction: column;
    align-items: center;
    text-align: center;
  }
`;

const QrFrame = styled.a`
  display: block;
  padding: 10px;
  border-radius: 10px;
  background: #fff;
  border: 1px solid ${(p) => p.theme.colors.border};
  line-height: 0;
  flex-shrink: 0;
`;

const QrCopy = styled.div`
  font-size: 13px;
  color: ${(p) => p.theme.colors.textMuted};
  line-height: 1.55;
`;

const QrUrl = styled.div`
  margin-top: 8px;
  font-family: 'JetBrains Mono', 'SF Mono', 'Fira Code', monospace;
  font-size: 11px;
  color: ${(p) => p.theme.colors.textMuted};
  word-break: break-all;
`;

const QrPending = styled.div`
  margin-top: 24px;
  padding: 14px 16px;
  border: 1px dashed ${(p) => p.theme.colors.border};
  border-radius: 12px;
  font-size: 13px;
  color: ${(p) => p.theme.colors.textMuted};
  line-height: 1.55;
`;

// ─── Odznaki i komunikaty ────────────────────────────────────────────────────

const Badge = styled.span<{ $tone: 'green' | 'amber' | 'red' | 'slate' }>`
  display: inline-flex;
  align-items: center;
  padding: 2px 8px;
  border-radius: 5px;
  font-size: 11px;
  font-weight: 600;
  white-space: nowrap;
  ${(p) => {
    switch (p.$tone) {
      case 'green': return `background: #dcfce7; color: #166534; border: 1px solid #86efac;`;
      case 'amber': return `background: #fef9c3; color: #92400e; border: 1px solid #fde68a;`;
      case 'red':   return `background: #fee2e2; color: #991b1b; border: 1px solid #fca5a5;`;
      case 'slate': return `background: #f1f5f9; color: #475569; border: 1px solid #cbd5e1;`;
    }
  }}
`;

const DuplicateBox = styled.div`
  flex-shrink: 0;
  padding: 14px 16px;
  background: #fef2f2;
  border: 1px solid #fecaca;
  border-radius: 10px;
  font-size: 13px;
  color: #7f1d1d;
  line-height: 1.55;

  strong { display: block; margin-bottom: 4px; }
`;

const DuplicateActions = styled.div`
  display: flex;
  gap: 8px;
  margin-top: 10px;
  flex-wrap: wrap;
`;

const ErrorBox = styled.div`
  flex-shrink: 0;
  padding: 12px 14px;
  background: #fef2f2;
  border: 1px solid #fecaca;
  border-radius: 10px;
  font-size: 12px;
  color: #b91c1c;
  word-break: break-word;
`;

const OfflineBox = styled.div`
  flex-shrink: 0;
  padding: 12px 14px;
  background: #fffbeb;
  border: 1px solid #fde68a;
  border-radius: 10px;
  font-size: 12px;
  color: #92400e;
  line-height: 1.5;
`;

const HiddenBox = styled.div`
  flex-shrink: 0;
  padding: 12px 14px;
  background: #f1f5f9;
  border: 1px solid #cbd5e1;
  border-radius: 10px;
  font-size: 12px;
  color: #475569;
  line-height: 1.5;
`;

const ActionsRow = styled.div`
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  flex-shrink: 0;
`;

// ─── Formatowanie ────────────────────────────────────────────────────────────

/** Stawki nieliczbowe wg schematu FA(3): "23" → "23%", "zw" → "zw.". */
const formatVatRate = (rate: string): string =>
  /^\d+([.,]\d+)?$/.test(rate) ? `${rate}%` : `${rate}.`;

/** Ilość bez zbędnych zer: 2 → "2", 1.5 → "1,5". */
const formatQuantity = (quantity: number): string =>
  new Intl.NumberFormat('pl-PL', { maximumFractionDigits: 4 }).format(quantity);

/** 26-cyfrowy NRB w grupach: XX XXXX XXXX XXXX XXXX XXXX XXXX. */
const formatBankAccount = (account: string): string => {
  const digits = account.replace(/\s/g, '');
  if (!/^\d{26}$/.test(digits)) return account;
  return `${digits.slice(0, 2)} ${digits.slice(2).replace(/(\d{4})(?=\d)/g, '$1 ')}`;
};

/**
 * Adres strony jako osobne wiersze. Kraj tylko wtedy, gdy nie jest polski -
 * „PL" pod polskim adresem to szum, a nie informacja.
 */
const partyAddressLines = (party: RevenueParty): string[] => {
  const lines = [party.addressLine1, party.addressLine2].filter(Boolean) as string[];
  if (party.countryCode && party.countryCode !== 'PL') lines.push(party.countryCode);
  return lines;
};

const documentTypeLabel = (invoice: RevenueInvoice): string =>
  invoice.invoiceType === 'KOR' ? 'Faktura korygująca' : 'Faktura VAT';

// ─── Component ───────────────────────────────────────────────────────────────

interface RevenueInvoiceDetailModalProps {
  invoiceId: string | null;
  onClose:   () => void;
}

export const RevenueInvoiceDetailModal: React.FC<RevenueInvoiceDetailModalProps> = ({ invoiceId, onClose }) => {
  const { invoice } = useKsefRevenueInvoiceDetail(invoiceId);
  const retryMutation      = useRetryRevenueInvoice();
  const deleteMutation     = useDeleteRejectedInvoice();
  const duplicateMutation  = useResolveDuplicate();
  const correctionMutation = useIssueCorrection();
  const paymentMutation    = useUpdateRevenuePaymentStatus();
  const excludeMutation    = useExcludeIncomeDocument();
  const restoreMutation    = useRestoreIncomeDocument();

  const [correctionMode, setCorrectionMode]     = useState(false);
  const [correctionReason, setCorrectionReason] = useState('');
  const [actionError, setActionError]           = useState<string | null>(null);

  if (!invoiceId) return null;

  const close = () => {
    setCorrectionMode(false);
    setCorrectionReason('');
    setActionError(null);
    onClose();
  };

  const run = async (action: () => Promise<unknown>) => {
    setActionError(null);
    try {
      await action();
    } catch (e: any) {
      setActionError(e?.response?.data?.message ?? 'Operacja nie powiodła się. Spróbuj ponownie.');
    }
  };

  const handleFullCorrection = () =>
    run(async () => {
      await correctionMutation.mutateAsync({
        id: invoiceId,
        data: { reason: correctionReason.trim() },
      });
      setCorrectionMode(false);
      setCorrectionReason('');
    });

  const handleDelete = () =>
    run(async () => {
      await deleteMutation.mutateAsync(invoiceId);
      close();
    });

  const busy =
    retryMutation.isPending || deleteMutation.isPending ||
    duplicateMutation.isPending || correctionMutation.isPending ||
    paymentMutation.isPending || excludeMutation.isPending || restoreMutation.isPending;

  const items = invoice?.items ?? [];

  return (
    <ModalShell isOpen={invoiceId !== null} onClose={close} size="full" fillHeight>
      <ModalHeader>
        <ModalTitleGroup>
          <ModalTitle>Podgląd faktury</ModalTitle>
          {invoice && <ModalSubtitle>{invoice.invoiceNumber}</ModalSubtitle>}
        </ModalTitleGroup>
        <CloseBtn onClick={close} />
      </ModalHeader>

      <ModalContent>
        {!invoice ? null : (
          <>
            {actionError && <FormAlertBanner>{actionError}</FormAlertBanner>}

            {invoice.excluded && (
              <HiddenBox>
                Faktura jest ukryta ze statystyk - nie wchodzi do kafli podsumowania ani do
                raportów. Dokument nadal istnieje w KSeF i pozostaje prawnie wiążący.
              </HiddenBox>
            )}

            {invoice.duplicateStatus === 'SUSPECTED' && (
              <DuplicateBox>
                <strong>⚠ Możliwe podwójne fakturowanie</strong>
                Ta faktura wygląda na duplikat innej faktury (ten sam nabywca, kwota i zbliżona
                data). Obie faktury są prawnie wiążące, więc jeśli to duplikat, nadmiarowy dokument
                trzeba skorygować do zera w systemie, w którym powstał.
                <DuplicateActions>
                  <SharedButton
                    $variant="danger"
                    $size="sm"
                    disabled={busy}
                    onClick={() => run(() => duplicateMutation.mutateAsync({ id: invoice.id, resolution: 'CONFIRMED_DUPLICATE' }))}
                  >
                    To duplikat, wyklucz ze statystyk
                  </SharedButton>
                  <SharedButton
                    $variant="secondary"
                    $size="sm"
                    disabled={busy}
                    onClick={() => run(() => duplicateMutation.mutateAsync({ id: invoice.id, resolution: 'DISMISSED' }))}
                  >
                    To osobne transakcje
                  </SharedButton>
                </DuplicateActions>
              </DuplicateBox>
            )}

            {invoice.ksefStatus === 'NOT_SENT' && (
              <OfflineBox>
                Faktura została wystawiona bez wysyłki do KSeF - dokument istnieje w CRM,
                ale nie w KSeF. Możesz pobrać jego plik XML i wgrać go ręcznie albo wysłać
                fakturę przyciskiem poniżej.
              </OfflineBox>
            )}

            {invoice.ksefStatus === 'QUEUED_RETRY' && (
              <OfflineBox>
                KSeF był niedostępny w chwili wystawienia (tryb offline24). Faktura zostanie
                dosłana automatycznie, najpóźniej następnego dnia roboczego. Możesz też ponowić
                wysyłkę ręcznie.
              </OfflineBox>
            )}

            {invoice.ksefStatus === 'REJECTED' && invoice.lastSendError && (
              <ErrorBox>
                <strong>Odrzucona przez KSeF:</strong> {invoice.lastSendError}
              </ErrorBox>
            )}

            <Paper>
              <PaperHead>
                <div>
                  <DocType>{documentTypeLabel(invoice)}</DocType>
                  <DocNumber>{invoice.invoiceNumber}</DocNumber>
                  {invoice.ksefNumber && <DocKsefRef>KSeF: {invoice.ksefNumber}</DocKsefRef>}
                  {invoice.invoiceType === 'KOR' && invoice.originalKsefNumber && (
                    <DocKsefRef>Korekta do: {invoice.originalKsefNumber}</DocKsefRef>
                  )}
                </div>
                <HeadDates>
                  <div>
                    <HeadDateLabel>Data wystawienia</HeadDateLabel>
                    <HeadDateValue>{formatDate(invoice.issueDate)}</HeadDateValue>
                  </div>
                  {invoice.saleDate && (
                    <div>
                      <HeadDateLabel>Data sprzedaży</HeadDateLabel>
                      <HeadDateValue>{formatDate(invoice.saleDate)}</HeadDateValue>
                    </div>
                  )}
                </HeadDates>
              </PaperHead>

              <PaperBody>
                <BadgeRow>
                  <RevenueStatusBadge status={invoice.ksefStatus} />
                  {invoice.source === 'EXTERNAL' && (
                    <Badge $tone="slate" title="Faktura wystawiona poza CRM, pobrana z KSeF">
                      Wystawiona poza CRM
                    </Badge>
                  )}
                  {invoice.excluded && <Badge $tone="slate">Ukryta ze statystyk</Badge>}
                  {!invoice.detailsSynced && (
                    <Badge
                      $tone="amber"
                      title="Pozycje, adresy i dane płatności dociągamy z treści faktury w KSeF"
                    >
                      Szczegóły w trakcie pobierania
                    </Badge>
                  )}
                  {invoice.duplicateStatus === 'CONFIRMED_DUPLICATE' && (
                    <Badge $tone="red">Potwierdzony duplikat</Badge>
                  )}
                </BadgeRow>

                {/* Strony */}
                <PartiesGrid>
                  <PartyCard>
                    <Eyebrow>Sprzedawca</Eyebrow>
                    <PartyName>{invoice.seller.name ?? 'Dane sprzedawcy niedostępne'}</PartyName>
                    {invoice.seller.nip && <PartyLine>NIP: {invoice.seller.nip}</PartyLine>}
                    {partyAddressLines(invoice.seller).map((line) => (
                      <PartyLine key={line}>{line}</PartyLine>
                    ))}
                  </PartyCard>
                  <PartyCard>
                    <Eyebrow>Nabywca</Eyebrow>
                    <PartyName>{invoice.buyer.name ?? 'Nabywca prywatny'}</PartyName>
                    {invoice.buyer.nip
                      ? <PartyLine>NIP: {invoice.buyer.nip}</PartyLine>
                      : <PartyLine>Konsument (bez NIP)</PartyLine>}
                    {partyAddressLines(invoice.buyer).map((line) => (
                      <PartyLine key={line}>{line}</PartyLine>
                    ))}
                  </PartyCard>
                </PartiesGrid>

                {/* Pozycje */}
                <ItemsSection>
                  <Eyebrow>Pozycje faktury</Eyebrow>
                  {items.length === 0 ? (
                    <ItemsEmpty>
                      {invoice.detailsSynced
                        ? 'Brak pozycji dla tego dokumentu.'
                        : 'Pozycje zostaną uzupełnione przy najbliższej synchronizacji z KSeF - ' +
                          'pobranie treści faktury objęte jest limitem żądań, więc idzie osobno od listy.'}
                    </ItemsEmpty>
                  ) : (
                    <ItemsScroll>
                      <ItemsTable>
                        <thead>
                          <tr>
                            <ItemTh>Lp.</ItemTh>
                            <ItemTh>Nazwa towaru / usługi</ItemTh>
                            <ItemTh $align="right">Ilość</ItemTh>
                            <ItemTh>J.m.</ItemTh>
                            <ItemTh $align="right">Cena netto</ItemTh>
                            <ItemTh $align="right">VAT</ItemTh>
                            <ItemTh $align="right">Wartość netto</ItemTh>
                            <ItemTh $align="right">Wartość brutto</ItemTh>
                          </tr>
                        </thead>
                        <tbody>
                          {items.map((item) => (
                            <tr key={item.lineNumber}>
                              <ItemTd><ItemNum>{item.lineNumber}</ItemNum></ItemTd>
                              <ItemTd>{item.name}</ItemTd>
                              <ItemTd $align="right"><Mono>{formatQuantity(item.quantity)}</Mono></ItemTd>
                              <ItemTd>{item.unit ?? 'szt.'}</ItemTd>
                              <ItemTd $align="right"><Mono>{formatMoneyCompact(item.unitPriceNet)}</Mono></ItemTd>
                              <ItemTd $align="right"><Mono>{formatVatRate(item.vatRate)}</Mono></ItemTd>
                              <ItemTd $align="right"><Mono>{formatMoneyCompact(item.netValue)}</Mono></ItemTd>
                              <ItemTd $align="right"><Mono>{formatMoneyCompact(item.grossValue)}</Mono></ItemTd>
                            </tr>
                          ))}
                        </tbody>
                      </ItemsTable>
                    </ItemsScroll>
                  )}
                </ItemsSection>

                {/* Podsumowanie */}
                <TotalsRow>
                  <TotalsBox>
                    <TotalsLine>
                      <span>Razem netto</span>
                      <span>{formatMoney(invoice.totalNet, invoice.currency)}</span>
                    </TotalsLine>
                    <TotalsLine>
                      <span>VAT</span>
                      <span>{formatMoney(invoice.totalVat, invoice.currency)}</span>
                    </TotalsLine>
                    <TotalsLine $emphasis>
                      <span>Do zapłaty</span>
                      <span>{formatMoney(invoice.totalGross, invoice.currency)}</span>
                    </TotalsLine>
                  </TotalsBox>
                </TotalsRow>

                {/* Płatność i dane uzupełniające - każde pole osobno, puste pomijamy */}
                <MetaGrid>
                  <div>
                    <Eyebrow>Status płatności</Eyebrow>
                    <MetaValue>
                      <Badge $tone={invoice.paymentStatus === 'PAID' ? 'green' : 'amber'}>
                        {invoice.paymentStatus === 'PAID' ? 'Opłacona' : 'Oczekuje na płatność'}
                      </Badge>
                    </MetaValue>
                  </div>
                  {(invoice.paymentFormLabel ?? invoice.paymentForm) && (
                    <div>
                      <Eyebrow>Forma płatności</Eyebrow>
                      <MetaValue>{invoice.paymentFormLabel ?? invoice.paymentForm}</MetaValue>
                    </div>
                  )}
                  {invoice.paymentDueDate && (
                    <div>
                      <Eyebrow>Termin płatności</Eyebrow>
                      <MetaValue>{formatDate(invoice.paymentDueDate)}</MetaValue>
                    </div>
                  )}
                  {invoice.seller.bankAccount && (
                    <div>
                      <Eyebrow>Rachunek bankowy</Eyebrow>
                      <MetaValue><Mono>{formatBankAccount(invoice.seller.bankAccount)}</Mono></MetaValue>
                    </div>
                  )}
                  {invoice.invoiceType === 'KOR' && invoice.correctionReason && (
                    <div>
                      <Eyebrow>Przyczyna korekty</Eyebrow>
                      <MetaValue>{invoice.correctionReason}</MetaValue>
                    </div>
                  )}
                  {invoice.description && (
                    <div>
                      <Eyebrow>Opis</Eyebrow>
                      <MetaValue>{invoice.description}</MetaValue>
                    </div>
                  )}
                </MetaGrid>

                {invoice.note && <NoteBox>{invoice.note}</NoteBox>}

                {/* Kod QR KSeF (KOD I) - weryfikacja dokumentu u źródła */}
                {invoice.ksefVerificationUrl ? (
                  <QrPanel>
                    <QrFrame
                      href={invoice.ksefVerificationUrl}
                      target="_blank"
                      rel="noreferrer noopener"
                      title="Otwórz weryfikację faktury w KSeF"
                    >
                      <QRCodeSVG value={invoice.ksefVerificationUrl} size={132} level="M" />
                    </QrFrame>
                    <QrCopy>
                      <Eyebrow>Weryfikacja w KSeF</Eyebrow>
                      <div style={{ marginTop: 8 }}>
                        Zeskanuj kod, aby potwierdzić w Ministerstwie Finansów, że ta faktura
                        istnieje w KSeF i nie została zmieniona. Ten sam kod umieszcza się na
                        wizualizacji faktury przekazywanej nabywcy.
                      </div>
                      <QrUrl>{invoice.ksefVerificationUrl}</QrUrl>
                    </QrCopy>
                  </QrPanel>
                ) : (
                  <QrPending>
                    Kod QR weryfikacyjny pojawi się, gdy KSeF przyjmie fakturę i nada jej skrót
                    dokumentu. Dla faktur jeszcze niewysłanych nie ma czego weryfikować.
                  </QrPending>
                )}
              </PaperBody>
            </Paper>

            <ModalSectionTitle>Akcje</ModalSectionTitle>
            <ActionsRow>
              {invoice.hasXml && (
                <SharedButton
                  $variant="secondary" $size="sm"
                  onClick={() => run(() => ksefRevenueApi.downloadInvoiceXml(invoice.id, invoice.invoiceNumber))}
                >
                  <Download size={14} /> XML faktury
                </SharedButton>
              )}
              {invoice.hasUpo && (
                <SharedButton
                  $variant="secondary" $size="sm"
                  onClick={() => run(() => ksefRevenueApi.downloadUpo(invoice.id, invoice.invoiceNumber))}
                >
                  <FileCheck2 size={14} /> Pobierz UPO
                </SharedButton>
              )}
              {invoice.source === 'CRM' &&
                ['PENDING', 'QUEUED_RETRY', 'SUBMITTED', 'NOT_SENT'].includes(invoice.ksefStatus) && (
                <SharedButton
                  $variant="secondary" $size="sm" disabled={busy}
                  onClick={() => run(() => retryMutation.mutateAsync(invoice.id))}
                >
                  <RefreshCw size={14} />
                  {retryMutation.isPending
                    ? 'Wysyłanie...'
                    : invoice.ksefStatus === 'NOT_SENT'
                      ? 'Wyślij do KSeF'
                      : 'Ponów wysyłkę do KSeF'}
                </SharedButton>
              )}
              <SharedButton
                $variant="secondary" $size="sm" disabled={busy}
                onClick={() => run(() => paymentMutation.mutateAsync({
                  id: invoice.id,
                  paymentStatus: invoice.paymentStatus === 'PAID' ? 'PENDING' : 'PAID',
                }))}
              >
                {invoice.paymentStatus === 'PAID' ? 'Oznacz jako nieopłaconą' : 'Oznacz jako opłaconą'}
              </SharedButton>
              <SharedButton
                $variant="secondary" $size="sm" disabled={busy}
                title={invoice.excluded
                  ? 'Faktura wróci do kafli podsumowania i raportów'
                  : 'Faktura zniknie ze statystyk, ale zostanie w systemie i w KSeF'}
                onClick={() => run(() =>
                  (invoice.excluded ? restoreMutation : excludeMutation)
                    .mutateAsync({ sourceKind: 'KSEF', id: invoice.id }))}
              >
                {invoice.excluded
                  ? <><Eye size={14} /> Przywróć do statystyk</>
                  : <><EyeOff size={14} /> Ukryj ze statystyk</>}
              </SharedButton>
              {invoice.source === 'CRM' && invoice.ksefStatus === 'ACCEPTED' &&
                invoice.invoiceType === 'VAT' && !correctionMode && (
                <SharedButton $variant="secondary" $size="sm" onClick={() => setCorrectionMode(true)}>
                  Wystaw korektę do zera
                </SharedButton>
              )}
              {invoice.source === 'CRM' && invoice.ksefStatus === 'REJECTED' && (
                <SharedButton $variant="danger" $size="sm" disabled={busy} onClick={handleDelete}>
                  <Trash2 size={14} /> Usuń odrzuconą fakturę
                </SharedButton>
              )}
            </ActionsRow>

            {correctionMode && (
              <>
                <FieldLabel>Przyczyna korekty *</FieldLabel>
                <InputShell>
                  <BareInput
                    value={correctionReason}
                    onChange={(e) => setCorrectionReason(e.target.value)}
                    placeholder="np. Rezygnacja z usługi / błędne dane"
                  />
                </InputShell>
                <ActionsRow>
                  <SharedButton
                    $variant="primary" $size="sm"
                    disabled={busy || !correctionReason.trim()}
                    onClick={handleFullCorrection}
                  >
                    {correctionMutation.isPending ? 'Wysyłanie korekty...' : 'Wystaw korektę (do zera) i wyślij do KSeF'}
                  </SharedButton>
                  <SharedButton $variant="secondary" $size="sm" onClick={() => setCorrectionMode(false)}>
                    Anuluj
                  </SharedButton>
                </ActionsRow>
              </>
            )}
          </>
        )}
      </ModalContent>

      <ModalFooter>
        <SharedButton $variant="secondary" onClick={close}>Zamknij</SharedButton>
      </ModalFooter>
    </ModalShell>
  );
};
