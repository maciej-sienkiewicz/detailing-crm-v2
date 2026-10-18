// src/modules/comms/inbox/board/BoardCard.tsx
// Karta sprawy na tablicy - to samo, co mówi wiersz listy, tylko w kafelku:
//
//   [✉] Audi RS6                         4 200 zł
//       Jan Kowalski
//       Odpisał na wycenę                          ← zdanie, nie status
//       ⏱ 27 godz.   ✋ przesunięta ręcznie
//
// Kolor tylko tam, gdzie coś znaczy: akcent przy „klient odpisał", czerwień przy
// zaległości po progu studia, zieleń/szarość wyniku w „Zakończono". Karta niczego nie
// wypełnia - na tablicy nie ma kroku następnego, jest nim otwarcie sprawy (CLAUDE.md §2).
import { forwardRef, type HTMLAttributes } from 'react';
import styled, { css } from 'styled-components';
import { CalendarCheck, Clock, FileText, Hand, Instagram, Mail, PenLine, Phone } from 'lucide-react';
import type { LeadSource } from '../../types';
import type { BoardCard as BoardCardModel } from '../../utils/leadBoard';
import { caseSentence, caseTitle, formatAmount, rowAge } from '../caseModel';
import { ix } from '../tokens';
import { EASE_SPRING } from './motion';

const SOURCE_ICON: Record<LeadSource, typeof Mail> = {
    EMAIL: Mail,
    PHONE: Phone,
    FORM: FileText,
    INSTAGRAM: Instagram,
    MANUAL: PenLine,
};

export const CardSurface = styled.div<{ $phone?: boolean }>`
    position: relative;
    display: flex;
    flex-direction: column;
    gap: 6px;
    padding: 12px 14px 12px 12px;
    border-radius: 14px;
    background: #ffffff;
    border: 1px solid rgba(15, 23, 42, 0.06);
    box-shadow: 0 1px 2px rgba(15, 23, 42, 0.05), 0 4px 14px -6px rgba(15, 23, 42, 0.08);
    color: ${ix.ink};
    font-family: inherit;
    text-align: left;
    cursor: grab;
    user-select: none;
    -webkit-user-select: none;
    -webkit-touch-callout: none;
    /* Pion i poziom przewija przeglądarka; przytrzymanie zamienia gest w przeciąganie. */
    touch-action: pan-x pan-y;
    transition:
        box-shadow 220ms ${EASE_SPRING},
        transform 220ms ${EASE_SPRING},
        opacity 220ms ease;

    @media (hover: hover) {
        &:hover {
            box-shadow: 0 1px 2px rgba(15, 23, 42, 0.06), 0 10px 24px -10px rgba(15, 23, 42, 0.18);
            transform: translateY(-1px);
        }
    }
    &:active { transform: scale(0.985); }
    &:focus-visible { outline: 2px solid ${ix.accent}; outline-offset: 2px; }

    .top { display: flex; align-items: flex-start; gap: 10px; min-width: 0; }
    .source {
        flex: none;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 26px;
        height: 26px;
        border-radius: 8px;
        background: ${ix.surfaceAlt};
        color: ${ix.text2};
        svg { width: 14px; height: 14px; }
    }
    .titles { flex: 1; min-width: 0; }
    .name {
        margin: 0;
        font-size: 14px;
        line-height: 20px;
        font-weight: 700;
        letter-spacing: -0.01em;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
    }
    .person {
        margin: 0;
        font-size: 12.5px;
        line-height: 17px;
        color: ${ix.muted};
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
    }
    .amount {
        flex: none;
        font-size: 13px;
        line-height: 20px;
        font-weight: 700;
        font-variant-numeric: tabular-nums;
        color: ${ix.inkSoft};
    }
    .sentence {
        margin: 0 0 0 36px;
        font-size: 13px;
        line-height: 18px;
        color: ${ix.text2};
        display: -webkit-box;
        -webkit-line-clamp: 2;
        -webkit-box-orient: vertical;
        overflow: hidden;
    }
    .hot { color: ${ix.accentInk}; font-weight: 600; }
    .meta {
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        gap: 6px 12px;
        margin-left: 36px;
        font-size: 12px;
        color: ${ix.muted};
        font-variant-numeric: tabular-nums;
    }
    .meta span { display: inline-flex; align-items: center; gap: 4px; }
    .meta svg { width: 12px; height: 12px; }
    .late { color: ${ix.late}; font-weight: 600; }
    .outcome {
        padding: 2px 8px;
        border-radius: 999px;
        font-weight: 600;
    }
    .won { background: ${ix.okTint}; color: ${ix.ok}; }
    .lost { background: ${ix.surfaceAlt}; color: ${ix.inkSoft}; }
`;

