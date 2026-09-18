import React from 'react';
import styled, { keyframes } from 'styled-components';
import { Check, Eye, EyeOff, FileText } from 'lucide-react';
import { useMediaQuery } from '@/common/hooks';
import { useToast } from '@/common/components/Toast';
import type { IncomeDocument, IncomeDocumentType, KsefRevenueStatus } from '../types';
import { useExcludeIncomeDocument, useRestoreIncomeDocument } from '../hooks/useIncomeDocuments';
import { ksefRevenueApi } from '../api/ksefRevenueApi';
import { formatMoney, formatDate } from '../utils/formatters';

// ─── Layout (spójny z pozostałymi tabelami modułu finansowego) ───────────────

const shimmer = keyframes`
  0% { background-position: -200% 0; }
  100% { background-position: 200% 0; }
`;

const fadeIn = keyframes`
  from { opacity: 0; transform: translateY(-4px); }
  to   { opacity: 1; transform: translateY(0); }
`;

const Wrapper = styled.div`
  width: 100%;
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
`;

const Table = styled.table`
  width: 100%;
  min-width: 1060px;
  border-collapse: collapse;
`;

const Thead = styled.thead`
  background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
`;

const Th = styled.th<{ $align?: 'left' | 'right' }>`
  padding: 14px 16px;
  text-align: ${(p) => p.$align || 'left'};
  font-size: 11px;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.5);
  text-transform: uppercase;
  letter-spacing: 0.55px;
  white-space: nowrap;
  &:first-child { padding-left: 20px; }
  &:last-child  { padding-right: 20px; }
`;

const Tr = styled.tr<{ $muted?: boolean }>`
  border-bottom: 1px solid ${(p) => p.theme.colors.border};
  transition: background 0.12s ease;
  animation: ${fadeIn} 0.18s ease-out;
  cursor: pointer;
  opacity: ${(p) => (p.$muted ? 0.55 : 1)};
  &:last-child { border-bottom: none; }
  &:hover { background: ${(p) => p.theme.colors.surfaceHover}; }
`;

const Td = styled.td<{ $align?: 'left' | 'right' }>`
  padding: 13px 16px;
  font-size: 13px;
  color: ${(p) => p.theme.colors.text};
  vertical-align: middle;
  text-align: ${(p) => p.$align || 'left'};
  white-space: nowrap;
  &:first-child { padding-left: 20px; }
  &:last-child  { padding-right: 20px; }
`;

const DocumentNumber = styled.div`
  font-weight: 600;
`;

const KsefNumber = styled.div`
  font-size: 11px;
  color: ${(p) => p.theme.colors.textMuted};
  max-width: 240px;
  overflow: hidden;
  text-overflow: ellipsis;
`;

const PartyName = styled.div`
  max-width: 220px;
  overflow: hidden;
  text-overflow: ellipsis;
`;

const PartyNip = styled.div`
  font-size: 11px;
  color: ${(p) => p.theme.colors.textMuted};
`;

/* Kwota czyta się tak samo jak w tabeli kosztowej: brutto monospace’em, netto pod spodem
   drugim planem. Dwie tabele w jednym module nie mogą pokazywać pieniędzy dwoma krojami. */
const AmountPrimary = styled.span<{ $negative?: boolean }>`
  display: block;
  font-size: 13px;
  font-weight: 600;
  font-family: 'JetBrains Mono', 'SF Mono', 'Fira Code', monospace;
  font-feature-settings: 'tnum';
  white-space: nowrap;
  color: ${(p) => (p.$negative ? '#dc2626' : p.theme.colors.text)};
`;

const AmountSecondary = styled.span`
  display: block;
  margin-top: 3px;
  font-size: 12px;
  font-family: 'JetBrains Mono', 'SF Mono', 'Fira Code', monospace;
  font-feature-settings: 'tnum';
  white-space: nowrap;
  color: ${(p) => p.theme.colors.textMuted};
`;

/* Paleta i kształt wzięte wprost z tabeli kosztów (KsefExpensesTable): ten sam moduł,
   ten sam wiersz tabeli, więc plakietka nie może mieć raz promienia 5 px, a raz kapsułki. */
