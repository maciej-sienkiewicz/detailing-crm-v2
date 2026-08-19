// src/modules/comms/views/MailView.tsx
// Skrzynka pocztowa CRM. Dwa tryby prezentacji:
//  - desktop (≥1024px): lista + konwersacja obok siebie,
//  - mobile/tablet: lista LUB konwersacja (przełączane, z przyciskiem wstecz).
// Widok jest jednym strumieniem odebranej korespondencji: bez folderów, bez filtrów
// i bez panelu klienta. Studio nie prowadzi katalogów, więc każdy przełącznik widoku
// był kosztem uwagi bez pokrycia — do wątku dochodzi się wyszukiwarką albo przewijaniem.
// Kontekst klienta przejął pasek nad korespondencją.
// Widok wypełnia całą dostępną wysokość — scrolluje się wyłącznie lista i wiadomości.
//
// Przełączenie wątku nie przebudowuje ekranu: kolumny są sterowane wybranym id
// (a nie tym, czy dane zdążyły dojść), nagłówek rozmowy renderuje się od razu z
// danych z listy, a dociąga się wyłącznie treść korespondencji — w wydzielonym,
// memoizowanym ConversationView. Dzięki temu nic nie „przeskakuje" pod kursorem.
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import styled from 'styled-components';
import {
    ChevronLeft,
    ChevronRight,
    Mail,
    MailOpen,
    Paperclip,
    RefreshCw,
    Search,
    Settings,
} from 'lucide-react';
import { useToast } from '@/common/components/Toast';
import { commsApi } from '../api/commsApi';
import {
    useContactInsights,
    useMailAccounts,
    useMarkThreadRead,
    usePrefetchThread,
    useSetThreadArchived,
    useSyncAccount,
    useThread,
    useThreads,
} from '../hooks/useComms';
import type { CommThread } from '../types';
import { ConversationView } from '../components/ConversationView';
import { MessageReaderOverlay } from '../components/MessageReaderOverlay';
import {
    EmptyHint,
    IconButton,
    Pill,
    SurfaceCard,
    formatRelativeTime,
} from '../components/shared';

// ── Media query hook ─────────────────────────────────────────────────────────

function useMediaQuery(query: string): boolean {
    const [matches, setMatches] = useState(() => window.matchMedia(query).matches);
    useEffect(() => {
        const mql = window.matchMedia(query);
        const onChange = (event: MediaQueryListEvent) => setMatches(event.matches);
        mql.addEventListener('change', onChange);
        setMatches(mql.matches);
        return () => mql.removeEventListener('change', onChange);
    }, [query]);
    return matches;
}

// ── Layout ───────────────────────────────────────────────────────────────────

// Wypełnia dokładnie obszar treści Layoutu: na mobile ContentWrapper dokłada
// górny padding pod hamburger (76px / safe-area), stąd korekta wysokości.
const Screen = styled.div`
    height: calc(100dvh - max(76px, calc(62px + env(safe-area-inset-top, 0px))));
    display: flex;
    min-height: 0;

    @media (min-width: ${p => p.theme.breakpoints.md}) {
        height: 100dvh;
        padding: ${p => p.theme.spacing.md};
    }
    @media (min-width: ${p => p.theme.breakpoints.xl}) {
        padding: ${p => p.theme.spacing.lg};
    }
`;

const AppCard = styled(SurfaceCard)`
    position: relative;
    flex: 1;
    min-width: 0;
    min-height: 0;
    display: flex;

    @media (max-width: calc(${p => p.theme.breakpoints.md} - 1px)) {
        border-radius: 0;
        border-left: none;
        border-right: none;
        box-shadow: none;
    }
`;

// ── Lista wątków ─────────────────────────────────────────────────────────────

/** Stopka listy: stan podłączonej skrzynki i wejście w jej ustawienia. */
const AccountFooter = styled.div`
    margin-top: auto;
    padding: 8px 12px;
    border-top: 1px solid ${p => p.theme.colors.border};
    font-size: 12px;
    color: ${p => p.theme.colors.textSecondary};
    display: flex;
    align-items: center;
    gap: 6px;
`;

const StatusDot = styled.span<{ $color: string }>`
    display: inline-block;
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: ${({ $color }) => $color};
    flex-shrink: 0;
`;

const ListPane = styled.div<{ $hiddenOnMobile: boolean }>`
    flex: 1;
    min-width: 0;
    display: ${({ $hiddenOnMobile }) => ($hiddenOnMobile ? 'none' : 'flex')};
    flex-direction: column;
    min-height: 0;

    @media (min-width: ${p => p.theme.breakpoints.lg}) {
        display: flex;
        flex: 0 0 340px;
        border-right: 1px solid ${p => p.theme.colors.border};
    }
    @media (min-width: 1600px) { flex-basis: 380px; }
`;

