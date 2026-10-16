import { useState } from 'react';
import styled from 'styled-components';
import { formatCurrency, pluralPl } from '@/common/utils';
import { ui } from '@/common/components/ui';
import type { CompanySettings } from '@/modules/settings/types';
import { GhostAction } from './HandoverKit';
import { InvoicePreviewModal } from './InvoicePreviewModal';
import { paymentMethods } from './paymentOptions';
import { formatNip, normalizeNip, type HandoverProblem, type HandoverState } from '../../types/handover';

/*
 * Prawa kolumna rozliczenia: kwota, „Sprawdź przed wysłaniem” i lista braków.
 *
 * Zamiast rutynowego okna „Czy na pewno?” (po kilku dniach klikanego odruchowo) stale
 * widoczne podsumowanie odświeża się w trakcie decyzji i pokazuje dokładnie to, co
 * pójdzie na fakturę i do KSeF (GOV.UK „Check answers”). „Zmień” przewija do pola po
 * lewej, zamiast cofać do poprzedniego kroku.
 */

const Aside = styled.aside`
    display: flex;
    flex-direction: column;
    gap: 16px;
`;

const Amount = styled.div`
    display: flex;
    flex-direction: column;
    gap: 2px;

    > span:first-child { font-size: 13px; font-weight: 600; color: ${ui.textMuted}; }
    > strong { font-size: 32px; font-weight: 800; letter-spacing: -0.02em; color: ${ui.ink}; font-variant-numeric: tabular-nums; }
    > span:last-child { font-size: 13px; color: ${ui.textMuted}; font-variant-numeric: tabular-nums; }
`;

const Review = styled.section`
    display: flex;
    flex-direction: column;
    padding: 12px 16px 4px;
    border: 1px solid ${ui.line};
    border-radius: 14px;
    background: ${ui.surface};
`;

const ReviewTitle = styled.h3`
    margin: 0 0 6px;
    font-size: 14px;
    font-weight: 700;
    color: ${ui.ink};
`;

const ReviewRow = styled.div`
    display: grid;
    grid-template-columns: 92px minmax(0, 1fr) auto;
    gap: 10px;
    align-items: start;
    padding: 9px 0;
    border-top: 1px solid ${ui.lineFaint};
    font-size: 13px;
    color: ${ui.inkSoft};

    > span:first-child { color: ${ui.textMuted}; }
    strong { color: ${ui.ink}; font-weight: 700; }
    small { display: block; font-size: 12.5px; color: ${ui.textSecondary}; font-variant-numeric: tabular-nums; }
    /* Numer nie łamie się w środku: „502-431-” i „51-66” w dwóch liniach czytały się jak dwa numery. */
    small.nowrap { white-space: nowrap; }

    @media (max-width: 480px) { grid-template-columns: 78px minmax(0, 1fr) auto; }
`;

const Problems = styled.section`
    display: flex;
    flex-direction: column;
    gap: 6px;
    padding: 12px 14px;
    border: 1px solid #fecaca;
    border-radius: 12px;
    background: #fef2f2;
    color: #7f1d1d;
    font-size: 13px;

    strong { font-weight: 700; }
    ol { margin: 0; padding-left: 18px; display: flex; flex-direction: column; gap: 4px; }
    button { all: unset; cursor: pointer; text-decoration: underline; text-underline-offset: 2px; }
    button:focus-visible { outline: 2px solid ${ui.focusRing}; outline-offset: 2px; }
`;

const ANCHOR: Record<HandoverProblem['section'], string> = {
    seller: 'handover-document',
    buyer: 'handover-buyer',
    items: 'handover-positions',
    balance: 'handover-positions',
};

const jumpTo = (id: string) => {
    const el = document.getElementById(id);
    if (!el) return;
    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    el.querySelector<HTMLElement>('input, button, select')?.focus({ preventScroll: true });
};

const todayLabel = () => new Date().toLocaleDateString('pl-PL', { day: '2-digit', month: '2-digit', year: 'numeric' });
const dateLabel = (iso: string) => new Date(`${iso}T12:00:00`).toLocaleDateString('pl-PL', { day: '2-digit', month: '2-digit', year: 'numeric' });

interface SettlementSummaryProps {
    state: HandoverState;
    totals: { net: number; vat: number; gross: number };
    currency: string;
    invoiceGross: number;
    remainder: number;
    invoicedExternally: boolean;
    sendToKsef: boolean;
    ksefBlocked: 'no-token' | 'no-permission' | null;
    transferDueDate: string | null;
    problems: HandoverProblem[];
    company: CompanySettings | undefined;
}

