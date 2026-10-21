import { MAX_2_DECIMALS } from '@/common/utils/moneyInput';
import { validatePolishNip } from '@/common/utils/validators';
import type {
    PaymentMethod,
    InvoiceType,
    CompleteInvoicePayload,
    HandoverAddedServicePayload,
    HandoverPriceChangePayload,
} from './stateTransitions';

export type VatRateCode = '23' | '8' | '5' | '0' | 'zw';
export type PriceMode = 'NET' | 'GROSS';

export const VAT_PERCENT: Record<VatRateCode, number> = { '23': 23, '8': 8, '5': 5, '0': 0, zw: 0 };

/**
 * Pozycja faktury z zasadą „pole wpisane jest źródłem prawdy": [mode] wskazuje,
 * którą kwotę wpisał użytkownik: ta kwota NIGDY nie jest przeliczana wstecz,
 * a druga jest zawsze pochodną (VAT od netto albo VAT „w stu" od brutto, jak
 * w ustawie o VAT art. 106e ust. 7). Dzięki temu wpisane 500,00 nie przeskoczy
 * na 499,99. Backend liczy identycznie, patrz CompleteVisitInvoiceOrchestrator.
 */
export interface HandoverItem {
    name: string;
    /** Netto w PLN: autorytatywne przy mode=NET, pochodne przy GROSS. */
    net: string;
    /** Brutto w PLN: autorytatywne przy mode=GROSS, pochodne przy NET. */
    gross: string;
    mode: PriceMode;
    vatRate: VatRateCode;
}

export interface HandoverBuyer {
    /** Puste = konsument. Dziesięć cyfr = nabywca firmowy. */
    nip: string;
    name: string;
    addressLine1: string;
    addressLine2: string;
    email: string;
}

/**
 * Cena usługi przy wydaniu pojazdu. Osoba wydająca auto może na końcu zmienić cenę
 * (podwyżka, rabat) i stawkę VAT usługi - zmiana trafia do wizyty, więc widzą ją
 * statystyki, a faktura ją przejmuje (decyzja biznesu z 20.10.2026). Pole wpisane
 * (netto albo brutto, [mode]) jest źródłem prawdy, drugie jest pochodne - jak w każdym
 * polu ceny (CLAUDE.md §1). Zmiana stawki zostawia stronę ustaloną.
 */
export interface HandoverPrice extends HandoverItem {
    /** Id pozycji wizyty. */
    serviceId: string;
    /** Cena, z którą usługa przyszła na ekran wydania (grosze) - do „było” i do wykrycia zmiany. */
    originalNet: number;
    originalGross: number;
    originalRate: VatRateCode;
    /** Pozycja dopisana na fakturze przy wydaniu - przy zapisie staje się usługą wizyty. */
    added?: boolean;
}

/**
 * Pozycja faktury: jedna albo kilka usług tej samej stawki (scalenie). Każda pozycja idzie
 * na fakturę. Przy podziale „faktura + inny dokument” pozycja może mieć na fakturze inną
 * kwotę niż jej usługi ([partialGross]): niższa zostawia resztę na innym dokumencie,
 * wyższa podnosi cenę usług w wizycie do tej kwoty (patrz [settlementPlan]).
 */
export interface InvoiceLine {
    name: string;
    serviceIds: string[];
    /** Podział: brutto na fakturze; '' = cała kwota usług pozycji, 0 = nic na fakturze. */
    partialGross: string;
}

/**
 * Pełny stan ekranu wydania. Zapisywany do localStorage, żeby zamknięcie okna
 * nie kasowało pracy: stary kreator czyścił wszystko w handleClose().
 */
export interface HandoverState {
    paymentMethod: PaymentMethod;
    documentType: InvoiceType;
    buyer: HandoverBuyer;
    /** Ceny usług wizyty - zmienione tu zmieniają cenę wizyty. */
    prices: HandoverPrice[];
    /** Pozycje faktury zbudowane z usług. */
    lines: InvoiceLine[];
    /**
     * „Faktura + inny dokument”: część kwoty na fakturze, reszta zapisem bez paragonu
     * i bez VAT, gotówką (decyzja biznesu z 20.10.2026).
     */
    splitRemainder: boolean;
    /**
     * Kwota innego dokumentu wpisana przez człowieka; '' = wyliczona (netto części usług
     * poza fakturą, bo bez paragonu nie ma VAT-u). Inna niż wyliczona zmienia cenę wizyty.
     */
    remainderInput: string;
    exemptionBasis: string;
    /** Protokół podpisany papierowo. Trafia do payloadu jako signatureObtained. */
    protocolSigned: boolean;
    /**
     * Czy fakturę wysłać do KSeF. `null` = użytkownik nie ruszył przełącznika, więc
     * obowiązuje domyślna odpowiedź studia z ustawień.
     */
    sendToKsef: boolean | null;
    /**
     * Czy przy wydaniu wysłać klientowi podziękowanie. null = pracownik jeszcze nie
     * wybierał i obowiązuje „Domyślnie zaznacz" przy wiadomości „Podziękowanie po wizycie".
     */
    thankYouSms: boolean | null;
}

