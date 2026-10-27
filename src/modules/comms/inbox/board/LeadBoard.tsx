// src/modules/comms/inbox/board/LeadBoard.tsx
// Tablica spraw - drugi, równoległy widok zakładki „Sprawy" (obok listy).
//
// Cztery kolumny: Czeka na nas, Czeka na klienta, Do przypomnienia, Ucichło.
// Która sprawa gdzie stoi i co znaczy przeciągnięcie - utils/leadBoard.ts. Tu jest
// wyłącznie widok: kolumny, karty, miejsce robione karcie w ręce, „Przypomnij"
// w kolumnie, która o to prosi, i „Zamknij bez odzewu" w „Ucichło".
//
// Podgląd w trakcie przeciągania liczy CAŁĄ tablicę z kartą przesuniętą „na próbę" -
// tą samą funkcją, którą potem zapisujemy przesunięcie. Miejsce dla karty otwiera się
// więc dokładnie tam, gdzie karta stanie, a pozostałe karty rozsuwa useFlip.
import { useCallback, useEffect, useMemo, useRef, useState, type KeyboardEvent, type MouseEvent } from 'react';
import { createPortal } from 'react-dom';
import styled, { css, keyframes } from 'styled-components';
import { Archive, ArrowRight, BellRing } from 'lucide-react';
import { matchesSearch } from '@/common/utils/textSearch';
import { pluralPl } from '@/common/utils/plural';
import { useToast } from '@/common/components/Toast';
import { ConfirmationModal } from '@/common/components/ConfirmationModal';
import { ActionMenu, MenuItem, useActionMenu } from '@/common/components/ui';
import { useBulkChangeLeadStatus, useMoveLeadOnBoard, useStagnationThresholds } from '../../hooks/useLeads';
import { LeadReminderDialog } from '../../components/LeadReminderDialog';
import type { Lead } from '../../types';
import {
    BOARD_COLUMNS,
    boardColumnMeta,
    buildBoard,
    canRemindByMail,
    leadAfterMove,
    planBoardMove,
    type BoardCard,
    type BoardColumnKey,
} from '../../utils/leadBoard';
import { caseTitle, formatAmount } from '../caseModel';
import { ix } from '../tokens';
import { BoardCardView, CardSlot, DragLayer } from './BoardCard';
import { EASE_SPRING, prefersReducedMotion } from './motion';
import { useBoardDrag } from './useBoardDrag';
import { useFlip } from './useFlip';
import { problemDetail } from '@/core/problem';

const Scroller = styled.div<{ $phone: boolean }>`
    flex: 1;
    min-height: 0;
    display: flex;
    gap: ${p => (p.$phone ? 12 : 14)}px;
    overflow-x: auto;
    overflow-y: hidden;
    overscroll-behavior-x: contain;
    padding: ${p => (p.$phone ? '4px 16px 16px' : '4px 24px 24px')};
    scroll-padding: 0 16px;
    ${p => p.$phone && css`scroll-snap-type: x mandatory;`}
    -webkit-overflow-scrolling: touch;

    /* Pasek przewijania tylko wtedy, gdy jest po co - jak w Finderze. */
    scrollbar-width: thin;
    scrollbar-color: rgba(15, 23, 42, 0.18) transparent;
`;

/**
 * Kolumny równej szerokości: `min-width: 0`, bo dłuższy tekst karty („zejdzie z tablicy
 * za 3 dni") rozpychał swoją kolumnę do 353 px przy 248 px sąsiadki i cztery kolumny
 * przestawały się mieścić na ekranie 1440 px. Pusta kolumna jest węższa - nie ma czego
 * w niej czytać, a nadal przyjmuje upuszczoną kartę.
 */
const Lane = styled.section<{ $phone: boolean; $over: boolean; $ring: string; $tint: string; $empty: boolean }>`
    flex: ${p => (p.$phone ? '0 0 calc(100vw - 52px)' : p.$empty ? '0 0 200px' : '1 1 248px')};
    max-width: ${p => (p.$phone ? 'none' : '360px')};
    min-width: ${p => (p.$phone ? 'auto' : p.$empty ? '200px' : '240px')};
    min-height: 0;
    display: flex;
    flex-direction: column;
    border-radius: 18px;
    background: ${p => (p.$over ? p.$tint : 'rgba(241, 245, 249, 0.72)')};
    box-shadow: inset 0 0 0 ${p => (p.$over ? '2px' : '1px')} ${p => (p.$over ? p.$ring : 'rgba(15, 23, 42, 0.04)')};
    scroll-snap-align: center;
    transition:
        background 260ms ${EASE_SPRING},
        box-shadow 260ms ${EASE_SPRING};
`;

