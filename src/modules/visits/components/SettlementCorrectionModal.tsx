// src/modules/visits/components/SettlementCorrectionModal.tsx
//
// „Popraw rozliczenie” wizyty wydanej: ceny i stawki pozycji, rodzaj dokumentu,
// nabywca, forma płatności, powód. Przed zapisem serwer sprawdza plan poprawki
// (ten sam, który potem wykonuje) - okno pokazuje tylko, czy da się ją zrobić,
// a jeśli nie, to dlaczego.
//
// Wygląd jak krok płatności „Wydanie pojazdu” (decyzja biznesu z 23.10.2026): te same
// klocki (HandoverKit), ta sama tabela cen, ten sam wybór dokumentu i płatności, nabywca
// w podsumowaniu ze „Zmień”, jeden zielony przycisk w stopce. Dwa okna jednej czynności
// trzeba było poznawać osobno. Poprawka ma ponad wydanie tylko to, czego wydanie nie
// zna: obecne dokumenty, skutek dla faktury w KSeF, klienta i kasy, i historię.
//
// Nic nie jest usuwane: stare dokumenty zostają w historii wizyty obok korekt.

import { useEffect, useMemo, useState } from 'react';
import styled from 'styled-components';
import { ArrowRight, FileCheck2 } from 'lucide-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
    ModalShell, ModalHeader, ModalTitleGroup, ModalTitle, ModalSubtitle, ModalContent, CloseBtn,
} from '@/common/components/ModalKit';
import { BareInput, BareTextArea, InputShell, InputShellTextArea } from '@/common/components/Form';
import { Button, Notice, StatusPill, ui } from '@/common/components/ui';
import { useToast } from '@/common/components/Toast';
import { formatCurrency } from '@/common/utils';
import { isPiiMasked } from '@/common/pii';
import { localIsoDate } from '@/common/utils/localDate';
import {
    settlementApi,
    type SettlementBuyer,
    type SettlementCorrectionRequest,
    type SettlementDocumentType,
    type SettlementKsefAction,
    type SettlementView,
} from '../api/settlementApi';
import {
    changedServiceLines, lineFromService, priceOfLine, totalGrossCents, totalNetCents, withPriceChange,
    type SettlementLineDraft,
} from '../utils/settlementLines';
import {
    ActionIcon, ActionText, Box, DecisionField, DecisionStack, DecisionTitle, GhostAction, Muted, Pill, PillRow,
    PrimaryAction, Review, ReviewRow, ReviewTitle, SettlementFooter, SettlementGrid, SummaryAmount, SummaryAside,
    SummaryProblems,
} from './handover/HandoverKit';
import { BuyerModal } from './handover/InvoiceSection';
import { PaymentMethodPicker } from './handover/PaymentMethodPicker';
import { PricesSection } from './handover/PricesSection';
import { paymentMethods } from './handover/paymentOptions';
import { formatNip, normalizeNip, type HandoverBuyer } from '../types/handover';
import type { PaymentMethod } from '../types/stateTransitions';
import { visitKeys } from '../hooks';
import { settlementDocumentRows } from '../utils/settlementDocumentRows';
import { problemDetail } from '@/core/problem';

const pln = (cents: number) => formatCurrency(cents / 100);

/** Kwota dokumentu z tym, czym jest: inny dokument przy podziale jest bez VAT. */
const documentAmount = (cents: number, withoutReceipt: boolean | undefined) =>
    `${pln(cents)} ${withoutReceipt ? 'bez VAT' : 'brutto'}`;

/** Te same nazwy co „Dokument dla klienta” na ekranie wydania. */
const DOCUMENT_CHOICES: Array<{ value: SettlementDocumentType; label: string }> = [
    { value: 'RECEIPT', label: 'Paragon' },
    { value: 'INVOICE', label: 'Faktura VAT' },
    { value: 'OTHER', label: 'Inny dokument' },
];

