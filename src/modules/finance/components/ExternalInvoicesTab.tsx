// src/modules/finance/components/ExternalInvoicesTab.tsx
//
// Finanse → „Do zafakturowania” (tryb „Faktury wystawia księgowość”).
//
// Sprzedaże, do których fakturę wystawia księgowość, a nie CRM. Lista jest listą rzeczy do
// zrobienia dla księgowości: nabywca, kwota, data sprzedaży i forma płatności - wszystko,
// czego trzeba do wystawienia faktury. Po wystawieniu człowiek odhacza „Faktura wystawiona”
// (numer opcjonalny). Nic nie łączy się samo z fakturą pobraną z KSeF: biznes odrzucił
// automatyczne parowanie, bo przy tej samej kwocie w tym samym tygodniu łatwo połączyć
// nie te dokumenty.
//
// Przychód tych sprzedaży w kaflach Finansów niesie faktura księgowości z KSeF, dlatego
// kwoty tutaj nie wchodzą do żadnej sumy - to tylko zadania.

import { useState } from 'react';
import styled from 'styled-components';
import { Check, Copy, Undo2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button, IconButton, Notice, Segmented, StatusPill, ui, type PillTone } from '@/common/components/ui';
import { useToast } from '@/common/components/Toast';
import { formatCurrency, formatDate } from '@/common/utils';
import {
  useExternalInvoices,
  useExternalInvoicesPendingCount,
  useMarkExternalInvoiceIssued,
  useUnmarkExternalInvoiceIssued,
} from '../hooks/useExternalInvoices';
import type { ExternalInvoice, ExternalInvoiceFilter } from '../types';

const PAGE_SIZE = 20;

const Wrap = styled.div`
  display: flex;
  flex-direction: column;
  gap: 14px;
  padding: 16px;

  @media (max-width: 639px) {
    padding: 12px;
  }
`;

const Toolbar = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
`;

const Lead = styled.p`
  margin: 0;
  font-size: 13px;
  line-height: 1.5;
  color: ${ui.textSecondary};
  max-width: 70ch;
`;

const List = styled.ul`
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
`;

const Row = styled.li`
  display: grid;
  grid-template-columns: minmax(0, 1.6fr) minmax(0, 1fr) minmax(0, 1fr) auto;
  gap: 8px 18px;
  align-items: start;
  padding: 14px 4px;
  border-top: 1px solid ${ui.lineSoft};

  &:first-child { border-top: none; }

  @media (max-width: 900px) {
    grid-template-columns: minmax(0, 1fr) auto;
  }

  @media (max-width: 639px) {
    grid-template-columns: minmax(0, 1fr);
  }
`;

const Cell = styled.div`
  display: flex;
  flex-direction: column;
  gap: 3px;
  min-width: 0;
`;

const Title = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  font-weight: 600;
  color: ${ui.ink};
  overflow-wrap: anywhere;
`;

const Meta = styled.div`
  display: flex;
  flex-wrap: wrap;
  column-gap: 12px;
  row-gap: 2px;
  font-size: 12.5px;
  color: ${ui.textMuted};
  overflow-wrap: anywhere;

  a { color: ${ui.brandInk}; text-decoration: none; }
  a:hover { text-decoration: underline; }
`;

const Amount = styled.div<{ $negative: boolean }>`
  font-size: 15px;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  color: ${p => (p.$negative ? ui.dangerInk : ui.ink)};
`;

const Actions = styled.div`
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 6px;

  @media (max-width: 900px) {
    grid-column: 1 / -1;
    flex-direction: row;
    flex-wrap: wrap;
    align-items: center;
    justify-content: flex-start;
  }
`;

const ActionLine = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
`;

const NumberForm = styled.form`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
`;

const NumberInput = styled.input`
  height: 34px;
  min-width: 0;
  width: 190px;
  padding: 0 10px;
  font: inherit;
  font-size: 13px;
  border: 1px solid ${ui.line};
  border-radius: 8px;
  color: ${ui.ink};

  &:focus { outline: 2px solid ${ui.focusRing}; outline-offset: 0; border-color: transparent; }
`;

const Pager = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  font-size: 12.5px;
  color: ${ui.textMuted};
`;

const Empty = styled.div`
  padding: 28px 8px;
  text-align: center;
  font-size: 13px;
  color: ${ui.textMuted};
`;

const pln = (grosz: number) => formatCurrency(grosz / 100, 'PLN');

const PAYMENT_TONE: Record<string, PillTone> = { PAID: 'ok', PENDING: 'neutral', OVERDUE: 'danger' };

