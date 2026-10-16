import { MAX_2_DECIMALS } from '@/common/utils/moneyInput';
import { validatePolishNip } from '@/common/utils/validators';
import type { PaymentMethod, InvoiceType, CompleteInvoicePayload } from './stateTransitions';

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
 * Pełny stan ekranu wydania. Zapisywany do localStorage, żeby zamknięcie okna
 * nie kasowało pracy: stary kreator czyścił wszystko w handleClose().
 */
export interface HandoverState {
    paymentMethod: PaymentMethod;
    documentType: InvoiceType;
    buyer: HandoverBuyer;
    items: HandoverItem[];
    /** Faktura pokrywa tylko część kwoty: reszta idzie osobnym dokumentem. */
    splitRemainder: boolean;
    remainderMethod: PaymentMethod;
    /**
     * Reszta bez paragonu i bez VAT: serwer zapisuje ją jako „inny” z VAT 0 i flagą
     * withoutReceipt. false = paragon na resztę.
     */
    remainderWithoutReceipt: boolean;
    exemptionBasis: string;
    /** Protokół podpisany papierowo. Trafia do payloadu jako signatureObtained. */
    protocolSigned: boolean;
    /**
     * Czy fakturę wysłać do KSeF. `null` = użytkownik nie ruszył przełącznika, więc
     * obowiązuje domyślna odpowiedź studia z ustawień. Trzymamy `null` zamiast
     * kopiować domyślną wartość, bo stan powstaje zanim ustawienia się wczytają -
     * skopiowana wartość byłaby zgadywaniem, które potem trudno odróżnić od wyboru.
     */
    sendToKsef: boolean | null;
    /**
     * Czy przy wydaniu wysłać klientowi podziękowanie. null = pracownik jeszcze nie
     * wybierał i obowiązuje „Domyślnie zaznacz" przy wiadomości „Podziękowanie po
     * wizycie" (patrz useHandover). Studio, które takich SMS-ów nie wysyła, w ogóle nie
     * zobaczy tego wyboru (patrz useThankYouSmsAvailability).
     */
    thankYouSms: boolean | null;
}

// ─── Draft ekranu wydania ─────────────────────────────────────────────────────

/**
 * Draft zapisywany w localStorage: stan wraz z odciskiem usług, na których
 * powstały pozycje faktury.
 */
export interface HandoverDraft {
    servicesFingerprint: string;
    state: HandoverState;
    /** Kiedy zapisano draft (ISO) - baner „Wróciły zmiany zapisane o …”. */
    savedAt?: string;
}

/**
 * Odcisk usług wizyty: identyfikator, nazwa, kwota brutto i stawka VAT każdej z nich.
 * Zmiana czegokolwiek z tej listy unieważnia pozycje faktury zapisane w draftcie,
 * bo to właśnie z tej listy powstały.
 *
 * Stawka należy do odcisku, bo pozycja faktury bierze ją z usługi (invoiceRateOf),
 * a zmiana stawki przy cenie wpisanej w brutto brutta nie zmienia - draft wracałby
 * ze starą stawką. Drafty sprzed dodania stawki mają inny odcisk, więc ich pozycje
 * (w tym „0%" zgadnięte dla usług zwolnionych zamiast „zw") powstają od nowa.
 */
export const servicesFingerprint = (
    services: Array<{ id: string; serviceName: string; vatRate?: number | null }>,
    grossOf: (service: { id: string; serviceName: string }) => number
): string =>
    services
        .map(service => `${service.id}:${service.serviceName}:${grossOf(service)}:${service.vatRate ?? ''}`)
        .join('|');

