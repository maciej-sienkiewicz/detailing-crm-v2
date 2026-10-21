import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import styled, { css } from 'styled-components';
import { ChevronDown, ArrowRight, ExternalLink } from 'lucide-react';
import { PiiText } from '@/common/pii';
import { appointmentApi } from '@/modules/appointments/api/appointmentApi';
import { ActivityIcon } from './ActivityIcon';
import { formatTime, iconTone } from '../activityTheme';
import type { ActivityItem, ActivityReference } from '../types';

// ─── rail + shell ─────────────────────────────────────────────────────────────

const Row = styled.article`
    position: relative;
    display: grid;
    grid-template-columns: 58px 40px 1fr;
    align-items: start;
    gap: 0 14px;
    padding: 14px 18px 14px 0;

    &::before {
        content: '';
        position: absolute;
        left: 77px;
        top: 0;
        bottom: 0;
        width: 2px;
        background: ${p => p.theme.colors.border};
    }

    &:first-child::before { top: 22px; }
    &:last-child::before  { bottom: calc(100% - 22px); }

    @media (max-width: 720px) {
        grid-template-columns: 44px 36px 1fr;
        gap: 0 10px;
        padding-right: 12px;

        &::before { left: 61px; }
    }
`;

const Time = styled.div`
    padding-top: 11px;
    text-align: right;
    font-size: 12px;
    font-weight: 600;
    font-variant-numeric: tabular-nums;
    color: ${p => p.theme.colors.textMuted};
    white-space: nowrap;
`;

const IconTile = styled.div<{ $edge: string; $solid: string }>`
    position: relative;
    z-index: 1;
    width: 40px;
    height: 40px;
    border-radius: 12px;
    display: grid;
    place-items: center;
    background: ${p => p.theme.colors.surface};
    border: 1.5px solid ${p => p.$edge};
    color: ${p => p.$solid};
    box-shadow: 0 0 0 4px ${p => p.theme.colors.surface};

    @media (max-width: 720px) {
        width: 36px;
        height: 36px;
        border-radius: 11px;
    }
`;

// Kto to zrobił - zawsze widoczne, pod tytułem. Wcześniej nazwisko pojawiało się
// dopiero po najechaniu myszą, a na telefonie i tablecie wcale, choć „kto" jest pierwszym
// pytaniem, z jakim właściciel otwiera ten ekran. Bez inicjałów i bez koloru: nazwisko
// pismem, a rola i kanał szarym dopiskiem obok (CLAUDE.md §4: osobne elementy, nie kropka).
const ActorLine = styled.div`
    display: flex;
    align-items: baseline;
    gap: 4px 10px;
    flex-wrap: wrap;
    font-size: 12.5px;
    line-height: 1.4;
`;

const ActorName = styled.span`
    font-weight: 600;
    color: ${p => p.theme.colors.text};
`;

const ActorMeta = styled.span`
    color: ${p => p.theme.colors.textSecondary};
`;

// ─── body ─────────────────────────────────────────────────────────────────────

const Body = styled.div`
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 6px;
    padding-top: 2px;
`;

const TopLine = styled.div`
    display: flex;
    align-items: baseline;
    gap: 10px;
    flex-wrap: wrap;
`;

const Title = styled.h3`
    flex: 1 1 260px;
    margin: 0;
    font-size: 14.5px;
    font-weight: 600;
    line-height: 1.35;
    letter-spacing: -0.1px;
    color: ${p => p.theme.colors.text};
    min-width: 0;
`;

// Kwota ujemna to pieniądze wychodzące - korekta kasy na minus, wypłata. W zielonej
// plakietce „przychodowej" czytałaby się jako wpływ, a minus przed liczbą jest zbyt
// drobny, żeby to odkręcić; kolor niesie tu ten sam sygnał co znak.
const Amount = styled.span<{ $outgoing: boolean }>`
    flex-shrink: 0;
    font-size: 13px;
    font-weight: 700;
    font-variant-numeric: tabular-nums;
    letter-spacing: -0.2px;
    ${p => p.$outgoing
        ? css`
            color: #b91c1c;
            background: rgba(220, 38, 38, 0.09);
            border: 1px solid rgba(220, 38, 38, 0.20);
        `
        : css`
            color: #0f766e;
            background: rgba(15, 118, 110, 0.09);
            border: 1px solid rgba(15, 118, 110, 0.18);
        `}
    padding: 3px 10px;
    border-radius: 9999px;
    white-space: nowrap;
`;

