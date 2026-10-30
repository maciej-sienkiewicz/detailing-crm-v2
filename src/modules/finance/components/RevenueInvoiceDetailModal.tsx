import React, { useState } from 'react';
import styled from 'styled-components';
import { QRCodeSVG } from 'qrcode.react';
import { Download, Eye, EyeOff, FileCheck2, FileText, RefreshCw, Trash2 } from 'lucide-react';
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
import { usePaymentStatusVisible, usePaymentTracking } from '../hooks/usePaymentTracking';
import { formatMoney, formatMoneyCompact, formatDate, formatBankAccount } from '../utils/formatters';
import { RevenueStatusBadge } from './RevenueStatusBadge';
import { InvoiceEditCorrection } from './InvoiceEditCorrection';
import { correctedLinesPayload, editChange, editLinesFromItems, type EditLine } from '../utils/invoiceEdit';
import type { RevenueInvoice, RevenueParty } from '../types';
import { problemDetail } from '@/core/problem';
import { SettlementCorrectionModal } from '@/modules/visits/components/SettlementCorrectionModal';

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

/**
 * Akcje dokumentu w STOPCE, po lewej stronie.
 *
 * Wcześniej stały w treści, pod pełnym podglądem faktury, jako sekcja „Akcje".
 * Faktura ma tyle wierszy, ile ma pozycji, więc przyciski wypadały poniżej
 * krawędzi okna: żeby pobrać PDF albo oznaczyć zapłatę, trzeba było najpierw
 * domyślić się, że w ogóle istnieją, i przewinąć cały dokument. Stopka jest
 * widoczna zawsze i to w niej ludzie szukają tego, co da się z oknem zrobić.
 *
 * `margin-right: auto` odsuwa grupę na lewy koniec rzędu, zostawiając „Zamknij"
 * tam, gdzie stoi w każdym innym oknie aplikacji - po prawej.
 */
const FooterActions = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  margin-right: auto;
  min-width: 0;

  @media (max-width: 640px) {
    /* Stopka rozciąga swoje własne przyciski na całą szerokość, gdy się zawiną
       (patrz ModalFooter). Ta grupa jest dla niej jednym dzieckiem, więc ten
       sam zabieg trzeba powtórzyć w środku, inaczej akcje kleją się w lewym
       rogu, a obok zostaje pusty pas. */
    width: 100%;
    > button { flex: 1 1 auto; min-width: 0; }
  }
`;

/**
 * Formularz korekty stoi NA GÓRZE treści, nie na dole.
 *
 * Przycisk, który go włącza, siedzi w stopce - gdyby pole przyczyny pojawiało
 * się pod dokumentem, kliknięcie wyglądałoby na bezskuteczne, bo jedyny jego
 * ślad byłby poza ekranem. Tu jest widoczne od razu, a kursor ląduje w polu.
 */
const CorrectionBox = styled.div`
  flex-shrink: 0;
  padding: 14px 16px;
  background: #fffbeb;
  border: 1px solid #fde68a;
  border-radius: 10px;
  font-size: 13px;
  color: #92400e;
  line-height: 1.55;

  strong { display: block; margin-bottom: 4px; }