const ListHeader = styled.div`
    padding: 10px 12px;
    border-bottom: 1px solid ${p => p.theme.colors.border};
    display: flex;
    flex-direction: column;
    gap: 8px;
`;

const SearchRow = styled.div`
    display: flex;
    align-items: center;
    gap: 8px;
`;

const SearchInput = styled.div`
    flex: 1;
    min-width: 0;
    display: flex;
    align-items: center;
    gap: 6px;
    border: 1px solid ${p => p.theme.colors.border};
    border-radius: ${p => p.theme.radii.full};
    padding: 7px 12px;
    color: ${p => p.theme.colors.textMuted};
    background: ${p => p.theme.colors.surface};
    transition: border-color ${p => p.theme.transitions.fast};

    &:focus-within { border-color: ${p => p.theme.colors.primary}; }

    input {
        border: none;
        outline: none;
        flex: 1;
        font-size: 13px;
        min-width: 0;
        background: transparent;
        color: ${p => p.theme.colors.text};
        font-family: inherit;
    }
`;

const ThreadListScroll = styled.div`
    flex: 1;
    overflow-y: auto;
    min-height: 0;
`;

const ThreadItem = styled.button<{ $active: boolean; $unread: boolean }>`
    display: block;
    width: 100%;
    text-align: left;
    border: none;
    border-bottom: 1px solid ${p => p.theme.colors.surfaceAlt};
    border-left: 3px solid
        ${({ $unread, theme }) => ($unread ? theme.colors.primary : 'transparent')};
    background: ${({ $active, theme }) => ($active ? theme.colors.surfaceAlt : theme.colors.surface)};
    padding: 10px 12px;
    cursor: pointer;
    font-family: inherit;
    transition: background ${p => p.theme.transitions.fast};

    &:hover { background: ${p => p.theme.colors.surfaceHover}; }

    .top {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 8px;
    }
    .who {
        font-size: 13px;
        color: ${p => p.theme.colors.text};
        font-weight: ${({ $unread, theme }) =>
            $unread ? theme.fontWeights.bold : theme.fontWeights.medium};
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
    }
    .when { font-size: 11px; color: ${p => p.theme.colors.textMuted}; white-space: nowrap; }
    .subject {
        font-size: 12px;
        color: ${({ $unread, theme }) => ($unread ? theme.colors.text : theme.colors.textSecondary)};
        font-weight: ${({ $unread, theme }) =>
            $unread ? theme.fontWeights.semibold : theme.fontWeights.normal};
        margin-top: 2px;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
    }
    .snippet {
        font-size: 12px;
        color: ${p => p.theme.colors.textMuted};
        margin-top: 1px;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
        display: flex;
        align-items: center;
        gap: 4px;
    }
`;

const Pager = styled.div`
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 12px;
    border-top: 1px solid ${p => p.theme.colors.border};
    padding: 6px;
    font-size: 12px;
    color: ${p => p.theme.colors.textSecondary};

    button {
        border: none;
        background: none;
        cursor: pointer;
        color: ${p => p.theme.colors.textSecondary};
        display: inline-flex;
        padding: 4px;
        &:disabled { color: ${p => p.theme.colors.border}; cursor: default; }
    }
`;

/** Pusta prawa kolumna — te same reguły widoczności co ConversationView. */
const ConversationEmptyPane = styled.div<{ $hiddenOnMobile: boolean }>`
    flex: 1;
    min-width: 0;
    min-height: 0;
    display: ${({ $hiddenOnMobile }) => ($hiddenOnMobile ? 'none' : 'flex')};
    flex-direction: column;

    @media (min-width: ${p => p.theme.breakpoints.lg}) { display: flex; }
`;

const EmptyStateWrap = styled.div`
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 24px;
    text-align: center;

    h3 { margin: 0 0 8px; color: ${p => p.theme.colors.text}; }
    p { margin: 0 0 16px; color: ${p => p.theme.colors.textSecondary}; font-size: 14px; max-width: 420px; }
`;

// ── Widok ────────────────────────────────────────────────────────────────────

