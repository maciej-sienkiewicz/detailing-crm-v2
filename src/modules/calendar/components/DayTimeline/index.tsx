import { useEffect, useRef, useState } from 'react';
import type { CalendarEvent, AppointmentEventData, VisitEventData } from '../../types';
import { CalendarToolbar } from '../shared/CalendarToolbar';
import { StatsStrip } from './StatsStrip';
import { EventCard } from './EventCard';
import {
    Root, AllDayStrip, AllDayChip,
    TimelineScroll, TimelineGrid,
    TimeCol, HourLabel,
    EventsArea, HourLine, NowLine,
} from './styles';
import {
    HOUR_HEIGHT, HOUR_LABELS, TIMELINE_PX,
    DAY_START_H, MINS_TO_PX,
    layoutTimedEvents, computeDayStats, nowTopPx, isWithinTimeline, nowMinutes,
} from './layout';
import type { DayTimelineViewProps } from './types';

// Scroll target: 1 hour before current time, or 7:00 if today is not current day
function initialScrollPx(isToday: boolean): number {
    if (isToday) {
        const target = nowMinutes() - 60;
        return Math.max(0, (target - DAY_START_H * 60) * MINS_TO_PX);
    }
    // Default: show 7:00
    return (7 - DAY_START_H) * HOUR_HEIGHT;
}

export const DayTimelineView = ({
    events,
    dayStart,
    calendarTitle,
    currentView,
    isToday,
    onEventClick,
    onPrev,
    onNext,
    onToday,
    onViewChange,
}: DayTimelineViewProps) => {
    const scrollRef = useRef<HTMLDivElement>(null);
    const [nowPx, setNowPx] = useState(() => nowTopPx());

    // Scroll to sensible initial position once
    useEffect(() => {
        const el = scrollRef.current;
        if (!el) return;
        el.scrollTop = initialScrollPx(isToday);
    // Only run when the day changes (dayStart) or on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [dayStart]);

    // Keep now-indicator in sync; refresh every minute
    useEffect(() => {
        const tick = () => setNowPx(nowTopPx());
        const id = window.setInterval(tick, 60_000);
        return () => window.clearInterval(id);
    }, []);

    const allDayEvents  = events.filter(ev => ev.allDay);
    const timedEvents   = events.filter(ev => !ev.allDay);
    const placed        = layoutTimedEvents(timedEvents);
    const stats         = computeDayStats(events);
    const showNow       = isToday && isWithinTimeline(nowMinutes());

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

            {allDayEvents.length > 0 && (
                <AllDayStrip>
                    {allDayEvents.map(ev => (
                        <AllDayChip
                            key={ev.id}
                            $color={ev.backgroundColor as string}
                            onClick={(e) => {
                                const props = ev.extendedProps as AppointmentEventData | VisitEventData;
                                handleCardClick(e, props);
                            }}
                        >
                            {ev.title}
                        </AllDayChip>
                    ))}
                </AllDayStrip>
            )}

            <TimelineScroll ref={scrollRef}>
                <TimelineGrid $totalPx={TIMELINE_PX}>
                    {/* Hour labels & horizontal lines */}
                    <TimeCol>
                        {HOUR_LABELS.map((label, i) => (
                            <HourLabel key={label} $topPx={i * HOUR_HEIGHT}>
                                {label}
                            </HourLabel>
                        ))}
                    </TimeCol>

                    <EventsArea>
                        {/* Hour lines */}
                        {HOUR_LABELS.map((label, i) => (
                            <HourLine key={label} $topPx={i * HOUR_HEIGHT} />
                        ))}
                        {/* Half-hour lines */}
                        {HOUR_LABELS.slice(0, -1).map((label, i) => (
                            <HourLine
                                key={`h-${label}`}
                                $topPx={i * HOUR_HEIGHT + HOUR_HEIGHT / 2}
                                $isHalf
                            />
                        ))}

                        {/* Now indicator */}
                        {showNow && <NowLine $topPx={nowPx} />}

                        {/* Timed event cards */}
                        {placed.map((p, idx) => (
                            <EventCard
                                key={`${p.event.id}-${idx}`}
                                placed={p}
                                onClick={(e) => {
                                    const props = p.event.extendedProps as AppointmentEventData | VisitEventData;
                                    handleCardClick(e, props);
                                }}
                            />
                        ))}
                    </EventsArea>
                </TimelineGrid>
            </TimelineScroll>
        </Root>
    );
};