// ─── Draft ekranu wydania ─────────────────────────────────────────────────────

export interface HandoverDraft {
    servicesFingerprint: string;
    state: HandoverState;
    /** Kiedy zapisano draft (ISO) - baner „Wróciły zmiany zapisane o …”. */
    savedAt?: string;
}

/**
 * Odcisk usług wizyty: identyfikator, nazwa, kwota brutto i stawka VAT każdej z nich.
 * Zmiana czegokolwiek z tej listy unieważnia ceny i pozycje zapisane w draftcie.
 */
export const servicesFingerprint = (
    services: Array<{ id: string; serviceName: string; vatRate?: number | null }>,
    grossOf: (service: { id: string; serviceName: string }) => number
): string =>
    services
        .map(service => `${service.id}:${service.serviceName}:${grossOf(service)}:${service.vatRate ?? ''}`)
        .join('|');

/**
 * Stan początkowy z uwzględnieniem zapisanego draftu. Draft wraca w całości tylko dla
 * tej samej listy usług; inaczej zostaje z niego nabywca i wybory dotyczące zapłaty.
 */
export const restoreDraft = (
    fresh: HandoverState,
    stored: string | null,
    fingerprint: string
): HandoverState => {
    if (!stored) return fresh;

    let draft: HandoverDraft | null = null;
    try {
        draft = JSON.parse(stored) as HandoverDraft;
    } catch {
        return fresh;
    }
    if (!draft?.state) return fresh;
    // Draft sprzed cen przy wydaniu (bez prices/lines) nie opisuje już ekranu.
    const complete = Array.isArray(draft.state.prices) && Array.isArray(draft.state.lines);

    if (draft.servicesFingerprint !== fingerprint || !complete) {
        return {
            ...fresh,
            buyer: draft.state.buyer ?? fresh.buyer,
            paymentMethod: draft.state.paymentMethod ?? fresh.paymentMethod,
            documentType: draft.state.documentType ?? fresh.documentType,
            sendToKsef: draft.state.sendToKsef ?? fresh.sendToKsef,
            thankYouSms: draft.state.thankYouSms ?? fresh.thankYouSms,
        };
    }
    return { ...fresh, ...draft.state, remainderInput: draft.state.remainderInput ?? '' };
};

// ─── Arytmetyka kwot (grosze) ─────────────────────────────────────────────────

/**
 * Grosze → treść pola kwoty, z przecinkiem jak każde pole kwoty w aplikacji. Pole
 * wyliczone pokazywało wcześniej „1300.81” obok wpisanego „1600,00”.
 */
export const toPln = (grosz: number): string => (grosz / 100).toFixed(2).replace('.', ',');

/**
 * Czy treść pola jest kwotą w groszach: najwyżej dwa miejsca po przecinku (albo
 * kropce); spacje jako separator tysięcy są dozwolone. Niedokończone „12," też
 * przechodzi, żeby nie blokować wpisywania.
 */
export const isPlnInput = (value: string): boolean => MAX_2_DECIMALS.test(value.replace(/\s/g, ''));

/**
 * Kwota w złotych → grosze. Treść, która kwotą w groszach nie jest (patrz isPlnInput),
 * daje 0, jak puste pole. Trzecie miejsce po przecinku było wcześniej zaokrąglane po
 * cichu: „12,345" szło na fakturę jako 12,35, kwota, której nikt nie wpisał. Teraz
 * walidacja pozycji pokaże „podaj kwotę".
 */
export const parsePln = (value: string): number => {
    if (!isPlnInput(value)) return 0;
    const parsed = parseFloat(value.replace(',', '.').replace(/\s/g, ''));
    return Number.isFinite(parsed) ? Math.round(parsed * 100) : 0;
};

/** VAT od netto (grosze): round(netto × stawka%). */
export const vatFromNet = (net: number, rate: VatRateCode): number =>
    Math.round((net * VAT_PERCENT[rate]) / 100);

/** VAT „w stu" od brutto (grosze): round(brutto × stawka / (100 + stawka)). */
export const vatFromGross = (gross: number, rate: VatRateCode): number =>
    Math.round((gross * VAT_PERCENT[rate]) / (100 + VAT_PERCENT[rate]));

/** Kwoty pozycji w groszach, liczone identycznie jak na backendzie. */
export const itemAmounts = (item: HandoverItem): { net: number; gross: number } => {
    if (item.mode === 'GROSS') {
        const gross = parsePln(item.gross);
        return { net: gross - vatFromGross(gross, item.vatRate), gross };
    }
    const net = parsePln(item.net);
    return { net, gross: net + vatFromNet(net, item.vatRate) };
};