/** Dane do przepisania na fakturę - w kolejności, w jakiej wpisuje się je w programie księgowym. */
const invoiceBrief = (item: ExternalInvoice): string =>
  [
    item.kind === 'CORRECTION'
      ? `Korekta faktury${item.correctsInvoiceNumber ? ` ${item.correctsInvoiceNumber}` : ''}`
      : item.kindLabel,
    item.buyerName && `Nabywca: ${item.buyerName}`,
    item.buyerNip && `NIP: ${item.buyerNip}`,
    item.buyerAddressLine1 && `Adres: ${[item.buyerAddressLine1, item.buyerAddressLine2].filter(Boolean).join(', ')}`,
    item.buyerEmail && `E-mail: ${item.buyerEmail}`,
    `Kwota brutto: ${pln(item.totalGross)}, netto: ${pln(item.totalNet)}, VAT: ${pln(item.totalVat)}`,
    item.kind !== 'CORRECTION' && item.saleDate && `Data sprzedaży: ${formatDate(item.saleDate)}`,
    item.kind !== 'CORRECTION' && item.paymentMethodLabel && `Płatność: ${item.paymentMethodLabel}`,
    item.kind !== 'CORRECTION' && item.dueDate && item.paymentStatus !== 'PAID' && `Termin płatności: ${formatDate(item.dueDate)}`,
    item.visitNumber && `Wizyta ${item.visitNumber}`,
  ]
    .filter(Boolean)
    .join('\n');

const ExternalInvoiceRow = ({ item }: { item: ExternalInvoice }) => {
  const [isMarking, setMarking] = useState(false);
  const [number, setNumber] = useState('');
  const mark = useMarkExternalInvoiceIssued();
  const unmark = useUnmarkExternalInvoiceIssued();
  const { showSuccess, showError } = useToast();

  const title =
    item.kind === 'CORRECTION'
      ? `Korekta faktury${item.correctsInvoiceNumber ? ` ${item.correctsInvoiceNumber}` : ''}`
      : item.kindLabel;

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    mark.mutate(
      { id: item.id, invoiceNumber: number.trim() || null },
      {
        onSuccess: () => {
          setMarking(false);
          showSuccess('Oznaczono jako wystawioną', 'Sprzedaż przeszła do zakładki „Wystawione”.');
        },
        onError: () => showError('Nie udało się oznaczyć faktury'),
      },
    );
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(invoiceBrief(item));
      showSuccess('Skopiowano dane do faktury');
    } catch {
      showError('Nie udało się skopiować danych');
    }
  };

  return (
    <Row>
      <Cell>
        <Title>
          <span>{item.buyerName || 'Nabywca nieokreślony'}</span>
          <StatusPill $tone={item.kind === 'CORRECTION' ? 'warn' : 'info'} $size="sm">{title}</StatusPill>
        </Title>
        <Meta>
          {item.buyerNip ? <span>NIP {item.buyerNip}</span> : <span>Faktura dla konsumenta</span>}
          {item.buyerAddressLine1 && (
            <span>{[item.buyerAddressLine1, item.buyerAddressLine2].filter(Boolean).join(', ')}</span>
          )}
        </Meta>
        <Meta>
          {item.visitId && !item.visitDeleted && (
            <Link to={`/visits/${item.visitId}`}>Wizyta {item.visitNumber ?? ''}</Link>
          )}
          {/* Link do usuniętej wizyty prowadziłby donikąd - mówimy, co się stało. */}
          {item.visitDeleted && (
            <StatusPill $tone="warn" $size="sm">Wizyta {item.visitNumber ?? ''} usunięta</StatusPill>
          )}
          {item.vehicleLabel && <span>{item.vehicleLabel}</span>}
          {item.licensePlate && <span>{item.licensePlate}</span>}
        </Meta>
      </Cell>

      <Cell>
        <Amount $negative={item.totalGross < 0}>{pln(item.totalGross)}</Amount>
        <Meta>
          <span>netto {pln(item.totalNet)}, VAT {pln(item.totalVat)}</span>
        </Meta>
        {item.saleDate && (
          <Meta>
            {/* Przy korekcie to dzień poprawki rozliczenia, a nie data sprzedaży. */}
            <span>{item.kind === 'CORRECTION' ? 'Zgłoszona' : 'Sprzedaż'} {formatDate(item.saleDate)}</span>
          </Meta>
        )}
      </Cell>

      {/* Status płatności korekty to status storna w CRM - nic nie mówi księgowości,
          a „Opłacony" przy kwocie ujemnej wprowadzałby w błąd. */}
      {item.kind === 'CORRECTION' ? <Cell /> : (
      <Cell>
        <Meta>
          {item.paymentMethodLabel && <span>{item.paymentMethodLabel}</span>}
          {item.paymentStatusLabel && item.paymentStatus && (
            <StatusPill $tone={PAYMENT_TONE[item.paymentStatus] ?? 'neutral'} $size="sm">
              {item.paymentStatusLabel}
            </StatusPill>
          )}
        </Meta>
        {item.dueDate && item.paymentStatus !== 'PAID' && (
          <Meta>
            <span>Termin {formatDate(item.dueDate)}</span>
          </Meta>
        )}
      </Cell>
      )}

      <Actions>
        {item.status === 'ISSUED' ? (
          <>
            <StatusPill $tone="ok" $size="sm">
              Wystawiona{item.externalInvoiceNumber ? ` ${item.externalInvoiceNumber}` : ''}
            </StatusPill>
            {item.issuedAt && (
              <Meta>
                <span>
                  {item.issuedByName ? `${item.issuedByName}, ` : ''}
                  {formatDate(item.issuedAt)}
                </span>
              </Meta>
            )}
            <Button
              size="sm"
              variant="ghost"
              disabled={unmark.isPending}
              onClick={() =>
                unmark.mutate(item.id, {
                  onError: () => showError('Nie udało się cofnąć oznaczenia'),
                })
              }
            >
              <Undo2 size={14} /> Cofnij
            </Button>
          </>
        ) : isMarking ? (
          <NumberForm onSubmit={submit}>
            <NumberInput
              autoFocus
              value={number}
              maxLength={100}
              onChange={e => setNumber(e.target.value)}
              placeholder="Numer faktury (opcjonalnie)"
              aria-label="Numer faktury księgowości (opcjonalnie)"
            />
            <Button size="sm" variant="tintedSuccess" type="submit" disabled={mark.isPending}>
              <Check size={14} /> Zapisz
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setMarking(false)}>
              Anuluj
            </Button>
          </NumberForm>
        ) : (
          <ActionLine>
            <IconButton label="Kopiuj dane do faktury" size="sm" onClick={copy}>
              <Copy />
            </IconButton>
            <Button size="sm" variant="tintedSuccess" onClick={() => setMarking(true)}>
              <Check size={14} /> Faktura wystawiona
            </Button>
          </ActionLine>
        )}
      </Actions>
    </Row>
  );
};

