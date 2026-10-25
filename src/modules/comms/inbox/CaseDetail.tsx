// src/modules/comms/inbox/CaseDetail.tsx
// Otwarta sprawa w zakładce „Sprawy" - makiety „Komputer: klient odpisał na wycenę",
// „Komputer: nowe zapytanie" i „Telefon: rozmowa".
//
// Rozmowa na środku, sprawa obok. Krok następny jest jeden i to on jest jedynym
// wypełnionym elementem okna (CLAUDE.md §2):
//  - czeka na naszą odpowiedź → wypełnione „Odpisz" (po rozwinięciu „Wyślij"),
//  - klient odpisał na wysłaną wycenę → „Umów wizytę" w panelu sprawy, a „Odpisz"
//    zostaje w odcieniu,
//  - zapytanie z telefonu bez maila → „Zadzwoń".
// Po wysłaniu albo umówieniu otwiera się następna sprawa z kolejki.
//
// Panel sprawy niesie to, co dotyczy samej sprawy: ołówki przy wycenie i kliencie
// oraz status. Reszta (kontakt poza pocztą, notatki o kliencie, wcześniejsze rozmowy,
// usunięcie) jest w menu „⋯" - także na telefonie, gdzie wcześniej go nie było
// i kontaktu poza pocztą nie dało się w ogóle odnotować. Odpowiedź czeka zwinięta
// do wąskiego „Odpisz" i rozsuwa się dopiero na kliknięcie - rozwinięty edytor
// zabierał pół rozmowy.
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import styled from 'styled-components';
import {
    Archive,
    BellRing,
    CalendarCheck,
    CalendarPlus,
    ChevronRight,
    History,
    MoreHorizontal,
    Phone,
    PhoneCall,
    Send,
    StickyNote,
    Trash2,
    UserRound,
} from 'lucide-react';
import { ConfirmationModal, ChoiceModal } from '@/common/components/ConfirmationModal';
import { useToast } from '@/common/components/Toast';
import { ActionMenu, MenuDivider, MenuItem, useActionMenu } from '@/common/components/ui';
import { usePermissions, usePersonalDataActions } from '@/core/permissions';
import { BookingFlowModal } from '@/modules/calendar';
import { commsApi } from '../api/commsApi';
import {
    useContactCard,
    useMailAccounts,
    useMarkThreadRead,
    useSetThreadArchived,
    useThread,
} from '../hooks/useComms';
import {
    useAcceptAllSuggestions,
    useDeleteLead,
    useLead,
    useLeadAppointment,
    useLeadBooking,
    useLeadTimeline,
    useStagnationThresholds,
} from '../hooks/useLeads';
import type { ContactTarget, Lead, LeadStatus } from '../types';
import { leadToBookingPrefill } from '../utils/bookingPrefill';
import { leadEmail, leadPhoneNumber } from '../utils/leadPrimaryAction';
import { describeLeadUrgency } from '../utils/leadUrgency';
import { boardColumnOf, canRemindByMail } from '../utils/leadBoard';
import { LeadReminderDialog } from '../components/LeadReminderDialog';
import { ReplyComposer } from '../components/ReplyComposer';
import type { GalleryPickerContext } from '../components/GalleryPhotoPicker';
import { LeadQuoteEditor } from '../components/LeadQuoteEditor';
import { useLeadStatusChange } from '../hooks/useLeadStatusChange';
import { LeadTimeline } from '../components/LeadTimeline';
import { InstagramBubbles, InstagramReplyBox } from '../components/InstagramConversation';
import { useInstagramConversation, useMarkInstagramRead } from '../hooks/useInstagramDm';
import { MessageReaderOverlay } from '../components/MessageReaderOverlay';
import { RecordCallbackDialog } from '../components/RecordCallbackDialog';
import { ContactNotesPopover } from '../components/ContactNotesPopover';
import { ContactCardPopover } from '../components/ContactCardPopover';
import { ThreadHistoryPanel } from '../components/ThreadHistoryPanel';
import { caseNextStep, caseStatusChip, caseSubtitle, caseTitle, chipRepeatsStatus, formatAmount, quoteTotal, type CaseStep } from './caseModel';
import { CaseRail, RailSheet, type CaseActions } from './CaseRail';
import { ClientEditor } from './ClientEditor';
import { BookingNote } from './BookingNote';
import { confirmationDraft } from './bookingNoteModel';
import { MailThread, ConversationHeader, ConversationScroll, type ConversationEvent } from './Conversation';
import { downloadAttachmentFile } from './messageFormat';
import { useAttachmentPreview } from '../components/useAttachmentPreview';
import { FooterPrimary, IconBtn, StatusChip } from './primitives';
import { ix } from './tokens';
import { problemOf } from '@/core/problem';

