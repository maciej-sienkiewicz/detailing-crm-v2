import { describe, expect, it } from 'vitest';
import {
    cellIndexAt, cellsFrom, dayCells, durationLabel, mondayOf, snapRange, timeAtWeekX, toDateKey, weekDays, weekX, workMinutes,
} from './slots';

// 26.10.2026 to poniedziałek; sobota 31.10 jest czynna 8-13.
const at = (iso: string) => new Date(iso);

describe('workMinutes - czas pracy liczy tylko godziny otwarcia', () => {
    it('w ciągu dnia to zwykła różnica', () => {
        expect(workMinutes(at('2026-10-26T08:00:00'), at('2026-10-26T11:05:00'))).toBe(185);
    });

    it('auto zostawione na noc na podnośniku nie pracowało w nocy', () => {
        // pn 15:00 → wt 10:00: 2 h w poniedziałek + 2 h we wtorek, nie 19 h.
        expect(workMinutes(at('2026-10-26T15:00:00'), at('2026-10-27T10:00:00'))).toBe(240);
    });

    it('niedziela nie jest pracą, sobota kończy się o 13:00', () => {
        expect(workMinutes(at('2026-10-31T12:00:00'), at('2026-11-02T09:00:00'))).toBe(120);
    });
});

describe('okienka - każde stanowisko ma własny podział dnia', () => {
    it('podnośnik na 2 i myjnia na 6 dzielą ten sam dzień', () => {
        expect(dayCells('2026-10-26', 2).map(c => [c.start.getHours(), c.start.getMinutes()])).toEqual([[8, 0], [12, 30]]);
        const wash = dayCells('2026-10-26', 6);
        expect(wash).toHaveLength(6);
        expect(wash[1].start.getHours() * 60 + wash[1].start.getMinutes()).toBe(9 * 60 + 30);
        expect(dayCells('2026-11-01', 2)).toEqual([]);
    });

    it('zakres przyciąga się do okienek: początek w dół, koniec w górę', () => {
        const cells = [...dayCells('2026-10-29', 2), ...dayCells('2026-10-30', 2)];
        const r = snapRange(cells, at('2026-10-29T13:00:00'), at('2026-10-30T10:00:00'))!;
        expect([r.start.getHours(), r.start.getMinutes()]).toEqual([12, 30]);
        expect(toDateKey(r.end)).toBe('2026-10-30');
        expect([r.end.getHours(), r.end.getMinutes()]).toEqual([12, 30]);
    });

    it('kolejne okienka przeskakują niedzielę', () => {
        const sat = dayCells('2026-10-31', 2)[1];
        const next = cellsFrom(sat, 2, 2);
        expect(next.map(c => c.date)).toEqual(['2026-10-31', '2026-11-02']);
    });

    it('chwila trafia do swojego okienka', () => {
        const cells = dayCells('2026-10-26', 6);
        expect(cellIndexAt(cells, at('2026-10-26T11:05:00'))).toBe(2);
    });
});

describe('oś tygodnia', () => {
    const days = weekDays(mondayOf(at('2026-10-28T10:00:00')));

    it('tydzień ma sześć otwartych dni o równej szerokości', () => {
        expect(days).toEqual(['2026-10-26', '2026-10-27', '2026-10-28', '2026-10-29', '2026-10-30', '2026-10-31']);
        expect(weekX(at('2026-10-27T08:00:00'), days)).toBeCloseTo(1 / 6);
        // Sobota zamyka się w 5/9 kolumny dnia.
        expect(weekX(at('2026-10-31T13:00:00'), days)).toBeCloseTo((5 + 5 / 9) / 6);
    });

    it('pozycja i chwila pod kursorem to odwrotności', () => {
        const t = at('2026-10-28T12:30:00');
        expect(timeAtWeekX(weekX(t, days), days).getTime()).toBe(t.getTime());
    });

    it('długości mówią się słowami', () => {
        expect([90, 270, 540, 810, 1080].map(m => durationLabel(m))).toEqual(['1 h 30 min', '4 h 30 min', '1 dzień', '1,5 dnia', '2 dni']);
    });
});
