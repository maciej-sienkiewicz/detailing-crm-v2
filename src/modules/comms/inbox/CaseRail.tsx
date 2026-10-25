// src/modules/comms/inbox/CaseRail.tsx
// Panel sprawy obok rozmowy - z makiety: kwota, klient i jeden krok następny.
//
// Wycena jest jedynym wyniesieniem w kolumnie (CLAUDE.md §2): biała karta z paskiem
// marki, kwota jako nagłówek, pozycje jako dowód pod nią. Kwota to suma brutto
// przyjętych pozycji z serwera (`quoteTotal`) - bez przeliczania (CLAUDE.md §1)
// i bez sugestii, które dopiero czekają na decyzję.
//
// Usunięcie sprawy mieszka w menu „⋯": na dole panelu stoi krok następny, a jedyna
// nieodwracalna operacja nie może zajmować jego miejsca.
//
// Na wąskim ekranie ten sam panel wysuwa się jako arkusz (RailSheet): na telefonie
// od dołu, na tablecie z prawej - otwiera go kwota w nagłówku rozmowy.
import { useEffect, useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import styled, { css } from 'styled-components';
import { ChevronDown, Pencil, Phone, X } from 'lucide-react';
import { acquireScrollLock } from '@/common/utils/scrollLock';
import { LEAD_STATUS_COLORS, LEAD_STATUS_LABELS, type ContactCard, type Lead, type LeadStatus } from '../types';
import { LeadStatusPicker } from '../components/LeadStatusPicker';
import { toQuoteRows } from '../utils/leadServiceLines';
import { LeadSuggestions } from '../components/LeadSuggestions';
import { clientLine, formatAmount, quoteHeading, quoteTotal } from './caseModel';
import { IconBtn } from './primitives';
import { ix } from './tokens';

const Aside = styled.aside`
    flex: 1 1 320px;
    max-width: 360px;
    min-width: 300px;
    min-height: 0;
    overflow-y: auto;
    display: flex;
    flex-direction: column;
    gap: 28px;
    padding: 24px 20px;
    box-sizing: border-box;
    background: ${ix.surfaceSoft};
    border-left: 1px solid ${ix.line};
`;

const QuoteCard = styled.section`
    padding: 20px;
    border-top: 4px solid ${ix.accent};
    border-radius: 20px;
    background: #ffffff;
    box-shadow: ${ix.cardShadow};

    .head { display: flex; align-items: center; justify-content: space-between; gap: 8px; margin-top: -6px; }
    h3 { margin: 0; font-size: 13px; font-weight: 600; color: ${ix.text2}; }
    .total {
        margin: 6px 0 16px;
        font-size: 32px;
        font-weight: 700;
        letter-spacing: -0.03em;
        color: ${ix.ink};
        font-variant-numeric: tabular-nums;
    }
    .row {
        display: flex;
        justify-content: space-between;
        gap: 12px;
        margin: 0 0 6px;
        font-size: 14px;
        color: ${ix.inkSoft};
    }
    .row:last-of-type { margin-bottom: 0; }
    .row .amount { flex: none; font-variant-numeric: tabular-nums; }
    .empty { margin: 6px 0 0; font-size: 14px; color: ${ix.muted}; }
`;

/** Ołówek przy wycenie i kliencie - edycja jest tam, gdzie leży to, co się edytuje. */
const EditBtn = styled.button.attrs({ type: 'button' })`
    display: inline-flex;
    align-items: center;
    justify-content: center;
    flex: none;
    width: 32px;
    height: 32px;
    padding: 0;
    border: none;
    border-radius: 999px;
    background: transparent;
    color: ${ix.muted};
    cursor: pointer;

    svg { width: 16px; height: 16px; }
    &:hover { background: ${ix.surfaceAlt}; color: ${ix.ink}; }
    &:focus-visible { outline: 2px solid ${ix.accent}; outline-offset: 2px; }
    @media (hover: none) and (pointer: coarse) { width: 44px; height: 44px; }
`;

const StatusRow = styled.section`
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    padding: 0 4px;

    .label { font-size: 13px; font-weight: 600; color: ${ix.text2}; }
`;

/** Stan sprawy - odcień i obwódka, nie wypełnienie (to stan, nie krok następny). */
const StatusTrigger = styled.button<{ $bg: string; $fg: string }>`
    display: inline-flex;
    align-items: center;
    gap: 8px;
    height: 36px;
    padding: 0 12px 0 10px;
    border: 1px solid ${ix.line};
    border-radius: 999px;
    background: ${p => p.$bg};
    color: ${p => p.$fg};
    font-family: inherit;
    font-size: 13px;
    font-weight: 600;
    cursor: pointer;

    .dot { width: 8px; height: 8px; border-radius: 999px; background: ${p => p.$fg}; }
    svg { width: 14px; height: 14px; }
    &:disabled { opacity: 0.6; cursor: default; }
    &:focus-visible { outline: 2px solid ${ix.accent}; outline-offset: 2px; }
    @media (hover: none) and (pointer: coarse) { height: 44px; }
`;

const SuggestionsSlot = styled.div`
    margin-top: 14px;
    padding-top: 12px;
    border-top: 1px solid ${ix.lineSoft};
`;

const Client = styled.section`
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 0 4px;

    .who { flex: 1; min-width: 0; }
    h3 { margin: 0; font-size: 15px; font-weight: 600; color: ${ix.ink}; overflow-wrap: break-word; }
    p { margin: 2px 0 0; font-size: 13px; color: ${ix.text2}; }
`;

const Bottom = styled.div`
    margin-top: auto;
    display: flex;
    flex-direction: column;
    gap: 10px;
`;

export interface CaseActions {
    onEditQuote: () => void;
    /** Ołówek przy kliencie: edycja w kartotece albo dodanie do niej nowego klienta. */
    onEditClient: (anchor: HTMLElement) => void;
    onChangeStatus: (status: LeadStatus) => void;
    statusPending?: boolean;
}

interface RailBodyProps extends CaseActions {
    lead: Lead;
    contactCard: ContactCard | null | undefined;
    phone: string | null;
    /** Krok następny (FooterPrimary) - stoi na dole panelu. */
    cta?: ReactNode;
}

const clientKnown = (lead: Lead, card: ContactCard | null | undefined): boolean =>
    Boolean(lead.customerId || card?.customer);

/**
 * Adres e-mail łamie się po „@", a nie w środku domeny. Bez tego wąski panel ciął
 * „weronika.piotrowska37@onet." i „pl" na dwie linie - adres wyglądał na urwany.
 */
const breakAfterAt = (text: string): ReactNode => {
    const at = text.indexOf('@');
    return at > 0 ? <>{text.slice(0, at + 1)}<wbr />{text.slice(at + 1)}</> : text;
};

/** Karta wyceny i klient - wspólne dla panelu obok rozmowy i arkusza. */
export function QuoteAndClient({ lead, contactCard, phone, onEditQuote, onEditClient }: Pick<RailBodyProps, 'lead' | 'contactCard' | 'phone' | 'onEditQuote' | 'onEditClient'>) {
    const rows = toQuoteRows(lead.services);
    const name = lead.customerName?.trim() || contactCard?.customer?.fullName || lead.contactIdentifier;
    const known = clientKnown(lead, contactCard);
    return (
        <>
            <QuoteCard aria-label="Wycena">
                <div className="head">
                    <h3>{rows.length > 0 ? quoteHeading(lead) : 'Wycena'}</h3>
                    <EditBtn onClick={onEditQuote} aria-label={rows.length > 0 ? 'Edytuj wycenę' : 'Dodaj wycenę'} title={rows.length > 0 ? 'Edytuj wycenę' : 'Dodaj wycenę'}>
                        <Pencil />
                    </EditBtn>
                </div>
                {rows.length > 0 ? (
                    <>
                        <p className="total">{formatAmount(quoteTotal(lead))}</p>
                        {rows.map((row) => (
                            <p className="row" key={row.id}>
                                <span>{row.quantity > 1 ? `${row.name} ×${row.quantity}` : row.name}</span>
                                <span className="amount">{formatAmount(row.grossCents)}</span>
                            </p>
                        ))}
                    </>
                ) : (
                    <p className="empty">Lead nie ma jeszcze wyceny.</p>
                )}
                {/* Propozycje asystenta pod przyjętymi pozycjami: „Razem" liczy tylko
                    przyjęte, a to są propozycje czekające na decyzję. */}
                <SuggestionsSlot>
                    <LeadSuggestions lead={lead} />
                </SuggestionsSlot>
            </QuoteCard>
            <Client aria-label="Klient">
                <div className="who">
                    <h3>{breakAfterAt(name)}</h3>
                    <p>{clientLine(contactCard)}</p>
                </div>
                <EditBtn
                    onClick={(event) => onEditClient(event.currentTarget)}
                    aria-label={known ? 'Edytuj dane klienta' : 'Załóż kartę klienta'}
                    title={known ? 'Edytuj dane klienta' : 'Załóż kartę klienta'}
                >
                    <Pencil />
                </EditBtn>
                {phone && (
                    <IconBtn as="a" href={`tel:${phone.replace(/\s/g, '')}`} aria-label={`Zadzwoń: ${phone}`} title={phone} $size={44}>
                        <Phone />
                    </IconBtn>
                )}
            </Client>
        </>
    );
}

/** Status sprawy z ręczną zmianą - „Przegrany" pyta o powód (robi to wywołujący). */
export function CaseStatus({ status, onChange, pending }: { status: LeadStatus; onChange: (status: LeadStatus) => void; pending?: boolean }) {
    const colors = LEAD_STATUS_COLORS[status];
    return (
        <StatusRow aria-label="Status leada">
            <span className="label">Status</span>
            <LeadStatusPicker
                status={status}
                onChange={onChange}
                disabled={pending}
                renderTrigger={({ open, toggle, disabled }) => (
                    <StatusTrigger
                        type="button"
                        $bg={colors.bg}
                        $fg={colors.fg}
                        aria-haspopup="listbox"
                        aria-expanded={open}
                        aria-label={`Status: ${LEAD_STATUS_LABELS[status]}, zmień`}
                        disabled={disabled}
                        onClick={toggle}
                    >
                        <span className="dot" aria-hidden="true" />
                        {LEAD_STATUS_LABELS[status]}
                        <ChevronDown aria-hidden="true" />
                    </StatusTrigger>
                )}
            />
        </StatusRow>
    );
}

export function CaseRail({ cta, onChangeStatus, statusPending, ...props }: RailBodyProps) {
    return (
        <Aside aria-label="Lead">
            <QuoteAndClient {...props} />
            <CaseStatus status={props.lead.status} onChange={onChangeStatus} pending={statusPending} />
            {cta && <Bottom>{cta}</Bottom>}
        </Aside>
    );
}

// ── Arkusz (telefon i wąski ekran) ──────────────────────────────────────────

const Overlay = styled.div`
    position: fixed;
    inset: 0;
    z-index: 950;
    background: rgba(15, 23, 42, 0.45);
`;

const Sheet = styled.section<{ $side: boolean }>`
    position: fixed;
    z-index: 951;
    display: flex;
    flex-direction: column;
    gap: 24px;
    background: #ffffff;
    overflow-y: auto;
    overscroll-behavior: contain;
    box-sizing: border-box;

    ${p => (p.$side
        ? css`
            top: 0;
            right: 0;
            bottom: 0;
            width: min(380px, 100%);
            padding: 24px 20px;
            background: ${ix.surfaceSoft};
            box-shadow: -12px 0 40px rgba(15, 23, 42, 0.18);
        `
        : css`
            left: 0;
            right: 0;
            bottom: 0;
            max-height: 88dvh;
            padding: 10px 20px calc(28px + env(safe-area-inset-bottom, 0px));
            border-radius: 24px 24px 0 0;
            box-shadow: 0 -12px 40px rgba(15, 23, 42, 0.18);
        `)}

    .handle { align-self: center; width: 36px; height: 4px; border-radius: 999px; background: #cbd5e1; }
    .top { display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; }
    .top h2 { margin: 0; font-size: 14px; font-weight: 600; color: ${ix.text2}; }
    .top .total { margin: 4px 0 0; font-size: 36px; font-weight: 700; letter-spacing: -0.03em; color: ${ix.ink}; font-variant-numeric: tabular-nums; }
    .close {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        flex: none;
        width: 44px;
        height: 44px;
        border: none;
        border-radius: 12px;
        background: transparent;
        color: ${ix.inkSoft};
        cursor: pointer;
        svg { width: 22px; height: 22px; }
    }
    .rows { display: flex; flex-direction: column; gap: 12px; font-size: 16px; color: ${ix.ink}; }
    .rows p { display: flex; justify-content: space-between; gap: 12px; margin: 0; }
    .rows .amount { flex: none; font-variant-numeric: tabular-nums; }
    .client { display: flex; align-items: center; gap: 12px; padding-top: 20px; border-top: 1px solid ${ix.lineSoft}; }
    .client .who { flex: 1; min-width: 0; }
    .client .name { margin: 0; font-size: 16px; font-weight: 600; }
    .client .line { margin: 2px 0 0; font-size: 14px; color: ${ix.text2}; }
    /* W arkuszu rzędy nie mają wcięcia - status trzyma tę samą krawędź co klient. */
    > ${StatusRow} { padding: 0; }
`;

interface RailSheetProps extends CaseActions {
    lead: Lead;
    contactCard: ContactCard | null | undefined;
    phone: string | null;
    /** true - wysuwany z prawej (tablet), false - od dołu (telefon). */
    side: boolean;
    onClose: () => void;
    cta?: ReactNode;
}

/** Arkusz wyceny z makiety „Telefon: arkusz wyceny". */
export function RailSheet({ lead, contactCard, phone, side, onClose, onEditQuote, onEditClient, onChangeStatus, statusPending, cta }: RailSheetProps) {
    useEffect(() => acquireScrollLock(), []);
    // Escape zamyka tylko okno na wierzchu - ta sama zasada co w useModalViewport. Bez niej
    // pierwszy Escape nad „Dlaczego przepadło?" zamykał arkusz POD spodem, a okno zostawało.
    const sheetRef = useRef<HTMLElement>(null);
    useEffect(() => {
        const onKey = (event: KeyboardEvent) => {
            if (event.key !== 'Escape') return;
            const dialogs = document.querySelectorAll('[role="dialog"][aria-modal="true"]');
            const top = dialogs[dialogs.length - 1];
            if (top && sheetRef.current && top !== sheetRef.current) return;
            onClose();
        };
        document.addEventListener('keydown', onKey);
        return () => document.removeEventListener('keydown', onKey);
    }, [onClose]);

    const rows = toQuoteRows(lead.services);
    const name = lead.customerName?.trim() || contactCard?.customer?.fullName || lead.contactIdentifier;

    return createPortal(
        <>
            <Overlay onClick={onClose} aria-hidden="true" />
            <Sheet ref={sheetRef} $side={side} role="dialog" aria-modal="true" aria-labelledby="case-sheet-title">
                {!side && <span className="handle" aria-hidden="true" />}
                <div className="top">
                    <div>
                        <h2 id="case-sheet-title">{rows.length > 0 ? quoteHeading(lead) : 'Wycena'}</h2>
                        <p className="total">{rows.length > 0 ? formatAmount(quoteTotal(lead)) : 'Brak'}</p>
                    </div>
                    <span style={{ display: 'inline-flex', gap: 4 }}>
                        <EditBtn onClick={onEditQuote} aria-label="Edytuj wycenę" title="Edytuj wycenę"><Pencil /></EditBtn>
                        <button type="button" className="close" aria-label="Zamknij" onClick={onClose}><X /></button>
                    </span>
                </div>
                {rows.length > 0 && (
                    <div className="rows">
                        {rows.map((row) => (
                            <p key={row.id}>
                                <span>{row.quantity > 1 ? `${row.name} ×${row.quantity}` : row.name}</span>
                                <span className="amount">{formatAmount(row.grossCents)}</span>
                            </p>
                        ))}
                    </div>
                )}
                <LeadSuggestions lead={lead} />
                <div className="client">
                    <div className="who">
                        <p className="name">{breakAfterAt(name)}</p>
                        <p className="line">{clientLine(contactCard)}</p>
                    </div>
                    <EditBtn
                        onClick={(event) => onEditClient(event.currentTarget)}
                        aria-label={clientKnown(lead, contactCard) ? 'Edytuj dane klienta' : 'Załóż kartę klienta'}
                    >
                        <Pencil />
                    </EditBtn>
                    {phone && (
                        <IconBtn as="a" href={`tel:${phone.replace(/\s/g, '')}`} aria-label={`Zadzwoń: ${phone}`} $size={48}>
                            <Phone />
                        </IconBtn>
                    )}
                </div>
                <CaseStatus status={lead.status} onChange={onChangeStatus} pending={statusPending} />
                {cta}
            </Sheet>
        </>,
        document.body
    );
}
