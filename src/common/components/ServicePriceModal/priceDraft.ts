// src/common/components/ServicePriceModal/priceDraft.ts
//
// Decyzje okna „Cena w tej rezerwacji" bez renderowania: z tego, co człowiek wpisał
// w jednej z trzech zakładek, powstaje JEDEN rabat pozycji (PriceAdjustment). Okno
// nie ma własnej arytmetyki VAT - liczy ją wspólne priceAdjustment.ts (CLAUDE.md §1).
//
// Dlaczego trzy zakładki, skoro silnik zna pięć rodzajów rabatu: biznes nie myśli
// „SET_GROSS" ani „PERCENT ze znakiem plus". Myśli „umówiłem się na 1800 zł",
// „dam mu 10% taniej" albo „doliczam 300 zł, bo wnętrze było zniszczone". Podwyżka
// ukryta pod przyciskiem „Rabat" była nieużywana, a zamiast niej ludzie zmieniali
// cennik dla wszystkich klientów przez „Edytuj pozycję".

import { applyAdjustment, grossToNet, netToGross, withVatRate } from '@/common/utils/priceAdjustment';
import type { PriceAdjustment } from '@/common/utils/priceAdjustment';

export type PriceMode = 'price' | 'discount' | 'surcharge';
export type AmountUnit = 'percent' | 'gross' | 'net';

/** Cena wyjściowa pozycji: z cennika albo ustalona ręcznie przy dodaniu. */
export interface PriceBase {
    netCents: number;
    /** Dokładne brutto, jeśli ktoś je ustalił; inaczej liczone z netto. */
    exactGrossCents?: number;
    vatRate: number;
}

export const baseGrossOf = (base: PriceBase): number =>
    base.exactGrossCents ?? netToGross(base.netCents, base.vatRate);

/**
 * Cena wyjściowa przy innej stawce VAT - wspólnym `withVatRate`, tym samym, którym
 * tabela przestawia pozycję po „Zastosuj". Ta sama stawka nie zmienia niczego.
 * Brutto wpisane od strony brutto zostaje, a netto liczy się od nowa; w każdym
 * innym przypadku zostaje netto, a brutto z cennika przestaje być dokładne - cennik
 * ustalił je przy SWOJEJ stawce (CLAUDE.md §1, `catalogLinePrice` w backendzie).
 */
export const baseAtVatRate = (base: PriceBase, vatRate: number): PriceBase => {
    const line = withVatRate(
        { basePriceNet: base.netCents, basePriceGross: base.exactGrossCents, vatRate: base.vatRate },
        vatRate,
    );
    return { netCents: line.basePriceNet, exactGrossCents: line.basePriceGross ?? undefined, vatRate };
};

const parseAmount = (raw: string): number | null => {
    const value = parseFloat(raw.replace(',', '.'));
    return Number.isNaN(value) || value <= 0 ? null : value;
};

/**
 * Zakładka, w której okno się otwiera - ta, w której zapisano obecną zmianę.
 * Dopłata kwotowa jest zapisana jako cena docelowa (SET_*), więc po ponownym
 * otwarciu wraca jako „Ustal cenę" - z tą samą kwotą, więc nic się nie gubi.
 */
export const initialMode = (adjustment: PriceAdjustment | null | undefined): PriceMode => {
    if (!adjustment || adjustment.value === 0) return 'price';
    if (adjustment.type === 'PERCENT') return adjustment.value > 0 ? 'surcharge' : 'discount';
    if (adjustment.type === 'FIXED_NET' || adjustment.type === 'FIXED_GROSS') return 'discount';
    return 'price';
};

/** Strona ceny, którą wpisał człowiek w „Ustal cenę". Druga strona jest pochodna. */
export interface TypedPrice {
    side: 'net' | 'gross';
    raw: string;
}

/**
 * „Ustal cenę": wpisana strona zostaje dokładnie taka, jak ją wpisano - 1800,00 zł
 * brutto idzie jako SET_GROSS 180000, a nie jako netto odtworzone z brutta.
 */
export const fromTypedPrice = (typed: TypedPrice | null): PriceAdjustment | null => {
    if (!typed) return null;
    const value = parseAmount(typed.raw);
    if (value === null) return null;
    const cents = Math.round(value * 100);
    return { type: typed.side === 'gross' ? 'SET_GROSS' : 'SET_NET', value: cents };
};