const Description = styled.p`
    margin: 0;
    font-size: 13px;
    line-height: 1.45;
    color: ${p => p.theme.colors.textSecondary};
`;

const MetaLine = styled.div`
    display: flex;
    align-items: center;
    gap: 8px;
    flex-wrap: wrap;
    margin-top: 2px;
`;

// ─── expandable changes ───────────────────────────────────────────────────────

const ExpandButton = styled.button<{ $open: boolean }>`
    display: inline-flex;
    align-items: center;
    gap: 5px;
    padding: 3px 9px 3px 7px;
    border: 1px solid ${p => p.theme.colors.border};
    border-radius: 9999px;
    background: ${p => p.theme.colors.surface};
    color: ${p => p.theme.colors.textSecondary};
    font-size: 11.5px;
    font-weight: 600;
    font-family: inherit;
    cursor: pointer;
    transition: transform 180ms ease, border-color 180ms ease, color 180ms ease;

    svg {
        width: 13px;
        height: 13px;
        transition: transform 180ms ease;
        ${p => p.$open && css`transform: rotate(180deg);`}
    }

    &:hover {
        transform: translateY(-1px);
        border-color: var(--brand-primary);
        color: var(--brand-primary);
    }

    &:focus-visible {
        outline: none;
        box-shadow: 0 0 0 3px rgba(3, 105, 161, 0.25);
    }
`;

const Changes = styled.div`
    margin-top: 6px;
    border: 1px solid ${p => p.theme.colors.border};
    border-radius: 12px;
    background: ${p => p.theme.colors.surfaceHover};
    overflow: hidden;
`;

const ChangeRow = styled.div`
    display: grid;
    grid-template-columns: minmax(120px, 30%) 1fr;
    gap: 10px;
    padding: 9px 12px;
    font-size: 12.5px;

    & + & {
        border-top: 1px solid ${p => p.theme.colors.border};
    }

    @media (max-width: 560px) {
        grid-template-columns: 1fr;
        gap: 3px;
    }
`;

const ChangeLabel = styled.span`
    font-weight: 600;
    color: ${p => p.theme.colors.textSecondary};
`;

const ChangeValues = styled.span`
    display: inline-flex;
    align-items: center;
    gap: 7px;
    flex-wrap: wrap;
    min-width: 0;
    color: ${p => p.theme.colors.text};

    svg {
        width: 13px;
        height: 13px;
        flex-shrink: 0;
        color: ${p => p.theme.colors.textMuted};
    }
`;

const OldValue = styled.span`
    color: ${p => p.theme.colors.textMuted};
    text-decoration: line-through;
    text-decoration-thickness: 1px;
`;

const NewValue = styled.span`
    font-weight: 600;
`;

// ─── steps of one gesture ─────────────────────────────────────────────────────

const Steps = styled.div`
    border: 1px solid ${p => p.theme.colors.border};
    border-radius: 12px;
    background: ${p => p.theme.colors.surfaceHover};
    overflow: hidden;
`;

const StepsToggle = styled.button<{ $open: boolean }>`
    display: flex;
    width: 100%;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    min-height: 40px;
    padding: 0 12px;
    border: none;
    background: transparent;
    color: ${p => p.theme.colors.textSecondary};
    font-family: inherit;
    font-size: 12.5px;
    font-weight: 600;
    text-align: left;
    cursor: pointer;

    svg {
        width: 14px;
        height: 14px;
        flex-shrink: 0;
        transition: transform 180ms ease;
        ${p => p.$open && css`transform: rotate(180deg);`}
    }

    &:hover { color: ${p => p.theme.colors.text}; }

    &:focus-visible {
        outline: none;
        box-shadow: inset 0 0 0 2px rgba(3, 105, 161, 0.35);
    }
`;

const Step = styled.div`
    display: flex;
    gap: 12px;
    padding: 8px 12px;
    border-top: 1px solid ${p => p.theme.colors.border};
    font-size: 12.5px;
    line-height: 1.45;
    color: ${p => p.theme.colors.text};

    time {
        flex-shrink: 0;
        width: 40px;
        color: ${p => p.theme.colors.textMuted};
        font-variant-numeric: tabular-nums;
    }
`;

// ─── navigation ───────────────────────────────────────────────────────────────

