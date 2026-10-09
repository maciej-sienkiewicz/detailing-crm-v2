// src/modules/comms/inbox/CaseRail.tsx
// Panel sprawy obok rozmowy - z makiety: kwota, klient i jeden krok następny.
//
// Wycena jest jedynym wyniesieniem w kolumnie (CLAUDE.md §2): biała karta z paskiem
// marki, kwota jako nagłówek, pozycje jako dowód pod nią. Kwoty to brutto z serwera
// (`totalGross` pozycji, `estimatedValue` sprawy) - bez przeliczania (CLAUDE.md §1).
//
// Na wąskim ekranie ten sam panel wysuwa się jako arkusz (RailSheet): na telefonie
// od dołu, na tablecie z prawej - otwiera go kwota w nagłówku rozmowy.
import { useEffect, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import styled, { css } from 'styled-components';
import { ChevronDown, Pencil, Phone, Trash2, X } from 'lucide-react';
import { acquireScrollLock } from '@/common/utils/scrollLock';
import { LEAD_STATUS_COLORS, LEAD_STATUS_LABELS, type ContactCard, type Lead, type LeadStatus } from '../types';
import { LeadStatusPicker } from '../components/LeadStatusPicker';
import { toQuoteRows } from '../utils/leadServiceLines';
import { LeadSuggestions } from '../components/LeadSuggestions';
import { clientLine, formatAmount, quoteHeading } from './caseModel';
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

/** Usunięcie - ciche, ale czerwone: jedyna operacja w panelu, której nie da się cofnąć. */
const DeleteBtn = styled.button.attrs({ type: 'button' })`
    align-self: center;
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 6px 10px;
    border: none;
    border-radius: 999px;
    background: transparent;
    color: ${ix.late};
    font-family: inherit;
    font-size: 13px;
    font-weight: 500;
    cursor: pointer;

    svg { width: 15px; height: 15px; }
    &:hover { background: #fef2f2; }
    &:focus-visible { outline: 2px solid ${ix.late}; outline-offset: 2px; }
    @media (hover: none) and (pointer: coarse) { min-height: 44px; }
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
    h3 { margin: 0; font-size: 15px; font-weight: 600; color: ${ix.ink}; overflow-wrap: anywhere; }
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
    onDelete: () => void;
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
                        <p className="total">{formatAmount(lead.estimatedValue)}</p>
                        {rows.map((row) => (
                            <p className="row" key={row.id}>
                                <span>{row.quantity > 1 ? `${row.name} ×${row.quantity}` : row.name}</span>
                                <span className="amount">{formatAmount(row.grossCents)}</span>
                            </p>
                        ))}
                    </>
                ) : (
                    <p className="empty">Sprawa nie ma jeszcze wyceny.</p>
                )}
                {/* Propozycje asystenta pod przyjętymi pozycjami: „Razem" liczy tylko
                    przyjęte, a to są propozycje czekające na decyzję. */}
                <SuggestionsSlot>
                    <LeadSuggestions lead={lead} />
                </SuggestionsSlot>
            </QuoteCard>
            <Client aria-label="Klient">
                <div className="who">
                    <h3>{name}</h3>
                    <p>{clientLine(contactCard)}</p>
                </div>
                <EditBtn
                    onClick={(event) => onEditClient(event.currentTarget)}
                    aria-label={known ? 'Edytuj dane klienta' : 'Dodaj klienta do kartoteki'}
                    title={known ? 'Edytuj dane klienta' : 'Dodaj klienta do kartoteki'}
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
        <StatusRow aria-label="Status sprawy">
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

export function CaseDelete({ onDelete }: { onDelete: () => void }) {
    return (
        <DeleteBtn onClick={onDelete}>
            <Trash2 aria-hidden="true" /> Usuń sprawę
        </DeleteBtn>
    );
}

export function CaseRail({ cta, onChangeStatus, statusPending, onDelete, ...props }: RailBodyProps) {
    return (
        <Aside aria-label="Sprawa">
            <QuoteAndClient {...props} />
            <CaseStatus status={props.lead.status} onChange={onChangeStatus} pending={statusPending} />
            <Bottom>
                {cta}
                <CaseDelete onDelete={onDelete} />
            </Bottom>
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
    .links { display: flex; flex-wrap: wrap; gap: 8px; }
    /* W arkuszu rzędy nie mają wcięcia - status trzyma tę samą krawędź co klient. */
    > ${StatusRow} { padding: 0; }
`;

const SheetLink = styled.button`
    height: 40px;
    padding: 0 14px;
    border: 1px solid ${ix.line};
    border-radius: 999px;
    background: #ffffff;
    color: ${ix.inkSoft};
    font-family: inherit;
    font-size: 14px;
    font-weight: 500;
    cursor: pointer;
`;

interface RailSheetProps extends CaseActions {
    lead: Lead;
    contactCard: ContactCard | null | undefined;
    phone: string | null;
    /** true - wysuwany z prawej (tablet), false - od dołu (telefon). */
    side: boolean;
    onClose: () => void;
    onDetails: () => void;
    cta?: ReactNode;
}

/** Arkusz wyceny z makiety „Telefon: arkusz wyceny". */
export function RailSheet({ lead, contactCard, phone, side, onClose, onEditQuote, onEditClient, onChangeStatus, statusPending, onDelete, onDetails, cta }: RailSheetProps) {
    useEffect(() => acquireScrollLock(), []);
    useEffect(() => {
        const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose(); };
        document.addEventListener('keydown', onKey);
        return () => document.removeEventListener('keydown', onKey);
    }, [onClose]);

    const rows = toQuoteRows(lead.services);
    const name = lead.customerName?.trim() || contactCard?.customer?.fullName || lead.contactIdentifier;

    return createPortal(
        <>
            <Overlay onClick={onClose} aria-hidden="true" />
            <Sheet $side={side} role="dialog" aria-modal="true" aria-labelledby="case-sheet-title">
                {!side && <span className="handle" aria-hidden="true" />}
                <div className="top">
                    <div>
                        <h2 id="case-sheet-title">{rows.length > 0 ? quoteHeading(lead) : 'Wycena'}</h2>
                        <p className="total">{rows.length > 0 ? formatAmount(lead.estimatedValue) : 'Brak'}</p>
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
                        <p className="name">{name}</p>
                        <p className="line">{clientLine(contactCard)}</p>
                    </div>
                    <EditBtn
                        onClick={(event) => onEditClient(event.currentTarget)}
                        aria-label={clientKnown(lead, contactCard) ? 'Edytuj dane klienta' : 'Dodaj klienta do kartoteki'}
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
                <div className="links">
                    <SheetLink type="button" onClick={onDetails}>Szczegóły sprawy</SheetLink>
                </div>
                {cta}
                <CaseDelete onDelete={onDelete} />
            </Sheet>
        </>,
        document.body
    );
}
