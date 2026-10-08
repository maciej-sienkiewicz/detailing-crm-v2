// src/modules/comms/inbox/InboxPage.tsx
// Skrzynka „Zapytania" (/zapytania) - dawne „Leady" i „Poczta" w jednym miejscu,
// zbudowana według makiet z canvasu „Zapytania – makiety".
//
// Układ zależy od miejsca, jakie ma karta skrzynki (a nie okno - obok stoi pasek
// boczny aplikacji, zwinięty albo rozwinięty):
//  - szeroko: lista, rozmowa i panel sprawy obok siebie (makieta 1440 px),
//  - średnio: lista i rozmowa; panel sprawy otwiera kwota w nagłówku rozmowy,
//  - wąsko (tablet w pionie): jedna kolumna - lista albo rozmowa ze strzałką „wstecz",
//  - telefon: lista na cały ekran nad dolną nawigacją, rozmowa na cały ekran nad nią
//    (makiety telefonu).
//
// Wszystko, co otwarte, mieszka w adresie (useInboxNav), więc odświeżenie strony
// i link z powiadomienia trafiają w to samo miejsce.
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import styled, { css } from 'styled-components';
import { Archive, ArrowLeft, BarChart3, CheckSquare, Inbox, Mail, MailOpen, PenLine, PenSquare, RefreshCw, ShieldAlert, Sparkles } from 'lucide-react';
import { MenuDivider, MenuItem } from '@/common/components/ui';
import { useContainerWidth, useDebounce, useMediaQuery } from '@/common/hooks';
import { useToast } from '@/common/components/Toast';
import { acquireScrollLock } from '@/common/utils/scrollLock';
import { BOTTOM_NAV_SPACE } from '@/widgets/BottomNav';
import {
    CLOSED_LEAD_STATUSES,
    OPEN_LEAD_STATUSES,
    useLeadsByStatuses,
    useLeadsSocket,
    useStagnationThresholds,
} from '../hooks/useLeads';
import {
    useFormMailSources,
    useMailAccounts,
    useMailboxSyncState,
    useMarkThreadRead,
    useMarkThreadUnread,
    usePrefetchThread,
    useSetThreadArchived,
    useSyncAccount,
    useThreads,
} from '../hooks/useComms';
import type { CommThread, LeadStatus, MailFolder } from '../types';
import { buildWorklist } from '../utils/leadWorklist';
import { LeadArchive } from '../components/LeadArchive';
import { MailboxSyncPanel } from '../components/MailboxSyncPanel';
import { MailContextMenu } from '../components/MailContextMenu';
import { ReplyComposer } from '../components/ReplyComposer';
import { SignatureSettingsModal } from '../components/SignatureSettingsModal';
import { ReplyDraftStyleSettings } from '../components/ReplyDraftButton';
import { usePermissions } from '@/core/permissions';
import { ListHeader } from './ListHeader';
import { CaseList } from './CaseList';
import { MailList } from './MailList';
import { CaseDetail } from './CaseDetail';
import { MailDetail } from './MailDetail';
import { ConversationHeader } from './Conversation';
import { caseTitle } from './caseModel';
import { useInboxNav } from './useInboxNav';
import { ix } from './tokens';

/** Najkrótszy odstęp między ręcznymi synchronizacjami skrzynki. */
const MANUAL_SYNC_COOLDOWN_MS = 15_000;
const MAIL_PAGE = 30;
/** Rozmowa potrzebuje co najmniej tyle, żeby dymki i kompozytor się mieściły (makieta: 460). */
const CONVERSATION_MIN = 460;
/** Panel sprawy obok rozmowy (makieta: 320, w ciasnym układzie 300). */
const RAIL_MIN = 300;