/** Uzupełnia pole pochodne na podstawie autorytatywnego. */
export const withDerived = (item: HandoverItem): HandoverItem => {
    const { net, gross } = itemAmounts(item);
    return item.mode === 'GROSS' ? { ...item, net: toPln(net) } : { ...item, gross: toPln(gross) };
};

/**
 * Stawka wykryta z relacji brutto/netto usługi; przy braku dopasowania 23%.
 * Wyłącznie zapasowo, dla usługi bez zapisanej stawki - patrz invoiceRateOf.
 */
export const detectRate = (net: number, gross: number): VatRateCode => {
    if (net <= 0) return '23';
    const ratio = gross / net;
    if (Math.abs(ratio - 1.23) < 0.005) return '23';
    if (Math.abs(ratio - 1.08) < 0.005) return '8';
    if (Math.abs(ratio - 1.05) < 0.005) return '5';
    if (Math.abs(ratio - 1.0) < 0.005) return '0';
    return '23';
};

/** Stawka VAT usługi w procentach (-1 = zwolniona) → kod stawki faktury; null dla nieznanej. */
export const vatRateCodeOf = (vatRate: number | null | undefined): VatRateCode | null => {
    switch (vatRate) {
        case 23: return '23';
        case 8: return '8';
        case 5: return '5';
        case 0: return '0';
        case -1: return 'zw';
        default: return null;
    }
};

/**
 * Stawka pozycji faktury dla usługi wizyty: ta zapisana przy usłudze.
 *
 * Zgadywanie z proporcji brutto/netto (detectRate) myli się tam, gdzie proporcja stawki
 * nie niesie: usługa zwolniona ma brutto = netto, więc szła do KSeF jako „0%" zamiast
 * „zw", a przy groszowych kwotach zaokrąglenie zjada VAT (1 gr netto przy 23% to 1 gr
 * brutto → „0%", 7 gr netto przy 8% to 8 gr brutto → „23%"). Proporcja zostaje tylko
 * dla usługi bez zapisanej stawki.
 */
export const invoiceRateOf = (vatRate: number | null | undefined, net: number, gross: number): VatRateCode =>
    vatRateCodeOf(vatRate) ?? detectRate(net, gross);

export const invoiceGrossOf = (items: HandoverItem[]): number =>
    items.reduce((sum, item) => sum + itemAmounts(item).gross, 0);

export const normalizeNip = (value: string): string => value.replace(/[^0-9]/g, '');

