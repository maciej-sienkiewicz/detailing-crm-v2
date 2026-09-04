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
 * Odcisk usług wizyty: identyfikator, nazwa i kwota brutto każdej z nich.
 * Zmiana czegokolwiek z tej listy unieważnia pozycje faktury zapisane w draftcie,
 * bo to właśnie z tej listy powstały.
 */
export const servicesFingerprint = (
    services: Array<{ id: string; serviceName: string }>,
    grossOf: (service: { id: string; serviceName: string }) => number
): string => services.map(service => `${service.id}:${service.serviceName}:${grossOf(service)}`).join('|');

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
        };
    }
    return { ...fresh, ...draft.state };
};

// ─── Arytmetyka kwot (grosze) ─────────────────────────────────────────────────

export const toPln = (grosz: number): string => (grosz / 100).toFixed(2);

export const parsePln = (value: string): number => {
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

/** Stawka wykryta z relacji brutto/netto usługi; przy braku dopasowania 23%. */
export const detectRate = (net: number, gross: number): VatRateCode => {
    if (net <= 0) return '23';
    const ratio = gross / net;
    if (Math.abs(ratio - 1.23) < 0.005) return '23';
    if (Math.abs(ratio - 1.08) < 0.005) return '8';
    if (Math.abs(ratio - 1.05) < 0.005) return '5';
    if (Math.abs(ratio - 1.0) < 0.005) return '0';
    return '23';
};

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
}

/**
 * Zwraca wszystkie realne przeszkody w wydaniu. Pusta lista = przycisk aktywny.
 * Walidacja jest identyczna z backendową (CompleteVisitInvoiceOrchestrator),
 * żeby użytkownik nie dowiadywał się o problemie dopiero z odpowiedzi serwera.
 */
export const validateHandover = ({ state, visitGross, sellerComplete }: ValidateArgs): HandoverProblem[] => {
    if (state.documentType !== 'INVOICE') return [];

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
