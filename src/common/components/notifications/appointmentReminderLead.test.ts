// Czas przypomnienia o rezerwacji: przejście między polami („45 minut") a zapisem serwera
// („PT45M") w obie strony i zdanie, kiedy przypomnienie przychodzi. Zapis musi wyglądać
// dokładnie jak odpowiedź serwera (Duration.toString()), inaczej pole mruga po zapisie.
import { describe, expect, it } from 'vitest';
import { draftMinutes, leadMinutes, reminderHint, toDraft, toIso, unitLabel } from './appointmentReminderLead';

describe('appointmentReminderLead', () => {
    it('czyta zapis serwera, także dni z ręcznego zapisu', () => {
        expect(leadMinutes('PT45M')).toBe(45);
        expect(leadMinutes('PT1H30M')).toBe(90);
        expect(leadMinutes('PT24H')).toBe(1440);
        expect(leadMinutes('P1D')).toBe(1440);
        expect(leadMinutes('OFF')).toBeNull();
        expect(leadMinutes('PT')).toBeNull();
        expect(leadMinutes('PT0M')).toBeNull();
        expect(leadMinutes(undefined)).toBeNull();
    });

    it('buduje zapis tak, jak zwraca go serwer', () => {
        expect(toIso(45)).toBe('PT45M');
        expect(toIso(90)).toBe('PT1H30M');
        expect(toIso(1440)).toBe('PT24H');
        expect(toIso(30 * 1440)).toBe('PT720H');
    });

    it('pokazuje czas w największej pełnej jednostce', () => {
        expect(toDraft(90)).toEqual({ amount: '90', unit: 'MINUTES' });
        expect(toDraft(120)).toEqual({ amount: '2', unit: 'HOURS' });
        expect(toDraft(1500)).toEqual({ amount: '25', unit: 'HOURS' });
        expect(toDraft(2880)).toEqual({ amount: '2', unit: 'DAYS' });
    });

    it('przyjmuje liczby całkowite od 1 minuty do 30 dni', () => {
        expect(draftMinutes({ amount: '45', unit: 'MINUTES' })).toBe(45);
        expect(draftMinutes({ amount: '30', unit: 'DAYS' })).toBe(30 * 1440);
        expect(draftMinutes({ amount: '0', unit: 'HOURS' })).toBeNull();
        expect(draftMinutes({ amount: '', unit: 'HOURS' })).toBeNull();
        expect(draftMinutes({ amount: '1,5', unit: 'HOURS' })).toBeNull();
        expect(draftMinutes({ amount: '31', unit: 'DAYS' })).toBeNull();
    });

    it('odmienia jednostki po liczbie, jak w zdaniu „… przed rezerwacją"', () => {
        expect(unitLabel('HOURS', '1')).toBe('godzinę');
        expect(unitLabel('HOURS', '3')).toBe('godziny');
        expect(unitLabel('HOURS', '12')).toBe('godzin');
        expect(unitLabel('HOURS', '22')).toBe('godziny');
        expect(unitLabel('MINUTES', '')).toBe('minut');
        expect(unitLabel('DAYS', '1')).toBe('dzień');
    });

    it('mówi, kiedy przychodzi, także przy rezerwacji całodniowej liczonej od 8:00', () => {
        expect(reminderHint(60)).toBe(
            'Przypomnienie przychodzi godzinę przed każdą rezerwacją. Przy rezerwacji całodniowej przychodzi o 7:00.',
        );
        expect(reminderHint(45)).toContain('45 minut przed każdą rezerwacją');
        expect(reminderHint(45)).toContain('przychodzi o 7:15.');
        expect(reminderHint(600)).toContain('10 godzin przed');
        expect(reminderHint(600)).toContain('dzień wcześniej o 22:00.');
        expect(reminderHint(1440)).toContain('dzień przed każdą rezerwacją');
        expect(reminderHint(2880)).toContain('2 dni wcześniej o 8:00.');
    });
});
