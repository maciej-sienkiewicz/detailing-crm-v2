import { useState } from 'react';
import styled from 'styled-components';
import { Link } from 'react-router-dom';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { Panel, PanelBody, PanelHead, SectionTitle, StatusPill, ui } from '@/common/components/ui';
import { useBreakpoint } from '@/common/hooks';
import { pluralPl } from '@/common/utils/plural';
import { useDmThreads } from '../../hooks/useAccounts';
import type { DmThread } from '../../accountsTypes';
import { PHONE } from '../../utils/phone';
import { replyDeadlineLabel, sinceLabel, sortThreads, splitUrgent } from './accountsLogic';
import { List, Loading, Meta, Muted, RowText, Section, ShowMore, Snippet } from './accountsStyles';

/**
 * Wiadomości z Instagrama. Odpisuje się w Leadach, bo rozmowa jest częścią zapytania -
 * tu jest tylko lista „kto czeka", żeby nie trzeba było jej szukać.
 */

const MAX_ROWS = 8;
/** Telefon, gdy nikt nie czeka: tyle najświeższych rozmów widać bez „Pokaż". */
const PHONE_FALLBACK_ROWS = 3;

/* Telefon: wiersz rozmowy płasko w panelu, oddzielony kreską listy (ramka w ramce
   zjadała szerokość, a podgląd wiadomości i tak ucina się po jednej linii). */
const phoneRow = `
    ${PHONE} {
        padding: 12px 0;
        border: none;
        border-radius: 0;

        li:first-child > & { padding-top: 4px; }
    }
`;

const ThreadLink = styled(Link)`
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 10px 12px;
    border: 1px solid ${ui.line};
    border-radius: ${ui.radiusRow};
    background: ${ui.surface};
    text-decoration: none;
    color: inherit;
    min-width: 0;

    &:hover { border-color: ${ui.lineStrong}; }
    &:focus-visible { outline: 2px solid ${ui.focusRing}; outline-offset: 1px; }
    > svg { width: 16px; height: 16px; color: ${ui.textFaint}; flex-shrink: 0; }

    ${phoneRow}
    ${PHONE} { > svg { color: ${ui.textMuted}; } }
`;

const ThreadBox = styled.div`
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 10px 12px;
    border: 1px solid ${ui.lineSoft};
    border-radius: ${ui.radiusRow};
    min-width: 0;

    ${phoneRow}
`;

const who = (thread: DmThread) =>
    thread.displayName ?? (thread.username ? `@${thread.username}` : 'Klient z Instagrama');

const ThreadRow = ({ thread }: { thread: DmThread }) => {
    const content = (
        <RowText>
            <strong>{who(thread)}</strong>
            {thread.lastSnippet && <Snippet>{thread.lastSnippet}</Snippet>}
            <Meta>
                {thread.awaitingReply && thread.replyDeadline
                    ? <StatusPill $tone="warn">{replyDeadlineLabel(thread.replyDeadline)}</StatusPill>
                    : thread.awaitingReply
                        ? <StatusPill $tone="neutral">odpisz w aplikacji</StatusPill>
                        : null}
                <span>{sinceLabel(thread.lastMessageAt)}</span>
            </Meta>
        </RowText>
    );
    // Bez zapytania (sama emotka, wzmianka w relacji) nie ma dokąd prowadzić - zostaje wiersz bez linku.
    if (!thread.leadId) return <li><ThreadBox>{content}</ThreadBox></li>;
    return (
        <li>
            <ThreadLink to={`/leads?lead=${encodeURIComponent(thread.leadId)}`}>
                {content}
                <ChevronRight aria-hidden="true" />
            </ThreadLink>
        </li>
    );
};

/**
 * Telefon: rozmowy, w których klient czeka, od razu; reszta za „Pokaż". Na komputerze
 * lista stoi w bocznej kolumnie i niczego nie odsuwa, więc widać wszystkie.
 */
const PhoneThreads = ({ threads }: { threads: DmThread[] }) => {
    const [expanded, setExpanded] = useState(false);
    const { shown, hidden } = splitUrgent(threads, thread => thread.awaitingReply, PHONE_FALLBACK_ROWS);
    const visible = expanded ? [...shown, ...hidden] : shown;
    const onlyWaiting = shown.every(thread => thread.awaitingReply);
    return (
        <Section>
            <List>
                {visible.map(thread => <ThreadRow key={thread.id} thread={thread} />)}
            </List>
            {hidden.length > 0 && (
                <ShowMore type="button" aria-expanded={expanded} onClick={() => setExpanded(value => !value)}>
                    {expanded
                        ? 'Zwiń'
                        : onlyWaiting
                            ? `Pokaż pozostałe rozmowy (${hidden.length})`
                            : `Pokaż wszystkie rozmowy (${threads.length})`}
                    <ChevronDown aria-hidden="true" />
                </ShowMore>
            )}
        </Section>
    );
};

export const DmThreadsPanel = () => {
    const isDesktop = useBreakpoint('md');
    const threads = useDmThreads(true);
    const sorted = sortThreads(threads.data ?? []);
    const waiting = sorted.filter(t => t.awaitingReply).length;

    return (
        <Panel aria-label="Wiadomości z Instagrama">
            <PanelHead>
                <SectionTitle count={waiting > 0 ? `${waiting} ${pluralPl(waiting, 'czeka', 'czekają', 'czeka')}` : undefined}>Wiadomości</SectionTitle>
            </PanelHead>
            <PanelBody>
                {threads.isLoading ? (
                    <Loading>Wczytuję…</Loading>
                ) : sorted.length === 0 ? (
                    <Muted>Wiadomości z Instagrama pojawią się tutaj i w Leadach.</Muted>
                ) : isDesktop ? (
                    <List>
                        {sorted.slice(0, MAX_ROWS).map(thread => <ThreadRow key={thread.id} thread={thread} />)}
                    </List>
                ) : (
                    <PhoneThreads threads={sorted.slice(0, MAX_ROWS)} />
                )}
            </PanelBody>
        </Panel>
    );
};
