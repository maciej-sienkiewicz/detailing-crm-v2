// src/modules/bays/api/mockStore.ts
//
// Dane przykładowe prototypu - w pamięci, z kopią w localStorage, żeby przeładowanie
// strony nie kasowało tego, co ktoś właśnie poprzestawiał. Backendu stanowisk jeszcze
// nie ma; `baysApi.ts` ma już kształt prawdziwego API, więc podpięcie go to wymiana
// ciał funkcji, a nie przepisywanie widoków.
//
// Dane są liczone od zegara prototypu (clock.ts), żeby tablica zawsze wyglądała jak
// w środku dnia pracy: „na stanowisku od 7:55", „schnie do 14:30".

import type { Bay, BayBooking, BayCar, BayPerson, BayStint, BaysSnapshot } from '../types';
import { addDays, hoursOf, toDateKey, fromDateKey } from '../utils/slots';
import { baysNow } from './clock';

const STORAGE_KEY = 'bays-prototype-v3';

const people: BayPerson[] = [
    { id: 'p1', name: 'Tomasz Kowal', initials: 'TK' },
    { id: 'p2', name: 'Marek Lis', initials: 'ML' },
    { id: 'p3', name: 'Ola Wróbel', initials: 'OW' },
    { id: 'p4', name: 'Paweł Nowak', initials: 'PN' },
];

const bays: Bay[] = [
    { id: 'b1', name: 'Podnośnik 1', kind: 'LIFT', capacity: 1, slotsPerDay: 2, defaultPersonId: null, active: true },
    { id: 'b2', name: 'Podnośnik 2', kind: 'LIFT', capacity: 1, slotsPerDay: 2, defaultPersonId: null, active: true },
    { id: 'b3', name: 'Kabina lakiernicza', kind: 'BOOTH', capacity: 1, slotsPerDay: 1, defaultPersonId: 'p2', active: true },
    { id: 'b4', name: 'Myjnia', kind: 'WASH', capacity: 2, slotsPerDay: 6, defaultPersonId: 'p3', active: true },
];

const workdayShift = (from: Date, steps: number): string => {
    let cursor = new Date(from);
    let left = Math.abs(steps);
    const dir = steps < 0 ? -1 : 1;
    while (left > 0) {
        cursor = addDays(cursor, dir);
        if (hoursOf(toDateKey(cursor))) left--;
    }
    return toDateKey(cursor);
};

const at = (dateKey: string, hhmm: string): string => {
    const [h, m] = hhmm.split(':').map(Number);
    const d = fromDateKey(dateKey);
    d.setHours(h, m, 0, 0);
    return d.toISOString();
};

/** Chwila `minutesAgo` przed teraz, ale nie wcześniej niż otwarcie dziś - prototyp nie zmyśla nocnej zmiany. */
const agoToday = (now: Date, minutesAgo: number): string => {
    const opening = hoursOf(toDateKey(now))?.opens ?? 8 * 60;
    const open = new Date(now);
    open.setHours(Math.floor(opening / 60), opening % 60, 0, 0);
    return new Date(Math.max(open.getTime(), now.getTime() - minutesAgo * 60_000)).toISOString();
};

const car = (c: Partial<BayCar> & Pick<BayCar, 'id' | 'licensePlate' | 'vehicleName' | 'jobTitle' | 'stage'>): BayCar => ({
    visitId: null, appointmentId: null, arrivedAt: null, promisedAt: null, readyAt: null, waiting: null, ...c,
});

const stint = (s: Partial<BayStint> & Pick<BayStint, 'id' | 'bayId' | 'carId' | 'startedAt'>): BayStint => ({
    endedAt: null, endReason: null, personIds: [], curingUntil: null, ...s,
});

