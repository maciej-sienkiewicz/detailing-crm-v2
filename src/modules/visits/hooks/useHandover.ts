import { useCapability } from '@/modules/subscription';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { stateTransitionApi } from '../api/stateTransitionApi';
import { apiErrorMessage } from '../api/apiError';
import { visitDetailQueryKey } from './index';
import { companyApi } from '@/modules/settings/api/companyApi';
import { useServicePricing } from '@/modules/appointments/hooks/useServicePricing';
import { useToast } from '@/common/components/Toast';
import { isPiiMasked } from '@/common/pii';
import type { ServiceLineItem, Visit } from '../types';
import type { CompleteVisitResponse, PaymentMethod } from '../types/stateTransitions';
import {
    detectRate,
    invoiceGrossOf,
    toInvoicePayload,
    toPln,
    validateHandover,
    withDerived,
    type HandoverItem,
    type HandoverProblem,
    type HandoverState,
} from '../types/handover';

const DRAFT_PREFIX = 'handover:v1:';
const DUE_DATE_DAYS = 14;

const draftKey = (visitId: string) => `${DRAFT_PREFIX}${visitId}`;

const defaultDueDate = (): string => {
    const date = new Date();
    date.setDate(date.getDate() + DUE_DATE_DAYS);
    return date.toISOString().slice(0, 10);
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
export const useHandover = ({ visit, isOpen }: UseHandoverArgs) => {
    const queryClient = useQueryClient();
    const { showError } = useToast();
    const { calculateServicePrice } = useServicePricing();

    // Wycena jest współdzielona z modułem wizyt, ale jej sygnatura pochodzi
    // z modułu appointments, gdzie ServiceLineItem deklaruje basePriceNet jako
    // MoneyAmount. Implementacja czyta tę wartość jak liczbę (createMoney), więc
    // model wizyty pasuje w praktyce, ale nie w typach. Rzutujemy raz, tutaj,
    // zamiast przy każdym wywołaniu; rozbieżność typów do uporządkowania osobno.
    const priceOf = useCallback(
        (service: ServiceLineItem) =>
            calculateServicePrice(service as unknown as Parameters<typeof calculateServicePrice>[0]),
        [calculateServicePrice]
    );

    // Dane sprzedawcy pobierane RAZEM z otwarciem ekranu, nie dopiero przy
    // edycji faktury: brak NIP-u studia ma być widoczny zanim ktokolwiek
    // zacznie wydawać, a nie w ostatnim kliknięciu przy kliencie u lady.
    const { data: company, isLoading: isCompanyLoading } = useQuery({
        queryKey: ['company', 'settings'],
        queryFn: () => companyApi.getCompanySettings(),
        enabled: isOpen,
    });
    const sellerComplete = !!company?.name?.trim() && !!company?.taxId?.trim();

    // ── Kwoty wizyty ─────────────────────────────────────────────────────────
    // Usługa z oczekującą edycją liczy się po cenie sprzed zmiany: zmiana nie
    // została jeszcze zatwierdzona, więc klient płaci za to, co uzgodniono.
    const totals = useMemo(() => {
        let net = 0;
        let gross = 0;
        visit.services.forEach(service => {
            const isPending = service.hasPendingChange ?? service.status === 'PENDING';
            const isEditPending =
                isPending &&
                service.pendingOperation === 'EDIT' &&
                (service.previousPriceNet ?? null) !== null &&
                (service.previousPriceGross ?? null) !== null;
            if (isEditPending) {
                net += service.previousPriceNet as number;
                gross += service.previousPriceGross as number;
            } else {
                const pricing = priceOf(service);
                net += pricing.finalPriceNet;
                gross += pricing.finalPriceGross;
            }
        });
        return { net, gross, vat: gross - net };
    }, [visit.services, priceOf]);

    const isFreeVisit = totals.gross === 0;
    const currency = visit.totalCost?.currency ?? 'PLN';

    // ── Stan początkowy ──────────────────────────────────────────────────────
    const buildInitialState = useCallback((): HandoverState => {
        const seedItems: HandoverItem[] =
            visit.services.length > 0
                ? visit.services.map(service => {
                      const pricing = priceOf(service);
                      return withDerived({
                          name: service.serviceName,
                          net: '',
                          gross: toPln(pricing.finalPriceGross),
                          mode: 'GROSS',
                          vatRate: detectRate(pricing.finalPriceNet, pricing.finalPriceGross),
                      });
                  })
                : [
                      withDerived({
                          name: 'Usługi detailingowe',
                          net: '',
                          gross: toPln(totals.gross),
                          mode: 'GROSS',
                          vatRate: '23',
                      }),
                  ];

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
            items: seedItems,
            splitRemainder: false,
            remainderMethod: 'CASH',
            exemptionBasis: '',
            protocolSigned: false,
        };
    }, [visit, priceOf, totals.gross]);

    // Ekran jest montowany dopiero przy otwarciu, więc odtworzenie draftu
    // wystarczy zrobić raz, w inicjalizatorze stanu.
    const [state, setState] = useState<HandoverState>(() => {
        const fresh = buildInitialState();
        try {
            const stored = window.localStorage.getItem(draftKey(visit.id));
            return stored ? { ...fresh, ...JSON.parse(stored) } : fresh;
        } catch {
            // Uszkodzony draft nie może blokować wydania, startujemy od nowa.
            return fresh;
        }
    });
    const [result, setResult] = useState<CompleteVisitResponse | null>(null);

    // Wystawianie dokumentów (paragon/faktura/KSeF) to moduł finansowy. Bez niego
    // wydanie pojazdu nadal działa, w trybie uproszczonym, bez dokumentu; backend
    // egzekwuje tę samą regułę (jawna faktura -> 402, paragon pomijany).
    const canIssueDocuments = useCapability('FINANCE_INVOICE_ISSUE').enabled;

    // ── Draft: zamknięcie okna nie kasuje pracy ──────────────────────────────
    useEffect(() => {
        if (!isOpen || result) return;
        try {
            window.localStorage.setItem(draftKey(visit.id), JSON.stringify(state));
        } catch {
            // Brak miejsca / tryb prywatny: draft to wygoda, nie warunek działania.
        }
    }, [state, isOpen, result, visit.id]);

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

    // ── Wyliczenia pochodne ──────────────────────────────────────────────────
    const invoiceGross = useMemo(() => invoiceGrossOf(state.items), [state.items]);
    const remainder = totals.gross - invoiceGross;

    const problems: HandoverProblem[] = useMemo(
        () =>
            isFreeVisit || !canIssueDocuments
                ? []
                : validateHandover({ state, visitGross: totals.gross, sellerComplete }),
        [state, totals.gross, sellerComplete, isFreeVisit, canIssueDocuments]
    );

    const problemsIn = useCallback(
        (section: HandoverProblem['section']) => problems.filter(p => p.section === section),
        [problems]
    );

    // ── Zapis ────────────────────────────────────────────────────────────────
    const { mutate: submit, isPending: isSubmitting } = useMutation({
        mutationFn: () => {
            const documentType = isFreeVisit
                ? 'other'
                : canIssueDocuments
                    ? state.documentType
                    : 'RECEIPT'; // backend pomija dokument bez modułu; jawna faktura dałaby 402
            return stateTransitionApi.complete(visit.id, {
                signatureObtained: state.protocolSigned,
                payment: {
                    method: isFreeVisit ? ('OTHER' as PaymentMethod) : state.paymentMethod,
                    invoiceType: documentType,
                    amount: totals.gross,
                    dueDate: state.paymentMethod === 'TRANSFER' ? defaultDueDate() : undefined,
                },
                invoice:
                    documentType === 'INVOICE' && canIssueDocuments
                        ? toInvoicePayload(state, totals.gross)
                        : undefined,
            });
        },
        onSuccess: response => {
            clearDraft();
            queryClient.invalidateQueries({ queryKey: visitDetailQueryKey(visit.id) });
            queryClient.invalidateQueries({ queryKey: ['ksef', 'revenue'] });
            queryClient.invalidateQueries({ queryKey: ['income-documents'] });
            setResult(response);
        },
        onError: (error: unknown) => {
            showError('Nie udało się wydać pojazdu', apiErrorMessage(error, 'Spróbuj ponownie.'));
        },
    });

    return {
        // dane
        company,
        isCompanyLoading,
        sellerComplete,
        totals,
        currency,
        isFreeVisit,
        invoiceGross,
        remainder,
        // stan
        state,
        patch,
        problems,
        problemsIn,
        canSubmit: problems.length === 0 && !isSubmitting,
        canIssueDocuments,
        // zapis
        submit,
        isSubmitting,
        result,
    };
};
