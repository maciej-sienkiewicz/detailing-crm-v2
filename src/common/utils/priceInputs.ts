// src/common/utils/priceInputs.ts
//
// Para pól „netto / brutto" w formularzu ceny: które z nich wpisał człowiek i co się
// z nimi dzieje przy zmianie stawki VAT. Arytmetyka VAT mieszka w priceAdjustment.ts,
// tu zapada wyłącznie decyzja, które pole zostaje, a które liczy się od nowa.
//
// Powód istnienia (CLAUDE.md §1): formularze po zmianie stawki liczyły brutto zawsze
// z netta, bez względu na to, które pole wpisano. Cena wpisana jako 1900,00 zł brutto
// po 23% → 8% → 23% wracała jako 1900,01 zł - przy 23% nie istnieje netto w groszach,
// z którego wychodzi równo 1900,00.

import { centsToInput, inputToCents } from './moneyInput';
import { isTypedGross, repriceForVatRate } from './priceAdjustment';

/** Pole ceny wpisane przez człowieka - źródło prawdy pary netto/brutto. */
export type PriceSide = 'net' | 'gross';

/**
 * Strona ceny ZAPISANEJ, gdy formularz otwiera się z danymi, a nic jeszcze nie wpisano.
 *
 * Brutto różne od netto × stawka nie mogło wyjść z przeliczenia, więc wpisał je
 * człowiek. Para zgodna z przeliczeniem jest niejednoznaczna - wtedy netto, czyli
 * dotychczasowe zachowanie formularzy.
 */
export const storedPriceSide = (
    netCents: number,
    grossCents: number | null | undefined,
    vatRate: number,
): PriceSide => (isTypedGross(netCents, grossCents, vatRate) ? 'gross' : 'net');

/** Treść pól netto i brutto dokładnie w takiej postaci, w jakiej stoi w formularzu. */
export interface PriceInputs {
    net: string;
    gross: string;
}

/**
 * Jak dany formularz czyta i pisze swoje pola ceny. `toCents` zwraca `null`, gdy w polu
 * nie ma jeszcze kwoty - wtedy drugie pole zostaje puste, zamiast udawać wpisane 0,00.
 */
export interface PriceInputFormat {
    toCents: (raw: string) => number | null;
    toInput: (cents: number) => string;
}

/** Pola w konwencji moneyInput.ts: przecinek, puste pole = nic nie wpisano. */
export const MONEY_INPUT_FORMAT: PriceInputFormat = {
    toCents: raw => (raw.trim() === '' ? null : inputToCents(raw)),
    toInput: centsToInput,
};

/**
 * Pola ceny po zmianie stawki VAT.
 *
 * Pole wpisane przez człowieka przechodzi co do znaku, drugie liczy się od nowa przy
 * nowej stawce. Ta sama stawka - pola wracają nietknięte (to samo `inputs`), bo
 * przeliczenie „na wszelki wypadek" zgubiłoby grosz na brutto.
 */
export function priceInputsForVatRate(
    inputs: PriceInputs,
    fromRate: number,
    toRate: number,
    side: PriceSide,
    format: PriceInputFormat = MONEY_INPUT_FORMAT,
): PriceInputs {
    if (fromRate === toRate) return inputs;

    const netCents = format.toCents(inputs.net);
    const grossCents = format.toCents(inputs.gross);
    const typedCents = side === 'gross' ? grossCents : netCents;
    // W polu wpisanym nie ma kwoty: nie ma czego przeliczać, drugie pole też jest puste.
    if (typedCents === null) {
        return side === 'gross' ? { net: '', gross: inputs.gross } : { net: inputs.net, gross: '' };
    }

    const repriced = repriceForVatRate(
        { netCents: netCents ?? 0, grossCents: grossCents ?? 0 },
        fromRate,
        toRate,
        side,
    );
    return side === 'gross'
        ? { net: format.toInput(repriced.netCents), gross: inputs.gross }
        : { net: inputs.net, gross: format.toInput(repriced.grossCents) };
}
