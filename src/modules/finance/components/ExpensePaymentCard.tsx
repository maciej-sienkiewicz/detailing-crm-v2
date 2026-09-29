// src/modules/finance/components/ExpensePaymentCard.tsx
//
// „Zapłać przelewem" przy fakturze kosztowej: dane do przelewu obok kodu QR w standardzie
// ZBP 2D, który każda polska aplikacja bankowa zamienia w wypełniony przelew.
//
// Kod generuje nasz backend (ZXing) i przysyła PNG w base64 - tu tylko go wyświetlamy przez
// Data URI. Żadnych generatorów w rodzaju Google Charts: adres takiego obrazka niesie numer
// rachunku i kwotę do cudzego serwera, a przeglądarka wysłałaby go przy każdym otwarciu okna.
//
// Dane do przelewu są widoczne także bez kodu (kwota ponad 9 999,99 zł, rachunek z błędną
// sumą kontrolną) - wtedy kopiuje się je przyciskami, zamiast przepisywać z ekranu.
//
// Hierarchia (CLAUDE.md §2): nic tu nie jest wypełnione kolorem. Kopiowanie to akcje
// drugorzędne w obwódce, a przedmiotem karty jest sam kod.
import React, { useEffect, useRef, useState } from 'react';
import { AlertTriangle, Check, Copy, Landmark, QrCode, Smartphone } from 'lucide-react';
import { useKsefExpenseTransfer } from '../hooks/useKsef';
import { formatBankAccount, formatMoneyFloat } from '../utils/formatters';
import type { KsefExpenseTransfer } from '../types';

interface Props {
  expenseId: string;
}

type CopyState = 'idle' | 'copied' | 'failed';

/**
 * Przycisk kopiowania jednej wartości. Numer rachunku kopiuje się bez spacji - tak wklei
 * się w każde pole „numer rachunku", także w bankach, które spacji nie przyjmują.
 */
const CopyButton: React.FC<{ value: string; label: string }> = ({ value, label }) => {
  const [state, setState] = useState<CopyState>('idle');
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => () => clearTimeout(timer.current), []);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setState('copied');
    } catch {
      // Schowek bywa niedostępny (http bez TLS, blokada przeglądarki) - mówimy to wprost.
      setState('failed');
    }
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setState('idle'), 1800);
  };

  const tone =
    state === 'copied'
      ? 'border-green-300 bg-green-50 text-green-700'
      : state === 'failed'
        ? 'border-amber-300 bg-amber-50 text-amber-800'
        : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900';

  return (
    <button
      type="button"
      onClick={copy}
      aria-label={`Kopiuj: ${label}`}
      className={`inline-flex shrink-0 items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-300 ${tone}`}
    >
      {state === 'copied' ? <Check size={14} aria-hidden /> : <Copy size={14} aria-hidden />}
      <span aria-live="polite">{state === 'copied' ? 'Skopiowano' : state === 'failed' ? 'Skopiuj ręcznie' : 'Kopiuj'}</span>
    </button>
  );
};

/** Wiersz danych: etykieta nad wartością, kopiowanie po prawej. */
const Field: React.FC<{
  label: string;
  copyValue?: string | null;
  children: React.ReactNode;
}> = ({ label, copyValue, children }) => (
  <div className="flex items-start justify-between gap-3 border-t border-slate-100 py-3 first:border-t-0 first:pt-0">
    <div className="min-w-0">
      <div className="text-xs text-slate-500">{label}</div>
      <div className="mt-1 break-words text-sm font-medium text-slate-900">{children}</div>
    </div>
    {copyValue && <CopyButton value={copyValue} label={label} />}
  </div>
);

/** Kod QR z PNG w base64 - czysty <img> z Data URI, bez zapytań na zewnątrz. */
const QrImage: React.FC<{ transfer: KsefExpenseTransfer }> = ({ transfer }) => (
  <img
    src={`data:image/png;base64,${transfer.qrPngBase64}`}
    alt={`Kod QR do przelewu dla: ${transfer.recipientName ?? 'sprzedawca'}, kwota ${formatMoneyFloat(transfer.amount, transfer.currency)}`}
    width={240}
    height={240}
    // Moduły kodu to piksele: wygładzanie przy skalowaniu rozmywa krawędzie, które czyta skaner.
    className="block h-60 w-60 [image-rendering:pixelated]"
    draggable={false}
  />
);