const Pane = styled.div`
    position: relative;
    flex: 1;
    min-width: 0;
    min-height: 0;
    display: flex;
    background: #ffffff;
`;

const Column = styled.section`
    position: relative;
    flex: 999 1 460px;
    min-width: 0;
    min-height: 0;
    display: flex;
    flex-direction: column;
`;

/** Kwota w nagłówku na wąskim ekranie - otwiera arkusz wyceny (makieta telefonu). */
const AmountChip = styled.button`
    display: inline-flex;
    align-items: center;
    gap: 4px;
    flex: none;
    height: 44px;
    padding: 0 12px;
    border: none;
    border-radius: 12px;
    background: ${ix.accentTint};
    color: ${ix.accentInk};
    font-family: inherit;
    font-size: 15px;
    font-weight: 700;
    font-variant-numeric: tabular-nums;
    cursor: pointer;

    svg { width: 16px; height: 16px; }
    &:focus-visible { outline: 2px solid ${ix.accent}; outline-offset: 2px; }
`;

const Request = styled.div`
    align-self: flex-start;
    max-width: 80%;

    .label { margin: 0 0 6px; font-size: 12px; color: ${ix.muted}; }
    .body {
        padding: 12px 16px;
        border: 1px solid ${ix.line};
        border-radius: 16px;
        font-size: 15px;
        line-height: 22px;
        color: ${ix.ink};
        white-space: pre-wrap;
        overflow-wrap: anywhere;
    }
`;

const InlineStep = styled.div`
    flex-shrink: 0;
    padding: 16px 28px 0;
`;

const Hint = styled.div`
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 10px;
    margin: 0;
    font-size: 14px;
    line-height: 1.5;
    color: ${ix.muted};
`;

/** Akcja przy zdaniu, które ją opisuje - odcień, bez wypełnienia (krok następny stoi w panelu). */
const InlineAction = styled.button`
    display: inline-flex;
    align-items: center;
    gap: 6px;
    height: 36px;
    padding: 0 14px;
    border: 1px solid ${ix.line};
    border-radius: 999px;
    background: #ffffff;
    color: ${ix.accentInk};
    font-family: inherit;
    font-size: 14px;
    font-weight: 600;
    cursor: pointer;

    svg { width: 16px; height: 16px; }
    &:hover { background: ${ix.accentTint}; }
    &:focus-visible { outline: 2px solid ${ix.accent}; outline-offset: 2px; }
    @media (hover: none) and (pointer: coarse) { height: 44px; }
`;

const Muted = styled.p`
    margin: auto;
    font-size: 14px;
    color: ${ix.muted};
`;

const stepIcon = (step: CaseStep) =>
    step.kind === 'CALL' ? <Phone />
        : step.kind === 'APPOINTMENT' ? <CalendarCheck />
        : step.kind === 'BOOK' ? <CalendarPlus />
        : step.kind === 'REMIND' ? <BellRing />
        : <Send />;

/**
 * Sprawa w „Do przypomnienia" (3 dni ciszy klienta, bez przypomnienia - leadBoard.ts):
 * krokiem następnym jest przypomnienie, nie umówienie wizyty. Ta sama reguła co na tablicy,
 * więc podgląd sprawy z listy i z tablicy proponuje to samo. „Umów wizytę" zostaje w menu „⋯".
 */
const REMIND_STEP: CaseStep = { kind: 'REMIND', title: 'Przypomnij się', hint: 'Asystent przygotuje treść' };

interface CaseDetailProps {
    leadId: string;
    phone: boolean;
    /** Panel sprawy obok rozmowy; bez niego - kwota w nagłówku i arkusz. */
    railBeside: boolean;
    onBack?: () => void;
    /** Po wysłaniu albo umówieniu - następna sprawa z kolejki (gdy kolejka jest obok). */
    onAdvance?: () => void;
    /** Po usunięciu sprawy. */
    onClosed: () => void;
    /** Ostatni przycisk nagłówka - „Zamknij" okna sprawy otwartego z tablicy. */
    headerAction?: React.ReactNode;
}

