// src/modules/comms/inbox/MailList.tsx
// Lista wątków w zakładkach „Poczta" i „Wysłane" - z makiety „Poczta".
//
// Dni („Dziś", „Wczoraj") zamiast godziny przy każdym wierszu do porównywania, jeden
// wiersz „Powiadomienia i reklamy" za wszystkie automaty i plakietki, które mówią, co
// to za mail, zanim się go otworzy: „Sprawa" (wątek zapytania) i „Klient" (nadawca
// jest w kartotece). Archiwizacja pod kursorem (komputer) albo przesunięciem w lewo
// (telefon) - porządki bez otwierania wątku.
import { useRef, useState, type TouchEvent } from 'react';
import styled, { css } from 'styled-components';
import { Archive, Bell } from 'lucide-react';
import type { CommThread, MailFolder } from '../types';
import { buildMailListRows } from '../utils/mailListRows';
import { ix } from './tokens';

const Scroll = styled.div<{ $phone: boolean }>`
    flex: 1;
    min-height: 0;
    overflow-y: auto;
    overscroll-behavior: contain;
    padding: ${p => (p.$phone ? '0 0 16px' : '0 6px 12px')};
`;

const Day = styled.h2<{ $phone: boolean }>`
    margin: ${p => (p.$phone ? '16px 20px 2px' : '14px 14px 4px')};
    font-size: ${p => (p.$phone ? 13 : 12)}px;
    font-weight: 600;
    color: ${ix.muted};
`;

const RowWrap = styled.div<{ $phone: boolean }>`
    position: relative;
    ${p => p.$phone && css`overflow: hidden; background: ${ix.ok};`}

    .swipe-hint {
        position: absolute;
        right: 20px;
        top: 0;
        bottom: 0;
        display: flex;
        align-items: center;
        gap: 8px;
        color: #ffffff;
        font-size: 14px;
        font-weight: 600;
        svg { width: 18px; height: 18px; }
    }
`;

const Row = styled.button<{ $phone: boolean; $active: boolean; $unread: boolean; $nested: boolean }>`
    position: relative;
    display: flex;
    flex-direction: column;
    gap: ${p => (p.$phone ? 2 : 1)}px;
    width: 100%;
    padding: ${p => (p.$phone ? `14px 20px 14px ${p.$nested ? 44 : 32}px` : `10px 14px 10px ${p.$nested ? 38 : 26}px`)};
    border: none;
    border-radius: ${p => (p.$phone ? 0 : 10)}px;
    background: ${p => (p.$active ? ix.surfaceAlt : '#ffffff')};
    color: ${ix.ink};
    font-family: inherit;
    text-align: left;
    cursor: pointer;
    transition: transform 160ms ease-out;

    &:hover { background: ${p => (p.$active ? ix.surfaceAlt : ix.surfaceSoft)}; }
    &:focus-visible { outline: 2px solid ${ix.accent}; outline-offset: -2px; }

    ${p => p.$unread && css`
        &::before {
            content: '';
            position: absolute;
            left: ${p.$phone ? 14 : 11}px;
            top: ${p.$phone ? 22 : 17}px;
            width: ${p.$phone ? 8 : 7}px;
            height: ${p.$phone ? 8 : 7}px;
            border-radius: 999px;
            background: ${ix.accent};
        }
    `}

    .top { display: flex; align-items: center; gap: 8px; min-height: 20px; }
    .from {
        flex: 1;
        min-width: 0;
        font-size: ${p => (p.$phone ? 16 : 14)}px;
        line-height: ${p => (p.$phone ? 22 : 20)}px;
        font-weight: ${p => (p.$unread ? 700 : 500)};
        color: ${p => (p.$unread ? ix.ink : ix.inkSoft)};
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
    }
    .when { flex: none; font-size: ${p => (p.$phone ? 13 : 12)}px; color: ${ix.muted}; font-variant-numeric: tabular-nums; }
    .subj {
        display: flex;
        align-items: center;
        gap: 8px;
        font-size: ${p => (p.$phone ? 14 : 13)}px;
        line-height: ${p => (p.$phone ? 20 : 18)}px;
        color: ${p => (p.$unread ? ix.ink : ix.text2)};
    }
    .subj-t { flex: 1; min-width: 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
`;

/** Archiwizacja pod kursorem - pojawia się w miejscu godziny, gdy kursor jest nad wierszem. */
const ArchiveGhost = styled.button`
    position: absolute;
    top: 6px;
    right: 14px;
    display: none;
    align-items: center;
    justify-content: center;
    width: 30px;
    height: 30px;
    padding: 0;
    border: none;
    border-radius: 8px;
    background: #ffffff;
    color: ${ix.text2};
    box-shadow: 0 1px 2px rgba(15, 23, 42, 0.12);
    cursor: pointer;

    svg { width: 16px; height: 16px; }
    &:hover { color: ${ix.ink}; }
    &:focus-visible { display: inline-flex; outline: 2px solid ${ix.accent}; outline-offset: 2px; }

    ${RowWrap}:hover & { display: inline-flex; }
`;

