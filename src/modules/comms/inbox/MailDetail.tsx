// src/modules/comms/inbox/MailDetail.tsx
// Otwarty wątek w zakładkach „Poczta" i „Wysłane" - makiety „Poczta: odpowiedź,
// formatowanie schowane" i „Poczta: formatowanie wysunięte i zdjęcia z galerii".
//
// Mail czyta się jak list, nie jak komunikator: temat w nagłówku, treść w kolumnie
// czytelniczej, załączniki jako karty. W dłuższym wątku starsze wiadomości są
// zwinięte do jednej linijki - otwarta jest ostatnia i wszystko nieprzeczytane.
//
// Gdy nadawca ma auto w studiu, nad treścią stoi zielony pasek z wizytą - pytanie
// „kiedy mogę odebrać auto?" ma odpowiedź jedno kliknięcie dalej.
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import styled from 'styled-components';
import {
    Archive,
    ArchiveRestore,
    CalendarPlus,
    Car,
    FileInput,
    History,
    Mail,
    MoreHorizontal,
    ShieldAlert,
    StickyNote,
    Tag,
    UserRound,
} from 'lucide-react';
import { ActionMenu, MenuDivider, MenuItem, useActionMenu } from '@/common/components/ui';
import { usePermissions } from '@/core/permissions';
import { BookingFlowModal } from '@/modules/calendar';
import { commsApi } from '../api/commsApi';
import {
    useContactCard,
    useFormMailSources,
    useMarkMessageUnread,
    useMarkThreadRead,
    useSetThreadArchived,
    useThread,
} from '../hooks/useComms';
import type { CommMessage, CommThread } from '../types';
import { contactToBookingPrefill } from '../utils/bookingPrefill';
import { plainPreview, splitQuotedHistory } from '../utils/emailHtml';
import { ReplyComposer } from '../components/ReplyComposer';
import { MessageBody } from '../components/MessageBody';
import { MessageReaderOverlay } from '../components/MessageReaderOverlay';
import { MarkAsLeadModal } from '../components/MarkAsLeadModal';
import { MarkAsFormLeadModal } from '../components/MarkAsFormLeadModal';
import { ContactCardPopover } from '../components/ContactCardPopover';
import { ContactNotesPopover } from '../components/ContactNotesPopover';
import { ThreadHistoryPanel } from '../components/ThreadHistoryPanel';
import { AttachmentCards, Bubbles, ConversationHeader } from './Conversation';
import { downloadAttachmentFile, messageMoment, previewAttachmentFile } from './messageFormat';
import { IconBtn } from './primitives';
import { ix } from './tokens';

const Pane = styled.section`
    position: relative;
    flex: 1 1 520px;
    min-width: 0;
    min-height: 0;
    display: flex;
    flex-direction: column;
    background: #ffffff;
`;

const Reader = styled.div<{ $phone: boolean }>`
    flex: 1;
    min-height: 0;
    overflow-y: auto;
    overscroll-behavior: contain;
    display: flex;
    flex-direction: column;
    gap: 20px;
    padding: ${p => (p.$phone ? '20px 16px' : '28px')};
    color: ${ix.ink};
`;

/** Auto nadawcy w studiu - zielony pasek z makiety (odcień = „tak, domknięte"). */
const VisitBar = styled.a`
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 10px 16px;
    border-radius: 14px;
    background: ${ix.okTint};
    color: ${ix.ink};
    text-decoration: none;

    svg { flex: none; width: 18px; height: 18px; color: ${ix.ok}; }
    .text { flex: 1; min-width: 0; font-size: 14px; }
    .text strong { font-weight: 600; }
    .link { flex: none; font-size: 13px; font-weight: 500; color: ${ix.ok}; }
    &:hover .link { text-decoration: underline; }
`;

const Notice = styled.div`
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 10px 16px;
    border-radius: 14px;
    background: #fffbeb;
    color: #92400e;
    font-size: 14px;

    svg { flex: none; width: 18px; height: 18px; }
    .text { flex: 1; min-width: 0; }
    button {
        flex: none;
        border: none;
        background: none;
        padding: 0;
        font-family: inherit;
        font-size: 13px;
        font-weight: 600;
        color: #92400e;
        cursor: pointer;
        &:hover { text-decoration: underline; }
    }
`;

const Message = styled.article<{ $multi: boolean }>`
    display: flex;
    flex-direction: column;
    gap: 10px;
    ${p => p.$multi && `padding-bottom: 20px; border-bottom: 1px solid ${ix.lineSoft};`}
    &:last-of-type { border-bottom: none; padding-bottom: 0; }

    .meta { display: flex; align-items: baseline; gap: 10px; font-size: 13px; color: ${ix.muted}; }
    .meta strong { font-size: 14px; font-weight: 600; color: ${ix.ink}; }
    .meta .when { margin-left: auto; white-space: nowrap; }
`;

