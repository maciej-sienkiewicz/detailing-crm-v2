// src/modules/comms/components/ConversationView.tsx
// Prawa kolumna skrzynki: nagłówek rozmowy, oś wiadomości i pole odpowiedzi.
//
// Wydzielone z MailView z dwóch powodów:
//  1. Wydajność i spokój ekranu — komponent jest memoizowany, więc pisanie w
//     wyszukiwarce, odświeżenie listy wątków czy przyjście zdarzenia WebSocket
//     nie przerysowuje ramek z treścią wiadomości. Przerysowuje się wyłącznie to,
//     co faktycznie się zmieniło.
//  2. Jedno miejsce odpowiedzialne za prezentację korespondencji — łatwiej
//     pilnować, żeby ta sama informacja nie pojawiała się dwa razy.
//
// Zasada anty-powtórzeniowa w nagłówkach: adres nadawcy pokazujemy dokładnie raz.
// Kanonicznym miejscem jest panel klienta (gdy otwarty), a gdy jest schowany —
// podtytuł nagłówka rozmowy. Nagłówki poszczególnych wiadomości podają adres
// tylko wtedy, gdy odbiega od uczestnika wątku (przekazane, wiele adresów).
import { memo, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import styled from 'styled-components';
import {
    Archive,
    ArchiveRestore,
    ArrowLeft,
    Download,
    Maximize2,
    PanelRightClose,
    PanelRightOpen,
    Sparkles,
    Tag,
    Wallet,
} from 'lucide-react';
import type { CommAttachment, CommLabel, CommMessage, CommThread } from '../types';
import { MessageBody } from './MessageBody';
import { ReplyComposer } from './ReplyComposer';
import { MarkAsLeadPopover } from './MarkAsLeadPopover';
import { EmptyHint, IconButton, Pill, formatDateTime, formatGrosze } from './shared';

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

/** Szkielet na czas dociągania treści — rozmiar zbliżony do wiadomości,
 *  żeby przełączenie wątku nie było skokiem, tylko podmianą treści. */
const SkeletonCard = styled.div<{ $height: number }>`
    height: ${({ $height }) => $height}px;
    border-radius: ${p => p.theme.radii.lg};
    border: 1px solid ${p => p.theme.colors.border};
    background: linear-gradient(
        100deg,
        ${p => p.theme.colors.surface} 30%,
        ${p => p.theme.colors.surfaceHover} 50%,
        ${p => p.theme.colors.surface} 70%
    );
    background-size: 300% 100%;
    animation: commsShimmer 1.4s ease-in-out infinite;

    @keyframes commsShimmer {
        from { background-position: 150% 0; }
        to { background-position: -50% 0; }
    }

    @media (min-width: ${p => p.theme.breakpoints.md}) { margin-right: 40px; }
`;

/** Wysokość, powyżej której chmurka wiadomości dostaje własny scroll. */
const BUBBLE_MAX_HEIGHT = 560;

const sameAddress = (left: string | null | undefined, right: string | null | undefined): boolean =>
    Boolean(left) && Boolean(right) && left!.trim().toLowerCase() === right!.trim().toLowerCase();

export interface ConversationClientSummary {
    completedVisitCount: number;
    totalSpentGross: number;
}

interface ConversationViewProps {
    thread: CommThread;
    /** null = treść wątku jeszcze się dociąga (nagłówek jest już poprawny). */
    messages: CommMessage[] | null;
    labels: CommLabel[];
    isDesktop: boolean;
    hiddenOnMobile: boolean;
    /** Panel klienta jest widoczny — nie powtarzamy tam podanego adresu. */
    insightsVisible: boolean;
    clientSummary: ConversationClientSummary | null;
    onBack: () => void;
    onSetLabel: (threadId: string, labelId: string | null) => void;
    onToggleArchived: (thread: CommThread) => void;
    onToggleInsights: () => void;
    onOpenFullMessage: (messageId: string) => void;
    onDownloadAttachment: (attachmentId: string, fileName: string) => void;
}

function ConversationViewImpl({
    thread,
    messages,
    labels,
    isDesktop,
    hiddenOnMobile,
    insightsVisible,
    clientSummary,
    onBack,
    onSetLabel,
    onToggleArchived,
    onToggleInsights,
    onOpenFullMessage,
    onDownloadAttachment,
}: ConversationViewProps) {
    // Popover trzyma id wątku, w którym go otwarto — zmiana rozmowy zamyka go
    // sama z siebie, bez efektu synchronizującego stan.
    const [leadPopoverThreadId, setLeadPopoverThreadId] = useState<string | null>(null);
    const leadPopoverOpen = leadPopoverThreadId === thread.id;
    const scrollRef = useRef<HTMLDivElement>(null);

    // Nowy wątek zaczynamy czytać od góry; w obrębie wątku pozycja zostaje.
    useEffect(() => {
        scrollRef.current?.scrollTo({ top: 0 });
    }, [thread.id]);

    // Adres uczestnika ma jedno miejsce w interfejsie: panel klienta, a gdy jest
    // schowany — podtytuł nagłówka. Nazwa zostaje zawsze, bo to ona identyfikuje rozmowę.
    const showParticipantEmail = !insightsVisible || !thread.participantName;

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
                        <span title={thread.participantEmail}>
                            {showParticipantEmail
                                ? thread.participantName
                                    ? `${thread.participantName} · ${thread.participantEmail}`
                                    : thread.participantEmail
                                : thread.participantName}
                        </span>
                        {clientSummary && (
                            <ClientChip title="Klient z kartoteki">
                                <Wallet size={11} />
                                {clientSummary.completedVisitCount}{' '}
                                {clientSummary.completedVisitCount === 1 ? 'wizyta' : 'wizyt'}
                                {' · '}
                                {formatGrosze(clientSummary.totalSpentGross)}
                            </ClientChip>
                        )}
                    </div>
                </div>

                <HeaderActions>
                    <LabelSelect
                        value={thread.labelId ?? ''}
                        onChange={(event) => onSetLabel(thread.id, event.target.value || null)}
                        aria-label="Folder"
                    >
                        <option value="">Bez folderu</option>
                        {labels.map((label) => (
                            <option key={label.id} value={label.id}>{label.name}</option>
                        ))}
                    </LabelSelect>

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

                    {isDesktop && (
                        <IconButton
                            onClick={onToggleInsights}
                            aria-label={insightsVisible ? 'Ukryj panel klienta' : 'Pokaż panel klienta'}
                            title={insightsVisible ? 'Ukryj panel klienta' : 'Pokaż panel klienta'}
                            style={{ padding: 7 }}
                        >
                            {insightsVisible ? <PanelRightClose /> : <PanelRightOpen />}
                        </IconButton>
                    )}
                </HeaderActions>
                {leadPopoverOpen && (
                    <MarkAsLeadPopover
                        threadId={thread.id}
                        onClose={() => setLeadPopoverThreadId(null)}
                        onCreated={() => undefined}
                    />
                )}
            </Header>

            <MessagesScroll ref={scrollRef}>
                {messages === null && (
                    <>
                        <SkeletonCard $height={140} />
                        <SkeletonCard $height={96} />
                    </>
                )}
                {(messages ?? []).map((message: CommMessage) => {
                    const outbound = message.direction === 'OUTBOUND';
                    // Adres pokazujemy tylko, gdy wnosi informację — inaczej powtarzalibyśmy
                    // to, co stoi w nagłówku rozmowy i w panelu klienta.
                    const showEmail =
                        !outbound && !sameAddress(message.fromEmail, thread.participantEmail);

                    return (
                        <MessageCard key={message.id} $outbound={outbound}>
                            <MessageHeader>
                                <span className="from">
                                    {outbound ? 'Ty' : message.fromName ?? message.fromEmail}
                                    {showEmail && <small>{message.fromEmail}</small>}
                                </span>
                                <span className="meta">
                                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                                        {formatDateTime(message.sentAt)}
                                        {message.bodyHtml && (
                                            <ExpandIconButton
                                                onClick={() => onOpenFullMessage(message.id)}
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
                                            cacheKey={message.id}
                                            maxHeight={BUBBLE_MAX_HEIGHT}
                                            compactGraphical
                                            onOpenFull={() => onOpenFullMessage(message.id)}
                                        />
                                    )
                                    : <EmptyHint>(pusta wiadomość)</EmptyHint>}
                            </MessagePadding>
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
                        </MessageCard>
                    );
                })}
            </MessagesScroll>

            <ReplyComposer
                key={thread.id}
                threadId={thread.id}
                initialTo={thread.participantEmail}
                recipientLabel={thread.participantName ?? thread.participantEmail}
            />
        </Pane>
    );
}

export const ConversationView = memo(ConversationViewImpl);
