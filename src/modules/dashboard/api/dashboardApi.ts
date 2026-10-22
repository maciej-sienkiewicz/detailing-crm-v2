/**
 * Dashboard API
 * Handles data fetching for dashboard statistics and metrics
 */

import type { DashboardData, UpcomingVisit, VisitStatusKind, DashboardRevenueSummary, DashboardReservationSummary } from '../types';
import { vehicleLabel } from './vehicleLabel';
import type { AppointmentResponse, VisitResponse } from '@/modules/calendar/types';
import { apiClient } from '@/core';
import { joinPiiName } from '@/common/pii';
import { hasClockTime } from '@/common/dateTime';

/**
 * Dashboard API methods
 */
export const dashboardApi = {
  /**
   * Fetches current dashboard statistics and metrics
   * @returns Promise resolving to dashboard data
   */
  getStats: async (): Promise<DashboardData> => {
    const response = await apiClient.get('/v1/dashboard/stats');
    const data = response.data as DashboardData;
    return {
      ...data,
      stats: {
        ...data.stats,
        abandonedDetails: data.stats?.abandonedDetails ?? [],
      },
    };
  },

  getRevenueSummary: async (months = 12): Promise<DashboardRevenueSummary> => {
    const response = await apiClient.get<DashboardRevenueSummary>(
      '/v1/dashboard/revenue-summary',
      { params: { months } },
    );
    return response.data;
  },

  getReservationSummary: async (months = 12): Promise<DashboardReservationSummary> => {
    const response = await apiClient.get<DashboardReservationSummary>(
      '/v1/dashboard/reservation-summary',
      { params: { months } },
    );
    return response.data;
  },

  /**
   * Fetches upcoming appointments (CREATED) and active visits (IN_PROGRESS, READY_FOR_PICKUP)
   * for today and tomorrow, using the unified calendar events endpoint.
   */
  getUpcomingEvents: async (startDate: string, endDate: string): Promise<UpcomingVisit[]> => {
    const response = await apiClient.get<{ appointments: AppointmentResponse[]; visits: VisitResponse[] }>(
      '/v1/calendar/events',
      {
        params: {
          startDate,
          endDate,
          appointmentStatuses: 'CREATED',
          visitStatuses: 'IN_PROGRESS,READY_FOR_PICKUP',
        },
      },
    );

    const { appointments, visits } = response.data;

    const localDateStr = (d: Date): string => {
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${y}-${m}-${day}`;
    };
    const todayIso = startDate.slice(0, 10);
    const tomorrowDate = new Date(startDate);
    tomorrowDate.setDate(tomorrowDate.getDate() + 1);
    const tomorrowIso = localDateStr(tomorrowDate);
    const yesterdayDate = new Date(startDate);
    yesterdayDate.setDate(yesterdayDate.getDate() - 1);
    const yesterdayIso = localDateStr(yesterdayDate);

    const toLocalDay = (iso: string): string => {
      const d = new Date(iso);
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${y}-${m}-${day}`;
    };

    const dateLabel = (iso: string): string => {
      const day = toLocalDay(iso);
      if (day === todayIso) return 'DZISIAJ';
      if (day === tomorrowIso) return 'JUTRO';
      if (day === yesterdayIso) return 'WCZORAJ';
      return new Date(iso).toLocaleDateString('pl-PL', { day: '2-digit', month: '2-digit' });
    };

    const timeLabel = (iso: string, isAllDay: boolean): string => {
      if (isAllDay) return '';
      return new Date(iso).toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit', hour12: false });
    };

    type Entry = { sortKey: string; item: UpcomingVisit };

    const appointmentEntries: Entry[] = appointments.map(a => {
      const label = dateLabel(a.schedule.startDateTime);
      const statusKind: VisitStatusKind = label === 'DZISIAJ' ? 'warn' : 'neutral';
      return {
        sortKey: a.schedule.startDateTime,
        item: {
          id: a.id,
          type: 'RESERVATION' as const,
          time: timeLabel(a.schedule.startDateTime, a.schedule.isAllDay),
          dateLabel: label,
          isoDate: toLocalDay(a.schedule.startDateTime),
          serviceName: a.appointmentTitle || a.services.map(s => s.serviceName).slice(0, 2).join(', ') || 'Rezerwacja',
          customerName: joinPiiName(a.customer?.firstName, a.customer?.lastName),
          vehicleName: vehicleLabel(a.vehicle),
          price: (a.totalGross ?? 0) / 100,
          priceNetto: (a.totalNet ?? 0) / 100,
          statusKind,
          statusLabel: label === 'DZISIAJ' ? 'Zaplanowana' : 'Zaplanowana',
        },
      };
    });

    const visitEntries: Entry[] = visits.map(v => {
      const statusKind: VisitStatusKind = v.status === 'IN_PROGRESS' ? 'info' : 'success';
      return {
        sortKey: v.scheduledDate,
        item: {
          id: v.id,
          type: 'VISIT' as const,
          // Wizyta nie ma flagi „cały dzień" - północ w terminie ją zastępuje.
          time: timeLabel(v.scheduledDate, !hasClockTime(v.scheduledDate)),
          dateLabel: dateLabel(v.scheduledDate),
          isoDate: toLocalDay(v.scheduledDate),
          serviceName: v.title || v.visitNumber,
          customerName: joinPiiName(v.customer?.firstName, v.customer?.lastName),
          vehicleName: vehicleLabel(v.vehicle),
          price: (v.totalGross ?? 0) / 100,
          priceNetto: (v.totalNet ?? 0) / 100,
          statusKind,
          statusLabel: v.status === 'IN_PROGRESS' ? 'W trakcie' : 'Gotowa',
        },
      };
    });

    return [...appointmentEntries, ...visitEntries]
      .sort((a, b) => (a.sortKey < b.sortKey ? -1 : 1))
      .map(e => e.item);
  },
};
