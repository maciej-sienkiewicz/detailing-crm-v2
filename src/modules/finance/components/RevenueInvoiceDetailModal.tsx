import React, { useState } from 'react';
import styled from 'styled-components';
import { Download, FileCheck2, RefreshCw, Trash2 } from 'lucide-react';
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
import { formatMoney, formatDate } from '../utils/formatters';
import { RevenueStatusBadge } from './RevenueStatusBadge';

// ─── Styles ───────────────────────────────────────────────────────────────────

const MetaGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px 24px;

  @media (max-width: 639px) {
    grid-template-columns: 1fr;
  }
`;

const MetaItem = styled.div`
  font-size: 13px;

  span {
    display: block;
    font-size: 11px;
    font-weight: 600;
    color: ${(p) => p.theme.colors.textMuted};
    text-transform: uppercase;
    letter-spacing: 0.04em;
    margin-bottom: 2px;
  }
`;

const ItemsTable = styled.table`
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;

  th {
    text-align: left;
    font-size: 11px;
    font-weight: 600;
    color: ${(p) => p.theme.colors.textMuted};
    text-transform: uppercase;
    letter-spacing: 0.04em;
    padding: 6px 8px;
    border-bottom: 1px solid ${(p) => p.theme.colors.border};
  }
  td {
    padding: 8px;
    border-bottom: 1px solid ${(p) => p.theme.colors.border};
    vertical-align: top;
  }
  td.num { text-align: right; font-variant-numeric: tabular-nums; white-space: nowrap; }
  tr:last-child td { border-bottom: none; }
`;

const DuplicateBox = styled.div`
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
  padding: 12px 14px;
  background: #fef2f2;
  border: 1px solid #fecaca;
  border-radius: 10px;
  font-size: 12px;
  color: #b91c1c;
  word-break: break-word;
`;

const OfflineBox = styled.div`
  padding: 12px 14px;
  background: #fffbeb;
  border: 1px solid #fde68a;
  border-radius: 10px;
  font-size: 12px;
  color: #92400e;
  line-height: 1.5;
`;

const ActionsRow = styled.div`
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
`;

// ─── Component ────────────────────────────────────────────────────────────────

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
    duplicateMutation.isPending || correctionMutation.isPending || paymentMutation.isPending;

  return (
    <ModalShell isOpen={invoiceId !== null} onClose={close} size="lg">
      <ModalHeader>
        <ModalTitleGroup>
          <ModalTitle>{invoice?.invoiceNumber ?? 'Faktura'}</ModalTitle>
          <ModalSubtitle>
            {invoice?.invoiceType === 'KOR' ? 'Faktura korygująca' : 'Faktura przychodowa'}
            {invoice?.source === 'EXTERNAL' && ' · wystawiona poza CRM (pobrana z KSeF)'}
          </ModalSubtitle>
        </ModalTitleGroup>
        <CloseBtn onClick={close} />
      </ModalHeader>

      <ModalContent>
        {!invoice ? null : (
          <>
            {actionError && <FormAlertBanner>{actionError}</FormAlertBanner>}

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

            <MetaGrid>
              <MetaItem><span>Status KSeF</span><RevenueStatusBadge status={invoice.ksefStatus} /></MetaItem>
              <MetaItem><span>Numer KSeF</span>{invoice.ksefNumber ?? '-'}</MetaItem>
              <MetaItem><span>Data wystawienia</span>{formatDate(invoice.issueDate)}</MetaItem>
              <MetaItem><span>Data sprzedaży</span>{invoice.saleDate ? formatDate(invoice.saleDate) : '-'}</MetaItem>
              <MetaItem>
                <span>Sprzedawca</span>
                {invoice.seller.name ?? '-'}{invoice.seller.nip && <> · NIP {invoice.seller.nip}</>}
              </MetaItem>
              <MetaItem>
                <span>Nabywca</span>
                {invoice.buyer.name ?? '-'}{invoice.buyer.nip ? <> · NIP {invoice.buyer.nip}</> : ' · konsument'}
              </MetaItem>
              <MetaItem>
                <span>Płatność</span>
                {invoice.paymentFormLabel ?? invoice.paymentForm ?? '-'}
                {' · '}
                {invoice.paymentStatus === 'PAID' ? 'opłacona' : 'oczekuje'}
                {invoice.paymentDueDate && <> · termin {formatDate(invoice.paymentDueDate)}</>}
              </MetaItem>
              <MetaItem>
                <span>Kwoty</span>
                netto {formatMoney(invoice.totalNet)} · VAT {formatMoney(invoice.totalVat)} ·{' '}
                <strong>brutto {formatMoney(invoice.totalGross)}</strong>
              </MetaItem>
              {invoice.invoiceType === 'KOR' && (
                <>
                  <MetaItem><span>Korekta do</span>{invoice.originalKsefNumber ?? '-'}</MetaItem>
                  <MetaItem><span>Przyczyna korekty</span>{invoice.correctionReason ?? '-'}</MetaItem>
                </>
              )}
            </MetaGrid>

            {invoice.items && invoice.items.length > 0 && (
              <>
                <ModalSectionTitle>Pozycje</ModalSectionTitle>
                <ItemsTable>
                  <thead>
                    <tr>
                      <th>Nazwa</th>
                      <th style={{ textAlign: 'right' }}>Ilość</th>
                      <th style={{ textAlign: 'right' }}>Cena netto</th>
                      <th style={{ textAlign: 'right' }}>VAT</th>
                      <th style={{ textAlign: 'right' }}>Brutto</th>
                    </tr>
                  </thead>
                  <tbody>
                    {invoice.items.map((item) => (
                      <tr key={item.lineNumber}>
                        <td>{item.name}</td>
                        <td className="num">{item.quantity} {item.unit ?? ''}</td>
                        <td className="num">{formatMoney(item.unitPriceNet)} ({item.vatRate === 'zw' ? 'zw.' : `${item.vatRate}%`})</td>
                        <td className="num">{formatMoney(item.vatValue)}</td>
                        <td className="num">{formatMoney(item.grossValue)}</td>
                      </tr>
                    ))}
                  </tbody>
                </ItemsTable>
              </>
            )}

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
                ['PENDING', 'QUEUED_RETRY', 'SUBMITTED'].includes(invoice.ksefStatus) && (
                <SharedButton
                  $variant="secondary" $size="sm" disabled={busy}
                  onClick={() => run(() => retryMutation.mutateAsync(invoice.id))}
                >
                  <RefreshCw size={14} />
                  {retryMutation.isPending ? 'Wysyłanie...' : 'Ponów wysyłkę do KSeF'}
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
