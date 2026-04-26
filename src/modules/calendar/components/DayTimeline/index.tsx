import type { CalendarEvent, AppointmentEventData, VisitEventData } from '../../types';
import { CalendarToolbar } from '../shared/CalendarToolbar';
import { StatsStrip } from './StatsStrip';
import { EventCard } from './EventCard';
import {
    Root, Board, KanbanCol, ColHeader, ColDot, ColTitle, ColCount,
    CardList, EmptyCol,
} from './styles';
import { computeDayStats } from './layout';
import type { DayTimelineViewProps } from './types';

// ─── Status column definitions ────────────────────────────────────────────────

interface ColumnDef {
    id: string;
    label: string;
    color: string;
    match: (type: string, status: string | undefined) => boolean;
}

const COLUMNS: ColumnDef[] = [
    {
        id: 'reservation',
        label: 'Rezerwacja',
        color: '#6366f1',
        match: (type) => type === 'APPOINTMENT',
    },
    {
        id: 'in_progress',
        label: 'W trakcie realizacji',
        color: '#f59e0b',
        match: (type, status) => type === 'VISIT' && status === 'IN_PROGRESS',
    },
    {
        id: 'ready',
        label: 'Gotowe do odbioru',
        color: '#10b981',
        match: (type, status) => type === 'VISIT' && status === 'READY_FOR_PICKUP',
    },
    {
        id: 'completed',
        label: 'Oddane',
        color: '#64748b',
        match: (type, status) =>
            type === 'VISIT' && (status === 'COMPLETED' || status === 'ARCHIVED' || status === 'REJECTED'),
    },
];

// ─── Event grouping ───────────────────────────────────────────────────────────

function groupByStatus(events: CalendarEvent[]): Map<string, CalendarEvent[]> {
    const map = new Map<string, CalendarEvent[]>(COLUMNS.map(c => [c.id, []]));

    for (const ev of events) {
        const props  = ev.extendedProps as { type: string; status?: string };
        const col    = COLUMNS.find(c => c.match(props.type, props.status));
        if (col) map.get(col.id)!.push(ev);
    }

    // Sort each column by start time
    for (const [, list] of map) {
        list.sort((a, b) =>
            new Date(a.start as string).getTime() - new Date(b.start as string).getTime()
        );
    }

    return map;
}

// ─── Component ────────────────────────────────────────────────────────────────

export const DayTimelineView = ({
    events,
    calendarTitle,
    currentView,
    onEventClick,
    onPrev,
    onNext,
    onToday,
    onViewChange,
}: DayTimelineViewProps) => {
    const stats  = computeDayStats(events);
    const byCol  = groupByStatus(events);

    const handleCardClick = (e: React.MouseEvent, eventData: AppointmentEventData | VisitEventData) => {
        const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
        const popoverWidth = 380;
        const margin = 16;

        let x = rect.right + 10;
        if (x + popoverWidth + margin > window.innerWidth) {
            x = Math.max(margin, rect.left - popoverWidth - 10);
        }
        let y = rect.top;
        if (y + 520 + margin > window.innerHeight) {
            y = Math.max(margin, window.innerHeight - 520 - margin);
        }

        onEventClick(eventData, { x, y });
    };

    return (
        <Root>
            <CalendarToolbar
                title={calendarTitle}
                currentView={currentView}
                onPrev={onPrev}
                onNext={onNext}
                onToday={onToday}
                onViewChange={onViewChange}
                prevAriaLabel="Poprzedni dzień"
                nextAriaLabel="Następny dzień"
            />

            <StatsStrip stats={stats} />

            <Board>
                {COLUMNS.map(col => {
                    const colEvents = byCol.get(col.id) ?? [];
                    return (
                        <KanbanCol key={col.id}>
                            <ColHeader $color={col.color}>
                                <ColDot $color={col.color} />
                                <ColTitle>{col.label}</ColTitle>
                                <ColCount $color={col.color} $active={colEvents.length > 0}>
                                    {colEvents.length}
                                </ColCount>
                            </ColHeader>

                            <CardList>
                                {colEvents.length === 0 ? (
                                    <EmptyCol>—</EmptyCol>
                                ) : (
                                    colEvents.map(ev => (
                                        <EventCard
                                            key={ev.id}
                                            event={ev}
                                            onClick={(e) => {
                                                const props = ev.extendedProps as AppointmentEventData | VisitEventData;
                                                handleCardClick(e, props);
                                            }}
                                        />
                                    ))
                                )}
                            </CardList>
                        </KanbanCol>
                    );
                })}
            </Board>
        </Root>
    );
};