const QrPanel: React.FC<{ transfer: KsefExpenseTransfer }> = ({ transfer }) => {
  if (!transfer.qrPngBase64) {
    // Brak kodu z powodu, który wymaga uwagi (rachunek nie przechodzi kontroli), ma odcień
    // „przeczytaj"; zwykły brak (limit kwoty, waluta) jest neutralny.
    const attention = !transfer.accountNumberValid;
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 px-6 py-8 text-center">
        <span
          className={`flex h-11 w-11 items-center justify-center rounded-xl border ${
            attention ? 'border-amber-200 bg-amber-50 text-amber-700' : 'border-slate-200 bg-white text-slate-500'
          }`}
        >
          {attention ? <AlertTriangle size={20} aria-hidden /> : <QrCode size={20} aria-hidden />}
        </span>
        <p className="max-w-[240px] text-sm text-slate-600">{transfer.qrUnavailableReason}</p>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col items-center justify-center gap-4 px-6 py-6">
      <div className="rounded-2xl border border-slate-200 bg-white p-2 shadow-[0_1px_2px_rgba(15,23,42,0.06),0_8px_24px_-12px_rgba(15,23,42,0.18)]">
        <QrImage transfer={transfer} />
      </div>
      <div className="max-w-[260px] text-center">
        <div className="flex items-center justify-center gap-2 text-sm font-semibold text-slate-900">
          <Smartphone size={16} aria-hidden className="text-[var(--brand-primary)]" />
          Skanuj w aplikacji bankowej
        </div>
        <p className="mt-1 text-xs leading-relaxed text-slate-500">
          W aplikacji banku wybierz płatność kodem QR. Odbiorca, rachunek, kwota i tytuł uzupełnią się same.
        </p>
      </div>
    </div>
  );
};

const LoadingState: React.FC = () => (
  <div className="grid animate-pulse gap-0 md:grid-cols-[minmax(0,1fr)_320px]" aria-busy="true" aria-label="Wczytywanie danych do przelewu">
    <div className="space-y-4 p-5">
      <div className="h-4 w-40 rounded bg-slate-100" />
      <div className="h-10 rounded bg-slate-100" />
      <div className="h-10 rounded bg-slate-100" />
      <div className="h-10 rounded bg-slate-100" />
    </div>
    <div className="flex items-center justify-center bg-slate-50 p-6">
      <div className="h-60 w-60 rounded-2xl bg-slate-100" />
    </div>
  </div>
);

export const ExpensePaymentCard: React.FC<Props> = ({ expenseId }) => {
  const { transfer, isLoading, isError } = useKsefExpenseTransfer(expenseId);

  return (
    <section
      aria-labelledby="expense-payment-card-title"
      className="mt-6 overflow-hidden rounded-xl border border-slate-200 bg-white"
    >
      {isLoading ? (
        <LoadingState />
      ) : isError || !transfer ? (
        <p className="p-5 text-sm text-slate-500">Nie udało się pobrać danych do przelewu. Spróbuj otworzyć fakturę ponownie.</p>
      ) : (
        <div className="grid md:grid-cols-[minmax(0,1fr)_320px]">
          <div className="p-5">
            <div className="mb-4 flex items-center gap-3">
              <span className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-slate-50 text-slate-600">
                <Landmark size={18} aria-hidden />
              </span>
              <div>
                <h3 id="expense-payment-card-title" className="text-[15px] font-semibold text-slate-900">
                  Zapłać przelewem
                </h3>
                <p className="text-xs text-slate-500">Przed wysłaniem sprawdź kwotę i numer rachunku.</p>
              </div>
            </div>

            <Field label="Kwota do zapłaty" copyValue={transfer.amount != null ? transfer.amount.toFixed(2).replace('.', ',') : null}>
              <span className="text-xl font-semibold tabular-nums tracking-tight">
                {formatMoneyFloat(transfer.amount, transfer.currency)}
              </span>
            </Field>

            <Field label="Numer rachunku" copyValue={transfer.accountNumber?.replace(/\s/g, '')}>
              {transfer.accountNumber ? (
                <>
                  <span className="font-mono tabular-nums">{formatBankAccount(transfer.accountNumber)}</span>
                  {!transfer.accountNumberValid && (
                    <span className="mt-1.5 flex items-start gap-1.5 text-xs font-normal text-amber-800">
                      <AlertTriangle size={14} className="mt-px shrink-0" aria-hidden />
                      Numer nie przechodzi kontroli sumy. Porównaj go z fakturą.
                    </span>
                  )}
                </>
              ) : (
                <span className="text-slate-400">Brak na fakturze</span>
              )}
            </Field>

            <Field label="Odbiorca" copyValue={transfer.recipientName}>
              {transfer.recipientName ?? <span className="text-slate-400">Brak na fakturze</span>}
              {transfer.recipientNip && (
                <span className="mt-0.5 block text-xs font-normal text-slate-500">NIP {transfer.recipientNip}</span>
              )}
            </Field>

            <Field label="Tytuł przelewu" copyValue={transfer.title}>
              {transfer.title}
            </Field>
          </div>

          <div className="border-t border-slate-200 bg-slate-50 md:border-l md:border-t-0">
            <QrPanel transfer={transfer} />
          </div>
        </div>
      )}
    </section>
  );
};
