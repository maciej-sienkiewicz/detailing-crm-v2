// src/modules/comms/components/CaseWorkspace.tsx
// Sprawa otwarta w skrzynce „Zapytania": rozmowa na środku, sprawa obok.
//
// Dawniej sprawa (Leady) i rozmowa (Poczta) były w dwóch modułach. Żeby odpisać na
// zapytanie, trzeba było z okna leada przejść do poczty, znaleźć wątek, odpisać
// i wrócić - a w drodze powrotnej gubiło się miejsce w kolejce. Tu obie rzeczy
// stoją obok siebie: to, co klient napisał, i to, na czym stoi sprawa.
//
// Panel sprawy (CaseRail) mówi trzy rzeczy, w tej kolejności: ile to jest warte
// (wycena), kto pyta (klient) i co zrobić dalej (jeden przycisk). Pełne okno leada
// z sugestiami, notatkami i tagami jest pod „Szczegóły sprawy" - nie zniknęło,
// przestało zasłaniać rozmowę.
//
// ── Szerokość ─────────────────────────────────────────────────────────────────
// Panel sprawy stoi obok rozmowy dopiero, gdy jest na to miejsce W TYM KOMPONENCIE
// (useContainerWidth), a nie w oknie: obok stoi jeszcze kolejka i pasek boczny
// aplikacji. Węższy obszar dostaje pasek nad rozmową - kwota, krok następny
// i przycisk, który wysuwa pełny panel z boku (SideDrawer).
//
// ── Kwoty ─────────────────────────────────────────────────────────────────────
// Wycena pokazuje brutto z serwera (`totalGross` pozycji, `estimatedValue` sprawy)
// bez przeliczania - CLAUDE.md §1.
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import styled, { css } from 'styled-components';
import {
    ArrowLeft,
    CalendarCheck,
    CalendarPlus,
    ChevronsLeft,
    ChevronsRight,
    Info,
    MoreHorizontal,
    PanelRight,
    Phone,
    PhoneCall,
    Reply,
    Trash2,
    XCircle,
} from 'lucide-react';
import { ConfirmationModal, ChoiceModal } from '@/common/components/ConfirmationModal';
import { useToast } from '@/common/components/Toast';
import { useContainerWidth } from '@/common/hooks';
import {
    ActionMenu,
    Button,
    ButtonLink,
    DrawerBody,
    IconButton,
    MenuDivider,
    MenuItem,
    SideDrawer,
    touch,
    ui,
    useActionMenu,
} from '@/common/components/ui';
import { usePermissions } from '@/core/permissions';
import { BookingFlowModal } from '@/modules/calendar';
import { commsApi } from '../api/commsApi';
import {
    useContactCard,
    useContactInsights,
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
import type { CommThread, Lead } from '../types';
import { leadToBookingPrefill } from '../utils/bookingPrefill';
import { CLOSED_STATUSES, formatVehicle } from '../utils/leadFormat';
import { leadPhoneNumber, leadPrimaryAction, type LeadPrimaryAction } from '../utils/leadPrimaryAction';
import { describeLeadUrgency, type LeadUrgency } from '../utils/leadUrgency';
import { toQuoteRows } from '../utils/leadServiceLines';
import { ConversationView } from './ConversationView';
import type { GalleryPickerContext } from './GalleryPhotoPicker';
import { LeadDetailModal } from './LeadDetailModal';
import { LeadLostReasonDialog } from './LeadLostReasonDialog';
import { LeadTimeline } from './LeadTimeline';
import { MessageReaderOverlay } from './MessageReaderOverlay';
import { RecordCallbackDialog } from './RecordCallbackDialog';
import { ReplyComposer } from './ReplyComposer';
import { EmptyHint, formatGrosze, formatMoney } from './shared';

/** Od tej szerokości obszaru sprawy panel stoi obok rozmowy (rozmowa ≥ 560 + panel 300). */
const RAIL_MIN_WIDTH = 860;

// ── Układ ───────────────────────────────────────────────────────────────────

const Workspace = styled.div`
    /* Kotwica dla MessageReaderOverlay (absolute nad rozmową). */
    position: relative;
    flex: 1;
    min-width: 0;
    min-height: 0;
    display: flex;
    flex-direction: column;
    background: ${ui.surface};
`;

const Body = styled.div`
    flex: 1;
    min-height: 0;
    display: flex;
`;

const Main = styled.div`
    flex: 1;
    min-width: 0;
    min-height: 0;
    display: flex;
    flex-direction: column;
`;

const RailColumn = styled.aside`
    flex: 0 0 300px;
    min-height: 0;
    overflow-y: auto;
    border-left: 1px solid ${ui.line};
    background: ${ui.surfaceSoft};

    @media (min-width: 1600px) { flex-basis: 340px; }
`;

/**
 * Pasek sprawy nad rozmową (wąski obszar). Jeden rząd: powrót, kto i ile, krok
 * następny, panel. Na telefonie to on jest nagłówkiem ekranu - rozmowa ma własny
 * nagłówek z tematem, więc tu stoi to, czego tam nie ma: auto i kwota.
 */
const Strip = styled.div`
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 10px;
    border-bottom: 1px solid ${ui.line};
    background: ${ui.surfaceSoft};

    .who {
        flex: 1;
        min-width: 0;
        display: flex;
        flex-direction: column;
        gap: 1px;
    }
    .name {
        font-size: 14px;
        font-weight: 650;
        color: ${ui.ink};
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
    }
    .meta {
        display: flex;
        gap: 10px;
        font-size: 12px;
        color: ${ui.textMuted};
        white-space: nowrap;
        overflow: hidden;
    }
    .meta strong { color: ${ui.inkSoft}; font-weight: 650; font-variant-numeric: tabular-nums; }

    @media (max-width: calc(${p => p.theme.breakpoints.md} - 1px)) {
        padding-top: calc(8px + env(safe-area-inset-top, 0px));
        .ctaLabel { display: none; }
    }
`;

// ── Panel sprawy ────────────────────────────────────────────────────────────

const Rail = styled.div`
    display: flex;
    flex-direction: column;
    gap: 18px;
    padding: 16px;
`;

/**
 * Wycena - jedyne wyniesienie w kolumnie (CLAUDE.md §2): biała karta z paskiem
 * marki. Kwota jest nagłówkiem, pozycje są dowodem pod nią.
 */
const QuoteCard = styled.section`
    position: relative;
    overflow: hidden;
    border-radius: ${ui.radiusPanel};
    background: ${ui.surface};
    box-shadow: ${ui.shadowCard};
    padding: 16px 16px 12px;

    &::before {
        content: '';
        position: absolute;
        inset: 0 0 auto 0;
        height: 3px;
        background: linear-gradient(90deg, ${ui.brand}, ${ui.brandStrong});
    }

    .label { font-size: 12.5px; color: ${ui.textMuted}; }
    .total {
        margin-top: 2px;
        font-size: 26px;
        line-height: 1.15;
        font-weight: 750;
        letter-spacing: -0.02em;
        color: ${ui.ink};
        font-variant-numeric: tabular-nums;
    }
    ul { list-style: none; margin: 12px 0 0; padding: 0; display: flex; flex-direction: column; gap: 6px; }
    li { display: flex; gap: 8px; font-size: 13px; color: ${ui.inkSoft}; }
    li .name { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    li .qty { color: ${ui.textMuted}; }
    li .price { font-variant-numeric: tabular-nums; white-space: nowrap; }
    .empty { margin-top: 6px; font-size: 13px; color: ${ui.textMuted}; }
    .edit {
        margin-top: 10px;
        padding: 0;
        border: none;
        background: none;
        font: inherit;
        font-size: 12.5px;
        font-weight: 600;
        color: ${ui.brandInk};
        cursor: pointer;
        &:hover { text-decoration: underline; }
    }
`;

const Facts = styled.section`
    display: flex;
    flex-direction: column;
    gap: 4px;

    h3 {
        margin: 0;
        font-size: 15px;
        font-weight: 650;
        color: ${ui.ink};
        overflow-wrap: anywhere;
    }
    p { margin: 0; font-size: 13px; color: ${ui.textSecondary}; overflow-wrap: anywhere; }
    .tags { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 6px; }
    .tags span {
        border: 1px solid ${ui.line};
        border-radius: 999px;
        padding: 2px 9px;
        font-size: 11.5px;
        color: ${ui.textSecondary};
        background: ${ui.surface};
    }
`;

const Turn = styled.p<{ $overdue: boolean }>`
    margin: 0;
    font-size: 13px;
    font-weight: 600;
    color: ${p => (p.$overdue ? ui.dangerInk : ui.textSecondary)};
`;

const NextStep = styled.section`
    display: flex;
    flex-direction: column;
    gap: 6px;

    .hint { font-size: 12px; color: ${ui.textMuted}; text-align: center; }
`;

const RailFooter = styled.div`
    display: flex;
    align-items: center;
    gap: 6px;
    ${touch} { button { min-height: 44px; } }
`;

/** Lead bez wątku: zgłoszenie, przebieg i - gdy jest adres - pierwsza wiadomość. */
const NoThread = styled.div`
    flex: 1;
    min-height: 0;
    overflow-y: auto;
    display: flex;
    flex-direction: column;
    gap: 16px;
    padding: 16px;

    .request {
        border: 1px solid ${ui.line};
        border-radius: ${ui.radiusRow};
        background: ${ui.surfaceSoft};
        padding: 12px 14px;
        font-size: 14px;
        line-height: 1.5;
        color: ${ui.inkSoft};
        white-space: pre-wrap;
        overflow-wrap: anywhere;
    }
    .request small { display: block; margin-bottom: 4px; font-size: 12px; color: ${ui.textMuted}; }
    .composer { margin: 0 -16px -16px; }
`;

const ctaIcon = (kind: LeadPrimaryAction['kind']) =>
    kind === 'CALL' ? <Phone /> : kind === 'APPOINTMENT' ? <CalendarCheck /> : kind === 'BOOK' ? <CalendarPlus /> : <Reply />;

// ── Komponent ───────────────────────────────────────────────────────────────

interface CaseWorkspaceProps {
    leadId: string;
    /** Powrót do listy - na telefonie i tam, gdzie kolejka nie stoi obok. */
    onBack?: () => void;
    /** Po wysłaniu odpowiedzi: następna sprawa z kolejki. */
    onAdvance?: () => void;
    /** Po usunięciu albo zamknięciu sprawy - lista wraca na swoje miejsce. */
    onClosed?: () => void;
    /** Kolejka obok jest zwinięta - przycisk ją rozwija (szeroki ekran). */
    queueCollapsed?: boolean;
    onToggleQueue?: () => void;
}

export function CaseWorkspace({ leadId, onBack, onAdvance, onClosed, queueCollapsed, onToggleQueue }: CaseWorkspaceProps) {
    const navigate = useNavigate();
    const { showError } = useToast();
    const { can } = usePermissions();
    const [ref, width] = useContainerWidth<HTMLDivElement>();
    const railBeside = width !== null && width >= RAIL_MIN_WIDTH;

    const { data: lead, isError } = useLead(leadId);
    const threadId = lead?.threadId ?? null;
    const { data: detail } = useThread(threadId);
    const thread: CommThread | null = detail && detail.thread.id === threadId ? detail.thread : null;
    const { data: insights } = useContactInsights(thread?.participantEmail ?? null, thread?.id);
    const thresholds = useStagnationThresholds();
    const contactEmail = lead?.contactIdentifier?.includes('@') ? lead.contactIdentifier.trim() : null;
    const { data: contactCard } = useContactCard(contactEmail ?? thread?.participantEmail ?? null, {
        enabled: Boolean(contactEmail ?? thread?.participantEmail),
    });
    const { data: appointment } = useLeadAppointment(lead?.appointmentId ?? null);

    const [fullMessageId, setFullMessageId] = useState<string | null>(null);
    const [drawerOpen, setDrawerOpen] = useState(false);
    const [detailsOpen, setDetailsOpen] = useState<null | 'details' | 'services'>(null);
    const [booking, setBooking] = useState(false);
    const [lostOpen, setLostOpen] = useState(false);
    const [callbackOpen, setCallbackOpen] = useState(false);
    const [deleteStep, setDeleteStep] = useState<null | 'confirm' | 'appointment'>(null);
    const menu = useActionMenu();

    const markRead = useMarkThreadRead();
    const setArchived = useSetThreadArchived();
    const acceptAllSuggestions = useAcceptAllSuggestions(leadId);
    const deleteLead = useDeleteLead();

    // Otwarcie sprawy czyta jej rozmowę - tak jak otwarcie wątku w poczcie.
    useEffect(() => {
        if (detail && detail.thread.id === threadId && detail.thread.unreadCount > 0) {
            markRead.mutate(detail.thread.id);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [detail?.thread.id, detail?.thread.unreadCount, threadId]);

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
        (target: CommThread) => setArchived.mutate({ threadId: target.id, archived: !target.archived }),
        [setArchived]
    );

    const urgency: LeadUrgency | null = useMemo(
        () => (lead ? describeLeadUrgency(lead, thresholds) : null),
        [lead, thresholds]
    );
    const action = lead && urgency ? leadPrimaryAction(lead, urgency) : null;
    const closed = lead ? CLOSED_STATUSES.has(lead.status) : false;
    /*
     * Jedno wypełnienie w oknie (CLAUDE.md §2). Gdy krokiem jest odpowiedź, jest nim
     * „Wyślij" w kompozytorze i panel nie dubluje go drugim przyciskiem. Gdy krokiem
     * jest telefon, wypełniony jest „Zadzwoń", a „Wyślij" przechodzi na obwódkę.
     */
    const ctaFilled = Boolean(action && action.kind !== 'REPLY' && action.emphasis === 'primary' && !closed);
    const sendEmphasis = ctaFilled ? 'quiet' : 'primary';

    const galleryContext: GalleryPickerContext | undefined = can('VISITS_VIEW')
        ? {
            customerId: lead?.customerId ?? contactCard?.customer?.id ?? null,
            vehicleBrand: lead?.vehicleBrand ?? null,
            vehicleModel: lead?.vehicleModel ?? null,
        }
        : undefined;

    /**
     * Rezerwacja przyjmuje sugestie AI jak zaakceptowane - ta sama reguła co
     * w oknie leada: sugestia bez kwoty blokuje, zamiast wejść do kalendarza bez ceny.
     */
    const openBooking = () => {
        setDrawerOpen(false);
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

    const runAction = () => {
        if (!action) return;
        if (action.kind === 'BOOK') openBooking();
        else if (action.kind === 'APPOINTMENT') openAppointment();
        else if (action.kind === 'REPLY') {
            setDrawerOpen(false);
            // Odpowiedź pisze się pod rozmową - przewijamy do edytora i stawiamy w nim kursor.
            const editor = document.querySelector<HTMLElement>('[data-case-workspace] [contenteditable="true"]');
            editor?.focus();
            editor?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
        }
    };

    const performDelete = (deleteAppointment: boolean) => {
        setDeleteStep(null);
        // Najpierw z widoku, potem żądanie: otwarty panel odpytywałby usuniętego leada.
        onClosed?.();
        deleteLead.mutate({ leadId, deleteAppointment });
    };

    if (isError) return <Workspace><EmptyHint>Tej sprawy już nie ma.</EmptyHint></Workspace>;
    if (!lead || !urgency || !action) return <Workspace ref={ref}><EmptyHint>Wczytywanie sprawy…</EmptyHint></Workspace>;

    const vehicle = formatVehicle(lead);
    const who = lead.customerName?.trim() || lead.contactIdentifier;
    const quoteRows = toQuoteRows(lead.services);
    const phone = leadPhoneNumber(lead) ?? contactCard?.customer?.phone ?? null;

    const cta = closed ? null : action.href ? (
        <ButtonLink
            href={action.href}
            $variant={ctaFilled ? 'primary' : 'tinted'}
            $size="md"
            $block
        >
            {ctaIcon(action.kind)} {action.label}
        </ButtonLink>
    ) : (
        <Button variant={ctaFilled ? 'primary' : 'tinted'} block onClick={runAction} disabled={acceptAllSuggestions.isPending}>
            {ctaIcon(action.kind)} {action.label}
        </Button>
    );

    const railContent = (
        <Rail>
            <QuoteCard aria-label="Wycena">
                <div className="label">Wycena brutto</div>
                {quoteRows.length > 0 ? (
                    <>
                        <div className="total">{formatMoney(lead.estimatedValue)}</div>
                        <ul>
                            {quoteRows.map((row) => (
                                <li key={row.id}>
                                    <span className="name" title={row.name}>{row.name}</span>
                                    {row.quantity > 1 && <span className="qty">{row.quantity}×</span>}
                                    <span className="price">{formatGrosze(row.grossCents)}</span>
                                </li>
                            ))}
                        </ul>
                    </>
                ) : (
                    <div className="empty">Sprawa nie ma jeszcze wyceny.</div>
                )}
                {!closed && (
                    <button type="button" className="edit" onClick={() => { setDrawerOpen(false); setDetailsOpen('services'); }}>
                        {quoteRows.length > 0 ? 'Zmień wycenę' : 'Dodaj wycenę'}
                    </button>
                )}
            </QuoteCard>

            <Facts aria-label="Klient">
                <h3>{who}</h3>
                {vehicle && <p>{vehicle}</p>}
                {lead.customerName && <p>{lead.contactIdentifier}</p>}
                {contactCard?.customer && contactCard.customer.completedVisitCount > 0 && (
                    <p>
                        Klient studia, wizyt: {contactCard.customer.completedVisitCount}, razem {formatMoney(contactCard.customer.totalSpentGross)}
                    </p>
                )}
                {lead.tagLabels.length > 0 && (
                    <div className="tags">
                        {lead.tagLabels.map((tag) => <span key={tag}>{tag}</span>)}
                    </div>
                )}
            </Facts>

            {!closed && (
                <NextStep aria-label="Krok następny">
                    <Turn $overdue={urgency.overdue} title={urgency.title}>{urgency.label}</Turn>
                    {action.kind !== 'REPLY' && cta}
                    {action.kind === 'REPLY' && (
                        <div className="hint">
                            Odpowiedz pod rozmową.{onAdvance ? ' Po wysłaniu otworzy się następna sprawa.' : ''}
                        </div>
                    )}
                </NextStep>
            )}

            <RailFooter>
                <Button variant="ghost" size="sm" onClick={() => { setDrawerOpen(false); setDetailsOpen('details'); }}>
                    <Info /> Szczegóły sprawy
                </Button>
                <span style={{ flex: 1 }} />
                <IconButton
                    label="Więcej akcji sprawy"
                    variant="ghost"
                    size="sm"
                    aria-haspopup="menu"
                    aria-expanded={menu.isOpen()}
                    onClick={(event) => menu.toggle(event, null)}
                >
                    <MoreHorizontal />
                </IconButton>
            </RailFooter>
        </Rail>
    );

    // Lead bez wątku: piszemy pierwszą wiadomość (gdy jest adres) albo dzwonimy.
    const noThreadMain = (
        <NoThreadPane
            lead={lead}
            contactEmail={contactEmail}
            galleryContext={galleryContext}
            sendEmphasis={sendEmphasis}
            onSent={onAdvance}
        />
    );

    return (
        <Workspace ref={ref} data-case-workspace>
            {!railBeside && (
                <Strip>
                    {onBack && (
                        <IconButton label="Wróć do listy spraw" variant="ghost" size="sm" onClick={onBack}>
                            <ArrowLeft />
                        </IconButton>
                    )}
                    {onToggleQueue && (
                        <IconButton
                            label={queueCollapsed ? 'Pokaż listę spraw' : 'Schowaj listę spraw'}
                            variant="ghost"
                            size="sm"
                            onClick={onToggleQueue}
                        >
                            {queueCollapsed ? <ChevronsRight /> : <ChevronsLeft />}
                        </IconButton>
                    )}
                    <div className="who">
                        <span className="name">{vehicle ?? who}</span>
                        <span className="meta">
                            {vehicle && <span>{who}</span>}
                            {lead.estimatedValue > 0 && <strong>{formatMoney(lead.estimatedValue)}</strong>}
                        </span>
                    </div>
                    {/* W pasku zostaje tylko krok, który nie jest odpowiedzią - odpowiedź jest pod rozmową. */}
                    {cta && action.kind !== 'REPLY' && (
                        action.href ? (
                            <ButtonLink href={action.href} $variant={ctaFilled ? 'primary' : 'tinted'} $size="sm">
                                {ctaIcon(action.kind)} <span className="ctaLabel">{action.shortLabel}</span>
                            </ButtonLink>
                        ) : (
                            <Button variant={ctaFilled ? 'primary' : 'tinted'} size="sm" onClick={runAction} aria-label={action.label}>
                                {ctaIcon(action.kind)} <span className="ctaLabel">{action.shortLabel}</span>
                            </Button>
                        )
                    )}
                    <IconButton label="Panel sprawy" variant="ghost" size="sm" onClick={() => setDrawerOpen(true)}>
                        <PanelRight />
                    </IconButton>
                </Strip>
            )}

            <Body>
                <Main>
                    {threadId ? (
                        thread ? (
                            <ConversationView
                                thread={thread}
                                messages={detail?.messages ?? null}
                                replyTarget={{ email: detail?.replyAddress ?? null, name: detail?.replyName ?? null }}
                                // Powrót prowadzi pasek sprawy - nagłówek rozmowy nie dubluje strzałki.
                                isDesktop
                                hiddenOnMobile={false}
                                clientSummary={insights?.customer ?? null}
                                onBack={onBack ?? (() => undefined)}
                                onToggleArchived={toggleArchived}
                                onOpenFullMessage={setFullMessageId}
                                onDownloadAttachment={downloadAttachment}
                                hidePrimaryAction
                                sendEmphasis={sendEmphasis}
                                onReplySent={onAdvance ? () => onAdvance() : undefined}
                            />
                        ) : (
                            <EmptyHint>Wczytywanie rozmowy…</EmptyHint>
                        )
                    ) : (
                        noThreadMain
                    )}
                </Main>
                {railBeside && (
                    <RailColumn aria-label="Sprawa">
                        {onToggleQueue && (
                            <div style={{ padding: '10px 12px 0' }}>
                                <Button variant="ghost" size="sm" onClick={onToggleQueue}>
                                    {queueCollapsed ? <ChevronsRight /> : <ChevronsLeft />}
                                    {queueCollapsed ? 'Lista spraw' : 'Schowaj listę'}
                                </Button>
                            </div>
                        )}
                        {railContent}
                    </RailColumn>
                )}
            </Body>

            {drawerOpen && !railBeside && (
                <SideDrawer
                    onClose={() => setDrawerOpen(false)}
                    title={vehicle ?? who}
                    titleId={`case-drawer-${leadId}`}
                    subtitle={vehicle ? who : undefined}
                    width={360}
                >
                    <DrawerBody>{railContent}</DrawerBody>
                </SideDrawer>
            )}

            <ActionMenu anchor={menu.menu?.anchor ?? null} onClose={menu.close} label="Akcje sprawy">
                {!closed && (
                    <MenuItem icon={<PhoneCall />} onClick={() => { menu.close(); setDrawerOpen(false); setCallbackOpen(true); }}>
                        Kontakt poza pocztą
                    </MenuItem>
                )}
                {!closed && action.kind !== 'BOOK' && !lead.appointmentId && (
                    <MenuItem icon={<CalendarPlus />} onClick={() => { menu.close(); openBooking(); }}>
                        Stwórz rezerwację
                    </MenuItem>
                )}
                {phone && action.kind !== 'CALL' && (
                    <MenuItem icon={<Phone />} onClick={() => { menu.close(); window.location.href = `tel:${phone.replace(/\s/g, '')}`; }}>
                        Zadzwoń
                    </MenuItem>
                )}
                {!closed && (
                    <MenuItem icon={<XCircle />} onClick={() => { menu.close(); setDrawerOpen(false); setLostOpen(true); }}>
                        Zamknij sprawę
                    </MenuItem>
                )}
                <MenuDivider />
                <MenuItem icon={<Trash2 />} danger onClick={() => { menu.close(); setDrawerOpen(false); setDeleteStep('confirm'); }}>
                    Usuń sprawę
                </MenuItem>
            </ActionMenu>

            {fullMessageId && detail && (
                (() => {
                    const message = detail.messages.find((item) => item.id === fullMessageId);
                    return message ? (
                        <MessageReaderOverlay
                            message={message}
                            onClose={() => setFullMessageId(null)}
                            onDownloadAttachment={downloadAttachment}
                        />
                    ) : null;
                })()
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
                    onBooked={() => setBooking(false)}
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
        </Workspace>
    );
}

// ── Lead bez wątku ──────────────────────────────────────────────────────────

const RequestCard = styled.div<{ $muted?: boolean }>`
    ${p => p.$muted && css`color: ${ui.textMuted};`}
`;

interface NoThreadPaneProps {
    lead: Lead;
    contactEmail: string | null;
    galleryContext?: GalleryPickerContext;
    sendEmphasis: 'primary' | 'quiet';
    onSent?: () => void;
}

/**
 * Sprawa, której nie zaczął mail: formularz przez webhook, telefon, wpis ręczny.
 * Pokazujemy, o co klient pytał, i przebieg sprawy. Gdy znamy adres, pod spodem
 * stoi pierwsza wiadomość - po wysłaniu serwer przypina nowy wątek do sprawy
 * i w tym miejscu pojawia się zwykła rozmowa.
 */
function NoThreadPane({ lead, contactEmail, galleryContext, sendEmphasis, onSent }: NoThreadPaneProps) {
    const { data: timeline } = useLeadTimeline(lead.id);
    const { data: accounts } = useMailAccounts();
    const account = accounts?.find((item) => item.status !== 'DISABLED');

    return (
        <NoThread>
            <RequestCard className="request" $muted={!lead.initialMessage}>
                <small>Zgłoszenie</small>
                {lead.initialMessage ?? 'Klient nie zostawił treści zapytania.'}
            </RequestCard>
            {(timeline?.length ?? 0) > 0 && <LeadTimeline entries={timeline ?? []} />}
            {contactEmail && account ? (
                <div className="composer">
                    <ReplyComposer
                        accountId={account.id}
                        initialTo={contactEmail}
                        leadId={lead.id}
                        requireSubject
                        galleryContext={galleryContext}
                        sendEmphasis={sendEmphasis}
                        onSent={() => onSent?.()}
                    />
                </div>
            ) : !contactEmail ? (
                <EmptyHint>Ta sprawa nie ma adresu e-mail - skontaktuj się telefonicznie i odnotuj rozmowę w menu sprawy.</EmptyHint>
            ) : null}
        </NoThread>
    );
}
