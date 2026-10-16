import { netToGross } from '@/common/utils/priceAdjustment';
import { inputValueToGrosze } from './formatters';
import type { RevenueVatRate } from '../types';

/**
 * Stawka faktury przychodowej jako procent dla `netToGross`. „zw" i „0" nie
 * doliczają VAT - netToGross zwraca dla nich netto bez zmian.
 */
export const REVENUE_VAT_PERCENT: Record<RevenueVatRate, number> = {
  '23': 23,
  '8':  8,
  '5':  5,
  '0':  0,
  zw:   0,
};

export type InvoicePriceMode = 'NET' | 'GROSS';

export interface InvoiceDraftLine {
  quantity: string;
  /** Cena jednostkowa z pola formularza (zł, przecinek albo kropka) - netto albo brutto, wg [mode]. */
  price:    string;
  vatRate:  RevenueVatRate;
  /** Którą cenę wpisano. Domyślnie netto (dawne zachowanie okna). */
  mode?:    InvoicePriceMode;
}

/**
 * Kwoty pozycji w groszach, liczone IDENTYCZNIE jak IssueRevenueInvoiceHandler:
 * - netto wpisane: netto wiersza = cena × ilość, brutto = netto + VAT od netto,
 * - brutto wpisane: netto jednostkowe = brutto − VAT „w stu", a wiersz to wielokrotności
 *   ceny jednostkowej - brutto wiersza = cena brutto × ilość co do grosza (CLAUDE.md §1).
 */
export const invoiceDraftLineAmounts = (item: InvoiceDraftLine): { net: number; gross: number } => {
  const qty = parseFloat(item.quantity.replace(',', '.')) || 0;
  const unit = inputValueToGrosze(item.price);
  const pct = REVENUE_VAT_PERCENT[item.vatRate];
  if (item.mode === 'GROSS') {
    const unitNet = unit - (pct <= 0 ? 0 : Math.round((unit * pct) / (100 + pct)));
    return { net: Math.round(unitNet * qty), gross: Math.round(unit * qty) };
  }
  const net = Math.round(unit * qty);
  return { net, gross: netToGross(net, pct) };
};

export interface InvoiceDraftTotals {
  net:   number;
  vat:   number;
  gross: number;
}

/**
 * Podgląd sum w oknie „Wystaw fakturę”. Cenę wpisuje się tu w NETTO, więc
 * brutto wolno policzyć (CLAUDE.md §1, kierunek netto → brutto) - ale przez
 * wspólne `netToGross`, a nie własne mnożenie przez ułamek stawki, jak było
 * wcześniej (`VAT_MULTIPLIER`). Wynik jest ten sam (sprawdzone testem na pełnym
 * zakresie groszy), za to arytmetyka VAT mieszka w jednym miejscu.
 *
 * Brutto liczymy per pozycja, a VAT to RÓŻNICA sum - wtedy netto + VAT = brutto
 * w stopce co do grosza. Sumy są tylko podglądem: do API idzie cena wpisana
 * (netto albo brutto), a fakturę liczy serwer - tym samym wzorem.
 */
export const invoiceDraftTotals = (items: readonly InvoiceDraftLine[]): InvoiceDraftTotals => {
  let net = 0;
  let gross = 0;
  for (const item of items) {
    const line = invoiceDraftLineAmounts(item);
    net += line.net;
    gross += line.gross;
  }
  return { net, vat: gross - net, gross };
};
