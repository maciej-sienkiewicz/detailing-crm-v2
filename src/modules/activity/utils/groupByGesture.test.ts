import { describe, expect, it } from 'vitest';
import type { ActivityItem } from '../types';
import { groupByGesture, joinPolish, stepsLabelOf } from './groupByGesture';

const item = (overrides: Partial<ActivityItem> & { id: string }): ActivityItem => ({
    occurredAt: '2026-10-17T13:40:00Z',
    actor: { type: 'EMPLOYEE', typeLabel: 'Pracownik', id: 'u1', displayName: 'Anna Wiśniewska', initials: 'AW' },
    module: { code: 'VISIT', label: 'Wizyty' },
    action: { code: 'UPDATE', label: 'Aktualizacja' },
    severity: { code: 'NORMAL', label: 'Standardowe' },
    channel: { code: 'TABLET', label: 'Tablet' },
    icon: 'EDIT',
    title: 'Tytuł',
    description: null,
    summary: '',
    subject: null,
    related: [],
    amount: null,
    changes: [],
    changeSummary: null,
    metadata: {},
    correlationId: null,
    ipAddress: null,
    ...overrides,
});

describe('groupByGesture', () => {
    it('składa wydanie auta z paragonem, podpisem i SMS-em w jeden wiersz', () => {
        // Feed jest od najnowszego: SMS poszedł ostatni, wydanie zapisało się pierwsze.
        const items = [
            item({ id: 'sms', correlationId: 'g1', action: { code: 'SMS_SENT', label: 'Wysłanie SMS' } }),
            item({ id: 'doc', correlationId: 'g1', action: { code: 'DOCUMENT_ISSUED', label: 'Wystawienie dokumentu' } }),
            item({ id: 'sign', correlationId: 'g1', action: { code: 'PROTOCOL_SIGNED', label: 'Podpisanie protokołu' } }),
            item({
                id: 'done',
                correlationId: 'g1',
                action: { code: 'VISIT_COMPLETED', label: 'Zakończenie wizyty' },
                amount: { value: '3690.00', currency: 'PLN', display: '3 690,00 zł' },
            }),
            item({ id: 'other' }),
        ];

        const entries = groupByGesture(items);

        expect(entries).toHaveLength(2);
        expect(entries[0].item.id).toBe('done');
        expect(entries[0].steps.map(step => step.id)).toEqual(['sign', 'doc', 'sms']);
        expect(entries[0].stepsLabel).toBe('Podpisanie protokołu, wystawienie dokumentu i wysłanie SMS');
        expect(entries[1].item.id).toBe('other');
        expect(entries[1].steps).toEqual([]);
    });

    it('bez wyraźnego sedna wierszem jest wpis z kwotą', () => {
        const entries = groupByGesture([
            item({ id: 'a', correlationId: 'g' }),
            item({ id: 'b', correlationId: 'g', amount: { value: '10', currency: 'PLN', display: '10,00 zł' } }),
        ]);
        expect(entries[0].item.id).toBe('b');
        expect(entries[0].steps.map(step => step.id)).toEqual(['a']);
    });

    it('nie łączy wpisów bez correlationId ani niesąsiadujących', () => {
        const entries = groupByGesture([
            item({ id: 'a' }),
            item({ id: 'b' }),
            item({ id: 'c', correlationId: 'g' }),
            item({ id: 'd', correlationId: 'h' }),
            item({ id: 'e', correlationId: 'g' }),
        ]);
        expect(entries.map(entry => entry.item.id)).toEqual(['a', 'b', 'c', 'd', 'e']);
    });
});

describe('polskie wyliczenie', () => {
    it('łączy przecinkiem i spójnikiem, nigdy kropką środkową', () => {
        expect(joinPolish(['A'])).toBe('A');
        expect(joinPolish(['A', 'B'])).toBe('A i B');
        expect(joinPolish(['A', 'B', 'C'])).toBe('A, B i C');
    });

    it('nie powtarza tej samej akcji', () => {
        const label = stepsLabelOf([
            item({ id: '1', action: { code: 'SMS_SENT', label: 'Wysłanie SMS' } }),
            item({ id: '2', action: { code: 'SMS_SENT', label: 'Wysłanie SMS' } }),
        ]);
        expect(label).toBe('Wysłanie SMS');
    });
});