/**
 * Stan początkowy ekranu z uwzględnieniem zapisanego draftu.
 *
 * Draft odtwarzamy w całości tylko wtedy, gdy dotyczy tej samej listy usług.
 * Inaczej pozycje sprzed zmiany wracałyby jako obraz wizyty, której już nie ma:
 * dopisanie usługi za 1200 zł kończyło się komunikatem „wizyta ma jedną pozycję
 * za 0 zł", bo odtwarzaliśmy nieaktualne pozycje zamiast przeliczyć je od nowa.
 * Zachowujemy z draftu tylko to, czego usługi nie dotyczą - nabywcę i wybory
 * dotyczące zapłaty - żeby ręcznie wpisane dane nie przepadały.
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
        // Uszkodzony draft nie może blokować wydania, startujemy od nowa.
        return fresh;
    }
    if (!draft?.state) return fresh;

    if (draft.servicesFingerprint !== fingerprint) {
        return {
            ...fresh,
            buyer: draft.state.buyer ?? fresh.buyer,
            paymentMethod: draft.state.paymentMethod ?? fresh.paymentMethod,
            documentType: draft.state.documentType ?? fresh.documentType,
            sendToKsef: draft.state.sendToKsef ?? fresh.sendToKsef,
            // Decyzja o podziękowaniu nie zależy od pozycji faktury, więc przeżywa
            // także wtedy, gdy usługi wizyty zmieniły się od zapisania draftu.
            thankYouSms: draft.state.thankYouSms ?? fresh.thankYouSms,
        };
    }
    /*
     * Sam wybór „wysyłać / nie wysyłać" przeżywa draft bez zastrzeżeń — to decyzja
     * człowieka. Termin nie przeżywał i nie musi już przeżywać: nie ma go w stanie,
     * bo wylicza go serwer w chwili wydania pojazdu.
     */
    return { ...fresh, ...draft.state };
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

/**
 * Pozycja faktury z usługi wizyty. Autorytatywne jest brutto końcowe usługi (tryb GROSS),
 * czyli kwota uzgodniona z klientem; netto wynika z niego „w stu", jak na backendzie.
 * Przy 5/8/23% daje to z powrotem dokładnie netto usługi, także gdy jej brutto policzono
 * z netta, więc żadna ze stron ceny nie drgnie.
 */
export const invoiceItemFromService = (
    service: { serviceName: string; vatRate: number | null | undefined },
    pricing: { finalPriceNet: number; finalPriceGross: number }
): HandoverItem =>
    withDerived({
        name: service.serviceName,
        net: '',
        gross: toPln(pricing.finalPriceGross),
        mode: 'GROSS',
        vatRate: invoiceRateOf(service.vatRate, pricing.finalPriceNet, pricing.finalPriceGross),
    });

export const invoiceGrossOf = (items: HandoverItem[]): number =>
    items.reduce((sum, item) => sum + itemAmounts(item).gross, 0);

export const normalizeNip = (value: string): string => value.replace(/[^0-9]/g, '');