const Collapsed = styled.button`
    display: flex;
    align-items: baseline;
    gap: 10px;
    width: 100%;
    padding: 10px 0;
    border: none;
    border-bottom: 1px solid ${ix.lineSoft};
    background: none;
    font-family: inherit;
    text-align: left;
    cursor: pointer;

    strong { flex: none; font-size: 14px; font-weight: 600; color: ${ix.ink}; }
    .snippet { flex: 1; min-width: 0; font-size: 14px; color: ${ix.muted}; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .when { flex: none; font-size: 13px; color: ${ix.muted}; }
    &:hover .snippet { color: ${ix.text2}; }
`;

const IN_STUDIO = new Set(['IN_PROGRESS', 'READY_FOR_PICKUP']);

const sender = (message: CommMessage): string =>
    message.direction === 'OUTBOUND' ? 'Ty' : message.fromName ?? message.fromEmail;

interface MailDetailProps {
    threadId: string;
    /** Wątek z listy - nagłówek stoi od razu, zanim dojdzie treść. */
    listThread: CommThread | null;
    phone: boolean;
    onBack?: () => void;
    /** Wątek przeniesiony do schowka - lista wraca bez niego. */
    onArchived: () => void;
    /** „To zapytanie klienta" założyło sprawę - przejście do niej. */
    onOpenCase: (leadId: string) => void;
}

