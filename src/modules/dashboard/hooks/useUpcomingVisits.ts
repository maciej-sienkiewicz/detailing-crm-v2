import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { calendarApi } from '@/modules/calendar/api/calendarApi';
import type { AppointmentEventData, VisitEventData } from '@/modules/calendar/types';
import type { UpcomingVisit, VisitStatusKind } from '../types';

const isSameLocalDay = (a: Date, b: Date) =>
  a.getFullYear() === b.getFullYear() &&
  a.getMonth() === b.getMonth() &&
  a.getDate() === b.getDate();

const toLocalDateISO = (d: Date): string => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

export const useUpcomingVisits = () => {
  const { dateRange, today, tomorrow } = useMemo(() => {
    const now = new Date();
    const tom = new Date(now);
    tom.setDate(tom.getDate() + 1);
    return {
      dateRange: {
        start: `${toLocalDateISO(now)}T00:00:00`,
        end: `${toLocalDateISO(tom)}T23:59:59`,
      },
      today: now,
      tomorrow: tom,
    };
  }, []);

  return useQuery({
    queryKey: ['dashboard', 'upcoming-visits', dateRange.start],
    queryFn: async (): Promise<UpcomingVisit[]> => {
      const events = await calendarApi.getCalendarEvents(
        dateRange,
        ['CREATED'],
        ['IN_PROGRESS', 'READY_FOR_PICKUP'],
      );

      return events
        .sort((a, b) => (a.start < b.start ? -1 : 1))
        .map(event => {
          const props = event.extendedProps;
          const isVisit = props.type === 'VISIT';
          const visitProps = props as VisitEventData;
          const apptProps = props as AppointmentEventData;

          const startDate = new Date(event.start);

          const time = event.allDay
            ? ''
            : startDate.toLocaleTimeString('pl-PL', {
                hour: '2-digit',
                minute: '2-digit',
                hour12: false,
              });

          let dateLabel: string;
          if (isSameLocalDay(startDate, today)) dateLabel = 'dziś';
          else if (isSameLocalDay(startDate, tomorrow)) dateLabel = 'jutro';
          else dateLabel = startDate.toLocaleDateString('pl-PL', { day: '2-digit', month: '2-digit' });

          let serviceName: string;
          let statusKind: VisitStatusKind;
          let statusLabel: string;

          if (isVisit) {
            serviceName = event.title;
            if (visitProps.status === 'IN_PROGRESS') {
              statusKind = 'info';
              statusLabel = 'W trakcie';
            } else {
              statusKind = 'success';
              statusLabel = 'Gotowa';
            }
          } else {
            serviceName =
              apptProps.appointmentTitle ||
              apptProps.serviceNames.slice(0, 2).join(', ') ||
              'Rezerwacja';
            statusKind = dateLabel === 'dziś' ? 'warn' : 'neutral';
            statusLabel = dateLabel === 'dziś' ? 'Oczekująca' : 'Zaplanowana';
          }

          return {
            id: event.id,
            time,
            dateLabel,
            serviceName,
            customerName: props.customerName,
            vehicleName: props.vehicleInfo,
            // calendar API stores prices in minor units (groszy) → convert to PLN
            price: (props.totalPrice ?? 0) / 100,
            statusKind,
            statusLabel,
          };
        });
    },
    staleTime: 2 * 60 * 1000,
  });
};
