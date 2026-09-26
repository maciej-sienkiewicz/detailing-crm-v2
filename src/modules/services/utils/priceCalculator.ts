// src/modules/services/utils/priceCalculator.ts
import { dinero, toDecimal } from 'dinero.js';
import { PLN } from '@dinero.js/currencies';
import { netToGross, grossToNet } from '@/common/utils/priceAdjustment';
import type { VatRate, ServicePriceCalculation } from '../types';

const createMoney = (amount: number) => dinero({ amount, currency: PLN });

export const calculateGrossFromNet = (netAmount: number, vatRate: VatRate): ServicePriceCalculation => {
    const grossAmount = netToGross(netAmount, vatRate);
    return {
        priceNet: netAmount,
        vatAmount: grossAmount - netAmount,
        priceGross: grossAmount,
    };
};

export const calculateNetFromGross = (grossAmount: number, vatRate: VatRate): ServicePriceCalculation => {
    const netAmount = grossToNet(grossAmount, vatRate);
    return {
        priceNet: netAmount,
        vatAmount: grossAmount - netAmount,
        priceGross: grossAmount,
    };
};

/**
 * Brutto zapisane przy pozycji cennika - albo `undefined`, gdy go nie ma.
 *
 * „Nie ma" to dwa przypadki: pole puste (`null` / brak) oraz 0 zł przy netto
 * większym od zera. To drugie nie jest ceną, tylko śladem po obiekcie złożonym
 * w pośpiechu (zaślepki w formularzu pakietu, atrapy API): formularz edycji
 * otwierał taką usługę z „0,00" w polu brutto i stroną ceny „brutto", więc zapis
 * bez dotykania ceny wysyłał `basePriceGross: 0` - a backend odrzuca parę
 * netto/brutto różną o więcej niż grosz.
 *
 * Usługa z wyceną ręczną ma netto 0 i brutto 0 - to para spójna, zostaje.
 */
export const storedCatalogGross = (service: {
    basePriceNet: number;
    basePriceGross?: number | null;
}): number | undefined => {
    const gross = service.basePriceGross;
    if (gross == null) return undefined;
    if (gross === 0 && service.basePriceNet > 0) return undefined;
    return gross;
};

/**
 * Brutto pozycji cennika do pokazania: zapisane, jeśli jest (CLAUDE.md §1 - brutto
 * wpisane jako 1900,00 zł nie wolno odtwarzać z netta, bo wyjdzie 1900,01 zł),
 * a policzone z netta dopiero wtedy, gdy zapisanego brak.
 */
export const catalogGross = (service: {
    basePriceNet: number;
    basePriceGross?: number | null;
    vatRate: number;
}): number => storedCatalogGross(service) ?? netToGross(service.basePriceNet, service.vatRate);

export const formatMoneyAmount = (amount: number): string => {
    const money = createMoney(amount);
    const decimal = toDecimal(money);
    return parseFloat(decimal).toFixed(2);
};

export const parseMoneyInput = (value: string): number => {
    const cleaned = value.replace(/[^\d,.-]/g, '').replace(',', '.');
    const parsed = parseFloat(cleaned);
    if (isNaN(parsed)) return 0;
    return Math.round(parsed * 100);
};