const NavChip = styled(Link)`
    display: inline-flex;
    align-items: center;
    gap: 4px;
    font-size: 11px;
    font-weight: 600;
    color: ${p => p.theme.colors.textSecondary};
    background: ${p => p.theme.colors.surfaceAlt};
    border: 1px solid ${p => p.theme.colors.border};
    padding: 2px 8px;
    border-radius: 9999px;
    text-decoration: none;
    white-space: nowrap;
    transition: color 150ms ease, border-color 150ms ease;

    svg { width: 11px; height: 11px; flex-shrink: 0; }

    &:hover {
        color: var(--brand-primary);
        border-color: var(--brand-primary);
    }

    &:focus-visible {
        outline: none;
        box-shadow: 0 0 0 3px rgba(3, 105, 161, 0.25);
    }
`;

interface NavTarget {
    path: string;
    /** Set for reservations; the chip resolves the date and deep-links the calendar. */
    appointmentId?: string;
}

/** Maps backend resource codes to in-app routes. Returns null for resources with no panel route. */
const subjectPath = (ref: ActivityReference): NavTarget | null => {
    switch (ref.resource) {
        case 'VISIT':        return { path: `/visits/${ref.id}` };
        case 'CUSTOMER':     return { path: `/customers/${ref.id}` };
        case 'VEHICLE':      return { path: `/vehicles/${ref.id}` };
        // Reservations live on the calendar, not under a detail route: jump there,
        // highlight the event and open its summary popover right away.
        case 'APPOINTMENT':  return { path: '/calendar', appointmentId: ref.id };
        default:             return null;
    }
};

/**
 * Krótkie etykiety linków - „Wizyta", „Klient". Strzałka przy nich mówi już „przejdź",
 * a cztery „Przejdź do …" w jednym wierszu zajmowały więcej miejsca niż sam wpis.
 */
const subjectLabel = (ref: ActivityReference): string => {
    switch (ref.resource) {
        case 'VISIT':        return 'Wizyta';
        case 'CUSTOMER':     return 'Klient';
        case 'VEHICLE':      return 'Pojazd';
        case 'APPOINTMENT':  return 'Rezerwacja';
        default:             return ref.label ?? ref.resource;
    }
};

/**
 * Akcje, których „podmiot" nie jest obiektem do otwarcia: import i eksport klientów
 * dotyczą całej bazy, a ich `entityId` to identyfikator operacji - link „Klient"
 * prowadził na stronę 404.
 */
const WITHOUT_SUBJECT_LINK = new Set(['CUSTOMERS_IMPORTED', 'CUSTOMERS_EXPORTED']);

/**
 * Kanał, który nic nie mówi: prawie każda czynność pracownika dzieje się w panelu, więc
 * „Panel" stał obok każdego nazwiska i był tylko szumem. Kanał zostaje tam, gdzie niesie
 * informację: tablet, aplikacja mobilna, link dla klienta, automat.
 */
const SILENT_CHANNELS = new Set(['WEB_PANEL']);

/** Rola i kanał pod nazwiskiem: „klient", „Karta wizyty"; dla pracownika sam kanał. */
const actorMeta = (item: ActivityItem): string[] => {
    const meta: string[] = [];
    if (item.actor.type === 'CUSTOMER') meta.push('klient');
    // „System" jako nazwisko i „Automat" jako kanał mówią to samo - kanał wystarczy.
    if (item.channel.label && !SILENT_CHANNELS.has(item.channel.code) && item.channel.label !== item.actor.displayName) {
        meta.push(item.channel.label);
    }
    return meta;
};

// ─── component ────────────────────────────────────────────────────────────────

interface ActivityRowProps {
    item: ActivityItem;
    /** Pozostałe wpisy tego samego gestu (np. paragon i SMS przy wydaniu), od najstarszego. */
    steps?: ActivityItem[];
    stepsLabel?: string | null;
}