const INVOICE_STATUS: Record<string, { label: string; tone: 'ok' | 'info' | 'warn' | 'danger' | 'neutral' }> = {
    ACCEPTED: { label: 'Przyjęta w KSeF', tone: 'ok' },
    NOT_SENT: { label: 'Niewysłana', tone: 'neutral' },
    PENDING: { label: 'Czeka na wysyłkę', tone: 'info' },
    QUEUED_RETRY: { label: 'W kolejce', tone: 'warn' },
    SENDING: { label: 'Wysyłana', tone: 'info' },
    SUBMITTED: { label: 'W KSeF, czeka na odpowiedź', tone: 'info' },
    REJECTED: { label: 'Odrzucona', tone: 'danger' },
    CANCELLED: { label: 'Anulowana', tone: 'neutral' },
};

/**
 * Co poprawka zrobi z fakturą - wiersz podsumowania przed zatwierdzeniem. Faktury
 * przyjętej w KSeF nie da się usunąć, a korekty cofnąć: tego skutku nie wolno zostawić
 * w zdaniach planu, których okno nie pokazuje. NONE nie ma wiersza.
 */
const KSEF_LINE: Partial<Record<SettlementKsefAction, { text: string; note?: string }>> = {
    KEEP: { text: 'Zostaje bez zmian' },
    CANCEL: { text: 'Anulowanie', note: 'Faktura nie trafiła do KSeF. Jej numer zostaje zajęty.' },
    CANCEL_AND_REISSUE: { text: 'Anulowanie i nowa faktura', note: 'Faktura nie trafiła do KSeF. Jej numer zostaje zajęty.' },
    CORRECT: { text: 'Korekta do zera w KSeF', note: 'Korekty w KSeF nie da się cofnąć.' },
    CORRECT_AND_REISSUE: { text: 'Korekta do zera i nowa faktura', note: 'Inny nabywca dostaje nową fakturę. Korekty w KSeF nie da się cofnąć.' },
    // Zmiana ceny przy tym samym nabywcy: faktura zostaje, KSeF dostaje korektę o różnicę.
    CORRECT_DIFFERENCE: { text: 'Korekta o różnicę', note: 'Faktura zostaje, nowa nie powstaje. Korekty w KSeF nie da się cofnąć.' },
    ISSUE: { text: 'Nowa faktura' },
    INVOICE_TO_RECEIPT: { text: 'Faktura do paragonu', note: 'Paragon zostaje, sprzedaż liczy się raz.' },
    EXTERNAL_INVOICE: { text: 'Wystawia księgowość', note: 'CRM nie tworzy faktury.' },
    EXTERNAL_INVOICE_TO_RECEIPT: { text: 'Do paragonu wystawia księgowość', note: 'CRM nie tworzy faktury.' },
};

const methodLabel = (method: string | null | undefined): string =>
    paymentMethods.find(m => m.value === method)?.label ?? 'Inna metoda';

// ─── Wygląd ───────────────────────────────────────────────────────────────────

/** Obecne dokumenty: jedna sprzedaż = jeden wiersz (settlementDocumentRows). */
const DocList = styled.ul`
    list-style: none;
    margin: 0;
    padding: 2px 14px;
    border: 1px solid ${ui.line};
    border-radius: 14px;
    background: ${ui.surface};
`;

const DocRow = styled.li`
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 6px 12px;
    padding: 10px 0;
    font-size: 13.5px;
    color: ${ui.inkSoft};

    & + & { border-top: 1px solid ${ui.lineFaint}; }
    strong { color: ${ui.ink}; font-weight: 700; font-variant-numeric: tabular-nums; }
    .amount { margin-left: auto; color: ${ui.ink}; font-weight: 600; font-variant-numeric: tabular-nums; }
`;

/** Dokument z formą płatności przy wizycie z podziałem: nazwa, kwota, usługi, forma. */
const DocHead = styled.p`
    margin: 0;
    display: flex;
    flex-wrap: wrap;
    justify-content: space-between;
    gap: 4px 12px;
    font-size: 14px;
    color: ${ui.inkSoft};
    font-variant-numeric: tabular-nums;

    strong { color: ${ui.ink}; }
`;

const ReasonArea = styled(BareTextArea)`
    min-height: 64px;
    font-size: 13.5px;
`;

const History = styled.details`
    font-size: 13px;
    color: ${ui.inkSoft};

    summary { cursor: pointer; font-weight: 600; color: ${ui.ink}; }
    article { margin-top: 10px; padding-top: 10px; border-top: 1px solid ${ui.lineFaint}; }
    p { margin: 2px 0; }
`;

