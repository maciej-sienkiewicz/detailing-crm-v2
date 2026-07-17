import React from 'react';
import styled, { keyframes } from 'styled-components';
import type { KsefExpenseDetail, KsefExpenseParty } from '../types';
import { useKsefExpenseDetail } from '../hooks/useKsef';
import { formatMoneyFloat, formatMoneyFloatCompact, formatDate } from '../utils/formatters';
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

// ─── Animations ──────────────────────────────────────────────────────────────

const shimmer = keyframes`
  0% { background-position: -200% 0; }
  100% { background-position: 200% 0; }
`;

// ─── Document layout ─────────────────────────────────────────────────────────

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
`;

// ─── Parties ─────────────────────────────────────────────────────────────────

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

// ─── Items table ─────────────────────────────────────────────────────────────

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

// ─── Totals ──────────────────────────────────────────────────────────────────

const TotalsRow = styled.div`
  margin-top: 16px;
  display: flex;
  justify-content: flex-end;
`;

const TotalsBox = styled.div`
  min-width: 260px;
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

// ─── Payment & note ──────────────────────────────────────────────────────────

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

// ─── Badges ──────────────────────────────────────────────────────────────────

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

// ─── Skeleton / error ────────────────────────────────────────────────────────

const Skeleton = styled.div<{ $w?: string; $h?: string }>`
  height: ${(p) => p.$h || '14px'};
  width: ${(p) => p.$w || '100%'};
  background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
  background-size: 200% 100%;
  animation: ${shimmer} 1.5s infinite;
  border-radius: 6px;
`;

const ErrorState = styled.div`
  padding: 48px 24px;
  text-align: center;

  h4 {
    margin: 0 0 6px;
    font-size: 15px;
    font-weight: 600;
    color: ${(p) => p.theme.colors.text};
  }

  p {
    margin: 0;
    font-size: 13px;
    color: ${(p) => p.theme.colors.textMuted};
  }
`;

// ─── Formatters ──────────────────────────────────────────────────────────────

/** "23" → "23%", "zw" → "zw." — stawki nieliczbowe wg schematu FA(2). */
const formatVatRate = (rate: string | null): string => {
  if (!rate) return '—';
  return /^\d+([.,]\d+)?$/.test(rate) ? `${rate}%` : `${rate}.`;
};

/** Ilość bez zbędnych zer: 2 → "2", 1.5 → "1,5". */
const formatQuantity = (quantity: number | null): string => {
  if (quantity == null) return '—';
  return new Intl.NumberFormat('pl-PL', { maximumFractionDigits: 4 }).format(quantity);
};

/** 26-cyfrowy NRB w grupach: XX XXXX XXXX XXXX XXXX XXXX XXXX. */
const formatBankAccount = (account: string): string => {
  const digits = account.replace(/\s/g, '');
  if (!/^\d{26}$/.test(digits)) return account;
  return `${digits.slice(0, 2)} ${digits.slice(2).replace(/(\d{4})(?=\d)/g, '$1 ')}`;
};

const partyAddress = (party: KsefExpenseParty): string[] => {
  const lines = [party.addressLine1, party.addressLine2].filter(Boolean) as string[];
  if (party.countryCode && party.countryCode !== 'PL') lines.push(party.countryCode);
  return lines;
};

const docTypeLabel = (detail: KsefExpenseDetail): string => {
  if (detail.isCorrection) return 'Faktura korygująca';
  return detail.source === 'KSEF' ? 'Faktura' : 'Dokument kosztowy';
};

const statusBadge = (detail: KsefExpenseDetail): { tone: 'green' | 'amber' | 'red' | 'slate'; label: string } | null => {
  switch (detail.status) {
    case 'CORRECTED': return { tone: 'slate', label: 'Skorygowana' };
    case 'CANCELLED': return { tone: 'red',   label: 'Anulowana' };
    case 'EXCLUDED':  return { tone: 'slate', label: 'Ukryta ze statystyk' };
    default:          return null;
  }
};

