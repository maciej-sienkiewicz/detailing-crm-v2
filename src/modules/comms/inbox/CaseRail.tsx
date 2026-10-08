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
import { Phone, X } from 'lucide-react';
import { acquireScrollLock } from '@/common/utils/scrollLock';
import type { ContactCard, Lead } from '../types';
import { toQuoteRows } from '../utils/leadServiceLines';
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
    .edit {
        display: inline-block;
        margin-top: 14px;
        padding: 0;
        border: none;
        background: none;
        font-family: inherit;
        font-size: 13px;
        font-weight: 500;
        color: ${ix.accentInk};
        cursor: pointer;
        &:hover { text-decoration: underline; }
    }
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

interface RailBodyProps {
    lead: Lead;
    contactCard: ContactCard | null | undefined;
    phone: string | null;
    onEditQuote?: () => void;
    /** Krok następny (FooterPrimary) - stoi na dole panelu. */
    cta?: ReactNode;
}

/** Karta wyceny i klient - wspólne dla panelu obok rozmowy i arkusza. */
export function QuoteAndClient({ lead, contactCard, phone, onEditQuote }: Omit<RailBodyProps, 'cta' | 'large'>) {
    const rows = toQuoteRows(lead.services);
    const name = lead.customerName?.trim() || contactCard?.customer?.fullName || lead.contactIdentifier;
    return (
        <>
            <QuoteCard aria-label="Wycena">
                <h3>{rows.length > 0 ? quoteHeading(lead) : 'Wycena'}</h3>
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
                {onEditQuote && (
                    <button type="button" className="edit" onClick={onEditQuote}>
                        {rows.length > 0 ? 'Zmień wycenę' : 'Dodaj wycenę'}
                    </button>
                )}
            </QuoteCard>
            <Client aria-label="Klient">
                <div className="who">
                    <h3>{name}</h3>
                    <p>{clientLine(contactCard)}</p>
                </div>
                {phone && (
                    <IconBtn as="a" href={`tel:${phone.replace(/\s/g, '')}`} aria-label={`Zadzwoń: ${phone}`} title={phone} $size={44}>
                        <Phone />
                    </IconBtn>
                )}
            </Client>
        </>
    );
}

/** Bez „Zmień wycenę" w karcie (makieta): zmiana wyceny jest w menu „⋯" rozmowy. */
export function CaseRail({ cta, ...props }: Omit<RailBodyProps, 'onEditQuote'>) {
    return (
        <Aside aria-label="Sprawa">
            <QuoteAndClient {...props} />
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
    .links { display: flex; flex-wrap: wrap; gap: 8px; }
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

interface RailSheetProps {
    lead: Lead;
    contactCard: ContactCard | null | undefined;
    phone: string | null;
    /** true - wysuwany z prawej (tablet), false - od dołu (telefon). */
    side: boolean;
    onClose: () => void;
    onEditQuote?: () => void;
    onDetails: () => void;
    cta?: ReactNode;
}

/** Arkusz wyceny z makiety „Telefon: arkusz wyceny". */
export function RailSheet({ lead, contactCard, phone, side, onClose, onEditQuote, onDetails, cta }: RailSheetProps) {
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
                    <button type="button" className="close" aria-label="Zamknij" onClick={onClose}><X /></button>
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
                <div className="client">
                    <div className="who">
                        <p className="name">{name}</p>
                        <p className="line">{clientLine(contactCard)}</p>
                    </div>
                    {phone && (
                        <IconBtn as="a" href={`tel:${phone.replace(/\s/g, '')}`} aria-label={`Zadzwoń: ${phone}`} $size={48}>
                            <Phone />
                        </IconBtn>
                    )}
                </div>
                <div className="links">
                    {onEditQuote && <SheetLink type="button" onClick={onEditQuote}>{rows.length > 0 ? 'Zmień wycenę' : 'Dodaj wycenę'}</SheetLink>}
                    <SheetLink type="button" onClick={onDetails}>Szczegóły sprawy</SheetLink>
                </div>
                {cta}
            </Sheet>
        </>,
        document.body
    );
}
