// src/modules/comms/views/MailView.tsx
// Skrzynka pocztowa CRM. Trzy tryby prezentacji:
//  - szeroki desktop: foldery + lista + konwersacja (+ chowany panel klienta),
//  - laptop: jak wyżej, ale panel klienta domyślnie schowany (przycisk w nagłówku),
//  - mobile/tablet (<1024px): lista LUB konwersacja (przełączane, z przyciskiem wstecz),
//    filtry jako poziome chipy zamiast bocznego panelu folderów.
// Widok wypełnia całą dostępną wysokość — scrolluje się wyłącznie lista i wiadomości.
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import styled from 'styled-components';
import {
    Archive,
    ArchiveRestore,
    ArrowLeft,
    ChevronLeft,
    ChevronRight,
    Download,
    Folder,
    FolderPlus,
    Inbox,
    Mail,
    MailOpen,
    Maximize2,
    Paperclip,
    PanelLeftClose,
    PanelLeftOpen,
    PanelRightClose,
    PanelRightOpen,
    RefreshCw,
    Search,
    Settings,
    Sparkles,
    Tag,
    Trash2,
    Wallet,
} from 'lucide-react';
import { useToast } from '@/common/components/Toast';
import { commsApi } from '../api/commsApi';
import {
    useContactInsights,
    useCreateLabel,
    useDeleteLabel,
    useLabels,
    useMailAccounts,
    useMarkThreadRead,
    useSetThreadArchived,
    useSetThreadLabel,
    useSyncAccount,
    useThread,
    useThreads,
} from '../hooks/useComms';
import type { CommMessage, CommThread } from '../types';
import { MessageBody } from '../components/MessageBody';
import { ReplyComposer } from '../components/ReplyComposer';
import { InsightsPanel } from '../components/InsightsPanel';
import { MarkAsLeadPopover } from '../components/MarkAsLeadPopover';
import { MessageReaderOverlay } from '../components/MessageReaderOverlay';
import {
    EmptyHint,
    FilterChip,
    IconButton,
    Pill,
    SurfaceCard,
    formatDateTime,
    formatGrosze,
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

// ── Panel folderów (desktop ≥1024) ───────────────────────────────────────────

const FolderRail = styled.nav<{ $open: boolean }>`
    width: 208px;
    flex-shrink: 0;
    border-right: 1px solid ${p => p.theme.colors.border};
    background: ${p => p.theme.colors.surfaceAlt};
    padding: 12px 8px;
    display: none;
    flex-direction: column;
    gap: 2px;
    overflow-y: auto;
    min-height: 0;

    @media (min-width: ${p => p.theme.breakpoints.lg}) {
        display: ${({ $open }) => ($open ? 'flex' : 'none')};
    }
`;

const FolderButton = styled.button<{ $active: boolean }>`
    display: flex;
    align-items: center;
    gap: 8px;
    width: 100%;
    border: none;
    background: ${({ $active, theme }) => ($active ? theme.colors.surface : 'transparent')};
    box-shadow: ${({ $active }) => ($active ? '0 1px 2px rgba(15, 23, 42, 0.06)' : 'none')};
    color: ${({ $active, theme }) => ($active ? theme.colors.text : theme.colors.textSecondary)};
    font-weight: ${({ $active, theme }) =>
        $active ? theme.fontWeights.semibold : theme.fontWeights.normal};
    font-size: 13px;
    padding: 8px 10px;
    border-radius: ${p => p.theme.radii.md};
    cursor: pointer;
    text-align: left;
    font-family: inherit;
    transition: background ${p => p.theme.transitions.fast};

    &:hover { background: ${p => p.theme.colors.surface}; }

    svg { flex-shrink: 0; }

    .count {
        margin-left: auto;
        font-size: 11px;
        font-weight: ${p => p.theme.fontWeights.bold};
        color: #ffffff;
        background: ${p => p.theme.colors.primary};
        border-radius: ${p => p.theme.radii.full};
        padding: 1px 7px;
    }
    .del {
        margin-left: auto;
        color: ${p => p.theme.colors.textMuted};
        display: none;
    }
    &:hover .del { display: inline-flex; }
`;

const RailSection = styled.div`
    margin-top: 14px;
    padding: 0 10px 4px;
    font-size: 10px;
    font-weight: ${p => p.theme.fontWeights.semibold};
    letter-spacing: 0.06em;
    text-transform: uppercase;
    color: ${p => p.theme.colors.textMuted};
    display: flex;
    align-items: center;
    justify-content: space-between;

    button {
        border: none;
        background: none;
        color: ${p => p.theme.colors.textMuted};
        cursor: pointer;
        padding: 0;
        &:hover { color: ${p => p.theme.colors.textSecondary}; }
    }
`;

const AccountFooter = styled.div`
    margin-top: auto;
    padding: 10px;
    border-top: 1px solid ${p => p.theme.colors.border};
    font-size: 12px;
    color: ${p => p.theme.colors.textSecondary};
    display: flex;
    flex-direction: column;
    gap: 8px;
    word-break: break-all;
`;

const StatusDot = styled.span<{ $color: string }>`
    display: inline-block;
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: ${({ $color }) => $color};
    margin-right: 6px;
    flex-shrink: 0;
`;

// ── Lista wątków ─────────────────────────────────────────────────────────────

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

const MobileChipsRow = styled.div`
    display: flex;
    gap: 6px;
    overflow-x: auto;
    padding-bottom: 2px;
    -webkit-overflow-scrolling: touch;

    &::-webkit-scrollbar { display: none; }

    @media (min-width: ${p => p.theme.breakpoints.lg}) { display: none; }
`;

const SearchRow = styled.div`
    display: flex;
    align-items: center;
    gap: 8px;
`;

const RailToggle = styled.button`
    display: none;
    align-items: center;
    justify-content: center;
    border: 1px solid ${p => p.theme.colors.border};
    background: ${p => p.theme.colors.surface};
    color: ${p => p.theme.colors.textSecondary};
    border-radius: ${p => p.theme.radii.full};
    width: 34px;
    height: 34px;
    flex-shrink: 0;
    cursor: pointer;
    transition: all ${p => p.theme.transitions.fast};

    &:hover { background: ${p => p.theme.colors.surfaceHover}; }

    @media (min-width: ${p => p.theme.breakpoints.lg}) { display: inline-flex; }
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

// ── Konwersacja ──────────────────────────────────────────────────────────────

const ConversationPane = styled.div<{ $hiddenOnMobile: boolean }>`
    flex: 1;
    min-width: 0;
    min-height: 0;
    display: ${({ $hiddenOnMobile }) => ($hiddenOnMobile ? 'none' : 'flex')};
    flex-direction: column;

    @media (min-width: ${p => p.theme.breakpoints.lg}) { display: flex; }
`;

const ConversationHeader = styled.div`
    padding: 10px 12px;
    border-bottom: 1px solid ${p => p.theme.colors.border};
    display: flex;
    align-items: center;
    gap: 8px;
    position: relative;
    flex-wrap: wrap;

    .titles { flex: 1; min-width: 160px; }
    h3 {
        margin: 0;
        font-size: 15px;
        font-weight: ${p => p.theme.fontWeights.semibold};
        color: ${p => p.theme.colors.text};
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
    }
    .sub {
        font-size: 12px;
        color: ${p => p.theme.colors.textSecondary};
        display: flex;
        align-items: center;
        gap: 6px;
        flex-wrap: wrap;
    }
`;

const HeaderActions = styled.div`
    display: flex;
    align-items: center;
    gap: 6px;
    flex-wrap: wrap;
`;

/** Kompaktowa wizytówka klienta, gdy panel Insights jest schowany. */
const ClientChip = styled.span`
    display: inline-flex;
    align-items: center;
    gap: 5px;
    font-size: 11px;
    font-weight: ${p => p.theme.fontWeights.semibold};
    color: ${p => p.theme.colors.success};
    background: ${p => p.theme.colors.successLight};
    border-radius: ${p => p.theme.radii.full};
    padding: 3px 9px;
    white-space: nowrap;
`;

const MessagesScroll = styled.div`
    flex: 1;
    min-height: 0;
    overflow-y: auto;
    background: ${p => p.theme.colors.surfaceAlt};
    padding: 12px;
    display: flex;
    flex-direction: column;
    gap: 12px;

    @media (min-width: ${p => p.theme.breakpoints.md}) { padding: 16px; }
`;

const MessageCard = styled.article<{ $outbound: boolean }>`
    background: ${p => p.theme.colors.surface};
    border: 1px solid ${({ $outbound, theme }) => ($outbound ? '#bae6fd' : theme.colors.border)};
    border-radius: ${p => p.theme.radii.lg};
    overflow: hidden;
    box-shadow: ${p => p.theme.shadows.sm};

    @media (min-width: ${p => p.theme.breakpoints.md}) {
        ${({ $outbound }) => ($outbound ? 'margin-left: 40px;' : 'margin-right: 40px;')}
    }
`;

const MessageHeader = styled.header`
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: 8px;
    padding: 10px 14px 6px;

    .from {
        font-size: 13px;
        font-weight: ${p => p.theme.fontWeights.semibold};
        color: ${p => p.theme.colors.text};
        overflow-wrap: anywhere;
    }
    .from small {
        font-weight: ${p => p.theme.fontWeights.normal};
        color: ${p => p.theme.colors.textMuted};
        margin-left: 6px;
    }
    .meta {
        font-size: 11px;
        color: ${p => p.theme.colors.textMuted};
        white-space: nowrap;
        text-align: right;
    }
`;

const ExpandIconButton = styled.button`
    border: none;
    background: none;
    color: ${p => p.theme.colors.textMuted};
    cursor: pointer;
    padding: 2px;
    display: inline-flex;
    align-items: center;
    border-radius: ${p => p.theme.radii.sm};

    &:hover {
        color: ${p => p.theme.colors.textSecondary};
        background: ${p => p.theme.colors.surfaceAlt};
    }
`;

const MessagePadding = styled.div`
    padding: 0 14px 12px;
`;

const AttachmentRow = styled.div`
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    padding: 0 14px 12px;
`;

const AttachmentChip = styled.button`
    display: inline-flex;
    align-items: center;
    gap: 6px;
    border: 1px solid ${p => p.theme.colors.border};
    background: ${p => p.theme.colors.surfaceAlt};
    color: ${p => p.theme.colors.textSecondary};
    border-radius: ${p => p.theme.radii.full};
    padding: 4px 10px;
    font-size: 12px;
    cursor: pointer;
    font-family: inherit;

    &:hover { background: ${p => p.theme.colors.surfaceHover}; }

    span { color: ${p => p.theme.colors.textMuted}; }
`;

const LabelSelect = styled.select`
    border: 1px solid ${p => p.theme.colors.border};
    border-radius: ${p => p.theme.radii.full};
    padding: 6px 10px;
    font-size: 12px;
    color: ${p => p.theme.colors.textSecondary};
    background: ${p => p.theme.colors.surface};
    font-family: inherit;
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

type Folderish =
    | { kind: 'inbox' }
    | { kind: 'unread' }
    | { kind: 'leads' }
    | { kind: 'archive' }
    | { kind: 'label'; labelId: string };

export default function MailView() {
    // Zdarzenia WebSocket obsługuje globalna subskrypcja w Sidebarze (useCommsSocket);
    // tu wystarczą unieważnienia cache, które ona wykonuje.
    const [searchParams, setSearchParams] = useSearchParams();
    const [folder, setFolder] = useState<Folderish>({ kind: 'inbox' });
    const [query, setQuery] = useState('');
    const [page, setPage] = useState(0);
    const [leadPopoverOpen, setLeadPopoverOpen] = useState(false);
    const isDesktop = useMediaQuery('(min-width: 1024px)');
    const isWide = useMediaQuery('(min-width: 1440px)');
    // Panel klienta: na szerokich ekranach otwarty, na laptopach chowany —
    // użytkownik dociąga go przyciskiem w nagłówku konwersacji.
    const [insightsOpen, setInsightsOpen] = useState(
        () => window.matchMedia('(min-width: 1440px)').matches
    );
    // Panel folderów zwijany na życzenie; wybór pamiętany między sesjami.
    const [railOpen, setRailOpen] = useState(
        () => window.localStorage.getItem('comms.railOpen') !== 'false'
    );
    const [fullMessageId, setFullMessageId] = useState<string | null>(null);
    const { showInfo } = useToast();

    const toggleRail = () => {
        setRailOpen((open) => {
            window.localStorage.setItem('comms.railOpen', String(!open));
            return !open;
        });
    };

    const selectedThreadId = searchParams.get('thread');
    const selectThread = useCallback(
        (threadId: string | null) => {
            setFullMessageId(null);
            setSearchParams(threadId ? { thread: threadId } : {}, { replace: true });
        },
        [setSearchParams]
    );

    const { data: accounts } = useMailAccounts();
    const { data: labels } = useLabels();
    const filters = useMemo(
        () => ({
            archived: folder.kind === 'archive',
            onlyUnread: folder.kind === 'unread',
            onlyLeads: folder.kind === 'leads',
            labelId: folder.kind === 'label' ? folder.labelId : undefined,
            query: query || undefined,
            page,
            pageSize: 30,
        }),
        [folder, query, page]
    );
    const { data: threadPage } = useThreads(filters);
    const { data: detail } = useThread(selectedThreadId);
    // Ten sam cache co panel Insights — chip w nagłówku nie kosztuje drugiego requestu.
    const { data: insights } = useContactInsights(
        detail?.thread.participantEmail ?? null,
        detail?.thread.id
    );

    const markRead = useMarkThreadRead();
    const setArchived = useSetThreadArchived();
    const setLabel = useSetThreadLabel();
    const createLabel = useCreateLabel();
    const deleteLabel = useDeleteLabel();
    const syncAccount = useSyncAccount();

    // Otwarcie konwersacji oznacza ją jako przeczytaną — lokalnie od razu,
    // na serwerze pocztowym przez kolejkę w tle.
    useEffect(() => {
        if (detail && detail.thread.unreadCount > 0) {
            markRead.mutate(detail.thread.id);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [detail?.thread.id, detail?.thread.unreadCount]);

    const downloadAttachment = async (attachmentId: string, fileName: string) => {
        const blob = await commsApi.downloadAttachment(attachmentId);
        const url = URL.createObjectURL(blob);
        const anchor = document.createElement('a');
        anchor.href = url;
        anchor.download = fileName;
        anchor.click();
        URL.revokeObjectURL(url);
    };

    const activeAccount = accounts?.find((account) => account.status !== 'DISABLED');
    const accountsConnected = (accounts ?? []).filter((account) => account.status !== 'DISABLED');
    const totalPages = threadPage ? Math.max(1, Math.ceil(threadPage.total / threadPage.pageSize)) : 1;

    const statusColor = (status: string) =>
        status === 'ACTIVE' ? '#22c55e' : status === 'AUTH_FAILED' ? '#ef4444' : '#d1d5db';

    const changeFolder = (next: Folderish) => {
        setFolder(next);
        setPage(0);
        if (!isDesktop) selectThread(null);
    };

    const folderChips: { key: string; label: string; folderish: Folderish }[] = [
        { key: 'inbox', label: 'Odebrane', folderish: { kind: 'inbox' } },
        { key: 'unread', label: 'Nieprzeczytane', folderish: { kind: 'unread' } },
        { key: 'leads', label: 'Leady', folderish: { kind: 'leads' } },
        { key: 'archive', label: 'Archiwum', folderish: { kind: 'archive' } },
        ...(labels ?? []).map((label) => ({
            key: `label-${label.id}`,
            label: label.name,
            folderish: { kind: 'label', labelId: label.id } as Folderish,
        })),
    ];
    const folderKey = folder.kind === 'label' ? `label-${folder.labelId}` : folder.kind;

    const knownClient = insights?.customer ?? null;
    const conversationOpen = Boolean(detail);
    const fullMessage = detail?.messages.find((message) => message.id === fullMessageId) ?? null;

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
                <FolderRail $open={railOpen}>
                    <FolderButton $active={folder.kind === 'inbox'} onClick={() => changeFolder({ kind: 'inbox' })}>
                        <Inbox size={15} /> Odebrane
                        {threadPage && threadPage.totalUnread > 0 && (
                            <span className="count">{threadPage.totalUnread}</span>
                        )}
                    </FolderButton>
                    <FolderButton $active={folder.kind === 'unread'} onClick={() => changeFolder({ kind: 'unread' })}>
                        <MailOpen size={15} /> Nieprzeczytane
                    </FolderButton>
                    <FolderButton $active={folder.kind === 'leads'} onClick={() => changeFolder({ kind: 'leads' })}>
                        <Sparkles size={15} /> Leady
                    </FolderButton>
                    <FolderButton $active={folder.kind === 'archive'} onClick={() => changeFolder({ kind: 'archive' })}>
                        <Archive size={15} /> Archiwum
                    </FolderButton>

                    <RailSection>
                        Foldery
                        <button
                            aria-label="Nowy folder"
                            onClick={() => {
                                const name = window.prompt('Nazwa folderu');
                                if (name?.trim()) createLabel.mutate({ name: name.trim() });
                            }}
                        >
                            <FolderPlus size={13} />
                        </button>
                    </RailSection>
                    {(labels ?? []).map((label) => (
                        <FolderButton
                            key={label.id}
                            $active={folder.kind === 'label' && folder.labelId === label.id}
                            onClick={() => changeFolder({ kind: 'label', labelId: label.id })}
                        >
                            <Folder size={15} /> {label.name}
                            <span
                                className="del"
                                role="button"
                                aria-label={`Usuń folder ${label.name}`}
                                onClick={(event) => {
                                    event.stopPropagation();
                                    if (window.confirm(`Usunąć folder „${label.name}”? Wiadomości zostaną w skrzynce.`)) {
                                        deleteLabel.mutate(label.id);
                                        if (folder.kind === 'label' && folder.labelId === label.id) {
                                            changeFolder({ kind: 'inbox' });
                                        }
                                    }
                                }}
                            >
                                <Trash2 size={12} />
                            </span>
                        </FolderButton>
                    ))}

                    <AccountFooter>
                        {accountsConnected.map((account) => (
                            <div key={account.id} title={account.lastError ?? undefined}>
                                <StatusDot $color={statusColor(account.status)} />
                                {account.emailAddress}
                                {account.status === 'AUTH_FAILED' && (
                                    <div style={{ color: '#ef4444', fontSize: 11, marginTop: 2 }}>
                                        Zaloguj się ponownie w ustawieniach
                                    </div>
                                )}
                            </div>
                        ))}
                        <div style={{ display: 'flex', gap: 6 }}>
                            <IconButton
                                onClick={() => {
                                    if (!activeAccount) return;
                                    syncAccount.mutate(activeAccount.id);
                                    showInfo('Synchronizuję…', 'Nowe wiadomości pojawią się za chwilę');
                                }}
                            >
                                <RefreshCw /> Odśwież
                            </IconButton>
                            <Link to="/communication/mailboxes">
                                <IconButton as="span" aria-label="Ustawienia skrzynek"><Settings /></IconButton>
                            </Link>
                        </div>
                    </AccountFooter>
                </FolderRail>

                <ListPane $hiddenOnMobile={conversationOpen}>
                    <ListHeader>
                        <MobileChipsRow>
                            {folderChips.map((chip) => (
                                <FilterChip
                                    key={chip.key}
                                    $active={folderKey === chip.key}
                                    onClick={() => changeFolder(chip.folderish)}
                                >
                                    {chip.label}
                                    {chip.key === 'inbox' && threadPage && threadPage.totalUnread > 0
                                        ? ` (${threadPage.totalUnread})`
                                        : ''}
                                </FilterChip>
                            ))}
                        </MobileChipsRow>
                        <SearchRow>
                            <RailToggle
                                onClick={toggleRail}
                                aria-label={railOpen ? 'Ukryj foldery' : 'Pokaż foldery'}
                                title={railOpen ? 'Ukryj foldery' : 'Pokaż foldery'}
                            >
                                {railOpen ? <PanelLeftClose size={16} /> : <PanelLeftOpen size={16} />}
                            </RailToggle>
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
                    {!isDesktop && (
                        <AccountFooter as="div" style={{ marginTop: 0 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                {activeAccount && (
                                    <>
                                        <StatusDot $color={statusColor(activeAccount.status)} />
                                        <span style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                            {activeAccount.emailAddress}
                                        </span>
                                    </>
                                )}
                                <Link to="/communication/mailboxes">
                                    <IconButton as="span" aria-label="Ustawienia skrzynek"><Settings /></IconButton>
                                </Link>
                            </div>
                        </AccountFooter>
                    )}
                </ListPane>

                <ConversationPane $hiddenOnMobile={!conversationOpen}>
                    {!detail && (
                        <EmptyStateWrap>
                            <div>
                                <MailOpen size={36} color="#cbd5e1" style={{ marginBottom: 10 }} />
                                <p>Wybierz konwersację z listy</p>
                            </div>
                        </EmptyStateWrap>
                    )}
                    {detail && (
                        <>
                            <ConversationHeader>
                                {!isDesktop && (
                                    <IconButton
                                        onClick={() => selectThread(null)}
                                        aria-label="Wróć do listy"
                                        style={{ padding: 7 }}
                                    >
                                        <ArrowLeft />
                                    </IconButton>
                                )}
                                <div className="titles">
                                    <h3>{detail.thread.subject ?? '(bez tematu)'}</h3>
                                    <div className="sub">
                                        {detail.thread.participantName
                                            ? `${detail.thread.participantName} · ${detail.thread.participantEmail}`
                                            : detail.thread.participantEmail}
                                        {knownClient && (
                                            <ClientChip title="Klient z kartoteki">
                                                <Wallet size={11} />
                                                {knownClient.completedVisitCount}{' '}
                                                {knownClient.completedVisitCount === 1 ? 'wizyta' : 'wizyt'}
                                                {' · '}
                                                {formatGrosze(knownClient.totalSpentGross)}
                                            </ClientChip>
                                        )}
                                    </div>
                                </div>

                                <HeaderActions>
                                    <LabelSelect
                                        value={detail.thread.labelId ?? ''}
                                        onChange={(event) =>
                                            setLabel.mutate({
                                                threadId: detail.thread.id,
                                                labelId: event.target.value || null,
                                            })
                                        }
                                        aria-label="Folder"
                                    >
                                        <option value="">Bez folderu</option>
                                        {(labels ?? []).map((label) => (
                                            <option key={label.id} value={label.id}>{label.name}</option>
                                        ))}
                                    </LabelSelect>

                                    <IconButton
                                        onClick={() =>
                                            setArchived.mutate(
                                                { threadId: detail.thread.id, archived: !detail.thread.archived },
                                                { onSuccess: () => selectThread(null) }
                                            )
                                        }
                                        aria-label={detail.thread.archived ? 'Przywróć' : 'Archiwizuj'}
                                    >
                                        {detail.thread.archived ? <ArchiveRestore /> : <Archive />}
                                    </IconButton>

                                    {detail.thread.leadId ? (
                                        <Link to={`/leads?lead=${detail.thread.leadId}`}>
                                            <Pill $bg="#f0fdf4" $fg="#15803d" style={{ cursor: 'pointer', padding: '6px 12px' }}>
                                                <Sparkles size={11} /> Lead
                                            </Pill>
                                        </Link>
                                    ) : (
                                        <IconButton onClick={() => setLeadPopoverOpen(true)}>
                                            <Tag /> Oznacz jako lead
                                        </IconButton>
                                    )}

                                    {isDesktop && (
                                        <IconButton
                                            onClick={() => setInsightsOpen(!insightsOpen)}
                                            aria-label={insightsOpen ? 'Ukryj panel klienta' : 'Pokaż panel klienta'}
                                            title={insightsOpen ? 'Ukryj panel klienta' : 'Pokaż panel klienta'}
                                            style={{ padding: 7 }}
                                        >
                                            {insightsOpen ? <PanelRightClose /> : <PanelRightOpen />}
                                        </IconButton>
                                    )}
                                </HeaderActions>
                                {leadPopoverOpen && (
                                    <MarkAsLeadPopover
                                        threadId={detail.thread.id}
                                        onClose={() => setLeadPopoverOpen(false)}
                                        onCreated={() => undefined}
                                    />
                                )}
                            </ConversationHeader>

                            <MessagesScroll>
                                {detail.messages.map((message: CommMessage) => (
                                    <MessageCard key={message.id} $outbound={message.direction === 'OUTBOUND'}>
                                        <MessageHeader>
                                            <span className="from">
                                                {message.direction === 'OUTBOUND'
                                                    ? 'Ty'
                                                    : message.fromName ?? message.fromEmail}
                                                <small>{message.fromEmail}</small>
                                            </span>
                                            <span className="meta">
                                                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                                                    {formatDateTime(message.sentAt)}
                                                    {message.bodyHtml && (
                                                        <ExpandIconButton
                                                            onClick={() => setFullMessageId(message.id)}
                                                            aria-label="Wyświetl w pełnym widoku"
                                                            title="Wyświetl w pełnym widoku"
                                                        >
                                                            <Maximize2 size={13} />
                                                        </ExpandIconButton>
                                                    )}
                                                </span>
                                                {message.direction === 'INBOUND' && message.isRead
                                                    && message.readSource === 'EXTERNAL' && (
                                                    <div>przeczytano w innym kliencie</div>
                                                )}
                                            </span>
                                        </MessageHeader>
                                        <MessagePadding>
                                            {message.bodyHtml
                                                ? (
                                                    <MessageBody
                                                        html={message.bodyHtml}
                                                        onOpenFull={() => setFullMessageId(message.id)}
                                                    />
                                                )
                                                : <EmptyHint>(pusta wiadomość)</EmptyHint>}
                                        </MessagePadding>
                                        {message.attachments.length > 0 && (
                                            <AttachmentRow>
                                                {message.attachments.map((attachment) => (
                                                    <AttachmentChip
                                                        key={attachment.id}
                                                        onClick={() => downloadAttachment(attachment.id, attachment.fileName)}
                                                    >
                                                        <Download size={12} />
                                                        {attachment.fileName}
                                                        <span>{(attachment.sizeBytes / 1024).toFixed(0)} KB</span>
                                                    </AttachmentChip>
                                                ))}
                                            </AttachmentRow>
                                        )}
                                    </MessageCard>
                                ))}
                            </MessagesScroll>

                            <ReplyComposer
                                threadId={detail.thread.id}
                                initialTo={detail.thread.participantEmail}
                            />
                        </>
                    )}
                </ConversationPane>

                {isDesktop && (isWide ? insightsOpen : insightsOpen && conversationOpen) && (
                    <InsightsPanel
                        email={detail?.thread.participantEmail ?? null}
                        threadId={detail?.thread.id}
                        participantName={detail?.thread.participantName}
                        onSelectThread={selectThread}
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