export default function MailView() {
    // Zdarzenia WebSocket obsługuje globalna subskrypcja w Sidebarze (useCommsSocket);
    // tu wystarczą unieważnienia cache, które ona wykonuje.
    const [searchParams, setSearchParams] = useSearchParams();
    const [query, setQuery] = useState('');
    const [page, setPage] = useState(0);
    const isDesktop = useMediaQuery('(min-width: 1024px)');
    const [fullMessageId, setFullMessageId] = useState<string | null>(null);
    const { showInfo } = useToast();

    const selectedThreadId = searchParams.get('thread');
    const selectThread = useCallback(
        (threadId: string | null) => {
            setFullMessageId(null);
            setSearchParams(threadId ? { thread: threadId } : {}, { replace: true });
        },
        [setSearchParams]
    );

    const { data: accounts } = useMailAccounts();
    const prefetchThread = usePrefetchThread();
    const filters = useMemo(
        () => ({
            archived: false,
            query: query || undefined,
            page,
            pageSize: 30,
        }),
        [query, page]
    );
    const { data: threadPage } = useThreads(filters);
    const { data: detail } = useThread(selectedThreadId);

    // Nagłówek rozmowy stawiamy na danych z listy — są już w cache, więc pojawia
    // się w tej samej klatce co kliknięcie. Dociąga się wyłącznie treść wiadomości.
    const listThread = useMemo(
        () => (threadPage?.items ?? []).find((item) => item.id === selectedThreadId) ?? null,
        [threadPage, selectedThreadId]
    );
    const detailMatches = Boolean(selectedThreadId) && detail?.thread.id === selectedThreadId;
    const openThread: CommThread | null = detailMatches ? detail!.thread : listThread;
    const openMessages = detailMatches ? detail!.messages : null;

    // Ten sam cache co panel Insights — chip w nagłówku nie kosztuje drugiego requestu.
    const { data: insights } = useContactInsights(
        openThread?.participantEmail ?? null,
        openThread?.id
    );

    const markRead = useMarkThreadRead();
    const setArchived = useSetThreadArchived();
    const syncAccount = useSyncAccount();

    // Otwarcie konwersacji oznacza ją jako przeczytaną — lokalnie od razu,
    // na serwerze pocztowym przez kolejkę w tle.
    useEffect(() => {
        if (detail && detail.thread.unreadCount > 0) {
            markRead.mutate(detail.thread.id);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [detail?.thread.id, detail?.thread.unreadCount]);

    const downloadAttachment = useCallback(async (attachmentId: string, fileName: string) => {
        const blob = await commsApi.downloadAttachment(attachmentId);
        const url = URL.createObjectURL(blob);
        const anchor = document.createElement('a');
        anchor.href = url;
        anchor.download = fileName;
        anchor.click();
        URL.revokeObjectURL(url);
    }, []);

    const toggleArchived = useCallback(
        (thread: CommThread) =>
            setArchived.mutate(
                { threadId: thread.id, archived: !thread.archived },
                { onSuccess: () => selectThread(null) }
            ),
        [setArchived, selectThread]
    );
    const closeConversation = useCallback(() => selectThread(null), [selectThread]);

    const activeAccount = accounts?.find((account) => account.status !== 'DISABLED');
    const accountsConnected = (accounts ?? []).filter((account) => account.status !== 'DISABLED');
    const totalPages = threadPage ? Math.max(1, Math.ceil(threadPage.total / threadPage.pageSize)) : 1;

    const statusColor = (status: string) =>
        status === 'ACTIVE' ? '#22c55e' : status === 'AUTH_FAILED' ? '#ef4444' : '#d1d5db';

    const knownClient = insights?.customer ?? null;
    // Otwartość rozmowy zależy od wyboru użytkownika, nie od stanu zapytania —
    // inaczej kolumny znikałyby i wracały przy każdym przełączeniu wątku.
    const conversationOpen = Boolean(selectedThreadId);
    const fullMessage = openMessages?.find((message) => message.id === fullMessageId) ?? null;

    if (accounts && accountsConnected.length === 0) {
        return (
            <Screen>
                <AppCard>
                    <EmptyStateWrap>
                        <div>
                            <Mail size={40} color="#94a3b8" style={{ marginBottom: 12 }} />
                            <h3>Podłącz swoją skrzynkę</h3>
                            <p>
                                Wystarczy adres e-mail i hasło — resztą zajmiemy się my. Twoje
                                wiadomości pojawią się tutaj i będziesz mógł odpowiadać bez
                                wychodzenia z CRM.
                            </p>
                            <Link to="/communication/mailboxes">
                                <IconButton as="span"><Settings /> Podłącz skrzynkę</IconButton>
                            </Link>
                        </div>
                    </EmptyStateWrap>
                </AppCard>
            </Screen>
        );
    }

    return (
        <Screen>
            <AppCard>
                <ListPane $hiddenOnMobile={conversationOpen}>
                    <ListHeader>
                        <SearchRow>
                            <SearchInput>
                                <Search size={14} />
                                <input
                                    placeholder="Szukaj po adresie, nazwie, temacie…"
                                    value={query}
                                    onChange={(event) => { setQuery(event.target.value); setPage(0); }}
                                />
                            </SearchInput>
                        </SearchRow>
                    </ListHeader>
                    <ThreadListScroll>
                        {threadPage && threadPage.items.length === 0 && (
                            <EmptyHint>Brak wiadomości w tym widoku</EmptyHint>
                        )}
                        {(threadPage?.items ?? []).map((thread: CommThread) => (
                            <ThreadItem
                                key={thread.id}
                                $active={thread.id === selectedThreadId}
                                $unread={thread.unreadCount > 0}
                                onClick={() => selectThread(thread.id)}
                                // Zanim palec/kursor dojdzie do kliknięcia, wątek zdąży
                                // trafić do cache — treść podmienia się wtedy bez migotania.
                                onMouseEnter={() => prefetchThread(thread.id, thread.participantEmail)}
                                onFocus={() => prefetchThread(thread.id, thread.participantEmail)}
                                onTouchStart={() => prefetchThread(thread.id, thread.participantEmail)}
                            >
                                <div className="top">
                                    <span className="who">
                                        {thread.participantName ?? thread.participantEmail}
                                    </span>
                                    <span className="when">{formatRelativeTime(thread.lastMessageAt)}</span>
                                </div>
                                <div className="subject">{thread.subject ?? '(bez tematu)'}</div>
                                <div className="snippet">
                                    {thread.hasAttachments && <Paperclip size={11} />}
                                    {thread.leadId && <Pill $bg="#f0fdf4" $fg="#15803d">Lead</Pill>}
                                    {thread.lastDirection === 'OUTBOUND' ? 'Ty: ' : ''}
                                    {thread.lastSnippet ?? ''}
                                </div>
                            </ThreadItem>
                        ))}
                    </ThreadListScroll>
                    {totalPages > 1 && (
                        <Pager>
                            <button disabled={page === 0} onClick={() => setPage(page - 1)} aria-label="Poprzednia strona">
                                <ChevronLeft size={15} />
                            </button>
                            {page + 1} / {totalPages}
                            <button
                                disabled={page + 1 >= totalPages}
                                onClick={() => setPage(page + 1)}
                                aria-label="Następna strona"
                            >
                                <ChevronRight size={15} />
                            </button>
                        </Pager>
                    )}
                    <AccountFooter>
                        {activeAccount && (
                            <>
                                <StatusDot $color={statusColor(activeAccount.status)} />
                                <span
                                    style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                                    title={activeAccount.lastError ?? undefined}
                                >
                                    {activeAccount.emailAddress}
                                </span>
                            </>
                        )}
                        <IconButton
                            onClick={() => {
                                if (!activeAccount) return;
                                syncAccount.mutate(activeAccount.id);
                                showInfo('Synchronizuję…', 'Nowe wiadomości pojawią się za chwilę');
                            }}
                            aria-label="Odśwież skrzynkę"
                            title="Odśwież skrzynkę"
                            style={{ padding: 7 }}
                        >
                            <RefreshCw />
                        </IconButton>
                        <Link to="/communication/mailboxes">
                            <IconButton as="span" aria-label="Ustawienia skrzynek" style={{ padding: 7 }}>
                                <Settings />
                            </IconButton>
                        </Link>
                    </AccountFooter>
                </ListPane>

                {!openThread && (
                    <ConversationEmptyPane $hiddenOnMobile={!conversationOpen}>
                        {conversationOpen ? (
                            // Wątek spoza bieżącej strony listy (np. z „wcześniejszych rozmów")
                            // — nagłówka nie mamy jeszcze z czego postawić.
                            <EmptyHint>Wczytywanie rozmowy…</EmptyHint>
                        ) : (
                            <EmptyStateWrap>
                                <div>
                                    <MailOpen size={36} color="#cbd5e1" style={{ marginBottom: 10 }} />
                                    <p>Wybierz konwersację z listy</p>
                                </div>
                            </EmptyStateWrap>
                        )}
                    </ConversationEmptyPane>
                )}
                {openThread && (
                    <ConversationView
                        thread={openThread}
                        messages={openMessages}
                        isDesktop={isDesktop}
                        hiddenOnMobile={!conversationOpen}
                        clientSummary={knownClient}
                        onBack={closeConversation}
                        onToggleArchived={toggleArchived}
                        onOpenFullMessage={setFullMessageId}
                        onDownloadAttachment={downloadAttachment}
                    />
                )}

                {fullMessage && (
                    <MessageReaderOverlay
                        message={fullMessage}
                        onClose={() => setFullMessageId(null)}
                        onDownloadAttachment={downloadAttachment}
                    />
                )}
            </AppCard>
        </Screen>
    );
}