const HideOnHover = styled.span`
    ${RowWrap}:hover & { visibility: hidden; }
`;

const Tag = styled.span<{ $sale?: boolean; $warn?: boolean }>`
    flex: none;
    padding: 1px 8px;
    border-radius: 999px;
    font-size: 11px;
    font-weight: 600;
    background: ${p => (p.$sale ? ix.accentTint : p.$warn ? '#fffbeb' : ix.surfaceAlt)};
    color: ${p => (p.$sale ? ix.accentInk : p.$warn ? '#b45309' : ix.text2)};

    @media (max-width: 767px) { font-size: 12px; }
`;

const Bundle = styled.button<{ $phone: boolean }>`
    display: flex;
    align-items: center;
    gap: 12px;
    width: ${p => (p.$phone ? 'calc(100% - 24px)' : '100%')};
    margin: ${p => (p.$phone ? '6px 12px' : '2px 0')};
    padding: ${p => (p.$phone ? '12px' : '10px 14px')};
    border: none;
    border-radius: ${p => (p.$phone ? 12 : 10)}px;
    background: ${ix.surfaceSoft};
    font-family: inherit;
    text-align: left;
    cursor: pointer;

    > svg { flex: none; width: 18px; height: 18px; color: ${ix.muted}; }
    .texts { flex: 1; min-width: 0; }
    .title { display: block; font-size: ${p => (p.$phone ? 15 : 14)}px; font-weight: 600; color: ${ix.ink}; }
    .senders {
        display: block;
        font-size: 13px;
        color: ${ix.text2};
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
    }
    .count { flex: none; font-size: ${p => (p.$phone ? 14 : 13)}px; color: ${ix.muted}; }
    &:hover { background: ${ix.surfaceAlt}; }
    &:focus-visible { outline: 2px solid ${ix.accent}; outline-offset: -2px; }
`;

const More = styled.button`
    display: block;
    margin: 12px auto 4px;
    padding: 8px 16px;
    border: 1px solid ${ix.line};
    border-radius: 999px;
    background: #ffffff;
    color: ${ix.inkSoft};
    font-family: inherit;
    font-size: 13px;
    font-weight: 500;
    cursor: pointer;
    &:hover { background: ${ix.surfaceSoft}; }
`;

const Empty = styled.p`
    margin: 24px 20px;
    font-size: 14px;
    line-height: 1.5;
    color: ${ix.muted};
`;

/** „10:58" dla dziś i wczoraj (dzień stoi w nagłówku), „5 paź" dla starszych. */
const timeLabel = (iso: string): string => {
    const date = new Date(iso);
    const now = new Date();
    const days = Math.round(
        (new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime() -
            new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime()) / 86_400_000
    );
    if (days <= 1) return date.toLocaleTimeString('pl-PL', { hour: 'numeric', minute: '2-digit' });
    return date.toLocaleDateString('pl-PL', { day: 'numeric', month: 'short' });
};

interface MailRowProps {
    thread: CommThread;
    folder: MailFolder;
    phone: boolean;
    active: boolean;
    nested: boolean;
    isForm: boolean;
    onOpen: () => void;
    onArchive: () => void;
    onContextMenu: (event: React.MouseEvent) => void;
    onPrefetch: () => void;
}

/** Ile pikseli przesunięcia w lewo wystarczy, żeby puszczenie palca zarchiwizowało wątek. */
const SWIPE_ARCHIVE_PX = 110;