const LaneHead = styled.header`
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 14px 14px 10px 16px;

    .dot { flex: none; width: 8px; height: 8px; border-radius: 999px; }
    h2 {
        flex: 1;
        min-width: 0;
        margin: 0;
        font-size: 14px;
        font-weight: 650;
        letter-spacing: -0.01em;
        color: ${ix.ink};
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
    }
    .count {
        flex: none;
        min-width: 22px;
        padding: 2px 8px;
        border-radius: 999px;
        font-size: 12px;
        font-weight: 700;
        text-align: center;
        font-variant-numeric: tabular-nums;
    }
    `;

/** Kwota pod nagłówkiem, a nie obok - obok zjadała nazwę kolumny („Odpowiedzieliś…"). */
const LaneValue = styled.p`
    margin: -6px 14px 8px 32px;
    font-size: 12px;
    font-weight: 600;
    color: ${ix.muted};
    font-variant-numeric: tabular-nums;
`;

const LaneBody = styled.div`
    flex: 1;
    min-height: 0;
    display: flex;
    flex-direction: column;
    gap: 10px;
    padding: 2px 10px 12px;
    overflow-y: auto;
    overscroll-behavior: contain;
    scrollbar-width: thin;
    scrollbar-color: rgba(15, 23, 42, 0.14) transparent;
`;

const Empty = styled.p`
    margin: 4px 6px;
    padding: 18px 14px;
    border-radius: 14px;
    border: 1.5px dashed rgba(15, 23, 42, 0.1);
    font-size: 13px;
    line-height: 1.45;
    color: ${ix.muted};
    text-align: center;
`;

/**
 * „Przypomnij" w nagłówku kolumny, która o to prosi. W odcieniu kolumny, bez wypełnienia:
 * na tablicy nic nie jest wypełnione, a wypełnienie dostaje dopiero „Wyślij" w oknie
 * przypomnień - tam, gdzie zapada decyzja (CLAUDE.md §2).
 */
/** Sufit zbiorczej zmiany statusu po stronie serwera (`POST /leads/bulk-status`). */
const MAX_BULK_CLOSE = 100;

const RemindButton = styled.button<{ $tint: string; $ink: string; $line: string }>`
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    margin: 0 10px 10px;
    padding: 8px 12px;
    border: 1px solid ${p => p.$line};
    border-radius: 12px;
    background: ${p => p.$tint};
    font-family: inherit;
    font-size: 13px;
    font-weight: 600;
    color: ${p => p.$ink};
    cursor: pointer;
    transition: transform 160ms ${EASE_SPRING}, box-shadow 160ms ${EASE_SPRING};

    svg { width: 14px; height: 14px; }
    &:hover { box-shadow: 0 6px 16px -10px ${p => p.$ink}; transform: translateY(-1px); }
    &:active { transform: scale(0.98); }
    &:focus-visible { outline: 2px solid ${ix.accent}; outline-offset: 2px; }
`;

const shimmer = keyframes`
    from { background-position: -240px 0; }
    to { background-position: 240px 0; }
`;

const Skeleton = styled.div`
    height: 92px;
    flex: none;
    border-radius: 14px;
    background: linear-gradient(90deg, #ffffff 0%, #f8fafc 50%, #ffffff 100%);
    background-size: 480px 100%;
    animation: ${shimmer} 1.4s linear infinite;
    box-shadow: 0 1px 2px rgba(15, 23, 42, 0.04);

    @media (prefers-reduced-motion: reduce) { animation: none; }
`;

