import { describe, expect, it } from 'vitest';
import { dayOfMonthFrom, recurrenceError } from './recurrence';
import { savedReservationToast } from './savedToast';
import type { QuickEventFormData } from './types';

describe('seria rezerwacji - reguły serwera', () => {
    it('dzień miesiąca bierze się z daty startu, najpóźniej 28.', () => {
        expect(dayOfMonthFrom('2026-10-15T10:00')).toBe(15);
        expect(dayOfMonthFrom('2026-10-30')).toBe(28);
        expect(dayOfMonthFrom('')).toBe(1);
    });

    it('29-31 i „Do daty" bez daty to błędy, poprawna reguła przechodzi', () => {
        expect(recurrenceError({ type: 'MONTHLY', dayOfMonth: 29, endType: 'COUNT', maxOccurrences: 6 }, '2026-10-15'))
            .toBe('Dzień miesiąca musi być od 1 do 28');
        expect(recurrenceError({ type: 'WEEKLY', intervalWeeks: 1, daysOfWeek: ['MONDAY'], endType: 'DATE', endDate: '' }, '2026-10-15'))
            .toBe('Podaj datę końca serii');
        expect(recurrenceError({ type: 'WEEKLY', intervalWeeks: 1, daysOfWeek: ['MONDAY'], endType: 'DATE', endDate: '2026-10-01' }, '2026-10-15'))
            .toBe('Koniec serii jest przed pierwszą rezerwacją');
        expect(recurrenceError({ type: 'WEEKLY', intervalWeeks: 1, daysOfWeek: [], endType: 'OPEN' }, '2026-10-15'))
            .toBe('Wybierz co najmniej jeden dzień tygodnia');
        expect(recurrenceError({ type: 'MONTHLY', dayOfMonth: 28, endType: 'DATE', endDate: '2027-03-01' }, '2026-10-15'))
            .toBeNull();
    });
});

describe('dymek po zapisie rezerwacji', () => {
    const base: QuickEventFormData = {
        title: '',
        customer: { id: 'c1', firstName: 'Jan', lastName: 'Kowalski', isNew: false },
        vehicle: null,
        startDateTime: '2026-10-24T10:00',
        endDateTime: '2026-10-24T12:30',
        isAllDay: false,
        serviceIds: [],
        colorId: 'c',
        sendConfirmationSms: false,
        sendReminderSms: false,
        sendVisitCard: false,
    };

    it('mówi, dla kogo i kiedy - bez „·"', () => {
        expect(savedReservationToast(base)).toEqual({
            title: 'Rezerwacja zapisana',
            message: 'Jan Kowalski, sobota, 24 października, 10:00–12:30',
        });
    });

    it('cały dzień, kilka dni i seria', () => {
        expect(savedReservationToast({ ...base, isAllDay: true, startDateTime: '2026-10-24', endDateTime: '2026-10-24T23:59:59' }).message)
            .toBe('Jan Kowalski, sobota, 24 października, cały dzień');
        expect(savedReservationToast({ ...base, endDateTime: '2026-10-26T18:00' }).message)
            .toBe('Jan Kowalski, 24 października – 26 października');
        expect(savedReservationToast({ ...base, recurrence: { type: 'WEEKLY', intervalWeeks: 1, daysOfWeek: ['SATURDAY'], endType: 'COUNT', maxOccurrences: 4 } }))
            .toEqual({ title: 'Seria rezerwacji zapisana', message: 'Jan Kowalski, pierwsza: sobota, 24 października, 10:00–12:30' });
    });
});