const ProblemItem = styled.div`
    p { margin: 2px 0 0; }
`;

const Loading = styled.p`
    margin: 0;
    font-size: 14px;
    color: ${ui.inkSoft};
`;

// ─── Komponent ────────────────────────────────────────────────────────────────

type Intent = 'correct' | 'invoice';

interface Props {
    visitId: string;
    /**
     * `invoice` - wejście z „Wystaw fakturę (do paragonu)" w nagłówku wizyty: ta sama
     * poprawka, ale z wybraną fakturą i językiem tego zadania, a nie „poprawiania".
     */
    intent?: Intent;
    /** Auto i klient, jak pod tytułem „Wydanie pojazdu”. */
    subtitle?: string;
    onClose: () => void;
}

const titleOf = (intent: Intent, view: SettlementView | undefined): string =>
    intent === 'correct' ? 'Popraw rozliczenie'
        : view?.documentType === 'RECEIPT' ? 'Faktura do paragonu' : 'Wystaw fakturę';

export const SettlementCorrectionModal = ({ visitId, intent = 'correct', subtitle, onClose }: Props) => {
    const { data, isLoading, isError, refetch } = useQuery({
        queryKey: ['settlement', visitId],
        queryFn: () => settlementApi.get(visitId),
    });

    return (
        <ModalShell isOpen onClose={onClose} maxWidth="1080px">
            <ModalHeader>
                <ModalTitleGroup>
                    <ModalTitle>{titleOf(intent, data)}</ModalTitle>
                    <ModalSubtitle>{subtitle || (data ? 'Wizyta wydana' : 'Wczytywanie rozliczenia')}</ModalSubtitle>
                </ModalTitleGroup>
                <CloseBtn onClick={onClose} />
            </ModalHeader>
            {isError && (
                <ModalContent>
                    <Notice
                        tone="danger"
                        title="Nie udało się wczytać rozliczenia"
                        action={<Button variant="ghost" size="sm" onClick={() => refetch()}>Spróbuj ponownie</Button>}
                    >
                        Sprawdź połączenie i spróbuj jeszcze raz.
                    </Notice>
                </ModalContent>
            )}
            {isLoading && <ModalContent><Loading>Wczytywanie…</Loading></ModalContent>}
            {data && <CorrectionForm view={data} visitId={visitId} intent={intent} onClose={onClose} />}
        </ModalShell>
    );
};

const emptyBuyer: HandoverBuyer = { nip: '', name: '', addressLine1: '', addressLine2: '', email: '' };

/** Wartość z serwera nadająca się na fakturę - maska PII (`***`) nigdy nie trafia na dokument. */
const safe = (value: string | null | undefined): string => (value && !isPiiMasked(value) ? value : '');

const plusDays = (days: number): string => {
    const date = new Date();
    date.setDate(date.getDate() + days);
    return localIsoDate(date);
};

/** Nabywca z żądania taki sam jak ten, z którym okno się otworzyło. */
const sameBuyer = (a: SettlementBuyer, b: HandoverBuyer): boolean =>
    normalizeNip(a.nip ?? '') === normalizeNip(b.nip) && (a.name ?? '').trim() === b.name.trim() &&
    (a.addressLine1 ?? '').trim() === b.addressLine1.trim() && (a.addressLine2 ?? '').trim() === b.addressLine2.trim() &&
    (a.email ?? '').trim() === b.email.trim();

const dateLabel = (iso: string) =>
    new Date(`${iso}T12:00:00`).toLocaleDateString('pl-PL', { day: '2-digit', month: '2-digit', year: 'numeric' });

