// src/modules/settings/components/services/servicePriceForm.helpers.ts
//
// Pola ceny formularzy cennika (usługa i pakiet): co w nich stoi po otwarciu, co się
// dzieje przy wpisywaniu i zmianie stawki, co idzie do API. Jedna kopia dla obu
// formularzy - wcześniej każdy miał własne handleNetChange/handleGrossChange i każdy
// musiał osobno pamiętać o regułach z CLAUDE.md §1.
import {
    formatMoneyAmount, parseMoneyInput, storedCatalogGross,
} from '@/modules/services/utils/priceCalculator';
import { grossToNet, netToGross } from '@/common/utils/priceAdjustment';
import {
    priceInputsForVatRate, storedPriceSide,
    type PriceInputFormat, type PriceSide,
} from '@/common/utils/priceInputs';
import type { AffectedPackage, Service, VatRate } from '@/modules/services/types';

/** Grosze → treść pola ceny w formularzu cennika: 190000 → „1900,00". */
export const formatDecimalInput = (grosze: number): string =>
    formatMoneyAmount(grosze).replace('.', ',');

/**
 * Pola ceny formularzy cennika (usługa i pakiet) dla `priceInputsForVatRate`.
 * Puste albo zerowe pole wpisane czyści drugie - tak samo, jak robi to wpisywanie.
 */
export const SERVICE_PRICE_INPUT: PriceInputFormat = {
    toCents: raw => {
        const grosze = parseMoneyInput(raw);
        return grosze > 0 ? grosze : null;
    },
    toInput: formatDecimalInput,
};

/** Znaki, które wolno wpisać w pole ceny: cyfry i najwyżej dwa miejsca po przecinku. */
export const isValidPriceInput = (raw: string): boolean =>
    raw === '' || /^\d*[,.]?\d{0,2}$/.test(raw);

export interface PriceFields {
    netInput: string;
    grossInput: string;
    vatRate: VatRate;
    requireManualPrice: boolean;
    /** Pole ceny wpisane ostatnio - przechodzi przez zmianę stawki VAT bez zmian. */
    priceSide: PriceSide;
}

export const EMPTY_PRICE_FIELDS: PriceFields = {
    netInput: '',
    grossInput: '',
    vatRate: 23,
    requireManualPrice: false,
    priceSide: 'net',
};

/**
 * Pola ceny otwieranej pozycji cennika.
 *
 * Brutto w polu to brutto ZAPISANE, jeśli jest. Gdy go nie ma (`null` albo 0 zł przy
 * netto > 0) - w polu stoi brutto policzone z netta, a stroną ceny jest netto. Tak
 * zapis bez dotykania ceny wysyła spójną parę; wcześniej pole pokazywało „0,00",
 * strona wychodziła „brutto" (0 ≠ netto × stawka) i do API szło `basePriceGross: 0`.
 */
export function priceFieldsFromCatalog(service: Pick<Service, 'basePriceNet' | 'vatRate' | 'requireManualPrice'> & {
    basePriceGross?: number | null;
}): PriceFields {
    if (service.requireManualPrice) {
        return { ...EMPTY_PRICE_FIELDS, vatRate: service.vatRate, requireManualPrice: true };
    }
    const stored = storedCatalogGross(service);
    return {
        netInput: formatDecimalInput(service.basePriceNet),
        grossInput: formatDecimalInput(stored ?? netToGross(service.basePriceNet, service.vatRate)),
        vatRate: service.vatRate,
        requireManualPrice: false,
        // Nic jeszcze nie wpisano: brutto, którego nie da się uzyskać z netta, wpisał
        // człowiek - i to ono ma przetrwać zmianę stawki. Brak brutta to strona netto.
        priceSide: storedPriceSide(service.basePriceNet, stored, service.vatRate),
    };
}

/** Wpisano netto: brutto liczy się z niego. `null`, gdy znak nie pasuje do kwoty. */
export function typeNet(fields: PriceFields, raw: string): PriceFields | null {
    if (!isValidPriceInput(raw)) return null;
    const net = parseMoneyInput(raw);
    const gross = raw.trim() === '' || net <= 0 ? '' : formatDecimalInput(netToGross(net, fields.vatRate));
    return { ...fields, netInput: raw, grossInput: gross, priceSide: 'net' };
}