export function MailDetail({ threadId, listThread, phone, onBack, onArchived, onOpenCase }: MailDetailProps) {
    const navigate = useNavigate();
    const { can } = usePermissions();
    const menu = useActionMenu();
    const menuButtonRef = useRef<HTMLButtonElement>(null);
    const { data: detail } = useThread(threadId);
    const detailMatches = detail?.thread.id === threadId;
    const thread = detailMatches ? detail!.thread : listThread;
    const messages = useMemo(() => (detailMatches ? detail!.messages : []), [detailMatches, detail]);
    const { data: formSources } = useFormMailSources();
    const email = thread?.participantEmail ?? null;
    const { data: contactCard } = useContactCard(email, { enabled: Boolean(email) });

    const markRead = useMarkThreadRead();
    const markUnread = useMarkMessageUnread();
    const setArchived = useSetThreadArchived();

    const [expanded, setExpanded] = useState<Record<string, boolean>>({});
    const [fullMessageId, setFullMessageId] = useState<string | null>(null);
    const [modal, setModal] = useState<null | 'lead' | 'form' | 'booking' | 'history'>(null);
    const [contactAnchor, setContactAnchor] = useState<HTMLElement | null>(null);
    const [notesAnchor, setNotesAnchor] = useState<HTMLElement | null>(null);

    useEffect(() => {
        if (detailMatches && detail!.thread.unreadCount > 0) markRead.mutate(threadId);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [detailMatches, detail?.thread.unreadCount, threadId]);

    // Inny wątek - od nowa: zwinięcia należą do rozmowy, w której je zrobiono.
    useEffect(() => setExpanded({}), [threadId]);

    const download = useCallback(
        (attachmentId: string, fileName: string) => downloadAttachmentFile(commsApi.downloadAttachment, attachmentId, fileName),
        []
    );

    if (!thread) {
        return (
            <Pane>
                <Reader $phone={phone}><p style={{ margin: 'auto', color: ix.muted, fontSize: 14 }}>Wczytywanie wiadomości…</p></Reader>
            </Pane>
        );
    }

    const activeForm = formSources?.find((entry) => entry.active && entry.senderEmail === thread.participantEmail.trim().toLowerCase());
    const formRobot = thread.kind === 'FORM' ? thread.relayEmail?.trim().toLowerCase() ?? null : null;
    const latestInbound = [...messages].reverse().find((m) => m.direction === 'INBOUND' && (formRobot === null || m.fromEmail.trim().toLowerCase() === formRobot));
    const visit = contactCard?.recentVisits.find((item) => IN_STUDIO.has(item.status));
    const who = thread.participantName ?? thread.participantEmail;
    const moment = messageMoment(thread.lastMessageAt);
    // „Hurtownia Koch Chemie, dziś 10:58" - w nagłówku bez przecinka po dniu (makieta).
    const subtitle = `${who}, ${moment.replace(', ', ' ').replace(/^./, (first) => first.toLowerCase())}`;
    const multi = messages.length > 1;
    const conversational = Boolean(contactCard?.customer) || Boolean(thread.leadId);
    const isOpen = (message: CommMessage, index: number) =>
        expanded[message.id] ?? (index === messages.length - 1 || !message.isRead || messages.length <= 2);

    const archive = () => setArchived.mutate({ threadId: thread.id, archived: !thread.archived }, { onSuccess: onArchived });

    return (
        <Pane aria-labelledby="mail-title">
            <ConversationHeader title={thread.title ?? thread.subject ?? '(bez tematu)'} subtitle={subtitle} phone={phone} onBack={onBack} titleId="mail-title">
                <IconBtn aria-label={thread.archived ? 'Przywróć ze schowka' : 'Archiwizuj'} title={thread.archived ? 'Przywróć ze schowka' : 'Archiwizuj'} onClick={archive}>
                    {thread.archived ? <ArchiveRestore /> : <Archive />}
                </IconBtn>
                <IconBtn
                    ref={menuButtonRef}
                    aria-label="Więcej: nieprzeczytane, zapytanie klienta, rezerwacja"
                    aria-haspopup="menu"
                    aria-expanded={menu.isOpen()}
                    onClick={(event) => menu.toggle(event, null)}
                >
                    <MoreHorizontal />
                </IconBtn>
            </ConversationHeader>

            {/* Nadawca z kartoteki to rozmowa z klientem - czyta się jak komunikator
                (dymki, „Ty" po prawej). Reszta poczty (faktury, dostawcy) - jak list. */}
            {conversational ? (
                <Bubbles
                    messages={messages}
                    loading={!detailMatches}
                    phone={phone}
                    onDownload={download}
                    onOpenFull={setFullMessageId}
                    alignBottom={false}
                    before={<>
                {visit && (
                    <VisitBar href={`/visits/${visit.id}`} onClick={(event) => { event.preventDefault(); navigate(`/visits/${visit.id}`); }}>
                        <Car aria-hidden="true" />
                        <span className="text">
                            {visit.vehicleLabel} jest w studiu.{' '}
                            {visit.status === 'READY_FOR_PICKUP' && <strong>Gotowe do odbioru.</strong>}
                        </span>
                        <span className="link">Otwórz wizytę</span>
                    </VisitBar>
                )}
                {thread.screening && (
                    <Notice role="status">
                        <ShieldAlert aria-hidden="true" />
                        <span className="text">
                            {thread.screening === 'SPAM' ? 'Automat uznał to zgłoszenie za spam' : 'Automat uznał to zgłoszenie za test ze studia'}
                            {thread.screeningReason ? `: ${thread.screeningReason}` : ''}.
                        </span>
                        <button type="button" onClick={() => setModal('lead')}>To jednak lead</button>
                    </Notice>
                )}
                    </>}
                />
            ) : (
            <Reader $phone={phone}>
                {visit && (
                    <VisitBar href={`/visits/${visit.id}`} onClick={(event) => { event.preventDefault(); navigate(`/visits/${visit.id}`); }}>
                        <Car aria-hidden="true" />
                        <span className="text">
                            {visit.vehicleLabel} jest w studiu.{' '}
                            {visit.status === 'READY_FOR_PICKUP' && <strong>Gotowe do odbioru.</strong>}
                        </span>
                        <span className="link">Otwórz wizytę</span>
                    </VisitBar>
                )}
                {thread.screening && (
                    <Notice role="status">
                        <ShieldAlert aria-hidden="true" />
                        <span className="text">
                            {thread.screening === 'SPAM' ? 'Automat uznał to zgłoszenie za spam' : 'Automat uznał to zgłoszenie za test ze studia'}
                            {thread.screeningReason ? `: ${thread.screeningReason}` : ''}.
                        </span>
                        <button type="button" onClick={() => setModal('lead')}>To jednak lead</button>
                    </Notice>
                )}
                {!detailMatches && <p style={{ margin: 0, color: ix.muted, fontSize: 14 }}>Wczytywanie treści…</p>}
                {messages.map((message, index) =>
                    isOpen(message, index) ? (
                        <Message key={message.id} $multi={multi}>
                            {multi && (
                                <div className="meta">
                                    <strong>{sender(message)}</strong>
                                    <span className="when">{messageMoment(message.sentAt)}</span>
                                </div>
                            )}
                            <MessageBody
                                html={message.bodyHtml ?? ''}
                                cacheKey={message.id}
                                size="reader"
                                maxHeight={720}
                                onOpenFull={() => setFullMessageId(message.id)}
                            />
                            <AttachmentCards
                                attachments={message.attachments}
                                onDownload={download}
                                onPreview={(attachment) => { void previewAttachmentFile(commsApi.downloadAttachment, attachment); }}
                            />
                        </Message>
                    ) : (
                        <Collapsed key={message.id} type="button" onClick={() => setExpanded((current) => ({ ...current, [message.id]: true }))}>
                            <strong>{sender(message)}</strong>
                            <span className="snippet">{plainPreview(splitQuotedHistory(message.bodyHtml ?? '').mainHtml)}</span>
                            <span className="when">{messageMoment(message.sentAt)}</span>
                        </Collapsed>
                    )
                )}
            </Reader>
            )}

            {detailMatches && (
                <ReplyComposer
                    key={`${thread.id}:${detail!.replyAddress ?? ''}`}
                    threadId={thread.id}
                    threadLeadId={thread.leadId}
                    initialTo={detail!.replyAddress ?? ''}
                    recipientLabel={detail!.replyName ?? detail!.replyAddress ?? undefined}
                    recipientHint={thread.kind === 'FORM' ? 'zgłoszenie z formularza - odpowiedź trafi prosto do klienta' : undefined}
                    collapsible={phone}
                    divider
                    galleryContext={can('VISITS_VIEW') ? { customerId: contactCard?.customer?.id ?? null, label: visit ? `Wizyta ${visit.vehicleLabel}` : null } : undefined}
                />
            )}

            <ActionMenu anchor={menu.menu?.anchor ?? null} onClose={menu.close} label="Akcje wątku">
                {latestInbound && latestInbound.isRead && (
                    <MenuItem icon={<Mail />} onClick={() => { menu.close(); markUnread.mutate({ messageId: latestInbound.id, threadId: thread.id }); }}>
                        Oznacz jako nieprzeczytaną
                    </MenuItem>
                )}
                {thread.leadId ? (
                    <MenuItem icon={<Tag />} onClick={() => { menu.close(); onOpenCase(thread.leadId!); }}>Otwórz sprawę</MenuItem>
                ) : !activeForm && (
                    <MenuItem icon={<Tag />} onClick={() => { menu.close(); setModal('lead'); }}>To zapytanie klienta</MenuItem>
                )}
                <MenuItem icon={<FileInput />} onClick={() => { menu.close(); setModal('form'); }}>Zgłoszenie z formularza</MenuItem>
                <MenuItem icon={<CalendarPlus />} onClick={() => { menu.close(); setModal('booking'); }}>Umów wizytę</MenuItem>
                <MenuDivider />
                <MenuItem icon={<UserRound />} onClick={() => { menu.close(); setContactAnchor(menuButtonRef.current); }}>Profil nadawcy</MenuItem>
                <MenuItem icon={<StickyNote />} onClick={() => { menu.close(); setNotesAnchor(menuButtonRef.current); }}>Notatki o nadawcy</MenuItem>
                <MenuItem icon={<History />} onClick={() => { menu.close(); setModal('history'); }}>Wszystkie maile tej osoby</MenuItem>
            </ActionMenu>

            {fullMessageId && (() => {
                const message = messages.find((item) => item.id === fullMessageId);
                return message ? <MessageReaderOverlay message={message} onClose={() => setFullMessageId(null)} onDownloadAttachment={download} /> : null;
            })()}
            {modal === 'lead' && (
                <MarkAsLeadModal threadId={thread.id} onClose={() => setModal(null)} onCreated={(leadId) => { setModal(null); onOpenCase(leadId); }} />
            )}
            {modal === 'form' && (
                <MarkAsFormLeadModal senderEmail={formRobot ?? thread.participantEmail} messageId={latestInbound?.id ?? null} onClose={() => setModal(null)} />
            )}
            {modal === 'booking' && (
                <BookingFlowModal
                    subtitle={contactCard?.customer?.fullName ?? thread.participantName ?? thread.participantEmail}
                    prefill={contactToBookingPrefill({ email: thread.participantEmail, participantName: thread.participantName, contactCard })}
                    onClose={() => setModal(null)}
                    onBooked={() => setModal(null)}
                />
            )}
            {modal === 'history' && <ThreadHistoryPanel threadId={thread.id} email={thread.participantEmail} onClose={() => setModal(null)} />}
            {contactAnchor && (
                <ContactCardPopover email={thread.participantEmail} participantName={thread.participantName} anchor={contactAnchor} onClose={() => setContactAnchor(null)} />
            )}
            {notesAnchor && <ContactNotesPopover email={thread.participantEmail} anchor={notesAnchor} onClose={() => setNotesAnchor(null)} />}
        </Pane>
    );
}
