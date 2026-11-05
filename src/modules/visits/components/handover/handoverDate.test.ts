// Wydanie klikane po fakcie (zgłoszenie biznesu z 05.11.2026): pytanie o datę pojawia się
// tylko po dniu planowanego zakończenia, a na serwer idzie dzień, który wybrał człowiek.
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import {
    dayLabel,
    emptyHandoverDate,
    handoverDateProblems,
    isAfterPlannedDay,
    pickupDateFor,
    plannedDay,
} from './handoverDate';

// 2 listopada 15:00 czasu polskiego (zimą UTC+1).
const PLANNED = '2026-11-02T14:00:00Z';
const TODAY = '2026-11-05';

// Jak w dateTime.test.ts: wynik zależy od strefy, więc test ją ustala, a nie dziedziczy po maszynie.
const originalTz = process.env.TZ;
beforeAll(() => { process.env.TZ = 'Europe/Warsaw'; });
afterAll(() => {
    if (originalTz === undefined) delete process.env.TZ;
    else process.env.TZ = originalTz;
});

describe('pytanie o datę wydania', () => {
    it('pojawia się dopiero dzień po planowanym zakończeniu, nie godzinę po', () => {
        expect(isAfterPlannedDay(PLANNED, TODAY)).toBe(true);
        expect(isAfterPlannedDay(PLANNED, '2026-11-02')).toBe(false);
        expect(isAfterPlannedDay(PLANNED, '2026-11-01')).toBe(false);
        expect(isAfterPlannedDay(undefined, TODAY)).toBe(false);
        expect(isAfterPlannedDay(null, TODAY)).toBe(false);
    });

    it('dzień planu liczy się w czasie polskim', () => {
        // 23:30 UTC 2.11 to 0:30 czasu polskiego 3.11 - plan był na 3 listopada.
        expect(plannedDay('2026-11-02T23:30:00Z')).toBe('2026-11-03');
        expect(plannedDay('2026-11-02T22:30:00Z')).toBe('2026-11-02');
    });

    it('na serwer idzie wybrany dzień, a „dziś” - bez daty, jak dotąd', () => {
        expect(pickupDateFor({ choice: 'PLANNED', other: '' }, PLANNED, TODAY)).toBe('2026-11-02');
        expect(pickupDateFor({ choice: 'TODAY', other: '' }, PLANNED, TODAY)).toBeUndefined();
        expect(pickupDateFor({ choice: 'OTHER', other: '2026-11-03' }, PLANNED, TODAY)).toBe('2026-11-03');
        expect(pickupDateFor({ choice: 'OTHER', other: TODAY }, PLANNED, TODAY)).toBeUndefined();
        expect(pickupDateFor({ choice: 'OTHER', other: '' }, PLANNED, TODAY)).toBeUndefined();
        expect(pickupDateFor(emptyHandoverDate, PLANNED, TODAY)).toBeUndefined();
    });

    it('bez wyboru, z pustą, przyszłą albo zbyt wczesną datą wydać się nie da', () => {
        const messages = (choice: Parameters<typeof handoverDateProblems>[0]) =>
            handoverDateProblems(choice, '2026-10-30', TODAY).map(p => p.message);

        expect(messages(emptyHandoverDate)).toEqual(['Wybierz, z jaką datą zakończyć wizytę.']);
        expect(messages({ choice: 'OTHER', other: '' })).toEqual(['Wybierz dzień wydania w kalendarzu.']);
        expect(messages({ choice: 'OTHER', other: '2026-11-06' })).toEqual(['Data wydania nie może być w przyszłości.']);
        expect(messages({ choice: 'OTHER', other: '2026-10-29' })).toEqual([
            'Data wydania nie może być wcześniejsza niż rozpoczęcie wizyty (30 października 2026).',
        ]);
        expect(messages({ choice: 'OTHER', other: '2026-10-30' })).toEqual([]);
        expect(messages({ choice: 'OTHER', other: TODAY })).toEqual([]);
        expect(messages({ choice: 'PLANNED', other: '' })).toEqual([]);
        expect(messages({ choice: 'TODAY', other: '' })).toEqual([]);
        expect(handoverDateProblems(emptyHandoverDate, null, TODAY)[0].section).toBe('handoverDate');
    });

    it('dzień czyta się po polsku, bez przesunięcia o strefę', () => {
        expect(dayLabel('2026-11-02')).toBe('2 listopada 2026');
        expect(dayLabel('2026-01-01')).toBe('1 stycznia 2026');
        // new Date('2026-11-02') to północ UTC - na zachód od Greenwich byłby to jeszcze 1 listopada.
        process.env.TZ = 'America/Sao_Paulo';
        try {
            expect(dayLabel('2026-11-02')).toBe('2 listopada 2026');
        } finally {
            process.env.TZ = 'Europe/Warsaw';
        }
    });
});
