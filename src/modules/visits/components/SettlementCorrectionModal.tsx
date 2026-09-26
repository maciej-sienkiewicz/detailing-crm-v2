// src/modules/visits/components/SettlementCorrectionModal.tsx
//
// „Popraw rozliczenie" wizyty wydanej: ceny i stawki pozycji, rodzaj dokumentu,
// nabywca, forma płatności, powód. Przed zapisem serwer sprawdza plan poprawki
// (ten sam, który potem wykonuje) - okno pokazuje tylko, czy da się ją zrobić,
// a jeśli nie, to dlaczego.
//
// Nic nie jest usuwane: stare dokumenty zostają w historii wizyty obok korekt.
// Otwarty edytor przejmuje okno, więc „Zatwierdź poprawkę" jest jedynym wypełnieniem
// (CLAUDE.md §2, wyjątek edytora).

import { useEffect, useMemo, useState } from 'react';
import styled from 'styled-components';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
    ModalShell, ModalHeader, ModalTitleGroup, ModalTitle, ModalSubtitle, ModalContent, ModalFooter, CloseBtn,
} from '@/common/components/ModalKit';
import { Button, Notice, SectionTitle, Segmented, StatusPill, ui } from '@/common/components/ui';
import { useToast } from '@/common/components/Toast';
import { formatCurrency } from '@/common/utils';
import { MAX_2_DECIMALS } from '@/common/utils/moneyInput';
import { apiErrorMessage } from '../api/apiError';
import {
    settlementApi,
    type SettlementCorrectionRequest,
    type SettlementDocumentType,
    type SettlementView,
} from '../api/settlementApi';
import {
    SETTLEMENT_VAT_RATES, changedServiceLines, lineChanged, lineFromService, totalGrossCents,
    withLineGross, withLineNet, withLineVatRate, type SettlementLineDraft,
} from '../utils/settlementLines';
import { BuyerEditor } from './handover/BuyerEditor';
import { PaymentMethodPicker } from './handover/PaymentMethodPicker';
import type { HandoverBuyer } from '../types/handover';
import type { PaymentMethod } from '../types/stateTransitions';
import { visitDetailQueryKey } from '../hooks';

const pln = (cents: number) => formatCurrency(cents / 100);