export const SettlementSummary = ({
    state,
    totals,
    currency,
    invoiceGross,
    remainder,
    invoicedExternally,
    sendToKsef,
    ksefBlocked,
    transferDueDate,
    problems,
    company,
}: SettlementSummaryProps) => {
    const [isPreviewOpen, setPreviewOpen] = useState(false);
    const fmt = (grosz: number) => formatCurrency(grosz / 100, currency);
    const isInvoice = state.documentType === 'INVOICE';
    const crmInvoice = isInvoice && !invoicedExternally;
    const hasOther = crmInvoice && state.remainderWithoutReceipt && remainder > 0;
    const nip = normalizeNip(state.buyer.nip);
    const payment = paymentMethods.find(m => m.value === state.paymentMethod)?.label ?? 'Inna metoda';
    const count = state.items.length;

    const documentLine = !isInvoice
        ? (state.documentType === 'RECEIPT' ? 'Paragon' : 'Inne rozliczenie')
        : invoicedExternally
            ? 'Faktura od księgowości'
            : 'Faktura VAT';
    const ksefLine = !crmInvoice
        ? null
        : sendToKsef
            ? 'trafi do KSeF'
            : ksefBlocked === 'no-token'
                ? 'nie trafi do KSeF: brak tokenu (Ustawienia → KSeF)'
                : ksefBlocked === 'no-permission'
                    ? 'nie trafi do KSeF: token bez prawa wystawiania'
                    : 'bez wysyłki do KSeF';

    return (
        <Aside aria-label="Podsumowanie rozliczenia">
            <Amount>
                <span>Do zapłaty</span>
                <strong>{fmt(totals.gross)}</strong>
                <span>
                    {hasOther
                        ? `faktura ${fmt(invoiceGross)}, inny dokument ${fmt(remainder)}`
                        : `netto ${fmt(totals.net)}, VAT ${fmt(totals.vat)}`}
                </span>
            </Amount>

            <Review>
                <ReviewTitle>{crmInvoice ? 'Sprawdź przed wysłaniem' : 'Podsumowanie'}</ReviewTitle>
                <ReviewRow>
                    <span>Dokument</span>
                    <span><strong>{documentLine}</strong>{ksefLine && <small>{ksefLine}</small>}</span>
                    <GhostAction type="button" onClick={() => jumpTo('handover-document')}>Zmień</GhostAction>
                </ReviewRow>
                {isInvoice && (
                    <ReviewRow>
                        <span>Nabywca</span>
                        <span>
                            <strong>{state.buyer.name.trim() || 'Brak nazwy nabywcy'}</strong>
                            <small className="nowrap">{nip ? `NIP ${formatNip(nip)}` : 'Osoba prywatna'}</small>
                        </span>
                        <GhostAction type="button" onClick={() => jumpTo('handover-buyer')}>Zmień</GhostAction>
                    </ReviewRow>
                )}
                {crmInvoice && (
                    <ReviewRow>
                        <span>Data</span>
                        <span>Dziś, {todayLabel()}</span>
                        <span />
                    </ReviewRow>
                )}
                {crmInvoice && (
                    <ReviewRow>
                        <span>Faktura</span>
                        <span>
                            <strong>{fmt(invoiceGross)}</strong>
                            <small>{count} {pluralPl(count, 'pozycja', 'pozycje', 'pozycji')}</small>
                        </span>
                        <GhostAction type="button" onClick={() => setPreviewOpen(true)}>Podgląd</GhostAction>
                    </ReviewRow>
                )}
                <ReviewRow>
                    <span>Płatność</span>
                    <span>
                        {payment}
                        <small>
                            {state.paymentMethod === 'TRANSFER' && transferDueDate
                                ? `termin ${dateLabel(transferDueDate)}`
                                : 'zapłacono'}
                        </small>
                    </span>
                    <GhostAction type="button" onClick={() => jumpTo('handover-payment')}>Zmień</GhostAction>
                </ReviewRow>
                {hasOther && (
                    <ReviewRow>
                        <span>Inny dokument</span>
                        <span><strong>{fmt(remainder)}</strong><small>gotówka</small></span>
                        <span />
                    </ReviewRow>
                )}
                <ReviewRow>
                    <span>Protokół</span>
                    <span>{state.protocolSigned ? 'Podpisany' : 'Bez podpisu klienta'}</span>
                    <span />
                </ReviewRow>
            </Review>

            {problems.length > 0 && (
                <Problems role="alert" aria-label="Do poprawienia">
                    <strong>Zanim wydasz auto:</strong>
                    <ol>
                        {problems.map((problem, i) => (
                            <li key={i}>
                                <button type="button" onClick={() => jumpTo(ANCHOR[problem.section])}>{problem.message}</button>
                            </li>
                        ))}
                    </ol>
                </Problems>
            )}

            {crmInvoice && (
                <InvoicePreviewModal
                    isOpen={isPreviewOpen}
                    onClose={() => setPreviewOpen(false)}
                    company={company}
                    buyer={state.buyer}
                    items={state.items}
                    paymentMethod={state.paymentMethod}
                    fmt={fmt}
                />
            )}
        </Aside>
    );
};
