import { describe, it, expect } from 'vitest';
import { describeBulkPaymentStatus } from './bulkPaymentStatus';
import type { BulkPaymentStatusResult } from '../types';

const result = (over: Partial<BulkPaymentStatusResult> = {}): BulkPaymentStatusResult => ({
    updated: 0,
    unchanged: 0,
    skipped: [],
    ...over,
});

describe('describeBulkPaymentStatus', () => {
    it('melduje liczbę faktycznie zmienionych dokumentów, nie liczbę zaznaczonych', () => {
        const message = describeBulkPaymentStatus(result({ updated: 3, unchanged: 9 }), 'PAID');

        expect(message.nothingChanged).toBe(false);
        expect(message.title).toBe('Oznaczono 3 dokumenty jako opłacone');
        expect(message.detail).toBe('9 dokumentów miało już ten status.');
    });

    it('odmienia liczebnik przy jednym dokumencie', () => {
        const message = describeBulkPaymentStatus(result({ updated: 1 }), 'PENDING');

        expect(message.title).toBe('Oznaczono 1 dokument jako oczekujący');
        expect(message.detail).toBeUndefined();
    });

    it('pięć i więcej dostaje formę dopełniaczową', () => {
        expect(describeBulkPaymentStatus(result({ updated: 5 }), 'PAID').title)
            .toBe('Oznaczono 5 dokumentów jako opłaconych');
    });

    it('wszystko miało już docelowy status - to informacja, nie sukces', () => {
        const message = describeBulkPaymentStatus(result({ unchanged: 2 }), 'PAID');

        expect(message.nothingChanged).toBe(true);
        expect(message.title).toBe('Bez zmian');
        expect(message.detail).toBe('2 dokumenty miały już ten status.');
    });

    it('powtarzające się powody pominięcia zwija do jednego zdania', () => {
        const message = describeBulkPaymentStatus(
            result({
                updated: 2,
                skipped: [
                    { id: 'a', reason: 'opłaconego dokumentu nie można cofnąć' },
                    { id: 'b', reason: 'opłaconego dokumentu nie można cofnąć' },
                ],
            }),
            'PENDING',
        );

        expect(message.title).toBe('Oznaczono 2 dokumenty jako oczekujące');
        expect(message.detail).toBe('Pominięto 2 dokumenty: opłaconego dokumentu nie można cofnąć.');
    });

    it('nic nie zapisano i nic nie było w docelowym statusie - mówimy wprost dlaczego', () => {
        const message = describeBulkPaymentStatus(
            result({ skipped: [{ id: 'a', reason: 'opłaconego dokumentu nie można cofnąć' }] }),
            'PENDING',
        );

        expect(message.nothingChanged).toBe(true);
        expect(message.title).toBe('Nie zmieniono żadnego dokumentu');
        expect(message.detail).toBe('Pominięto 1 dokument: opłaconego dokumentu nie można cofnąć.');
    });
});