function MailRow({ thread, folder, phone, active, nested, isForm, onOpen, onArchive, onContextMenu, onPrefetch }: MailRowProps) {
    const [dx, setDx] = useState(0);
    const start = useRef<{ x: number; y: number; horizontal: boolean | null } | null>(null);

    const onTouchStart = (event: TouchEvent) => {
        onPrefetch();
        const touch = event.touches[0];
        start.current = { x: touch.clientX, y: touch.clientY, horizontal: null };
    };
    // Kierunek ustala pierwszy wyraźny ruch: pionowy to przewijanie listy i nie wolno
    // go przechwycić, poziomy w lewo przesuwa wiersz nad zielonym „Archiwum".
    const onTouchMove = (event: TouchEvent) => {
        const s = start.current;
        if (!s) return;
        const touch = event.touches[0];
        const mx = touch.clientX - s.x;
        const my = touch.clientY - s.y;
        if (s.horizontal === null && (Math.abs(mx) > 8 || Math.abs(my) > 8)) s.horizontal = Math.abs(mx) > Math.abs(my);
        if (s.horizontal) setDx(Math.min(0, Math.max(-160, mx)));
    };
    const onTouchEnd = () => {
        const archive = dx <= -SWIPE_ARCHIVE_PX;
        start.current = null;
        setDx(0);
        if (archive) onArchive();
    };

    const unread = thread.unreadCount > 0;
    const who = thread.participantName ?? thread.participantEmail;
    const subject = thread.title ?? thread.subject ?? '(bez tematu)';

    return (
        <RowWrap $phone={phone}>
            {phone && dx < 0 && (
                <span className="swipe-hint" aria-hidden="true"><Archive /> Archiwum</span>
            )}
            <Row
                type="button"
                $phone={phone}
                $active={active}
                $unread={unread}
                $nested={nested}
                aria-current={active ? 'true' : undefined}
                style={dx ? { transform: `translateX(${dx}px)`, transition: 'none', boxShadow: '4px 0 12px rgba(15,23,42,.12)' } : undefined}
                onClick={onOpen}
                onContextMenu={onContextMenu}
                onMouseEnter={onPrefetch}
                onFocus={onPrefetch}
                onTouchStart={phone ? onTouchStart : onPrefetch}
                onTouchMove={phone ? onTouchMove : undefined}
                onTouchEnd={phone ? onTouchEnd : undefined}
            >
                <span className="top">
                    <span className="from">{who}</span>
                    {phone ? <span className="when">{timeLabel(thread.lastMessageAt)}</span> : <HideOnHover className="when">{timeLabel(thread.lastMessageAt)}</HideOnHover>}
                </span>
                <span className="subj">
                    <span className="subj-t" title={subject}>{subject}</span>
                    {thread.screening && <Tag $warn title={thread.screeningReason ?? undefined}>{thread.screening === 'SPAM' ? 'Spam' : 'Test ze studia'}</Tag>}
                    {isForm && !thread.leadId && <Tag>Formularz</Tag>}
                    {folder === 'SENT' && thread.inboundCount === 0 && <Tag>Bez odpowiedzi</Tag>}
                    {thread.leadId ? <Tag $sale>Sprawa</Tag> : thread.knownCustomer ? <Tag>Klient</Tag> : null}
                </span>
            </Row>
            {!phone && (
                <ArchiveGhost
                    type="button"
                    aria-label={thread.archived ? 'Przywróć ze schowka' : 'Archiwizuj'}
                    title="Archiwizuj"
                    onClick={(event) => { event.stopPropagation(); onArchive(); }}
                >
                    <Archive />
                </ArchiveGhost>
            )}
        </RowWrap>
    );
}

interface MailListProps {
    threads: CommThread[];
    folder: MailFolder;
    query: string;
    loaded: boolean;
    hasMore: boolean;
    onMore: () => void;
    activeId: string | null;
    phone: boolean;
    formSenders: Set<string>;
    onOpen: (threadId: string) => void;
    onArchive: (thread: CommThread) => void;
    onContextMenu: (event: React.MouseEvent, thread: CommThread) => void;
    onPrefetch: (threadId: string) => void;
}

export function MailList({ threads, folder, query, loaded, hasMore, onMore, activeId, phone, formSenders, onOpen, onArchive, onContextMenu, onPrefetch }: MailListProps) {
    const [bundleOpen, setBundleOpen] = useState(false);
    // Automaty zwijamy tylko w Odebranych i bez szukania - kto szuka „faktura Allegro",
    // ma ją dostać wprost, a nie w zwiniętym wierszu.
    const rows = buildMailListRows(threads, { bundleAutomated: folder === 'INBOX' && !query.trim(), bundleOpen });

    return (
        <Scroll $phone={phone}>
            {loaded && threads.length === 0 && (
                <Empty>
                    {query.trim()
                        ? 'Nic nie pasuje do wyszukiwania.'
                        : folder === 'SENT'
                          ? 'Nie wysłano jeszcze żadnej wiadomości.'
                          : folder === 'REJECTED'
                            ? 'Automat niczego nie odrzucił.'
                            : 'Skrzynka jest pusta.'}
                </Empty>
            )}
            {rows.map((row) => {
                if (row.kind === 'day') return <Day key={row.key} $phone={phone}>{row.label}</Day>;
                if (row.kind === 'bundle') {
                    return (
                        <Bundle key={row.key} type="button" $phone={phone} aria-expanded={bundleOpen} onClick={() => setBundleOpen((value) => !value)}>
                            <Bell aria-hidden="true" />
                            <span className="texts">
                                <span className="title">Powiadomienia i reklamy</span>
                                <span className="senders">{row.senders}</span>
                            </span>
                            <span className="count" title={row.unread > 0 ? `Nieprzeczytane: ${row.unread}` : undefined}>{row.threads.length}</span>
                        </Bundle>
                    );
                }
                const thread = row.thread;
                return (
                    <MailRow
                        key={row.key}
                        thread={thread}
                        folder={folder}
                        phone={phone}
                        active={thread.id === activeId}
                        nested={row.nested}
                        isForm={thread.kind === 'FORM' || formSenders.has(thread.participantEmail.trim().toLowerCase())}
                        onOpen={() => onOpen(thread.id)}
                        onArchive={() => onArchive(thread)}
                        onContextMenu={(event) => onContextMenu(event, thread)}
                        onPrefetch={() => onPrefetch(thread.id)}
                    />
                );
            })}
            {hasMore && <More type="button" onClick={onMore}>Pokaż starsze</More>}
        </Scroll>
    );
}
