// src/modules/comms/inbox/CaseDetail.tsx
// Otwarta sprawa w zakładce „Sprawy" - makiety „Komputer: klient odpisał na wycenę",
// „Komputer: nowe zapytanie" i „Telefon: rozmowa".
//
// Rozmowa na środku, sprawa obok. Krok następny jest jeden i to on jest jedynym
// wypełnionym elementem okna (CLAUDE.md §2):
//  - nowe zapytanie → „Wyślij wycenę" pod odpowiedzią (kompozytor rozwinięty),
//  - klient odpisał na wysłaną wycenę → „Umów wizytę" w panelu sprawy, a odpowiedź
//    zwija się do rzędu „Odpowiedz…" z „Wyślij" w odcieniu,
//  - zapytanie z telefonu bez maila → „Zadzwoń".
// Po wysłaniu albo umówieniu otwiera się następna sprawa z kolejki.
//
// Reszta (pełne okno leada z sugestiami i notatkami, kontakt poza pocztą, zamknięcie,
// usunięcie, notatki o kliencie, wcześniejsze rozmowy) jest w menu „⋯" - nie
// zniknęła, przestała zasłaniać rozmowę.
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import styled from 'styled-components';
import {
    Archive,
    CalendarCheck,
    CalendarPlus,
    ChevronRight,
    FileText,
    History,
    Info,
    MoreHorizontal,
    Phone,
    PhoneCall,
    Send,
    StickyNote,
    Trash2,
    UserRound,
    XCircle,
} from 'lucide-react';
import { ConfirmationModal, ChoiceModal } from '@/common/components/ConfirmationModal';
import { useToast } from '@/common/components/Toast';
import { ActionMenu, MenuDivider, MenuItem, useActionMenu } from '@/common/components/ui';
import { usePermissions } from '@/core/permissions';
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
    useLeadTimeline,
    useStagnationThresholds,
} from '../hooks/useLeads';
import type { Lead } from '../types';
import { leadToBookingPrefill } from '../utils/bookingPrefill';
import { leadPhoneNumber } from '../utils/leadPrimaryAction';
import { describeLeadUrgency } from '../utils/leadUrgency';
import { ReplyComposer } from '../components/ReplyComposer';
import type { GalleryPickerContext } from '../components/GalleryPhotoPicker';
import { LeadDetailModal } from '../components/LeadDetailModal';
import { LeadLostReasonDialog } from '../components/LeadLostReasonDialog';
import { LeadTimeline } from '../components/LeadTimeline';
import { MessageReaderOverlay } from '../components/MessageReaderOverlay';
import { RecordCallbackDialog } from '../components/RecordCallbackDialog';
import { ContactNotesPopover } from '../components/ContactNotesPopover';
import { ContactCardPopover } from '../components/ContactCardPopover';
import { ThreadHistoryPanel } from '../components/ThreadHistoryPanel';
import { caseNextStep, caseStatusChip, caseSubtitle, caseTitle, formatAmount, type CaseStep } from './caseModel';
import { CaseRail, RailSheet } from './CaseRail';
import { Bubbles, ConversationHeader, ConversationScroll } from './Conversation';
import { downloadAttachmentFile } from './messageFormat';
import { FooterPrimary, IconBtn, StatusChip } from './primitives';
import { ix } from './tokens';

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

const Hint = styled.p`
    margin: 0;
    font-size: 14px;
    line-height: 1.5;
    color: ${ix.muted};
`;

const Muted = styled.p`
    margin: auto;
    font-size: 14px;
    color: ${ix.muted};
`;

const stepIcon = (step: CaseStep) =>
    step.kind === 'CALL' ? <Phone /> : step.kind === 'APPOINTMENT' ? <CalendarCheck /> : step.kind === 'BOOK' ? <CalendarPlus /> : <Send />;

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
}

