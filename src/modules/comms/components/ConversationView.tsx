// src/modules/comms/components/ConversationView.tsx
// Prawa kolumna skrzynki: nagłówek rozmowy, oś wiadomości i pole odpowiedzi.
//
// Wątek czyta się jak dokument, nie jak czat. Trzy decyzje, które za tym stoją:
//
//  1. AKORDEON. Domyślnie otwarta jest ostatnia wiadomość (i wszystko, czego nie
//     przeczytano); wcześniejsze są jednolinijkowymi wierszami z nadawcą, początkiem
//     treści i godziną. Wątek na 28 wiadomości mieści się wtedy na ekranie, a oko ma
//     jedno miejsce, w które ma patrzeć. Dłuższe historie zwijają środek pod jeden
//     przycisk — jak w Gmailu.
//  2. WIERSZ, NIE DYMEK. Mail to dokument: pełna szerokość, stała kolumna czytelnicza,
//     kierunek zaznaczony akcentem i tłem, a nie przesunięciem w bok. Dymki z
//     marginesem 40px zjadały szerokość dokładnie tam, gdzie potrzebna jest treść.
//  3. JEDNO MIEJSCE NA ADRES. Adres uczestnika stoi w podtytule nagłówka i nigdzie
//     indziej. Nazwa nadawcy jest przy każdej wiadomości (bo mówi, kto mówi), ale
//     adres tylko wtedy, gdy odbiega od uczestnika wątku — w kółko powtarzany e-mail
//     to szum, nie informacja.
//  4. KONTEKST KLIENTA JAKO PASEK, NIE PANEL. Jeśli rozpoznaliśmy nadawcę w kartotece,
//     nad korespondencją pojawia się jedno zdanie z liczbami, które zmieniają ton
//     odpowiedzi (ile wizyt, ile zostawił), a szczegóły otwiera modal. Stały panel
//     boczny zabierał 300 px na każdym ekranie po to, by przez większość czasu
//     powtarzać to, co i tak widać w nagłówku.
//
// Komponent jest memoizowany: odświeżenie listy wątków, zdarzenie WebSocket czy
// pisanie w wyszukiwarce nie przerysowuje treści korespondencji.
import { memo, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import styled from 'styled-components';
import {
    Archive,
    ArchiveRestore,
    ArrowLeft,
    ChevronDown,
    Download,
    ChevronRight,
    Maximize2,
    Paperclip,
    MessagesSquare,
    Sparkles,
    StickyNote,
    Tag,
    Wallet,
} from 'lucide-react';
import type { CommAttachment, CommMessage, CommThread } from '../types';
import { MessageBody } from './MessageBody';
import { ReplyComposer } from './ReplyComposer';
import { MarkAsLeadModal } from './MarkAsLeadModal';
import { ClientProfileModal } from './ClientProfileModal';
import { ContactNotesPopover } from './ContactNotesPopover';
import { useThreadContactBadges } from '../hooks/useComms';
import { plainPreview, splitQuotedHistory } from '../utils/emailHtml';
import { EmptyHint, IconButton, Pill, formatDateTime, formatGrosze, formatRelativeTime } from './shared';

const Pane = styled.div<{ $hiddenOnMobile: boolean }>`
    flex: 1;
    min-width: 0;
    min-height: 0;
    display: ${({ $hiddenOnMobile }) => ($hiddenOnMobile ? 'none' : 'flex')};
    flex-direction: column;

    @media (min-width: ${p => p.theme.breakpoints.lg}) { display: flex; }
`;

const Header = styled.div`
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

/**
 * Plakietki przy adresie nadawcy: ile jeszcze rozmów mamy z tym adresem i notatki
 * o kliencie. Świadomie ciche — szara ramka, ten sam rozmiar co adres obok. To
 * kontekst do zerknięcia, nie akcja, a nagłówek ma prowadzić wzrok do tematu wątku.
 */
const ContextBadge = styled.button<{ $interactive?: boolean; $active?: boolean }>`
    display: inline-flex;
    align-items: center;
    gap: 5px;
    border: 1px solid ${({ $active, theme }) => ($active ? theme.colors.primary : theme.colors.border)};
    background: ${({ $active, theme }) => ($active ? '#f0f9ff' : theme.colors.surfaceAlt)};
    color: ${({ $active, theme }) => ($active ? theme.colors.primary : theme.colors.textSecondary)};
    border-radius: ${p => p.theme.radii.full};
    padding: 2px 9px;
    font-size: 11.5px;
    font-family: inherit;
    line-height: 1.7;
    white-space: nowrap;
    cursor: ${({ $interactive }) => ($interactive ? 'pointer' : 'default')};
    transition: all ${p => p.theme.transitions.fast};

    &:hover {
        border-color: ${({ $interactive, theme }) =>
            $interactive ? theme.colors.textMuted : theme.colors.border};
    }

    svg { width: 11px; height: 11px; flex-shrink: 0; }

    .count {
        font-weight: ${p => p.theme.fontWeights.semibold};
        font-variant-numeric: tabular-nums;
    }
`;

/**
 * Pasek rozpoznanego klienta — jedno zdanie między nagłówkiem a korespondencją.
 * Liczby, które realnie zmieniają ton odpowiedzi: ile razy u nas był i ile zostawił.
 */
const ClientBar = styled.button`
    display: flex;
    align-items: center;
    gap: 8px;
    width: 100%;
    text-align: left;
    font-family: inherit;
    cursor: pointer;
    border: none;
    border-bottom: 1px solid ${p => p.theme.colors.border};
    background: ${p => p.theme.colors.successLight};
    color: ${p => p.theme.colors.success};
    padding: 9px 16px;
    font-size: 13px;
    transition: filter ${p => p.theme.transitions.fast};

    &:hover { filter: brightness(0.97); }

    .text { flex: 1; min-width: 0; }
    strong { font-weight: ${p => p.theme.fontWeights.semibold}; }
    .cta {
        font-weight: ${p => p.theme.fontWeights.medium};
        text-decoration: underline;
        white-space: nowrap;
    }
    svg { flex-shrink: 0; }

    @media (max-width: calc(${p => p.theme.breakpoints.md} - 1px)) {
        .cta { display: none; }
    }
`;

const MessagesScroll = styled.div`
    flex: 1;
    min-height: 0;
    overflow-y: auto;
    background: ${p => p.theme.colors.surfaceAlt};
    padding: 14px 12px 20px;
    display: flex;
    flex-direction: column;
    gap: 10px;

    @media (min-width: ${p => p.theme.breakpoints.md}) { padding: 18px 20px 24px; }
`;

/**
 * Wiadomość jako kartka dokumentu. flex-shrink: 0 jest tu krytyczne: w kolumnie
 * flex elementy domyślnie kurczą się do wysokości kontenera zamiast go przewinąć,
 * przez co każda wiadomość zostawała ścięta do kilku linijek.
 */
const Article = styled.article<{ $outbound: boolean }>`
    flex-shrink: 0;
    background: ${({ $outbound, theme }) => ($outbound ? '#f7fbff' : theme.colors.surface)};
    border: 1px solid ${({ $outbound, theme }) => ($outbound ? '#dbeafe' : theme.colors.border)};
    border-left: 3px solid ${({ $outbound, theme }) => ($outbound ? theme.colors.primary : 'transparent')};
    border-radius: ${p => p.theme.radii.lg};
    box-shadow: ${p => p.theme.shadows.sm};
    padding: 14px 16px 16px;

    @media (min-width: ${p => p.theme.breakpoints.md}) { padding: 16px 20px 18px; }
`;

/** Zwinięta wiadomość: kto, o czym, kiedy — jedna linijka, całość klikalna. */
const CollapsedRow = styled.button<{ $outbound: boolean }>`
    flex-shrink: 0;
    display: flex;
    align-items: center;
    gap: 10px;
    width: 100%;
    text-align: left;
    font-family: inherit;
    cursor: pointer;
    background: ${({ $outbound, theme }) => ($outbound ? '#f7fbff' : theme.colors.surface)};
    border: 1px solid ${({ $outbound, theme }) => ($outbound ? '#dbeafe' : theme.colors.border)};
    border-left: 3px solid ${({ $outbound, theme }) => ($outbound ? theme.colors.primary : 'transparent')};
    border-radius: ${p => p.theme.radii.lg};
    padding: 9px 16px;
    transition: background ${p => p.theme.transitions.fast};

    &:hover { background: ${p => p.theme.colors.surfaceHover}; }

    .who {
        font-size: 13px;
        font-weight: ${p => p.theme.fontWeights.semibold};
        color: ${p => p.theme.colors.text};
        white-space: nowrap;
    }
    .preview {
        flex: 1;
        min-width: 0;
        font-size: 13px;
        color: ${p => p.theme.colors.textMuted};
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
    }
    .when {
        font-size: 11px;
        color: ${p => p.theme.colors.textMuted};
        white-space: nowrap;
    }
    .clip { color: ${p => p.theme.colors.textMuted}; flex-shrink: 0; }
`;

/** Zwinięty środek długiej historii — jeden przycisk zamiast dwudziestu wierszy. */
const GapRow = styled.button`
    flex-shrink: 0;
    align-self: center;
    display: inline-flex;
    align-items: center;
    gap: 6px;
    border: 1px solid ${p => p.theme.colors.border};
    background: ${p => p.theme.colors.surface};
    color: ${p => p.theme.colors.textSecondary};
    border-radius: ${p => p.theme.radii.full};
    padding: 5px 16px;
    font-size: 12px;
    font-weight: ${p => p.theme.fontWeights.medium};
    font-family: inherit;
    cursor: pointer;

    &:hover { background: ${p => p.theme.colors.surfaceHover}; }
`;

/** Inicjały nadawcy — najszybszy sposób na „kto mówi" przy skanowaniu wątku. */
const Avatar = styled.span<{ $hue: number; $outbound: boolean }>`
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 28px;
    height: 28px;
    flex-shrink: 0;
    border-radius: 50%;
    font-size: 11px;
    font-weight: ${p => p.theme.fontWeights.bold};
    letter-spacing: 0.02em;
    color: ${({ $outbound, $hue }) => ($outbound ? '#0369a1' : `hsl(${$hue}, 45%, 34%)`)};
    background: ${({ $outbound, $hue }) => ($outbound ? '#e0f2fe' : `hsl(${$hue}, 62%, 93%)`)};
`;

const MessageHeader = styled.header`
    display: flex;
    align-items: center;
    gap: 10px;
    margin-bottom: 10px;

    .identity { flex: 1; min-width: 0; }
    .from {
        font-size: 13.5px;
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
        font-size: 11.5px;
        color: ${p => p.theme.colors.textMuted};
        display: flex;
        align-items: center;
        gap: 6px;
        flex-wrap: wrap;
    }
`;

const ExpandIconButton = styled.button`
    border: none;
    background: none;
    color: ${p => p.theme.colors.textMuted};
    cursor: pointer;
    padding: 4px;
    display: inline-flex;
    align-items: center;
    border-radius: ${p => p.theme.radii.sm};
    flex-shrink: 0;

    &:hover { color: ${p => p.theme.colors.textSecondary}; background: ${p => p.theme.colors.surfaceAlt}; }
`;

const AttachmentRow = styled.div`
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    margin-top: 14px;
    padding-top: 12px;
    border-top: 1px solid ${p => p.theme.colors.border};
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

/**
 * Szkielet na czas dociągania treści. Pojawia się z opóźnieniem: wątek trafia do
 * cache przy najechaniu na listę, więc zwykle przychodzi w kilkadziesiąt milisekund,
 * a szkielet mignąłby wtedy tylko po to, żeby zaraz zniknąć. Opóźnienie robi CSS,
 * nie stan — dzięki temu nie kosztuje ani jednego dodatkowego renderu.
 */
const SkeletonCard = styled.div<{ $height: number }>`
    height: ${({ $height }) => $height}px;
    opacity: 0;
    animation: commsShimmer 1.4s ease-in-out infinite, commsSkeletonIn 120ms linear 260ms forwards;

    @keyframes commsSkeletonIn {
        to { opacity: 1; }
    }
    border-radius: ${p => p.theme.radii.lg};
    border: 1px solid ${p => p.theme.colors.border};
    background: linear-gradient(
        100deg,
        ${p => p.theme.colors.surface} 30%,
        ${p => p.theme.colors.surfaceHover} 50%,
        ${p => p.theme.colors.surface} 70%
    );
    background-size: 300% 100%;

    @keyframes commsShimmer {
        from { background-position: 150% 0; }
        to { background-position: -50% 0; }
    }

    flex-shrink: 0;
`;

/** Wysokość, powyżej której ramka maila projektowanego dostaje własny scroll. */
const RICH_MAIL_MAX_HEIGHT = 620;

/** Powyżej tylu wiadomości chowamy środek historii pod jeden przycisk. */
const COLLAPSE_MIDDLE_ABOVE = 5;
/** Ile ostatnich wiadomości zostaje widocznych, gdy środek jest zwinięty. */
const TAIL_SIZE = 3;

const sameAddress = (left: string | null | undefined, right: string | null | undefined): boolean =>
    Boolean(left) && Boolean(right) && left!.trim().toLowerCase() === right!.trim().toLowerCase();

/** Inicjały nadawcy: „Biuro CarsLab" → BC, „henkel.michal87@gmail.com" → HE. */
const initialsOf = (name: string | null, email: string): string => {
    const source = (name ?? email.split('@')[0] ?? '').replace(/[^\p{L}\p{N}\s.]/gu, ' ').trim();
    const parts = source.split(/[\s.]+/).filter(Boolean);
    if (parts.length === 0) return '?';
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[1][0]).toUpperCase();
};