/** Druga strona pary „Ustal cenę" - do pokazania w polu obok. */
export const counterpart = (typed: TypedPrice, vatRate: number): number | null => {
    const value = parseAmount(typed.raw);
    if (value === null) return null;
    const cents = Math.round(value * 100);
    return typed.side === 'gross' ? grossToNet(cents, vatRate) : netToGross(cents, vatRate);
};

/**
 * „Rabat": procent albo kwota ODEJMOWANA od ceny wyjściowej (FIXED_* - v > 0 to rabat,
 * CLAUDE.md §1). Rabat większy niż cena nie przechodzi - nie ma ceny poniżej zera.
 */
export const fromDiscount = (unit: AmountUnit, raw: string, base: PriceBase): PriceAdjustment | null => {
    const value = parseAmount(raw);
    if (value === null) return null;
    if (unit === 'percent') return value > 100 ? null : { type: 'PERCENT', value: -value };
    const cents = Math.round(value * 100);
    if (unit === 'gross') return cents > baseGrossOf(base) ? null : { type: 'FIXED_GROSS', value: cents };
    return cents > base.netCents ? null : { type: 'FIXED_NET', value: cents };
};

/**
 * „Dopłata": procent na plus albo kwota DODAWANA do ceny wyjściowej.
 *
 * Kwota nie ma własnego rodzaju rabatu - FIXED_* jest celowo tylko odejmowany
 * (CLAUDE.md §1). Dopłata 300 zł brutto to więc cena docelowa: brutto wyjściowe
 * + 300 zł, zapisane jako SET_GROSS. Obie kwoty są dokładne, nic się nie przelicza,
 * więc 1500,00 + 300,00 daje równo 1800,00 zł brutto.
 */
export const fromSurcharge = (unit: AmountUnit, raw: string, base: PriceBase): PriceAdjustment | null => {
    const value = parseAmount(raw);
    if (value === null) return null;
    if (unit === 'percent') return { type: 'PERCENT', value };
    const cents = Math.round(value * 100);
    if (unit === 'gross') return { type: 'SET_GROSS', value: baseGrossOf(base) + cents };
    return { type: 'SET_NET', value: base.netCents + cents };
};

/** Cena pozycji po zmianie, w groszach. */
export const priceAfter = (base: PriceBase, adjustment: PriceAdjustment) =>
    applyAdjustment(base.netCents, base.vatRate, adjustment, base.exactGrossCents);

export type PriceChangeKind = 'none' | 'discount' | 'surcharge';

export interface PriceChange {
    kind: PriceChangeKind;
    /** Różnica brutto względem ceny wyjściowej, zawsze dodatnia. */
    grossDeltaCents: number;
    /** Procent, gdy zmianę zapisano procentem; wtedy pokazujemy procent, nie kwotę. */
    percent?: number;
}

/**
 * Co się stało z ceną pozycji - do znacznika w wierszu tabeli i do podglądu w oknie.
 * Kierunek decyduje o słowie: niżej = rabat, wyżej = dopłata, niezależnie od tego,
 * którym rodzajem rabatu zmianę zapisano.
 */
export const describeChange = (base: PriceBase, adjustment: PriceAdjustment | null | undefined): PriceChange => {
    if (!adjustment) return { kind: 'none', grossDeltaCents: 0 };
    const delta = priceAfter(base, adjustment).finalGrossCents - baseGrossOf(base);
    if (delta === 0) return { kind: 'none', grossDeltaCents: 0 };
    const percent = adjustment.type === 'PERCENT' ? Math.abs(adjustment.value) : undefined;
    return { kind: delta < 0 ? 'discount' : 'surcharge', grossDeltaCents: Math.abs(delta), percent };
};

const plnFormat = new Intl.NumberFormat('pl-PL', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/** „1 800,00 zł" - kwota w groszach, po polsku. */
export const formatPln = (cents: number): string => `${plnFormat.format(cents / 100)} zł`;

/** Znacznik w wierszu: „Rabat 10%", „Dopłata 300,00 zł". Brak zmiany = brak znacznika. */
export const changeLabel = (change: PriceChange): string | null => {
    if (change.kind === 'none') return null;
    const word = change.kind === 'discount' ? 'Rabat' : 'Dopłata';
    const amount = change.percent !== undefined
        ? `${String(change.percent).replace('.', ',')}%`
        : formatPln(change.grossDeltaCents);
    return `${word} ${amount}`;
};