export function CaseDetail({ leadId, phone, railBeside, onBack, onAdvance, onClosed }: CaseDetailProps) {
    const navigate = useNavigate();
    const { showError } = useToast();
    const { can } = usePermissions();
    const menu = useActionMenu();
    const menuButtonRef = useRef<HTMLButtonElement>(null);

    const { data: lead, isError } = useLead(leadId);
    const threadId = lead?.threadId ?? null;
    const { data: detail, isLoading: threadLoading } = useThread(threadId);
    const detailMatches = Boolean(detail && detail.thread.id === threadId);
    const thread = detailMatches ? detail!.thread : null;
    const thresholds = useStagnationThresholds();
    const contactEmail = lead?.contactIdentifier?.includes('@') ? lead.contactIdentifier.trim() : null;
    const cardEmail = contactEmail ?? thread?.participantEmail ?? null;
    const { data: contactCard } = useContactCard(cardEmail, { enabled: Boolean(cardEmail) });
    const { data: appointment } = useLeadAppointment(lead?.appointmentId ?? null);

    const [sheetOpen, setSheetOpen] = useState(false);
    const [fullMessageId, setFullMessageId] = useState<string | null>(null);
    const [detailsOpen, setDetailsOpen] = useState<null | 'details' | 'services'>(null);
    const [booking, setBooking] = useState(false);
    const [lostOpen, setLostOpen] = useState(false);
    const [callbackOpen, setCallbackOpen] = useState(false);
    const [historyOpen, setHistoryOpen] = useState(false);
    const [notesAnchor, setNotesAnchor] = useState<HTMLElement | null>(null);
    const [contactAnchor, setContactAnchor] = useState<HTMLElement | null>(null);
    const [deleteStep, setDeleteStep] = useState<null | 'confirm' | 'appointment'>(null);

    const markRead = useMarkThreadRead();
    const setArchived = useSetThreadArchived();
    const acceptAllSuggestions = useAcceptAllSuggestions(leadId);
    const deleteLead = useDeleteLead();

    // Otwarcie sprawy czyta jej rozmowę - tak jak otwarcie wątku w poczcie.
    useEffect(() => {
        if (thread && thread.unreadCount > 0) markRead.mutate(thread.id);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [thread?.id, thread?.unreadCount]);

    const download = useCallback(
        (attachmentId: string, fileName: string) => downloadAttachmentFile(commsApi.downloadAttachment, attachmentId, fileName),
        []
    );

    const urgency = useMemo(() => (lead ? describeLeadUrgency(lead, thresholds) : null), [lead, thresholds]);
    // Na telefonie po kroku wraca się do listy, więc podpis mówi o kliencie (makieta telefonu).
    const step: CaseStep | null = lead && urgency ? caseNextStep(lead, urgency, Boolean(onAdvance) && !phone) : null;

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
        setSheetOpen(false);
        if (!lead || !lead.services.some((item) => item.status === 'SUGGESTED')) {
            setBooking(true);
            return;
        }
        acceptAllSuggestions.mutate(undefined, {
            onSuccess: () => setBooking(true),
            onError: (err: unknown) => {
                const names = (err as { response?: { data?: { serviceNames?: string[] } } })?.response?.data?.serviceNames;
                showError(
                    'Uzupełnij kwoty sugestii',
                    names?.length ? `Podaj kwotę dla: ${names.join(', ')}` : 'Któraś sugestia czeka na kwotę - podaj ją w szczegółach sprawy.'
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
                    <ConversationHeader title="Sprawa" phone={phone} onBack={onBack} />
                    <ConversationScroll $phone={phone}><Muted>Tej sprawy już nie ma.</Muted></ConversationScroll>
                </Column>
            </Pane>
        );
    }
    if (!lead || !urgency || !step) {
        return (
            <Pane>
                <Column>
                    <ConversationScroll $phone={phone}><Muted>Wczytywanie sprawy…</Muted></ConversationScroll>
                </Column>
            </Pane>
        );
    }

    const chip = caseStatusChip(lead);
    const phoneNumber = leadPhoneNumber(lead) ?? contactCard?.customer?.phone ?? null;
    const replyStep = step.kind === 'REPLY';

    const cta =
        step.kind === 'NONE' || replyStep ? null : (
            <FooterPrimary
                block
                icon={stepIcon(step)}
                title={step.title}
                hint={step.hint}
                href={step.href}
                disabled={acceptAllSuggestions.isPending}
                onClick={step.kind === 'BOOK' ? openBooking : step.kind === 'APPOINTMENT' ? openAppointment : undefined}
            />
        );

    const railProps = {
        lead,
        contactCard,
        phone: phoneNumber,
        onEditQuote: () => { setSheetOpen(false); setDetailsOpen('services'); },
    };

    const header = (
        <ConversationHeader title={caseTitle(lead)} subtitle={phone ? lead.customerName ?? undefined : caseSubtitle(lead)} phone={phone} onBack={onBack} titleId="case-title">
            {!railBeside ? (
                <AmountChip type="button" onClick={() => setSheetOpen(true)} aria-label={lead.estimatedValue > 0 ? `Wycena: ${formatAmount(lead.estimatedValue)}` : 'Wycena i klient'}>
                    {lead.estimatedValue > 0 ? formatAmount(lead.estimatedValue) : 'Wycena'}
                    <ChevronRight aria-hidden="true" />
                </AmountChip>
            ) : (
                <StatusChip $tone={chip.tone}>{chip.label}</StatusChip>
            )}
            {!phone && (
                <IconBtn
                    ref={menuButtonRef}
                    aria-label="Więcej: szczegóły sprawy, kontakt poza pocztą, zamknięcie"
                    aria-haspopup="menu"
                    aria-expanded={menu.isOpen()}
                    onClick={(event) => menu.toggle(event, null)}
                >
                    <MoreHorizontal />
                </IconBtn>
            )}
        </ConversationHeader>
    );

    const composer = threadId ? (
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
                layout={replyStep ? 'card' : 'compact'}
                sendAppearance={replyStep ? { title: step.title, hint: step.hint } : 'tint'}
                galleryContext={galleryContext}
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
                {threadId ? (
                    <Bubbles
                        messages={detailMatches ? detail!.messages : []}
                        loading={threadLoading || !detailMatches}
                        phone={phone}
                        onDownload={download}
                        onOpenFull={setFullMessageId}
                        alignBottom={!replyStep || phone}
                    />
                ) : (
                    <NoThreadBody lead={lead} phone={phone} />
                )}
                {/* Bez panelu obok krok następny stoi nad odpowiedzią - jak na telefonie.
                    Jedyne wypełnienie w oknie nie może zniknąć razem z panelem. */}
                {!railBeside && !phone && cta && <InlineStep>{cta}</InlineStep>}
                {composer}
                {fullMessageId && detailMatches && (() => {
                    const message = detail!.messages.find((item) => item.id === fullMessageId);
                    return message ? (
                        <MessageReaderOverlay message={message} onClose={() => setFullMessageId(null)} onDownloadAttachment={download} />
                    ) : null;
                })()}
            </Column>

            {railBeside && <CaseRail lead={lead} contactCard={contactCard} phone={phoneNumber} cta={cta} />}

            {sheetOpen && (
                <RailSheet
                    {...railProps}
                    side={!phone}
                    onClose={() => setSheetOpen(false)}
                    onDetails={() => { setSheetOpen(false); setDetailsOpen('details'); }}
                    cta={cta}
                />
            )}

            <ActionMenu anchor={menu.menu?.anchor ?? null} onClose={menu.close} label="Akcje sprawy">
                <MenuItem icon={<Info />} onClick={() => { menu.close(); setDetailsOpen('details'); }}>Szczegóły sprawy</MenuItem>
                <MenuItem icon={<FileText />} onClick={() => { menu.close(); setDetailsOpen('services'); }}>
                    {lead.services.length > 0 ? 'Zmień wycenę' : 'Dodaj wycenę'}
                </MenuItem>
                {step.kind !== 'BOOK' && !lead.appointmentId && (
                    <MenuItem icon={<CalendarPlus />} onClick={() => { menu.close(); openBooking(); }}>Umów wizytę</MenuItem>
                )}
                <MenuItem icon={<PhoneCall />} onClick={() => { menu.close(); setCallbackOpen(true); }}>Kontakt poza pocztą</MenuItem>
                {cardEmail && (
                    <>
                        <MenuDivider />
                        <MenuItem icon={<UserRound />} onClick={() => { menu.close(); setContactAnchor(menuButtonRef.current); }}>Profil klienta</MenuItem>
                        <MenuItem icon={<StickyNote />} onClick={() => { menu.close(); setNotesAnchor(menuButtonRef.current); }}>Notatki o kliencie</MenuItem>
                        {thread && (
                            <MenuItem icon={<History />} onClick={() => { menu.close(); setHistoryOpen(true); }}>Wszystkie maile tej osoby</MenuItem>
                        )}
                    </>
                )}
                <MenuDivider />
                {thread && (
                    <MenuItem icon={<Archive />} onClick={() => { menu.close(); setArchived.mutate({ threadId: thread.id, archived: !thread.archived }); }}>
                        {thread.archived ? 'Przywróć rozmowę ze schowka' : 'Archiwizuj rozmowę'}
                    </MenuItem>
                )}
                <MenuItem icon={<XCircle />} onClick={() => { menu.close(); setLostOpen(true); }}>Zamknij sprawę</MenuItem>
                <MenuItem icon={<Trash2 />} danger onClick={() => { menu.close(); setDeleteStep('confirm'); }}>Usuń sprawę</MenuItem>
            </ActionMenu>

            {contactAnchor && cardEmail && (
                <ContactCardPopover
                    email={cardEmail}
                    participantName={lead.customerName}
                    anchor={contactAnchor}
                    onClose={() => setContactAnchor(null)}
                />
            )}
            {notesAnchor && cardEmail && (
                <ContactNotesPopover email={cardEmail} anchor={notesAnchor} onClose={() => setNotesAnchor(null)} />
            )}
            {historyOpen && thread && (
                <ThreadHistoryPanel threadId={thread.id} email={thread.participantEmail} onClose={() => setHistoryOpen(false)} />
            )}
            {detailsOpen && (
                <LeadDetailModal
                    key={lead.id}
                    leadId={lead.id}
                    // Rozmowa stoi obok - odnośnik do niej prowadziłby tu, gdzie jesteśmy.
                    showThreadLink={false}
                    openServicesEditor={detailsOpen === 'services'}
                    onClose={() => setDetailsOpen(null)}
                    onDeleted={onClosed}
                />
            )}
            {booking && (
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
            {lostOpen && <LeadLostReasonDialog leadId={lead.id} onClose={() => setLostOpen(false)} />}
            {callbackOpen && <RecordCallbackDialog leadId={lead.id} onClose={() => setCallbackOpen(false)} />}
            <ConfirmationModal
                isOpen={deleteStep === 'confirm'}
                title="Usunąć tę sprawę?"
                message="Tej operacji nie da się cofnąć. Wiadomości w skrzynce zostają nietknięte."
                variant="danger"
                confirmText="Usuń"
                onConfirm={() => (lead.appointmentId ? setDeleteStep('appointment') : performDelete(false))}
                onCancel={() => setDeleteStep(null)}
            />
            <ChoiceModal
                isOpen={deleteStep === 'appointment'}
                title="Co zrobić z rezerwacją?"
                message="Ta sprawa ma rezerwację w kalendarzu. Możesz usunąć ją razem ze sprawą albo zostawić jako samodzielny termin."
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
function NoThreadBody({ lead, phone }: { lead: Lead; phone: boolean }) {
    const { data: timeline } = useLeadTimeline(lead.id);
    return (
        <ConversationScroll $phone={phone}>
            <Request>
                <p className="label">Zgłoszenie</p>
                <div className="body">{lead.initialMessage ?? 'Klient nie zostawił treści zapytania.'}</div>
            </Request>
            {(timeline?.length ?? 0) > 0 && <LeadTimeline entries={timeline ?? []} />}
            {!lead.contactIdentifier.includes('@') && (
                <Hint>Ta sprawa nie ma adresu e-mail - zadzwoń i odnotuj rozmowę w menu „⋯" (Kontakt poza pocztą).</Hint>
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
            sendAppearance={step.kind === 'REPLY' ? { title: step.title, hint: step.hint } : 'tint'}
            galleryContext={galleryContext}
            onSent={onSent}
        />
    );
}
