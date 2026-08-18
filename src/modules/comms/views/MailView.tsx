// src/modules/comms/views/MailView.tsx
// Skrzynka: trzy panele jak w każdym znanym kliencie poczty — foldery/filtry,
// lista wątków, konwersacja + panel Insights. Cała maszyneria synchronizacji
// sprowadza się wizualnie do jednej kropki statusu konta.
import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import styled from 'styled-components';
import {
    Archive,
    ArchiveRestore,
    ChevronLeft,
    ChevronRight,
    Download,
    Folder,
    FolderPlus,
    Inbox,
    Mail,
    MailOpen,
    Paperclip,
    RefreshCw,
    Search,
    Settings,
    Sparkles,
    Tag,
    Trash2,
} from 'lucide-react';
import { useToast } from '@/common/components/Toast';
import { commsApi } from '../api/commsApi';
import {
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
import {
    EmptyHint,
    IconButton,
    Pill,
    formatDateTime,
    formatRelativeTime,
} from '../components/shared';

// ── Layout ───────────────────────────────────────────────────────────────────

const Screen = styled.div`
    display: flex;
    height: calc(100vh - 64px);
    background: #ffffff;
    border-top: 1px solid #e5e7eb;
`;

const FolderRail = styled.nav`
    width: 200px;
    flex-shrink: 0;
    border-right: 1px solid #e5e7eb;
    background: #fafafa;
    padding: 12px 8px;
    display: flex;
    flex-direction: column;
    gap: 2px;
    overflow-y: auto;

    @media (max-width: 900px) { display: none; }
`;

const FolderButton = styled.button<{ $active: boolean }>`
    display: flex;
    align-items: center;
    gap: 8px;
    width: 100%;
    border: none;
    background: ${({ $active }) => ($active ? '#eef2f7' : 'transparent')};
    color: ${({ $active }) => ($active ? '#111827' : '#4b5563')};
    font-weight: ${({ $active }) => ($active ? 600 : 400)};
    font-size: 13px;
    padding: 8px 10px;
    border-radius: 8px;
    cursor: pointer;
    text-align: left;

    &:hover { background: #eef2f7; }

    .count {
        margin-left: auto;
        font-size: 11px;
        font-weight: 600;
        color: #2563eb;
    }
    .del {
        margin-left: auto;
        color: #d1d5db;
        display: none;
    }
    &:hover .del { display: inline-flex; }
`;

const RailSection = styled.div`
    margin-top: 14px;
    padding: 0 10px 4px;
    font-size: 10px;
    font-weight: 600;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    color: #9ca3af;
    display: flex;
    align-items: center;
    justify-content: space-between;

    button { border: none; background: none; color: #9ca3af; cursor: pointer; padding: 0; }
`;

const AccountFooter = styled.div`
    margin-top: auto;
    padding: 10px;
    border-top: 1px solid #eef0f2;
    font-size: 12px;
    color: #6b7280;
    display: flex;
    flex-direction: column;
    gap: 6px;
`;

const StatusDot = styled.span<{ $color: string }>`
    display: inline-block;
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: ${({ $color }) => $color};
    margin-right: 6px;
`;

// ── Lista wątków ─────────────────────────────────────────────────────────────

const ListPane = styled.div`
    width: 340px;
    flex-shrink: 0;
    border-right: 1px solid #e5e7eb;
    display: flex;
    flex-direction: column;
    min-width: 0;
`;

const ListHeader = styled.div`
    padding: 10px 12px;
    border-bottom: 1px solid #eef0f2;
    display: flex;
    align-items: center;
    gap: 8px;
`;

const SearchInput = styled.div`
    flex: 1;
    display: flex;
    align-items: center;
    gap: 6px;
    border: 1px solid #e5e7eb;
    border-radius: 8px;
    padding: 6px 10px;
    color: #9ca3af;

    input { border: none; outline: none; flex: 1; font-size: 13px; min-width: 0; }
`;

const ThreadListScroll = styled.div`
    flex: 1;
    overflow-y: auto;
`;

const ThreadItem = styled.button<{ $active: boolean; $unread: boolean }>`
    display: block;
    width: 100%;
    text-align: left;
    border: none;
    border-bottom: 1px solid #f3f4f6;
    background: ${({ $active }) => ($active ? '#eef2f7' : '#ffffff')};
    padding: 10px 12px;
    cursor: pointer;

    &:hover { background: ${({ $active }) => ($active ? '#eef2f7' : '#f9fafb')}; }

    .top {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 8px;
    }
    .who {
        font-size: 13px;
        color: #111827;
        font-weight: ${({ $unread }) => ($unread ? 700 : 500)};
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
    }
    .when { font-size: 11px; color: #9ca3af; white-space: nowrap; }
    .subject {
        font-size: 12px;
        color: ${({ $unread }) => ($unread ? '#111827' : '#4b5563')};
        font-weight: ${({ $unread }) => ($unread ? 600 : 400)};
        margin-top: 2px;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
    }
    .snippet {
        font-size: 12px;
        color: #9ca3af;
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
    border-top: 1px solid #eef0f2;
    padding: 6px;
    font-size: 12px;
    color: #6b7280;

    button {
        border: none; background: none; cursor: pointer; color: #6b7280;
        display: inline-flex; padding: 4px;
        &:disabled { color: #e5e7eb; cursor: default; }
    }
`;

// ── Konwersacja ──────────────────────────────────────────────────────────────

const ConversationPane = styled.div`
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
`;

const ConversationHeader = styled.div`
    padding: 12px 16px;
    border-bottom: 1px solid #eef0f2;
    display: flex;
    align-items: center;
    gap: 10px;
    position: relative;

    .titles { flex: 1; min-width: 0; }
    h3 {
        margin: 0;
        font-size: 15px;
        font-weight: 600;
        color: #111827;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
    }
    .sub { font-size: 12px; color: #6b7280; }
`;

const MessagesScroll = styled.div`
    flex: 1;
    overflow-y: auto;
    background: #f8f9fb;
    padding: 16px;
    display: flex;
    flex-direction: column;
    gap: 12px;
`;

const MessageCard = styled.article<{ $outbound: boolean }>`
    background: #ffffff;
    border: 1px solid ${({ $outbound }) => ($outbound ? '#dbeafe' : '#eef0f2')};
    border-radius: 10px;
    overflow: hidden;
    ${({ $outbound }) => ($outbound ? 'margin-left: 32px;' : 'margin-right: 32px;')}
`;

const MessageHeader = styled.header`
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: 8px;
    padding: 10px 14px 6px;

    .from { font-size: 13px; font-weight: 600; color: #111827; }
    .from small { font-weight: 400; color: #9ca3af; margin-left: 6px; }
    .meta { font-size: 11px; color: #9ca3af; white-space: nowrap; text-align: right; }
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
    border: 1px solid #e5e7eb;
    background: #f9fafb;
    color: #374151;
    border-radius: 999px;
    padding: 4px 10px;
    font-size: 12px;
    cursor: pointer;

    &:hover { background: #f3f4f6; }
`;

const LabelSelect = styled.select`
    border: 1px solid #e5e7eb;
    border-radius: 6px;
    padding: 6px 8px;
    font-size: 12px;
    color: #374151;
    background: #ffffff;
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
    const { showInfo } = useToast();

    const selectedThreadId = searchParams.get('thread');
    const selectThread = (threadId: string | null) => {
        setSearchParams(threadId ? { thread: threadId } : {}, { replace: true });
    };

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

    if (accounts && accountsConnected.length === 0) {
        return (
            <Screen style={{ alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ textAlign: 'center', maxWidth: 420, padding: 24 }}>
                    <Mail size={40} color="#d1d5db" style={{ marginBottom: 12 }} />
                    <h3 style={{ margin: '0 0 8px', color: '#111827' }}>Podłącz swoją skrzynkę</h3>
                    <p style={{ margin: '0 0 16px', color: '#6b7280', fontSize: 14 }}>
                        Wystarczy adres e-mail i hasło — resztą zajmiemy się my. Twoje wiadomości
                        pojawią się tutaj i będziesz mógł odpowiadać bez wychodzenia z CRM.
                    </p>
                    <Link to="/communication/mailboxes">
                        <IconButton as="span"><Settings size={14} /> Podłącz skrzynkę</IconButton>
                    </Link>
                </div>
            </Screen>
        );
    }

    return (
        <Screen>
            <FolderRail>
                <FolderButton $active={folder.kind === 'inbox'} onClick={() => { setFolder({ kind: 'inbox' }); setPage(0); }}>
                    <Inbox size={15} /> Odebrane
                    {threadPage && threadPage.totalUnread > 0 && <span className="count">{threadPage.totalUnread}</span>}
                </FolderButton>
                <FolderButton $active={folder.kind === 'unread'} onClick={() => { setFolder({ kind: 'unread' }); setPage(0); }}>
                    <MailOpen size={15} /> Nieprzeczytane
                </FolderButton>
                <FolderButton $active={folder.kind === 'leads'} onClick={() => { setFolder({ kind: 'leads' }); setPage(0); }}>
                    <Sparkles size={15} /> Leady
                </FolderButton>
                <FolderButton $active={folder.kind === 'archive'} onClick={() => { setFolder({ kind: 'archive' }); setPage(0); }}>
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
                        onClick={() => { setFolder({ kind: 'label', labelId: label.id }); setPage(0); }}
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
                                        setFolder({ kind: 'inbox' });
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
                            <RefreshCw size={13} /> Odśwież
                        </IconButton>
                        <Link to="/communication/mailboxes">
                            <IconButton as="span"><Settings size={13} /></IconButton>
                        </Link>
                    </div>
                </AccountFooter>
            </FolderRail>

            <ListPane>
                <ListHeader>
                    <SearchInput>
                        <Search size={14} />
                        <input
                            placeholder="Szukaj po adresie, nazwie, temacie…"
                            value={query}
                            onChange={(event) => { setQuery(event.target.value); setPage(0); }}
                        />
                    </SearchInput>
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
            </ListPane>

            <ConversationPane>
                {!detail && <EmptyHint style={{ marginTop: 80 }}>Wybierz konwersację z listy</EmptyHint>}
                {detail && (
                    <>
                        <ConversationHeader>
                            <div className="titles">
                                <h3>{detail.thread.subject ?? '(bez tematu)'}</h3>
                                <div className="sub">
                                    {detail.thread.participantName
                                        ? `${detail.thread.participantName} · ${detail.thread.participantEmail}`
                                        : detail.thread.participantEmail}
                                </div>
                            </div>

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
                            >
                                {detail.thread.archived ? <ArchiveRestore size={14} /> : <Archive size={14} />}
                                {detail.thread.archived ? 'Przywróć' : 'Archiwizuj'}
                            </IconButton>

                            {detail.thread.leadId ? (
                                <Link to={`/leads?lead=${detail.thread.leadId}`}>
                                    <Pill $bg="#f0fdf4" $fg="#15803d" style={{ cursor: 'pointer' }}>
                                        <Sparkles size={11} /> Lead
                                    </Pill>
                                </Link>
                            ) : (
                                <IconButton onClick={() => setLeadPopoverOpen(true)}>
                                    <Tag size={14} /> Oznacz jako lead
                                </IconButton>
                            )}
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
                                            {formatDateTime(message.sentAt)}
                                            {message.direction === 'INBOUND' && message.isRead && message.readSource === 'EXTERNAL' && (
                                                <div>przeczytano w innym kliencie</div>
                                            )}
                                        </span>
                                    </MessageHeader>
                                    <MessagePadding>
                                        {message.bodyHtml
                                            ? <MessageBody html={message.bodyHtml} />
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
                                                    <span style={{ color: '#9ca3af' }}>
                                                        {(attachment.sizeBytes / 1024).toFixed(0)} KB
                                                    </span>
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

            <InsightsPanel
                email={detail?.thread.participantEmail ?? null}
                threadId={detail?.thread.id}
            />
        </Screen>
    );
}
