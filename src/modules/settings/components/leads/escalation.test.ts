// Logika przypomnień o odpowiedzi: opisy po ludzku i walidacja szkicu przed zapisem.
import { describe, expect, it } from 'vitest';
import type { EscalationPolicy } from '../../types';
import {
    draftMinutes, draftProblem, isPlausiblePhone, nextStep, recipientNames, stepTimeLabel, switchChannel,
    toDraft, toPolicy, workingHoursSummary,
} from './escalation';

const policy: EscalationPolicy = {
    steps: [
        { id: 'b', afterMinutes: 120, channel: 'SMS', anytime: false, recipients: [{ kind: 'PHONE', phone: '+48601234567', label: 'Kierownik' }] },
        { id: 'a', afterMinutes: 0, channel: 'PUSH', anytime: true, recipients: [{ kind: 'TEAM' }] },
        { id: 'c', afterMinutes: 2880, channel: 'SMS', anytime: false, recipients: [{ kind: 'USER', userId: 'u1' }] },
    ],
    workingHours: { alwaysOn: false, fromHour: 8, toHour: 20, days: ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'] },
};

describe('opisy kroków', () => {
    it('czas kroku czyta się jak zdanie', () => {
        expect([0, 30, 60, 150, 1440, 2880].map(stepTimeLabel))
            .toEqual(['Od razu', 'Po 30 min', 'Po 1 godz.', 'Po 2 godz. 30 min', 'Po 1 dniu', 'Po 2 dniach']);
    });

    it('odbiorcy po imieniu, numer po etykiecie', () => {
        const people = [{ userId: 'u1', name: 'Anna Nowak', phone: '+48600100200', isOwner: true }];
        expect(policy.steps.map(s => recipientNames(s, people))).toEqual([['Kierownik'], ['cały zespół'], ['Anna Nowak']]);
    });

    it('godziny pracy: zakres dni ciągłych, lista rozrzuconych, doba', () => {
        expect(workingHoursSummary(policy.workingHours)).toBe('pn–sb, 8:00–20:00');
        expect(workingHoursSummary({ ...policy.workingHours, days: ['MONDAY', 'WEDNESDAY'] })).toBe('pn, śr, 8:00–20:00');
        expect(workingHoursSummary({ ...policy.workingHours, alwaysOn: true })).toBe('całą dobę, 7 dni w tygodniu');
        expect(workingHoursSummary(policy.workingHours)).not.toMatch(/[·•]/);
    });
});

describe('szkic', () => {
    it('kroki od najwcześniejszego, czas w czytelnej jednostce, zapis wraca do minut', () => {
        const draft = toDraft(policy);
        expect(draft.steps.map(s => [s.id, s.timeText, s.unit])).toEqual([['a', '0', 'minutes'], ['b', '2', 'hours'], ['c', '2', 'days']]);
        expect(toPolicy(draft)).toEqual({ ...policy, steps: [policy.steps[1], policy.steps[0], policy.steps[2]] });
    });

    it('czas: puste, ułamek i ponad 7 dni to błąd; 0 to „od razu"', () => {
        expect(draftMinutes({ timeText: '', unit: 'hours' })).toBeNull();
        expect(draftMinutes({ timeText: '1.5', unit: 'hours' })).toBeNull();
        expect(draftMinutes({ timeText: '8', unit: 'days' })).toBeNull();
        expect(draftMinutes({ timeText: '0', unit: 'hours' })).toBe(0);
    });

    it('pierwszy problem wskazuje krok; brak odbiorcy, zły numer i godziny', () => {
        const draft = toDraft(policy);
        expect(draftProblem(draft)).toBeNull();
        draft.steps[1] = { ...draft.steps[1], recipients: [{ kind: 'PHONE', phone: '12' }] };
        expect(draftProblem(draft)).toEqual({ stepId: 'b', message: 'Krok 2: popraw numer telefonu.' });
        draft.steps[1] = { ...draft.steps[1], recipients: [] };
        expect(draftProblem(draft)?.message).toBe('Krok 2: wybierz, kogo powiadomić.');
        const hours = toDraft(policy);
        hours.workingHours = { ...hours.workingHours, fromHour: 20, toHour: 8 };
        expect(draftProblem(hours)?.stepId).toBeNull();
    });

    it('numer: 9 cyfr albo z kierunkowym', () => {
        expect(isPlausiblePhone('+48 601 234 567')).toBe(true);
        expect(isPlausiblePhone('601234567')).toBe(true);
        expect(isPlausiblePhone('+49 1512 3456789')).toBe(true);
        expect(isPlausiblePhone('+48 ')).toBe(false);
    });

    it('nowy krok godzinę po ostatnim, push do zespołu', () => {
        const next = nextStep(toDraft(policy).steps.slice(0, 2));
        expect([next.timeText, next.unit, next.channel, next.recipients]).toEqual(['3', 'hours', 'PUSH', [{ kind: 'TEAM' }]]);
    });

    it('zmiana kanału zostawia tylko odbiorców, których nowy kanał obsłuży', () => {
        const [, sms] = toDraft(policy).steps;
        const mixed = { ...sms, recipients: [{ kind: 'USER' as const, userId: 'u1' }, { kind: 'PHONE' as const, phone: '+48601234567' }] };
        expect(switchChannel(mixed, 'PUSH').recipients).toEqual([{ kind: 'USER', userId: 'u1' }]);
        expect(switchChannel({ ...sms }, 'PUSH').recipients).toEqual([{ kind: 'TEAM' }]);
        expect(switchChannel(toDraft(policy).steps[0], 'SMS').recipients).toEqual([]);
    });
});
