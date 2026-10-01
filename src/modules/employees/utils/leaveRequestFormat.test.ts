// Liczby i słowa wniosku urlopowego: odmiana „dni roboczych", zakres dat z rokiem raz,
// „Na żądanie" jako rodzaj i liczba osób w kolizji (a nie liczba wpisów).
import { describe, expect, it } from 'vitest';
import {
    addDaysIso, collisionCount, formatLeaveRange, formatLeaveRangeLong, leaveRequestTypeLabel, pendingRequestsSentence, todayIso,
    workingDaysLabel,
} from './leaveRequestFormat';

describe('workingDaysLabel - odmiana', () => {
    it.each([
        [1, '1 dzień roboczy'],
        [2, '2 dni robocze'],
        [4, '4 dni robocze'],
        [5, '5 dni roboczych'],
        [12, '12 dni roboczych'],
        [14, '14 dni roboczych'],
        [22, '22 dni robocze'],
        [25, '25 dni roboczych'],
        [0, '0 dni roboczych'],
    ])('%i → %s', (n, expected) => {
        expect(workingDaysLabel(n)).toBe(expected);
    });
});

describe('pendingRequestsSentence', () => {
    it('liczebnik rządzi rzeczownikiem i czasownikiem', () => {
        expect(pendingRequestsSentence(1)).toBe('1 wniosek czeka na decyzję');
        expect(pendingRequestsSentence(3)).toBe('3 wnioski czekają na decyzję');
        expect(pendingRequestsSentence(5)).toBe('5 wniosków czeka na decyzję');
    });
});

describe('formatLeaveRange', () => {
    it('ten sam rok: rok raz, na końcu', () => {
        expect(formatLeaveRange('2026-11-03', '2026-11-07')).toBe('03.11–07.11.2026');
    });

    it('jeden dzień', () => {
        expect(formatLeaveRange('2026-05-02', '2026-05-02')).toBe('02.05.2026');
    });

    it('przełom roku: oba lata', () => {
        expect(formatLeaveRange('2026-12-28', '2027-01-02')).toBe('28.12.2026–02.01.2027');
    });
});

describe('leaveRequestTypeLabel', () => {
    it('na żądanie to rodzaj dla ludzi, choć w API to flaga przy wypoczynkowym', () => {
        expect(leaveRequestTypeLabel('ANNUAL', true)).toBe('Na żądanie');
        expect(leaveRequestTypeLabel('ANNUAL', false)).toBe('Urlop wypoczynkowy');
        expect(leaveRequestTypeLabel('SPECIAL', false)).toBe('Urlop okolicznościowy');
    });
});

describe('collisionCount', () => {
    it('liczy osoby, a nie wpisy', () => {
        expect(collisionCount([
            { employeeId: 'a', employeeName: 'Anna', startDate: '2026-11-03', endDate: '2026-11-04', kind: 'LEAVE' },
            { employeeId: 'a', employeeName: 'Anna', startDate: '2026-11-06', endDate: '2026-11-06', kind: 'PENDING_REQUEST' },
            { employeeId: 'p', employeeName: 'Piotr', startDate: '2026-11-05', endDate: '2026-11-05', kind: 'LEAVE' },
        ])).toBe(2);
    });
});

describe('daty lokalne', () => {
    it('todayIso i addDaysIso liczą w czasie lokalnym, także przez koniec miesiąca', () => {
        expect(todayIso(new Date(2026, 8, 30))).toBe('2026-09-30');
        expect(addDaysIso('2026-09-30', 1)).toBe('2026-10-01');
        expect(addDaysIso('2026-12-31', 1)).toBe('2027-01-01');
    });
});

describe('formatLeaveRangeLong - termin zdaniem', () => {
    it('zakres z dniami tygodnia, rok raz', () => {
        expect(formatLeaveRangeLong('2026-10-07', '2026-10-09')).toBe('od środy 7 października do piątku 9 października 2026');
    });
    it('jeden dzień', () => {
        expect(formatLeaveRangeLong('2026-10-05', '2026-10-05')).toBe('w poniedziałek 5 października 2026');
    });
    it('przełom roku: rok przy obu końcach', () => {
        expect(formatLeaveRangeLong('2026-12-28', '2027-01-04')).toBe('od poniedziałku 28 grudnia 2026 do poniedziałku 4 stycznia 2027');
    });
});