/** Formatuje NIP do postaci 123-456-78-90; nieprawidłowy zwraca bez zmian. */
export const formatNip = (value: string): string => {
    const digits = normalizeNip(value);
    if (digits.length !== 10) return value;
    return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6, 8)}-${digits.slice(8)}`;
};


// ─── Ceny usług przy wydaniu ──────────────────────────────────────────────────

/** Stawka kodu faktury → stawka usługi w procentach (-1 = zwolniona), jak w API wizyt. */
export const vatRateNumberOf = (code: VatRateCode): number => (code === 'zw' ? -1 : VAT_PERCENT[code]);

/**
 * Cena usługi na ekranie wydania. Strona ustalona: usługa z ceną wpisaną od brutto
 * (basePriceGross) startuje w trybie GROSS, pozostałe w NET - zmiana stawki zostawi
 * tę stronę, którą ustalił człowiek (CLAUDE.md §1). Kwoty z backendu, nie przeliczane.
 */
export const priceFromService = (service: {
    id: string;
    serviceName: string;
    vatRate: number | null | undefined;
    basePriceGross?: number | null;
    finalPriceNet: number | null;
    finalPriceGross: number | null;
}): HandoverPrice => {
    const net = service.finalPriceNet ?? 0;
    const gross = service.finalPriceGross ?? 0;
    const vatRate = invoiceRateOf(service.vatRate, net, gross);
    return {
        serviceId: service.id,
        name: service.serviceName,
        net: toPln(net),
        gross: toPln(gross),
        mode: service.basePriceGross != null ? 'GROSS' : 'NET',
        vatRate,
        originalNet: net,
        originalGross: gross,
        originalRate: vatRate,
    };
};

/** Czy cena albo stawka usługi różni się od tej, z którą przyszła na ekran. */
export const priceChanged = (price: HandoverPrice): boolean =>
    price.vatRate !== price.originalRate ||
    (price.mode === 'GROSS' ? parsePln(price.gross) !== price.originalGross : parsePln(price.net) !== price.originalNet);

/** Kwoty usługi w groszach; bez zmiany dokładnie te z backendu. */
export const priceAmounts = (price: HandoverPrice): { net: number; gross: number } =>
    priceChanged(price) ? itemAmounts(price) : { net: price.originalNet, gross: price.originalGross };

/** Suma cen usług (to, co klient zapłaci). */
export const totalsOf = (prices: HandoverPrice[]): { net: number; gross: number; vat: number } => {
    const net = prices.reduce((sum, p) => sum + priceAmounts(p).net, 0);
    const gross = prices.reduce((sum, p) => sum + priceAmounts(p).gross, 0);
    return { net, gross, vat: gross - net };
};

/** Suma cen sprzed zmian przy wydaniu. */
export const originalGrossOf = (prices: HandoverPrice[]): number =>
    prices.reduce((sum, p) => sum + p.originalGross, 0);

/**
 * Edycja ceny usługi: wpisane netto → NET, brutto → GROSS; zmiana stawki zostawia
 * stronę ustaloną i przelicza drugą.
 */
export const updatePrice = (price: HandoverPrice, changes: Partial<Pick<HandoverPrice, 'net' | 'gross' | 'vatRate'>>): HandoverPrice => {
    const next: HandoverPrice = { ...price, ...changes };
    if (changes.net !== undefined) next.mode = 'NET';
    if (changes.gross !== undefined) next.mode = 'GROSS';
    return withDerived(next) as HandoverPrice;
};

/** Zmiany cen do wysłania: tylko usługi wizyty, których cena albo stawka się zmieniła. */
export const toPriceChanges = (prices: HandoverPrice[]): HandoverPriceChangePayload[] =>
    prices.filter(price => !price.added && priceChanged(price)).map(price => {
        const { net, gross } = itemAmounts(price);
        return {
            serviceItemId: price.serviceId,
            netCents: net,
            // Brutto tylko wtedy, gdy człowiek ustalił cenę od strony brutto (CLAUDE.md §1).
            grossCents: price.mode === 'GROSS' ? gross : null,
            vatRate: vatRateNumberOf(price.vatRate),
        };
    });

/** Pozycje dopisane przy wydaniu do wysłania - backend zakłada z nich usługi wizyty. */
export const toAddedServices = (prices: HandoverPrice[], lines: InvoiceLine[]): HandoverAddedServicePayload[] =>
    prices.filter(price => price.added).map(price => {
        const { net, gross } = itemAmounts(price);
        const line = lines.find(l => l.serviceIds.includes(price.serviceId));
        return {
            id: price.serviceId,
            name: (line?.name ?? price.name).trim(),
            netCents: net,
            grossCents: price.mode === 'GROSS' ? gross : null,
            vatRate: vatRateNumberOf(price.vatRate),
        };
    });

const newId = (): string =>
    typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
        ? crypto.randomUUID()
        : 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
            const r = (Math.random() * 16) | 0;
            return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
        });

/**
 * Nowa pozycja na fakturze: pusta usługa (0 zł, 23%) i pozycja, która ją obejmuje.
 * Kwotę wpisuje się w polu pozycji, tak jak każdą inną (patrz [settlementPlan]).
 */
export const newInvoiceLine = (): { price: HandoverPrice; line: InvoiceLine } => {
    const id = newId();
    return {
        price: {
            serviceId: id, name: '', net: '0,00', gross: '0,00', mode: 'GROSS', vatRate: '23',
            originalNet: 0, originalGross: 0, originalRate: '23', added: true,
        },
        line: { name: '', serviceIds: [id], partialGross: '' },
    };
};

// ─── Pozycje faktury ─────────────────────────────────────────────────────────

/** Jedna pozycja na usługę - punkt wyjścia faktury. */
export const linesFromPrices = (prices: HandoverPrice[]): InvoiceLine[] =>
    prices.map(price => ({ name: price.name, serviceIds: [price.serviceId], partialGross: '' }));

const sourcesOf = (line: InvoiceLine, prices: HandoverPrice[]): HandoverPrice[] =>
    line.serviceIds.map(id => prices.find(p => p.serviceId === id)).filter((p): p is HandoverPrice => Boolean(p));

/** Brutto wszystkich usług pozycji. */
export const lineFullGross = (line: InvoiceLine, prices: HandoverPrice[]): number =>
    sourcesOf(line, prices).reduce((sum, p) => sum + priceAmounts(p).gross, 0);

/** Pozycja łączy usługi, które mają teraz różne stawki VAT (np. zmieniono stawkę po scaleniu). */
export const lineRatesMixed = (line: InvoiceLine, prices: HandoverPrice[]): boolean =>
    new Set(sourcesOf(line, prices).map(p => p.vatRate)).size > 1;

/** Kwota pozycji na fakturze przy podziale: wpisana albo null (= cała kwota usług). */
const partialOf = (line: InvoiceLine, full: number, split: boolean): number | null => {
    if (!split || !line.partialGross.trim()) return null;
    const partial = parsePln(line.partialGross);
    return partial < full ? partial : null;
};

/**
 * Pozycja faktury jako kwoty. Jedna usługa idzie w swojej stronie ceny (netto usługi
 * zostaje netto faktury); scalenie usług od netta - sumą netto; pozostałe i kwota
 * częściowa - brutto.
 */
export const lineAmounts = (line: InvoiceLine, prices: HandoverPrice[], split = false): HandoverItem => {
    const sources = sourcesOf(line, prices);
    const vatRate = sources[0]?.vatRate ?? '23';
    const full = sources.reduce((sum, p) => sum + priceAmounts(p).gross, 0);
    const partial = partialOf(line, full, split);
    if (partial !== null) {
        return withDerived({ name: line.name, net: '', gross: toPln(partial), mode: 'GROSS', vatRate });
    }
    if (sources.length === 1) {
        const { net, gross } = priceAmounts(sources[0]);
        return { name: line.name, net: toPln(net), gross: toPln(gross), mode: sources[0].mode, vatRate };
    }
    if (sources.length > 0 && sources.every(p => p.mode === 'NET')) {
        const net = sources.reduce((sum, p) => sum + priceAmounts(p).net, 0);
        return withDerived({ name: line.name, net: toPln(net), gross: '', mode: 'NET', vatRate });
    }
    return withDerived({ name: line.name, net: '', gross: toPln(full), mode: 'GROSS', vatRate });
};

/**
 * Rozkład kwoty na części proporcjonalne do wag metodą największej reszty - suma części
 * równa kwocie co do grosza (ten sam rozkład co SettlementAllocator.distribute na backendzie).
 * Wagi zerowe dostają zero; gdy wszystkie są zerowe, całość dostaje pierwsza pozycja.
 */
export const distributeCents = (total: number, weights: number[]): number[] => {
    if (weights.length === 0) return [];
    const sign = total < 0 ? -1 : 1;
    const amount = Math.abs(total);
    const sum = weights.reduce((a, b) => a + b, 0);
    if (sum === 0) return weights.map((_, i) => (i === 0 ? total : 0));
    const exact = weights.map(w => (amount * w) / sum);
    const parts = exact.map(Math.floor);
    let left = amount - parts.reduce((a, b) => a + b, 0);
    const order = exact.map((e, i) => ({ i, r: e - Math.floor(e) })).sort((a, b) => b.r - a.r);
    for (const { i } of order) {
        if (left <= 0) break;
        if (weights[i] === 0) continue;
        parts[i] += 1;
        left -= 1;
    }
    return parts.map(p => p * sign);
};

/**
 * Rozliczenie „faktura + inny dokument”: co trafi na fakturę, ile na inny dokument i jakie
 * ceny usług wizyty z tego wynikają.
 *
 * Zasady (decyzja biznesu z 21.10.2026):
 *  - wszystkie pozycje idą na fakturę; pozycja może mieć kwotę niższą albo wyższą niż jej usługi,
 *  - wyższa kwota na fakturze podnosi cenę usług wizyty do tej kwoty,
 *  - inny dokument jest bez paragonu i bez VAT, więc domyślnie niesie NETTO części usług poza
 *    fakturą (123 zł brutto, 50 zł na fakturze → 59,35 zł, a nie 73 zł),
 *  - kwotę innego dokumentu można wpisać; inna niż wyliczona zmienia cenę wizyty tak, żeby
 *    netto faktury + inny dokument = netto wizyty (tak samo liczy backend).
 */
export interface SettlementPlan {
    /** Ceny usług wizyty po rozliczeniu - to one idą jako zmiany cen przy wydaniu. */
    prices: HandoverPrice[];
    /** Pozycje faktury z kwotami, ustalone przed zmianą cen przez kwotę innego dokumentu. */
    invoice: Array<{ line: InvoiceLine; item: HandoverItem }>;
    invoiceGross: number;
    invoiceNet: number;
    /** Kwota innego dokumentu (bez VAT). */
    remainder: number;
    /** Kwota wyliczona: netto części usług poza fakturą. */
    remainderAuto: number;
    /** Nazwy usług, których cenę podnosi wyższa kwota na fakturze. */
    raisedByInvoice: string[];
    /** Problem, przez który rozliczenia nie da się wykonać; null = w porządku. */
    problem: string | null;
}

/** Brutto każdej usługi na fakturze: kwota pozycji rozłożona na jej usługi jak na backendzie. */
const invoicedGrossByService = (
    invoice: Array<{ line: InvoiceLine; item: HandoverItem }>,
    prices: HandoverPrice[],
): Map<string, number> => {
    const byService = new Map<string, number>();
    invoice.forEach(({ line, item }) => {
        const sources = sourcesOf(line, prices);
        const parts = distributeCents(itemAmounts(item).gross, sources.map(p => priceAmounts(p).gross));
        sources.forEach((p, i) => byService.set(p.serviceId, (byService.get(p.serviceId) ?? 0) + parts[i]));
    });
    return byService;
};

export const settlementPlan = (state: HandoverState): SettlementPlan => {
    const invoiceOf = (prices: HandoverPrice[]) =>
        state.lines
            .map(line => ({ line, item: lineAmounts(line, prices, state.splitRemainder) }))
            .filter(({ item }) => itemAmounts(item).gross > 0);

    if (!state.splitRemainder) {
        // Bez podziału kwota pozycji to cena jej usług: wpisana inna (wyższa albo niższa)
        // zmienia cenę usług w wizycie - pozycje faktury zastępują tu „Ceny usług”.
        let prices = state.prices;
        state.lines.forEach(line => {
            if (!line.partialGross.trim() || !isPlnInput(line.partialGross)) return;
            const typed = parsePln(line.partialGross);
            const sources = sourcesOf(line, prices);
            const full = sources.reduce((sum, p) => sum + priceAmounts(p).gross, 0);
            if (sources.length === 0 || typed === full) return;
            const grosses = sources.map(p => priceAmounts(p).gross);
            const parts = distributeCents(typed, grosses.every(g => g === 0) ? grosses.map(() => 1) : grosses);
            prices = prices.map(p => {
                const i = sources.findIndex(src => src.serviceId === p.serviceId);
                return i < 0 ? p : updatePrice(p, { gross: toPln(parts[i]) });
            });
        });
        const invoice = invoiceOf(prices);
        return {
            prices,
            invoice,
            invoiceGross: invoice.reduce((sum, { item }) => sum + itemAmounts(item).gross, 0),
            invoiceNet: invoice.reduce((sum, { item }) => sum + itemAmounts(item).net, 0),
            remainder: 0,
            remainderAuto: 0,
            raisedByInvoice: [],
            problem: null,
        };
    }

    // 1. Kwota na fakturze wyższa niż usługi pozycji podnosi ich cenę do tej kwoty.
    let prices = state.prices;
    const raisedByInvoice: string[] = [];
    state.lines.forEach(line => {
        if (!line.partialGross.trim()) return;
        const partial = parsePln(line.partialGross);
        const sources = sourcesOf(line, prices);
        const full = sources.reduce((sum, p) => sum + priceAmounts(p).gross, 0);
        if (sources.length === 0 || partial <= full) return;
        const grosses = sources.map(p => priceAmounts(p).gross);
        const parts = distributeCents(partial, grosses.every(g => g === 0) ? grosses.map(() => 1) : grosses);
        prices = prices.map(p => {
            const i = sources.findIndex(s => s.serviceId === p.serviceId);
            return i < 0 ? p : updatePrice(p, { gross: toPln(parts[i]) });
        });
        raisedByInvoice.push(...sources.map(p => p.name));
    });

    // 2. Faktura - jej kwoty są odtąd ustalone.
    const invoice = invoiceOf(prices);
    const invoiceGross = invoice.reduce((sum, { item }) => sum + itemAmounts(item).gross, 0);
    const invoiceNet = invoice.reduce((sum, { item }) => sum + itemAmounts(item).net, 0);
    const remainderAuto = Math.max(0, totalsOf(prices).net - invoiceNet);

    // 3. Kwota innego dokumentu wpisana przez człowieka.
    const typed = (state.remainderInput ?? '').trim();
    const remainder = typed ? parsePln(typed) : remainderAuto;
    if (remainder === remainderAuto) {
        return { prices, invoice, invoiceGross, invoiceNet, remainder, remainderAuto, raisedByInvoice, problem: null };
    }

    const invoiced = invoicedGrossByService(invoice, prices);
    const uncovered = prices.map(p => Math.max(0, priceAmounts(p).gross - (invoiced.get(p.serviceId) ?? 0)));
    if (remainder === 0) {
        // Nic na innym dokumencie: usługi kosztują dokładnie tyle, ile mają na fakturze.
        prices = prices.map((p, i) =>
            uncovered[i] > 0 ? updatePrice(p, { gross: toPln(invoiced.get(p.serviceId) ?? 0) }) : p);
    } else {
        // Różnica idzie na usługi poza fakturą (a gdy takich nie ma - na wszystkie), od strony
        // netto: kwota innego dokumentu jest netto, więc netto wizyty zgadza się co do grosza.
        const weights = uncovered.some(u => u > 0) ? uncovered : prices.map(p => priceAmounts(p).gross);
        const shifts = distributeCents(remainder - remainderAuto, weights);
        prices = prices.map((p, i) =>
            shifts[i] === 0 ? p : updatePrice(p, { net: toPln(priceAmounts(p).net + shifts[i]) }));
    }
    const negative = prices.find(p => priceAmounts(p).net < 0);
    return {
        prices,
        invoice,
        invoiceGross,
        invoiceNet,
        remainder,
        remainderAuto,
        raisedByInvoice,
        problem: negative ? `Kwota innego dokumentu jest za niska: cena „${negative.name}” spadłaby poniżej zera.` : null,
    };
};

/** Pozycje, które trafią na fakturę, z usługami. */
export const invoiceLinesOf = (state: HandoverState): Array<{ line: InvoiceLine; item: HandoverItem }> =>
    settlementPlan(state).invoice;

export const invoiceItemsOf = (state: HandoverState): HandoverItem[] => invoiceLinesOf(state).map(({ item }) => item);

/**
 * Scalenie zaznaczonych pozycji w jedną. Jedna pozycja ma jedną stawkę, więc scalić
 * można tylko usługi tej samej stawki - scalenie 8% z 23% zmieniało po cichu podatek.
 * Zwraca nowe pozycje albo komunikat, dlaczego się nie da.
 */
export const mergeLines = (lines: InvoiceLine[], indexes: number[], prices: HandoverPrice[]): InvoiceLine[] | string => {
    const picked = indexes.map(i => lines[i]).filter(Boolean);
    if (picked.length < 2) return 'Zaznacz co najmniej dwie pozycje.';
    const rates = new Set(picked.flatMap(line => sourcesOf(line, prices).map(p => p.vatRate)));
    if (rates.size > 1) return 'Scalić można tylko usługi z tą samą stawką VAT.';
    const names = picked.map(line => line.name.trim()).filter(Boolean).join(', ');
    const merged: InvoiceLine = {
        name: names.length > 200 ? `${names.slice(0, 197)}...` : names,
        serviceIds: picked.flatMap(line => line.serviceIds),
        partialGross: '',
    };
    const first = Math.min(...indexes);
    return lines.flatMap((line, i) => (i === first ? [merged] : indexes.includes(i) ? [] : [line]));
};

/** Rozdzielenie scalonej pozycji z powrotem na usługi. */
export const unmergeLine = (lines: InvoiceLine[], index: number, prices: HandoverPrice[]): InvoiceLine[] =>
    lines.flatMap((line, i) =>
        i !== index
            ? [line]
            : sourcesOf(line, prices).map(p => ({ name: p.name, serviceIds: [p.serviceId], partialGross: '' }))
    );

/** Pozycje ułożone dokładnie jak usługi (bez scaleń i podziału). */
export const linesMatchServices = (lines: InvoiceLine[], prices: HandoverPrice[]): boolean =>
    lines.length === prices.length &&
    lines.every((line, i) => line.serviceIds.length === 1 && line.serviceIds[0] === prices[i].serviceId &&
        line.name.trim() === prices[i].name.trim() && !line.partialGross.trim());

// ─── Walidacja ────────────────────────────────────────────────────────────────

export interface HandoverProblem {
    /** Sekcja, przy której należy pokazać komunikat, nie w banerze na górze. */
    section: 'seller' | 'buyer' | 'prices' | 'items' | 'balance';
    message: string;
}

interface ValidateArgs {
    state: HandoverState;
    sellerComplete: boolean;
    /** „Faktury wystawia księgowość": CRM nie wystawia faktury - zostaje nabywca i ceny. */
    invoicedExternally?: boolean;
}

/** Ceny usług: każda musi być kwotą (zero to usługa gratis, ujemnej nie ma). */
export const priceProblems = (prices: HandoverPrice[]): HandoverProblem[] =>
    prices.flatMap(price => {
        const typed = price.mode === 'GROSS' ? price.gross : price.net;
        return !typed.trim() || !isPlnInput(typed)
            ? [{ section: 'prices' as const, message: `${price.name}: podaj cenę.` }]
            : [];
    });

/**
 * Wszystkie realne przeszkody w wydaniu. Pusta lista = przycisk aktywny. Walidacja
 * odpowiada backendowej (CompleteVisitInvoiceOrchestrator).
 */
export const validateHandover = ({
    state,
    sellerComplete,
    invoicedExternally = false,
}: ValidateArgs): HandoverProblem[] => {
    const problems: HandoverProblem[] = [...priceProblems(state.prices)];
    if (state.documentType !== 'INVOICE') return problems;
    if (invoicedExternally) return [...problems, ...buyerProblems(state)];

    if (!sellerComplete) {
        problems.push({
            section: 'seller',
            message: 'Uzupełnij nazwę i NIP swojej firmy, bez nich faktura nie przejdzie do KSeF.',
        });
    }

    state.lines.forEach((line, index) => {
        if (!line.name.trim()) {
            problems.push({ section: 'items', message: `Pozycja ${index + 1}: podaj nazwę.` });
        }
        const added = line.serviceIds.some(id => state.prices.find(p => p.serviceId === id)?.added);
        if (added && !(parsePln(line.partialGross) > 0)) {
            problems.push({ section: 'items', message: `Pozycja ${index + 1}: podaj kwotę.` });
        }
        if (lineRatesMixed(line, state.prices)) {
            problems.push({
                section: 'items',
                message: `Pozycja ${index + 1} łączy usługi z różnymi stawkami VAT. Rozdziel ją.`,
            });
        }
        if (line.partialGross.trim() && !isPlnInput(line.partialGross)) {
            problems.push({ section: 'items', message: `Pozycja ${index + 1}: podaj kwotę na fakturze.` });
        }
    });

    const plan = settlementPlan(state);
    if (state.splitRemainder && (state.remainderInput ?? '').trim() && !isPlnInput(state.remainderInput)) {
        problems.push({ section: 'balance', message: 'Inny dokument: podaj kwotę.' });
    }
    if (plan.problem) problems.push({ section: 'balance', message: plan.problem });

    const invoiceItems = plan.invoice.map(({ item }) => item);
    if (invoiceItems.some(item => item.vatRate === 'zw') && !state.exemptionBasis.trim()) {
        problems.push({
            section: 'items',
            message: 'Stawka „zw" wymaga podania podstawy prawnej zwolnienia z VAT.',
        });
    }
    if (invoiceItems.length === 0 && totalsOf(state.prices).gross > 0) {
        problems.push({
            section: 'balance',
            message: state.splitRemainder
                ? 'Wpisz kwotę na fakturze przynajmniej w jednej pozycji.'
                : 'Faktura musi mieć co najmniej jedną pozycję z kwotą.',
        });
    }

    problems.push(...buyerProblems(state));
    return problems;
};

/**
 * Co jest nie tak z NIP-em nabywcy; null, gdy pole puste (konsument) albo NIP poprawny.
 * Sama długość nie wystarcza: KSeF przyjął fakturę na NIP z błędną sumą kontrolną,
 * a faktura w KSeF trafia na konto podatnika o tym numerze - czyli do obcej firmy.
 */
export const nipProblem = (raw: string): string | null => {
    const nip = normalizeNip(raw);
    if (!nip) return null;
    if (nip.length !== 10) return 'NIP nabywcy musi mieć 10 cyfr.';
    if (!validatePolishNip(nip)) return 'NIP nabywcy ma błędną sumę kontrolną - sprawdź cyfry.';
    return null;
};

const buyerProblems = (state: HandoverState): HandoverProblem[] => {
    const problems: HandoverProblem[] = [];
    const nip = normalizeNip(state.buyer.nip);
    const invalidNip = nipProblem(state.buyer.nip);
    if (invalidNip) {
        problems.push({ section: 'buyer', message: invalidNip });
    }
    if (!nip && !state.buyer.name.trim()) {
        problems.push({
            section: 'buyer',
            message: 'Faktura dla konsumenta wymaga imienia i nazwiska nabywcy.',
        });
    }
    return problems;
};

/**
 * Stan ekranu → payload faktury dla POST /visits/{id}/complete. Pozycje wskazują usługi,
 * które obejmują (alokacja usługa × dokument). Reszta przy podziale to zawsze zapis bez
 * paragonu i bez VAT, gotówką (decyzja biznesu z 20.10.2026), na kwotę z [settlementPlan].
 */
export const toInvoicePayload = (state: HandoverState, sendToKsef: boolean): CompleteInvoicePayload => {
    const plan = settlementPlan(state);
    const lines = plan.invoice;
    const remainder = plan.remainder;
    const nip = normalizeNip(state.buyer.nip);

    return {
        items: lines.map(({ line, item }) => ({
            name: item.name.trim(),
            quantity: 1,
            ...(item.mode === 'GROSS'
                ? { unitPriceGross: parsePln(item.gross) }
                : { unitPriceNet: parsePln(item.net) }),
            vatRate: item.vatRate,
            sourceServiceItemIds: line.serviceIds,
        })),
        buyerNip: nip || undefined,
        buyerName: state.buyer.name.trim() || undefined,
        buyerAddressLine1: state.buyer.addressLine1.trim() || undefined,
        buyerAddressLine2: state.buyer.addressLine2.trim() || undefined,
        buyerEmail: state.buyer.email.trim() || undefined,
        remainderPaymentMethod: remainder > 0 ? 'CASH' : undefined,
        remainderWithoutReceipt: remainder > 0 ? true : undefined,
        // Kwota, którą widział człowiek - backend sprawdza ją z cenami wizyty (±1 gr).
        remainderAmount: remainder > 0 ? remainder : undefined,
        exemptionLegalBasis: lines.some(({ item }) => item.vatRate === 'zw') ? state.exemptionBasis.trim() : undefined,
        sendToKsef,
    };
};

// ─── Stawki ──────────────────────────────────────────────────────────────────

/** Brutto pozycji w podziale na stawki VAT. */
export const grossByRate = (items: HandoverItem[]): Map<VatRateCode, number> => {
    const byRate = new Map<VatRateCode, number>();
    items.forEach(item => byRate.set(item.vatRate, (byRate.get(item.vatRate) ?? 0) + itemAmounts(item).gross));
    return byRate;
};

/** VAT pozycji: różnica brutto i netto (CLAUDE.md §1). */
export const vatOfItems = (items: HandoverItem[]): number =>
    items.reduce((sum, item) => {
        const { net, gross } = itemAmounts(item);
        return sum + gross - net;
    }, 0);

export const RATE_LABEL: Record<VatRateCode, string> = { '23': '23%', '8': '8%', '5': '5%', '0': '0%', zw: 'zw.' };
