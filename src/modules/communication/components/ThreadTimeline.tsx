// src/modules/communication/components/ThreadTimeline.tsx
// Wątek (§2.3): dymki klient/my, separatory dat, notatki i zdarzenia jako wąskie
// separatory, wycena jako zwijany wiersz-obiekt, zwijanie środka wątku,
// przycinanie bardzo długich wiadomości.
import { useMemo, useState } from 'react';
import styled from 'styled-components';
import type { MessageTimelineItem, QuoteTimelineItem, TimelineItem } from '../types';
import { dayKey, formatDateTime, formatDayLabel, formatPln } from '../utils/format';

const Thread = styled.div`
    display: flex;
    flex-direction: column;
    gap: 12px;
    padding: 16px;
`;

const DateSeparator = styled.div`
    display: flex;
    align-items: center;
    gap: 12px;
    font-size: 12px;
    color: #9ca3af;

    &::before,
    &::after {
        content: '';
        flex: 1;
        border-top: 1px solid #e5e7eb;
    }
`;

const BubbleRow = styled.div<{ $outbound: boolean }>`
    display: flex;
    justify-content: ${({ $outbound }) => ($outbound ? 'flex-end' : 'flex-start')};
`;

const Bubble = styled.div<{ $outbound: boolean; $pending?: boolean }>`
    max-width: 78%;
    padding: 10px 12px;
    border-radius: 8px;
    font-size: 15px;
    line-height: 1.45;
    color: #1a1a1a;
    white-space: pre-wrap;
    word-break: break-word;
    background: ${({ $outbound }) => ($outbound ? '#f3f4f6' : '#ffffff')};
    border: 1px solid ${({ $outbound }) => ($outbound ? '#f3f4f6' : '#e5e7eb')};
    opacity: ${({ $pending }) => ($pending ? 0.6 : 1)};
`;

const BubbleMeta = styled.div`
    font-size: 12px;
    color: #6b7280;
    margin-bottom: 4px;
`;

const ShowMoreButton = styled.button`
    display: block;
    margin-top: 6px;
    padding: 0;
    background: none;
    border: none;
    font-size: 13px;
    color: ${({ theme }) => theme.colors.primary};
    cursor: pointer;
`;

const NarrowSeparator = styled.div`
    display: flex;
    align-items: center;
    gap: 8px;
    min-height: 12px;
    font-size: 12px;
    color: #6b7280;

    &::before,
    &::after {
        content: '';
        flex: 1;
        border-top: 1px solid #e5e7eb;
    }
`;

const CollapseRow = styled.button`
    display: flex;
    align-items: center;
    gap: 6px;
    align-self: flex-start;
    padding: 4px 8px;
    background: none;
    border: none;
    font-size: 13px;
    color: #6b7280;
    cursor: pointer;

    &:hover {
        color: #1a1a1a;
    }
`;

const QuoteCard = styled.div<{ $outbound: boolean }>`
    align-self: ${({ $outbound }) => ($outbound ? 'flex-end' : 'flex-start')};
    max-width: 78%;
    border: 1px solid #e5e7eb;
    border-radius: 8px;
    background: #ffffff;
    overflow: hidden;
`;

const QuoteHeader = styled.button`
    display: flex;
    align-items: center;
    gap: 6px;
    width: 100%;
    padding: 8px 12px;
    background: none;
    border: none;
    font-size: 13px;
    font-weight: 600;
    color: #1a1a1a;
    cursor: pointer;
    font-variant-numeric: tabular-nums;
`;

const QuoteTable = styled.table`
    width: 100%;
    border-collapse: collapse;
    font-size: 13px;

    td {
        padding: 6px 12px;
        border-top: 1px solid #f3f4f6;
    }

    td:last-child {
        text-align: right;
        font-variant-numeric: tabular-nums;
        white-space: nowrap;
    }

    tr:last-child td {
        font-weight: 600;
    }
`;

const QuoteMeta = styled.span`
    font-weight: 400;
    color: #6b7280;
    margin-left: auto;
`;

const LONG_MESSAGE_LINES = 12;
const LONG_MESSAGE_CHARS = 900;

const itemDate = (item: TimelineItem): string => {
    switch (item.type) {
        case 'MESSAGE': return item.sentAt;
        case 'NOTE': return item.createdAt;

        case 'QUOTE': return item.sentAt;
    }
};

const MessageBubble = ({ message }: { message: MessageTimelineItem }) => {
    const [expanded, setExpanded] = useState(false);
    const lines = message.bodyText.split('\n');
    const isLong = lines.length > LONG_MESSAGE_LINES || message.bodyText.length > LONG_MESSAGE_CHARS;
    const shown = expanded || !isLong
        ? message.bodyText
        : lines.slice(0, LONG_MESSAGE_LINES).join('\n').slice(0, LONG_MESSAGE_CHARS) + '…';
    const outbound = message.direction === 'OUTBOUND';
    const pending = message.sendStatus === 'OUTBOX_PENDING';
    return (
        <BubbleRow $outbound={outbound}>
            <Bubble $outbound={outbound} $pending={pending}>
                <BubbleMeta>
                    {outbound ? 'Ty' : (message.fromName ?? 'Klient')} · {formatDateTime(message.sentAt)}
                    {pending && ' · wysyłanie…'}
                    {message.sendStatus === 'FAILED' && ' · nie wysłano'}
                </BubbleMeta>
                {shown}
                {isLong && !expanded && (
                    <ShowMoreButton onClick={() => setExpanded(true)}>
                        pokaż pełną wiadomość
                    </ShowMoreButton>
                )}
            </Bubble>
        </BubbleRow>
    );
};