/** Stabilny odcień awatara — ten sam nadawca zawsze w tym samym kolorze. */
const hueOf = (value: string): number => {
    let hash = 0;
    for (let index = 0; index < value.length; index += 1) {
        hash = (hash * 31 + value.charCodeAt(index)) % 360;
    }
    return hash;
};

/** Nazwa nadawcy w wierszu wiadomości — krótka, bo kontekst daje nagłówek wątku. */
/** Stała referencja — pusta mapa rozwinięć dla świeżo otwartego wątku. */
const EMPTY_OVERRIDES: Record<string, boolean> = {};

const senderName = (message: CommMessage): string =>
    message.direction === 'OUTBOUND' ? 'Ty' : message.fromName ?? message.fromEmail;

export interface ConversationClientSummary {
    name: string | null;
    completedVisitCount: number;
    totalSpentGross: number;
}

/** Odmiana „wizyta/wizyty/wizyt" — pasek ma brzmieć jak zdanie, nie jak raport. */
const visitsLabel = (count: number): string => {
    if (count === 1) return 'wizytę';
    const lastDigit = count % 10;
    const lastTwo = count % 100;
    const plural = lastDigit >= 2 && lastDigit <= 4 && (lastTwo < 12 || lastTwo > 14);
    return plural ? 'wizyty' : 'wizyt';
};