export const seedSnapshot = (now: Date): BaysSnapshot => {
    const today = toDateKey(now);
    const prev = workdayShift(now, -1);
    const next = workdayShift(now, 1);
    const next2 = workdayShift(now, 2);

    const cars: BayCar[] = [
        car({ id: 'c1', licensePlate: 'WE 882PL', vehicleName: 'Volkswagen Passat B8, 2019', jobTitle: 'Wymiana sprzęgła z kołem dwumasowym',
            stage: 'IN_SHOP', arrivedAt: at(today, '07:40'), promisedAt: at(next, '16:00') }),
        car({ id: 'c2', licensePlate: 'WX 4521K', vehicleName: 'Škoda Octavia III, 2017', jobTitle: 'Wymiana rozrządu z pompą wody',
            stage: 'IN_SHOP', arrivedAt: agoToday(now, 145), promisedAt: at(next, '15:00') }),
        car({ id: 'c3', licensePlate: 'KR 7Z113', vehicleName: 'BMW X3 G01, 2020', jobTitle: 'Klocki i tarcze tył',
            stage: 'IN_SHOP', arrivedAt: at(prev, '13:00'), promisedAt: at(next, '17:00'),
            waiting: { reason: 'WAITING_PART', note: 'Tarcze dojadą około 13:00' } }),
        car({ id: 'c4', licensePlate: 'DW 1188C', vehicleName: 'Audi A4 B9, 2018', jobTitle: 'Lakierowanie zderzaka przedniego',
            stage: 'IN_SHOP', arrivedAt: at(prev, '08:10'), promisedAt: at(today, '17:00') }),
        car({ id: 'c5', licensePlate: 'PO 3W551', vehicleName: 'Toyota Corolla E21, 2022', jobTitle: 'Mycie po naprawie',
            stage: 'IN_SHOP', arrivedAt: at(prev, '08:00'), promisedAt: at(today, '15:00') }),
        car({ id: 'c6', licensePlate: 'GD 5521E', vehicleName: 'Kia Ceed III, 2021', jobTitle: 'Przegląd z wymianą oleju',
            stage: 'READY', arrivedAt: at(prev, '07:50'), promisedAt: at(today, '12:00'), readyAt: at(prev, '11:25') }),
        car({ id: 'c7', licensePlate: 'SK 2210A', vehicleName: 'Opel Astra K, 2016', jobTitle: 'Zawieszenie przód',
            stage: 'HANDED_OVER', arrivedAt: at(prev, '10:30') }),
        car({ id: 'c8', licensePlate: 'WA 77712', vehicleName: 'Ford Focus IV, 2019', jobTitle: 'Hamulce i płyn',
            stage: 'HANDED_OVER', arrivedAt: at(prev, '08:00') }),
        car({ id: 'c9', licensePlate: 'LU 0912R', vehicleName: 'Peugeot 308 II, 2018', jobTitle: 'Diagnostyka i naprawa',
            stage: 'BOOKED', appointmentId: 'a9', promisedAt: at(next2, '17:00') }),
        car({ id: 'c10', licensePlate: 'WI 455KK', vehicleName: 'Mazda 6 III, 2020', jobTitle: 'Lakierowanie maski i dachu',
            stage: 'BOOKED', appointmentId: 'a10', promisedAt: at(next2, '17:00') }),
        car({ id: 'c11', licensePlate: 'EL 4410T', vehicleName: 'Hyundai i30 III, 2021', jobTitle: 'Wymiana opon i geometria',
            stage: 'BOOKED', appointmentId: 'a11', promisedAt: at(next2, '12:00') }),
        car({ id: 'c13', licensePlate: 'PO 77K21', vehicleName: 'Skoda Fabia IV, 2023', jobTitle: 'Mycie i odkurzanie',
            stage: 'BOOKED', appointmentId: 'a13', promisedAt: at(today, '14:00') }),
        car({ id: 'c14', licensePlate: 'WW 1234A', vehicleName: 'Tesla Model 3, 2022', jobTitle: 'Mycie detailingowe',
            stage: 'BOOKED', appointmentId: 'a14', promisedAt: at(today, '15:30') }),
        car({ id: 'c15', licensePlate: 'GD 9F300', vehicleName: 'Volvo XC60, 2021', jobTitle: 'Mycie podwozia',
            stage: 'BOOKED', appointmentId: 'a15', promisedAt: at(next, '11:00') }),
        car({ id: 'c12', licensePlate: 'KR 1N440', vehicleName: 'Fiat Tipo, 2019', jobTitle: 'Diagnostyka stuków z przodu',
            stage: 'IN_SHOP', arrivedAt: agoToday(now, 30), promisedAt: at(next, '12:00') }),
    ];

    const stints: BayStint[] = [
        stint({ id: 's1', bayId: 'b1', carId: 'c1', startedAt: agoToday(now, 190), personIds: ['p1'] }),
        stint({ id: 's3', bayId: 'b2', carId: 'c3', startedAt: at(prev, '13:20'), endedAt: at(prev, '14:35'), endReason: 'WAITING_PART', personIds: ['p1'] }),
        stint({ id: 's4', bayId: 'b3', carId: 'c4', startedAt: at(prev, '12:30'), personIds: ['p2'], curingUntil: at(today, '14:30') }),
        stint({ id: 's5a', bayId: 'b2', carId: 'c5', startedAt: at(prev, '08:15'), endedAt: at(prev, '11:50'), endReason: 'DONE', personIds: ['p4'] }),
        stint({ id: 's5', bayId: 'b4', carId: 'c5', startedAt: agoToday(now, 60), personIds: ['p3', 'p4'] }),
        stint({ id: 's6a', bayId: 'b1', carId: 'c6', startedAt: at(prev, '08:05'), endedAt: at(prev, '10:25'), endReason: 'DONE', personIds: ['p1'] }),
        stint({ id: 's6b', bayId: 'b4', carId: 'c6', startedAt: at(prev, '10:40'), endedAt: at(prev, '11:20'), endReason: 'DONE', personIds: ['p3'] }),
        stint({ id: 's7', bayId: 'b1', carId: 'c7', startedAt: at(prev, '10:40'), endedAt: at(prev, '16:20'), endReason: 'DONE', personIds: ['p1', 'p4'] }),
        stint({ id: 's8', bayId: 'b2', carId: 'c8', startedAt: at(prev, '15:00'), endedAt: at(prev, '16:45'), endReason: 'DONE', personIds: ['p4'] }),
    ];

    const k = (id: string, bayId: string, carId: string, from: [string, string], to: [string, string]): BayBooking =>
        ({ id, bayId, carId, start: at(from[0], from[1]), end: at(to[0], to[1]) });
    const bookings: BayBooking[] = [
        k('k1', 'b1', 'c1', [today, '08:00'], [next, '12:30']),
        k('k2', 'b2', 'c2', [today, '12:30'], [next, '12:30']),
        k('k3', 'b2', 'c3', [next, '12:30'], [next, '17:00']),
        k('k4', 'b3', 'c4', [prev, '08:00'], [today, '17:00']),
        k('k5', 'b4', 'c5', [today, '09:30'], [today, '12:30']),
        k('k9', 'b1', 'c9', [next2, '08:00'], [next2, '17:00']),
        k('k10', 'b3', 'c10', [next, '08:00'], [next2, '17:00']),
        k('k11', 'b2', 'c11', [next2, '08:00'], [next2, '12:30']),
        k('k13', 'b4', 'c13', [today, '12:30'], [today, '14:00']),
        k('k14', 'b4', 'c14', [today, '14:00'], [today, '15:30']),
        k('k15', 'b4', 'c15', [next, '09:30'], [next, '11:00']),
    ];

    return { settings: { trackPeople: false }, bays, people, cars, bookings, stints };
};

interface Stored { day: string; snapshot: BaysSnapshot }

const read = (): BaysSnapshot | null => {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return null;
        const stored = JSON.parse(raw) as Stored;
        // Dane z innego dnia mają godziny z innego dnia - lepiej zacząć od nowa niż pokazać bzdury.
        return stored.day === toDateKey(baysNow()) ? stored.snapshot : null;
    } catch {
        return null;
    }
};

let snapshot: BaysSnapshot = read() ?? seedSnapshot(baysNow());

export const getStore = (): BaysSnapshot => snapshot;

export const setStore = (next: BaysSnapshot): void => {
    snapshot = next;
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify({ day: toDateKey(baysNow()), snapshot } satisfies Stored));
    } catch {
        // Prywatne okno albo pełny magazyn - prototyp działa dalej, tylko bez pamięci.
    }
};

export const resetStore = (): void => setStore(seedSnapshot(baysNow()));
