import { MAX_2_DECIMALS } from '@/common/utils/moneyInput';
import { netToGross } from '@/common/utils/priceAdjustment';
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
 *
 * Ekran wydania liczy odcisk z pozycji ROZLICZENIA (settledPrice), a nie ze wszystkich
 * usług: zatwierdzenie zmiany czekającej na zgodę klienta zmienia to, co trafia na
 * fakturę, choć sama lista usług stoi w miejscu.
 */
export const servicesFingerprint = <T extends { id: string; serviceName: string; vatRate?: number | null }>(
    services: T[],
    grossOf: (service: T) => number
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

export const toPln = (grosz: number): string => (grosz / 100).toFixed(2);

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

// ─── Kwota rozliczenia: reguła backendu ───────────────────────────────────────

/** Pola usługi wizyty, od których zależy, czy i za ile wchodzi do rozliczenia. */
export interface SettlementInput {
    status: 'CONFIRMED' | 'PENDING' | 'APPROVED' | 'REJECTED';
    pendingOperation?: 'ADD' | 'EDIT' | 'DELETE' | null;
    previousPriceNet?: number | null;
    previousPriceGross?: number | null;
    vatRate: number | null | undefined;
}

/** Kwoty, za które usługa wchodzi do rozliczenia, i stawka, przy której obowiązują. */
export interface SettledPrice {
    finalPriceNet: number;
    finalPriceGross: number;
    /** null = stawki tych kwot nie znamy (patrz previousPriceRate); faktura weźmie ją z proporcji. */
    vatRate: number | null;
}

/**
 * Stawka ceny sprzed zmiany czekającej na zgodę klienta.
 *
 * API przysyła z migawki (confirmedSnapshot) tylko KWOTY, a stawka przy usłudze to już
 * stawka NOWEJ ceny - zmiana mogła ją przestawić. Obecna stawka obowiązuje więc tylko
 * wtedy, gdy pasuje do kwot sprzed zmiany z tolerancją 1 gr (ten sam niezmiennik pary
 * netto/brutto co na serwerze: brutto wpisane od strony brutto mija netto × stawka
 * o najwyżej grosz). Inaczej null, a stawkę pozycji faktury da proporcja kwot.
 */
const previousPriceRate = (vatRate: number | null | undefined, net: number, gross: number): number | null =>
    vatRate != null && Math.abs(netToGross(net, vatRate) - gross) <= 1 ? vatRate : null;

/**
 * Za ile usługa wchodzi do paragonu albo faktury wydania. To reguła `Visit.settledGross`
 * (i `calculateTotalNet`) z backendu, 1:1 - na tę kwotę serwer wystawia dokument
 * i z nią porównuje fakturę („Kwota faktury przekracza kwotę wizyty"):
 *
 *  - CONFIRMED, APPROVED → cena bieżąca,
 *  - PENDING / EDIT      → cena sprzed zmiany (migawka, w API `previousPrice*`): nowej
 *                          klient jeszcze nie przyjął; bez migawki pozycja wypada, jak na serwerze,
 *  - PENDING / DELETE    → cena bieżąca: usunięcia też nikt jeszcze nie przyjął,
 *  - PENDING / ADD, PENDING bez operacji, REJECTED → nie wchodzi (null).
 *
 * Ekran wydania sumował wcześniej wszystkie pozycje: pokazywał 2200 zł, sprzedawca tyle
 * pobierał, a paragon wychodził na 1900 zł. Na fakturze serwer odrzucał wydanie, bo
 * pozycje zasiane z usług przekraczały kwotę wizyty.
 *
 * [current] to cena bieżąca ze wspólnej wyceny (dokładne brutto, CLAUDE.md §1). Status,
 * a nie `hasPendingChange`, bo to po statusie rozstrzyga serwer.
 */
export const settledPrice = (
    service: SettlementInput,
    current: { finalPriceNet: number; finalPriceGross: number },
): SettledPrice | null => {
    const atCurrentPrice: SettledPrice = {
        finalPriceNet: current.finalPriceNet,
        finalPriceGross: current.finalPriceGross,
        vatRate: service.vatRate ?? null,
    };
    switch (service.status) {
        case 'CONFIRMED':
        case 'APPROVED':
            return atCurrentPrice;
        case 'PENDING': {
            if (service.pendingOperation === 'DELETE') return atCurrentPrice;
            if (service.pendingOperation !== 'EDIT') return null;
            const net = service.previousPriceNet;
            const gross = service.previousPriceGross;
            if (net == null || gross == null) return null;
            return { finalPriceNet: net, finalPriceGross: gross, vatRate: previousPriceRate(service.vatRate, net, gross) };
        }
        default:
            return null;
    }
};

/** Pozycja rozliczenia: usługa i kwoty, za które wchodzi do dokumentu. */
export interface SettledLine<S> {
    service: S;
    price: SettledPrice;
}

/**
 * Pozycje, które wchodzą do rozliczenia, w kolejności usług wizyty. Sumy, pozycje
 * faktury i odcisk draftu biorą się z TEJ listy - gdyby każde liczyło po swojemu,
 * faktura nie domknęłaby się z kwotą wizyty co do grosza.
 */
export const settledLines = <S extends SettlementInput>(
    services: S[],
    priceOf: (service: S) => { finalPriceNet: number; finalPriceGross: number },
): SettledLine<S>[] =>
    services.flatMap(service => {
        const price = settledPrice(service, priceOf(service));
        return price ? [{ service, price }] : [];
    });

/** Sumy rozliczenia; VAT to różnica pokazanych kwot, nie osobne mnożenie (CLAUDE.md §1). */
export const settledTotals = (lines: Array<{ price: SettledPrice }>): { net: number; gross: number; vat: number } => {
    const net = lines.reduce((sum, line) => sum + line.price.finalPriceNet, 0);
    const gross = lines.reduce((sum, line) => sum + line.price.finalPriceGross, 0);
    return { net, gross, vat: gross - net };
};

/** Pozycja faktury z pozycji rozliczenia - kwoty i stawka tej ceny, która wchodzi do dokumentu. */
export const invoiceItemFromSettled = (line: SettledLine<{ serviceName: string }>): HandoverItem =>
    invoiceItemFromService({ serviceName: line.service.serviceName, vatRate: line.price.vatRate }, line.price);

/** Ile usług czeka na zgodę klienta - ich zmiana nie wchodzi do rozliczenia. */
export const pendingApprovalCount = (services: Array<{ status: SettlementInput['status'] }>): number =>
    services.filter(service => service.status === 'PENDING').length;

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
    if (remainder < 0) {
        problems.push({
            section: 'balance',
            message: 'Kwota faktury przekracza kwotę wizyty, obniż pozycje.',
        });
    } else if (remainder > 0 && !state.splitRemainder) {
        problems.push({
            section: 'balance',
            message: 'Kwota faktury jest niższa niż kwota wizyty. Wskaż, czym udokumentować resztę.',
        });
    }

    return problems;
};

const buyerProblems = (state: HandoverState): HandoverProblem[] => {
    const problems: HandoverProblem[] = [];
    const nip = normalizeNip(state.buyer.nip);
    if (nip && nip.length !== 10) {
        problems.push({ section: 'buyer', message: 'NIP nabywcy musi mieć 10 cyfr.' });
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
        exemptionLegalBasis: state.items.some(i => i.vatRate === 'zw')
            ? state.exemptionBasis.trim()
            : undefined,
        sendToKsef,
    };
};
