import styled, { css, keyframes } from 'styled-components';
import { PiiText } from '@/common/pii';
import type { CalendarEvent, AppointmentEventData, VisitEventData, CalendarViewType } from '../types';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const DAY_NAMES_FULL  = ['Niedziela', 'Poniedziałek', 'Wtorek', 'Środa', 'Czwartek', 'Piątek', 'Sobota'];
const DAY_NAMES_SHORT = ['Nd', 'Pn', 'Wt', 'Śr', 'Cz', 'Pt', 'Sb'];

function toLocalDate(isoStr: string): Date {
    // Parse ISO string to local date without timezone offset issues
    return new Date(isoStr);
}

function toDateKey(d: Date): string {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function formatTime(isoStr: string | undefined): string {
    if (!isoStr) return '';
    const d = toLocalDate(isoStr);
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

function startOfWeek(weekStartIso: string): Date {
    // FullCalendar with firstDay=1 (Monday) gives Monday as dateRange.start
    return toLocalDate(weekStartIso);
}

interface DaySlot {
    date: Date;
    key: string;
    isToday: boolean;
}

function buildWeekDays(weekStartIso: string): DaySlot[] {
    const today = toDateKey(new Date());
    const base  = startOfWeek(weekStartIso);
    return Array.from({ length: 7 }, (_, i) => {
        const d = new Date(base);
        d.setDate(base.getDate() + i);
        return { date: d, key: toDateKey(d), isToday: toDateKey(d) === today };
    });
}

interface EventSlot {
    event: CalendarEvent;
    dayIndex: number;  // 1-based: which day of the multi-day span this card represents
    totalDays: number; // total days the event spans
}

function groupEventsByDay(events: CalendarEvent[], days: DaySlot[]): Map<string, EventSlot[]> {
    const map = new Map<string, EventSlot[]>(days.map(d => [d.key, []]));
    const dayKeys = days.map(d => d.key);

    for (const ev of events) {
        const start = toLocalDate(ev.start as string);
        // Determine end: FullCalendar's allDay end is exclusive (next midnight),
        // for timed events use end or fallback to start
        const rawEnd = ev.end ? toLocalDate(ev.end as string) : start;

        // Build the list of calendar days this event occupies within this week
        const spanStart = new Date(start);
        spanStart.setHours(0, 0, 0, 0);
        const spanEnd = new Date(rawEnd);
        // For timed events ending exactly at midnight treat it as ending previous day
        if (!ev.allDay && spanEnd.getHours() === 0 && spanEnd.getMinutes() === 0) {
            spanEnd.setDate(spanEnd.getDate() - 1);
        }
        spanEnd.setHours(0, 0, 0, 0);

        // Collect all days this event covers
        const coveredKeys: string[] = [];
        const cursor = new Date(spanStart);
        while (cursor <= spanEnd) {
            coveredKeys.push(toDateKey(cursor));
            cursor.setDate(cursor.getDate() + 1);
        }

        const totalDays = coveredKeys.length;

        coveredKeys.forEach((key, idx) => {
            if (map.has(key) && dayKeys.includes(key)) {
                map.get(key)!.push({ event: ev, dayIndex: idx + 1, totalDays });
            }
        });
    }

    // Sort each day's slots by start time
    for (const [, slots] of map) {
        slots.sort((a, b) =>
            toLocalDate(a.event.start as string).getTime() -
            toLocalDate(b.event.start as string).getTime()
        );
    }
    return map;
}

// ─── Status helpers ───────────────────────────────────────────────────────────

const STATUS_META: Record<string, { label: string; color: string }> = {
    READY_FOR_PICKUP: { label: 'Do odbioru', color: '#10b981' },
    IN_PROGRESS:      { label: 'W trakcie',  color: '#6366f1' },
    REJECTED:         { label: 'Odrzucona',  color: '#ef4444' },
    ABANDONED:        { label: 'Porzucona',  color: '#94a3b8' },
    CANCELLED:        { label: 'Anulowana',  color: '#94a3b8' },
    ARCHIVED:         { label: 'Archiwum',   color: '#9ca3af' },
};

function isDeemphasised(status?: string) {
    return status === 'COMPLETED' || status === 'ABANDONED' || status === 'CANCELLED' || status === 'ARCHIVED';
}

function isCrossedOut(status?: string) {
    return status === 'ABANDONED' || status === 'CANCELLED';
}

// ─── Types ────────────────────────────────────────────────────────────────────

interface WeekKanbanViewProps {
    events: CalendarEvent[];
    weekStart: string;
    calendarTitle: string;
    currentView: CalendarViewType;
    onEventClick: (
        eventData: AppointmentEventData | VisitEventData,
        position: { x: number; y: number }
    ) => void;
    onDayAddClick: (date: Date) => void;
    onPrev: () => void;
    onNext: () => void;
    onToday: () => void;
    onViewChange: (view: CalendarViewType) => void;
    hideToolbar?: boolean;
}

// ─── Animations ───────────────────────────────────────────────────────────────

const fadeUp = keyframes`
    from { opacity: 0; transform: translateY(6px); }
    to   { opacity: 1; transform: translateY(0); }
`;

// ─── Styled components ────────────────────────────────────────────────────────

const Root = styled.div`
    display: flex;
    flex-direction: column;
    height: 100%;
    background: #f8fafc;
    overflow: hidden;
`;

/* ── Toolbar ── */

const Toolbar = styled.div`
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 10px 16px;
    background: rgba(255, 255, 255, 0.96);
    backdrop-filter: blur(12px);
    -webkit-backdrop-filter: blur(12px);
    border-bottom: 1px solid rgba(15, 23, 42, 0.07);
    flex-shrink: 0;
    gap: 12px;
`;

const ToolbarLeft = styled.div`
    display: flex;
    align-items: center;
    gap: 6px;
`;

const ToolbarTitle = styled.span`
    font-size: 20px;
    font-weight: 600;
    color: #0f172a;
    letter-spacing: -0.3px;
    margin: 0 10px;
    white-space: nowrap;
`;

const NavBtn = styled.button`
    width: 34px;
    height: 34px;
    border: none;
    border-radius: 50%;
    background: transparent;
    color: #1e293b;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: background 0.15s;
    flex-shrink: 0;

    &:hover { background: rgba(99, 102, 241, 0.08); color: #6366f1; }

    svg { width: 16px; height: 16px; }
`;

const TodayBtn = styled.button`
    height: 34px;
    padding: 0 14px;
    border: 1px solid rgba(15, 23, 42, 0.12);
    border-radius: 8px;
    background: #fff;
    color: #1e293b;
    font-size: 13px;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.15s;
    white-space: nowrap;

    &:hover {
        background: rgba(99, 102, 241, 0.06);
        border-color: rgba(99, 102, 241, 0.3);
        color: #6366f1;
    }
`;

const ViewSwitcher = styled.div`
    display: flex;
    border: 1px solid rgba(15, 23, 42, 0.12);
    border-radius: 8px;
    overflow: hidden;
`;

const ViewBtn = styled.button<{ $active: boolean }>`
    padding: 7px 14px;
    border: none;
    background: ${p => p.$active ? 'rgba(99, 102, 241, 0.1)' : '#fff'};
    color: ${p => p.$active ? '#6366f1' : '#1e293b'};
    font-size: 13px;
    font-weight: ${p => p.$active ? 600 : 500};
    cursor: pointer;
    transition: all 0.15s;
    border-right: 1px solid rgba(15, 23, 42, 0.08);

    &:last-child { border-right: none; }
    &:hover:not([data-active]) {
        background: rgba(99, 102, 241, 0.06);
        color: #6366f1;
    }
`;

/* ── Board ── */

const BoardScroll = styled.div`
    flex: 1;
    overflow-x: auto;
    overflow-y: hidden;
    min-height: 0;
    -webkit-overflow-scrolling: touch;

    &::-webkit-scrollbar { height: 6px; }
    &::-webkit-scrollbar-track { background: transparent; }
    &::-webkit-scrollbar-thumb { background: rgba(15, 23, 42, 0.12); border-radius: 3px; }
`;

const Board = styled.div`
    display: grid;
    grid-template-columns: repeat(7, minmax(168px, 1fr));
    height: 100%;
    min-width: 1176px;
    min-height: 0;
    align-items: stretch;
`;

/* ── Day column ── */

const DayCol = styled.div<{ $isToday: boolean }>`
    display: flex;
    flex-direction: column;
    border-right: 1px solid rgba(15, 23, 42, 0.06);
    background: ${p => p.$isToday ? 'rgba(99, 102, 241, 0.02)' : 'transparent'};
    min-height: 0;
    overflow: hidden;

    &:last-child { border-right: none; }
`;

const DayHeader = styled.div<{ $isToday: boolean }>`
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 10px 12px 9px;
    border-bottom: 2px solid ${p => p.$isToday ? '#6366f1' : 'rgba(15, 23, 42, 0.07)'};
    flex-shrink: 0;
    background: ${p => p.$isToday ? 'rgba(99, 102, 241, 0.04)' : '#fff'};
    position: sticky;
    top: 0;
    z-index: 2;
`;

const DayName = styled.span<{ $isToday: boolean }>`
    font-size: 11px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: ${p => p.$isToday ? '#6366f1' : '#64748b'};
`;

const DayDate = styled.span<{ $isToday: boolean }>`
    font-size: 22px;
    font-weight: 700;
    line-height: 1;
    color: ${p => p.$isToday ? '#6366f1' : '#0f172a'};
`;

const CountBadge = styled.span<{ $isToday: boolean }>`
    margin-left: auto;
    min-width: 20px;
    height: 20px;
    padding: 0 6px;
    border-radius: 10px;
    background: ${p => p.$isToday ? '#6366f1' : '#f1f5f9'};
    color: ${p => p.$isToday ? '#fff' : '#64748b'};
    font-size: 11px;
    font-weight: 700;
    display: flex;
    align-items: center;
    justify-content: center;
`;

const CardList = styled.div`
    flex: 1;
    overflow-y: auto;
    padding: 8px 8px 16px;
    display: flex;
    flex-direction: column;
    gap: 6px;

    &::-webkit-scrollbar { width: 4px; }
    &::-webkit-scrollbar-track { background: transparent; }
    &::-webkit-scrollbar-thumb { background: rgba(15, 23, 42, 0.1); border-radius: 2px; }
`;

const EmptySlot = styled.div`
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 20px 0;
    color: rgba(100, 116, 139, 0.35);
    font-size: 12px;
    font-weight: 500;
    letter-spacing: 0.04em;
`;

/* ── Event card ── */

const Card = styled.div<{
    $accentColor: string;
    $deemphasised: boolean;
    $isAllDay: boolean;
    $isVisit: boolean;
}>`
    position: relative;
    background: ${p => p.$isVisit ? p.$accentColor : '#fff'};
    border-radius: 8px;
    border-left: 3px solid ${p => p.$isVisit ? 'rgba(0, 0, 0, 0.12)' : p.$accentColor};
    box-shadow: 0 1px 3px rgba(15, 23, 42, 0.07), 0 0 0 1px rgba(15, 23, 42, 0.05);
    padding: 8px 10px 8px 9px;
    cursor: pointer;
    transition: box-shadow 0.15s, transform 0.15s;
    opacity: ${p => p.$deemphasised ? 0.5 : 1};
    animation: ${fadeUp} 0.18s ease both;

    ${p => p.$isAllDay && css`
        border-left-width: 0;
        border-top: 3px solid ${p.$accentColor};
        background: ${p.$accentColor}14;
    `}

    ${p => p.$isVisit && css`
        && * {
            color: rgba(255, 255, 255, 0.9);
        }
    `}

    &:hover {
        box-shadow: 0 4px 12px rgba(15, 23, 42, 0.12), 0 0 0 1px rgba(15, 23, 42, 0.08);
        transform: translateY(-1px);
    }
`;

const CardTime = styled.div`
    font-size: 10px;
    font-weight: 600;
    color: #94a3b8;
    letter-spacing: 0.04em;
    margin-bottom: 3px;
`;

const CardTitle = styled.div<{ $crossedOut: boolean }>`
    font-size: 13px;
    font-weight: 700;
    color: #0f172a;
    line-height: 1.3;
    margin-bottom: 2px;
    text-decoration: ${p => p.$crossedOut ? 'line-through' : 'none'};
    overflow: hidden;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
`;

const CardMeta = styled.div`
    font-size: 11px;
    color: #64748b;
    line-height: 1.4;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
`;

const CardFooter = styled.div`
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-top: 5px;
    gap: 4px;
`;

const CardServiceTag = styled.span`
    font-size: 10px;
    color: #64748b;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    flex: 1;
    min-width: 0;
`;

const CardStatusBadge = styled.span<{ $color: string }>`
    flex-shrink: 0;
    font-size: 9px;
    font-weight: 700;
    letter-spacing: 0.05em;
    padding: 2px 5px;
    border-radius: 4px;
    background: ${p => p.$color}20;
    color: ${p => p.$color};
    border: 1px solid ${p => p.$color}40;
    text-transform: uppercase;
`;

const ContinuationBadge = styled.div<{ $color: string }>`
    display: flex;
    align-items: center;
    gap: 4px;
    font-size: 10px;
    font-weight: 600;
    color: ${p => p.$color};
    margin-bottom: 4px;
    opacity: 0.8;
`;

// ─── Event Card Component ─────────────────────────────────────────────────────

interface EventCardProps {
    slot: EventSlot;
    onClick: (e: React.MouseEvent) => void;
}

const EventCard = ({ slot, onClick }: EventCardProps) => {
    const { event, dayIndex, totalDays } = slot;
    const props  = event.extendedProps as AppointmentEventData | VisitEventData;
    const status = props.status as string | undefined;
    const isAllDay     = event.allDay ?? false;
    const deemphasised = isDeemphasised(status);
    const crossedOut   = isCrossedOut(status);
    const isMultiDay   = totalDays > 1;
    const accentColor  = event.backgroundColor as string;

    // Show time only on the first day; continuation days show a ▶ indicator
    const startTime = (isAllDay || dayIndex > 1) ? '' : formatTime(event.start as string);
    const endTime   = (isAllDay || dayIndex > 1) ? '' : formatTime(event.end as string | undefined);
    const timeLabel = startTime ? (endTime ? `${startTime} – ${endTime}` : startTime) : '';

    const serviceLabel = props.type === 'APPOINTMENT'
        ? props.serviceNames?.join(', ')
        : props.type === 'VISIT'
            ? props.visitNumber
            : '';

    const statusMeta = status ? STATUS_META[status] : undefined;
    const showBadge  = !!statusMeta && status !== 'IN_PROGRESS';

    return (
        <Card
            $accentColor={accentColor}
            $deemphasised={deemphasised}
            $isAllDay={isAllDay}
            $isVisit={props.type === 'VISIT' && !deemphasised}
            onClick={onClick}
            title={event.title}
        >
            {isMultiDay && (
                <ContinuationBadge $color={accentColor}>
                    {dayIndex === 1 ? (
                        <>
                            <svg width="9" height="9" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M8 5v14l11-7z"/>
                            </svg>
                            start · {totalDays} dni
                        </>
                    ) : dayIndex === totalDays ? (
                        <>
                            <svg width="9" height="9" viewBox="0 0 24 24" fill="currentColor">
                                <rect x="6" y="5" width="4" height="14"/><rect x="14" y="5" width="4" height="14"/>
                            </svg>
                            koniec · dzień {dayIndex}/{totalDays}
                        </>
                    ) : (
                        <>
                            <svg width="9" height="9" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M8 5v14l11-7z"/>
                            </svg>
                            dzień {dayIndex}/{totalDays}
                        </>
                    )}
                </ContinuationBadge>
            )}

            {timeLabel && <CardTime>{timeLabel}</CardTime>}

            <CardTitle $crossedOut={crossedOut}>
                <PiiText value={event.title} kind="name" />
            </CardTitle>

            {props.customerPhone && (
                <CardMeta>{props.customerPhone}</CardMeta>
            )}

            {(serviceLabel || showBadge) && (
                <CardFooter>
                    {serviceLabel && <CardServiceTag>{serviceLabel}</CardServiceTag>}
                    {showBadge && statusMeta && (
                        <CardStatusBadge $color={statusMeta.color}>
                            {statusMeta.label}
                        </CardStatusBadge>
                    )}
                </CardFooter>
            )}
        </Card>
    );
};

// ─── Main Component ───────────────────────────────────────────────────────────

const VIEW_LABELS: { view: CalendarViewType; label: string }[] = [
    { view: 'timeGridDay',  label: 'Dzień'   },
    { view: 'timeGridWeek', label: 'Tydzień' },
    { view: 'dayGridMonth', label: 'Miesiąc' },
];

export const WeekKanbanView = ({
    events,
    weekStart,
    calendarTitle,
    currentView,
    onEventClick,
    onDayAddClick,
    onPrev,
    onNext,
    onToday,
    onViewChange,
    hideToolbar = false,
}: WeekKanbanViewProps) => {
    const days    = buildWeekDays(weekStart);
    const byDay   = groupEventsByDay(events, days);

    const handleCardClick = (slot: EventSlot, e: React.MouseEvent) => {
        const { event } = slot;
        const props = event.extendedProps as AppointmentEventData | VisitEventData;
        const rect  = (e.currentTarget as HTMLElement).getBoundingClientRect();
        const popoverWidth = window.innerHeight <= 800 ? 340 : 380;
        const margin = 16;

        let x = rect.right + 10;
        if (x + popoverWidth + margin > window.innerWidth) {
            x = Math.max(margin, rect.left - popoverWidth - 10);
        }
        let y = rect.top;
        if (y + 580 + margin > window.innerHeight) {
            y = Math.max(margin, window.innerHeight - 580 - margin);
        }

        onEventClick(props, { x, y });
    };

    return (
        <Root>
            {!hideToolbar && (
                <Toolbar>
                    <ToolbarLeft>
                        <NavBtn onClick={onPrev} aria-label="Poprzedni tydzień">
                            <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
                            </svg>
                        </NavBtn>
                        <NavBtn onClick={onNext} aria-label="Następny tydzień">
                            <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                            </svg>
                        </NavBtn>
                        <TodayBtn onClick={onToday}>Dzisiaj</TodayBtn>
                        <ToolbarTitle>{calendarTitle}</ToolbarTitle>
                    </ToolbarLeft>

                    <ViewSwitcher>
                        {VIEW_LABELS.map(({ view, label }) => (
                            <ViewBtn
                                key={view}
                                $active={currentView === view}
                                onClick={() => onViewChange(view)}
                            >
                                {label}
                            </ViewBtn>
                        ))}
                    </ViewSwitcher>
                </Toolbar>
            )}

            {/* Board */}
            <BoardScroll>
                <Board>
                    {days.map((day) => {
                        const dayEvents = byDay.get(day.key) ?? [];
                        const dow = day.date.getDay();
                        return (
                            <DayCol key={day.key} $isToday={day.isToday}>
                                <DayHeader $isToday={day.isToday}>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
                                        <DayName $isToday={day.isToday}>
                                            {DAY_NAMES_SHORT[dow]}
                                        </DayName>
                                        <DayDate $isToday={day.isToday}>
                                            {day.date.getDate()}
                                        </DayDate>
                                    </div>
                                    <CountBadge $isToday={day.isToday} title={`${dayEvents.length} zdarzeń`}>
                                        {dayEvents.length}
                                    </CountBadge>
                                </DayHeader>

                                <CardList>
                                    {dayEvents.length === 0 ? (
                                        <EmptySlot>—</EmptySlot>
                                    ) : (
                                        dayEvents.map(slot => (
                                            <EventCard
                                                key={`${slot.event.id}-${slot.dayIndex}`}
                                                slot={slot}
                                                onClick={(e) => handleCardClick(slot, e)}
                                            />
                                        ))
                                    )}
                                </CardList>
                            </DayCol>
                        );
                    })}
                </Board>
            </BoardScroll>
        </Root>
    );
};
