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

export interface InvoiceDraftLine {
  quantity: string;
  /** Cena jednostkowa NETTO z pola formularza (zł, przecinek albo kropka). */
  price:    string;
  vatRate:  RevenueVatRate;
}

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
 * w stopce co do grosza. Sumy są tylko podglądem: do API idzie cena netto
 * pozycji, a fakturę liczy serwer.
 */
export const invoiceDraftTotals = (items: readonly InvoiceDraftLine[]): InvoiceDraftTotals => {
  let net = 0;
  let gross = 0;
  for (const item of items) {
    const qty = parseFloat(item.quantity.replace(',', '.')) || 0;
    const lineNet = Math.round(inputValueToGrosze(item.price) * qty);
    net += lineNet;
    gross += netToGross(lineNet, REVENUE_VAT_PERCENT[item.vatRate]);
  }
  return { net, vat: gross - net, gross };
};