// ─── Component ───────────────────────────────────────────────────────────────

interface Props {
  /** ID dokumentu do podglądu; null zamyka modal. */
  expenseId: string | null;
  onClose:   () => void;
}

export const InvoicePreviewModal: React.FC<Props> = ({ expenseId, onClose }) => {
  const { detail, isLoading, isError } = useKsefExpenseDetail(expenseId);

  /** Wartość brutto pozycji: z API jeśli dostarczona, w przeciwnym razie wyliczona z netto × (1 + VAT%). */
  const resolveGross = (item: { grossValue: number | null; netValue: number | null; vatRate: string | null }): number | null => {
    if (item.grossValue != null) return item.grossValue;
    if (item.netValue == null) return null;
    const rate = parseFloat(item.vatRate ?? '');
    if (isNaN(rate)) return null;
    return item.netValue * (1 + rate / 100);
  };

  return (
    <ModalShell isOpen={expenseId !== null} onClose={onClose} size="xl">
      <ModalHeader>
        <ModalTitleGroup>
          <ModalTitle>Podgląd faktury</ModalTitle>
          {detail?.documentNumber && <ModalSubtitle>{detail.documentNumber}</ModalSubtitle>}
        </ModalTitleGroup>
        <CloseBtn onClick={onClose} />
      </ModalHeader>

      <ModalContent style={{ paddingTop: '8px' }}>
        {isError ? (
          <ErrorState>
            <h4>Nie udało się załadować faktury</h4>
            <p>Sprawdź połączenie i spróbuj ponownie.</p>
          </ErrorState>
        ) : isLoading || !detail ? (
          <Paper>
            <PaperHead>
              <div style={{ flex: 1 }}>
                <Skeleton $w="90px" $h="11px" />
                <div style={{ marginTop: 8 }}>
                  <Skeleton $w="220px" $h="22px" />
                </div>
              </div>
              <Skeleton $w="120px" $h="34px" />
            </PaperHead>
            <PaperBody>
              <PartiesGrid>
                <Skeleton $h="110px" />
                <Skeleton $h="110px" />
              </PartiesGrid>
              <div style={{ marginTop: 24 }}>
                <Skeleton $h="140px" />
              </div>
            </PaperBody>
          </Paper>
        ) : (
          <Paper>
            <PaperHead>
              <div>
                <DocType>{docTypeLabel(detail)}</DocType>
                <DocNumber>{detail.documentNumber ?? '—'}</DocNumber>
                {detail.ksefNumber && <DocKsefRef>KSeF: {detail.ksefNumber}</DocKsefRef>}
                {detail.isCorrection && detail.originalKsefNumber && (
                  <DocKsefRef>Korekta do: {detail.originalKsefNumber}</DocKsefRef>
                )}
              </div>
              <HeadDates>
                <div>
                  <HeadDateLabel>Data wystawienia</HeadDateLabel>
                  <HeadDateValue>{formatDate(detail.issueDate)}</HeadDateValue>
                </div>
                <div>
                  <HeadDateLabel>Data sprzedaży</HeadDateLabel>
                  <HeadDateValue>{formatDate(detail.saleDate)}</HeadDateValue>
                </div>
              </HeadDates>
            </PaperHead>

            <PaperBody>
              {statusBadge(detail) && (
                <div style={{ marginBottom: 16 }}>
                  <Badge $tone={statusBadge(detail)!.tone}>{statusBadge(detail)!.label}</Badge>
                </div>
              )}

              {/* Strony */}
              <PartiesGrid>
                <PartyCard>
                  <Eyebrow>Sprzedawca</Eyebrow>
                  <PartyName>{detail.seller.name ?? '—'}</PartyName>
                  {detail.seller.nip && <PartyLine>NIP: {detail.seller.nip}</PartyLine>}
                  {partyAddress(detail.seller).map((line) => (
                    <PartyLine key={line}>{line}</PartyLine>
                  ))}
                </PartyCard>
                <PartyCard>
                  <Eyebrow>Nabywca</Eyebrow>
                  <PartyName>{detail.buyer.name ?? '—'}</PartyName>
                  {detail.buyer.nip && <PartyLine>NIP: {detail.buyer.nip}</PartyLine>}
                  {partyAddress(detail.buyer).map((line) => (
                    <PartyLine key={line}>{line}</PartyLine>
                  ))}
                </PartyCard>
              </PartiesGrid>

              {/* Pozycje */}
              <ItemsSection>
                <Eyebrow>Pozycje faktury</Eyebrow>
                {detail.items.length === 0 ? (
                  <ItemsEmpty>
                    Brak pozycji dla tego dokumentu.
                    {detail.source === 'KSEF' &&
                      ' Pozycje zostaną uzupełnione przy najbliższej synchronizacji obejmującej datę tej faktury.'}
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
                        {detail.items.map((item) => (
                          <tr key={item.lineNumber}>
                            <ItemTd><ItemNum>{item.lineNumber}</ItemNum></ItemTd>
                            <ItemTd>{item.name ?? '—'}</ItemTd>
                            <ItemTd $align="right"><Mono>{formatQuantity(item.quantity)}</Mono></ItemTd>
                            <ItemTd>{item.unit ?? '—'}</ItemTd>
                            <ItemTd $align="right"><Mono>{formatMoneyFloatCompact(item.unitPriceNet)}</Mono></ItemTd>
                            <ItemTd $align="right"><Mono>{formatVatRate(item.vatRate)}</Mono></ItemTd>
                            <ItemTd $align="right"><Mono>{formatMoneyFloatCompact(item.netValue)}</Mono></ItemTd>
                            <ItemTd $align="right"><Mono>{formatMoneyFloatCompact(resolveGross(item))}</Mono></ItemTd>
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
                    <span>{formatMoneyFloat(detail.netAmount, detail.currency)}</span>
                  </TotalsLine>
                  <TotalsLine>
                    <span>VAT</span>
                    <span>{formatMoneyFloat(detail.vatAmount, detail.currency)}</span>
                  </TotalsLine>
                  <TotalsLine $emphasis>
                    <span>Do zapłaty</span>
                    <span>{formatMoneyFloat(detail.grossAmount, detail.currency)}</span>
                  </TotalsLine>
                </TotalsBox>
              </TotalsRow>

              {/* Płatność */}
              <MetaGrid>
                <div>
                  <Eyebrow>Forma płatności</Eyebrow>
                  <MetaValue>{detail.payment.methodLabel ?? '—'}</MetaValue>
                </div>
                <div>
                  <Eyebrow>Status płatności</Eyebrow>
                  <MetaValue>
                    <Badge $tone={detail.payment.status === 'PAID' ? 'green' : 'amber'}>
                      {detail.payment.status === 'PAID' ? 'Opłacona' : 'Oczekuje na płatność'}
                    </Badge>
                  </MetaValue>
                </div>
                <div>
                  <Eyebrow>Termin płatności</Eyebrow>
                  <MetaValue>{formatDate(detail.payment.dueDate)}</MetaValue>
                </div>
                {detail.payment.bankAccount && (
                  <div>
                    <Eyebrow>Rachunek bankowy</Eyebrow>
                    <MetaValue><Mono>{formatBankAccount(detail.payment.bankAccount)}</Mono></MetaValue>
                  </div>
                )}
              </MetaGrid>

              {detail.note && <NoteBox>{detail.note}</NoteBox>}
            </PaperBody>
          </Paper>
        )}
      </ModalContent>

      <ModalFooter>
        <SharedButton $variant="secondary" type="button" onClick={onClose}>Zamknij</SharedButton>
      </ModalFooter>
    </ModalShell>
  );
};