const DOCUMENT_TYPES: Array<{ value: SettlementDocumentType; label: string }> = [
    { value: 'RECEIPT', label: 'Paragon' },
    { value: 'INVOICE', label: 'Faktura' },
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

// ─── Wygląd ───────────────────────────────────────────────────────────────────

const Section = styled.section`
    display: flex;
    flex-direction: column;
    gap: 10px;

    & + & { margin-top: 22px; }
`;

const DocList = styled.ul`
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 6px;
`;

const DocRow = styled.li<{ $muted?: boolean }>`
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 6px 12px;
    font-size: 13.5px;
    color: ${p => p.$muted ? ui.textMuted : ui.ink};

    strong { font-weight: 600; font-variant-numeric: tabular-nums; }
    .amount { margin-left: auto; font-variant-numeric: tabular-nums; font-weight: 600; }
`;

const Lines = styled.div`
    display: flex;
    flex-direction: column;
    gap: 12px;
`;

const Line = styled.div<{ $changed: boolean }>`
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto;
    gap: 8px 12px;
    padding: 12px 14px;
    border-radius: 12px;
    border: 1px solid ${p => p.$changed ? ui.brandLine : ui.line};
    background: ${p => p.$changed ? ui.brandTint : ui.surface};

    @media (max-width: 560px) { grid-template-columns: minmax(0, 1fr); }
`;

const LineName = styled.div`
    font-size: 14px;
    font-weight: 600;
    color: ${ui.ink};
    align-self: center;
`;

const Amounts = styled.div`
    grid-column: 1 / -1;
    display: grid;
    grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
    gap: 10px;
`;

const Field = styled.label`
    display: flex;
    flex-direction: column;
    gap: 4px;
    font-size: 12.5px;
    font-weight: 600;
    color: ${ui.inkSoft};

    input, textarea {
        font: inherit;
        font-size: 14px;
        font-weight: 500;
        color: ${ui.ink};
        padding: 9px 11px;
        border: 1px solid ${ui.line};
        border-radius: 10px;
        background: #fff;
        min-height: 40px;
        width: 100%;
        min-width: 0;
        box-sizing: border-box;
    }
    textarea { min-height: 64px; resize: vertical; }
    input:focus-visible, textarea:focus-visible { outline: 2px solid ${ui.focusRing}; outline-offset: 1px; }
`;

const Totals = styled.p`
    margin: 0;
    font-size: 14px;
    color: ${ui.inkSoft};

    strong { color: ${ui.ink}; font-variant-numeric: tabular-nums; }
`;

const History = styled.details`
    font-size: 13px;
    color: ${ui.inkSoft};

    summary { cursor: pointer; font-weight: 600; color: ${ui.ink}; }
    article { margin-top: 10px; padding-top: 10px; border-top: 1px solid ${ui.lineFaint}; }
    p { margin: 2px 0; }
`;

// ─── Komponent ────────────────────────────────────────────────────────────────

interface Props {
    visitId: string;
    onClose: () => void;
}

export const SettlementCorrectionModal = ({ visitId, onClose }: Props) => {
    const { data, isLoading, isError, refetch } = useQuery({
        queryKey: ['settlement', visitId],
        queryFn: () => settlementApi.get(visitId),
    });

    return (
        <ModalShell isOpen onClose={onClose} size="lg">
            <ModalHeader>
                <ModalTitleGroup>
                    <ModalTitle>Popraw rozliczenie</ModalTitle>
                    <ModalSubtitle>
                        {data ? `Wizyta wydana, ${pln(data.totalGross)} brutto` : 'Wczytywanie rozliczenia'}
                    </ModalSubtitle>
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
            {isLoading && <ModalContent><Totals>Wczytywanie…</Totals></ModalContent>}
            {data && <CorrectionForm view={data} visitId={visitId} onClose={onClose} />}
        </ModalShell>
    );
};

const emptyBuyer: HandoverBuyer = { nip: '', name: '', addressLine1: '', addressLine2: '', email: '' };

function CorrectionForm({ view, visitId, onClose }: { view: SettlementView; visitId: string; onClose: () => void }) {
    const queryClient = useQueryClient();
    const { showSuccess, showWarning } = useToast();

    const [lines, setLines] = useState<SettlementLineDraft[]>(() => view.services.map(lineFromService));
    const [documentType, setDocumentType] = useState<SettlementDocumentType>(view.documentType ?? 'RECEIPT');
    const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(view.paymentMethod ?? 'CASH');
    const [dueDate, setDueDate] = useState('');
    const [buyer, setBuyer] = useState<HandoverBuyer>(() => ({
        ...emptyBuyer,
        nip: view.buyer?.nip ?? '',
        name: view.buyer?.name ?? '',
        addressLine1: view.buyer?.addressLine1 ?? '',
        addressLine2: view.buyer?.addressLine2 ?? '',
        email: view.buyer?.email ?? '',
    }));
    const [exemption, setExemption] = useState('');
    const [reason, setReason] = useState('');

    const needsExemption = documentType === 'INVOICE' && lines.some(l => l.vatRate === -1);
    const request = useMemo<SettlementCorrectionRequest>(() => ({
        services: changedServiceLines(lines),
        documentType,
        paymentMethod,
        dueDate: paymentMethod === 'TRANSFER' ? dueDate || null : null,
        buyer: documentType === 'INVOICE' ? buyer : null,
        exemptionLegalBasis: needsExemption ? exemption || null : null,
        reason: reason || null,
    }), [lines, documentType, paymentMethod, dueDate, buyer, needsExemption, exemption, reason]);

    // Podgląd po chwili ciszy: każde naciśnięcie klawisza w cenie nie musi pytać serwera.
    const [debounced, setDebounced] = useState(request);
    useEffect(() => {
        const timer = window.setTimeout(() => setDebounced(request), 350);
        return () => window.clearTimeout(timer);
    }, [request]);
    // Nic jeszcze nie zmieniono: zamiast pytać serwer i straszyć „nie da się",
    // okno mówi, co można tu zrobić.
    // Wizyta bez dokumentu: sam wybór rodzaju dokumentu jest zmianą (dopisuje brakujący).
    const pristine = view.documentType !== null &&
        debounced.services.length === 0 &&
        debounced.documentType === (view.documentType ?? 'RECEIPT') &&
        debounced.paymentMethod === (view.paymentMethod ?? 'CASH') &&
        debounced.buyer === null;
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
            queryClient.invalidateQueries({ queryKey: visitDetailQueryKey(visitId) });
            queryClient.invalidateQueries({ queryKey: ['settlement', visitId] });
            queryClient.invalidateQueries({ queryKey: ['ksef', 'revenue'] });
            queryClient.invalidateQueries({ queryKey: ['income-documents'] });
            queryClient.invalidateQueries({ queryKey: ['finance'] });
            if (result.ksefError) {
                showWarning('Rozliczenie poprawione, KSeF wymaga uwagi', result.ksefError);
            } else {
                showSuccess('Rozliczenie poprawione', 'Stare dokumenty zostały w historii wizyty obok korekt.');
            }
            onClose();
        },
    });

    const updateLine = (id: string, change: (line: SettlementLineDraft) => SettlementLineDraft) =>
        setLines(prev => prev.map(line => (line.id === id ? change(line) : line)));

    const activeDocuments = view.documents.filter(d => d.active);
    const activeInvoices = view.invoices.filter(i => i.active);
    const blockReason = preview.data?.blockReason ?? null;
    const canSubmit = !pristine && upToDate && !!preview.data && !blockReason && !correct.isPending;

    return (
        <>
            <ModalContent>
                <Section aria-labelledby="settlement-now">
                    <SectionTitle id="settlement-now" as="h3">Obecne rozliczenie</SectionTitle>
                    {activeDocuments.length === 0 && activeInvoices.length === 0 ? (
                        <Totals>Wizyta nie ma dokumentu rozliczenia.</Totals>
                    ) : (
                        <DocList>
                            {activeDocuments.map(doc => (
                                <DocRow key={doc.id}>
                                    <strong>{doc.number}</strong>
                                    <span>{doc.typeLabel}</span>
                                    <span>{doc.paymentMethodLabel}</span>
                                    <span className="amount">{pln(doc.totalGross)}</span>
                                </DocRow>
                            ))}
                            {activeInvoices.map(inv => (
                                <DocRow key={inv.id}>
                                    <strong>{inv.number}</strong>
                                    <span>{inv.invoiceToReceipt ? 'Faktura do paragonu' : 'Faktura KSeF'}</span>
                                    <StatusPill $tone={INVOICE_STATUS[inv.status]?.tone ?? 'neutral'}>
                                        {INVOICE_STATUS[inv.status]?.label ?? inv.status}
                                    </StatusPill>
                                    <span className="amount">{pln(inv.totalGross)}</span>
                                </DocRow>
                            ))}
                        </DocList>
                    )}
                </Section>

                <Section aria-labelledby="settlement-services">
                    <SectionTitle id="settlement-services" as="h3" count={lines.length}>Usługi</SectionTitle>
                    <Lines>
                        {lines.map(line => (
                            <Line key={line.id} $changed={lineChanged(line)}>
                                <LineName>{line.name}</LineName>
                                <Segmented
                                    label={`Stawka VAT: ${line.name}`}
                                    size="sm"
                                    options={SETTLEMENT_VAT_RATES}
                                    value={String(line.vatRate)}
                                    onChange={rate => updateLine(line.id, l => withLineVatRate(l, Number(rate)))}
                                />
                                <Amounts>
                                    <Field>
                                        Netto
                                        <input
                                            inputMode="decimal"
                                            value={line.net}
                                            aria-label={`Netto: ${line.name}`}
                                            onChange={e => MAX_2_DECIMALS.test(e.target.value) &&
                                                updateLine(line.id, l => withLineNet(l, e.target.value))}
                                        />
                                    </Field>
                                    <Field>
                                        Brutto
                                        <input
                                            inputMode="decimal"
                                            value={line.gross}
                                            aria-label={`Brutto: ${line.name}`}
                                            onChange={e => MAX_2_DECIMALS.test(e.target.value) &&
                                                updateLine(line.id, l => withLineGross(l, e.target.value))}
                                        />
                                    </Field>
                                </Amounts>
                            </Line>
                        ))}
                    </Lines>
                    <Totals>
                        Razem <strong>{pln(totalGrossCents(lines))}</strong> brutto, było {pln(view.totalGross)}.
                    </Totals>
                </Section>

                <Section aria-labelledby="settlement-document">
                    <SectionTitle id="settlement-document" as="h3">Dokument i płatność</SectionTitle>
                    <Segmented
                        label="Rodzaj dokumentu"
                        options={DOCUMENT_TYPES}
                        value={documentType}
                        onChange={setDocumentType}
                    />
                    {documentType === 'INVOICE' && <BuyerEditor buyer={buyer} onChange={setBuyer} />}
                    {needsExemption && (
                        <Field>
                            Podstawa zwolnienia z VAT
                            <input value={exemption} onChange={e => setExemption(e.target.value)} placeholder="np. art. 113 ust. 1 ustawy o VAT" />
                        </Field>
                    )}
                    <PaymentMethodPicker value={paymentMethod} onChange={setPaymentMethod} />
                    {paymentMethod === 'TRANSFER' && (
                        <Field>
                            Termin płatności
                            <input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} />
                        </Field>
                    )}
                    <Field>
                        Powód (nieobowiązkowo)
                        <textarea
                            value={reason}
                            maxLength={500}
                            onChange={e => setReason(e.target.value)}
                            placeholder="np. rabat po odbiorze, klient poprosił o fakturę"
                        />
                    </Field>
                </Section>

                {/* Bez listy skutków (decyzja biznesu). Serwer nadal sprawdza plan przed
                    zapisem, więc gdy poprawki nie da się wykonać, mówimy dlaczego —
                    inaczej nieaktywny przycisk nie miałby wyjaśnienia. */}
                {(blockReason && !pristine) || preview.isError || correct.isError ? (
                    <Section aria-live="polite">
                        {blockReason && !pristine && (
                            <Notice tone="warn" title="Tej poprawki nie da się teraz wykonać">{blockReason}</Notice>
                        )}
                        {preview.isError && (
                            <Notice tone="danger" title="Nie udało się sprawdzić poprawki">
                                {apiErrorMessage(preview.error, 'Spróbuj ponownie za chwilę.')}
                            </Notice>
                        )}
                        {correct.isError && (
                            <Notice tone="danger" title="Poprawka nie została zapisana">
                                {apiErrorMessage(correct.error, 'Spróbuj ponownie.')}
                            </Notice>
                        )}
                    </Section>
                ) : null}

                {view.history.length > 0 && (
                    <Section>
                        <History>
                            <summary>Historia rozliczenia ({view.history.length})</summary>
                            {view.history.map(entry => (
                                <article key={entry.id}>
                                    <p>
                                        <strong>{new Date(entry.createdAt).toLocaleString('pl-PL')}</strong>
                                        {entry.createdByName ? `, ${entry.createdByName}` : ''}
                                    </p>
                                    <p>Kwota {pln(entry.totalGrossBefore)} → {pln(entry.totalGrossAfter)}, {entry.ksefAction.toLowerCase()}.</p>
                                    {entry.reason && <p>Powód: {entry.reason}</p>}
                                    {entry.ksefError && <p style={{ color: ui.dangerInk }}>{entry.ksefError}</p>}
                                </article>
                            ))}
                        </History>
                    </Section>
                )}
            </ModalContent>
            <ModalFooter>
                <Button variant="ghost" onClick={onClose}>Anuluj</Button>
                <Button variant="primary" onClick={() => correct.mutate()} disabled={!canSubmit}>
                    {correct.isPending ? 'Zapisywanie…' : 'Zatwierdź poprawkę'}
                </Button>
            </ModalFooter>
        </>
    );
}