export function CaseDetail({ leadId, phone, railBeside, onBack, onAdvance, onClosed, headerAction }: CaseDetailProps) {
    const navigate = useNavigate();
    const { showError } = useToast();
    const { can } = usePermissions();
    // „Umów wizytę” to nowa rezerwacja - z danymi osobowymi (personalDataActions).
    const { canCreateAppointment: canBook } = usePersonalDataActions();
    const menu = useActionMenu();
    const menuButtonRef = useRef<HTMLButtonElement>(null);

    const { data: lead, isError } = useLead(leadId);
    const threadId = lead?.threadId ?? null;
    const { data: detail, isLoading: threadLoading } = useThread(threadId);
    const detailMatches = Boolean(detail && detail.thread.id === threadId);
    const thread = detailMatches ? detail!.thread : null;
    const thresholds = useStagnationThresholds();
    const contactEmail = leadEmail(lead);
    const cardEmail = contactEmail ?? thread?.participantEmail ?? null;
    // Serwer czyta adres sprawy sam (adres zapytania, a bez niego adres rozmowy) - w URL-u idzie tylko id.
    const contact = useMemo<ContactTarget | null>(
        () => (cardEmail ? { email: cardEmail, ref: { leadId } } : null),
        [cardEmail, leadId]
    );
    // Sprawa z wiadomości na Instagramie: rozmowa i odpowiedź idą przez Meta, nie przez pocztę.
    const instagram = lead?.source === 'INSTAGRAM';
    const { data: igConversation, isLoading: igLoading } = useInstagramConversation(leadId, instagram);
    const markInstagramRead = useMarkInstagramRead(leadId);
    const { data: contactCard } = useContactCard(contact, { enabled: Boolean(cardEmail) });
    const { data: appointment } = useLeadAppointment(lead?.appointmentId ?? null);
    const { data: leadBooking } = useLeadBooking(leadId, Boolean(lead?.appointmentId));
    // Szkic potwierdzenia z paska rezerwacji - nowe `id` wpycha treść do kompozytora.
    const [confirmationPrefill, setConfirmationPrefill] = useState<{ id: number; text: string } | null>(null);

    const [sheetOpen, setSheetOpen] = useState(false);
    const [fullMessageId, setFullMessageId] = useState<string | null>(null);
    const [quoteOpen, setQuoteOpen] = useState(false);
    const [booking, setBooking] = useState(false);
    const [callbackOpen, setCallbackOpen] = useState(false);
    const [historyOpen, setHistoryOpen] = useState(false);
    const [notesAnchor, setNotesAnchor] = useState<HTMLElement | null>(null);
    const [contactAnchor, setContactAnchor] = useState<HTMLElement | null>(null);
    const [deleteStep, setDeleteStep] = useState<null | 'confirm' | 'appointment'>(null);
    const [clientAnchor, setClientAnchor] = useState<HTMLElement | null>(null);
    const amountRef = useRef<HTMLButtonElement>(null);

    const markRead = useMarkThreadRead();
    const setArchived = useSetThreadArchived();
    const acceptAllSuggestions = useAcceptAllSuggestions(leadId);
    const deleteLead = useDeleteLead();
    const status = useLeadStatusChange();

    // Otwarcie sprawy czyta jej rozmowę - tak jak otwarcie wątku w poczcie.
    useEffect(() => {
        if (thread && thread.unreadCount > 0) markRead.mutate(thread.id);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [thread?.id, thread?.unreadCount]);

    const igThread = igConversation?.thread ?? null;
    useEffect(() => {
        if (igThread && igThread.unreadCount > 0) markInstagramRead.mutate(igThread.id);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [igThread?.id, igThread?.unreadCount]);

    const download = useCallback(
        (attachmentId: string, fileName: string) => downloadAttachmentFile(commsApi.downloadAttachment, attachmentId, fileName),
        []
    );
    const attachmentPreview = useAttachmentPreview(commsApi.downloadAttachment);

    const urgency = useMemo(() => (lead ? describeLeadUrgency(lead, thresholds) : null), [lead, thresholds]);
    const remindable = Boolean(lead && urgency && canRemindByMail(lead) && boardColumnOf(lead, urgency) === 'NEEDS_REMINDER');
    const step: CaseStep | null = lead && urgency ? (remindable ? REMIND_STEP : caseNextStep(lead, urgency)) : null;
    const [reminding, setReminding] = useState(false);

    const galleryContext: GalleryPickerContext | undefined = can('VISITS_VIEW')
        ? {
            customerId: lead?.customerId ?? contactCard?.customer?.id ?? null,
            vehicleBrand: lead?.vehicleBrand ?? null,
            vehicleModel: lead?.vehicleModel ?? null,
        }
        : undefined;

    /**
     * Rezerwacja przyjmuje sugestie AI jak zaakceptowane - ta sama reguła co w oknie
     * leada: sugestia bez kwoty blokuje, zamiast wejść do kalendarza bez ceny.
     */
    const openBooking = () => {
        if (!canBook) return;
        setSheetOpen(false);
        if (!lead || !lead.services.some((item) => item.status === 'SUGGESTED')) {
            setBooking(true);
            return;
        }
        acceptAllSuggestions.mutate(undefined, {
            onSuccess: () => setBooking(true),
            onError: (err: unknown) => {
                const names = problemOf(err)?.serviceNames;
                showError(
                    'Uzupełnij kwoty sugestii',
                    Array.isArray(names) && names.length
                        ? `Podaj kwotę dla: ${names.join(', ')}`
                        : 'Któraś sugestia czeka na kwotę - podaj ją w wycenie leada.'
                );
            },
        });
    };

    const openAppointment = () =>
        navigate('/calendar', {
            state: {
                highlightEventId: lead?.appointmentId,
                highlightDate: appointment?.schedule?.startDateTime ?? '',
                openEventPopover: true,
            },
        });

    const performDelete = (deleteAppointment: boolean) => {
        setDeleteStep(null);
        // Najpierw z widoku, potem żądanie: otwarty panel odpytywałby usuniętego leada.
        onClosed();
        deleteLead.mutate({ leadId, deleteAppointment });
    };

    if (isError) {
        return (
            <Pane>
                <Column>
                    <ConversationHeader title="Lead" phone={phone} onBack={onBack} />
                    <ConversationScroll $phone={phone}><Muted>Tego leada już nie ma.</Muted></ConversationScroll>
                </Column>
            </Pane>
        );
    }
    if (!lead || !urgency || !step) {
        return (
            <Pane>
                <Column>
                    <ConversationScroll $phone={phone}><Muted>Wczytywanie leada…</Muted></ConversationScroll>
                </Column>
            </Pane>
        );
    }

    const chip = caseStatusChip(lead);
    const phoneNumber = leadPhoneNumber(lead) ?? contactCard?.customer?.phone ?? null;
    const replyStep = step.kind === 'REPLY';

    const cta =
        step.kind === 'NONE' || replyStep || (step.kind === 'BOOK' && !canBook) ? null : (
            <FooterPrimary
                block
                icon={stepIcon(step)}
                title={step.title}
                hint={step.hint}
                href={step.href}
                disabled={acceptAllSuggestions.isPending}
                onClick={step.kind === 'BOOK' ? openBooking : step.kind === 'APPOINTMENT' ? openAppointment : step.kind === 'REMIND' ? () => { setSheetOpen(false); setReminding(true); } : undefined}
            />
        );

    const actions: CaseActions = {
        onEditQuote: () => { setSheetOpen(false); setQuoteOpen(true); },
        onEditClient: (anchor) => {
            // Z arkusza ołówek znika razem z nim - wizytówka przypina się wtedy do kwoty w nagłówku.
            setSheetOpen(false);
            setClientAnchor(sheetOpen ? amountRef.current ?? anchor : anchor);
        },
        onChangeStatus: (next: LeadStatus) => status.requestStatus(lead.id, next),
        statusPending: status.isPending,
    };
    const total = quoteTotal(lead);

    const header = (
        <ConversationHeader title={caseTitle(lead)} subtitle={phone ? lead.customerName ?? undefined : caseSubtitle(lead)} phone={phone} onBack={onBack} titleId="case-title">
            {!railBeside ? (
                <AmountChip ref={amountRef} type="button" onClick={() => setSheetOpen(true)} aria-label={total > 0 ? `Wycena: ${formatAmount(total)}` : 'Wycena i klient'}>
                    {total > 0 ? formatAmount(total) : 'Wycena'}
                    <ChevronRight aria-hidden="true" />
                </AmountChip>
            ) : !chipRepeatsStatus(lead) && (
                <StatusChip $tone={chip.tone}>{chip.label}</StatusChip>
            )}
            <IconBtn
                ref={menuButtonRef}
                aria-label="Więcej: kontakt poza pocztą, notatki o kliencie, usunięcie leada"
                aria-haspopup="menu"
                aria-expanded={menu.isOpen()}
                onClick={(event) => menu.toggle(event, null)}
            >
                <MoreHorizontal />
            </IconBtn>
            {headerAction}
        </ConversationHeader>
    );

    // Rezerwacja w rozmowie, w chwili jej założenia. Szkic potwierdzenia tylko tam, gdzie
    // jest kompozytor maila - na Instagramie odpowiedź idzie innym polem.
    const bookingEvents: ConversationEvent[] = lead.appointmentId && leadBooking ? [{
        key: `booking-${leadBooking.appointmentId}`,
        at: leadBooking.bookedAt,
        node: (
            <BookingNote
                booking={leadBooking}
                onPrepareConfirmation={thread
                    ? () => setConfirmationPrefill({ id: Date.now(), text: confirmationDraft(leadBooking) })
                    : undefined}
            />
        ),
    }] : [];

    const composer = instagram ? (
        igConversation ? (
            <InstagramReplyBox
                key={igConversation.thread.id}
                leadId={lead.id}
                conversation={igConversation}
                emphasis={replyStep ? 'primary' : 'tint'}
                phone={phone}
                barExtra={phone ? cta : undefined}
                onSent={() => onAdvance?.()}
            />
        ) : phone && cta ? (
            <div style={{ padding: '12px 16px calc(16px + env(safe-area-inset-bottom, 0px))', borderTop: `1px solid ${ix.lineSoft}` }}>{cta}</div>
        ) : null
    ) : threadId ? (
        thread ? (
            <ReplyComposer
                key={`${thread.id}:${detail?.replyAddress ?? ''}`}
                threadId={thread.id}
                threadLeadId={thread.leadId}
                initialTo={detail?.replyAddress ?? ''}
                recipientLabel={detail?.replyName ?? detail?.replyAddress ?? undefined}
                recipientHint={thread.kind === 'FORM' ? 'zgłoszenie z formularza - odpowiedź trafi prosto do klienta' : undefined}
                collapsible={phone}
                barExtra={phone ? cta : undefined}
                layout="collapsed"
                sendAppearance={replyStep ? 'pill' : 'tint'}
                galleryContext={galleryContext}
                prefill={confirmationPrefill}
                onSent={() => onAdvance?.()}
            />
        ) : null
    ) : contactEmail ? (
        <FirstMessage
            lead={lead}
            to={contactEmail}
            phone={phone}
            step={step}
            galleryContext={galleryContext}
            onSent={() => onAdvance?.()}
            barExtra={phone ? cta : undefined}
        />
    ) : phone && cta ? (
        <div style={{ padding: '12px 16px calc(16px + env(safe-area-inset-bottom, 0px))', borderTop: `1px solid ${ix.lineSoft}` }}>{cta}</div>
    ) : null;

    return (
        <Pane>
            <Column aria-labelledby="case-title">
                {header}
                {instagram && (igLoading || igConversation) ? (
                    <InstagramBubbles conversation={igConversation} loading={igLoading} phone={phone} />
                ) : threadId ? (
                    <MailThread
                        messages={detailMatches ? detail!.messages : []}
                        loading={threadLoading || !detailMatches}
                        phone={phone}
                        onDownload={download}
                        onPreview={attachmentPreview.open}
                        onOpenFull={setFullMessageId}
                        events={bookingEvents}
                        // Rozmowa czyta się od góry, jak w Poczcie. Dosunięta do dołu krótka
                        // rozmowa zostawiała nad jedyną wiadomością pół ekranu pustki (na
                        // telefonie ponad 1000 px). Długi wątek i tak otwiera się na końcu.
                        alignBottom={false}
                    />
                ) : (
                    <NoThreadBody lead={lead} phone={phone} onRecordContact={() => setCallbackOpen(true)} />
                )}
                {/* Bez panelu obok krok następny stoi nad odpowiedzią - jak na telefonie.
                    Jedyne wypełnienie w oknie nie może zniknąć razem z panelem. */}
                {!railBeside && !phone && cta && <InlineStep>{cta}</InlineStep>}
                {composer}
                {fullMessageId && detailMatches && (() => {
                    const message = detail!.messages.find((item) => item.id === fullMessageId);
                    return message ? (
                        <MessageReaderOverlay message={message} onClose={() => setFullMessageId(null)} onDownloadAttachment={download} onPreviewAttachment={attachmentPreview.open} />
                    ) : null;
                })()}
                {attachmentPreview.preview}
            </Column>

            {railBeside && <CaseRail lead={lead} contactCard={contactCard} phone={phoneNumber} cta={cta} {...actions} />}

            {sheetOpen && (
                <RailSheet
                    lead={lead}
                    contactCard={contactCard}
                    phone={phoneNumber}
                    {...actions}
                    side={!phone}
                    onClose={() => setSheetOpen(false)}
                    cta={cta}
                />
            )}

            <ActionMenu anchor={menu.menu?.anchor ?? null} onClose={menu.close} label="Akcje leada">
                {canBook && step.kind !== 'BOOK' && !lead.appointmentId && (
                    <MenuItem icon={<CalendarPlus />} onClick={() => { menu.close(); openBooking(); }}>Umów wizytę</MenuItem>
                )}
                <MenuItem icon={<PhoneCall />} onClick={() => { menu.close(); setCallbackOpen(true); }}>Kontakt poza pocztą</MenuItem>
                {cardEmail && (
                    <>
                        <MenuDivider />
                        <MenuItem icon={<UserRound />} onClick={() => { menu.close(); setContactAnchor(menuButtonRef.current); }}>Karta klienta</MenuItem>
                        <MenuItem icon={<StickyNote />} onClick={() => { menu.close(); setNotesAnchor(menuButtonRef.current); }}>Notatki o kliencie</MenuItem>
                        {thread && (
                            <MenuItem icon={<History />} onClick={() => { menu.close(); setHistoryOpen(true); }}>Wszystkie maile tej osoby</MenuItem>
                        )}
                    </>
                )}
                {thread && (
                    <MenuItem icon={<Archive />} onClick={() => { menu.close(); setArchived.mutate({ threadId: thread.id, archived: !thread.archived }); }}>
                        {thread.archived ? 'Przywróć rozmowę z archiwum' : 'Archiwizuj rozmowę'}
                    </MenuItem>
                )}
                <MenuDivider />
                <MenuItem danger icon={<Trash2 />} onClick={() => { menu.close(); setSheetOpen(false); setDeleteStep('confirm'); }}>
                    Usuń lead
                </MenuItem>
            </ActionMenu>

            {contactAnchor && contact && (
                <ContactCardPopover
                    contact={contact}
                    participantName={lead.customerName}
                    anchor={contactAnchor}
                    onClose={() => setContactAnchor(null)}
                />
            )}
            {notesAnchor && contact && (
                <ContactNotesPopover contact={contact} anchor={notesAnchor} title="Notatki o kliencie" onClose={() => setNotesAnchor(null)} />
            )}
            {historyOpen && thread && (
                <ThreadHistoryPanel threadId={thread.id} email={thread.participantEmail} onClose={() => setHistoryOpen(false)} />
            )}
            {/* Wycena to jedna czynność - samo okno wyboru usług z sugestiami, bez drugiego
                podglądu leada, który skrzynka i tak pokazuje obok. */}
            {quoteOpen && (
                <LeadQuoteEditor
                    key={lead.id}
                    lead={lead}
                    subtitle={[caseTitle(lead), lead.customerName].filter(Boolean).join(', ')}
                    onClose={() => setQuoteOpen(false)}
                />
            )}
            {booking && canBook && (
                <BookingFlowModal
                    leadId={lead.appointmentId ? undefined : lead.id}
                    subtitle={lead.customerName ?? lead.contactIdentifier}
                    prefill={leadToBookingPrefill(lead, contactCard)}
                    onClose={() => setBooking(false)}
                    onBooked={() => {
                        setBooking(false);
                        onAdvance?.();
                    }}
                />
            )}
            {clientAnchor && (
                <ClientEditor
                    lead={lead}
                    customerId={lead.customerId ?? contactCard?.customer?.id ?? null}
                    contact={contact}
                    anchor={clientAnchor}
                    onClose={() => setClientAnchor(null)}
                />
            )}
            {status.lostDialog}
            {reminding && <LeadReminderDialog leads={[lead]} onClose={() => setReminding(false)} />}
            {callbackOpen && <RecordCallbackDialog leadId={lead.id} onClose={() => setCallbackOpen(false)} />}
            <ConfirmationModal
                isOpen={deleteStep === 'confirm'}
                title="Usunąć ten lead?"
                message="Tego nie da się cofnąć. Maile zostaną w skrzynce."
                variant="danger"
                confirmText="Usuń"
                onConfirm={() => (lead.appointmentId ? setDeleteStep('appointment') : performDelete(false))}
                onCancel={() => setDeleteStep(null)}
            />
            <ChoiceModal
                isOpen={deleteStep === 'appointment'}
                title="Co zrobić z rezerwacją?"
                message="Ten lead ma rezerwację w kalendarzu. Możesz usunąć ją razem z leadem albo zostawić jako samodzielny termin."
                variant="danger"
                primaryText="Usuń też rezerwację"
                onPrimary={() => performDelete(true)}
                secondaryText="Zostaw termin"
                onSecondary={() => performDelete(false)}
                onDismiss={() => setDeleteStep(null)}
            />
        </Pane>
    );
}

/** Sprawa bez wątku: o co pytał klient i przebieg sprawy, zamiast pustej rozmowy. */
function NoThreadBody({ lead, phone, onRecordContact }: { lead: Lead; phone: boolean; onRecordContact: () => void }) {
    const { data: timeline } = useLeadTimeline(lead.id);
    return (
        <ConversationScroll $phone={phone}>
            <Request>
                <p className="label">Zgłoszenie</p>
                <div className="body">{lead.initialMessage ?? 'Klient nie zostawił treści zapytania.'}</div>
            </Request>
            {(timeline?.length ?? 0) > 0 && <LeadTimeline entries={timeline ?? []} />}
            {/* Przycisk stoi przy zdaniu, które o nim mówi - dawniej tekst odsyłał do menu „⋯". */}
            {lead.source === 'INSTAGRAM' ? (
                <Hint>
                    Rozmowy z Instagrama nie ma już w CRM. Odpisz w aplikacji Instagram i zapisz tu, że rozmowa się odbyła.
                    <InlineAction type="button" onClick={onRecordContact}><PhoneCall aria-hidden="true" /> Odnotuj kontakt</InlineAction>
                </Hint>
            ) : !leadEmail(lead) && (
                <Hint>
                    Ten lead nie ma adresu e-mail. Zadzwoń do klienta i zapisz tu, jak poszła rozmowa.
                    <InlineAction type="button" onClick={onRecordContact}><PhoneCall aria-hidden="true" /> Odnotuj rozmowę</InlineAction>
                </Hint>
            )}
        </ConversationScroll>
    );
}

interface FirstMessageProps {
    lead: Lead;
    to: string;
    phone: boolean;
    step: CaseStep;
    galleryContext?: GalleryPickerContext;
    onSent: () => void;
    barExtra?: React.ReactNode;
}

/**
 * Pierwsza wiadomość do leada bez wątku (formularz przez webhook, wpis ręczny).
 * Po wysłaniu serwer przypina nowy wątek do sprawy i w tym miejscu staje zwykła rozmowa.
 */
function FirstMessage({ lead, to, phone, step, galleryContext, onSent, barExtra }: FirstMessageProps) {
    const { data: accounts } = useMailAccounts();
    const account = accounts?.find((item) => item.status !== 'DISABLED');
    if (!account) return null;
    return (
        <ReplyComposer
            accountId={account.id}
            initialTo={to}
            leadId={lead.id}
            requireSubject
            collapsible={phone}
            barExtra={barExtra}
            layout="collapsed"
            sendAppearance={step.kind === 'REPLY' ? 'pill' : 'tint'}
            galleryContext={galleryContext}
            onSent={onSent}
        />
    );
}