/** Formatuje NIP do postaci 123-456-78-90; nieprawidłowy zwraca bez zmian. */
export const formatNip = (value: string): string => {
    const digits = normalizeNip(value);
    if (digits.length !== 10) return value;
    return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6, 8)}-${digits.slice(8)}`;
};

// ─── Walidacja ────────────────────────────────────────────────────────────────

export interface HandoverProblem {
    /** Sekcja, przy której należy pokazać komunikat, nie w banerze na górze. */
    section: 'seller' | 'buyer' | 'items' | 'balance';
    message: string;
}

interface ValidateArgs {
    state: HandoverState;
    visitGross: number;
    sellerComplete: boolean;
    /**
     * „Faktury wystawia księgowość": CRM nie wystawia faktury, więc nie sprawdza
     * danych sprzedawcy, pozycji ani bilansu - fakturę na kwotę wizyty układa księgowość.
     * Zostaje nabywca, bo to jemu księgowość wystawi fakturę.
     */
    invoicedExternally?: boolean;
}

/**
 * Zwraca wszystkie realne przeszkody w wydaniu. Pusta lista = przycisk aktywny.
 * Walidacja jest identyczna z backendową (CompleteVisitInvoiceOrchestrator),
 * żeby użytkownik nie dowiadywał się o problemie dopiero z odpowiedzi serwera.
 */
export const validateHandover = ({
    state,
    visitGross,
    sellerComplete,
    invoicedExternally = false,
}: ValidateArgs): HandoverProblem[] => {
    if (state.documentType !== 'INVOICE') return [];
    if (invoicedExternally) return buyerProblems(state);

    const problems: HandoverProblem[] = [];

    if (!sellerComplete) {
        problems.push({
            section: 'seller',
            message: 'Uzupełnij nazwę i NIP swojej firmy, bez nich faktura nie przejdzie do KSeF.',
        });
    }

    state.items.forEach((item, index) => {
        const missing = [
            !item.name.trim() && 'nazwę',
            itemAmounts(item).gross <= 0 && 'kwotę',
        ].filter((part): part is string => Boolean(part));

        if (missing.length > 0) {
            problems.push({ section: 'items', message: `Pozycja ${index + 1}: podaj ${missing.join(' i ')}.` });
        }
    });

    if (state.items.some(item => item.vatRate === 'zw') && !state.exemptionBasis.trim()) {
        problems.push({
            section: 'items',
            message: 'Stawka „zw" wymaga podania podstawy prawnej zwolnienia z VAT.',
        });
    }

    problems.push(...buyerProblems(state));

    const remainder = visitGross - invoiceGrossOf(state.items);
    // Suma faktury i paragonu na resztę to zawsze kwota wizyty (backend pilnuje tego samego).
    if (remainder < 0) {
        problems.push({
            section: 'balance',
            message: 'Faktura nie może być wyższa niż kwota wizyty. Wyższą cenę ustawisz w usługach wizyty.',
        });
    } else if (remainder > 0 && !state.splitRemainder) {
        problems.push({
            section: 'balance',
            message: 'Faktura jest niższa niż kwota wizyty. Wybierz „Faktura + paragon” albo wróć do kwot z usług.',
        });
    }

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
 * Stan ekranu → payload faktury dla POST /visits/{id}/complete.
 *
 * [sendToKsef] przekazujemy jawnie (rozwiązane już z domyślnej wartości studia),
 * żeby na serwer poszła decyzja widoczna na ekranie, a nie druga interpretacja
 * tego samego ustawienia.
 */
export const toInvoicePayload = (
    state: HandoverState,
    visitGross: number,
    sendToKsef: boolean
): CompleteInvoicePayload => {
    const remainder = visitGross - invoiceGrossOf(state.items);
    const nip = normalizeNip(state.buyer.nip);

    return {
        // Kwota autorytatywna idzie w swoim trybie, backend liczy identycznie,
        // więc wpisana wartość nigdy nie „przeskakuje"
        items: state.items.map(item => ({
            name: item.name.trim(),
            quantity: 1,
            ...(item.mode === 'GROSS'
                ? { unitPriceGross: parsePln(item.gross) }
                : { unitPriceNet: parsePln(item.net) }),
            vatRate: item.vatRate,
        })),
        buyerNip: nip || undefined,
        buyerName: state.buyer.name.trim() || undefined,
        buyerAddressLine1: state.buyer.addressLine1.trim() || undefined,
        buyerAddressLine2: state.buyer.addressLine2.trim() || undefined,
        buyerEmail: state.buyer.email.trim() || undefined,
        remainderPaymentMethod: remainder > 0 ? state.remainderMethod : undefined,
        remainderWithoutReceipt: remainder > 0 && state.remainderWithoutReceipt ? true : undefined,
        exemptionLegalBasis: state.items.some(i => i.vatRate === 'zw')
            ? state.exemptionBasis.trim()
            : undefined,
        sendToKsef,
    };
};


// ─── Podział wizyty na fakturę i paragon ─────────────────────────────────────

/**
 * Czy pozycje faktury są tymi samymi pozycjami co usługi wizyty: ta sama liczba,
 * nazwy, kwoty brutto i netto oraz stawki. Etykieta „zgodnie z usługami wizyty”
 * pokazywała się dotąd, gdy zgadzała się sama SUMA - także po przesunięciu kwot
 * między pozycjami i zmianie stawki.
 */
export const itemsMatch = (a: HandoverItem[], b: HandoverItem[]): boolean =>
    a.length === b.length &&
    a.every((item, i) => {
        const other = b[i];
        const x = itemAmounts(item);
        const y = itemAmounts(other);
        return item.name.trim() === other.name.trim() && item.vatRate === other.vatRate &&
            x.gross === y.gross && x.net === y.net;
    });

/**
 * Pozycje faktury na zadaną kwotę brutto, proporcjonalnie do usług wizyty.
 *
 * Klient prosi o fakturę na część kwoty, a resztę płaci za paragonem. Każda usługa
 * dostaje swoją część kwoty faktury, więc stawki VAT zostają takie jak w usługach
 * (a paragon na resztę niesie resztę każdej stawki). Grosze z zaokrągleń trafiają
 * do pozycji z największą częścią ułamkową - suma jest równa kwocie co do grosza.
 * Pozycje, którym nie przypadł ani grosz, wypadają z faktury.
 */
export const scaleItemsToGross = (seed: HandoverItem[], targetGross: number): HandoverItem[] => {
    const grosses = seed.map(item => itemAmounts(item).gross);
    const total = grosses.reduce((sum, g) => sum + g, 0);
    if (total <= 0 || targetGross <= 0) return seed;
    if (targetGross >= total) return seed;

    const shares = grosses.map(g => (g * targetGross) / total);
    const floors = shares.map(Math.floor);
    let left = targetGross - floors.reduce((sum, v) => sum + v, 0);
    const order = shares
        .map((share, i) => ({ i, frac: share - Math.floor(share) }))
        .sort((a, b) => b.frac - a.frac || grosses[b.i] - grosses[a.i]);
    for (const { i } of order) {
        if (left <= 0) break;
        floors[i] += 1;
        left -= 1;
    }
    return seed
        .map((item, i) => withDerived({ ...item, mode: 'GROSS', gross: toPln(floors[i]) }))
        .filter((_, i) => floors[i] > 0);
};

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

export interface RateMismatch {
    /** Stawki usług wizyty, np. ['23%', '8%']. */
    serviceRates: string[];
    /** Stawki na fakturze. */
    invoiceRates: string[];
    /**
     * Różnica VAT (faktura − usługi) w groszach, gdy faktura obejmuje całą wizytę;
     * null przy fakturze na część kwoty, gdzie porównanie kwot nie ma sensu.
     */
    vatDifference: number | null;
}

/**
 * Czy stawki VAT na fakturze rozkładają się inaczej niż w usługach wizyty.
 *
 * Scalenie „powłoka 23% + tapicerka 8%” w jedną pozycję 23% przechodziło po cichu,
 * a zmieniało podatek (w testach KSeF: VAT 551,63 zł zamiast 517,75 zł przy tej samej
 * cenie). Przy fakturze na całość porównujemy kwoty każdej stawki, przy fakturze na
 * część - same stawki (faktura nie może mieć stawki, której nie ma żadna usługa).
 */
export const rateMismatch = (items: HandoverItem[], services: HandoverItem[]): RateMismatch | null => {
    const inv = grossByRate(items);
    const svc = grossByRate(services);
    const invoiceTotal = [...inv.values()].reduce((a, b) => a + b, 0);
    const servicesTotal = [...svc.values()].reduce((a, b) => a + b, 0);
    const whole = invoiceTotal === servicesTotal;
    const ratesDiffer = [...inv.keys()].some(rate => !svc.has(rate)) ||
        (whole && [...svc.keys()].some(rate => !inv.has(rate)));
    const amountsDiffer = whole && [...svc.entries()].some(([rate, gross]) => (inv.get(rate) ?? 0) !== gross);
    if (!ratesDiffer && !amountsDiffer) return null;
    const order: VatRateCode[] = ['23', '8', '5', '0', 'zw'];
    const labels = (map: Map<VatRateCode, number>) => order.filter(rate => map.has(rate)).map(rate => RATE_LABEL[rate]);
    return {
        serviceRates: labels(svc),
        invoiceRates: labels(inv),
        vatDifference: whole ? vatOfItems(items) - vatOfItems(services) : null,
    };
};

/**
 * Jedna pozycja na każdą stawkę VAT usług: suma brutto stawki zostaje, nazwa to nazwy
 * usług z tą stawką. Podpowiedź dla „chcę jedną pozycję”, która nie zmienia podatku.
 */
export const itemsPerRate = (services: HandoverItem[]): HandoverItem[] => {
    const groups = new Map<VatRateCode, HandoverItem[]>();
    services.forEach(item => groups.set(item.vatRate, [...(groups.get(item.vatRate) ?? []), item]));
    return [...groups.entries()].map(([vatRate, group]) => {
        const names = group.map(item => item.name.trim()).filter(Boolean).join(', ');
        const gross = group.reduce((sum, item) => sum + itemAmounts(item).gross, 0);
        return withDerived({
            name: names.length > 200 ? `${names.slice(0, 197)}...` : names,
            net: '',
            gross: toPln(gross),
            mode: 'GROSS',
            vatRate,
        });
    });
};