/** Telefon: kolumna naraz na ekranie, więc skróty do pozostałych - z licznikami, jak zakładki. */
const LaneChips = styled.div<{ $phone: boolean }>`
    display: flex;
    gap: 6px;
    overflow-x: auto;
    padding: ${p => (p.$phone ? '0 16px 10px' : '0 24px 10px')};
    scrollbar-width: none;
    &::-webkit-scrollbar { display: none; }

    button {
        flex: none;
        display: inline-flex;
        align-items: center;
        gap: 6px;
        height: 34px;
        padding: 0 12px;
        border: 1px solid ${ix.line};
        border-radius: 999px;
        background: #ffffff;
        font-family: inherit;
        font-size: 13px;
        font-weight: 600;
        color: ${ix.text2};
        white-space: nowrap;
        transition: background 200ms ease, color 200ms ease, border-color 200ms ease;
    }
    button[aria-current='true'] { color: ${ix.ink}; border-color: transparent; background: ${ix.surfaceAlt}; }
    .dot { width: 7px; height: 7px; border-radius: 999px; }
    .n { font-variant-numeric: tabular-nums; color: ${ix.muted}; }
`;

const Notice = styled.p`
    margin: 0 24px 12px;
    font-size: 12.5px;
    color: ${ix.muted};
`;

const VisuallyHidden = styled.div`
    position: absolute;
    width: 1px;
    height: 1px;
    overflow: hidden;
    clip: rect(0 0 0 0);
    white-space: nowrap;
`;

/** Wiek „27 godz." i progi przesuwają się same - zegar tablicy tyka raz na minutę. */
function useMinuteClock(): number {
    const [now, setNow] = useState(() => Date.now());
    useEffect(() => {
        const id = window.setInterval(() => setNow(Date.now()), 60_000);
        return () => window.clearInterval(id);
    }, []);
    return now;
}

const matches = (lead: Lead, needle: string): boolean =>
    matchesSearch(
        needle,
        [lead.customerName, lead.contactIdentifier, lead.vehicleBrand, lead.vehicleModel, ...lead.tagLabels],
        [lead.contactIdentifier]
    );

interface LeadBoardProps {
    /** Sprawy otwarte i zamknięte - „Zakończono" bierze z nich ostatnie 30 dni. */
    leads: Lead[];
    loading: boolean;
    truncated: boolean;
    query: string;
    phone: boolean;
    /** Sprawa otwarta w oknie - jej karta „staje się" oknem, więc na tablicy jej nie ma. */
    hiddenId: string | null;
    onOpen: (leadId: string, from: DOMRect) => void;
}