/** Wpisano brutto: zostaje co do znaku, netto jest pochodne. */
export function typeGross(fields: PriceFields, raw: string): PriceFields | null {
    if (!isValidPriceInput(raw)) return null;
    const gross = parseMoneyInput(raw);
    const net = raw.trim() === '' || gross <= 0 ? '' : formatDecimalInput(grossToNet(gross, fields.vatRate));
    return { ...fields, grossInput: raw, netInput: net, priceSide: 'gross' };
}

/**
 * Zmiana stawki zostawia pole wpisane przez człowieka, a drugie liczy od nowa.
 * Brutto liczone zawsze z netta zamieniało wpisane 1900,00 zł w 1900,01 zł po
 * 23% → 8% → 23% - i taka cena szła potem do katalogu.
 */
export function changeVat(fields: PriceFields, vatRate: VatRate): PriceFields {
    const { net, gross } = priceInputsForVatRate(
        { net: fields.netInput, gross: fields.grossInput },
        fields.vatRate, vatRate, fields.priceSide, SERVICE_PRICE_INPUT,
    );
    return { ...fields, vatRate, netInput: net, grossInput: gross };
}

export function toggleManualPrice(fields: PriceFields): PriceFields {
    return fields.requireManualPrice
        ? { ...fields, requireManualPrice: false }
        : { ...fields, requireManualPrice: true, netInput: '', grossInput: '', vatRate: 23, priceSide: 'net' };
}

/**
 * Błąd ceny do pokazania przy polach, albo `undefined`.
 *
 * Puste pola przy usłudze bez wyceny ręcznej były wcześniej po cichu zapisywane jako
 * 0,00 zł - usługa trafiała do cennika z ceną, której nikt nie podał. Wpisane wprost
 * „0" przechodzi: to jest decyzja człowieka, nie przeoczenie.
 */
export function priceError(fields: PriceFields): string | undefined {
    if (fields.requireManualPrice) return undefined;
    const hasAmount = /\d/.test(fields.netInput) || /\d/.test(fields.grossInput);
    return hasAmount ? undefined : 'Podaj cenę brutto albo netto, albo włącz wycenę ręczną';
}

/**
 * Para netto/brutto do API - dokładnie to, co stoi w polach. Brutto wpisane przez
 * człowieka idzie co do grosza; przy wpisanym netto pole brutto zawiera netto × stawka,
 * więc para jest spójna w obu przypadkach.
 */
export function pricePayload(fields: PriceFields): { basePriceNet: number; basePriceGross: number } {
    if (fields.requireManualPrice) return { basePriceNet: 0, basePriceGross: 0 };
    return {
        basePriceNet: parseMoneyInput(fields.netInput),
        basePriceGross: parseMoneyInput(fields.grossInput),
    };
}

/** Nazwa usługi albo pakietu: wymagana, 3-100 znaków. */
export function validateCatalogName(raw: string): string | undefined {
    const name = raw.trim();
    if (!name) return 'Podaj nazwę';
    if (name.length < 3) return 'Nazwa musi mieć co najmniej 3 znaki';
    if (name.length > 100) return 'Nazwa może mieć najwyżej 100 znaków';
    return undefined;
}

/** Czy pola ceny różnią się od stanu po otwarciu - dla ochrony niezapisanych zmian. */
export function priceFieldsChanged(a: PriceFields, b: PriceFields): boolean {
    return a.netInput !== b.netInput
        || a.grossInput !== b.grossInput
        || a.vatRate !== b.vatRate
        || a.requireManualPrice !== b.requireManualPrice;
}

/**
 * Pakiety, w których warto zaktualizować nazwę usługi po zapisie - tylko wtedy, gdy
 * nazwa się ZMIENIŁA. Serwer zwraca `affectedPackages` przy każdej edycji usługi
 * wchodzącej w pakiet, więc pytanie „Zaktualizować nazwy w pakietach?" wyskakiwało
 * także po samej zmianie ceny, z nazwą identyczną jak przed zapisem.
 */
export function packagesToRename(
    previousName: string,
    saved: Pick<Service, 'name' | 'affectedPackages'>,
): AffectedPackage[] {
    if (saved.name.trim() === previousName.trim()) return [];
    return saved.affectedPackages ?? [];
}
