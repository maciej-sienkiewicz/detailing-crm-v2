// src/common/components/ServicesTable/servicesTablePricing.ts
//
// Decyzje cenowe tabeli usług wydzielone z komponentu, żeby dało się je sprawdzić
// testem bez renderowania okien rabatu i edycji. Sama arytmetyka VAT i rabatów jest
// we wspólnym priceAdjustment.ts - tu zapada wyłącznie decyzja, OD CZEGO ją liczyć.

import { grossToNet, netToGross, resolveBaseGross, resolveBaseNet } from '@/common/utils/priceAdjustment';
import type { PriceAdjustment, ServicePriceBase } from '@/common/utils/priceAdjustment';

/** Tyle pozycji, ile trzeba, żeby ustalić jej cenę bazową. */
interface PricedLine {
    basePriceNet: number;
    basePriceGross?: number;
    vatRate: number;
    adjustment: PriceAdjustment;
}

/**
 * Pozycja z nowym rabatem - także z rabatem zerowym („Usuń rabat").
 *
 * Pozycja z ceną ręczną wraca z API jako `basePriceNet = 0` + SET_NET/SET_GROSS,
 * więc jej cena siedzi W RABACIE. Podmiana samego rabatu liczyła nowy od zera:
 * rabat zerował cenę, a „Usuń rabat" robił z pozycji usługę za 0 zł. Dlatego przed
 * podmianą ustalona cena przechodzi do bazy - netto z `resolveBaseNet`, a brutto
 * wpisane przez człowieka (SET_GROSS) dokładnie, bez przeliczania (CLAUDE.md §1).
 */
export function withAdjustment<T extends PricedLine>(line: T, adjustment: PriceAdjustment): T {
    const baseNet = resolveBaseNet(line);
    if (baseNet === line.basePriceNet) return { ...line, adjustment };
    return { ...line, basePriceNet: baseNet, basePriceGross: resolveBaseGross(line), adjustment };
}

/**
 * Ceny bazowe dla „Rabatuj wszystko" - te same, od których liczy rabat pojedynczej
 * pozycji, razem z dokładnym brutto. Upust i cena brutto rozkładają się wtedy na
 * brutto ustalone, a nie odtworzone z netta.
 */
export const discountBases = (lines: PricedLine[]): ServicePriceBase[] =>
    lines.map(line => ({
        basePriceNetCents: resolveBaseNet(line),
        basePriceGrossCents: resolveBaseGross(line),
        vatRate: line.vatRate,
    }));

/**
 * Para netto/brutto z pól „Edytuj pozycję". Wpisana strona zostaje dokładnie taka,
 * jak ją wpisano; druga liczy się raz, wspólnym przeliczeniem.
 *
 * Pole puste (albo zero) zeruje OBIE kwoty. Wcześniej druga zostawała sprzed zmiany:
 * po wyczyszczeniu brutta „Zapisz" przechodziło walidację (sprawdza tylko netto)
 * i wysyłało do cennika stare netto z bruttem 0.
 */
export const editedPricePair = (
    raw: string,
    side: 'net' | 'gross',
    vatRate: number,
): { netCents: number; grossCents: number } => {
    const value = parseFloat(raw.replace(',', '.'));
    if (isNaN(value) || value <= 0) return { netCents: 0, grossCents: 0 };
    const cents = Math.round(value * 100);
    return side === 'net'
        ? { netCents: cents, grossCents: netToGross(cents, vatRate) }
        : { netCents: grossToNet(cents, vatRate), grossCents: cents };
};