const Page = styled.main<{ $phone: boolean }>`
    display: flex;
    width: 100%;
    box-sizing: border-box;
    font-family: ${ix.font};
    color: ${ix.ink};
    /* Rytm z makiet: wysokość linii z kroju, nie globalne 1.5 aplikacji. */
    line-height: normal;
    -webkit-font-smoothing: antialiased;
    ${p => (p.$phone
        ? css`
            height: calc(100dvh - ${BOTTOM_NAV_SPACE});
            background: #ffffff;
        `
        : css`
            height: 100dvh;
            padding: 24px;
            background: ${ix.bg};
        `)}
`;

const Card = styled.div<{ $phone: boolean }>`
    flex: 1;
    min-width: 0;
    min-height: 0;
    display: flex;
    overflow: hidden;
    background: #ffffff;
    ${p => !p.$phone && css`
        border: 1px solid ${ix.line};
        border-radius: 16px;
    `}
`;

const ListColumn = styled.section<{ $width: number | null }>`
    ${p => (p.$width ? css`flex: 0 0 ${p.$width}px; border-right: 1px solid ${ix.line};` : css`flex: 1 1 auto;`)}
    min-width: 0;
    min-height: 0;
    display: flex;
    flex-direction: column;
    box-sizing: border-box;
`;

const DetailArea = styled.div`
    flex: 1;
    min-width: 0;
    min-height: 0;
    display: flex;
`;

/** Rozmowa na telefonie: cały ekran nad listą i dolną nawigacją, pod oknami modalnymi. */
const PhoneLayer = styled.div`
    position: fixed;
    inset: 0;
    z-index: 900;
    display: flex;
    flex-direction: column;
    background: #ffffff;
    font-family: ${ix.font};
    color: ${ix.ink};
    line-height: normal;
    padding-bottom: env(safe-area-inset-bottom, 0px);
`;

const Placeholder = styled.div`
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 14px;
    padding: 24px;
    text-align: center;
    color: ${ix.muted};
    font-size: 14px;

    svg { width: 36px; height: 36px; color: #cbd5e1; }
    button {
        border: 1px solid ${ix.line};
        border-radius: 999px;
        background: #ffffff;
        padding: 10px 18px;
        font-family: inherit;
        font-size: 14px;
        font-weight: 500;
        color: ${ix.inkSoft};
        cursor: pointer;
        &:hover { background: ${ix.surfaceSoft}; }
    }
`;

const ModeBar = styled.div`
    display: flex;
    align-items: center;
    gap: 8px;
    margin: 4px 16px 4px;

    button {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        border: none;
        background: none;
        padding: 6px 4px;
        font-family: inherit;
        font-size: 13px;
        font-weight: 600;
        color: ${ix.accentInk};
        cursor: pointer;
        svg { width: 16px; height: 16px; }
    }
    .what { margin-left: auto; font-size: 13px; color: ${ix.muted}; }
`;

const AccountFooter = styled.div`
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 16px calc(8px + env(safe-area-inset-bottom, 0px));
    border-top: 1px solid ${ix.lineSoft};
    font-size: 12px;
    color: ${ix.muted};

    .dot { width: 8px; height: 8px; border-radius: 50%; flex: none; }
    .addr { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
`;

/** Telefon: rozmowa przykrywa listę na cały ekran - z blokadą przewijania tła (CLAUDE.md §3). */
function PhoneFullScreen({ children }: { children: ReactNode }) {
    useEffect(() => acquireScrollLock(), []);
    return <PhoneLayer role="dialog" aria-modal="true">{children}</PhoneLayer>;
}