function CorrectionForm({ view, visitId, intent, onClose }: { view: SettlementView; visitId: string; intent: Intent; onClose: () => void }) {
    const queryClient = useQueryClient();
    const { showSuccess, showWarning } = useToast();

    const [lines, setLines] = useState<SettlementLineDraft[]>(() => view.services.map(lineFromService));
    const toReceipt = intent === 'invoice' && view.documentType === 'RECEIPT';
    const [documentType, setDocumentType] = useState<SettlementDocumentType>(
        intent === 'invoice' ? 'INVOICE' : view.documentType ?? 'RECEIPT'
    );
    const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(view.paymentMethod ?? 'CASH');
    // Faktura + drugi dokument: forma płatności przy każdym dokumencie - dotąd jedna forma
    // dla całej wizyty zmieniała też gotówkową resztę.
    const activeDocuments = useMemo(
        () => view.documents.filter(d => d.active && d.type !== 'CORRECTION'),
        [view.documents]
    );
    const initialDocMethods = useMemo(
        () => Object.fromEntries(activeDocuments.map(d => [d.id, d.paymentMethod as PaymentMethod])),
        [activeDocuments]
    );
    const [docMethods, setDocMethods] = useState<Record<string, PaymentMethod>>(initialDocMethods);
    // Termin z obowiązującej faktury, a bez niej typowe 14 dni - wcześniej pole było
    // puste, a poprawka blokowała się na „Płatność przelewem wymaga terminu".
    const [dueDate, setDueDate] = useState(view.paymentDueDate ?? plusDays(14));
    // Nabywca z faktury, a bez niej z karty klienta (serwer podaje oba): podsumowanie
    // pokazuje go od razu, a „Zmień” otwiera to samo okno nabywcy co przy wydaniu.
    const initialBuyer = useMemo<HandoverBuyer>(() => ({
        ...emptyBuyer,
        nip: safe(view.buyer?.nip),
        name: safe(view.buyer?.name),
        addressLine1: safe(view.buyer?.addressLine1),
        addressLine2: safe(view.buyer?.addressLine2),
        email: safe(view.buyer?.email),
    }), [view.buyer]);
    const [buyer, setBuyer] = useState<HandoverBuyer>(initialBuyer);
    const [isBuyerOpen, setBuyerOpen] = useState(false);
    const [exemption, setExemption] = useState(view.exemptionLegalBasis ?? '');
    const [reason, setReason] = useState(toReceipt ? 'Klient poprosił o fakturę do paragonu' : '');

    // Faktury wystawia księgowość: podstawę zwolnienia wpisuje ona na swojej fakturze.
    const external = view.invoicesIssuedExternally === true;
    const perDocument = view.perDocument === true && documentType === 'INVOICE';
    const invoiceDocId = activeDocuments.find(d => d.type === 'INVOICE')?.id;
    const effectiveMethod: PaymentMethod = perDocument && invoiceDocId ? docMethods[invoiceDocId] ?? paymentMethod : paymentMethod;
    const needsExemption = documentType === 'INVOICE' && !external && lines.some(l => l.vatRate === -1);
    const request = useMemo<SettlementCorrectionRequest>(() => ({
        services: changedServiceLines(lines),
        documentType,
        paymentMethod: effectiveMethod,
        dueDate: effectiveMethod === 'TRANSFER' ? dueDate || null : null,
        buyer: documentType === 'INVOICE' ? buyer : null,
        exemptionLegalBasis: needsExemption ? exemption || null : null,
        reason: reason || null,
        documentPaymentMethods: perDocument ? docMethods : undefined,
    }), [lines, documentType, effectiveMethod, dueDate, buyer, needsExemption, exemption, reason, perDocument, docMethods]);

    // Podgląd po chwili ciszy: każde naciśnięcie klawisza w cenie nie musi pytać serwera.
    const [debounced, setDebounced] = useState(request);
    useEffect(() => {
        const timer = window.setTimeout(() => setDebounced(request), 350);
        return () => window.clearTimeout(timer);
    }, [request]);
    // Nic jeszcze nie zmieniono: zamiast pytać serwer i straszyć „nie da się”,
    // okno mówi, co można tu zrobić.
    // Wizyta bez dokumentu: sam wybór rodzaju dokumentu jest zmianą (dopisuje brakujący).
    const pristine = view.documentType !== null &&
        debounced.services.length === 0 &&
        debounced.documentType === (view.documentType ?? 'RECEIPT') &&
        debounced.paymentMethod === (view.paymentMethod ?? 'CASH') &&
        Object.entries(debounced.documentPaymentMethods ?? {}).every(([id, m]) => initialDocMethods[id] === m) &&
        // Przy fakturze nabywca jedzie zawsze - zmianą jest dopiero inny nabywca. Porównanie
        // z `null` sprawiało, że wizyta z fakturą od progu pytała serwer i witała czerwonym
        // „nie da się”.
        (!debounced.buyer || sameBuyer(debounced.buyer, initialBuyer));
    const preview = useQuery({
        queryKey: ['settlement-preview', visitId, debounced],
        queryFn: () => settlementApi.preview(visitId, debounced),
        placeholderData: previous => previous,
        enabled: !pristine,
    });
    const upToDate = debounced === request && !preview.isFetching;

    const correct = useMutation({
        mutationFn: () => settlementApi.correct(visitId, request),
        onSuccess: result => {
            // Korekta zmienia kwoty, dokumenty rozliczenia i może wysłać fakturę - całość wizyty.
            queryClient.invalidateQueries({ queryKey: visitKeys.scope(visitId) });
            queryClient.invalidateQueries({ queryKey: ['settlement', visitId] });
            queryClient.invalidateQueries({ queryKey: ['ksef', 'revenue'] });
            queryClient.invalidateQueries({ queryKey: ['income-documents'] });
            queryClient.invalidateQueries({ queryKey: ['finance'] });
            if (result.ksefError) {
                showWarning(intent === 'invoice' ? 'Faktura zapisana, KSeF wymaga uwagi' : 'Rozliczenie poprawione, KSeF wymaga uwagi', result.ksefError);
            } else if (intent === 'invoice') {
                showSuccess('Faktura wystawiona', toReceipt
                    ? 'Paragon zostaje w historii wizyty, sprzedaż liczy się raz.'
                    : 'Faktura jest w Finansach i w podglądzie wizyty.');
            } else {
                showSuccess('Rozliczenie poprawione', 'Stare dokumenty zostają w historii wizyty obok korekt.');
            }
            onClose();
        },
    });

    const prices = useMemo(() => lines.map(priceOfLine), [lines]);
    const changePrice = (serviceId: string, changes: Parameters<typeof withPriceChange>[1]) =>
        setLines(prev => prev.map(line => (line.id === serviceId ? withPriceChange(line, changes) : line)));
    const newGross = totalGrossCents(lines);
    const newNet = totalNetCents(lines);
    const originalGross = view.services.reduce((sum, s) => sum + s.grossCents, 0);

    const documentRows = settlementDocumentRows(view);
    const rowOfDocument = new Map(documentRows.map(row => [row.key, row]));
    const blockReason = preview.data?.blockReason ?? null;
    // Poprzedni podgląd zostaje na ekranie, dopóki serwer nie odpowie na nowy - „bez zmian”
    // mignięte w trakcie pisania ceny czytało się jak wynik.
    const effects = !pristine && preview.data && !blockReason ? preview.data : null;
    const canSubmit = !pristine && upToDate && !!preview.data && !blockReason && !correct.isPending;
    const ksefLine = effects?.ksefAction ? KSEF_LINE[effects.ksefAction] : undefined;
    // Ile klient płaci: kwoty dokumentów, jak „Do zapłaty” przy wydaniu. Przy „Faktura + inny
    // dokument” to mniej niż brutto usług - inny dokument jest bez VAT. Różnicę po poprawce
    // liczy serwer z tych samych dokumentów (customerDifference).
    const payableNow = activeDocuments.length > 0
        ? activeDocuments.reduce((sum, d) => sum + d.totalGross, 0)
        : view.totalGross;
    const payable = payableNow + (effects?.customerDifference ?? 0);
    const payableDetail = payable !== payableNow ? `było ${pln(payableNow)}`
        : activeDocuments.some(d => d.withoutReceipt)
            ? activeDocuments
                .map(d => `${d.type === 'INVOICE' ? 'faktura' : d.typeLabel.toLowerCase()} ${documentAmount(d.totalGross, d.withoutReceipt)}`)
                .join(' + ')
            : `netto ${pln(newNet)}, VAT ${pln(newGross - newNet)}`;

    const documentLine = perDocument ? 'Faktura VAT + inny dokument'
        : documentType === 'INVOICE'
            ? (external ? 'Faktura od księgowości' : toReceipt ? 'Faktura do paragonu' : 'Faktura VAT')
            : DOCUMENT_CHOICES.find(c => c.value === documentType)!.label;
    const difference = effects?.customerDifference ?? 0;
    const differenceText = difference > 0 ? `dopłaca ${pln(difference)}`
        : difference < 0 ? `dostaje zwrot ${pln(-difference)}` : 'bez zmian';
    const cashText = !effects || effects.cashDelta === 0 ? 'bez zmian'
        : `${effects.cashDelta > 0 ? '+' : '−'}${pln(Math.abs(effects.cashDelta))}`;
    const nip = normalizeNip(buyer.nip);

    // Druga linia przycisku: skutek, który się klika (jak „Wydaj auto…”), a gdy kliknąć
    // się nie da - dlaczego.
    const actionDetail = pristine ? 'Nic się jeszcze nie zmieniło'
        : !upToDate ? 'Sprawdzanie poprawki…'
            : blockReason || preview.isError ? 'Tej poprawki nie da się teraz wykonać'
                : [
                    documentLine,
                    perDocument ? null : methodLabel(effectiveMethod).toLowerCase(),
                    difference > 0 ? `klient dopłaca ${pln(difference)}` : difference < 0 ? `zwrot ${pln(-difference)}` : null,
                ].filter(Boolean).join(', ');

    const problems = [
        blockReason && !pristine ? { title: 'Tej poprawki nie da się teraz wykonać', detail: blockReason } : null,
        preview.isError ? { title: 'Nie udało się sprawdzić poprawki', detail: problemDetail(preview.error, 'Spróbuj ponownie za chwilę.') } : null,
        correct.isError ? { title: 'Poprawka nie została zapisana', detail: problemDetail(correct.error, 'Spróbuj ponownie.') } : null,
    ].filter((p): p is { title: string; detail: string } => p !== null);

    return (
        <>
            <ModalContent>
                <SettlementGrid>
                    <DecisionStack>
                        <DecisionField aria-labelledby="settlement-now">
                            <DecisionTitle id="settlement-now">Obecne rozliczenie</DecisionTitle>
                            {documentRows.length === 0 ? (
                                <Muted>Wizyta nie ma dokumentu rozliczenia.</Muted>
                            ) : (
                                <DocList>
                                    {documentRows.map(row => (
                                        <DocRow key={row.key}>
                                            <strong>{row.number}</strong>
                                            {row.label && <span>{row.label}</span>}
                                            {row.paymentMethodLabel && <span>{row.paymentMethodLabel}</span>}
                                            {row.ksefStatus && (
                                                <StatusPill $tone={INVOICE_STATUS[row.ksefStatus]?.tone ?? 'neutral'}>
                                                    {INVOICE_STATUS[row.ksefStatus]?.label ?? row.ksefStatus}
                                                </StatusPill>
                                            )}
                                            <span className="amount">{documentAmount(row.totalGross, row.withoutReceipt)}</span>
                                        </DocRow>
                                    ))}
                                </DocList>
                            )}
                        </DecisionField>

                        <DecisionField id="settlement-document">
                            <DecisionTitle>Dokument dla klienta</DecisionTitle>
                            <PillRow role="group" aria-label="Dokument dla klienta">
                                {DOCUMENT_CHOICES.map(choice => (
                                    <Pill
                                        key={choice.value}
                                        type="button"
                                        $selected={documentType === choice.value}
                                        aria-pressed={documentType === choice.value}
                                        onClick={() => setDocumentType(choice.value)}
                                    >
                                        {choice.label}
                                    </Pill>
                                ))}
                            </PillRow>
                            {toReceipt && documentType === 'INVOICE' && (
                                <Notice tone="info" title="Paragon zostaje">
                                    Faktura powstaje na kwotę z paragonu jako faktura do paragonu, więc sprzedaż
                                    nie liczy się drugi raz. Fakturę na firmę wystawisz tylko wtedy, gdy NIP
                                    nabywcy był na paragonie.
                                </Notice>
                            )}
                            {documentType === 'INVOICE' && external && (
                                <Notice tone="info" title="Fakturę wystawia księgowość">
                                    CRM nie tworzy faktury. Jeśli księgowość wystawiła już fakturę do tej wizyty,
                                    korektę też wystawia ona. Przekaż jej tę zmianę.
                                </Notice>
                            )}
                        </DecisionField>

                        {needsExemption && (
                            <DecisionField>
                                <DecisionTitle as="label" htmlFor="settlement-exemption">Podstawa zwolnienia z VAT</DecisionTitle>
                                <InputShell $compact>
                                    <BareInput
                                        id="settlement-exemption"
                                        value={exemption}
                                        onChange={e => setExemption(e.target.value)}
                                        placeholder="np. art. 113 ust. 1 ustawy o VAT"
                                        $compact
                                    />
                                </InputShell>
                            </DecisionField>
                        )}

                        <DecisionField>
                            <DecisionTitle>Ceny usług</DecisionTitle>
                            <PricesSection
                                prices={prices}
                                onChange={changePrice}
                                onReset={() => setLines(view.services.map(lineFromService))}
                                discount={originalGross - newGross}
                                totalGross={newGross}
                                problems={[]}
                                fmt={pln}
                                changeContext="w poprawce"
                                defaultEditing={intent === 'correct'}
                            />
                        </DecisionField>

                        <DecisionField id="settlement-payment">
                            <DecisionTitle>{perDocument ? 'Forma zapłaty dokumentów' : 'Forma zapłaty'}</DecisionTitle>
                            {perDocument ? (
                                <>
                                    {activeDocuments.map(doc => {
                                        const row = rowOfDocument.get(doc.id);
                                        return (
                                            <Box key={doc.id}>
                                                <DocHead>
                                                    <strong>{row?.label || doc.typeLabel} {row?.number ?? doc.number}</strong>
                                                    <span>{documentAmount(doc.totalGross, doc.withoutReceipt)}</span>
                                                </DocHead>
                                                {doc.services && doc.services.length > 0 && (
                                                    <Muted>{doc.services.map(sv => sv.name).join(', ')}</Muted>
                                                )}
                                                <PaymentMethodPicker
                                                    value={docMethods[doc.id] ?? (doc.paymentMethod as PaymentMethod)}
                                                    onChange={method => setDocMethods(prev => ({ ...prev, [doc.id]: method }))}
                                                />
                                            </Box>
                                        );
                                    })}
                                    <Muted>Nowa cena usługi zmienia tylko dokument, na którym ta usługa jest.</Muted>
                                </>
                            ) : (
                                <PaymentMethodPicker value={paymentMethod} onChange={setPaymentMethod} />
                            )}
                        </DecisionField>

                        {effectiveMethod === 'TRANSFER' && (
                            <DecisionField>
                                <DecisionTitle as="label" htmlFor="settlement-due">Termin płatności</DecisionTitle>
                                <InputShell $compact>
                                    <BareInput id="settlement-due" type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} $compact />
                                </InputShell>
                            </DecisionField>
                        )}

                        <DecisionField>
                            <DecisionTitle as="label" htmlFor="settlement-reason">Powód (można pominąć)</DecisionTitle>
                            <InputShellTextArea $compact>
                                <ReasonArea
                                    id="settlement-reason"
                                    value={reason}
                                    maxLength={500}
                                    onChange={e => setReason(e.target.value)}
                                    placeholder="np. rabat po odbiorze, klient poprosił o fakturę"
                                />
                            </InputShellTextArea>
                        </DecisionField>

                        {view.history.length > 0 && (
                            <History>
                                <summary>Historia rozliczenia ({view.history.length})</summary>
                                {view.history.map(entry => (
                                    <article key={entry.id}>
                                        <p>
                                            <strong>{new Date(entry.createdAt).toLocaleString('pl-PL')}</strong>
                                            {entry.createdByName ? `, ${entry.createdByName}` : ''}
                                        </p>
                                        <p>Kwota {pln(entry.totalGrossBefore)} → {pln(entry.totalGrossAfter)} brutto.</p>
                                        {/* Etykieta z serwera ma własną wielką literę i skróty („KSeF"):
                                            `toLowerCase()` robił z niej „bez faktury ksef". */}
                                        <p>{entry.ksefAction}.</p>
                                        {entry.reason && <p>Powód: {entry.reason}</p>}
                                        {entry.ksefError && <p style={{ color: ui.dangerInk }}>{entry.ksefError}</p>}
                                    </article>
                                ))}
                            </History>
                        )}
                    </DecisionStack>

                    {/* Bez listy kroków (decyzja biznesu), ale skutek dla pieniędzy i dla faktury
                        zawsze na wierzchu: kwota dla klienta, zmiana kasy, korekta w KSeF. Poprawka
                        po podziale potrafiła po cichu zabrać z kasy całą gotówkową resztę - tę liczbę
                        trzeba zobaczyć przed zatwierdzeniem. */}
                    <SummaryAside aria-label="Podsumowanie poprawki">
                        <SummaryAmount>
                            <span>Do zapłaty</span>
                            <strong>{pln(payable)}</strong>
                            <span>{payableDetail}</span>
                        </SummaryAmount>

                        <Review aria-live="polite">
                            <ReviewTitle>Sprawdź przed zapisem</ReviewTitle>
                            <ReviewRow>
                                <span>Dokument</span>
                                <span><strong>{documentLine}</strong></span>
                            </ReviewRow>
                            {ksefLine && (
                                <ReviewRow>
                                    <span>Faktura</span>
                                    <span><strong>{ksefLine.text}</strong>{ksefLine.note && <small>{ksefLine.note}</small>}</span>
                                </ReviewRow>
                            )}
                            {documentType === 'INVOICE' && (
                                <ReviewRow>
                                    <span>Nabywca</span>
                                    <span>
                                        <strong>{buyer.name.trim() || 'Brak nazwy nabywcy'}</strong>
                                        <small className="nowrap">{nip ? `NIP ${formatNip(nip)}` : 'Osoba prywatna'}</small>
                                    </span>
                                    <GhostAction type="button" onClick={() => setBuyerOpen(true)}>Zmień</GhostAction>
                                </ReviewRow>
                            )}
                            <ReviewRow>
                                <span>Płatność</span>
                                {perDocument ? (
                                    <span>
                                        {activeDocuments.map(doc => (
                                            <small key={doc.id}>
                                                {doc.type === 'INVOICE' ? 'Faktura' : doc.typeLabel}: {methodLabel(docMethods[doc.id] ?? doc.paymentMethod).toLowerCase()}
                                            </small>
                                        ))}
                                    </span>
                                ) : (
                                    <span>
                                        {methodLabel(effectiveMethod)}
                                        {effectiveMethod === 'TRANSFER' && dueDate && <small>termin {dateLabel(dueDate)}</small>}
                                    </span>
                                )}
                            </ReviewRow>
                            <ReviewRow>
                                <span>Klient</span>
                                <span><strong>{differenceText}</strong></span>
                            </ReviewRow>
                            <ReviewRow>
                                <span>Kasa</span>
                                <span><strong>{cashText}</strong></span>
                            </ReviewRow>
                        </Review>

                        {problems.length > 0 && (
                            <SummaryProblems role="alert" aria-live="polite">
                                {problems.map(problem => (
                                    <ProblemItem key={problem.title}>
                                        <strong>{problem.title}</strong>
                                        <p>{problem.detail}</p>
                                    </ProblemItem>
                                ))}
                            </SummaryProblems>
                        )}
                    </SummaryAside>
                </SettlementGrid>

                <BuyerModal
                    isOpen={isBuyerOpen}
                    onClose={() => setBuyerOpen(false)}
                    buyer={buyer}
                    onChange={setBuyer}
                />
            </ModalContent>
            <SettlementFooter>
                <Button variant="ghost" size="lg" onClick={onClose}>Anuluj</Button>
                <PrimaryAction type="button" onClick={() => correct.mutate()} disabled={!canSubmit}>
                    <ActionIcon aria-hidden="true"><FileCheck2 /></ActionIcon>
                    <ActionText>
                        <span>{correct.isPending ? 'Zapisywanie…' : intent === 'invoice' ? 'Wystaw fakturę' : 'Zatwierdź poprawkę'}</span>
                        <span>{actionDetail}</span>
                    </ActionText>
                    <ArrowRight aria-hidden="true" />
                </PrimaryAction>
            </SettlementFooter>
        </>
    );
}