type BadgeVariant = 'blue' | 'teal' | 'purple' | 'green' | 'amber' | 'red' | 'slate';

const BADGE_COLORS: Record<BadgeVariant, { bg: string; color: string; border: string }> = {
  blue:   { bg: '#eff6ff', color: '#1d4ed8', border: '#bfdbfe' },
  teal:   { bg: '#f0fdf4', color: '#15803d', border: '#bbf7d0' },
  purple: { bg: '#f5f3ff', color: '#6d28d9', border: '#ddd6fe' },
  green:  { bg: '#dcfce7', color: '#166534', border: '#86efac' },
  amber:  { bg: '#fef9c3', color: '#92400e', border: '#fde68a' },
  red:    { bg: '#fee2e2', color: '#991b1b', border: '#fca5a5' },
  slate:  { bg: '#f1f5f9', color: '#475569', border: '#cbd5e1' },
};

const Badge = styled.span<{ $variant: BadgeVariant }>`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 2px 8px;
  border-radius: 5px;
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.05px;
  white-space: nowrap;
  background: ${(p) => BADGE_COLORS[p.$variant].bg};
  color: ${(p) => BADGE_COLORS[p.$variant].color};
  border: 1px solid ${(p) => BADGE_COLORS[p.$variant].border};
`;

/* Typ dokumentu i znacznik KSeF czytają się razem: „co to jest" i „czy jest w rejestrze". */
const TypeCell = styled.div`
  display: flex;         /* blokowy, żeby plakietka alertu pod spodem zaczynała nową linię */
  align-items: center;
  gap: 7px;
`;

/**
 * Ptaszek zamiast kolumny „Status KSeF".
 *
 * Kolumna niesieła siedem różnych etykiet, z których sześć znaczyło to samo: jeszcze nie ma
 * w KSeF. Pytanie, które naprawdę się zadaje, jest dwustanowe — jest w rejestrze czy nie —
 * a szczegół („czeka na wysyłkę", „offline24") to już wyjaśnienie, nie stan. Dlatego stan
 * niesie kolor ptaszka, a wyjaśnienie siedzi w tooltipie.
 */
const KsefCheck = styled.span<{ $on: boolean }>`
  display: inline-flex;
  align-items: center;
  color: ${(p) => (p.$on ? '#16a34a' : '#cbd5e1')};
  cursor: help;
`;

const ActionsCell = styled.div`
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 6px;
`;

/* „pdf" chodzi po tej samej ścieżce co „exclude": w tabeli żadna akcja wiersza nie
   jest wypełniona kolorem — krokiem następnym na tym widoku jest „Wystaw fakturę"
   w nagłówku (CLAUDE.md §2). */
const ActionBtn = styled.button<{ $variant: 'exclude' | 'restore' | 'pdf' }>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 30px;
  height: 30px;
  border-radius: 8px;
  border: 1px solid ${(p) => p.theme.colors.border};
  background: ${(p) => p.theme.colors.surface};
  color: ${(p) => (p.$variant === 'restore' ? '#15803d' : p.theme.colors.textMuted)};
  cursor: pointer;
  transition: background 0.12s ease, color 0.12s ease, border-color 0.12s ease;

  &:hover:not(:disabled) {
    background: ${(p) => (p.$variant === 'restore' ? '#f0fdf4' : '#f8fafc')};
    border-color: ${(p) => (p.$variant === 'restore' ? '#86efac' : '#cbd5e1')};
    color: ${(p) => (p.$variant === 'restore' ? '#166534' : p.theme.colors.text)};
  }

  &:disabled { opacity: 0.5; cursor: not-allowed; }
`;

/* ─── Karta na telefonie ──────────────────────────────────────────────────────
   Dziewięć kolumn nie mieści się na 390 px, a przewijana w bok tabela pokazuje
   datę i typ - czyli to, czego się nie szuka. Na telefonie zostaje to, po co
   otwiera się listę przychodów: kto, ile, czy zapłacone i który to dokument.
   Źródło, numer KSeF i status „wszystko w porządku" zostają na desktopie. */

const CardList = styled.div`
  display: flex;
  flex-direction: column;
