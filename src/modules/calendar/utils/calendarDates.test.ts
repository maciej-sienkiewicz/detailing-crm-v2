import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { localDateKey, nextDateKey, toFullCalendarEvent } from './calendarDates';
import type { AppointmentEventData, CalendarEvent } from '../types';

/*
 * Kalendarz rysuje w strefie przeglądarki, a błąd widać tylko poza UTC: w UTC północ
 * lokalna i północ UTC to ta sama chwila. Testy ustawiają więc czas polski i przywracają
 * po sobie strefę, w której zostały uruchomione.
 */
const originalTz = process.env.TZ;
beforeAll(() => { process.env.TZ = 'Europe/Warsaw'; });
afterAll(() => {
    if (originalTz === undefined) delete process.env.TZ;
    else process.env.TZ = originalTz;
});

/** Rezerwacja „LIDL - BMW 5" ze zgłoszenia: całodniowa, 24-28.09.2026 czasu polskiego. */
const allDayReservation = (start: string, end: string | undefined): CalendarEvent => ({
    id: '792485a0-942e-4f04-af98-3651fe8a65ea',
    title: 'LIDL - BMW 5, pełne zabezpieczenie',
    start,
    end,
    allDay: true,
    backgroundColor: '#cd4242',
    borderColor: 'transparent',
    textColor: '#ffffff',
    extendedProps: { id: '792485a0-942e-4f04-af98-3651fe8a65ea', type: 'APPOINTMENT' } as AppointmentEventData,
});

describe('strefa testów', () => {
    it('to czas polski - inaczej reszta testów niczego by nie sprawdzała', () => {
        expect(new Date('2026-09-23T22:00:00Z').getHours()).toBe(0);
    });
});

describe('localDateKey - dzień lokalny, nie dzień z zapisu UTC', () => {
    it('północ czasu letniego to 22:00Z dnia poprzedniego', () => {
        expect(localDateKey('2026-09-23T22:00:00Z')).toBe('2026-09-24');
    });

    it('północ czasu zimowego to 23:00Z dnia poprzedniego', () => {
        expect(localDateKey('2026-01-14T23:00:00Z')).toBe('2026-01-15');
    });

    it('przyjmuje też obiekt Date', () => {
        expect(localDateKey(new Date('2026-09-28T21:45:00Z'))).toBe('2026-09-28');
    });
});

describe('nextDateKey', () => {
    it('przechodzi przez koniec miesiąca i roku', () => {
        expect(nextDateKey('2026-09-30')).toBe('2026-10-01');
        expect(nextDateKey('2026-12-31')).toBe('2027-01-01');
    });

    it('dni zmiany czasu mają 23 i 25 godzin, a następny dzień i tak jest jeden', () => {
        expect(nextDateKey('2026-03-29')).toBe('2026-03-30');
        expect(nextDateKey('2026-10-25')).toBe('2026-10-26');
    });
});

describe('toFullCalendarEvent - koniec całodniowej rezerwacji dla FullCalendar', () => {
    it('rezerwacja 24-28.09 zajmuje w siatce 24-28.09 (koniec wyłączny = 29.09)', () => {
        const event = toFullCalendarEvent(allDayReservation('2026-09-23T22:00:00Z', '2026-09-28T21:45:00Z'));
        expect(event.start).toBe('2026-09-24');
        expect(event.end).toBe('2026-09-29');
    });

    it('koniec o 23:59:59 ostatniego dnia - ten sam ostatni dzień', () => {
        const event = toFullCalendarEvent(allDayReservation('2026-09-23T22:00:00Z', '2026-09-28T21:59:59Z'));
        expect(event.end).toBe('2026-09-29');
    });

    it('rezerwacja jednodniowa zajmuje jeden dzień', () => {
        const event = toFullCalendarEvent(allDayReservation('2026-09-23T22:00:00Z', '2026-09-24T21:59:59Z'));
        expect(event.start).toBe('2026-09-24');
        expect(event.end).toBe('2026-09-25');
    });

    it('przez zmianę czasu (koniec już w czasie zimowym)', () => {
        const event = toFullCalendarEvent(allDayReservation('2026-10-22T22:00:00Z', '2026-10-27T22:59:59Z'));
        expect(event.start).toBe('2026-10-23');
        expect(event.end).toBe('2026-10-28');
    });

    it('bez końca albo z końcem przed początkiem - jeden dzień', () => {
        expect(toFullCalendarEvent(allDayReservation('2026-09-23T22:00:00Z', undefined)).end).toBe('2026-09-25');
        expect(toFullCalendarEvent(allDayReservation('2026-09-23T22:00:00Z', '2026-09-20T10:00:00Z')).end).toBe('2026-09-25');
    });

    it('zachowuje resztę wydarzenia', () => {
        const input = allDayReservation('2026-09-23T22:00:00Z', '2026-09-28T21:45:00Z');
        const event = toFullCalendarEvent(input);
        expect(event).toMatchObject({ id: input.id, title: input.title, allDay: true, backgroundColor: '#cd4242' });
        expect(event.extendedProps).toBe(input.extendedProps);
    });

    it('wydarzenie z godzinami przechodzi bez zmian', () => {
        const timed: CalendarEvent = {
            ...allDayReservation('2026-09-24T07:00:00Z', '2026-09-24T15:00:00Z'),
            allDay: false,
        };
        expect(toFullCalendarEvent(timed)).toBe(timed);
    });
});