/** Puste miejsce, które czeka na kartę w ręce - w odcieniu kolumny, z jej wysokością. */
export const CardSlot = styled.div<{ $height: number; $tone: string; $tint: string }>`
    height: ${p => p.$height}px;
    flex: none;
    border-radius: 14px;
    border: 1.5px dashed ${p => p.$tone};
    background: ${p => p.$tint};
    opacity: 0.85;
`;

/** Warstwa z kartą w ręce. Położenie ustawia useBoardDrag; skala i cień - atrybut `data-lifted`. */
export const DragLayer = styled.div<{ $width: number }>`
    position: fixed;
    left: 0;
    top: 0;
    z-index: 950;
    width: ${p => p.$width}px;
    pointer-events: none;
    will-change: transform;

    > ${CardSurface} {
        cursor: grabbing;
        transform-origin: 50% 40%;
        transition:
            transform 260ms ${EASE_SPRING},
            box-shadow 260ms ${EASE_SPRING};
    }
    &[data-lifted='true'] > ${CardSurface} {
        transform: scale(1.04) rotate(-1.6deg);
        box-shadow: 0 2px 4px rgba(15, 23, 42, 0.06), 0 28px 48px -16px rgba(15, 23, 42, 0.35);
    }
    ${css`
        @media (prefers-reduced-motion: reduce) {
            &[data-lifted='true'] > ${CardSurface} { transform: none; }
        }
    `}
`;

function outcome(card: BoardCardModel): { label: string; won: boolean } | null {
    const { lead } = card;
    if (lead.status === 'COMPLETED') return { label: 'Zrealizowana', won: true };
    if (lead.status === 'LOST') return { label: lead.lostReasonLabel ? `Przegrana: ${lead.lostReasonLabel}` : 'Przegrana', won: false };
    if (lead.status === 'NO_SHOW') return { label: 'Nie pojawił się', won: false };
    if (lead.appointmentId) return { label: 'Termin w kalendarzu', won: true };
    return null;
}

function sentence(card: BoardCardModel, now: number): { text: string; hot: boolean } {
    if (card.column === 'NEEDS_REMINDER' && card.lead.boardStageAt) {
        const since = now - new Date(card.lead.boardStageAt).getTime();
        return { text: since < 60_000 ? 'Odłożone przed chwilą' : `Odłożone ${rowAge(since)} temu`, hot: false };
    }
    return caseSentence(card.lead, card.urgency);
}

interface BoardCardProps extends HTMLAttributes<HTMLDivElement> {
    card: BoardCardModel;
    now: number;
}

export const BoardCardView = forwardRef<HTMLDivElement, BoardCardProps>(function BoardCardView({ card, now, ...rest }, ref) {
    const { lead, urgency } = card;
    const Icon = SOURCE_ICON[lead.source] ?? Mail;
    const title = caseTitle(lead);
    const person = lead.vehicleBrand ? lead.customerName?.trim() || lead.contactIdentifier : null;
    const result = card.column === 'DONE' ? outcome(card) : null;
    const line = sentence(card, now);
    const showAge = card.column !== 'DONE' && urgency.turn !== 'SETTLED' && urgency.waitingMs > 0;

    return (
        <CardSurface ref={ref} {...rest}>
            <div className="top">
                <span className="source" aria-hidden="true"><Icon /></span>
                <div className="titles">
                    <p className="name" title={title}>{title}</p>
                    {person && <p className="person" title={person}>{person}</p>}
                </div>
                {lead.estimatedValue > 0 && <span className="amount">{formatAmount(lead.estimatedValue)}</span>}
            </div>
            {!result && <p className={`sentence${line.hot ? ' hot' : ''}`}>{line.text}</p>}
            <div className="meta">
                {result && (
                    <span className={`outcome ${result.won ? 'won' : 'lost'}`}>
                        {lead.appointmentId && lead.status === 'CONFIRMED' && <CalendarCheck aria-hidden="true" />}
                        {result.label}
                    </span>
                )}
                {showAge && (
                    <span className={urgency.overdue ? 'late' : undefined} title={urgency.title}>
                        <Clock aria-hidden="true" />
                        {rowAge(urgency.waitingMs)}
                    </span>
                )}
                {card.manual && (
                    <span title="Karta stoi tu z przeciągnięcia. Wróci na miejsce z rozmowy po następnej wiadomości.">
                        <Hand aria-hidden="true" />
                        przesunięta ręcznie
                    </span>
                )}
            </div>
        </CardSurface>
    );
});
