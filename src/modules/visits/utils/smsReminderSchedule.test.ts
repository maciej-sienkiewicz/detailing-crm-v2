// Przypomnienie przy wizycie: zapis w oknie wizyty nie może po cichu przestawiać godziny
// ustawionej wcześniej w „Zaplanowanych".
import { describe, expect, it } from 'vitest';
import { daysFromNowForDate, reminderScheduledFor, scheduledDateFromDays } from './smsReminderSchedule';

const now = new Date(2026, 9, 24, 9, 30); // 24.10.2026, 9:30 czasu lokalnego

describe('reminderScheduledFor', () => {
    it('nowe przypomnienie wychodzi o 16:00 wybranego dnia', () => {
        const d = new Date(reminderScheduledFor(90, null, now));
        expect(d.getHours()).toBe(16);
        expect(d.getMinutes()).toBe(0);
        expect(daysFromNowForDate(d.toISOString(), now)).toBe(90);
    });

    it('edycja bez zmiany dnia zostawia termin co do minuty', () => {
        const existing = new Date(2026, 11, 1, 13, 20).toISOString();
        expect(reminderScheduledFor(daysFromNowForDate(existing, now), existing, now)).toBe(existing);
    });

    it('zmiana dnia zachowuje godzinę ustawioną wcześniej', () => {
        const existing = new Date(2026, 11, 1, 13, 20).toISOString();
        const d = new Date(reminderScheduledFor(10, existing, now));
        expect(d.getHours()).toBe(13);
        expect(d.getMinutes()).toBe(20);
        expect(d.getDate()).toBe(scheduledDateFromDays(10, now).getDate());
    });
});