`;

const Card = styled.button<{ $muted?: boolean }>`
  display: flex;
  flex-direction: column;
  gap: 7px;
  width: 100%;
  padding: 14px 16px;
  background: ${(p) => p.theme.colors.surface};
  border: none;
  border-bottom: 1px solid ${(p) => p.theme.colors.border};
  font-family: inherit;
  text-align: left;
  cursor: pointer;
  opacity: ${(p) => (p.$muted ? 0.6 : 1)};

  &:last-child { border-bottom: none; }
  &:active { background: ${(p) => p.theme.colors.surfaceHover}; }
`;

const CardTop = styled.div`
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 12px;
`;

const CardParty = styled.span`
  font-size: 14px;
  font-weight: 600;
  color: ${(p) => p.theme.colors.text};
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

const CardAmount = styled.span<{ $negative?: boolean }>`
  font-size: 15px;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
  flex-shrink: 0;
  color: ${(p) => (p.$negative ? '#dc2626' : p.theme.colors.text)};
`;

const CardMeta = styled.div`
  font-size: 12px;
  color: ${(p) => p.theme.colors.textMuted};
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

const CardBadges = styled.div`
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 6px;
`;

const CardBadgeSpacer = styled.div`
  flex: 1;
`;

const CardSkeleton = styled.div`
  padding: 16px;
  border-bottom: 1px solid ${(p) => p.theme.colors.border};

  div {
    height: 14px;
    border-radius: 6px;
    background: linear-gradient(90deg, #f1f5f9 25%, #e2e8f0 50%, #f1f5f9 75%);
    background-size: 200% 100%;
    animation: ${shimmer} 1.4s infinite;

    & + div { margin-top: 8px; }
  }
`;

// ─── Słowniki prezentacji ─────────────────────────────────────────────────────

const DOCUMENT_TYPE: Record<IncomeDocumentType, { label: string; variant: BadgeVariant }> = {
  INVOICE:    { label: 'Faktura', variant: 'blue' },
  CORRECTION: { label: 'Korekta', variant: 'purple' },
  RECEIPT:    { label: 'Paragon', variant: 'teal' },
  OTHER:      { label: 'Inny',    variant: 'slate' },
};

/**
 * Tooltip ptaszka. Zielony znaczy dokładnie jedno: dokument jest w KSeF i ma nadany numer.
 * Każdy inny stan jest szary, a różnice między nimi (czeka, jedzie, odrzucona, świadomie
 * poza systemem) niesie już zdanie po najeżdżeniu — w kolumnie były siedmioma etykietami,
 * z których sześć znaczyło to samo.
 */
const KSEF_MARK: Record<KsefRevenueStatus, { on: boolean; title: string }> = {
  ACCEPTED: {
    on: true,
    title: 'Faktura jest w KSeF — Ministerstwo Finansów potwierdziło przyjęcie i nadało numer KSeF.',
  },
  PENDING: {
    on: false,
    title: 'Jeszcze nie ma jej w KSeF — faktura czeka na wysłanie.',
  },
  SENDING: {
    on: false,
    title: 'Jeszcze nie ma jej w KSeF — trwa wysyłka.',
  },
  SUBMITTED: {
    on: false,
    title: 'Jeszcze nie ma jej w KSeF — została przyjęta do sesji i czeka na nadanie numeru.',
  },
  REJECTED: {
    on: false,
    title: 'Nie ma jej w KSeF — system odrzucił fakturę. Popraw dane i wyślij ponownie.',
  },
  QUEUED_RETRY: {
    on: false,
    title: 'Jeszcze nie ma jej w KSeF — system był niedostępny, faktura zostanie dosłana automatycznie (offline24).',
  },
  NOT_SENT: {
    on: false,
    title: 'Nie ma jej w KSeF — dokument wystawiono świadomie bez wysyłki.',
  },
};

const ORIGIN_LABEL: Record<string, string> = {
  CRM:      'CRM',
  EXTERNAL: 'Zewnętrzny',
  VISIT:    'Wizyta',
  MANUAL:   'Ręcznie',
};

const PAYMENT_STATUS: Record<string, { label: string; variant: BadgeVariant }> = {
  PAID:    { label: 'Opłacony',        variant: 'green' },
  PENDING: { label: 'Oczekuje',        variant: 'amber' },
  OVERDUE: { label: 'Przeterminowany', variant: 'red' },
};

// ─── Skeleton / empty ─────────────────────────────────────────────────────────

const SkeletonRow = styled.tr`
  border-bottom: 1px solid ${(p) => p.theme.colors.border};
  td {
    padding: 13px 16px;
    div {
      height: 14px;
      border-radius: 6px;
      background: linear-gradient(90deg, #f1f5f9 25%, #e2e8f0 50%, #f1f5f9 75%);
      background-size: 200% 100%;
      animation: ${shimmer} 1.4s infinite;
    }
  }
`;

const EmptyState = styled.div`
  padding: 56px 24px;
  text-align: center;
  color: ${(p) => p.theme.colors.textMuted};
  font-size: 13px;

  strong {
    display: block;
    font-size: 15px;
    color: ${(p) => p.theme.colors.textSecondary};
    margin-bottom: 4px;
  }
`;

// ─── Component ────────────────────────────────────────────────────────────────

interface IncomeDocumentsTableProps {
  documents: IncomeDocument[];
  isLoading: boolean;
  onSelect: (document: IncomeDocument) => void;
  /** Aktywna fraza wyszukiwarki - pusty wynik szukania to co innego niż pusta lista. */
  searchTerm?: string;
}

export const IncomeDocumentsTable: React.FC<IncomeDocumentsTableProps> = ({
  documents,
  isLoading,
  onSelect,
  searchTerm,
}) => {
  const excludeMutation = useExcludeIncomeDocument();
  const restoreMutation = useRestoreIncomeDocument();
  const busy = excludeMutation.isPending || restoreMutation.isPending;
  const isMobile = useMediaQuery('(max-width: 639px)');
  const { showError } = useToast();
  const [pdfPendingId, setPdfPendingId] = React.useState<string | null>(null);

  /** Ukrycie to akcja wiersza, nie wejście w szczegóły - klik nie może otwierać modala. */
  const toggleExcluded = (event: React.MouseEvent, doc: IncomeDocument) => {
    event.stopPropagation();
    const mutation = doc.excluded ? restoreMutation : excludeMutation;
    mutation.mutate({ sourceKind: doc.sourceKind, id: doc.id });
  };

  /**
   * Wizualizacja PDF jest tylko dla faktur z ledgera KSeF: to one mają pozycje, strony
   * z adresami i numer KSeF. Dokument kasowy z modułu finansów trzyma same sumy, więc
   * nie da się z niego złożyć faktury spełniającej art. 106e.
   */
  const canPreviewPdf = (doc: IncomeDocument) => doc.sourceKind === 'KSEF';

  const openPdf = async (event: React.MouseEvent, doc: IncomeDocument) => {
    event.stopPropagation();
    setPdfPendingId(doc.id);
    try {
      await ksefRevenueApi.openInvoicePdf(doc.id);
    } catch {
      showError('Nie udało się otworzyć faktury', 'Spróbuj ponownie za chwilę.');
    } finally {
      setPdfPendingId(null);
    }
  };

  if (!isLoading && documents.length === 0) {
    // Szukający wie, że dokumenty istnieją - zachęta „wystaw fakturę" byłaby wtedy
    // odpowiedzią na pytanie, którego nie zadał.
    if (searchTerm) {
      return (
        <EmptyState>
          <strong>Brak wyników dla „{searchTerm}"</strong>
          Szukamy po nazwie i NIP-ie kontrahenta, nazwach pozycji, numerze dokumentu,
          numerze KSeF i kwocie. Sprawdź też zakres dat i pozostałe filtry.
        </EmptyState>
      );
    }

    return (
      <EmptyState>
        <strong>Brak dokumentów przychodowych</strong>
        Wystaw fakturę (trafi do KSeF) lub dodaj paragon. Faktury sprzedażowe wystawione
        poza CRM pojawią się tu automatycznie po synchronizacji z KSeF.
      </EmptyState>
    );
  }

  if (isMobile) {
    return (
      <CardList>
        {isLoading
          ? Array.from({ length: 4 }).map((_, i) => (
              <CardSkeleton key={i}><div style={{ width: '65%' }} /><div style={{ width: '40%' }} /></CardSkeleton>
            ))
          : documents.map((doc) => {
              const type = DOCUMENT_TYPE[doc.documentType] ?? DOCUMENT_TYPE.OTHER;
              const payment = PAYMENT_STATUS[doc.paymentStatus] ?? PAYMENT_STATUS.PENDING;
              // Ptaszek tylko dla dokumentów, które w ogóle idą do KSeF: przy paragonie
              // szary znaczek sugerowałby zaległość, której nie ma.
              const ksefMark = doc.ksefStatus ? KSEF_MARK[doc.ksefStatus] : null;

              return (
                <Card
                  key={`${doc.sourceKind}-${doc.id}`}
                  type="button"
                  $muted={doc.excluded || doc.duplicateStatus === 'CONFIRMED_DUPLICATE' || doc.ksefStatus === 'REJECTED'}
                  onClick={() => onSelect(doc)}
                >
                  <CardTop>
                    <CardParty>{doc.counterpartyName ?? 'Konsument'}</CardParty>
                    <CardAmount $negative={doc.totalGross < 0}>{formatMoney(doc.totalGross)}</CardAmount>
                  </CardTop>

                  <CardMeta>
                    {doc.documentNumber} · {formatDate(doc.issueDate)}
                  </CardMeta>

                  <CardBadges>
                    <TypeCell>
                      <Badge $variant={type.variant}>{type.label}</Badge>
                      {ksefMark && (
                        <KsefCheck $on={ksefMark.on} title={ksefMark.title} aria-label={ksefMark.title}>
                          <Check size={15} strokeWidth={3} />
                        </KsefCheck>
                      )}
                    </TypeCell>
                    <Badge $variant={payment.variant}>{payment.label}</Badge>
                    {doc.ksefStatus === 'REJECTED' && <Badge $variant="red">Odrzucona</Badge>}
                    {doc.duplicateStatus === 'SUSPECTED' && (
                      <Badge $variant="red">⚠ Duplikat?</Badge>
                    )}
                    {doc.excluded && <Badge $variant="slate">Ukryty</Badge>}
                    <CardBadgeSpacer />
                    {canPreviewPdf(doc) && (
                      <ActionBtn
                        type="button"
                        $variant="pdf"
                        disabled={pdfPendingId === doc.id}
                        onClick={(e) => openPdf(e, doc)}
                        title="Faktura PDF"
                        aria-label="Faktura PDF"
                      >
                        <FileText size={15} />
                      </ActionBtn>
                    )}
                    <ActionBtn
                      type="button"
                      $variant={doc.excluded ? 'restore' : 'exclude'}
                      disabled={busy}
                      onClick={(e) => toggleExcluded(e, doc)}
                      title={doc.excluded ? 'Przywróć do statystyk' : 'Ukryj ze statystyk'}
                    >
                      {doc.excluded ? <Eye size={15} /> : <EyeOff size={15} />}
                    </ActionBtn>
                  </CardBadges>
                </Card>
              );
            })}
      </CardList>
    );
  }

  return (
    <Wrapper>
      <Table>
        <Thead>
          <tr>
            <Th>Data</Th>
            <Th>Typ</Th>
            <Th>Numer</Th>
            <Th>Nabywca</Th>
            <Th $align="right">Kwota</Th>
            <Th>Źródło</Th>
            <Th>Płatność</Th>
            <Th $align="right">Akcje</Th>
          </tr>
        </Thead>
        <tbody>
          {isLoading
            ? Array.from({ length: 5 }).map((_, i) => (
                <SkeletonRow key={i}>
                  {Array.from({ length: 8 }).map((_, j) => (
                    <td key={j}><div /></td>
                  ))}
                </SkeletonRow>
              ))
            : documents.map((doc) => {
                const type = DOCUMENT_TYPE[doc.documentType] ?? DOCUMENT_TYPE.OTHER;
                const payment = PAYMENT_STATUS[doc.paymentStatus] ?? PAYMENT_STATUS.PENDING;
                // Ptaszek tylko dla dokumentów, które w ogóle idą do KSeF — paragon nie ma
                // czego „jeszcze nie mieć" i szary znaczek mówiłby o zaległości, której nie ma.
                const ksefMark = doc.ksefStatus ? KSEF_MARK[doc.ksefStatus] : null;

                return (
                  <Tr
                    key={`${doc.sourceKind}-${doc.id}`}
                    $muted={
                      doc.excluded ||
                      doc.duplicateStatus === 'CONFIRMED_DUPLICATE' ||
                      doc.ksefStatus === 'REJECTED'
                    }
                    onClick={() => onSelect(doc)}
                  >
                    <Td>{formatDate(doc.issueDate)}</Td>
                    <Td>
                      <TypeCell>
                        <Badge $variant={type.variant}>{type.label}</Badge>
                        {ksefMark && (
                          <KsefCheck $on={ksefMark.on} title={ksefMark.title} aria-label={ksefMark.title}>
                            <Check size={15} strokeWidth={3} />
                          </KsefCheck>
                        )}
                      </TypeCell>
                      {/* Stany wymagające reakcji zostają nazwane wprost: szary ptaszek mówi
                          tylko „nie ma w KSeF", a odrzucenie i duplikat to praca do zrobienia. */}
                      {doc.ksefStatus === 'REJECTED' && (
                        <Badge $variant="red" style={{ marginTop: 4 }}>Odrzucona</Badge>
                      )}
                      {doc.duplicateStatus === 'SUSPECTED' && (
                        <Badge
                          $variant="red"
                          style={{ marginTop: 4 }}
                          title="Możliwe podwójne fakturowanie: kliknij, aby rozstrzygnąć"
                        >
                          ⚠ Duplikat?
                        </Badge>
                      )}
                    </Td>
                    <Td>
                      <DocumentNumber>{doc.documentNumber}</DocumentNumber>
                      {doc.ksefNumber && <KsefNumber title={doc.ksefNumber}>{doc.ksefNumber}</KsefNumber>}
                      {doc.excluded && (
                        <Badge
                          $variant="slate"
                          title="Dokument nie wchodzi do statystyk ani do kafli podsumowania"
                          style={{ marginTop: 4 }}
                        >
                          Ukryty ze statystyk
                        </Badge>
                      )}
                    </Td>
                    <Td>
                      <PartyName>{doc.counterpartyName ?? '-'}</PartyName>
                      <PartyNip>{doc.counterpartyNip ? `NIP ${doc.counterpartyNip}` : 'Konsument'}</PartyNip>
                    </Td>
                    <Td $align="right">
                      <AmountPrimary $negative={doc.totalGross < 0}>
                        {formatMoney(doc.totalGross)}
                      </AmountPrimary>
                      <AmountSecondary>{formatMoney(doc.totalNet)} netto</AmountSecondary>
                    </Td>
                    <Td>
                      <Badge $variant="slate">{ORIGIN_LABEL[doc.origin ?? ''] ?? '-'}</Badge>
                    </Td>
                    <Td>
                      <Badge $variant={payment.variant}>{payment.label}</Badge>
                      {doc.paymentLabel && <PartyNip>{doc.paymentLabel}</PartyNip>}
                    </Td>
                    <Td $align="right">
                      <ActionsCell>
                        {canPreviewPdf(doc) && (
                          <ActionBtn
                            type="button"
                            $variant="pdf"
                            disabled={pdfPendingId === doc.id}
                            onClick={(e) => openPdf(e, doc)}
                            title="Faktura PDF"
                            aria-label="Faktura PDF"
                          >
                            <FileText size={15} />
                          </ActionBtn>
                        )}
                        <ActionBtn
                          type="button"
                          $variant={doc.excluded ? 'restore' : 'exclude'}
                          disabled={busy}
                          onClick={(e) => toggleExcluded(e, doc)}
                          title={doc.excluded ? 'Przywróć do statystyk' : 'Ukryj ze statystyk'}
                        >
                          {doc.excluded ? <Eye size={15} /> : <EyeOff size={15} />}
                        </ActionBtn>
                      </ActionsCell>
                    </Td>
                  </Tr>
                );
              })}
        </tbody>
      </Table>
    </Wrapper>
  );
};
