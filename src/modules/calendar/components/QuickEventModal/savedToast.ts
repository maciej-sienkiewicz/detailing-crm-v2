// src/modules/calendar/components/QuickEventModal/savedToast.ts
//
// Dymek po zapisie rezerwacji z kalendarza. Wcześniej okno po prostu znikało - usunięcie,
// porzucenie czy przywrócenie rezerwacji kończyło się dymkiem, a jej założenie nie.
// Tytuł mówi, CO się stało, treść - dla kogo i kiedy (CLAUDE.md §4: bez „·").

import type { QuickEventFormData } from './types';

const dayLabel = (isoDate: string, weekday = true): string => {
    const [y, m, d] = isoDate.slice(0, 10).split('-').map(Number);
    if (!y || !m || !d) return isoDate;
    return new Date(y, m - 1, d).toLocaleDateString('pl-PL', weekday
        ? { weekday: 'long', day: 'numeric', month: 'long' }
        : { day: 'numeric', month: 'long' });
};

const timeOf = (iso: string): string | null => (iso.includes('T') ? iso.slice(11, 16) : null);

export const savedReservationToast = (data: QuickEventFormData): { title: string; message: string } => {
    const c = data.customer;
    const who = [c?.firstName, c?.lastName].map(s => (s ?? '').trim()).filter(Boolean).join(' ')
        || (c?.phone ?? '').trim() || (c?.email ?? '').trim();

    const startDay = data.startDateTime.slice(0, 10);
    const endDay = data.endDateTime.slice(0, 10);
    let when: string;
    if (data.isAllDay && startDay === endDay) {
        when = `${dayLabel(startDay)}, cały dzień`;
    } else if (startDay === endDay) {
        when = `${dayLabel(startDay)}, ${timeOf(data.startDateTime) ?? ''}–${timeOf(data.endDateTime) ?? ''}`;
    } else {
        when = `${dayLabel(startDay, false)} – ${dayLabel(endDay, false)}`;
    }

    return {
        title: data.recurrence ? 'Seria rezerwacji zapisana' : 'Rezerwacja zapisana',
        message: [who, data.recurrence ? `pierwsza: ${when}` : when].filter(Boolean).join(', '),
    };
};