/** Odmiana „wątek/wątki/wątków" — plakietka też ma brzmieć po polsku. */
const threadsLabel = (count: number): string => {
    if (count === 1) return 'inny wątek';
    const lastDigit = count % 10;
    const lastTwo = count % 100;
    const plural = lastDigit >= 2 && lastDigit <= 4 && (lastTwo < 12 || lastTwo > 14);
    return plural ? 'inne wątki' : 'innych wątków';
};

interface ConversationViewProps {
    thread: CommThread;
    /** null = treść wątku jeszcze się dociąga (nagłówek jest już poprawny). */
    messages: CommMessage[] | null;
    isDesktop: boolean;
    hiddenOnMobile: boolean;
    /** Rozpoznany klient z kartoteki — źródło paska nad korespondencją. */
    clientSummary: ConversationClientSummary | null;
    onBack: () => void;
    onToggleArchived: (thread: CommThread) => void;
    onOpenFullMessage: (messageId: string) => void;
    onDownloadAttachment: (attachmentId: string, fileName: string) => void;
}

function ConversationViewImpl({
    thread,
    messages,
    isDesktop,
    hiddenOnMobile,
    clientSummary,
    onBack,
    onToggleArchived,
    onOpenFullMessage,
    onDownloadAttachment,
}: ConversationViewProps) {
    // Popover trzyma id wątku, w którym go otwarto — zmiana rozmowy zamyka go
    // sama z siebie, bez efektu synchronizującego stan.
    const [leadPopoverThreadId, setLeadPopoverThreadId] = useState<string | null>(null);
    const leadPopoverOpen = leadPopoverThreadId === thread.id;
    const scrollRef = useRef<HTMLDivElement>(null);

    // Ręczne rozwinięcia trzymamy razem z id wątku — zmiana rozmowy zeruje je sama,
    // bez efektu synchronizującego stan.
    const [manual, setManual] = useState<{ threadId: string; map: Record<string, boolean> }>({
        threadId: thread.id,
        map: {},
    });
    const manualMap = manual.threadId === thread.id ? manual.map : EMPTY_OVERRIDES;
    const [historyShownFor, setHistoryShownFor] = useState<string | null>(null);
    const historyShown = historyShownFor === thread.id;

    const toggleMessage = (messageId: string, currentlyExpanded: boolean) =>
        setManual((previous) => ({
            threadId: thread.id,
            map: {
                ...(previous.threadId === thread.id ? previous.map : {}),
                [messageId]: !currentlyExpanded,
            },
        }));

    // Podgląd treści bez cytatów — to on trafia do zwiniętego wiersza.
    const previews = useMemo(() => {
        const map = new Map<string, string>();
        (messages ?? []).forEach((message) => {
            const body = message.bodyHtml ?? '';
            map.set(message.id, body ? plainPreview(splitQuotedHistory(body).mainHtml) : '(pusta wiadomość)');
        });
        return map;
    }, [messages]);

    // Co jest otwarte domyślnie: ostatnia wiadomość, wszystko nieprzeczytane i całe
    // krótkie wątki. Reszta czeka zwinięta — jedno kliknięcie od treści.
    const total = messages?.length ?? 0;
    const isExpanded = (message: CommMessage, index: number): boolean => {
        const manualChoice = manualMap[message.id];
        if (manualChoice !== undefined) return manualChoice;
        return index === total - 1 || !message.isRead || total <= 2;
    };

    // Środek długiej historii chowamy pod jeden przycisk (pierwsza + ostatnie trzy).
    const hiddenCount = Math.max(0, total - 1 - TAIL_SIZE);
    const collapseMiddle = total > COLLAPSE_MIDDLE_ABOVE && hiddenCount > 1 && !historyShown;
    const isInHiddenMiddle = (index: number) =>
        collapseMiddle && index > 0 && index < total - TAIL_SIZE;

    // Nowy wątek zaczynamy czytać od góry; w obrębie wątku pozycja zostaje.
    useEffect(() => {
        scrollRef.current?.scrollTo({ top: 0 });
    }, [thread.id]);

    const [profileOpen, setProfileOpen] = useState(false);
    // Kotwicą chmurki notatek jest sama plakietka — trzymamy jej element, a nie flagę,
    // bo pozycja przelicza się przy przewinięciu nagłówka i zmianie szerokości okna.
    const [notesAnchor, setNotesAnchor] = useState<HTMLElement | null>(null);
    const { data: contactBadges } = useThreadContactBadges(thread.id);

    return (
        <Pane $hiddenOnMobile={hiddenOnMobile}>
            <Header>
                {!isDesktop && (
                    <IconButton onClick={onBack} aria-label="Wróć do listy" style={{ padding: 7 }}>
                        <ArrowLeft />
                    </IconButton>
                )}
                <div className="titles">
                    <h3 title={thread.subject ?? undefined}>{thread.subject ?? '(bez tematu)'}</h3>
                    <div className="sub">
                        {/* Jedyne miejsce w widoku, w którym stoi adres uczestnika. */}
                        <span>
                            {thread.participantName
                                ? `${thread.participantName} · ${thread.participantEmail}`
                                : thread.participantEmail}
                        </span>

                        {contactBadges && (
                            <>
                                <ContextBadge as="span" title="Rozmowy z tym adresem">
                                    <MessagesSquare />
                                    {contactBadges.otherThreadCount > 0 ? (
                                        <>
                                            <span className="count">{contactBadges.otherThreadCount}</span>
                                            {` ${threadsLabel(contactBadges.otherThreadCount)}`}
                                        </>
                                    ) : (
                                        'Brak poprzednich rozmów'
                                    )}
                                </ContextBadge>

                                <ContextBadge
                                    type="button"
                                    $interactive
                                    $active={notesAnchor !== null}
                                    aria-expanded={notesAnchor !== null}
                                    onClick={(event) => {
                                        const badge = event.currentTarget as HTMLElement;
                                        setNotesAnchor((current) => (current ? null : badge));
                                    }}
                                >
                                    <StickyNote />
                                    Notatka do klienta
                                    {contactBadges.noteCount > 0 && (
                                        <span className="count">{contactBadges.noteCount}</span>
                                    )}
                                </ContextBadge>
                            </>
                        )}
                    </div>
                </div>

                <HeaderActions>
                    <IconButton
                        onClick={() => onToggleArchived(thread)}
                        aria-label={thread.archived ? 'Przywróć' : 'Archiwizuj'}
                    >
                        {thread.archived ? <ArchiveRestore /> : <Archive />}
                    </IconButton>

                    {thread.leadId ? (
                        <Link to={`/leads?lead=${thread.leadId}`}>
                            <Pill $bg="#f0fdf4" $fg="#15803d" style={{ cursor: 'pointer', padding: '6px 12px' }}>
                                <Sparkles size={11} /> Lead
                            </Pill>
                        </Link>
                    ) : (
                        <IconButton onClick={() => setLeadPopoverThreadId(thread.id)}>
                            <Tag /> Oznacz jako lead
                        </IconButton>
                    )}
                </HeaderActions>
                {notesAnchor && (
                    <ContactNotesPopover
                        email={thread.participantEmail}
                        anchor={notesAnchor}
                        onClose={() => setNotesAnchor(null)}
                    />
                )}
                {leadPopoverOpen && (
                    <MarkAsLeadModal
                        threadId={thread.id}
                        onClose={() => setLeadPopoverThreadId(null)}
                        onCreated={() => undefined}
                    />
                )}
            </Header>

            {clientSummary && (
                <ClientBar onClick={() => setProfileOpen(true)} title="Zobacz profil klienta">
                    <Wallet size={14} />
                    <span className="text">
                        <strong>{clientSummary.name ?? thread.participantName ?? thread.participantEmail}</strong>
                        {' odbył u nas '}
                        <strong>{clientSummary.completedVisitCount}</strong>
                        {` ${visitsLabel(clientSummary.completedVisitCount)} o wartości `}
                        <strong>{formatGrosze(clientSummary.totalSpentGross)}</strong>.
                    </span>
                    <span className="cta">Kliknij i dowiedz się więcej</span>
                    <ChevronRight size={14} />
                </ClientBar>
            )}

            <MessagesScroll ref={scrollRef}>
                {messages === null && (
                    <>
                        <SkeletonCard $height={132} />
                        <SkeletonCard $height={92} />
                    </>
                )}

                {(messages ?? []).map((message: CommMessage, index: number) => {
                    if (isInHiddenMiddle(index)) {
                        // Jeden przycisk zamiast całej zwiniętej historii — rysujemy go
                        // w miejscu pierwszej schowanej wiadomości.
                        return index === 1 ? (
                            <GapRow
                                key="history-gap"
                                onClick={() => setHistoryShownFor(thread.id)}
                                title="Pokaż wcześniejsze wiadomości w tym wątku"
                            >
                                <ChevronDown size={13} />
                                {hiddenCount} wcześniejsze wiadomości
                            </GapRow>
                        ) : null;
                    }

                    const outbound = message.direction === 'OUTBOUND';
                    const expanded = isExpanded(message, index);
                    const name = senderName(message);
                    const initials = outbound ? 'TY' : initialsOf(message.fromName, message.fromEmail);
                    const hue = hueOf(message.fromEmail);

                    if (!expanded) {
                        return (
                            <CollapsedRow
                                key={message.id}
                                $outbound={outbound}
                                onClick={() => toggleMessage(message.id, expanded)}
                                aria-expanded={false}
                                title="Rozwiń wiadomość"
                            >
                                <Avatar $hue={hue} $outbound={outbound}>{initials}</Avatar>
                                <span className="who">{name}</span>
                                <span className="preview">{previews.get(message.id)}</span>
                                {message.attachments.length > 0 && (
                                    <Paperclip size={12} className="clip" aria-label="Ma załączniki" />
                                )}
                                <span className="when">{formatRelativeTime(message.sentAt)}</span>
                            </CollapsedRow>
                        );
                    }

                    // Adres pokazujemy tylko, gdy wnosi informację — inaczej powtarzalibyśmy
                    // to, co stoi w nagłówku rozmowy i w panelu klienta.
                    const showEmail =
                        !outbound && !sameAddress(message.fromEmail, thread.participantEmail);
                    const readElsewhere =
                        message.direction === 'INBOUND' && message.isRead && message.readSource === 'EXTERNAL';

                    return (
                        <Article key={message.id} $outbound={outbound}>
                            <MessageHeader>
                                <Avatar $hue={hue} $outbound={outbound}>{initials}</Avatar>
                                <button
                                    className="identity"
                                    onClick={() => toggleMessage(message.id, expanded)}
                                    aria-expanded
                                    title="Zwiń wiadomość"
                                    style={{
                                        border: 'none', background: 'none', padding: 0,
                                        textAlign: 'left', cursor: 'pointer', font: 'inherit',
                                    }}
                                >
                                    <div className="from">
                                        {name}
                                        {showEmail && <small>{message.fromEmail}</small>}
                                    </div>
                                    <div className="meta">
                                        {formatDateTime(message.sentAt)}
                                        {readElsewhere && <span>· przeczytano w innym kliencie</span>}
                                    </div>
                                </button>
                                {message.bodyHtml && (
                                    <ExpandIconButton
                                        onClick={() => onOpenFullMessage(message.id)}
                                        aria-label="Wyświetl w pełnym widoku"
                                        title="Wyświetl w pełnym widoku"
                                    >
                                        <Maximize2 size={14} />
                                    </ExpandIconButton>
                                )}
                            </MessageHeader>

                            {message.bodyHtml
                                ? (
                                    <MessageBody
                                        html={message.bodyHtml}
                                        cacheKey={message.id}
                                        maxHeight={RICH_MAIL_MAX_HEIGHT}
                                        compactGraphical
                                        onOpenFull={() => onOpenFullMessage(message.id)}
                                    />
                                )
                                : <EmptyHint>(pusta wiadomość)</EmptyHint>}

                            {message.attachments.length > 0 && (
                                <AttachmentRow>
                                    {message.attachments.map((attachment: CommAttachment) => (
                                        <AttachmentChip
                                            key={attachment.id}
                                            onClick={() => onDownloadAttachment(attachment.id, attachment.fileName)}
                                        >
                                            <Download size={12} />
                                            {attachment.fileName}
                                            <span>{(attachment.sizeBytes / 1024).toFixed(0)} KB</span>
                                        </AttachmentChip>
                                    ))}
                                </AttachmentRow>
                            )}
                        </Article>
                    );
                })}
            </MessagesScroll>

            <ReplyComposer
                key={thread.id}
                threadId={thread.id}
                initialTo={thread.participantEmail}
                recipientLabel={thread.participantName ?? thread.participantEmail}
            />

            <ClientProfileModal
                isOpen={profileOpen}
                onClose={() => setProfileOpen(false)}
                clientName={
                    clientSummary?.name ?? thread.participantName ?? thread.participantEmail
                }
            />
        </Pane>
    );
}

export const ConversationView = memo(ConversationViewImpl);
