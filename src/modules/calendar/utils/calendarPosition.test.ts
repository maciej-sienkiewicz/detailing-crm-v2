// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest';
import { CALENDAR_POSITION_TTL_MS, readCalendarPosition, saveCalendarPosition } from './calendarPosition';

describe('calendarPosition', () => {
    beforeEach(() => window.sessionStorage.clear());

    it('zapamiętuje widok, datę i dzień na górze listy', () => {
        saveCalendarPosition({ view: 'dayGridMonth', agendaList: true, date: '2026-11-14' }, 1_000);
        saveCalendarPosition({ agendaTopDay: '2026-11-20' }, 2_000);

        expect(readCalendarPosition(3_000)).toEqual({
            view: 'dayGridMonth', agendaList: true, date: '2026-11-14', agendaTopDay: '2026-11-20', savedAt: 2_000,
        });
    });

    it('po godzinie bez ruchu kalendarz wraca do dziś', () => {
        saveCalendarPosition({ view: 'dayGridMonth', agendaList: false, date: '2026-11-14' }, 1_000);
        expect(readCalendarPosition(1_000 + CALENDAR_POSITION_TTL_MS + 1)).toBeNull();
    });

    it('bez daty nic nie zapisuje', () => {
        saveCalendarPosition({ agendaTopDay: '2026-11-20' }, 1_000);
        expect(readCalendarPosition(1_000)).toBeNull();
    });
});