export function LeadBoard({ leads, loading, truncated, query, phone, hiddenId, onOpen }: LeadBoardProps) {
    const { showError } = useToast();
    const thresholds = useStagnationThresholds();
    const now = useMinuteClock();
    const boardRef = useRef<HTMLDivElement>(null);
    const overlayRef = useRef<HTMLDivElement>(null);
    const moveOnBoard = useMoveLeadOnBoard();
    const moveMenu = useActionMenu<BoardCard>();

    /*
     * Przesunięcia w drodze do serwera. Pamięć podręczna dostaje lead po przesunięciu
     * dopiero po anulowaniu trwających odświeżeń (onMutate jest asynchroniczne), a karta
     * ma stać na nowym miejscu od pierwszej klatki po upuszczeniu.
     */
    const [pending, setPending] = useState<ReadonlyMap<string, Lead>>(new Map());
    const hold = useCallback((lead: Lead) => setPending((prev) => new Map(prev).set(lead.id, lead)), []);
    const release = useCallback((id: string) => setPending((prev) => {
        if (!prev.has(id)) return prev;
        const next = new Map(prev);
        next.delete(id);
        return next;
    }), []);

    /** Sprawy w oknie „Przypomnij się"; null - okno zamknięte. */
    const [reminding, setReminding] = useState<Lead[] | null>(null);
    // „Zamknij bez odzewu": propozycja, nie automat - zamkniętej sprawy nic nie otwiera,
    // gdy klient odpisze (V208), więc decyzję podejmuje człowiek, jednym kliknięciem.
    const [closing, setClosing] = useState<Lead[] | null>(null);
    const bulkStatus = useBulkChangeLeadStatus();
    const [announcement, setAnnouncement] = useState('');

    const base = useMemo(() => {
        const merged = leads.map((lead) => pending.get(lead.id) ?? lead);
        return query ? merged.filter((lead) => matches(lead, query)) : merged;
    }, [leads, pending, query]);

    const board = useMemo(() => buildBoard(base, thresholds, now), [base, thresholds, now]);
    const cards = useMemo(() => new Map(board.flatMap((column) => column.cards).map((card) => [card.lead.id, card])), [board]);

    const commit = useCallback((card: BoardCard, to: BoardColumnKey) => {
        const move = planBoardMove(card, to, Date.now());
        if (move.kind === 'NONE') return;
        const optimistic = leadAfterMove(card.lead, move, new Date().toISOString());
        hold(optimistic);
        setAnnouncement(`${caseTitle(card.lead)}: ${boardColumnMeta(to).title}`);
        moveOnBoard.mutate(
            { leadId: card.lead.id, stage: move.stage, optimistic },
            {
                onError: (error) => {
                    const message = problemDetail(error);
                    showError('Nie udało się przenieść leada', message ?? 'Karta wróciła na poprzednie miejsce');
                },
                onSettled: () => release(card.lead.id),
            }
        );
    }, [hold, release, moveOnBoard, showError]);

    const { session, onPointerDown, consumeClick } = useBoardDrag({
        boardRef,
        overlayRef,
        onDrop: (id, _from, to) => {
            const card = cards.get(id);
            if (card) commit(card, to);
        },
    });

    // Podgląd: tablica z kartą w ręce przestawioną „na próbę" do kolumny pod kursorem.
    const shown = useMemo(() => {
        if (!session) return board;
        const card = cards.get(session.id);
        if (!card) return board;
        const moved = leadAfterMove(card.lead, planBoardMove(card, session.over ?? session.from, now), new Date().toISOString());
        return buildBoard(base.map((lead) => (lead.id === moved.id ? moved : lead)), thresholds, now);
    }, [session, board, cards, base, thresholds, now]);

    useFlip(boardRef);

    const draggedCard = session ? cards.get(session.id) ?? null : null;

    // Kolumny nie mieszczą się w karcie (tablet, wąskie okno) - wtedy, jak na telefonie,
    // nad tablicą stoją skróty do kolumn. Dawniej miał je tylko telefon, a tablet widział
    // półtorej kolumny bez znaku, że za krawędzią są jeszcze dwie.
    const [overflowing, setOverflowing] = useState(false);
    useEffect(() => {
        const scroller = boardRef.current;
        if (!scroller || typeof ResizeObserver === 'undefined') return;
        const check = () => setOverflowing(scroller.scrollWidth > scroller.clientWidth + 1);
        check();
        const observer = new ResizeObserver(check);
        observer.observe(scroller);
        return () => observer.disconnect();
    }, [shown.length]);
    const paged = phone || overflowing;

    // Która kolumna jest teraz na ekranie - dla podświetlenia skrótu.
    const [visibleLane, setVisibleLane] = useState<BoardColumnKey>(BOARD_COLUMNS[0].key);
    useEffect(() => {
        const scroller = boardRef.current;
        if (!paged || !scroller) return;
        let frame = 0;
        const onScroll = () => {
            cancelAnimationFrame(frame);
            frame = requestAnimationFrame(() => {
                const middle = scroller.getBoundingClientRect().left + scroller.clientWidth / 2;
                let best: BoardColumnKey = BOARD_COLUMNS[0].key;
                let distance = Infinity;
                scroller.querySelectorAll<HTMLElement>('[data-board-column]').forEach((lane) => {
                    const rect = lane.getBoundingClientRect();
                    const d = Math.abs(rect.left + rect.width / 2 - middle);
                    if (d < distance) { distance = d; best = lane.dataset.boardColumn as BoardColumnKey; }
                });
                setVisibleLane(best);
            });
        };
        scroller.addEventListener('scroll', onScroll, { passive: true });
        return () => { cancelAnimationFrame(frame); scroller.removeEventListener('scroll', onScroll); };
    }, [paged]);

    // Skrót bieżącej kolumny nie może stać za krawędzią paska skrótów.
    const chipsRef = useRef<HTMLDivElement>(null);
    useEffect(() => {
        chipsRef.current?.querySelector('[aria-current="true"]')?.scrollIntoView({ inline: 'nearest', block: 'nearest' });
    }, [visibleLane]);

    const showLane = (key: BoardColumnKey) => {
        boardRef.current?.querySelector(`[data-board-column="${key}"]`)?.scrollIntoView({
            behavior: prefersReducedMotion() ? 'auto' : 'smooth',
            inline: 'center',
            block: 'nearest',
        });
    };

    // ── Klawiatura i menu „Przenieś do" - przeciąganie nie może być jedyną drogą ──
    const moveBy = (card: BoardCard, step: number) => {
        const index = BOARD_COLUMNS.findIndex((column) => column.key === card.column);
        const target = BOARD_COLUMNS[index + step];
        if (target) commit(card, target.key);
    };

    const onCardKey = (event: KeyboardEvent<HTMLDivElement>, card: BoardCard) => {
        if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            onOpen(card.lead.id, event.currentTarget.getBoundingClientRect());
        } else if (event.shiftKey && (event.key === 'ArrowRight' || event.key === 'ArrowLeft')) {
            event.preventDefault();
            moveBy(card, event.key === 'ArrowRight' ? 1 : -1);
        }
    };

    const onCardClick = (event: MouseEvent<HTMLDivElement>, card: BoardCard) => {
        if (consumeClick()) return;
        onOpen(card.lead.id, event.currentTarget.getBoundingClientRect());
    };

    const total = board.reduce((sum, column) => sum + column.cards.length, 0);

    return (
        <>
            {truncated && (
                <Notice>Tablica pokazuje pierwsze 100 leadów w każdym statusie. Starsze znajdziesz w zamkniętych leadach.</Notice>
            )}
            {paged && (
                <LaneChips ref={chipsRef} $phone={phone} role="navigation" aria-label="Kolumny tablicy">
                    {shown.map((column) => (
                        <button key={column.key} type="button" aria-current={visibleLane === column.key} onClick={() => showLane(column.key)}>
                            <span className="dot" style={{ background: column.tone.dot }} aria-hidden="true" />
                            {column.title}
                            <span className="n">{column.cards.length}</span>
                        </button>
                    ))}
                </LaneChips>
            )}
            <Scroller ref={boardRef} $phone={phone} aria-label="Tablica leadów" aria-describedby="board-help">
                {shown.map((column) => {
                    const isOver = Boolean(session && !session.landing && session.over === column.key && session.from !== column.key);
                    return (
                        <Lane
                            key={column.key}
                            data-board-column={column.key}
                            $phone={phone}
                            $over={isOver}
                            $ring={`${column.tone.dot}66`}
                            $tint={column.tone.tint}
                            $empty={column.cards.length === 0 && !session}
                            aria-labelledby={`lane-${column.key}`}
                        >
                            <LaneHead>
                                <span className="dot" style={{ background: column.tone.dot }} aria-hidden="true" />
                                <h2 id={`lane-${column.key}`}>{column.title}</h2>
                                <span className="count" style={{ background: column.tone.tint, color: column.tone.ink }} aria-label={`${column.cards.length} ${pluralPl(column.cards.length, 'lead', 'leady', 'leadów')}`}>
                                    {column.cards.length}
                                </span>
                            </LaneHead>
                            {column.showsValue && column.value > 0 && (
                                <LaneValue>{formatAmount(column.value)} w wycenach</LaneValue>
                            )}
                            {column.key === 'NEEDS_REMINDER' && column.cards.some((card) => canRemindByMail(card.lead)) && (
                                <RemindButton
                                    type="button"
                                    $tint="#ffffff"
                                    $ink={column.tone.ink}
                                    $line={`${column.tone.dot}66`}
                                    disabled={Boolean(session)}
                                    onClick={() => setReminding(column.cards.map((card) => card.lead))}
                                >
                                    <BellRing aria-hidden="true" />
                                    Przypomnij ({column.cards.filter((card) => canRemindByMail(card.lead)).length})
                                </RemindButton>
                            )}
                            {column.key === 'LAPSED' && column.cards.length > 0 && (
                                <RemindButton
                                    type="button"
                                    $tint="#ffffff"
                                    $ink={column.tone.ink}
                                    $line={`${column.tone.dot}66`}
                                    disabled={Boolean(session) || bulkStatus.isPending}
                                    onClick={() => setClosing(column.cards.slice(0, MAX_BULK_CLOSE).map((card) => card.lead))}
                                >
                                    <Archive aria-hidden="true" />
                                    Zamknij bez odzewu ({Math.min(column.cards.length, MAX_BULK_CLOSE)})
                                </RemindButton>
                            )}
                            <LaneBody data-board-scroll={column.key}>
                                {loading && total === 0 ? (
                                    <>
                                        <Skeleton />
                                        <Skeleton style={{ opacity: 0.7 }} />
                                        <Skeleton style={{ opacity: 0.4 }} />
                                    </>
                                ) : column.cards.length === 0 ? (
                                    <Empty>{column.empty}</Empty>
                                ) : (
                                    column.cards.map((card) =>
                                        session?.id === card.lead.id ? (
                                            <CardSlot
                                                key={card.lead.id}
                                                data-flip={card.lead.id}
                                                data-flip-static=""
                                                $height={session.height}
                                                $tone={`${column.tone.dot}99`}
                                                $tint={`${column.tone.tint}`}
                                                aria-hidden="true"
                                            />
                                        ) : (
                                            <BoardCardView
                                                key={card.lead.id}
                                                card={card}
                                                data-flip={card.lead.id}
                                                role="button"
                                                tabIndex={0}
                                                aria-label={`${caseTitle(card.lead)}, ${column.title}. Enter otwiera lead, Shift i strzałka przenosi do sąsiedniej kolumny.`}
                                                style={hiddenId === card.lead.id ? { visibility: 'hidden' } : undefined}
                                                onPointerDown={(event) => onPointerDown(event, card.lead.id, card.column)}
                                                onClick={(event) => onCardClick(event, card)}
                                                onKeyDown={(event) => onCardKey(event, card)}
                                                onContextMenu={(event) => {
                                                    event.preventDefault();
                                                    moveMenu.toggle(event, card);
                                                }}
                                            />
                                        )
                                    )
                                )}
                            </LaneBody>

                        </Lane>
                    );
                })}
            </Scroller>

            <VisuallyHidden id="board-help">
                Przeciągnij kartę do innej kolumny albo użyj Shift i strzałek. Przytrzymaj palec na karcie, żeby ją przenieść na telefonie.
            </VisuallyHidden>
            <VisuallyHidden aria-live="polite">{announcement}</VisuallyHidden>

            {session && draggedCard && createPortal(
                <DragLayer ref={overlayRef} $width={session.width} data-lifted="false" aria-hidden="true">
                    <BoardCardView card={draggedCard} />
                </DragLayer>,
                document.body
            )}

            <ActionMenu anchor={moveMenu.menu?.anchor ?? null} onClose={moveMenu.close} label="Przenieś lead">
                {moveMenu.menu && BOARD_COLUMNS.filter((column) => column.key !== moveMenu.menu!.item.column).map((column) => (
                    <MenuItem
                        key={column.key}
                        icon={<ArrowRight />}
                        onClick={() => {
                            const card = moveMenu.menu!.item;
                            moveMenu.close();
                            commit(card, column.key);
                        }}
                    >
                        {column.title}
                    </MenuItem>
                ))}
            </ActionMenu>

            {reminding && <LeadReminderDialog leads={reminding} onClose={() => setReminding(null)} />}
            <ConfirmationModal
                isOpen={closing !== null}
                title={closing?.length === 1
                    ? 'Zamknąć lead bez odzewu?'
                    : `Zamknąć ${closing?.length ?? 0} ${pluralPl(closing?.length ?? 0, 'lead', 'leady', 'leadów')} bez odzewu?`}
                message={`Trafią do zamkniętych z powodem „Klient przestał odpowiadać". Jeśli klient później odpisze, lead nie otworzy się sam - zmienisz mu status ręcznie.`}
                confirmText="Zamknij"
                onConfirm={() => {
                    const ids = (closing ?? []).map((lead) => lead.id);
                    bulkStatus.mutate(
                        { ids, status: 'LOST', lostReasonCode: 'NO_RESPONSE' },
                        { onSettled: () => setClosing(null) }
                    );
                }}
                onCancel={() => setClosing(null)}
            />
        </>
    );
}
