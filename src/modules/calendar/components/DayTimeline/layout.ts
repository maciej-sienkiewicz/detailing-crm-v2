import type { CalendarEvent } from '../../types';
import type { DayStats } from './types';

export function formatTime(isoStr: string | undefined): string {
    if (!isoStr) return '';
    const d = new Date(isoStr);
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

export function formatPrice(amount: number, currency: string): string {
    return new Intl.NumberFormat('pl-PL', { style: 'currency', currency, maximumFractionDigits: 0 })
        .format(amount);
}

export function computeDayStats(events: CalendarEvent[]): DayStats {
    let totalGross = 0;
    let visitCount = 0;
    let appointmentCount = 0;

    for (const ev of events) {
        const props = ev.extendedProps as { type: string; totalPrice?: number };
        if (props.type === 'VISIT') visitCount++;
        else appointmentCount++;
        totalGross += props.totalPrice ?? 0;
    }

    return { totalEvents: events.length, visitCount, appointmentCount, totalGross, currency: 'PLN' };
}