`;

// ─── Formatowanie ────────────────────────────────────────────────────────────

/** Stawki nieliczbowe wg schematu FA(3): "23" → "23%", "zw" → "zw.". */
const formatVatRate = (rate: string): string =>
  /^\d+([.,]\d+)?$/.test(rate) ? `${rate}%` : `${rate}.`;

/** Ilość bez zbędnych zer: 2 → "2", 1.5 → "1,5". */
const formatQuantity = (quantity: number): string =>
  new Intl.NumberFormat('pl-PL', { maximumFractionDigits: 4 }).format(quantity);

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
  // Jak w podglądzie faktury kosztowej: status i „Oznacz jako opłaconą”, gdy studio widzi
  // statusy na liście albo liczy według nich należności.
  const { enabled: tracking } = usePaymentTracking();
  const paymentTracking = usePaymentStatusVisible() || tracking;
  const retryMutation      = useRetryRevenueInvoice();
  const deleteMutation     = useDeleteRejectedInvoice();
  const duplicateMutation  = useResolveDuplicate();
  const correctionMutation = useIssueCorrection();
  const paymentMutation    = useUpdateRevenuePaymentStatus();
  const excludeMutation    = useExcludeIncomeDocument();
  const restoreMutation    = useRestoreIncomeDocument();

  // 'zero' - korekta do zera, 'edit' - „Popraw fakturę" (korekta jak edycja pozycji).
  const [correctionMode, setCorrectionMode]     = useState<null | 'zero' | 'edit'>(null);
  const [editLines, setEditLines]               = useState<EditLine[]>([]);
  const [correctionReason, setCorrectionReason] = useState('');
  const [correctionExemption, setCorrectionExemption] = useState<string | null>(null);
  const [actionError, setActionError]           = useState<string | null>(null);
  const [settlementOpen, setSettlementOpen]     = useState(false);

  if (!invoiceId) return null;

  const close = () => {
    setCorrectionMode(null);
    setCorrectionReason('');
    setCorrectionExemption(null);
    setActionError(null);
    onClose();
  };

  const run = async (action: () => Promise<unknown>) => {
    setActionError(null);
    try {
      await action();
    } catch (e: unknown) {
      setActionError(problemDetail(e, 'Nie udało się. Spróbuj ponownie.'));
    }
  };

  const handleFullCorrection = () =>
    run(async () => {
      await correctionMutation.mutateAsync({
        id: invoiceId,
        data: {
          reason: correctionReason.trim(),
          // Korekta faktury z pozycją „zw" powtarza podstawę zwolnienia. Bez niej serwer
          // odrzucał korektę ogólnym „Niektóre dane są niepoprawne".
          ...(hasExemptItem && exemption.trim() ? { exemptionLegalBasis: exemption.trim() } : {}),
        },
      });
      setCorrectionMode(null);
      setCorrectionReason('');
      setCorrectionExemption(null);
    });

  const handleEditCorrection = (lines: ReturnType<typeof correctedLinesPayload>) =>
    run(async () => {
      if (!lines) return;
      await correctionMutation.mutateAsync({
        id: invoiceId,
        data: {
          reason: correctionReason.trim(),
          lines,
          ...(hasExemptItem && exemption.trim() ? { exemptionLegalBasis: exemption.trim() } : {}),
        },
      });
      setCorrectionMode(null);
      setCorrectionReason('');
      setEditLines([]);
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
  const hasExemptItem = items.some(item => item.vatRate.trim().toLowerCase() === 'zw');
  // Podstawa z faktury, dopóki ktoś jej nie zmieni w formularzu korekty.
  const exemption = correctionExemption ?? invoice?.exemptionLegalBasis ?? '';
  const editPayload = correctionMode === 'edit' ? correctedLinesPayload(editLines) : null;
  const editKind = correctionMode === 'edit' ? editChange(editLines, items) : 'none';
  // Korekta „przed i po": wiersze stanu przed korektą i po niej mówią o tym w tabeli.
  const beforeAndAfter = items.some(item => item.stateBefore);

  return (
    <>
    {settlementOpen && invoice?.visitId && (
      <SettlementCorrectionModal visitId={invoice.visitId} onClose={() => setSettlementOpen(false)} />
    )}
    <ModalShell isOpen={invoiceId !== null && !settlementOpen} onClose={close} size="full" fillHeight>
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

            {correctionMode === 'edit' && (
              <InvoiceEditCorrection
                lines={editLines}
                onLinesChange={setEditLines}
                reason={correctionReason}
                onReasonChange={setCorrectionReason}
                change={editKind}
              />
            )}

            {correctionMode === 'zero' && (
              <CorrectionBox>
                <strong>Korekta do zera</strong>
                Wystawimy korektę zerującą tę fakturę i wyślemy ją do KSeF. Pierwotny dokument
                zostaje w systemie i w KSeF - korekta go nie usuwa, tylko sprowadza do zera.
                <FieldLabel>Przyczyna korekty *</FieldLabel>
                <InputShell>
                  <BareInput
                    autoFocus
                    value={correctionReason}
                    onChange={(e) => setCorrectionReason(e.target.value)}
                    placeholder="np. Rezygnacja z usługi / błędne dane"
                  />
                </InputShell>
                {hasExemptItem && (
                  <>
                    <FieldLabel>Podstawa prawna zwolnienia z VAT *</FieldLabel>
                    <InputShell>
                      <BareInput
                        value={exemption}
                        onChange={(e) => setCorrectionExemption(e.target.value)}
                        placeholder="np. art. 43 ust. 1 pkt 29 ustawy o VAT"
                      />
                    </InputShell>
                  </>
                )}
              </CorrectionBox>
            )}

            {invoice.excluded && (
              <HiddenBox>
                Faktura jest ukryta w Finansach - nie wchodzi do kafli podsumowania ani do
                raportów. Dokument nadal istnieje w KSeF i pozostaje prawnie wiążący.
              </HiddenBox>
            )}

            {invoice.duplicateStatus === 'SUSPECTED' && (
              <DuplicateBox>
                <strong>⚠ Możliwe podwójne fakturowanie</strong>
                Wygląda na duplikat (ten sam nabywca, kwota i podobna data). Jeśli to duplikat,
                skoryguj go do zera tam, gdzie powstał.
                <DuplicateActions>
                  <SharedButton
                    $variant="danger"
                    $size="sm"
                    disabled={busy}
                    onClick={() => run(() => duplicateMutation.mutateAsync({ id: invoice.id, resolution: 'CONFIRMED_DUPLICATE' }))}
                  >
                    To duplikat, ukryj w Finansach
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
                Tej faktury nie wysłano do KSeF. Wyślij ją przyciskiem na dole albo pobierz XML
                i wgraj sam.
              </OfflineBox>
            )}

            {invoice.ksefStatus === 'QUEUED_RETRY' && (
              <OfflineBox>
                KSeF nie działał przy wystawieniu. Wyślemy fakturę sami, najpóźniej w następny
                dzień roboczy. Możesz też wysłać ją teraz.
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
                  {invoice.excluded && <Badge $tone="slate">Ukryta w Finansach</Badge>}
                  {!invoice.detailsSynced && (
                    <Badge
                      $tone="amber"
                      title="Pozycje, adresy i dane płatności dociągamy z treści faktury w KSeF"
                    >
                      Pobieramy szczegóły
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
                        : 'Pozycje pobierzemy z KSeF wkrótce.'}
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
                            <tr key={`${item.lineNumber}-${item.stateBefore ? 'before' : 'after'}`} style={item.stateBefore ? { color: '#64748b' } : undefined}>
                              <ItemTd><ItemNum>{item.lineNumber}</ItemNum></ItemTd>
                              <ItemTd>
                                {beforeAndAfter && (
                                  <Badge $tone="slate" style={{ marginRight: 6 }}>
                                    {item.stateBefore ? 'przed korektą' : 'po korekcie'}
                                  </Badge>
                                )}
                                {item.name}
                              </ItemTd>
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
                  {paymentTracking && (
                    <div>
                      <Eyebrow>Status płatności</Eyebrow>
                      <MetaValue>
                        <Badge $tone={invoice.paymentStatus === 'PAID' ? 'green' : 'amber'}>
                          {invoice.paymentStatus === 'PAID' ? 'Opłacona' : 'Nieopłacona'}
                        </Badge>
                      </MetaValue>
                    </div>
                  )}
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
                        Zeskanuj, aby sprawdzić fakturę w KSeF. Ten kod jest też na PDF dla klienta.
                      </div>
                      <QrUrl>{invoice.ksefVerificationUrl}</QrUrl>
                    </QrCopy>
                  </QrPanel>
                ) : (
                  <QrPending>
                    Kod QR pojawi się, gdy KSeF przyjmie fakturę.
                  </QrPending>
                )}
              </PaperBody>
            </Paper>
          </>
        )}
      </ModalContent>

      <ModalFooter>
        {invoice && (correctionMode ? (
          /* Tryb korekty przejmuje okno: stopka przestaje być listą tego, co MOŻNA
             zrobić, i staje się dwoma wyjściami z rozpoczętej czynności. „Zamknij"
             znika, żeby nie stało obok „Anuluj" i nie kazało zgadywać, które z nich
             porzuca korektę, a które całe okno - od zamknięcia jest krzyżyk w nagłówku. */
          <>
            <SharedButton $variant="secondary" onClick={() => setCorrectionMode(null)}>
              Anuluj korektę
            </SharedButton>
            <SharedButton
              $variant="primary"
              disabled={
                busy || !correctionReason.trim() || (hasExemptItem && !exemption.trim()) ||
                (correctionMode === 'edit' && (editKind === 'none' || editPayload === null))
              }
              onClick={correctionMode === 'edit' ? () => handleEditCorrection(editPayload) : handleFullCorrection}
            >
              {correctionMutation.isPending ? 'Wysyłanie korekty…' : 'Wystaw korektę i wyślij'}
            </SharedButton>
          </>
        ) : (
          <FooterActions>
            {/* Wizualizacja PDF stoi pierwsza: to ona idzie do nabywcy i to po nią
                się tu wraca. XML i UPO są dla księgowości, nie dla klienta. */}
            <SharedButton
              $variant="secondary" $size="sm"
              onClick={() => run(() => ksefRevenueApi.openInvoicePdf(invoice.id))}
            >
              <FileText size={14} /> Faktura PDF
            </SharedButton>
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
                  ? 'Wysyłanie…'
                  : invoice.ksefStatus === 'NOT_SENT'
                    ? 'Wyślij do KSeF'
                    : 'Ponów wysyłkę do KSeF'}
              </SharedButton>
            )}
            {paymentTracking && (
              <SharedButton
                $variant="secondary" $size="sm" disabled={busy}
                onClick={() => run(() => paymentMutation.mutateAsync({
                  id: invoice.id,
                  paymentStatus: invoice.paymentStatus === 'PAID' ? 'PENDING' : 'PAID',
                }))}
              >
                {invoice.paymentStatus === 'PAID' ? 'Oznacz jako nieopłaconą' : 'Oznacz jako opłaconą'}
              </SharedButton>
            )}
            <SharedButton
              $variant="secondary" $size="sm" disabled={busy}
              title={invoice.excluded
                ? 'Faktura wróci do kafli podsumowania i raportów'
                : 'Faktura zniknie z sum w Finansach, ale zostanie w systemie i w KSeF'}
              onClick={() => run(() =>
                (invoice.excluded ? restoreMutation : excludeMutation)
                  .mutateAsync({ sourceKind: 'KSEF', id: invoice.id }))}
            >
              {invoice.excluded
                ? <><Eye size={14} /> Przywróć w Finansach</>
                : <><EyeOff size={14} /> Ukryj w Finansach</>}
            </SharedButton>
            {/*
              Faktura z wydania pojazdu: korekta wystawiona stąd zmieniała fakturę w KSeF, ale nie
              ceny w wizycie ani dokumentu wizyty - wizyta i Finanse pokazywały potem dwie kwoty
              tej samej sprzedaży. Taką fakturę poprawia się przez rozliczenie wizyty: ono zmienia
              ceny, dokumenty, kasę i fakturę razem (korekta o różnicę albo do zera w KSeF).
            */}
            {invoice.source === 'CRM' && invoice.ksefStatus === 'ACCEPTED' &&
              invoice.invoiceType === 'VAT' && !correctionMode && invoice.visitId && (
              <SharedButton
                $variant="secondary" $size="sm"
                title="Zmień ceny usług wizyty - faktura dostanie korektę w KSeF, a wizyta i dokumenty nowe kwoty"
                onClick={() => setSettlementOpen(true)}
              >
                Popraw rozliczenie wizyty
              </SharedButton>
            )}
            {invoice.source === 'CRM' && invoice.ksefStatus === 'ACCEPTED' && !invoice.visitId &&
              invoice.invoiceType === 'VAT' && !correctionMode && items.length > 0 && (
              <SharedButton
                $variant="secondary" $size="sm"
                title="Popraw nazwę, ilość albo cenę - wystawimy jedną fakturę korygującą"
                onClick={() => { setEditLines(editLinesFromItems(items)); setCorrectionMode('edit'); }}
              >
                Popraw fakturę
              </SharedButton>
            )}
            {invoice.source === 'CRM' && invoice.ksefStatus === 'ACCEPTED' && !invoice.visitId &&
              invoice.invoiceType === 'VAT' && !correctionMode && (
              <SharedButton $variant="secondary" $size="sm" onClick={() => setCorrectionMode('zero')}>
                Wystaw korektę do zera
              </SharedButton>
            )}
            {invoice.source === 'CRM' && invoice.ksefStatus === 'REJECTED' && (
              <SharedButton $variant="danger" $size="sm" disabled={busy} onClick={handleDelete}>
                <Trash2 size={14} /> Usuń odrzuconą fakturę
              </SharedButton>
            )}
          </FooterActions>
        ))}
        {(!correctionMode || !invoice) && (
          <SharedButton $variant="secondary" onClick={close}>Zamknij</SharedButton>
        )}
      </ModalFooter>
    </ModalShell>
    </>
  );
};
