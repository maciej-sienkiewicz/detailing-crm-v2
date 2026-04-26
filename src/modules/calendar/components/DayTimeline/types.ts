import type { CalendarView as CalendarViewType, AppointmentEventData, VisitEventData } from '../../types';

export type { CalendarViewType };

export interface DayStats {
    totalEvents: number;
    visitCount: number;
    appointmentCount: number;
    totalGross: number;
    currency: string;
}

export interface DayTimelineViewProps {
    events: CalendarEvent[];
    dayStart: string;           // ISO string – the day being displayed
    calendarTitle: string;
    currentView: CalendarViewType;
    isToday: boolean;
    onEventClick: (
        eventData: AppointmentEventData | VisitEventData,
        position: { x: number; y: number }
    ) => void;
    onPrev: () => void;
    onNext: () => void;
    onToday: () => void;
    onViewChange: (view: CalendarViewType) => void;
}