export const ExternalInvoicesTab = () => {
  const [filter, setFilter] = useState<ExternalInvoiceFilter>('PENDING');
  const [page, setPage] = useState(1);
  const { data, isLoading, isError } = useExternalInvoices(filter, page, PAGE_SIZE);
  const { data: pendingCount } = useExternalInvoicesPendingCount();

  const total = data?.total ?? 0;
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <Wrap>
      <Toolbar>
        <Segmented<ExternalInvoiceFilter>
          label="Które sprzedaże pokazać"
          value={filter}
          onChange={value => {
            setFilter(value);
            setPage(1);
          }}
          options={[
            { value: 'PENDING', label: 'Do wystawienia', count: pendingCount ?? null },
            { value: 'ISSUED', label: 'Wystawione' },
            { value: 'ALL', label: 'Wszystkie' },
          ]}
        />
      </Toolbar>
      <Lead>
        Faktury do tych sprzedaży wystawia księgowość. Gdy faktura jest wystawiona, odhacz ją tutaj.
        CRM nie łączy niczego sam, a przychód w podsumowaniu finansów pokazuje faktura księgowości
        pobrana z KSeF.
      </Lead>

      {isError && <Notice tone="danger">Nie udało się wczytać listy. Odśwież stronę, żeby spróbować ponownie.</Notice>}

      {isLoading ? (
        <Empty>Wczytujemy listę…</Empty>
      ) : !data || data.items.length === 0 ? (
        <Empty>
          {filter === 'PENDING'
            ? 'Nic nie czeka na fakturę księgowości.'
            : filter === 'ISSUED'
              ? 'Żadna sprzedaż nie jest jeszcze oznaczona jako zafakturowana.'
              : 'Brak sprzedaży fakturowanych przez księgowość.'}
        </Empty>
      ) : (
        <List>
          {data.items.map(item => (
            <ExternalInvoiceRow key={item.id} item={item} />
          ))}
        </List>
      )}

      {pages > 1 && (
        <Pager>
          <Button size="sm" variant="outline" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>
            Poprzednie
          </Button>
          <span>
            Strona {page} z {pages}
          </span>
          <Button size="sm" variant="outline" disabled={page >= pages} onClick={() => setPage(p => p + 1)}>
            Następne
          </Button>
        </Pager>
      )}
    </Wrap>
  );
};
