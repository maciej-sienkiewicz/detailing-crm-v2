// src/modules/calendar/index.ts

export { CalendarPageView } from './views/CalendarPageView';
export { CalendarView } from './components/CalendarView';
export { EventTooltip } from './components/EventTooltip';
export { QuickEventModal } from './components/QuickEventModal';
export { useCalendarEvents } from './hooks/useCalendarEvents';
export { useEventCreation } from './hooks/useEventCreation';
export { useQuickEventCreation } from './hooks/useQuickEventCreation';
export { calendarApi } from './api/calendarApi';
export type * from './types';