export const ActivityRow = ({ item, steps = [], stepsLabel = null }: ActivityRowProps) => {
    const [open, setOpen] = useState(false);
    const [stepsOpen, setStepsOpen] = useState(false);
    const navigate = useNavigate();

    /**
     * Deep-link to the reservation on the calendar. The feed knows only the
     * appointment id, so the date is resolved first: the calendar needs it to
     * jump to the right month before it can highlight the event and open its
     * summary popover (same contract as LeadListView / dashboard panels).
     */
    const goToAppointment = async (e: React.MouseEvent, appointmentId: string) => {
        e.preventDefault();
        let highlightDate = '';
        try {
            const res = await appointmentApi.getAppointment(appointmentId);
            highlightDate = res.schedule?.startDateTime ?? '';
        } catch {
            // Navigate anyway; the calendar just won't jump months.
        }
        navigate('/calendar', {
            state: { highlightEventId: appointmentId, highlightDate, openEventPopover: true },
        });
    };

    const tone = iconTone(item.icon);
    const hasChanges = item.changes.length > 0;
    const hasSteps = steps.length > 0;

    // Once a reservation has been turned into a visit it no longer exists as a
    // reservation, so linking to it would be a business error: hide the chip.
    const appointmentGone = item.action.code === 'VISIT_CREATED'
        || item.action.code === 'APPOINTMENT_CONVERTED';
    const linkable = (ref: ActivityReference) =>
        !(appointmentGone && ref.resource === 'APPOINTMENT');

    const navLinks: Array<NavTarget & { label: string }> = [];
    const seen = new Set<string>();
    const addLink = (ref: ActivityReference) => {
        if (!linkable(ref)) return;
        const target = subjectPath(ref);
        if (!target) return;
        const key = `${ref.resource}:${ref.id}`;
        if (seen.has(key)) return;
        seen.add(key);
        navLinks.push({ ...target, label: subjectLabel(ref) });
    };
    if (item.subject && !WITHOUT_SUBJECT_LINK.has(item.action.code)) addLink(item.subject);
    item.related?.forEach(addLink);

    const actorName = item.actor.type === 'CUSTOMER'
        ? <PiiText value={item.actor.displayName} kind="name" />
        : item.actor.displayName;

    return (
        <Row>
            <Time>{formatTime(item.occurredAt)}</Time>

            <IconTile $edge={tone.edge} $solid={tone.solid}>
                <ActivityIcon icon={item.icon} />
            </IconTile>

            <Body>
                <TopLine>
                    <Title><PiiText value={item.title} /></Title>
                    {item.amount && (
                        <Amount $outgoing={Number(item.amount.value) < 0}>{item.amount.display}</Amount>
                    )}
                </TopLine>

                <ActorLine>
                    <ActorName>{actorName}</ActorName>
                    {actorMeta(item).map(text => <ActorMeta key={text}>{text}</ActorMeta>)}
                </ActorLine>

                {item.description && (
                    <Description><PiiText value={item.description} /></Description>
                )}

                {hasSteps && (
                    <Steps>
                        <StepsToggle
                            type="button"
                            $open={stepsOpen}
                            aria-expanded={stepsOpen}
                            onClick={() => setStepsOpen(v => !v)}
                        >
                            <span>{stepsLabel}</span>
                            <ChevronDown />
                        </StepsToggle>
                        {stepsOpen && steps.map(step => (
                            <Step key={step.id}>
                                <time dateTime={step.occurredAt}>{formatTime(step.occurredAt)}</time>
                                <span>
                                    <PiiText value={step.title} />
                                    {step.description && <> <PiiText value={step.description} /></>}
                                </span>
                            </Step>
                        ))}
                    </Steps>
                )}

                {(navLinks.length > 0 || hasChanges) && (
                    <MetaLine>
                        {navLinks.map(({ path, appointmentId, label }) => (
                            <NavChip
                                key={`${path}-${label}`}
                                to={path}
                                onClick={appointmentId
                                    ? (e: React.MouseEvent) => { void goToAppointment(e, appointmentId); }
                                    : undefined}
                            >
                                <ExternalLink />
                                {label}
                            </NavChip>
                        ))}

                        {hasChanges && (
                            <ExpandButton
                                type="button"
                                $open={open}
                                onClick={() => setOpen(v => !v)}
                                aria-expanded={open}
                            >
                                <ChevronDown />
                                {open ? 'Ukryj szczegóły' : 'Szczegóły'}
                            </ExpandButton>
                        )}
                    </MetaLine>
                )}

                {hasChanges && open && (
                    <Changes>
                        {item.changes.map((change, index) => (
                            // Indeks, nie nazwa pola: to samo pole potrafi wystąpić dwa razy
                            // (np. dwie usługi), a zdublowany klucz Reacta gubi wiersz.
                            <ChangeRow key={`${change.field}-${index}`}>
                                <ChangeLabel>{change.label}</ChangeLabel>
                                <ChangeValues>
                                    {change.oldValueDisplay && (
                                        <>
                                            <OldValue>{change.oldValueDisplay}</OldValue>
                                            <ArrowRight />
                                        </>
                                    )}
                                    <NewValue>{change.newValueDisplay ?? '-'}</NewValue>
                                </ChangeValues>
                            </ChangeRow>
                        ))}
                    </Changes>
                )}
            </Body>
        </Row>
    );
};
