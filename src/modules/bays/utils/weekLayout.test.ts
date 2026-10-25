import { describe, expect, it } from 'vitest';
import type { BaysSnapshot } from '../types';
import { buildWeekRows, bookingRangeFromDates, freeCellsOn, overlapsInRange } from './weekLayout';
import { buildBoard } from './boardState';
import { mondayOf, weekDays, weekX } from './slots';

// Poniedziałek 26.10.2026, 11:05.
const NOW = new Date('2026-10-26T11:05:00');
const days = weekDays(mondayOf(NOW));
const iso = (s: string) => new Date(s).toISOString();

const snap = (over: Partial<BaysSnapshot> = {}): BaysSnapshot => ({
    settings: { enabled: true, trackPeople: false },
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

describe('tablica „Teraz" - stan liczony z faktów', () => {
    it('auto z otwartym odcinkiem stoi na stanowisku, czekające na część - na placu', () => {
        const board = buildBoard(snap(), NOW);
        expect(board.bays.find(b => b.bay.id === 'b1')!.items.map(v => v.car.id)).toEqual(['c1']);
        expect(board.bays.find(b => b.bay.id === 'b2')!.freeSpots).toBe(2);
        expect(board.yard.map(v => v.car.id)).toEqual(['c3']);
    });

    it('rezerwacja, która jeszcze nie przyjechała, nie jest na tablicy', () => {
        const board = buildBoard(snap(), NOW);
        const all = [...board.yard, ...board.ready, ...board.bays.flatMap(b => b.items)].map(v => v.car.id);
        expect(all).not.toContain('c2');
    });
});
