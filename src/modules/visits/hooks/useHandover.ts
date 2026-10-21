import { useCapability } from '@/modules/subscription';
import { useKsefAutomation } from '@/modules/finance/hooks';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { stateTransitionApi } from '../api/stateTransitionApi';
import { apiErrorMessage } from '../api/apiError';
import { visitKeys } from './index';
import { useVisitStateConflict } from './useVisitStateConflict';
import { companySettingsQuery } from '@/modules/settings/api/companySettingsQuery';
import { useToast } from '@/common/components/Toast';
import { localIsoDate } from '@/common/utils/localDate';
import { isPiiMasked } from '@/common/pii';
import { useThankYouSmsAvailability } from './useThankYouSmsAvailability';
import { useMessageDefaults } from '@/modules/message-templates/hooks/useMessageDefaults';
import { buildThankYouSmsPayload } from '../components/handover/thankYouSms';
import type { ServiceLineItem, Visit } from '../types';
import type { CompleteVisitResponse, PaymentMethod } from '../types/stateTransitions';
import {
    linesFromPrices,
    linesMatchServices,
    newInvoiceLine,
    overwrittenLines,
    pricesWithTypedAmounts,
    toAddedServices,
    normalizeNip,
    originalGrossOf,
    priceChanged,
    priceFromService,
    restoreDraft,
    servicesFingerprint,
    settlementPlan,
    toInvoicePayload,
    toPriceChanges,
    totalsOf,
    unmergeLine,
    updatePrice,
    validateHandover,
    type HandoverDraft,
    type HandoverPrice,
    type HandoverProblem,
    type HandoverState,
    type InvoiceLine,
    type VatRateCode,
} from '../types/handover';

// v5: kwota pozycji wpisywana od netto albo brutto (amount + amountMode, 21.10.2026).
const DRAFT_PREFIX = 'handover:v5:';
const LEGACY_DRAFT_PREFIXES = ['handover:v1:', 'handover:v2:', 'handover:v3:', 'handover:v4:'];
const DUE_DATE_DAYS = 14;

const draftKey = (visitId: string) => `${DRAFT_PREFIX}${visitId}`;

export const defaultDueDate = (): string => {
    const date = new Date();
    date.setDate(date.getDate() + DUE_DATE_DAYS);
    // Data lokalna, nie toISOString(): to drugie liczy w UTC i po północy dawało dzień mniej.
    return localIsoDate(date);
};

/**
 * Wartość nadająca się na fakturę.
 *
 * Pracownik bez uprawnienia do danych osobowych dostaje z backendu nieodwracalną
 * maskę `***` zamiast imienia czy e-maila. Taka wartość nigdy nie może trafić na
 * dokument, więc lepiej zostawić pole puste i pozwolić je uzupełnić.
 */
const invoiceSafe = (value: string | null | undefined): string =>
    value && !isPiiMasked(value) ? value : '';

/**
 * Adres z kartoteki → dwie linie adresu faktury (KSeF przyjmuje dokładnie dwie).
 */
const addressLines = (visit: Visit): { line1: string; line2: string } => {
    const address = visit.customer.companyAddress;
    if (!address) return { line1: '', line2: '' };
    return {
        line1: address.street?.trim() ?? '',
        line2: [address.postalCode, address.city]
            .map(part => part?.trim())
            .filter(Boolean)
            .join(' '),
    };
};

interface UseHandoverArgs {
    visit: Visit;
    isOpen: boolean;
}

/**
 * Stan i zapis ekranu wydania pojazdu.
 *
 * W przeciwieństwie do starego kreatora: stan przeżywa zamknięcie okna (draft
 * w localStorage), a po udanym wydaniu okno nie znika: zwracamy [result],
 * z którego widok potwierdzenia buduje akcje domykające (wysyłka do KSeF,
 * ponowna próba przy odrzuceniu).
 */
/** Usługa liczy się do kwoty wizyty - ta sama reguła co Visit.effectiveGrossAmount na backendzie. */
const countsTowardTotal = (service: ServiceLineItem): boolean =>
    service.status === 'CONFIRMED' || service.status === 'APPROVED';

