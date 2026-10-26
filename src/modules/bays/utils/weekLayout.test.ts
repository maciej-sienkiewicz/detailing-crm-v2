import { describe, expect, it } from 'vitest';
import type { BaysSnapshot } from '../types';
import { buildWeekRows, bookingRangeFromDates, carStages, freeCellsOn, overlapsInRange } from './weekLayout';
import { mondayOf, setStudioHours, weekDays, weekX } from './slots';

// Przykłady liczą się w godzinach 8-17 (sobota 8-13), ustawionych jawnie.
const WORKSHOP_HOURS = { dayOpens: 480, dayCloses: 1020, saturdayOpens: 480, saturdayCloses: 780 };
setStudioHours(WORKSHOP_HOURS);

// Poniedziałek 26.10.2026, 11:05.
const NOW = new Date('2026-10-26T11:05:00');
const days = weekDays(mondayOf(NOW));
const iso = (s: string) => new Date(s).toISOString();

const snap = (over: Partial<BaysSnapshot> = {}): BaysSnapshot => ({
    settings: { enabled: true, trackPeople: false, ...WORKSHOP_HOURS },
    bays: [
        { id: 'b1', name: 'Podnośnik 1', kind: 'LIFT', capacity: 1, slotsPerDay: 2, defaultPersonId: null, active: true },
        { id: 'b2', name: 'Myjnia', kind: 'WASH', capacity: 2, slotsPerDay: 6, defaultPersonId: null, active: true },
    ],
    people: [{ id: 'p1', name: 'Tomasz Kowal', initials: 'TK' }],
    cars: [
        { id: 'c1', visitId: null, appointmentId: null, licensePlate: 'WE 882PL', vehicleName: 'VW', jobTitle: 'Sprzęgło', stage: 'IN_SHOP', arrivedAt: iso('2026-10-26T07:40:00'), promisedAt: null, readyAt: null, waiting: null },
        { id: 'c2', visitId: null, appointmentId: 'a2', licensePlate: 'LU 0912R', vehicleName: 'Peugeot', jobTitle: 'Diagnoza', stage: 'BOOKED', arrivedAt: null, promisedAt: null, readyAt: null, waiting: null },
        { id: 'c3', visitId: null, appointmentId: null, licensePlate: 'KR 7Z113', vehicleName: 'BMW', jobTitle: 'Klocki', stage: 'IN_SHOP', arrivedAt: iso('2026-10-26T08:00:00'), promisedAt: null, readyAt: null, waiting: { reason: 'WAITING_PART', note: '' } },
    ],
    bookings: [
        { id: 'k1', bayId: 'b1', carId: 'c1', start: iso('2026-10-26T08:00:00'), end: iso('2026-10-27T12:30:00') },
        { id: 'k2', bayId: 'b1', carId: 'c2', start: iso('2026-10-27T08:00:00'), end: iso('2026-10-27T17:00:00') },
    ],
    stints: [
        { id: 's1', bayId: 'b1', carId: 'c1', startedAt: iso('2026-10-26T08:00:00'), endedAt: null, endReason: null, personIds: ['p1'], curingUntil: null },
    ],
    ...over,
});

describe('tydzień po stanowiskach', () => {
    it('trwający odcinek sięga do końca planu, a plan nie rysuje się drugi raz pod nim', () => {
        const { rows } = buildWeekRows(snap(), days, NOW);
        const lift = rows.find(r => r.rowId === 'b1')!;
        const mine = lift.bars.filter(b => b.carId === 'c1');
        expect(mine).toHaveLength(1);
        expect(mine[0]).toMatchObject({ kind: 'active', minutes: 185 });
        expect(mine[0].x).toBeCloseTo(0);
        expect(mine[0].x + mine[0].w).toBeCloseTo(weekX(new Date('2026-10-27T12:30:00'), days));
    });

    it('dwa auta na jednym podnośniku w planie to konflikt - widoczny, nie zablokowany', () => {
        const { rows } = buildWeekRows(snap(), days, NOW);
        const lift = rows.find(r => r.rowId === 'b1')!;
        expect(lift.bars.filter(b => b.conflict).map(b => b.carId).sort()).toEqual(['c1', 'c2']);
        expect(lift.lanes).toBe(2);
        const tue = [new Date('2026-10-27T08:00:00'), new Date('2026-10-27T12:30:00')] as const;
        expect(overlapsInRange(lift, ...tue).map(b => b.carId).sort()).toEqual(['c1', 'c2']);
        // Przesuwane auto nie nachodzi samo na siebie.
        expect(overlapsInRange(lift, new Date('2026-10-28T08:00:00'), new Date('2026-10-28T12:30:00'), 'c2')).toEqual([]);
    });

    it('okienka wiersza idą za podziałem dnia stanowiska; minione nie są wolne', () => {
        const { rows } = buildWeekRows(snap(), days, NOW);
        const wash = rows.find(r => r.rowId === 'b2')!;
        expect(wash.cells.filter(c => c.date === '2026-10-27')).toHaveLength(6);
        // Dziś o 11:05 zostały 4 z 6 okienek myjni (od 11:00).
        expect(freeCellsOn(wash, '2026-10-26', NOW)).toBe(4);
    });

    it('plan z formularza przyciąga się do okienek stanowiska', () => {
        const lift = bookingRangeFromDates(new Date('2026-10-29T13:00:00'), new Date('2026-10-30T10:00:00'), 2)!;
        expect([lift.start.getHours(), lift.start.getMinutes(), lift.end.getHours(), lift.end.getMinutes()]).toEqual([12, 30, 12, 30]);
        const wash = bookingRangeFromDates(new Date('2026-10-29T10:00:00'), new Date('2026-10-29T11:30:00'), 6)!;
        expect([wash.start.getHours(), wash.start.getMinutes(), wash.end.getHours(), wash.end.getMinutes()]).toEqual([9, 30, 12, 30]);
    });
});

describe('kilka etapów jednego auta', () => {
    // c1 stoi na podnośniku (plan k1 do wtorku 12:30), potem myjnia we wtorek po południu,
    // a w czwartek wraca na ten sam podnośnik.
    const stages = () => snap({
        bookings: [
            { id: 'k1', bayId: 'b1', carId: 'c1', start: iso('2026-10-26T08:00:00'), end: iso('2026-10-27T12:30:00') },
            { id: 'k3', bayId: 'b2', carId: 'c1', start: iso('2026-10-27T13:00:00'), end: iso('2026-10-27T15:00:00') },
            { id: 'k4', bayId: 'b1', carId: 'c1', start: iso('2026-10-29T08:00:00'), end: iso('2026-10-29T12:30:00') },
        ],
    });

    it('drugi plan auta na tym samym stanowisku zostaje osobnym paskiem', () => {
        const lift = buildWeekRows(stages(), days, NOW).rows.find(r => r.rowId === 'b1')!;
        const mine = lift.bars.filter(b => b.carId === 'c1');
        expect(mine.map(b => b.kind)).toEqual(['active', 'plan']);
        // Pasek „trwa" niesie plan, do którego należy wjazd - nie późniejszy.
        expect(mine[0].bookingId).toBe('k1');
        expect(mine[1].bookingId).toBe('k4');
    });

    it('trasa auta idzie po kolei przez stanowiska', () => {
        const route = carStages(stages(), 'c1', NOW);
        expect(route.map(s => [s.bayId, s.kind])).toEqual([['b1', 'active'], ['b2', 'plan'], ['b1', 'plan']]);
    });
});
