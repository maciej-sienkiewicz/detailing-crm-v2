// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { dayCellHasHiddenEvents, resolveDayClickTarget } from './dayClickTarget';

// Zgłoszenie: klik w dzień z kilkoma wydarzeniami otwierał okno szybkiej rezerwacji
// i pod nim listę wydarzeń. Ma się otwierać jedno ALBO drugie.
describe('resolveDayClickTarget', () => {
    const day = new Date(2026, 9, 15);
    const nextDay = new Date(2026, 9, 16);

    it('dzień z ukrytymi wydarzeniami (jeszcze N) otwiera listę', () => {
        expect(resolveDayClickTarget({ viewType: 'dayGridMonth', start: day, end: nextDay, allDay: true, hasHiddenEvents: true }))
            .toBe('dayList');
    });

    it('dzień, którego wszystkie wydarzenia widać, otwiera szybką rezerwację', () => {
        expect(resolveDayClickTarget({ viewType: 'dayGridMonth', start: day, end: nextDay, allDay: true, hasHiddenEvents: false }))
            .toBe('quickEvent');
    });

    it('`select` i `dateClick` z jednego kliknięcia dostają tę samą odpowiedź', () => {
        const fromSelect = resolveDayClickTarget({ viewType: 'dayGridMonth', start: day, end: nextDay, allDay: true, hasHiddenEvents: true });
        const oneHourLater = new Date(day.getTime() + 60 * 60 * 1000);
        const fromDateClick = resolveDayClickTarget({ viewType: 'dayGridMonth', start: day, end: oneHourLater, allDay: true, hasHiddenEvents: true });
        expect(fromSelect).toBe(fromDateClick);
    });

    it('przeciągnięcie przez kilka dni zawsze zakłada rezerwację na zakres', () => {
        const threeDaysLater = new Date(2026, 9, 18);
        expect(resolveDayClickTarget({ viewType: 'dayGridMonth', start: day, end: threeDaysLater, allDay: true, hasHiddenEvents: true }))
            .toBe('quickEvent');
    });

    it('poza widokiem miesiąca lista dnia się nie otwiera', () => {
        expect(resolveDayClickTarget({ viewType: 'timeGridWeek', start: day, end: nextDay, allDay: true, hasHiddenEvents: true }))
            .toBe('quickEvent');
    });
});

describe('dayCellHasHiddenEvents', () => {
    it('widzi link „jeszcze N" tylko w komórce wskazanego dnia', () => {
        const root = document.createElement('div');
        root.innerHTML = `<table><tbody><tr>
            <td class="fc-daygrid-day" data-date="2026-10-15"><a class="fc-daygrid-more-link">jeszcze 3</a></td>
            <td class="fc-daygrid-day" data-date="2026-10-16"></td>
        </tr></tbody></table>`;
        expect(dayCellHasHiddenEvents(root, '2026-10-15')).toBe(true);
        expect(dayCellHasHiddenEvents(root, '2026-10-16')).toBe(false);
        expect(dayCellHasHiddenEvents(null, '2026-10-15')).toBe(false);
    });
});