export const useHandover = ({ visit, isOpen }: UseHandoverArgs) => {
    const queryClient = useQueryClient();
    const { showError, showInfo } = useToast();
    const handleStateConflict = useVisitStateConflict(visit.id);

    // Dane sprzedawcy pobierane RAZEM z otwarciem ekranu, nie dopiero przy
    // edycji faktury: brak NIP-u studia ma być widoczny zanim ktokolwiek
    // zacznie wydawać, a nie w ostatnim kliknięciu przy kliencie u lady.
    const { data: company, isLoading: isCompanyLoading } = useQuery({ ...companySettingsQuery(), enabled: isOpen });
    const sellerComplete = !!company?.name?.trim() && !!company?.taxId?.trim();

    // ── Usługi wizyty ────────────────────────────────────────────────────────
    // Kwoty z backendu (finalPriceNet/Gross), nie przeliczane drugi raz: osobna wycena
    // na froncie rozjeżdżała się o grosz z backendem i liczyła usługi odrzucone i czekające
    // na zgodę klienta, więc wydanie kończyło się „faktura przekracza kwotę wizyty".
    const countedServices = useMemo(() => visit.services.filter(countsTowardTotal), [visit.services]);
    const pendingServices = useMemo(() => visit.services.filter(s => s.status === 'PENDING'), [visit.services]);
    const currency = visit.totalCost?.currency ?? 'PLN';

    // ── Stan początkowy ──────────────────────────────────────────────────────
    const buildInitialState = useCallback((): HandoverState => {
        const prices = countedServices.map(priceFromService);
        const lines = addressLines(visit);
        return {
            paymentMethod: 'CARD',
            documentType: 'INVOICE',
            buyer: {
                nip: visit.customer.companyNip ?? '',
                name:
                    visit.customer.companyName ??
                    [visit.customer.firstName, visit.customer.lastName]
                        .map(invoiceSafe)
                        .filter(Boolean)
                        .join(' '),
                addressLine1: lines.line1,
                addressLine2: lines.line2,
                email: invoiceSafe(visit.customer.email),
            },
            prices,
            lines: linesFromPrices(prices),
            splitRemainder: false,
            remainderInput: '',
            exemptionBasis: '',
            protocolSigned: false,
            sendToKsef: null,
            // Stan początkowy z „Domyślnie zaznacz" (thankYouSmsChecked niżej) -
            // ustawienie dociera z sieci, więc tu tylko „pracownik jeszcze nie wybrał".
            thankYouSms: null,
        };
    }, [visit, countedServices]);

    // Odcisk usług, z których powstały ceny i pozycje - decyduje, czy zapisany draft
    // opisuje jeszcze tę samą wizytę (patrz restoreDraft).
    const fingerprint = useMemo(
        () => servicesFingerprint(countedServices, service =>
            countedServices.find(s => s.id === service.id)?.finalPriceGross ?? 0),
        [countedServices]
    );

    const [initial] = useState<{ state: HandoverState; restoredAt: string | null }>(() => {
        const fresh = buildInitialState();
        try {
            LEGACY_DRAFT_PREFIXES.forEach(prefix => window.localStorage.removeItem(`${prefix}${visit.id}`));
            const stored = window.localStorage.getItem(draftKey(visit.id));
            const restored = restoreDraft(fresh, stored, fingerprint);
            let savedAt: string | null = null;
            try {
                const draft = stored ? (JSON.parse(stored) as HandoverDraft) : null;
                if (draft?.servicesFingerprint === fingerprint) savedAt = draft.savedAt ?? '';
            } catch {
                savedAt = null;
            }
            const edited = restored.prices.some(priceChanged) || !linesMatchServices(restored.lines, restored.prices);
            return { state: restored, restoredAt: savedAt !== null && edited ? savedAt : null };
        } catch {
            return { state: fresh, restoredAt: null };
        }
    });
    const [state, setState] = useState<HandoverState>(initial.state);
    const [restoredAt, setRestoredAt] = useState<string | null>(initial.restoredAt);
    const [result, setResult] = useState<CompleteVisitResponse | null>(null);

    // Wystawianie dokumentów (paragon/faktura/KSeF) to moduł finansowy. Bez niego
    // wydanie pojazdu nadal działa, w trybie uproszczonym, bez dokumentu.
    const canIssueDocuments = useCapability('FINANCE_INVOICE_ISSUE').enabled;

    // ── Kwoty ────────────────────────────────────────────────────────────────
    // Rozliczenie (faktura, inny dokument i wynikające z nich ceny wizyty). Bez podziału
    // ceny wizyty to te z „Cen usług”; przy podziale kwota na fakturze albo na innym
    // dokumencie może je zmienić (patrz settlementPlan).
    const plan = useMemo(() => settlementPlan(state), [state]);
    const totals = useMemo(() => totalsOf(plan.prices), [plan.prices]);
    const originalGross = useMemo(() => originalGrossOf(state.prices), [state.prices]);
    /** Rabat (+) albo dopłata (−) przy wydaniu, brutto. */
    const handoverDiscount = originalGross - totals.gross;
    const pricesChanged = plan.prices.some(priceChanged);
    /** Suma i rabat z „Cen usług” - tego, co człowiek ustawił w cenach, przed rozliczeniem. */
    const pricesGross = useMemo(() => totalsOf(state.prices).gross, [state.prices]);
    const pricesDiscount = originalGross - pricesGross;
    // Układ ekranu: wizyta bez płatnych usług. Rabat do zera w trakcie wydania nie chowa
    // edytora cen - do zapłaty jest wtedy 0 zł i dokument nie powstanie (patrz zapis).
    const isFreeVisit = originalGross === 0;
    const nothingToPay = totals.gross === 0;

    const thankYouSms = useThankYouSmsAvailability({
        enabled: isOpen,
        customerPhone: visit.customer.phone,
    });
    const messageDefaults = useMessageDefaults({ enabled: isOpen });
    const thankYouSmsChecked = state.thankYouSms ?? messageDefaults.sms('postVisit') ?? true;

    const ksef = useKsefAutomation({
        enabled: canIssueDocuments && !isFreeVisit && state.documentType === 'INVOICE',
    });

    /**
     * Wysyłka do KSeF nie jest przełącznikiem na ekranie wydania: faktura na firmę idzie
     * obowiązkowo, dla osoby prywatnej według ustawienia studia; bez tokenu albo z tokenem
     * bez prawa wystawiania faktura zostaje zapisana bez wysyłki.
     */
    const invoicedExternally = ksef.invoicesIssuedExternally;
    const ksefBlocked: 'no-token' | 'no-permission' | null =
        !ksef.moduleEnabled || ksef.isLoading
            ? null
            : !ksef.configured
              ? 'no-token'
              : ksef.lacksIssuePermission
                ? 'no-permission'
                : null;
    const buyerHasNip = normalizeNip(state.buyer.nip).length > 0;
    const sendToKsef =
        !invoicedExternally &&
        ksefBlocked === null &&
        (buyerHasNip || (state.sendToKsef ?? ksef.autoSendDefault ?? true));

    // ── Draft: zamknięcie okna nie kasuje pracy ──────────────────────────────
    useEffect(() => {
        if (!isOpen || result) return;
        try {
            const draft: HandoverDraft = { servicesFingerprint: fingerprint, state, savedAt: new Date().toISOString() };
            window.localStorage.setItem(draftKey(visit.id), JSON.stringify(draft));
        } catch {
            // Brak miejsca / tryb prywatny: draft to wygoda, nie warunek działania.
        }
    }, [state, fingerprint, isOpen, result, visit.id]);

    const clearDraft = useCallback(() => {
        try {
            window.localStorage.removeItem(draftKey(visit.id));
        } catch {
            /* jw. */
        }
    }, [visit.id]);

    const patch = useCallback(
        (changes: Partial<HandoverState>) => setState(prev => ({ ...prev, ...changes })),
        []
    );

    // ── Faktura ──────────────────────────────────────────────────────────────
    const invoiceItems = useMemo(() => plan.invoice.map(({ item }) => item), [plan]);
    const invoiceGross = plan.invoiceGross;
    /** Kwota innego dokumentu (tylko przy podziale): bez paragonu, bez VAT. */
    const remainder = plan.remainder;
    /** Ile klient płaci: przy podziale faktura + inny dokument (bez VAT od części poza fakturą). */
    const payable = state.splitRemainder ? invoiceGross + remainder : totals.gross;
    /** Pozycje i ceny jak w wizycie - wtedy „Przywróć domyślne” nie ma czego przywracać. */
    const linesMatch = linesMatchServices(state.lines, state.prices)
        && !state.prices.some(p => p.added || priceChanged(p))
        && !state.remainderInput.trim();

    // ── Akcje cen i pozycji ──────────────────────────────────────────────────
    const changePrice = useCallback(
        (serviceId: string, changes: Partial<Pick<HandoverPrice, 'net' | 'gross' | 'vatRate'>>) =>
            setState(prev => ({
                ...prev,
                prices: prev.prices.map(p => (p.serviceId === serviceId ? updatePrice(p, changes) : p)),
            })),
        []
    );

    /** Ceny wracają do tych z wizyty (bez zmian przy wydaniu). */
    const resetPrices = useCallback(() => {
        setState(prev => ({ ...prev, prices: [...buildInitialState().prices, ...prev.prices.filter(p => p.added)] }));
        setRestoredAt(null);
    }, [buildInitialState]);

    const changeLine = useCallback(
        (index: number, changes: Partial<InvoiceLine>) =>
            setState(prev => {
                const ids = prev.lines[index]?.serviceIds ?? [];
                return {
                    ...prev,
                    lines: prev.lines.map((l, i) => (i === index ? { ...l, ...changes } : l)),
                    // Nazwa pozycji dopisanej przy wydaniu to nazwa jej usługi w wizycie.
                    prices: changes.name === undefined || ids.length !== 1 ? prev.prices : prev.prices.map(p =>
                        p.added && p.serviceId === ids[0] ? { ...p, name: changes.name ?? p.name } : p),
                };
            }),
        []
    );

    /** Stawka VAT pozycji = stawka jej usług; zmiana zostawia stronę ustaloną ceny. */
    const changeLineRate = useCallback(
        (index: number, vatRate: VatRateCode) =>
            setState(prev => {
                const ids = prev.lines[index]?.serviceIds ?? [];
                return { ...prev, prices: prev.prices.map(p => (ids.includes(p.serviceId) ? updatePrice(p, { vatRate }) : p)) };
            }),
        []
    );

    /** Nowa pozycja na fakturze - przy zapisie staje się usługą wizyty. */
    const addLine = useCallback(() => {
        const { price, line } = newInvoiceLine();
        setState(prev => ({ ...prev, prices: [...prev.prices, price], lines: [...prev.lines, line] }));
    }, []);

    /** Usunięcie pozycji dopisanej przy wydaniu (pozycje usług wizyty się nie usuwa). */
    const removeLine = useCallback(
        (index: number) =>
            setState(prev => {
                const ids = prev.lines[index]?.serviceIds ?? [];
                return {
                    ...prev,
                    lines: prev.lines.filter((_, i) => i !== index),
                    prices: prev.prices.filter(p => !(p.added && ids.includes(p.serviceId))),
                };
            }),
        []
    );

    /**
     * „Przywróć domyślne”: pozycje i ceny jak w wizycie - bez scaleń, wpisanych kwot,
     * dopisanych pozycji i ręcznej kwoty innego dokumentu. Podział zostaje włączony albo nie.
     */
    const resetLines = useCallback(() => {
        const prices = buildInitialState().prices;
        setState(prev => ({ ...prev, prices, lines: linesFromPrices(prices), remainderInput: '' }));
        setRestoredAt(null);
    }, [buildInitialState]);

    /** „Nadpisz pozycje”: jedna pozycja z całą sumą i pustą nazwą (patrz overwrittenLines). */
    const overwriteLines = useCallback(
        () => setState(prev => ({ ...prev, ...overwrittenLines(prev) })),
        []
    );

    const unmerge = useCallback(
        (index: number) => patch({ lines: unmergeLine(state.lines, index, state.prices) }),
        [state.lines, state.prices, patch]
    );

    /** Kwota innego dokumentu wpisana ręcznie; '' wraca do wyliczonej. */
    const setRemainderInput = useCallback((remainderInput: string) => patch({ remainderInput }), [patch]);

    /**
     * „Faktura + inny dokument”: część kwoty na fakturze, reszta zapisem bez paragonu
     * i bez VAT, gotówką. Wyłączenie wraca do faktury na całość.
     */
    const setInvoiceOther = useCallback(
        (on: boolean) =>
            setState(prev => ({
                ...prev,
                splitRemainder: on,
                remainderInput: '',
                // Włączenie podziału: kwoty wpisane bez podziału to ceny usług - zostają cenami,
                // a nie stają się po cichu kwotami na fakturze (niższa dałaby resztę zamiast rabatu).
                prices: on ? pricesWithTypedAmounts(prev, prev.lines.map((_, i) => i)) : prev.prices,
                lines: prev.lines.map(l => ({ ...l, amount: '', amountMode: null })),
            })),
        []
    );

    // ── Walidacja ────────────────────────────────────────────────────────────
    const problems: HandoverProblem[] = useMemo(() => {
        // Usługa czekająca na zgodę klienta nie liczy się do kwoty wizyty - najpierw decyzja.
        const pending: HandoverProblem[] = pendingServices.length > 0
            ? [{
                section: 'balance',
                message: pendingServices.length === 1
                    ? `Usługa „${pendingServices[0].serviceName}” czeka na zgodę klienta. Zatwierdź ją albo odrzuć w usługach wizyty.`
                    : `${pendingServices.length} usługi czekają na zgodę klienta. Zatwierdź je albo odrzuć w usługach wizyty.`,
            }]
            : [];
        if (!canIssueDocuments) return pending;
        return [...pending, ...validateHandover({ state, sellerComplete, invoicedExternally })];
    }, [pendingServices, state, sellerComplete, canIssueDocuments, invoicedExternally]);

    const problemsIn = useCallback(
        (section: HandoverProblem['section']) => problems.filter(p => p.section === section),
        [problems]
    );

    // ── Zapis ────────────────────────────────────────────────────────────────
    const { mutate: submit, isPending: isSubmitting } = useMutation({
        mutationFn: () => {
            const documentType = nothingToPay
                ? 'other'
                : canIssueDocuments
                    ? state.documentType
                    : 'RECEIPT'; // backend pomija dokument bez modułu; jawna faktura dałaby 402
            return stateTransitionApi.complete(visit.id, {
                signatureObtained: state.protocolSigned,
                payment: {
                    method: nothingToPay ? ('OTHER' as PaymentMethod) : state.paymentMethod,
                    invoiceType: documentType,
                    amount: payable,
                    dueDate: state.paymentMethod === 'TRANSFER' ? defaultDueDate() : undefined,
                },
                invoice:
                    documentType === 'INVOICE' && canIssueDocuments && !nothingToPay
                        ? toInvoicePayload(state, sendToKsef)
                        : undefined,
                priceChanges: toPriceChanges(plan.prices),
                addedServices: toAddedServices(plan.prices, state.lines),
                thankYouSms: buildThankYouSmsPayload({
                    available: thankYouSms.available,
                    send: thankYouSmsChecked,
                }),
            });
        },
        onSuccess: response => {
            clearDraft();
            // Wydanie zmienia status, dokumenty (protokół, faktura) i komunikację (SMS) naraz.
            queryClient.invalidateQueries({ queryKey: visitKeys.scope(visit.id) });
            queryClient.invalidateQueries({ queryKey: ['ksef', 'revenue'] });
            queryClient.invalidateQueries({ queryKey: ['income-documents'] });
            if (response?.alreadyInTargetState) {
                showInfo(
                    'Ta wizyta była już wydana',
                    'Pokazujemy dokument z pierwszego wydania. Nie wystawiliśmy drugiego.'
                );
            }
            setResult(response);
        },
        onError: (error: unknown) => {
            if (handleStateConflict(error)) return;
            showError('Nie udało się wydać pojazdu', apiErrorMessage(error, 'Spróbuj ponownie.'));
        },
    });

    return {
        // dane
        company,
        isCompanyLoading,
        sellerComplete,
        totals,
        originalGross,
        handoverDiscount,
        pricesGross,
        pricesDiscount,
        pricesChanged,
        currency,
        isFreeVisit,
        invoiceItems,
        invoiceGross,
        remainder,
        remainderAuto: plan.remainderAuto,
        raisedByInvoice: plan.raisedByInvoice,
        payable,
        linesMatch,
        restoredAt,
        // akcje cen i pozycji
        changePrice,
        resetPrices,
        changeLine,
        changeLineRate,
        addLine,
        removeLine,
        resetLines,
        overwriteLines,
        unmerge,
        setRemainderInput,
        setInvoiceOther,
        // stan
        state,
        patch,
        thankYouSms,
        /** Czy pole „Podziękowanie SMS" jest zaznaczone - wybór pracownika albo stan domyślny. */
        thankYouSmsChecked,
        ksef,
        sendToKsef,
        ksefBlocked,
        /** Termin płatności przy przelewie (ISO) - ten sam, który pójdzie na serwer. */
        transferDueDate: state.paymentMethod === 'TRANSFER' ? defaultDueDate() : null,
        problems,
        problemsIn,
        canSubmit:
            problems.length === 0 &&
            !isSubmitting &&
            !(canIssueDocuments && !isFreeVisit && state.documentType === 'INVOICE' && ksef.isLoading),
        invoicedExternally,
        canIssueDocuments,
        // zapis
        submit,
        isSubmitting,
        result,
    };
};