export default function InboxPage() {
    const navigate = useNavigate();
    const { showInfo } = useToast();
    const { can } = usePermissions();
    const nav = useInboxNav();
    const { tab, leadId, threadId, archive, rejected, compose } = nav.location;
    const phone = useMediaQuery('(max-width: 767px)');
    const [cardRef, cardWidth] = useContainerWidth<HTMLDivElement>();

    const [query, setQuery] = useState('');
    const [archiveQuery, setArchiveQuery] = useState('');
    const [archiveStatus, setArchiveStatus] = useState<LeadStatus | undefined>(undefined);
    const [selecting, setSelecting] = useState(false);
    const [mailPageSize, setMailPageSize] = useState(MAIL_PAGE);
    const [settingsModal, setSettingsModal] = useState<null | 'signature' | 'draft-style'>(null);
    const [threadMenu, setThreadMenu] = useState<{ x: number; y: number; thread: CommThread } | null>(null);

    // Szukanie należy do zakładki - przejście do innej zaczyna od pełnej listy.
    const changeTab = (next: typeof tab) => {
        if (next === tab) return;
        setQuery('');
        setSelecting(false);
        setMailPageSize(MAIL_PAGE);
        nav.setTab(next);
    };

    // ── Sprawy ──────────────────────────────────────────────────────────────
    useLeadsSocket();
    const thresholds = useStagnationThresholds();
    const open = useLeadsByStatuses(OPEN_LEAD_STATUSES);
    const worklist = useMemo(() => buildWorklist(open.items, thresholds), [open.items, thresholds]);
    const archiveSearch = useDebounce(archiveQuery, 300);
    const archiveBundle = useLeadsByStatuses(
        tab === 'sprawy' && archive ? (archiveStatus ? [archiveStatus] : CLOSED_LEAD_STATUSES) : [],
        { query: archiveSearch, sortDirection: 'DESC' }
    );

    // ── Poczta ──────────────────────────────────────────────────────────────
    const folder: MailFolder = tab === 'wyslane' ? 'SENT' : rejected ? 'REJECTED' : 'INBOX';
    const mailQuery = useDebounce(query, 300);
    const { data: accounts } = useMailAccounts();
    const mailboxSync = useMailboxSyncState();
    const { data: threadPage } = useThreads({
        archived: false,
        folder,
        query: tab !== 'sprawy' ? mailQuery || undefined : undefined,
        page: 0,
        pageSize: mailPageSize,
    });
    const { data: formSources } = useFormMailSources();
    const formSenders = useMemo(
        () => new Set((formSources ?? []).filter((entry) => entry.active).map((entry) => entry.senderEmail)),
        [formSources]
    );
    const prefetchThread = usePrefetchThread();
    const setArchived = useSetThreadArchived();
    const markRead = useMarkThreadRead();
    const markUnread = useMarkThreadUnread();
    const syncAccount = useSyncAccount();
    const lastSyncAt = useRef(0);
    const activeAccount = accounts?.find((account) => account.status !== 'DISABLED');

    // ── Układ ───────────────────────────────────────────────────────────────
    const listWidth = tab === 'sprawy' ? 320 : 380;
    const measured = cardWidth ?? (typeof window !== 'undefined' ? window.innerWidth - 112 : 1280);
    const twoPane = !phone && measured >= listWidth + CONVERSATION_MIN;
    const railBeside = twoPane && measured >= listWidth + CONVERSATION_MIN + RAIL_MIN;
    const detailOpen = tab === 'sprawy' ? Boolean(leadId) : Boolean(threadId || compose);

    /** Po wysłaniu: następna sprawa, która czeka na nas - poza tą, na którą odpisano. */
    const advanceFrom = useCallback(
        (current: string) => {
            const next = worklist.ours.entries.find((entry) => entry.lead.id !== current);
            nav.openCase(next ? next.lead.id : null);
        },
        [worklist.ours.entries, nav]
    );

    // `j` / `k` - następna i poprzednia sprawa bez odrywania ręki od klawiatury.
    useEffect(() => {
        if (tab !== 'sprawy' || !twoPane || archive) return;
        const onKey = (event: KeyboardEvent) => {
            if (event.key !== 'j' && event.key !== 'k') return;
            if (event.metaKey || event.ctrlKey || event.altKey) return;
            const target = event.target as HTMLElement | null;
            if (target && (/^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName) || target.isContentEditable)) return;
            if (document.querySelector('[role="dialog"], [role="menu"]')) return;
            const visible = worklist.ours.entries;
            if (visible.length === 0) return;
            event.preventDefault();
            const index = visible.findIndex((entry) => entry.lead.id === leadId);
            const next = index === -1 ? 0 : event.key === 'j' ? Math.min(index + 1, visible.length - 1) : Math.max(index - 1, 0);
            nav.openCase(visible[next].lead.id);
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [tab, twoPane, archive, worklist.ours.entries, leadId, nav]);

    const refreshMailbox = useCallback(() => {
        if (!activeAccount) return;
        // Seria kliknięć niczego nie przyspiesza, a potrafiła wywołać „Przekroczono limit żądań".
        const now = Date.now();
        if (syncAccount.isPending || now - lastSyncAt.current < MANUAL_SYNC_COOLDOWN_MS) {
            showInfo('Synchronizacja już trwa', 'Nowe wiadomości pojawią się za chwilę');
            return;
        }
        lastSyncAt.current = now;
        syncAccount.mutate(activeAccount.id);
        showInfo('Synchronizuję…', 'Nowe wiadomości pojawią się za chwilę');
    }, [activeAccount, syncAccount, showInfo]);

    const settingsMenu = (close: () => void) => (
        <>
            {tab !== 'sprawy' && (
                <MenuItem icon={<PenSquare />} onClick={() => { close(); nav.openCompose(); }}>Nowa wiadomość</MenuItem>
            )}
            {tab === 'sprawy' && !archive && (
                <MenuItem icon={<CheckSquare />} onClick={() => { close(); setSelecting(true); }}>Zaznacz sprawy</MenuItem>
            )}
            {tab === 'sprawy' && (
                <MenuItem icon={<Archive />} onClick={() => { close(); nav.setArchive(!archive); }}>
                    {archive ? 'Sprawy otwarte' : 'Zamknięte sprawy'}
                </MenuItem>
            )}
            {tab === 'poczta' && (
                <MenuItem icon={<ShieldAlert />} onClick={() => { close(); nav.setRejected(!rejected); }}>
                    {rejected ? 'Odebrane' : 'Odrzucone przez automat'}
                </MenuItem>
            )}
            {tab !== 'sprawy' && activeAccount && (
                <MenuItem icon={<RefreshCw />} onClick={() => { close(); refreshMailbox(); }}>Odśwież skrzynkę</MenuItem>
            )}
            <MenuDivider />
            <MenuItem icon={<PenLine />} onClick={() => { close(); setSettingsModal('signature'); }}>Stopka maila</MenuItem>
            <MenuItem icon={<Sparkles />} onClick={() => { close(); setSettingsModal('draft-style'); }}>Styl szkiców AI</MenuItem>
            <MenuItem icon={<Inbox />} onClick={() => { close(); navigate('/communication/mailboxes'); }}>Skrzynki pocztowe</MenuItem>
            <MenuItem icon={<BarChart3 />} onClick={() => { close(); navigate('/leads/analytics'); }}>Podsumowanie miesiąca</MenuItem>
        </>
    );

    const modeBar =
        tab === 'sprawy' && archive ? (
            <ModeBar>
                <button type="button" onClick={() => nav.setArchive(false)}><ArrowLeft /> Sprawy otwarte</button>
                <span className="what">Zamknięte sprawy</span>
            </ModeBar>
        ) : tab === 'poczta' && rejected ? (
            <ModeBar>
                <button type="button" onClick={() => nav.setRejected(false)}><ArrowLeft /> Odebrane</button>
                <span className="what">Odrzucone przez automat</span>
            </ModeBar>
        ) : null;

    const threads = threadPage?.items ?? [];
    const listThread = threads.find((item) => item.id === threadId) ?? null;
    const noMailbox = Boolean(accounts) && !activeAccount;

    // ── Kolumna listy ────────────────────────────────────────────────────────
    const list = (
        <ListColumn $width={twoPane ? listWidth : null} aria-label={tab === 'sprawy' ? 'Sprawy' : 'Poczta'}>
            <ListHeader
                tab={tab}
                onTab={changeTab}
                phone={phone}
                query={tab === 'sprawy' && archive ? archiveQuery : query}
                onQuery={tab === 'sprawy' && archive ? setArchiveQuery : setQuery}
                searchPlaceholder={tab === 'sprawy' ? (archive ? 'Szukaj w zamkniętych' : 'Szukaj: auto, osoba, adres') : 'Szukaj: osoba, temat, treść'}
                menu={settingsMenu}
                below={modeBar}
            />
            {mailboxSync.syncing ? (
                <div style={{ padding: 16, overflowY: 'auto' }}><MailboxSyncPanel /></div>
            ) : tab === 'sprawy' ? (
                archive ? (
                    <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '0 8px' }}>
                        <LeadArchive
                            bundle={archiveBundle}
                            query={archiveQuery}
                            onQueryChange={setArchiveQuery}
                            status={archiveStatus}
                            onStatusChange={setArchiveStatus}
                            onOpen={(id) => nav.openCase(id)}
                        />
                    </div>
                ) : (
                    <CaseList
                        worklist={worklist}
                        query={query}
                        loading={open.isLoading}
                        truncated={open.truncated}
                        activeId={leadId}
                        onOpen={nav.openCase}
                        phone={phone}
                        selecting={selecting}
                        onStopSelecting={() => setSelecting(false)}
                    />
                )
            ) : noMailbox ? (
                <Placeholder>
                    <Mail />
                    Podłącz skrzynkę pocztową - wiadomości pojawią się tutaj i odpowiesz bez wychodzenia z CRM.
                    <button type="button" onClick={() => navigate('/communication/mailboxes')}>Podłącz skrzynkę</button>
                </Placeholder>
            ) : (
                <>
                    <MailList
                        threads={threads}
                        folder={folder}
                        query={query}
                        loaded={Boolean(threadPage)}
                        hasMore={(threadPage?.total ?? 0) > threads.length}
                        onMore={() => setMailPageSize((size) => size + MAIL_PAGE)}
                        activeId={threadId}
                        phone={phone}
                        formSenders={formSenders}
                        onOpen={(id) => {
                            // Wątek sprawy otwiera się jako sprawa - z wyceną i krokiem następnym (makieta).
                            const thread = threads.find((item) => item.id === id);
                            if (thread?.leadId && tab === 'poczta') {
                                navigate(`/zapytania?lead=${encodeURIComponent(thread.leadId)}`);
                                return;
                            }
                            nav.openThread(id);
                        }}
                        onArchive={(thread) => setArchived.mutate(
                            { threadId: thread.id, archived: !thread.archived },
                            { onSuccess: () => { if (thread.id === threadId) nav.openThread(null); } }
                        )}
                        onContextMenu={(event, thread) => {
                            event.preventDefault();
                            setThreadMenu({ x: event.clientX, y: event.clientY, thread });
                        }}
                        onPrefetch={prefetchThread}
                    />
                    {/* Stopka skrzynki tylko przy kłopocie (odrzucone hasło, błąd synchronizacji) -
                        zdrowa skrzynka nie potrzebuje stałego wiersza statusu. */}
                    {activeAccount && (activeAccount.status !== 'ACTIVE' || activeAccount.lastError) && (
                        <AccountFooter>
                            <span className="dot" style={{ background: activeAccount.status === 'ACTIVE' ? '#22c55e' : activeAccount.status === 'AUTH_FAILED' ? '#ef4444' : '#d1d5db' }} />
                            <span className="addr" title={activeAccount.lastError ?? undefined}>{activeAccount.emailAddress}</span>
                        </AccountFooter>
                    )}
                </>
            )}
        </ListColumn>
    );

    // ── Prawa część ──────────────────────────────────────────────────────────
    const back = twoPane ? undefined : () => (tab === 'sprawy' ? nav.openCase(null) : compose ? nav.closeCompose() : nav.openThread(null));

    let detail: ReactNode = null;
    if (tab === 'sprawy' && leadId) {
        detail = (
            <CaseDetail
                key={leadId}
                leadId={leadId}
                phone={phone}
                railBeside={railBeside}
                onBack={back}
                onAdvance={archive ? undefined : () => advanceFrom(leadId)}
                onClosed={() => nav.openCase(null)}
            />
        );
    } else if (tab !== 'sprawy' && compose && activeAccount) {
        detail = (
            <section style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }} aria-labelledby="compose-title">
                <ConversationHeader title="Nowa wiadomość" subtitle={`Wyślemy z ${activeAccount.emailAddress}`} phone={phone} onBack={back ?? nav.closeCompose} titleId="compose-title" />
                <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', paddingTop: 20 }}>
                    <ReplyComposer
                        accountId={activeAccount.id}
                        initialTo={compose.to || undefined}
                        requireSubject
                        galleryContext={can('VISITS_VIEW') ? {} : undefined}
                        onSent={(id) => nav.showSent(id)}
                    />
                </div>
            </section>
        );
    } else if (tab !== 'sprawy' && threadId) {
        detail = (
            <MailDetail
                key={threadId}
                threadId={threadId}
                listThread={listThread}
                phone={phone}
                onBack={back}
                onArchived={() => nav.openThread(null)}
                onOpenCase={(id) => navigate(`/zapytania?lead=${encodeURIComponent(id)}`)}
            />
        );
    }

    const placeholder =
        tab === 'sprawy' ? (
            <Placeholder>
                <Inbox />
                {worklist.head ? (
                    <>
                        Wybierz sprawę z listy.
                        <button type="button" onClick={() => nav.openCase(worklist.head!.lead.id)}>
                            Zacznij od najdłużej czekającej: {caseTitle(worklist.head.lead)}
                        </button>
                    </>
                ) : (
                    'Nikt nie czeka na odpowiedź.'
                )}
            </Placeholder>
        ) : (
            <Placeholder>
                <MailOpen />
                Wybierz wiadomość z listy.
                {!noMailbox && <button type="button" onClick={() => nav.openCompose()}>Napisz nową wiadomość</button>}
            </Placeholder>
        );

    return (
        <Page $phone={phone}>
            <Card ref={cardRef} $phone={phone}>
                {(twoPane || !detailOpen || phone) && list}
                {!phone && (twoPane || detailOpen) && <DetailArea>{detail ?? (twoPane ? placeholder : null)}</DetailArea>}
            </Card>

            {phone && detailOpen && detail && <PhoneFullScreen>{detail}</PhoneFullScreen>}

            {threadMenu && (
                <MailContextMenu
                    x={threadMenu.x}
                    y={threadMenu.y}
                    onClose={() => setThreadMenu(null)}
                    items={[
                        threadMenu.thread.unreadCount > 0
                            ? { icon: <MailOpen />, label: 'Oznacz jako przeczytaną', onSelect: () => markRead.mutate(threadMenu.thread.id) }
                            : {
                                icon: <Mail />,
                                // Wprost o JEDNEJ wiadomości: wraca najnowsza od klienta, a nie cała rozmowa.
                                label: 'Oznacz ostatnią jako nieprzeczytaną',
                                onSelect: () => markUnread.mutate({ threadId: threadMenu.thread.id }),
                            },
                        {
                            icon: <Archive />,
                            label: threadMenu.thread.archived ? 'Przywróć ze schowka' : 'Archiwizuj',
                            onSelect: () => setArchived.mutate({ threadId: threadMenu.thread.id, archived: !threadMenu.thread.archived }),
                        },
                    ]}
                />
            )}
            {settingsModal === 'signature' && <SignatureSettingsModal isOpen onClose={() => setSettingsModal(null)} />}
            {settingsModal === 'draft-style' && <ReplyDraftStyleSettings onClose={() => setSettingsModal(null)} />}
        </Page>
    );
}