const QuoteRow = ({ quote }: { quote: QuoteTimelineItem }) => {
    const [open, setOpen] = useState(false);
    return (
        <QuoteCard $outbound>
            <QuoteHeader onClick={() => setOpen((o) => !o)} aria-expanded={open}>
                <span aria-hidden>{open ? '▾' : '▸'}</span>
                Wycena · {formatPln(quote.total)}
                <QuoteMeta>{formatDateTime(quote.sentAt)}</QuoteMeta>
            </QuoteHeader>
            {open && (
                <QuoteTable>
                    <tbody>
                        {quote.items.map((item, i) => (
                            <tr key={i}>
                                <td>{item.name}</td>
                                <td>{formatPln(item.price)}</td>
                            </tr>
                        ))}
                        <tr>
                            <td>Razem</td>
                            <td>{formatPln(quote.total)}</td>
                        </tr>
                    </tbody>
                </QuoteTable>
            )}
        </QuoteCard>
    );
};

const TimelineEntry = ({ item }: { item: TimelineItem }) => {
    switch (item.type) {
        case 'MESSAGE':
            return <MessageBubble message={item} />;
        case 'NOTE':
            return (
                <NarrowSeparator>
                    notatka — „{item.text}”{item.author ? ` · ${item.author}` : ''} · {formatDayLabel(item.createdAt)}
                </NarrowSeparator>
            );

        case 'QUOTE':
            return <QuoteRow quote={item} />;
    }
};

export const ThreadTimeline = ({ timeline }: { timeline: TimelineItem[] }) => {
    const [middleExpanded, setMiddleExpanded] = useState(false);

    const sorted = useMemo(
        () => [...timeline].sort((a, b) => new Date(itemDate(a)).getTime() - new Date(itemDate(b)).getTime()),
        [timeline],
    );

    // Progressive disclosure: pierwsza wiadomość + 2 ostatnie pozycje rozwinięte,
    // środek zwinięty do wiersza "▸ N starszych wiadomości".
    const { head, hidden, tail } = useMemo(() => {
        if (middleExpanded || sorted.length <= 4) {
            return { head: sorted, hidden: [] as TimelineItem[], tail: [] as TimelineItem[] };
        }
        return {
            head: sorted.slice(0, 1),
            hidden: sorted.slice(1, sorted.length - 2),
            tail: sorted.slice(sorted.length - 2),
        };
    }, [sorted, middleExpanded]);

    // Czysta lista deskryptorów renderowania: pozycje + separatory dat + wiersz zwijania.
    const rows = useMemo(() => {
        type Row =
            | { kind: 'separator'; label: string; key: string }
            | { kind: 'item'; item: TimelineItem; key: string }
            | { kind: 'collapse'; label: string; key: string };

        const result: Row[] = [];
        let lastDay: string | null = null;

        const push = (items: TimelineItem[], prefix: string) => {
            items.forEach((item, index) => {
                const date = itemDate(item);
                const key = dayKey(date);
                if (key !== lastDay) {
                    result.push({ kind: 'separator', label: formatDayLabel(date), key: `sep-${prefix}-${key}-${index}` });
                    lastDay = key;
                }
                result.push({
                    kind: 'item',
                    item,
                    key: `${prefix}-${item.type}-${'id' in item ? item.id : date}-${index}`,
                });
            });
        };

        push(head, 'head');
        if (hidden.length > 0) {
            const hiddenMessages = hidden.filter((i) => i.type === 'MESSAGE').length;
            const label = hiddenMessages > 0
                ? `${hiddenMessages} ${hiddenMessages === 1 ? 'starsza wiadomość' : hiddenMessages < 5 ? 'starsze wiadomości' : 'starszych wiadomości'}`
                : `${hidden.length} starszych pozycji`;
            result.push({ kind: 'collapse', label, key: 'collapse' });
        }
        push(tail, 'tail');
        return result;
    }, [head, hidden, tail]);

    return (
        <Thread>
            {rows.map((row) => {
                if (row.kind === 'separator') {
                    return <DateSeparator key={row.key}>{row.label}</DateSeparator>;
                }
                if (row.kind === 'collapse') {
                    return (
                        <CollapseRow key={row.key} onClick={() => setMiddleExpanded(true)}>
                            <span aria-hidden>▸</span>
                            {row.label}
                        </CollapseRow>
                    );
                }
                return <TimelineEntry key={row.key} item={row.item} />;
            })}
        </Thread>
    );
};
